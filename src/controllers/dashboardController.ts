// Dashboard Controller - Web Dashboard

import { Router, Request, Response } from 'express';
import path from 'path';
import { UserService } from '@/services/UserService';
import { TaskService } from '@/services/TaskService';
import { FileService } from '@/services/FileService';
import { KPIService } from '@/services/KPIService';
import { generateToken } from '@/middleware/auth';
import { config } from '@/utils/config';
import { serviceContainer } from '@/utils/serviceContainer';
import { logger } from '@/utils/logger';

export const dashboardRouter = Router();

class DashboardController {
  private userService: UserService;
  private taskService: TaskService;
  private fileService: FileService;
  private kpiService: KPIService;

  constructor() {
    this.userService = serviceContainer.get<UserService>('UserService');
    this.taskService = serviceContainer.get<TaskService>('TaskService');
    this.fileService = serviceContainer.get<FileService>('FileService');
    this.kpiService = serviceContainer.get<KPIService>('KPIService');
  }

  /**
   * GET /dashboard - หน้าแดชบอร์ดหลัก
   */
  public async mainDashboard(req: Request, res: Response): Promise<void> {
    try {
      // ส่งไฟล์ static HTML
      const dashboardPath = path.join(__dirname, '../../dashboard/index.html');
      res.sendFile(dashboardPath);
    } catch (error) {
      logger.error('Error serving dashboard:', error);
      res.status(500).send('Dashboard not available');
    }
  }

  /**
   * GET /dashboard/submit-tasks - หน้าส่งงานแบบมาตรฐาน
   */
  public async submitTasksPage(req: Request, res: Response): Promise<void> {
    try {
      // ส่งไฟล์ static HTML
      const submitTasksPath = path.join(__dirname, '../../dashboard/submit-tasks.html');
      res.sendFile(submitTasksPath);
    } catch (error) {
      logger.error('Error serving submit tasks page:', error);
      res.status(500).send('Submit tasks page not available');
    }
  }

