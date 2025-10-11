"use strict";
// Notification Service - จัดการการแจ้งเตือนและอีเมล
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
exports.NotificationService = void 0;
const LineService_1 = require("./LineService");
const UserService_1 = require("./UserService");
const EmailService_1 = require("./EmailService");
const FileService_1 = require("./FileService");
const FlexMessageTemplateService_1 = require("./FlexMessageTemplateService");
const FlexMessageDesignSystem_1 = require("./FlexMessageDesignSystem");
const config_1 = require("@/utils/config");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
class NotificationService {
    constructor() {
        this.lineService = new LineService_1.LineService();
        this.userService = new UserService_1.UserService();
        this.emailService = new EmailService_1.EmailService();
        this.fileService = new FileService_1.FileService();
        this._sentNotifications = new Set();
    }
    /**
     * ส่งการเตือนงาน
     */
    async sendTaskReminder(task, reminderType) {
        try {
            // Skip if task is not in an active status
            const inactiveStatuses = new Set(['completed', 'approved', 'reviewed', 'submitted', 'rejected', 'cancelled']);
            if (inactiveStatuses.has((task.status || '').toLowerCase())) {
                console.log(`ℹ️ Skip reminder for inactive task: ${task.id} (status: ${task.status})`);
                return;
            }
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `task_reminder_${task.id}_${reminderType}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Task reminder notification already sent for task: ${task.id}, type: ${reminderType}`);
                return;
            }
            const group = task.group;
            if (!group)
                return;
            // สร้าง Flex Message สำหรับการเตือนงาน
            const flexMessage = this.createTaskReminderFlexMessage(task, group, reminderType);
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            // ส่งการแจ้งเตือนส่วนตัวให้ผู้รับผิดชอบ
            const assignees = task.assignedUsers || [];
            for (const assignee of assignees) {
                try {
                    const personalFlexMessage = this.createPersonalTaskReminderFlexMessage(task, group, assignee, reminderType);
                    await this.lineService.pushMessage(assignee.lineUserId, personalFlexMessage);
                    console.log(`✅ Sent personal task reminder to: ${assignee.displayName}`);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send personal task reminder:', assignee.lineUserId, err);
                }
            }
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 1 ชั่วโมง (สำหรับการเตือน)
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 60 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending task reminder:', error);
            throw error;
        }
    }
    /**
     * ส่งการแจ้งเตือนงานเกินกำหนด
     */
    async sendOverdueNotification(data) {
        try {
            const { task, overdueHours } = data;
            // Skip if task no longer overdue/active
            const inactiveStatuses = new Set(['completed', 'approved', 'reviewed', 'submitted', 'rejected', 'cancelled']);
            if (inactiveStatuses.has((task.status || '').toLowerCase())) {
                console.log(`ℹ️ Skip overdue notification for inactive task: ${task.id} (status: ${task.status})`);
                return;
            }
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `task_overdue_${task.id}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Task overdue notification already sent for task: ${task.id}`);
                return;
            }
            const group = task.group;
            if (!group)
                return;
            // ส่งการแจ้งเตือนส่วนตัวให้ผู้รับผิดชอบเท่านั้น (ไม่ส่งในกลุ่ม)
            const assignees = task.assignedUsers || [];
            for (const assignee of assignees) {
                try {
                    const personalFlexMessage = this.createPersonalOverdueTaskFlexMessage(task, group, assignee, overdueHours);
                    await this.lineService.pushMessage(assignee.lineUserId, personalFlexMessage);
                    console.log(`✅ Sent personal overdue notification to: ${assignee.displayName}`);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send personal overdue notification:', assignee.lineUserId, err);
                }
            }
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 30 นาที (สำหรับการแจ้งเตือนเกินกำหนด)
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 30 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending overdue notification:', error);
            throw error;
        }
    }
    /**
     * ส่งการแจ้งเตือนงานใหม่
     */
    async sendTaskCreatedNotification(task) {
        try {
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `task_created_${task.id}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Task created notification already sent for task: ${task.id}`);
                return;
            }
            const assignees = task.assignedUsers || [];
            const group = task.group;
            const creator = task.createdByUser;
            if (!group || assignees.length === 0) {
                console.log(`⚠️ Cannot send notification: missing group or assignees for task: ${task.id}`);
                return;
            }
            // ตรวจสอบ LINE Group ID
            if (!group.lineGroupId) {
                console.log(`⚠️ Cannot send notification: missing lineGroupId for group: ${group.id}`);
                return;
            }
            const dueDate = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
            // ส่งการ์ดงานใหม่ (Flex) ไปยังกลุ่มแทนข้อความธรรมดา
            try {
                const groupFlexMessage = this.createTaskCreatedFlexMessage(task, group, creator, dueDate);
                await this.lineService.pushMessage(group.lineGroupId, groupFlexMessage);
                console.log(`✅ Sent group task created notification for task: ${task.id}`);
            }
            catch (err) {
                console.error('❌ Failed to send group task created notification:', err);
                // ถ้าเป็น error 400 ให้ลองส่งข้อความธรรมดา
                if (err?.statusCode === 400 || err?.status === 400) {
                    try {
                        const simpleMessage = `🆕 งานใหม่: ${task.title}\n📅 กำหนดส่ง: ${dueDate}\n👥 ผู้รับผิดชอบ: ${assignees.map(a => a.displayName).join(', ')}`;
                        await this.lineService.pushMessage(group.lineGroupId, simpleMessage);
                        console.log(`✅ Sent simple group notification for task: ${task.id}`);
                    }
                    catch (simpleErr) {
                        console.error('❌ Failed to send simple group notification:', simpleErr);
                        // ไม่ throw error เพื่อให้ระบบทำงานต่อได้
                    }
                }
                else {
                    // สำหรับ error อื่น ๆ ให้ throw ต่อ
                    throw err;
                }
            }
            // ส่งการ์ดงานต่างๆ ของแต่ละงานเข้าไลน์ส่วนตัว
            for (const assignee of assignees) {
                try {
                    // ตรวจสอบ LINE User ID
                    if (!assignee.lineUserId || assignee.lineUserId === 'unknown') {
                        console.warn(`⚠️ Skipping notification for assignee ${assignee.displayName}: invalid lineUserId`);
                        continue;
                    }
                    const personalFlexMessage = this.createPersonalTaskCreatedFlexMessage(task, group, assignee, creator, dueDate);
                    await this.lineService.pushMessage(assignee.lineUserId, personalFlexMessage);
                    console.log(`✅ Sent personal task created notification to: ${assignee.displayName}`);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send personal task created notification:', assignee.lineUserId, err);
                    // ถ้าเป็น error 400 ให้ลองส่งข้อความธรรมดา
                    if (err?.statusCode === 400 || err?.status === 400) {
                        try {
                            const simpleMessage = `📋 งานใหม่: ${task.title}\n📅 กำหนดส่ง: ${dueDate}\n👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`;
                            await this.lineService.pushMessage(assignee.lineUserId, simpleMessage);
                            console.log(`✅ Sent simple personal notification to: ${assignee.displayName}`);
                        }
                        catch (simpleErr) {
                            console.warn('⚠️ Failed to send simple personal notification:', assignee.lineUserId, simpleErr);
                        }
                    }
                }
            }
            // ส่งการ์ดส่วนตัวไปยังผู้สร้างงานด้วย
            if (creator && creator.lineUserId && creator.lineUserId !== 'unknown') {
                try {
                    const creatorFlexMessage = this.createCreatorTaskCreatedFlexMessage(task, group, creator, dueDate);
                    await this.lineService.pushMessage(creator.lineUserId, creatorFlexMessage);
                    console.log(`✅ Sent creator task created notification to: ${creator.displayName}`);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send creator task created notification:', creator.lineUserId, err);
                    // ถ้าเป็น error 400 ให้ลองส่งข้อความธรรมดา
                    if (err?.statusCode === 400 || err?.status === 400) {
                        try {
                            const simpleMessage = `✅ สร้างงานสำเร็จ: ${task.title}\n📅 กำหนดส่ง: ${dueDate}\n👥 ผู้รับผิดชอบ: ${assignees.map(a => a.displayName).join(', ')}`;
                            await this.lineService.pushMessage(creator.lineUserId, simpleMessage);
                            console.log(`✅ Sent simple creator notification to: ${creator.displayName}`);
                        }
                        catch (simpleErr) {
                            console.warn('⚠️ Failed to send simple creator notification:', creator.lineUserId, simpleErr);
                        }
                    }
                }
            }
            // ส่งอีเมลให้ผู้ที่มีอีเมล
            const reviewerId = this.getTaskReviewer(task);
            let reviewer = task.reviewerUser;
            if (!reviewer && reviewerId) {
                reviewer = await this.userService.findById(reviewerId);
            }
            const allUsers = [
                ...assignees,
                ...(reviewer ? [reviewer] : []),
                ...(creator ? [creator] : []),
            ];
            const seenEmails = new Set();
            const emailUsers = allUsers.filter((user) => {
                if (!user.email || !user.isVerified)
                    return false;
                if (seenEmails.has(user.email))
                    return false;
                seenEmails.add(user.email);
                return true;
            });
            for (const user of emailUsers) {
                await this.emailService.sendTaskCreatedNotification(user, task);
            }
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 5 นาที
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 5 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending task created notification:', error);
            throw error;
        }
    }
    /**
     * ส่งการแจ้งเตือนงานสำเร็จ
     */
    async sendTaskCompletedNotification(task, completedBy) {
        try {
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `task_completed_${task.id}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Task completed notification already sent for task: ${task.id}`);
                return;
            }
            const group = task.group;
            if (!group)
                return;
            // สร้าง Flex Message สำหรับงานสำเร็จ
            const flexMessage = this.createTaskCompletedFlexMessage(task, group, completedBy);
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 10 นาที (สำหรับการแจ้งเตือนงานสำเร็จ)
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 10 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending task completed notification:', error);
            throw error;
        }
    }
    /** แจ้งว่าลบงานแล้ว */
    async sendTaskDeletedNotification(task) {
        try {
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `task_deleted_${task.id}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Task deleted notification already sent for task: ${task.id}`);
                return;
            }
            const group = task.group;
            if (!group)
                return;
            // สร้าง Flex Message สำหรับงานที่ถูกลบ
            const flexMessage = this.createTaskDeletedFlexMessage(task, group);
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 5 นาที (สำหรับการแจ้งเตือนงานถูกลบ)
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 5 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending task deleted notification:', error);
            throw error;
        }
    }
    /** แจ้งว่าแก้งาน/อัปเดตรายละเอียดงาน */
    async sendTaskUpdatedNotification(task, changes) {
        try {
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `task_updated_${task.id}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Task updated notification already sent for task: ${task.id}`);
                return;
            }
            const group = task.group;
            if (!group)
                return;
            const changedFields = [];
            if (typeof changes.title === 'string')
                changedFields.push(`ชื่อเรื่อง`);
            if (typeof changes.description === 'string')
                changedFields.push(`คำอธิบาย`);
            if (changes.dueTime)
                changedFields.push(`กำหนดส่ง`);
            if (changes.startTime)
                changedFields.push(`เวลาเริ่ม`);
            if (changes.priority)
                changedFields.push(`ความสำคัญ`);
            if (Array.isArray(changes.tags))
                changedFields.push(`แท็ก`);
            if (changes.status)
                changedFields.push(`สถานะ`);
            // สร้าง Flex Message สำหรับงานที่อัปเดต
            const flexMessage = this.createTaskUpdatedFlexMessage(task, group, changes, changedFields);
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 5 นาที (สำหรับการแจ้งเตือนงานอัปเดต)
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 5 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending task updated notification:', error);
            throw error;
        }
    }
    /** แจ้งว่ามีการส่งงาน (แนบไฟล์/ลิงก์) */
    async sendTaskSubmittedNotification(task, submitterDisplayName, fileCount, links, comment) {
        try {
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `task_submitted_${task.id}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Task submitted notification already sent for task: ${task.id}`);
                return;
            }
            const group = task.group;
            if (!group?.lineGroupId)
                return;
            // สร้าง Flex Message สำหรับการแจ้งเตือนการส่งงาน
            const flexMessage = await this.createTaskSubmittedFlexMessage(task, group, submitterDisplayName, fileCount, links, comment);
            // ส่งการแจ้งเตือนในกลุ่ม
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            // แจ้งผู้ตรวจให้ตรวจงาน
            const reviewerUserId = this.getTaskReviewer(task);
            if (reviewerUserId) {
                const reviewer = await this.userService.findById(reviewerUserId);
                if (reviewer?.lineUserId) {
                    // สร้างการ์ดแจ้งผู้ตรวจ
                    const reviewCard = FlexMessageTemplateService_1.FlexMessageTemplateService.createReviewRequestCard(task, group, { submitterDisplayName, fileCount, links }, (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm'), reviewer.lineUserId);
                    await this.lineService.pushMessage(reviewer.lineUserId, reviewCard);
                }
            }
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 1 ชั่วโมง (สำหรับการแจ้งเตือนการส่งงาน)
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 60 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending task submitted notification:', error);
        }
    }
    /**
     * สร้าง Flex Message สำหรับการแจ้งเตือนการส่งงาน
     */
    async createTaskSubmittedFlexMessage(task, group, submitterDisplayName, fileCount, links, comment) {
        // ดึงข้อมูลไฟล์แนบเพื่อแสดงตัวอย่าง
        let files = [];
        if (fileCount > 0) {
            try {
                files = await this.fileService.getTaskFiles(task.id);
            }
            catch (error) {
                console.warn('ไม่สามารถดึงข้อมูลไฟล์แนบได้:', error);
            }
        }
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📤 มีการส่งงานใหม่', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${submitterDisplayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(comment ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ข้อความจากผู้ส่ง: ${comment.length > 200 ? comment.substring(0, 200) + '...' : comment}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)
            ] : []),
            ...(fileCount > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                ...(files.length > 2 ? [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${files.length - 2} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ] : [])
            ] : []),
            ...(links && links.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🔗 ลิงก์: ${links.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary)
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📅 กำหนดตรวจภายใน: 2 วัน', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const fileButtons = fileCount > 0
            ? files.slice(0, 2).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📥 ${file.originalName.substring(0, 8)}...`, 'uri', this.fileService.generateDownloadUrl(group.id, file.id), 'secondary'))
            : [];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view`, 'primary'),
            ...fileButtons
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📤 การส่งงานใหม่', '📤', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับงานรอตรวจ
     */
    createReviewRequestFlexMessage(task, group, details, dueText, viewerLineUserId) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createReviewRequestCard(task, group, details, dueText, viewerLineUserId);
    }
    /**
     * สร้าง Flex Message สำหรับงานที่อนุมัติอัตโนมัติ
     */
    createTaskAutoApprovedFlexMessage(task, group, viewerLineUserId) {
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ') || 'ไม่ระบุ';
        const completedDate = (0, moment_timezone_1.default)(task.completedAt).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🤖 งานถูกอนุมัติอัตโนมัติ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`✅ อนุมัติเมื่อ: ${completedDate}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ระบบอนุมัติงานอัตโนมัติหลังจากครบกำหนดตรวจ 2 วัน', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('🤖 งานถูกอนุมัติอัตโนมัติ', '🤖', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับงานที่ถูกปฏิเสธ
     */
    createTaskRejectedFlexMessage(task, group, newDueTime, reviewerDisplayName, viewerLineUserId) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createRejectedTaskCard(task, group, newDueTime, reviewerDisplayName, viewerLineUserId);
    }
    /**
     * สร้าง Flex Message สำหรับการอนุมัติเลื่อนเวลา
     */
    createExtensionApprovedFlexMessage(task, group, newDueTime, requesterDisplayName, viewerLineUserId) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createExtensionApprovedCard(task, group, newDueTime, requesterDisplayName, viewerLineUserId);
    }
    /**
     * สร้าง Flex Message สำหรับการปฏิเสธเลื่อนเวลา
     */
    createExtensionRejectedFlexMessage(task, group, requesterDisplayName, viewerLineUserId) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createExtensionRejectedCard(task, group, requesterDisplayName, viewerLineUserId);
    }
    /**
     * สร้าง Flex Message สำหรับการเตือนงาน
     */
    createTaskReminderFlexMessage(task, group, reminderType, viewerLineUserId) {
        const reminderEmoji = this.getReminderEmoji(reminderType);
        const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
        const dueMoment = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone);
        const remaining = moment_timezone_1.default.duration(dueMoment.diff(now));
        const remainingText = remaining.asDays() >= 1
            ? `${Math.floor(remaining.asDays())} วัน${remaining.hours() > 0 ? ` ${remaining.hours()} ชั่วโมง` : ''}`
            : `${remaining.hours()} ชั่วโมง`;
        const dueDate = dueMoment.format('DD/MM/YYYY HH:mm');
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ') || 'ไม่ระบุ';
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⏳ เหลือเวลาอีก ${remainingText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${this.getPriorityText(task.priority)}`, 'sm', this.getPriorityColor(task.priority), 'bold'),
            ...(task.description ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(task.title, reminderEmoji, FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับการเตือนงานส่วนบุคคล
     */
    createPersonalTaskReminderFlexMessage(task, group, assignee, reminderType) {
        const reminderText = this.getReminderTimeText(reminderType);
        const reminderEmoji = this.getReminderEmoji(reminderType);
        const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
        const dueMoment = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone);
        const remaining = moment_timezone_1.default.duration(dueMoment.diff(now));
        const remainingText = remaining.asDays() >= 1
            ? `${Math.floor(remaining.asDays())} วัน${remaining.hours() > 0 ? ` ${remaining.hours()} ชั่วโมง` : ''}`
            : `${remaining.hours()} ชั่วโมง`;
        const dueDate = dueMoment.format('DD/MM/YYYY HH:mm');
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⏳ เหลือเวลาอีก ${remainingText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${this.getPriorityText(task.priority)}`, 'sm', this.getPriorityColor(task.priority), 'bold'),
            ...(task.description ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${assignee?.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${assignee?.lineUserId || ''}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`🔔 ${reminderText}: ${task.title}`, reminderEmoji, FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับงานเกินกำหนด
     */
    createOverdueTaskFlexMessage(task, group, overdueHours) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createOverdueTaskCard(task, group, overdueHours);
    }
    /**
     * สร้าง Flex Message สำหรับงานเกินกำหนดส่วนบุคคล
     */
    createPersonalOverdueTaskFlexMessage(task, group, assignee, overdueHours) {
        const overdueText = overdueHours < 24
            ? `เกินกำหนด ${overdueHours} ชั่วโมง`
            : `เกินกำหนด ${Math.floor(overdueHours / 24)} วัน ${overdueHours % 24} ชั่วโมง`;
        const dueDate = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⏰ เวลาที่เกิน: ${overdueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${this.getPriorityText(task.priority)}`, 'sm', this.getPriorityColor(task.priority), 'bold'),
            ...(task.description ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${assignee?.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${assignee?.lineUserId || ''}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`🚨 งานเกินกำหนด: ${task.title}`, '🚨', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับงานใหม่
     */
    createTaskCreatedFlexMessage(task, group, creator, dueDate) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createNewTaskCard(task, group, creator, dueDate);
    }
    /**
     * สร้าง Flex Message สำหรับงานใหม่ส่วนบุคคล
     */
    createPersonalTaskCreatedFlexMessage(task, group, assignee, creator, dueDate) {
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ') || 'ไม่ระบุ';
        const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t) => `#${t}`).join(' ')}` : '';
        const priorityColor = this.getPriorityColor(task.priority);
        const priorityText = this.getPriorityText(task.priority);
        // ตรวจสอบว่าเกิน 1 วันหรือไม่
        const taskCreatedAt = new Date(task.createdAt);
        const oneDayLater = new Date(taskCreatedAt.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();
        const canRequestExtension = now < oneDayLater;
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(priorityText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
            ...(task.description ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : []),
            ...(tagsText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('รายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${assignee?.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${assignee?.lineUserId || ''}`, 'secondary')
        ];
        // เพิ่มปุ่มขอเลื่อนเฉพาะเมื่อยังไม่เกิน 1 วัน
        if (canRequestExtension) {
            buttons.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ขอเลื่อน', 'postback', `action=request_extension&taskId=${task.id}&groupId=${group.id}`, 'secondary'));
        }
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`📋 งานใหม่: ${task.title}`, '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับงานใหม่ส่วนบุคคล (ผู้สร้างงาน)
     */
    createCreatorTaskCreatedFlexMessage(task, group, creator, dueDate) {
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ') || 'ไม่ระบุ';
        const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t) => `#${t}`).join(' ')}` : '';
        const priorityColor = this.getPriorityColor(task.priority);
        const priorityText = this.getPriorityText(task.priority);
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(priorityText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
            ...(task.description ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : []),
            ...(tagsText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('แก้ไขงาน', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=edit&userId=${creator.lineUserId}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`📋 งานที่สร้าง: ${task.title}`, '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับงานสำเร็จ
     */
    createTaskCompletedFlexMessage(task, group, completedBy) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createCompletedTaskCard(task, group, completedBy);
    }
    /**
     * สร้าง Flex Message สำหรับงานที่ถูกลบ
     */
    createTaskDeletedFlexMessage(task, group, viewerLineUserId) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createDeletedTaskCard(task, group, viewerLineUserId);
    }
    /**
     * สร้าง Flex Message สำหรับงานที่อัปเดต
     */
    createTaskUpdatedFlexMessage(task, group, changes, changedFields, viewerLineUserId) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createUpdatedTaskCard(task, group, changes, changedFields, viewerLineUserId);
    }
    /**
     * ดึงผู้ตรวจงาน
     */
    getTaskReviewer(task) {
        return task.reviewerUserId || task.createdByUserId || null;
    }
    /**
     * ส่งรายงานรายสัปดาห์
     */
    async sendWeeklyReport(group, stats, leaderboard) {
        try {
            const weekStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').format('DD/MM');
            const weekEnd = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).endOf('week').format('DD/MM');
            const flexMessage = this.createWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd);
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            console.log(`✅ Sent weekly report to group: ${group.name}`);
        }
        catch (error) {
            console.error('❌ Error sending weekly report:', error);
            throw error;
        }
    }
    /**
     * ส่งรายงานรายสัปดาห์ให้ admin
     */
    async sendWeeklyReportToAdmins(group, stats, leaderboard) {
        try {
            const weekStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').format('DD/MM');
            const weekEnd = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).endOf('week').format('DD/MM');
            const flexMessage = this.createAdminWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd);
            // ส่งให้ admin ทุกคนในกลุ่ม
            const admins = await this.userService.getGroupMembers(group.id);
            const adminUsers = admins.filter(member => member.role === 'admin');
            for (const admin of adminUsers) {
                if (admin.lineUserId) {
                    try {
                        await this.lineService.pushMessage(admin.lineUserId, flexMessage);
                        console.log(`✅ Sent admin weekly report to: ${admin.displayName}`);
                    }
                    catch (err) {
                        console.warn('⚠️ Failed to send admin weekly report:', admin.lineUserId, err);
                    }
                }
            }
        }
        catch (error) {
            console.error('❌ Error sending admin weekly report:', error);
            throw error;
        }
    }
    /**
     * ส่งการแจ้งเตือนงานที่ถูกตีกลับ
     */
    async sendTaskRejectedNotification(task, reviewer, extensionDays) {
        try {
            const group = task.group;
            if (!group)
                return;
            // คำนวณเวลากำหนดส่งใหม่
            const newDueTime = new Date(task.dueTime.getTime() + parseInt(extensionDays) * 24 * 60 * 60 * 1000);
            const reviewerDisplayName = reviewer?.displayName || 'ไม่ระบุ';
            // ส่งการ์ดลงกลุ่ม (ไม่แนบ userId -> ไม่มีปุ่มส่งงานตามเทมเพลต)
            const groupCard = this.createTaskRejectedFlexMessage(task, group, newDueTime, reviewerDisplayName);
            await this.lineService.pushMessage(group.lineGroupId, groupCard);
            // ส่งการ์ดส่วนตัวให้ผู้รับผิดชอบทุกคน พร้อมแนบ userId เพื่อเปิดหน้าส่งงาน
            const assignees = task.assignedUsers || [];
            for (const assignee of assignees) {
                try {
                    if (!assignee?.lineUserId)
                        continue;
                    const personalCard = this.createTaskRejectedFlexMessage(task, group, newDueTime, reviewerDisplayName, assignee.lineUserId);
                    await this.lineService.pushMessage(assignee.lineUserId, personalCard);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send personal rejected card:', assignee?.lineUserId, err);
                }
            }
            console.log(`✅ Sent task rejected notification for task: ${task.id}`);
        }
        catch (error) {
            console.error('❌ Error sending task rejected notification:', error);
            throw error;
        }
    }
    /**
     * ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
     */
    async sendExtensionApprovedNotification(task, requester, newDueTime) {
        try {
            const group = task.group;
            if (!group || !requester?.lineUserId)
                return;
            const requesterDisplayName = requester?.displayName || 'ไม่ระบุ';
            const personalCard = this.createExtensionApprovedFlexMessage(task, group, newDueTime, requesterDisplayName, requester.lineUserId);
            const groupCard = this.createExtensionApprovedFlexMessage(task, group, newDueTime, requesterDisplayName);
            // ส่งให้ผู้ขอเลื่อนเวลา
            await this.lineService.pushMessage(requester.lineUserId, personalCard);
            // ส่งแจ้งในกลุ่มด้วย (ไม่แนบ userId)
            await this.lineService.pushMessage(group.lineGroupId, groupCard);
            console.log(`✅ Sent extension approved notification for task: ${task.id} to requester: ${requesterDisplayName}`);
        }
        catch (error) {
            console.error('❌ Error sending extension approved notification:', error);
            throw error;
        }
    }
    /**
     * ส่งการแจ้งเตือนการปฏิเสธเลื่อนเวลา
     */
    async sendExtensionRejectedNotification(task, requester) {
        try {
            const group = task.group;
            if (!group || !requester?.lineUserId)
                return;
            const requesterDisplayName = requester?.displayName || 'ไม่ระบุ';
            const personalCard = this.createExtensionRejectedFlexMessage(task, group, requesterDisplayName, requester.lineUserId);
            const groupCard = this.createExtensionRejectedFlexMessage(task, group, requesterDisplayName);
            // ส่งให้ผู้ขอเลื่อนเวลา
            await this.lineService.pushMessage(requester.lineUserId, personalCard);
            // ส่งแจ้งในกลุ่มด้วย (ไม่แนบ userId)
            await this.lineService.pushMessage(group.lineGroupId, groupCard);
            console.log(`✅ Sent extension rejected notification for task: ${task.id} to requester: ${requesterDisplayName}`);
        }
        catch (error) {
            console.error('❌ Error sending extension rejected notification:', error);
            throw error;
        }
    }
    /**
     * ส่งการแจ้งเตือนงานที่อนุมัติอัตโนมัติ
     */
    async sendTaskAutoApprovedNotification(task) {
        try {
            const group = task.group;
            if (!group)
                return;
            const flexMessage = this.createTaskAutoApprovedFlexMessage(task, group);
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            console.log(`✅ Sent task auto-approved notification for task: ${task.id}`);
        }
        catch (error) {
            console.error('❌ Error sending task auto-approved notification:', error);
            throw error;
        }
    }
    /**
     * ส่งการขอตรวจงาน
     */
    async sendReviewRequest(task, reviewerUserId, details) {
        try {
            const group = task.group;
            if (!group)
                return;
            // ตรวจสอบว่า reviewerUserId เป็น LINE User ID หรือ database UUID
            let reviewer;
            if (reviewerUserId.startsWith('U')) {
                // เป็น LINE User ID
                reviewer = await this.userService.findByLineUserId(reviewerUserId);
            }
            else {
                // เป็น database UUID
                reviewer = await this.userService.findById(reviewerUserId);
            }
            if (!reviewer?.lineUserId)
                return;
            const dueText = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
            // แนบ userId ของผู้รับ (reviewer) เข้าไปในลิงก์ไปแดชบอร์ด
            const flexMessage = this.createReviewRequestFlexMessage(task, group, details, dueText, reviewer.lineUserId);
            await this.lineService.pushMessage(reviewer.lineUserId, flexMessage);
            console.log(`✅ Sent review request to: ${reviewer.displayName}`);
        }
        catch (error) {
            console.error('❌ Error sending review request:', error);
            throw error;
        }
    }
    /**
     * ส่งการขออนุมัติการปิดงาน
     */
    async sendApprovalRequest(task, approverUserId, reviewer) {
        try {
            const group = task.group;
            if (!group)
                return;
            // ตรวจสอบว่า approverUserId เป็น LINE User ID หรือ database UUID
            let approver;
            if (approverUserId.startsWith('U')) {
                // เป็น LINE User ID
                approver = await this.userService.findByLineUserId(approverUserId);
            }
            else {
                // เป็น database UUID
                approver = await this.userService.findById(approverUserId);
            }
            if (!approver?.lineUserId)
                return;
            const flexMessage = FlexMessageTemplateService_1.FlexMessageTemplateService.createApprovalRequestCard(task, group, reviewer, approver.lineUserId);
            await this.lineService.pushMessage(approver.lineUserId, flexMessage);
            console.log(`✅ Sent approval request to: ${approver.displayName}`);
        }
        catch (error) {
            console.error('❌ Error sending approval request:', error);
            throw error;
        }
    }
    /**
     * Helper method สำหรับข้อความเตือน
     */
    getReminderTimeText(reminderType) {
        switch (reminderType) {
            case 'P1D':
            case '1d':
                return 'พรุ่งนี้';
            case 'PT3H':
            case '3h':
                return 'อีก 3 ชั่วโมง';
            default:
                return 'เตือนความจำ';
        }
    }
    /**
     * Helper method สำหรับอิโมจิเตือน
     */
    getReminderEmoji(reminderType) {
        switch (reminderType) {
            case 'P1D':
            case '1d':
                return '⏰';
            case 'PT3H':
            case '3h':
                return '⚡';
            default:
                return '🔔';
        }
    }
    /**
     * Helper method สำหรับสีความสำคัญ
     */
    getPriorityColor(priority) {
        switch (priority) {
            case 'high':
                return '#F44336'; // Red
            case 'medium':
                return '#FF9800'; // Orange
            case 'low':
                return '#4CAF50'; // Green
            default:
                return '#9E9E9E'; // Gray
        }
    }
    /**
     * Helper method สำหรับข้อความความสำคัญ
     */
    getPriorityText(priority) {
        switch (priority) {
            case 'high':
                return 'สูงมาก';
            case 'medium':
                return 'ปานกลาง';
            case 'low':
                return 'ต่ำ';
            default:
                return 'ปกติ';
        }
    }
    /**
     * Helper method สำหรับคำนวณคะแนนการทำงาน
     */
    calculateCompletionScore(task) {
        const dueTime = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone);
        const completedTime = (0, moment_timezone_1.default)(task.completedAt).tz(config_1.config.app.defaultTimezone);
        const diff = completedTime.diff(dueTime, 'hours');
        if (diff <= -24)
            return 100; // เสร็จก่อนกำหนด
        if (diff <= 24)
            return 90; // เสร็จตรงเวลา
        if (diff <= 48)
            return 80; // เสร็จช้าเล็กน้อย
        if (diff <= 72)
            return 70; // เสร็จช้า
        return 0; // เสร็จช้ามาก
    }
    /** แจ้งผู้ตรวจว่ามีงานรอการตรวจ */
    async sendReviewRequestNotification(task, details) {
        try {
            // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
            const notificationKey = `review_request_${task.id}`;
            if (this._sentNotifications.has(notificationKey)) {
                console.log(`⚠️ Review request notification already sent for task: ${task.id}`);
                return;
            }
            const group = task.group;
            if (!group)
                return;
            const dueText = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
            // สร้าง Flex Message สำหรับการขอตรวจงาน
            const flexMessage = this.createReviewRequestFlexMessage(task, group, details, dueText);
            await this.lineService.pushMessage(group.lineGroupId, flexMessage);
            // บันทึกว่าส่งการแจ้งเตือนแล้ว
            this._sentNotifications.add(notificationKey);
            // ลบออกหลังจาก 10 นาที (สำหรับการแจ้งเตือนขอตรวจงาน)
            setTimeout(() => {
                this._sentNotifications.delete(notificationKey);
            }, 10 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Error sending review request notification:', error);
            throw error;
        }
    }
    /**
     * สร้าง Flex Message สำหรับรายงานรายสัปดาห์
     */
    createWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd) {
        // จัดรูปแบบอันดับทุกคน พร้อมเหรียญ 1-3
        const medalFor = (rank) => {
            if (rank === 1)
                return '🥇';
            if (rank === 2)
                return '🥈';
            if (rank === 3)
                return '🥉';
            return `${rank}️⃣`;
        };
        const leaderboardContents = leaderboard.slice(0, 10).map((user, index) => {
            const rank = index + 1;
            const medal = medalFor(rank);
            const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
            const totalScore = Number(user.totalScore ?? 0).toFixed(1);
            const scoreText = `${totalScore} คะแนน`;
            const onTimeRate = Math.round(user.onTimeRate ?? 0);
            const createdRate = Math.round(user.createdCompletedRate ?? 0);
            return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(medal, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(user.displayName, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary), flex: 1 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(scoreText, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(trend, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 }
                ], 'small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`ตรงเวลา ${onTimeRate}% • งานที่สั่งสำเร็จ ${createdRate}% • โทษ ${Math.abs(Math.round(user.penaltyPoints ?? 0))} pts`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ], 'small');
        });
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📈 สถิติกลุ่ม', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`✅ งานที่เสร็จ: ${stats.completedTasks}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⏳ งานค้าง: ${stats.pendingTasks}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger)
            ], 'small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🏆 อันดับพนักงานคนขยัน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                ...leaderboardContents
            ], 'small')
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายงานฉบับเต็ม', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`📊 ${group.name}`, '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับรายงานรายสัปดาห์ให้ admin
     */
    createAdminWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd) {
        const leaderboardContents = leaderboard.slice(0, 5).map((user, index) => {
            const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
            const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
            const totalScore = Number(user.totalScore ?? 0).toFixed(1);
            return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(medal, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(user.displayName, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary), flex: 1 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${totalScore} คะแนน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(trend, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 }
                ], 'small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`ตรงเวลา ${Math.round(user.onTimeRate ?? 0)}% • งานที่สั่งสำเร็จ ${Math.round(user.createdCompletedRate ?? 0)}% • โทษ ${Math.abs(Math.round(user.penaltyPoints ?? 0))} pts`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ], 'small');
        });
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 กลุ่ม: ${group.name}`, 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📈 สถิติกลุ่ม', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`✅ งานที่เสร็จ: ${stats.completedTasks}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⏳ งานค้าง: ${stats.pendingTasks}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger)
            ], 'small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🏆 อันดับผู้ทำงาน (Top 5)', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                ...leaderboardContents
            ], 'small')
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายงานฉบับเต็ม', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`📊 ${group.name}`, '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับรายงานรายวัน
     */
    createDailyReportFlexMessage(group, tasks, timezone) {
        const overdueTasks = tasks.filter(t => t.status === 'overdue');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        const date = (0, moment_timezone_1.default)().tz(timezone).format('DD/MM/YYYY');
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createDailySummaryCard(group, tasks, timezone);
    }
    /**
     * สร้าง Flex Message สำหรับรายงานรายวันส่วนบุคคล
     */
    createPersonalDailyReportFlexMessage(assignee, tasks, timezone, group) {
        const overdueTasks = tasks.filter(t => t.status === 'overdue');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        const date = (0, moment_timezone_1.default)().tz(timezone).format('DD/MM/YYYY');
        const header = `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`;
        const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createPersonalReportCard(assignee, tasks, timezone, group);
    }
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ
     */
    createManagerDailyReportFlexMessage(group, stats, timezone) {
        const date = (0, moment_timezone_1.default)().tz(timezone).format('DD/MM/YYYY');
        const content = [
            { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 งานทั้งหมด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.totalTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('✅ เสร็จแล้ว', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.completedTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold')
                    ]), flex: 1 }
            ]),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⚠️ เกินกำหนด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.overdueTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 รอตรวจ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.pendingReviewTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold')
                    ]), flex: 1 }
            ])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดู Dashboard', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📊 รายงานผู้จัดการ', '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับรายงานหัวหน้างาน
     */
    createSupervisorWeeklyReportFlexMessage(group, stats, timezone) {
        const weekStart = (0, moment_timezone_1.default)().tz(timezone).startOf('week').format('DD/MM');
        const weekEnd = (0, moment_timezone_1.default)().tz(timezone).endOf('week').format('DD/MM');
        const content = [
            { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 สัปดาห์ ${weekStart} - ${weekEnd}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 สรุปงานของผู้ใต้บังคับบัญชา', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 สมาชิกทั้งหมด: ${stats.totalMembers || 0} คน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📊 งานเสร็จแล้ว: ${stats.completedTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 งานรอตรวจ: ${stats.pendingReviewTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning)
            ], 'small')
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดู Dashboard', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📊 รายงานหัวหน้างาน', '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.neutral, content, buttons, 'extraLarge');
    }
    /**
     * ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวัน
     */
    async sendDailyOverdueSummary() {
        try {
            console.log('🕐 Starting daily overdue tasks summary...');
            // ใช้ TaskService เพื่อดึงข้อมูล
            const taskService = new (await Promise.resolve().then(() => __importStar(require('./TaskService')))).TaskService();
            // ดึงข้อมูลกลุ่มทั้งหมด
            const groups = await taskService.getAllGroups();
            for (const group of groups) {
                try {
                    // ดึงงานเกินกำหนดทั้งหมดในกลุ่ม
                    const overdueTasks = await taskService.getOverdueTasksByGroup(group.id);
                    if (overdueTasks.length === 0) {
                        console.log(`✅ No overdue tasks in group: ${group.name}`);
                        continue;
                    }
                    // จัดกลุ่มงานตามผู้รับผิดชอบ
                    const tasksByAssignee = new Map();
                    for (const task of overdueTasks) {
                        const assignees = task.assignedUsers || [];
                        for (const assignee of assignees) {
                            if (!tasksByAssignee.has(assignee.id)) {
                                tasksByAssignee.set(assignee.id, []);
                            }
                            tasksByAssignee.get(assignee.id).push(task);
                        }
                    }
                    // ส่งการแจ้งเตือนรวมให้ผู้ใช้แต่ละคน
                    for (const [assigneeId, tasks] of tasksByAssignee) {
                        try {
                            const assignee = await this.userService.findById(assigneeId);
                            if (!assignee || !assignee.lineUserId)
                                continue;
                            // สร้างการ์ดรวมงานเกินกำหนด
                            const tz = group.timezone || config_1.config.app.defaultTimezone;
                            // คำนวณชั่วโมงที่เกินกำหนดเฉลี่ย
                            const avgOverdueHours = Math.round(tasks.reduce((sum, t) => sum + (0, moment_timezone_1.default)().diff((0, moment_timezone_1.default)(t.dueTime), 'hours'), 0) / tasks.length);
                            const summaryCard = FlexMessageTemplateService_1.FlexMessageTemplateService.createOverdueTaskCard(assignee, tasks[0], avgOverdueHours);
                            // ส่งการแจ้งเตือนส่วนตัว
                            await this.lineService.pushMessage(assignee.lineUserId, summaryCard);
                            console.log(`✅ Sent daily overdue summary to: ${assignee.displayName} (${tasks.length} tasks)`);
                        }
                        catch (err) {
                            console.warn('⚠️ Failed to send daily overdue summary to assignee:', assigneeId, err);
                        }
                    }
                    // ไม่ส่งการแจ้งเตือนงานเกินกำหนดลงกลุ่ม (ส่งเฉพาะส่วนตัว)
                    console.log(`ℹ️ Skipped sending overdue summary to group: ${group.name} (${overdueTasks.length} tasks) - only personal notifications`);
                }
                catch (err) {
                    console.warn('⚠️ Failed to process group for daily overdue summary:', group.id, err);
                }
            }
            console.log('✅ Daily overdue tasks summary completed');
        }
        catch (error) {
            console.error('❌ Error sending daily overdue summary:', error);
            throw error;
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map