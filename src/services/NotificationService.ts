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

      const overdueHours = moment().tz(config.app.defaultTimezone).diff(moment(task.dueTime).tz(config.app.defaultTimezone), 'hours');
      
      const message = `⚠️ งานเกินกำหนด!

📋 **${task.title}**
📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}
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

      const dueDate = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
      
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
📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}
🎯 เสร็จเมื่อ: ${moment(task.completedAt).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}

${this.getCompletionStatusEmoji(task)} ${this.getCompletionStatusText(task)}`;

      await this.lineService.pushMessage(group.lineGroupId, message);

    } catch (error) {
      console.error('❌ Error sending task completed notification:', error);
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

      const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
      const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t: string) => `#${t}`).join(' ')}` : '';
      const assigneeNames = (task.assignedUsers || []).map((u: any) => `@${u.displayName}`).join(' ');

      const headerEmoji = changes.status ? (changes.status === 'cancelled' ? '🚫' : '🔄') : '✏️';
      const changedText = changedFields.length > 0 ? `
🔧 เปลี่ยนแปลง: ${changedFields.join(', ')}` : '';

      const message = `${headerEmoji} อัปเดตงาน

📋 ${task.title}
📅 กำหนดส่ง: ${dueText}
👥 ผู้รับผิดชอบ: ${assigneeNames}${tagsText ? `\n${tagsText}` : ''}${changedText}

📊 ดูรายละเอียดที่: ${config.baseUrl}/dashboard?groupId=${group.lineGroupId}`;

      const userIds = (task.assignedUsers || []).map((u: any) => u.lineUserId);
      await this.lineService.sendNotificationWithMention(group.lineGroupId, userIds, message);
    } catch (error) {
      console.error('❌ Error sending task updated notification:', error);
      throw error;
    }
  }

  /** แจ้งว่าลบงานแล้ว */
  public async sendTaskDeletedNotification(task: any): Promise<void> {
    try {
      const group = task.group;
      if (!group) return;

      const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
      const assigneeNames = (task.assignedUsers || []).map((u: any) => `@${u.displayName}`).join(' ');
      const message = `🗑️ ลบงานแล้ว

📋 ${task.title}
📅 กำหนดส่ง: ${dueText}
👥 ผู้รับผิดชอบ: ${assigneeNames}`;

      await this.lineService.pushMessage(group.lineGroupId, message);
    } catch (error) {
      console.error('❌ Error sending task deleted notification:', error);
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

      const linksText = (links && links.length > 0) ? `\n🔗 ลิงก์: \n${links.map(l => `• ${l}`).join('\n')}` : '';
      const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
      const assigneeNames = (task.assignedUsers || []).map((u: any) => `@${u.displayName}`).join(' ');

      const message = `📎 มีการส่งงาน

📋 ${task.title}
👤 ผู้ส่ง: ${submitterDisplayName}
📎 ไฟล์/รายการ: ${fileCount}${linksText}
📅 กำหนดส่ง: ${dueText}
👥 ผู้รับผิดชอบ: ${assigneeNames}`;

      await this.lineService.pushMessage(group.lineGroupId, message);
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

      const linksText = (details.links && details.links.length > 0)
        ? `\n🔗 ลิงก์: \n${details.links.map((l: string) => `• ${l}`).join('\n')}`
        : '';

      const messageToReviewer = `📝 มีการส่งงานรอตรวจ

📋 ${task.title}
${details.submitterDisplayName ? `👤 ผู้ส่ง: ${details.submitterDisplayName}\n` : ''}${typeof details.fileCount === 'number' ? `📎 ไฟล์: ${details.fileCount} รายการ\n` : ''}📅 กำหนดตรวจภายใน: ${dueText}${linksText}

ตอบในแชทกลุ่ม: /approve ${task.id.substring(0, 8)} หรือ /reject ${task.id.substring(0, 8)} [เหตุผล]`;

      // แจ้งแบบส่วนตัวไปยังผู้ตรวจ
      await this.lineService.pushMessage(reviewerLineUserId, messageToReviewer);

      // แจ้งในกลุ่มด้วย Flex (พร้อมปุ่ม ผ่าน/ไม่ผ่าน)
      const shortId = (task.id || '').substring(0, 8) || '';
      const flex: any = {
        type: 'flex',
        altText: 'งานรอตรวจ',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'รอตรวจงาน', weight: 'bold', color: '#333333', size: 'lg' },
              { type: 'text', text: task.title, size: 'sm', color: '#666666', wrap: true }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              ...(details.submitterDisplayName ? [{ type: 'text', text: `ผู้ส่ง: ${details.submitterDisplayName}`, size: 'sm' }] : []),
              ...(typeof details.fileCount === 'number' ? [{ type: 'text', text: `ไฟล์: ${details.fileCount} รายการ`, size: 'sm' }] : []),
              { type: 'text', text: `ตรวจภายใน: ${dueText}`, size: 'sm' },
              ...(details.links && details.links.length > 0
                ? [{ type: 'text', text: `ลิงก์: ${details.links.join(' ')}`, size: 'sm', wrap: true }]
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
                style: 'link',
                height: 'sm',
                action: { type: 'uri', label: 'ดูงาน', uri: `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}` }
              }
            ]
          }
        }
      };
      await this.lineService.pushMessage(group.lineGroupId, flex);

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

      const message = `❌ งานถูกตีกลับเพื่อแก้ไข

📋 ${task.title}
${reviewerDisplayName ? `👤 ผู้ตรวจ: ${reviewerDisplayName}\n` : ''}📅 กำหนดส่งใหม่: ${moment(newDueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}

โปรดแก้ไขและส่งใหม่ โดยพิมพ์ /submit ${task.id.substring(0, 8)} [หมายเหตุ] หลังแนบไฟล์/ลิงก์`;

      await this.lineService.pushMessage(group.lineGroupId, message);

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
}