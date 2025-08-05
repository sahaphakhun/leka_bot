// Notification Service - จัดการการแจ้งเตือนและอีเมล

import { LineService } from './LineService';
import { UserService } from './UserService';
import { EmailService } from './EmailService';
import { Task, Group, User, NotificationPayload, Leaderboard } from '@/types';
import { config } from '@/utils/config';
import moment from 'moment-timezone';

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

      // สร้างข้อความเตือน
      const message = this.createReminderMessage(task, reminderType);
      
      // ส่งในกลุ่ม LINE พร้อม mention
      const userIds = assignees.map((user: any) => user.lineUserId);
      await this.lineService.sendNotificationWithMention(
        group.lineGroupId,
        userIds,
        message
      );

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

      const overdueHours = moment().diff(moment(task.dueTime), 'hours');
      
      const message = `⚠️ งานเกินกำหนด!

📋 **${task.title}**
📅 กำหนดส่ง: ${moment(task.dueTime).format('DD/MM/YYYY HH:mm')}
⏰ เกินมา: ${overdueHours} ชั่วโมง

👥 ผู้รับผิดชอบ: ${assignees.map((u: any) => `@${u.displayName}`).join(' ')}

กรุณาดำเนินการให้เสร็จสิ้นโดยเร็วที่สุดค่ะ 🙏`;

      // ส่งใน LINE
      const userIds = assignees.map((user: any) => user.lineUserId);
      await this.lineService.sendNotificationWithMention(
        group.lineGroupId,
        userIds,
        message
      );

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

      const dueDate = moment(task.dueTime).format('DD/MM/YYYY HH:mm');
      
      const message = `📋 งานใหม่!

**${task.title}**
${task.description ? `📝 ${task.description}\n` : ''}📅 กำหนดส่ง: ${dueDate}
👤 สร้างโดย: ${creator?.displayName || 'ไม่ทราบ'}
👥 ผู้รับผิดชอบ: ${assignees.map((u: any) => `@${u.displayName}`).join(' ')}

${task.tags && task.tags.length > 0 ? `🏷️ ${task.tags.map((tag: string) => `#${tag}`).join(' ')}\n` : ''}
📊 ดูรายละเอียดที่: ${config.baseUrl}/dashboard?groupId=${group.lineGroupId}`;

      // ส่งใน LINE Group
      const userIds = assignees.map((user: any) => user.lineUserId);
      await this.lineService.sendNotificationWithMention(
        group.lineGroupId,
        userIds,
        message
      );

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

      const message = `✅ งานสำเร็จ!

📋 **${task.title}**
👤 ปิดงานโดย: ${completedBy.displayName}
📅 กำหนดส่ง: ${moment(task.dueTime).format('DD/MM/YYYY HH:mm')}
🎯 เสร็จเมื่อ: ${moment(task.completedAt).format('DD/MM/YYYY HH:mm')}

${this.getCompletionStatusEmoji(task)} ${this.getCompletionStatusText(task)}`;

      await this.lineService.pushMessage(group.lineGroupId, message);

    } catch (error) {
      console.error('❌ Error sending task completed notification:', error);
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

      const weekStart = moment().startOf('week').format('DD/MM');
      const weekEnd = moment().endOf('week').format('DD/MM');

      let message = `📊 รายงานประจำสัปดาห์ (${weekStart} - ${weekEnd})

📈 **สถิติกลุ่ม**
✅ งานที่เสร็จ: ${stats.completedTasks}
⏳ งานค้าง: ${stats.pendingTasks}
⚠️ งานเกินกำหนด: ${stats.overdueTasks}

🏆 **อันดับผู้ทำงาน (Top 5)**
`;

      leaderboard.slice(0, 5).forEach((user, index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
        
        message += `${medal} ${user.displayName} - ${user.weeklyPoints} คะแนน ${trend}
`;
      });

      message += `\n📊 ดูรายงานฉบับเต็มที่: ${config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`;

      await this.lineService.pushMessage(group.lineGroupId, message);

    } catch (error) {
      console.error('❌ Error sending weekly report:', error);
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
    const dueTime = moment(task.dueTime);
    const completedTime = moment(task.completedAt);
    const diff = completedTime.diff(dueTime, 'hours');

    if (diff <= -24) return '🎯'; // เสร็จก่อนกำหนด
    if (diff <= 24) return '✨';  // เสร็จตรงเวลา
    return '⚠️'; // เสร็จช้า
  }

  /**
   * ได้รับข้อความสถานะการทำงาน
   */
  private getCompletionStatusText(task: any): string {
    const dueTime = moment(task.dueTime);
    const completedTime = moment(task.completedAt);
    const diff = completedTime.diff(dueTime, 'hours');

    if (diff <= -24) return 'เสร็จก่อนกำหนด - ยอดเยี่ยม! 🎉';
    if (diff <= 24) return 'เสร็จตรงเวลา - ดีมาก! 👍';
    return `เสร็จช้า ${Math.abs(diff)} ชั่วโมง`;
  }
}