  /**
   * GET /dashboard/profile - หน้าโปรไฟล์แบบเว็บ
   */
  public async profileWeb(req: Request, res: Response): Promise<void> {
    try {
      const { lineUserId } = req.query;

      if (!lineUserId) {
        res.status(400).json({ 
          success: false, 
          error: 'Line User ID required' 
        });
        return;
      }

      // ดึงข้อมูลผู้ใช้
      const user = await this.userService.findByLineUserId(lineUserId as string);
      
      if (!user) {
        res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
        return;
      }

      const profileData = {
        user: {
          id: user.id,
          displayName: user.displayName,
          realName: user.realName,
          email: user.email,
          timezone: user.timezone,
          isVerified: user.isVerified
        }
      };

      // ส่งหน้าโปรไฟล์แบบเว็บ
      res.send(this.generateProfileWebHtml(profileData));

    } catch (error) {
      logger.error('Error serving profile web:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Profile page not available' 
      });
    }
  }

  /**
   * POST /dashboard/profile - บันทึกข้อมูลโปรไฟล์แบบเว็บ
   */
  public async saveUserProfileWeb(req: Request, res: Response): Promise<void> {
    try {
      const { userId, realName, email, timezone } = req.body;

      const updatedUser = await this.userService.updateUser(userId, {
        realName,
        email,
        timezone
      });

      // สร้าง JWT token
      const token = generateToken({
        lineUserId: updatedUser.lineUserId,
        displayName: updatedUser.displayName,
        email: updatedUser.email
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser,
          token
        }
      });

    } catch (error) {
      logger.error('Error saving user profile:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save profile' 
      });
    }
  }

  /**
   * GET /dashboard/group/:groupId - แดชบอร์ดกลุ่ม
   */
  public async getGroupDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      
      // ดึงข้อมูลกลุ่ม
      const group = await this.userService.findGroupById(groupId);
      if (!group) {
        res.status(404).json({ 
          success: false, 
          error: 'Group not found' 
        });
        return;
      }

      // ดึงข้อมูลสมาชิก
      const members = await this.userService.getGroupMembers(groupId);
      
      // ดึงข้อมูลงาน
      const recentTasks = await this.taskService.getGroupTasks(groupId, { limit: 10 });
      
      // ดึงข้อมูล KPI
      const stats = await this.kpiService.getWeeklyStats(groupId);
      const leaderboard = await this.kpiService.getGroupLeaderboard(groupId, 'weekly');

      res.json({
        success: true,
        data: {
          group,
          members,
          stats,
          recentTasks: recentTasks.tasks,
          leaderboard
        }
      });

    } catch (error) {
      logger.error('Error getting group dashboard:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get dashboard data' 
      });
    }
  }

  /**
   * GET /dashboard/task/:taskId - หน้ารายละเอียดงาน
   */
  public async getTaskDetail(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      
      // ดึงข้อมูลงาน
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ 
          success: false, 
          error: 'Task not found' 
        });
        return;
      }

      // ดึงข้อมูลกลุ่ม
      const group = await this.userService.findGroupById(task.groupId);
      
      // ดึงข้อมูลผู้รับมอบหมายงาน (ใช้ assignedUsers แรก)
      const assigneeId = (task as any).assignedUsers && (task as any).assignedUsers.length > 0 ? (task as any).assignedUsers[0].id : null;
      const assignee = assigneeId ? await this.userService.findById(assigneeId) : null;
      
      // ดึงข้อมูลไฟล์แนบ
      const files = await this.fileService.getTaskFiles(taskId);
      
      // สร้างหน้าเว็บแสดงรายละเอียดงาน
      const taskDetailHtml = this.generateTaskDetailHtml({
        task,
        group,
        assignee,
        files
      });

      res.send(taskDetailHtml);

    } catch (error) {
      logger.error('Error serving task detail:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Task detail page not available' 
      });
    }
  }

  /**
   * สร้าง HTML สำหรับหน้ารายละเอียดงาน
   */
  private generateTaskDetailHtml(data: any): string {
    const { task, group, assignee, files } = data;
    const groupIdForDownload = (group && (group as any).id) ? (group as any).id : task.groupId;
    
    return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รายละเอียดงาน - เลขาบอท</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background-color: #f5f5f5; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 10px; 
      padding: 20px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
    }
    .header { 
      text-align: center; 
      margin-bottom: 20px; 
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .title { 
      color: #333; 
      font-size: 24px; 
      font-weight: bold; 
      margin-bottom: 10px; 
    }
    .subtitle { 
      color: #666; 
      font-size: 14px; 
    }
    .task-info { 
      margin-bottom: 20px; 
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 10px; 
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .info-label { 
      font-weight: 600; 
      color: #555; 
      min-width: 120px;
    }
    .info-value { 
      color: #333; 
      text-align: right;
    }
    .status-badge { 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 600; 
      text-transform: uppercase;
    }
    .status-pending { background-color: #fff3cd; color: #856404; }
    .status-in_progress { background-color: #d1ecf1; color: #0c5460; }
    .status-completed { background-color: #d4edda; color: #155724; }
    .status-cancelled { background-color: #f8d7da; color: #721c24; }
    .status-overdue { background-color: #f8d7da; color: #721c24; }
    .priority-badge { 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 600; 
    }
    .priority-low { background-color: #d4edda; color: #155724; }
    .priority-medium { background-color: #fff3cd; color: #856404; }
    .priority-high { background-color: #f8d7da; color: #721c24; }
    .description { 
      background-color: #f8f9fa; 
      padding: 15px; 
      border-radius: 8px; 
      margin: 15px 0; 
      border-left: 4px solid #007bff;
    }
    .files-section { 
      margin-top: 20px; 
    }
    .file-item { 
      background-color: #f8f9fa; 
      padding: 10px; 
      border-radius: 6px; 
      margin-bottom: 8px; 
      border-left: 3px solid #28a745;
    }
    .back-button { 
      display: inline-block; 
      padding: 10px 20px; 
      background-color: #6c757d; 
      color: white; 
      text-decoration: none; 
      border-radius: 6px; 
      margin-top: 20px; 
    }
    .back-button:hover { 
      background-color: #5a6268; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">📋 รายละเอียดงาน</div>
      <div class="subtitle">เลขาบอท - ระบบจัดการงานกลุ่ม</div>
    </div>

    <div class="task-info">
      <div class="info-row">
        <span class="info-label">ชื่องาน:</span>
        <span class="info-value">${this.escapeAttr(task.title)}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">สถานะ:</span>
        <span class="info-value">
          <span class="status-badge status-${task.status}">${this.getStatusText(task.status)}</span>
        </span>
      </div>
      
      <div class="info-row">
        <span class="info-label">ความสำคัญ:</span>
        <span class="info-value">
          <span class="priority-badge priority-${task.priority}">${this.getPriorityText(task.priority)}</span>
        </span>
      </div>
      
      <div class="info-row">
        <span class="info-label">กำหนดส่ง:</span>
        <span class="info-value">${this.formatDate(task.dueTime)}</span>
      </div>
      
      ${task.startTime ? `
      <div class="info-row">
        <span class="info-label">เริ่มงาน:</span>
        <span class="info-value">${this.formatDate(task.startTime)}</span>
      </div>
      ` : ''}
      
      ${task.completedAt ? `
      <div class="info-row">
        <span class="info-label">เสร็จสิ้น:</span>
        <span class="info-value">${this.formatDate(task.completedAt)}</span>
      </div>
      ` : ''}
      
      ${group ? `
      <div class="info-row">
        <span class="info-label">กลุ่ม:</span>
        <span class="info-value">${this.escapeAttr(group.name)}</span>
      </div>
      ` : ''}
      
      ${assignee ? `
      <div class="info-row">
        <span class="info-label">ผู้รับผิดชอบ:</span>
        <span class="info-value">${this.escapeAttr(assignee.displayName)}</span>
      </div>
      ` : ''}
      
      ${task.tags && task.tags.length > 0 ? `
      <div class="info-row">
        <span class="info-label">แท็ก:</span>
        <span class="info-value">${task.tags.map((tag: string) => '<span style="background: #e9ecef; padding: 2px 8px; border-radius: 4px; margin-left: 5px;">' + this.escapeAttr(tag) + '</span>').join('')}</span>
      </div>
      ` : ''}
    </div>

    ${task.description ? `
    <div class="description">
      <strong>รายละเอียด:</strong><br>
      ${this.escapeAttr(task.description)}
    </div>
    ` : ''}

    ${files && files.length > 0 ? `
    <div class="files-section">
      <h3>📎 ไฟล์แนบ (${files.length})</h3>
      ${files.map((file: any) =>
        '<div class="file-item">' +
          '<a href="' + this.fileService.generateDownloadUrl(groupIdForDownload, file.id) + '" ' +
            'style="color: #1d4ed8; text-decoration: none;" download>' +
            '<strong>' + this.escapeAttr(file.originalName) + '</strong>' +
          '</a><br>' +
          '<small>ขนาด: ' + this.formatFileSize(file.size) + ' | อัปโหลด: ' + this.formatDate(file.uploadedAt) + '</small>' +
        '</div>'
      ).join('')}
    </div>
    ` : ''}

    <a href="/dashboard" class="back-button">← กลับไปแดชบอร์ด</a>
  </div>
</body>
</html>`;
  }

  /**
   * สร้าง HTML สำหรับ Profile แบบเว็บ
   */
  private generateProfileWebHtml(data: any): string {
    return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>โปรไฟล์ของฉัน - เลขาบอท</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 440px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 20px; }
    .title { color: #333; font-size: 22px; font-weight: bold; margin-bottom: 6px; }
    .subtitle { color: #666; font-size: 13px; }
    .form-group { margin-bottom: 16px; }
    .label { display: block; margin-bottom: 6px; font-weight: 600; color: #333; }
    .input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; box-sizing: border-box; }
    .button { width: 100%; padding: 12px; background-color: #0d6efd; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
    .button:hover { background-color: #0b5ed7; }
    .info { background-color: #eef6ff; padding: 12px; border-radius: 6px; margin-bottom: 16px; color: #084298; font-size: 14px; }
    .success { background-color: #e7f7ed; color: #0f5132; padding: 10px; border-radius: 6px; display: none; margin-bottom: 12px; }
    .error { background-color: #fdecea; color: #842029; padding: 10px; border-radius: 6px; display: none; margin-bottom: 12px; }
  </style>
  <style> body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; } </style>
  <script src="/dashboard/script-vanilla.js" defer></script>
</head>
<body>
  <div class="container" id="app"
       data-user-id="${this.escapeAttr(data.user.id)}"
       data-display-name="${this.escapeAttr(data.user.displayName || '')}"
       data-real-name="${this.escapeAttr(data.user.realName || '')}"
       data-email="${this.escapeAttr(data.user.email || '')}"
       data-timezone="${this.escapeAttr(data.user.timezone || 'Asia/Bangkok')}"
       data-post-url="${this.escapeAttr(`${config.baseUrl}/dashboard/profile`)}">
    <div class="header">
      <div class="title">โปรไฟล์ของฉัน</div>
      <div class="subtitle">เลขาบอท - ระบบจัดการงานกลุ่ม</div>
    </div>
    <div class="info">
      ชื่อ LINE: <strong id="displayName"></strong><br>
      <span id="emailStatus"></span>
    </div>

    <div id="success" class="success">✅ บันทึกข้อมูลเรียบร้อย</div>
    <div id="error" class="error"></div>

    <form id="profileForm">
      <div class="form-group">
        <label class="label">ชื่อจริง</label>
        <input type="text" class="input" id="realName" placeholder="ชื่อ-นามสกุล">
      </div>

      <div class="form-group">
        <label class="label">อีเมล (สำหรับรับการแจ้งเตือน)</label>
        <input type="email" class="input" id="email" placeholder="your@email.com" required>
      </div>

      <div class="form-group">
        <label class="label">เขตเวลา</label>
        <select class="input" id="timezone">
          <option value="Asia/Bangkok">Asia/Bangkok</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      <button type="submit" class="button" id="saveButton">บันทึกข้อมูล</button>
    </form>

    <p style="color:#666; font-size: 13px; margin-top: 14px;">คำแนะนำ: ลิงก์อีเมลเพื่อรับอีเมลแจ้งเตือนเมื่อผู้ดูแลเปิดใช้งาน</p>
  </div>

  
</body>
</html>`;
  }

  // ป้องกันปัญหาอักขระพิเศษใน HTML attributes
  private escapeAttr(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // แปลงสถานะงานเป็นข้อความภาษาไทย
  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'รอดำเนินการ',
      'in_progress': 'กำลังดำเนินการ',
      'completed': 'เสร็จสิ้น',
      'cancelled': 'ยกเลิก',
      'overdue': 'เกินกำหนด'
    };
    return statusMap[status] || status;
  }

  // แปลงความสำคัญเป็นข้อความภาษาไทย
  private getPriorityText(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'low': 'ต่ำ',
      'medium': 'ปานกลาง',
      'high': 'สูง'
    };
    return priorityMap[priority] || priority;
  }

  // จัดรูปแบบวันที่
  private formatDate(date: Date): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // จัดรูปแบบขนาดไฟล์
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

const dashboardController = new DashboardController();

// Routes setup
dashboardRouter.get('/', dashboardController.mainDashboard.bind(dashboardController));
dashboardRouter.get('/group/:groupId', dashboardController.getGroupDashboard.bind(dashboardController));
dashboardRouter.get('/task/:taskId', dashboardController.getTaskDetail.bind(dashboardController));
dashboardRouter.get('/submit-tasks', dashboardController.submitTasksPage.bind(dashboardController));
// Web profile endpoints
dashboardRouter.get('/profile', dashboardController.profileWeb.bind(dashboardController));
dashboardRouter.post('/profile', dashboardController.saveUserProfileWeb.bind(dashboardController));