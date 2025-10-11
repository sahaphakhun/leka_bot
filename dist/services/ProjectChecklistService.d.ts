import { ProjectChecklist, ChecklistItem } from './ProjectRules';
export interface ProjectStatus {
    isHealthy: boolean;
    database: {
        isConnected: boolean;
        tables: string[];
        lastCheck: Date;
    };
    lineBot: {
        isConnected: boolean;
        webhookUrl: string;
        lastCheck: Date;
    };
    services: {
        taskService: boolean;
        lineService: boolean;
        notificationService: boolean;
    };
    dependencies: {
        isUpToDate: boolean;
        vulnerabilities: number;
        lastCheck: Date;
    };
    overallScore: number;
}
export interface ChecklistResult {
    checklistId: string;
    checklistName: string;
    totalItems: number;
    completedItems: number;
    requiredCompleted: number;
    totalRequired: number;
    isPassed: boolean;
    items: ChecklistItem[];
    completedAt: Date;
    completedBy: string;
    notes: string;
}
export declare class ProjectChecklistService {
    private projectRules;
    private taskService;
    private lineService;
    constructor();
    /**
     * ตรวจสอบสถานะโปรเจ็กโดยรวม
     */
    checkProjectStatus(): Promise<ProjectStatus>;
    /**
     * ตรวจสอบสถานะฐานข้อมูล
     */
    private checkDatabaseStatus;
    /**
     * ตรวจสอบสถานะ LINE Bot
     */
    private checkLineBotStatus;
    /**
     * ตรวจสอบสถานะ Services
     */
    private checkServicesStatus;
    /**
     * ตรวจสอบสถานะ Dependencies
     */
    private checkDependenciesStatus;
    /**
     * คำนวณคะแนนรวม
     */
    private calculateOverallScore;
    /**
     * รัน checklist ที่กำหนด
     */
    runChecklist(checklistId: string, userId: string): Promise<ChecklistResult>;
    /**
     * อัปเดต checklist items ตามสถานะโปรเจ็ก
     */
    private updateChecklistItems;
    /**
     * สร้าง To-dos สำหรับงานที่ได้รับมอบหมาย
     */
    createProjectTodos(groupId: string, userId: string): Promise<any[]>;
    /**
     * รับ checklist ที่ใช้งานได้
     */
    getActiveChecklists(): ProjectChecklist[];
    /**
     * รับ checklist ตาม ID
     */
    getChecklist(id: string): ProjectChecklist | undefined;
    /**
     * อัปเดต checklist item
     */
    updateChecklistItem(checklistId: string, itemId: string, updates: Partial<ChecklistItem>): boolean;
}
//# sourceMappingURL=ProjectChecklistService.d.ts.map