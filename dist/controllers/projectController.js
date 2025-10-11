"use strict";
// Project Controller
// จัดการ API endpoints สำหรับระบบ Rules และ Memory
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
const logger_1 = require("@/utils/logger");
const serviceContainer_1 = require("@/utils/serviceContainer");
exports.projectRouter = (0, express_1.Router)();
// Services
const checklistService = serviceContainer_1.serviceContainer.get('ProjectChecklistService');
const memoryService = serviceContainer_1.serviceContainer.get('ProjectMemoryService');
const workflowService = serviceContainer_1.serviceContainer.get('ProjectWorkflowService');
// ==================== PROJECT STATUS & CHECKLIST ====================
/**
 * ตรวจสอบสถานะโปรเจ็ก
 * GET /api/project/status
 */
exports.projectRouter.get('/status', async (req, res) => {
    try {
        logger_1.logger.info('🔍 API: ตรวจสอบสถานะโปรเจ็ก');
        const status = await checklistService.checkProjectStatus();
        res.json({
            success: true,
            data: status,
            message: 'ตรวจสอบสถานะโปรเจ็กสำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: ตรวจสอบสถานะโปรเจ็ก:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะโปรเจ็ก',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รัน checklist
 * POST /api/project/checklist/:checklistId/run
 */
exports.projectRouter.post('/checklist/:checklistId/run', async (req, res) => {
    try {
        const { checklistId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'ต้องระบุ userId'
            });
        }
        logger_1.logger.info(`📋 API: รัน checklist ${checklistId} สำหรับผู้ใช้ ${userId}`);
        const result = await checklistService.runChecklist(checklistId, userId);
        res.json({
            success: true,
            data: result,
            message: `รัน checklist ${result.checklistName} สำเร็จ`
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รัน checklist:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรัน checklist',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รับ checklist ทั้งหมด
 * GET /api/project/checklist
 */
exports.projectRouter.get('/checklist', async (req, res) => {
    try {
        logger_1.logger.info('📋 API: รับ checklist ทั้งหมด');
        const checklists = checklistService.getActiveChecklists();
        res.json({
            success: true,
            data: checklists,
            message: 'รับ checklist สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ checklist:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ checklist',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รับ checklist ตาม ID
 * GET /api/project/checklist/:checklistId
 */
exports.projectRouter.get('/checklist/:checklistId', async (req, res) => {
    try {
        const { checklistId } = req.params;
        logger_1.logger.info(`📋 API: รับ checklist ${checklistId}`);
        const checklist = checklistService.getChecklist(checklistId);
        if (!checklist) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบ checklist ที่ระบุ'
            });
        }
        res.json({
            success: true,
            data: checklist,
            message: 'รับ checklist สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ checklist:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ checklist',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ==================== PROJECT RULES & MEMORIES ====================
/**
 * รับ rules ทั้งหมด
 * GET /api/project/rules
 */
exports.projectRouter.get('/rules', async (req, res) => {
    try {
        const { category, priority } = req.query;
        logger_1.logger.info('📋 API: รับ rules ทั้งหมด');
        let rules = memoryService.getAllRules();
        if (category) {
            rules = rules.filter(rule => rule.category === category);
        }
        if (priority) {
            rules = rules.filter(rule => rule.priority === priority);
        }
        res.json({
            success: true,
            data: rules,
            message: 'รับ rules สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ rules:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ rules',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รับ memories ทั้งหมด
 * GET /api/project/memories
 */
exports.projectRouter.get('/memories', async (req, res) => {
    try {
        const { type, tags } = req.query;
        logger_1.logger.info('🧠 API: รับ memories ทั้งหมด');
        let memories = memoryService.getAllMemories();
        if (type) {
            memories = memories.filter(memory => memory.type === type);
        }
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            memories = memories.filter(memory => tagArray.some(tag => memory.tags.includes(tag)));
        }
        res.json({
            success: true,
            data: memories,
            message: 'รับ memories สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ memories:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ memories',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * ค้นหา memories และ rules
 * GET /api/project/search
 */
exports.projectRouter.get('/search', async (req, res) => {
    try {
        const { q, tags } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'ต้องระบุคำค้นหา (q)'
            });
        }
        logger_1.logger.info(`🔍 API: ค้นหา "${q}"`);
        const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
        const result = memoryService.searchMemories(q, tagArray);
        res.json({
            success: true,
            data: result,
            message: `ค้นหาสำเร็จ พบ ${result.totalResults} รายการ`
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: ค้นหา:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการค้นหา',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รับ rule recommendations
 * GET /api/project/recommendations
 */
exports.projectRouter.get('/recommendations', async (req, res) => {
    try {
        const { context } = req.query;
        if (!context) {
            return res.status(400).json({
                success: false,
                error: 'ต้องระบุ context'
            });
        }
        logger_1.logger.info(`💡 API: รับ recommendations สำหรับ context: ${context}`);
        const recommendations = memoryService.getRuleRecommendations(context);
        res.json({
            success: true,
            data: recommendations,
            message: 'รับ recommendations สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ recommendations',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * เพิ่ม rule ใหม่
 * POST /api/project/rules
 */
exports.projectRouter.post('/rules', async (req, res) => {
    try {
        const ruleData = req.body;
        logger_1.logger.info('📋 API: เพิ่ม rule ใหม่');
        const newRule = memoryService.addRule(ruleData);
        res.status(201).json({
            success: true,
            data: newRule,
            message: 'เพิ่ม rule สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: เพิ่ม rule:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการเพิ่ม rule',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * เพิ่ม memory ใหม่
 * POST /api/project/memories
 */
exports.projectRouter.post('/memories', async (req, res) => {
    try {
        const memoryData = req.body;
        logger_1.logger.info('🧠 API: เพิ่ม memory ใหม่');
        const newMemory = memoryService.addMemory(memoryData);
        res.status(201).json({
            success: true,
            data: newMemory,
            message: 'เพิ่ม memory สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: เพิ่ม memory:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการเพิ่ม memory',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ==================== PROJECT WORKFLOW ====================
/**
 * เริ่มต้น workflow ใหม่
 * POST /api/project/workflow/start
 */
exports.projectRouter.post('/workflow/start', async (req, res) => {
    try {
        const { templateId, userId, groupId } = req.body;
        if (!templateId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'ต้องระบุ templateId และ userId'
            });
        }
        logger_1.logger.info(`🚀 API: เริ่มต้น workflow ${templateId} สำหรับผู้ใช้ ${userId}`);
        const workflow = await workflowService.startWorkflow(templateId, userId, groupId);
        res.status(201).json({
            success: true,
            data: workflow,
            message: 'เริ่มต้น workflow สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: เริ่มต้น workflow:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการเริ่มต้น workflow',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * ดำเนินการ workflow step
 * POST /api/project/workflow/:workflowId/step/:stepId
 */
exports.projectRouter.post('/workflow/:workflowId/step/:stepId', async (req, res) => {
    try {
        const { workflowId, stepId } = req.params;
        const { userId, notes } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'ต้องระบุ userId'
            });
        }
        logger_1.logger.info(`✅ API: ดำเนินการ step ${stepId} ใน workflow ${workflowId}`);
        const workflow = await workflowService.executeWorkflowStep(workflowId, stepId, userId, notes);
        res.json({
            success: true,
            data: workflow,
            message: 'ดำเนินการ step สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: ดำเนินการ workflow step:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการดำเนินการ workflow step',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รับ workflow ที่กำลังดำเนินการ
 * GET /api/project/workflow/active
 */
exports.projectRouter.get('/workflow/active', async (req, res) => {
    try {
        const { userId } = req.query;
        logger_1.logger.info('🔄 API: รับ workflow ที่กำลังดำเนินการ');
        const workflows = workflowService.getActiveWorkflows(userId);
        res.json({
            success: true,
            data: workflows,
            message: 'รับ workflow สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ workflow:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ workflow',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รับ workflow templates
 * GET /api/project/workflow/templates
 */
exports.projectRouter.get('/workflow/templates', async (req, res) => {
    try {
        logger_1.logger.info('📋 API: รับ workflow templates');
        const templates = workflowService.getActiveTemplates();
        res.json({
            success: true,
            data: templates,
            message: 'รับ workflow templates สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ workflow templates:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ workflow templates',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ==================== PROJECT INSIGHTS & REPORTS ====================
/**
 * รับ project insights
 * GET /api/project/insights
 */
exports.projectRouter.get('/insights', async (req, res) => {
    try {
        logger_1.logger.info('💡 API: รับ project insights');
        const insights = memoryService.generateProjectInsights();
        res.json({
            success: true,
            data: insights,
            message: 'รับ project insights สำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับ project insights:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับ project insights',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * รับรายงานสรุป
 * GET /api/project/reports/summary
 */
exports.projectRouter.get('/reports/summary', async (req, res) => {
    try {
        logger_1.logger.info('📊 API: รับรายงานสรุป');
        const memoryReport = memoryService.generateSummaryReport();
        const workflowReport = workflowService.generateWorkflowReport();
        const summary = {
            memory: memoryReport,
            workflow: workflowReport,
            timestamp: new Date()
        };
        res.json({
            success: true,
            data: summary,
            message: 'รับรายงานสรุปสำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: รับรายงานสรุป:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการรับรายงานสรุป',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * ตรวจสอบความสอดคล้องของ rules และ memories
 * GET /api/project/consistency
 */
exports.projectRouter.get('/consistency', async (req, res) => {
    try {
        logger_1.logger.info('🔍 API: ตรวจสอบความสอดคล้อง');
        const consistency = memoryService.validateConsistency();
        res.json({
            success: true,
            data: consistency,
            message: 'ตรวจสอบความสอดคล้องสำเร็จ'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ API Error: ตรวจสอบความสอดคล้อง:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการตรวจสอบความสอดคล้อง',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = exports.projectRouter;
//# sourceMappingURL=projectController.js.map