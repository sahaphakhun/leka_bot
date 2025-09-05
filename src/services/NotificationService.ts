// Notification Service - จัดการการแจ้งเตือนและอีเมล

import { LineService } from './LineService';
import { UserService } from './UserService';
import { EmailService } from './EmailService';
import { FileService } from './FileService';
import { FlexMessageTemplateService } from './FlexMessageTemplateService';
import { FlexMessageDesignSystem } from './FlexMessageDesignSystem';
import { Task, Group, User, NotificationPayload, Leaderboard } from '@/types';
import { config } from '@/utils/config';
import moment from 'moment-timezone';
import { FlexMessage } from '@line/bot-sdk';

export class NotificationService {
  private lineService: LineService;
  private userService: UserService;
  private emailService: EmailService;
  private fileService: FileService;
  private _sentNotifications: Set<string>;

  constructor() {
    this.lineService = new LineService();
    this.userService = new UserService();
    this.emailService = new EmailService();
    this.fileService = new FileService();
    this._sentNotifications = new Set();
  }

  /**
   * ส่งการเตือนงาน
   */
  public async sendTaskReminder(task: any, reminderType: string): Promise<void> {
    try {
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `task_reminder_${task.id}_${reminderType}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Task reminder notification already sent for task: ${task.id}, type: ${reminderType}`);
        return;
      }

