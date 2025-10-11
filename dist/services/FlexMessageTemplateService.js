"use strict";
// Flex Message Template Service - บริการสร้างการ์ดมาตรฐาน
// ใช้ Design System เพื่อสร้างการ์ดที่สม่ำเสมอ
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlexMessageTemplateService = void 0;
const FlexMessageDesignSystem_1 = require("./FlexMessageDesignSystem");
const moment_1 = __importDefault(require("moment"));
const config_1 = require("@/utils/config");
const serviceContainer_1 = require("@/utils/serviceContainer");
class FlexMessageTemplateService {
    /**
     * สร้างการ์ดงานใหม่ (เวอร์ชันเรียบง่าย)
     */
    static createNewTaskCard(task, group, creator, dueDate) {
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ') || 'ไม่ระบุ';
        const priorityColor = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityColor(task.priority);
        const priorityText = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority);
        // สร้างเนื้อหาที่เรียบง่ายเพื่อลดขนาด
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(priorityText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
            // แสดงคำอธิบายงาน (จำกัดความยาวให้สั้น)
            ...(task.description ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)
            ] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${(task.assignedUsers && task.assignedUsers[0]?.lineUserId) ? `&userId=${task.assignedUsers[0].lineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(task.title, FlexMessageDesignSystem_1.FlexMessageDesignSystem.emojis.newTask, FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดงานเกินกำหนด
     */
    static createOverdueTaskCard(task, group, overdueHours) {
        const overdueText = overdueHours < 24
            ? `เกินกำหนด ${overdueHours} ชั่วโมง`
            : `เกินกำหนด ${Math.floor(overdueHours / 24)} วัน ${overdueHours % 24} ชั่วโมง`;
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${(0, moment_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⏰ เวลาที่เกิน: ${overdueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${(task.assignedUsers || []).map((u) => u.displayName).join(', ') || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityColor(task.priority), 'bold'),
            ...(task.description ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูงาน', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${(task.assignedUsers && task.assignedUsers[0]?.lineUserId) ? `&userId=${task.assignedUsers[0].lineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(task.title, FlexMessageDesignSystem_1.FlexMessageDesignSystem.emojis.overdue, FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดงานสำเร็จ
     */
    static createCompletedTaskCard(task, group, completedBy) {
        const completionSummary = this.getCompletionSummary(task);
        // ตรวจสอบไฟล์แนบ
        const attachedFiles = task.attachedFiles || [];
        const fileCount = attachedFiles.length;
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ปิดงานโดย: ${completedBy.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${(0, moment_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 เสร็จเมื่อ: ${(0, moment_1.default)(task.completedAt).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            // แสดงข้อมูลไฟล์แนบถ้ามี
            ...(fileCount > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold')
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${completionSummary.emoji} ${completionSummary.text}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ผู้รับงานได้ +${completionSummary.points} คะแนน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${(task.assignedUsers && task.assignedUsers[0]?.lineUserId) ? `&userId=${task.assignedUsers[0].lineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(task.title, FlexMessageDesignSystem_1.FlexMessageDesignSystem.emojis.completed, FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดงานที่อัปเดต
     */
    static createUpdatedTaskCard(task, group, changes, changedFields, viewerLineUserId) {
        const dueText = task.dueTime ? (0, moment_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
        const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t) => `#${t}`).join(' ')}` : '';
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ');
        const headerEmoji = changes.status ? (changes.status === 'cancelled' ? '🚫' : '🔄') : '✏️';
        const headerColor = changes.status === 'cancelled' ? FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.neutral : FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary;
        const priorityColor = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityColor(task.priority);
        const priorityText = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority);
        // ตรวจสอบไฟล์แนบ
        const attachedFiles = task.attachedFiles || [];
        const fileCount = attachedFiles.length;
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(priorityText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
            // แสดงข้อมูลไฟล์แนบถ้ามี
            ...(fileCount > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold')
            ] : []),
            ...(tagsText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)] : []),
            ...(changedFields.length > 0 ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🔧 เปลี่ยนแปลง: ${changedFields.join(', ')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold')] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.lineGroupId}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(task.title, headerEmoji, headerColor, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดงานที่ถูกลบ
     */
    static createDeletedTaskCard(task, group, viewerLineUserId) {
        const dueText = task.dueTime ? (0, moment_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ');
        const priorityColor = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityColor(task.priority);
        const priorityText = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority);
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(priorityText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⚠️ งานนี้ถูกลบออกจากระบบแล้ว', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold')
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.lineGroupId}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(task.title, FlexMessageDesignSystem_1.FlexMessageDesignSystem.emojis.deleted, FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.neutral, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดงานที่ถูกส่ง
     */
    static createSubmittedTaskCard(task, group, submitterDisplayName, fileCount, links, viewerLineUserId) {
        const dueText = task.dueTime ? (0, moment_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
        const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ');
        const priorityColor = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityColor(task.priority);
        const priorityText = FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority);
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${submitterDisplayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์/รายการ: ${fileCount}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(priorityText ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
            ...(links && links.length > 0 ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🔗 ลิงก์: ${links.join(' ')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูงาน', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(task.title, FlexMessageDesignSystem_1.FlexMessageDesignSystem.emojis.submitted, FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดขอตรวจงาน
     */
    static createReviewRequestCard(task, group, details, dueText, viewerLineUserId) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 มีงานรอการตรวจ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${details.submitterDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            ...(details.comment ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ข้อความ: ${details.comment.length > 200 ? details.comment.substring(0, 200) + '...' : details.comment}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true)
            ] : []),
            ...(details.fileCount > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${details.fileCount} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary)
            ] : []),
            ...(details.links && details.links.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🔗 ลิงก์: ${details.links.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary)
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดตรวจภายใน: ${dueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ✅ อนุมัติการตรวจ | ❌ ตีกลับงาน | 📋 ดูรายละเอียด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('✅', 'postback', `action=approve_review&taskId=${task.id}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('❌', 'postback', `action=reject_task&taskId=${task.id}`, 'secondary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📝 งานรอการตรวจ', '📝', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดขออนุมัติการปิดงาน (มาตรฐานใหม่)
     */
    static createApprovalRequestCard(task, group, reviewer, viewerLineUserId) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🔍 งานผ่านการตรวจแล้ว', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ตรวจ: ${reviewer.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`✅ ตรวจเมื่อ: ${(0, moment_1.default)().tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 ขั้นตอนต่อไป: กรุณาอนุมัติการปิดงานเพื่อให้งานเสร็จสิ้น', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 หมายเหตุ: งานผ่านการตรวจแล้ว แต่ยังต้องรอการอนุมัติการปิดงานจากผู้สั่งงาน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ✅ อนุมัติการปิดงาน | 📋 ดูรายละเอียด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('✅', 'postback', `action=approve_completion&taskId=${task.id}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('🔍 งานผ่านการตรวจแล้ว', '🔍', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดงานที่ถูกตีกลับ (มาตรฐานใหม่)
     */
    static createRejectedTaskCard(task, group, newDueTime, reviewerDisplayName, viewerLineUserId) {
        const newDueText = (0, moment_1.default)(newDueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('❌ งานถูกตีกลับ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ตรวจ: ${reviewerDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่งใหม่: ${newDueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('กรุณาตรวจสอบข้อผิดพลาดและส่งงานใหม่ตามกำหนด', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📋 ดูรายละเอียด | 📤 ส่งงานใหม่', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        // หากไม่มี viewerLineUserId แปลว่าส่งในกลุ่ม: ตัดปุ่ม "ส่งงาน" ออก
        const buttons = viewerLineUserId
            ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view&userId=${viewerLineUserId}`, 'primary'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?taskId=${task.id}&userId=${viewerLineUserId}`, 'secondary')
            ]
            : [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view`, 'primary')
            ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('❌ งานถูกตีกลับ', '❌', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดการอนุมัติเลื่อนเวลา (มาตรฐานใหม่)
     */
    static createExtensionApprovedCard(task, group, newDueTime, requesterDisplayName, viewerLineUserId) {
        const newDueText = (0, moment_1.default)(newDueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('✅ อนุมัติการเลื่อนเวลา', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ขอเลื่อน: ${requesterDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่งใหม่: ${newDueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('คำขอเลื่อนเวลาได้รับการอนุมัติแล้ว กรุณาส่งงานตามกำหนดใหม่', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📋 ดูรายละเอียด | 📤 ส่งงาน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?taskId=${task.id}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('✅ อนุมัติการเลื่อนเวลา', '✅', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดการปฏิเสธเลื่อนเวลา (มาตรฐานใหม่)
     */
    static createExtensionRejectedCard(task, group, requesterDisplayName, viewerLineUserId) {
        const dueText = (0, moment_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('❌ ปฏิเสธการเลื่อนเวลา', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ขอเลื่อน: ${requesterDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่งเดิม: ${dueText}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('คำขอเลื่อนเวลาถูกปฏิเสธ กรุณาส่งงานตามกำหนดเวลาเดิม', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📋 ดูรายละเอียด | 📤 ส่งงาน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?taskId=${task.id}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('❌ ปฏิเสธการเลื่อนเวลา', '❌', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดรายงานรายวัน
     */
    static createDailySummaryCard(group, tasks, timezone, viewerLineUserId) {
        const now = (0, moment_1.default)().tz(timezone);
        const today = now.clone().startOf('day');
        const tomorrow = now.clone().add(1, 'day').startOf('day');
        const hasSubmission = (task) => {
            const submissions = task?.workflow?.submissions;
            if (Array.isArray(submissions)) {
                return submissions.length > 0;
            }
            if (submissions && typeof submissions === 'object') {
                return Object.keys(submissions).length > 0;
            }
            return false;
        };
        const isActionableTask = (task) => {
            if (!task)
                return false;
            const terminalStatuses = ['submitted', 'reviewed', 'approved', 'completed', 'cancelled'];
            if (terminalStatuses.includes(task.status)) {
                return false;
            }
            if (task.submittedAt) {
                return false;
            }
            if (hasSubmission(task)) {
                return false;
            }
            const rv = task?.workflow?.review;
            if (rv && (rv.status === 'pending' || !!rv.reviewRequestedAt)) {
                return false;
            }
            return true;
        };
        const actionableTasks = tasks.filter(isActionableTask);
        // งานที่กำลังดำเนินการ = ทุกงานที่ยังไม่เสร็จและยังไม่ถูกยกเลิก
        // กรองงานที่ส่งแล้วออก (มี workflow.submissions)
        const inProgressTasks = actionableTasks.filter(t => ['in_progress', 'pending', 'overdue'].includes(t.status));
        // งานที่เสร็จแล้ววันนี้ = งานที่มี status เป็น completed และ completedAt อยู่ในวันนี้
        const completedTodayTasks = tasks.filter(t => {
            if (t.status !== 'completed' || !t.completedAt)
                return false;
            const completedAt = (0, moment_1.default)(t.completedAt).tz(timezone);
            return completedAt.isBetween(today, tomorrow, null, '[)');
        });
        // งานที่เสร็จแล้วทั้งหมด (รวมวันก่อนหน้า)
        const allCompletedTasks = tasks.filter(t => t.status === 'completed');
        const date = (0, moment_1.default)().tz(timezone).format('DD/MM/YYYY');
        // สร้างรายการงานย่อสำหรับงานที่กำลังดำเนินการ
        const createInProgressTaskList = (taskList, maxItems = 6) => {
            if (taskList.length === 0)
                return [];
            const displayTasks = taskList.slice(0, maxItems);
            const remainingCount = taskList.length - maxItems;
            const taskItems = [];
            // เพิ่มงานที่แสดง
            for (const task of displayTasks) {
                const assigneeNames = (task.assignedUsers || []).map((u) => u.displayName).join(', ') || 'ไม่ระบุ';
                const dueDate = (0, moment_1.default)(task.dueTime).tz(timezone).format('DD/MM HH:mm');
                const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
                taskItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`• ${priorityEmoji} ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`  👥 ${assigneeNames} | 📅 ${dueDate}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ], 'small', 'small', '#F8F9FA', 'xs'));
            }
            // เพิ่มข้อความแสดงงานที่เหลือ
            if (remainingCount > 0) {
                taskItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`... และอีก ${remainingCount} งาน`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary));
            }
            return taskItems;
        };
        // สร้าง content array ที่ถูกต้อง
        const contentItems = [
            // Header
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 สรุปรายวัน - งานทั้งหมด`, 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold', undefined, 'large'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 กลุ่ม: ${group.name}`, 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            // สถิติ
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📊 สถิติ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📊 รวม', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(actionableTasks.length.toString(), 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⏳ กำลังดำเนินการ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(inProgressTasks.length.toString(), 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('✅ เสร็จวันนี้', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(completedTodayTasks.length.toString(), 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold')
                    ]), flex: 1 }
            ], 'medium'),
            // เพิ่มแถวสองสำหรับสถิติเพิ่มเติม
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🏁 เสร็จทั้งหมด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(allCompletedTasks.length.toString(), 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success)
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⚠️ เกินกำหนด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(actionableTasks.filter(t => t.status === 'overdue').length.toString(), 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger)
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 รอตรวจ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(actionableTasks.filter(t => t.status === 'in_progress').length.toString(), 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info)
                    ]), flex: 1 }
            ], 'medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium')
        ];
        // เพิ่มงานที่กำลังดำเนินการ
        if (inProgressTasks.length > 0) {
            contentItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⏳ งานที่กำลังดำเนินการ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold'), ...createInProgressTaskList(inProgressTasks, 6));
        }
        else {
            contentItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🎉 ไม่มีงานที่กำลังดำเนินการ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'));
        }
        // เพิ่ม Footer
        contentItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⏳ งานที่กำลังดำเนินการ ${inProgressTasks.length} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, 'bold'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 คลิกปุ่มด้านล่างเพื่อดูรายละเอียดเพิ่มเติม', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary));
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📊 ดู Dashboard', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋 ดูงานทั้งหมด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#tasks`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📅 สรุปรายวัน - งานทั้งหมด', '📅', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, contentItems, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดรายงานส่วนบุคคล
     */
    static createPersonalReportCard(assignee, tasks, timezone, group) {
        const hasSubmission = (task) => {
            const submissions = task?.workflow?.submissions;
            if (Array.isArray(submissions)) {
                return submissions.length > 0;
            }
            if (submissions && typeof submissions === 'object') {
                return Object.keys(submissions).length > 0;
            }
            return false;
        };
        const shouldIncludeTask = (task) => {
            const terminalStatuses = ['submitted', 'reviewed', 'approved', 'completed', 'cancelled'];
            if (terminalStatuses.includes(task.status)) {
                return false;
            }
            if (task.submittedAt) {
                return false;
            }
            if (hasSubmission(task)) {
                return false;
            }
            const rv = task?.workflow?.review;
            if (rv && (rv.status === 'pending' || !!rv.reviewRequestedAt)) {
                return false;
            }
            return true;
        };
        // กรองงานที่ส่งแล้วออก (มี workflow.submissions)
        const filterSubmittedTasks = (taskList) => {
            return taskList.filter(shouldIncludeTask);
        };
        const actionableTasks = filterSubmittedTasks(tasks);
        const overdueTasks = filterSubmittedTasks(tasks.filter(t => t.status === 'overdue'));
        const inProgressTasks = filterSubmittedTasks(tasks.filter(t => t.status === 'in_progress'));
        const pendingTasks = filterSubmittedTasks(tasks.filter(t => t.status === 'pending'));
        const date = (0, moment_1.default)().tz(timezone).format('DD/MM/YYYY');
        // สร้างรายการงานย่อ
        const createPersonalTaskList = (taskList, maxItems = 5) => {
            if (taskList.length === 0)
                return [];
            const displayTasks = taskList.slice(0, maxItems);
            const remainingCount = taskList.length - maxItems;
            const taskItems = [];
            // เพิ่มงานที่แสดง
            for (const task of displayTasks) {
                const dueDate = (0, moment_1.default)(task.dueTime).tz(timezone).format('DD/MM HH:mm');
                const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
                taskItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`• ${priorityEmoji} ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`  📅 ${dueDate} | 🎯 ${FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ], 'small', 'small', '#F8F9FA', 'xs'));
            }
            // เพิ่มข้อความแสดงงานที่เหลือ
            if (remainingCount > 0) {
                taskItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`... และอีก ${remainingCount} งาน`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary));
            }
            return taskItems;
        };
        // สร้าง content array ที่ถูกต้อง
        const contentItems = [
            // Header
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 การ์ดงานส่วนบุคคล`, 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold', undefined, 'large'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👨‍💼 ${assignee.displayName}`, 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            ...(group && group.name ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 กลุ่ม: ${group.name}`, 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            // สถิติส่วนบุคคล
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📊 รวม', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(actionableTasks.length.toString(), 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🚨 เกินกำหนด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(overdueTasks.length.toString(), 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⏳ กำลังทำ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(inProgressTasks.length.toString(), 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 รอดำเนินการ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(pendingTasks.length.toString(), 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, 'bold')
                    ]), flex: 1 }
            ], 'medium')
        ];
        // เพิ่มงานเกินกำหนด (แสดงเต็ม)
        if (overdueTasks.length > 0) {
            contentItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🚨 งานเกินกำหนด (ต้องทำด่วน!)', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'));
            const overdueTaskItems = createPersonalTaskList(overdueTasks, 5);
            for (const item of overdueTaskItems) {
                contentItems.push(item);
            }
        }
        // เพิ่มงานกำลังดำเนินการ
        if (inProgressTasks.length > 0) {
            contentItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⏳ งานกำลังดำเนินการ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold'));
            const inProgressTaskItems = createPersonalTaskList(inProgressTasks, 4);
            for (const item of inProgressTaskItems) {
                contentItems.push(item);
            }
        }
        // เพิ่มงานรอดำเนินการ
        if (pendingTasks.length > 0) {
            contentItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 งานรอดำเนินการ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, 'bold'));
            const pendingTaskItems = createPersonalTaskList(pendingTasks, 4);
            for (const item of pendingTaskItems) {
                contentItems.push(item);
            }
        }
        // เพิ่มคำแนะนำ
        contentItems.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 เริ่มจากงานที่เกินกำหนดก่อน แล้วค่อยทำงานอื่นๆ', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary));
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📊 ดู Dashboard', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group?.id || assignee.groupId}${assignee.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋 ดูงานทั้งหมดของฉัน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${assignee.lineUserId}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`, '👤', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, contentItems, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดแสดงไฟล์แนบในแชท
     */
    static createFileAttachmentCard(task, group, assignee) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📎 การแนบไฟล์สำหรับงาน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ส่งไฟล์หลายไฟล์ได้เลย ระบบจะแสดงรายการไฟล์ทั้งหมด', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📤 เมื่อส่งไฟล์แล้ว กดปุ่ม "ดูรายการไฟล์" เพื่อตรวจสอบ', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⚠️ ต้องมีไฟล์อย่างน้อย 1 ไฟล์', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📤 ไฟล์ที่ส่งจะถูกแนบกับงานโดยอัตโนมัติ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📎 ดูรายการไฟล์ | 📋 ดูงานที่ต้องส่ง | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📎', 'postback', `action=show_task_files&taskId=${task.id}&groupId=${group.id}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'postback', `action=show_personal_tasks`, 'secondary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('❌', 'postback', `action=submit_cancel&taskId=${task.id}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📎 แนบไฟล์และส่งงาน', '📎', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดแสดงไฟล์แนบในแชท
     */
    static createFileDisplayCard(file, group) {
        const fileIcon = this.getFileIcon(file.mimeType);
        const fileSize = this.formatFileSize(file.size);
        const uploadDate = (0, moment_1.default)(file.uploadedAt).format('DD/MM HH:mm');
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📎 ไฟล์แนบ', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${fileIcon} ${file.originalName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📦 ${fileSize} • 📅 ${uploadDate}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            ...(file.tags && file.tags.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🏷️ ${file.tags.map((tag) => `#${tag}`).join(' ')}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ] : [])
        ];
        const fileService = serviceContainer_1.serviceContainer.get('FileService');
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📥', 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'primary'),
            ...(this.isPreviewable(file.mimeType) ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('👁️', 'uri', fileService.generatePreviewUrl(file.groupId, file.id), 'secondary')
            ] : [])
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📎 ไฟล์แนบ', '📎', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดแสดงรายการไฟล์แนบของงานแยกตามประเภท
     */
    static createTaskFilesCategorizedCard(task, filesByType, group, viewerLineUserId) {
        const { initialFiles, submissionFiles, allFiles } = filesByType;
        const totalFiles = allFiles.length;
        if (totalFiles === 0) {
            return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📎 ไฟล์แนบ', '📎', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ไม่มีไฟล์แนบ', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ], [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
            ], 'extraLarge');
        }
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
        ];
        // แสดงไฟล์เริ่มต้น
        if (initialFiles.length > 0) {
            content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ไฟล์เริ่มต้น: ${initialFiles.length} ไฟล์`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, 'bold'), ...initialFiles.slice(0, 2).map(file => [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]).flat(), ...(initialFiles.length > 2 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${initialFiles.length - 2} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ] : []));
            if (submissionFiles.length > 0) {
                content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'));
            }
        }
        // แสดงไฟล์ส่งงาน
        if (submissionFiles.length > 0) {
            content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📤 ไฟล์ส่งงาน: ${submissionFiles.length} ไฟล์`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'), ...submissionFiles.slice(0, 2).map(file => [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]).flat(), ...(submissionFiles.length > 2 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${submissionFiles.length - 2} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ] : []));
        }
        content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 รวมทั้งหมด: ${totalFiles} ไฟล์`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อดาวน์โหลดหรือดูไฟล์', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary));
        // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
        const fileService = serviceContainer_1.serviceContainer.get('FileService');
        const fileButtons = allFiles.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📥 ${file.originalName.substring(0, 8)}...`, 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'secondary'));
        const buttons = [
            ...fileButtons,
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📎 ไฟล์แนบ', '📎', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดแสดงรายการไฟล์แนบของงาน (เดิม - สำหรับ backward compatibility)
     */
    static createTaskFilesCard(task, files, group, viewerLineUserId) {
        if (!files || files.length === 0) {
            return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📎 ไฟล์แนบ', '📎', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ไม่มีไฟล์แนบ', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ], [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
            ], 'extraLarge');
        }
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            ...files.slice(0, 3).map(file => [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]).flat(),
            ...(files.length > 3 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อดาวน์โหลดหรือดูไฟล์', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
        const fileService = serviceContainer_1.serviceContainer.get('FileService');
        const fileButtons = files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📥 ${file.originalName.substring(0, 8)}...`, 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'primary'));
        const buttons = [
            ...fileButtons, // ปุ่มดาวน์โหลดไฟล์แต่ละไฟล์
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📎 ไฟล์แนบ', '📎', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดยืนยันการส่งงานพร้อมไฟล์
     */
    static createSubmitConfirmationCard(task, group, fileCount, fileNames) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('✅ ยืนยันการส่งงาน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์ที่จะแนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            ...(fileNames.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                ...fileNames.map(fileName => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`• ${fileName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary))
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('กด "ยืนยัน" เพื่อส่งงานพร้อมไฟล์', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ✅ ยืนยัน | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('✅', 'postback', `action=confirm_submit&taskId=${task.id}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('❌', 'postback', `action=submit_cancel&taskId=${task.id}`, 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📤 ยืนยันการส่งงาน', '📤', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    static getCompletionSummary(task) {
        const dueTime = (0, moment_1.default)(task.dueTime);
        const completedTime = (0, moment_1.default)(task.completedAt || new Date());
        const diffMinutes = completedTime.diff(dueTime, 'minutes');
        const scoring = config_1.config.app.kpiScoring.assignee;
        if (diffMinutes <= -24 * 60) {
            return {
                emoji: '🚀',
                text: 'ส่งก่อนกำหนด 24 ชม. ขึ้นไป',
                points: scoring.early
            };
        }
        if (diffMinutes <= 0) {
            return {
                emoji: '⏱️',
                text: 'ส่งตรงเวลา',
                points: scoring.ontime
            };
        }
        const hoursLate = Math.ceil(diffMinutes / 60);
        return {
            emoji: '🐢',
            text: `ส่งล่าช้า ${hoursLate} ชม.`,
            points: scoring.late
        };
    }
    /**
     * ตรวจสอบว่าไฟล์สามารถแสดงตัวอย่างได้หรือไม่
     */
    static isPreviewable(mimeType) {
        const previewableMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain'
        ];
        return previewableMimes.includes(mimeType);
    }
    /**
     * ได้ไอคอนไฟล์ตาม MIME type
     */
    static getFileIcon(mimeType) {
        if (mimeType.startsWith('image/'))
            return '🖼️';
        if (mimeType.startsWith('video/'))
            return '🎥';
        if (mimeType.startsWith('audio/'))
            return '🎵';
        if (mimeType.includes('pdf'))
            return '📄';
        if (mimeType.includes('word'))
            return '📝';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
            return '📊';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
            return '📽️';
        if (mimeType.includes('zip') || mimeType.includes('rar'))
            return '📦';
        return '📎';
    }
    /**
     * จัดรูปแบบขนาดไฟล์
     */
    static formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    /**
     * สร้างการ์ดแสดงรายการไฟล์ในแชทส่วนตัว (มาตรฐานใหม่)
     */
    static createPersonalFileListCard(files, user, taskId) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📎 รายการไฟล์ที่ส่งมา', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📦 ไฟล์ทั้งหมด: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            ...(files.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                ...files.slice(0, 5).map(file => [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 📅 ${(0, moment_1.default)(file.uploadedAt).format('HH:mm')}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ]).flat(),
                ...(files.length > 5 ? [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${files.length - 5} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ] : [])
            ] : [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ส่งไฟล์เพิ่มเติมได้เลย หรือกดปุ่มด้านล่างเพื่อดูงานที่ต้องส่ง', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📋 ดูงานที่ต้องส่ง | 📤 ส่งงานพร้อมไฟล์ | 🗑️ ล้างไฟล์ทั้งหมด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
        const fileService = serviceContainer_1.serviceContainer.get('FileService');
        const fileButtons = files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📥 ${file.originalName.substring(0, 10)}...`, 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'secondary'));
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'postback', 'action=show_personal_tasks', 'primary'),
            ...(files.length > 0 && taskId ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📤', 'postback', `action=submit_task&taskId=${taskId}`, 'primary')
            ] : []),
            ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('🗑️', 'postback', 'action=clear_personal_files', 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📎 รายการไฟล์ส่วนตัว', '📎', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดแสดงงานที่ต้องส่งพร้อมไฟล์ที่แนบได้ (มาตรฐานใหม่)
     */
    static createPersonalTaskWithFilesCard(task, files, user) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 งานที่ต้องส่ง', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            ...(files.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                ...files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`• ${file.originalName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)),
                ...(files.length > 3 ? [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ] : [])
            ] : [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ส่งไฟล์เพิ่มเติมได้เลย หรือกดปุ่มส่งงาน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📤 ส่งงาน | 📎 ดูไฟล์ทั้งหมด | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
        const fileService = serviceContainer_1.serviceContainer.get('FileService');
        const fileButtons = files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📥 ${file.originalName.substring(0, 8)}...`, 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'secondary'));
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📤', 'postback', `action=submit_task&taskId=${task.id}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📎', 'postback', 'action=show_personal_files', 'secondary'),
            ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📋 ส่งงานพร้อมไฟล์', '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดแสดงรายการงานที่ต้องส่ง (มาตรฐานใหม่)
     */
    static createPersonalTaskListCard(tasks, files, user) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 งานที่ต้องส่ง', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 งานทั้งหมด: ${tasks.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            ...tasks.slice(0, 3).map((task, index) => [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${(0, moment_1.default)(task.dueTime).format('DD/MM HH:mm')}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]).flat(),
            ...(tasks.length > 3 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${tasks.length - 3} งาน...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 เลือกงานที่ต้องการส่ง หรือกดปุ่มดูรายการไฟล์', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📎 ดูรายการไฟล์ | 📤 ส่งงานต่างๆ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📎', 'postback', 'action=show_personal_files', 'primary'),
            ...tasks.slice(0, 3).map((task, index) => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📤${index + 1}`, 'postback', `action=submit_task&taskId=${task.id}`, 'secondary')),
            ...(tasks.length > 3 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'postback', 'action=show_all_personal_tasks', 'secondary')
            ] : [])
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📋 รายการงานที่ต้องส่ง', '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดงานส่วนตัวทั้งหมด (รวมงานที่เกินกำหนด) - มาตรฐานใหม่
     */
    static createAllPersonalTasksCard(tasks, files, user, overdueTasks = []) {
        // กรองงานที่ส่งแล้วออก (มี workflow.submissions)
        const filterSubmittedTasks = (taskList) => {
            return taskList.filter(t => {
                const workflow = t.workflow;
                if (!workflow || !workflow.submissions)
                    return true;
                return !Array.isArray(workflow.submissions) || workflow.submissions.length === 0;
            });
        };
        // แยกงานตามสถานะ
        const pendingTasks = filterSubmittedTasks(tasks.filter(task => task.status === 'pending'));
        const inProgressTasks = filterSubmittedTasks(tasks.filter(task => task.status === 'in_progress'));
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 งานทั้งหมดที่ต้องส่ง', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 งานทั้งหมด: ${tasks.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            // แสดงงานที่เกินกำหนดก่อน (ถ้ามี)
            ...(overdueTasks.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⚠️ งานที่เกินกำหนด:', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'),
                ...overdueTasks.map((task, index) => [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold'),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`   📅 กำหนดส่ง: ${(0, moment_1.default)(task.dueTime).format('DD/MM HH:mm')} ⚠️ เกินกำหนด`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`   🎯 ${FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ]).flat(),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small')
            ] : []),
            // แสดงงานที่กำลังดำเนินการ
            ...(inProgressTasks.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🔄 งานที่กำลังดำเนินการ:', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold'),
                ...inProgressTasks.map((task, index) => [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${overdueTasks.length + index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`   📅 กำหนดส่ง: ${(0, moment_1.default)(task.dueTime).format('DD/MM HH:mm')}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`   🎯 ${FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ]).flat(),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small')
            ] : []),
            // แสดงงานที่รอดำเนินการ
            ...(pendingTasks.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⏳ งานที่รอดำเนินการ:', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, 'bold'),
                ...pendingTasks.map((task, index) => [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${overdueTasks.length + inProgressTasks.length + index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`   📅 กำหนดส่ง: ${(0, moment_1.default)(task.dueTime).format('DD/MM HH:mm')}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`   🎯 ${FlexMessageDesignSystem_1.FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ]).flat(),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small')
            ] : []),
            ...(tasks.length > 5 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${tasks.length - 5} งาน...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ] : []),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บส่งงาน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ระบบจะแสดงงานทั้งหมดของคุณพร้อมชื่อกลุ่ม', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        // เปลี่ยนเป็นปุ่มเปิดเว็บแทนการส่งงานในแชท
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📎 ดูรายการไฟล์', 'postback', 'action=show_personal_files', 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📋 งานทั้งหมดที่ต้องส่ง', '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดยืนยันการส่งงาน (มาตรฐานใหม่) - เปลี่ยนเป็นเปิดเว็บ
     */
    static createTaskSubmissionConfirmationCard(task, files, user) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 ยืนยันการส่งงาน', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้รับผิดชอบ: ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${(0, moment_1.default)(task.dueTime).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            ...(files.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                ...files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`• ${file.originalName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)),
                ...(files.length > 3 ? [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ] : [])
            ] : [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บส่งงาน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ระบบจะแสดงงานทั้งหมดของคุณพร้อมชื่อกลุ่ม', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
        const fileService = serviceContainer_1.serviceContainer.get('FileService');
        const fileButtons = files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📥 ${file.originalName.substring(0, 8)}...`, 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'secondary'));
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}&taskId=${task.id}`, 'primary'),
            ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📋 ยืนยันการส่งงาน', '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดยืนยันการส่งงานแบบมาตรฐาน (สำหรับงานที่ถูกตีกลับ) - เปลี่ยนเป็นเปิดเว็บ
     */
    static createStandardTaskSubmissionCard(task, files, user) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 ยืนยันการส่งงานใหม่', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้รับผิดชอบ: ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 กำหนดส่งใหม่: ${(0, moment_1.default)(task.dueTime).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            ...(files.length > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                ...files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`• ${file.originalName}`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)),
                ...(files.length > 3 ? [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ] : [])
            ] : [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 เลือกวิธีการส่งงานใหม่ด้านล่าง', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📎 ส่งงานพร้อมไฟล์ | 📤 ส่งงานโดยไม่มีไฟล์ | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
        const fileService = serviceContainer_1.serviceContainer.get('FileService');
        const fileButtons = files.slice(0, 3).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(`📥 ${file.originalName.substring(0, 8)}...`, 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'secondary'));
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}&taskId=${task.id}`, 'primary'),
            ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📋 ยืนยันการส่งงานใหม่', '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดยืนยันการส่งงานสำเร็จ
     */
    static createSubmissionSuccessCard(task, fileCount, user) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('✅ ส่งงานสำเร็จแล้ว', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 ส่งเมื่อ: ${(0, moment_1.default)().format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            ...(fileCount > 0 ? [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small')
            ] : [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📤 ส่งงานโดยไม่มีไฟล์แนบ`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small')
            ]),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🎯 สถานะ: รอการตรวจสอบ', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 ระบบจะส่งงานไปให้ผู้ตรวจตรวจสอบภายใน 2 วัน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📋 ดูงานอื่นๆ | 📤 ส่งงานเพิ่มเติม', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📋', 'postback', 'action=submit_task', 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📤', 'postback', 'action=submit_task', 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('✅ ส่งงานสำเร็จ', '✅', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
    }
    /**
     * สร้างการ์ดแสดง Flow การส่งงานที่ชัดเจน - เปลี่ยนเป็นเปิดเว็บ
     */
    static createTaskSubmissionFlowCard(user) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 Flow การส่งงาน (มาตรฐานใหม่)', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🔄 **ขั้นตอนการส่งงาน:**', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('1️⃣ พิมพ์ "ส่งงาน" เพื่อดูรายการงาน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('2️⃣ กดปุ่ม "เปิดหน้าเว็บส่งงาน"', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('3️⃣ เลือกงานที่ต้องการส่งในหน้าเว็บ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('4️⃣ อัปโหลดไฟล์และกรอกหมายเหตุ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('5️⃣ กดปุ่มส่งงานในหน้าเว็บ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 **ข้อดีของการใช้หน้าเว็บ:**', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('• แสดงงานทั้งหมดพร้อมชื่อกลุ่ม', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('• อัปโหลดไฟล์ได้หลายไฟล์พร้อมกัน', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('• กรอกหมายเหตุได้ยาวและละเอียด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('💡 📋 เริ่มต้นส่งงาน | 📎 ดูรายการไฟล์', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config_1.config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}`, 'primary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('📎 ดูรายการไฟล์', 'postback', 'action=show_personal_files', 'secondary'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📋 Flow การส่งงาน', '📋', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, content, buttons, 'extraLarge');
    }
}
exports.FlexMessageTemplateService = FlexMessageTemplateService;
//# sourceMappingURL=FlexMessageTemplateService.js.map