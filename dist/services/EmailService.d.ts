import { User } from '@/types';
export declare class EmailService {
    private transporter;
    private _sentTaskCreatedEmails;
    constructor();
    /**
     * ทดสอบการเชื่อมต่อ SMTP
     */
    verifyConnection(): Promise<boolean>;
    /**
     * ส่งอีเมลเตือนงาน
     */
    sendTaskReminder(user: User, task: any, reminderType: string): Promise<void>;
    /**
     * ส่งอีเมลแจ้งงานใหม่
     */
    sendTaskCreatedNotification(user: User, task: any): Promise<void>;
    /**
     * ส่งอีเมลแจ้งงานเกินกำหนด
     */
    sendOverdueNotification(user: User, task: any, overdueHours: number): Promise<void>;
    /**
     * ส่งอีเมลสรุปรายสัปดาห์
     */
    sendWeeklyReport(user: User, groupName: string, groupId: string, stats: any, tasks: any[]): Promise<void>;
    /**
     * สร้างเทมเพลตอีเมลเตือนงาน
     */
    private createTaskReminderTemplate;
    /**
     * สร้างเทมเพลตอีเมลงานใหม่
     */
    private createTaskCreatedTemplate;
    /**
     * สร้างเทมเพลตอีเมลงานเกินกำหนด
     */
    private createOverdueTemplate;
    /**
     * สร้างเทมเพลตรายงานรายสัปดาห์
     */
    private createWeeklyReportTemplate;
    /**
     * แปลงระดับความสำคัญเป็นข้อความ
     */
    private getPriorityText;
    /**
     * แปลงสถานะเป็นข้อความ
     */
    private getStatusText;
    /**
     * จัดรูปแบบขนาดไฟล์
     */
    private formatFileSize;
}
//# sourceMappingURL=EmailService.d.ts.map