      const group = task.group;
      if (!group) return;

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
        } catch (err) {
          console.warn('⚠️ Failed to send personal task reminder:', assignee.lineUserId, err);
        }
      }

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 1 ชั่วโมง (สำหรับการเตือน)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending task reminder:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนงานเกินกำหนด
   */
  public async sendOverdueNotification(data: { task: any; overdueHours: number }): Promise<void> {
    try {
      const { task, overdueHours } = data;
      
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `task_overdue_${task.id}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Task overdue notification already sent for task: ${task.id}`);
        return;
      }

      const group = task.group;
      if (!group) return;

      // ส่งการแจ้งเตือนส่วนตัวให้ผู้รับผิดชอบเท่านั้น (ไม่ส่งในกลุ่ม)
      const assignees = task.assignedUsers || [];
      for (const assignee of assignees) {
        try {
          const personalFlexMessage = this.createPersonalOverdueTaskFlexMessage(task, group, assignee, overdueHours);
          await this.lineService.pushMessage(assignee.lineUserId, personalFlexMessage);
          console.log(`✅ Sent personal overdue notification to: ${assignee.displayName}`);
        } catch (err) {
          console.warn('⚠️ Failed to send personal overdue notification:', assignee.lineUserId, err);
        }
      }

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 30 นาที (สำหรับการแจ้งเตือนเกินกำหนด)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 30 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending overdue notification:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนงานใหม่
   */
  public async sendTaskCreatedNotification(task: any): Promise<void> {
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

      const dueDate = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
      
      // ส่งการ์ดงานใหม่ (Flex) ไปยังกลุ่มแทนข้อความธรรมดา
      try {
        const groupFlexMessage = this.createTaskCreatedFlexMessage(task, group, creator, dueDate);
        await this.lineService.pushMessage(group.lineGroupId, groupFlexMessage);
        console.log(`✅ Sent group task created notification for task: ${task.id}`);
      } catch (err: any) {
        console.error('❌ Failed to send group task created notification:', err);
        
        // ถ้าเป็น error 400 ให้ลองส่งข้อความธรรมดา
        if (err?.statusCode === 400 || err?.status === 400) {
          try {
            const simpleMessage = `🆕 งานใหม่: ${task.title}\n📅 กำหนดส่ง: ${dueDate}\n👥 ผู้รับผิดชอบ: ${assignees.map(a => a.displayName).join(', ')}`;
            await this.lineService.pushMessage(group.lineGroupId, simpleMessage);
            console.log(`✅ Sent simple group notification for task: ${task.id}`);
          } catch (simpleErr) {
            console.error('❌ Failed to send simple group notification:', simpleErr);
            // ไม่ throw error เพื่อให้ระบบทำงานต่อได้
          }
        } else {
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
        } catch (err: any) {
          console.warn('⚠️ Failed to send personal task created notification:', assignee.lineUserId, err);
          
          // ถ้าเป็น error 400 ให้ลองส่งข้อความธรรมดา
          if (err?.statusCode === 400 || err?.status === 400) {
            try {
              const simpleMessage = `📋 งานใหม่: ${task.title}\n📅 กำหนดส่ง: ${dueDate}\n👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`;
              await this.lineService.pushMessage(assignee.lineUserId, simpleMessage);
              console.log(`✅ Sent simple personal notification to: ${assignee.displayName}`);
            } catch (simpleErr) {
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
        } catch (err: any) {
          console.warn('⚠️ Failed to send creator task created notification:', creator.lineUserId, err);
          
          // ถ้าเป็น error 400 ให้ลองส่งข้อความธรรมดา
          if (err?.statusCode === 400 || err?.status === 400) {
            try {
              const simpleMessage = `✅ สร้างงานสำเร็จ: ${task.title}\n📅 กำหนดส่ง: ${dueDate}\n👥 ผู้รับผิดชอบ: ${assignees.map(a => a.displayName).join(', ')}`;
              await this.lineService.pushMessage(creator.lineUserId, simpleMessage);
              console.log(`✅ Sent simple creator notification to: ${creator.displayName}`);
            } catch (simpleErr) {
              console.warn('⚠️ Failed to send simple creator notification:', creator.lineUserId, simpleErr);
            }
          }
        }
      }

      // ส่งอีเมลให้ผู้ที่มีอีเมล
      const reviewerId = this.getTaskReviewer(task);
      let reviewer = (task as any).reviewerUser;
      if (!reviewer && reviewerId) {
        reviewer = await this.userService.findById(reviewerId);
      }

      const allUsers = [
        ...assignees,
        ...(reviewer ? [reviewer] : []),
        ...(creator ? [creator] : []),
      ];

      const seenEmails = new Set<string>();
      const emailUsers = allUsers.filter((user: any) => {
        if (!user.email || !user.isVerified) return false;
        if (seenEmails.has(user.email)) return false;
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

    } catch (error) {
      console.error('❌ Error sending task created notification:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนงานสำเร็จ
   */
  public async sendTaskCompletedNotification(task: any, completedBy: User): Promise<void> {
    try {
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `task_completed_${task.id}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Task completed notification already sent for task: ${task.id}`);
        return;
      }

      const group = task.group;
      if (!group) return;

      // สร้าง Flex Message สำหรับงานสำเร็จ
      const flexMessage = this.createTaskCompletedFlexMessage(task, group, completedBy);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 10 นาที (สำหรับการแจ้งเตือนงานสำเร็จ)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending task completed notification:', error);
      throw error;
    }
  }

  /** แจ้งว่าลบงานแล้ว */
  public async sendTaskDeletedNotification(task: any): Promise<void> {
    try {
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `task_deleted_${task.id}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Task deleted notification already sent for task: ${task.id}`);
        return;
      }

      const group = task.group;
      if (!group) return;

      // สร้าง Flex Message สำหรับงานที่ถูกลบ
      const flexMessage = this.createTaskDeletedFlexMessage(task, group);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 5 นาที (สำหรับการแจ้งเตือนงานถูกลบ)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending task deleted notification:', error);
      throw error;
    }
  }

  /** แจ้งว่าแก้งาน/อัปเดตรายละเอียดงาน */
  public async sendTaskUpdatedNotification(task: any, changes: Record<string, any>): Promise<void> {
    try {
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `task_updated_${task.id}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Task updated notification already sent for task: ${task.id}`);
        return;
      }

      const group = task.group;
      if (!group) return;

      const changedFields: string[] = [];
      if (typeof changes.title === 'string') changedFields.push(`ชื่อเรื่อง`);
      if (typeof changes.description === 'string') changedFields.push(`คำอธิบาย`);
      if (changes.dueTime) changedFields.push(`กำหนดส่ง`);
      if (changes.startTime) changedFields.push(`เวลาเริ่ม`);
      if (changes.priority) changedFields.push(`ความสำคัญ`);
      if (Array.isArray(changes.tags)) changedFields.push(`แท็ก`);
      if (changes.status) changedFields.push(`สถานะ`);

      // สร้าง Flex Message สำหรับงานที่อัปเดต
      const flexMessage = this.createTaskUpdatedFlexMessage(task, group, changes, changedFields);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 5 นาที (สำหรับการแจ้งเตือนงานอัปเดต)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending task updated notification:', error);
      throw error;
    }
  }

  /** แจ้งว่ามีการส่งงาน (แนบไฟล์/ลิงก์) */
  public async sendTaskSubmittedNotification(
    task: any,
    submitterDisplayName: string,
    fileCount: number,
    links: string[]
  ): Promise<void> {
    try {
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `task_submitted_${task.id}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Task submitted notification already sent for task: ${task.id}`);
        return;
      }

      const group = task.group;
      if (!group?.lineGroupId) return;

      // สร้าง Flex Message สำหรับการแจ้งเตือนการส่งงาน
      const flexMessage = await this.createTaskSubmittedFlexMessage(task, group, submitterDisplayName, fileCount, links);
      
      // ส่งการแจ้งเตือนในกลุ่ม
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // แจ้งผู้ตรวจให้ตรวจงาน
      const reviewerUserId = this.getTaskReviewer(task);
      if (reviewerUserId) {
        const reviewer = await this.userService.findById(reviewerUserId);
        if (reviewer?.lineUserId) {
          // สร้างการ์ดแจ้งผู้ตรวจ
          const reviewCard = FlexMessageTemplateService.createReviewRequestCard(
            task,
            group,
            { submitterDisplayName, fileCount, links },
            moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm'),
            reviewer.lineUserId
          );
          await this.lineService.pushMessage(reviewer.lineUserId, reviewCard);
        }
      }

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 1 ชั่วโมง (สำหรับการแจ้งเตือนการส่งงาน)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending task submitted notification:', error);
    }
  }

  /**
   * สร้าง Flex Message สำหรับการแจ้งเตือนการส่งงาน
   */
  private async createTaskSubmittedFlexMessage(task: any, group: any, submitterDisplayName: string, fileCount: number, links: string[]): Promise<FlexMessage> {
    // ดึงข้อมูลไฟล์แนบเพื่อแสดงตัวอย่าง
    let files: any[] = [];
    if (fileCount > 0) {
      try {
        files = await this.fileService.getTaskFiles(task.id);
      } catch (error) {
        console.warn('ไม่สามารถดึงข้อมูลไฟล์แนบได้:', error);
      }
    }

    const content = [
      FlexMessageDesignSystem.createText('📤 มีการส่งงานใหม่', 'md', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${submitterDisplayName}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(fileCount > 0 ? [
        FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
        ...(files.length > 2 ? [
          FlexMessageDesignSystem.createText(`และอีก ${files.length - 2} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ] : [])
      ] : []),
      ...(links && links.length > 0 ? [
        FlexMessageDesignSystem.createText(`🔗 ลิงก์: ${links.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary)
      ] : []),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('📅 กำหนดตรวจภายใน: 2 วัน', 'sm', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const fileButtons = fileCount > 0
      ? files.slice(0, 2).map(file =>
          FlexMessageDesignSystem.createButton(
            `📥 ${file.originalName.substring(0, 8)}...`,
            'uri',
            this.fileService.generateDownloadUrl(group.id, file.id),
            'secondary'
          )
        )
      : [];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view`, 'primary'),
      ...(fileCount > 0 ? [
        FlexMessageDesignSystem.createButton('ดูไฟล์แนบทั้งหมด', 'postback', `action=show_task_files&taskId=${task.id}&groupId=${group.id}`, 'secondary')
      ] : []),
      ...fileButtons
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📤 การส่งงานใหม่',
      '📤',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้าง Flex Message สำหรับงานรอตรวจ
   */
  private createReviewRequestFlexMessage(task: any, group: any, details: any, dueText: string): FlexMessage {
    return FlexMessageTemplateService.createReviewRequestCard(task, group, details, dueText);
  }

  /**
   * สร้าง Flex Message สำหรับงานที่อนุมัติอัตโนมัติ
   */
  private createTaskAutoApprovedFlexMessage(task: any, group: any, viewerLineUserId?: string): FlexMessage {
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ';
    const completedDate = moment(task.completedAt).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');

    const content = [
      FlexMessageDesignSystem.createText('🤖 งานถูกอนุมัติอัตโนมัติ', 'md', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`✅ อนุมัติเมื่อ: ${completedDate}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('ระบบอนุมัติงานอัตโนมัติหลังจากครบกำหนดตรวจ 2 วัน', 'sm', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '🤖 งานถูกอนุมัติอัตโนมัติ',
      '🤖',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกปฏิเสธ
   */
  private createTaskRejectedFlexMessage(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string, viewerLineUserId?: string): FlexMessage {
    return FlexMessageTemplateService.createRejectedTaskCard(task, group, newDueTime, reviewerDisplayName, viewerLineUserId);
  }

  /**
   * สร้าง Flex Message สำหรับการอนุมัติเลื่อนเวลา
   */
  private createExtensionApprovedFlexMessage(task: any, group: any, newDueTime: Date, requesterDisplayName?: string, viewerLineUserId?: string): FlexMessage {
    return FlexMessageTemplateService.createExtensionApprovedCard(task, group, newDueTime, requesterDisplayName, viewerLineUserId);
  }

  /**
   * สร้าง Flex Message สำหรับการปฏิเสธเลื่อนเวลา
   */
  private createExtensionRejectedFlexMessage(task: any, group: any, requesterDisplayName?: string, viewerLineUserId?: string): FlexMessage {
    return FlexMessageTemplateService.createExtensionRejectedCard(task, group, requesterDisplayName, viewerLineUserId);
  }

  /**
   * สร้าง Flex Message สำหรับการเตือนงาน
   */
  private createTaskReminderFlexMessage(task: any, group: any, reminderType: string, viewerLineUserId?: string): FlexMessage {
    const reminderEmoji = this.getReminderEmoji(reminderType);
    const now = moment().tz(config.app.defaultTimezone);
    const dueMoment = moment(task.dueTime).tz(config.app.defaultTimezone);
    const remaining = moment.duration(dueMoment.diff(now));
    const remainingText = remaining.asDays() >= 1
      ? `${Math.floor(remaining.asDays())} วัน${remaining.hours() > 0 ? ` ${remaining.hours()} ชั่วโมง` : ''}`
      : `${remaining.hours()} ชั่วโมง`;
    const dueDate = dueMoment.format('DD/MM/YYYY HH:mm');
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ';

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`⏳ เหลือเวลาอีก ${remainingText}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`🎯 ${this.getPriorityText(task.priority)}`, 'sm', this.getPriorityColor(task.priority), 'bold'),
      ...(task.description ? [FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      reminderEmoji,
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้าง Flex Message สำหรับการเตือนงานส่วนบุคคล
   */
  private createPersonalTaskReminderFlexMessage(task: any, group: any, assignee: any, reminderType: string): FlexMessage {
    const reminderText = this.getReminderTimeText(reminderType);
    const reminderEmoji = this.getReminderEmoji(reminderType);
    const now = moment().tz(config.app.defaultTimezone);
    const dueMoment = moment(task.dueTime).tz(config.app.defaultTimezone);
    const remaining = moment.duration(dueMoment.diff(now));
    const remainingText = remaining.asDays() >= 1
      ? `${Math.floor(remaining.asDays())} วัน${remaining.hours() > 0 ? ` ${remaining.hours()} ชั่วโมง` : ''}`
      : `${remaining.hours()} ชั่วโมง`;
    const dueDate = dueMoment.format('DD/MM/YYYY HH:mm');

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`⏳ เหลือเวลาอีก ${remainingText}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText(`🎯 ${this.getPriorityText(task.priority)}`, 'sm', this.getPriorityColor(task.priority), 'bold'),
      ...(task.description ? [FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายละเอียด',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${assignee?.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`,
        'primary'
      ),
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?userId=${assignee?.lineUserId || ''}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      `🔔 ${reminderText}: ${task.title}`,
      reminderEmoji,
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้าง Flex Message สำหรับงานเกินกำหนด
   */
  private createOverdueTaskFlexMessage(task: any, group: any, overdueHours: number): FlexMessage {
    return FlexMessageTemplateService.createOverdueTaskCard(task, group, overdueHours);
  }

  /**
   * สร้าง Flex Message สำหรับงานเกินกำหนดส่วนบุคคล
   */
  private createPersonalOverdueTaskFlexMessage(task: any, group: any, assignee: any, overdueHours: number): FlexMessage {
    const overdueText = overdueHours < 24 
      ? `เกินกำหนด ${overdueHours} ชั่วโมง`
      : `เกินกำหนด ${Math.floor(overdueHours / 24)} วัน ${overdueHours % 24} ชั่วโมง`;

    const dueDate = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`⏰ เวลาที่เกิน: ${overdueText}`, 'sm', FlexMessageDesignSystem.colors.danger, 'bold'),
      FlexMessageDesignSystem.createText(`🎯 ${this.getPriorityText(task.priority)}`, 'sm', this.getPriorityColor(task.priority), 'bold'),
      ...(task.description ? [FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายละเอียด',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${assignee?.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`,
        'primary'
      ),
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?userId=${assignee?.lineUserId || ''}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      `🚨 งานเกินกำหนด: ${task.title}`,
      '🚨',
      FlexMessageDesignSystem.colors.danger,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้าง Flex Message สำหรับงานใหม่
   */
  private createTaskCreatedFlexMessage(task: any, group: any, creator: any, dueDate: string): FlexMessage {
    return FlexMessageTemplateService.createNewTaskCard(task, group, creator, dueDate);
  }

  /**
   * สร้าง Flex Message สำหรับงานใหม่ส่วนบุคคล
   */
  private createPersonalTaskCreatedFlexMessage(task: any, group: any, assignee: any, creator: any, dueDate: string): FlexMessage {
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ';
    const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t: string) => `#${t}`).join(' ')}` : '';
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    // ตรวจสอบว่าเกิน 1 วันหรือไม่
    const taskCreatedAt = new Date(task.createdAt);
    const oneDayLater = new Date(taskCreatedAt.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const canRequestExtension = now < oneDayLater;

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      ...(task.description ? [FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : []),
      ...(tagsText ? [FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'รายละเอียด',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${assignee?.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`,
        'primary'
      ),
      FlexMessageDesignSystem.createButton(
        'ส่งงาน',
        'uri',
        `${config.baseUrl}/dashboard/submit-tasks?userId=${assignee?.lineUserId || ''}`,
        'secondary'
      )
    ];

    // เพิ่มปุ่มขอเลื่อนเฉพาะเมื่อยังไม่เกิน 1 วัน
    if (canRequestExtension) {
      buttons.push(
        FlexMessageDesignSystem.createButton('ขอเลื่อน', 'postback', `action=request_extension&taskId=${task.id}&groupId=${group.id}`, 'secondary')
      );
    }

    return FlexMessageDesignSystem.createStandardTaskCard(
      `📋 งานใหม่: ${task.title}`,
      '📋',
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้าง Flex Message สำหรับงานใหม่ส่วนบุคคล (ผู้สร้างงาน)
   */
  private createCreatorTaskCreatedFlexMessage(task: any, group: any, creator: any, dueDate: string): FlexMessage {
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ';
    const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t: string) => `#${t}`).join(' ')}` : '';
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      ...(task.description ? [FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : []),
      ...(tagsText ? [FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'แก้ไขงาน',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=edit&userId=${creator.lineUserId}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      `📋 งานที่สร้าง: ${task.title}`,
      '📋',
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้าง Flex Message สำหรับงานสำเร็จ
   */
  private createTaskCompletedFlexMessage(task: any, group: any, completedBy: any): FlexMessage {
    return FlexMessageTemplateService.createCompletedTaskCard(task, group, completedBy);
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกลบ
   */
  private createTaskDeletedFlexMessage(task: any, group: any, viewerLineUserId?: string): FlexMessage {
    return FlexMessageTemplateService.createDeletedTaskCard(task, group, viewerLineUserId);
  }

  /**
   * สร้าง Flex Message สำหรับงานที่อัปเดต
   */
  private createTaskUpdatedFlexMessage(task: any, group: any, changes: Record<string, any>, changedFields: string[], viewerLineUserId?: string): FlexMessage {
    return FlexMessageTemplateService.createUpdatedTaskCard(task, group, changes, changedFields, viewerLineUserId);
  }

  /**
   * ดึงผู้ตรวจงาน
   */
  private getTaskReviewer(task: any): string | null {
    return task.reviewerUserId || task.createdByUserId || null;
  }

  /**
   * ส่งรายงานรายสัปดาห์
   */
  public async sendWeeklyReport(group: any, stats: any, leaderboard: any[]): Promise<void> {
    try {
      const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').format('DD/MM');
      const weekEnd = moment().tz(config.app.defaultTimezone).endOf('week').format('DD/MM');
      
      const flexMessage = this.createWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd);
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);
      
      console.log(`✅ Sent weekly report to group: ${group.name}`);
    } catch (error) {
      console.error('❌ Error sending weekly report:', error);
      throw error;
    }
  }

  /**
   * ส่งรายงานรายสัปดาห์ให้ admin
   */
  public async sendWeeklyReportToAdmins(group: any, stats: any, leaderboard: any[]): Promise<void> {
    try {
      const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').format('DD/MM');
      const weekEnd = moment().tz(config.app.defaultTimezone).endOf('week').format('DD/MM');
      
      const flexMessage = this.createAdminWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd);
      
      // ส่งให้ admin ทุกคนในกลุ่ม
      const admins = await this.userService.getGroupMembers(group.id);
      const adminUsers = admins.filter(member => member.role === 'admin');
      
      for (const admin of adminUsers) {
        if (admin.lineUserId) {
          try {
            await this.lineService.pushMessage(admin.lineUserId, flexMessage);
            console.log(`✅ Sent admin weekly report to: ${admin.displayName}`);
          } catch (err) {
            console.warn('⚠️ Failed to send admin weekly report:', admin.lineUserId, err);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending admin weekly report:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนงานที่ถูกตีกลับ
   */
  public async sendTaskRejectedNotification(task: any, reviewer: any, extensionDays: string): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      // คำนวณเวลากำหนดส่งใหม่
      const newDueTime = new Date(task.dueTime.getTime() + parseInt(extensionDays) * 24 * 60 * 60 * 1000);
      const reviewerDisplayName = reviewer?.displayName || 'ไม่ระบุ';

      const flexMessage = this.createTaskRejectedFlexMessage(task, group, newDueTime, reviewerDisplayName);
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      console.log(`✅ Sent task rejected notification for task: ${task.id}`);
    } catch (error) {
      console.error('❌ Error sending task rejected notification:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
   */
  public async sendExtensionApprovedNotification(task: any, requester: any, newDueTime: Date): Promise<void> {
    try {
      const group = task.group;
      if (!group || !requester?.lineUserId) return;

      const requesterDisplayName = requester?.displayName || 'ไม่ระบุ';
      
      const personalCard = this.createExtensionApprovedFlexMessage(task, group, newDueTime, requesterDisplayName, requester.lineUserId);
      const groupCard = this.createExtensionApprovedFlexMessage(task, group, newDueTime, requesterDisplayName);
      
      // ส่งให้ผู้ขอเลื่อนเวลา
      await this.lineService.pushMessage(requester.lineUserId, personalCard);
      
      // ส่งแจ้งในกลุ่มด้วย (ไม่แนบ userId)
      await this.lineService.pushMessage(group.lineGroupId, groupCard);

      console.log(`✅ Sent extension approved notification for task: ${task.id} to requester: ${requesterDisplayName}`);
    } catch (error) {
      console.error('❌ Error sending extension approved notification:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนการปฏิเสธเลื่อนเวลา
   */
  public async sendExtensionRejectedNotification(task: any, requester: any): Promise<void> {
    try {
      const group = task.group;
      if (!group || !requester?.lineUserId) return;

      const requesterDisplayName = requester?.displayName || 'ไม่ระบุ';
      
      const personalCard = this.createExtensionRejectedFlexMessage(task, group, requesterDisplayName, requester.lineUserId);
      const groupCard = this.createExtensionRejectedFlexMessage(task, group, requesterDisplayName);
      
      // ส่งให้ผู้ขอเลื่อนเวลา
      await this.lineService.pushMessage(requester.lineUserId, personalCard);
      
      // ส่งแจ้งในกลุ่มด้วย (ไม่แนบ userId)
      await this.lineService.pushMessage(group.lineGroupId, groupCard);

      console.log(`✅ Sent extension rejected notification for task: ${task.id} to requester: ${requesterDisplayName}`);
    } catch (error) {
      console.error('❌ Error sending extension rejected notification:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนงานที่อนุมัติอัตโนมัติ
   */
  public async sendTaskAutoApprovedNotification(task: any): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      const flexMessage = this.createTaskAutoApprovedFlexMessage(task, group);
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      console.log(`✅ Sent task auto-approved notification for task: ${task.id}`);
    } catch (error) {
      console.error('❌ Error sending task auto-approved notification:', error);
      throw error;
    }
  }

  /**
   * ส่งการขอตรวจงาน
   */
  public async sendReviewRequest(task: any, reviewerUserId: string, details: any): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      // ตรวจสอบว่า reviewerUserId เป็น LINE User ID หรือ database UUID
      let reviewer: User | null;
      if (reviewerUserId.startsWith('U')) {
        // เป็น LINE User ID
        reviewer = await this.userService.findByLineUserId(reviewerUserId);
      } else {
        // เป็น database UUID
        reviewer = await this.userService.findById(reviewerUserId);
      }

      if (!reviewer?.lineUserId) return;

      const dueText = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
      const flexMessage = this.createReviewRequestFlexMessage(task, group, details, dueText);
      
      await this.lineService.pushMessage(reviewer.lineUserId, flexMessage);
      console.log(`✅ Sent review request to: ${reviewer.displayName}`);
    } catch (error) {
      console.error('❌ Error sending review request:', error);
      throw error;
    }
  }

  /**
   * ส่งการขออนุมัติการปิดงาน
   */
  public async sendApprovalRequest(task: any, approverUserId: string, reviewer: any): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      // ตรวจสอบว่า approverUserId เป็น LINE User ID หรือ database UUID
      let approver: User | null;
      if (approverUserId.startsWith('U')) {
        // เป็น LINE User ID
        approver = await this.userService.findByLineUserId(approverUserId);
      } else {
        // เป็น database UUID
        approver = await this.userService.findById(approverUserId);
      }

      if (!approver?.lineUserId) return;

      const flexMessage = FlexMessageTemplateService.createApprovalRequestCard(task, group, reviewer, approver.lineUserId);
      
      await this.lineService.pushMessage(approver.lineUserId, flexMessage);
      console.log(`✅ Sent approval request to: ${approver.displayName}`);
    } catch (error) {
      console.error('❌ Error sending approval request:', error);
      throw error;
    }
  }

  /**
   * Helper method สำหรับข้อความเตือน
   */
  private getReminderTimeText(reminderType: string): string {
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
  private getReminderEmoji(reminderType: string): string {
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
  private getPriorityColor(priority: string): string {
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
  private getPriorityText(priority: string): string {
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
  private calculateCompletionScore(task: any): number {
    const dueTime = moment(task.dueTime).tz(config.app.defaultTimezone);
    const completedTime = moment(task.completedAt).tz(config.app.defaultTimezone);
    const diff = completedTime.diff(dueTime, 'hours');

    if (diff <= -24) return 100; // เสร็จก่อนกำหนด
    if (diff <= 24) return 90;  // เสร็จตรงเวลา
    if (diff <= 48) return 80;  // เสร็จช้าเล็กน้อย
    if (diff <= 72) return 70;  // เสร็จช้า
    return 0; // เสร็จช้ามาก
  }

  /** แจ้งผู้ตรวจว่ามีงานรอการตรวจ */
  public async sendReviewRequestNotification(
    task: any, 
    details: { submitterDisplayName?: string; fileCount?: number; links?: string[] }
  ): Promise<void> {
    try {
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `review_request_${task.id}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Review request notification already sent for task: ${task.id}`);
        return;
      }

      const group = task.group;
      if (!group) return;

      const dueText = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
      
      // สร้าง Flex Message สำหรับการขอตรวจงาน
      const flexMessage = this.createReviewRequestFlexMessage(task, group, details, dueText);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 10 นาที (สำหรับการแจ้งเตือนขอตรวจงาน)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending review request notification:', error);
      throw error;
    }
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายสัปดาห์
   */
  private createWeeklyReportFlexMessage(group: Group, stats: any, leaderboard: Leaderboard[], weekStart: string, weekEnd: string): FlexMessage {
    // จัดรูปแบบอันดับทุกคน พร้อมเหรียญ 1-3
    const medalFor = (rank: number) => {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return `${rank}️⃣`;
    };

    const leaderboardContents = leaderboard.slice(0, 10).map((user, index) => {
      const rank = index + 1;
      const medal = medalFor(rank);
      const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
      
      return FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createText(medal, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
        { ...FlexMessageDesignSystem.createText(user.displayName, 'sm', FlexMessageDesignSystem.colors.textPrimary), flex: 1 },
        { ...FlexMessageDesignSystem.createText(`${user.weeklyPoints} คะแนน`, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
        { ...FlexMessageDesignSystem.createText(trend, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 }
      ], 'small');
    });

    const content = [
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText('📈 สถิติกลุ่ม', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
        FlexMessageDesignSystem.createText(`✅ งานที่เสร็จ: ${stats.completedTasks}`, 'sm', FlexMessageDesignSystem.colors.success),
        FlexMessageDesignSystem.createText(`⏳ งานค้าง: ${stats.pendingTasks}`, 'sm', FlexMessageDesignSystem.colors.warning),
        FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks}`, 'sm', FlexMessageDesignSystem.colors.danger)
      ], 'small'),
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText('🏆 อันดับพนักงานคนขยัน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                ...leaderboardContents
      ], 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายงานฉบับเต็ม',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📊 รายงานประจำสัปดาห์',
      '📊',
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายสัปดาห์ให้ admin
   */
  private createAdminWeeklyReportFlexMessage(group: Group, stats: any, leaderboard: Leaderboard[], weekStart: string, weekEnd: string): FlexMessage {
    const leaderboardContents = leaderboard.slice(0, 5).map((user, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
      
      return FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createText(medal, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
        { ...FlexMessageDesignSystem.createText(user.displayName, 'sm', FlexMessageDesignSystem.colors.textPrimary), flex: 1 },
        { ...FlexMessageDesignSystem.createText(`${user.weeklyPoints} คะแนน`, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
        { ...FlexMessageDesignSystem.createText(trend, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 }
      ], 'small');
    });

    const content = [
      FlexMessageDesignSystem.createText(`👥 กลุ่ม: ${group.name}`, 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText('📈 สถิติกลุ่ม', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
        FlexMessageDesignSystem.createText(`✅ งานที่เสร็จ: ${stats.completedTasks}`, 'sm', FlexMessageDesignSystem.colors.success),
        FlexMessageDesignSystem.createText(`⏳ งานค้าง: ${stats.pendingTasks}`, 'sm', FlexMessageDesignSystem.colors.warning),
        FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks}`, 'sm', FlexMessageDesignSystem.colors.danger)
      ], 'small'),
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText('🏆 อันดับผู้ทำงาน (Top 5)', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
                ...leaderboardContents
      ], 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายงานฉบับเต็ม',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📊 รายงานประจำสัปดาห์',
      '📊',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายวัน
   */
  private createDailyReportFlexMessage(group: any, tasks: any[], timezone: string): any {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    const date = moment().tz(timezone).format('DD/MM/YYYY');

    return FlexMessageTemplateService.createDailySummaryCard(group, tasks, timezone);
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายวันส่วนบุคคล
   */
  private createPersonalDailyReportFlexMessage(assignee: any, tasks: any[], timezone: string, group?: any): any {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    const header = `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`;
    const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;

    return FlexMessageTemplateService.createPersonalReportCard(assignee, tasks, timezone, group);
  }

  /**
   * สร้าง Flex Message สำหรับรายงานผู้จัดการ
   */
  private createManagerDailyReportFlexMessage(group: any, stats: any, timezone: string): any {
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    
    const content = [
      { ...FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📋 งานทั้งหมด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.totalTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.textPrimary, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('✅ เสร็จแล้ว', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.completedTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.success, 'bold')
        ]), flex: 1 }
      ]),
      FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('⚠️ เกินกำหนด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.overdueTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.danger, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📝 รอตรวจ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.pendingReviewTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.warning, 'bold')
        ]), flex: 1 }
      ])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดู Dashboard',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📊 รายงานผู้จัดการ',
      '📊',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้าง Flex Message สำหรับรายงานหัวหน้างาน
   */
  private createSupervisorWeeklyReportFlexMessage(group: any, stats: any, timezone: string): any {
    const weekStart = moment().tz(timezone).startOf('week').format('DD/MM');
    const weekEnd = moment().tz(timezone).endOf('week').format('DD/MM');
    
    const content = [
      { ...FlexMessageDesignSystem.createText(`📅 สัปดาห์ ${weekStart} - ${weekEnd}`, 'sm', FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createText('📋 สรุปงานของผู้ใต้บังคับบัญชา', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText(`👥 สมาชิกทั้งหมด: ${stats.totalMembers || 0} คน`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
        FlexMessageDesignSystem.createText(`📊 งานเสร็จแล้ว: ${stats.completedTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.success),
        FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.danger),
        FlexMessageDesignSystem.createText(`📝 งานรอตรวจ: ${stats.pendingReviewTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.warning)
      ], 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดู Dashboard',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📊 รายงานหัวหน้างาน',
      '📊',
      FlexMessageDesignSystem.colors.neutral,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวัน
   */
  public async sendDailyOverdueSummary(): Promise<void> {
    try {
      console.log('🕐 Starting daily overdue tasks summary...');
      
      // ใช้ TaskService เพื่อดึงข้อมูล
      const taskService = new (await import('./TaskService')).TaskService();
      
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
          const tasksByAssignee = new Map<string, any[]>();
          
          for (const task of overdueTasks) {
            const assignees = task.assignedUsers || [];
            for (const assignee of assignees) {
              if (!tasksByAssignee.has(assignee.id)) {
                tasksByAssignee.set(assignee.id, []);
              }
              tasksByAssignee.get(assignee.id)!.push(task);
            }
          }
          
          // ส่งการแจ้งเตือนรวมให้ผู้ใช้แต่ละคน
          for (const [assigneeId, tasks] of tasksByAssignee) {
            try {
              const assignee = await this.userService.findById(assigneeId);
              if (!assignee || !assignee.lineUserId) continue;
              
              // สร้างการ์ดรวมงานเกินกำหนด
              const tz = group.timezone || config.app.defaultTimezone;
              // คำนวณชั่วโมงที่เกินกำหนดเฉลี่ย
              const avgOverdueHours = Math.round(tasks.reduce((sum, t) => sum + moment().diff(moment(t.dueTime), 'hours'), 0) / tasks.length);
              const summaryCard = FlexMessageTemplateService.createOverdueTaskCard(assignee, tasks[0], avgOverdueHours);
              
              // ส่งการแจ้งเตือนส่วนตัว
              await this.lineService.pushMessage(assignee.lineUserId, summaryCard);
              console.log(`✅ Sent daily overdue summary to: ${assignee.displayName} (${tasks.length} tasks)`);
              
            } catch (err) {
              console.warn('⚠️ Failed to send daily overdue summary to assignee:', assigneeId, err);
            }
          }
          
          // ไม่ส่งการแจ้งเตือนงานเกินกำหนดลงกลุ่ม (ส่งเฉพาะส่วนตัว)
          console.log(`ℹ️ Skipped sending overdue summary to group: ${group.name} (${overdueTasks.length} tasks) - only personal notifications`);
          
        } catch (err) {
          console.warn('⚠️ Failed to process group for daily overdue summary:', group.id, err);
        }
      }
      
      console.log('✅ Daily overdue tasks summary completed');
      
    } catch (error) {
      console.error('❌ Error sending daily overdue summary:', error);
      throw error;
    }
  }
}