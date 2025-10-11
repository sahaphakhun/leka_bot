"use strict";
// Flex Message Design System - ระบบออกแบบการ์ดมาตรฐานสำหรับ LINE
// จัดการสี ขนาด layout และ template มาตรฐาน
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlexMessageDesignSystem = void 0;
class FlexMessageDesignSystem {
    // ทำความสะอาดข้อความ (ลบ control characters ที่อาจทำให้ LINE ปฏิเสธข้อความ)
    static sanitizeText(text) {
        try {
            if (typeof text !== 'string')
                return '';
            let sanitized = text
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/\uFFFE|\uFFFF/g, '')
                .trim();
            return sanitized;
        }
        catch {
            return '';
        }
    }
    // สีตามสถานะงาน
    static getStatusColor(status) {
        switch (status) {
            case 'pending':
                return this.colors.primary;
            case 'in_progress':
                return this.colors.warning;
            case 'completed':
                return this.colors.success;
            case 'cancelled':
                return this.colors.neutral;
            case 'overdue':
                return this.colors.danger;
            default:
                return this.colors.primary;
        }
    }
    // สีตามความสำคัญ
    static getPriorityColor(priority) {
        switch (priority) {
            case 'high':
                return this.colors.priorityHigh;
            case 'medium':
                return this.colors.priorityMedium;
            case 'low':
                return this.colors.priorityLow;
            default:
                return this.colors.priorityLow;
        }
    }
    // ข้อความสถานะ
    static getStatusText(status) {
        switch (status) {
            case 'pending':
                return 'รอดำเนินการ';
            case 'in_progress':
                return 'กำลังดำเนินการ';
            case 'completed':
                return 'เสร็จแล้ว';
            case 'cancelled':
                return 'ยกเลิก';
            case 'overdue':
                return 'เกินกำหนด';
            default:
                return status;
        }
    }
    // ข้อความความสำคัญ
    static getPriorityText(priority) {
        switch (priority) {
            case 'high':
                return 'ความสำคัญสูง';
            case 'medium':
                return 'ความสำคัญปานกลาง';
            case 'low':
                return 'ความสำคัญต่ำ';
            default:
                return 'ไม่ระบุ';
        }
    }
    // สร้างปุ่มมาตรฐาน
    static createButton(label, action, data, style = 'primary', height = 'sm') {
        return {
            type: 'button',
            style,
            height,
            action: {
                type: action,
                label,
                ...(action === 'postback'
                    ? { data: typeof data === 'string' ? data : JSON.stringify(data) }
                    : { uri: data })
            }
        };
    }
    // สร้างข้อความมาตรฐาน
    static createText(text, size = 'sm', color = this.colors.textPrimary, weight, wrap, margin) {
        return {
            type: 'text',
            text: this.sanitizeText(text),
            size: this.textSizes[size],
            color,
            ...(weight && { weight }),
            ...(wrap && { wrap }),
            ...(margin && { margin: this.padding[margin] })
        };
    }
    // สร้าง separator มาตรฐาน
    static createSeparator(margin = 'medium') {
        return {
            type: 'separator',
            margin: this.padding[margin]
        };
    }
    // สร้าง box มาตรฐาน
    static createBox(layout, contents, spacing, padding, backgroundColor, cornerRadius) {
        return {
            type: 'box',
            layout,
            contents,
            ...(spacing && { spacing: this.spacing[spacing] }),
            ...(padding && { paddingAll: this.padding[padding] }),
            ...(backgroundColor && { backgroundColor }),
            ...(cornerRadius && { cornerRadius })
        };
    }
    // สร้าง template มาตรฐานสำหรับการ์ดงาน
    static createStandardTaskCard(title, emoji, color, content, // รับได้ทั้ง text, separator, และ box components
    buttons, size = 'extraLarge') {
        return {
            type: 'flex',
            altText: this.sanitizeText(title),
            contents: {
                type: 'bubble',
                ...(size !== 'default' && { size: this.sizes[size] }),
                header: {
                    type: 'box',
                    layout: this.layouts.header,
                    contents: [
                        this.createText(`${emoji} ${title}`, 'lg', this.colors.white, 'bold')
                    ],
                    backgroundColor: color,
                    paddingAll: this.padding.medium
                },
                body: {
                    type: 'box',
                    layout: this.layouts.body,
                    spacing: this.spacing.medium,
                    contents: content,
                    paddingAll: this.padding.medium
                },
                ...(buttons.length > 0 && {
                    footer: {
                        type: 'box',
                        layout: this.layouts.footer,
                        spacing: this.spacing.small,
                        contents: buttons,
                        paddingAll: this.padding.medium
                    }
                })
            }
        };
    }
    // สร้าง template สำหรับการ์ดข้อมูลงาน
    static createTaskInfoCard(taskData, type) {
        const { title, description, dueTime, assignees, priority, tags, status, fileCount } = taskData;
        // กำหนดสีและอิโมจิตามประเภท
        const typeConfig = this.getTypeConfig(type);
        // สร้างเนื้อหา
        const content = [];
        if (dueTime) {
            content.push(this.createText(`📅 กำหนดส่ง: ${this.formatDate(dueTime)}`, 'sm', this.colors.textPrimary));
        }
        if (assignees && assignees.length > 0) {
            content.push(this.createText(`👥 ผู้รับผิดชอบ: ${assignees.join(', ')}`, 'sm', this.colors.textPrimary));
        }
        if (priority) {
            content.push(this.createText(`🎯 ${this.getPriorityText(priority)}`, 'sm', this.getPriorityColor(priority), 'bold'));
        }
        // แสดงข้อมูลไฟล์แนบแยกตามประเภท
        const { initialFiles, submissionFiles, attachedFiles: allAttachedFiles } = taskData;
        const totalFiles = fileCount || (allAttachedFiles ? allAttachedFiles.length : 0);
        if (totalFiles > 0) {
            // แสดงไฟล์แนบตอนสร้างงาน
            if (initialFiles && initialFiles.length > 0) {
                content.push(this.createText(`📋 ไฟล์เริ่มต้น: ${initialFiles.length} ไฟล์`, 'sm', this.colors.primary, 'bold'));
                const filesToShow = initialFiles.slice(0, 2);
                for (const file of filesToShow) {
                    content.push(this.createText(`  • ${file.originalName || file.fileName}`, 'xs', this.colors.textSecondary));
                }
                if (initialFiles.length > 2) {
                    content.push(this.createText(`  และอีก ${initialFiles.length - 2} ไฟล์...`, 'xs', this.colors.textSecondary));
                }
            }
            // แสดงไฟล์แนบตอนส่งงาน
            if (submissionFiles && submissionFiles.length > 0) {
                content.push(this.createText(`📤 ไฟล์ส่งงาน: ${submissionFiles.length} ไฟล์`, 'sm', this.colors.success, 'bold'));
                const filesToShow = submissionFiles.slice(0, 2);
                for (const file of filesToShow) {
                    content.push(this.createText(`  • ${file.originalName || file.fileName}`, 'xs', this.colors.textSecondary));
                }
                if (submissionFiles.length > 2) {
                    content.push(this.createText(`  และอีก ${submissionFiles.length - 2} ไฟล์...`, 'xs', this.colors.textSecondary));
                }
            }
            // แสดงรวมถ้ามีทั้งสองประเภท
            if (initialFiles && submissionFiles && initialFiles.length > 0 && submissionFiles.length > 0) {
                content.push(this.createText(`📎 รวมทั้งหมด: ${totalFiles} ไฟล์`, 'sm', this.colors.textPrimary));
            }
            else if (!initialFiles && !submissionFiles && allAttachedFiles && allAttachedFiles.length > 0) {
                // fallback สำหรับไฟล์เก่าที่ไม่มี attachmentType
                content.push(this.createText(`📎 ไฟล์แนบ: ${totalFiles} ไฟล์`, 'sm', this.colors.textPrimary, 'bold'));
                const filesToShow = allAttachedFiles.slice(0, 3);
                for (const file of filesToShow) {
                    content.push(this.createText(`  • ${file.originalName || file.fileName}`, 'xs', this.colors.textSecondary));
                }
                if (allAttachedFiles.length > 3) {
                    content.push(this.createText(`  และอีก ${allAttachedFiles.length - 3} ไฟล์...`, 'xs', this.colors.textSecondary));
                }
            }
        }
        if (tags && tags.length > 0) {
            content.push(this.createText(`🏷️ ${tags.map(tag => `#${tag}`).join(' ')}`, 'sm', this.colors.textSecondary, undefined, true));
        }
        if (description) {
            content.push(this.createText(`📝 ${description}`, 'sm', this.colors.textSecondary, undefined, true));
        }
        // สร้างปุ่มมาตรฐาน
        const buttons = [
            this.createButton('ดูรายละเอียด', 'uri', `${this.getBaseUrl()}/dashboard?taskId=${taskData.id}&action=view`, 'primary')
        ];
        return this.createStandardTaskCard(title, typeConfig.emoji, typeConfig.color, content, buttons, 'extraLarge');
    }
    // กำหนดค่าตามประเภทการ์ด
    static getTypeConfig(type) {
        switch (type) {
            case 'new':
                return { emoji: this.emojis.newTask, color: this.colors.primary };
            case 'overdue':
                return { emoji: this.emojis.overdue, color: this.colors.danger };
            case 'completed':
                return { emoji: this.emojis.completed, color: this.colors.success };
            case 'updated':
                return { emoji: this.emojis.updated, color: this.colors.primary };
            case 'deleted':
                return { emoji: this.emojis.deleted, color: this.colors.neutral };
            case 'submitted':
                return { emoji: this.emojis.submitted, color: this.colors.info };
            case 'review':
                return { emoji: this.emojis.review, color: this.colors.primary };
            case 'rejected':
                return { emoji: this.emojis.rejected, color: this.colors.danger };
            case 'report':
                return { emoji: this.emojis.report, color: this.colors.success };
            case 'personal':
                return { emoji: this.emojis.personal, color: this.colors.success };
            default:
                return { emoji: this.emojis.task, color: this.colors.primary };
        }
    }
    // จัดรูปแบบวันที่
    static formatDate(date) {
        const moment = require('moment-timezone');
        return moment(date).tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
    }
    // รับ base URL
    static getBaseUrl() {
        const config = require('@/utils/config').default;
        return config.baseUrl;
    }
}
exports.FlexMessageDesignSystem = FlexMessageDesignSystem;
// สีมาตรฐานตามประเภทการ์ด
FlexMessageDesignSystem.colors = {
    // สีหลัก
    primary: '#2196F3', // งานใหม่/อัปเดต/รอตรวจ
    success: '#4CAF50', // งานสำเร็จ/รายงาน
    warning: '#FF9800', // เตือน/งานกำลังดำเนินการ
    danger: '#F44336', // งานเกินกำหนด/ถูกตีกลับ
    info: '#9C27B0', // งานที่ถูกส่ง
    neutral: '#9E9E9E', // งานที่ถูกลบ/ยกเลิก
    // สีรอง
    lightGray: '#F8F9FA', // พื้นหลังอ่อน
    darkGray: '#666666', // ข้อความรอง
    textPrimary: '#333333', // ข้อความหลัก
    textSecondary: '#666666', // ข้อความรอง
    white: '#FFFFFF', // ข้อความขาว
    // สีความสำคัญ
    priorityHigh: '#FF5551',
    priorityMedium: '#FFA500',
    priorityLow: '#00C851'
};
// ขนาดมาตรฐาน
FlexMessageDesignSystem.sizes = {
    default: undefined, // ขนาดปกติ
    compact: 'kilo', // ขนาดกะทัดรัด
    large: 'mega', // ขนาดใหญ่
    extraLarge: 'giga' // ขนาดใหญ่มาก
};
// Layout มาตรฐาน
FlexMessageDesignSystem.layouts = {
    header: 'vertical',
    body: 'vertical',
    footer: 'horizontal'
};
// Padding มาตรฐาน
FlexMessageDesignSystem.padding = {
    small: 'sm',
    medium: 'md',
    large: 'lg'
};
// Spacing มาตรฐาน
FlexMessageDesignSystem.spacing = {
    small: 'sm',
    medium: 'md',
    large: 'lg'
};
// ขนาดข้อความมาตรฐาน
FlexMessageDesignSystem.textSizes = {
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl'
};
// อิโมจิมาตรฐานตามประเภทการ์ด
FlexMessageDesignSystem.emojis = {
    newTask: '🆕',
    overdue: '⚠️',
    completed: '✅',
    updated: '✏️',
    deleted: '🗑️',
    submitted: '📎',
    review: '📝',
    rejected: '❌',
    report: '📊',
    personal: '📋',
    file: '📁',
    task: '📋',
    reminder: '⏰',
    meeting: '📅',
    approval: '📋'
};
//# sourceMappingURL=FlexMessageDesignSystem.js.map