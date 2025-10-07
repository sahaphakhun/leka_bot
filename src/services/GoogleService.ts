// Google Service - รวมบริการต่างๆ ของ Google

import { google } from 'googleapis';
import { GoogleCalendarService } from './GoogleCalendarService';
import { UserService } from './UserService';
import { Task, Group, User } from '@/types';
import { Task as TaskEntity } from '@/models';
import { config } from '@/utils/config';

export class GoogleService {
  private calendarService: GoogleCalendarService;
  private userService: UserService;

  constructor() {
    this.calendarService = new GoogleCalendarService();
    this.userService = new UserService();
  }

  private getUserRole(task: Task | TaskEntity, userId: string): 'assignee' | 'creator' | 'reviewer' | undefined {
    const anyTask: any = task as any;
    if (anyTask.createdBy === userId || anyTask.createdByUser?.id === userId) return 'creator';
    const reviewerId = anyTask?.workflow?.review?.reviewerUserId;
    if (reviewerId === userId) return 'reviewer';
    if (Array.isArray(anyTask.assignedUsers)) {
      const inAssignees = anyTask.assignedUsers.some((u: any) => (typeof u === 'string' ? u === userId : u?.id === userId));
      if (inAssignees) return 'assignee';
    }
    return undefined;
  }

  /**
   * ตั้งค่า Google Calendar สำหรับกลุ่มใหม่
   */
  public async setupGroupCalendar(groupId: string, groupName: string, timezone?: string): Promise<string> {
    try {
      // สร้าง Calendar ใหม่
      const calendarId = await this.calendarService.createGroupCalendar(groupName, timezone);

      // อัปเดตการตั้งค่ากลุ่ม
      await this.userService.updateGroupSettings(groupId, {
        googleCalendarId: calendarId
      });

      // แชร์ปฏิทินกับสมาชิกในกลุ่ม
      try {
        await this.shareCalendarWithMembers(groupId);
      } catch (err) {
        console.warn('⚠️ Failed to share calendar during setup:', err);
      }

      console.log(`✅ Setup Google Calendar for group: ${groupName}`);
      return calendarId;

    } catch (error) {
      console.error('❌ Error setting up group calendar:', error);
      throw error;
    }
  }

  /**
   * ซิงค์งานไปยัง Google Calendar
   */
  public async syncTaskToCalendar(
    task: Task | TaskEntity,
    groupCalendarId: string,
    attendeeEmails?: string[]
  ): Promise<string> {
    try {
      if (!groupCalendarId) {
        throw new Error('Group calendar not configured');
      }

      // สร้าง Event ใน Calendar
      const eventId = await this.calendarService.createTaskEvent(
        task,
        groupCalendarId,
        attendeeEmails
      );
      
      // คืนค่า eventId เพื่อให้ TaskService update เอง (หลีกเลี่ยง circular dependency)
      return eventId;

    } catch (error) {
      console.error('❌ Error syncing task to calendar:', error);
      throw error;
    }
  }

  /**
   * ตั้งค่า Google Calendar สำหรับผู้ใช้ (รายบุคคล) และแชร์ให้ผู้ใช้อัตโนมัติ
   */
  public async ensureUserCalendar(userId: string): Promise<string> {
    const user = await this.userService.findById(userId);
    if (!user) throw new Error('User not found');
    const existing = (user as any).settings?.googleCalendarId;
    if (existing) return existing;

    const calendarId = await this.calendarService.createUserCalendar(user.displayName || `ผู้ใช้ ${user.id}`, user.timezone);
    // บันทึกใน user.settings
    await this.userService.updateUserSettings(user.id, { googleCalendarId: calendarId });

    // แชร์ calendar ให้ผู้ใช้ถ้ามีอีเมลและยืนยันแล้ว
    try {
      if (user.email && user.isVerified) {
        await this.calendarService.shareCalendarWithUser(calendarId, user.email, 'writer');
      }
    } catch (err) {
      console.warn('⚠️ Failed to share user calendar with user:', err);
    }

    return calendarId;
  }

