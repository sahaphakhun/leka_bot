export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    isRequired: boolean;
    isCompleted: boolean;
    completedAt?: Date;
    completedBy?: string;
    notes?: string;
    dependencies: string[];
    estimatedTime: number;
}
export interface WorkflowExecution {
    id: string;
    workflowName: string;
    steps: WorkflowStep[];
    startedAt: Date;
    completedAt?: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    currentStep?: string;
    progress: number;
    userId: string;
    groupId?: string;
    todos: any[];
}
export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    steps: Omit<WorkflowStep, 'isCompleted' | 'completedAt' | 'completedBy' | 'notes'>[];
    isActive: boolean;
    category: 'project-start' | 'daily-check' | 'weekly-review' | 'deployment' | 'custom';
}
export declare class ProjectWorkflowService {
    private checklistService;
    private memoryService;
    private taskService;
    private lineService;
    private workflows;
    private templates;
    constructor();
    /**
     * เริ่มต้น workflow templates
     */
    private initializeWorkflowTemplates;
    /**
     * เริ่มต้น workflow ใหม่
     */
    startWorkflow(templateId: string, userId: string, groupId?: string): Promise<WorkflowExecution>;
    /**
     * ดำเนินการ workflow step
     */
    executeWorkflowStep(workflowId: string, stepId: string, userId: string, notes?: string): Promise<WorkflowExecution>;
    /**
     * รับ step ถัดไป
     */
    private getNextStep;
    /**
     * คำนวณความคืบหน้า
     */
    private calculateProgress;
    /**
     * เมื่อ workflow เสร็จสิ้น
     */
    private onWorkflowCompleted;
    /**
     * รับ workflow ที่กำลังดำเนินการ
     */
    getActiveWorkflows(userId?: string): WorkflowExecution[];
    /**
     * รับ workflow ตาม ID
     */
    getWorkflow(workflowId: string): WorkflowExecution | undefined;
    /**
     * รับ workflow templates ที่ใช้งานได้
     */
    getActiveTemplates(): WorkflowTemplate[];
    /**
     * รับ workflow template ตาม ID
     */
    getTemplate(templateId: string): WorkflowTemplate | undefined;
    /**
     * หยุด workflow
     */
    stopWorkflow(workflowId: string, userId: string, reason?: string): boolean;
    /**
     * รีเซ็ต workflow
     */
    resetWorkflow(workflowId: string, userId: string): boolean;
    /**
     * สร้าง workflow template ใหม่
     */
    createWorkflowTemplate(template: Omit<WorkflowTemplate, 'id'>): WorkflowTemplate;
    /**
     * อัปเดต workflow template
     */
    updateWorkflowTemplate(templateId: string, updates: Partial<WorkflowTemplate>): boolean;
    /**
     * ลบ workflow template
     */
    deleteWorkflowTemplate(templateId: string): boolean;
    /**
     * รับรายงาน workflow
     */
    generateWorkflowReport(): any;
}
//# sourceMappingURL=ProjectWorkflowService.d.ts.map