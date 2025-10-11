"use strict";
// Project Workflow Service
// บริการสำหรับจัดการ workflow หลักของการตรวจสอบโปรเจ็กและสร้าง To-dos
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectWorkflowService = void 0;
const ProjectChecklistService_1 = require("./ProjectChecklistService");
const ProjectMemoryService_1 = require("./ProjectMemoryService");
const TaskService_1 = require("./TaskService");
const LineService_1 = require("./LineService");
const logger_1 = require("@/utils/logger");
class ProjectWorkflowService {
    constructor() {
        this.workflows = new Map();
        this.templates = new Map();
        this.checklistService = new ProjectChecklistService_1.ProjectChecklistService();
        this.memoryService = new ProjectMemoryService_1.ProjectMemoryService();
        this.taskService = new TaskService_1.TaskService();
        this.lineService = new LineService_1.LineService();
        this.initializeWorkflowTemplates();
    }
    /**
     * เริ่มต้น workflow templates
     */
    initializeWorkflowTemplates() {
        // Project Start Workflow
        this.templates.set('WF-PROJECT-START', {
            id: 'WF-PROJECT-START',
            name: 'เริ่มต้นโปรเจ็ก',
            description: 'Workflow สำหรับการเริ่มต้นโปรเจ็กใหม่',
            category: 'project-start',
            isActive: true,
            steps: [
                {
                    id: 'STEP-001',
                    name: 'ตรวจสอบสถานะโปรเจ็ก',
                    description: 'ตรวจสอบว่าโปรเจ็กทำงานปกติหรือไม่',
                    isRequired: true,
                    dependencies: [],
                    estimatedTime: 15
                },
                {
                    id: 'STEP-002',
                    name: 'ตรวจสอบฐานข้อมูล',
                    description: 'ตรวจสอบการเชื่อมต่อฐานข้อมูลและข้อมูลที่จำเป็น',
                    isRequired: true,
                    dependencies: ['STEP-001'],
                    estimatedTime: 10
                },
                {
                    id: 'STEP-003',
                    name: 'ตรวจสอบ LINE Bot',
                    description: 'ตรวจสอบว่า LINE Bot ทำงานปกติและเชื่อมต่อกับ LINE API',
                    isRequired: true,
                    dependencies: ['STEP-001'],
                    estimatedTime: 10
                },
                {
                    id: 'STEP-004',
                    name: 'สร้าง To-dos สำหรับงานที่ได้รับมอบหมาย',
                    description: 'สร้าง To-dos ในระบบสำหรับงานที่ได้รับมอบหมาย',
                    isRequired: true,
                    dependencies: ['STEP-001', 'STEP-002', 'STEP-003'],
                    estimatedTime: 20
                },
                {
                    id: 'STEP-005',
                    name: 'ตรวจสอบ dependencies',
                    description: 'ตรวจสอบว่า dependencies ทั้งหมดอัปเดตและทำงานปกติ',
                    isRequired: false,
                    dependencies: ['STEP-001'],
                    estimatedTime: 15
                }
            ]
        });
        // Daily Check Workflow
        this.templates.set('WF-DAILY-CHECK', {
            id: 'WF-DAILY-CHECK',
            name: 'ตรวจสอบประจำวัน',
            description: 'Workflow สำหรับการตรวจสอบประจำวัน',
            category: 'daily-check',
            isActive: true,
            steps: [
                {
                    id: 'STEP-001',
                    name: 'ตรวจสอบสถานะระบบ',
                    description: 'ตรวจสอบสถานะระบบโดยรวม',
                    isRequired: true,
                    dependencies: [],
                    estimatedTime: 5
                },
                {
                    id: 'STEP-002',
                    name: 'ตรวจสอบงานที่ค้าง',
                    description: 'ตรวจสอบงานที่ค้างและต้องดำเนินการ',
                    isRequired: true,
                    dependencies: ['STEP-001'],
                    estimatedTime: 10
                },
                {
                    id: 'STEP-003',
                    name: 'อัปเดตสถานะงาน',
                    description: 'อัปเดตสถานะงานที่ดำเนินการแล้ว',
                    isRequired: true,
                    dependencies: ['STEP-002'],
                    estimatedTime: 15
                }
            ]
        });
        // Weekly Review Workflow
        this.templates.set('WF-WEEKLY-REVIEW', {
            id: 'WF-WEEKLY-REVIEW',
            name: 'ทบทวนประจำสัปดาห์',
            description: 'Workflow สำหรับการทบทวนประจำสัปดาห์',
            category: 'weekly-review',
            isActive: true,
            steps: [
                {
                    id: 'STEP-001',
                    name: 'ทบทวนงานที่เสร็จสิ้น',
                    description: 'ทบทวนงานที่เสร็จสิ้นในสัปดาห์ที่ผ่านมา',
                    isRequired: true,
                    dependencies: [],
                    estimatedTime: 20
                },
                {
                    id: 'STEP-002',
                    name: 'วางแผนงานสัปดาห์ถัดไป',
                    description: 'วางแผนงานสำหรับสัปดาห์ถัดไป',
                    isRequired: true,
                    dependencies: ['STEP-001'],
                    estimatedTime: 30
                },
                {
                    id: 'STEP-003',
                    name: 'อัปเดต project rules และ memories',
                    description: 'อัปเดต rules และ memories ตามประสบการณ์ที่ได้เรียนรู้',
                    isRequired: false,
                    dependencies: ['STEP-001'],
                    estimatedTime: 25
                }
            ]
        });
    }
    /**
     * เริ่มต้น workflow ใหม่
     */
    async startWorkflow(templateId, userId, groupId) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Workflow template not found: ${templateId}`);
        }
        if (!template.isActive) {
            throw new Error(`Workflow template is not active: ${templateId}`);
        }
        const workflowId = `WF-${Date.now()}`;
        const steps = template.steps.map(step => ({
            ...step,
            isCompleted: false
        }));
        const workflow = {
            id: workflowId,
            workflowName: template.name,
            steps,
            startedAt: new Date(),
            status: 'pending',
            progress: 0,
            userId,
            groupId,
            todos: []
        };
        this.workflows.set(workflowId, workflow);
        logger_1.logger.info(`🚀 เริ่มต้น workflow: ${template.name} (${workflowId}) สำหรับผู้ใช้: ${userId}`);
        return workflow;
    }
    /**
     * ดำเนินการ workflow step
     */
    async executeWorkflowStep(workflowId, stepId, userId, notes) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Step not found: ${stepId} in workflow: ${workflowId}`);
        }
        // ตรวจสอบ dependencies
        const incompleteDependencies = step.dependencies.filter(depId => {
            const depStep = workflow.steps.find(s => s.id === depId);
            return depStep && !depStep.isCompleted;
        });
        if (incompleteDependencies.length > 0) {
            throw new Error(`Dependencies not completed: ${incompleteDependencies.join(', ')}`);
        }
        // ดำเนินการ step
        step.isCompleted = true;
        step.completedAt = new Date();
        step.completedBy = userId;
        step.notes = notes;
        // อัปเดตสถานะ workflow
        workflow.status = 'in-progress';
        workflow.currentStep = this.getNextStep(workflow);
        workflow.progress = this.calculateProgress(workflow);
        // ตรวจสอบว่า workflow เสร็จสิ้นหรือไม่
        if (workflow.progress === 100) {
            workflow.status = 'completed';
            workflow.completedAt = new Date();
            await this.onWorkflowCompleted(workflow);
        }
        logger_1.logger.info(`✅ ดำเนินการ step: ${step.name} ใน workflow: ${workflow.workflowName}`);
        return workflow;
    }
    /**
     * รับ step ถัดไป
     */
    getNextStep(workflow) {
        const incompleteSteps = workflow.steps.filter(step => !step.isCompleted);
        if (incompleteSteps.length === 0)
            return undefined;
        // หา step ที่ dependencies เสร็จสิ้นแล้ว
        const availableSteps = incompleteSteps.filter(step => {
            return step.dependencies.every(depId => {
                const depStep = workflow.steps.find(s => s.id === depId);
                return depStep && depStep.isCompleted;
            });
        });
        return availableSteps.length > 0 ? availableSteps[0].id : undefined;
    }
    /**
     * คำนวณความคืบหน้า
     */
    calculateProgress(workflow) {
        const completedSteps = workflow.steps.filter(step => step.isCompleted).length;
        return Math.round((completedSteps / workflow.steps.length) * 100);
    }
    /**
     * เมื่อ workflow เสร็จสิ้น
     */
    async onWorkflowCompleted(workflow) {
        logger_1.logger.info(`🎉 Workflow เสร็จสิ้น: ${workflow.workflowName} (${workflow.id})`);
        try {
            // สร้าง To-dos ตามประเภทของ workflow
            if (workflow.groupId) {
                const todos = await this.checklistService.createProjectTodos(workflow.groupId, workflow.userId);
                workflow.todos = todos;
            }
            // เพิ่ม memory เกี่ยวกับ workflow ที่เสร็จสิ้น
            this.memoryService.addMemory({
                type: 'note',
                title: `Workflow เสร็จสิ้น: ${workflow.workflowName}`,
                content: `Workflow ${workflow.workflowName} เสร็จสิ้นในวันที่ ${workflow.completedAt?.toLocaleDateString('th-TH')}`,
                tags: ['workflow', 'completed', workflow.workflowName.toLowerCase()],
                relatedRules: []
            });
        }
        catch (error) {
            logger_1.logger.error('❌ เกิดข้อผิดพลาดในการดำเนินการหลัง workflow เสร็จสิ้น:', error);
        }
    }
    /**
     * รับ workflow ที่กำลังดำเนินการ
     */
    getActiveWorkflows(userId) {
        const activeWorkflows = Array.from(this.workflows.values()).filter(w => w.status === 'in-progress' || w.status === 'pending');
        if (userId) {
            return activeWorkflows.filter(w => w.userId === userId);
        }
        return activeWorkflows;
    }
    /**
     * รับ workflow ตาม ID
     */
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    /**
     * รับ workflow templates ที่ใช้งานได้
     */
    getActiveTemplates() {
        return Array.from(this.templates.values()).filter(t => t.isActive);
    }
    /**
     * รับ workflow template ตาม ID
     */
    getTemplate(templateId) {
        return this.templates.get(templateId);
    }
    /**
     * หยุด workflow
     */
    stopWorkflow(workflowId, userId, reason) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return false;
        if (workflow.userId !== userId) {
            throw new Error('ไม่มีสิทธิ์หยุด workflow นี้');
        }
        workflow.status = 'failed';
        workflow.completedAt = new Date();
        // เพิ่ม memory เกี่ยวกับ workflow ที่หยุด
        this.memoryService.addMemory({
            type: 'note',
            title: `Workflow หยุด: ${workflow.workflowName}`,
            content: `Workflow ${workflow.workflowName} หยุดในวันที่ ${workflow.completedAt.toLocaleDateString('th-TH')} เนื่องจาก: ${reason || 'ไม่ระบุเหตุผล'}`,
            tags: ['workflow', 'stopped', workflow.workflowName.toLowerCase()],
            relatedRules: []
        });
        logger_1.logger.info(`⏹️ หยุด workflow: ${workflow.workflowName} (${workflowId}) เนื่องจาก: ${reason || 'ไม่ระบุเหตุผล'}`);
        return true;
    }
    /**
     * รีเซ็ต workflow
     */
    resetWorkflow(workflowId, userId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            return false;
        if (workflow.userId !== userId) {
            throw new Error('ไม่มีสิทธิ์รีเซ็ต workflow นี้');
        }
        // รีเซ็ต steps
        workflow.steps.forEach(step => {
            step.isCompleted = false;
            step.completedAt = undefined;
            step.completedBy = undefined;
            step.notes = undefined;
        });
        // รีเซ็ตสถานะ workflow
        workflow.status = 'pending';
        workflow.currentStep = undefined;
        workflow.progress = 0;
        workflow.completedAt = undefined;
        logger_1.logger.info(`🔄 รีเซ็ต workflow: ${workflow.workflowName} (${workflowId})`);
        return true;
    }
    /**
     * สร้าง workflow template ใหม่
     */
    createWorkflowTemplate(template) {
        const newTemplate = {
            ...template,
            id: `WF-${Date.now()}`
        };
        this.templates.set(newTemplate.id, newTemplate);
        logger_1.logger.info(`📋 สร้าง workflow template ใหม่: ${newTemplate.name} (${newTemplate.id})`);
        return newTemplate;
    }
    /**
     * อัปเดต workflow template
     */
    updateWorkflowTemplate(templateId, updates) {
        const template = this.templates.get(templateId);
        if (!template)
            return false;
        const updatedTemplate = { ...template, ...updates };
        this.templates.set(templateId, updatedTemplate);
        logger_1.logger.info(`📋 อัปเดต workflow template: ${template.name} (${templateId})`);
        return true;
    }
    /**
     * ลบ workflow template
     */
    deleteWorkflowTemplate(templateId) {
        const template = this.templates.get(templateId);
        if (!template)
            return false;
        this.templates.delete(templateId);
        logger_1.logger.info(`🗑️ ลบ workflow template: ${template.name} (${templateId})`);
        return true;
    }
    /**
     * รับรายงาน workflow
     */
    generateWorkflowReport() {
        const workflows = Array.from(this.workflows.values());
        const templates = Array.from(this.templates.values());
        const workflowsByStatus = workflows.reduce((acc, w) => {
            if (!acc[w.status])
                acc[w.status] = [];
            acc[w.status].push(w);
            return acc;
        }, {});
        const templatesByCategory = templates.reduce((acc, t) => {
            if (!acc[t.category])
                acc[t.category] = [];
            acc[t.category].push(t);
            return acc;
        }, {});
        return {
            summary: {
                totalWorkflows: workflows.length,
                totalTemplates: templates.length,
                workflowsByStatus: Object.keys(workflowsByStatus).map(status => ({
                    status,
                    count: workflowsByStatus[status].length
                })),
                templatesByCategory: Object.keys(templatesByCategory).map(category => ({
                    category,
                    count: templatesByCategory[category].length
                }))
            },
            activeWorkflows: this.getActiveWorkflows(),
            recentWorkflows: workflows
                .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
                .slice(0, 10)
        };
    }
}
exports.ProjectWorkflowService = ProjectWorkflowService;
//# sourceMappingURL=ProjectWorkflowService.js.map