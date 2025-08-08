// Cron Service - จัดการงานที่ต้องรันตามเวลา

import cron from 'node-cron';
import moment from 'moment-timezone';
import { config } from '@/utils/config';
import { TaskService } from './TaskService';
import { NotificationService } from './NotificationService';
import { KPIService } from './KPIService';
import { AppDataSource } from '@/utils/database';
import { RecurringTask } from '@/models';

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

    // เตือนก่อนถึงกำหนด 1 วัน: รันทุกชั่วโมงเพื่อตรวจช่วง 1 วันก่อน
    const reminderOneDayJob = cron.schedule('0 * * * *', async () => {
      await this.processReminders(['P1D']);
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

    // ตรวจงานประจำทุกนาที (คำนวณ nextRunAt)
    const recurringJob = cron.schedule('* * * * *', async () => {
      await this.processRecurringTasks();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // เก็บ jobs ไว้สำหรับ shutdown
    this.jobs.set('reminderOneDay', reminderOneDayJob);
    this.jobs.set('overdue', overdueJob);
    this.jobs.set('weeklyReport', weeklyReportJob);
    this.jobs.set('kpiUpdate', kpiUpdateJob);
    this.jobs.set('recurring', recurringJob);

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
  private async processReminders(onlyIntervals?: string[]): Promise<void> {
    try {
      console.log('🔔 Processing task reminders...');
      
      const now = moment().tz(config.app.defaultTimezone);
      const upcomingTasks = await this.taskService.getTasksForReminder();

      for (const task of upcomingTasks) {
        const dueTime = moment(task.dueTime).tz(config.app.defaultTimezone);
        const timeDiff = dueTime.diff(now);

        // เลือกช่วงเตือน
        const reminderIntervals = onlyIntervals && onlyIntervals.length > 0
          ? onlyIntervals
          : ((task.customReminders && task.customReminders.length > 0)
              ? task.customReminders
              : config.app.defaultReminders);

        for (const interval of reminderIntervals || []) {
          const reminderTime = this.parseReminderInterval(interval);
          const shouldSendAt = dueTime.clone().subtract(reminderTime.amount, reminderTime.unit);
          
          // ตรวจสอบช่วงเวลาที่ควรส่ง (หน้าต่าง 1 ชั่วโมงถ้ารัน hourly)
          if (now.isAfter(shouldSendAt) && now.isBefore(shouldSendAt.clone().add(60, 'minutes'))) {
            const alreadySent = task.remindersSent.some(
              reminder => reminder.type === interval && 
              moment(reminder.sentAt).isSame(now, 'hour')
            );

            if (!alreadySent) {
              await this.sendTaskReminder(task, interval);
            }
          }
        }

        // เตือนซ้ำทุกเช้า 08:00 น. จนกว่างานจะเสร็จ (สถานะ pending/in_progress/overdue)
        const eightAmToday = now.clone().hour(8).minute(0).second(0).millisecond(0);
        const isMorningWindow = now.isBetween(eightAmToday, eightAmToday.clone().add(60, 'minutes'));
        if (isMorningWindow && ['pending', 'in_progress', 'overdue'].includes((task as any).status)) {
          const alreadySentMorning = task.remindersSent.some(
            reminder => reminder.type === 'daily_8am' && moment(reminder.sentAt).isSame(now, 'day')
          );
          if (!alreadySentMorning) {
            await this.sendTaskReminder(task, 'daily_8am');
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

      // ตรวจงานที่รอการตรวจเกิน 2 วัน
      const lateReviews = await this.taskService.getTasksLateForReview();
      for (const t of lateReviews) {
        await this.taskService.markLateReview(t.id);
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

  /** สร้างงานตามกำหนด (Recurring) */
  private async processRecurringTasks(): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(RecurringTask);
      const now = moment();
      const dueTemplates = await repo.find({ where: { active: true } });
      for (const tmpl of dueTemplates) {
        if (!tmpl.nextRunAt) continue;
        const nextRun = moment(tmpl.nextRunAt).tz(tmpl.timezone || config.app.defaultTimezone);
        if (now.isSameOrAfter(nextRun)) {
          try {
            // คำนวณ dueTime ของงานจริง
            const [h, m] = (tmpl.timeOfDay || '09:00').split(':').map(v => parseInt(v, 10));
            const dueTime = now.clone().tz(tmpl.timezone || config.app.defaultTimezone).hour(h).minute(m).second(0).millisecond(0).toDate();

            // สร้างงาน
            await this.taskService.createTask({
              groupId: tmpl.lineGroupId,
              title: tmpl.title,
              description: tmpl.description,
              assigneeIds: tmpl.assigneeLineUserIds, // LINE User IDs รองรับใน createTask
              createdBy: tmpl.createdByLineUserId,
              dueTime,
              priority: tmpl.priority,
              tags: tmpl.tags,
              requireAttachment: tmpl.requireAttachment,
              reviewerUserId: tmpl.reviewerLineUserId
            });

            // อัปเดต lastRunAt และ nextRunAt รอบถัดไป
            tmpl.lastRunAt = now.toDate();
            tmpl.nextRunAt = this.calculateNextRunAt(tmpl);
            await repo.save(tmpl);
          } catch (err) {
            console.error('❌ Failed to create recurring task:', tmpl.id, err);
            // อย่างน้อยเลื่อน nextRunAt ไปอนาคตเพื่อไม่ให้ loop ค้าง
            tmpl.nextRunAt = this.calculateNextRunAt(tmpl);
            await repo.save(tmpl);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing recurring tasks:', error);
    }
  }

  private calculateNextRunAt(tmpl: RecurringTask): Date {
    const tz = tmpl.timezone || config.app.defaultTimezone;
    const now = moment().tz(tz);
    let next = moment(tmpl.nextRunAt || now).tz(tz);
    if (tmpl.recurrence === 'weekly') {
      // ไปสัปดาห์ถัดไปที่ weekday ที่ระบุ
      next = now.clone().day(tmpl.weekDay ?? 1);
      if (next.isSameOrBefore(now, 'day')) {
        next.add(1, 'week');
      }
    } else {
      // monthly: ไปยัง dayOfMonth ที่ระบุ
      const dom = tmpl.dayOfMonth ?? 1;
      next = now.clone().date(Math.min(dom, now.daysInMonth()));
      if (next.isSameOrBefore(now, 'day')) {
        const nextMonth = now.clone().add(1, 'month');
        next = nextMonth.clone().date(Math.min(dom, nextMonth.daysInMonth()));
      }
    }
    const [h, m] = (tmpl.timeOfDay || '09:00').split(':').map(v => parseInt(v, 10));
    next.hour(h).minute(m).second(0).millisecond(0);
    return next.toDate();
  }
}