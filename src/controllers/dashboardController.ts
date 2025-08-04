// Dashboard Controller - LIFF และ Web Dashboard

import { Router, Request, Response } from 'express';
import path from 'path';
import { UserService } from '@/services/UserService';
import { TaskService } from '@/services/TaskService';
import { FileService } from '@/services/FileService';
import { KPIService } from '@/services/KPIService';
import { generateToken } from '@/middleware/auth';
import { config } from '@/utils/config';

export const dashboardRouter = Router();

class DashboardController {
  private userService: UserService;
  private taskService: TaskService;
  private fileService: FileService;
  private kpiService: KPIService;

  constructor() {
    this.userService = new UserService();
    this.taskService = new TaskService();
    this.fileService = new FileService();
    this.kpiService = new KPIService();
  }

  /**
   * GET /dashboard - หน้าแดชบอร์ดหลัก
   */
  public async mainDashboard(req: Request, res: Response): Promise<void> {
    try {
      // ส่งไฟล์ static HTML
      const dashboardPath = path.join(__dirname, '../../dashboard/dist/index.html');
      res.sendFile(dashboardPath);
    } catch (error) {
      console.error('❌ Error serving dashboard:', error);
      res.status(500).send('Dashboard not available');
    }
  }

  /**
   * GET /dashboard/liff/setup - LIFF สำหรับตั้งค่ากลุ่ม
   */
  public async setupLiff(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.query;

      if (!groupId) {
        res.status(400).json({ 
          success: false, 
          error: 'Group ID required' 
        });
        return;
      }

      // ตรวจสอบกลุ่ม
      const group = await this.userService.findGroupByLineId(groupId as string);
      
      const setupData = {
        liffId: config.line.liffId,
        groupId,
        groupName: group?.name || 'ไม่ทราบชื่อ',
        defaultTimezone: config.app.defaultTimezone,
        defaultReminders: config.app.defaultReminders,
        workingHours: config.app.workingHours
      };

      // ส่งหน้า LIFF setup
      res.send(this.generateSetupLiffHtml(setupData));

    } catch (error) {
      console.error('❌ Error serving setup LIFF:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Setup page not available' 
      });
    }
  }

  /**
   * POST /dashboard/liff/setup - บันทึกการตั้งค่ากลุ่ม
   */
  public async saveGroupSettings(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, settings } = req.body;

      // อัปเดตการตั้งค่ากลุ่ม
      const group = await this.userService.findGroupByLineId(groupId);
      
      if (!group) {
        res.status(404).json({ 
          success: false, 
          error: 'Group not found' 
        });
        return;
      }

      await this.userService.updateGroupSettings(group.id, settings);

      res.json({
        success: true,
        message: 'Group settings updated successfully'
      });

    } catch (error) {
      console.error('❌ Error saving group settings:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save settings' 
      });
    }
  }

  /**
   * GET /dashboard/liff/profile - LIFF สำหรับลิงก์บัญชี
   */
  public async profileLiff(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;

      if (!userId) {
        res.status(400).json({ 
          success: false, 
          error: 'User ID required' 
        });
        return;
      }

      // ดึงข้อมูลผู้ใช้
      const user = await this.userService.findByLineUserId(userId as string);
      
      if (!user) {
        res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
        return;
      }

      const profileData = {
        liffId: config.line.liffId,
        user: {
          id: user.id,
          displayName: user.displayName,
          realName: user.realName,
          email: user.email,
          timezone: user.timezone,
          isVerified: user.isVerified
        }
      };

      // ส่งหน้า LIFF profile
      res.send(this.generateProfileLiffHtml(profileData));

    } catch (error) {
      console.error('❌ Error serving profile LIFF:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Profile page not available' 
      });
    }
  }

  /**
   * POST /dashboard/liff/profile - บันทึกข้อมูลโปรไฟล์
   */
  public async saveUserProfile(req: Request, res: Response): Promise<void> {
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
      console.error('❌ Error saving user profile:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save profile' 
      });
    }
  }

  /**
   * GET /dashboard/group/:groupId - ข้อมูลกลุ่มสำหรับแดชบอร์ด
   */
  public async getGroupDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;

      const [
        group,
        members,
        stats,
        recentTasks,
        leaderboard
      ] = await Promise.all([
        this.userService.findGroupByLineId(groupId),
        this.userService.getGroupMembers(groupId),
        this.kpiService.getWeeklyStats(groupId),
        this.taskService.getGroupTasks(groupId, { limit: 10 }),
        this.kpiService.getGroupLeaderboard(groupId, 'weekly')
      ]);

      if (!group) {
        res.status(404).json({ 
          success: false, 
          error: 'Group not found' 
        });
        return;
      }

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
      console.error('❌ Error getting group dashboard:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get dashboard data' 
      });
    }
  }

  // HTML Template Generators

  /**
   * สร้าง HTML สำหรับ Setup LIFF
   */
  private generateSetupLiffHtml(data: any): string {
    return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ตั้งค่ากลุ่ม - เลขาบอท</title>
    <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .title { color: #007bff; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .form-group { margin-bottom: 20px; }
        .label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; box-sizing: border-box; }
        .checkbox { margin-right: 8px; }
        .button { width: 100%; padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
        .button:hover { background-color: #0056b3; }
        .button:disabled { background-color: #ccc; cursor: not-allowed; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🔧 ตั้งค่ากลุ่ม</div>
            <div style="color: #666;">เลขาบอท - ระบบจัดการงานกลุ่ม</div>
        </div>

        <form id="setupForm">
            <div class="form-group">
                <label class="label">ชื่อกลุ่มในระบบ</label>
                <input type="text" class="input" id="groupName" value="${data.groupName}" required>
            </div>

            <div class="form-group">
                <label class="label">เขตเวลา</label>
                <select class="input" id="timezone">
                    <option value="Asia/Bangkok" ${data.defaultTimezone === 'Asia/Bangkok' ? 'selected' : ''}>Asia/Bangkok</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="UTC">UTC</option>
                </select>
            </div>

            <div class="form-group">
                <label class="label">การเตือนล่วงหน้า</label>
                <div>
                    <input type="checkbox" class="checkbox" id="reminder7d" checked> 7 วันก่อน<br>
                    <input type="checkbox" class="checkbox" id="reminder1d" checked> 1 วันก่อน<br>
                    <input type="checkbox" class="checkbox" id="reminder3h" checked> 3 ชั่วโมงก่อน
                </div>
            </div>

            <div class="form-group">
                <label class="label">
                    <input type="checkbox" class="checkbox" id="enableLeaderboard" checked>
                    เปิดใช้งาน Leaderboard
                </label>
            </div>

            <button type="submit" class="button" id="saveButton">บันทึกการตั้งค่า</button>
        </form>
    </div>

    <script>
        liff.init({ liffId: '${data.liffId}' }).then(() => {
            console.log('LIFF initialized');
        }).catch(err => {
            console.error('LIFF initialization failed:', err);
        });

        document.getElementById('setupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const saveButton = document.getElementById('saveButton');
            saveButton.disabled = true;
            saveButton.textContent = 'กำลังบันทึก...';

            const settings = {
                name: document.getElementById('groupName').value,
                timezone: document.getElementById('timezone').value,
                settings: {
                    reminderIntervals: [
                        ...(document.getElementById('reminder7d').checked ? ['P7D'] : []),
                        ...(document.getElementById('reminder1d').checked ? ['P1D'] : []),
                        ...(document.getElementById('reminder3h').checked ? ['PT3H'] : [])
                    ],
                    enableLeaderboard: document.getElementById('enableLeaderboard').checked,
                    defaultReminders: ${JSON.stringify(data.defaultReminders)},
                    workingHours: ${JSON.stringify(data.workingHours)}
                }
            };

            fetch('/dashboard/liff/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupId: '${data.groupId}',
                    settings
                })
            }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('✅ บันทึกการตั้งค่าเรียบร้อย');
                    liff.closeWindow();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + data.error);
                }
            }).catch(error => {
                console.error('Error:', error);
                alert('❌ เกิดข้อผิดพลาดในการบันทึก');
            }).finally(() => {
                saveButton.disabled = false;
                saveButton.textContent = 'บันทึกการตั้งค่า';
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * สร้าง HTML สำหรับ Profile LIFF
   */
  private generateProfileLiffHtml(data: any): string {
    return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ลิงก์บัญชี - เลขาบอท</title>
    <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .title { color: #28a745; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .form-group { margin-bottom: 20px; }
        .label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; box-sizing: border-box; }
        .button { width: 100%; padding: 12px; background-color: #28a745; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
        .button:hover { background-color: #218838; }
        .button:disabled { background-color: #ccc; cursor: not-allowed; }
        .info { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">👤 ลิงก์บัญชี</div>
            <div style="color: #666;">เลขาบอท - ระบบจัดการงานกลุ่ม</div>
        </div>

        <div class="info">
            <strong>ข้อมูลปัจจุบัน:</strong><br>
            ชื่อ LINE: ${data.user.displayName}<br>
            ${data.user.email ? `อีเมล: ${data.user.email} ✅` : 'อีเมล: ยังไม่ได้ลิงก์ ❌'}
        </div>

        <form id="profileForm">
            <div class="form-group">
                <label class="label">ชื่อจริง</label>
                <input type="text" class="input" id="realName" value="${data.user.realName || ''}" placeholder="ชื่อ-นามสกุล">
            </div>

            <div class="form-group">
                <label class="label">อีเมล (สำหรับรับการแจ้งเตือน)</label>
                <input type="email" class="input" id="email" value="${data.user.email || ''}" placeholder="your@email.com" required>
            </div>

            <div class="form-group">
                <label class="label">เขตเวลา</label>
                <select class="input" id="timezone">
                    <option value="Asia/Bangkok" ${data.user.timezone === 'Asia/Bangkok' ? 'selected' : ''}>Asia/Bangkok</option>
                    <option value="Asia/Tokyo" ${data.user.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Asia/Tokyo</option>
                    <option value="UTC" ${data.user.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                </select>
            </div>

            <button type="submit" class="button" id="saveButton">บันทึกข้อมูล</button>
        </form>
    </div>

    <script>
        liff.init({ liffId: '${data.liffId}' }).then(() => {
            console.log('LIFF initialized');
        }).catch(err => {
            console.error('LIFF initialization failed:', err);
        });

        document.getElementById('profileForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const saveButton = document.getElementById('saveButton');
            saveButton.disabled = true;
            saveButton.textContent = 'กำลังบันทึก...';

            const profileData = {
                userId: '${data.user.id}',
                realName: document.getElementById('realName').value,
                email: document.getElementById('email').value,
                timezone: document.getElementById('timezone').value
            };

            fetch('/dashboard/liff/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('✅ บันทึกข้อมูลเรียบร้อย');
                    liff.closeWindow();
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + data.error);
                }
            }).catch(error => {
                console.error('Error:', error);
                alert('❌ เกิดข้อผิดพลาดในการบันทึก');
            }).finally(() => {
                saveButton.disabled = false;
                saveButton.textContent = 'บันทึกข้อมูล';
            });
        });
    </script>
</body>
</html>`;
  }
}

const dashboardController = new DashboardController();

// Routes setup
dashboardRouter.get('/', dashboardController.mainDashboard.bind(dashboardController));
dashboardRouter.get('/liff/setup', dashboardController.setupLiff.bind(dashboardController));
dashboardRouter.post('/liff/setup', dashboardController.saveGroupSettings.bind(dashboardController));
dashboardRouter.get('/liff/profile', dashboardController.profileLiff.bind(dashboardController));
dashboardRouter.post('/liff/profile', dashboardController.saveUserProfile.bind(dashboardController));
dashboardRouter.get('/group/:groupId', dashboardController.getGroupDashboard.bind(dashboardController));