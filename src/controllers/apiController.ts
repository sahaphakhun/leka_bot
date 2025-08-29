// API Controller - REST API endpoints

import { Router, Request, Response } from 'express';
import http from 'http';
import https from 'https';
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
import { sanitize } from '@/utils';
import { authenticate } from '@/middleware/auth';
import { validateRequest, taskSchemas } from '@/middleware/validation';
import { ApiResponse, PaginatedResponse, CreateNotificationCardRequest, NotificationCardResponse } from '@/types';
import { taskEntityToInterface } from '@/types/adapters';
import { config } from '@/utils/config';
import { autoMigration } from '@/utils/autoMigration';

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
      
      // Provide more specific error messages
      let errorMessage = 'Failed to get tasks';
      if (error instanceof Error) {
        if (error.message.includes('Group not found')) {
          errorMessage = 'Group not found';
        } else if (error.message.includes('Invalid date')) {
          errorMessage = 'Invalid date format provided';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
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

      // Debug logging
      logger.info('📝 Creating task with data:', {
        groupId,
        title: taskData.title,
        assigneeIds: taskData.assigneeIds,
        createdBy: taskData.createdBy,
        dueTime: taskData.dueTime,
        hasDescription: !!taskData.description,
        priority: taskData.priority,
        tags: taskData.tags,
        requireAttachment: taskData.requireAttachment,
        reviewerUserId: taskData.reviewerUserId,
        fileIds: taskData.fileIds
      });

      // ตรวจสอบ required fields
      const requiredFields = ['title', 'assigneeIds', 'createdBy', 'dueTime'];
      for (const field of requiredFields) {
        if (!taskData[field]) {
          logger.warn(`⚠️ Missing required field: ${field}`);
          res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`,
            details: `Field '${field}' is required but not provided`
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
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create task';
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('Group not found')) {
          errorMessage = 'Group not found';
          statusCode = 404;
        } else if (error.message.includes('Creator user not found')) {
          errorMessage = 'Creator user not found';
          statusCode = 400;
        } else if (error.message.includes('งานนี้ถูกสร้างไปแล้ว')) {
          errorMessage = error.message;
          statusCode = 409;
        } else if (error.message.includes('Missing required field')) {
          errorMessage = error.message;
          statusCode = 400;
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(statusCode).json({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      });
    }
  }

  /** UI ส่งงาน: อัปโหลดไฟล์/ลิงก์ + บันทึก submission */
  public async submitTask(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, taskId } = req.params;
      const { userId, comment, links } = (req.body || {});
      const files = ((req as any).files as any[]) || [];

      const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain'
      ];
      const MAX_ATTACHMENTS = 5;

      // สร้าง temporary userId ถ้าไม่มี
      let finalUserId = userId;
      if (!finalUserId) {
        finalUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('สร้าง temporary userId สำหรับการส่งงาน:', finalUserId);
      }
      
      // อนุญาตให้ส่งงานได้แม้ไม่มีไฟล์/ลิงก์ (จะถือเป็นการส่งหมายเหตุอย่างเดียว)

      if (files.length > MAX_ATTACHMENTS) {
        res.status(400).json({ success: false, error: `Maximum ${MAX_ATTACHMENTS} attachments allowed` });
        return;
      }

      const invalidFile = files.find(f => !ALLOWED_MIME_TYPES.includes(f.mimetype));
      if (invalidFile) {
        res.status(400).json({ success: false, error: `Invalid file type: ${invalidFile.mimetype}` });
        return;
      }

      // บันทึกไฟล์ทั้งหมด แล้วได้ fileIds
      const savedFileIds: string[] = await Promise.all(
        files.map(async f => {
          const saved = await this.fileService.saveFile({
            groupId,
            uploadedBy: finalUserId,
            messageId: f.originalname,
            content: f.buffer,
            originalName: f.originalname,
            mimeType: f.mimetype,
            folderStatus: 'in_progress'
          });
          return saved.id;
        })
      );

      // บันทึกเป็นการส่งงาน
      const task = await this.taskService.recordSubmission(taskId, finalUserId, savedFileIds, comment, links);
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
   * POST /api/groups/:groupId/tasks/:taskId/approve-extension - อนุมัติการเลื่อนเวลา
   */
  public async approveExtension(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, taskId } = req.params;
      const { newDueDate, newDueTime } = req.body;

      if (!newDueDate) {
        res.status(400).json({
          success: false,
          error: 'กรุณาระบุวันที่ใหม่'
        });
        return;
      }

      // รวม date และ time เป็น datetime
      const dueTimeString = newDueTime || '23:59';
      const newDueDateTime = new Date(`${newDueDate}T${dueTimeString}:00.000+07:00`);

      // อัปเดตงานด้วยวันที่ใหม่
      const updatedTask = await this.taskService.updateTask(taskId, {
        dueTime: newDueDateTime
      });

      // ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
      await this.taskService.sendExtensionApprovalNotification(taskId, newDueDateTime);

      res.json({
        success: true,
        data: taskEntityToInterface(updatedTask),
        message: 'อนุมัติการเลื่อนเวลาและส่งแจ้งเตือนเรียบร้อยแล้ว'
      });

    } catch (error) {
      logger.error('❌ Error approving extension:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอนุมัติการเลื่อนเวลา'
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
   * GET /api/groups/:groupId/tasks/:taskId/files - ดึงไฟล์ของงานเฉพาะ
   */
  public async getTaskFiles(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, taskId } = req.params;

      // ตรวจสอบว่างานมีอยู่และอยู่ในกลุ่มที่ระบุ
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      if (task.groupId !== groupId) {
        res.status(403).json({ 
          success: false, 
          error: 'Task does not belong to this group' 
        });
        return;
      }

      // ดึงไฟล์ที่ผูกกับงาน
      let files = await this.fileService.getTaskFiles(taskId);

      // ถ้าไม่พบไฟล์ ให้ลอง fallback เพิ่มเติม
      if ((!files || files.length === 0) && task) {
        // 1) relations ที่โหลดมากับ task (attachedFiles)
        if (Array.isArray((task as any).attachedFiles) && (task as any).attachedFiles.length > 0) {
          files = (task as any).attachedFiles as any[];
        }
        // 2) workflow submissions → รวม fileIds ทั้งหมดแล้วดึงรายละเอียดไฟล์
        if ((!files || files.length === 0) && (task as any).workflow && Array.isArray((task as any).workflow.submissions)) {
          const submissions: any[] = (task as any).workflow.submissions;
          const allFileIds = submissions.flatMap(s => Array.isArray(s.fileIds) ? s.fileIds : []);
          if (allFileIds.length > 0) {
            try {
              files = await this.fileService.getFilesByIds(allFileIds);
            } catch {
              // เงียบ error เพื่อไม่ให้ endpoint ล้ม
            }
          }
        }
      }

      const response: ApiResponse<any> = {
        success: true,
        data: files
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting task files:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get task files' 
      });
    }
  }

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
    let fileUrl: string | undefined;
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

      const file = await this.fileService.getFileInfo(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
        return;
      }
      fileUrl = this.fileService.resolveFileUrl(file);

      // Debug: log ข้อมูลไฟล์
      logger.info(`🔍 Download file: ${fileId}, path: ${fileUrl}, mimeType: ${file.mimeType}`);

      // ดึงเนื้อไฟล์จาก service (รองรับทั้ง local และ remote)
      const { content, mimeType, originalName } = await this.fileService.getFileContent(fileId);

      // ตรวจสอบและสร้างชื่อไฟล์ที่เหมาะสม
      let downloadName = originalName && originalName.trim() !== '' ? originalName : `file_${fileId}`;

      // เพิ่มนามสกุลให้ถูกต้อง
      const ext = (this.fileService as any).getFileExtension
        ? (this.fileService as any).getFileExtension(mimeType, downloadName)
        : '';
      if (ext && !downloadName.toLowerCase().endsWith(ext.toLowerCase())) {
        downloadName += ext;
      }

      // Debug: log ข้อมูลชื่อไฟล์
      logger.info(`📁 File download info:`, {
        fileId,
        originalName,
        mimeType,
        finalDownloadName: downloadName
      });

      // ลบอักขระที่ไม่ปลอดภัยออกจากชื่อไฟล์
      downloadName = downloadName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

      // สร้างชื่อไฟล์ที่ปลอดภัยสำหรับ HTTP header
      const safeName = sanitize(downloadName);

      // สร้าง Content-Disposition header ที่รองรับ UTF-8
      const encodedName = encodeURIComponent(safeName);
      const contentDisposition = `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`;

      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition,
        'Content-Length': content.length.toString()
      });

      res.send(content);

    } catch (error) {
      const statusCode = (error as any)?.statusCode;
      const url = (error as any)?.url || fileUrl;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Error downloading file', { fileId: req.params.fileId, url, statusCode, message: errorMessage });

      if (statusCode) {
        if (statusCode >= 500) {
          res.status(502).json({ success: false, error: errorMessage, url });
        } else {
          res.status(statusCode).json({ success: false, error: errorMessage, url });
        }
      } else if (errorMessage.includes('File not found')) {
        res.status(404).json({ success: false, error: 'File not found', url });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error', url });
      }
    }
  }

  /**
   * Fallback method สำหรับดาวน์โหลดไฟล์เมื่อ streaming ไม่สำเร็จ
   */
  private async fallbackToFileDownload(fileId: string, res: Response, mimeType: string, downloadName: string): Promise<void> {
    try {
      logger.info(`🔄 Fallback: ดึงไฟล์ ${fileId} ผ่าน getFileContent`);
      const { content, mimeType: actualMimeType, originalName } = await this.fileService.getFileContent(fileId);
      const safeName = sanitize(downloadName);

      // สร้าง Content-Disposition header ที่รองรับ UTF-8
      const encodedName = encodeURIComponent(safeName);
      const contentDisposition = `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
      
      res.set({
        'Content-Type': actualMimeType || mimeType,
        'Content-Disposition': contentDisposition,
        'Content-Length': content.length.toString()
      });
      
      res.send(content);
    } catch (error) {
      const statusCode = (error as any)?.statusCode;
      const url = (error as any)?.url;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Fallback download failed for file ${fileId}:`, { url, statusCode, error: errorMessage });
      if (statusCode) {
        if (statusCode >= 500) {
          res.status(502).json({ success: false, error: errorMessage, url });
        } else {
          res.status(statusCode).json({ success: false, error: errorMessage, url });
        }
      } else {
        res.status(503).json({ success: false, error: 'File temporarily unavailable', url });
      }
    }
  }

  /**
   * Fallback method สำหรับดูไฟล์เมื่อ streaming ไม่สำเร็จ
   */
  private async fallbackToPreviewFile(fileId: string, res: Response): Promise<void> {
    try {
      logger.info(`🔄 Fallback: ดึงไฟล์ ${fileId} ผ่าน getFileContent สำหรับ preview`);
      const { content, mimeType, originalName } = await this.fileService.getFileContent(fileId);

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

      // ตรวจสอบและสร้างชื่อไฟล์ที่เหมาะสมสำหรับ header
      let previewName = originalName && originalName.trim() !== '' ? originalName : `file_${fileId}`;
      const ext = (this.fileService as any).getFileExtension
        ? (this.fileService as any).getFileExtension(mimeType, previewName)
        : '';
      if (ext && !previewName.toLowerCase().endsWith(ext.toLowerCase())) {
        previewName += ext;
      }
      previewName = sanitize(previewName);
      const encodedName = encodeURIComponent(previewName);

      res.set({
        'Content-Type': mimeType,
        'Content-Length': content.length.toString(),
        'Content-Disposition': `inline; filename="${previewName}"; filename*=UTF-8''${encodedName}`
      });

      res.send(content);
    } catch (error) {
      const statusCode = (error as any)?.statusCode;
      const url = (error as any)?.url;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Fallback preview failed for file ${fileId}:`, { url, statusCode, error: errorMessage });
      if (statusCode) {
        if (statusCode >= 500) {
          res.status(502).json({ success: false, error: errorMessage, url });
        } else {
          res.status(statusCode).json({ success: false, error: errorMessage, url });
        }
      } else {
        res.status(503).json({ success: false, error: 'File temporarily unavailable', url });
      }
    }
  }

  /**
   * GET /api/files/:fileId/preview - ดูตัวอย่างไฟล์
   * GET /api/groups/:groupId/files/:fileId/preview - ดูตัวอย่างไฟล์ (พร้อมตรวจสอบ group)
   */
  public async previewFile(req: Request, res: Response): Promise<void> {
    let fileUrl: string | undefined;
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

      const file = await this.fileService.getFileInfo(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
        return;
      }
      fileUrl = this.fileService.resolveFileUrl(file);

      // Debug: log ข้อมูลไฟล์
      logger.info(`🔍 Preview file: ${fileId}, path: ${fileUrl}, mimeType: ${file.mimeType}`);

      // ดึงเนื้อไฟล์ผ่าน service เพื่อสตรีมกลับให้ผู้ใช้
      const { content, mimeType, originalName } = await this.fileService.getFileContent(fileId);

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

      // ตรวจสอบและสร้างชื่อไฟล์สำหรับ header
      let previewName = originalName && originalName.trim() !== '' ? originalName : `file_${fileId}`;
      const ext = (this.fileService as any).getFileExtension
        ? (this.fileService as any).getFileExtension(mimeType, previewName)
        : '';
      if (ext && !previewName.toLowerCase().endsWith(ext.toLowerCase())) {
        previewName += ext;
      }
      previewName = sanitize(previewName);
      const encodedName = encodeURIComponent(previewName);

      res.set({
        'Content-Type': mimeType,
        'Content-Length': content.length.toString(),
        'Content-Disposition': `inline; filename="${previewName}"; filename*=UTF-8''${encodedName}`
      });

      res.send(content);

    } catch (error) {
      const statusCode = (error as any)?.statusCode;
      const url = (error as any)?.url || fileUrl;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Error previewing file', { fileId: req.params.fileId, url, statusCode, message: errorMessage });

      if (statusCode) {
        if (statusCode >= 500) {
          res.status(502).json({ success: false, error: errorMessage, url });
        } else {
          res.status(statusCode).json({ success: false, error: errorMessage, url });
        }
      } else if (errorMessage.includes('File not found')) {
        res.status(404).json({ success: false, error: 'File not found', url });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error', url });
      }
    }
  }

  /**
   * GET /api/groups/:groupId/files/:fileId - ดึงข้อมูลไฟล์โดยตรง
   */
  public async getFileInfo(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, groupId } = req.params;

      // ตรวจสอบว่าไฟล์อยู่ในกลุ่มที่ระบุหรือไม่
      if (groupId) {
        const isAuthorized = await this.fileService.isFileInGroup(fileId, groupId);
        if (!isAuthorized) {
          res.status(403).json({ 
            success: false, 
            error: 'Access denied to file' 
          });
          return;
        }
      }

      const fileInfo = await this.fileService.getFileInfo(fileId);
      res.json({ success: true, data: fileInfo });

    } catch (error) {
      // ลดการ logging เพื่อป้องกัน rate limit
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('File not found')) {
        res.status(404).json({ 
          success: false, 
          error: 'File not found' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Internal server error' 
        });
      }
    }
  }

  /**
   * POST /api/groups/:groupId/files/upload - อัปโหลดไฟล์เข้าคลังไฟล์ของกลุ่มโดยตรง
   * รองรับไฟล์รูปภาพ (JPEG, PNG, GIF), PDF, ข้อความธรรมดา และไฟล์เอกสาร Microsoft Office (Word, Excel, PowerPoint)
   * form-data fields: userId (LINE User ID), comment (optional), tags (comma-separated, optional)
   */
  public async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { userId, tags, attachmentType } = (req.body || {}) as any;
      const files = (req as any).files as any[];

      if (!userId || userId === 'unknown') {
        res.status(400).json({ success: false, error: 'Missing or invalid userId (LINE User ID)' });
        return;
      }
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: 'No files provided' });
        return;
      }

      const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

      // ตรวจสอบว่าไฟล์มีขนาดเกิน limit หรือประเภทไม่ถูกต้อง
      const maxFileSize = config.storage.maxFileSize || 10 * 1024 * 1024; // 10MB default
      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          res.status(400).json({
            success: false,
            error: `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
          });
          return;
        }
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
            folderStatus: 'in_progress',
            attachmentType: attachmentType || 'initial' // default เป็น initial
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

  /**
   * GET /api/users/:userId - ดึงข้อมูลผู้ใช้แบบพื้นฐาน (สำหรับ Dashboard header)
   */
  public async getUserBasic(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { groupId } = req.query as { groupId?: string };

      if (!userId) {
        res.status(400).json({ success: false, error: 'User ID is required' });
        return;
      }

      // Determine if the provided userId is an internal UUID or a LINE User ID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);

      // Resolve user by either DB UUID (id) or LINE User ID (lineUserId)
      const user = isUuid
        ? await this.userService.findById(userId)
        : await this.userService.findByLineUserId(userId);

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      let role: string | undefined = undefined;
      if (groupId && typeof groupId === 'string') {
        try {
          // Accept both group UUID and LINE Group ID
          const isGroupUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
          const group = isGroupUuid
            ? await this.userService.findGroupById(groupId)
            : await this.userService.findGroupByLineId(groupId);
          if (group) {
            const membership = await this.userService.findGroupMembership(user.id, group.id);
            role = membership?.role;
          }
        } catch (_) {
          // ignore membership lookup errors
        }
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          realName: user.realName,
          email: user.email,
          timezone: user.timezone,
          isVerified: user.isVerified,
          role
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('❌ Error getting user info:', error);
      res.status(500).json({ success: false, error: 'Failed to get user info' });
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
      const { period = 'this_week' } = req.query;
      
      logger.debug('📊 Loading stats for group', { groupId, period });

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

      // ตรวจสอบ period ที่ถูกต้อง
      const validPeriods = ['this_week', 'last_week', 'all'];
      const selectedPeriod = validPeriods.includes(period as string) ? period as 'this_week' | 'last_week' | 'all' : 'this_week';

      // ใช้ Promise.allSettled เพื่อไม่ให้ error หนึ่งส่วนทำให้ทั้งหมดล้มเหลว
      const [
        memberStatsResult,
        statsResult,
        fileStatsResult
      ] = await Promise.allSettled([
        this.userService.getGroupStats(groupId),
        this.kpiService.getStatsByPeriod(groupId, selectedPeriod),
        this.fileService.getGroupFileStats(groupId)
      ]);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          members: memberStatsResult.status === 'fulfilled' ? memberStatsResult.value : null,
          stats: statsResult.status === 'fulfilled' ? statsResult.value : null,
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
      const { period = 'weekly', limit } = req.query;

      console.log(`🔍 API: Getting leaderboard for group: ${groupId}, period: ${period}, limit: ${limit}`);

      // Validate groupId
      if (!groupId) {
        res.status(400).json({
          success: false,
          error: 'Group ID is required'
        });
        return;
      }

      // Validate groupId format (UUID, 'default', or LINE Group ID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const lineGroupIdRegex = /^[A-Za-z0-9]{33}$/; // LINE Group ID format
      
      if (groupId !== 'default' && !uuidRegex.test(groupId) && !lineGroupIdRegex.test(groupId)) {
        console.warn(`⚠️ Invalid group ID format: ${groupId}`);
        res.status(400).json({
          success: false,
          error: 'Invalid group ID format',
          details: 'Group ID must be a valid UUID, LINE Group ID, or "default"'
        });
        return;
      }

      // Validate period parameter
      const validPeriods = ['weekly', 'monthly', 'all'];
      if (period && !validPeriods.includes(period as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period parameter',
          details: `Period must be one of: ${validPeriods.join(', ')}`
        });
        return;
      }

      // ซิงค์คะแนนจากงานแบบเรียลไทม์ก่อน (บันทึก KPI ลงฐานข้อมูลตามช่วงเวลา)
      try {
        await this.kpiService.syncLeaderboardScores(
          groupId,
          period as 'weekly' | 'monthly' | 'all'
        );
      } catch (syncErr) {
        console.warn('⚠️ Sync leaderboard failed, continue with existing KPI records:', syncErr);
      }

      const leaderboard = await this.kpiService.getGroupLeaderboard(
        groupId, 
        period as 'weekly' | 'monthly' | 'all'
      );

      // รองรับการจำกัดจำนวนผลลัพธ์
      const limited = (limit ? leaderboard.slice(0, parseInt(limit as string)) : leaderboard);

      // Debug mode - เพิ่มข้อมูลเพิ่มเติม
      const isDebug = req.query.debug === 'true';
      if (isDebug) {
        console.log('🔍 Debug mode enabled - adding extra data');
        
        // ดึงข้อมูล KPI raw data สำหรับ debug
        try {
          const debugData = await this.kpiService.getDebugKPIData(groupId, period as 'weekly' | 'monthly' | 'all');
          const response: ApiResponse<any> = {
            success: true,
            data: limited,
            debug: debugData
          };
          res.json(response);
          return;
        } catch (debugError) {
          console.error('❌ Error getting debug data:', debugError);
        }
      }

      const response: ApiResponse<any> = {
        success: true,
        data: limited
      };

      console.log(`✅ API: Successfully returned leaderboard with ${limited.length} users`);
      res.json(response);

    } catch (error) {
      console.error('❌ API Error getting leaderboard:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          groupId: req.params.groupId,
          period: req.query.period,
          limit: req.query.limit
        });
      }

      // Return appropriate error response
      let errorMessage = 'Failed to get leaderboard';
      let statusCode = 500;

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          statusCode = 404;
          errorMessage = 'Group not found';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          statusCode = 403;
          errorMessage = 'Access denied';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          statusCode = 400;
          errorMessage = 'Invalid request parameters';
        } else if (error.message.includes('connection') || error.message.includes('database')) {
          statusCode = 503;
          errorMessage = 'Database connection error';
        }
      }

      res.status(statusCode).json({ 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        requestInfo: {
          groupId: req.params.groupId,
          period: req.query.period,
          limit: req.query.limit,
          timestamp: new Date().toISOString()
        }
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

  /**
   * POST /api/groups/:groupId/sync-leaderboard - ซิงค์และคำนวณคะแนน leaderboard ใหม่
   */
  public async syncLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { period = 'weekly' } = req.body;

      console.log(`🔄 API: Syncing leaderboard for group: ${groupId}, period: ${period}`);

      // Validate groupId
      if (!groupId) {
        res.status(400).json({
          success: false,
          error: 'Group ID is required'
        });
        return;
      }

      // Validate groupId format (UUID, 'default', or LINE Group ID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const lineGroupIdRegex = /^[A-Za-z0-9]{33}$/; // LINE Group ID format
      
      if (groupId !== 'default' && !uuidRegex.test(groupId) && !lineGroupIdRegex.test(groupId)) {
        console.warn(`⚠️ Invalid group ID format: ${groupId}`);
        res.status(400).json({
          success: false,
          error: 'Invalid group ID format',
          details: 'Group ID must be a valid UUID, LINE Group ID, or "default"'
        });
        return;
      }

      // Validate period parameter
      const validPeriods = ['weekly', 'monthly', 'all'];
      if (period && !validPeriods.includes(period)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period parameter',
          details: `Period must be one of: ${validPeriods.join(', ')}`
        });
        return;
      }

      // เรียกใช้ KPIService เพื่อซิงค์และคำนวณคะแนนใหม่
      const syncResult = await this.kpiService.syncLeaderboardScores(
        groupId,
        period as 'weekly' | 'monthly' | 'all'
      );

      const response: ApiResponse<any> = {
        success: true,
        data: {
          message: 'Leaderboard synchronized successfully',
          processedTasks: syncResult.processedTasks,
          updatedUsers: syncResult.updatedUsers,
          period: period
        }
      };

      console.log(`✅ API: Successfully synced leaderboard for ${syncResult.updatedUsers} users`);
      res.json(response);

    } catch (error) {
      console.error('❌ API Error syncing leaderboard:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          groupId: req.params.groupId,
          period: req.body.period
        });
      }

      // Return appropriate error response
      let errorMessage = 'Failed to sync leaderboard';
      let statusCode = 500;

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          statusCode = 404;
          errorMessage = 'Group not found';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          statusCode = 403;
          errorMessage = 'Access denied';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          statusCode = 400;
          errorMessage = 'Invalid request parameters';
        } else if (error.message.includes('connection') || error.message.includes('database')) {
          statusCode = 503;
          errorMessage = 'Database connection error';
        }
      }

      res.status(statusCode).json({ 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        requestInfo: {
          groupId: req.params.groupId,
          period: req.body.period,
          timestamp: new Date().toISOString()
        }
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
   * POST /api/kpi/sample/:groupId - สร้างข้อมูล KPI ตัวอย่างสำหรับทดสอบ
   */
  public async createSampleKPIData(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      
      await this.kpiService.createSampleKPIData(groupId);
      
      const response: ApiResponse<any> = {
        success: true,
        data: { message: 'Sample KPI data created successfully' }
      };
      
      res.json(response);
      
    } catch (error) {
      logger.error('❌ Error creating sample KPI data:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create sample KPI data' 
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

  /**
   * POST /api/admin/migrate - รัน migration แบบ manual
   */
  public async runMigration(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 เริ่มรัน manual migration...');
      
      // ตรวจสอบว่าต้องรัน migration หรือไม่
      const needsMigration = await autoMigration.checkMigrationNeeded();
      console.log(`🔍 ตรวจสอบ migration: ${needsMigration ? 'ต้องรัน' : 'ไม่ต้องรัน'}`);
      
      if (needsMigration) {
        await autoMigration.runAutoMigration();
        console.log('✅ Migration เสร็จสิ้น');
        res.json({ 
          success: true, 
          message: 'Migration completed successfully',
          migrationRan: true
        });
      } else {
        console.log('✅ Database schema ครบถ้วนแล้ว');
        res.json({ 
          success: true, 
          message: 'Database schema is already up to date',
          migrationRan: false
        });
      }
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Migration failed',
        migrationRan: false
      });
    }
  }

  /**
   * POST /api/admin/migrate-kpi-enum - รัน KPI Enum migration
   */
  public async runKPIEnumMigration(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Starting KPI Enum migration...');
      
      const { migrateOverdueKPIType } = await import('@/scripts/migrateOverdueKPIType');
      await migrateOverdueKPIType();
      
      res.json({
        success: true,
        message: 'KPI Enum migration completed successfully',
        details: 'Added "overdue" to kpi_records_type_enum'
      });
    } catch (error) {
      logger.error('❌ KPI Enum migration error:', error);
      res.status(500).json({
        success: false,
        error: 'KPI Enum migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/admin/check-db - ตรวจสอบการเชื่อมต่อฐานข้อมูล
   */
  public async checkDatabaseConnection(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Checking database connection...');
      
      const { checkDatabaseConnection } = await import('@/scripts/checkDatabaseConnection');
      await checkDatabaseConnection();
      
      res.json({
        success: true,
        message: 'Database connection is working properly',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ Database connection check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Database connection check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/groups/update-names - อัพเดทชื่อกลุ่มทั้งหมดให้ดึงจาก LINE API
   */
  public async updateAllGroupNames(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔄 Starting bulk group name update...');

      // ดึงกลุ่มทั้งหมดจากฐานข้อมูล
      const groups = await this.userService.getAllGroups();
      logger.info(`📊 Found ${groups.length} groups to process`);

      const results = {
        total: groups.length,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: [] as Array<{
          groupId: string;
          oldName: string;
          newName?: string;
          status: 'updated' | 'skipped' | 'error';
          error?: string;
        }>
      };

      for (const group of groups) {
        try {
          logger.debug(`🔍 Processing group: ${group.name} (${group.lineGroupId})`);

          // ตรวจสอบว่าชื่อกลุ่มเป็นตัวย่อของไอดีหรือไม่
          const isAbbreviatedName = this.isAbbreviatedGroupName(group.name, group.lineGroupId);
          
          if (!isAbbreviatedName) {
            logger.debug(`✅ Group "${group.name}" already has proper name, skipping`);
            results.skipped++;
            results.details.push({
              groupId: group.lineGroupId,
              oldName: group.name,
              status: 'skipped'
            });
            continue;
          }

          // ดึงข้อมูลกลุ่มจาก LINE API
          const groupInfo = await this.lineService.getGroupInformation(group.lineGroupId);
          
          // ตรวจสอบว่าชื่อใหม่ดีกว่าชื่อเดิมหรือไม่
          if (groupInfo.source === 'line_api' || this.isImprovedName(group.name, groupInfo.name)) {
            // อัพเดทชื่อกลุ่มในฐานข้อมูล
            await this.userService.updateGroupName(group.id, groupInfo.name);
            
            logger.info(`✅ Updated "${group.name}" → "${groupInfo.name}" (${groupInfo.source})`);
            results.updated++;
            results.details.push({
              groupId: group.lineGroupId,
              oldName: group.name,
              newName: groupInfo.name,
              status: 'updated'
            });
          } else {
            logger.debug(`ℹ️ No better name available for: ${group.name}`);
            results.skipped++;
            results.details.push({
              groupId: group.lineGroupId,
              oldName: group.name,
              status: 'skipped'
            });
          }

          // เพิ่ม delay เพื่อหลีกเลี่ยง rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error: any) {
          logger.error(`❌ Error processing group ${group.name}:`, error);
          results.errors++;
          results.details.push({
            groupId: group.lineGroupId,
            oldName: group.name,
            status: 'error',
            error: error.message || 'Unknown error'
          });
        }
      }

      logger.info('📊 Group name update completed', results);

      const response: ApiResponse<any> = {
        success: true,
        data: results
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error in bulk group name update:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update group names' 
      });
    }
  }

  /**
   * ตรวจสอบว่าชื่อกลุ่มเป็นตัวย่อของไอดีหรือไม่
   */
  private isAbbreviatedGroupName(name: string, lineGroupId: string): boolean {
    // ตรวจสอบรูปแบบต่างๆ ของชื่อกลุ่มที่เป็นตัวย่อ
    const abbreviatedPatterns = [
      /^กลุ่ม [A-Za-z0-9]{1,8}$/,           // กลุ่ม C1234567
      /^กลุ่ม [A-Za-z0-9]{8,}$/,            // กลุ่ม Cxxxxxxxx (long IDs)
      /^\[INACTIVE\]/,                       // [INACTIVE] groups
      /^Group /,                             // English "Group " prefix
      /^แชทส่วนตัว$/,                        // Personal chat
      /^personal_/                           // personal_xxxxx
    ];

    // ตรวจสอบว่าชื่อกลุ่มตรงกับรูปแบบตัวย่อหรือไม่
    const isAbbreviated = abbreviatedPatterns.some(pattern => pattern.test(name));
    
    // ตรวจสอบเพิ่มเติมว่าชื่อกลุ่มเป็นส่วนหนึ่งของ lineGroupId หรือไม่
    const shortId = lineGroupId.length > 8 ? lineGroupId.substring(0, 8) : lineGroupId;
    const isIdAbbreviation = name.includes(shortId) || name.includes(lineGroupId);
    
    return isAbbreviated || isIdAbbreviation;
  }

  /**
   * ตรวจสอบว่าชื่อใหม่ดีกว่าชื่อเดิมหรือไม่
   */
  private isImprovedName(oldName: string, newName: string): boolean {
    // ตรวจสอบว่าชื่อใหม่เป็นตัวย่อหรือไม่
    const abbreviatedPatterns = [
      /^กลุ่ม [A-Za-z0-9]{1,8}$/,
      /^กลุ่ม [A-Za-z0-9]{8,}$/,
      /^\[INACTIVE\]/,
      /^Group /,
      /^แชทส่วนตัว$/,
      /^personal_/
    ];

    const isNewNameAbbreviated = abbreviatedPatterns.some(pattern => pattern.test(newName));
    
    // ถ้าชื่อใหม่เป็นตัวย่อ ให้ถือว่าไม่ดีขึ้น
    if (isNewNameAbbreviated) {
      return false;
    }

    // ถ้าชื่อเดิมเป็นตัวย่อและชื่อใหม่ไม่ใช่ ให้ถือว่าดีขึ้น
    const isOldNameAbbreviated = this.isAbbreviatedGroupName(oldName, '');
    if (isOldNameAbbreviated && !isNewNameAbbreviated) {
      return true;
    }

    // ถ้าชื่อใหม่ยาวกว่าและมีความหมายมากกว่า ให้ถือว่าดีขึ้น
    if (newName.length > oldName.length && newName.length > 10) {
      return true;
    }

    return false;
  }

  /**
   * ทดสอบการเชื่อมต่อ Google Calendar
   */
  public async testGoogleCalendar(req: Request, res: Response): Promise<void> {
    try {
      const { GoogleService } = await import('@/services/GoogleService');
      const googleService = new GoogleService();
      
      const result = await googleService.testConnection();
      
      res.json({
        success: true,
        message: 'Google Calendar connection test',
        result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Google Calendar test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Google Calendar test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * ตั้งค่า Google Calendar สำหรับกลุ่ม
   */
  public async setupGroupCalendar(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { groupName, timezone } = req.body;

      if (!groupId) {
        res.status(400).json({
          success: false,
          message: 'Group ID is required'
        });
        return;
      }

      const { GoogleService } = await import('@/services/GoogleService');
      const googleService = new GoogleService();
      
      const calendarId = await googleService.setupGroupCalendar(
        groupId,
        groupName || 'Default Group',
        timezone || 'Asia/Bangkok'
      );
      
      res.json({
        success: true,
        message: 'Google Calendar setup successful',
        calendarId,
        groupId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Google Calendar setup failed:', error);
      res.status(500).json({
        success: false,
        message: 'Google Calendar setup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
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
apiRouter.get('/groups/:groupId/tasks', validateRequest(taskSchemas.list), apiController.getTasks.bind(apiController));
apiRouter.post('/groups/:groupId/tasks', validateRequest(taskSchemas.create), apiController.createTask.bind(apiController));
apiRouter.get('/groups/:groupId/calendar', apiController.getCalendarEvents.bind(apiController));
apiRouter.get('/groups/:groupId/files', apiController.getFiles.bind(apiController));
apiRouter.get('/groups/:groupId/leaderboard', apiController.getLeaderboard.bind(apiController));
apiRouter.post('/groups/:groupId/sync-leaderboard', apiController.syncLeaderboard.bind(apiController));
apiRouter.get('/users/:userId/score-history/:groupId', apiController.getUserScoreHistory.bind(apiController));
apiRouter.get('/users/:userId/average-score/:groupId', apiController.getUserAverageScore.bind(apiController));
// Basic user info for dashboard header
apiRouter.get('/users/:userId', apiController.getUserBasic.bind(apiController));
  apiRouter.post('/groups/:groupId/settings/report-recipients', apiController.updateReportRecipients.bind(apiController));
  // Reports routes (ผู้บริหาร)
  apiRouter.get('/groups/:groupId/reports/summary', apiController.getReportsSummary.bind(apiController));
  apiRouter.get('/groups/:groupId/reports/by-users', apiController.getReportsByUsers.bind(apiController));
  apiRouter.get('/groups/:groupId/reports/export', apiController.exportReports.bind(apiController));
  // TODO: เพิ่ม endpoints สำหรับ recurring tasks ในอนาคต เช่น POST/GET /groups/:groupId/recurring

// Task-specific routes
apiRouter.put('/tasks/:taskId', apiController.updateTask.bind(apiController));
apiRouter.put('/groups/:groupId/tasks/:taskId', apiController.updateTask.bind(apiController));
apiRouter.post('/tasks/:taskId/complete', apiController.completeTask.bind(apiController));
apiRouter.post('/groups/:groupId/tasks/:taskId/approve-extension', apiController.approveExtension.bind(apiController));

// File-specific routes  
apiRouter.get('/files/:fileId/download', apiController.downloadFile.bind(apiController));
apiRouter.get('/files/:fileId/preview', apiController.previewFile.bind(apiController));
apiRouter.post('/files/:fileId/tags', apiController.addFileTags.bind(apiController));

// Group-specific file routes (สำหรับ dashboard)
apiRouter.get('/groups/:groupId/files/:fileId/download', apiController.downloadFile.bind(apiController));
apiRouter.get('/groups/:groupId/files/:fileId/preview', apiController.previewFile.bind(apiController));
apiRouter.get('/groups/:groupId/files/:fileId', apiController.getFileInfo.bind(apiController));

// Task-specific file routes
apiRouter.get('/groups/:groupId/tasks/:taskId/files', apiController.getTaskFiles.bind(apiController));

// User and export routes
apiRouter.get('/users/:userId/stats', apiController.getUserStats.bind(apiController));
apiRouter.get('/export/kpi/:groupId', apiController.exportKPI.bind(apiController));
apiRouter.post('/kpi/sample/:groupId', apiController.createSampleKPIData.bind(apiController));
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

// Group-specific task detail route
apiRouter.get('/groups/:groupId/tasks/:taskId', async (req, res) => {
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

  // Manual migration endpoint (for Railway deployment)
  apiRouter.post('/admin/migrate', apiController.runMigration.bind(apiController));
  
  // KPI Enum migration endpoint
  apiRouter.post('/admin/migrate-kpi-enum', apiController.runKPIEnumMigration.bind(apiController));
  apiRouter.get('/admin/check-db', apiController.checkDatabaseConnection.bind(apiController));

  // Group name update endpoint
  apiRouter.post('/groups/update-names', apiController.updateAllGroupNames.bind(apiController));

  // Notification Card routes
  apiRouter.post('/notifications/cards', apiController.createNotificationCard.bind(apiController));
  apiRouter.get('/notifications/cards/templates', apiController.getNotificationTemplates.bind(apiController));
  apiRouter.post('/notifications/cards/quick', apiController.sendQuickNotification.bind(apiController));
  apiRouter.post('/admin/test-google-calendar', apiController.testGoogleCalendar.bind(apiController));
  apiRouter.post('/admin/setup-group-calendar/:groupId', apiController.setupGroupCalendar.bind(apiController));
