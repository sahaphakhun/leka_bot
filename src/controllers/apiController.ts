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
import { AppDataSource } from '@/utils/database';

import multer from 'multer';
import { logger } from '@/utils/logger';
import { throttledLogger } from '@/utils/throttledLogger';
import { serviceContainer } from '@/utils/serviceContainer';
import { sanitize } from '@/utils';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { validateRequest, taskSchemas, recurringTaskSchemas } from '@/middleware/validation';
import { validateUUIDParams, validateTaskId, validateCommonUUIDs } from '@/middleware/uuidValidation';
import { requireTaskView, requireTaskSubmit, requireTaskEdit, requireTaskApprove } from '@/middleware/taskAuth';
import { ApiResponse, PaginatedResponse, CreateNotificationCardRequest, NotificationCardResponse } from '@/types';
import { taskEntityToInterface } from '@/types/adapters';
import { config } from '@/utils/config';
import { autoMigration } from '@/utils/autoMigration';

export const apiRouter = Router();
// ยกเลิกการจำกัดขนาดไฟล์ที่ multer เพื่อรองรับไฟล์ขนาดใหญ่
const upload = multer({ storage: multer.memoryStorage() });

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

      // แปลง Task entities เป็น interfaces พร้อมข้อมูลผู้ใช้ที่สมบูรณ์
      const tasksWithUserInfo = tasks.map(task => taskEntityToInterface(task));

      const response: PaginatedResponse<any> = {
        success: true,
        data: tasksWithUserInfo,
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

      // ถ้าไม่มี groupId ให้ดึงจาก task
      let finalGroupId = groupId;
      if (!finalGroupId) {
        const task = await this.taskService.getTaskById(taskId);
        if (!task) {
          res.status(404).json({ success: false, error: 'Task not found' });
          return;
        }
        finalGroupId = task.groupId;
      }

      const ALLOWED_MIME_TYPES = [
        // Images
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        'image/x-icon',
        
        // Videos
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo', // .avi
        'video/x-ms-wmv', // .wmv
        'video/webm',
        'video/x-flv',
        'video/3gpp',
        
        // Audio
        'audio/mpeg', // .mp3
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/flac',
        'audio/mp4', // .m4a
        'audio/x-ms-wma',
        
        // Documents - PDF
        'application/pdf',
        
        // Documents - Microsoft Office (Modern)
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        
        // Documents - Microsoft Office (Legacy)
        'application/msword', // .doc
        'application/vnd.ms-excel', // .xls
        'application/vnd.ms-powerpoint', // .ppt
        
        // Documents - OpenOffice/LibreOffice
        'application/vnd.oasis.opendocument.text', // .odt
        'application/vnd.oasis.opendocument.spreadsheet', // .ods
        'application/vnd.oasis.opendocument.presentation', // .odp
        
        // Text Files
        'text/plain',
        'text/csv',
        'text/html',
        'text/css',
        'text/javascript',
        'text/xml',
        'text/rtf',
        
        // Development Files
        'application/json',
        'application/xml',
        'application/javascript',
        'application/typescript',
        'text/x-python',
        'text/x-java-source',
        'text/x-c',
        'text/x-c++',
        'application/x-sh',
        
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip',
        'application/x-bzip2',
        
        // Design Files
        'application/postscript', // .ai, .eps
        'image/vnd.adobe.photoshop', // .psd
        'application/vnd.adobe.illustrator', // .ai
        'application/x-indesign', // .indd
        'application/x-figma', // Custom figma files
        'application/x-sketch', // Sketch files
        
        // CAD Files
        'application/vnd.autodesk.dwg',
        'application/vnd.autodesk.dwf', 
        'image/vnd.dwg',
        'application/x-autocad',
        
        // 3D Files
        'model/obj',
        'model/fbx',
        'model/3mf',
        'application/x-blender',
        
        // Fonts
        'font/ttf',
        'font/otf',
        'font/woff',
        'font/woff2',
        'application/font-woff',
        'application/x-font-ttf',
        
        // E-books
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        
        // Database
        'application/x-sqlite3',
        'application/vnd.ms-access',
        
        // Custom and Generic Types
        'application/dvg', // Custom .dvg format
        'application/x-dvg', // Alternative .dvg format
        'application/octet-stream' // Generic binary files - catch-all for unknown types
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
            groupId: finalGroupId,
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
   * POST /api/dashboard/tasks/:taskId/submit - ส่งงานจากหน้า Dashboard (ไม่ต้องตรวจสอบ authentication)
   * ใช้ userId โดยตรงแทนการ authenticate
   */
  public async submitTaskFromDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const { userId, comment, links } = (req.body || {});
      const files = ((req as any).files as any[]) || [];

      // Validate required userId
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      // ตรวจสอบว่าผู้ใช้มีอยู่จริง
      const user = await this.userService.findByLineUserId(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // ตรวจสอบว่างานมีอยู่จริง
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      // ตรวจสอบว่าผู้ใช้ได้รับมอบหมายงานนี้หรือไม่
      const isAssigned = task.assignedUsers?.some(assignedUser => assignedUser.lineUserId === userId);
      if (!isAssigned) {
        res.status(403).json({ 
          success: false, 
          error: 'คุณไม่ได้เป็นผู้รับผิดชอบงานนี้ จึงไม่สามารถส่งงานได้',
          details: 'Task submission is only allowed for assigned users'
        });
        return;
      }

      const ALLOWED_MIME_TYPES = [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon',
        // Videos
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/x-flv', 'video/3gpp',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-ms-wma',
        // Documents - PDF
        'application/pdf',
        // Documents - Microsoft Office (Modern)
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        // Documents - Microsoft Office (Legacy)
        'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
        // Documents - OpenOffice/LibreOffice
        'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation',
        // Text Files
        'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'text/xml', 'text/rtf',
        // Development Files
        'application/json', 'application/xml', 'application/javascript', 'application/typescript', 'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++', 'application/x-sh',
        // Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip', 'application/x-bzip2',
        // Design Files
        'application/postscript', 'image/vnd.adobe.photoshop', 'application/vnd.adobe.illustrator', 'application/x-indesign', 'application/x-figma', 'application/x-sketch',
        // CAD Files
        'application/vnd.autodesk.dwg', 'application/vnd.autodesk.dwf', 'image/vnd.dwg', 'application/x-autocad',
        // 3D Files
        'model/obj', 'model/fbx', 'model/3mf', 'application/x-blender',
        // Fonts
        'font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/x-font-ttf',
        // E-books
        'application/epub+zip', 'application/x-mobipocket-ebook',
        // Database
        'application/x-sqlite3', 'application/vnd.ms-access',
        // Custom and Generic Types
        'application/dvg', 'application/x-dvg', 'application/octet-stream'
      ];
      const MAX_ATTACHMENTS = 5;

      // ตรวจสอบจำนวนไฟล์
      if (files.length > MAX_ATTACHMENTS) {
        res.status(400).json({ success: false, error: `Maximum ${MAX_ATTACHMENTS} attachments allowed` });
        return;
      }

      // ตรวจสอบชนิดไฟล์
      const invalidFile = files.find(f => !ALLOWED_MIME_TYPES.includes(f.mimetype));
      if (invalidFile) {
        res.status(400).json({ success: false, error: `Invalid file type: ${invalidFile.mimetype}` });
        return;
      }

      // บันทึกไฟล์ทั้งหมด แล้วได้ fileIds
      const savedFileIds: string[] = await Promise.all(
        files.map(async f => {
          const saved = await this.fileService.saveFile({
            groupId: task.groupId,
            uploadedBy: userId,
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
      const submittedTask = await this.taskService.recordSubmission(taskId, userId, savedFileIds, comment, links);
      
      logger.info(`✅ Dashboard task submission completed:`, {
        taskId,
        userId,
        filesCount: files.length,
        hasComment: !!comment
      });
      
      res.json({ success: true, data: submittedTask, message: 'Task submitted successfully from dashboard' });
    } catch (error) {
      logger.error('❌ submitTaskFromDashboard error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit task from dashboard' });
    }
  }

  /**
   * PUT /api/dashboard/groups/:groupId/tasks/:taskId
   * อัปเดตงานจากหน้า Dashboard โดยใช้ userId (LINE) เพื่อยืนยันสิทธิ์ แทน JWT
   * การอนุญาต: ต้องเป็นผู้สร้างงาน และเป็นสมาชิกของกลุ่ม
   */
  public async updateTaskFromDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, taskId } = req.params as { groupId: string; taskId: string };
      const body = (req.body || {}) as any;

      // Require userId in payload
      const userId = (body.userId || '').trim(); // LINE User ID expected (starts with 'U')
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required in payload' });
        return;
      }

      // Load task with relations
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      // Resolve groupId (accept internal UUID or LINE group ID)
      let groupInternal = null as any;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
      if (isUuid) {
        groupInternal = await this.userService.findGroupById(groupId);
      } else {
        groupInternal = await this.userService.findGroupByLineId(groupId);
      }
      if (!groupInternal) {
        res.status(404).json({ success: false, error: 'Group not found' });
        return;
      }

      // Ensure task belongs to the specified group
      if (task.groupId !== groupInternal.id) {
        res.status(400).json({ success: false, error: 'Task does not belong to the specified group' });
        return;
      }

      // Resolve user by LINE ID and verify group membership
      const user = await this.userService.findByLineUserId(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found for provided userId' });
        return;
      }

      const membership = await this.userService.findGroupMembership(user.id, groupInternal.id);
      if (!membership) {
        res.status(403).json({ success: false, error: 'Group membership required' });
        return;
      }

      // Only task creator can edit
      const isCreator = (task.createdBy === user.id) || (task.createdByUser?.id === user.id) || (task.createdByUser?.lineUserId === user.lineUserId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: 'Only the task creator can edit this task' });
        return;
      }

      // Build safe updates (allow-listed keys only)
      const allowedKeys = new Set([
        'title',
        'description',
        'dueTime',
        'startTime',
        'priority',
        'assigneeIds',
        'tags',
        'requireAttachment',
        'reviewAction',
        'reviewerUserId',
        'reviewerComment',
        'status'
      ]);
      const updates: any = {};
      for (const [k, v] of Object.entries(body)) {
        if (k === 'userId') continue; // skip auth field
        if (allowedKeys.has(k)) {
          updates[k] = v;
        }
      }

      // Cast date strings
      if (typeof updates.dueTime === 'string') {
        updates.dueTime = new Date(updates.dueTime);
      }
      if (typeof updates.startTime === 'string') {
        updates.startTime = new Date(updates.startTime);
      }

      // No updates provided
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, error: 'No valid fields to update' });
        return;
      }

      // Perform update
      const updatedTask = await this.taskService.updateTask(taskId, updates);

      logger.info('✅ Dashboard task updated (no-auth endpoint)', {
        taskId,
        groupId: groupInternal.id,
        byLineUserId: user.lineUserId,
        updates: Object.keys(updates)
      });

      res.json({
        success: true,
        data: taskEntityToInterface(updatedTask),
        message: 'Task updated successfully (dashboard)'
      });
    } catch (error) {
      logger.error('❌ updateTaskFromDashboard error:', error);
      res.status(500).json({ success: false, error: 'Failed to update task from dashboard' });
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
   * Note: Public access - no authentication required
   */
  public async getTaskFiles(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, taskId } = req.params;

      // ตรวจสอบว่างานมีอยู่
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      // Allow file access regardless of group ownership for dashboard compatibility
      // Note: Files are considered public within the system for viewing purposes

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
        data: files || []
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
   * GET /api/groups/:groupId/files - ดึงไฟล์ทั้งหมดของกลุ่ม
   * Note: Public access - no authentication required
   */
  public async getGroupFiles(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 50, search, tags, mimeType } = req.query;

      // Build filter parameters
      const filters: any = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Cap at 100
        offset: (parseInt(page as string) - 1) * Math.min(parseInt(limit as string), 100)
      };

      if (search) filters.search = search as string;
      if (tags) filters.tags = (tags as string).split(',');
      if (mimeType) filters.mimeType = mimeType as string;

      // Get files for the group
      const result = await this.fileService.getGroupFiles(groupId, filters);

      // Calculate pagination
      const totalPages = Math.ceil(result.total / filters.limit);

      const response: PaginatedResponse<any> = {
        success: true,
        data: result.files || [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('❌ Error getting group files:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get group files' 
      });
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
   * POST /api/files/upload - อัปโหลดไฟล์ทั่วไป (สำหรับ Dashboard)
   * รองรับไฟล์รูปภาพ (JPEG, PNG, GIF), PDF, ข้อความธรรมดา และไฟล์เอกสาร Microsoft Office
   * form-data fields: files (array of files)
   */
  public async uploadGeneralFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = (req as any).files as any[];

      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: 'No files provided' });
        return;
      }

      const ALLOWED_MIME_TYPES = [
        // Images
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        'image/x-icon',
        
        // Videos
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo', // .avi
        'video/x-ms-wmv', // .wmv
        'video/webm',
        'video/x-flv',
        'video/3gpp',
        
        // Audio
        'audio/mpeg', // .mp3
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/flac',
        'audio/mp4', // .m4a
        'audio/x-ms-wma',
        
        // Documents - PDF
        'application/pdf',
        
        // Documents - Microsoft Office (Modern)
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        
        // Documents - Microsoft Office (Legacy)
        'application/msword', // .doc
        'application/vnd.ms-excel', // .xls
        'application/vnd.ms-powerpoint', // .ppt
        
        // Documents - OpenOffice/LibreOffice
        'application/vnd.oasis.opendocument.text', // .odt
        'application/vnd.oasis.opendocument.spreadsheet', // .ods
        'application/vnd.oasis.opendocument.presentation', // .odp
        
        // Text Files
        'text/plain',
        'text/csv',
        'text/html',
        'text/css',
        'text/javascript',
        'text/xml',
        'text/rtf',
        
        // Development Files
        'application/json',
        'application/xml',
        'application/javascript',
        'application/typescript',
        'text/x-python',
        'text/x-java-source',
        'text/x-c',
        'text/x-c++',
        'application/x-sh',
        
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip',
        'application/x-bzip2',
        
        // Design Files
        'application/postscript', // .ai, .eps
        'image/vnd.adobe.photoshop', // .psd
        'application/vnd.adobe.illustrator', // .ai
        'application/x-indesign', // .indd
        'application/x-figma', // Custom figma files
        'application/x-sketch', // Sketch files
        
        // CAD Files
        'application/vnd.autodesk.dwg',
        'application/vnd.autodesk.dwf', 
        'image/vnd.dwg',
        'application/x-autocad',
        
        // 3D Files
        'model/obj',
        'model/fbx',
        'model/3mf',
        'application/x-blender',
        
        // Fonts
        'font/ttf',
        'font/otf',
        'font/woff',
        'font/woff2',
        'application/font-woff',
        'application/x-font-ttf',
        
        // E-books
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        
        // Database
        'application/x-sqlite3',
        'application/vnd.ms-access',
        
        // Custom and Generic Types
        'application/dvg', // Custom .dvg format
        'application/x-dvg', // Alternative .dvg format
        'application/octet-stream' // Generic binary files - catch-all for unknown types
      ];

      // ตรวจสอบประเภทไฟล์
      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          res.status(400).json({ 
            success: false, 
            error: `File type not allowed: ${file.originalname} (${file.mimetype})` 
          });
          return;
        }
      }

      // อัปโหลดไฟล์ไปยัง FileService
      const uploadedFiles: any[] = [];
      for (const file of files) {
        try {
          const result = await this.fileService.saveFile({
            groupId: 'default', // ใช้ default group สำหรับไฟล์ทั่วไป
            uploadedBy: 'dashboard_user', // ใช้ default user สำหรับ dashboard
            messageId: `dashboard_${Date.now()}`,
            content: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            attachmentType: 'initial'
          });
          
          uploadedFiles.push({
            id: result.id,
            name: file.originalname,
            url: result.path,
            size: file.size,
            type: file.mimetype,
            createdAt: result.uploadedAt.toISOString()
          });
        } catch (error) {
          logger.error('Error uploading file:', error);
          res.status(500).json({ 
            success: false, 
            error: `Failed to upload file: ${file.originalname}` 
          });
          return;
        }
      }

      res.json({ 
        success: true, 
        data: uploadedFiles,
        message: `Successfully uploaded ${uploadedFiles.length} file(s)` 
      });

    } catch (error) {
      logger.error('❌ uploadGeneralFiles error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload files' });
    }
  }

  /**
   * GET /api/files - ดึงรายการไฟล์ทั้งหมด
   */
  public async getFiles(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, search } = req.query;
      
      const options = {
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        search: search as string
      };

      // ใช้ getGroupFiles แทน getFiles
      const { files, total } = await this.fileService.getGroupFiles('default', {
        limit: options.limit,
        offset: options.offset,
        search: options.search
      });

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
      res.status(500).json({ success: false, error: 'Failed to get files' });
    }
  }

  /**
   * GET /api/files/:fileId/download - ดาวน์โหลดไฟล์
   */
  public async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      
      const file = await this.fileService.getFileInfo(fileId);
      if (!file) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      // หากเป็นไฟล์ที่อยู่บนผู้ให้บริการภายนอก (เช่น Cloudinary) ให้ redirect 302 ไปยัง URL โดยตรง
      const directUrl = this.fileService.getDirectDownloadUrl(file as any);
      if (directUrl && /^https?:\/\//i.test(directUrl)) {
        // ใช้ 302 เพื่อให้เบราว์เซอร์ไปดาวน์โหลดจากต้นทาง ลดโอกาส timeout บนเซิร์ฟเวอร์
        return res.redirect(302, directUrl);
      }

      // กรณีเป็นไฟล์โลคอล ให้สตรีมไฟล์กลับตามเดิม พร้อมกำหนดชื่อไฟล์ให้มีนามสกุลและรองรับ UTF-8
      const fileContent = await this.fileService.getFileContent(fileId);

      // สร้างชื่อไฟล์ที่ปลอดภัยและมีนามสกุล
      let downloadName = this.fileService.getSafeDownloadFilename(file as any);
      const safeName = sanitize(downloadName);
      const encodedName = encodeURIComponent(safeName);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
      res.setHeader('Content-Length', fileContent.content.length);
      res.send(fileContent.content);

    } catch (error) {
      logger.error('❌ Error downloading file:', error);
      res.status(500).json({ success: false, error: 'Failed to download file' });
    }
  }

  /**
   * DELETE /api/files/:fileId - ลบไฟล์
   */
  public async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      
      const file = await this.fileService.getFileInfo(fileId);
      if (!file) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      // ลบไฟล์จาก Cloudinary และฐานข้อมูล
      await this.fileService.deleteFile(fileId);
      
      res.json({ success: true, message: 'File deleted successfully' });

    } catch (error) {
      logger.error('❌ Error deleting file:', error);
      res.status(500).json({ success: false, error: 'Failed to delete file' });
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
        // Images
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        'image/x-icon',
        
        // Videos
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo', // .avi
        'video/x-ms-wmv', // .wmv
        'video/webm',
        'video/x-flv',
        'video/3gpp',
        
        // Audio
        'audio/mpeg', // .mp3
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/flac',
        'audio/mp4', // .m4a
        'audio/x-ms-wma',
        
        // Documents - PDF
        'application/pdf',
        
        // Documents - Microsoft Office (Modern)
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        
        // Documents - Microsoft Office (Legacy)
        'application/msword', // .doc
        'application/vnd.ms-excel', // .xls
        'application/vnd.ms-powerpoint', // .ppt
        
        // Documents - OpenOffice/LibreOffice
        'application/vnd.oasis.opendocument.text', // .odt
        'application/vnd.oasis.opendocument.spreadsheet', // .ods
        'application/vnd.oasis.opendocument.presentation', // .odp
        
        // Text Files
        'text/plain',
        'text/csv',
        'text/html',
        'text/css',
        'text/javascript',
        'text/xml',
        'text/rtf',
        
        // Development Files
        'application/json',
        'application/xml',
        'application/javascript',
        'application/typescript',
        'text/x-python',
        'text/x-java-source',
        'text/x-c',
        'text/x-c++',
        'application/x-sh',
        
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip',
        'application/x-bzip2',
        
        // Design Files
        'application/postscript', // .ai, .eps
        'image/vnd.adobe.photoshop', // .psd
        'application/vnd.adobe.illustrator', // .ai
        'application/x-indesign', // .indd
        'application/x-figma', // Custom figma files
        'application/x-sketch', // Sketch files
        
        // CAD Files
        'application/vnd.autodesk.dwg',
        'application/vnd.autodesk.dwf', 
        'image/vnd.dwg',
        'application/x-autocad',
        
        // 3D Files
        'model/obj',
        'model/fbx',
        'model/3mf',
        'application/x-blender',
        
        // Fonts
        'font/ttf',
        'font/otf',
        'font/woff',
        'font/woff2',
        'application/font-woff',
        'application/x-font-ttf',
        
        // E-books
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        
        // Database
        'application/x-sqlite3',
        'application/vnd.ms-access',
        
        // Executables and Installers (with caution)
        'application/x-msdownload', // .exe (for specific use cases)
        'application/vnd.microsoft.portable-executable',
        'application/x-deb',
        'application/x-redhat-package-manager', // .rpm
        'application/x-apple-diskimage', // .dmg
        
        // Custom and Generic Types
        'application/dvg', // Custom .dvg format
        'application/x-dvg', // Alternative .dvg format
        'application/octet-stream' // Generic binary files - catch-all for unknown types
      ];

      // ตรวจสอบประเภทไฟล์เท่านั้น (ไม่จำกัดขนาดไฟล์)
      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          res.status(400).json({
            success: false,
            error: `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
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
      
      logger.info('📝 Listing recurring tasks for group:', groupId);
      
      // Check if the database connection and table exist
      const queryRunner = AppDataSource.createQueryRunner();
      try {
        const tableExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'recurring_tasks'
          )
        `);
        
        if (!tableExists[0].exists) {
          logger.error('❌ recurring_tasks table does not exist');
          res.status(500).json({ 
            success: false, 
            error: 'recurring_tasks table does not exist in database' 
          });
          return;
        }
        
        logger.info('✅ recurring_tasks table exists');
      } finally {
        await queryRunner.release();
      }
      
      const data = await this.recurringService.listByGroup(groupId);
      logger.info('✅ Successfully retrieved recurring tasks:', { count: data.length });
      res.json({ success: true, data });
    } catch (error) {
      logger.error('❌ Error listing recurring:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        groupId: req.params.groupId
      });
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get recurring list' 
      });
    }
  }

  public async createRecurring(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const body = req.body || {};
      
      logger.info('📝 Creating recurring task:', {
        groupId,
        title: body.title,
        assigneeCount: body.assigneeLineUserIds?.length || 0,
        recurrence: body.recurrence,
        weekDay: body.weekDay,
        dayOfMonth: body.dayOfMonth,
        timeOfDay: body.timeOfDay,
        timezone: body.timezone,
        createdBy: body.createdBy || body.createdByLineUserId
      });
      
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
        createdByLineUserId: body.createdBy || body.createdByLineUserId // Support both field names
      });
      
      logger.info('✅ Recurring task created successfully:', { id: created.id, title: created.title });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      logger.error('❌ Error creating recurring:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        groupId: req.params.groupId,
        bodyKeys: Object.keys(req.body || {})
      });
      
      // Return more detailed error for debugging
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create recurring task',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      });
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

  public async getRecurring(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const recurring = await this.recurringService.findById(id);
      if (!recurring) {
        res.status(404).json({ success: false, error: 'Recurring task not found' });
        return;
      }
      res.json({ success: true, data: recurring });
    } catch (error) {
      logger.error('❌ Error getting recurring:', error);
      res.status(500).json({ success: false, error: 'Failed to get recurring task' });
    }
  }

  public async getRecurringHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      
      // ดึงงานที่สร้างจากแม่แบบงานประจำนี้
      const tasks = await this.taskService.getTasksByRecurringId(id, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.json({ success: true, data: tasks });
    } catch (error) {
      logger.error('❌ Error getting recurring history:', error);
      res.status(500).json({ success: false, error: 'Failed to get recurring task history' });
    }
  }

  public async getRecurringStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // ดึงสถิติของงานประจำ
      const stats = await this.taskService.getRecurringTaskStats(id);
      
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('❌ Error getting recurring stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get recurring task statistics' });
    }
  }

  public async getGroupRecurringStats(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      
      // ดึงสถิติงานประจำทั้งหมดในกลุ่ม
      const stats = await this.taskService.getGroupRecurringStats(groupId);
      
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('❌ Error getting group recurring stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get group recurring statistics' });
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
      logger.info('🔄 เริ่มรัน comprehensive manual migration...');
      
      const { comprehensiveMigration } = await import('@/utils/comprehensiveMigration');
      
      // ตรวจสอบว่าต้องรัน migration หรือไม่
      const needsMigration = await comprehensiveMigration.checkMigrationNeeded();
      logger.info(`🔍 ตรวจสอบ migration: ${needsMigration ? 'ต้องรัน' : 'ไม่ต้องรัน'}`);
      
      if (!needsMigration) {
        res.json({ 
          success: true, 
          message: 'Database schema is already up to date',
          migrationRan: false,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // รัน comprehensive migration
      await comprehensiveMigration.runComprehensiveMigration();
      
      // ดึงผลลัพธ์ migration
      const results = comprehensiveMigration.getMigrationResults();
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;
      const failureCount = totalCount - successCount;
      
      logger.info(`✅ Comprehensive migration completed: ${successCount}/${totalCount} steps successful`);
      
      res.json({ 
        success: failureCount === 0,
        message: failureCount === 0 
          ? `Migration completed successfully: ${successCount}/${totalCount} steps successful`
          : `Migration completed with warnings: ${successCount}/${totalCount} steps successful, ${failureCount} failed`,
        migrationRan: true,
        results: {
          successful: successCount,
          failed: failureCount,
          total: totalCount,
          details: results
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Comprehensive migration failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Migration failed',
        migrationRan: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/admin/migrate-kpi-enum - รัน KPI Enum migration
   */
  public async runKPIEnumMigration(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Starting KPI Enum migration...');
      
      // Migration script has been removed - this endpoint is deprecated
      res.json({
        success: false,
        message: 'KPI Enum migration script has been removed. Please use comprehensive migration instead.',
        deprecated: true
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
      
      // Check database connection directly
      const { AppDataSource } = await import('@/utils/database');
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      
      // Simple query to test connection
      await AppDataSource.query('SELECT 1');
      
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

  /**
   * Endpoint to manually trigger duration days column migration
   */
  public async migrateDurationDays(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!(req as any).user) {
        res.status(401).json({
          status: 'ERROR',
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      logger.info('🔄 Manually triggering duration days column migration...');
      
      // Use comprehensive migration instead
      const { comprehensiveMigration } = await import('@/utils/comprehensiveMigration');
      await comprehensiveMigration.runComprehensiveMigration();
      
      res.json({
        status: 'OK',
        message: 'Duration days column migration completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ Duration days column migration failed:', error);
      res.status(500).json({
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/users/:userId - ดึงข้อมูลผู้ใช้
   */
  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // ดึงข้อมูลผู้ใช้จาก Line User ID
      const user = await this.userService.findByLineUserId(userId);
      
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('❌ getUser error:', error);
      res.status(500).json({ success: false, error: 'Failed to get user' });
    }
  }

  /**
   * GET /api/users/:userId/tasks - ดึงงานของผู้ใช้
   */
  public async getUserTasks(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status, excludeSubmitted } = req.query;
      
      logger.info('🔍 getUserTasks API called', {
        userId,
        status,
        excludeSubmitted,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      // Validate required parameters
      if (!userId) {
        logger.warn('⚠️ Missing userId parameter');
        res.status(400).json({ 
          success: false, 
          error: 'User ID is required',
          details: 'userId parameter is missing from request' 
        });
        return;
      }
      
      // ดึงข้อมูลผู้ใช้จาก Line User ID
      logger.info('🔍 Finding user by LINE User ID:', userId);
      const user = await this.userService.findByLineUserId(userId);
      
      if (!user) {
        logger.warn('⚠️ User not found for LINE User ID:', userId);
        res.status(404).json({ 
          success: false, 
          error: 'User not found',
          details: `No user found with LINE User ID: ${userId}`
        });
        return;
      }
      
      logger.info('✅ Found user:', {
        id: user.id,
        displayName: user.displayName,
        lineUserId: user.lineUserId
      });
      
      // แยก status เป็น array
      const statusArray = status ? (status as string).split(',').map(s => s.trim()) : ['pending', 'in_progress', 'overdue'];
      
      logger.info('📊 Status array parsed:', statusArray);
      
      // ดึงงานของผู้ใช้
      logger.info('🔍 Fetching user tasks...');
      let tasks = await this.taskService.getUserTasks(user.id, statusArray);
      
      logger.info(`📊 Found ${tasks.length} tasks before filtering`);
      
      // ถ้าต้องการกรองงานที่ส่งแล้วออก (สำหรับหน้า submit-tasks)
      if (excludeSubmitted === 'true') {
        logger.info('🔍 Filtering out submitted tasks...');
        
        const originalTaskCount = tasks.length;
        tasks = tasks.filter(task => {
          // ตรวจสอบว่าผู้ใช้นี้ได้ส่งงานแล้วหรือไม่
          if (task.workflow && Array.isArray((task.workflow as any).submissions)) {
            const userSubmissions = (task.workflow as any).submissions.filter((submission: any) => 
              submission.submittedByUserId === user.id
            );
            return userSubmissions.length === 0; // แสดงเฉพาะงานที่ยังไม่ได้ส่ง
          }
          return true; // แสดงถ้าไม่มีข้อมูล workflow
        });
        
        logger.info(`📊 After excludeSubmitted filter: ${tasks.length}/${originalTaskCount} tasks remaining`);
      }
      
      // เพิ่มข้อมูลกลุ่มให้กับแต่ละงาน - ใช้ relations ที่มีอยู่แล้วจาก getUserTasks
      const tasksWithGroups = tasks.map(task => ({
        ...task,
        group: task.group ? {
          id: task.group.id,
          name: task.group.name
        } : null
      }));
      
      logger.info(`✅ getUserTasks completed successfully. Returning ${tasksWithGroups.length} tasks`);
      
      res.json({ 
        success: true, 
        data: tasksWithGroups,
        metadata: {
          userId: user.id,
          lineUserId: userId,
          statusFilter: statusArray,
          excludeSubmitted: excludeSubmitted === 'true',
          count: tasksWithGroups.length
        }
      });
    } catch (error) {
      logger.error('❌ getUserTasks error:', {
        userId: req.params.userId,
        status: req.query.status,
        excludeSubmitted: req.query.excludeSubmitted,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to get user tasks';
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('User ID is required')) {
          errorMessage = error.message;
          statusCode = 400;
        } else if (error.message.includes('User not found')) {
          errorMessage = error.message;
          statusCode = 404;
        } else if (error.message.includes('syntax error') || error.message.includes('relation') || error.message.includes('column')) {
          errorMessage = 'Database query error';
          logger.error('Database-related error detected:', error.message);
        } else {
          errorMessage = `Internal server error: ${error.message}`;
        }
      }
      
      res.status(statusCode).json({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
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
  apiRouter.post('/groups/:groupId/settings/report-recipients', apiController.updateReportRecipients.bind(apiController));
  // Reports routes (ผู้บริหาร)
  apiRouter.get('/groups/:groupId/reports/summary', apiController.getReportsSummary.bind(apiController));
  apiRouter.get('/groups/:groupId/reports/by-users', apiController.getReportsByUsers.bind(apiController));
  apiRouter.get('/groups/:groupId/reports/export', apiController.exportReports.bind(apiController));
  // TODO: เพิ่ม endpoints สำหรับ recurring tasks ในอนาคต เช่น POST/GET /groups/:groupId/recurring

// Task-specific routes
apiRouter.put('/tasks/:taskId', authenticate, requireTaskEdit, apiController.updateTask.bind(apiController));
apiRouter.put('/groups/:groupId/tasks/:taskId', authenticate, requireTaskEdit, apiController.updateTask.bind(apiController));
apiRouter.post('/tasks/:taskId/complete', authenticate, requireTaskApprove, apiController.completeTask.bind(apiController));
apiRouter.post('/groups/:groupId/tasks/:taskId/approve-extension', authenticate, requireTaskApprove, apiController.approveExtension.bind(apiController));

// File-specific routes (public access)
apiRouter.get('/files/:fileId/download', apiController.downloadFile.bind(apiController));
apiRouter.get('/files/:fileId/preview', apiController.previewFile.bind(apiController));
apiRouter.post('/files/:fileId/tags', apiController.addFileTags.bind(apiController));

// Group-specific file routes (public access for dashboard)
apiRouter.get('/groups/:groupId/files/:fileId/download', apiController.downloadFile.bind(apiController));
apiRouter.get('/groups/:groupId/files/:fileId/preview', apiController.previewFile.bind(apiController));
apiRouter.get('/groups/:groupId/files/:fileId', apiController.getFileInfo.bind(apiController));

// Task-specific file routes
apiRouter.get('/groups/:groupId/tasks/:taskId/files', 
  validateTaskId,
  apiController.getTaskFiles.bind(apiController)
);

// Group files endpoint (public access for dashboard)
apiRouter.get('/groups/:groupId/files',
  apiController.getGroupFiles.bind(apiController)
);

// User and export routes
apiRouter.get('/users/:userId/stats', 
  validateUUIDParams(['userId']),
  apiController.getUserStats.bind(apiController)
);
apiRouter.get('/export/kpi/:groupId', apiController.exportKPI.bind(apiController));
apiRouter.post('/kpi/sample/:groupId', apiController.createSampleKPIData.bind(apiController));
apiRouter.get('/line/members/:groupId', apiController.getLineMembers.bind(apiController));

// New helper route: fetch single task detail by ID (for dashboard modal)
apiRouter.get('/task/:taskId', 
  validateTaskId,
  async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const svc = new TaskService();
    const taskEntity = await svc.getTaskById(taskId);
    if (!taskEntity) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    const task = taskEntityToInterface(taskEntity);
    res.json({ success: true, data: task });
  } catch (err) {
    logger.error('Failed to get task:', err);
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

// Group-specific task detail route
apiRouter.get('/groups/:groupId/tasks/:taskId', 
  validateTaskId,
  async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const svc = new TaskService();
    const taskEntity = await svc.getTaskById(taskId);
    if (!taskEntity) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    const task = taskEntityToInterface(taskEntity);
    res.json({ success: true, data: task });
  } catch (err) {
    logger.error('Failed to get task:', err);
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

// Legacy routes (รองรับ backward compatibility)
apiRouter.get('/tasks/:groupId', apiController.getTasks.bind(apiController));
apiRouter.post('/tasks/:groupId', apiController.createTask.bind(apiController));
apiRouter.get('/calendar/:groupId', apiController.getCalendarEvents.bind(apiController));
apiRouter.get('/files/:groupId', apiController.getFiles.bind(apiController));
apiRouter.get('/leaderboard/:groupId', apiController.getLeaderboard.bind(apiController));

  // Debug endpoint for recurring tasks
  apiRouter.post('/debug/recurring-test', async (req, res) => {
    try {
      logger.info('🔍 Debug recurring task request:', {
        headers: req.headers,
        body: req.body,
        bodyKeys: Object.keys(req.body || {}),
        bodyStringified: JSON.stringify(req.body, null, 2)
      });
      
      res.json({
        success: true,
        message: 'Debug endpoint - request logged',
        receivedData: req.body
      });
    } catch (error) {
      logger.error('❌ Debug endpoint error:', error);
      res.status(500).json({ success: false, error: 'Debug endpoint failed' });
    }
  });

  // Temporary recurring endpoint without validation
  apiRouter.post('/groups/:groupId/recurring-no-validation', async (req, res) => {
    try {
      const { groupId } = req.params;
      const body = req.body || {};
      
      logger.info('🔍 Testing recurring without validation:', {
        groupId,
        bodyKeys: Object.keys(body),
        body: JSON.stringify(body, null, 2)
      });
      
      const apiController = new ApiController();
      await apiController.createRecurring(req, res);
      
    } catch (error) {
      logger.error('❌ No-validation endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create recurring task without validation',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Recurring tasks routes (UI management)
  apiRouter.get('/groups/:groupId/recurring', apiController.listRecurring.bind(apiController));
  apiRouter.post('/groups/:groupId/recurring', validateRequest(recurringTaskSchemas.create), apiController.createRecurring.bind(apiController));
  apiRouter.get('/recurring/:id', apiController.getRecurring.bind(apiController));
  apiRouter.put('/recurring/:id', validateRequest(recurringTaskSchemas.update), apiController.updateRecurring.bind(apiController));
  apiRouter.delete('/recurring/:id', apiController.deleteRecurring.bind(apiController));
  
  // Recurring task history and statistics
  apiRouter.get('/recurring/:id/history', apiController.getRecurringHistory.bind(apiController));
  apiRouter.get('/recurring/:id/stats', apiController.getRecurringStats.bind(apiController));
  apiRouter.get('/groups/:groupId/recurring/stats', apiController.getGroupRecurringStats.bind(apiController));

  // Task submission (UI upload)
  apiRouter.post('/groups/:groupId/tasks/:taskId/submit', 
    authenticate,
    requireTaskSubmit,
    upload.array('attachments', 10), 
    apiController.submitTask.bind(apiController)
  );

  // Task submission (direct task ID - for backward compatibility)
  apiRouter.post('/tasks/:taskId/submit', 
    authenticate,
    requireTaskSubmit,
    upload.array('files', 10), 
    apiController.submitTask.bind(apiController)
  );

// Dashboard task submission (no authentication required - uses userId directly)
  apiRouter.post('/dashboard/tasks/:taskId/submit',
    upload.array('attachments', 10),
    apiController.submitTaskFromDashboard.bind(apiController)
  );

  // Dashboard task update (no authentication required - uses userId directly)
  apiRouter.put('/dashboard/groups/:groupId/tasks/:taskId',
    apiController.updateTaskFromDashboard.bind(apiController)
  );

  // Direct file upload to group vault
  apiRouter.post('/groups/:groupId/files/upload',
    upload.array('attachments', 10),
    apiController.uploadFiles.bind(apiController)
  );

  // General file upload (for dashboard)
  apiRouter.post('/files/upload',
    upload.array('files', 10),
    apiController.uploadGeneralFiles.bind(apiController)
  );

  // File management endpoints
  apiRouter.get('/files/:fileId/download', apiController.downloadFile.bind(apiController));
  apiRouter.delete('/files/:fileId', apiController.deleteFile.bind(apiController));
  apiRouter.get('/files', apiController.getFiles.bind(apiController));

  // Manual migration endpoint (for Railway deployment)
  apiRouter.post('/admin/migrate', apiController.runMigration.bind(apiController));
  
  // Duration days migration endpoint
  apiRouter.post('/admin/migrate-duration-days', apiController.migrateDurationDays.bind(apiController));
  
  // KPI Enum migration endpoint
  apiRouter.post('/admin/migrate-kpi-enum', apiController.runKPIEnumMigration.bind(apiController));
  apiRouter.get('/admin/check-db', apiController.checkDatabaseConnection.bind(apiController));

  // Group name update endpoint
  apiRouter.post('/groups/update-names', apiController.updateAllGroupNames.bind(apiController));

  // User routes
  apiRouter.get('/users/:userId', apiController.getUser.bind(apiController));
  apiRouter.get('/users/:userId/tasks', apiController.getUserTasks.bind(apiController));

  // Notification Card routes
  apiRouter.post('/notifications/cards', apiController.createNotificationCard.bind(apiController));
  apiRouter.get('/notifications/cards/templates', apiController.getNotificationTemplates.bind(apiController));
  apiRouter.post('/notifications/cards/quick', apiController.sendQuickNotification.bind(apiController));
  apiRouter.post('/admin/test-google-calendar', apiController.testGoogleCalendar.bind(apiController));
  apiRouter.post('/admin/setup-group-calendar/:groupId', apiController.setupGroupCalendar.bind(apiController));
