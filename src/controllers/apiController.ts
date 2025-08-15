// API Controller - REST API endpoints

import { Router, Request, Response } from 'express';
import { TaskService } from '@/services/TaskService';
import { UserService } from '@/services/UserService';
import { FileService } from '@/services/FileService';
import { KPIService } from '@/services/KPIService';
import { RecurringTaskService } from '@/services/RecurringTaskService';
import { LineService } from '@/services/LineService';
import { NotificationCardService } from '@/services/NotificationCardService';
import multer from 'multer';
import { logger } from '@/utils/logger';
import { serviceContainer } from '@/utils/serviceContainer';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { ApiResponse, PaginatedResponse, CreateNotificationCardRequest, NotificationCardResponse } from '@/types';
import { taskEntityToInterface } from '@/types/adapters';
import { config } from '@/utils/config';

export const apiRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

class ApiController {
  private taskService: TaskService;
  private userService: UserService;
  private fileService: FileService;
  private kpiService: KPIService;
  private recurringService: RecurringTaskService;
  private lineService: LineService;
  private notificationCardService: NotificationCardService;

  constructor() {
    this.taskService = serviceContainer.get<TaskService>('TaskService');
    this.userService = serviceContainer.get<UserService>('UserService');
    this.fileService = serviceContainer.get<FileService>('FileService');
    this.kpiService = serviceContainer.get<KPIService>('KPIService');
    this.recurringService = serviceContainer.get<RecurringTaskService>('RecurringTaskService');
    this.lineService = serviceContainer.get<LineService>('LineService');
    this.notificationCardService = serviceContainer.get<NotificationCardService>('NotificationCardService');
  }

  // Task Endpoints

