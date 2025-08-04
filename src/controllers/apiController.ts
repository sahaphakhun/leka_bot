// API Controller - REST API endpoints

import { Router, Request, Response } from 'express';
import { TaskService } from '@/services/TaskService';
import { UserService } from '@/services/UserService';
import { FileService } from '@/services/FileService';
import { KPIService } from '@/services/KPIService';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { ApiResponse, PaginatedResponse } from '@/types';

export const apiRouter = Router();

class ApiController {
  private taskService: TaskService;
  private userService: UserService;
  private fileService: FileService;
  private kpiService: KPIService;

  constructor() {
    this.taskService = new TaskService();
    this.userService = new UserService();
    this.fileService = new FileService();
    this.kpiService = new KPIService();
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
      console.error('❌ Error getting tasks:', error);
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

      const task = await this.taskService.createTask({
        ...taskData,
        groupId
      });

      const response: ApiResponse<any> = {
        success: true,
        data: task,
        message: 'Task created successfully'
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Error creating task:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create task' 
      });
    }
  }

  /**
   * PUT /api/tasks/:taskId - อัปเดตงาน
   */
  public async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const updates = req.body;

      const task = await this.taskService.updateTask(taskId, updates);

      const response: ApiResponse<any> = {
        success: true,
        data: task,
        message: 'Task updated successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Error updating task:', error);
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

      const task = await this.taskService.completeTask(taskId, userId);

      // บันทึก KPI
      const completionType = this.kpiService.calculateCompletionType(task);
      await this.kpiService.recordTaskCompletion(task, completionType);

      const response: ApiResponse<any> = {
        success: true,
        data: task,
        message: 'Task completed successfully'
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Error completing task:', error);
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
      const { startDate, endDate } = req.query;

      const events = await this.taskService.getCalendarEvents(
        groupId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      const response: ApiResponse<any> = {
        success: true,
        data: events
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Error getting calendar events:', error);
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
        page = 1, 
        limit = 20 
      } = req.query;

      const options = {
        tags: tags ? (tags as string).split(',') : undefined,
        mimeType: mimeType as string,
        search: search as string,
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
      console.error('❌ Error getting files:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get files' 
      });
    }
  }

  /**
   * GET /api/files/:fileId/download - ดาวน์โหลดไฟล์
   */
  public async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      const { content, mimeType, originalName } = await this.fileService.getFileContent(fileId);

      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Content-Length': content.length.toString()
      });

      res.send(content);

    } catch (error) {
      console.error('❌ Error downloading file:', error);
      res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }
  }

  /**
   * GET /api/files/:fileId/preview - ดูตัวอย่างไฟล์
   */
  public async previewFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

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
      console.error('❌ Error previewing file:', error);
      res.status(404).json({ 
        success: false, 
        error: 'File not found' 
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
      console.error('❌ Error adding file tags:', error);
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
      console.error('❌ Error getting group members:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get group members' 
      });
    }
  }

  /**
   * GET /api/groups/:groupId/stats - ดึงสถิติกลุ่ม
   */
  public async getGroupStats(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;

      const [
        memberStats,
        weeklyStats,
        fileStats
      ] = await Promise.all([
        this.userService.getGroupStats(groupId),
        this.kpiService.getWeeklyStats(groupId),
        this.fileService.getGroupFileStats(groupId)
      ]);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          members: memberStats,
          weekly: weeklyStats,
          files: fileStats
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Error getting group stats:', error);
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
      console.error('❌ Error getting leaderboard:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get leaderboard' 
      });
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
      console.error('❌ Error getting user stats:', error);
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
      console.error('❌ Error exporting KPI:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to export KPI data' 
      });
    }
  }
}

const apiController = new ApiController();

// Routes setup
apiRouter.get('/tasks/:groupId', apiController.getTasks.bind(apiController));
apiRouter.post('/tasks/:groupId', apiController.createTask.bind(apiController));
apiRouter.put('/tasks/:taskId', apiController.updateTask.bind(apiController));
apiRouter.post('/tasks/:taskId/complete', apiController.completeTask.bind(apiController));

apiRouter.get('/calendar/:groupId', apiController.getCalendarEvents.bind(apiController));

apiRouter.get('/files/:groupId', apiController.getFiles.bind(apiController));
apiRouter.get('/files/:fileId/download', apiController.downloadFile.bind(apiController));
apiRouter.get('/files/:fileId/preview', apiController.previewFile.bind(apiController));
apiRouter.post('/files/:fileId/tags', apiController.addFileTags.bind(apiController));

apiRouter.get('/groups/:groupId/members', apiController.getGroupMembers.bind(apiController));
apiRouter.get('/groups/:groupId/stats', apiController.getGroupStats.bind(apiController));

apiRouter.get('/leaderboard/:groupId', apiController.getLeaderboard.bind(apiController));
apiRouter.get('/users/:userId/stats', apiController.getUserStats.bind(apiController));
apiRouter.get('/export/kpi/:groupId', apiController.exportKPI.bind(apiController));