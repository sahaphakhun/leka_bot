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

  constructor() {
    this.lineService = new LineService();
    this.userService = new UserService();
    this.emailService = new EmailService();
  }

  /**
   * ส่งการเตือนงาน
   */
  public async sendTaskReminder(task: any, reminderType: string): Promise<void> {
    try {
      const assignees = task.assignedUsers || [];
      const group = task.group;

      if (!group || assignees.length === 0) {
        console.warn('⚠️ Cannot send reminder: missing group or assignees');
        return;
      }

      // สร้าง Flex Message สำหรับเตือนงาน
      const flexMessage = this.createTaskReminderFlexMessage(task, group, reminderType);
      
      // ส่งในกลุ่ม LINE
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // ส่งอีเมลให้ผู้ที่มีอีเมล
      const emailUsers = assignees.filter((user: any) => user.email && user.isVerified);
      if (emailUsers.length > 0) {
        for (const user of emailUsers) {
          await this.emailService.sendTaskReminder(user, task, reminderType);
        }
      }

      console.log(`✅ Sent ${reminderType} reminder for task: ${task.title}`);

    } catch (error) {
      console.error('❌ Error sending task reminder:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนงานเกินกำหนด
   */
  public async sendOverdueNotification(task: any): Promise<void> {
    try {
      const assignees = task.assignedUsers || [];
      const group = task.group;

      if (!group || assignees.length === 0) return;

      const overdueHours = moment().tz(config.app.defaultTimezone).diff(moment(task.dueTime).tz(config.app.defaultTimezone), 'hours');
      
      // สร้าง Flex Message สำหรับงานเกินกำหนด
      const flexMessage = this.createOverdueTaskFlexMessage(task, group, overdueHours);

      // ส่งใน LINE
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // ส่งอีเมล
      const emailUsers = assignees.filter((user: any) => user.email && user.isVerified);
      for (const user of emailUsers) {
        await this.emailService.sendOverdueNotification(user, task, overdueHours);
      }

    } catch (error) {
      console.error('❌ Error sending overdue notification:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนงานสร้างใหม่
   */
  public async sendTaskCreatedNotification(task: any): Promise<void> {
    try {
      const assignees = task.assignedUsers || [];
      const group = task.group;
      const creator = task.createdByUser;

      if (!group || assignees.length === 0) return;

      const dueDate = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
      
      // สร้าง Flex Message สำหรับงานใหม่
      const flexMessage = this.createTaskCreatedFlexMessage(task, group, creator, dueDate);

      // ส่งใน LINE Group
      const userIds = assignees.map((user: any) => user.lineUserId);
      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

      // ส่งการแจ้งเตือนในแชทส่วนตัวให้ผู้รับผิดชอบแต่ละคน
      const privateMessage = `📋 คุณได้รับมอบหมายงานใหม่!

**${task.title}**
${task.description ? `📝 ${task.description}\n` : ''}📅 กำหนดส่ง: ${dueDate}
👤 สร้างโดย: ${creator?.displayName || 'ไม่ทราบ'}
🏠 กลุ่ม: ${group.name}

${task.tags && task.tags.length > 0 ? `🏷️ ${task.tags.map((tag: string) => `#${tag}`).join(' ')}\n` : ''}
📊 ดูรายละเอียดที่: ${config.baseUrl}/dashboard?groupId=${group.lineGroupId}`;

      // ส่งข้อความส่วนตัวให้ผู้รับผิดชอบแต่ละคน
      for (const assignee of assignees) {
        try {
          await this.lineService.pushMessage(assignee.lineUserId, privateMessage);
        } catch (error) {
          console.warn(`⚠️ Failed to send private notification to ${assignee.displayName}:`, error);
        }
      }

      // ส่งอีเมล
      const emailUsers = assignees.filter((user: any) => user.email && user.isVerified);
      for (const user of emailUsers) {
        await this.emailService.sendTaskCreatedNotification(user, task);
      }

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
      const group = task.group;
      if (!group) return;

      // สร้าง Flex Message สำหรับงานสำเร็จ
      const flexMessage = this.createTaskCompletedFlexMessage(task, group, completedBy);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

    } catch (error) {
      console.error('❌ Error sending task completed notification:', error);
      throw error;
    }
  }

  /** แจ้งว่าลบงานแล้ว */
  public async sendTaskDeletedNotification(task: any): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      // สร้าง Flex Message สำหรับงานที่ถูกลบ
      const flexMessage = this.createTaskDeletedFlexMessage(task, group);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);
    } catch (error) {
      console.error('❌ Error sending task deleted notification:', error);
      throw error;
    }
  }

  /** แจ้งว่าแก้งาน/อัปเดตรายละเอียดงาน */
  public async sendTaskUpdatedNotification(task: any, changes: Record<string, any>): Promise<void> {
    try {
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
      const group = task.group;
      if (!group) return;

      // สร้าง Flex Message สำหรับงานที่ถูกส่ง
      const flexMessage = this.createTaskSubmittedFlexMessage(task, group, submitterDisplayName, fileCount, links);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);
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
  public async sendTaskRejectedNotification(task: any, newDueTime: Date, reviewerDisplayName?: string): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      // สร้าง Flex Message สำหรับงานที่ถูกตีกลับ
      const flexMessage = this.createTaskRejectedFlexMessage(task, group, newDueTime, reviewerDisplayName);

      await this.lineService.pushMessage(group.lineGroupId, flexMessage);

    } catch (error) {
      console.error('❌ Error sending task rejected notification:', error);
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

      // จัดรูปแบบอันดับทุกคน พร้อมเหรียญ 1-3
      const medalFor = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}️⃣`;
      };

      let message = `📊 รายงานประจำสัปดาห์ (${weekStart} - ${weekEnd})\n\n` +
        `📈 **สถิติกลุ่ม**\n` +
        `✅ งานที่เสร็จ: ${stats.completedTasks}\n` +
        `⏳ งานค้าง: ${stats.pendingTasks}\n` +
        `⚠️ งานเกินกำหนด: ${stats.overdueTasks}\n\n` +
        `🏆 **จัดลำดับพนักงานคนขยัน (สัปดาห์นี้)**\n`;

      leaderboard.forEach((user, index) => {
        const rank = index + 1;
        const medal = medalFor(rank);
        const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
        message += `${medal} ${user.displayName} — ${user.weeklyPoints} คะแนน ${trend}\n`;
      });

      message += `\n📊 ดูรายงานฉบับเต็มที่: ${config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`;

      await this.lineService.pushMessage(group.lineGroupId, message);

    } catch (error) {
      console.error('❌ Error sending weekly report:', error);
      throw error;
    }
  }

  /** ส่งรายงานรายสัปดาห์ให้ผู้ดูแลกลุ่ม (หัวหน้าทีม) แบบข้อความส่วนตัว */
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

      let message = `📊 รายงานประจำสัปดาห์ (${weekStart} - ${weekEnd})\n\n` +
        `👥 กลุ่ม: ${group.name}\n\n` +
        `📈 สถิติกลุ่ม\n` +
        `✅ งานที่เสร็จ: ${stats.completedTasks}\n` +
        `⏳ งานค้าง: ${stats.pendingTasks}\n` +
        `⚠️ งานเกินกำหนด: ${stats.overdueTasks}\n\n` +
        `🏆 อันดับผู้ทำงาน (Top 5)\n`;

      leaderboard.slice(0, 5).forEach((user, index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
        message += `${medal} ${user.displayName} - ${user.weeklyPoints} คะแนน ${trend}\n`;
      });

      message += `\n📊 ดูรายงานฉบับเต็มที่: ${config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`;

      for (const admin of admins) {
        try {
          await this.lineService.pushMessage(admin.lineUserId, message);
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
  private createTaskCreatedFlexMessage(task: any, group: any, creator: any, dueDate: string): FlexMessage {
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);
    
    return {
      type: 'flex',
      altText: `งานใหม่: ${task.title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '📋 งานใหม่!', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: '#4CAF50'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `📅 กำหนดส่ง: ${dueDate}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `👤 สร้างโดย: ${creator?.displayName || 'ไม่ทราบ'}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `👥 ผู้รับผิดชอบ: ${task.assignedUsers.map((u: any) => u.displayName).join(', ')}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            ...(task.description ? [{ type: 'text' as const, text: `📝 ${task.description}`, size: 'sm' as const, color: '#666666', wrap: true }] : []),
            ...(task.tags && task.tags.length > 0 ? [{ type: 'text' as const, text: `🏷️ ${task.tags.map((tag: string) => `#${tag}`).join(' ')}`, size: 'sm' as const, color: '#666666' }] : [])
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
              action: { type: 'postback', label: 'รับงาน', data: `action=accept&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'เสร็จแล้ว', data: `action=complete&taskId=${task.id}` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับเตือนงาน
   */
  private createTaskReminderFlexMessage(task: any, group: any, reminderType: string): FlexMessage {
    const reminderInfo = this.createReminderMessage(task, reminderType);
    const timeText = this.getReminderTimeText(reminderType);
    const emoji = this.getReminderEmoji(reminderType);
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    return {
      type: 'flex',
      altText: `เตือนงาน: ${task.title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: `${emoji} เตือนงาน - ${timeText}`, weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: '#FF9800'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `👥 ผู้รับผิดชอบ: ${task.assignedUsers.map((u: any) => u.displayName).join(', ')}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            ...(task.description ? [{ type: 'text' as const, text: `📝 ${task.description}`, size: 'sm' as const, color: '#666666', wrap: true }] : []),
            ...(task.tags && task.tags.length > 0 ? [{ type: 'text' as const, text: `🏷️ ${task.tags.map((tag: string) => `#${tag}`).join(' ')}`, size: 'sm' as const, color: '#666666' }] : [])
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
              action: { type: 'uri', label: 'ดูงาน', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'เสร็จแล้ว', data: `action=complete&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'ขอขยายเวลา', data: `action=extend&taskId=${task.id}` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานเกินกำหนด
   */
  private createOverdueTaskFlexMessage(task: any, group: any, overdueHours: number): FlexMessage {
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);
    const overdueText = overdueHours >= 24 ? `${Math.floor(overdueHours / 24)} วัน` : `${overdueHours} ชั่วโมง`;

    return {
      type: 'flex',
      altText: `งานเกินกำหนด: ${task.title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '⚠️ งานเกินกำหนด!', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: '#F44336'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, size: 'sm' as const, color: '#333333' },
            { type: 'text' as const, text: `⏰ เกินมา: ${overdueText}`, size: 'sm' as const, color: '#F44336', weight: 'bold' as const },
            { type: 'text' as const, text: `👥 ผู้รับผิดชอบ: ${task.assignedUsers.map((u: any) => u.displayName).join(', ')}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            ...(task.description ? [{ type: 'text' as const, text: `📝 ${task.description}`, size: 'sm' as const, color: '#666666', wrap: true }] : [])
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
              action: { type: 'postback', label: 'เสร็จแล้ว', data: `action=complete&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'ขอขยายเวลา', data: `action=extend&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: { type: 'uri', label: 'ดูงาน', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
            }
          ]
        }
      }
    };
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
              action: { type: 'postback', label: 'ดูสถิติ', data: `action=stats&taskId=${task.id}` }
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
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: { type: 'postback', label: 'ดูไฟล์', data: `action=view_files&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'uri', label: 'ดูงาน', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'ตรวจสอบ', data: `action=review&taskId=${task.id}` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานรอตรวจ
   */
  private createReviewRequestFlexMessage(task: any, group: any, details: { submitterDisplayName?: string; fileCount?: number; links?: string[] }, dueText: string): FlexMessage {
    const shortId = (task.id || '').substring(0, 8) || '';
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    return {
      type: 'flex',
      altText: 'งานรอตรวจ',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '📝 รอตรวจงาน', weight: 'bold', color: '#FFFFFF', size: 'lg' as const },
            { type: 'text' as const, text: task.title, size: 'sm' as const, color: '#FFFFFF', wrap: true }
          ],
          backgroundColor: '#FF9800'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            ...(details.submitterDisplayName ? [{ type: 'text' as const, text: `👤 ผู้ส่ง: ${details.submitterDisplayName}`, size: 'sm' as const, color: '#333333' }] : []),
            ...(typeof details.fileCount === 'number' ? [{ type: 'text' as const, text: `📎 ไฟล์: ${details.fileCount} รายการ`, size: 'sm' as const, color: '#333333' }] : []),
            { type: 'text' as const, text: `📅 ตรวจภายใน: ${dueText}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            ...(details.links && details.links.length > 0
              ? [{ type: 'text' as const, text: `🔗 ลิงก์: ${details.links.join(' ')}`, size: 'sm' as const, color: '#666666', wrap: true }]
              : [])
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
              action: { type: 'postback', label: 'ผ่าน', data: `action=approve_task&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'message', label: 'ไม่ผ่าน (+1 วัน)', text: `/reject ${shortId} [โปรดใส่เหตุผล]` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'ดูไฟล์', data: `action=view_files&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'postback', label: 'เพิ่มความคิดเห็น', data: `action=comment&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: { type: 'uri', label: 'ดูงาน', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
            }
          ]
        }
      }
    };
  }

  /**
   * สร้าง Flex Message สำหรับงานที่ถูกตีกลับ พร้อมกำหนดส่งใหม่
   */
  private createTaskRejectedFlexMessage(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string): FlexMessage {
    const shortId = (task.id || '').substring(0, 8) || '';
    const dueText = moment(newDueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    const priorityColor = this.getPriorityColor(task.priority);
    const priorityText = this.getPriorityText(task.priority);

    return {
      type: 'flex',
      altText: `งานถูกตีกลับเพื่อแก้ไข`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text' as const, text: '❌ งานถูกตีกลับเพื่อแก้ไข', weight: 'bold', size: 'lg' as const, color: '#FFFFFF' },
            { type: 'text' as const, text: task.title, size: 'md' as const, wrap: true, color: '#FFFFFF' }
          ],
          backgroundColor: '#F44336'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text' as const, text: `📋 ${task.title}`, size: 'sm' as const, color: '#333333' },
            ...(reviewerDisplayName ? [{ type: 'text' as const, text: `👤 ผู้ตรวจ: ${reviewerDisplayName}`, size: 'sm' as const, color: '#333333' }] : []),
            { type: 'text' as const, text: `📅 กำหนดส่งใหม่: ${dueText}`, size: 'sm' as const, color: '#333333' },
            ...(priorityText ? [{ type: 'text' as const, text: `🎯 ${priorityText}`, size: 'sm' as const, color: priorityColor, weight: 'bold' as const }] : []),
            { type: 'text' as const, text: `โปรดแก้ไขและส่งใหม่ โดยพิมพ์ /submit ${shortId} [หมายเหตุ] หลังแนบไฟล์/ลิงก์`, size: 'sm' as const, color: '#666666', wrap: true }
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
              action: { type: 'postback', label: 'ส่งใหม่', data: `action=submit&taskId=${task.id}` }
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: { type: 'message', label: 'ไม่ส่ง', text: `/reject ${shortId} [โปรดใส่เหตุผล]` }
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: { type: 'uri', label: 'ดูงาน', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
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
}