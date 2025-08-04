// Cron Service - จัดการงานที่ต้องรันตามเวลา

import cron from 'node-cron';
import moment from 'moment-timezone';
import { config } from '@/utils/config';
import { TaskService } from './TaskService';
import { NotificationService } from './NotificationService';
import { KPIService } from './KPIService';

export class CronService {
  private taskService: TaskService;
  private notificationService: NotificationService;
  private kpiService: KPIService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.taskService = new TaskService();
    this.notificationService = new NotificationService();
    this.kpiService = new KPIService();
  }

  public start(): void {
    console.log('🕐 Starting cron jobs...');

    // ตรวจสอบและส่งการเตือนทุก 15 นาที
    const reminderJob = cron.schedule('*/15 * * * *', async () => {
      await this.processReminders();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // ตรวจสอบงานที่เกินกำหนดทุกชั่วโมง
    const overdueJob = cron.schedule('0 * * * *', async () => {
      await this.processOverdueTasks();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // สรุปรายงานรายสัปดาห์ (จันทร์ 09:00)
    const weeklyReportJob = cron.schedule('0 9 * * 1', async () => {
      await this.sendWeeklyReports();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // อัปเดต KPI และ Leaderboard ทุกเที่ยงคืน
    const kpiUpdateJob = cron.schedule('0 0 * * *', async () => {
      await this.updateKPIRecords();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // เก็บ jobs ไว้สำหรับ shutdown
    this.jobs.set('reminder', reminderJob);
    this.jobs.set('overdue', overdueJob);
    this.jobs.set('weeklyReport', weeklyReportJob);
    this.jobs.set('kpiUpdate', kpiUpdateJob);

    // เริ่มงานทั้งหมด
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started cron job: ${name}`);
    });
  }

  public stop(): void {
    console.log('🛑 Stopping cron jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`✅ Stopped cron job: ${name}`);
    });
    
    this.jobs.clear();
  }

  /**
   * ประมวลผลการเตือนงาน
   */
  private async processReminders(): Promise<void> {
    try {
      console.log('🔔 Processing task reminders...');
      
      const now = moment().tz(config.app.defaultTimezone);
      const upcomingTasks = await this.taskService.getTasksForReminder();

      for (const task of upcomingTasks) {
        const dueTime = moment(task.dueTime).tz(config.app.defaultTimezone);
        const timeDiff = dueTime.diff(now);

        // ตรวจสอบว่าถึงเวลาส่งการเตือนหรือไม่
        const reminderIntervals = task.customReminders?.length > 0 
          ? task.customReminders 
          : config.app.defaultReminders;

        for (const interval of reminderIntervals) {
          const reminderTime = this.parseReminderInterval(interval);
          const shouldSendAt = dueTime.clone().subtract(reminderTime.amount, reminderTime.unit);
          
          // ตรวจสอบว่าเวลาผ่านมาแล้วหรือยัง และยังไม่ได้ส่ง
          if (now.isAfter(shouldSendAt) && now.isBefore(shouldSendAt.clone().add(15, 'minutes'))) {
            const alreadySent = task.remindersSent.some(
              reminder => reminder.type === interval && 
              moment(reminder.sentAt).isSame(now, 'hour')
            );

            if (!alreadySent) {
              await this.sendTaskReminder(task, interval);
            }
          }
        }

        // เตือนเมื่อถึงเวลากำหนด
        if (now.isBetween(dueTime.clone().subtract(5, 'minutes'), dueTime.clone().add(5, 'minutes'))) {
          const alreadySent = task.remindersSent.some(
            reminder => reminder.type === 'due' && 
            moment(reminder.sentAt).isSame(now, 'hour')
          );

          if (!alreadySent) {
            await this.sendTaskReminder(task, 'due');
          }
        }
      }

    } catch (error) {
      console.error('❌ Error processing reminders:', error);
    }
  }

  /**
   * ประมวลผลงานที่เกินกำหนด
   */
  private async processOverdueTasks(): Promise<void> {
    try {
      console.log('⏰ Processing overdue tasks...');
      
      const overdueTasks = await this.taskService.getOverdueTasks();
      
      for (const task of overdueTasks) {
        // อัปเดตสถานะเป็น overdue
        await this.taskService.updateTaskStatus(task.id, 'overdue');
        
        // ส่งการแจ้งเตือน
        await this.notificationService.sendOverdueNotification(task);
        
        // บันทึก KPI (คะแนนลบ)
        await this.kpiService.recordTaskCompletion(task, 'late');
      }

    } catch (error) {
      console.error('❌ Error processing overdue tasks:', error);
    }
  }

  /**
   * ส่งรายงานรายสัปดาห์
   */
  private async sendWeeklyReports(): Promise<void> {
    try {
      console.log('📊 Sending weekly reports...');
      
      const groups = await this.taskService.getAllActiveGroups();
      
      for (const group of groups) {
        if (group.settings.enableLeaderboard) {
          const weeklyStats = await this.kpiService.getWeeklyStats(group.id);
          const leaderboard = await this.kpiService.getGroupLeaderboard(group.id, 'weekly');
          
          await this.notificationService.sendWeeklyReport(group, weeklyStats, leaderboard);
        }
      }

    } catch (error) {
      console.error('❌ Error sending weekly reports:', error);
    }
  }

  /**
   * อัปเดต KPI Records
   */
  private async updateKPIRecords(): Promise<void> {
    try {
      console.log('📈 Updating KPI records...');
      
      // อัปเดต leaderboard rankings
      await this.kpiService.updateLeaderboardRankings();
      
      // ทำความสะอาดข้อมูลเก่า (เก็บไว้ 1 ปี)
      await this.kpiService.cleanupOldRecords();

    } catch (error) {
      console.error('❌ Error updating KPI records:', error);
    }
  }

  /**
   * ส่งการเตือนงาน
   */
  private async sendTaskReminder(task: any, reminderType: string): Promise<void> {
    try {
      await this.notificationService.sendTaskReminder(task, reminderType);
      
      // บันทึกว่าส่งการเตือนแล้ว
      await this.taskService.recordReminderSent(task.id, reminderType);
      
    } catch (error) {
      console.error('❌ Error sending task reminder:', error);
    }
  }

  /**
   * แปลง reminder interval เป็น moment duration
   */
  private parseReminderInterval(interval: string): { amount: number; unit: moment.unitOfTime.DurationConstructor } {
    // รองรับรูปแบบ: '7d', '1h', '30m', 'P7D', 'PT3H'
    
    if (interval.startsWith('P')) {
      // ISO 8601 Duration format
      const match = interval.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
      if (match) {
        const [, days, hours, minutes] = match;
        if (days) return { amount: parseInt(days), unit: 'days' };
        if (hours) return { amount: parseInt(hours), unit: 'hours' };
        if (minutes) return { amount: parseInt(minutes), unit: 'minutes' };
      }
    } else {
      // Simple format: 7d, 1h, 30m
      const match = interval.match(/^(\d+)([dhm])$/);
      if (match) {
        const [, amount, unit] = match;
        const unitMap = { d: 'days', h: 'hours', m: 'minutes' } as const;
        return { 
          amount: parseInt(amount), 
          unit: unitMap[unit as keyof typeof unitMap] 
        };
      }
    }

    // Default fallback
    return { amount: 1, unit: 'hours' };
  }
}