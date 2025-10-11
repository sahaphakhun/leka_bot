export declare class CronService {
    private taskService;
    private notificationService;
    private kpiService;
    private fileBackupService;
    private recurringTaskService;
    private jobs;
    private isStarted;
    constructor();
    start(): void;
    stop(): void;
    /**
     * ประมวลผลการเตือนงาน
     */
    private processReminders;
    /**
     * ประมวลผลงานที่เกินกำหนด
     */
    private processOverdueTasks;
    /**
     * ส่งรายงานรายสัปดาห์ (ศุกร์ 13:00)
     */
    private sendWeeklyReports;
    /** ส่งสรุปรายวัน: งานที่ยังไม่เสร็จในแต่ละกลุ่ม เวลา 08:00 น. */
    private sendDailyIncompleteTaskSummaries;
    /**
     * สร้าง Flex Message สำหรับรายงานรายวัน
     */
    private createDailySummaryFlexMessage;
    /**
     * สร้าง Flex Message สำหรับรายงานรายวันส่วนบุคคล
     */
    private createPersonalDailyReportFlexMessage;
    /**
     * สร้างการ์ดงานส่วนบุคคล (Flex Message)
     */
    private createPersonalTaskFlexMessage;
    /** ส่งสรุปสำหรับผู้จัดการทุกเช้า: งานที่ยังไม่ส่ง / ใครล่าช้า / ใครยังไม่ตรวจ */
    private sendManagerDailySummaries;
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ (รวมทุกกลุ่ม)
     */
    private sendManagerWeeklySummaries;
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ (รวมทุกกลุ่ม)
     */
    private createManagerWeeklyConsolidatedReportFlexMessage;
    /**
     * ส่งรายงานรายสัปดาห์สำหรับหัวหน้างาน
     */
    private sendSupervisorWeeklySummaries;
    /**
     * สร้าง Flex Message สำหรับรายงานหัวหน้างาน
     */
    private createSupervisorWeeklyReportFlexMessage;
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ
     */
    private createManagerDailyReportFlexMessage;
    /**
     * อัปเดต KPI และ Leaderboard ทุกเที่ยงคืน
     */
    private updateKPIRecords;
    /**
     * ตรวจงานประจำทุกนาที - สร้างงานใหม่จากแม่แบบที่ถึงเวลา
     */
    private processRecurringTasks;
    /**
     * แปลงช่วงเวลาการเตือนเป็นหน่วยและจำนวน
     */
    private parseReminderInterval;
    /**
     * ส่งการเตือนงาน
     */
    private sendTaskReminder;
    /**
     * ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวัน
     */
    private sendDailyOverdueSummary;
    /**
     * ส่งการเตือนผู้ตรวจสำหรับงานรอตรวจทุกวันเวลา 9:00 น.
     */
    private sendDailyReviewReminders;
    /**
     * ตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่มและลบข้อมูลงานทุกวันเวลา 10:00 น.
     */
    private checkBotMembershipAndCleanup;
    /**
     * ส่งการแจ้งเตือนการทำความสะอาดให้ admin
     */
    private sendCleanupNotification;
    /**
     * คัดลอกไฟล์แนบไปยัง Google Drive อัตโนมัติ
     */
    private runFileBackups;
    /**
     * สร้าง Flex Message สำหรับ Leaderboard
     */
    private createLeaderboardFlexMessage;
}
//# sourceMappingURL=CronService.d.ts.map