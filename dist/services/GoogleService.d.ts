import { Task } from '@/types';
import { Task as TaskEntity } from '@/models';
export declare class GoogleService {
    private calendarService;
    private userService;
    constructor();
    private getUserRole;
    /**
     * ตั้งค่า Google Calendar สำหรับกลุ่มใหม่
     */
    setupGroupCalendar(groupId: string, groupName: string, timezone?: string): Promise<string>;
    /**
     * ซิงค์งานไปยัง Google Calendar
     */
    syncTaskToCalendar(task: Task | TaskEntity, groupCalendarId: string, attendeeEmails?: string[]): Promise<string>;
    /**
     * ตั้งค่า Google Calendar สำหรับผู้ใช้ (รายบุคคล) และแชร์ให้ผู้ใช้อัตโนมัติ
     */
    ensureUserCalendar(userId: string): Promise<string>;
    /**
     * สร้าง event ใส่ปฏิทินของผู้ใช้รายบุคคล คืนค่า eventId
     */
    syncTaskToUserCalendar(task: Task | TaskEntity, userId: string): Promise<{
        calendarId: string;
        eventId: string;
    }>;
    /**
     * อัปเดตงานใน Calendar
     */
    updateTaskInCalendar(task: Task | TaskEntity, updates: Partial<Task>): Promise<void>;
    /**
     * ลบงานจาก Calendar
     */
    removeTaskFromCalendar(task: Task | TaskEntity): Promise<void>;
    /**
     * ลบอีเวนต์ของงานออกจากปฏิทินของผู้ใช้รายหนึ่ง (ตาม mapping ที่บันทึกในงาน)
     */
    removeTaskFromUserCalendar(task: Task | TaskEntity, userId: string): Promise<void>;
    /**
     * แชร์ Calendar กับสมาชิกในกลุ่ม
     */
    shareCalendarWithMembers(groupId: string, userIds?: string[]): Promise<void>;
    /**
     * ส่งออกปฏิทินเป็น .ics
     */
    exportGroupCalendar(groupId: string, startDate: Date, endDate: Date): Promise<string>;
    /**
     * ดึง URL ปฏิทินสำหรับฝังในเว็บ
     */
    getCalendarEmbedUrl(groupId: string): Promise<string>;
    /**
     * ซิงค์งานทั้งหมดของกลุ่มไปยัง Calendar
     * หมายเหตุ: Method นี้ต้องถูกเรียกจาก TaskService เพื่อหลีกเลี่ยง circular dependency
     */
    syncTaskListToCalendar(tasks: TaskEntity[], groupCalendarId: string): Promise<number>;
    /**
     * ทดสอบการเชื่อมต่อ Google Services
     */
    testConnection(): Promise<{
        calendar: boolean;
    }>;
    /**
     * ตั้งค่า OAuth callback สำหรับ Google
     */
    handleOAuthCallback(code: string, groupId: string): Promise<void>;
}
//# sourceMappingURL=GoogleService.d.ts.map