  /**
   * GET /api/tasks - ดึงรายการงาน
   */
  public async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { 
        status, 
        assignee, 
        tags, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      const options = {
        status: status as any,
        assigneeId: assignee as string,
        tags: tags ? (tags as string).split(',') : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      const { tasks, total } = await this.taskService.getGroupTasks(groupId, options);

      const response: PaginatedResponse<any> = {
        success: true,
        data: tasks,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting tasks:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get tasks' 
      });
    }
  }

  /**
   * POST /api/tasks - สร้างงานใหม่
   */
  public async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const taskData = req.body;

      // ตรวจสอบ required fields
      const requiredFields = ['title', 'assigneeIds', 'createdBy', 'dueTime'];
      for (const field of requiredFields) {
        if (!taskData[field]) {
          res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`
          });
          return;
        }
      }

      const task = await this.taskService.createTask({
        ...taskData,
        groupId,
        dueTime: new Date(taskData.dueTime),
        startTime: taskData.startTime ? new Date(taskData.startTime) : undefined,
        requireAttachment: !!taskData.requireAttachment,
        reviewerUserId: taskData.reviewerUserId
      });

      const response: ApiResponse<any> = {
        success: true,
        data: task,
        message: 'Task created successfully'
      };

      res.status(201).json(response);

    } catch (error) {
      logger.error('❌ Error creating task:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create task' 
      });
    }
  }

  /** UI ส่งงาน: อัปโหลดไฟล์/ลิงก์ + บันทึก submission */
  public async submitTask(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, taskId } = req.params;
      const { userId, comment, links } = (req.body || {});
      const files = (req as any).files as any[];

      if (!userId) {
        res.status(400).json({ success: false, error: 'Missing userId (LINE User ID)' });
        return;
      }
      // อนุญาตให้ส่งงานได้แม้ไม่มีไฟล์/ลิงก์ (จะถือเป็นการส่งหมายเหตุอย่างเดียว)

      // บันทึกไฟล์ทั้งหมด แล้วได้ fileIds
      const savedFileIds: string[] = [];
      for (const f of (files || [])) {
        const saved = await this.fileService.saveFile({
          groupId,
          uploadedBy: userId,
          messageId: f.originalname,
          content: f.buffer,
          originalName: f.originalname,
          mimeType: f.mimetype,
          folderStatus: 'in_progress'
        });
        savedFileIds.push(saved.id);
      }

      // บันทึกเป็นการส่งงาน
      const task = await this.taskService.recordSubmission(taskId, userId, savedFileIds, comment, links);
      res.json({ success: true, data: task, message: 'Submitted successfully' });
    } catch (error) {
      logger.error('❌ submitTask error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit task' });
    }
  }

  /**
   * PUT /api/tasks/:taskId - อัปเดตงาน
   */
  public async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const updates = req.body as any;

      // แปลงชนิดวันที่จาก string -> Date เพื่อความเข้ากันได้กับ TypeORM/Service
      if (updates) {
        if (typeof updates.dueTime === 'string') {
          updates.dueTime = new Date(updates.dueTime);
        }
        if (typeof updates.startTime === 'string') {
          updates.startTime = new Date(updates.startTime);
        }
      }

      const task = await this.taskService.updateTask(taskId, updates);

      const response: ApiResponse<any> = {
        success: true,
        data: task,
        message: 'Task updated successfully'
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error updating task:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update task' 
      });
    }
  }

  /**
   * POST /api/tasks/:taskId/complete - ปิดงาน
   */
  public async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const { userId } = req.body;

      const taskEntity = await this.taskService.completeTask(taskId, userId);

      // บันทึก KPI ใช้ entity โดยตรง
      const completionType = this.kpiService.calculateCompletionType(taskEntity);
      await this.kpiService.recordTaskCompletion(taskEntity, completionType);
      
      // แปลง entity เป็น interface สำหรับ response
      const task = taskEntityToInterface(taskEntity);

      const response: ApiResponse<any> = {
        success: true,
        data: task,
        message: 'Task completed successfully'
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error completing task:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to complete task' 
      });
    }
  }

  /**
   * GET /api/calendar/:groupId - ดึงข้อมูลปฏิทิน
   */
  public async getCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { startDate, endDate, month, year } = req.query;

      let start: Date;
      let end: Date;

      // รองรับทั้ง startDate/endDate และ month/year
      if (month && year) {
        // Dashboard format
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        start = new Date(yearNum, monthNum - 1, 1); // เดือนเริ่มจาก 0
        end = new Date(yearNum, monthNum, 0, 23, 59, 59); // วันสุดท้ายของเดือน
      } else if (startDate && endDate) {
        // API format
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        // Default: current month
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      const events = await this.taskService.getCalendarEvents(groupId, start, end);

      const response: ApiResponse<any> = {
        success: true,
        data: events
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting calendar events:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get calendar events' 
      });
    }
  }

  // File Endpoints

  /**
   * GET /api/files/:groupId - ดึงรายการไฟล์
   */
  public async getFiles(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { 
        tags, 
        mimeType, 
        search, 
        uploadedBy,
        page = 1, 
        limit = 20 
      } = req.query;

      const options = {
        tags: tags ? (tags as string).split(',') : undefined,
        mimeType: mimeType as string,
        search: search as string,
        uploadedBy: uploadedBy as string,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      const { files, total } = await this.fileService.getGroupFiles(groupId, options);

      const response: PaginatedResponse<any> = {
        success: true,
        data: files,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting files:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get files' 
      });
    }
  }

  /**
   * GET /api/files/:fileId/download - ดาวน์โหลดไฟล์
   * GET /api/groups/:groupId/files/:fileId/download - ดาวน์โหลดไฟล์ (พร้อมตรวจสอบ group)
   */
  public async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, groupId } = req.params;

      // ถ้ามี groupId ให้ตรวจสอบว่าไฟล์เป็นของกลุ่มนั้นจริง
      if (groupId) {
        // ตรวจสอบว่าไฟล์อยู่ในกลุ่มที่ระบุหรือไม่ผ่าน FileService
        const isAuthorized = await this.fileService.isFileInGroup(fileId, groupId);
        if (!isAuthorized) {
          res.status(403).json({ 
            success: false, 
            error: 'Access denied to file' 
          });
          return;
        }
      }

      const { content, mimeType, originalName } = await this.fileService.getFileContent(fileId);

      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Content-Length': content.length.toString()
      });

      res.send(content);

    } catch (error) {
      logger.error('❌ Error downloading file:', error);
      res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }
  }

  /**
   * GET /api/files/:fileId/preview - ดูตัวอย่างไฟล์
   * GET /api/groups/:groupId/files/:fileId/preview - ดูตัวอย่างไฟล์ (พร้อมตรวจสอบ group)
   */
  public async previewFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, groupId } = req.params;

      // ถ้ามี groupId ให้ตรวจสอบว่าไฟล์เป็นของกลุ่มนั้นจริง
      if (groupId) {
        // ตรวจสอบว่าไฟล์อยู่ในกลุ่มที่ระบุหรือไม่ผ่าน FileService
        const isAuthorized = await this.fileService.isFileInGroup(fileId, groupId);
        if (!isAuthorized) {
          res.status(403).json({ 
            success: false, 
            error: 'Access denied to file' 
          });
          return;
        }
      }

      const { content, mimeType } = await this.fileService.getFileContent(fileId);

      // รองรับเฉพาะไฟล์ที่ดูตัวอย่างได้
      const previewableMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain'
      ];

      if (!previewableMimes.includes(mimeType)) {
        res.status(400).json({ 
          success: false, 
          error: 'File type not previewable' 
        });
        return;
      }

      res.set({
        'Content-Type': mimeType,
        'Content-Length': content.length.toString()
      });

      res.send(content);

    } catch (error) {
      logger.error('❌ Error previewing file:', error);
      res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }
  }

  /**
   * POST /api/groups/:groupId/files/upload - อัปโหลดไฟล์เข้าคลังไฟล์ของกลุ่มโดยตรง
   * form-data fields: userId (LINE User ID), comment (optional), tags (comma-separated, optional)
   */
  public async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { userId, tags } = (req.body || {}) as any;
      const files = (req as any).files as any[];

      if (!userId || userId === 'unknown') {
        res.status(400).json({ success: false, error: 'Missing or invalid userId (LINE User ID)' });
        return;
      }
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: 'No files provided' });
        return;
      }

      // ตรวจสอบว่าไฟล์มีขนาดเกิน limit หรือไม่
      const maxFileSize = config.storage.maxFileSize || 10 * 1024 * 1024; // 10MB default
      for (const file of files) {
        if (file.size > maxFileSize) {
          res.status(400).json({ 
            success: false, 
            error: `File ${file.originalname} is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB` 
          });
          return;
        }
      }

      const tagsArray: string[] = Array.isArray(tags)
        ? tags
        : (typeof tags === 'string' && tags.length > 0 ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);

      const saved: any[] = [];
      for (const f of files) {
        try {
          const savedFile = await this.fileService.saveFile({
            groupId,
            uploadedBy: userId,
            messageId: f.originalname,
            content: f.buffer,
            originalName: f.originalname,
            mimeType: f.mimetype,
            folderStatus: 'in_progress'
          });
          
          if (tagsArray.length > 0) {
            try { 
              await this.fileService.addFileTags(savedFile.id, tagsArray); 
            } catch (tagError) {
              logger.warn(`⚠️ Failed to add tags to file: ${savedFile.id}`, tagError);
            }
          }
          saved.push(savedFile);
        } catch (fileError) {
          logger.error(`❌ Error saving file: ${f.originalname}`, fileError);
          res.status(500).json({ 
            success: false, 
            error: `Failed to save file: ${f.originalname}` 
          });
          return;
        }
      }

      res.status(201).json({ 
        success: true, 
        data: saved, 
        message: `Files uploaded successfully (${saved.length} files)` 
      });
    } catch (error) {
      logger.error('❌ Error uploading files:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload files' 
      });
    }
  }

  /**
   * POST /api/files/:fileId/tags - เพิ่มแท็กไฟล์
   */
  public async addFileTags(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { tags } = req.body;

      const file = await this.fileService.addFileTags(fileId, tags);

      const response: ApiResponse<any> = {
        success: true,
        data: file,
        message: 'Tags added successfully'
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error adding file tags:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to add tags' 
      });
    }
  }

  // User & Group Endpoints

  /**
   * GET /api/groups/:groupId/members - ดึงรายการสมาชิก
   */
  public async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;

      const members = await this.userService.getGroupMembers(groupId);

      const response: ApiResponse<any> = {
        success: true,
        data: members
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting group members:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get group members' 
      });
    }
  }

  /**
   * GET /api/groups/:groupId - ดึงข้อมูลกลุ่ม
   */
  public async getGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      
      logger.debug('🔍 Looking for group with ID:', { groupId });

      // ตรวจสอบว่า groupId ไม่ใช่ 'default' หรือ empty
      if (!groupId || groupId === 'default' || groupId === 'undefined' || groupId === 'null') {
        logger.warn('❌ Invalid group ID provided', { groupId });
        res.status(400).json({ 
          success: false, 
          error: 'Invalid group ID provided' 
        });
        return;
      }
      // รองรับทั้ง LINE Group ID และ internal UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
      const group = isUuid
        ? await this.userService.findGroupById(groupId)
        : await this.userService.findGroupByLineId(groupId);
      
      if (!group) {
        logger.warn('❌ Group not found for ID', { groupId });
        res.status(404).json({ 
          success: false, 
          error: 'Group not found' 
        });
        return;
      }

      logger.info('✅ Group found', { id: group.id, name: group.name });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: group.id,
          lineGroupId: group.lineGroupId,
          name: group.name,
          timezone: group.timezone,
          settings: group.settings,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting group:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get group info' 
      });
    }
  }

  /** อัปเดตผู้รับรายงานสรุปอัตโนมัติ (เฉพาะผู้บริหาร/แอดมิน) */
  public async updateReportRecipients(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { recipients } = req.body || {};
      if (!Array.isArray(recipients)) {
        res.status(400).json({ success: false, error: 'Recipients must be an array of LINE User IDs' });
        return;
      }

      // โหลด group (รองรับ LINE Group ID และ UUID) และบันทึก settings.reportRecipients
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
      const group = isUuid
        ? await this.userService.findGroupById(groupId)
        : await this.userService.findGroupByLineId(groupId);
      if (!group) {
        res.status(404).json({ success: false, error: 'Group not found' });
        return;
      }
      const updated = await this.userService.updateGroupSettings(group.id, {
        ...(group.settings || {}),
        reportRecipients: recipients
      } as any);

      res.json({ success: true, data: { reportRecipients: (updated.settings as any).reportRecipients || [] } });
    } catch (error) {
      logger.error('❌ Error updating report recipients:', error);
      res.status(500).json({ success: false, error: 'Failed to update report recipients' });
    }
  }

  /**
   * GET /api/groups/:groupId/stats - ดึงสถิติกลุ่ม
   */
  public async getGroupStats(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      
      logger.debug('📊 Loading stats for group', { groupId });

      // ตรวจสอบว่ากลุ่มมีอยู่จริง (รองรับทั้ง LINE Group ID และ UUID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
      const group = isUuid
        ? await this.userService.findGroupById(groupId)
        : await this.userService.findGroupByLineId(groupId);
      if (!group) {
        res.status(404).json({ 
          success: false, 
          error: 'Group not found' 
        });
        return;
      }

      // ใช้ Promise.allSettled เพื่อไม่ให้ error หนึ่งส่วนทำให้ทั้งหมดล้มเหลว
      const [
        memberStatsResult,
        weeklyStatsResult,
        fileStatsResult
      ] = await Promise.allSettled([
        this.userService.getGroupStats(groupId),
        this.kpiService.getWeeklyStats(groupId),
        this.fileService.getGroupFileStats(groupId)
      ]);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          members: memberStatsResult.status === 'fulfilled' ? memberStatsResult.value : null,
          weekly: weeklyStatsResult.status === 'fulfilled' ? weeklyStatsResult.value : null,
          files: fileStatsResult.status === 'fulfilled' ? fileStatsResult.value : null
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting group stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get group stats' 
      });
    }
  }

  // KPI & Leaderboard Endpoints

  /**
   * GET /api/leaderboard/:groupId - ดึง Leaderboard
   */
  public async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { period = 'weekly' } = req.query;

      const leaderboard = await this.kpiService.getGroupLeaderboard(
        groupId, 
        period as 'weekly' | 'monthly' | 'all'
      );

      const response: ApiResponse<any> = {
        success: true,
        data: leaderboard
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting leaderboard:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get leaderboard' 
      });
    }
  }

  /**
   * GET /api/users/:userId/score-history/:groupId - ดึงสถิติคะแนนรายสัปดาห์
   */
  public async getUserScoreHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId, groupId } = req.params;
      const { weeks = '8' } = req.query;

      const history = await this.kpiService.getUserWeeklyScoreHistory(
        userId,
        groupId,
        parseInt(weeks as string)
      );

      const response: ApiResponse<any> = {
        success: true,
        data: history
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting user score history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get user score history' 
      });
    }
  }

  /**
   * GET /api/users/:userId/average-score/:groupId - ดึงค่าเฉลี่ยคะแนนของผู้ใช้
   */
  public async getUserAverageScore(req: Request, res: Response): Promise<void> {
    try {
      const { userId, groupId } = req.params;
      const { period = 'weekly' } = req.query;

      const averageScore = await this.kpiService.getUserAverageScore(
        userId,
        groupId,
        period as 'weekly' | 'monthly' | 'all'
      );

      const response: ApiResponse<any> = {
        success: true,
        data: { averageScore }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting user average score:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get user average score' 
      });
    }
  }

  /** Reports summary (ผู้บริหาร) */
  public async getReportsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { period = 'weekly', startDate, endDate, userId } = req.query as any;
      const summary = await this.kpiService.getReportSummary(groupId, {
        period: period as 'weekly' | 'monthly',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId
      });
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('❌ Error getting reports summary:', error);
      res.status(500).json({ success: false, error: 'Failed to get reports summary' });
    }
  }

  /** Reports by users (ผู้บริหาร) */
  public async getReportsByUsers(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { period = 'weekly', startDate, endDate } = req.query as any;
      const rows = await this.kpiService.getReportByUsers(groupId, {
        period: period as 'weekly' | 'monthly',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('❌ Error getting reports by users:', error);
      res.status(500).json({ success: false, error: 'Failed to get reports by users' });
    }
  }

  /** Export KPI as JSON/CSV (Excel-compatible) */
  public async exportReports(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query as any;
      const data = await this.kpiService.exportKPIData(groupId, new Date(startDate), new Date(endDate));
      if (format === 'csv') {
        // แปลงเป็น CSV อย่างง่าย
        const headers = Object.keys(data[0] || {});
        const csv = [headers.join(','), ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))].join('\n');
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="kpi-${groupId}.csv"` });
        res.send(csv);
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      logger.error('❌ Error exporting reports:', error);
      res.status(500).json({ success: false, error: 'Failed to export reports' });
    }
  }

  // Recurring Task Handlers (UI)
  public async listRecurring(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const data = await this.recurringService.listByGroup(groupId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('❌ Error listing recurring:', error);
      res.status(500).json({ success: false, error: 'Failed to get recurring list' });
    }
  }

  public async createRecurring(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const body = req.body || {};
      const created = await this.recurringService.create({
        lineGroupId: groupId,
        title: body.title,
        description: body.description,
        assigneeLineUserIds: body.assigneeLineUserIds || [],
        reviewerLineUserId: body.reviewerLineUserId,
        requireAttachment: !!body.requireAttachment,
        priority: body.priority || 'medium',
        tags: body.tags || [],
        recurrence: body.recurrence, // 'weekly' | 'monthly' | 'quarterly'
        weekDay: body.weekDay,
        dayOfMonth: body.dayOfMonth,
        timeOfDay: body.timeOfDay,
        timezone: body.timezone,
        createdByLineUserId: body.createdBy
      });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      logger.error('❌ Error creating recurring:', error);
      res.status(500).json({ success: false, error: 'Failed to create recurring' });
    }
  }

  public async updateRecurring(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await this.recurringService.update(id, req.body || {});
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('❌ Error updating recurring:', error);
      res.status(500).json({ success: false, error: 'Failed to update recurring' });
    }
  }

  public async deleteRecurring(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.recurringService.remove(id);
      res.json({ success: true });
    } catch (error) {
      logger.error('❌ Error deleting recurring:', error);
      res.status(500).json({ success: false, error: 'Failed to delete recurring' });
    }
  }

  /**
   * GET /api/users/:userId/stats - ดึงสถิติผู้ใช้
   */
  public async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { groupId, period = 'all' } = req.query;

      const stats = await this.kpiService.getUserStats(
        userId,
        groupId as string,
        period as 'weekly' | 'monthly' | 'all'
      );

      const response: ApiResponse<any> = {
        success: true,
        data: stats
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting user stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get user stats' 
      });
    }
  }

  /**
   * GET /api/export/kpi/:groupId - ส่งออกข้อมูล KPI
   */
  public async exportKPI(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;

      const data = await this.kpiService.exportKPIData(
        groupId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      if (format === 'csv') {
        // TODO: Convert to CSV format
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="kpi-${groupId}.csv"`
        });
        // Send CSV data
      } else {
        res.json({
          success: true,
          data
        });
      }

    } catch (error) {
      logger.error('❌ Error exporting KPI:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to export KPI data' 
      });
    }
  }

  /**
   * GET /api/line/members/:groupId - ดึงรายชื่อสมาชิกจาก LINE API
   */
  public async getLineMembers(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;

      // ใช้ฟังก์ชัน hybrid ที่ใช้ทั้ง LINE API และฐานข้อมูล
      const members = await this.lineService.getGroupMembersHybrid(groupId);

      const response: ApiResponse<any> = {
        success: true,
        data: members
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting LINE members:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get LINE members' 
      });
    }
  }

  // Notification Card Endpoints

  /**
   * POST /api/notifications/cards - สร้างและส่งการ์ดแจ้งเตือน
   */
  public async createNotificationCard(req: Request, res: Response): Promise<void> {
    try {
      const notificationData: CreateNotificationCardRequest = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!notificationData.title) {
        res.status(400).json({
          success: false,
          error: 'หัวข้อการแจ้งเตือนไม่สามารถเป็นค่าว่างได้'
        });
        return;
      }

      if (!notificationData.targetType) {
        res.status(400).json({
          success: false,
          error: 'ต้องระบุประเภทเป้าหมาย (group, user, หรือ both)'
        });
        return;
      }

      const result = await this.notificationCardService.createAndSendNotificationCard(notificationData);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'ส่งการ์ดแจ้งเตือนสำเร็จ'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'ส่งการ์ดแจ้งเตือนไม่สำเร็จ'
        });
      }

    } catch (error) {
      logger.error('❌ Error creating notification card:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
      });
    }
  }

  /**
   * GET /api/notifications/cards/templates - ดึงเทมเพลตปุ่มมาตรฐาน
   */
  public async getNotificationTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = {
        standard: this.notificationCardService.createStandardButtons(),
        approval: this.notificationCardService.createApprovalButtons()
      };

      res.json({
        success: true,
        data: templates
      });

    } catch (error) {
      logger.error('❌ Error getting notification templates:', error);
      res.status(500).json({
        success: false,
        error: 'ไม่สามารถดึงเทมเพลตได้'
      });
    }
  }

  /**
   * POST /api/notifications/cards/quick - ส่งการ์ดแจ้งเตือนแบบรวดเร็ว
   */
  public async sendQuickNotification(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, groupIds, userIds, priority = 'medium' } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          error: 'หัวข้อการแจ้งเตือนไม่สามารถเป็นค่าว่างได้'
        });
        return;
      }

      // ตรวจสอบว่ามีกลุ่มหรือผู้ใช้อย่างน้อย 1 รายการ
      if ((!groupIds || groupIds.length === 0) && (!userIds || userIds.length === 0)) {
        res.status(400).json({
          success: false,
          error: 'ต้องระบุกลุ่มหรือผู้ใช้อย่างน้อย 1 รายการ'
        });
        return;
      }

      const notificationData: CreateNotificationCardRequest = {
        title,
        description,
        targetType: groupIds && userIds ? 'both' : (groupIds ? 'group' : 'user'),
        groupIds: groupIds || [],
        userIds: userIds || [],
        priority,
        buttons: this.notificationCardService.createStandardButtons()
      };

      const result = await this.notificationCardService.createAndSendNotificationCard(notificationData);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'ส่งการแจ้งเตือนแบบรวดเร็วสำเร็จ'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'ส่งการแจ้งเตือนไม่สำเร็จ'
        });
      }

    } catch (error) {
      logger.error('❌ Error sending quick notification:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
      });
    }
  }
}

const apiController = new ApiController();

// Routes setup

// Group-based routes (ตรงกับ frontend)
apiRouter.get('/groups/:groupId', apiController.getGroup.bind(apiController));
apiRouter.get('/groups/:groupId/members', apiController.getGroupMembers.bind(apiController));
apiRouter.get('/groups/:groupId/stats', apiController.getGroupStats.bind(apiController));
apiRouter.get('/groups/:groupId/tasks', apiController.getTasks.bind(apiController));
apiRouter.post('/groups/:groupId/tasks', apiController.createTask.bind(apiController));
apiRouter.get('/groups/:groupId/calendar', apiController.getCalendarEvents.bind(apiController));
apiRouter.get('/groups/:groupId/files', apiController.getFiles.bind(apiController));
apiRouter.get('/groups/:groupId/leaderboard', apiController.getLeaderboard.bind(apiController));
apiRouter.get('/users/:userId/score-history/:groupId', apiController.getUserScoreHistory.bind(apiController));
apiRouter.get('/users/:userId/average-score/:groupId', apiController.getUserAverageScore.bind(apiController));
  apiRouter.post('/groups/:groupId/settings/report-recipients', apiController.updateReportRecipients.bind(apiController));
  // Reports routes (ผู้บริหาร)
  apiRouter.get('/groups/:groupId/reports/summary', apiController.getReportsSummary.bind(apiController));
  apiRouter.get('/groups/:groupId/reports/by-users', apiController.getReportsByUsers.bind(apiController));
  apiRouter.get('/groups/:groupId/reports/export', apiController.exportReports.bind(apiController));
  // TODO: เพิ่ม endpoints สำหรับ recurring tasks ในอนาคต เช่น POST/GET /groups/:groupId/recurring

// Task-specific routes
apiRouter.put('/tasks/:taskId', apiController.updateTask.bind(apiController));
apiRouter.post('/tasks/:taskId/complete', apiController.completeTask.bind(apiController));

// File-specific routes  
apiRouter.get('/files/:fileId/download', apiController.downloadFile.bind(apiController));
apiRouter.get('/files/:fileId/preview', apiController.previewFile.bind(apiController));
apiRouter.post('/files/:fileId/tags', apiController.addFileTags.bind(apiController));

// Group-specific file routes (สำหรับ dashboard)
apiRouter.get('/groups/:groupId/files/:fileId/download', apiController.downloadFile.bind(apiController));
apiRouter.get('/groups/:groupId/files/:fileId/preview', apiController.previewFile.bind(apiController));

// User and export routes
apiRouter.get('/users/:userId/stats', apiController.getUserStats.bind(apiController));
apiRouter.get('/export/kpi/:groupId', apiController.exportKPI.bind(apiController));
apiRouter.get('/line/members/:groupId', apiController.getLineMembers.bind(apiController));

// New helper route: fetch single task detail by ID (for dashboard modal)
apiRouter.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const svc = new TaskService();
    const task = await svc.getTaskById(taskId);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

// Legacy routes (รองรับ backward compatibility)
apiRouter.get('/tasks/:groupId', apiController.getTasks.bind(apiController));
apiRouter.post('/tasks/:groupId', apiController.createTask.bind(apiController));
apiRouter.get('/calendar/:groupId', apiController.getCalendarEvents.bind(apiController));
apiRouter.get('/files/:groupId', apiController.getFiles.bind(apiController));
apiRouter.get('/leaderboard/:groupId', apiController.getLeaderboard.bind(apiController));

  // Recurring tasks routes (UI management)
  apiRouter.get('/groups/:groupId/recurring', apiController.listRecurring.bind(apiController));
  apiRouter.post('/groups/:groupId/recurring', apiController.createRecurring.bind(apiController));
  apiRouter.put('/recurring/:id', apiController.updateRecurring.bind(apiController));
  apiRouter.delete('/recurring/:id', apiController.deleteRecurring.bind(apiController));

  // Task submission (UI upload)
  apiRouter.post('/groups/:groupId/tasks/:taskId/submit', 
    upload.array('attachments', 10), 
    apiController.submitTask.bind(apiController)
  );

  // Direct file upload to group vault
  apiRouter.post('/groups/:groupId/files/upload',
    upload.array('attachments', 10),
    apiController.uploadFiles.bind(apiController)
  );

  // Notification Card routes
  apiRouter.post('/notifications/cards', apiController.createNotificationCard.bind(apiController));
  apiRouter.get('/notifications/cards/templates', apiController.getNotificationTemplates.bind(apiController));
  apiRouter.post('/notifications/cards/quick', apiController.sendQuickNotification.bind(apiController));