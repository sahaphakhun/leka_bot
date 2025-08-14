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

    // สรุปรายงานรายสัปดาห์ (ศุกร์ 13:00)
    const weeklyReportJob = cron.schedule('0 13 * * 5', async () => {
      await this.sendWeeklyReports();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // สรุปรายวัน 08:00 ส่งรายการงานที่ยังไม่เสร็จในแต่ละกลุ่ม
    const dailySummaryJob = cron.schedule('0 8 * * *', async () => {
      await this.sendDailyIncompleteTaskSummaries();
      await this.sendManagerDailySummaries();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // สรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์ 08:00
    const supervisorSummaryJob = cron.schedule('0 8 * * 1', async () => {
      await this.sendSupervisorWeeklySummaries();
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
    this.jobs.set('dailySummary', dailySummaryJob);
    this.jobs.set('supervisorSummary', supervisorSummaryJob);
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

        // เตือนล่วงหน้าตามช่วงเวลา (เช่น 1 วันก่อนครบกำหนด)
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

        // เตือนซ้ำทุกเช้า 08:00 น. จนกว่างานจะเสร็จ: แยกไปรวมรอบเดียวหลังลูป เพื่อลด O(n^2) และคุมหน้าต่างเวลาให้ตรง
      }

      // เตือนซ้ำทุกเช้า 08:00 น. สำหรับงานที่ยังไม่เสร็จทั้งหมด
      const eightAmToday = now.clone().hour(8).minute(0).second(0).millisecond(0);
      const isMorningWindow = now.isBetween(eightAmToday, eightAmToday.clone().add(60, 'minutes'));
      if (isMorningWindow) {
        const morningTasks = await this.taskService.getTasksForDailyMorningReminder();
        for (const t of morningTasks) {
          const alreadySentMorning = (t as any).remindersSent?.some(
            (reminder: any) => reminder.type === 'daily_8am' && moment(reminder.sentAt).isSame(now, 'day')
          );
          if (!alreadySentMorning) {
            await this.sendTaskReminder(t, 'daily_8am');
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
        const overdueHours = moment().diff(moment(task.dueTime), 'hours');
        await this.notificationService.sendOverdueNotification({ task, overdueHours });
        
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
   * ส่งรายงานรายสัปดาห์ (ศุกร์ 13:00)
   */
  private async sendWeeklyReports(): Promise<void> {
    try {
      console.log('📊 Sending weekly reports...');
      
      const groups = await this.taskService.getAllActiveGroups();
      
      for (const group of groups) {
        if (!group.settings.enableLeaderboard) continue;
        const weeklyStats = await this.kpiService.getWeeklyStats(group.id);
        const leaderboard = await this.kpiService.getGroupLeaderboard(group.id, 'weekly');
        
        // ส่งรายงานรายสัปดาห์ปกติ
        await this.notificationService.sendWeeklyReport(group, weeklyStats, leaderboard);
        
        // ส่ง Leader Board การ์ด
        try {
          const leaderboardFlexMessage = this.createLeaderboardFlexMessage(group, leaderboard);
          await (this.notificationService as any).lineService.pushMessage(group.lineGroupId, leaderboardFlexMessage);
          console.log(`✅ Sent leaderboard flex message to group: ${group.name}`);
        } catch (err) {
          console.warn('⚠️ Failed to send leaderboard flex message:', group.lineGroupId, err);
        }
        
        // ส่งให้หัวหน้าทีม (admin) ทางส่วนตัวด้วย
        try {
          await (this.notificationService as any).sendWeeklyReportToAdmins(group as any, weeklyStats, leaderboard);
        } catch (err) {
          console.warn('⚠️ Failed to send weekly report to admins:', group.id, err);
        }
      }

    } catch (error) {
      console.error('❌ Error sending weekly reports:', error);
    }
  }

  /** ส่งสรุปรายวัน: งานที่ยังไม่เสร็จในแต่ละกลุ่ม เวลา 08:00 น. */
  private async sendDailyIncompleteTaskSummaries(): Promise<void> {
    try {
      console.log('🗒️ Sending daily incomplete task summaries...');

      const groups = await this.taskService.getAllActiveGroups();
      for (const group of groups) {
        // ดึงงานค้างของกลุ่มนี้
        const tasks = await this.taskService.getIncompleteTasksOfGroup(group.lineGroupId);
        if (tasks.length === 0) continue;

        // จัดรูปแบบข้อความสรุปสำหรับส่งลงกลุ่ม
        const tz = group.timezone || config.app.defaultTimezone;
        const header = `🗒️ สรุปงานค้างประจำวัน (${moment().tz(tz).format('DD/MM/YYYY')})`;
        
        // จัดหมวดหมู่ตามผู้รับผิดชอบ
        const tasksByAssignee = new Map<string, any[]>();
        for (const task of tasks) {
          const assignees = (task as any).assignedUsers || [];
          if (assignees.length === 0) {
            // งานที่ไม่มีผู้รับผิดชอบ
            const unassigned = tasksByAssignee.get('unassigned') || [];
            unassigned.push(task);
            tasksByAssignee.set('unassigned', unassigned);
          } else {
            // งานที่มีผู้รับผิดชอบ
            for (const assignee of assignees) {
              const userTasks = tasksByAssignee.get(assignee.lineUserId) || [];
              userTasks.push(task);
              tasksByAssignee.set(assignee.lineUserId, userTasks);
            }
          }
        }

        // สร้าง Flex Message สำหรับสรุปงานประจำวัน
        const summaryFlexMessage = this.createDailySummaryFlexMessage(group, tasks, tasksByAssignee, tz);

        // ส่งสรุปลงกลุ่ม
        try {
          await (this.notificationService as any).lineService.pushMessage(group.lineGroupId, summaryFlexMessage);
        } catch (err) {
          console.warn('⚠️ Failed to send daily summary to group:', group.lineGroupId, err);
        }

        // ส่งการ์ดแยกรายบุคคลให้แต่ละคน
        for (const [assigneeId, userTasks] of tasksByAssignee.entries()) {
          if (assigneeId === 'unassigned') continue; // ข้ามงานที่ไม่มีผู้รับผิดชอบ

          try {
            // สร้างการ์ดสำหรับแต่ละคน
            const assignee = (userTasks[0] as any).assignedUsers?.find((u: any) => u.lineUserId === assigneeId);
            if (!assignee) continue;

            // สร้างการ์ดงานต่างๆ ของแต่ละงาน (Flex Message) แทนข้อความธรรมดา
            const flexMessage = this.createPersonalTaskFlexMessage(assignee, userTasks, tz);
            
            // ส่งการ์ดให้แต่ละคนทางส่วนตัว
            await (this.notificationService as any).lineService.pushMessage(assigneeId, flexMessage);
            
            console.log(`✅ Sent personal task flex message to: ${assignee.displayName}`);
          } catch (err) {
            console.warn('⚠️ Failed to send personal task flex message:', assigneeId, err);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending daily incomplete task summaries:', error);
    }
  }

  /**
   * สร้างการ์ดงานส่วนบุคคล (Flex Message)
   */
  private createPersonalTaskFlexMessage(assignee: any, tasks: any[], timezone: string): any {
    const header = `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`;
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;
    
    // จัดหมวดหมู่ตามสถานะ
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    const flexContainer: any = {
      type: 'flex',
      altText: header,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: header,
              weight: 'bold',
              size: 'lg',
              color: '#1DB446',
              flex: 0
            },
            {
              type: 'text',
              text: subtitle,
              size: 'sm',
              color: '#666666',
              flex: 0
            },
            {
              type: 'separator',
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดู Dashboard',
                uri: `${config.baseUrl}/dashboard?groupId=${assignee.groupId}`
              }
            }
          ]
        }
      }
    };

    // เพิ่มงานเกินกำหนด
    if (overdueTasks.length > 0) {
      flexContainer.contents.body.contents.push({
        type: 'text',
        text: '⚠️ งานเกินกำหนด:',
        weight: 'bold',
        color: '#FF0000',
        margin: 'md'
      });
      
      overdueTasks.forEach(task => {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          padding: 'sm',
          backgroundColor: '#FFF2F2',
          cornerRadius: 'sm',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`,
              size: 'xs',
              color: '#FF0000'
            },
            {
              type: 'text',
              text: `📋 กลุ่ม: ${task.group?.name || 'ไม่ระบุ'}`,
              size: 'xs',
              color: '#666666'
            }
          ]
        });
      });
    }

    // เพิ่มงานกำลังดำเนินการ
    if (inProgressTasks.length > 0) {
      flexContainer.contents.body.contents.push({
        type: 'text',
        text: '⏳ งานกำลังดำเนินการ:',
        weight: 'bold',
        color: '#FFA500',
        margin: 'md'
      });
      
      inProgressTasks.forEach(task => {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          padding: 'sm',
          backgroundColor: '#FFF8E1',
          cornerRadius: 'sm',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`,
              size: 'xs',
              color: '#FFA500'
            },
            {
              type: 'text',
              text: `📋 กลุ่ม: ${task.group?.name || 'ไม่ระบุ'}`,
              size: 'xs',
              color: '#666666'
            }
          ]
        });
      });
    }

    // เพิ่มงานรอดำเนินการ
    if (pendingTasks.length > 0) {
      flexContainer.contents.body.contents.push({
        type: 'text',
        text: '📝 งานรอดำเนินการ:',
        weight: 'bold',
        color: '#0066CC',
        margin: 'md'
      });
      
      pendingTasks.forEach(task => {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          padding: 'sm',
          backgroundColor: '#F0F8FF',
          cornerRadius: 'sm',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`,
              size: 'xs',
              color: '#0066CC'
            },
            {
              type: 'text',
              text: `📋 กลุ่ม: ${task.group?.name || 'ไม่ระบุ'}`,
              size: 'xs',
              color: '#666666'
            }
          ]
        });
      });
    }

    return flexContainer;
  }

  /** ส่งสรุปสำหรับผู้จัดการทุกเช้า: งานที่ยังไม่ส่ง / ใครล่าช้า / ใครยังไม่ตรวจ */
  private async sendManagerDailySummaries(): Promise<void> {
    try {
      const groups = await this.taskService.getAllActiveGroups();
      for (const group of groups) {
        const recipients: string[] = (group.settings as any)?.reportRecipients || [];
        if (!recipients || recipients.length === 0) continue;

        // ดึงงานค้างทั้งหมดของกลุ่ม
        const tasks = await this.taskService.getIncompleteTasksOfGroup(group.lineGroupId);
        if (tasks.length === 0) continue;

        // จัดหมวดหมู่: ยังไม่ส่ง, ล่าช้า, รอตรวจ
        const notSubmitted: any[] = [];
        const late: any[] = [];
        const pendingReview: any[] = [];

        const now = moment().tz(config.app.defaultTimezone);
        for (const t of tasks as any[]) {
          const wf = (t.workflow || {}) as any;
          const hasSubmission = (wf.submissions && wf.submissions.length > 0);
          if (!hasSubmission) notSubmitted.push(t);

          if (moment(t.dueTime).tz(config.app.defaultTimezone).isBefore(now) && t.status !== 'completed') {
            late.push(t);
          }

          const rv = wf.review;
          if (rv && rv.status === 'pending') {
            pendingReview.push(t);
          }
        }

        const formatTask = (x: any) => {
          const due = moment(x.dueTime).tz(config.app.defaultTimezone).format('DD/MM HH:mm');
          const assignees = (x.assignedUsers || []).map((u: any) => `@${u.displayName}`).join(' ');
          return `• ${x.title} (กำหนด ${due}) ${assignees}`;
        };

        // สร้าง Flex Message สำหรับรายงานผู้จัดการ
        const managerFlexMessage = this.createManagerDailySummaryFlexMessage(group, notSubmitted, late, pendingReview);

        // ส่งให้ผู้จัดการที่กำหนด (ส่วนตัว)
        for (const lineUserId of recipients) {
          try {
            await (this.notificationService as any).lineService.pushMessage(lineUserId, managerFlexMessage);
          } catch (err) {
            console.warn('⚠️ Failed to send manager daily summary:', lineUserId, err);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending manager daily summaries:', error);
    }
  }

  /**
   * ส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์ 08:00
   */
  private async sendSupervisorWeeklySummaries(): Promise<void> {
    try {
      console.log('📊 Sending supervisor weekly summaries...');

      const groups = await this.taskService.getAllActiveGroups();
      for (const group of groups) {
        // ตรวจสอบว่ามีการตั้งค่าผู้บังคับบัญชาหรือไม่
        const supervisors: string[] = (group.settings as any)?.supervisors || [];
        if (supervisors.length === 0) {
          // สร้าง Flex Message สำหรับเตือนให้ตั้งค่าผู้บังคับบัญชา
          const reminderFlexMessage = this.createSupervisorSetupReminderFlexMessage(group);

          try {
            await (this.notificationService as any).lineService.pushMessage(group.lineGroupId, reminderFlexMessage);
            console.log(`⚠️ Sent supervisor setup reminder to group: ${group.name}`);
          } catch (err) {
            console.warn('⚠️ Failed to send supervisor setup reminder:', group.lineGroupId, err);
          }
          continue;
        }

        // ดึงงานค้างทั้งหมดของกลุ่ม
        const tasks = await this.taskService.getIncompleteTasksOfGroup(group.lineGroupId);
        if (tasks.length === 0) continue;

        // จัดหมวดหมู่งานตามผู้รับผิดชอบ
        const tasksByAssignee = new Map<string, any[]>();
        for (const task of tasks) {
          const assignees = (task as any).assignedUsers || [];
          if (assignees.length === 0) {
            const unassigned = tasksByAssignee.get('unassigned') || [];
            unassigned.push(task);
            tasksByAssignee.set('unassigned', unassigned);
          } else {
            for (const assignee of assignees) {
              const userTasks = tasksByAssignee.get(assignee.lineUserId) || [];
              userTasks.push(task);
              tasksByAssignee.set(assignee.lineUserId, userTasks);
            }
          }
        }

        // สร้าง Flex Message สำหรับรายงานหัวหน้างาน
        const tz = group.timezone || config.app.defaultTimezone;
        const supervisorFlexMessage = this.createSupervisorWeeklySummaryFlexMessage(group, tasks, tasksByAssignee, tz);

        // ส่งให้หัวหน้างานที่กำหนด (ส่วนตัว)
        for (const supervisorLineUserId of supervisors) {
          try {
            await (this.notificationService as any).lineService.pushMessage(supervisorLineUserId, supervisorFlexMessage);
            console.log(`✅ Sent supervisor summary to: ${supervisorLineUserId}`);
          } catch (err) {
            console.warn('⚠️ Failed to send supervisor weekly summary:', supervisorLineUserId, err);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending supervisor weekly summaries:', error);
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

  /** สร้าง Flex Message สำหรับสรุปงานประจำวัน */
  private createDailySummaryFlexMessage(group: any, tasks: any[], tasksByAssignee: Map<string, any[]>, timezone: string): any {
    const header = `🗒️ สรุปงานค้างประจำวัน (${moment().tz(timezone).format('DD/MM/YYYY')})`;
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;
    
    // จัดหมวดหมู่ตามผู้รับผิดชอบ
    const tasksByAssigneeFlex = new Map<string, any[]>();
    for (const [assigneeId, userTasks] of tasksByAssignee.entries()) {
      if (assigneeId === 'unassigned') {
        tasksByAssigneeFlex.set('unassigned', userTasks);
      } else {
        const assignee = (userTasks[0] as any).assignedUsers?.find((u: any) => u.lineUserId === assigneeId);
        if (assignee) {
          tasksByAssigneeFlex.set(assigneeId, userTasks);
        }
      }
    }

    const flexContainer: any = {
      type: 'flex',
      altText: header,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: header,
              weight: 'bold',
              size: 'lg',
              color: '#1DB446',
              flex: 0
            },
            {
              type: 'text',
              text: subtitle,
              size: 'sm',
              color: '#666666',
              flex: 0
            },
            {
              type: 'separator',
              margin: 'md'
            }
          ]
        }
      }
    };

    // แสดงสรุปตามผู้รับผิดชอบ
    for (const [assigneeId, userTasks] of tasksByAssigneeFlex.entries()) {
      if (assigneeId === 'unassigned') {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: `❓ ไม่มีผู้รับผิดชอบ: ${userTasks.length} งาน`,
              weight: 'bold',
              size: 'md',
              color: '#FF4444',
              flex: 0
            }
          ]
        });
      } else {
        const assignee = (userTasks[0] as any).assignedUsers?.find((u: any) => u.lineUserId === assigneeId);
        if (assignee) {
          flexContainer.contents.body.contents.push({
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: `👤 @${assignee.displayName}: ${userTasks.length} งาน`,
                weight: 'bold',
                size: 'md',
                color: '#1DB446',
                flex: 0
              }
            ]
          });
        }
      }
    }

    flexContainer.contents.body.contents.push({
      type: 'separator',
      margin: 'md'
    });

    flexContainer.contents.body.contents.push({
      type: 'text',
      text: '💡 ดูรายละเอียดงานแต่ละชิ้นได้จากการ์ดส่วนบุคคลที่ส่งให้แต่ละคน',
      size: 'sm',
      color: '#999999',
      flex: 0
    });

    return flexContainer;
  }

  /** สร้าง Flex Message สำหรับรายงานผู้จัดการ */
  private createManagerDailySummaryFlexMessage(group: any, notSubmitted: any[], late: any[], pendingReview: any[]): any {
    const header = `🗒️ สรุปงานค้างประจำวัน (สำหรับผู้จัดการ)`;
    const date = moment().tz(group.timezone || config.app.defaultTimezone).format('DD/MM/YYYY');
    const subtitle = `🗓️ วันที่ ${date} | 📋 กลุ่ม: ${group.name}`;

    const flexContainer: any = {
      type: 'flex',
      altText: header,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: header,
              weight: 'bold',
              size: 'lg',
              color: '#1DB446',
              flex: 0
            },
            {
              type: 'text',
              text: subtitle,
              size: 'sm',
              color: '#666666',
              flex: 0
            },
            {
              type: 'separator',
              margin: 'md'
            }
          ]
        }
      }
    };

    // แสดงสรุปตามสถานะ
    const notSubmittedBox = {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `ยังไม่ส่ง (${notSubmitted.length})`,
          weight: 'bold',
          size: 'md',
          color: '#FF4444',
          flex: 0
        },
        ...notSubmitted.map((task, idx) => ({
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          margin: 'sm',
          contents: [
            {
              type: 'text',
              text: `${idx + 1}. ${task.title}`,
              size: 'sm',
              color: '#333333',
              flex: 0,
              wrap: true
            },
            {
              type: 'text',
              text: `กำหนด: ${moment(task.dueTime).tz(group.timezone || config.app.defaultTimezone).format('DD/MM HH:mm')}`,
              size: 'sm',
              color: '#FF4444',
              flex: 0
            }
          ]
        }))
      ]
    };

    const lateBox = {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `ล่าช้า (${late.length})`,
          weight: 'bold',
          size: 'md',
          color: '#FFAA00',
          flex: 0
        },
        ...late.map((task, idx) => ({
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          margin: 'sm',
          contents: [
            {
              type: 'text',
              text: `${idx + 1}. ${task.title}`,
              size: 'sm',
              color: '#333333',
              flex: 0,
              wrap: true
            },
            {
              type: 'text',
              text: `กำหนด: ${moment(task.dueTime).tz(group.timezone || config.app.defaultTimezone).format('DD/MM HH:mm')}`,
              size: 'sm',
              color: '#FFAA00',
              flex: 0
            }
          ]
        }))
      ]
    };

    const pendingReviewBox = {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `รอตรวจ (${pendingReview.length})`,
          weight: 'bold',
          size: 'md',
          color: '#666666',
          flex: 0
        },
        ...pendingReview.map((task, idx) => ({
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          margin: 'sm',
          contents: [
            {
              type: 'text',
              text: `${idx + 1}. ${task.title}`,
              size: 'sm',
              color: '#333333',
              flex: 0,
              wrap: true
            },
            {
              type: 'text',
              text: `กำหนด: ${moment(task.dueTime).tz(group.timezone || config.app.defaultTimezone).format('DD/MM HH:mm')}`,
              size: 'sm',
              color: '#666666',
              flex: 0
            }
          ]
        }))
      ]
    };

    flexContainer.contents.body.contents.push(notSubmittedBox);
    flexContainer.contents.body.contents.push(lateBox);
    flexContainer.contents.body.contents.push(pendingReviewBox);

    flexContainer.contents.body.contents.push({
      type: 'separator',
      margin: 'md'
    });

    flexContainer.contents.body.contents.push({
      type: 'text',
      text: '💡 ดูรายละเอียดเพิ่มเติม: ' + config.baseUrl + '/dashboard?groupId=' + group.lineGroupId + '#reports',
      size: 'sm',
      color: '#999999',
      flex: 0
    });

    return flexContainer;
  }

  /** สร้าง Flex Message สำหรับรายงานหัวหน้างาน */
  private createSupervisorWeeklySummaryFlexMessage(group: any, tasks: any[], tasksByAssignee: Map<string, any[]>, timezone: string): any {
    const header = `📊 สรุปงานของผู้ใต้บังคับบัญชาประจำสัปดาห์`;
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    const subtitle = `🗓️ วันที่ ${date} | 📋 กลุ่ม: ${group.name}`;

    const flexContainer: any = {
      type: 'flex',
      altText: header,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: header,
              weight: 'bold',
              size: 'lg',
              color: '#1DB446',
              flex: 0
            },
            {
              type: 'text',
              text: subtitle,
              size: 'sm',
              color: '#666666',
              flex: 0
            },
            {
              type: 'separator',
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดู Dashboard',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}`
              }
            }
          ]
        }
      }
    };

    // สร้างสถิติรวม
    let totalOverdue = 0;
    let totalInProgress = 0;
    let totalPending = 0;

    tasksByAssignee.forEach((userTasks) => {
      userTasks.forEach(task => {
        if (task.status === 'overdue') totalOverdue++;
        else if (task.status === 'in_progress') totalInProgress++;
        else if (task.status === 'pending') totalPending++;
      });
    });

    // เพิ่มสถิติรวม
    flexContainer.contents.body.contents.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: `⚠️ เกินกำหนด: ${totalOverdue}`,
          size: 'sm',
          color: '#FF0000',
          flex: 1
        },
        {
          type: 'text',
          text: `⏳ ดำเนินการ: ${totalInProgress}`,
          size: 'sm',
          color: '#FFA500',
          flex: 1
        },
        {
          type: 'text',
          text: `📝 รอดำเนินการ: ${totalPending}`,
          size: 'sm',
          color: '#0066CC',
          flex: 1
        }
      ]
    });

    // เพิ่มรายละเอียดงานของแต่ละคน
    tasksByAssignee.forEach((userTasks, lineUserId) => {
      const user = userTasks[0]?.assignee;
      if (!user) return;

      const overdueCount = userTasks.filter(t => t.status === 'overdue').length;
      const inProgressCount = userTasks.filter(t => t.status === 'in_progress').length;
      const pendingCount = userTasks.filter(t => t.status === 'pending').length;

      flexContainer.contents.body.contents.push({
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        padding: 'md',
        backgroundColor: '#F8F9FA',
        cornerRadius: 'md',
        contents: [
          {
            type: 'text',
            text: `👤 @${user.displayName}: ${userTasks.length} งาน`,
            weight: 'bold',
            size: 'md',
            color: '#333333'
          },
          {
            type: 'text',
            text: `⚠️ เกินกำหนด: ${overdueCount} | ⏳ ดำเนินการ: ${inProgressCount} | 📝 รอดำเนินการ: ${pendingCount}`,
            size: 'sm',
            color: '#666666',
            margin: 'sm'
          }
        ]
      });

      // เพิ่มรายละเอียดงานแต่ละชิ้น
      userTasks.forEach(task => {
        flexContainer.contents.body.contents.push({
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          padding: 'sm',
          backgroundColor: this.getStatusBackgroundColor(task.status),
          cornerRadius: 'sm',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'sm',
              wrap: true
            },
            {
              type: 'text',
              text: `📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`,
              size: 'xs',
              color: this.getStatusColor(task.status)
            },
            {
              type: 'text',
              text: `📋 สถานะ: ${this.getStatusText(task.status)}`,
              size: 'xs',
              color: '#666666'
            }
          ]
        });
      });
    });

    return flexContainer;
  }

  /** Helper method สำหรับข้อความสถานะ */
  private getStatusText(status: string): string {
    switch (status) {
      case 'overdue':
        return 'เกินกำหนด';
      case 'in_progress':
        return 'กำลังดำเนินการ';
      case 'pending':
        return 'รอดำเนินการ';
      default:
        return 'ไม่ระบุ';
    }
  }

  /** Helper method สำหรับสีสถานะ */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'overdue':
        return '#FF4444';
      case 'in_progress':
        return '#FFAA00';
      case 'pending':
        return '#666666';
      default:
        return '#999999';
    }
  }

  /** Helper method สำหรับสีพื้นหลังสถานะ */
  private getStatusBackgroundColor(status: string): string {
    switch (status) {
      case 'overdue':
        return '#FFF2F2'; // สีอ่อนสีแดง
      case 'in_progress':
        return '#FFF8E1'; // สีอ่อนสีเหลือง
      case 'pending':
        return '#F0F8FF'; // สีอ่อนสีฟ้า
      default:
        return '#FFFFFF'; // สีปกติ
    }
  }

  /** สร้าง Flex Message สำหรับเตือนให้ตั้งค่าผู้บังคับบัญชา */
  private createSupervisorSetupReminderFlexMessage(group: any): any {
    const header = `⚠️ ระบบยังไม่ได้ตั้งค่าผู้บังคับบัญชา`;
    const message = `📊 เพื่อให้ระบบส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์เวลา 08:00 น.

🔧 กรุณาตั้งค่าผู้บังคับบัญชาด้วยคำสั่ง:
@เลขา /setup @นายเอ @นายบี

💡 ตัวอย่าง: @เลขา /setup @หัวหน้างาน1 @หัวหน้างาน2`;

    const flexContainer: any = {
      type: 'flex',
      altText: header,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: header,
              weight: 'bold',
              size: 'lg',
              color: '#FF4444',
              flex: 0
            },
            {
              type: 'text',
              text: message,
              size: 'sm',
              color: '#333333',
              flex: 0
            }
          ]
        }
      }
    };

    return flexContainer;
  }

  /** สร้าง Flex Message สำหรับ Leader Board */
  private createLeaderboardFlexMessage(group: any, leaderboard: any[]): any {
    const header = `🏆 ตารางคะแนนผู้นำประจำสัปดาห์`;
    const date = moment().tz(group.timezone || config.app.defaultTimezone).format('DD/MM/YYYY');
    const subtitle = `🗓️ วันที่ ${date} | 📋 กลุ่ม: ${group.name}`;

    const flexContainer: any = {
      type: 'flex',
      altText: header,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: header,
              weight: 'bold',
              size: 'lg',
              color: '#FFD700',
              flex: 0
            },
            {
              type: 'text',
              text: subtitle,
              size: 'sm',
              color: '#666666',
              flex: 0
            },
            {
              type: 'separator',
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดู Dashboard',
                uri: `${config.baseUrl}/dashboard?groupId=${group.id}`
              }
            }
          ]
        }
      }
    };

    // ฟังก์ชันสำหรับเหรียญ
    const getMedal = (rank: number, total: number) => {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      if (rank === total) return '🥚'; // บ๊วย
      return `${rank}️⃣`;
    };

    // ฟังก์ชันสำหรับสีพื้นหลัง
    const getRankBackgroundColor = (rank: number, total: number) => {
      if (rank === 1) return '#FFF8DC'; // สีทองอ่อน
      if (rank === 2) return '#F5F5F5'; // สีเงินอ่อน
      if (rank === 3) return '#FFF8E1'; // สีทองแดงอ่อน
      if (rank === total) return '#FFF0F5'; // สีชมพูอ่อน (บ๊วย)
      return '#FFFFFF';
    };

    // ฟังก์ชันสำหรับสีข้อความ
    const getRankTextColor = (rank: number, total: number) => {
      if (rank === 1) return '#FFD700'; // สีทอง
      if (rank === 2) return '#C0C0C0'; // สีเงิน
      if (rank === 3) return '#CD7F32'; // สีทองแดง
      if (rank === total) return '#FF69B4'; // สีชมพู (บ๊วย)
      return '#333333';
    };

    const totalUsers = leaderboard.length;

    // แสดงอันดับทั้งหมด
    leaderboard.forEach((user: any, index: number) => {
      const rank = index + 1;
      const medal = getMedal(rank, totalUsers);
      
      flexContainer.contents.body.contents.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'md',
        margin: 'sm',
        padding: 'md',
        backgroundColor: getRankBackgroundColor(rank, totalUsers),
        cornerRadius: 'md',
        contents: [
          {
            type: 'text',
            text: `${medal}`,
            size: 'lg',
            flex: 0
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            flex: 1,
            contents: [
              {
                type: 'text',
                text: `@${user.displayName}`,
                weight: 'bold',
                size: 'md',
                color: getRankTextColor(rank, totalUsers)
              },
              {
                type: 'text',
                text: `คะแนน: ${user.score} | งานเสร็จ: ${user.completedTasks || 0} | งานเกินกำหนด: ${user.overdueTasks || 0}`,
                size: 'xs',
                color: '#666666'
              }
            ]
          }
        ]
      });
    });

    // แสดงสถิติรวม
    if (totalUsers > 0) {
      flexContainer.contents.body.contents.push({
        type: 'separator',
        margin: 'md'
      });

      const totalScore = leaderboard.reduce((sum, user) => sum + user.score, 0);
      const avgScore = Math.round(totalScore / totalUsers);

      flexContainer.contents.body.contents.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'md',
        contents: [
          {
            type: 'text',
            text: `👥 รวม ${totalUsers} คน`,
            size: 'sm',
            color: '#666666',
            flex: 1
          },
          {
            type: 'text',
            text: `📊 คะแนนเฉลี่ย: ${avgScore}`,
            size: 'sm',
            color: '#666666',
            flex: 1
          }
        ]
      });
    }

    return flexContainer;
  }
}