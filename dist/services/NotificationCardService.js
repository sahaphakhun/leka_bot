"use strict";
// Notification Card Service - จัดการการสร้างและส่งการ์ดแจ้งเตือน
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCardService = void 0;
const LineService_1 = require("./LineService");
const UserService_1 = require("./UserService");
const FlexMessageDesignSystem_1 = require("./FlexMessageDesignSystem");
const logger_1 = require("@/utils/logger");
const uuid_1 = require("uuid");
class NotificationCardService {
    constructor() {
        this.lineService = new LineService_1.LineService();
        this.userService = new UserService_1.UserService();
    }
    /**
     * สร้างการ์ดแจ้งเตือนใหม่
     */
    async createNotificationCard(request) {
        try {
            // ตรวจสอบข้อมูลที่จำเป็น
            this.validateNotificationRequest(request);
            const notificationCard = {
                id: (0, uuid_1.v4)(),
                title: request.title,
                description: request.description,
                imageUrl: request.imageUrl,
                buttons: request.buttons || [],
                targetType: request.targetType,
                groupIds: request.groupIds || [],
                userIds: request.userIds || [],
                priority: request.priority || 'medium',
                expiresAt: request.expiresAt,
                createdAt: new Date(),
                status: 'pending'
            };
            // บันทึกลงฐานข้อมูล (ในอนาคต)
            // await this.saveNotificationCard(notificationCard);
            logger_1.logger.info(`✅ สร้างการ์ดแจ้งเตือนสำเร็จ: ${notificationCard.id}`);
            return notificationCard;
        }
        catch (error) {
            logger_1.logger.error('❌ สร้างการ์ดแจ้งเตือนไม่สำเร็จ:', error);
            throw error;
        }
    }
    /**
     * ส่งการ์ดแจ้งเตือน
     */
    async sendNotificationCard(notificationCard) {
        try {
            logger_1.logger.info(`📤 เริ่มส่งการ์ดแจ้งเตือน: ${notificationCard.id}`);
            // สร้าง Flex Message สำหรับ LINE
            const flexMessage = this.createFlexMessage(notificationCard);
            let successCount = 0;
            let errorCount = 0;
            // ส่งไปยังกลุ่ม
            if (notificationCard.targetType === 'group' || notificationCard.targetType === 'both') {
                for (const groupId of notificationCard.groupIds || []) {
                    try {
                        await this.lineService.pushMessage(groupId, flexMessage);
                        successCount++;
                        logger_1.logger.info(`✅ ส่งการ์ดไปยังกลุ่ม ${groupId} สำเร็จ`);
                    }
                    catch (error) {
                        errorCount++;
                        logger_1.logger.error(`❌ ส่งการ์ดไปยังกลุ่ม ${groupId} ไม่สำเร็จ:`, error);
                    }
                }
            }
            // ส่งไปยังผู้ใช้
            if (notificationCard.targetType === 'user' || notificationCard.targetType === 'both') {
                for (const userId of notificationCard.userIds || []) {
                    try {
                        // ลองค้นหาจาก LINE User ID ก่อน (ถ้าเป็น LINE User ID)
                        let user = await this.userService.findByLineUserId(userId);
                        // ถ้าไม่เจอ ให้ลองค้นหาจาก internal User ID
                        if (!user) {
                            user = await this.userService.findById(userId);
                        }
                        if (user && user.lineUserId) {
                            await this.lineService.pushMessage(user.lineUserId, flexMessage);
                            successCount++;
                            logger_1.logger.info(`✅ ส่งการ์ดไปยังผู้ใช้ ${userId} สำเร็จ`);
                        }
                        else {
                            errorCount++;
                            logger_1.logger.warn(`⚠️ ไม่พบ LINE User ID สำหรับผู้ใช้ ${userId}`);
                        }
                    }
                    catch (error) {
                        errorCount++;
                        logger_1.logger.error(`❌ ส่งการ์ดไปยังผู้ใช้ ${userId} ไม่สำเร็จ:`, error);
                    }
                }
            }
            // อัปเดตสถานะ
            const status = errorCount === 0 ? 'sent' : (successCount > 0 ? 'sent' : 'failed');
            notificationCard.status = status;
            notificationCard.sentAt = new Date();
            logger_1.logger.info(`📊 ส่งการ์ดแจ้งเตือนเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${errorCount}`);
            return {
                success: successCount > 0,
                data: notificationCard,
                error: errorCount > 0 ? `ส่งสำเร็จ ${successCount} รายการ, ล้มเหลว ${errorCount} รายการ` : undefined
            };
        }
        catch (error) {
            logger_1.logger.error('❌ ส่งการ์ดแจ้งเตือนไม่สำเร็จ:', error);
            notificationCard.status = 'failed';
            return {
                success: false,
                data: notificationCard,
                error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
            };
        }
    }
    /**
     * สร้างและส่งการ์ดแจ้งเตือนในขั้นตอนเดียว
     */
    async createAndSendNotificationCard(request) {
        try {
            const notificationCard = await this.createNotificationCard(request);
            return await this.sendNotificationCard(notificationCard);
        }
        catch (error) {
            logger_1.logger.error('❌ สร้างและส่งการ์ดแจ้งเตือนไม่สำเร็จ:', error);
            throw error;
        }
    }
    /**
     * สร้าง Flex Message สำหรับ LINE
     */
    createFlexMessage(notificationCard) {
        const buttons = notificationCard.buttons.map(button => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton(button.label, 'postback', JSON.stringify({
            action: button.action,
            notificationId: notificationCard.id,
            buttonId: button.id,
            ...button.data
        }), button.style || 'primary'));
        const content = [
            ...(notificationCard.description ? [FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(notificationCard.description, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, undefined, true)] : []),
            ...(notificationCard.imageUrl ? [{
                    type: 'image',
                    url: notificationCard.imageUrl,
                    size: 'full',
                    margin: FlexMessageDesignSystem_1.FlexMessageDesignSystem.padding.medium
                }] : [])
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(notificationCard.title, '📢', this.getPriorityColor(notificationCard.priority), content, buttons, 'extraLarge');
    }
    /**
     * ตรวจสอบความถูกต้องของข้อมูล
     */
    validateNotificationRequest(request) {
        if (!request.title || request.title.trim().length === 0) {
            throw new Error('หัวข้อการแจ้งเตือนไม่สามารถเป็นค่าว่างได้');
        }
        if (request.title.length > 100) {
            throw new Error('หัวข้อการแจ้งเตือนต้องไม่เกิน 100 ตัวอักษร');
        }
        if (request.description && request.description.length > 1000) {
            throw new Error('รายละเอียดการแจ้งเตือนต้องไม่เกิน 1000 ตัวอักษร');
        }
        if (request.targetType === 'group' && (!request.groupIds || request.groupIds.length === 0)) {
            throw new Error('ต้องระบุกลุ่มอย่างน้อย 1 กลุ่ม');
        }
        if (request.targetType === 'user' && (!request.userIds || request.userIds.length === 0)) {
            throw new Error('ต้องระบุผู้ใช้อย่างน้อย 1 คน');
        }
        if (request.targetType === 'both' &&
            (!request.groupIds || request.groupIds.length === 0) &&
            (!request.userIds || request.userIds.length === 0)) {
            throw new Error('ต้องระบุกลุ่มหรือผู้ใช้อย่างน้อย 1 รายการ');
        }
        if (request.buttons && request.buttons.length > 4) {
            throw new Error('ปุ่มไม่สามารถเกิน 4 ปุ่มได้ (ตามข้อจำกัดของ LINE)');
        }
        if (request.expiresAt && request.expiresAt <= new Date()) {
            throw new Error('วันหมดอายุต้องเป็นอนาคต');
        }
    }
    /**
     * ได้สีของหัวข้อตามความสำคัญ
     */
    getPriorityColor(priority) {
        switch (priority) {
            case 'high':
                return FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger;
            case 'medium':
                return FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning;
            case 'low':
                return FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success;
            default:
                return FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary;
        }
    }
    /**
     * สร้างปุ่มมาตรฐาน
     */
    createStandardButtons() {
        return [
            {
                id: 'add_task',
                label: '➕ เพิ่มงาน',
                action: 'add_task',
                style: 'primary'
            },
            {
                id: 'close_task',
                label: '✅ ปิดงาน',
                action: 'close_task',
                style: 'secondary'
            },
            {
                id: 'request_extension',
                label: '⏰ ขอเลื่อนเวลา',
                action: 'request_extension',
                style: 'secondary'
            },
            {
                id: 'view_details',
                label: '👁️ ดูรายละเอียด',
                action: 'view_details',
                style: 'secondary'
            }
        ];
    }
    /**
     * สร้างปุ่มสำหรับการอนุมัติ
     */
    createApprovalButtons() {
        return [
            {
                id: 'approve',
                label: '✅ อนุมัติ',
                action: 'approve',
                style: 'primary'
            },
            {
                id: 'reject',
                label: '❌ ไม่อนุมัติ',
                action: 'reject',
                style: 'danger'
            },
            {
                id: 'view_details',
                label: '👁️ ดูรายละเอียด',
                action: 'view_details',
                style: 'secondary'
            }
        ];
    }
}
exports.NotificationCardService = NotificationCardService;
//# sourceMappingURL=NotificationCardService.js.map