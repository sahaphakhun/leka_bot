import { KPIRecord, Task } from '@/models';
import { Leaderboard } from '@/types';
import { Task as TaskEntity } from '@/models';
export declare class KPIService {
    private kpiRepository;
    private taskRepository;
    private userRepository;
    private groupRepository;
    constructor();
    /**
     * แปลง groupId ที่มาจาก URL ให้เป็น internal UUID ของกลุ่ม
     * - รองรับ LINE Group ID
     * - รองรับค่า 'default' โดยเลือกกลุ่มที่อัปเดตล่าสุดเป็นค่าเริ่มต้น (สำหรับ deployment บน Railway)
     */
    private resolveInternalGroupIdOrDefault;
    /** สรุปรายงานตามช่วงเวลา: กลุ่ม/บุคคล */
    getReportSummary(groupId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        period?: 'weekly' | 'monthly';
        userId?: string;
    }): Promise<{
        periodStart: Date;
        periodEnd: Date;
        totals: {
            completed: number;
            early: number;
            ontime: number;
            late: number;
            overtime: number;
            overdue: number;
            rejected: number;
            completionRate: number;
        };
    }>;
    /** รายงานแยกตามบุคคลในกลุ่ม */
    getReportByUsers(groupId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        period?: 'weekly' | 'monthly';
    }): Promise<Array<{
        userId: string;
        displayName: string;
        completed: number;
        early: number;
        ontime: number;
        late: number;
        overtime: number;
    }>>;
    /**
     * บันทึกการทำงานเสร็จ
     */
    recordTaskCompletion(task: Task | TaskEntity, completionType: 'early' | 'ontime' | 'late'): Promise<KPIRecord | null>;
    /**
     * บันทึก KPI เมื่องานเกินเวลา (0 คะแนน)
     * เพื่อป้องกันการเล่นระบบโดยไม่ส่งงาน
     */
    recordOverdueKPI(task: Task | TaskEntity): Promise<KPIRecord[]>;
    /**
     * ลบ overdue KPI records เมื่องานถูกส่งแล้ว
     */
    private removeLegacyOverdueRecords;
    /**
     * คำนวณประเภทการทำงานเสร็จ
     */
    calculateCompletionType(task: Task | TaskEntity): 'early' | 'ontime' | 'late';
    private maybeAwardStreakBonus;
    /**
     * ดึง Leaderboard ของกลุ่ม (สูตรรวม 60/30/10)
     */
    getGroupLeaderboard(groupId: string, period?: 'weekly' | 'monthly' | 'all'): Promise<Leaderboard[]>;
    /**
     * สร้างข้อมูล KPI ตัวอย่างสำหรับทดสอบ
     */
    createSampleKPIData(groupId: string): Promise<void>;
    /**
     * คำนวณค่าเฉลี่ยคะแนนของผู้ใช้
     */
    getUserAverageScore(userId: string, groupId: string, period?: 'weekly' | 'monthly' | 'all'): Promise<number>;
    /**
     * ดึงสถิติคะแนนรายสัปดาห์ของผู้ใช้
     */
    getUserWeeklyScoreHistory(userId: string, groupId: string, weeks?: number): Promise<Array<{
        week: string;
        averageScore: number;
        totalTasks: number;
    }>>;
    /**
     * ดึงสถิติตามช่วงเวลา
     */
    getStatsByPeriod(groupId: string, period?: 'this_week' | 'last_week' | 'all'): Promise<{
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        avgCompletionTime: number;
        topPerformer: string;
        period: string;
    }>;
    /**
     * ดึงสถิติรายสัปดาห์ (backward compatibility)
     */
    getWeeklyStats(groupId: string): Promise<{
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        avgCompletionTime: number;
        topPerformer: string;
    }>;
    /**
     * ดึงสถิติส่วนบุคคล
     */
    getUserStats(userId: string, groupId: string, period?: 'weekly' | 'monthly' | 'all'): Promise<{
        totalPoints: number;
        rank: number;
        tasksCompleted: number;
        tasksEarly: number;
        tasksOnTime: number;
        tasksLate: number;
        tasksOverdue: number;
        bonusPoints: number;
        penaltyPoints: number;
        completionRate: number;
        avgPointsPerTask: number;
    }>;
    /**
     * อัปเดต rankings ของ leaderboard
     */
    updateLeaderboardRankings(): Promise<void>;
    /**
     * ทำความสะอาดข้อมูลเก่า
     */
    cleanupOldRecords(daysToKeep?: number): Promise<number>;
    /**
     * ส่งออกข้อมูล KPI
     */
    exportKPIData(groupId: string, startDate: Date, endDate: Date): Promise<any[]>;
    /**
     * คำนวณ trend ของคะแนน (เปรียบเทียบกับช่วงก่อน)
     */
    private calculateTrend;
    /**
     * ดึงสถิติรายวันสำหรับรายงานผู้จัดการ
     */
    getDailyStats(groupId: string): Promise<{
        totalTasks: number;
        completedTasks: number;
        overdueTasks: number;
        pendingReviewTasks: number;
        pendingTasks: number;
    }>;
    /**
     * อัปเดตสถิติกลุ่ม
     */
    updateGroupStats(groupId: string): Promise<void>;
    /**
     * อัปเดตสถิติรายสัปดาห์
     */
    private updateWeeklyStats;
    /**
     * อัปเดตสถิติรายเดือน
     */
    private updateMonthlyStats;
    /**
     * อัปเดต Leaderboard ของกลุ่ม
     */
    updateGroupLeaderboard(groupId: string, period: 'weekly' | 'monthly'): Promise<void>;
    /**
     * ซิงค์และคำนวณคะแนน leaderboard ใหม่จากงานทั้งหมด
     */
    syncLeaderboardScores(groupId: string, period: 'weekly' | 'monthly' | 'all'): Promise<{
        processedTasks: number;
        updatedUsers: number;
        details: {
            completedTasks: number;
            overdueTasks: number;
            earlyCompletions: number;
            onTimeCompletions: number;
            lateCompletions: number;
            penaltyRecords: number;
        };
    }>;
    /**
     * ดึงข้อมูล KPI raw data สำหรับ debug
     */
    getDebugKPIData(groupId: string, period: 'weekly' | 'monthly' | 'all'): Promise<any>;
}
//# sourceMappingURL=KPIService.d.ts.map