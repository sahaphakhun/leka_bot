"use strict";
// Cron Service - จัดการงานที่ต้องรันตามเวลา
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const config_1 = require("@/utils/config");
const TaskService_1 = require("./TaskService");
const NotificationService_1 = require("./NotificationService");
const KPIService_1 = require("./KPIService");
const FlexMessageTemplateService_1 = require("./FlexMessageTemplateService");
const FlexMessageDesignSystem_1 = require("./FlexMessageDesignSystem");
const FileBackupService_1 = require("./FileBackupService");
const RecurringTaskService_1 = require("./RecurringTaskService");
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
class CronService {
    constructor() {
        this.jobs = new Map();
        this.isStarted = false;
        this.taskService = new TaskService_1.TaskService();
        this.notificationService = new NotificationService_1.NotificationService();
        this.kpiService = new KPIService_1.KPIService();
        this.fileBackupService = new FileBackupService_1.FileBackupService();
        this.recurringTaskService = new RecurringTaskService_1.RecurringTaskService();
    }
    start() {
        if (this.isStarted) {
            console.log('🔄 Cron jobs already running, restarting...');
            this.stop();
        }
        console.log('🕐 Starting cron jobs...');
        // เตือนก่อนถึงกำหนด 1 วัน: รันทุกชั่วโมงเพื่อตรวจช่วง 1 วันก่อน
        const reminderOneDayJob = node_cron_1.default.schedule('0 * * * *', async () => {
            await this.processReminders(['P1D']);
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // ตรวจสอบงานที่เกินกำหนดทุกวันเวลา 9:00 น. (เปลี่ยนจากทุกชั่วโมง)
        const overdueJob = node_cron_1.default.schedule('0 9 * * *', async () => {
            await this.processOverdueTasks();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวันเวลา 9:00 น.
        const dailyOverdueSummaryJob = node_cron_1.default.schedule('0 9 * * *', async () => {
            await this.sendDailyOverdueSummary();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // สรุปรายงานรายสัปดาห์ (ศุกร์ 13:00)
        const weeklyReportJob = node_cron_1.default.schedule('0 13 * * 5', async () => {
            await this.sendWeeklyReports();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // สรุปรายวัน 08:00 ส่งรายการงานที่ยังไม่เสร็จในแต่ละกลุ่ม
        const dailySummaryJob = node_cron_1.default.schedule('0 8 * * *', async () => {
            await this.sendDailyIncompleteTaskSummaries();
            // ย้ายรายงานผู้จัดการไปส่งเฉพาะวันจันทร์
            // await this.sendManagerDailySummaries();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // สรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์ 08:00
        const supervisorSummaryJob = node_cron_1.default.schedule('0 8 * * 1', async () => {
            await this.sendSupervisorWeeklySummaries();
            // เพิ่มรายงานผู้จัดการรายสัปดาห์ (รวมทุกกลุ่ม)
            await this.sendManagerWeeklySummaries();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // อัปเดต KPI และ Leaderboard ทุกเที่ยงคืน
        const kpiUpdateJob = node_cron_1.default.schedule('0 0 * * *', async () => {
            await this.updateKPIRecords();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // คัดลอกไฟล์แนบไปยัง Google Drive ทุกวันเวลา 02:00 น.
        const fileBackupJob = node_cron_1.default.schedule('0 2 * * *', async () => {
            await this.runFileBackups();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // ตรวจงานประจำทุก 5 นาที (เพื่อลดภาระของระบบ)
        const recurringJob = node_cron_1.default.schedule('*/5 * * * *', async () => {
            await this.processRecurringTasks();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // เตือนผู้ตรวจให้ตรวจงานทุกวันเวลา 9:00 น.
        const reviewReminderJob = node_cron_1.default.schedule('0 9 * * *', async () => {
            await this.sendDailyReviewReminders();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
        });
        // ตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่มและลบข้อมูลงานทุกวันเวลา 10:00 น.
        const botMembershipCheckJob = node_cron_1.default.schedule('0 10 * * *', async () => {
            await this.checkBotMembershipAndCleanup();
        }, {
            scheduled: false,
            timezone: config_1.config.app.defaultTimezone
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
        this.jobs.set('reviewReminder', reviewReminderJob);
        this.jobs.set('botMembershipCheck', botMembershipCheckJob);
        // เริ่มงานทั้งหมด
        this.jobs.forEach((job, name) => {
            job.start();
            console.log(`✅ Started cron job: ${name}`);
        });
        this.isStarted = true;
    }
    stop() {
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
    async processReminders(onlyIntervals) {
        try {
            console.log('🔔 Processing task reminders...');
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            const upcomingTasks = await this.taskService.getTasksForReminder();
            for (const task of upcomingTasks) {
                const dueTime = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone);
                const timeDiff = dueTime.diff(now);
                // เลือกช่วงเตือน
                const reminderIntervals = onlyIntervals && onlyIntervals.length > 0
                    ? onlyIntervals
                    : ((task.customReminders && task.customReminders.length > 0)
                        ? task.customReminders
                        : config_1.config.app.defaultReminders);
                // เตือนล่วงหน้าตามช่วงเวลา (เช่น 1 วันก่อนครบกำหนด)
                for (const interval of reminderIntervals || []) {
                    const reminderTime = this.parseReminderInterval(interval);
                    const shouldSendAt = dueTime.clone().subtract(reminderTime.amount, reminderTime.unit);
                    // ตรวจสอบช่วงเวลาที่ควรส่ง (หน้าต่าง 1 ชั่วโมงถ้ารัน hourly)
                    if (now.isAfter(shouldSendAt) && now.isBefore(shouldSendAt.clone().add(60, 'minutes'))) {
                        const alreadySent = task.remindersSent.some(reminder => reminder.type === interval &&
                            (0, moment_timezone_1.default)(reminder.sentAt).isSame(now, 'hour'));
                        if (!alreadySent) {
                            await this.sendTaskReminder(task, interval);
                        }
                    }
                }
                // เตือนซ้ำทุกเช้า 08:00 น. จนกว่างานจะเสร็จ: แยกไปรวมรอบเดียวหลังลูป เพื่อลด O(n^2) และคุมหน้าต่างเวลาให้ตรง
            }
            // เอาการเตือนตอนเช้า 08:00 น. ออกไปแล้ว
            // ไม่มีการเตือนซ้ำทุกเช้า 08:00 น. สำหรับงานที่ยังไม่เสร็จทั้งหมด
        }
        catch (error) {
            console.error('❌ Error processing reminders:', error);
        }
    }
    /**
     * ประมวลผลงานที่เกินกำหนด
     */
    async processOverdueTasks() {
        try {
            console.log('⏰ Processing overdue tasks...');
            // ดึงกลุ่มทั้งหมดและตรวจสอบงานเกินกำหนดในแต่ละกลุ่ม
            const groups = await this.taskService.getAllGroups();
            for (const group of groups) {
                try {
                    // เลือกเฉพาะงานที่ถึงกำหนดแล้ว และยังไม่ได้ส่ง/ยังไม่ถูกร้องขอตรวจ
                    const now = (0, moment_timezone_1.default)();
                    const candidates = await database_1.AppDataSource.getRepository(models_1.Task)
                        .createQueryBuilder('task')
                        .leftJoinAndSelect('task.assignedUsers', 'assignee')
                        .leftJoinAndSelect('task.group', 'grp')
                        .leftJoinAndSelect('task.attachedFiles', 'file')
                        .where('task.groupId = :gid', { gid: group.id })
                        .andWhere('task.status IN (:...st)', { st: ['pending', 'in_progress'] })
                        .andWhere('task.dueTime < :now', { now: now.toDate() })
                        .orderBy('task.dueTime', 'ASC')
                        .getMany();
                    for (const task of candidates) {
                        const wf = task.workflow || {};
                        const submissions = wf?.submissions;
                        const hasSubmission = Array.isArray(submissions)
                            ? submissions.length > 0
                            : submissions && typeof submissions === 'object'
                                ? Object.keys(submissions).length > 0
                                : false;
                        const review = wf?.review;
                        const reviewRequested = !!(review && (review.status === 'pending' || review.reviewRequestedAt));
                        const alreadySubmitted = !!task.submittedAt;
                        // ข้ามงานที่ถูกส่งแล้วหรือมีการขอตรวจแล้ว หรือมีไฟล์ submission แนบกับงาน
                        const hasSubmissionFiles = Array.isArray(task.attachedFiles)
                            ? task.attachedFiles.some((f) => f?.attachmentType === 'submission')
                            : false;
                        if (hasSubmission || reviewRequested || alreadySubmitted || hasSubmissionFiles) {
                            continue;
                        }
                        // อัปเดตสถานะเป็น overdue
                        await this.taskService.updateTaskStatus(task.id, 'overdue');
                        // ส่งการแจ้งเตือน
                        const overdueHours = (0, moment_timezone_1.default)().diff((0, moment_timezone_1.default)(task.dueTime), 'hours');
                        await this.notificationService.sendOverdueNotification({ task, overdueHours });
                        // บันทึก overdue KPI (0 คะแนน) ทันที เพื่อป้องกันการเล่นระบบ
                        const overdueDays = (0, moment_timezone_1.default)().diff((0, moment_timezone_1.default)(task.dueTime), 'days');
                        if (overdueDays >= 7 && task.status !== 'cancelled') {
                            await this.kpiService.recordOverdueKPI(task);
                        }
                    }
                }
                catch (err) {
                    console.warn('⚠️ Failed to process overdue tasks for group:', group.id, err);
                }
            }
            // ตรวจงานที่รอการตรวจเกิน 2 วัน
            const lateReviews = await this.taskService.getTasksLateForReview();
            for (const t of lateReviews) {
                await this.taskService.markLateReview(t.id);
            }
        }
        catch (error) {
            console.error('❌ Error processing overdue tasks:', error);
        }
    }
    /**
     * ส่งรายงานรายสัปดาห์ (ศุกร์ 13:00)
     */
    async sendWeeklyReports() {
        try {
            console.log('📊 Sending weekly reports...');
            const groups = await this.taskService.getAllActiveGroups();
            for (const group of groups) {
                if (!group.settings.enableLeaderboard)
                    continue;
                const weeklyStats = await this.kpiService.getWeeklyStats(group.id);
                const leaderboard = await this.kpiService.getGroupLeaderboard(group.id, 'weekly');
                // ส่งรายงานรายสัปดาห์ปกติ
                await this.notificationService.sendWeeklyReport(group, weeklyStats, leaderboard);
                // ยกเลิกการส่งการ์ด Leaderboard แยก เพื่อรวมในรายงานฉบับเดียวให้ครบถ้วน
                // ส่งให้หัวหน้าทีม (admin) ทางส่วนตัวด้วย
                try {
                    await this.notificationService.sendWeeklyReportToAdmins(group, weeklyStats, leaderboard);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send weekly report to admins:', group.id, err);
                }
            }
        }
        catch (error) {
            console.error('❌ Error sending weekly reports:', error);
        }
    }
    /** ส่งสรุปรายวัน: งานที่ยังไม่เสร็จในแต่ละกลุ่ม เวลา 08:00 น. */
    async sendDailyIncompleteTaskSummaries() {
        try {
            console.log('🗒️ Sending daily incomplete task summaries...');
            const groups = await this.taskService.getAllActiveGroups();
            for (const group of groups) {
                // ดึงงานค้างของกลุ่มนี้
                const tasks = await this.taskService.getIncompleteTasksOfGroup(group.lineGroupId);
                if (tasks.length === 0)
                    continue;
                // สร้าง Flex Message สำหรับสรุปงานประจำวัน
                const tz = group.timezone || config_1.config.app.defaultTimezone;
                const summaryFlexMessage = this.createDailySummaryFlexMessage(group, tasks, tz);
                // ส่งสรุปลงกลุ่ม
                try {
                    await this.notificationService.lineService.pushMessage(group.lineGroupId, summaryFlexMessage);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send daily summary to group:', group.lineGroupId, err);
                }
                // ส่งการ์ดแยกรายบุคคลให้แต่ละคน
                const tasksByAssignee = new Map();
                for (const task of tasks) {
                    const assignees = task.assignedUsers || [];
                    if (assignees.length === 0)
                        continue;
                    for (const assignee of assignees) {
                        const userTasks = tasksByAssignee.get(assignee.lineUserId) || [];
                        userTasks.push(task);
                        tasksByAssignee.set(assignee.lineUserId, userTasks);
                    }
                }
                for (const [assigneeId, userTasks] of tasksByAssignee.entries()) {
                    try {
                        const assignee = userTasks[0].assignedUsers?.find((u) => u.lineUserId === assigneeId);
                        if (!assignee)
                            continue;
                        // สร้างการ์ดงานต่างๆ ของแต่ละงาน (Flex Message) แทนข้อความธรรมดา
                        const flexMessage = this.createPersonalDailyReportFlexMessage(group, assignee, userTasks, tz);
                        // ส่งการ์ดให้แต่ละคนทางส่วนตัว
                        await this.notificationService.lineService.pushMessage(assigneeId, flexMessage);
                        console.log(`✅ Sent personal daily report to: ${assignee.displayName}`);
                    }
                    catch (err) {
                        console.warn('⚠️ Failed to send personal daily report:', assigneeId, err);
                    }
                }
            }
        }
        catch (error) {
            console.error('❌ Error sending daily incomplete task summaries:', error);
        }
    }
    /**
     * สร้าง Flex Message สำหรับรายงานรายวัน
     */
    createDailySummaryFlexMessage(group, tasks, timezone, viewerLineUserId) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createDailySummaryCard(group, tasks, timezone, viewerLineUserId);
    }
    /**
     * สร้าง Flex Message สำหรับรายงานรายวันส่วนบุคคล
     */
    createPersonalDailyReportFlexMessage(group, assignee, tasks, timezone) {
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createPersonalReportCard(assignee, tasks, timezone, group);
    }
    /**
     * สร้างการ์ดงานส่วนบุคคล (Flex Message)
     */
    createPersonalTaskFlexMessage(assignee, tasks, timezone) {
        const header = `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`;
        const date = (0, moment_timezone_1.default)().tz(timezone).format('DD/MM/YYYY');
        const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;
        // จัดหมวดหมู่ตามสถานะ
        const overdueTasks = tasks.filter(t => t.status === 'overdue');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        return FlexMessageTemplateService_1.FlexMessageTemplateService.createPersonalReportCard(assignee, tasks, timezone);
    }
    /** ส่งสรุปสำหรับผู้จัดการทุกเช้า: งานที่ยังไม่ส่ง / ใครล่าช้า / ใครยังไม่ตรวจ */
    async sendManagerDailySummaries() {
        try {
            console.log('📊 Sending manager daily summaries...');
            const groups = await this.taskService.getAllActiveGroups();
            for (const group of groups) {
                // ดึงสถิติสำหรับผู้จัดการ
                const stats = await this.kpiService.getDailyStats(group.id);
                // สร้าง Flex Message สำหรับรายงานผู้จัดการ
                const tz = group.timezone || config_1.config.app.defaultTimezone;
                const managerFlexMessage = this.createManagerDailyReportFlexMessage(group, stats, tz);
                // ส่งรายงานให้ผู้จัดการที่กำหนด (ในอนาคตจะดึงจากฐานข้อมูล)
                // สำหรับตอนนี้ส่งให้ admin ของกลุ่ม
                const members = await this.notificationService.userService.getGroupMembers(group.lineGroupId);
                const managers = members.filter((m) => m.role === 'admin');
                for (const manager of managers) {
                    try {
                        await this.notificationService.lineService.pushMessage(manager.lineUserId, managerFlexMessage);
                        console.log(`✅ Sent manager daily report to: ${manager.displayName}`);
                    }
                    catch (err) {
                        console.warn('⚠️ Failed to send manager daily report:', manager.displayName, err);
                    }
                }
            }
        }
        catch (error) {
            console.error('❌ Error sending manager daily summaries:', error);
        }
    }
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ (รวมทุกกลุ่ม)
     */
    async sendManagerWeeklySummaries() {
        try {
            console.log('📊 Sending manager weekly summaries (consolidated)...');
            const groups = await this.taskService.getAllActiveGroups();
            // สร้าง Map เพื่อจัดกลุ่มข้อมูลตามผู้จัดการ
            const managerGroups = new Map();
            for (const group of groups) {
                // ดึงสถิติรายสัปดาห์สำหรับกลุ่ม
                const stats = await this.kpiService.getWeeklyStats(group.id);
                // ดึงสมาชิกที่เป็น admin ของกลุ่ม
                const members = await this.notificationService.userService.getGroupMembers(group.lineGroupId);
                const managers = members.filter((m) => m.role === 'admin');
                // จัดกลุ่มข้อมูลตามผู้จัดการ
                for (const manager of managers) {
                    if (!managerGroups.has(manager.lineUserId)) {
                        managerGroups.set(manager.lineUserId, []);
                    }
                    managerGroups.get(manager.lineUserId).push({ group, stats });
                }
            }
            // ส่งรายงานรวมให้แต่ละผู้จัดการ
            for (const [managerLineUserId, groupData] of managerGroups) {
                try {
                    // สร้าง Flex Message รวมสำหรับผู้จัดการคนนี้
                    const managerFlexMessage = this.createManagerWeeklyConsolidatedReportFlexMessage(groupData);
                    // ส่งรายงาน
                    await this.notificationService.lineService.pushMessage(managerLineUserId, managerFlexMessage);
                    console.log(`✅ Sent consolidated manager weekly report to: ${managerLineUserId}`);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send consolidated manager weekly report:', managerLineUserId, err);
                }
            }
        }
        catch (error) {
            console.error('❌ Error sending manager weekly summaries:', error);
        }
    }
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ (รวมทุกกลุ่ม)
     */
    createManagerWeeklyConsolidatedReportFlexMessage(groupData) {
        const date = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY');
        const totalGroups = groupData.length;
        const totalMembers = groupData.reduce((sum, g) => sum + (g.stats.totalMembers || 0), 0);
        const totalCompletedTasks = groupData.reduce((sum, g) => sum + (g.stats.completedTasks || 0), 0);
        const totalOverdueTasks = groupData.reduce((sum, g) => sum + (g.stats.overdueTasks || 0), 0);
        const totalPendingReviewTasks = groupData.reduce((sum, g) => sum + (g.stats.pendingReviewTasks || 0), 0);
        const content = [
            { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📊 สรุปรายงานผู้จัดการรวมทุกกลุ่ม (${date})`, 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'), align: 'center' },
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 สมาชิกทั้งหมด: ${totalMembers} คน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📊 งานเสร็จแล้ว: ${totalCompletedTasks} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${totalOverdueTasks} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 งานรอตรวจ: ${totalPendingReviewTasks} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning)
            ], 'small'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 สรุปงานของแต่ละกลุ่ม', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', groupData.map((item, index) => {
                const group = item.group;
                const stats = item.stats;
                return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${index + 1}. ${group.name}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'), flex: 1 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 ${stats.totalMembers || 0} คน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📊 ${stats.completedTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success), flex: 0 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⚠️ ${stats.overdueTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger), flex: 0 },
                    { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 ${stats.pendingReviewTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning), flex: 0 }
                ], 'small');
            }), 'small')
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียดทั้งหมด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${groupData[0].group.id}#manager-reports`, // สามารถปรับเป็นลิงก์ที่ต้องการได้
            'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📊 สรุปรายงานผู้จัดการรวม', '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * ส่งรายงานรายสัปดาห์สำหรับหัวหน้างาน
     */
    async sendSupervisorWeeklySummaries() {
        try {
            console.log('📊 Sending supervisor weekly summaries...');
            const groups = await this.taskService.getAllActiveGroups();
            for (const group of groups) {
                // ดึงสถิติรายสัปดาห์สำหรับหัวหน้างาน
                const stats = await this.kpiService.getWeeklyStats(group.id);
                // สร้าง Flex Message สำหรับรายงานหัวหน้างาน
                const tz = group.timezone || config_1.config.app.defaultTimezone;
                const supervisorFlexMessage = this.createSupervisorWeeklyReportFlexMessage(group, stats, tz);
                // ส่งรายงานให้หัวหน้างานที่กำหนด (ในอนาคตจะดึงจากฐานข้อมูล)
                // สำหรับตอนนี้ส่งให้ admin ของกลุ่ม
                const members = await this.notificationService.userService.getGroupMembers(group.lineGroupId);
                const supervisors = members.filter((m) => m.role === 'admin');
                for (const supervisor of supervisors) {
                    try {
                        await this.notificationService.lineService.pushMessage(supervisor.lineUserId, supervisorFlexMessage);
                        console.log(`✅ Sent supervisor weekly report to: ${supervisor.displayName}`);
                    }
                    catch (err) {
                        console.warn('⚠️ Failed to send supervisor weekly report:', supervisor.displayName, err);
                    }
                }
            }
        }
        catch (error) {
            console.error('❌ Error sending supervisor weekly summaries:', error);
        }
    }
    /**
     * สร้าง Flex Message สำหรับรายงานหัวหน้างาน
     */
    createSupervisorWeeklyReportFlexMessage(group, stats, timezone) {
        const weekStart = (0, moment_timezone_1.default)().tz(timezone).startOf('week').format('DD/MM');
        const weekEnd = (0, moment_timezone_1.default)().tz(timezone).endOf('week').format('DD/MM');
        const content = [
            { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📅 สัปดาห์ ${weekStart} - ${weekEnd}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 สรุปงานของผู้ใต้บังคับบัญชา', 'md', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👥 สมาชิกทั้งหมด: ${stats.totalMembers || 0} คน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📊 งานเสร็จแล้ว: ${stats.completedTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${stats.overdueTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📝 งานรอตรวจ: ${stats.pendingReviewTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning)
            ], 'small')
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดู Dashboard', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📊 รายงานหัวหน้างาน', '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.neutral, content, buttons, 'extraLarge');
    }
    /**
     * สร้าง Flex Message สำหรับรายงานผู้จัดการ
     */
    createManagerDailyReportFlexMessage(group, stats, timezone) {
        const date = (0, moment_timezone_1.default)().tz(timezone).format('DD/MM/YYYY');
        const content = [
            { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), align: 'center' },
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createSeparator('medium'),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 งานทั้งหมด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.totalTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('✅ เสร็จแล้ว', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.completedTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, 'bold')
                    ]), flex: 1 }
            ]),
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⚠️ เกินกำหนด', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.overdueTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger, 'bold')
                    ]), flex: 1 },
                { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 รอตรวจ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.pendingReviewTasks?.toString() || '0', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, 'bold')
                    ]), flex: 1 }
            ])
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดู Dashboard', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.id}`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📊 รายงานผู้จัดการ', '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
    }
    /**
     * อัปเดต KPI และ Leaderboard ทุกเที่ยงคืน
     */
    async updateKPIRecords() {
        try {
            console.log('🔄 Updating KPI records...');
            const groups = await this.taskService.getAllActiveGroups();
            for (const group of groups) {
                await this.kpiService.updateGroupStats(group.id);
                await this.kpiService.updateGroupLeaderboard(group.id, 'weekly');
            }
        }
        catch (error) {
            console.error('❌ Error updating KPI records:', error);
        }
    }
    /**
     * ตรวจงานประจำทุกนาที - สร้างงานใหม่จากแม่แบบที่ถึงเวลา
     */
    async processRecurringTasks() {
        try {
            console.log('🔄 Processing recurring tasks...');
            // ดึงแม่แบบงานประจำที่ใช้งานอยู่
            const recurringTemplates = await database_1.AppDataSource.getRepository(models_1.RecurringTask)
                .createQueryBuilder('rt')
                .where('rt.active = :active', { active: true })
                .andWhere('rt.nextRunAt <= :now', { now: new Date() })
                .getMany();
            console.log(`📋 Found ${recurringTemplates.length} recurring tasks ready to run`);
            for (const template of recurringTemplates) {
                try {
                    console.log(`🔄 Processing recurring task: ${template.title}`);
                    // คำนวณกำหนดส่งของรอบถัดไปจากกำหนดล่าสุด (nextRunAt)
                    const tz = template.timezone || config_1.config.app.defaultTimezone;
                    const prevDue = (0, moment_timezone_1.default)(template.nextRunAt).tz(tz);
                    let nextDue = prevDue.clone();
                    if (template.recurrence === 'weekly') {
                        nextDue = prevDue.clone().add(1, 'week');
                    }
                    else if (template.recurrence === 'monthly') {
                        const dom = prevDue.date();
                        const candidate = prevDue.clone().add(1, 'month');
                        const clampedDay = Math.min(dom, candidate.daysInMonth());
                        nextDue = candidate.date(clampedDay);
                    }
                    else { // quarterly
                        const dom = prevDue.date();
                        const candidate = prevDue.clone().add(3, 'months');
                        const clampedDay = Math.min(dom, candidate.daysInMonth());
                        nextDue = candidate.date(clampedDay);
                    }
                    // ตรวจสอบและใช้ LINE User ID ที่ถูกต้อง
                    const createdByLineUserId = template.createdByLineUserId || template.assigneeLineUserIds?.[0];
                    if (!createdByLineUserId) {
                        console.warn(`⚠️ Skipping recurring task ${template.title}: no valid creator LINE User ID`);
                        continue;
                    }
                    const newTask = await this.taskService.createTask({
                        groupId: template.lineGroupId,
                        title: template.title,
                        description: template.description,
                        assigneeIds: template.assigneeLineUserIds,
                        createdBy: createdByLineUserId,
                        dueTime: nextDue.toDate(),
                        priority: template.priority,
                        tags: template.tags,
                        requireAttachment: template.requireAttachment,
                        reviewerUserId: template.reviewerLineUserId
                    });
                    // อัปเดตข้อมูลในงานที่สร้างให้เชื่อมโยงกับแม่แบบ
                    await database_1.AppDataSource.getRepository(models_1.Task)
                        .createQueryBuilder()
                        .update()
                        .set({
                        recurringTaskId: template.id,
                        recurringInstance: (template.totalInstances || 0) + 1
                    })
                        .where('id = :taskId', { taskId: newTask.id })
                        .execute();
                    console.log(`🔗 Linked task ${newTask.id} to recurring template ${template.id} (instance #${(template.totalInstances || 0) + 1});`);
                    // อัปเดตแม่แบบ: เพิ่มจำนวนครั้ง และตั้ง nextRunAt = กำหนดส่งของรอบล่าสุด (ใช้ nextDue)
                    await this.recurringTaskService.update(template.id, {
                        lastRunAt: new Date(),
                        nextRunAt: nextDue.toDate(),
                        totalInstances: (template.totalInstances || 0) + 1
                    });
                    console.log(`✅ Created recurring task: ${template.title} (Instance #${(template.totalInstances || 0) + 1})`);
                    console.log(`📅 Next trigger (current instance due): ${nextDue.toDate().toISOString()}`);
                }
                catch (taskError) {
                    console.error(`❌ Error processing recurring task ${template.id}:`, taskError);
                    // ไม่หยุดการประมวลผลแม่แบบอื่นๆ
                }
            }
        }
        catch (error) {
            console.error('❌ Error processing recurring tasks:', error);
        }
    }
    // หมายเหตุ: ปิดการอนุมัติอัตโนมัติแล้ว
    // เดิมเคยมี processAutoApproveTasks() ที่จะอนุมัติเองหลังครบกำหนดตรวจ 2 วัน
    // ตามนโยบายใหม่ ให้ส่งการ์ดเตือนผู้ตรวจทุกวัน 09:00 แทน (ดู sendDailyReviewReminders)
    /**
     * แปลงช่วงเวลาการเตือนเป็นหน่วยและจำนวน
     */
    parseReminderInterval(interval) {
        if (interval === 'P1D' || interval === '1d')
            return { amount: 1, unit: 'days' };
        if (interval === 'PT3H' || interval === '3h')
            return { amount: 3, unit: 'hours' };
        // เอาการเตือนตอนเช้า 08:00 น. ออกไปแล้ว
        // if (interval === 'daily_8am') return { amount: 0, unit: 'days' };
        // ค่าเริ่มต้น
        return { amount: 1, unit: 'days' };
    }
    /**
     * ส่งการเตือนงาน
     */
    async sendTaskReminder(task, reminderType) {
        try {
            await this.notificationService.sendTaskReminder(task, reminderType);
        }
        catch (error) {
            console.error('❌ Error sending task reminder:', error);
        }
    }
    /**
     * ส่งการแจ้งเตือนงานเกินกำหนดแบบรวมทุกวัน
     */
    async sendDailyOverdueSummary() {
        try {
            console.log('🕐 Starting daily overdue tasks summary...');
            await this.notificationService.sendDailyOverdueSummary();
        }
        catch (error) {
            console.error('❌ Error in daily overdue summary job:', error);
        }
    }
    /**
     * ส่งการเตือนผู้ตรวจสำหรับงานรอตรวจทุกวันเวลา 9:00 น.
     */
    async sendDailyReviewReminders() {
        try {
            console.log('📝 Sending daily review reminders...');
            const pendingReviewTasks = await this.taskService.getTasksPendingReview();
            console.log(`📋 Found ${pendingReviewTasks.length} tasks pending review`);
            for (const task of pendingReviewTasks) {
                try {
                    const reviewerUserId = task?.workflow?.review?.reviewerUserId || task?.createdBy;
                    if (!reviewerUserId)
                        continue;
                    await this.notificationService.sendReviewRequest(task, reviewerUserId, {});
                    console.log(`✅ Sent review reminder for task: ${task.id}`);
                }
                catch (err) {
                    console.warn('⚠️ Failed to send review reminder for task:', task?.id, err);
                }
            }
        }
        catch (error) {
            console.error('❌ Error sending daily review reminders:', error);
        }
    }
    /**
     * ตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่มและลบข้อมูลงานทุกวันเวลา 10:00 น.
     */
    async checkBotMembershipAndCleanup() {
        try {
            console.log('🤖 Starting daily bot membership check and cleanup...');
            // เรียกใช้ฟังก์ชันตรวจสอบและทำความสะอาดจาก TaskService
            const result = await this.taskService.checkAndCleanupInactiveGroups();
            console.log('📊 Bot membership check and cleanup completed:');
            console.log(`   🔍 ตรวจสอบกลุ่ม: ${result.checkedGroups} กลุ่ม`);
            console.log(`   🧹 ทำความสะอาดกลุ่ม: ${result.cleanedGroups} กลุ่ม`);
            console.log(`   🗑️ ลบงานทั้งหมด: ${result.totalDeletedTasks} รายการ`);
            if (result.errors.length > 0) {
                console.log(`   ❌ ข้อผิดพลาด: ${result.errors.length} รายการ`);
                result.errors.forEach((error, index) => {
                    console.log(`      ${index + 1}. ${error}`);
                });
            }
            // ส่งการแจ้งเตือนให้ admin หากมีการทำความสะอาด
            if (result.cleanedGroups > 0) {
                await this.sendCleanupNotification(result);
            }
        }
        catch (error) {
            console.error('❌ Error in bot membership check and cleanup:', error);
        }
    }
    /**
     * ส่งการแจ้งเตือนการทำความสะอาดให้ admin
     */
    async sendCleanupNotification(result) {
        try {
            console.log('📢 Sending cleanup notification to admins...');
            // สร้างข้อความแจ้งเตือน
            const message = `🤖 รายงานการทำความสะอาดข้อมูล Bot

📊 สรุปผลการตรวจสอบ:
• ตรวจสอบกลุ่ม: ${result.checkedGroups} กลุ่ม
• ทำความสะอาดกลุ่ม: ${result.cleanedGroups} กลุ่ม
• ลบงานทั้งหมด: ${result.totalDeletedTasks} รายการ

${result.errors.length > 0 ? `⚠️ ข้อผิดพลาด: ${result.errors.length} รายการ` : '✅ ไม่มีข้อผิดพลาด'}

💡 หมายเหตุ: ระบบตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่มทุกวันเวลา 10:00 น. และลบข้อมูลงานของกลุ่มที่ Bot ไม่อยู่แล้ว`;
            // ส่งการแจ้งเตือนให้ admin ทุกคน (ในอนาคตอาจจะส่งให้ admin เฉพาะ)
            // สำหรับตอนนี้ให้ log ไว้ก่อน
            console.log('📢 Cleanup notification:', message);
        }
        catch (error) {
            console.error('❌ Error sending cleanup notification:', error);
        }
    }
    /**
     * คัดลอกไฟล์แนบไปยัง Google Drive อัตโนมัติ
     */
    async runFileBackups() {
        try {
            console.log('📁 Starting automatic file backup to Google Drive...');
            // เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา
            await this.fileBackupService.runScheduledBackups();
            console.log('✅ Automatic file backup completed');
        }
        catch (error) {
            console.error('❌ Error in automatic file backup job:', error);
        }
    }
    /**
     * สร้าง Flex Message สำหรับ Leaderboard
     */
    createLeaderboardFlexMessage(group, leaderboard) {
        const content = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', leaderboard.slice(0, 5).map((user, index) => {
                const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
                const trend = user.trend === 'up' ? '📈' : user.trend === 'down' ? '📉' : '➡️';
                const totalScore = Number(user.totalScore ?? 0).toFixed(1);
                const onTimeRate = Math.round(user.onTimeRate ?? 0);
                const createdRate = Math.round(user.createdCompletedRate ?? 0);
                return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                        { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(medal, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
                        { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(user.displayName, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary), flex: 1 },
                        { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${totalScore} คะแนน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 },
                        { ...FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(trend, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), flex: 0 }
                    ], 'small'),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`ตรงเวลา ${onTimeRate}% • งานที่สั่งสำเร็จ ${createdRate}% • โทษ ${Math.abs(Math.round(user.penaltyPoints ?? 0))} pts`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ], 'small');
            }), 'small')
        ];
        const buttons = [
            FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดู Leaderboard ฉบับเต็ม', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${group.lineGroupId}#leaderboard`, 'primary')
        ];
        return FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('🏆 Leaderboard', '🏆', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning, content, buttons, 'extraLarge');
    }
}
exports.CronService = CronService;
//# sourceMappingURL=CronService.js.map