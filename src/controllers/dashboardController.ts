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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style> body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; } </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <script src="/dashboard/assets/script.js" defer></script>
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
}

const dashboardController = new DashboardController();

// Routes setup
dashboardRouter.get('/', dashboardController.mainDashboard.bind(dashboardController));
dashboardRouter.get('/group/:groupId', dashboardController.getGroupDashboard.bind(dashboardController));
// Web profile endpoints
dashboardRouter.get('/profile', dashboardController.profileWeb.bind(dashboardController));
dashboardRouter.post('/profile', dashboardController.saveUserProfileWeb.bind(dashboardController));