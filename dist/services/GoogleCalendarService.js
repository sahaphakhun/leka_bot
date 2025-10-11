"use strict";
// Google Calendar Service - จัดการ Google Calendar API
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const googleapis_1 = require("googleapis");
const config_1 = require("@/utils/config");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const serviceContainer_1 = require("@/utils/serviceContainer");
class GoogleCalendarService {
    constructor(userService = serviceContainer_1.serviceContainer.get('UserService')) {
        this.authType = 'oauth2';
        this.userService = userService;
        this.initializeAuth();
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.auth });
    }
    /**
     * ตั้งค่า Google Authentication
     */
    initializeAuth() {
        // TEMP DEBUG: ตรวจว่า ENV ถูกอ่านจริง
        try {
            const envJsonLen = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').length;
            const envPkLen = (process.env.GOOGLE_SA_PRIVATE_KEY || '').length;
            console.log(`🔎 GOOGLE_SERVICE_ACCOUNT_JSON length: ${envJsonLen}`);
            console.log(`🔎 GOOGLE_SA_PRIVATE_KEY length: ${envPkLen}`);
        }
        catch { }
        if (config_1.config.google.serviceAccountJson) {
            // ใช้ Service Account JSON จาก Environment Variable (สำหรับ Railway)
            try {
                const serviceAccount = JSON.parse(config_1.config.google.serviceAccountJson);
                this.auth = new googleapis_1.google.auth.GoogleAuth({
                    credentials: serviceAccount,
                    scopes: [
                        'https://www.googleapis.com/auth/calendar',
                        'https://www.googleapis.com/auth/calendar.events'
                    ]
                });
                this.authType = 'serviceAccount';
                console.log('✅ Using Google Service Account from environment variable');
            }
            catch (error) {
                console.error('❌ Service Account JSON parsing failed:', error);
                this.setupOAuth();
            }
        }
        else if (config_1.config.google.serviceAccountClientEmail && config_1.config.google.serviceAccountPrivateKey) {
            // รองรับรูปแบบตัวแปรแยก (CLIENT_EMAIL + PRIVATE_KEY)
            try {
                const clientEmail = config_1.config.google.serviceAccountClientEmail;
                const privateKeyRaw = config_1.config.google.serviceAccountPrivateKey;
                const privateKey = privateKeyRaw.includes('\n') ? privateKeyRaw.replace(/\\n/g, '\n') : privateKeyRaw;
                const projectId = config_1.config.google.serviceAccountProjectId || undefined;
                const credentials = {
                    client_email: clientEmail,
                    private_key: privateKey,
                    project_id: projectId
                };
                this.auth = new googleapis_1.google.auth.GoogleAuth({
                    credentials,
                    scopes: [
                        'https://www.googleapis.com/auth/calendar',
                        'https://www.googleapis.com/auth/calendar.events'
                    ]
                });
                this.authType = 'serviceAccount';
                console.log('✅ Using Google Service Account from separate env vars (client_email/private_key)');
            }
            catch (error) {
                console.error('❌ Service Account (separate vars) setup failed:', error);
                this.setupOAuth();
            }
        }
        else if (config_1.config.google.serviceAccountKey) {
            // ใช้ Service Account จากไฟล์ (สำหรับ local development)
            try {
                const serviceAccount = require(config_1.config.google.serviceAccountKey);
                this.auth = new googleapis_1.google.auth.GoogleAuth({
                    credentials: serviceAccount,
                    scopes: [
                        'https://www.googleapis.com/auth/calendar',
                        'https://www.googleapis.com/auth/calendar.events'
                    ]
                });
                this.authType = 'serviceAccount';
                console.log('✅ Using Google Service Account from file');
            }
            catch (error) {
                console.error('❌ Service Account setup failed:', error);
                this.setupOAuth();
            }
        }
        else {
            // ใช้ OAuth (สำหรับ development)
            this.setupOAuth();
        }
    }
    /**
     * ตั้งค่า OAuth
     */
    setupOAuth() {
        this.auth = new googleapis_1.google.auth.OAuth2(config_1.config.google.clientId, config_1.config.google.clientSecret, config_1.config.google.redirectUri);
        this.authType = 'oauth2';
        // TODO: ใช้ refresh token ที่เก็บไว้ในฐานข้อมูล
        // this.auth.setCredentials({
        //   refresh_token: 'stored_refresh_token'
        // });
    }
    /**
     * ตั้งค่า OAuth credentials หลังจากแลกเปลี่ยน token แล้ว
     */
    setCredentials(tokens) {
        try {
            this.auth?.setCredentials(tokens);
        }
        catch (error) {
            console.error('❌ Error setting OAuth credentials:', error);
        }
    }
    /**
     * สร้าง Calendar ใหม่สำหรับกลุ่ม
     */
    async createGroupCalendar(groupName, timezone = config_1.config.app.defaultTimezone) {
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
            return calendarId;
        }
        catch (error) {
            console.error('❌ Error creating group calendar:', error);
            throw error;
        }
    }
    /**
     * สร้าง Event จากงาน
     */
    async createTaskEvent(task, calendarId, attendeeEmails, options) {
        try {
            const attendees = attendeeEmails
                ? attendeeEmails.map(email => ({ email }))
                : await this.getTaskAttendees(task);
            const includeAttendees = attendees.length > 0 && this.authType !== 'serviceAccount';
            if (!includeAttendees && attendees.length > 0 && this.authType === 'serviceAccount') {
                console.warn('⚠️ Service account cannot invite attendees - skipping attendee list');
            }
            const event = {
                summary: task.title,
                description: this.buildEventDescription(task, options?.viewerRole),
                start: {
                    dateTime: task.startTime
                        ? (0, moment_timezone_1.default)(task.startTime).toISOString()
                        : (0, moment_timezone_1.default)(task.dueTime).subtract(1, 'hour').toISOString(),
                    timeZone: config_1.config.app.defaultTimezone
                },
                end: {
                    dateTime: (0, moment_timezone_1.default)(task.dueTime).toISOString(),
                    timeZone: config_1.config.app.defaultTimezone
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
            return eventId;
        }
        catch (error) {
            console.error('❌ Error creating calendar event:', error);
            throw error;
        }
    }
    /**
     * อัปเดต Event
     */
    async updateTaskEvent(eventId, calendarId, updates, options) {
        try {
            const event = {};
            if (updates.title) {
                event.summary = updates.title;
            }
            if (options?.overrideDescription) {
                event.description = options.overrideDescription;
            }
            else if (updates.description) {
                event.description = this.formatEventDescription(updates);
            }
            if (updates.dueTime) {
                event.end = {
                    dateTime: (0, moment_timezone_1.default)(updates.dueTime).toISOString(),
                    timeZone: config_1.config.app.defaultTimezone
                };
            }
            if (updates.startTime) {
                event.start = {
                    dateTime: (0, moment_timezone_1.default)(updates.startTime).toISOString(),
                    timeZone: config_1.config.app.defaultTimezone
                };
            }
            // If a task is completed or cancelled, clear reminders to prevent future alerts
            if (updates.status === 'completed' || updates.status === 'cancelled') {
                event.reminders = {
                    useDefault: false,
                    overrides: []
                };
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
        }
        catch (error) {
            console.error('❌ Error updating calendar event:', error);
            throw error;
        }
    }
    /**
     * ลบ Event
     */
    async deleteTaskEvent(eventId, calendarId) {
        try {
            await this.calendar.events.delete({
                calendarId,
                eventId,
                sendUpdates: 'all'
            });
            console.log(`✅ Deleted calendar event: ${eventId}`);
        }
        catch (error) {
            console.error('❌ Error deleting calendar event:', error);
            throw error;
        }
    }
    /**
     * ดึง Events ในช่วงเวลา
     */
    async getCalendarEvents(calendarId, startDate, endDate) {
        try {
            const response = await this.calendar.events.list({
                calendarId,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                orderBy: 'startTime',
                singleEvents: true
            });
            return response.data.items || [];
        }
        catch (error) {
            console.error('❌ Error getting calendar events:', error);
            throw error;
        }
    }
    /**
     * แชร์ Calendar กับผู้ใช้
     */
    async shareCalendarWithUser(calendarId, email, role = 'reader') {
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
        }
        catch (error) {
            console.error('❌ Error sharing calendar:', error);
            throw error;
        }
    }
    /**
     * สร้าง Calendar Link สำหรับ public view
     */
    generateCalendarUrl(calendarId) {
        return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`;
    }
    /**
     * สร้าง .ics file สำหรับ export
     */
    async exportCalendar(calendarId, startDate, endDate) {
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
                    icsContent.push('BEGIN:VEVENT', `UID:${event.id}@leka-bot.com`, `DTSTART:${(0, moment_timezone_1.default)(event.start.dateTime).utc().format('YYYYMMDDTHHmmss')}Z`, `DTEND:${(0, moment_timezone_1.default)(event.end.dateTime).utc().format('YYYYMMDDTHHmmss')}Z`, `SUMMARY:${event.summary || 'ไม่มีชื่อ'}`, `DESCRIPTION:${event.description || ''}`, `CREATED:${(0, moment_timezone_1.default)(event.created).utc().format('YYYYMMDDTHHmmss')}Z`, `LAST-MODIFIED:${(0, moment_timezone_1.default)(event.updated).utc().format('YYYYMMDDTHHmmss')}Z`, 'END:VEVENT');
                }
            });
            icsContent.push('END:VCALENDAR');
            return icsContent.join('\r\n');
        }
        catch (error) {
            console.error('❌ Error exporting calendar:', error);
            throw error;
        }
    }
    // Helper Methods
    /**
     * จัดรูปแบบคำอธิบาย Event
     */
    formatEventDescription(task) {
        let description = '';
        // รายละเอียดงาน
        if (task?.description) {
            description += `📝 ${task.description}\n\n`;
        }
        // ผู้สั่งงาน (ถ้ามีข้อมูลผู้ใช้)
        const creatorName = task?.createdByUser?.displayName
            || task?.createdByUser?.realName
            || undefined;
        if (creatorName) {
            description += `👤 ผู้สั่งงาน: ${creatorName}\n`;
        }
        // ผู้รับผิดชอบ (ถ้ามี)
        if (Array.isArray(task?.assignedUsers) && task.assignedUsers.length > 0) {
            const names = task.assignedUsers
                .map(u => u.displayName || u.realName)
                .filter(Boolean)
                .join(', ');
            if (names) {
                description += `🧑‍💼 ผู้รับผิดชอบ: ${names}\n`;
            }
        }
        // สถานะ / ความสำคัญ
        description += `🎯 สถานะ: ${this.getStatusText(task.status)}\n`;
        description += `⚡ ระดับ: ${this.getPriorityText(task.priority)}\n`;
        // แท็ก
        if (task?.tags && task.tags.length > 0) {
            description += `🏷️ แท็ก: ${task.tags.map((tag) => `#${tag}`).join(' ')}\n`;
        }
        // ไฟล์แนบ (แสดงจำนวนถ้ามี)
        const attachmentCount = Array.isArray(task?.attachedFiles) ? task.attachedFiles.length : 0;
        if (attachmentCount > 0) {
            description += `📎 ไฟล์แนบ: ${attachmentCount} ไฟล์ (เปิดดูใน Dashboard)\n`;
        }
        // ลิงก์ไปยัง Dashboard แบบ deep link เพื่อเปิดรายละเอียดงานทันที
        const groupId = task?.groupId;
        const taskId = task?.id;
        const detailUrl = groupId && taskId
            ? `${config_1.config.baseUrl}/dashboard?groupId=${encodeURIComponent(groupId)}&taskId=${encodeURIComponent(taskId)}&action=view`
            : `${config_1.config.baseUrl}/dashboard`;
        description += `\n🔗 เปิดรายละเอียด: ${detailUrl}`;
        // เพิ่มลิงก์แบบเฉพาะบุคคล (ถ้ารู้ LINE userId ของผู้รับผิดชอบ)
        try {
            const assignees = Array.isArray(task?.assignedUsers) ? task.assignedUsers : [];
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
        }
        catch { }
        description += `\n🤖 สร้างโดยเลขาบอท`;
        return description;
    }
    /**
     * สร้างคำอธิบาย Event พร้อมบอกบทบาทของผู้ใช้งานที่ดูปฏิทิน
     */
    buildEventDescription(task, viewerRole) {
        const base = this.formatEventDescription(task);
        if (!viewerRole)
            return base;
        const roleMap = {
            assignee: 'ผู้รับผิดชอบ',
            creator: 'ผู้สร้างงาน',
            reviewer: 'ผู้ตรวจ'
        };
        return `👤 บทบาทของคุณ: ${roleMap[viewerRole] || viewerRole}\n` + base;
    }
    /**
     * สร้าง Calendar ใหม่สำหรับผู้ใช้ (ปฏิทินรายบุคคล)
     */
    async createUserCalendar(userName, timezone = config_1.config.app.defaultTimezone) {
        try {
            const calendar = {
                summary: `เลขาบอท - งานของ ${userName}`,
                description: `ปฏิทินงานส่วนบุคคลสำหรับ ${userName} จากระบบเลขาบอท`,
                timeZone: timezone
            };
            const response = await this.calendar.calendars.insert({
                requestBody: calendar
            });
            const calendarId = response.data.id;
            console.log(`✅ Created user calendar for: ${userName} (${calendarId})`);
            return calendarId;
        }
        catch (error) {
            console.error('❌ Error creating user calendar:', error);
            throw error;
        }
    }
    /**
     * แปลง reminders เป็นรูปแบบของ Google Calendar
     */
    convertRemindersToCalendar(reminders) {
        return reminders.map(reminder => {
            let minutes = 60; // default 1 hour
            if (reminder.includes('P1D') || reminder === '1d') {
                minutes = 24 * 60; // 1 day
            }
            else if (reminder.includes('PT3H') || reminder === '3h') {
                minutes = 3 * 60; // 3 hours
            }
            else if (reminder.includes('PT1H') || reminder === '1h') {
                minutes = 60; // 1 hour
            }
            return {
                method: 'email',
                minutes
            };
        });
    }
    /**
     * แปลงสถานะเป็นข้อความ
     */
    getStatusText(status) {
        const statusMap = {
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
    getPriorityText(priority) {
        const priorityMap = {
            low: 'ต่ำ',
            medium: 'ปานกลาง',
            high: 'สูง'
        };
        return priorityMap[priority] || priority;
    }
    /**
     * แปลง Task เป็น attendees สำหรับ Google Calendar
     */
    async getTaskAttendees(task) {
        const userIds = [];
        if ('assignees' in task && Array.isArray(task.assignees)) {
            userIds.push(...task.assignees);
        }
        else if ('assignedUsers' in task && Array.isArray(task.assignedUsers)) {
            for (const user of task.assignedUsers) {
                if (typeof user === 'string') {
                    userIds.push(user);
                }
                else if (user?.id) {
                    userIds.push(user.id);
                }
            }
        }
        if (userIds.length === 0)
            return [];
        const users = await Promise.all(userIds.map(id => this.userService.findById(id)));
        return users
            .filter((user) => !!user && !!user.email && user.isVerified)
            .map(user => ({
            email: user.email,
            displayName: user.realName || user.displayName || `ผู้ใช้ ${user.id}`
        }));
    }
    /**
     * ตรวจสอบการเชื่อมต่อ
     */
    async testConnection() {
        try {
            await this.calendar.calendarList.list();
            console.log('✅ Google Calendar connection successful');
            return true;
        }
        catch (error) {
            console.error('❌ Google Calendar connection failed:', error);
            return false;
        }
    }
}
exports.GoogleCalendarService = GoogleCalendarService;
//# sourceMappingURL=GoogleCalendarService.js.map