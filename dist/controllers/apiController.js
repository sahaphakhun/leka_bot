"use strict";
// API Controller - REST API endpoints
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const TaskService_1 = require("@/services/TaskService");
const LineService_1 = require("@/services/LineService");
const ActivityLogService_1 = require("@/services/ActivityLogService");
const activityLogger_1 = require("@/utils/activityLogger");
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const multer_1 = __importDefault(require("multer"));
const logger_1 = require("@/utils/logger");
const serviceContainer_1 = require("@/utils/serviceContainer");
const utils_1 = require("@/utils");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const uuidValidation_1 = require("@/middleware/uuidValidation");
const taskAuth_1 = require("@/middleware/taskAuth");
const adapters_1 = require("@/types/adapters");
exports.apiRouter = (0, express_1.Router)();
// ยกเลิกการจำกัดขนาดไฟล์ที่ multer เพื่อรองรับไฟล์ขนาดใหญ่
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
class ApiController {
    constructor() {
        this.taskService = serviceContainer_1.serviceContainer.get("TaskService");
        this.userService = serviceContainer_1.serviceContainer.get("UserService");
        this.fileService = serviceContainer_1.serviceContainer.get("FileService");
        this.kpiService = serviceContainer_1.serviceContainer.get("KPIService");
        this.recurringService = serviceContainer_1.serviceContainer.get("RecurringTaskService");
        this.lineService = serviceContainer_1.serviceContainer.get("LineService");
        this.notificationCardService =
            serviceContainer_1.serviceContainer.get("NotificationCardService");
        this.activityLogService = new ActivityLogService_1.ActivityLogService();
        this.taskDeletionService =
            serviceContainer_1.serviceContainer.get("TaskDeletionService");
    }
    // Task Endpoints
    /**
     * POST /api/maintenance/cleanup-inactive-groups
     * ตรวจสอบทุกกลุ่มด้วย LINE API (GET /v2/bot/group/{groupId}/summary)
     * และลบกลุ่มที่บอทไม่ได้อยู่แล้ว พร้อมข้อมูลงาน, ไฟล์, KPI, recurring (ยกเว้นผู้ใช้)
     *
     * Query params:
     * - dryRun=true|false (default: true) → true = แค่รายงาน ไม่ลบจริง
     */
    async cleanupInactiveGroups(req, res) {
        const dryRun = String(req.query.dryRun ?? "true").toLowerCase() !== "false"
            ? true
            : false;
        try {
            const groupRepo = database_1.AppDataSource.getRepository(models_1.Group);
            const fileRepo = database_1.AppDataSource.getRepository(models_1.File);
            const kpiRepo = database_1.AppDataSource.getRepository(models_1.KPIRecord);
            const recurringRepo = database_1.AppDataSource.getRepository(models_1.RecurringTask);
            const groups = await groupRepo.find();
            const results = [];
            let toDeleteCount = 0;
            let deletedGroups = 0;
            let deletedTasks = 0;
            let deletedFiles = 0;
            let deletedKPIs = 0;
            let deletedRecurring = 0;
            const errors = [];
            for (const group of groups) {
                try {
                    const { inGroup, status, reason } = await this.lineService.isBotInGroupViaSummary(group.lineGroupId || group.id);
                    if (inGroup) {
                        results.push({
                            groupId: group.id,
                            lineGroupId: group.lineGroupId,
                            name: group.name,
                            status: "kept",
                            reason,
                        });
                        continue;
                    }
                    // not in group → mark for deletion
                    toDeleteCount++;
                    if (dryRun) {
                        results.push({
                            groupId: group.id,
                            lineGroupId: group.lineGroupId,
                            name: group.name,
                            status: "would_delete",
                            httpStatus: status,
                        });
                        continue;
                    }
                    // delete tasks
                    const taskDeleteSummary = await this.taskService.deleteAllTasksInGroup(group.id);
                    deletedTasks += taskDeleteSummary.deletedCount;
                    // delete files via FileService
                    const files = await fileRepo.find({ where: { groupId: group.id } });
                    for (const f of files) {
                        try {
                            await this.fileService.deleteFile(f.id);
                            deletedFiles++;
                        }
                        catch (e) {
                            console.warn("⚠️ Failed to delete file", f.id, e);
                        }
                    }
                    // delete KPI for group
                    const kDel = await kpiRepo.delete({ groupId: group.id });
                    deletedKPIs += kDel.affected || 0;
                    // delete recurring for this LINE group
                    const rDel = await recurringRepo.delete({
                        lineGroupId: group.lineGroupId,
                    });
                    deletedRecurring += rDel.affected || 0;
                    // delete group (cascades members/relations left)
                    await groupRepo.delete({ id: group.id });
                    deletedGroups++;
                    results.push({
                        groupId: group.id,
                        lineGroupId: group.lineGroupId,
                        name: group.name,
                        status: "deleted",
                    });
                }
                catch (err) {
                    const msg = `Group ${group.id} cleanup error: ${err?.message || err}`;
                    errors.push(msg);
                    results.push({
                        groupId: group.id,
                        lineGroupId: group.lineGroupId,
                        name: group.name,
                        status: "error",
                        error: msg,
                    });
                }
            }
            res.json({
                success: true,
                dryRun,
                summary: {
                    totalGroups: groups.length,
                    toDelete: toDeleteCount,
                    deletedGroups,
                    deletedTasks,
                    deletedFiles,
                    deletedKPIs,
                    deletedRecurring,
                    errors: errors.length,
                },
                results,
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error cleaning up inactive groups:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to cleanup inactive groups" });
        }
    }
    /**
     * DELETE /api/admin/groups/:groupId - ลบกลุ่มและข้อมูลที่เกี่ยวข้องทั้งหมดอย่างปลอดภัย (ไม่ลบผู้ใช้)
     * ต้องใส่ admin token: Header X-Admin-Token หรือ query ?adminToken=
     * รองรับทั้ง internal UUID และ LINE Group ID ในพารามิเตอร์ :groupId
     * ตัวเลือก: force=true เพื่อข้ามการเช็คว่า Bot ยังอยู่ในกลุ่มหรือไม่
     */
    async hardDeleteGroup(req, res) {
        const { groupId } = req.params;
        const force = String(req.query.force || "").toLowerCase() === "true";
        const adminToken = req.headers["x-admin-token"] ||
            req.query.adminToken;
        try {
            if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
                res
                    .status(401)
                    .json({ success: false, error: "Unauthorized: invalid admin token" });
                return;
            }
            // แปลง groupId: รองรับทั้ง UUID และ LINE Group ID
            let group = null;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            const groupRepo = database_1.AppDataSource.getRepository(models_1.Group);
            group = isUuid
                ? await groupRepo.findOne({ where: { id: groupId } })
                : await groupRepo.findOne({ where: { lineGroupId: groupId } });
            if (!group) {
                res
                    .status(404)
                    .json({ success: false, error: `Group not found: ${groupId}` });
                return;
            }
            // ถ้าไม่ได้ force ให้เช็คก่อนว่า Bot ยังอยู่ในกลุ่มหรือไม่
            if (!force) {
                try {
                    const isInGroup = await this.taskService.checkBotMembershipInGroup(group.lineGroupId || group.id);
                    if (isInGroup) {
                        res.status(400).json({
                            success: false,
                            error: "Bot is still a member of this group. Use ?force=true to override.",
                        });
                        return;
                    }
                }
                catch (err) {
                    // ถ้าเช็คไม่ได้ ให้ปล่อยผ่าน (แต่ log)
                    console.warn("⚠️ Could not verify bot membership, proceeding with deletion:", err);
                }
            }
            // เริ่มดำเนินการลบแบบเป็นขั้นตอน พร้อมสรุปผล
            const fileRepo = database_1.AppDataSource.getRepository(models_1.File);
            const kpiRepo = database_1.AppDataSource.getRepository(models_1.KPIRecord);
            const recurringRepo = database_1.AppDataSource.getRepository(models_1.RecurringTask);
            // 1) ลบงานทั้งหมด (ใช้ service เพื่อจัดการ Calendar/notification และความสัมพันธ์)
            const taskDeleteSummary = await this.taskService.deleteAllTasksInGroup(group.id);
            // 2) ลบไฟล์ทั้งหมดของกลุ่ม ด้วย FileService (ให้จัดการ storage/cloudinary ให้เรียบร้อย)
            const files = await fileRepo.find({ where: { groupId: group.id } });
            let filesDeleted = 0;
            for (const f of files) {
                try {
                    await this.fileService.deleteFile(f.id);
                    filesDeleted++;
                }
                catch (e) {
                    console.warn("⚠️ Failed to delete file", f.id, e);
                }
            }
            // 3) ลบ KPI records ของกลุ่ม (เพื่อป้องกัน FK block)
            const kpiDeleteResult = await kpiRepo.delete({ groupId: group.id });
            const kpisDeleted = kpiDeleteResult.affected || 0;
            // 4) ลบ recurring templates ที่อ้างด้วย LINE Group ID
            const recurringDeleteResult = await recurringRepo.delete({
                lineGroupId: group.lineGroupId,
            });
            const recurringDeleted = recurringDeleteResult.affected || 0;
            // 5) ลบตัวกลุ่ม (จะ CASCADE ลบ members, tasks/files ที่เหลือใน DB)
            await groupRepo.delete({ id: group.id });
            res.json({
                success: true,
                message: "Group and related data have been hard-deleted",
                data: {
                    group: {
                        id: group.id,
                        lineGroupId: group.lineGroupId,
                        name: group.name,
                    },
                    tasks: { deleted: taskDeleteSummary.deletedCount },
                    files: { deleted: filesDeleted },
                    kpiRecords: { deleted: kpisDeleted },
                    recurringTemplates: { deleted: recurringDeleted },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error hard-deleting group:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to hard-delete group" });
        }
    }
    /**
     * GET /api/tasks - ดึงรายการงาน
     */
    async getTasks(req, res) {
        try {
            const { groupId } = req.params;
            const { status, assignee, tags, startDate, endDate, page = 1, limit = 20, } = req.query;
            const parseStatus = () => {
                const raw = req.query.status;
                const normalize = (value) => {
                    if (!value)
                        return [];
                    if (Array.isArray(value)) {
                        return value.flatMap((item) => normalize(item));
                    }
                    if (typeof value === "string") {
                        return value
                            .split(",")
                            .map((entry) => entry.trim())
                            .filter(Boolean);
                    }
                    return [];
                };
                const rawStatuses = normalize(raw);
                const validStatuses = [
                    "pending",
                    "in_progress",
                    "submitted",
                    "reviewed",
                    "approved",
                    "completed",
                    "rejected",
                    "cancelled",
                    "overdue",
                ];
                const validSet = new Set(validStatuses);
                const parsed = rawStatuses.filter((status) => validSet.has(status));
                return parsed.length > 0 ? parsed : undefined;
            };
            const statusFilter = parseStatus();
            const options = {
                status: statusFilter,
                assigneeId: assignee,
                tags: tags ? tags.split(",") : undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
            };
            const { tasks, total } = await this.taskService.getGroupTasks(groupId, options);
            // แปลง Task entities เป็น interfaces พร้อมข้อมูลผู้ใช้ที่สมบูรณ์
            const tasksWithUserInfo = tasks.map((task) => (0, adapters_1.taskEntityToInterface)(task));
            const response = {
                success: true,
                data: tasksWithUserInfo,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting tasks:", error);
            // Provide more specific error messages
            let errorMessage = "Failed to get tasks";
            if (error instanceof Error) {
                if (error.message.includes("Group not found")) {
                    errorMessage = "Group not found";
                }
                else if (error.message.includes("Invalid date")) {
                    errorMessage = "Invalid date format provided";
                }
                else {
                    errorMessage = error.message;
                }
            }
            res.status(500).json({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === "development"
                    ? error instanceof Error
                        ? error.stack
                        : undefined
                    : undefined,
            });
        }
    }
    /**
     * POST /api/tasks - สร้างงานใหม่
     */
    async createTask(req, res) {
        try {
            const { groupId } = req.params;
            const taskData = req.body;
            // Debug logging
            logger_1.logger.info("📝 Creating task with data:", {
                groupId,
                title: taskData.title,
                assigneeIds: taskData.assigneeIds,
                createdBy: taskData.createdBy,
                dueTime: taskData.dueTime,
                hasDescription: !!taskData.description,
                priority: taskData.priority,
                tags: taskData.tags,
                requireAttachment: taskData.requireAttachment,
                reviewerUserId: taskData.reviewerUserId,
                fileIds: taskData.fileIds,
            });
            // ตรวจสอบ required fields
            const requiredFields = ["title", "assigneeIds", "createdBy", "dueTime"];
            for (const field of requiredFields) {
                if (!taskData[field]) {
                    logger_1.logger.warn(`⚠️ Missing required field: ${field}`);
                    res.status(400).json({
                        success: false,
                        error: `Missing required field: ${field}`,
                        details: `Field '${field}' is required but not provided`,
                    });
                    return;
                }
            }
            const dueTime = new Date(taskData.dueTime);
            if (Number.isNaN(dueTime.getTime())) {
                res.status(400).json({
                    success: false,
                    error: "รูปแบบวันที่กำหนดส่งไม่ถูกต้อง",
                    details: `dueTime received: ${taskData.dueTime}`,
                });
                return;
            }
            const startTime = taskData.startTime
                ? new Date(taskData.startTime)
                : undefined;
            if (startTime && Number.isNaN(startTime.getTime())) {
                res.status(400).json({
                    success: false,
                    error: "รูปแบบวันเริ่มไม่ถูกต้อง",
                    details: `startTime received: ${taskData.startTime}`,
                });
                return;
            }
            const task = await this.taskService.createTask({
                ...taskData,
                groupId,
                dueTime,
                startTime,
                requireAttachment: !!taskData.requireAttachment,
                reviewerUserId: taskData.reviewerUserId,
            });
            // Log activity
            await (0, activityLogger_1.logActivity)(groupId, taskData.createdBy, activityLogger_1.ActivityActions.TASK_CREATED, activityLogger_1.ResourceTypes.TASK, task.id, {
                title: task.title,
                assigneeIds: taskData.assigneeIds,
                priority: task.priority,
            }, req);
            const response = {
                success: true,
                data: (0, adapters_1.taskEntityToInterface)(task),
                message: "Task created successfully",
            };
            res.status(201).json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error creating task:", error);
            // Provide more specific error messages
            let errorMessage = "Failed to create task";
            let statusCode = 500;
            if (error instanceof Error) {
                if (error.message.includes("Group not found")) {
                    errorMessage = "Group not found";
                    statusCode = 404;
                }
                else if (error.message.includes("Creator user not found")) {
                    errorMessage = "Creator user not found";
                    statusCode = 400;
                }
                else if (error.message.includes("งานนี้ถูกสร้างไปแล้ว")) {
                    errorMessage = error.message;
                    statusCode = 409;
                }
                else if (error.message.includes("Missing required field")) {
                    errorMessage = error.message;
                    statusCode = 400;
                }
                else {
                    errorMessage = error.message;
                }
            }
            res.status(statusCode).json({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === "development"
                    ? error instanceof Error
                        ? error.stack
                        : undefined
                    : undefined,
            });
        }
    }
    /** UI ส่งงาน: อัปโหลดไฟล์/ลิงก์ + บันทึก submission */
    async submitTask(req, res) {
        try {
            const { groupId, taskId } = req.params;
            const { userId, comment, links } = req.body || {};
            const files = req.files || [];
            // ถ้าไม่มี groupId ให้ดึงจาก task
            let finalGroupId = groupId;
            if (!finalGroupId) {
                const task = await this.taskService.getTaskById(taskId);
                if (!task) {
                    res.status(404).json({ success: false, error: "Task not found" });
                    return;
                }
                finalGroupId = task.groupId;
            }
            const ALLOWED_MIME_TYPES = [
                // Images
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/bmp",
                "image/tiff",
                "image/svg+xml",
                "image/x-icon",
                // Videos
                "video/mp4",
                "video/quicktime",
                "video/x-msvideo", // .avi
                "video/x-ms-wmv", // .wmv
                "video/webm",
                "video/x-flv",
                "video/3gpp",
                // Audio
                "audio/mpeg", // .mp3
                "audio/wav",
                "audio/ogg",
                "audio/aac",
                "audio/flac",
                "audio/mp4", // .m4a
                "audio/x-ms-wma",
                // Documents - PDF
                "application/pdf",
                // Documents - Microsoft Office (Modern)
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
                // Documents - Microsoft Office (Legacy)
                "application/msword", // .doc
                "application/vnd.ms-excel", // .xls
                "application/vnd.ms-powerpoint", // .ppt
                // Documents - OpenOffice/LibreOffice
                "application/vnd.oasis.opendocument.text", // .odt
                "application/vnd.oasis.opendocument.spreadsheet", // .ods
                "application/vnd.oasis.opendocument.presentation", // .odp
                // Text Files
                "text/plain",
                "text/csv",
                "text/html",
                "text/css",
                "text/javascript",
                "text/xml",
                "text/rtf",
                // Development Files
                "application/json",
                "application/xml",
                "application/javascript",
                "application/typescript",
                "text/x-python",
                "text/x-java-source",
                "text/x-c",
                "text/x-c++",
                "application/x-sh",
                // Archives
                "application/zip",
                "application/x-rar-compressed",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/gzip",
                "application/x-bzip2",
                // Design Files
                "application/postscript", // .ai, .eps
                "image/vnd.adobe.photoshop", // .psd
                "application/vnd.adobe.illustrator", // .ai
                "application/x-indesign", // .indd
                "application/x-figma", // Custom figma files
                "application/x-sketch", // Sketch files
                // CAD Files
                "application/vnd.autodesk.dwg",
                "application/vnd.autodesk.dwf",
                "image/vnd.dwg",
                "application/x-autocad",
                // 3D Files
                "model/obj",
                "model/fbx",
                "model/3mf",
                "application/x-blender",
                // Fonts
                "font/ttf",
                "font/otf",
                "font/woff",
                "font/woff2",
                "application/font-woff",
                "application/x-font-ttf",
                // E-books
                "application/epub+zip",
                "application/x-mobipocket-ebook",
                // Database
                "application/x-sqlite3",
                "application/vnd.ms-access",
                // Custom and Generic Types
                "application/dvg", // Custom .dvg format
                "application/x-dvg", // Alternative .dvg format
                "application/octet-stream", // Generic binary files - catch-all for unknown types
            ];
            const MAX_ATTACHMENTS = 5;
            // สร้าง temporary userId ถ้าไม่มี
            let finalUserId = userId;
            if (!finalUserId) {
                finalUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                console.log("สร้าง temporary userId สำหรับการส่งงาน:", finalUserId);
            }
            // อนุญาตให้ส่งงานได้แม้ไม่มีไฟล์/ลิงก์ (จะถือเป็นการส่งหมายเหตุอย่างเดียว)
            if (files.length > MAX_ATTACHMENTS) {
                res.status(400).json({
                    success: false,
                    error: `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
                });
                return;
            }
            const invalidFile = files.find((f) => !ALLOWED_MIME_TYPES.includes(f.mimetype));
            if (invalidFile) {
                res.status(400).json({
                    success: false,
                    error: `Invalid file type: ${invalidFile.mimetype}`,
                });
                return;
            }
            // บันทึกไฟล์ทั้งหมด แล้วได้ fileIds
            const savedFileIds = await Promise.all(files.map(async (f) => {
                const saved = await this.fileService.saveFile({
                    groupId: finalGroupId,
                    uploadedBy: finalUserId,
                    messageId: f.originalname,
                    content: f.buffer,
                    originalName: f.originalname,
                    mimeType: f.mimetype,
                    folderStatus: "in_progress",
                });
                return saved.id;
            }));
            // บันทึกเป็นการส่งงาน
            const task = await this.taskService.recordSubmission(taskId, finalUserId, savedFileIds, comment, links);
            res.json({
                success: true,
                data: task,
                message: "Submitted successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("❌ submitTask error:", error);
            res.status(500).json({ success: false, error: "Failed to submit task" });
        }
    }
    /**
     * POST /api/dashboard/tasks/:taskId/submit - ส่งงานจากหน้า Dashboard (ไม่ต้องตรวจสอบ authentication)
     * ใช้ userId โดยตรงแทนการ authenticate
     */
    async submitTaskFromDashboard(req, res) {
        try {
            const { taskId } = req.params;
            const { userId, comment, links } = req.body || {};
            const files = req.files || [];
            // Validate required userId
            if (!userId) {
                res.status(400).json({ success: false, error: "userId is required" });
                return;
            }
            // ตรวจสอบว่าผู้ใช้มีอยู่จริง
            const user = await this.userService.findByLineUserId(userId);
            if (!user) {
                res.status(404).json({ success: false, error: "User not found" });
                return;
            }
            // ตรวจสอบว่างานมีอยู่จริง
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                res.status(404).json({ success: false, error: "Task not found" });
                return;
            }
            // ตรวจสอบว่าผู้ใช้ได้รับมอบหมายงานนี้หรือไม่
            const isAssigned = task.assignedUsers?.some((assignedUser) => assignedUser.lineUserId === userId);
            if (!isAssigned) {
                res.status(403).json({
                    success: false,
                    error: "คุณไม่ได้เป็นผู้รับผิดชอบงานนี้ จึงไม่สามารถส่งงานได้",
                    details: "Task submission is only allowed for assigned users",
                });
                return;
            }
            const ALLOWED_MIME_TYPES = [
                // Images
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/bmp",
                "image/tiff",
                "image/svg+xml",
                "image/x-icon",
                // Videos
                "video/mp4",
                "video/quicktime",
                "video/x-msvideo",
                "video/x-ms-wmv",
                "video/webm",
                "video/x-flv",
                "video/3gpp",
                // Audio
                "audio/mpeg",
                "audio/wav",
                "audio/ogg",
                "audio/aac",
                "audio/flac",
                "audio/mp4",
                "audio/x-ms-wma",
                // Documents - PDF
                "application/pdf",
                // Documents - Microsoft Office (Modern)
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
                // Documents - Microsoft Office (Legacy)
                "application/msword",
                "application/vnd.ms-excel",
                "application/vnd.ms-powerpoint",
                // Documents - OpenOffice/LibreOffice
                "application/vnd.oasis.opendocument.text",
                "application/vnd.oasis.opendocument.spreadsheet",
                "application/vnd.oasis.opendocument.presentation",
                // Text Files
                "text/plain",
                "text/csv",
                "text/html",
                "text/css",
                "text/javascript",
                "text/xml",
                "text/rtf",
                // Development Files
                "application/json",
                "application/xml",
                "application/javascript",
                "application/typescript",
                "text/x-python",
                "text/x-java-source",
                "text/x-c",
                "text/x-c++",
                "application/x-sh",
                // Archives
                "application/zip",
                "application/x-rar-compressed",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/gzip",
                "application/x-bzip2",
                // Design Files
                "application/postscript",
                "image/vnd.adobe.photoshop",
                "application/vnd.adobe.illustrator",
                "application/x-indesign",
                "application/x-figma",
                "application/x-sketch",
                // CAD Files
                "application/vnd.autodesk.dwg",
                "application/vnd.autodesk.dwf",
                "image/vnd.dwg",
                "application/x-autocad",
                // 3D Files
                "model/obj",
                "model/fbx",
                "model/3mf",
                "application/x-blender",
                // Fonts
                "font/ttf",
                "font/otf",
                "font/woff",
                "font/woff2",
                "application/font-woff",
                "application/x-font-ttf",
                // E-books
                "application/epub+zip",
                "application/x-mobipocket-ebook",
                // Database
                "application/x-sqlite3",
                "application/vnd.ms-access",
                // Custom and Generic Types
                "application/dvg",
                "application/x-dvg",
                "application/octet-stream",
            ];
            const MAX_ATTACHMENTS = 5;
            // ตรวจสอบจำนวนไฟล์
            if (files.length > MAX_ATTACHMENTS) {
                res.status(400).json({
                    success: false,
                    error: `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
                });
                return;
            }
            // ตรวจสอบชนิดไฟล์
            const invalidFile = files.find((f) => !ALLOWED_MIME_TYPES.includes(f.mimetype));
            if (invalidFile) {
                res.status(400).json({
                    success: false,
                    error: `Invalid file type: ${invalidFile.mimetype}`,
                });
                return;
            }
            // บันทึกไฟล์ทั้งหมด แล้วได้ fileIds
            const savedFileIds = await Promise.all(files.map(async (f) => {
                const saved = await this.fileService.saveFile({
                    groupId: task.groupId,
                    uploadedBy: userId,
                    messageId: f.originalname,
                    content: f.buffer,
                    originalName: f.originalname,
                    mimeType: f.mimetype,
                    folderStatus: "in_progress",
                });
                return saved.id;
            }));
            // บันทึกเป็นการส่งงาน
            const submittedTask = await this.taskService.recordSubmission(taskId, userId, savedFileIds, comment, links);
            logger_1.logger.info(`✅ Dashboard task submission completed:`, {
                taskId,
                userId,
                filesCount: files.length,
                hasComment: !!comment,
            });
            res.json({
                success: true,
                data: submittedTask,
                message: "Task submitted successfully from dashboard",
            });
        }
        catch (error) {
            logger_1.logger.error("❌ submitTaskFromDashboard error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to submit task from dashboard",
            });
        }
    }
    /**
     * PUT /api/dashboard/groups/:groupId/tasks/:taskId
     * อัปเดตงานจากหน้า Dashboard โดยใช้ userId (LINE) เพื่อยืนยันสิทธิ์ แทน JWT
     * การอนุญาต: ต้องเป็นผู้สร้างงาน และเป็นสมาชิกของกลุ่ม
     */
    async updateTaskFromDashboard(req, res) {
        try {
            const { groupId, taskId } = req.params;
            const body = (req.body || {});
            // Require userId in payload
            const userId = (body.userId || "").trim(); // LINE User ID expected (starts with 'U')
            if (!userId) {
                res
                    .status(400)
                    .json({ success: false, error: "userId is required in payload" });
                return;
            }
            // Load task with relations
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                res.status(404).json({ success: false, error: "Task not found" });
                return;
            }
            // Resolve groupId (accept internal UUID or LINE group ID)
            let groupInternal = null;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            if (isUuid) {
                groupInternal = await this.userService.findGroupById(groupId);
            }
            else {
                groupInternal = await this.userService.findGroupByLineId(groupId);
            }
            if (!groupInternal) {
                res.status(404).json({ success: false, error: "Group not found" });
                return;
            }
            // Ensure task belongs to the specified group
            if (task.groupId !== groupInternal.id) {
                res.status(400).json({
                    success: false,
                    error: "Task does not belong to the specified group",
                });
                return;
            }
            // Resolve user by LINE ID and verify group membership
            const user = await this.userService.findByLineUserId(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: "User not found for provided userId",
                });
                return;
            }
            const membership = await this.userService.findGroupMembership(user.id, groupInternal.id);
            if (!membership) {
                res
                    .status(403)
                    .json({ success: false, error: "Group membership required" });
                return;
            }
            // Only task creator can edit
            const isCreator = task.createdBy === user.id ||
                task.createdByUser?.id === user.id ||
                task.createdByUser?.lineUserId === user.lineUserId;
            if (!isCreator) {
                res.status(403).json({
                    success: false,
                    error: "Only the task creator can edit this task",
                });
                return;
            }
            // Build safe updates (allow-listed keys only)
            const allowedKeys = new Set([
                "title",
                "description",
                "dueTime",
                "startTime",
                "priority",
                "assigneeIds",
                "tags",
                "requireAttachment",
                "reviewAction",
                "reviewerUserId",
                "reviewerComment",
                "status",
                // Allow appending files via fileIds (additive linking handled in service)
                "fileIds",
            ]);
            const updates = {};
            for (const [k, v] of Object.entries(body)) {
                if (k === "userId")
                    continue; // skip auth field
                if (allowedKeys.has(k)) {
                    updates[k] = v;
                }
            }
            // Cast date strings
            if (typeof updates.dueTime === "string") {
                updates.dueTime = new Date(updates.dueTime);
            }
            if (typeof updates.startTime === "string") {
                updates.startTime = new Date(updates.startTime);
            }
            // Normalize fileIds if provided as a comma-separated string
            if (typeof updates.fileIds === "string") {
                updates.fileIds = String(updates.fileIds)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
            }
            // No updates provided
            if (Object.keys(updates).length === 0) {
                res
                    .status(400)
                    .json({ success: false, error: "No valid fields to update" });
                return;
            }
            // Perform update
            const updatedTask = await this.taskService.updateTask(taskId, updates);
            logger_1.logger.info("✅ Dashboard task updated (no-auth endpoint)", {
                taskId,
                groupId: groupInternal.id,
                byLineUserId: user.lineUserId,
                updates: Object.keys(updates),
            });
            res.json({
                success: true,
                data: (0, adapters_1.taskEntityToInterface)(updatedTask),
                message: "Task updated successfully (dashboard)",
            });
        }
        catch (error) {
            logger_1.logger.error("❌ updateTaskFromDashboard error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update task from dashboard",
            });
        }
    }
    /**
     * PUT /api/tasks/:taskId - อัปเดตงาน
     */
    async updateTask(req, res) {
        try {
            const { taskId } = req.params;
            const updates = { ...req.body };
            // แปลงชนิดวันที่จาก string -> Date เพื่อความเข้ากันได้กับ TypeORM/Service
            if (updates) {
                if (typeof updates.dueTime === "string") {
                    updates.dueTime = new Date(updates.dueTime);
                }
                if (typeof updates.startTime === "string") {
                    updates.startTime = new Date(updates.startTime);
                }
                // ป้องกันการเขียนทับความสัมพันธ์ไฟล์โดยไม่ตั้งใจ
                if ("attachedFiles" in updates) {
                    delete updates.attachedFiles;
                }
                // รองรับการแนบไฟล์แบบเพิ่ม โดยส่ง fileIds
                if (typeof updates.fileIds === "string") {
                    updates.fileIds = String(updates.fileIds)
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                }
            }
            const task = await this.taskService.updateTask(taskId, updates);
            const response = {
                success: true,
                data: task,
                message: "Task updated successfully",
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error updating task:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update task",
            });
        }
    }
    /**
     * POST /api/groups/:groupId/tasks/:taskId/approve-extension - อนุมัติการเลื่อนเวลา
     */
    async approveExtension(req, res) {
        try {
            const { groupId, taskId } = req.params;
            const { newDueDate, newDueTime } = req.body;
            if (!newDueDate) {
                res.status(400).json({
                    success: false,
                    error: "กรุณาระบุวันที่ใหม่",
                });
                return;
            }
            // รวม date และ time เป็น datetime
            const dueTimeString = newDueTime || "23:59";
            const newDueDateTime = new Date(`${newDueDate}T${dueTimeString}:00.000+07:00`);
            // อัปเดตงานด้วยวันที่ใหม่
            const updatedTask = await this.taskService.updateTask(taskId, {
                dueTime: newDueDateTime,
            });
            // ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
            await this.taskService.sendExtensionApprovalNotification(taskId, newDueDateTime);
            res.json({
                success: true,
                data: (0, adapters_1.taskEntityToInterface)(updatedTask),
                message: "อนุมัติการเลื่อนเวลาและส่งแจ้งเตือนเรียบร้อยแล้ว",
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error approving extension:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "เกิดข้อผิดพลาดในการอนุมัติการเลื่อนเวลา",
            });
        }
    }
    /**
     * POST /api/tasks/:taskId/complete - ปิดงาน
     */
    async completeTask(req, res) {
        try {
            const { taskId } = req.params;
            const { userId } = req.body;
            const taskEntity = await this.taskService.completeTask(taskId, userId);
            // บันทึก KPI ใช้ entity โดยตรง
            const completionType = this.kpiService.calculateCompletionType(taskEntity);
            await this.kpiService.recordTaskCompletion(taskEntity, completionType);
            // แปลง entity เป็น interface สำหรับ response
            const task = (0, adapters_1.taskEntityToInterface)(taskEntity);
            const response = {
                success: true,
                data: task,
                message: "Task completed successfully",
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error completing task:", error);
            res.status(500).json({
                success: false,
                error: "Failed to complete task",
            });
        }
    }
    /**
     * GET /api/calendar/:groupId - ดึงข้อมูลปฏิทิน
     */
    async getCalendarEvents(req, res) {
        try {
            const { groupId } = req.params;
            const { startDate, endDate, month, year } = req.query;
            let start;
            let end;
            // รองรับทั้ง startDate/endDate และ month/year
            if (month && year) {
                // Dashboard format
                const monthNum = parseInt(month);
                const yearNum = parseInt(year);
                start = new Date(yearNum, monthNum - 1, 1); // เดือนเริ่มจาก 0
                end = new Date(yearNum, monthNum, 0, 23, 59, 59); // วันสุดท้ายของเดือน
            }
            else if (startDate && endDate) {
                // API format
                start = new Date(startDate);
                end = new Date(endDate);
            }
            else {
                // Default: current month
                const now = new Date();
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }
            const events = await this.taskService.getCalendarEvents(groupId, start, end);
            const response = {
                success: true,
                data: events,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting calendar events:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get calendar events",
            });
        }
    }
    // File Endpoints
    /**
     * GET /api/groups/:groupId/tasks/:taskId/files - ดึงไฟล์ของงานเฉพาะ
     * Note: Public access - no authentication required
     */
    async getTaskFiles(req, res) {
        try {
            const { groupId, taskId } = req.params;
            // ตรวจสอบว่างานมีอยู่
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                res.status(404).json({
                    success: false,
                    error: "Task not found",
                });
                return;
            }
            // Allow file access regardless of group ownership for dashboard compatibility
            // Note: Files are considered public within the system for viewing purposes
            // ดึงไฟล์ที่ผูกกับงาน
            let files = await this.fileService.getTaskFiles(taskId);
            // ถ้าไม่พบไฟล์ ให้ลอง fallback เพิ่มเติม
            if ((!files || files.length === 0) && task) {
                // 1) relations ที่โหลดมากับ task (attachedFiles)
                if (Array.isArray(task.attachedFiles) &&
                    task.attachedFiles.length > 0) {
                    files = task.attachedFiles;
                }
                // 2) workflow submissions → รวม fileIds ทั้งหมดแล้วดึงรายละเอียดไฟล์
                if ((!files || files.length === 0) &&
                    task.workflow &&
                    Array.isArray(task.workflow.submissions)) {
                    const submissions = task.workflow.submissions;
                    const allFileIds = submissions.flatMap((s) => Array.isArray(s.fileIds) ? s.fileIds : []);
                    if (allFileIds.length > 0) {
                        try {
                            files = await this.fileService.getFilesByIds(allFileIds);
                        }
                        catch {
                            // เงียบ error เพื่อไม่ให้ endpoint ล้ม
                        }
                    }
                }
            }
            // เติม/normalize attachmentType ให้แน่ใจว่ามีค่า initial/submission เสมอ
            const submissionIdSet = new Set(Array.isArray(task?.workflow?.submissions)
                ? task.workflow.submissions.flatMap((s) => Array.isArray(s.fileIds) ? s.fileIds : [])
                : []);
            const normalized = (files || []).map((f) => {
                const out = {
                    id: f.id,
                    groupId: f.groupId,
                    originalName: f.originalName,
                    fileName: f.fileName,
                    mimeType: f.mimeType,
                    size: f.size,
                    uploadedBy: f.uploadedBy,
                    uploadedAt: f.uploadedAt,
                    tags: f.tags,
                    linkedTasks: Array.isArray(f.linkedTasks)
                        ? f.linkedTasks.map((t) => t.id || t)
                        : [],
                    path: f.path,
                    isPublic: f.isPublic,
                    attachmentType: f.attachmentType,
                };
                if (!out.attachmentType) {
                    out.attachmentType = submissionIdSet.has(out.id)
                        ? "submission"
                        : "initial";
                }
                return out;
            });
            const response = {
                success: true,
                data: normalized,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting task files:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get task files",
            });
        }
    }
    /**
     * GET /api/groups/:groupId/files - ดึงไฟล์ทั้งหมดของกลุ่ม
     * Note: Public access - no authentication required
     */
    async getGroupFiles(req, res) {
        try {
            const { groupId } = req.params;
            const { page = 1, limit = 50, search, tags, mimeType } = req.query;
            // Build filter parameters
            const filters = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), 100), // Cap at 100
                offset: (parseInt(page) - 1) *
                    Math.min(parseInt(limit), 100),
            };
            if (search)
                filters.search = search;
            if (tags)
                filters.tags = tags.split(",");
            if (mimeType)
                filters.mimeType = mimeType;
            // Get files for the group
            const result = await this.fileService.getGroupFiles(groupId, filters);
            // Calculate pagination
            const totalPages = Math.ceil(result.total / filters.limit);
            const response = {
                success: true,
                data: result.files || [],
                pagination: {
                    page: filters.page,
                    limit: filters.limit,
                    total: result.total,
                    totalPages,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting group files:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get group files",
            });
        }
    }
    /**
     * Fallback method สำหรับดาวน์โหลดไฟล์เมื่อ streaming ไม่สำเร็จ
     */
    async fallbackToFileDownload(fileId, res, mimeType, downloadName) {
        try {
            logger_1.logger.info(`🔄 Fallback: ดึงไฟล์ ${fileId} ผ่าน getFileContent`);
            const { content, mimeType: actualMimeType, originalName, } = await this.fileService.getFileContent(fileId);
            const safeName = (0, utils_1.sanitize)(downloadName);
            // สร้าง Content-Disposition header ที่รองรับ UTF-8
            const encodedName = encodeURIComponent(safeName);
            const contentDisposition = `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
            res.set({
                "Content-Type": actualMimeType || mimeType,
                "Content-Disposition": contentDisposition,
                "Content-Length": content.length.toString(),
            });
            res.send(content);
        }
        catch (error) {
            const statusCode = error?.statusCode;
            const url = error?.url;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger_1.logger.error(`❌ Fallback download failed for file ${fileId}:`, {
                url,
                statusCode,
                error: errorMessage,
            });
            if (statusCode) {
                if (statusCode >= 500) {
                    res.status(502).json({ success: false, error: errorMessage, url });
                }
                else {
                    res
                        .status(statusCode)
                        .json({ success: false, error: errorMessage, url });
                }
            }
            else {
                res
                    .status(503)
                    .json({ success: false, error: "File temporarily unavailable", url });
            }
        }
    }
    /**
     * Fallback method สำหรับดูไฟล์เมื่อ streaming ไม่สำเร็จ
     */
    async fallbackToPreviewFile(fileId, res) {
        try {
            logger_1.logger.info(`🔄 Fallback: ดึงไฟล์ ${fileId} ผ่าน getFileContent สำหรับ preview`);
            const { content, mimeType, originalName } = await this.fileService.getFileContent(fileId);
            // รองรับเฉพาะไฟล์ที่ดูตัวอย่างได้
            const previewableMimes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "application/pdf",
                "text/plain",
            ];
            if (!previewableMimes.includes(mimeType)) {
                res.status(400).json({
                    success: false,
                    error: "File type not previewable",
                });
                return;
            }
            // ตรวจสอบและสร้างชื่อไฟล์ที่เหมาะสมสำหรับ header
            let previewName = originalName && originalName.trim() !== ""
                ? originalName
                : `file_${fileId}`;
            const ext = this.fileService.getFileExtension
                ? this.fileService.getFileExtension(mimeType, previewName)
                : "";
            if (ext && !previewName.toLowerCase().endsWith(ext.toLowerCase())) {
                previewName += ext;
            }
            previewName = (0, utils_1.sanitize)(previewName);
            const encodedName = encodeURIComponent(previewName);
            res.set({
                "Content-Type": mimeType,
                "Content-Length": content.length.toString(),
                "Content-Disposition": `inline; filename="${previewName}"; filename*=UTF-8''${encodedName}`,
            });
            res.send(content);
        }
        catch (error) {
            const statusCode = error?.statusCode;
            const url = error?.url;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger_1.logger.error(`❌ Fallback preview failed for file ${fileId}:`, {
                url,
                statusCode,
                error: errorMessage,
            });
            if (statusCode) {
                if (statusCode >= 500) {
                    res.status(502).json({ success: false, error: errorMessage, url });
                }
                else {
                    res
                        .status(statusCode)
                        .json({ success: false, error: errorMessage, url });
                }
            }
            else {
                res
                    .status(503)
                    .json({ success: false, error: "File temporarily unavailable", url });
            }
        }
    }
    /**
     * GET /api/files/:fileId/preview - ดูตัวอย่างไฟล์
     * GET /api/groups/:groupId/files/:fileId/preview - ดูตัวอย่างไฟล์ (พร้อมตรวจสอบ group)
     */
    async previewFile(req, res) {
        let fileUrl;
        try {
            const { fileId, groupId } = req.params;
            // ถ้ามี groupId ให้ตรวจสอบว่าไฟล์เป็นของกลุ่มนั้นจริง
            if (groupId) {
                const isAuthorized = await this.fileService.isFileInGroup(fileId, groupId);
                if (!isAuthorized) {
                    res
                        .status(403)
                        .json({ success: false, error: "Access denied to file" });
                    return;
                }
            }
            const file = await this.fileService.getFileInfo(fileId);
            if (!file) {
                res.status(404).json({ success: false, error: "File not found" });
                return;
            }
            // หากเป็น HEAD: ตอบกลับอย่างรวดเร็วโดยไม่ดึงไฟล์จริง ลดโอกาส error
            if (req.method === "HEAD") {
                res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
                res.status(200).end();
                return;
            }
            // กรณี GET: เปลี่ยนเป็น redirect ไปยัง URL ต้นทาง (ลงลายเซ็นถ้าจำเป็น)
            const path = file.path;
            const isRemote = !!(path && /^https?:\/\//i.test(path));
            if (isRemote || file.storageProvider === "cloudinary") {
                // ใช้ URL สำหรับพรีวิว (ไม่บังคับ attachment)
                const directUrl = this.fileService.resolveFileUrl(file);
                fileUrl = directUrl;
                logger_1.logger.info("🔁 Redirecting preview to direct URL", {
                    fileId,
                    directUrl,
                });
                res.redirect(302, directUrl);
                return;
            }
            // โลคอลหรือไม่สามารถสร้าง direct URL ได้ → ส่งไฟล์แบบ inline (เดิม)
            const { content, mimeType, originalName } = await this.fileService.getFileContent(fileId);
            const previewableMimes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "application/pdf",
                "text/plain",
            ];
            if (!previewableMimes.includes(mimeType)) {
                res
                    .status(400)
                    .json({ success: false, error: "File type not previewable" });
                return;
            }
            let previewName = originalName && originalName.trim() !== ""
                ? originalName
                : `file_${fileId}`;
            const ext = this.fileService.getFileExtension
                ? this.fileService.getFileExtension(mimeType, previewName)
                : "";
            if (ext && !previewName.toLowerCase().endsWith(ext.toLowerCase())) {
                previewName += ext;
            }
            previewName = (0, utils_1.sanitize)(previewName);
            const encodedName = encodeURIComponent(previewName);
            res.set({
                "Content-Type": mimeType,
                "Content-Length": content.length.toString(),
                "Content-Disposition": `inline; filename="${previewName}"; filename*=UTF-8''${encodedName}`,
            });
            res.send(content);
        }
        catch (error) {
            const statusCode = error?.statusCode;
            const url = error?.url || fileUrl;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger_1.logger.error("❌ Error previewing file", {
                fileId: req.params.fileId,
                url,
                statusCode,
                message: errorMessage,
            });
            if (statusCode) {
                if (statusCode >= 500) {
                    res.status(502).json({ success: false, error: errorMessage, url });
                }
                else {
                    res
                        .status(statusCode)
                        .json({ success: false, error: errorMessage, url });
                }
            }
            else if (errorMessage.includes("File not found")) {
                res.status(404).json({ success: false, error: "File not found", url });
            }
            else {
                res
                    .status(500)
                    .json({ success: false, error: "Internal server error", url });
            }
        }
    }
    /**
     * GET /api/groups/:groupId/files/:fileId - ดึงข้อมูลไฟล์โดยตรง
     */
    async getFileInfo(req, res) {
        try {
            const { fileId, groupId } = req.params;
            // ตรวจสอบว่าไฟล์อยู่ในกลุ่มที่ระบุหรือไม่
            if (groupId) {
                const isAuthorized = await this.fileService.isFileInGroup(fileId, groupId);
                if (!isAuthorized) {
                    res.status(403).json({
                        success: false,
                        error: "Access denied to file",
                    });
                    return;
                }
            }
            const fileInfo = await this.fileService.getFileInfo(fileId);
            res.json({ success: true, data: fileInfo });
        }
        catch (error) {
            // ลดการ logging เพื่อป้องกัน rate limit
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (errorMessage.includes("File not found")) {
                res.status(404).json({
                    success: false,
                    error: "File not found",
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: "Internal server error",
                });
            }
        }
    }
    /**
     * POST /api/files/upload - อัปโหลดไฟล์ทั่วไป (สำหรับ Dashboard)
     * รองรับไฟล์รูปภาพ (JPEG, PNG, GIF), PDF, ข้อความธรรมดา และไฟล์เอกสาร Microsoft Office
     * form-data fields: files (array of files)
     */
    async uploadGeneralFiles(req, res) {
        try {
            const files = req.files;
            if (!files || files.length === 0) {
                res.status(400).json({ success: false, error: "No files provided" });
                return;
            }
            const ALLOWED_MIME_TYPES = [
                // Images
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/bmp",
                "image/tiff",
                "image/svg+xml",
                "image/x-icon",
                // Videos
                "video/mp4",
                "video/quicktime",
                "video/x-msvideo", // .avi
                "video/x-ms-wmv", // .wmv
                "video/webm",
                "video/x-flv",
                "video/3gpp",
                // Audio
                "audio/mpeg", // .mp3
                "audio/wav",
                "audio/ogg",
                "audio/aac",
                "audio/flac",
                "audio/mp4", // .m4a
                "audio/x-ms-wma",
                // Documents - PDF
                "application/pdf",
                // Documents - Microsoft Office (Modern)
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
                // Documents - Microsoft Office (Legacy)
                "application/msword", // .doc
                "application/vnd.ms-excel", // .xls
                "application/vnd.ms-powerpoint", // .ppt
                // Documents - OpenOffice/LibreOffice
                "application/vnd.oasis.opendocument.text", // .odt
                "application/vnd.oasis.opendocument.spreadsheet", // .ods
                "application/vnd.oasis.opendocument.presentation", // .odp
                // Text Files
                "text/plain",
                "text/csv",
                "text/html",
                "text/css",
                "text/javascript",
                "text/xml",
                "text/rtf",
                // Development Files
                "application/json",
                "application/xml",
                "application/javascript",
                "application/typescript",
                "text/x-python",
                "text/x-java-source",
                "text/x-c",
                "text/x-c++",
                "application/x-sh",
                // Archives
                "application/zip",
                "application/x-rar-compressed",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/gzip",
                "application/x-bzip2",
                // Design Files
                "application/postscript", // .ai, .eps
                "image/vnd.adobe.photoshop", // .psd
                "application/vnd.adobe.illustrator", // .ai
                "application/x-indesign", // .indd
                "application/x-figma", // Custom figma files
                "application/x-sketch", // Sketch files
                // CAD Files
                "application/vnd.autodesk.dwg",
                "application/vnd.autodesk.dwf",
                "image/vnd.dwg",
                "application/x-autocad",
                // 3D Files
                "model/obj",
                "model/fbx",
                "model/3mf",
                "application/x-blender",
                // Fonts
                "font/ttf",
                "font/otf",
                "font/woff",
                "font/woff2",
                "application/font-woff",
                "application/x-font-ttf",
                // E-books
                "application/epub+zip",
                "application/x-mobipocket-ebook",
                // Database
                "application/x-sqlite3",
                "application/vnd.ms-access",
                // Custom and Generic Types
                "application/dvg", // Custom .dvg format
                "application/x-dvg", // Alternative .dvg format
                "application/octet-stream", // Generic binary files - catch-all for unknown types
            ];
            // ตรวจสอบประเภทไฟล์
            for (const file of files) {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    res.status(400).json({
                        success: false,
                        error: `File type not allowed: ${file.originalname} (${file.mimetype})`,
                    });
                    return;
                }
            }
            // อัปโหลดไฟล์ไปยัง FileService
            const uploadedFiles = [];
            for (const file of files) {
                try {
                    const result = await this.fileService.saveFile({
                        groupId: "default", // ใช้ default group สำหรับไฟล์ทั่วไป
                        uploadedBy: "dashboard_user", // ใช้ default user สำหรับ dashboard
                        messageId: `dashboard_${Date.now()}`,
                        content: file.buffer,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        attachmentType: "initial",
                    });
                    uploadedFiles.push({
                        id: result.id,
                        name: file.originalname,
                        url: result.path,
                        size: file.size,
                        type: file.mimetype,
                        createdAt: result.uploadedAt.toISOString(),
                    });
                }
                catch (error) {
                    logger_1.logger.error("Error uploading file:", error);
                    res.status(500).json({
                        success: false,
                        error: `Failed to upload file: ${file.originalname}`,
                    });
                    return;
                }
            }
            res.json({
                success: true,
                data: uploadedFiles,
                message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            });
        }
        catch (error) {
            logger_1.logger.error("❌ uploadGeneralFiles error:", error);
            res.status(500).json({ success: false, error: "Failed to upload files" });
        }
    }
    /**
     * GET /api/files - ดึงรายการไฟล์ทั้งหมด
     */
    async getFiles(req, res) {
        try {
            const { page = 1, limit = 20, search } = req.query;
            const options = {
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                search: search,
            };
            // ใช้ getGroupFiles แทน getFiles
            const { files, total } = await this.fileService.getGroupFiles("default", {
                limit: options.limit,
                offset: options.offset,
                search: options.search,
            });
            const response = {
                success: true,
                data: files,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting files:", error);
            res.status(500).json({ success: false, error: "Failed to get files" });
        }
    }
    /**
     * GET /api/files/:fileId/download - ดาวน์โหลดไฟล์
     */
    async downloadFile(req, res) {
        try {
            const { fileId } = req.params;
            const file = await this.fileService.getFileInfo(fileId);
            if (!file) {
                res.status(404).json({ success: false, error: "File not found" });
                return;
            }
            // ถ้าเป็นไฟล์ remote (Cloudinary/URL) และสร้าง direct URL ได้ ให้ redirect ไปยัง res.cloudinary.com เพื่อลดภาระ proxy
            const path = file.path;
            const isRemote = !!(path && /^https?:\/\//i.test(path));
            if (isRemote) {
                const directUrl = this.fileService.getDirectDownloadUrl(file);
                if (directUrl) {
                    return res.redirect(302, directUrl);
                }
                // ถ้าสร้าง direct URL ไม่ได้ จะสตรีมแบบ buffered ด้านล่าง
            }
            // โลคอลหรือ fallback → ส่งเป็น buffer
            const fileContent = await this.fileService.getFileContent(fileId);
            // ตั้งค่า header ให้รองรับ UTF-8 และมีนามสกุลแน่นอน (เฉพาะกรณีส่งไฟล์เอง)
            const downloadName = this.fileService.getSafeDownloadFilename(file);
            const safeName = (0, utils_1.sanitize)(downloadName);
            const encodedName = encodeURIComponent(safeName);
            res.setHeader("Content-Type", file.mimeType);
            res.setHeader("Content-Disposition", `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
            res.setHeader("Content-Length", fileContent.content.length);
            res.send(fileContent.content);
        }
        catch (error) {
            logger_1.logger.error("❌ Error downloading file:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to download file" });
        }
    }
    /**
     * POST /api/admin/files/fix-filenames - ซ่อมแซมชื่อไฟล์เก่า (mojibake/ไม่มีนามสกุล)
     * query:
     *  - apply=true เพื่อบันทึกจริง (ค่า default จะเป็น dry-run)
     */
    async fixOldFilenames(req, res) {
        try {
            const apply = req.query.apply === "true" || req.query.apply === "1";
            const result = await this.fileService.repairFilenamesInDb(apply);
            res.json({ success: true, data: { apply, ...result } });
        }
        catch (error) {
            logger_1.logger.error("❌ Error fixing old filenames:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to fix filenames" });
        }
    }
    /**
     * DELETE /api/files/:fileId - ลบไฟล์
     */
    async deleteFile(req, res) {
        try {
            const { fileId } = req.params;
            const file = await this.fileService.getFileInfo(fileId);
            if (!file) {
                res.status(404).json({ success: false, error: "File not found" });
                return;
            }
            // ลบไฟล์จาก Cloudinary และฐานข้อมูล
            await this.fileService.deleteFile(fileId);
            res.json({ success: true, message: "File deleted successfully" });
        }
        catch (error) {
            logger_1.logger.error("❌ Error deleting file:", error);
            res.status(500).json({ success: false, error: "Failed to delete file" });
        }
    }
    /**
     * POST /api/groups/:groupId/files/upload - อัปโหลดไฟล์เข้าคลังไฟล์ของกลุ่มโดยตรง
     * รองรับไฟล์รูปภาพ (JPEG, PNG, GIF), PDF, ข้อความธรรมดา และไฟล์เอกสาร Microsoft Office (Word, Excel, PowerPoint)
     * form-data fields: userId (LINE User ID), comment (optional), tags (comma-separated, optional)
     */
    async uploadFiles(req, res) {
        try {
            const { groupId } = req.params;
            const { userId, tags, attachmentType } = (req.body || {});
            const files = req.files;
            if (!userId || userId === "unknown") {
                res.status(400).json({
                    success: false,
                    error: "Missing or invalid userId (LINE User ID)",
                });
                return;
            }
            if (!files || files.length === 0) {
                res.status(400).json({ success: false, error: "No files provided" });
                return;
            }
            const ALLOWED_MIME_TYPES = [
                // Images
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/bmp",
                "image/tiff",
                "image/svg+xml",
                "image/x-icon",
                // Videos
                "video/mp4",
                "video/quicktime",
                "video/x-msvideo", // .avi
                "video/x-ms-wmv", // .wmv
                "video/webm",
                "video/x-flv",
                "video/3gpp",
                // Audio
                "audio/mpeg", // .mp3
                "audio/wav",
                "audio/ogg",
                "audio/aac",
                "audio/flac",
                "audio/mp4", // .m4a
                "audio/x-ms-wma",
                // Documents - PDF
                "application/pdf",
                // Documents - Microsoft Office (Modern)
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
                // Documents - Microsoft Office (Legacy)
                "application/msword", // .doc
                "application/vnd.ms-excel", // .xls
                "application/vnd.ms-powerpoint", // .ppt
                // Documents - OpenOffice/LibreOffice
                "application/vnd.oasis.opendocument.text", // .odt
                "application/vnd.oasis.opendocument.spreadsheet", // .ods
                "application/vnd.oasis.opendocument.presentation", // .odp
                // Text Files
                "text/plain",
                "text/csv",
                "text/html",
                "text/css",
                "text/javascript",
                "text/xml",
                "text/rtf",
                // Development Files
                "application/json",
                "application/xml",
                "application/javascript",
                "application/typescript",
                "text/x-python",
                "text/x-java-source",
                "text/x-c",
                "text/x-c++",
                "application/x-sh",
                // Archives
                "application/zip",
                "application/x-rar-compressed",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/gzip",
                "application/x-bzip2",
                // Design Files
                "application/postscript", // .ai, .eps
                "image/vnd.adobe.photoshop", // .psd
                "application/vnd.adobe.illustrator", // .ai
                "application/x-indesign", // .indd
                "application/x-figma", // Custom figma files
                "application/x-sketch", // Sketch files
                // CAD Files
                "application/vnd.autodesk.dwg",
                "application/vnd.autodesk.dwf",
                "image/vnd.dwg",
                "application/x-autocad",
                // 3D Files
                "model/obj",
                "model/fbx",
                "model/3mf",
                "application/x-blender",
                // Fonts
                "font/ttf",
                "font/otf",
                "font/woff",
                "font/woff2",
                "application/font-woff",
                "application/x-font-ttf",
                // E-books
                "application/epub+zip",
                "application/x-mobipocket-ebook",
                // Database
                "application/x-sqlite3",
                "application/vnd.ms-access",
                // Executables and Installers (with caution)
                "application/x-msdownload", // .exe (for specific use cases)
                "application/vnd.microsoft.portable-executable",
                "application/x-deb",
                "application/x-redhat-package-manager", // .rpm
                "application/x-apple-diskimage", // .dmg
                // Custom and Generic Types
                "application/dvg", // Custom .dvg format
                "application/x-dvg", // Alternative .dvg format
                "application/octet-stream", // Generic binary files - catch-all for unknown types
            ];
            // ตรวจสอบประเภทไฟล์เท่านั้น (ไม่จำกัดขนาดไฟล์)
            for (const file of files) {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    res.status(400).json({
                        success: false,
                        error: `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
                    });
                    return;
                }
            }
            const tagsArray = Array.isArray(tags)
                ? tags
                : typeof tags === "string" && tags.length > 0
                    ? tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    : [];
            const saved = [];
            for (const f of files) {
                try {
                    const savedFile = await this.fileService.saveFile({
                        groupId,
                        uploadedBy: userId,
                        messageId: f.originalname,
                        content: f.buffer,
                        originalName: f.originalname,
                        mimeType: f.mimetype,
                        folderStatus: "in_progress",
                        attachmentType: attachmentType || "initial", // default เป็น initial
                    });
                    if (tagsArray.length > 0) {
                        try {
                            await this.fileService.addFileTags(savedFile.id, tagsArray);
                        }
                        catch (tagError) {
                            logger_1.logger.warn(`⚠️ Failed to add tags to file: ${savedFile.id}`, tagError);
                        }
                    }
                    saved.push(savedFile);
                    // Log file upload activity
                    await (0, activityLogger_1.logActivity)(groupId, userId, activityLogger_1.ActivityActions.FILE_UPLOADED, activityLogger_1.ResourceTypes.FILE, savedFile.id, {
                        fileName: savedFile.originalName,
                        mimeType: savedFile.mimeType,
                        size: f.size,
                    }, req);
                }
                catch (fileError) {
                    logger_1.logger.error(`❌ Error saving file: ${f.originalname}`, fileError);
                    res.status(500).json({
                        success: false,
                        error: `Failed to save file: ${f.originalname}`,
                    });
                    return;
                }
            }
            res.status(201).json({
                success: true,
                data: saved,
                message: `Files uploaded successfully (${saved.length} files)`,
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error uploading files:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to upload files",
            });
        }
    }
    /**
     * POST /api/files/:fileId/tags - เพิ่มแท็กไฟล์
     */
    async addFileTags(req, res) {
        try {
            const { fileId } = req.params;
            const { tags } = req.body;
            const file = await this.fileService.addFileTags(fileId, tags);
            const response = {
                success: true,
                data: file,
                message: "Tags added successfully",
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error adding file tags:", error);
            res.status(500).json({
                success: false,
                error: "Failed to add tags",
            });
        }
    }
    // User & Group Endpoints
    /**
     * GET /api/groups/:groupId/members - ดึงรายการสมาชิก
     */
    async getGroupMembers(req, res) {
        try {
            const { groupId } = req.params;
            const members = await this.userService.getGroupMembers(groupId);
            const response = {
                success: true,
                data: members,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting group members:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get group members",
            });
        }
    }
    /**
     * GET /api/groups/:groupId - ดึงข้อมูลกลุ่ม
     */
    async getGroup(req, res) {
        try {
            const { groupId } = req.params;
            logger_1.logger.debug("🔍 Looking for group with ID:", { groupId });
            // ตรวจสอบว่า groupId ไม่ใช่ 'default' หรือ empty
            if (!groupId ||
                groupId === "default" ||
                groupId === "undefined" ||
                groupId === "null") {
                logger_1.logger.warn("❌ Invalid group ID provided", { groupId });
                res.status(400).json({
                    success: false,
                    error: "Invalid group ID provided",
                });
                return;
            }
            // รองรับทั้ง LINE Group ID และ internal UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            const group = isUuid
                ? await this.userService.findGroupById(groupId)
                : await this.userService.findGroupByLineId(groupId);
            if (!group) {
                logger_1.logger.warn("❌ Group not found for ID", { groupId });
                res.status(404).json({
                    success: false,
                    error: "Group not found",
                });
                return;
            }
            logger_1.logger.info("✅ Group found", { id: group.id, name: group.name });
            const response = {
                success: true,
                data: {
                    id: group.id,
                    lineGroupId: group.lineGroupId,
                    name: group.name,
                    timezone: group.timezone,
                    settings: group.settings,
                    createdAt: group.createdAt,
                    updatedAt: group.updatedAt,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting group:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get group info",
            });
        }
    }
    /** อัปเดตผู้รับรายงานสรุปอัตโนมัติ (เฉพาะผู้บริหาร/แอดมิน) */
    async updateReportRecipients(req, res) {
        try {
            const { groupId } = req.params;
            const { recipients } = req.body || {};
            if (!Array.isArray(recipients)) {
                res.status(400).json({
                    success: false,
                    error: "Recipients must be an array of LINE User IDs",
                });
                return;
            }
            // โหลด group (รองรับ LINE Group ID และ UUID) และบันทึก settings.reportRecipients
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            const group = isUuid
                ? await this.userService.findGroupById(groupId)
                : await this.userService.findGroupByLineId(groupId);
            if (!group) {
                res.status(404).json({ success: false, error: "Group not found" });
                return;
            }
            const updated = await this.userService.updateGroupSettings(group.id, {
                ...(group.settings || {}),
                reportRecipients: recipients,
            });
            res.json({
                success: true,
                data: {
                    reportRecipients: updated.settings.reportRecipients || [],
                },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error updating report recipients:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to update report recipients" });
        }
    }
    /**
     * GET /api/groups/:groupId/stats - ดึงสถิติกลุ่ม
     */
    async getGroupStats(req, res) {
        try {
            const { groupId } = req.params;
            const { period = "this_week" } = req.query;
            logger_1.logger.debug("📊 Loading stats for group", { groupId, period });
            // ตรวจสอบว่ากลุ่มมีอยู่จริง (รองรับทั้ง LINE Group ID และ UUID)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            const group = isUuid
                ? await this.userService.findGroupById(groupId)
                : await this.userService.findGroupByLineId(groupId);
            if (!group) {
                res.status(404).json({
                    success: false,
                    error: "Group not found",
                });
                return;
            }
            // ตรวจสอบ period ที่ถูกต้อง
            const validPeriods = ["this_week", "last_week", "all"];
            const selectedPeriod = validPeriods.includes(period)
                ? period
                : "this_week";
            // ใช้ Promise.allSettled เพื่อไม่ให้ error หนึ่งส่วนทำให้ทั้งหมดล้มเหลว
            const [memberStatsResult, statsResult, fileStatsResult] = await Promise.allSettled([
                this.userService.getGroupStats(groupId),
                this.kpiService.getStatsByPeriod(groupId, selectedPeriod),
                this.fileService.getGroupFileStats(groupId),
            ]);
            const response = {
                success: true,
                data: {
                    members: memberStatsResult.status === "fulfilled"
                        ? memberStatsResult.value
                        : null,
                    stats: statsResult.status === "fulfilled" ? statsResult.value : null,
                    files: fileStatsResult.status === "fulfilled"
                        ? fileStatsResult.value
                        : null,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting group stats:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get group stats",
            });
        }
    }
    // KPI & Leaderboard Endpoints
    /**
     * GET /api/leaderboard/:groupId - ดึง Leaderboard
     */
    async getLeaderboard(req, res) {
        try {
            const { groupId } = req.params;
            const { period = "weekly", limit } = req.query;
            console.log(`🔍 API: Getting leaderboard for group: ${groupId}, period: ${period}, limit: ${limit}`);
            // Validate groupId
            if (!groupId) {
                res.status(400).json({
                    success: false,
                    error: "Group ID is required",
                });
                return;
            }
            // Validate groupId format (UUID, 'default', or LINE Group ID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const lineGroupIdRegex = /^[A-Za-z0-9]{33}$/; // LINE Group ID format
            if (groupId !== "default" &&
                !uuidRegex.test(groupId) &&
                !lineGroupIdRegex.test(groupId)) {
                console.warn(`⚠️ Invalid group ID format: ${groupId}`);
                res.status(400).json({
                    success: false,
                    error: "Invalid group ID format",
                    details: 'Group ID must be a valid UUID, LINE Group ID, or "default"',
                });
                return;
            }
            // Validate period parameter
            const validPeriods = ["weekly", "monthly", "all"];
            if (period && !validPeriods.includes(period)) {
                res.status(400).json({
                    success: false,
                    error: "Invalid period parameter",
                    details: `Period must be one of: ${validPeriods.join(", ")}`,
                });
                return;
            }
            // ซิงค์คะแนนจากงานแบบเรียลไทม์ก่อน (บันทึก KPI ลงฐานข้อมูลตามช่วงเวลา)
            try {
                await this.kpiService.syncLeaderboardScores(groupId, period);
            }
            catch (syncErr) {
                console.warn("⚠️ Sync leaderboard failed, continue with existing KPI records:", syncErr);
            }
            const leaderboard = await this.kpiService.getGroupLeaderboard(groupId, period);
            // รองรับการจำกัดจำนวนผลลัพธ์
            const limited = limit
                ? leaderboard.slice(0, parseInt(limit))
                : leaderboard;
            // Debug mode - เพิ่มข้อมูลเพิ่มเติม
            const isDebug = req.query.debug === "true";
            if (isDebug) {
                console.log("🔍 Debug mode enabled - adding extra data");
                // ดึงข้อมูล KPI raw data สำหรับ debug
                try {
                    const debugData = await this.kpiService.getDebugKPIData(groupId, period);
                    const response = {
                        success: true,
                        data: limited,
                        debug: debugData,
                    };
                    res.json(response);
                    return;
                }
                catch (debugError) {
                    console.error("❌ Error getting debug data:", debugError);
                }
            }
            const response = {
                success: true,
                data: limited,
            };
            console.log(`✅ API: Successfully returned leaderboard with ${limited.length} users`);
            res.json(response);
        }
        catch (error) {
            console.error("❌ API Error getting leaderboard:", error);
            // Log detailed error information
            if (error instanceof Error) {
                console.error("Error details:", {
                    message: error.message,
                    stack: error.stack,
                    groupId: req.params.groupId,
                    period: req.query.period,
                    limit: req.query.limit,
                });
            }
            // Return appropriate error response
            let errorMessage = "Failed to get leaderboard";
            let statusCode = 500;
            if (error instanceof Error) {
                if (error.message.includes("not found") ||
                    error.message.includes("does not exist")) {
                    statusCode = 404;
                    errorMessage = "Group not found";
                }
                else if (error.message.includes("permission") ||
                    error.message.includes("unauthorized")) {
                    statusCode = 403;
                    errorMessage = "Access denied";
                }
                else if (error.message.includes("validation") ||
                    error.message.includes("invalid")) {
                    statusCode = 400;
                    errorMessage = "Invalid request parameters";
                }
                else if (error.message.includes("connection") ||
                    error.message.includes("database")) {
                    statusCode = 503;
                    errorMessage = "Database connection error";
                }
            }
            res.status(statusCode).json({
                success: false,
                error: errorMessage,
                details: error instanceof Error ? error.message : "Unknown error",
                requestInfo: {
                    groupId: req.params.groupId,
                    period: req.query.period,
                    limit: req.query.limit,
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
    /**
     * GET /api/users/:userId/score-history/:groupId - ดึงสถิติคะแนนรายสัปดาห์
     */
    async getUserScoreHistory(req, res) {
        try {
            const { userId, groupId } = req.params;
            const { weeks = "8" } = req.query;
            const history = await this.kpiService.getUserWeeklyScoreHistory(userId, groupId, parseInt(weeks));
            const response = {
                success: true,
                data: history,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting user score history:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get user score history",
            });
        }
    }
    /**
     * GET /api/users/:userId/average-score/:groupId - ดึงค่าเฉลี่ยคะแนนของผู้ใช้
     */
    async getUserAverageScore(req, res) {
        try {
            const { userId, groupId } = req.params;
            const { period = "weekly" } = req.query;
            const averageScore = await this.kpiService.getUserAverageScore(userId, groupId, period);
            const response = {
                success: true,
                data: { averageScore },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting user average score:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get user average score",
            });
        }
    }
    /**
     * POST /api/groups/:groupId/sync-leaderboard - ซิงค์และคำนวณคะแนน leaderboard ใหม่
     */
    async syncLeaderboard(req, res) {
        try {
            const { groupId } = req.params;
            const { period = "weekly" } = req.body;
            console.log(`🔄 API: Syncing leaderboard for group: ${groupId}, period: ${period}`);
            // Validate groupId
            if (!groupId) {
                res.status(400).json({
                    success: false,
                    error: "Group ID is required",
                });
                return;
            }
            // Validate groupId format (UUID, 'default', or LINE Group ID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const lineGroupIdRegex = /^[A-Za-z0-9]{33}$/; // LINE Group ID format
            if (groupId !== "default" &&
                !uuidRegex.test(groupId) &&
                !lineGroupIdRegex.test(groupId)) {
                console.warn(`⚠️ Invalid group ID format: ${groupId}`);
                res.status(400).json({
                    success: false,
                    error: "Invalid group ID format",
                    details: 'Group ID must be a valid UUID, LINE Group ID, or "default"',
                });
                return;
            }
            // Validate period parameter
            const validPeriods = ["weekly", "monthly", "all"];
            if (period && !validPeriods.includes(period)) {
                res.status(400).json({
                    success: false,
                    error: "Invalid period parameter",
                    details: `Period must be one of: ${validPeriods.join(", ")}`,
                });
                return;
            }
            // เรียกใช้ KPIService เพื่อซิงค์และคำนวณคะแนนใหม่
            const syncResult = await this.kpiService.syncLeaderboardScores(groupId, period);
            const response = {
                success: true,
                data: {
                    message: "Leaderboard synchronized successfully",
                    processedTasks: syncResult.processedTasks,
                    updatedUsers: syncResult.updatedUsers,
                    period: period,
                },
            };
            console.log(`✅ API: Successfully synced leaderboard for ${syncResult.updatedUsers} users`);
            res.json(response);
        }
        catch (error) {
            console.error("❌ API Error syncing leaderboard:", error);
            // Log detailed error information
            if (error instanceof Error) {
                console.error("Error details:", {
                    message: error.message,
                    stack: error.stack,
                    groupId: req.params.groupId,
                    period: req.body.period,
                });
            }
            // Return appropriate error response
            let errorMessage = "Failed to sync leaderboard";
            let statusCode = 500;
            if (error instanceof Error) {
                if (error.message.includes("not found") ||
                    error.message.includes("does not exist")) {
                    statusCode = 404;
                    errorMessage = "Group not found";
                }
                else if (error.message.includes("permission") ||
                    error.message.includes("unauthorized")) {
                    statusCode = 403;
                    errorMessage = "Access denied";
                }
                else if (error.message.includes("validation") ||
                    error.message.includes("invalid")) {
                    statusCode = 400;
                    errorMessage = "Invalid request parameters";
                }
                else if (error.message.includes("connection") ||
                    error.message.includes("database")) {
                    statusCode = 503;
                    errorMessage = "Database connection error";
                }
            }
            res.status(statusCode).json({
                success: false,
                error: errorMessage,
                details: error instanceof Error ? error.message : "Unknown error",
                requestInfo: {
                    groupId: req.params.groupId,
                    period: req.body.period,
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
    /** Reports summary (ผู้บริหาร) */
    async getReportsSummary(req, res) {
        try {
            const { groupId } = req.params;
            const { period = "weekly", startDate, endDate, userId, } = req.query;
            const summary = await this.kpiService.getReportSummary(groupId, {
                period: period,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                userId,
            });
            res.json({ success: true, data: summary });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting reports summary:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to get reports summary" });
        }
    }
    /** Reports by users (ผู้บริหาร) */
    async getReportsByUsers(req, res) {
        try {
            const { groupId } = req.params;
            const { period = "weekly", startDate, endDate } = req.query;
            const rows = await this.kpiService.getReportByUsers(groupId, {
                period: period,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            });
            res.json({ success: true, data: rows });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting reports by users:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to get reports by users" });
        }
    }
    /** Export KPI as JSON/CSV (Excel-compatible) */
    async exportReports(req, res) {
        try {
            const { groupId } = req.params;
            const { startDate, endDate, format = "json" } = req.query;
            const data = await this.kpiService.exportKPIData(groupId, new Date(startDate), new Date(endDate));
            if (format === "csv") {
                // แปลงเป็น CSV อย่างง่าย
                const headers = Object.keys(data[0] || {});
                const csv = [
                    headers.join(","),
                    ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
                ].join("\n");
                res.set({
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="kpi-${groupId}.csv"`,
                });
                res.send(csv);
                return;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            logger_1.logger.error("❌ Error exporting reports:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to export reports" });
        }
    }
    // Recurring Task Handlers (UI)
    async listRecurring(req, res) {
        try {
            const { groupId } = req.params;
            logger_1.logger.info("📝 Listing recurring tasks for group:", groupId);
            // Check if the database connection and table exist
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            try {
                const tableExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'recurring_tasks'
          )
        `);
                if (!tableExists[0].exists) {
                    logger_1.logger.error("❌ recurring_tasks table does not exist");
                    res.status(500).json({
                        success: false,
                        error: "recurring_tasks table does not exist in database",
                    });
                    return;
                }
                logger_1.logger.info("✅ recurring_tasks table exists");
            }
            finally {
                await queryRunner.release();
            }
            const data = await this.recurringService.listByGroup(groupId);
            logger_1.logger.info("✅ Successfully retrieved recurring tasks:", {
                count: data.length,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            logger_1.logger.error("❌ Error listing recurring:", {
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
                groupId: req.params.groupId,
            });
            res.status(500).json({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to get recurring list",
            });
        }
    }
    async createRecurring(req, res) {
        try {
            const { groupId } = req.params;
            const body = req.body || {};
            logger_1.logger.info("📝 Creating recurring task:", {
                groupId,
                title: body.title,
                assigneeCount: body.assigneeLineUserIds?.length || 0,
                recurrence: body.recurrence,
                weekDay: body.weekDay,
                dayOfMonth: body.dayOfMonth,
                timeOfDay: body.timeOfDay,
                timezone: body.timezone,
                createdBy: body.createdBy || body.createdByLineUserId,
            });
            const created = await this.recurringService.create({
                lineGroupId: groupId,
                title: body.title,
                description: body.description,
                assigneeLineUserIds: body.assigneeLineUserIds || [],
                reviewerLineUserId: body.reviewerLineUserId,
                requireAttachment: !!body.requireAttachment,
                priority: body.priority || "medium",
                tags: body.tags || [],
                recurrence: body.recurrence, // 'weekly' | 'monthly' | 'quarterly'
                // โหมดใหม่: ใช้วันกำหนดส่งครั้งแรกเป็นตัวตั้งต้นของรอบ
                initialDueTime: body.initialDueTime,
                // ฟิลด์ด้านล่างยังรองรับเพื่อความเข้ากันได้ย้อนหลัง แต่ Service จะไม่พึ่งพา
                weekDay: body.weekDay,
                dayOfMonth: body.dayOfMonth,
                timeOfDay: body.timeOfDay,
                timezone: body.timezone,
                createdByLineUserId: body.createdBy || body.createdByLineUserId, // Support both field names
            });
            logger_1.logger.info("✅ Recurring task created successfully:", {
                id: created.id,
                title: created.title,
            });
            res.status(201).json({ success: true, data: created });
        }
        catch (error) {
            logger_1.logger.error("❌ Error creating recurring:", {
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
                groupId: req.params.groupId,
                bodyKeys: Object.keys(req.body || {}),
            });
            // Return more detailed error for debugging
            res.status(500).json({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to create recurring task",
                details: process.env.NODE_ENV === "development"
                    ? error instanceof Error
                        ? error.stack
                        : undefined
                    : undefined,
            });
        }
    }
    async updateRecurring(req, res) {
        try {
            const { id } = req.params;
            const updated = await this.recurringService.update(id, req.body || {});
            res.json({ success: true, data: updated });
        }
        catch (error) {
            logger_1.logger.error("❌ Error updating recurring:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to update recurring" });
        }
    }
    async deleteRecurring(req, res) {
        try {
            const { id } = req.params;
            await this.recurringService.remove(id);
            res.json({ success: true });
        }
        catch (error) {
            logger_1.logger.error("❌ Error deleting recurring:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to delete recurring" });
        }
    }
    async toggleRecurring(req, res) {
        try {
            const { id } = req.params;
            const body = req.body || {};
            const isActivePayload = typeof body.enabled === "boolean"
                ? body.enabled
                : typeof body.isActive === "boolean"
                    ? body.isActive
                    : undefined;
            if (typeof isActivePayload !== "boolean") {
                res.status(400).json({
                    success: false,
                    error: "enabled or isActive is required and must be a boolean",
                });
                return;
            }
            const recurring = await this.recurringService.update(id, {
                active: isActivePayload,
            });
            res.json({ success: true, data: recurring });
        }
        catch (error) {
            logger_1.logger.error("❌ Error toggling recurring:", error);
            res.status(500).json({
                success: false,
                error: "Failed to toggle recurring task",
            });
        }
    }
    async getRecurring(req, res) {
        try {
            const { id } = req.params;
            const recurring = await this.recurringService.findById(id);
            if (!recurring) {
                res
                    .status(404)
                    .json({ success: false, error: "Recurring task not found" });
                return;
            }
            res.json({ success: true, data: recurring });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting recurring:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to get recurring task" });
        }
    }
    async getRecurringHistory(req, res) {
        try {
            const { id } = req.params;
            const { limit = 10, offset = 0 } = req.query;
            // ดึงงานที่สร้างจากแม่แบบงานประจำนี้
            const tasks = await this.taskService.getTasksByRecurringId(id, {
                limit: parseInt(limit),
                offset: parseInt(offset),
            });
            res.json({ success: true, data: tasks });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting recurring history:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get recurring task history",
            });
        }
    }
    async getRecurringStats(req, res) {
        try {
            const { id } = req.params;
            // ดึงสถิติของงานประจำ
            const stats = await this.taskService.getRecurringTaskStats(id);
            res.json({ success: true, data: stats });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting recurring stats:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get recurring task statistics",
            });
        }
    }
    async getGroupRecurringStats(req, res) {
        try {
            const { groupId } = req.params;
            // ดึงสถิติงานประจำทั้งหมดในกลุ่ม
            const stats = await this.taskService.getGroupRecurringStats(groupId);
            res.json({ success: true, data: stats });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting group recurring stats:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get group recurring statistics",
            });
        }
    }
    /**
     * GET /api/users/:userId/stats - ดึงสถิติผู้ใช้
     */
    async getUserStats(req, res) {
        try {
            const { userId } = req.params;
            const { groupId, period = "all" } = req.query;
            const stats = await this.kpiService.getUserStats(userId, groupId, period);
            const response = {
                success: true,
                data: stats,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting user stats:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get user stats",
            });
        }
    }
    /**
     * GET /api/export/kpi/:groupId - ส่งออกข้อมูล KPI
     */
    async exportKPI(req, res) {
        try {
            const { groupId } = req.params;
            const { startDate, endDate, format = "json" } = req.query;
            const data = await this.kpiService.exportKPIData(groupId, new Date(startDate), new Date(endDate));
            if (format === "csv") {
                // TODO: Convert to CSV format
                res.set({
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="kpi-${groupId}.csv"`,
                });
                // Send CSV data
            }
            else {
                res.json({
                    success: true,
                    data,
                });
            }
        }
        catch (error) {
            logger_1.logger.error("❌ Error exporting KPI:", error);
            res.status(500).json({
                success: false,
                error: "Failed to export KPI data",
            });
        }
    }
    /**
     * POST /api/kpi/sample/:groupId - สร้างข้อมูล KPI ตัวอย่างสำหรับทดสอบ
     */
    async createSampleKPIData(req, res) {
        try {
            const { groupId } = req.params;
            await this.kpiService.createSampleKPIData(groupId);
            const response = {
                success: true,
                data: { message: "Sample KPI data created successfully" },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error creating sample KPI data:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create sample KPI data",
            });
        }
    }
    /**
     * GET /api/line/members/:groupId - ดึงรายชื่อสมาชิกจาก LINE API
     */
    async getLineMembers(req, res) {
        try {
            const { groupId } = req.params;
            // รองรับการบังคับให้ดึงจาก LINE API โดยตรงด้วย query ?source=line|line_api|live
            const source = String(req.query.source || "").toLowerCase();
            let members;
            if (source === "line" || source === "line_api" || source === "live") {
                members = await this.lineService.getAllGroupMembers(groupId);
            }
            else {
                // ค่าเริ่มต้น: hybrid (พยายาม LINE ก่อน แล้ว fallback DB)
                members = await this.lineService.getGroupMembersHybrid(groupId);
            }
            const response = {
                success: true,
                data: members,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting LINE members:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get LINE members",
            });
        }
    }
    // Notification Card Endpoints
    /**
     * POST /api/notifications/cards - สร้างและส่งการ์ดแจ้งเตือน
     */
    async createNotificationCard(req, res) {
        try {
            const notificationData = req.body;
            // ตรวจสอบข้อมูลที่จำเป็น
            if (!notificationData.title) {
                res.status(400).json({
                    success: false,
                    error: "หัวข้อการแจ้งเตือนไม่สามารถเป็นค่าว่างได้",
                });
                return;
            }
            if (!notificationData.targetType) {
                res.status(400).json({
                    success: false,
                    error: "ต้องระบุประเภทเป้าหมาย (group, user, หรือ both)",
                });
                return;
            }
            const result = await this.notificationCardService.createAndSendNotificationCard(notificationData);
            if (result.success) {
                res.status(201).json({
                    success: true,
                    data: result.data,
                    message: "ส่งการ์ดแจ้งเตือนสำเร็จ",
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: result.error || "ส่งการ์ดแจ้งเตือนไม่สำเร็จ",
                });
            }
        }
        catch (error) {
            logger_1.logger.error("❌ Error creating notification card:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
            });
        }
    }
    /**
     * GET /api/notifications/cards/templates - ดึงเทมเพลตปุ่มมาตรฐาน
     */
    async getNotificationTemplates(req, res) {
        try {
            const templates = {
                standard: this.notificationCardService.createStandardButtons(),
                approval: this.notificationCardService.createApprovalButtons(),
            };
            res.json({
                success: true,
                data: templates,
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting notification templates:", error);
            res.status(500).json({
                success: false,
                error: "ไม่สามารถดึงเทมเพลตได้",
            });
        }
    }
    /**
     * POST /api/notifications/cards/quick - ส่งการ์ดแจ้งเตือนแบบรวดเร็ว
     */
    async sendQuickNotification(req, res) {
        try {
            const { title, description, groupIds, userIds, priority = "medium", } = req.body;
            if (!title) {
                res.status(400).json({
                    success: false,
                    error: "หัวข้อการแจ้งเตือนไม่สามารถเป็นค่าว่างได้",
                });
                return;
            }
            // ตรวจสอบว่ามีกลุ่มหรือผู้ใช้อย่างน้อย 1 รายการ
            if ((!groupIds || groupIds.length === 0) &&
                (!userIds || userIds.length === 0)) {
                res.status(400).json({
                    success: false,
                    error: "ต้องระบุกลุ่มหรือผู้ใช้อย่างน้อย 1 รายการ",
                });
                return;
            }
            const notificationData = {
                title,
                description,
                targetType: groupIds && userIds ? "both" : groupIds ? "group" : "user",
                groupIds: groupIds || [],
                userIds: userIds || [],
                priority,
                buttons: this.notificationCardService.createStandardButtons(),
            };
            const result = await this.notificationCardService.createAndSendNotificationCard(notificationData);
            if (result.success) {
                res.status(201).json({
                    success: true,
                    data: result.data,
                    message: "ส่งการแจ้งเตือนแบบรวดเร็วสำเร็จ",
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: result.error || "ส่งการแจ้งเตือนไม่สำเร็จ",
                });
            }
        }
        catch (error) {
            logger_1.logger.error("❌ Error sending quick notification:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
            });
        }
    }
    /**
     * POST /api/admin/migrate - รัน migration แบบ manual
     */
    async runMigration(req, res) {
        try {
            logger_1.logger.info("🔄 เริ่มรัน comprehensive manual migration...");
            const { comprehensiveMigration } = await Promise.resolve().then(() => __importStar(require("@/utils/comprehensiveMigration")));
            // ตรวจสอบว่าต้องรัน migration หรือไม่
            const needsMigration = await comprehensiveMigration.checkMigrationNeeded();
            logger_1.logger.info(`🔍 ตรวจสอบ migration: ${needsMigration ? "ต้องรัน" : "ไม่ต้องรัน"}`);
            if (!needsMigration) {
                res.json({
                    success: true,
                    message: "Database schema is already up to date",
                    migrationRan: false,
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            // รัน comprehensive migration
            await comprehensiveMigration.runComprehensiveMigration();
            // ดึงผลลัพธ์ migration
            const results = comprehensiveMigration.getMigrationResults();
            const successCount = Object.values(results).filter((r) => r.success).length;
            const totalCount = Object.keys(results).length;
            const failureCount = totalCount - successCount;
            logger_1.logger.info(`✅ Comprehensive migration completed: ${successCount}/${totalCount} steps successful`);
            res.json({
                success: failureCount === 0,
                message: failureCount === 0
                    ? `Migration completed successfully: ${successCount}/${totalCount} steps successful`
                    : `Migration completed with warnings: ${successCount}/${totalCount} steps successful, ${failureCount} failed`,
                migrationRan: true,
                results: {
                    successful: successCount,
                    failed: failureCount,
                    total: totalCount,
                    details: results,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Comprehensive migration failed:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Migration failed",
                migrationRan: false,
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * POST /api/admin/migrate-kpi-enum - รัน KPI Enum migration
     */
    async runKPIEnumMigration(req, res) {
        try {
            console.log("🔄 Starting KPI Enum migration...");
            // Migration script has been removed - this endpoint is deprecated
            res.json({
                success: false,
                message: "KPI Enum migration script has been removed. Please use comprehensive migration instead.",
                deprecated: true,
            });
        }
        catch (error) {
            logger_1.logger.error("❌ KPI Enum migration error:", error);
            res.status(500).json({
                success: false,
                error: "KPI Enum migration failed",
                details: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
    /**
     * GET /api/admin/check-db - ตรวจสอบการเชื่อมต่อฐานข้อมูล
     */
    async checkDatabaseConnection(req, res) {
        try {
            console.log("🔍 Checking database connection...");
            // Check database connection directly
            const { AppDataSource } = await Promise.resolve().then(() => __importStar(require("@/utils/database")));
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            // Simple query to test connection
            await AppDataSource.query("SELECT 1");
            res.json({
                success: true,
                message: "Database connection is working properly",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Database connection check failed:", error);
            res.status(500).json({
                success: false,
                error: "Database connection check failed",
                details: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * POST /api/groups/update-names - อัพเดทชื่อกลุ่มทั้งหมดให้ดึงจาก LINE API
     */
    async updateAllGroupNames(req, res) {
        try {
            logger_1.logger.info("🔄 Starting bulk group name update...");
            // ดึงกลุ่มทั้งหมดจากฐานข้อมูล
            const groups = await this.userService.getAllGroups();
            logger_1.logger.info(`📊 Found ${groups.length} groups to process`);
            const results = {
                total: groups.length,
                updated: 0,
                skipped: 0,
                errors: 0,
                details: [],
            };
            for (const group of groups) {
                try {
                    logger_1.logger.debug(`🔍 Processing group: ${group.name} (${group.lineGroupId})`);
                    // ตรวจสอบว่าชื่อกลุ่มเป็นตัวย่อของไอดีหรือไม่
                    const isAbbreviatedName = this.isAbbreviatedGroupName(group.name, group.lineGroupId);
                    if (!isAbbreviatedName) {
                        logger_1.logger.debug(`✅ Group "${group.name}" already has proper name, skipping`);
                        results.skipped++;
                        results.details.push({
                            groupId: group.lineGroupId,
                            oldName: group.name,
                            status: "skipped",
                        });
                        continue;
                    }
                    // ดึงข้อมูลกลุ่มจาก LINE API
                    const groupInfo = await this.lineService.getGroupInformation(group.lineGroupId);
                    // ตรวจสอบว่าชื่อใหม่ดีกว่าชื่อเดิมหรือไม่
                    if (groupInfo.source === "line_api" ||
                        this.isImprovedName(group.name, groupInfo.name)) {
                        // อัพเดทชื่อกลุ่มในฐานข้อมูล
                        await this.userService.updateGroupName(group.id, groupInfo.name);
                        logger_1.logger.info(`✅ Updated "${group.name}" → "${groupInfo.name}" (${groupInfo.source})`);
                        results.updated++;
                        results.details.push({
                            groupId: group.lineGroupId,
                            oldName: group.name,
                            newName: groupInfo.name,
                            status: "updated",
                        });
                    }
                    else {
                        logger_1.logger.debug(`ℹ️ No better name available for: ${group.name}`);
                        results.skipped++;
                        results.details.push({
                            groupId: group.lineGroupId,
                            oldName: group.name,
                            status: "skipped",
                        });
                    }
                    // เพิ่ม delay เพื่อหลีกเลี่ยง rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 200));
                }
                catch (error) {
                    logger_1.logger.error(`❌ Error processing group ${group.name}:`, error);
                    results.errors++;
                    results.details.push({
                        groupId: group.lineGroupId,
                        oldName: group.name,
                        status: "error",
                        error: error.message || "Unknown error",
                    });
                }
            }
            logger_1.logger.info("📊 Group name update completed", results);
            const response = {
                success: true,
                data: results,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error in bulk group name update:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update group names",
            });
        }
    }
    /**
     * ตรวจสอบว่าชื่อกลุ่มเป็นตัวย่อของไอดีหรือไม่
     */
    isAbbreviatedGroupName(name, lineGroupId) {
        // ตรวจสอบรูปแบบต่างๆ ของชื่อกลุ่มที่เป็นตัวย่อ
        const abbreviatedPatterns = [
            /^กลุ่ม [A-Za-z0-9]{1,8}$/, // กลุ่ม C1234567
            /^กลุ่ม [A-Za-z0-9]{8,}$/, // กลุ่ม Cxxxxxxxx (long IDs)
            /^\[INACTIVE\]/, // [INACTIVE] groups
            /^Group /, // English "Group " prefix
            /^แชทส่วนตัว$/, // Personal chat
            /^personal_/, // personal_xxxxx
        ];
        // ตรวจสอบว่าชื่อกลุ่มตรงกับรูปแบบตัวย่อหรือไม่
        const isAbbreviated = abbreviatedPatterns.some((pattern) => pattern.test(name));
        // ตรวจสอบเพิ่มเติมว่าชื่อกลุ่มเป็นส่วนหนึ่งของ lineGroupId หรือไม่
        const shortId = lineGroupId.length > 8 ? lineGroupId.substring(0, 8) : lineGroupId;
        const isIdAbbreviation = name.includes(shortId) || name.includes(lineGroupId);
        return isAbbreviated || isIdAbbreviation;
    }
    /**
     * ตรวจสอบว่าชื่อใหม่ดีกว่าชื่อเดิมหรือไม่
     */
    isImprovedName(oldName, newName) {
        // ตรวจสอบว่าชื่อใหม่เป็นตัวย่อหรือไม่
        const abbreviatedPatterns = [
            /^กลุ่ม [A-Za-z0-9]{1,8}$/,
            /^กลุ่ม [A-Za-z0-9]{8,}$/,
            /^\[INACTIVE\]/,
            /^Group /,
            /^แชทส่วนตัว$/,
            /^personal_/,
        ];
        const isNewNameAbbreviated = abbreviatedPatterns.some((pattern) => pattern.test(newName));
        // ถ้าชื่อใหม่เป็นตัวย่อ ให้ถือว่าไม่ดีขึ้น
        if (isNewNameAbbreviated) {
            return false;
        }
        // ถ้าชื่อเดิมเป็นตัวย่อและชื่อใหม่ไม่ใช่ ให้ถือว่าดีขึ้น
        const isOldNameAbbreviated = this.isAbbreviatedGroupName(oldName, "");
        if (isOldNameAbbreviated && !isNewNameAbbreviated) {
            return true;
        }
        // ถ้าชื่อใหม่ยาวกว่าและมีความหมายมากกว่า ให้ถือว่าดีขึ้น
        if (newName.length > oldName.length && newName.length > 10) {
            return true;
        }
        return false;
    }
    /**
     * ทดสอบการเชื่อมต่อ Google Calendar
     */
    async testGoogleCalendar(req, res) {
        try {
            const { GoogleService } = await Promise.resolve().then(() => __importStar(require("@/services/GoogleService")));
            const googleService = new GoogleService();
            const result = await googleService.testConnection();
            res.json({
                success: true,
                message: "Google Calendar connection test",
                result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Google Calendar test failed:", error);
            res.status(500).json({
                success: false,
                message: "Google Calendar test failed",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * ตั้งค่า Google Calendar สำหรับกลุ่ม
     */
    async setupGroupCalendar(req, res) {
        try {
            const { groupId } = req.params;
            const { groupName, timezone } = req.body;
            if (!groupId) {
                res.status(400).json({
                    success: false,
                    message: "Group ID is required",
                });
                return;
            }
            const { GoogleService } = await Promise.resolve().then(() => __importStar(require("@/services/GoogleService")));
            const googleService = new GoogleService();
            const calendarId = await googleService.setupGroupCalendar(groupId, groupName || "Default Group", timezone || "Asia/Bangkok");
            res.json({
                success: true,
                message: "Google Calendar setup successful",
                calendarId,
                groupId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("❌ Google Calendar setup failed:", error);
            res.status(500).json({
                success: false,
                message: "Google Calendar setup failed",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * อัปเดตข้อมูลผู้ใช้
     */
    async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const updates = req.body;
            logger_1.logger.info(`Updating user: ${userId}`, updates);
            // ตรวจสอบว่าผู้ใช้มีอยู่จริง
            const user = await this.userService.findByLineUserId(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: "User not found",
                });
                return;
            }
            // อัปเดตข้อมูลผู้ใช้
            const updatedUser = await this.userService.updateUser(user.id, updates);
            const response = {
                success: true,
                data: updatedUser,
                message: "User updated successfully",
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error updating user:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred",
            });
        }
    }
    /**
     * POST /api/groups/:groupId/members/bulk-delete - ลบสมาชิกหลายคนพร้อมกัน
     */
    async bulkDeleteMembers(req, res) {
        try {
            const { groupId } = req.params;
            const { memberIds } = req.body;
            // Validate input
            if (!Array.isArray(memberIds) || memberIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: "memberIds must be a non-empty array",
                });
                return;
            }
            logger_1.logger.info(`🗑️ Bulk deleting ${memberIds.length} members from group ${groupId}`);
            // Execute bulk delete
            const results = await this.userService.bulkRemoveMembers(groupId, memberIds);
            const response = {
                success: true,
                data: {
                    deletedCount: results.successCount,
                    failedCount: results.failedCount,
                    errors: results.errors,
                },
                message: `Deleted ${results.successCount} member(s) successfully`,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error bulk deleting members:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to delete members",
            });
        }
    }
    /**
     * POST /api/groups/:groupId/members/bulk-update-role - อัปเดตบทบาทสมาชิกหลายคนพร้อมกัน
     */
    async bulkUpdateMemberRole(req, res) {
        try {
            const { groupId } = req.params;
            const { memberIds, role } = req.body;
            // Validate input
            if (!Array.isArray(memberIds) || memberIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: "memberIds must be a non-empty array",
                });
                return;
            }
            if (!["admin", "member"].includes(role)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid role. Must be "admin" or "member"',
                });
                return;
            }
            logger_1.logger.info(`👥 Bulk updating ${memberIds.length} members to role "${role}" in group ${groupId}`);
            // Execute bulk update
            const results = await this.userService.bulkUpdateMemberRole(groupId, memberIds, role);
            const response = {
                success: true,
                data: {
                    updatedCount: results.successCount,
                    failedCount: results.failedCount,
                    errors: results.errors,
                },
                message: `Updated ${results.successCount} member(s) to ${role} successfully`,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error bulk updating member roles:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to update member roles",
            });
        }
    }
    /**
     * POST /api/users/:userId/email/send-verification - ส่งอีเมลยืนยัน
     */
    async sendEmailVerification(req, res) {
        try {
            const { userId } = req.params;
            const { email } = req.body;
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                res.status(400).json({
                    success: false,
                    error: "Invalid email address",
                });
                return;
            }
            logger_1.logger.info(`📧 Sending email verification to ${email} for user ${userId}`);
            // Find user by LINE ID
            const user = await this.userService.findByLineUserId(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: "User not found",
                });
                return;
            }
            // Generate verification token
            const token = await this.userService.generateEmailVerificationToken(user.id, email);
            // TODO: Send email with EmailService
            // For now, return token for testing
            logger_1.logger.info(`✅ Verification token generated: ${token}`);
            const response = {
                success: true,
                data: {
                    message: "Verification email sent",
                    // Remove token in production
                    token: process.env.NODE_ENV === "development" ? token : undefined,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error sending email verification:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to send verification email",
            });
        }
    }
    /**
     * POST /api/users/:userId/email/verify - ยืนยันอีเมล
     */
    async verifyEmail(req, res) {
        try {
            const { userId } = req.params;
            const { token } = req.body;
            if (!token) {
                res.status(400).json({
                    success: false,
                    error: "Verification token is required",
                });
                return;
            }
            logger_1.logger.info(`✅ Verifying email for user ${userId}`);
            // Find user by LINE ID
            const user = await this.userService.findByLineUserId(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: "User not found",
                });
                return;
            }
            // Verify email
            await this.userService.verifyEmail(user.id, token);
            const response = {
                success: true,
                message: "Email verified successfully",
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error verifying email:", error);
            const message = error instanceof Error ? error.message : "Failed to verify email";
            res.status(400).json({
                success: false,
                error: message,
            });
        }
    }
    // ==================== Activity Logs ====================
    /**
     * GET /api/groups/:groupId/activity-logs - รับ activity logs พร้อม filters
     */
    async getActivityLogs(req, res) {
        try {
            const { groupId } = req.params;
            const { userId, action, resourceType, resourceId, startDate, endDate, limit = 50, offset = 0, search, } = req.query;
            logger_1.logger.info(`📊 Getting activity logs for group ${groupId}`);
            const { logs, total } = await this.activityLogService.getActivityLogs({
                groupId,
                userId: userId,
                action: action,
                resourceType: resourceType,
                resourceId: resourceId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                search: search,
            });
            const limitNum = parseInt(limit, 10);
            const offsetNum = parseInt(offset, 10);
            const page = Math.floor(offsetNum / limitNum) + 1;
            const totalPages = Math.ceil(total / limitNum);
            const response = {
                success: true,
                data: logs,
                pagination: {
                    page,
                    limit: limitNum,
                    total,
                    totalPages,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting activity logs:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get activity logs",
            });
        }
    }
    /**
     * GET /api/groups/:groupId/activity-logs/stats - รับสถิติ activity logs
     */
    async getActivityStats(req, res) {
        try {
            const { groupId } = req.params;
            const { days = 30 } = req.query;
            logger_1.logger.info(`📈 Getting activity stats for group ${groupId}`);
            const stats = await this.activityLogService.getActivityStats(groupId, parseInt(days, 10));
            const response = {
                success: true,
                data: stats,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting activity stats:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get activity stats",
            });
        }
    }
    /**
     * GET /api/groups/:groupId/activity-logs/actions - รับ actions ทั้งหมด
     */
    async getUniqueActions(req, res) {
        try {
            const { groupId } = req.params;
            logger_1.logger.info(`🔍 Getting unique actions for group ${groupId}`);
            const actions = await this.activityLogService.getUniqueActions(groupId);
            const response = {
                success: true,
                data: actions,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting unique actions:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get unique actions",
            });
        }
    }
    /**
     * GET /api/groups/:groupId/activity-logs/resource-types - รับ resource types ทั้งหมด
     */
    async getUniqueResourceTypes(req, res) {
        try {
            const { groupId } = req.params;
            logger_1.logger.info(`🔍 Getting unique resource types for group ${groupId}`);
            const resourceTypes = await this.activityLogService.getUniqueResourceTypes(groupId);
            const response = {
                success: true,
                data: resourceTypes,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting unique resource types:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get unique resource types",
            });
        }
    }
    /**
     * POST /api/users/:userId/calendar-invite - เชิญผู้ใช้เข้าปฏิทินของทุกกลุ่มที่สังกัด
     */
    async sendCalendarInvitesForUser(req, res) {
        try {
            const { userId } = req.params; // LINE User ID หรือ internal UUID
            const { UserService } = await Promise.resolve().then(() => __importStar(require("@/services/UserService")));
            const { GoogleService } = await Promise.resolve().then(() => __importStar(require("@/services/GoogleService")));
            const userService = new UserService();
            const googleService = new GoogleService();
            // แปลง LINE ID -> internal user
            const user = userId.startsWith("U")
                ? await userService.findByLineUserId(userId)
                : await userService.findById(userId);
            if (!user) {
                res.status(404).json({ success: false, error: "User not found" });
                return;
            }
            // ดึงกลุ่มทั้งหมดที่ผู้ใช้อยู่
            const groups = await userService.getUserGroups(user.id);
            if (!groups || groups.length === 0) {
                res.json({
                    success: true,
                    data: { invitedGroups: 0, createdCalendars: 0 },
                });
                return;
            }
            let invitedGroups = 0;
            let createdCalendars = 0;
            const errors = [];
            for (const group of groups) {
                try {
                    // หากยังไม่มี Calendar ให้สร้างอัตโนมัติ
                    if (!group.settings?.googleCalendarId) {
                        try {
                            const calendarId = await googleService.setupGroupCalendar(group.id, group.name || group.lineGroupId || "Group", group.timezone ||
                                (await Promise.resolve().then(() => __importStar(require("@/utils/config")))).config.app.defaultTimezone);
                            group.settings = {
                                ...(group.settings || {}),
                                googleCalendarId: calendarId,
                            };
                            await userService.updateGroupSettings(group.id, {
                                googleCalendarId: calendarId,
                            });
                            createdCalendars++;
                        }
                        catch (calendarErr) {
                            errors.push({
                                groupId: group.id,
                                error: calendarErr?.message || "Failed to create calendar",
                            });
                            continue;
                        }
                    }
                    // แชร์ Calendar ให้ผู้ใช้คนนี้เท่านั้น
                    await googleService.shareCalendarWithMembers(group.id, [user.id]);
                    invitedGroups++;
                }
                catch (err) {
                    errors.push({
                        groupId: group.id,
                        error: err?.message || "Unknown error",
                    });
                }
            }
            res.json({
                success: true,
                data: { invitedGroups, createdCalendars, errors },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error sending calendar invites for user:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to send calendar invites" });
        }
    }
    /**
     * GET /api/users/:userId/groups - ดึงกลุ่มที่ผู้ใช้อยู่ (ใช้ชื่อกลุ่มจริง)
     */
    async getUserGroups(req, res) {
        try {
            const { userId } = req.params; // LINE User ID หรือ internal UUID
            const { UserService } = await Promise.resolve().then(() => __importStar(require("@/services/UserService")));
            const userService = new UserService();
            // แปลง LINE ID -> internal user
            const user = userId.startsWith("U")
                ? await userService.findByLineUserId(userId)
                : await userService.findById(userId);
            if (!user) {
                res.status(404).json({ success: false, error: "User not found" });
                return;
            }
            const groups = await userService.getUserGroups(user.id);
            res.json({ success: true, data: groups });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting user groups:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to get user groups" });
        }
    }
    /**
     * ตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่มและลบข้อมูลงาน (สำหรับการทดสอบ)
     */
    async checkBotMembershipAndCleanup(req, res) {
        try {
            logger_1.logger.info("🤖 Manual trigger: Starting bot membership check and cleanup...");
            // Import TaskService dynamically
            const { TaskService } = await Promise.resolve().then(() => __importStar(require("@/services/TaskService")));
            const taskService = new TaskService();
            // เรียกใช้ฟังก์ชันตรวจสอบและทำความสะอาด
            const result = await taskService.checkAndCleanupInactiveGroups();
            logger_1.logger.info("📊 Bot membership check and cleanup completed:", result);
            const response = {
                success: true,
                data: {
                    message: "Bot membership check and cleanup completed",
                    result: {
                        checkedGroups: result.checkedGroups,
                        cleanedGroups: result.cleanedGroups,
                        totalDeletedTasks: result.totalDeletedTasks,
                        errors: result.errors,
                    },
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error("❌ Error in manual bot membership check:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred",
            });
        }
    }
    /**
     * บังคับส่งการ์ดประจำวันของตอนเช้า
     */
    async triggerDailySummary(req, res) {
        try {
            logger_1.logger.info("🔄 Manual trigger: Starting daily summary...");
            // Import services dynamically
            const { TaskService } = await Promise.resolve().then(() => __importStar(require("@/services/TaskService")));
            const { NotificationService } = await Promise.resolve().then(() => __importStar(require("@/services/NotificationService")));
            const { FlexMessageTemplateService } = await Promise.resolve().then(() => __importStar(require("@/services/FlexMessageTemplateService")));
            const { LineService } = await Promise.resolve().then(() => __importStar(require("@/services/LineService")));
            const taskService = new TaskService();
            const notificationService = new NotificationService();
            const lineService = new LineService();
            // ดึงกลุ่มทั้งหมด
            const groups = await taskService.getAllActiveGroups();
            let totalGroups = 0;
            let totalTasks = 0;
            for (const group of groups) {
                try {
                    // ดึงงานค้างของกลุ่มนี้
                    const tasks = await taskService.getIncompleteTasksOfGroup(group.lineGroupId);
                    if (tasks.length === 0)
                        continue;
                    totalGroups++;
                    totalTasks += tasks.length;
                    // สร้าง Flex Message สำหรับสรุปงานประจำวัน
                    const tz = group.timezone || "Asia/Bangkok";
                    const summaryFlexMessage = FlexMessageTemplateService.createDailySummaryCard(group, tasks, tz);
                    // ส่งสรุปลงกลุ่ม
                    try {
                        await lineService.pushMessage(group.lineGroupId, summaryFlexMessage);
                        logger_1.logger.info(`✅ Sent daily summary to group: ${group.name} (${tasks.length} tasks)`);
                    }
                    catch (err) {
                        logger_1.logger.warn(`⚠️ Failed to send daily summary to group: ${group.lineGroupId}`, err);
                    }
                    // ส่งการ์ดแยกรายบุคคลให้แต่ละคน
                    const tasksByAssignee = new Map();
                    for (const task of tasks) {
                        const assignees = task.assignedUsers || [];
                        if (assignees.length === 0)
                            continue;
                        for (const assignee of assignees) {
                            const userTasks = tasksByAssignee.get(assignee.lineUserId) || [];
                            userTasks.push(task);
                            tasksByAssignee.set(assignee.lineUserId, userTasks);
                        }
                    }
                    for (const [assigneeId, userTasks] of tasksByAssignee.entries()) {
                        try {
                            const assignee = userTasks[0].assignedUsers?.find((u) => u.lineUserId === assigneeId);
                            if (!assignee)
                                continue;
                            // สร้างการ์ดงานต่างๆ ของแต่ละงาน (Flex Message) แทนข้อความธรรมดา
                            const flexMessage = FlexMessageTemplateService.createPersonalReportCard(assignee, userTasks, tz, group);
                            // ส่งการ์ดให้แต่ละคนทางส่วนตัว
                            await lineService.pushMessage(assigneeId, flexMessage);
                            logger_1.logger.info(`✅ Sent personal daily report to: ${assignee.displayName}`);
                        }
                        catch (err) {
                            logger_1.logger.warn(`⚠️ Failed to send personal daily report: ${assigneeId}`, err);
                        }
                    }
                }
                catch (err) {
                    logger_1.logger.warn(`⚠️ Failed to process group for daily summary: ${group.id}`, err);
                }
            }
            logger_1.logger.info(`✅ Manual trigger: Daily summary completed - ${totalGroups} groups, ${totalTasks} tasks`);
            res.json({
                success: true,
                message: "Daily summary sent successfully",
                data: {
                    groupsProcessed: totalGroups,
                    totalTasks: totalTasks,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error triggering daily summary:", error);
            res.status(500).json({
                success: false,
                error: "Failed to trigger daily summary",
                details: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * POST /api/admin/backfill-submitted-statuses
     * แก้สถานะย้อนหลังให้เป็น 'submitted' สำหรับงานที่มีการส่ง/ขอตรวจแล้ว แต่ยังอยู่ในสถานะ pending/in_progress/overdue
     * body: { groupId?: string }  // รองรับ LINE Group ID (ขึ้นต้นด้วย C) หรือ internal UUID
     */
    async backfillSubmittedStatuses(req, res) {
        try {
            const { groupId } = (req.body || {});
            const taskRepo = database_1.AppDataSource.getRepository(models_1.Task);
            let internalGroupId;
            if (groupId) {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
                const groupRepo = database_1.AppDataSource.getRepository(models_1.Group);
                const found = isUuid
                    ? await groupRepo.findOne({ where: { id: groupId } })
                    : await groupRepo.findOne({ where: { lineGroupId: groupId } });
                if (!found) {
                    res.status(404).json({ success: false, error: "Group not found" });
                    return;
                }
                internalGroupId = found.id;
            }
            const qb = taskRepo
                .createQueryBuilder("task")
                .leftJoinAndSelect("task.group", "group")
                .where("task.status IN (:...st)", {
                st: ["pending", "in_progress", "overdue"],
            });
            if (internalGroupId) {
                qb.andWhere("task.groupId = :gid", { gid: internalGroupId });
            }
            const tasks = await qb.getMany();
            let updated = 0;
            for (const task of tasks) {
                try {
                    const wf = task.workflow || {};
                    const submissions = wf?.submissions;
                    const hasSubmission = Array.isArray(submissions)
                        ? submissions.length > 0
                        : submissions && typeof submissions === "object"
                            ? Object.keys(submissions).length > 0
                            : false;
                    const review = wf?.review;
                    const reviewRequested = !!(review &&
                        (review.status === "pending" || review.reviewRequestedAt));
                    if (!hasSubmission && !reviewRequested) {
                        continue;
                    }
                    // Backfill submittedAt
                    let submittedAt = task.submittedAt || undefined;
                    if (!submittedAt) {
                        if (Array.isArray(submissions) && submissions.length > 0) {
                            const times = submissions
                                .map((s) => s?.submittedAt ? new Date(s.submittedAt) : undefined)
                                .filter(Boolean);
                            if (times.length > 0) {
                                submittedAt = new Date(Math.min(...times.map((t) => t.getTime())));
                            }
                        }
                    }
                    task.submittedAt = submittedAt || new Date();
                    task.status = "submitted";
                    await taskRepo.save(task);
                    updated++;
                }
                catch (e) {
                    logger_1.logger.warn("Failed to backfill task", {
                        taskId: task.id,
                        error: e?.message || e,
                    });
                }
            }
            res.json({
                success: true,
                message: "Backfill completed",
                data: { updated, groupId: groupId || null },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error in backfillSubmittedStatuses:", error);
            res.status(500).json({
                success: false,
                error: "Failed to backfill submitted statuses",
            });
        }
    }
    /**
     * GET /api/admin/groups/:groupId/overdue-audit
     * แสดงรายการงาน overdue พร้อมสัญญาณว่ามีการ "ส่งแล้ว" หรือไม่ (ตามข้อมูลที่ระบบเห็น)
     * รองรับ groupId เป็น LINE Group ID หรือ internal UUID
     */
    async overdueAudit(req, res) {
        try {
            const { groupId } = req.params;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            const groupRepo = database_1.AppDataSource.getRepository(models_1.Group);
            const taskRepo = database_1.AppDataSource.getRepository(models_1.Task);
            const group = isUuid
                ? await groupRepo.findOne({ where: { id: groupId } })
                : await groupRepo.findOne({ where: { lineGroupId: groupId } });
            if (!group) {
                res.status(404).json({ success: false, error: "Group not found" });
                return;
            }
            const tasks = await taskRepo
                .createQueryBuilder("task")
                .leftJoinAndSelect("task.assignedUsers", "assignee")
                .leftJoinAndSelect("task.attachedFiles", "file")
                .where("task.groupId = :gid", { gid: group.id })
                .andWhere("task.status = :st", { st: "overdue" })
                .orderBy("task.dueTime", "ASC")
                .getMany();
            const data = tasks.map((t) => {
                const wf = t.workflow || {};
                const submissions = wf?.submissions;
                const hasSubmission = Array.isArray(submissions)
                    ? submissions.length > 0
                    : submissions && typeof submissions === "object"
                        ? Object.keys(submissions).length > 0
                        : false;
                const review = wf?.review;
                const reviewStatus = review?.status || "not_requested";
                const reviewRequested = !!(review &&
                    (review.status === "pending" || review.reviewRequestedAt));
                const hasSubmissionFiles = Array.isArray(t.attachedFiles)
                    ? t.attachedFiles.some((f) => f?.attachmentType === "submission")
                    : false;
                return {
                    id: t.id,
                    title: t.title,
                    dueTime: t.dueTime,
                    status: t.status,
                    hasSubmission,
                    hasSubmissionFiles,
                    submittedAt: t.submittedAt || null,
                    reviewStatus,
                    reviewRequested,
                    assigneeCount: Array.isArray(t.assignedUsers)
                        ? t.assignedUsers.length
                        : 0,
                };
            });
            res.json({ success: true, data });
        }
        catch (error) {
            logger_1.logger.error("❌ Error in overdueAudit:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to audit overdue tasks" });
        }
    }
    /**
     * POST /api/admin/force-submit-tasks
     * บันทึกการส่งงานแบบบังคับสำหรับรายการ taskIds ที่ระบุ โดยแนบไฟล์ล่าสุดของผู้รับผิดชอบในช่วงเวลาที่กำหนด (ออปชัน)
     * body: {
     *   taskIds: string[];                 // รายการ task UUID
     *   comment?: string;                  // หมายเหตุที่จะบันทึกไปกับ submission
     *   submitterLineUserId?: string;      // ถ้าไม่ระบุ จะใช้ LINE ID ของผู้รับผิดชอบคนแรกของงาน
     *   linkRecentFiles?: boolean;         // ถ้าจริง จะค้นหาไฟล์ล่าสุดมาแนบอัตโนมัติ
     *   recentHours?: number;              // ช่วงชั่วโมงย้อนหลังสำหรับค้นหาไฟล์ (default 48)
     * }
     */
    async forceSubmitTasks(req, res) {
        try {
            const body = (req.body || {});
            const { taskIds, comment, submitterLineUserId, linkRecentFiles, recentHours, } = body;
            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                res.status(400).json({ success: false, error: "taskIds is required" });
                return;
            }
            const results = [];
            const hours = typeof recentHours === "number" && recentHours > 0 ? recentHours : 48;
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            for (const taskId of taskIds) {
                try {
                    // โหลดงานพร้อมความสัมพันธ์ที่ต้องใช้
                    const task = await this.taskService.getTaskById(taskId);
                    if (!task) {
                        results.push({
                            taskId,
                            submitted: false,
                            fileCount: 0,
                            error: "Task not found",
                        });
                        continue;
                    }
                    // หา submitter LINE ID
                    let submitter = submitterLineUserId;
                    if (!submitter) {
                        const firstAssignee = task.assignedUsers?.[0];
                        submitter = firstAssignee?.lineUserId;
                    }
                    if (!submitter) {
                        results.push({
                            taskId,
                            submitted: false,
                            fileCount: 0,
                            error: "No submitter (assignee) found",
                        });
                        continue;
                    }
                    // หาไฟล์ล่าสุดในกลุ่มโดยผู้ส่งคนนี้ (ออปชัน)
                    let fileIds = [];
                    if (linkRecentFiles) {
                        try {
                            // แปลง LINE → internal userId เพื่อกรองผู้อัปโหลด
                            const user = await this.userService.findByLineUserId(submitter);
                            if (user) {
                                const fileRepo = database_1.AppDataSource.getRepository(models_1.File);
                                const files = await fileRepo
                                    .createQueryBuilder("file")
                                    .select(["file.id", "file.uploadedAt"])
                                    .where("file.groupId = :gid", { gid: task.groupId })
                                    .andWhere("file.uploadedBy = :uid", { uid: user.id })
                                    .andWhere("file.uploadedAt >= :since", { since })
                                    .orderBy("file.uploadedAt", "DESC")
                                    .limit(10)
                                    .getMany();
                                fileIds = files.map((f) => f.id);
                            }
                        }
                        catch (e) {
                            logger_1.logger.warn("forceSubmitTasks: failed to lookup recent files", {
                                taskId,
                                error: e?.message || e,
                            });
                        }
                    }
                    // ใช้ flow ปกติในการบันทึก submission (จะตั้ง submittedAt, workflow.review เป็น pending)
                    await this.taskService.recordSubmission(taskId, submitter, fileIds, comment || "[admin force-submit]");
                    results.push({ taskId, submitted: true, fileCount: fileIds.length });
                }
                catch (err) {
                    results.push({
                        taskId,
                        submitted: false,
                        fileCount: 0,
                        error: err?.message || "Unknown error",
                    });
                }
            }
            res.json({
                success: true,
                message: "Force submit processed",
                data: { results },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error in forceSubmitTasks:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to force-submit tasks" });
        }
    }
    /**
     * POST /api/admin/complete-overdue-tasks
     * เปลี่ยนสถานะเป็น 'completed' ให้กับงานทั้งหมดที่เป็น overdue ในกลุ่มที่ระบุ
     * body: { groupId: string }
     * รองรับ groupId เป็น LINE Group ID (ขึ้นต้นด้วย C) หรือ internal UUID
     */
    async completeOverdueTasks(req, res) {
        try {
            const { groupId } = (req.body || {});
            if (!groupId) {
                res.status(400).json({ success: false, error: "groupId is required" });
                return;
            }
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            const groupRepo = database_1.AppDataSource.getRepository(models_1.Group);
            const taskRepo = database_1.AppDataSource.getRepository(models_1.Task);
            const group = isUuid
                ? await groupRepo.findOne({ where: { id: groupId } })
                : await groupRepo.findOne({ where: { lineGroupId: groupId } });
            if (!group) {
                res.status(404).json({ success: false, error: "Group not found" });
                return;
            }
            const overdueTasks = await taskRepo.find({
                where: { groupId: group.id, status: "overdue" },
            });
            let completed = 0;
            const results = [];
            for (const t of overdueTasks) {
                try {
                    await this.taskService.updateTaskStatus(t.id, "completed");
                    completed++;
                    results.push({ taskId: t.id, title: t.title, ok: true });
                }
                catch (e) {
                    results.push({
                        taskId: t.id,
                        title: t.title,
                        ok: false,
                        error: e?.message || "Unknown error",
                    });
                }
            }
            res.json({
                success: true,
                message: `Completed ${completed}/${overdueTasks.length} overdue tasks`,
                data: {
                    group: {
                        id: group.id,
                        lineGroupId: group.lineGroupId,
                        name: group.name,
                    },
                    total: overdueTasks.length,
                    completed,
                    results,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Error in completeOverdueTasks:", error);
            res
                .status(500)
                .json({ success: false, error: "Failed to complete overdue tasks" });
        }
    }
    /**
     * Endpoint to manually trigger duration days column migration
     */
    async migrateDurationDays(req, res) {
        try {
            // Check if user is authenticated
            if (!req.user) {
                res.status(401).json({
                    status: "ERROR",
                    error: "Authentication required",
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            logger_1.logger.info("🔄 Manually triggering duration days column migration...");
            // Use comprehensive migration instead
            const { comprehensiveMigration } = await Promise.resolve().then(() => __importStar(require("@/utils/comprehensiveMigration")));
            await comprehensiveMigration.runComprehensiveMigration();
            res.json({
                status: "OK",
                message: "Duration days column migration completed successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error("❌ Duration days column migration failed:", error);
            res.status(500).json({
                status: "ERROR",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * GET /api/users/:userId - ดึงข้อมูลผู้ใช้
     */
    async getUser(req, res) {
        try {
            const { userId } = req.params;
            // รองรับทั้ง Internal UUID และ LINE User ID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
            const user = isUuid
                ? await this.userService.findById(userId)
                : await this.userService.findByLineUserId(userId);
            if (!user) {
                res.status(404).json({ success: false, error: "User not found" });
                return;
            }
            res.json({ success: true, data: user });
        }
        catch (error) {
            logger_1.logger.error("❌ getUser error:", error);
            res.status(500).json({ success: false, error: "Failed to get user" });
        }
    }
    /**
     * GET /api/users/:userId/tasks - ดึงงานของผู้ใช้
     */
    async getUserTasks(req, res) {
        try {
            const { userId } = req.params;
            const { status, excludeSubmitted } = req.query;
            logger_1.logger.info("🔍 getUserTasks API called", {
                userId,
                status,
                excludeSubmitted,
                userAgent: req.get("User-Agent"),
                ip: req.ip,
            });
            // Validate required parameters
            if (!userId) {
                logger_1.logger.warn("⚠️ Missing userId parameter");
                res.status(400).json({
                    success: false,
                    error: "User ID is required",
                    details: "userId parameter is missing from request",
                });
                return;
            }
            // ดึงข้อมูลผู้ใช้จาก Line User ID
            logger_1.logger.info("🔍 Finding user by LINE User ID:", userId);
            const user = await this.userService.findByLineUserId(userId);
            if (!user) {
                logger_1.logger.warn("⚠️ User not found for LINE User ID:", userId);
                res.status(404).json({
                    success: false,
                    error: "User not found",
                    details: `No user found with LINE User ID: ${userId}`,
                });
                return;
            }
            logger_1.logger.info("✅ Found user:", {
                id: user.id,
                displayName: user.displayName,
                lineUserId: user.lineUserId,
            });
            // แยก status เป็น array
            const statusArray = status
                ? status.split(",").map((s) => s.trim())
                : ["pending", "in_progress", "overdue"];
            logger_1.logger.info("📊 Status array parsed:", statusArray);
            // ดึงงานของผู้ใช้
            logger_1.logger.info("🔍 Fetching user tasks...");
            let tasks = await this.taskService.getUserTasks(user.id, statusArray);
            logger_1.logger.info(`📊 Found ${tasks.length} tasks before filtering`);
            // ถ้าต้องการกรองงานที่ส่งแล้วออก (สำหรับหน้า submit-tasks)
            if (excludeSubmitted === "true") {
                logger_1.logger.info("🔍 Filtering out submitted tasks (but keep rejected ones)...");
                const originalTaskCount = tasks.length;
                tasks = tasks.filter((task) => {
                    const wf = task.workflow || {};
                    const isRejected = wf?.review?.status === "rejected";
                    if (isRejected)
                        return true; // คงงานที่ถูกตีกลับไว้เสมอ
                    // ปกติ: กรองงานที่ผู้ใช้นี้ได้ส่งแล้วออก
                    if (Array.isArray(wf.submissions)) {
                        const userSubmissions = wf.submissions.filter((submission) => submission.submittedByUserId === user.id);
                        return userSubmissions.length === 0;
                    }
                    return true;
                });
                logger_1.logger.info(`📊 After excludeSubmitted filter (keep rejected): ${tasks.length}/${originalTaskCount} tasks remaining`);
            }
            // เพิ่มข้อมูลกลุ่มให้กับแต่ละงาน - ใช้ relations ที่มีอยู่แล้วจาก getUserTasks
            const tasksWithGroups = tasks.map((task) => ({
                ...task,
                group: task.group
                    ? {
                        id: task.group.id,
                        name: task.group.name,
                    }
                    : null,
            }));
            logger_1.logger.info(`✅ getUserTasks completed successfully. Returning ${tasksWithGroups.length} tasks`);
            res.json({
                success: true,
                data: tasksWithGroups,
                metadata: {
                    userId: user.id,
                    lineUserId: userId,
                    statusFilter: statusArray,
                    excludeSubmitted: excludeSubmitted === "true",
                    count: tasksWithGroups.length,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("❌ getUserTasks error:", {
                userId: req.params.userId,
                status: req.query.status,
                excludeSubmitted: req.query.excludeSubmitted,
                error: error instanceof Error
                    ? {
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                    }
                    : error,
            });
            // Provide more specific error messages
            let errorMessage = "Failed to get user tasks";
            let statusCode = 500;
            if (error instanceof Error) {
                if (error.message.includes("User ID is required")) {
                    errorMessage = error.message;
                    statusCode = 400;
                }
                else if (error.message.includes("User not found")) {
                    errorMessage = error.message;
                    statusCode = 404;
                }
                else if (error.message.includes("syntax error") ||
                    error.message.includes("relation") ||
                    error.message.includes("column")) {
                    errorMessage = "Database query error";
                    logger_1.logger.error("Database-related error detected:", error.message);
                }
                else {
                    errorMessage = `Internal server error: ${error.message}`;
                }
            }
            res.status(statusCode).json({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === "development"
                    ? {
                        originalError: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                    }
                    : undefined,
            });
        }
    }
    /**
     * GET /api/groups/:groupId/tasks/deletion-request
     * คืนสถานะคำขอลบงานที่รอการยืนยันสำหรับกลุ่ม
     */
    async getTaskDeletionRequest(req, res) {
        try {
            const { groupId } = req.params;
            const request = await this.taskDeletionService.getPendingRequest(groupId);
            res.json({ success: true, data: request });
        }
        catch (error) {
            logger_1.logger.error("❌ Error getting task deletion request:", error);
            res.status(500).json({
                success: false,
                error: "ไม่สามารถดึงข้อมูลคำขอลบงานได้",
            });
        }
    }
    /**
     * POST /api/groups/:groupId/tasks/deletion-request
     * สร้างคำขอลบงานใหม่จากรายการที่เลือก
     */
    async createTaskDeletionRequest(req, res) {
        try {
            const { groupId } = req.params;
            const { userId, taskIds, filter } = req.body || {};
            if (!userId || typeof userId !== "string") {
                res.status(400).json({
                    success: false,
                    error: "กรุณาระบุผู้ที่ร้องขอลบงาน (userId)",
                });
                return;
            }
            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: "กรุณาเลือกงานที่ต้องการลบอย่างน้อย 1 งาน",
                });
                return;
            }
            const request = await this.taskDeletionService.initiateDeletionRequest({
                groupId,
                requesterLineUserId: userId,
                taskIds,
                filter,
            });
            res.json({ success: true, data: request });
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : "ไม่สามารถสร้างคำขอลบงานได้";
            logger_1.logger.error("❌ Error creating task deletion request:", error);
            res.status(400).json({ success: false, error: errorMessage });
        }
    }
}
const apiController = new ApiController();
// Routes setup
// Group-based routes (ตรงกับ frontend)
exports.apiRouter.get("/groups/:groupId", apiController.getGroup.bind(apiController));
exports.apiRouter.get("/groups/:groupId/members", apiController.getGroupMembers.bind(apiController));
exports.apiRouter.get("/groups/:groupId/stats", apiController.getGroupStats.bind(apiController));
exports.apiRouter.get("/groups/:groupId/tasks", (0, validation_1.validateRequest)(validation_1.taskSchemas.list), apiController.getTasks.bind(apiController));
exports.apiRouter.post("/groups/:groupId/tasks", (0, validation_1.validateRequest)(validation_1.taskSchemas.create), apiController.createTask.bind(apiController));
exports.apiRouter.get("/groups/:groupId/tasks/deletion-request", apiController.getTaskDeletionRequest.bind(apiController));
exports.apiRouter.post("/groups/:groupId/tasks/deletion-request", apiController.createTaskDeletionRequest.bind(apiController));
exports.apiRouter.get("/groups/:groupId/calendar", apiController.getCalendarEvents.bind(apiController));
// Group file listing should respect the requested group rather than defaulting to "default"
exports.apiRouter.get("/groups/:groupId/files", (req, res) => apiController.getGroupFiles(req, res));
exports.apiRouter.get("/groups/:groupId/leaderboard", apiController.getLeaderboard.bind(apiController));
exports.apiRouter.post("/groups/:groupId/sync-leaderboard", apiController.syncLeaderboard.bind(apiController));
exports.apiRouter.get("/users/:userId/score-history/:groupId", apiController.getUserScoreHistory.bind(apiController));
exports.apiRouter.get("/users/:userId/average-score/:groupId", apiController.getUserAverageScore.bind(apiController));
exports.apiRouter.post("/groups/:groupId/settings/report-recipients", apiController.updateReportRecipients.bind(apiController));
// Reports routes (ผู้บริหาร)
exports.apiRouter.get("/groups/:groupId/reports/summary", apiController.getReportsSummary.bind(apiController));
exports.apiRouter.get("/groups/:groupId/reports/by-users", apiController.getReportsByUsers.bind(apiController));
exports.apiRouter.get("/groups/:groupId/reports/export", apiController.exportReports.bind(apiController));
// Recurring endpoints support both group-scoped and global route styles
// Task-specific routes
exports.apiRouter.put("/tasks/:taskId", auth_1.authenticate, taskAuth_1.requireTaskEdit, apiController.updateTask.bind(apiController));
exports.apiRouter.put("/groups/:groupId/tasks/:taskId", auth_1.authenticate, taskAuth_1.requireTaskEdit, apiController.updateTask.bind(apiController));
exports.apiRouter.post("/tasks/:taskId/complete", auth_1.authenticate, taskAuth_1.requireTaskApprove, apiController.completeTask.bind(apiController));
exports.apiRouter.post("/groups/:groupId/tasks/:taskId/approve-extension", auth_1.authenticate, taskAuth_1.requireTaskApprove, apiController.approveExtension.bind(apiController));
// File-specific routes (public access)
exports.apiRouter.get("/files/:fileId/download", apiController.downloadFile.bind(apiController));
exports.apiRouter.get("/files/:fileId/preview", apiController.previewFile.bind(apiController));
exports.apiRouter.post("/files/:fileId/tags", apiController.addFileTags.bind(apiController));
// Admin maintenance routes
exports.apiRouter.post("/admin/files/fix-filenames", apiController.fixOldFilenames.bind(apiController));
// Group-specific file routes (public access for dashboard)
exports.apiRouter.get("/groups/:groupId/files/:fileId/download", apiController.downloadFile.bind(apiController));
exports.apiRouter.get("/groups/:groupId/files/:fileId/preview", apiController.previewFile.bind(apiController));
exports.apiRouter.get("/groups/:groupId/files/:fileId", apiController.getFileInfo.bind(apiController));
// Task-specific file routes
exports.apiRouter.get("/groups/:groupId/tasks/:taskId/files", uuidValidation_1.validateTaskId, apiController.getTaskFiles.bind(apiController));
// User and export routes
exports.apiRouter.get("/users/:userId/stats", (0, uuidValidation_1.validateUUIDParams)(["userId"]), apiController.getUserStats.bind(apiController));
exports.apiRouter.get("/export/kpi/:groupId", apiController.exportKPI.bind(apiController));
exports.apiRouter.post("/kpi/sample/:groupId", apiController.createSampleKPIData.bind(apiController));
exports.apiRouter.get("/line/members/:groupId", apiController.getLineMembers.bind(apiController));
// Live-only variant for convenience (force LINE API)
exports.apiRouter.get("/line/members/:groupId/live", async (req, res) => {
    try {
        const { groupId } = req.params;
        const svc = new LineService_1.LineService();
        const members = await svc.getAllGroupMembers(groupId);
        res.json({ success: true, data: members });
    }
    catch (error) {
        logger_1.logger.error("❌ Error getting LINE members (live):", error);
        res
            .status(500)
            .json({ success: false, error: "Failed to get LINE members (live)" });
    }
});
// New helper route: fetch single task detail by ID (for dashboard modal)
exports.apiRouter.get("/task/:taskId", uuidValidation_1.validateTaskId, async (req, res) => {
    try {
        const { taskId } = req.params;
        const svc = new TaskService_1.TaskService();
        const taskEntity = await svc.getTaskById(taskId);
        if (!taskEntity) {
            res.status(404).json({ success: false, error: "Task not found" });
            return;
        }
        const task = (0, adapters_1.taskEntityToInterface)(taskEntity);
        res.json({ success: true, data: task });
    }
    catch (err) {
        logger_1.logger.error("Failed to get task:", err);
        res.status(500).json({ success: false, error: "Failed to get task" });
    }
});
// Group-specific task detail route
exports.apiRouter.get("/groups/:groupId/tasks/:taskId", uuidValidation_1.validateTaskId, async (req, res) => {
    try {
        const { taskId } = req.params;
        const svc = new TaskService_1.TaskService();
        const taskEntity = await svc.getTaskById(taskId);
        if (!taskEntity) {
            res.status(404).json({ success: false, error: "Task not found" });
            return;
        }
        const task = (0, adapters_1.taskEntityToInterface)(taskEntity);
        res.json({ success: true, data: task });
    }
    catch (err) {
        logger_1.logger.error("Failed to get task:", err);
        res.status(500).json({ success: false, error: "Failed to get task" });
    }
});
// Legacy routes (รองรับ backward compatibility)
exports.apiRouter.get("/tasks/:groupId", apiController.getTasks.bind(apiController));
exports.apiRouter.post("/tasks/:groupId", apiController.createTask.bind(apiController));
exports.apiRouter.get("/calendar/:groupId", apiController.getCalendarEvents.bind(apiController));
exports.apiRouter.get("/files/:groupId", (req, res) => apiController.getGroupFiles(req, res));
exports.apiRouter.get("/leaderboard/:groupId", apiController.getLeaderboard.bind(apiController));
// Debug endpoint for recurring tasks
exports.apiRouter.post("/debug/recurring-test", async (req, res) => {
    try {
        logger_1.logger.info("🔍 Debug recurring task request:", {
            headers: req.headers,
            body: req.body,
            bodyKeys: Object.keys(req.body || {}),
            bodyStringified: JSON.stringify(req.body, null, 2),
        });
        res.json({
            success: true,
            message: "Debug endpoint - request logged",
            receivedData: req.body,
        });
    }
    catch (error) {
        logger_1.logger.error("❌ Debug endpoint error:", error);
        res.status(500).json({ success: false, error: "Debug endpoint failed" });
    }
});
// Temporary recurring endpoint without validation
exports.apiRouter.post("/groups/:groupId/recurring-no-validation", async (req, res) => {
    try {
        const { groupId } = req.params;
        const body = req.body || {};
        logger_1.logger.info("🔍 Testing recurring without validation:", {
            groupId,
            bodyKeys: Object.keys(body),
            body: JSON.stringify(body, null, 2),
        });
        const apiController = new ApiController();
        await apiController.createRecurring(req, res);
    }
    catch (error) {
        logger_1.logger.error("❌ No-validation endpoint error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : "Failed to create recurring task without validation",
            details: error instanceof Error ? error.stack : undefined,
        });
    }
});
// Recurring tasks routes (UI management)
exports.apiRouter.get("/groups/:groupId/recurring", apiController.listRecurring.bind(apiController));
exports.apiRouter.post("/groups/:groupId/recurring", (0, validation_1.validateRequest)(validation_1.recurringTaskSchemas.create), apiController.createRecurring.bind(apiController));
exports.apiRouter.get("/groups/:groupId/recurring/stats", apiController.getGroupRecurringStats.bind(apiController));
exports.apiRouter.get("/groups/:groupId/recurring/:id", apiController.getRecurring.bind(apiController));
exports.apiRouter.put("/groups/:groupId/recurring/:id", (0, validation_1.validateRequest)(validation_1.recurringTaskSchemas.update), apiController.updateRecurring.bind(apiController));
exports.apiRouter.delete("/groups/:groupId/recurring/:id", apiController.deleteRecurring.bind(apiController));
exports.apiRouter.get("/groups/:groupId/recurring/:id/history", apiController.getRecurringHistory.bind(apiController));
exports.apiRouter.patch("/groups/:groupId/recurring/:id/toggle", (0, validation_1.validateRequest)(validation_1.recurringTaskSchemas.toggle), apiController.toggleRecurring.bind(apiController));
exports.apiRouter.get("/recurring/:id", apiController.getRecurring.bind(apiController));
exports.apiRouter.put("/recurring/:id", (0, validation_1.validateRequest)(validation_1.recurringTaskSchemas.update), apiController.updateRecurring.bind(apiController));
exports.apiRouter.delete("/recurring/:id", apiController.deleteRecurring.bind(apiController));
// Recurring task history and statistics
exports.apiRouter.get("/recurring/:id/history", apiController.getRecurringHistory.bind(apiController));
exports.apiRouter.get("/recurring/:id/stats", apiController.getRecurringStats.bind(apiController));
// Task submission (UI upload)
exports.apiRouter.post("/groups/:groupId/tasks/:taskId/submit", auth_1.authenticate, taskAuth_1.requireTaskSubmit, upload.array("attachments", 10), apiController.submitTask.bind(apiController));
// Task submission (direct task ID - for backward compatibility)
exports.apiRouter.post("/tasks/:taskId/submit", auth_1.authenticate, taskAuth_1.requireTaskSubmit, upload.array("files", 10), apiController.submitTask.bind(apiController));
// Dashboard task submission (no authentication required - uses userId directly)
exports.apiRouter.post("/dashboard/tasks/:taskId/submit", upload.array("attachments", 10), apiController.submitTaskFromDashboard.bind(apiController));
// Dashboard task update (no authentication required - uses userId directly)
exports.apiRouter.put("/dashboard/groups/:groupId/tasks/:taskId", apiController.updateTaskFromDashboard.bind(apiController));
// Direct file upload to group vault
exports.apiRouter.post("/groups/:groupId/files/upload", upload.array("attachments", 10), apiController.uploadFiles.bind(apiController));
// General file upload (for dashboard)
exports.apiRouter.post("/files/upload", upload.array("files", 10), apiController.uploadGeneralFiles.bind(apiController));
// File management endpoints
exports.apiRouter.delete("/files/:fileId", apiController.deleteFile.bind(apiController));
exports.apiRouter.get("/files", apiController.getFiles.bind(apiController));
// Manual migration endpoint (for Railway deployment)
exports.apiRouter.post("/admin/migrate", apiController.runMigration.bind(apiController));
// Duration days migration endpoint
exports.apiRouter.post("/admin/migrate-duration-days", apiController.migrateDurationDays.bind(apiController));
// KPI Enum migration endpoint
exports.apiRouter.post("/admin/migrate-kpi-enum", apiController.runKPIEnumMigration.bind(apiController));
// Admin: hard delete a group and all related data (except users)
exports.apiRouter.delete("/admin/groups/:groupId", apiController.hardDeleteGroup.bind(apiController));
// Maintenance: cleanup groups that bot is no longer in (no admin token; supports dryRun)
exports.apiRouter.post("/maintenance/cleanup-inactive-groups", apiController.cleanupInactiveGroups.bind(apiController));
exports.apiRouter.get("/admin/check-db", apiController.checkDatabaseConnection.bind(apiController));
// Group name update endpoint
exports.apiRouter.post("/groups/update-names", apiController.updateAllGroupNames.bind(apiController));
// User routes
exports.apiRouter.get("/users/:userId", apiController.getUser.bind(apiController));
exports.apiRouter.get("/users/:userId/tasks", apiController.getUserTasks.bind(apiController));
// Notification Card routes
exports.apiRouter.post("/notifications/cards", apiController.createNotificationCard.bind(apiController));
exports.apiRouter.get("/notifications/cards/templates", apiController.getNotificationTemplates.bind(apiController));
exports.apiRouter.post("/notifications/cards/quick", apiController.sendQuickNotification.bind(apiController));
exports.apiRouter.post("/admin/test-google-calendar", apiController.testGoogleCalendar.bind(apiController));
exports.apiRouter.post("/admin/setup-group-calendar/:groupId", apiController.setupGroupCalendar.bind(apiController));
// Manual daily summary trigger
exports.apiRouter.post("/admin/trigger-daily-summary", apiController.triggerDailySummary.bind(apiController));
// Admin: backfill submitted statuses for tasks with submissions/review
exports.apiRouter.post("/admin/backfill-submitted-statuses", apiController.backfillSubmittedStatuses.bind(apiController));
// Admin: audit overdue tasks for a group
exports.apiRouter.get("/admin/groups/:groupId/overdue-audit", apiController.overdueAudit.bind(apiController));
// Admin: force submit tasks
exports.apiRouter.post("/admin/force-submit-tasks", apiController.forceSubmitTasks.bind(apiController));
// Admin: complete all overdue tasks in a group
exports.apiRouter.post("/admin/complete-overdue-tasks", apiController.completeOverdueTasks.bind(apiController));
// Manual bot membership check and cleanup trigger
exports.apiRouter.post("/admin/check-bot-membership", apiController.checkBotMembershipAndCleanup.bind(apiController));
// User management routes
exports.apiRouter.put("/users/:userId", apiController.updateUser.bind(apiController));
exports.apiRouter.post("/users/:userId/calendar-invite", apiController.sendCalendarInvitesForUser.bind(apiController));
exports.apiRouter.get("/users/:userId/groups", apiController.getUserGroups.bind(apiController));
// Bulk member operations
exports.apiRouter.post("/groups/:groupId/members/bulk-delete", apiController.bulkDeleteMembers.bind(apiController));
exports.apiRouter.post("/groups/:groupId/members/bulk-update-role", apiController.bulkUpdateMemberRole.bind(apiController));
// Email verification
exports.apiRouter.post("/users/:userId/email/send-verification", apiController.sendEmailVerification.bind(apiController));
exports.apiRouter.post("/users/:userId/email/verify", apiController.verifyEmail.bind(apiController));
// Activity Logs endpoints
exports.apiRouter.get("/groups/:groupId/activity-logs", apiController.getActivityLogs.bind(apiController));
exports.apiRouter.get("/groups/:groupId/activity-logs/stats", apiController.getActivityStats.bind(apiController));
exports.apiRouter.get("/groups/:groupId/activity-logs/actions", apiController.getUniqueActions.bind(apiController));
exports.apiRouter.get("/groups/:groupId/activity-logs/resource-types", apiController.getUniqueResourceTypes.bind(apiController));
//# sourceMappingURL=apiController.js.map