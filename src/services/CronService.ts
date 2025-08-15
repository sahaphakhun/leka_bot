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
            const flexMessage = this.createPersonalDailyReportFlexMessage(assignee, userTasks, tz);
            
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
  private createDailySummaryFlexMessage(group: any, tasks: any[], timezone: string): any {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    const date = moment().tz(timezone).format('DD/MM/YYYY');

    return {
      type: 'flex',
      altText: `📊 รายงานรายวัน - ${group.name}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 รายงานรายวัน',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: group.name,
              size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#4CAF50',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: `🗓️ วันที่ ${date}`,
              size: 'sm',
              color: '#666666',
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: `📋 งานค้างทั้งหมด: ${tasks.length} งาน`,
              weight: 'bold',
              size: 'md',
              color: '#333333'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: `⚠️ งานเกินกำหนด: ${overdueTasks.length} งาน`,
                  size: 'sm',
                  color: '#F44336'
                },
                {
                  type: 'text',
                  text: `⏳ งานกำลังดำเนินการ: ${inProgressTasks.length} งาน`,
                  size: 'sm',
                  color: '#FF9800'
                },
                {
                  type: 'text',
                  text: `📝 งานรอดำเนินการ: ${pendingTasks.length} งาน`,
                  size: 'sm',
                  color: '#0066CC'
                }
              ]
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
  }

  /**
   * สร้าง Flex Message สำหรับรายงานรายวันส่วนบุคคล
   */
  private createPersonalDailyReportFlexMessage(assignee: any, tasks: any[], timezone: string): any {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    const header = `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`;
    const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;
    
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
            }
          ]
        });
      });
    }

    return flexContainer;
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
   * สร้าง Flex Message สำหรับรายงานผู้จัดการ
   */
  private createManagerDailyReportFlexMessage(group: any, stats: any, timezone: string): any {
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    
    return {
      type: 'flex',
      altText: `📊 รายงานผู้จัดการ - ${group.name}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 รายงานผู้จัดการ',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: group.name,
              size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#9C27B0',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: `🗓️ วันที่ ${date}`,
              size: 'sm',
              color: '#666666',
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
      type: 'box',
              layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
                  flex: 1,
          contents: [
            {
              type: 'text',
                      text: '📋 งานทั้งหมด',
                      size: 'xs',
                      color: '#666666'
            },
            {
              type: 'text',
                      text: stats.totalTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#333333'
                    }
                  ]
                },
                {
          type: 'box',
          layout: 'vertical',
                  flex: 1,
          contents: [
            {
              type: 'text',
                      text: '✅ เสร็จแล้ว',
                      size: 'xs',
                      color: '#666666'
            },
            {
              type: 'text',
                      text: stats.completedTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#4CAF50'
                    }
                  ]
                }
              ]
            },
            {
      type: 'box',
              layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
                  flex: 1,
          contents: [
            {
              type: 'text',
                      text: '⚠️ เกินกำหนด',
                      size: 'xs',
                      color: '#666666'
            },
            {
              type: 'text',
                      text: stats.overdueTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#F44336'
                    }
                  ]
                },
                {
          type: 'box',
          layout: 'vertical',
                  flex: 1,
          contents: [
            {
              type: 'text',
                      text: '📝 รอตรวจ',
                      size: 'xs',
                      color: '#666666'
            },
            {
              type: 'text',
                      text: stats.pendingReviewTasks?.toString() || '0',
                      size: 'lg',
                      weight: 'bold',
                      color: '#FF9800'
                    }
                  ]
                }
              ]
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
    
    return {
      type: 'flex',
      altText: `📊 รายงานหัวหน้างาน - ${group.name}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
      type: 'box',
          layout: 'vertical',
      contents: [
        {
          type: 'text',
              text: '📊 รายงานหัวหน้างาน',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
        },
        {
          type: 'text',
              text: group.name,
          size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#607D8B',
          paddingAll: 'md'
        },
        body: {
        type: 'box',
        layout: 'vertical',
          spacing: 'md',
        contents: [
          {
            type: 'text',
              text: `📅 สัปดาห์ ${weekStart} - ${weekEnd}`,
              size: 'sm',
              color: '#666666',
              align: 'center'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: '📋 สรุปงานของผู้ใต้บังคับบัญชา',
            weight: 'bold',
            size: 'md',
            color: '#333333'
          },
          {
          type: 'box',
          layout: 'vertical',
              spacing: 'sm',
          contents: [
            {
              type: 'text',
                  text: `👥 สมาชิกทั้งหมด: ${stats.totalMembers || 0} คน`,
              size: 'sm',
                  color: '#666666'
            },
            {
              type: 'text',
                  text: `📊 งานเสร็จแล้ว: ${stats.completedTasks || 0} งาน`,
                  size: 'sm',
                  color: '#4CAF50'
            },
            {
              type: 'text',
                  text: `⚠️ งานเกินกำหนด: ${stats.overdueTasks || 0} งาน`,
                  size: 'sm',
                  color: '#F44336'
                },
                {
                  type: 'text',
                  text: `📝 งานรอตรวจ: ${stats.pendingReviewTasks || 0} งาน`,
                  size: 'sm',
                  color: '#FF9800'
                }
              ]
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
   * ตรวจงานประจำทุกนาที (คำนวณ nextRunAt)
   */
  private async processRecurringTasks(): Promise<void> {
    try {
      console.log('🔄 Processing recurring tasks...');
      
      const recurringTasks = await this.taskService.getAllRecurringTasks();
      
      for (const task of recurringTasks) {
        // ตรวจสอบว่าควรสร้างงานใหม่หรือไม่ (ทุก 7 วัน)
        const lastUpdated = moment(task.updatedAt).tz(config.app.defaultTimezone);
        const shouldCreate = moment().diff(lastUpdated, 'days') >= 7;
        
        if (shouldCreate) {
          await this.taskService.executeRecurringTask(task.id);
          await this.taskService.updateRecurringTaskNextRunAt(task.id);
        }
      }

    } catch (error) {
      console.error('❌ Error processing recurring tasks:', error);
    }
  }

  /**
   * แปลงช่วงเวลาการเตือนเป็นหน่วยและจำนวน
   */
  private parseReminderInterval(interval: string): { amount: number; unit: moment.DurationInputArg2 } {
    if (interval === 'P7D' || interval === '7d') return { amount: 7, unit: 'days' };
    if (interval === 'P1D' || interval === '1d') return { amount: 1, unit: 'days' };
    if (interval === 'PT3H' || interval === '3h') return { amount: 3, unit: 'hours' };
    if (interval === 'daily_8am') return { amount: 0, unit: 'days' };
    if (interval === 'due') return { amount: 0, unit: 'minutes' };
    
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
   * สร้าง Flex Message สำหรับ Leaderboard
   */
  private createLeaderboardFlexMessage(group: any, leaderboard: any[]): any {
    return {
      type: 'flex',
      altText: `🏆 Leaderboard - ${group.name}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🏆 Leaderboard',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            },
            {
              type: 'text',
              text: group.name,
              size: 'sm',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#FFD700',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: leaderboard.slice(0, 5).map((user, index) => ({
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
          contents: [
            {
              type: 'text',
                text: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}️⃣`,
                size: 'sm',
                color: '#666666',
              flex: 0
            },
            {
              type: 'text',
                text: user.displayName,
              size: 'sm',
                color: '#333333',
                flex: 1
              },
              {
                type: 'text',
                text: `${user.weeklyPoints} คะแนน`,
                size: 'sm',
                color: '#666666',
                flex: 0
              }
            ]
          }))
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
  }
}