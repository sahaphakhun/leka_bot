// Project Controller
// จัดการ API endpoints สำหรับระบบ Rules และ Memory

import { Request, Response, Router } from 'express';
import { ProjectChecklistService } from '@/services/ProjectChecklistService';
import { ProjectMemoryService } from '@/services/ProjectMemoryService';
import { ProjectWorkflowService } from '@/services/ProjectWorkflowService';
import { logger } from '@/utils/logger';
import { serviceContainer } from '@/utils/serviceContainer';

export const projectRouter = Router();

// Services
const checklistService = serviceContainer.get<ProjectChecklistService>('ProjectChecklistService');
const memoryService = serviceContainer.get<ProjectMemoryService>('ProjectMemoryService');
const workflowService = serviceContainer.get<ProjectWorkflowService>('ProjectWorkflowService');

// ==================== PROJECT STATUS & CHECKLIST ====================

/**
 * ตรวจสอบสถานะโปรเจ็ก
 * GET /api/project/status
 */
projectRouter.get('/status', async (req: Request, res: Response) => {
  try {
    logger.info('🔍 API: ตรวจสอบสถานะโปรเจ็ก');
    
    const status = await checklistService.checkProjectStatus();
    
    res.json({
      success: true,
      data: status,
      message: 'ตรวจสอบสถานะโปรเจ็กสำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: ตรวจสอบสถานะโปรเจ็ก:', error);
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
projectRouter.post('/checklist/:checklistId/run', async (req: Request, res: Response) => {
  try {
    const { checklistId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ userId'
      });
    }
    
    logger.info(`📋 API: รัน checklist ${checklistId} สำหรับผู้ใช้ ${userId}`);
    
    const result = await checklistService.runChecklist(checklistId, userId);
    
    res.json({
      success: true,
      data: result,
      message: `รัน checklist ${result.checklistName} สำเร็จ`
    });
    
  } catch (error) {
    logger.error('❌ API Error: รัน checklist:', error);
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
projectRouter.get('/checklist', async (req: Request, res: Response) => {
  try {
    logger.info('📋 API: รับ checklist ทั้งหมด');
    
    const checklists = checklistService.getActiveChecklists();
    
    res.json({
      success: true,
      data: checklists,
      message: 'รับ checklist สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: รับ checklist:', error);
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
projectRouter.get('/checklist/:checklistId', async (req: Request, res: Response) => {
  try {
    const { checklistId } = req.params;
    
    logger.info(`📋 API: รับ checklist ${checklistId}`);
    
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
    
  } catch (error) {
    logger.error('❌ API Error: รับ checklist:', error);
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
projectRouter.get('/rules', async (req: Request, res: Response) => {
  try {
    const { category, priority } = req.query;
    
    logger.info('📋 API: รับ rules ทั้งหมด');
    
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
    
  } catch (error) {
    logger.error('❌ API Error: รับ rules:', error);
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
projectRouter.get('/memories', async (req: Request, res: Response) => {
  try {
    const { type, tags } = req.query;
    
    logger.info('🧠 API: รับ memories ทั้งหมด');
    
    let memories = memoryService.getAllMemories();
    
    if (type) {
      memories = memories.filter(memory => memory.type === type);
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      memories = memories.filter(memory => 
        tagArray.some(tag => memory.tags.includes(tag as string))
      );
    }
    
    res.json({
      success: true,
      data: memories,
      message: 'รับ memories สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: รับ memories:', error);
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
projectRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, tags } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุคำค้นหา (q)'
      });
    }
    
    logger.info(`🔍 API: ค้นหา "${q}"`);
    
    const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
    const result = memoryService.searchMemories(q as string, tagArray as string[]);
    
    res.json({
      success: true,
      data: result,
      message: `ค้นหาสำเร็จ พบ ${result.totalResults} รายการ`
    });
    
  } catch (error) {
    logger.error('❌ API Error: ค้นหา:', error);
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
projectRouter.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const { context } = req.query;
    
    if (!context) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ context'
      });
    }
    
    logger.info(`💡 API: รับ recommendations สำหรับ context: ${context}`);
    
    const recommendations = memoryService.getRuleRecommendations(context as string);
    
    res.json({
      success: true,
      data: recommendations,
      message: 'รับ recommendations สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: รับ recommendations:', error);
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
projectRouter.post('/rules', async (req: Request, res: Response) => {
  try {
    const ruleData = req.body;
    
    logger.info('📋 API: เพิ่ม rule ใหม่');
    
    const newRule = memoryService.addRule(ruleData);
    
    res.status(201).json({
      success: true,
      data: newRule,
      message: 'เพิ่ม rule สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: เพิ่ม rule:', error);
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
projectRouter.post('/memories', async (req: Request, res: Response) => {
  try {
    const memoryData = req.body;
    
    logger.info('🧠 API: เพิ่ม memory ใหม่');
    
    const newMemory = memoryService.addMemory(memoryData);
    
    res.status(201).json({
      success: true,
      data: newMemory,
      message: 'เพิ่ม memory สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: เพิ่ม memory:', error);
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
projectRouter.post('/workflow/start', async (req: Request, res: Response) => {
  try {
    const { templateId, userId, groupId } = req.body;
    
    if (!templateId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ templateId และ userId'
      });
    }
    
    logger.info(`🚀 API: เริ่มต้น workflow ${templateId} สำหรับผู้ใช้ ${userId}`);
    
    const workflow = await workflowService.startWorkflow(templateId, userId, groupId);
    
    res.status(201).json({
      success: true,
      data: workflow,
      message: 'เริ่มต้น workflow สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: เริ่มต้น workflow:', error);
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
projectRouter.post('/workflow/:workflowId/step/:stepId', async (req: Request, res: Response) => {
  try {
    const { workflowId, stepId } = req.params;
    const { userId, notes } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ userId'
      });
    }
    
    logger.info(`✅ API: ดำเนินการ step ${stepId} ใน workflow ${workflowId}`);
    
    const workflow = await workflowService.executeWorkflowStep(workflowId, stepId, userId, notes);
    
    res.json({
      success: true,
      data: workflow,
      message: 'ดำเนินการ step สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: ดำเนินการ workflow step:', error);
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
projectRouter.get('/workflow/active', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    logger.info('🔄 API: รับ workflow ที่กำลังดำเนินการ');
    
    const workflows = workflowService.getActiveWorkflows(userId as string);
    
    res.json({
      success: true,
      data: workflows,
      message: 'รับ workflow สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: รับ workflow:', error);
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
projectRouter.get('/workflow/templates', async (req: Request, res: Response) => {
  try {
    logger.info('📋 API: รับ workflow templates');
    
    const templates = workflowService.getActiveTemplates();
    
    res.json({
      success: true,
      data: templates,
      message: 'รับ workflow templates สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: รับ workflow templates:', error);
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
projectRouter.get('/insights', async (req: Request, res: Response) => {
  try {
    logger.info('💡 API: รับ project insights');
    
    const insights = memoryService.generateProjectInsights();
    
    res.json({
      success: true,
      data: insights,
      message: 'รับ project insights สำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: รับ project insights:', error);
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
projectRouter.get('/reports/summary', async (req: Request, res: Response) => {
  try {
    logger.info('📊 API: รับรายงานสรุป');
    
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
    
  } catch (error) {
    logger.error('❌ API Error: รับรายงานสรุป:', error);
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
projectRouter.get('/consistency', async (req: Request, res: Response) => {
  try {
    logger.info('🔍 API: ตรวจสอบความสอดคล้อง');
    
    const consistency = memoryService.validateConsistency();
    
    res.json({
      success: true,
      data: consistency,
      message: 'ตรวจสอบความสอดคล้องสำเร็จ'
    });
    
  } catch (error) {
    logger.error('❌ API Error: ตรวจสอบความสอดคล้อง:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบความสอดคล้อง',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default projectRouter;
