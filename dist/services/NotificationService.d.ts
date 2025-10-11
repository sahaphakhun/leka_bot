import { User } from '@/types';
export declare class NotificationService {
    private lineService;
    private userService;
    private emailService;
    private fileService;
    private _sentNotifications;
    constructor();
    /**
     * ส่งการเตือนงาน
     */
    sendTaskReminder(task: any, reminderType: string): Promise<void>;
    /**
     * ส่งการแจ้งเตือนงานเกินกำหนด
     */
    sendOverdueNotification(data: {
        task: any;
        overdueHours: number;
    }): Promise<void>;
    /**
     * ส่งการแจ้งเตือนงานใหม่
     */
    sendTaskCreatedNotification(task: any): Promise<void>;
    /**
     * ส่งการแจ้งเตือนงานสำเร็จ
     */
    sendTaskCompletedNotification(task: any, completedBy: User): Promise<void>;
    /** แจ้งว่าลบงานแล้ว */
    sendTaskDeletedNotification(task: any): Promise<void>;
    /** แจ้งว่าแก้งาน/อัปเดตรายละเอียดงาน */
    sendTaskUpdatedNotification(task: any, changes: Record<string, any>): Promise<void>;
    /** แจ้งว่ามีการส่งงาน (แนบไฟล์/ลิงก์) */
    sendTaskSubmittedNotification(task: any, submitterDisplayName: string, fileCount: number, links: string[], comment?: string): Promise<void>;
    /**
     * สร้าง Flex Message สำหรับการแจ้งเตือนการส่งงาน
     */
    private createTaskSubmittedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานรอตรวจ
     */
    private createReviewRequestFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานที่อนุมัติอัตโนมัติ
     */
    private createTaskAutoApprovedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานที่ถูกปฏิเสธ
     */
    private createTaskRejectedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับการอนุมัติเลื่อนเวลา
     */
    private createExtensionApprovedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับการปฏิเสธเลื่อนเวลา
     */
    private createExtensionRejectedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับการเตือนงาน
     */
    private createTaskReminderFlexMessage;
    /**
     * สร้าง Flex Message สำหรับการเตือนงานส่วนบุคคล
     */
    private createPersonalTaskReminderFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานเกินกำหนด
     */
    private createOverdueTaskFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานเกินกำหนดส่วนบุคคล
     */
    private createPersonalOverdueTaskFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานใหม่
     */
    private createTaskCreatedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานใหม่ส่วนบุคคล
     */
    private createPersonalTaskCreatedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานใหม่ส่วนบุคคล (ผู้สร้างงาน)
     */
    private createCreatorTaskCreatedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานสำเร็จ
     */
    private createTaskCompletedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานที่ถูกลบ
     */
    private createTaskDeletedFlexMessage;
    /**
     * สร้าง Flex Message สำหรับงานที่อัปเดต
     */
    private createTaskUpdatedFlexMessage;
    /**
     * ดึงผู้ตรวจงาน
     */
    private getTaskReviewer;
    /**
     * ส่งรายงานรายสัปดาห์
     */
    sendWeeklyReport(group: any, stats: any, leaderboard: any[]): Promise<void>;
    /**
     * ส่งรายงานรายสัปดาห์ให้ admin
     */
    sendWeeklyReportToAdmins(group: any, stats: any, leaderboard: any[]): Promise<void>;
    /**
     * ส่งการแจ้งเตือนงานที่ถูกตีกลับ
     */
    sendTaskRejectedNotification(task: any, reviewer: any, extensionDays: string): Promise<void>;
    /**
     * ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
     */
    sendExtensionApprovedNotification(task: any, requester: any, newDueTime: Date): Promise<void>;
    /**
     * ส่งการแจ้งเตือนการปฏิเสธเลื่อนเวลา
     */
    sendExtensionRejectedNotification(task: any, requester: any): Promise<void>;
    /**
     * ส่งการแจ้งเตือนงานที่อนุมัติอัตโนมัติ
     */
    sendTaskAutoApprovedNotification(task: any): Promise<void>;
    /**
     * ส่งการขอตรวจงาน
     */
    sendReviewRequest(task: any, reviewerUserId: string, details: any): Promise<void>;
    /**
     * ส่งการขออนุมัติการปิดงาน
     */
    sendApprovalRequest(task: any, approverUserId: string, reviewer: any): Promise<void>;
    /**
     * Helper method สำหรับข้อความเตือน
     */
    private getReminderTimeText;
    /**
     * Helper method สำหรับอิโมจิเตือน
     */
    private getReminderEmoji;
    /**
     * Helper method สำหรับสีความสำคัญ
     */
    private getPriorityColor;
    /**
     * Helper method สำหรับข้อความความสำคัญ
     */
    private getPriorityText;
    /**
     * Helper method สำหรับคำนวณคะแนนการทำงาน
     */
    private calculateCompletionScore;
    /** แจ้งผู้ตรวจว่ามีงานรอการตรวจ */
    sendReviewRequestNotification(task: any, details: {
        submitterDisplayName?: string;
        fileCount?: number;
        links?: string[];
    }): Promise<void>;
    /**
     * สร้าง Flex Message สำหรับรายงานรายสัปดาห์
     */
    private createWeeklyReportFlexMessage;
    /**
     * สร้าง Flex Message สำหรับรายงานรายสัปดาห์ให้ admin
     */
    private createAdminWeeklyReportFlexMessage;
    /**
     * สร้าง Flex Message สำหรับรายงานรายวัน
     */
    private createDailyReportFlexMessage;
    /**
     * สร้าง Flex Message สำหรับรายงานรายวันส่วนบุคคล
     */
    private createPersonalDailyReportFlexMessage;
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ
     */
    private createManagerDailyReportFlexMessage;
    /**
     * สร้าง Flex Message สำหรับรายงานหัวหน้างาน
     */
    private createSupervisorWeeklyReportFlexMessage;
    /**
     * ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวัน
     */
    sendDailyOverdueSummary(): Promise<void>;
}
//# sourceMappingURL=NotificationService.d.ts.map