// Google Calendar Service - จัดการ Google Calendar API

import { google, calendar_v3 } from 'googleapis';
import { config } from '@/utils/config';
import { Task, GoogleCalendarEvent } from '@/types';
import { Task as TaskEntity, User } from '@/models';
import moment from 'moment-timezone';
import { UserService } from './UserService';
import { serviceContainer } from '@/utils/serviceContainer';

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private auth: any;
  private userService: UserService;
  private authType: 'serviceAccount' | 'oauth2' = 'oauth2';

  constructor(userService: UserService = serviceContainer.get<UserService>('UserService')) {
    this.userService = userService;
    this.initializeAuth();
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  /**
   * ตั้งค่า Google Authentication
   */
  private initializeAuth(): void {
    // TEMP DEBUG: ตรวจว่า ENV ถูกอ่านจริง
    try {
      const envJsonLen = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').length;
      const envPkLen = (process.env.GOOGLE_SA_PRIVATE_KEY || '').length;
      console.log(`🔎 GOOGLE_SERVICE_ACCOUNT_JSON length: ${envJsonLen}`);
      console.log(`🔎 GOOGLE_SA_PRIVATE_KEY length: ${envPkLen}`);
    } catch {}

    if (config.google.serviceAccountJson) {
      // ใช้ Service Account JSON จาก Environment Variable (สำหรับ Railway)
      try {
        const serviceAccount = JSON.parse(config.google.serviceAccountJson);
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ]
        });
        this.authType = 'serviceAccount';
        console.log('✅ Using Google Service Account from environment variable');
      } catch (error) {
        console.error('❌ Service Account JSON parsing failed:', error);
        this.setupOAuth();
      }
    } else if (config.google.serviceAccountClientEmail && config.google.serviceAccountPrivateKey) {
      // รองรับรูปแบบตัวแปรแยก (CLIENT_EMAIL + PRIVATE_KEY)
      try {
        const clientEmail = config.google.serviceAccountClientEmail as string;
        const privateKeyRaw = config.google.serviceAccountPrivateKey as string;
        const privateKey = privateKeyRaw.includes('\n') ? privateKeyRaw.replace(/\\n/g, '\n') : privateKeyRaw;
        const projectId = config.google.serviceAccountProjectId || undefined;

        const credentials = {
          client_email: clientEmail,
          private_key: privateKey,
          project_id: projectId
        } as any;

        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ]
        });
        this.authType = 'serviceAccount';
        console.log('✅ Using Google Service Account from separate env vars (client_email/private_key)');
      } catch (error) {
        console.error('❌ Service Account (separate vars) setup failed:', error);
        this.setupOAuth();
      }
    } else if (config.google.serviceAccountKey) {
      // ใช้ Service Account จากไฟล์ (สำหรับ local development)
      try {
        const serviceAccount = require(config.google.serviceAccountKey);
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ]
        });
        this.authType = 'serviceAccount';
        console.log('✅ Using Google Service Account from file');
      } catch (error) {
        console.error('❌ Service Account setup failed:', error);
        this.setupOAuth();
      }
    } else {
      // ใช้ OAuth (สำหรับ development)
      this.setupOAuth();
    }
  }

  /**
   * ตั้งค่า OAuth
   */
  private setupOAuth(): void {
    this.auth = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    this.authType = 'oauth2';

    // TODO: ใช้ refresh token ที่เก็บไว้ในฐานข้อมูล
    // this.auth.setCredentials({
    //   refresh_token: 'stored_refresh_token'
    // });
  }

  /**
   * ตั้งค่า OAuth credentials หลังจากแลกเปลี่ยน token แล้ว
   */
  public setCredentials(tokens: any): void {
    try {
      this.auth?.setCredentials(tokens);
    } catch (error) {
      console.error('❌ Error setting OAuth credentials:', error);
    }
  }

  /**
   * สร้าง Calendar ใหม่สำหรับกลุ่ม
   */
  public async createGroupCalendar(groupName: string, timezone: string = config.app.defaultTimezone): Promise<string> {
    try {
      const calendar = {
        summary: `เลขาบอท - ${groupName}`,
        description: `ปฏิทินงานสำหรับกลุ่ม ${groupName} จากระบบเลขาบอท`,
        timeZone: timezone
      };

      const response = await this.calendar.calendars.insert({
        requestBody: calendar
      });

      const calendarId = response.data.id;
      console.log(`✅ Created calendar for group: ${groupName} (${calendarId})`);
      
      return calendarId!;

    } catch (error) {
      console.error('❌ Error creating group calendar:', error);
      throw error;
    }
  }

  /**
   * สร้าง Event จากงาน
   */
  public async createTaskEvent(
    task: Task | TaskEntity,
    calendarId: string,
    attendeeEmails?: string[],
    options?: { viewerRole?: 'assignee' | 'creator' | 'reviewer' }
  ): Promise<string> {
    try {
      const attendees = attendeeEmails
        ? attendeeEmails.map(email => ({ email }))
        : await this.getTaskAttendees(task);
      const includeAttendees = attendees.length > 0 && this.authType !== 'serviceAccount';

      if (!includeAttendees && attendees.length > 0 && this.authType === 'serviceAccount') {
        console.warn('⚠️ Service account cannot invite attendees - skipping attendee list');
      }
      const event: GoogleCalendarEvent = {
        summary: task.title,
        description: this.buildEventDescription(task, options?.viewerRole),
        start: {
          dateTime: task.startTime
            ? moment(task.startTime).toISOString()
            : moment(task.dueTime).subtract(1, 'hour').toISOString(),
          timeZone: config.app.defaultTimezone
        },
        end: {
          dateTime: moment(task.dueTime).toISOString(),
          timeZone: config.app.defaultTimezone
        },
        attendees: includeAttendees ? attendees : undefined,
        reminders: {
          useDefault: false,
          overrides: this.convertRemindersToCalendar(task.customReminders || ['P1D', 'PT3H'])
        }
      };

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: includeAttendees ? 'all' : 'none' // ส่งการแจ้งเตือนเฉพาะเมื่อมีผู้เข้าร่วม
      });

      const eventId = response.data.id;
      console.log(`✅ Created calendar event: ${task.title} (${eventId})`);
      
      return eventId!;

    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * อัปเดต Event
   */
  public async updateTaskEvent(
    eventId: string, 
    calendarId: string, 
    updates: Partial<Task>,
    options?: { overrideDescription?: string }
  ): Promise<void> {
    try {
      const event: Partial<GoogleCalendarEvent> = {};

      if (updates.title) {
        event.summary = updates.title;
      }

      if (options?.overrideDescription) {
        event.description = options.overrideDescription as any;
      } else if ((updates as any).description) {
        event.description = this.formatEventDescription(updates as Task);
      }

      if (updates.dueTime) {
        event.end = {
          dateTime: moment(updates.dueTime).toISOString(),
          timeZone: config.app.defaultTimezone
        };
      }

      if (updates.startTime) {
        event.start = {
          dateTime: moment(updates.startTime).toISOString(),
          timeZone: config.app.defaultTimezone
        };
      }

      // If a task is completed or cancelled, clear reminders to prevent future alerts
      if (updates.status === 'completed' || updates.status === 'cancelled') {
        event.reminders = {
          useDefault: false,
          overrides: []
        } as any;
      }
      // Avoid email updates when just clearing reminders on completion/cancellation
      const sendUpdates = (updates.status === 'completed' || updates.status === 'cancelled') ? 'none' : 'all';

      await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: event,
        sendUpdates
      });

      console.log(`✅ Updated calendar event: ${eventId}`);

    } catch (error) {
      console.error('❌ Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * ลบ Event
   */
  public async deleteTaskEvent(eventId: string, calendarId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all'
      });

      console.log(`✅ Deleted calendar event: ${eventId}`);

    } catch (error) {
      console.error('❌ Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * ดึง Events ในช่วงเวลา
   */
  public async getCalendarEvents(
    calendarId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        orderBy: 'startTime',
        singleEvents: true
      });

      return response.data.items || [];

    } catch (error) {
      console.error('❌ Error getting calendar events:', error);
      throw error;
    }
  }

  /**
   * แชร์ Calendar กับผู้ใช้
   */
  public async shareCalendarWithUser(calendarId: string, email: string, role: 'reader' | 'writer' = 'reader'): Promise<void> {
    try {
      const rule = {
        role: role === 'writer' ? 'writer' : 'reader',
        scope: {
          type: 'user',
          value: email
        }
      };

      await this.calendar.acl.insert({
        calendarId,
        requestBody: rule
      });

      console.log(`✅ Shared calendar ${calendarId} with ${email} (${role})`);

    } catch (error) {
      console.error('❌ Error sharing calendar:', error);
      throw error;
    }
  }

  /**
   * สร้าง Calendar Link สำหรับ public view
   */
  public generateCalendarUrl(calendarId: string): string {
    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`;
  }

  /**
   * สร้าง .ics file สำหรับ export
   */
  public async exportCalendar(calendarId: string, startDate: Date, endDate: Date): Promise<string> {
    try {
      const events = await this.getCalendarEvents(calendarId, startDate, endDate);
      
      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//เลขาบอท//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      events.forEach(event => {
        if (event.start?.dateTime && event.end?.dateTime) {
          icsContent.push(
            'BEGIN:VEVENT',
            `UID:${event.id}@leka-bot.com`,
            `DTSTART:${moment(event.start.dateTime).utc().format('YYYYMMDDTHHmmss')}Z`,
            `DTEND:${moment(event.end.dateTime).utc().format('YYYYMMDDTHHmmss')}Z`,
            `SUMMARY:${event.summary || 'ไม่มีชื่อ'}`,
            `DESCRIPTION:${event.description || ''}`,
            `CREATED:${moment(event.created).utc().format('YYYYMMDDTHHmmss')}Z`,
            `LAST-MODIFIED:${moment(event.updated).utc().format('YYYYMMDDTHHmmss')}Z`,
            'END:VEVENT'
          );
        }
      });

      icsContent.push('END:VCALENDAR');
      
      return icsContent.join('\r\n');

    } catch (error) {
      console.error('❌ Error exporting calendar:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * จัดรูปแบบคำอธิบาย Event
   */
  private formatEventDescription(task: Task | TaskEntity): string {
    let description = '';

    // รายละเอียดงาน
    if ((task as any)?.description) {
      description += `📝 ${(task as any).description}\n\n`;
    }

    // ผู้สั่งงาน (ถ้ามีข้อมูลผู้ใช้)
    const creatorName = (task as any)?.createdByUser?.displayName
      || (task as any)?.createdByUser?.realName
      || undefined;
    if (creatorName) {
      description += `👤 ผู้สั่งงาน: ${creatorName}\n`;
    }

    // ผู้รับผิดชอบ (ถ้ามี)
    if (Array.isArray((task as any)?.assignedUsers) && (task as any).assignedUsers.length > 0) {
      const names = ((task as any).assignedUsers as any[])
        .map(u => u.displayName || u.realName)
        .filter(Boolean)
        .join(', ');
      if (names) {
        description += `🧑‍💼 ผู้รับผิดชอบ: ${names}\n`;
      }
    }

    // สถานะ / ความสำคัญ
    description += `🎯 สถานะ: ${this.getStatusText((task as any).status)}\n`;
    description += `⚡ ระดับ: ${this.getPriorityText((task as any).priority)}\n`;

    // แท็ก
    if ((task as any)?.tags && (task as any).tags.length > 0) {
      description += `🏷️ แท็ก: ${(task as any).tags.map((tag: string) => `#${tag}`).join(' ')}\n`;
    }

    // ไฟล์แนบ (แสดงจำนวนถ้ามี)
    const attachmentCount = Array.isArray((task as any)?.attachedFiles) ? (task as any).attachedFiles.length : 0;
    if (attachmentCount > 0) {
      description += `📎 ไฟล์แนบ: ${attachmentCount} ไฟล์ (เปิดดูใน Dashboard)\n`;
    }

    // ลิงก์ไปยัง Dashboard แบบ deep link เพื่อเปิดรายละเอียดงานทันที
    const groupId = (task as any)?.groupId;
    const taskId = (task as any)?.id;
    const detailUrl = groupId && taskId
      ? `${config.baseUrl}/dashboard?groupId=${encodeURIComponent(groupId)}&taskId=${encodeURIComponent(taskId)}&action=view`
      : `${config.baseUrl}/dashboard`;

    description += `\n🔗 เปิดรายละเอียด: ${detailUrl}`;

    // เพิ่มลิงก์แบบเฉพาะบุคคล (ถ้ารู้ LINE userId ของผู้รับผิดชอบ)
    try {
      const assignees: any[] = Array.isArray((task as any)?.assignedUsers) ? (task as any).assignedUsers : [];
      const personalized = assignees
        .filter(a => !!a?.lineUserId && (a.displayName || a.realName))
        .slice(0, 5)
        .map(a => {
          const name = a.displayName || a.realName;
          const link = `${detailUrl}&userId=${encodeURIComponent(a.lineUserId)}`;
          return `   • ${name}: ${link}`;
        });
      if (personalized.length > 0) {
        description += `\n🔒 ลิงก์เฉพาะบุคคล:\n${personalized.join('\n')}`;
      }
    } catch {}
    description += `\n🤖 สร้างโดยเลขาบอท`;

    return description;
  }

  /**
   * สร้างคำอธิบาย Event พร้อมบอกบทบาทของผู้ใช้งานที่ดูปฏิทิน
   */
  public buildEventDescription(task: Task | TaskEntity, viewerRole?: 'assignee' | 'creator' | 'reviewer'): string {
    const base = this.formatEventDescription(task);
    if (!viewerRole) return base;
    const roleMap: Record<string, string> = {
      assignee: 'ผู้รับผิดชอบ',
      creator: 'ผู้สร้างงาน',
      reviewer: 'ผู้ตรวจ'
    };
    return `👤 บทบาทของคุณ: ${roleMap[viewerRole] || viewerRole}\n` + base;
  }

  /**
   * สร้าง Calendar ใหม่สำหรับผู้ใช้ (ปฏิทินรายบุคคล)
   */
  public async createUserCalendar(userName: string, timezone: string = config.app.defaultTimezone): Promise<string> {
    try {
      const calendar = {
        summary: `เลขาบอท - งานของ ${userName}`,
        description: `ปฏิทินงานส่วนบุคคลสำหรับ ${userName} จากระบบเลขาบอท`,
        timeZone: timezone
      };

      const response = await this.calendar.calendars.insert({
        requestBody: calendar as any
      });

      const calendarId = response.data.id!;
      console.log(`✅ Created user calendar for: ${userName} (${calendarId})`);
      return calendarId;

    } catch (error) {
      console.error('❌ Error creating user calendar:', error);
      throw error;
    }
  }

  /**
   * แปลง reminders เป็นรูปแบบของ Google Calendar
   */
  private convertRemindersToCalendar(reminders: string[]): Array<{method: 'email' | 'popup'; minutes: number}> {
    return reminders.map(reminder => {
      let minutes = 60; // default 1 hour

      if (reminder.includes('P1D') || reminder === '1d') {
        minutes = 24 * 60; // 1 day
      } else if (reminder.includes('PT3H') || reminder === '3h') {
        minutes = 3 * 60; // 3 hours
      } else if (reminder.includes('PT1H') || reminder === '1h') {
        minutes = 60; // 1 hour
      }

      return {
        method: 'email' as const,
        minutes
      };
    });
  }

  /**
   * แปลงสถานะเป็นข้อความ
   */
  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จแล้ว',
      cancelled: 'ยกเลิก',
      overdue: 'เกินกำหนด'
    };
    return statusMap[status] || status;
  }

  /**
   * แปลงระดับความสำคัญเป็นข้อความ
   */
  private getPriorityText(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      low: 'ต่ำ',
      medium: 'ปานกลาง',
      high: 'สูง'
    };
    return priorityMap[priority] || priority;
  }

  /**
   * แปลง Task เป็น attendees สำหรับ Google Calendar
   */
  private async getTaskAttendees(task: Task | TaskEntity): Promise<any[]> {
    const userIds: string[] = [];

    if ('assignees' in task && Array.isArray(task.assignees)) {
      userIds.push(...task.assignees);
    } else if ('assignedUsers' in task && Array.isArray(task.assignedUsers)) {
      for (const user of task.assignedUsers as any[]) {
        if (typeof user === 'string') {
          userIds.push(user);
        } else if (user?.id) {
          userIds.push(user.id);
        }
      }
    }

    if (userIds.length === 0) return [];

    const users = await Promise.all(userIds.map(id => this.userService.findById(id)));

    return users
      .filter((user): user is User => !!user && !!user.email && user.isVerified)
      .map(user => ({
        email: user.email!,
        displayName: user.realName || user.displayName || `ผู้ใช้ ${user.id}`
      }));
  }

  /**
   * ตรวจสอบการเชื่อมต่อ
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.calendar.calendarList.list();
      console.log('✅ Google Calendar connection successful');
      return true;
    } catch (error) {
      console.error('❌ Google Calendar connection failed:', error);
      return false;
    }
  }
}
