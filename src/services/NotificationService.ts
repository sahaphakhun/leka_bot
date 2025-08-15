// Notification Service - จัดการการแจ้งเตือนและอีเมล

import { LineService } from './LineService';
import { UserService } from './UserService';
import { EmailService } from './EmailService';
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
  private _sentNotifications: Set<string>;

  constructor() {
    this.lineService = new LineService();
    this.userService = new UserService();
    this.emailService = new EmailService();
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

      // สร้างข้อความสรุปสำหรับส่งในกลุ่ม
      const summaryMessage = this.createTaskReminderSummaryMessage(task, group, reminderType);
      await this.lineService.pushMessage(group.lineGroupId, summaryMessage);

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

      // สร้าง Flex Message สำหรับงานเกินกำหนด (ส่งเฉพาะการ์ด ไม่ส่งข้อความธรรมดา)
      const flexMessage = this.createOverdueTaskFlexMessage(task, group, overdueHours);
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // ส่งการแจ้งเตือนส่วนตัวให้ผู้รับผิดชอบ
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

      if (!group || assignees.length === 0) return;

      const dueDate = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
      
      // ส่งการ์ดงานใหม่ (Flex) ไปยังกลุ่มแทนข้อความธรรมดา
      const groupFlexMessage = this.createTaskCreatedFlexMessage(task, group, creator, dueDate);
      await this.lineService.pushMessage(group.lineGroupId, groupFlexMessage);

      // ส่งการ์ดงานต่างๆ ของแต่ละงานเข้าไลน์ส่วนตัว
      for (const assignee of assignees) {
        try {
          const personalFlexMessage = this.createPersonalTaskCreatedFlexMessage(task, group, assignee, creator, dueDate);
          await this.lineService.pushMessage(assignee.lineUserId, personalFlexMessage);
          console.log(`✅ Sent personal task created notification to: ${assignee.displayName}`);
        } catch (err) {
          console.warn('⚠️ Failed to send personal task created notification:', assignee.lineUserId, err);
        }
      }

      // ส่งอีเมลให้ผู้ที่มีอีเมล
      const emailUsers = assignees.filter((user: any) => user.email && user.isVerified);
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
      if (!group) return;

      // สร้าง Flex Message สำหรับการส่งงาน
      const flexMessage = this.createTaskSubmittedFlexMessage(task, group, submitterDisplayName, fileCount, links);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 5 นาที (สำหรับการแจ้งเตือนการส่งงาน)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending task submitted notification:', error);
      throw error;
    }
  }

  /** แจ้งผู้ตรวจให้ตรวจงานภายใน 2 วัน พร้อมสรุปไฟล์/ลิงก์ */
  public async sendReviewRequest(
    task: any,
    reviewerLineUserId: string,
    details: { submitterDisplayName?: string; fileCount?: number; links?: string[] }
  ): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      const dueText = task.workflow?.review?.reviewDueAt
        ? moment(task.workflow.review.reviewDueAt).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')
        : moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');

      const messageToReviewer = `📝 มีการส่งงานรอตรวจ

📋 ${task.title}
${details.submitterDisplayName ? `👤 ผู้ส่ง: ${details.submitterDisplayName}\n` : ''}${typeof details.fileCount === 'number' ? `📎 ไฟล์: ${details.fileCount} รายการ\n` : ''}📅 กำหนดตรวจภายใน: ${dueText}

ตอบในแชทกลุ่ม: /approve ${task.id.substring(0, 8)} หรือ /reject ${task.id.substring(0, 8)} [เหตุผล]`;

      // แจ้งแบบส่วนตัวไปยังผู้ตรวจ
      await this.lineService.pushMessage(reviewerLineUserId, messageToReviewer);

      // สร้าง Flex Message สำหรับงานรอตรวจ
      const flexMessage = this.createReviewRequestFlexMessage(task, group, details, dueText);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

    } catch (error) {
      console.error('❌ Error sending review request:', error);
      throw error;
    }
  }

  /** แจ้งว่าถูกตีกลับ พร้อมกำหนดส่งใหม่ */
  public async sendTaskRejectedNotification(
    task: any, 
    newDueTime: Date, 
    reviewerDisplayName?: string
  ): Promise<void> {
    try {
      // ตรวจสอบว่าส่งการแจ้งเตือนไปแล้วหรือไม่
      const notificationKey = `task_rejected_${task.id}`;
      if (this._sentNotifications.has(notificationKey)) {
        console.log(`⚠️ Task rejected notification already sent for task: ${task.id}`);
        return;
      }

      const group = task.group;
      if (!group) return;

      // สร้าง Flex Message สำหรับงานที่ถูกปฏิเสธ
      const flexMessage = this.createTaskRejectedFlexMessage(task, group, newDueTime, reviewerDisplayName);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // บันทึกว่าส่งการแจ้งเตือนแล้ว
      this._sentNotifications.add(notificationKey);
      
      // ลบออกหลังจาก 10 นาที (สำหรับการแจ้งเตือนงานถูกปฏิเสธ)
      setTimeout(() => {
        this._sentNotifications.delete(notificationKey);
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error sending task rejected notification:', error);
      throw error;
    }
  }

  /**
   * ส่งรายงานรายสัปดาห์
   */
  public async sendWeeklyReport(
    group: Group, 
    stats: any, 
    leaderboard: Leaderboard[]
  ): Promise<void> {
    try {
      if (!group.settings.enableLeaderboard) return;

      const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').format('DD/MM');
      const weekEnd = moment().tz(config.app.defaultTimezone).endOf('week').format('DD/MM');

      // สร้าง Flex Message สำหรับรายงานรายสัปดาห์
      const flexMessage = this.createWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd);
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

    } catch (error) {
      console.error('❌ Error sending weekly report:', error);
      throw error;
    }
  }

  /** ส่งรายงานรายสัปดาห์ให้ผู้ดูแลกลุ่ม (หัวหน้าทีม) แบบการ์ดส่วนตัว */
  public async sendWeeklyReportToAdmins(
    group: Group,
    stats: any,
    leaderboard: Leaderboard[]
  ): Promise<void> {
    try {
      // ดึงสมาชิกกลุ่มเพื่อหา admin
      const members = await this.userService.getGroupMembers(group.lineGroupId);
      const admins = members.filter(m => m.role === 'admin');
      if (admins.length === 0) return;

      const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').format('DD/MM');
      const weekEnd = moment().tz(config.app.defaultTimezone).endOf('week').format('DD/MM');

      // สร้าง Flex Message สำหรับรายงานรายสัปดาห์ให้ admin
      const flexMessage = this.createAdminWeeklyReportFlexMessage(group, stats, leaderboard, weekStart, weekEnd);

      for (const admin of admins) {
        try {
          await this.lineService.pushMessage(admin.lineUserId, flexMessage);
        } catch (err) {
          console.warn('⚠️ Failed to send weekly report to admin:', admin.displayName, err);
        }
      }
    } catch (error) {
      console.error('❌ Error sending weekly report to admins:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนทั่วไป
   */
  public async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      console.log('📬 Sending notification:', payload.type);

      switch (payload.type) {
        case 'task_created':
          await this.sendTaskCreatedNotification(payload.data);
          break;

        case 'task_reminder':
          await this.sendTaskReminder(payload.data.task, payload.data.reminderType);
          break;

        case 'task_overdue':
          await this.sendOverdueNotification(payload.data);
          break;

        case 'task_completed':
          await this.sendTaskCompletedNotification(payload.data.task, payload.data.completedBy);
          break;

        case 'weekly_summary':
          await this.sendWeeklyReport(payload.data.group, payload.data.stats, payload.data.leaderboard);
          break;

        default:
          console.warn('⚠️ Unknown notification type:', payload.type);
      }

    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * สร้างข้อความเตือน
   */
  private createReminderMessage(task: any, reminderType: string): string {
    const dueTime = moment(task.dueTime).tz(task.group.timezone || config.app.defaultTimezone);
    const now = moment().tz(task.group.timezone || config.app.defaultTimezone);
    const timeDiff = dueTime.diff(now);
    const duration = moment.duration(timeDiff);

    let timeText = '';
    let emoji = '🔔';

    switch (reminderType) {
      case 'P7D':
      case '7d':
        timeText = 'อีก 7 วัน';
        emoji = '📅';
        break;
      case 'P1D':
      case '1d':
        timeText = 'พรุ่งนี้';
        emoji = '⏰';
        break;
      case 'PT3H':
      case '3h':
        timeText = 'อีก 3 ชั่วโมง';
        emoji = '⚡';
        break;
      case 'daily_8am':
        timeText = 'เตือนความจำตอนเช้า 08:00 น.';
        emoji = '🌅';
        break;
      case 'due':
        timeText = 'ถึงเวลาแล้ว';
        emoji = '🚨';
        break;
      default:
        if (duration.asDays() >= 1) {
          timeText = `อีก ${Math.floor(duration.asDays())} วัน`;
        } else if (duration.asHours() >= 1) {
          timeText = `อีก ${Math.floor(duration.asHours())} ชั่วโมง`;
        } else {
          timeText = `อีก ${Math.floor(duration.asMinutes())} นาที`;
        }
    }

    const assignees = task.assignedUsers || [];
    const assigneeNames = assignees.map((u: any) => `@${u.displayName}`).join(' ');

    return `${emoji} **เตือนงาน - ${timeText}**

📋 ${task.title}
📅 กำหนดส่ง: ${dueTime.format('DD/MM/YYYY HH:mm')}
👥 ผู้รับผิดชอบ: ${assigneeNames}

${task.description ? `📝 ${task.description}\n` : ''}${task.tags && task.tags.length > 0 ? `🏷️ ${task.tags.map((tag: string) => `#${tag}`).join(' ')}\n` : ''}
📊 ดูรายละเอียดที่: ${config.baseUrl}/dashboard`;
  }

  /**
   * ได้รับอิโมจิสถานะการทำงาน
   */
  private getCompletionStatusEmoji(task: any): string {
    const dueTime = moment(task.dueTime).tz(config.app.defaultTimezone);
    const completedTime = moment(task.completedAt).tz(config.app.defaultTimezone);
    const diff = completedTime.diff(dueTime, 'hours');

    if (diff <= -24) return '🎯'; // เสร็จก่อนกำหนด
    if (diff <= 24) return '✨';  // เสร็จตรงเวลา
    return '⚠️'; // เสร็จช้า
  }

  /**
   * ได้รับข้อความสถานะการทำงาน
   */
  private getCompletionStatusText(task: any): string {
    const dueTime = moment(task.dueTime).tz(config.app.defaultTimezone);
    const completedTime = moment(task.completedAt).tz(config.app.defaultTimezone);
    const diff = completedTime.diff(dueTime, 'hours');

    if (diff <= -24) return 'เสร็จก่อนกำหนด - ยอดเยี่ยม! 🎉';
    if (diff <= 24) return 'เสร็จตรงเวลา - ดีมาก! 👍';
    return `เสร็จช้า ${Math.abs(diff)} ชั่วโมง`;
  }

  // Helper Methods สำหรับสร้าง Flex Message

  /**
   * สร้าง Flex Message สำหรับงานใหม่
   */
  private createTaskCreatedFlexMessage(task: any, group: any, creator: any, dueDate: string): any {
    return FlexMessageTemplateService.createNewTaskCard(task, group, creator, dueDate);
  }

  /**
   * สร้าง Flex Message ส่วนตัวสำหรับการแจ้งเตือนงานใหม่
   */
  private createPersonalTaskCreatedFlexMessage(task: any, group: any, assignee: any, creator: any, dueDate: string): any {
    const baseMessage = FlexMessageTemplateService.createNewTaskCard(task, group, creator, dueDate);
    
    // เพิ่มปุ่มสำหรับผู้รับผิดชอบ
    baseMessage.contents.footer.contents.push(
      FlexMessageDesignSystem.createButton('เสร็จแล้ว', 'postback', `action=complete_task&taskId=${task.id}`, 'primary')
    );

    return baseMessage;
  }

  /**
   * สร้าง Flex Message สำหรับเตือนงานตามประเภท
   */
  private createTaskReminderFlexMessage(task: any, group: any, reminderType: string): any {
    const reminderInfo = this.createReminderMessage(task, reminderType);
    const timeText = this.getReminderTimeText(reminderType);
    const emoji = this.getReminderEmoji(reminderType);
    const priorityColors = {
      low: '#28A745',
      medium: '#FFC107', 
      high: '#DC3545'
    };

    const priorityText = {
      low: 'ต่ำ',
      medium: 'ปานกลาง',
      high: 'สูง'
    };

    const content = [
      FlexMessageDesignSystem.createText(task.title, 'lg', FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
      FlexMessageDesignSystem.createText(task.description || 'ไม่มีคำอธิบาย', 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true),
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createBox('horizontal', [
        FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📅 กำหนดส่ง', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(
            moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm'),
            'sm',
            FlexMessageDesignSystem.colors.textPrimary,
            'bold'
          )
        ]),
        FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('🎯 ความสำคัญ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(
            priorityText[task.priority as keyof typeof priorityText] || 'ไม่ระบุ',
            'sm',
            priorityColors[task.priority as keyof typeof priorityColors] || FlexMessageDesignSystem.colors.textSecondary,
            'bold'
          )
        ])
      ])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายละเอียด',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      `${emoji} เตือนงาน - ${timeText}`,
      emoji,
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้างข้อความสรุปการเตือนงานสำหรับส่งในกลุ่ม
   */
  private createTaskReminderSummaryMessage(task: any, group: any, reminderType: string): string {
    const timeText = this.getReminderTimeText(reminderType);
    const dueDate = moment(task.dueTime).tz(group.timezone || config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    
    let message = `⏰ ${timeText}\n\n`;
    message += `📋 ${task.title}\n`;
    message += `📅 กำหนดส่ง: ${dueDate}\n`;
    message += `👥 ผู้รับผิดชอบ: ${task.assignedUsers?.map((u: any) => `@${u.displayName}`).join(' ') || 'ไม่ระบุ'}\n`;
    message += `🏠 กลุ่ม: ${group.name}\n\n`;
    message += `💡 ดูรายละเอียดการ์ดงานได้จากการแจ้งเตือนส่วนตัวที่ส่งให้แต่ละคน`;

    return message;
  }

  /**
   * สร้างการ์ดงานส่วนบุคคลสำหรับการเตือนงาน
   */
  private createPersonalTaskReminderFlexMessage(task: any, group: any, assignee: any, reminderType: string): any {
    const baseMessage = this.createTaskReminderFlexMessage(task, group, reminderType);
    
    // เพิ่มปุ่มสำหรับผู้รับผิดชอบ
    baseMessage.contents.footer.contents.push(
      FlexMessageDesignSystem.createButton('เสร็จแล้ว', 'postback', `action=complete_task&taskId=${task.id}`, 'primary')
    );

    return baseMessage;
  }

  /**
   * สร้าง Flex Message สำหรับงานเกินกำหนด
   */
  private createOverdueTaskFlexMessage(task: any, group: any, overdueHours: number): any {
    return FlexMessageTemplateService.createOverdueTaskCard(task, group, overdueHours);
  }

  /**
   * สร้างการ์ดงานส่วนบุคคลสำหรับงานเกินกำหนดที่ส่งในกลุ่ม
   */
  private createPersonalOverdueTaskFlexMessage(task: any, group: any, assignee: any, overdueHours: number): any {
    const baseMessage = this.createOverdueTaskFlexMessage(task, group, overdueHours);
    
    // เพิ่มปุ่มสำหรับผู้รับผิดชอบ
    baseMessage.contents.footer.contents.push(
      FlexMessageDesignSystem.createButton('เสร็จแล้ว', 'postback', `action=complete_task&taskId=${task.id}`, 'primary')
    );

    return baseMessage;
  }

  /**
   * สร้าง Flex Message สำหรับงานสำเร็จ
   */
  private createTaskCompletedFlexMessage(task: any, group: any, completedBy: User): FlexMessage {
    return FlexMessageTemplateService.createCompletedTaskCard(task, group, completedBy);
  }

  /**
   * สร้าง Flex Message สำหรับงานที่อัปเดต
   */
  private createTaskUpdatedFlexMessage(task: any, group: any, changes: Record<string, any>, changedFields: string[]): FlexMessage {
    return FlexMessageTemplateService.createUpdatedTaskCard(task, group, changes, changedFields);
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกลบ
   */
  private createTaskDeletedFlexMessage(task: any, group: any): FlexMessage {
    return FlexMessageTemplateService.createDeletedTaskCard(task, group);
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกส่ง
   */
  private createTaskSubmittedFlexMessage(task: any, group: any, submitterDisplayName: string, fileCount: number, links: string[]): FlexMessage {
    return FlexMessageTemplateService.createSubmittedTaskCard(task, group, submitterDisplayName, fileCount, links);
  }

  /**
   * สร้าง Flex Message สำหรับงานรอตรวจ
   */
  private createReviewRequestFlexMessage(task: any, group: any, details: any, dueText: string): any {
    return FlexMessageTemplateService.createReviewRequestCard(task, group, details, dueText);
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกตีกลับ
   */
  private createTaskRejectedFlexMessage(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string): any {
    return FlexMessageTemplateService.createRejectedTaskCard(task, group, newDueTime, reviewerDisplayName);
  }

  /**
   * Helper method สำหรับข้อความเตือน
   */
  private getReminderTimeText(reminderType: string): string {
    switch (reminderType) {
      case 'P7D':
      case '7d':
        return 'อีก 7 วัน';
      case 'P1D':
      case '1d':
        return 'พรุ่งนี้';
      case 'PT3H':
      case '3h':
        return 'อีก 3 ชั่วโมง';
      case 'daily_8am':
        return 'เตือนความจำตอนเช้า 08:00 น.';
      case 'due':
        return 'ถึงเวลาแล้ว';
      default:
        return 'เตือนความจำ';
    }
  }

  /**
   * Helper method สำหรับอิโมจิเตือน
   */
  private getReminderEmoji(reminderType: string): string {
    switch (reminderType) {
      case 'P7D':
      case '7d':
        return '📅';
      case 'P1D':
      case '1d':
        return '⏰';
      case 'PT3H':
      case '3h':
        return '⚡';
      case 'daily_8am':
        return '🌅';
      case 'due':
        return '🚨';
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

  /**
   * สร้างข้อความสรุปสำหรับงานใหม่ที่ส่งในกลุ่ม
   */
  private createTaskCreatedSummaryMessage(task: any, group: any, creator: any, dueDate: string): string {
    const assignees = task.assignedUsers || [];
    const assigneeNames = assignees.map((u: any) => `@${u.displayName}`).join(' ');

    let message = `📋 งานใหม่!

**${task.title}**
${task.description ? `📝 ${task.description}\n` : ''}📅 กำหนดส่ง: ${dueDate}
👤 สร้างโดย: ${creator?.displayName || 'ไม่ทราบ'}
👥 ผู้รับผิดชอบ: ${assigneeNames}

${task.tags && task.tags.length > 0 ? `🏷️ ${task.tags.map((tag: string) => `#${tag}`).join(' ')}\n` : ''}
📊 ดูรายละเอียดที่: ${config.baseUrl}/dashboard?groupId=${group.lineGroupId}`;

    return message;
  }

  /**
   * สร้างข้อความสรุปสำหรับงานเกินกำหนดที่ส่งในกลุ่ม
   */
  private createOverdueTaskSummaryMessage(task: any, group: any, overdueHours: number): string {
    const dueDate = moment(task.dueTime).tz(group.timezone || config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    const overdueText = overdueHours < 24 
      ? `เกินกำหนด ${overdueHours} ชั่วโมง`
      : `เกินกำหนด ${Math.floor(overdueHours / 24)} วัน ${overdueHours % 24} ชั่วโมง`;

    let message = `🚨 งานเกินกำหนด!\n\n`;
    message += `📋 ${task.title}\n`;
    message += `📅 กำหนดส่ง: ${dueDate}\n`;
    message += `⏰ เกินมา: ${overdueText}\n`;
    message += `👥 ผู้รับผิดชอบ: ${task.assignedUsers?.map((u: any) => `@${u.displayName}`).join(' ') || 'ไม่ระบุ'}\n`;
    message += `🏠 กลุ่ม: ${group.name}\n\n`;
    message += `💡 ดูรายละเอียดการ์ดงานได้จากการแจ้งเตือนส่วนตัวที่ส่งให้แต่ละคน`;

    return message;
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
  private createPersonalDailyReportFlexMessage(assignee: any, tasks: any[], timezone: string): any {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    const header = `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`;
    const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;

    return FlexMessageTemplateService.createPersonalReportCard(assignee, tasks, timezone);


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
}