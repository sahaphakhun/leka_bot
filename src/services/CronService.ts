// Cron Service - จัดการงานที่ต้องรันตามเวลา

import cron from 'node-cron';
import moment from 'moment-timezone';
import { config } from '@/utils/config';
import { TaskService } from './TaskService';
import { NotificationService } from './NotificationService';
import { KPIService } from './KPIService';
import { FlexMessageTemplateService } from './FlexMessageTemplateService';
import { FlexMessageDesignSystem } from './FlexMessageDesignSystem';
import { FileBackupService } from './FileBackupService';
import { RecurringTaskService } from './RecurringTaskService';
import { AppDataSource } from '@/utils/database';
import { RecurringTask, Task } from '@/models';

export class CronService {
  private taskService: TaskService;
  private notificationService: NotificationService;
  private kpiService: KPIService;
  private fileBackupService: FileBackupService;
  private recurringTaskService: RecurringTaskService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isStarted = false;

  constructor() {
    this.taskService = new TaskService();
    this.notificationService = new NotificationService();
    this.kpiService = new KPIService();
    this.fileBackupService = new FileBackupService();
    this.recurringTaskService = new RecurringTaskService();
  }

  public start(): void {
    if (this.isStarted) {
      console.log('🔄 Cron jobs already running, restarting...');
      this.stop();
    }

    console.log('🕐 Starting cron jobs...');

    // เตือนก่อนถึงกำหนด 1 วัน: รันทุกชั่วโมงเพื่อตรวจช่วง 1 วันก่อน
    const reminderOneDayJob = cron.schedule('0 * * * *', async () => {
      await this.processReminders(['P1D']);
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // ตรวจสอบงานที่เกินกำหนดทุกวันเวลา 9:00 น. (เปลี่ยนจากทุกชั่วโมง)
    const overdueJob = cron.schedule('0 9 * * *', async () => {
      await this.processOverdueTasks();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวันเวลา 9:00 น.
    const dailyOverdueSummaryJob = cron.schedule('0 9 * * *', async () => {
      await this.sendDailyOverdueSummary();
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
      // ย้ายรายงานผู้จัดการไปส่งเฉพาะวันจันทร์
      // await this.sendManagerDailySummaries();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // สรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์ 08:00
    const supervisorSummaryJob = cron.schedule('0 8 * * 1', async () => {
      await this.sendSupervisorWeeklySummaries();
      // เพิ่มรายงานผู้จัดการรายสัปดาห์ (รวมทุกกลุ่ม)
      await this.sendManagerWeeklySummaries();
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

    // คัดลอกไฟล์แนบไปยัง Google Drive ทุกวันเวลา 02:00 น.
    const fileBackupJob = cron.schedule('0 2 * * *', async () => {
      await this.runFileBackups();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // ตรวจงานประจำทุก 5 นาที (เพื่อลดภาระของระบบ)
    const recurringJob = cron.schedule('*/5 * * * *', async () => {
      await this.processRecurringTasks();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // ตรวจสอบงานที่ครบกำหนดตรวจและอนุมัติอัตโนมัติทุก 6 ชั่วโมง
    const autoApproveJob = cron.schedule('0 */6 * * *', async () => {
      await this.processAutoApproveTasks();
    }, {
      scheduled: false,
      timezone: config.app.defaultTimezone
    });

    // เก็บ jobs ไว้สำหรับ shutdown
    this.jobs.set('reminderOneDay', reminderOneDayJob);
    this.jobs.set('overdue', overdueJob);
    this.jobs.set('dailyOverdueSummary', dailyOverdueSummaryJob);
    this.jobs.set('weeklyReport', weeklyReportJob);
    this.jobs.set('dailySummary', dailySummaryJob);
    this.jobs.set('supervisorSummary', supervisorSummaryJob);
    this.jobs.set('kpiUpdate', kpiUpdateJob);
    this.jobs.set('fileBackup', fileBackupJob);
    this.jobs.set('recurring', recurringJob);
    this.jobs.set('autoApprove', autoApproveJob);

    // เริ่มงานทั้งหมด
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started cron job: ${name}`);
    });

    this.isStarted = true;
  }

  public stop(): void {
    console.log('🛑 Stopping cron jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`✅ Stopped cron job: ${name}`);
    });
    
    this.jobs.clear();
    this.isStarted = false;
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

      // เอาการเตือนตอนเช้า 08:00 น. ออกไปแล้ว
      // ไม่มีการเตือนซ้ำทุกเช้า 08:00 น. สำหรับงานที่ยังไม่เสร็จทั้งหมด

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
      
      // ดึงกลุ่มทั้งหมดและตรวจสอบงานเกินกำหนดในแต่ละกลุ่ม
      const groups = await this.taskService.getAllGroups();
      
      for (const group of groups) {
        try {
          const overdueTasks = await this.taskService.getOverdueTasksByGroup(group.id);
          
          for (const task of overdueTasks) {
            // อัปเดตสถานะเป็น overdue
            await this.taskService.updateTaskStatus(task.id, 'overdue');
            
            // ส่งการแจ้งเตือน
            const overdueHours = moment().diff(moment(task.dueTime), 'hours');
            await this.notificationService.sendOverdueNotification({ task, overdueHours });
            
            // บันทึก overdue KPI (0 คะแนน) ทันที เพื่อป้องกันการเล่นระบบ
            await this.kpiService.recordOverdueKPI(task);
          }
        } catch (err) {
          console.warn('⚠️ Failed to process overdue tasks for group:', group.id, err);
        }
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

        // สร้าง Flex Message สำหรับสรุปงานประจำวัน
        const tz = group.timezone || config.app.defaultTimezone;
        const summaryFlexMessage = this.createDailySummaryFlexMessage(group, tasks, tz);

        // ส่งสรุปลงกลุ่ม
        try {
          await (this.notificationService as any).lineService.pushMessage(group.lineGroupId, summaryFlexMessage);
        } catch (err) {
          console.warn('⚠️ Failed to send daily summary to group:', group.lineGroupId, err);
        }

        // ส่งการ์ดแยกรายบุคคลให้แต่ละคน
        const tasksByAssignee = new Map<string, any[]>();
        for (const task of tasks) {
          const assignees = (task as any).assignedUsers || [];
          if (assignees.length === 0) continue;

            for (const assignee of assignees) {
              const userTasks = tasksByAssignee.get(assignee.lineUserId) || [];
              userTasks.push(task);
              tasksByAssignee.set(assignee.lineUserId, userTasks);
          }
        }

        for (const [assigneeId, userTasks] of tasksByAssignee.entries()) {
          try {
            const assignee = (userTasks[0] as any).assignedUsers?.find((u: any) => u.lineUserId === assigneeId);
            if (!assignee) continue;

            // สร้างการ์ดงานต่างๆ ของแต่ละงาน (Flex Message) แทนข้อความธรรมดา
            const flexMessage = this.createPersonalDailyReportFlexMessage(group, assignee, userTasks, tz);
            
            // ส่งการ์ดให้แต่ละคนทางส่วนตัว
            await (this.notificationService as any).lineService.pushMessage(assigneeId, flexMessage);
            
            console.log(`✅ Sent personal daily report to: ${assignee.displayName}`);
          } catch (err) {
            console.warn('⚠️ Failed to send personal daily report:', assigneeId, err);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending daily incomplete task summaries:', error);
    }
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายวัน
   */
  private createDailySummaryFlexMessage(group: any, tasks: any[], timezone: string, viewerLineUserId?: string): any {
    return FlexMessageTemplateService.createDailySummaryCard(group, tasks, timezone, viewerLineUserId);
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายวันส่วนบุคคล
   */
  private createPersonalDailyReportFlexMessage(group: any, assignee: any, tasks: any[], timezone: string): any {
    return FlexMessageTemplateService.createPersonalReportCard(assignee, tasks, timezone, group);
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

    return FlexMessageTemplateService.createPersonalReportCard(assignee, tasks, timezone);


  }

  /** ส่งสรุปสำหรับผู้จัดการทุกเช้า: งานที่ยังไม่ส่ง / ใครล่าช้า / ใครยังไม่ตรวจ */
  private async sendManagerDailySummaries(): Promise<void> {
    try {
      console.log('📊 Sending manager daily summaries...');

      const groups = await this.taskService.getAllActiveGroups();
      for (const group of groups) {
        // ดึงสถิติสำหรับผู้จัดการ
        const stats = await this.kpiService.getDailyStats(group.id);
        
        // สร้าง Flex Message สำหรับรายงานผู้จัดการ
        const tz = group.timezone || config.app.defaultTimezone;
        const managerFlexMessage = this.createManagerDailyReportFlexMessage(group, stats, tz);

        // ส่งรายงานให้ผู้จัดการที่กำหนด (ในอนาคตจะดึงจากฐานข้อมูล)
        // สำหรับตอนนี้ส่งให้ admin ของกลุ่ม
        const members = await (this.notificationService as any).userService.getGroupMembers(group.lineGroupId);
        const managers = members.filter((m: any) => m.role === 'admin');
        
        for (const manager of managers) {
          try {
            await (this.notificationService as any).lineService.pushMessage(manager.lineUserId, managerFlexMessage);
            console.log(`✅ Sent manager daily report to: ${manager.displayName}`);
          } catch (err) {
            console.warn('⚠️ Failed to send manager daily report:', manager.displayName, err);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending manager daily summaries:', error);
    }
  }

  /**
   * สร้าง Flex Message สำหรับรายงานผู้จัดการ (รวมทุกกลุ่ม)
   */
  private async sendManagerWeeklySummaries(): Promise<void> {
    try {
      console.log('📊 Sending manager weekly summaries (consolidated)...');

      const groups = await this.taskService.getAllActiveGroups();
      
      // สร้าง Map เพื่อจัดกลุ่มข้อมูลตามผู้จัดการ
      const managerGroups = new Map<string, Array<{ group: any; stats: any }>>();
      
      for (const group of groups) {
        // ดึงสถิติรายสัปดาห์สำหรับกลุ่ม
        const stats = await this.kpiService.getWeeklyStats(group.id);
        
        // ดึงสมาชิกที่เป็น admin ของกลุ่ม
        const members = await (this.notificationService as any).userService.getGroupMembers(group.lineGroupId);
        const managers = members.filter((m: any) => m.role === 'admin');
        
        // จัดกลุ่มข้อมูลตามผู้จัดการ
        for (const manager of managers) {
          if (!managerGroups.has(manager.lineUserId)) {
            managerGroups.set(manager.lineUserId, []);
          }
          managerGroups.get(manager.lineUserId)!.push({ group, stats });
        }
      }
      
      // ส่งรายงานรวมให้แต่ละผู้จัดการ
      for (const [managerLineUserId, groupData] of managerGroups) {
        try {
          // สร้าง Flex Message รวมสำหรับผู้จัดการคนนี้
          const managerFlexMessage = this.createManagerWeeklyConsolidatedReportFlexMessage(groupData);
          
          // ส่งรายงาน
          await (this.notificationService as any).lineService.pushMessage(managerLineUserId, managerFlexMessage);
          console.log(`✅ Sent consolidated manager weekly report to: ${managerLineUserId}`);
        } catch (err) {
          console.warn('⚠️ Failed to send consolidated manager weekly report:', managerLineUserId, err);
        }
      }
    } catch (error) {
      console.error('❌ Error sending manager weekly summaries:', error);
    }
  }

  /**
   * สร้าง Flex Message สำหรับรายงานผู้จัดการ (รวมทุกกลุ่ม)
   */
  private createManagerWeeklyConsolidatedReportFlexMessage(groupData: Array<{ group: any; stats: any }>): any {
    const date = moment().tz(config.app.defaultTimezone).format('DD/MM/YYYY');
    const totalGroups = groupData.length;
    const totalMembers = groupData.reduce((sum, g) => sum + (g.stats.totalMembers || 0), 0);
    const totalCompletedTasks = groupData.reduce((sum, g) => sum + (g.stats.completedTasks || 0), 0);
    const totalOverdueTasks = groupData.reduce((sum, g) => sum + (g.stats.overdueTasks || 0), 0);
    const totalPendingReviewTasks = groupData.reduce((sum, g) => sum + (g.stats.pendingReviewTasks || 0), 0);

    const content = [
      { ...FlexMessageDesignSystem.createText(`📊 สรุปรายงานผู้จัดการรวมทุกกลุ่ม (${date})`, 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'), align: 'center' },
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText(`👥 สมาชิกทั้งหมด: ${totalMembers} คน`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
        FlexMessageDesignSystem.createText(`📊 งานเสร็จแล้ว: ${totalCompletedTasks} งาน`, 'sm', FlexMessageDesignSystem.colors.success),
        FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${totalOverdueTasks} งาน`, 'sm', FlexMessageDesignSystem.colors.danger),
        FlexMessageDesignSystem.createText(`📝 งานรอตรวจ: ${totalPendingReviewTasks} งาน`, 'sm', FlexMessageDesignSystem.colors.warning)
      ], 'small'),
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createText('📋 สรุปงานของแต่ละกลุ่ม', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createBox('vertical', groupData.map((item, index) => {
        const group = item.group;
        const stats = item.stats;
        return FlexMessageDesignSystem.createBox('horizontal', [
          { ...FlexMessageDesignSystem.createText(`${index + 1}. ${group.name}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'), flex: 1 },
          { ...FlexMessageDesignSystem.createText(`👥 ${stats.totalMembers || 0} คน`, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
          { ...FlexMessageDesignSystem.createText(`📊 ${stats.completedTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.success), flex: 0 },
          { ...FlexMessageDesignSystem.createText(`⚠️ ${stats.overdueTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.danger), flex: 0 },
          { ...FlexMessageDesignSystem.createText(`📝 ${stats.pendingReviewTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.warning), flex: 0 }
        ], 'small');
      }), 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายละเอียดทั้งหมด',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${groupData[0].group.id}#manager-reports`, // สามารถปรับเป็นลิงก์ที่ต้องการได้
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📊 สรุปรายงานผู้จัดการรวม',
      '📊',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'large'
    );
  }

  /**
   * ส่งรายงานรายสัปดาห์สำหรับหัวหน้างาน
   */
  private async sendSupervisorWeeklySummaries(): Promise<void> {
    try {
      console.log('📊 Sending supervisor weekly summaries...');

      const groups = await this.taskService.getAllActiveGroups();
      for (const group of groups) {
        // ดึงสถิติรายสัปดาห์สำหรับหัวหน้างาน
        const stats = await this.kpiService.getWeeklyStats(group.id);
        
        // สร้าง Flex Message สำหรับรายงานหัวหน้างาน
        const tz = group.timezone || config.app.defaultTimezone;
        const supervisorFlexMessage = this.createSupervisorWeeklyReportFlexMessage(group, stats, tz);

        // ส่งรายงานให้หัวหน้างานที่กำหนด (ในอนาคตจะดึงจากฐานข้อมูล)
        // สำหรับตอนนี้ส่งให้ admin ของกลุ่ม
        const members = await (this.notificationService as any).userService.getGroupMembers(group.lineGroupId);
        const supervisors = members.filter((m: any) => m.role === 'admin');
        
        for (const supervisor of supervisors) {
          try {
            await (this.notificationService as any).lineService.pushMessage(supervisor.lineUserId, supervisorFlexMessage);
            console.log(`✅ Sent supervisor weekly report to: ${supervisor.displayName}`);
          } catch (err) {
            console.warn('⚠️ Failed to send supervisor weekly report:', supervisor.displayName, err);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending supervisor weekly summaries:', error);
    }
  }

  /**
   * สร้าง Flex Message สำหรับรายงานหัวหน้างาน
   */
  private createSupervisorWeeklyReportFlexMessage(group: any, stats: any, timezone: string): any {
    const weekStart = moment().tz(timezone).startOf('week').format('DD/MM');
    const weekEnd = moment().tz(timezone).endOf('week').format('DD/MM');
    
    const content = [
      { ...FlexMessageDesignSystem.createText(`📅 สัปดาห์ ${weekStart} - ${weekEnd}`, 'sm', FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createText('📋 สรุปงานของผู้ใต้บังคับบัญชา', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText(`👥 สมาชิกทั้งหมด: ${stats.totalMembers || 0} คน`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
        FlexMessageDesignSystem.createText(`📊 งานเสร็จแล้ว: ${stats.completedTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.success),
        FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.danger),
        FlexMessageDesignSystem.createText(`📝 งานรอตรวจ: ${stats.pendingReviewTasks || 0} งาน`, 'sm', FlexMessageDesignSystem.colors.warning)
      ], 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดู Dashboard',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📊 รายงานหัวหน้างาน',
      '📊',
      FlexMessageDesignSystem.colors.neutral,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้าง Flex Message สำหรับรายงานผู้จัดการ
   */
  private createManagerDailyReportFlexMessage(group: any, stats: any, timezone: string): any {
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    
    const content = [
      { ...FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📋 งานทั้งหมด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.totalTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.textPrimary, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('✅ เสร็จแล้ว', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.completedTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.success, 'bold')
        ]), flex: 1 }
      ]),
      FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('⚠️ เกินกำหนด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.overdueTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.danger, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📝 รอตรวจ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(stats.pendingReviewTasks?.toString() || '0', 'lg', FlexMessageDesignSystem.colors.warning, 'bold')
        ]), flex: 1 }
      ])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดู Dashboard',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📊 รายงานผู้จัดการ',
      '📊',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'large'
    );
  }

  /**
   * อัปเดต KPI และ Leaderboard ทุกเที่ยงคืน
   */
  private async updateKPIRecords(): Promise<void> {
    try {
      console.log('🔄 Updating KPI records...');
      
      const groups = await this.taskService.getAllActiveGroups();
      
      for (const group of groups) {
        await this.kpiService.updateGroupStats(group.id);
        await this.kpiService.updateGroupLeaderboard(group.id, 'weekly');
      }

    } catch (error) {
      console.error('❌ Error updating KPI records:', error);
    }
  }

  /**
   * ตรวจงานประจำทุกนาที - สร้างงานใหม่จากแม่แบบที่ถึงเวลา
   */
  private async processRecurringTasks(): Promise<void> {
    try {
      console.log('🔄 Processing recurring tasks...');
      
      // ดึงแม่แบบงานประจำที่ใช้งานอยู่
      const recurringTemplates = await AppDataSource.getRepository(RecurringTask)
        .createQueryBuilder('rt')
        .where('rt.active = :active', { active: true })
        .andWhere('rt.nextRunAt <= :now', { now: new Date() })
        .getMany();
      
      console.log(`📋 Found ${recurringTemplates.length} recurring tasks ready to run`);
      
      for (const template of recurringTemplates) {
        try {
          console.log(`🔄 Processing recurring task: ${template.title}`);
          
          // สร้างงานใหม่จากแม่แบบ
          const dueTime = new Date();
          dueTime.setDate(dueTime.getDate() + (template.durationDays || 7));
          
          const newTask = await this.taskService.createTask({
            groupId: template.lineGroupId,
            title: template.title,
            description: template.description,
            assigneeIds: template.assigneeLineUserIds,
            createdBy: template.createdByLineUserId,
            dueTime: dueTime,
            priority: template.priority,
            tags: template.tags,
            requireAttachment: template.requireAttachment,
            reviewerUserId: template.reviewerLineUserId
          });
          
          // อัปเดตข้อมูลในงานที่สร้างให้เชื่อมโยงกับแม่แบบ
          await AppDataSource.getRepository(Task)
            .createQueryBuilder()
            .update()
            .set({ 
              recurringTaskId: template.id,
              recurringInstance: (template.totalInstances || 0) + 1
            })
            .where('id = :taskId', { taskId: newTask.id })
            .execute();
            
          console.log(`🔗 Linked task ${newTask.id} to recurring template ${template.id} (instance #${(template.totalInstances || 0) + 1});`);
          
          // อัปเดตแม่แบบ: เพิ่มจำนวนครั้งและคำนวณเวลาถัดไป
          const nextRunAt = this.recurringTaskService.calculateNextRunAt({
            recurrence: template.recurrence,
            weekDay: template.weekDay,
            dayOfMonth: template.dayOfMonth,
            timeOfDay: template.timeOfDay,
            timezone: template.timezone
          });
          
          await this.recurringTaskService.update(template.id, {
            lastRunAt: new Date(),
            nextRunAt: nextRunAt,
            totalInstances: (template.totalInstances || 0) + 1
          });
          
          console.log(`✅ Created recurring task: ${template.title} (Instance #${(template.totalInstances || 0) + 1})`);
          console.log(`📅 Next run scheduled for: ${nextRunAt}`);
          
        } catch (taskError) {
          console.error(`❌ Error processing recurring task ${template.id}:`, taskError);
          // ไม่หยุดการประมวลผลแม่แบบอื่นๆ
        }
      }

    } catch (error) {
      console.error('❌ Error processing recurring tasks:', error);
    }
  }

  /**
   * ตรวจสอบงานที่ครบกำหนดตรวจและอนุมัติอัตโนมัติทุก 6 ชั่วโมง
   */
  private async processAutoApproveTasks(): Promise<void> {
    try {
      console.log('🔄 Processing auto-approved tasks...');

      const tasks = await this.taskService.getTasksLateForReview();

      for (const task of tasks) {
        try {
          await this.taskService.autoApproveTaskAfterDeadline(task.id);
          console.log(`✅ Auto-approved task: ${task.title}`);
        } catch (error) {
          console.error(`❌ Failed to auto-approve task ${task.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error processing auto-approved tasks:', error);
    }
  }

  /**
   * แปลงช่วงเวลาการเตือนเป็นหน่วยและจำนวน
   */
  private parseReminderInterval(interval: string): { amount: number; unit: moment.DurationInputArg2 } {
    if (interval === 'P1D' || interval === '1d') return { amount: 1, unit: 'days' };
    if (interval === 'PT3H' || interval === '3h') return { amount: 3, unit: 'hours' };
    // เอาการเตือนตอนเช้า 08:00 น. ออกไปแล้ว
    // if (interval === 'daily_8am') return { amount: 0, unit: 'days' };

    // ค่าเริ่มต้น
    return { amount: 1, unit: 'days' };
  }

  /**
   * ส่งการเตือนงาน
   */
  private async sendTaskReminder(task: any, reminderType: string): Promise<void> {
    try {
      await this.notificationService.sendTaskReminder(task, reminderType);
    } catch (error) {
      console.error('❌ Error sending task reminder:', error);
    }
  }

  /**
   * ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวัน
   */
  private async sendDailyOverdueSummary(): Promise<void> {
    try {
      console.log('🕐 Starting daily overdue tasks summary...');
      await this.notificationService.sendDailyOverdueSummary();
    } catch (error) {
      console.error('❌ Error in daily overdue summary job:', error);
    }
  }

  /**
   * คัดลอกไฟล์แนบไปยัง Google Drive อัตโนมัติ
   */
  private async runFileBackups(): Promise<void> {
    try {
      console.log('📁 Starting automatic file backup to Google Drive...');
      
      // เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา
      await this.fileBackupService.runScheduledBackups();
      
      console.log('✅ Automatic file backup completed');
    } catch (error) {
      console.error('❌ Error in automatic file backup job:', error);
    }
  }

  /**
   * สร้าง Flex Message สำหรับ Leaderboard
   */
  private createLeaderboardFlexMessage(group: any, leaderboard: any[]): any {
    const content = [
      FlexMessageDesignSystem.createBox('vertical', leaderboard.slice(0, 5).map((user, index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
        
        return FlexMessageDesignSystem.createBox('horizontal', [
          { ...FlexMessageDesignSystem.createText(medal, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
          { ...FlexMessageDesignSystem.createText(user.displayName, 'sm', FlexMessageDesignSystem.colors.textPrimary), flex: 1 },
          { ...FlexMessageDesignSystem.createText(`${user.weeklyPoints} คะแนน`, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
          { ...FlexMessageDesignSystem.createText(trend, 'sm', FlexMessageDesignSystem.colors.textSecondary), flex: 0 }
        ], 'small');
      }), 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดู Leaderboard ฉบับเต็ม',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}#leaderboard`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '🏆 Leaderboard',
      '🏆',
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'large'
    );

  }
}