  /**
   * สร้าง event ใส่ปฏิทินของผู้ใช้รายบุคคล คืนค่า eventId
   */
  public async syncTaskToUserCalendar(task: Task | TaskEntity, userId: string): Promise<{ calendarId: string; eventId: string }> {
    const calendarId = await this.ensureUserCalendar(userId);
    const viewerRole = this.getUserRole(task, userId);
    const eventId = await this.calendarService.createTaskEvent(task, calendarId, undefined, { viewerRole });
    return { calendarId, eventId };
  }

  /**
   * อัปเดตงานใน Calendar
   */
  public async updateTaskInCalendar(task: Task | TaskEntity, updates: Partial<Task>): Promise<void> {
    try {
      const anyTask: any = task as any;
      const userEventMap: Record<string, { calendarId: string; eventId: string }> = anyTask.googleEventIds || {};

      const entries = Object.entries(userEventMap);
      if (entries.length > 0) {
        for (const [userId, info] of entries) {
          try {
            const role = this.getUserRole(task, userId);
            const desc = this.calendarService.buildEventDescription(task, role);
            await this.calendarService.updateTaskEvent(info.eventId, info.calendarId, updates, { overrideDescription: desc });
          } catch (err) {
            console.warn('⚠️ Failed to update user calendar event:', err);
          }
        }
        return;
      }

      // Backward-compatibility: update group event if present
      if ((task as any).googleEventId) {
        const group = await this.userService.findGroupById((task as any).groupId);
        if (group?.settings.googleCalendarId) {
          await this.calendarService.updateTaskEvent(
            (task as any).googleEventId,
            group.settings.googleCalendarId,
            updates
          );
        }
      }

    } catch (error) {
      console.error('❌ Error updating task in calendar:', error);
      // ไม่ throw error เพื่อไม่ให้กระทบกับการอัปเดตงานในระบบ
    }
  }

  /**
   * ลบงานจาก Calendar
   */
  public async removeTaskFromCalendar(task: Task | TaskEntity): Promise<void> {
    try {
      const anyTask: any = task as any;
      const userEventMap: Record<string, { calendarId: string; eventId: string }> = anyTask.googleEventIds || {};
      const entries = Object.entries(userEventMap);
      if (entries.length > 0) {
        for (const [, info] of entries) {
          try {
            await this.calendarService.deleteTaskEvent(info.eventId, info.calendarId);
          } catch (err) {
            console.warn('⚠️ Failed to delete user calendar event:', err);
          }
        }
        return;
      }

      if ((task as any).googleEventId) {
        const group = await this.userService.findGroupById((task as any).groupId);
        if (group?.settings.googleCalendarId) {
          await this.calendarService.deleteTaskEvent((task as any).googleEventId, group.settings.googleCalendarId);
        }
      }

    } catch (error) {
      console.error('❌ Error removing task from calendar:', error);
    }
  }

  /**
   * ลบอีเวนต์ของงานออกจากปฏิทินของผู้ใช้รายหนึ่ง (ตาม mapping ที่บันทึกในงาน)
   */
  public async removeTaskFromUserCalendar(task: Task | TaskEntity, userId: string): Promise<void> {
    try {
      const anyTask: any = task as any;
      const map: Record<string, { calendarId: string; eventId: string }> = anyTask.googleEventIds || {};
      const info = map[userId];
      if (!info) return;
      await this.calendarService.deleteTaskEvent(info.eventId, info.calendarId);
    } catch (error) {
      console.warn('⚠️ Failed to remove task from a user calendar:', error);
    }
  }

