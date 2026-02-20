import { BotCommand } from '@/types';
export declare class CommandService {
    private taskService;
    private userService;
    private fileService;
    private kpiService;
    private taskDeletionService;
    constructor();
    /**
     * ประมวลผลคำสั่งหลัก
     */
    executeCommand(command: BotCommand): Promise<string | any>;
    /**
     * คำสั่ง /setup - ตั้งค่าและเข้าใช้ Dashboard
     */
    private handleSetupCommand;
    /**
     * จัดการการตั้งค่าผู้บังคับบัญชา
     */
    private handleSetupSupervisors;
    /**
     * คำสั่ง /help - แสดงคำสั่งทั้งหมด
     */
    private getHelpMessage;
    /**
     * เพิ่มงาน - แสดงการ์ดพร้อมปุ่มไปหน้าเว็บเพิ่มงาน
     */
    private handleAddTaskCommand;
    /**
     * ลบงาน - แสดงการ์ดเพื่อเปิดหน้าเว็บลบงานที่เลือก
     */
    private handleDeleteTasksCommand;
    /**
     * รับคำว่า "ยอมรับ" เพื่ออนุมัติการลบงาน
     */
    private handleApproveDeletionCommand;
    /**
     * คำสั่งเซฟไฟล์ - บันทึกไฟล์ทั้งหมดใน 1 ชั่วโมงล่าสุด
     */
    private handleSaveFilesCommand;
    /**
     * คำสั่ง /delete - ลบงานทั้งหมดในกลุ่ม (รีเซต)
     */
    private handleDeleteAllTasksCommand;
    /**
     * คำสั่ง /whoami - ตรวจสอบข้อมูลผู้ใช้
     */
    private handleWhoAmICommand;
    /**
     * คำสั่ง /leaderboard, /kpi, /คะแนน, /สถิติ - แสดง KPI และ Leaderboard
     */
    private handleLeaderboardCommand;
    /**
     * คำสั่ง /stats, /สถิติรายสัปดาห์ - แสดงสถิติรายสัปดาห์ของกลุ่ม
     */
    private handleWeeklyStatsCommand;
}
//# sourceMappingURL=CommandService.d.ts.map