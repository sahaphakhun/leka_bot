// Notification Service - จัดการการแจ้งเตือนและอีเมล

import { LineService } from './LineService';
import { UserService } from './UserService';
import { EmailService } from './EmailService';
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

      // สร้าง Flex Message สำหรับงานเกินกำหนด
      const flexMessage = this.createOverdueTaskFlexMessage(task, group, overdueHours);
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // สร้างข้อความสรุปสำหรับส่งในกลุ่ม
      const summaryMessage = this.createOverdueTaskSummaryMessage(task, group, overdueHours);
      await this.lineService.pushMessage(group.lineGroupId, summaryMessage);

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
      
      // สร้างข้อความสรุปสำหรับส่งในกลุ่ม
      const summaryMessage = this.createTaskCreatedSummaryMessage(task, group, creator, dueDate);
      await this.lineService.pushMessage(group.lineGroupId, summaryMessage);

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

    const tags = task.tags && task.tags.length > 0 
      ? task.tags.map((tag: string) => `#${tag}`).join(' ')
      : 'ไม่มีแท็ก';

    return {
      type: 'flex',
      altText: `📋 งานใหม่: ${task.title}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📋 งานใหม่',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#1DB446',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: task.description || 'ไม่มีคำอธิบาย',
              size: 'sm',
              color: '#666666',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '📅 กำหนดส่ง',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: dueDate,
                      size: 'sm',
                      weight: 'bold'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '🎯 ความสำคัญ',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: priorityText[task.priority as keyof typeof priorityText] || 'ไม่ระบุ',
                      size: 'sm',
                      weight: 'bold',
                      color: priorityColors[task.priority as keyof typeof priorityColors] || '#666666'
                    }
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '👤 ผู้สร้าง',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: creator?.displayName || 'ไม่ระบุ',
                      size: 'sm',
                      weight: 'bold'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '🏷️ แท็ก',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: tags,
                      size: 'sm',
                      weight: 'bold'
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียด',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`
              }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message ส่วนตัวสำหรับการแจ้งเตือนงานใหม่
   */
  private createPersonalTaskCreatedFlexMessage(task: any, group: any, assignee: any, creator: any, dueDate: string): any {
    const baseMessage = this.createTaskCreatedFlexMessage(task, group, creator, dueDate);
    
    // เพิ่มปุ่มสำหรับผู้รับผิดชอบ
    baseMessage.contents.footer.contents.push(
      {
        type: 'button',
        style: 'secondary',
        action: {
          type: 'postback',
          label: 'รับงาน',
          data: `action=accept_task&taskId=${task.id}`
        }
      },
      {
        type: 'button',
        style: 'primary',
        action: {
          type: 'postback',
          label: 'เสร็จแล้ว',
          data: `action=complete_task&taskId=${task.id}`
        }
      }
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

    return {
      type: 'flex',
      altText: `${emoji} เตือนงาน: ${task.title}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${emoji} เตือนงาน - ${timeText}`,
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#FF9800',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: task.description || 'ไม่มีคำอธิบาย',
              size: 'sm',
              color: '#666666',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '📅 กำหนดส่ง',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm'),
                      size: 'sm',
                      weight: 'bold'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '🎯 ความสำคัญ',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: priorityText[task.priority as keyof typeof priorityText] || 'ไม่ระบุ',
                      size: 'sm',
                      weight: 'bold',
                      color: priorityColors[task.priority as keyof typeof priorityColors] || '#666666'
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียด',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`
              }
            }
          ]
        }
      }
    };
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
      {
        type: 'button',
        style: 'secondary',
        action: {
          type: 'postback',
          label: 'รับงาน',
          data: `action=accept_task&taskId=${task.id}`
        }
      },
      {
        type: 'button',
        style: 'primary',
        action: {
          type: 'postback',
          label: 'เสร็จแล้ว',
          data: `action=complete_task&taskId=${task.id}`
        }
      }
    );

    return baseMessage;
  }

  /**
   * สร้าง Flex Message สำหรับงานเกินกำหนด
   */
  private createOverdueTaskFlexMessage(task: any, group: any, overdueHours: number): any {
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

    const overdueText = overdueHours < 24 
      ? `เกินกำหนด ${overdueHours} ชั่วโมง`
      : `เกินกำหนด ${Math.floor(overdueHours / 24)} วัน ${overdueHours % 24} ชั่วโมง`;

    return {
      type: 'flex',
      altText: `🚨 งานเกินกำหนด: ${task.title}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🚨 งานเกินกำหนด',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#DC3545',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: task.description || 'ไม่มีคำอธิบาย',
              size: 'sm',
              color: '#666666',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '⏰ เวลาที่เกิน',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: overdueText,
                      size: 'sm',
                      weight: 'bold',
                      color: '#DC3545'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '🎯 ความสำคัญ',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: priorityText[task.priority as keyof typeof priorityText] || 'ไม่ระบุ',
                      size: 'sm',
                      weight: 'bold',
                      color: priorityColors[task.priority as keyof typeof priorityColors] || '#666666'
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูงาน',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`
              }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้างการ์ดงานส่วนบุคคลสำหรับงานเกินกำหนดที่ส่งในกลุ่ม
   */
  private createPersonalOverdueTaskFlexMessage(task: any, group: any, assignee: any, overdueHours: number): any {
    const baseMessage = this.createOverdueTaskFlexMessage(task, group, overdueHours);
    
    // เพิ่มปุ่มสำหรับผู้รับผิดชอบ
    baseMessage.contents.footer.contents.push(
      {
        type: 'button',
        style: 'primary',
        action: {
          type: 'postback',
          label: 'เสร็จแล้ว',
          data: `action=complete_task&taskId=${task.id}`
        }
      },
      {
        type: 'button',
        style: 'secondary',
        action: {
          type: 'postback',
          label: 'ขอขยายเวลา',
          data: `action=request_extension&taskId=${task.id}`
        }
      }
    );

    return baseMessage;
  }

  /**
   * สร้าง Flex Message สำหรับงานสำเร็จ
   */
  private createTaskCompletedFlexMessage(task: any, group: any, completedBy: User): FlexMessage {
    const completionStatus = this.getCompletionStatusEmoji(task);
    const completionText = this.getCompletionStatusText(task);
    const completionScore = this.calculateCompletionScore(task);
    const scoreColor = completionScore >= 90 ? '#4CAF50' : completionScore >= 70 ? '#FF9800' : '#F44336';

    return {
      type: 'flex',
      altText: `งานสำเร็จ: ${task.title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '✅ งานสำเร็จ!', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: '#4CAF50'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `👤 ปิดงานโดย: ${completedBy.displayName}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `🎯 เสร็จเมื่อ: ${moment(task.completedAt).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `${completionStatus} ${completionText}`, size: 'sm' as const, color: '#666666', weight: 'bold' as const },
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              contents: [
                { type: 'text' as const, text: 'คะแนน:', size: 'sm' as const, color: '#666666' },
                { type: 'text' as const, text: `${completionScore}/100`, size: 'sm' as const, color: scoreColor, weight: 'bold' as const }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียด',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`
              }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานที่อัปเดต
   */
  private createTaskUpdatedFlexMessage(task: any, group: any, changes: Record<string, any>, changedFields: string[]): FlexMessage {
    const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
    const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t: string) => `#${t}`).join(' ')}` : '';
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ');
    const headerEmoji = changes.status ? (changes.status === 'cancelled' ? '🚫' : '🔄') : '✏️';
    const headerColor = changes.status === 'cancelled' ? '#9E9E9E' : '#2196F3';
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    return {
      type: 'flex',
      altText: `อัปเดตงาน: ${task.title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: `${headerEmoji} อัปเดตงาน`, weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: headerColor
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `📅 กำหนดส่ง: ${dueText}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `👥 ผู้รับผิดชอบ: ${assigneeNames}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            ...(tagsText ? [{ type: 'text' as const, text: tagsText, size: 'sm' as const, color: '#666666' }] : []),
            ...(changedFields.length > 0 ? [{ type: 'text' as const, text: `🔧 เปลี่ยนแปลง: ${changedFields.join(', ')}`, size: 'sm' as const, color: '#FF9800', weight: 'bold' as const }] : [])
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: { type: 'uri', label: 'ดูรายละเอียด', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'ดูประวัติ', data: `action=history&taskId=${task.id}` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกลบ
   */
  private createTaskDeletedFlexMessage(task: any, group: any): FlexMessage {
    const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ');
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    return {
      type: 'flex',
      altText: `ลบงาน: ${task.title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '🗑️ ลบงานแล้ว', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: '#9E9E9E'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `📅 กำหนดส่ง: ${dueText}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `👥 ผู้รับผิดชอบ: ${assigneeNames}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            { type: 'text' as const, text: '⚠️ งานนี้ถูกลบออกจากระบบแล้ว', size: 'sm' as const, color: '#F44336', weight: 'bold' as const }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'uri', label: 'ดูประวัติ', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกส่ง
   */
  private createTaskSubmittedFlexMessage(task: any, group: any, submitterDisplayName: string, fileCount: number, links: string[]): FlexMessage {
    const linksText = (links && links.length > 0) ? `\n🔗 ลิงก์: \n${links.map(l => `• ${l}`).join('\n')}` : '';
    const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ');
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    return {
      type: 'flex',
      altText: `ส่งงาน: ${task.title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '📎 มีการส่งงาน', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: '#9C27B0'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `👤 ผู้ส่ง: ${submitterDisplayName}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `📎 ไฟล์/รายการ: ${fileCount}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `📅 กำหนดส่ง: ${dueText}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `👥 ผู้รับผิดชอบ: ${assigneeNames}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            ...(links && links.length > 0 ? [{ type: 'text' as const, text: `🔗 ลิงก์: ${links.join(' ')}`, size: 'sm' as const, color: '#666666', wrap: true }] : [])
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูงาน',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`
              }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานรอตรวจ
   */
  private createReviewRequestFlexMessage(task: any, group: any, details: any, dueText: string): any {
    const submitterName = details.submitterDisplayName || 'ไม่ระบุ';
    const fileCount = details.fileCount || 0;
    const links = details.links || [];

    return {
      type: 'flex',
      altText: `📝 งานรอตรวจ: ${task.title}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📝 งานรอตรวจ',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#2196F3',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: task.description || 'ไม่มีคำอธิบาย',
              size: 'sm',
              color: '#666666',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '👤 ผู้ส่ง',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: submitterName,
                      size: 'sm',
                      weight: 'bold'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '📅 กำหนดตรวจ',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: dueText,
                      size: 'sm',
                      weight: 'bold'
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูงาน',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`
              }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกตีกลับ
   */
  private createTaskRejectedFlexMessage(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string): any {
    const newDueText = moment(newDueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    const reviewerName = reviewerDisplayName || 'ไม่ระบุ';

    return {
      type: 'flex',
      altText: `❌ งานถูกตีกลับ: ${task.title}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '❌ งานถูกตีกลับ',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#F44336',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: task.description || 'ไม่มีคำอธิบาย',
              size: 'sm',
              color: '#666666',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '👤 ผู้ตรวจ',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: reviewerName,
                      size: 'sm',
                      weight: 'bold'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '📅 กำหนดส่งใหม่',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: newDueText,
                      size: 'sm',
                      weight: 'bold',
                      color: '#F44336'
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูงาน',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`
              }
            }
          ]
        }
      }
    };
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
      
      return {
        type: 'box' as const,
        layout: 'horizontal' as const,
        spacing: 'sm',
        contents: [
          { type: 'text' as const, text: medal, size: 'sm' as const, color: '#666666', flex: 0 },
          { type: 'text' as const, text: user.displayName, size: 'sm' as const, color: '#333333', flex: 1 },
          { type: 'text' as const, text: `${user.weeklyPoints} คะแนน`, size: 'sm' as const, color: '#666666', flex: 0 },
          { type: 'text' as const, text: trend, size: 'sm' as const, color: '#666666', flex: 0 }
        ]
      };
    });

    return {
      type: 'flex',
      altText: `รายงานประจำสัปดาห์ (${weekStart} - ${weekEnd})`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '📊 รายงานประจำสัปดาห์', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: `${weekStart} - ${weekEnd}`, size: 'md' as const, color: '#FFFFFF' }
          ],
          backgroundColor: '#2196F3'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text' as const, text: '📈 สถิติกลุ่ม', weight: 'bold', size: 'md' as const, color: '#333333' },
                { type: 'text' as const, text: `✅ งานที่เสร็จ: ${stats.completedTasks}`, size: 'sm' as const, color: '#4CAF50' },
                { type: 'text' as const, text: `⏳ งานค้าง: ${stats.pendingTasks}`, size: 'sm' as const, color: '#FF9800' },
                { type: 'text' as const, text: `⚠️ งานเกินกำหนด: ${stats.overdueTasks}`, size: 'sm' as const, color: '#F44336' }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text' as const, text: '🏆 อันดับพนักงานคนขยัน', weight: 'bold', size: 'md' as const, color: '#333333' },
                ...leaderboardContents
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: { type: 'uri', label: 'ดูรายงานฉบับเต็ม', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายสัปดาห์ให้ admin
   */
  private createAdminWeeklyReportFlexMessage(group: Group, stats: any, leaderboard: Leaderboard[], weekStart: string, weekEnd: string): FlexMessage {
    const leaderboardContents = leaderboard.slice(0, 5).map((user, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
      
      return {
        type: 'box' as const,
        layout: 'horizontal' as const,
        spacing: 'sm',
        contents: [
          { type: 'text' as const, text: medal, size: 'sm' as const, color: '#666666', flex: 0 },
          { type: 'text' as const, text: user.displayName, size: 'sm' as const, color: '#333333', flex: 1 },
          { type: 'text' as const, text: `${user.weeklyPoints} คะแนน`, size: 'sm' as const, color: '#666666', flex: 0 },
          { type: 'text' as const, text: trend, size: 'sm' as const, color: '#666666', flex: 0 }
        ]
      };
    });

    return {
      type: 'flex',
      altText: `รายงานประจำสัปดาห์สำหรับผู้จัดการ (${weekStart} - ${weekEnd})`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '📊 รายงานประจำสัปดาห์', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: `${weekStart} - ${weekEnd}`, size: 'md' as const, color: '#FFFFFF' }
          ],
          backgroundColor: '#9C27B0'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text' as const, text: `👥 กลุ่ม: ${group.name}`, weight: 'bold', size: 'md' as const, color: '#333333' }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text' as const, text: '📈 สถิติกลุ่ม', weight: 'bold', size: 'md' as const, color: '#333333' },
                { type: 'text' as const, text: `✅ งานที่เสร็จ: ${stats.completedTasks}`, size: 'sm' as const, color: '#4CAF50' },
                { type: 'text' as const, text: `⏳ งานค้าง: ${stats.pendingTasks}`, size: 'sm' as const, color: '#FF9800' },
                { type: 'text' as const, text: `⚠️ งานเกินกำหนด: ${stats.overdueTasks}`, size: 'sm' as const, color: '#F44336' }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text' as const, text: '🏆 อันดับผู้ทำงาน (Top 5)', weight: 'bold', size: 'md' as const, color: '#333333' },
                ...leaderboardContents
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: { type: 'uri', label: 'ดูรายงานฉบับเต็ม', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายวัน
   */
  private createDailyReportFlexMessage(group: any, tasks: any[], timezone: string): any {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    const date = moment().tz(timezone).format('DD/MM/YYYY');

    return {
      type: 'flex',
      altText: `📊 รายงานรายวัน - ${group.name}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 รายงานรายวัน',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: group.name,
              size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#4CAF50',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: `🗓️ วันที่ ${date}`,
              size: 'sm',
              color: '#666666',
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดู Dashboard',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}`
              }
            }
          ]
        }
      }
    };
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

    const flexContainer: any = {
      type: 'flex',
      altText: header,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: header,
              weight: 'bold',
              size: 'lg',
              color: '#1DB446',
              flex: 0
            },
            {
              type: 'text',
              text: subtitle,
              size: 'sm',
              color: '#666666',
              flex: 0
            },
            {
              type: 'separator',
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดู Dashboard',
                uri: `${config.baseUrl}/dashboard?groupId=${assignee.groupId}`
              }
            }
          ]
        }
      }
    };

    // เพิ่มงานเกินกำหนด
    if (overdueTasks.length > 0) {
      flexContainer.contents.body.contents.push({
        type: 'text',
        text: '⚠️ งานเกินกำหนด:',
        weight: 'bold',
        color: '#FF0000',
        margin: 'md'
      });
      
      overdueTasks.forEach(task => {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          padding: 'sm',
          backgroundColor: '#FFF2F2',
          cornerRadius: 'sm',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`,
              size: 'xs',
              color: '#FF0000'
            }
          ]
        });
      });
    }

    // เพิ่มงานกำลังดำเนินการ
    if (inProgressTasks.length > 0) {
      flexContainer.contents.body.contents.push({
        type: 'text',
        text: '⏳ งานกำลังดำเนินการ:',
        weight: 'bold',
        color: '#FFA500',
        margin: 'md'
      });
      
      inProgressTasks.forEach(task => {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          padding: 'sm',
          backgroundColor: '#FFF8E1',
          cornerRadius: 'sm',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`,
              size: 'xs',
              color: '#FFA500'
            }
          ]
        });
      });
    }

    // เพิ่มงานรอดำเนินการ
    if (pendingTasks.length > 0) {
      flexContainer.contents.body.contents.push({
        type: 'text',
        text: '📝 งานรอดำเนินการ:',
        weight: 'bold',
        color: '#0066CC',
        margin: 'md'
      });
      
      pendingTasks.forEach(task => {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          padding: 'sm',
          backgroundColor: '#F0F8FF',
          cornerRadius: 'sm',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`,
              size: 'xs',
              color: '#0066CC'
            }
          ]
        });
      });
    }

    return flexContainer;
  }

  /**
   * สร้าง Flex Message สำหรับรายงานผู้จัดการ
   */
  private createManagerDailyReportFlexMessage(group: any, stats: any, timezone: string): any {
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    
    return {
      type: 'flex',
      altText: `📊 รายงานผู้จัดการ - ${group.name}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 รายงานผู้จัดการ',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: group.name,
              size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#9C27B0',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: `🗓️ วันที่ ${date}`,
              size: 'sm',
              color: '#666666',
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '📋 งานทั้งหมด',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: stats.totalTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#333333'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '✅ เสร็จแล้ว',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: stats.completedTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#4CAF50'
                    }
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '⚠️ เกินกำหนด',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: stats.overdueTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#F44336'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  flex: 1,
                  contents: [
                    {
                      type: 'text',
                      text: '📝 รอตรวจ',
                      size: 'xs',
                      color: '#666666'
                    },
                    {
                      type: 'text',
                      text: stats.pendingReviewTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#FF9800'
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดู Dashboard',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}`
              }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับรายงานหัวหน้างาน
   */
  private createSupervisorWeeklyReportFlexMessage(group: any, stats: any, timezone: string): any {
    const weekStart = moment().tz(timezone).startOf('week').format('DD/MM');
    const weekEnd = moment().tz(timezone).endOf('week').format('DD/MM');
    
    return {
      type: 'flex',
      altText: `📊 รายงานหัวหน้างาน - ${group.name}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 รายงานหัวหน้างาน',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: group.name,
              size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#607D8B',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: `📅 สัปดาห์ ${weekStart} - ${weekEnd}`,
              size: 'sm',
              color: '#666666',
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: '📋 สรุปงานของผู้ใต้บังคับบัญชา',
              weight: 'bold',
              size: 'md',
              color: '#333333'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: `👥 สมาชิกทั้งหมด: ${stats.totalMembers || 0} คน`,
                  size: 'sm',
                  color: '#666666'
                },
                {
                  type: 'text',
                  text: `📊 งานเสร็จแล้ว: ${stats.completedTasks || 0} งาน`,
                  size: 'sm',
                  color: '#4CAF50'
                },
                {
                  type: 'text',
                  text: `⚠️ งานเกินกำหนด: ${stats.overdueTasks || 0} งาน`,
                  size: 'sm',
                  color: '#F44336'
                },
                {
                  type: 'text',
                  text: `📝 งานรอตรวจ: ${stats.pendingReviewTasks || 0} งาน`,
                  size: 'sm',
                  color: '#FF9800'
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดู Dashboard',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}`
              }
            }
          ]
        }
      }
    };
  }
}