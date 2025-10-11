"use strict";
// Google Service - รวมบริการต่างๆ ของ Google
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleService = void 0;
const googleapis_1 = require("googleapis");
const GoogleCalendarService_1 = require("./GoogleCalendarService");
const UserService_1 = require("./UserService");
const config_1 = require("@/utils/config");
class GoogleService {
    constructor() {
        this.calendarService = new GoogleCalendarService_1.GoogleCalendarService();
        this.userService = new UserService_1.UserService();
    }
    getUserRole(task, userId) {
        const anyTask = task;
        if (anyTask.createdBy === userId || anyTask.createdByUser?.id === userId)
            return 'creator';
        const reviewerId = anyTask?.workflow?.review?.reviewerUserId;
        if (reviewerId === userId)
            return 'reviewer';
        if (Array.isArray(anyTask.assignedUsers)) {
            const inAssignees = anyTask.assignedUsers.some((u) => (typeof u === 'string' ? u === userId : u?.id === userId));
            if (inAssignees)
                return 'assignee';
        }
        return undefined;
    }
    /**
     * ตั้งค่า Google Calendar สำหรับกลุ่มใหม่
     */
    async setupGroupCalendar(groupId, groupName, timezone) {
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
            }
            catch (err) {
                console.warn('⚠️ Failed to share calendar during setup:', err);
            }
            console.log(`✅ Setup Google Calendar for group: ${groupName}`);
            return calendarId;
        }
        catch (error) {
            console.error('❌ Error setting up group calendar:', error);
            throw error;
        }
    }
    /**
     * ซิงค์งานไปยัง Google Calendar
     */
    async syncTaskToCalendar(task, groupCalendarId, attendeeEmails) {
        try {
            if (!groupCalendarId) {
                throw new Error('Group calendar not configured');
            }
            // สร้าง Event ใน Calendar
            const eventId = await this.calendarService.createTaskEvent(task, groupCalendarId, attendeeEmails);
            // คืนค่า eventId เพื่อให้ TaskService update เอง (หลีกเลี่ยง circular dependency)
            return eventId;
        }
        catch (error) {
            console.error('❌ Error syncing task to calendar:', error);
            throw error;
        }
    }
    /**
     * ตั้งค่า Google Calendar สำหรับผู้ใช้ (รายบุคคล) และแชร์ให้ผู้ใช้อัตโนมัติ
     */
    async ensureUserCalendar(userId) {
        const user = await this.userService.findById(userId);
        if (!user)
            throw new Error('User not found');
        const existing = user.settings?.googleCalendarId;
        if (existing)
            return existing;
        const calendarId = await this.calendarService.createUserCalendar(user.displayName || `ผู้ใช้ ${user.id}`, user.timezone);
        // บันทึกใน user.settings
        await this.userService.updateUserSettings(user.id, { googleCalendarId: calendarId });
        // แชร์ calendar ให้ผู้ใช้ถ้ามีอีเมลและยืนยันแล้ว
        try {
            if (user.email && user.isVerified) {
                await this.calendarService.shareCalendarWithUser(calendarId, user.email, 'writer');
            }
        }
        catch (err) {
            console.warn('⚠️ Failed to share user calendar with user:', err);
        }
        return calendarId;
    }
    /**
     * สร้าง event ใส่ปฏิทินของผู้ใช้รายบุคคล คืนค่า eventId
     */
    async syncTaskToUserCalendar(task, userId) {
        const calendarId = await this.ensureUserCalendar(userId);
        const viewerRole = this.getUserRole(task, userId);
        const eventId = await this.calendarService.createTaskEvent(task, calendarId, undefined, { viewerRole });
        return { calendarId, eventId };
    }
    /**
     * อัปเดตงานใน Calendar
     */
    async updateTaskInCalendar(task, updates) {
        try {
            const anyTask = task;
            const userEventMap = anyTask.googleEventIds || {};
            const entries = Object.entries(userEventMap);
            if (entries.length > 0) {
                for (const [userId, info] of entries) {
                    try {
                        const role = this.getUserRole(task, userId);
                        const desc = this.calendarService.buildEventDescription(task, role);
                        await this.calendarService.updateTaskEvent(info.eventId, info.calendarId, updates, { overrideDescription: desc });
                    }
                    catch (err) {
                        console.warn('⚠️ Failed to update user calendar event:', err);
                    }
                }
                return;
            }
            // Backward-compatibility: update group event if present
            if (task.googleEventId) {
                const group = await this.userService.findGroupById(task.groupId);
                if (group?.settings.googleCalendarId) {
                    await this.calendarService.updateTaskEvent(task.googleEventId, group.settings.googleCalendarId, updates);
                }
            }
        }
        catch (error) {
            console.error('❌ Error updating task in calendar:', error);
            // ไม่ throw error เพื่อไม่ให้กระทบกับการอัปเดตงานในระบบ
        }
    }
    /**
     * ลบงานจาก Calendar
     */
    async removeTaskFromCalendar(task) {
        try {
            const anyTask = task;
            const userEventMap = anyTask.googleEventIds || {};
            const entries = Object.entries(userEventMap);
            if (entries.length > 0) {
                for (const [, info] of entries) {
                    try {
                        await this.calendarService.deleteTaskEvent(info.eventId, info.calendarId);
                    }
                    catch (err) {
                        console.warn('⚠️ Failed to delete user calendar event:', err);
                    }
                }
                return;
            }
            if (task.googleEventId) {
                const group = await this.userService.findGroupById(task.groupId);
                if (group?.settings.googleCalendarId) {
                    await this.calendarService.deleteTaskEvent(task.googleEventId, group.settings.googleCalendarId);
                }
            }
        }
        catch (error) {
            console.error('❌ Error removing task from calendar:', error);
        }
    }
    /**
     * ลบอีเวนต์ของงานออกจากปฏิทินของผู้ใช้รายหนึ่ง (ตาม mapping ที่บันทึกในงาน)
     */
    async removeTaskFromUserCalendar(task, userId) {
        try {
            const anyTask = task;
            const map = anyTask.googleEventIds || {};
            const info = map[userId];
            if (!info)
                return;
            await this.calendarService.deleteTaskEvent(info.eventId, info.calendarId);
        }
        catch (error) {
            console.warn('⚠️ Failed to remove task from a user calendar:', error);
        }
    }
    /**
     * แชร์ Calendar กับสมาชิกในกลุ่ม
     */
    async shareCalendarWithMembers(groupId, userIds) {
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
                    await this.calendarService.shareCalendarWithUser(group.settings.googleCalendarId, member.email, member.role === 'admin' ? 'writer' : 'reader');
                }
                catch (error) {
                    console.warn(`⚠️ Failed to share calendar with ${member.email}:`, error);
                }
            }
            console.log(`✅ Shared calendar with ${targetMembers.length} members`);
        }
        catch (error) {
            console.error('❌ Error sharing calendar with members:', error);
            throw error;
        }
    }
    /**
     * ส่งออกปฏิทินเป็น .ics
     */
    async exportGroupCalendar(groupId, startDate, endDate) {
        try {
            const group = await this.userService.findGroupByLineId(groupId);
            if (!group?.settings.googleCalendarId) {
                throw new Error('Group calendar not configured');
            }
            return await this.calendarService.exportCalendar(group.settings.googleCalendarId, startDate, endDate);
        }
        catch (error) {
            console.error('❌ Error exporting group calendar:', error);
            throw error;
        }
    }
    /**
     * ดึง URL ปฏิทินสำหรับฝังในเว็บ
     */
    async getCalendarEmbedUrl(groupId) {
        try {
            const group = await this.userService.findGroupByLineId(groupId);
            if (!group?.settings.googleCalendarId) {
                throw new Error('Group calendar not configured');
            }
            return this.calendarService.generateCalendarUrl(group.settings.googleCalendarId);
        }
        catch (error) {
            console.error('❌ Error getting calendar embed URL:', error);
            throw error;
        }
    }
    /**
     * ซิงค์งานทั้งหมดของกลุ่มไปยัง Calendar
     * หมายเหตุ: Method นี้ต้องถูกเรียกจาก TaskService เพื่อหลีกเลี่ยง circular dependency
     */
    async syncTaskListToCalendar(tasks, groupCalendarId) {
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
                }
                catch (error) {
                    console.warn(`⚠️ Failed to sync task ${task.id}:`, error);
                }
            }
            console.log(`✅ Synced ${syncedCount} tasks to calendar`);
            return syncedCount;
        }
        catch (error) {
            console.error('❌ Error syncing task list to calendar:', error);
            throw error;
        }
    }
    /**
     * ทดสอบการเชื่อมต่อ Google Services
     */
    async testConnection() {
        try {
            const calendarStatus = await this.calendarService.testConnection();
            return {
                calendar: calendarStatus
            };
        }
        catch (error) {
            console.error('❌ Error testing Google connection:', error);
            return {
                calendar: false
            };
        }
    }
    /**
     * ตั้งค่า OAuth callback สำหรับ Google
     */
    async handleOAuthCallback(code, groupId) {
        try {
            const oauth2Client = new googleapis_1.google.auth.OAuth2(config_1.config.google.clientId, config_1.config.google.clientSecret, config_1.config.google.redirectUri);
            const { tokens } = await oauth2Client.getToken(code);
            if (!tokens.refresh_token) {
                throw new Error('No refresh token returned from Google');
            }
            await this.userService.updateGroupSettings(groupId, {
                googleRefreshToken: tokens.refresh_token
            });
            this.calendarService.setCredentials(tokens);
            console.log('✅ Google OAuth credentials set for group');
        }
        catch (error) {
            console.error('❌ Error handling OAuth callback:', error);
            throw error;
        }
    }
}
exports.GoogleService = GoogleService;
//# sourceMappingURL=GoogleService.js.map