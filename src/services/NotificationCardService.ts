// Notification Card Service - จัดการการสร้างและส่งการ์ดแจ้งเตือน

import { LineService } from './LineService';
import { UserService } from './UserService';
import { 
  NotificationCard, 
  NotificationButton, 
  CreateNotificationCardRequest,
  NotificationCardResponse 
} from '@/types';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class NotificationCardService {
  private lineService: LineService;
  private userService: UserService;

  constructor() {
    this.lineService = new LineService();
    this.userService = new UserService();
  }

  /**
   * สร้างการ์ดแจ้งเตือนใหม่
   */
  public async createNotificationCard(
    request: CreateNotificationCardRequest
  ): Promise<NotificationCard> {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      this.validateNotificationRequest(request);

      const notificationCard: NotificationCard = {
        id: uuidv4(),
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

      logger.info(`✅ สร้างการ์ดแจ้งเตือนสำเร็จ: ${notificationCard.id}`);
      return notificationCard;

    } catch (error) {
      logger.error('❌ สร้างการ์ดแจ้งเตือนไม่สำเร็จ:', error);
      throw error;
    }
  }

  /**
   * ส่งการ์ดแจ้งเตือน
   */
  public async sendNotificationCard(
    notificationCard: NotificationCard
  ): Promise<NotificationCardResponse> {
    try {
      logger.info(`📤 เริ่มส่งการ์ดแจ้งเตือน: ${notificationCard.id}`);

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
            logger.info(`✅ ส่งการ์ดไปยังกลุ่ม ${groupId} สำเร็จ`);
          } catch (error) {
            errorCount++;
            logger.error(`❌ ส่งการ์ดไปยังกลุ่ม ${groupId} ไม่สำเร็จ:`, error);
          }
        }
      }

      // ส่งไปยังผู้ใช้
      if (notificationCard.targetType === 'user' || notificationCard.targetType === 'both') {
        for (const userId of notificationCard.userIds || []) {
          try {
            // ดึงข้อมูล LINE User ID จาก User ID
            const user = await this.userService.getUserById(userId);
            if (user && user.lineUserId) {
              await this.lineService.pushMessage(user.lineUserId, flexMessage);
              successCount++;
              logger.info(`✅ ส่งการ์ดไปยังผู้ใช้ ${userId} สำเร็จ`);
            } else {
              errorCount++;
              logger.warn(`⚠️ ไม่พบ LINE User ID สำหรับผู้ใช้ ${userId}`);
            }
          } catch (error) {
            errorCount++;
            logger.error(`❌ ส่งการ์ดไปยังผู้ใช้ ${userId} ไม่สำเร็จ:`, error);
          }
        }
      }

      // อัปเดตสถานะ
      const status = errorCount === 0 ? 'sent' : (successCount > 0 ? 'sent' : 'failed');
      notificationCard.status = status;
      notificationCard.sentAt = new Date();

      logger.info(`📊 ส่งการ์ดแจ้งเตือนเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${errorCount}`);

      return {
        success: successCount > 0,
        data: notificationCard,
        error: errorCount > 0 ? `ส่งสำเร็จ ${successCount} รายการ, ล้มเหลว ${errorCount} รายการ` : undefined
      };

    } catch (error) {
      logger.error('❌ ส่งการ์ดแจ้งเตือนไม่สำเร็จ:', error);
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
  public async createAndSendNotificationCard(
    request: CreateNotificationCardRequest
  ): Promise<NotificationCardResponse> {
    try {
      const notificationCard = await this.createNotificationCard(request);
      return await this.sendNotificationCard(notificationCard);
    } catch (error) {
      logger.error('❌ สร้างและส่งการ์ดแจ้งเตือนไม่สำเร็จ:', error);
      throw error;
    }
  }

  /**
   * สร้าง Flex Message สำหรับ LINE
   */
  private createFlexMessage(notificationCard: NotificationCard): any {
    const buttons = notificationCard.buttons.map(button => ({
      type: 'button',
      action: {
        type: 'postback',
        label: button.label,
        data: JSON.stringify({
          action: button.action,
          notificationId: notificationCard.id,
          buttonId: button.id,
          ...button.data
        })
      },
      style: button.style || 'primary',
      color: this.getButtonColor(button.style),
      height: 'sm'
    }));

    const flexMessage = {
      type: 'flex',
      altText: notificationCard.title,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: notificationCard.title,
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              wrap: true
            }
          ],
          backgroundColor: this.getPriorityColor(notificationCard.priority),
          paddingAll: '20px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            ...(notificationCard.description ? [{
              type: 'text',
              text: notificationCard.description,
              wrap: true,
              color: '#666666',
              size: 'sm',
              margin: 'md'
            }] : []),
            ...(notificationCard.imageUrl ? [{
              type: 'image',
              url: notificationCard.imageUrl,
              size: 'full',
              margin: 'md'
            }] : [])
          ],
          paddingAll: '20px'
        },
        ...(buttons.length > 0 && {
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: buttons,
            paddingAll: '20px'
          }
        })
      }
    };

    return flexMessage;
  }

  /**
   * ตรวจสอบความถูกต้องของข้อมูล
   */
  private validateNotificationRequest(request: CreateNotificationCardRequest): void {
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
   * ได้สีของปุ่มตามสไตล์
   */
  private getButtonColor(style?: string): string {
    switch (style) {
      case 'primary':
        return '#007AFF';
      case 'secondary':
        return '#8E8E93';
      case 'danger':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  }

  /**
   * ได้สีของหัวข้อตามความสำคัญ
   */
  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#007AFF';
    }
  }

  /**
   * สร้างปุ่มมาตรฐาน
   */
  public createStandardButtons(): NotificationButton[] {
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
  public createApprovalButtons(): NotificationButton[] {
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
