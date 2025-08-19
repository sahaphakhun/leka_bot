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

  constructor(userService: UserService = serviceContainer.get<UserService>('UserService')) {
    this.userService = userService;
    this.initializeAuth();
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  /**
   * ตั้งค่า Google Authentication
   */
  private initializeAuth(): void {
    if (config.google.serviceAccountKey) {
      // ใช้ Service Account (แนะนำสำหรับ production)
      try {
        const serviceAccount = require(config.google.serviceAccountKey);
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ]
        });
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
    attendeeEmails?: string[]
  ): Promise<string> {
    try {
      const attendees = attendeeEmails
        ? attendeeEmails.map(email => ({ email }))
        : await this.getTaskAttendees(task);
      const event: GoogleCalendarEvent = {
        summary: task.title,
        description: this.formatEventDescription(task),
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
        attendees,
        reminders: {
          useDefault: false,
          overrides: this.convertRemindersToCalendar(task.customReminders || ['P1D', 'PT3H'])
        }
      };

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: 'all' // ส่งการแจ้งเตือนให้ attendees
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
    updates: Partial<Task>
  ): Promise<void> {
    try {
      const event: Partial<GoogleCalendarEvent> = {};

      if (updates.title) {
        event.summary = updates.title;
      }

      if (updates.description) {
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

      await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: event,
        sendUpdates: 'all'
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
    
    if (task.description) {
      description += `📝 ${task.description}\n\n`;
    }

    description += `🎯 สถานะ: ${this.getStatusText(task.status)}\n`;
    description += `⚡ ระดับ: ${this.getPriorityText(task.priority)}\n`;

    if (task.tags && task.tags.length > 0) {
      description += `🏷️ แท็ก: ${task.tags.map((tag: string) => `#${tag}`).join(' ')}\n`;
    }

    description += `\n📊 ดูรายละเอียดที่: ${config.baseUrl}/dashboard`;
    description += `\n🤖 สร้างโดยเลขาบอท`;

    return description;
  }

  /**
   * แปลง reminders เป็นรูปแบบของ Google Calendar
   */
  private convertRemindersToCalendar(reminders: string[]): Array<{method: 'email' | 'popup'; minutes: number}> {
    return reminders.map(reminder => {
      let minutes = 60; // default 1 hour

      if (reminder.includes('P7D') || reminder === '7d') {
        minutes = 7 * 24 * 60; // 7 days
      } else if (reminder.includes('P1D') || reminder === '1d') {
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