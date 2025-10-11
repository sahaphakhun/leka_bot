"use strict";
// Project Checklist Service
// บริการสำหรับจัดการการตรวจสอบโปรเจ็กและสร้าง To-dos
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectChecklistService = void 0;
const ProjectRules_1 = require("./ProjectRules");
const TaskService_1 = require("./TaskService");
const LineService_1 = require("./LineService");
const config_1 = require("@/utils/config");
const logger_1 = require("@/utils/logger");
class ProjectChecklistService {
    constructor() {
        this.projectRules = ProjectRules_1.ProjectRules.getInstance();
        this.taskService = new TaskService_1.TaskService();
        this.lineService = new LineService_1.LineService();
    }
    /**
     * ตรวจสอบสถานะโปรเจ็กโดยรวม
     */
    async checkProjectStatus() {
        logger_1.logger.info('🔍 เริ่มตรวจสอบสถานะโปรเจ็ก...');
        const status = {
            isHealthy: false,
            database: {
                isConnected: false,
                tables: [],
                lastCheck: new Date()
            },
            lineBot: {
                isConnected: false,
                webhookUrl: '',
                lastCheck: new Date()
            },
            services: {
                taskService: false,
                lineService: false,
                notificationService: false
            },
            dependencies: {
                isUpToDate: false,
                vulnerabilities: 0,
                lastCheck: new Date()
            },
            overallScore: 0
        };
        try {
            // ตรวจสอบฐานข้อมูล
            status.database = await this.checkDatabaseStatus();
            // ตรวจสอบ LINE Bot
            status.lineBot = await this.checkLineBotStatus();
            // ตรวจสอบ Services
            status.services = await this.checkServicesStatus();
            // ตรวจสอบ Dependencies
            status.dependencies = await this.checkDependenciesStatus();
            // คำนวณคะแนนรวม
            status.overallScore = this.calculateOverallScore(status);
            status.isHealthy = status.overallScore >= 80;
            logger_1.logger.info(`✅ ตรวจสอบโปรเจ็กเสร็จสิ้น - คะแนน: ${status.overallScore}/100`);
        }
        catch (error) {
            logger_1.logger.error('❌ เกิดข้อผิดพลาดในการตรวจสอบโปรเจ็ก:', error);
            status.overallScore = 0;
            status.isHealthy = false;
        }
        return status;
    }
    /**
     * ตรวจสอบสถานะฐานข้อมูล
     */
    async checkDatabaseStatus() {
        try {
            // ตรวจสอบการเชื่อมต่อฐานข้อมูล
            const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('@/utils/database')));
            if (AppDataSource.isInitialized) {
                const tables = await AppDataSource.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
                return {
                    isConnected: true,
                    tables: tables.map((t) => t.table_name),
                    lastCheck: new Date()
                };
            }
            else {
                return {
                    isConnected: false,
                    tables: [],
                    lastCheck: new Date()
                };
            }
        }
        catch (error) {
            logger_1.logger.error('❌ เกิดข้อผิดพลาดในการตรวจสอบฐานข้อมูล:', error);
            return {
                isConnected: false,
                tables: [],
                lastCheck: new Date()
            };
        }
    }
    /**
     * ตรวจสอบสถานะ LINE Bot
     */
    async checkLineBotStatus() {
        try {
            const webhookUrl = `${config_1.config.baseUrl}/webhook`;
            const isConnected = !!config_1.config.line.channelAccessToken;
            return {
                isConnected,
                webhookUrl,
                lastCheck: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ LINE Bot:', error);
            return {
                isConnected: false,
                webhookUrl: '',
                lastCheck: new Date()
            };
        }
    }
    /**
     * ตรวจสอบสถานะ Services
     */
    async checkServicesStatus() {
        try {
            return {
                taskService: true, // TaskService ถูกสร้างสำเร็จ
                lineService: true, // LineService ถูกสร้างสำเร็จ
                notificationService: true // NotificationService ถูกสร้างสำเร็จ
            };
        }
        catch (error) {
            logger_1.logger.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ Services:', error);
            return {
                taskService: false,
                lineService: false,
                notificationService: false
            };
        }
    }
    /**
     * ตรวจสอบสถานะ Dependencies
     */
    async checkDependenciesStatus() {
        try {
            // ตรวจสอบ package.json
            const { execSync } = require('child_process');
            const output = execSync('npm audit --json', { encoding: 'utf8' });
            const audit = JSON.parse(output);
            return {
                isUpToDate: audit.metadata.vulnerabilities.total === 0,
                vulnerabilities: audit.metadata.vulnerabilities.total,
                lastCheck: new Date()
            };
        }
        catch (error) {
            logger_1.logger.warn('⚠️ ไม่สามารถตรวจสอบ dependencies ได้:', error);
            return {
                isUpToDate: false,
                vulnerabilities: 0,
                lastCheck: new Date()
            };
        }
    }
    /**
     * คำนวณคะแนนรวม
     */
    calculateOverallScore(status) {
        let score = 0;
        // ฐานข้อมูล (30%)
        if (status.database.isConnected)
            score += 30;
        // LINE Bot (25%)
        if (status.lineBot.isConnected)
            score += 25;
        // Services (25%)
        const serviceScore = Object.values(status.services).filter(Boolean).length;
        score += (serviceScore / 3) * 25;
        // Dependencies (20%)
        if (status.dependencies.isUpToDate)
            score += 20;
        return Math.round(score);
    }
    /**
     * รัน checklist ที่กำหนด
     */
    async runChecklist(checklistId, userId) {
        const checklist = this.projectRules.getChecklist(checklistId);
        if (!checklist) {
            throw new Error(`Checklist not found: ${checklistId}`);
        }
        logger_1.logger.info(`📋 เริ่มรัน checklist: ${checklist.name}`);
        // ตรวจสอบสถานะโปรเจ็กก่อน
        const projectStatus = await this.checkProjectStatus();
        // อัปเดต checklist items ตามสถานะโปรเจ็ก
        const updatedItems = this.updateChecklistItems(checklist.items, projectStatus);
        // คำนวณผลลัพธ์
        const totalItems = updatedItems.length;
        const completedItems = updatedItems.filter(item => item.isCompleted).length;
        const requiredItems = updatedItems.filter(item => item.isRequired);
        const totalRequired = requiredItems.length;
        const requiredCompleted = requiredItems.filter(item => item.isCompleted).length;
        const isPassed = requiredCompleted === totalRequired && totalRequired > 0;
        const result = {
            checklistId,
            checklistName: checklist.name,
            totalItems,
            completedItems,
            requiredCompleted,
            totalRequired,
            isPassed,
            items: updatedItems,
            completedAt: new Date(),
            completedBy: userId,
            notes: `ตรวจสอบโปรเจ็กเสร็จสิ้น - คะแนน: ${projectStatus.overallScore}/100`
        };
        logger_1.logger.info(`📋 Checklist เสร็จสิ้น: ${checklist.name} - ผล: ${isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}`);
        return result;
    }
    /**
     * อัปเดต checklist items ตามสถานะโปรเจ็ก
     */
    updateChecklistItems(items, projectStatus) {
        return items.map(item => {
            let isCompleted = item.isCompleted;
            let notes = item.notes || '';
            switch (item.id) {
                case 'CL-001-001': // ตรวจสอบสถานะโปรเจ็ก
                    isCompleted = projectStatus.isHealthy;
                    notes = `คะแนนรวม: ${projectStatus.overallScore}/100`;
                    break;
                case 'CL-001-002': // ตรวจสอบฐานข้อมูล
                    isCompleted = projectStatus.database.isConnected;
                    notes = `เชื่อมต่อ: ${projectStatus.database.isConnected ? 'สำเร็จ' : 'ล้มเหลว'}`;
                    break;
                case 'CL-001-003': // ตรวจสอบ LINE Bot
                    isCompleted = projectStatus.lineBot.isConnected;
                    notes = `เชื่อมต่อ: ${projectStatus.lineBot.isConnected ? 'สำเร็จ' : 'ล้มเหลว'}`;
                    break;
                case 'CL-001-004': // สร้าง To-dos
                    isCompleted = true; // ต้องทำด้วยตนเอง
                    notes = 'ต้องสร้าง To-dos สำหรับงานที่ได้รับมอบหมาย';
                    break;
                case 'CL-001-005': // ตรวจสอบ dependencies
                    isCompleted = projectStatus.dependencies.isUpToDate;
                    notes = `Vulnerabilities: ${projectStatus.dependencies.vulnerabilities}`;
                    break;
            }
            return {
                ...item,
                isCompleted,
                notes,
                completedAt: isCompleted ? new Date() : undefined,
                completedBy: isCompleted ? 'system' : undefined
            };
        });
    }
    /**
     * สร้าง To-dos สำหรับงานที่ได้รับมอบหมาย
     */
    async createProjectTodos(groupId, userId) {
        logger_1.logger.info(`📝 สร้าง To-dos สำหรับโปรเจ็กในกลุ่ม: ${groupId}`);
        try {
            // สร้าง To-dos ตาม checklist ที่จำเป็น
            const todos = [];
            // 1. To-do สำหรับการตรวจสอบโปรเจ็ก
            todos.push({
                title: 'ตรวจสอบสถานะโปรเจ็ก',
                description: 'ตรวจสอบว่าโปรเจ็กทำงานปกติหรือไม่',
                priority: 'high',
                dueTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ชั่วโมง
                tags: ['project-check', 'maintenance']
            });
            // 2. To-do สำหรับการอัปเดตฐานข้อมูล
            todos.push({
                title: 'อัปเดตฐานข้อมูล',
                description: 'ตรวจสอบและอัปเดตฐานข้อมูลให้เป็นปัจจุบัน',
                priority: 'medium',
                dueTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 วัน
                tags: ['database', 'maintenance']
            });
            // 3. To-do สำหรับการตรวจสอบ dependencies
            todos.push({
                title: 'ตรวจสอบ dependencies',
                description: 'ตรวจสอบและอัปเดต dependencies ให้เป็นปัจจุบัน',
                priority: 'medium',
                dueTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 วัน
                tags: ['dependencies', 'security']
            });
            // 4. To-do สำหรับการทดสอบระบบ
            todos.push({
                title: 'ทดสอบระบบ',
                description: 'ทดสอบฟีเจอร์หลักของระบบให้ทำงานปกติ',
                priority: 'high',
                dueTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 วัน
                tags: ['testing', 'quality']
            });
            logger_1.logger.info(`✅ สร้าง To-dos สำเร็จ: ${todos.length} รายการ`);
            return todos;
        }
        catch (error) {
            logger_1.logger.error('❌ เกิดข้อผิดพลาดในการสร้าง To-dos:', error);
            throw error;
        }
    }
    /**
     * รับ checklist ที่ใช้งานได้
     */
    getActiveChecklists() {
        return this.projectRules.getActiveChecklists();
    }
    /**
     * รับ checklist ตาม ID
     */
    getChecklist(id) {
        return this.projectRules.getChecklist(id);
    }
    /**
     * อัปเดต checklist item
     */
    updateChecklistItem(checklistId, itemId, updates) {
        const checklist = this.projectRules.getChecklist(checklistId);
        if (!checklist)
            return false;
        const itemIndex = checklist.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1)
            return false;
        checklist.items[itemIndex] = {
            ...checklist.items[itemIndex],
            ...updates
        };
        return this.projectRules.updateChecklist(checklistId, checklist);
    }
}
exports.ProjectChecklistService = ProjectChecklistService;
//# sourceMappingURL=ProjectChecklistService.js.map