  /**
   * แชร์ Calendar กับสมาชิกในกลุ่ม
   */
  public async shareCalendarWithMembers(groupId: string, userIds?: string[]): Promise<void> {
    try {
      const group = await this.userService.findGroupById(groupId);
      if (!group?.settings.googleCalendarId) {
        throw new Error('Group calendar not configured');
      }

      const members = await this.userService.getGroupMembers(group.id);
      let targetMembers = members.filter(member => member.email && member.isVerified);

      if (userIds && userIds.length > 0) {
        targetMembers = targetMembers.filter(member => userIds.includes(member.id));
      }

      for (const member of targetMembers) {
        try {
          await this.calendarService.shareCalendarWithUser(
            group.settings.googleCalendarId,
            member.email!,
            member.role === 'admin' ? 'writer' : 'reader'
          );
        } catch (error) {
          console.warn(`⚠️ Failed to share calendar with ${member.email}:`, error);
        }
      }

      console.log(`✅ Shared calendar with ${targetMembers.length} members`);

    } catch (error) {
      console.error('❌ Error sharing calendar with members:', error);
      throw error;
    }
  }

  /**
   * ส่งออกปฏิทินเป็น .ics
   */
  public async exportGroupCalendar(
    groupId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<string> {
    try {
      const group = await this.userService.findGroupByLineId(groupId);
      if (!group?.settings.googleCalendarId) {
        throw new Error('Group calendar not configured');
      }

      return await this.calendarService.exportCalendar(
        group.settings.googleCalendarId,
        startDate,
        endDate
      );

    } catch (error) {
      console.error('❌ Error exporting group calendar:', error);
      throw error;
    }
  }

  /**
   * ดึง URL ปฏิทินสำหรับฝังในเว็บ
   */
  public async getCalendarEmbedUrl(groupId: string): Promise<string> {
    try {
      const group = await this.userService.findGroupByLineId(groupId);
      if (!group?.settings.googleCalendarId) {
        throw new Error('Group calendar not configured');
      }

      return this.calendarService.generateCalendarUrl(group.settings.googleCalendarId);

    } catch (error) {
      console.error('❌ Error getting calendar embed URL:', error);
      throw error;
    }
  }

  /**
   * ซิงค์งานทั้งหมดของกลุ่มไปยัง Calendar
   * หมายเหตุ: Method นี้ต้องถูกเรียกจาก TaskService เพื่อหลีกเลี่ยง circular dependency
   */
  public async syncTaskListToCalendar(
    tasks: TaskEntity[], 
    groupCalendarId: string
  ): Promise<number> {
    try {
      if (!groupCalendarId) {
        throw new Error('Group calendar not configured');
      }

      let syncedCount = 0;

      for (const task of tasks) {
        try {
          if (!task.googleEventId) {
            const eventId = await this.syncTaskToCalendar(task, groupCalendarId);
            syncedCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to sync task ${task.id}:`, error);
        }
      }

      console.log(`✅ Synced ${syncedCount} tasks to calendar`);
      return syncedCount;

    } catch (error) {
      console.error('❌ Error syncing task list to calendar:', error);
      throw error;
    }
  }

  /**
   * ทดสอบการเชื่อมต่อ Google Services
   */
  public async testConnection(): Promise<{
    calendar: boolean;
  }> {
    try {
      const calendarStatus = await this.calendarService.testConnection();

      return {
        calendar: calendarStatus
      };

    } catch (error) {
      console.error('❌ Error testing Google connection:', error);
      return {
        calendar: false
      };
    }
  }

  /**
   * ตั้งค่า OAuth callback สำหรับ Google
   */
  public async handleOAuthCallback(code: string, groupId: string): Promise<void> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        config.google.redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token) {
        throw new Error('No refresh token returned from Google');
      }

      await this.userService.updateGroupSettings(groupId, {
        googleRefreshToken: tokens.refresh_token
      });

      this.calendarService.setCredentials(tokens);

      console.log('✅ Google OAuth credentials set for group');
    } catch (error) {
      console.error('❌ Error handling OAuth callback:', error);
      throw error;
    }
  }
}
