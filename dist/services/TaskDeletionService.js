"use strict";
// TaskDeletionService - Manage multi-step deletion workflow with approvals
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDeletionService = void 0;
const typeorm_1 = require("typeorm");
const crypto_1 = require("crypto");
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const logger_1 = require("@/utils/logger");
const serviceContainer_1 = require("@/utils/serviceContainer");
class TaskDeletionService {
    constructor() {
        this.groupRepository = database_1.AppDataSource.getRepository(models_1.Group);
        this.taskRepository = database_1.AppDataSource.getRepository(models_1.Task);
        this.userRepository = database_1.AppDataSource.getRepository(models_1.User);
        this.groupMemberRepository = database_1.AppDataSource.getRepository(models_1.GroupMember);
        this.taskService = serviceContainer_1.serviceContainer.get('TaskService');
        this.lineService = serviceContainer_1.serviceContainer.get('LineService');
        this.userService = serviceContainer_1.serviceContainer.get('UserService');
    }
    ensurePositiveInteger(value, fallback = 1) {
        const parsed = typeof value === 'number'
            ? value
            : typeof value === 'string'
                ? Number(value)
                : Number.NaN;
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.max(Math.floor(parsed), 1);
        }
        const parsedFallback = typeof fallback === 'number'
            ? fallback
            : typeof fallback === 'string'
                ? Number(fallback)
                : Number.NaN;
        if (Number.isFinite(parsedFallback) && parsedFallback > 0) {
            return Math.max(Math.floor(parsedFallback), 1);
        }
        return 1;
    }
    calculateApprovalThreshold(memberCount, fallbackTotal, fallbackRequired) {
        const totalMembers = this.ensurePositiveInteger(memberCount, fallbackTotal);
        const requiredApprovals = this.ensurePositiveInteger(Math.ceil(totalMembers / 3), fallbackRequired);
        return {
            totalMembers,
            requiredApprovals,
        };
    }
    /**
     * ค้นหา Group entity จาก internal UUID หรือ LINE Group ID
     */
    async resolveGroup(groupIdOrLineId) {
        if (!groupIdOrLineId)
            return null;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupIdOrLineId);
        const where = isUuid
            ? { id: groupIdOrLineId }
            : { lineGroupId: groupIdOrLineId };
        const group = await this.groupRepository.findOne({
            where,
        });
        return group || null;
    }
    /**
     * ดึงคำขอลบงานที่รอดำเนินการของกลุ่ม
     */
    async getPendingRequest(groupIdOrLineId) {
        const group = await this.resolveGroup(groupIdOrLineId);
        if (!group)
            return null;
        const request = group.settings?.pendingDeletionRequest ?? null;
        if (!request)
            return null;
        const clearRequest = async () => {
            group.settings = {
                ...(group.settings || {}),
                pendingDeletionRequest: undefined,
            };
            await this.groupRepository.save(group);
            return null;
        };
        if (!Array.isArray(request.tasks) || request.tasks.length === 0) {
            return clearRequest();
        }
        const taskIds = request.tasks
            .map((task) => task?.id)
            .filter((id) => typeof id === 'string' && id.length > 0);
        if (taskIds.length === 0) {
            return clearRequest();
        }
        const tasks = await this.taskRepository.find({
            where: { id: (0, typeorm_1.In)(taskIds) },
            relations: ['assignedUsers'],
        });
        if (tasks.length === 0) {
            return clearRequest();
        }
        const normalizedTasks = tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            assignees: Array.isArray(task.assignedUsers)
                ? task.assignedUsers.map((member) => member.displayName || member.lineUserId)
                : [],
        }));
        let approvals = Array.isArray(request.approvals)
            ? request.approvals.filter((approval) => approval && typeof approval.lineUserId === 'string')
            : [];
        const uniqueApprovals = new Map();
        approvals.forEach((approval) => {
            uniqueApprovals.set(approval.lineUserId, approval);
        });
        approvals = Array.from(uniqueApprovals.values());
        const memberCount = await this.groupMemberRepository.count({
            where: { groupId: group.id },
        });
        const fallbackTotal = Math.max(this.ensurePositiveInteger(request.totalMembers, approvals.length || 1), approvals.length || 1, 1);
        const fallbackRequired = Math.max(this.ensurePositiveInteger(request.requiredApprovals, Math.ceil(fallbackTotal / 3) || approvals.length || 1), 1);
        const { totalMembers, requiredApprovals } = this.calculateApprovalThreshold(memberCount, fallbackTotal, fallbackRequired);
        const updatedRequest = {
            ...request,
            tasks: normalizedTasks,
            totalMembers,
            requiredApprovals,
            approvals,
        };
        group.settings = {
            ...(group.settings || {}),
            pendingDeletionRequest: updatedRequest,
        };
        await this.groupRepository.save(group);
        return updatedRequest;
    }
    /**
     * สร้างคำขอลบงานใหม่
     */
    async initiateDeletionRequest(options) {
        const { groupId, requesterLineUserId, taskIds, filter = 'custom' } = options;
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            throw new Error('กรุณาเลือกงานอย่างน้อย 1 งาน');
        }
        const group = await this.resolveGroup(groupId);
        if (!group) {
            throw new Error('ไม่พบข้อมูลกลุ่ม');
        }
        const lineGroupId = group.lineGroupId || group.id;
        // ตรวจสอบว่ามีคำขอลบงานที่ยังไม่เสร็จสิ้นหรือไม่
        const existingRequest = group.settings?.pendingDeletionRequest;
        if (existingRequest) {
            throw new Error('ขณะนี้มีกระบวนการลบงานที่รอการยืนยันอยู่แล้ว');
        }
        // ตรวจสอบสิทธิ์ (จำกัดเฉพาะ admin)
        const isAdmin = await this.userService.isGroupAdmin(requesterLineUserId, lineGroupId);
        if (!isAdmin) {
            throw new Error('เฉพาะแอดมินกลุ่มเท่านั้นที่สามารถเริ่มลบงานได้');
        }
        const requester = await this.userRepository.findOne({
            where: { lineUserId: requesterLineUserId },
        });
        if (!requester) {
            throw new Error('ไม่พบข้อมูลผู้ใช้สำหรับคำขอ');
        }
        // ตรวจสอบรายการงาน
        const tasks = await this.taskRepository.find({
            where: { id: (0, typeorm_1.In)(taskIds) },
            relations: ['assignedUsers'],
        });
        if (tasks.length !== taskIds.length) {
            const foundIds = new Set(tasks.map((task) => task.id));
            const missing = taskIds.filter((id) => !foundIds.has(id));
            throw new Error(`ไม่พบงานบางรายการหรือคุณไม่มีสิทธิ์ลบงานเหล่านี้: ${missing.join(', ')}`);
        }
        // ตรวจสอบว่าทุกงานอยู่ในกลุ่มเดียวกัน
        const invalidTask = tasks.find((task) => task.groupId !== group.id && task.group?.id && task.group.id !== group.id);
        if (invalidTask) {
            throw new Error(`งาน "${invalidTask.title}" ไม่ได้อยู่ในกลุ่มนี้ ไม่สามารถลบได้`);
        }
        // นับจำนวนสมาชิกในกลุ่ม
        const memberCount = await this.groupMemberRepository.count({
            where: { groupId: group.id },
        });
        const fallbackTotal = Math.max(tasks.length, 1);
        const fallbackRequired = Math.max(Math.ceil(fallbackTotal / 3), 1);
        const { totalMembers, requiredApprovals } = this.calculateApprovalThreshold(memberCount, fallbackTotal, fallbackRequired);
        const taskSummaries = tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            assignees: Array.isArray(task.assignedUsers)
                ? task.assignedUsers.map((member) => member.displayName || member.lineUserId)
                : [],
        }));
        const requestData = {
            id: (0, crypto_1.randomUUID)(),
            filter,
            requestedBy: {
                userId: requester.id,
                lineUserId: requester.lineUserId,
                displayName: requester.displayName,
            },
            createdAt: new Date().toISOString(),
            tasks: taskSummaries,
            totalMembers,
            requiredApprovals,
            approvals: [],
        };
        group.settings = {
            ...(group.settings || {}),
            pendingDeletionRequest: requestData,
        };
        await this.groupRepository.save(group);
        // ส่งข้อความแจ้งในกลุ่ม
        this.notifyNewDeletionRequest(lineGroupId, requestData).catch((error) => {
            logger_1.logger.error('❌ Failed to push deletion request notification:', error);
        });
        return requestData;
    }
    /**
     * บันทึกการยืนยันของสมาชิก
     */
    async registerApproval(groupIdOrLineId, approverLineUserId) {
        const group = await this.resolveGroup(groupIdOrLineId);
        if (!group) {
            return {
                status: 'error',
                message: 'ไม่พบข้อมูลกลุ่ม',
            };
        }
        const request = group.settings?.pendingDeletionRequest;
        if (!request) {
            return {
                status: 'noop',
                message: 'ตอนนี้ไม่มีคำขอลบงานที่รอการยืนยัน',
            };
        }
        const approver = await this.userRepository.findOne({
            where: { lineUserId: approverLineUserId },
        });
        if (!approver) {
            return {
                status: 'error',
                message: 'ไม่พบข้อมูลผู้ใช้ กรุณาพิมพ์ "ยอมรับ" อีกครั้งหลังจากบอทบันทึกข้อมูลสมาชิกเรียบร้อย',
            };
        }
        // ตรวจสอบว่าผู้ใช้อยู่ในกลุ่มและมีสถานะสมาชิก
        const membership = await this.groupMemberRepository.findOne({
            where: { userId: approver.id, groupId: group.id },
        });
        if (!membership) {
            return {
                status: 'error',
                message: 'เฉพาะสมาชิกในกลุ่มเท่านั้นที่สามารถยืนยันการลบงานได้',
            };
        }
        const alreadyApproved = request.approvals?.some((approval) => approval.lineUserId === approver.lineUserId) ?? false;
        if (alreadyApproved) {
            return {
                status: 'noop',
                message: 'คุณยืนยันไปแล้ว ขอบคุณค่ะ',
            };
        }
        const approvals = [...(request.approvals || [])];
        approvals.push({
            userId: approver.id,
            lineUserId: approver.lineUserId,
            displayName: approver.displayName,
            approvedAt: new Date().toISOString(),
        });
        request.approvals = approvals;
        const memberCount = await this.groupMemberRepository.count({
            where: { groupId: group.id },
        });
        const fallbackTotal = Math.max(this.ensurePositiveInteger(request.totalMembers, approvals.length || 1), approvals.length || 1, 1);
        const fallbackRequired = Math.max(this.ensurePositiveInteger(request.requiredApprovals, Math.ceil(fallbackTotal / 3)), 1);
        const { totalMembers, requiredApprovals } = this.calculateApprovalThreshold(memberCount, fallbackTotal, fallbackRequired);
        request.totalMembers = totalMembers;
        request.requiredApprovals = requiredApprovals;
        group.settings = {
            ...(group.settings || {}),
            pendingDeletionRequest: request,
        };
        await this.groupRepository.save(group);
        const approvedCount = approvals.length;
        const required = request.requiredApprovals;
        if (approvedCount >= required) {
            const deletionResult = await this.executeDeletion(group, request);
            return deletionResult;
        }
        const remaining = Math.max(required - approvedCount, 0);
        const approverName = approver.displayName || approver.lineUserId;
        const summary = `✅ ${approverName} ยืนยันแล้ว (${approvedCount}/${required})\nยังต้องการอีก ${remaining} คนเพื่อดำเนินการลบงาน`;
        return {
            status: 'pending',
            message: summary,
            data: {
                approvals: approvals.length,
                required,
            },
        };
    }
    /**
     * ดำเนินการลบงานเมื่อได้รับการยืนยันครบตามกำหนด
     */
    async executeDeletion(group, request) {
        const lineGroupId = group.lineGroupId || group.id;
        const tasks = request.tasks || [];
        const deletedTasks = [];
        const failedTasks = [];
        for (const task of tasks) {
            try {
                await this.taskService.deleteTask(task.id);
                deletedTasks.push(task.title || task.id);
            }
            catch (error) {
                logger_1.logger.error('❌ Failed deleting task during approval', {
                    taskId: task.id,
                    error,
                });
                failedTasks.push({
                    id: task.id,
                    error: error?.message || 'Unknown error',
                });
            }
        }
        // เคลียร์คำขอที่รอดำเนินการ
        group.settings = {
            ...(group.settings || {}),
            pendingDeletionRequest: undefined,
        };
        await this.groupRepository.save(group);
        const summaryLines = deletedTasks
            .slice(0, 10)
            .map((title) => `• ${title}`);
        const truncated = deletedTasks.length > 10;
        if (truncated) {
            summaryLines.push(`…และอีก ${deletedTasks.length - 10} งาน`);
        }
        const safeRequiredApprovals = this.ensurePositiveInteger(request.requiredApprovals, Math.max(request.approvals?.length || 0, 1));
        request.requiredApprovals = safeRequiredApprovals;
        const approvalSummary = `${request.approvals.length}/${safeRequiredApprovals}`;
        const finalMessage = [
            '🗑️ ลบงานสำเร็จ',
            summaryLines.join('\n'),
            '',
            `ยืนยันโดยสมาชิก ${approvalSummary} คน ขอบคุณค่ะ!`,
        ]
            .filter(Boolean)
            .join('\n');
        this.lineService
            .pushMessage(lineGroupId, finalMessage)
            .catch((error) => {
            logger_1.logger.error('❌ Failed to push deletion completion message:', error);
        });
        let message = `ลบงานทั้งหมด ${deletedTasks.length} รายการเรียบร้อยแล้ว ขอบคุณทุกคนค่ะ`;
        if (failedTasks.length > 0) {
            message += `\n⚠️ มีงานบางรายการลบไม่สำเร็จ: ${failedTasks
                .map((item) => item.id)
                .join(', ')}`;
        }
        return {
            status: 'executed',
            message,
            data: {
                deleted: deletedTasks.length,
                failed: failedTasks,
            },
        };
    }
    /**
     * แจ้งเตือนในกลุ่มเมื่อมีคำขอลบงานใหม่
     */
    async notifyNewDeletionRequest(lineGroupId, request) {
        const requester = request.requestedBy.displayName || request.requestedBy.lineUserId;
        const taskLines = request.tasks.slice(0, 10).map((task, index) => {
            const assignees = Array.isArray(task.assignees) && task.assignees.length > 0
                ? ` (${task.assignees.join(', ')})`
                : '';
            return `${index + 1}. ${task.title}${assignees}`;
        });
        if (request.tasks.length > 10) {
            taskLines.push(`…และอีก ${request.tasks.length - 10} งาน`);
        }
        const summary = [
            '🗑️ มีคำขอลบงานในกลุ่ม',
            `ผู้ขอ: ${requester}`,
            '',
            `งานที่จะลบทั้งหมด ${request.tasks.length} รายการ:`,
            taskLines.join('\n'),
            '',
            `ต้องการการยืนยันอย่างน้อย ${request.requiredApprovals} คน (จากสมาชิกทั้งหมด ${request.totalMembers} คน)`,
            'พิมพ์ "ยอมรับ" ในกลุ่มนี้เพื่อยืนยันการลบงาน',
        ].join('\n');
        await this.lineService.pushMessage(lineGroupId, summary);
    }
}
exports.TaskDeletionService = TaskDeletionService;
//# sourceMappingURL=TaskDeletionService.js.map