import { calendar_v3 } from 'googleapis';
import { Task } from '@/types';
import { Task as TaskEntity } from '@/models';
import { UserService } from './UserService';
export declare class GoogleCalendarService {
    private calendar;
    private auth;
    private userService;
    private authType;
    constructor(userService?: UserService);
    /**
     * ตั้งค่า Google Authentication
     */
    private initializeAuth;
    /**
     * ตั้งค่า OAuth
     */
    private setupOAuth;
    /**
     * ตั้งค่า OAuth credentials หลังจากแลกเปลี่ยน token แล้ว
     */
    setCredentials(tokens: any): void;
    /**
     * สร้าง Calendar ใหม่สำหรับกลุ่ม
     */
    createGroupCalendar(groupName: string, timezone?: string): Promise<string>;
    /**
     * สร้าง Event จากงาน
     */
    createTaskEvent(task: Task | TaskEntity, calendarId: string, attendeeEmails?: string[], options?: {
        viewerRole?: 'assignee' | 'creator' | 'reviewer';
    }): Promise<string>;
    /**
     * อัปเดต Event
     */
    updateTaskEvent(eventId: string, calendarId: string, updates: Partial<Task>, options?: {
        overrideDescription?: string;
    }): Promise<void>;
    /**
     * ลบ Event
     */
    deleteTaskEvent(eventId: string, calendarId: string): Promise<void>;
    /**
     * ดึง Events ในช่วงเวลา
     */
    getCalendarEvents(calendarId: string, startDate: Date, endDate: Date): Promise<calendar_v3.Schema$Event[]>;
    /**
     * แชร์ Calendar กับผู้ใช้
     */
    shareCalendarWithUser(calendarId: string, email: string, role?: 'reader' | 'writer'): Promise<void>;
    /**
     * สร้าง Calendar Link สำหรับ public view
     */
    generateCalendarUrl(calendarId: string): string;
    /**
     * สร้าง .ics file สำหรับ export
     */
    exportCalendar(calendarId: string, startDate: Date, endDate: Date): Promise<string>;
    /**
     * จัดรูปแบบคำอธิบาย Event
     */
    private formatEventDescription;
    /**
     * สร้างคำอธิบาย Event พร้อมบอกบทบาทของผู้ใช้งานที่ดูปฏิทิน
     */
    buildEventDescription(task: Task | TaskEntity, viewerRole?: 'assignee' | 'creator' | 'reviewer'): string;
    /**
     * สร้าง Calendar ใหม่สำหรับผู้ใช้ (ปฏิทินรายบุคคล)
     */
    createUserCalendar(userName: string, timezone?: string): Promise<string>;
    /**
     * แปลง reminders เป็นรูปแบบของ Google Calendar
     */
    private convertRemindersToCalendar;
    /**
     * แปลงสถานะเป็นข้อความ
     */
    private getStatusText;
    /**
     * แปลงระดับความสำคัญเป็นข้อความ
     */
    private getPriorityText;
    /**
     * แปลง Task เป็น attendees สำหรับ Google Calendar
     */
    private getTaskAttendees;
    /**
     * ตรวจสอบการเชื่อมต่อ
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=GoogleCalendarService.d.ts.map