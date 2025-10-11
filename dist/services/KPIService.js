"use strict";
// KPI Service - จัดการคะแนนและ Leaderboard
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KPIService = void 0;
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const config_1 = require("@/utils/config");
const throttledLogger_1 = require("@/utils/throttledLogger");
// @ts-ignore
const moment_timezone_1 = __importDefault(require("moment-timezone"));
class KPIService {
    constructor() {
        this.kpiRepository = database_1.AppDataSource.getRepository(models_1.KPIRecord);
        this.taskRepository = database_1.AppDataSource.getRepository(models_1.Task);
        this.userRepository = database_1.AppDataSource.getRepository(models_1.User);
        this.groupRepository = database_1.AppDataSource.getRepository(models_1.Group);
    }
    /**
     * แปลง groupId ที่มาจาก URL ให้เป็น internal UUID ของกลุ่ม
     * - รองรับ LINE Group ID
     * - รองรับค่า 'default' โดยเลือกกลุ่มที่อัปเดตล่าสุดเป็นค่าเริ่มต้น (สำหรับ deployment บน Railway)
     */
    async resolveInternalGroupIdOrDefault(inputGroupId) {
        try {
            // ถ้าระบุเป็น UUID อยู่แล้ว ให้คืนค่าทันที
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(inputGroupId)) {
                return inputGroupId;
            }
            // ถ้าเป็นค่า 'default' ให้เลือกกลุ่มที่อัปเดตล่าสุด
            if (inputGroupId === 'default') {
                const latestGroup = await this.groupRepository
                    .createQueryBuilder('group')
                    .orderBy('group.updatedAt', 'DESC')
                    .getOne();
                return latestGroup ? latestGroup.id : null;
            }
            // พยายาม map จาก LINE Group ID → internal UUID
            const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: inputGroupId } });
            if (groupByLineId)
                return groupByLineId.id;
            // หาไม่เจอ
            return null;
        }
        catch (e) {
            console.warn('⚠️ Failed to resolve group id, falling back to null:', e);
            return null;
        }
    }
    /** สรุปรายงานตามช่วงเวลา: กลุ่ม/บุคคล */
    async getReportSummary(groupId, options = {}) {
        try {
            // รองรับ LINE Group ID และ 'default' → internal UUID
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId) {
                return {
                    periodStart: new Date(),
                    periodEnd: new Date(),
                    totals: { completed: 0, early: 0, ontime: 0, late: 0, overtime: 0, overdue: 0, rejected: 0, completionRate: 0 }
                };
            }
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            const periodStart = options.startDate
                ? (0, moment_timezone_1.default)(options.startDate).tz(config_1.config.app.defaultTimezone)
                : options.period === 'monthly' ? now.clone().startOf('month') : now.clone().startOf('week');
            const periodEnd = options.endDate
                ? (0, moment_timezone_1.default)(options.endDate).tz(config_1.config.app.defaultTimezone)
                : options.period === 'monthly' ? now.clone().endOf('month') : now.clone().endOf('week');
            // KPI จากการปิดงาน - ใช้ข้อมูล KPI record ที่บันทึกไว้
            let kpiQB = this.kpiRepository
                .createQueryBuilder('kpi')
                .select([
                "SUM(CASE WHEN kpi.type IN ('assignee_early','assignee_ontime','assignee_late') THEN 1 ELSE 0 END) as completed",
                "SUM(CASE WHEN kpi.type = 'assignee_early' THEN 1 ELSE 0 END) as early",
                "SUM(CASE WHEN kpi.type = 'assignee_ontime' THEN 1 ELSE 0 END) as ontime",
                "SUM(CASE WHEN kpi.type = 'assignee_late' THEN 1 ELSE 0 END) as late",
                "SUM(CASE WHEN kpi.type = 'penalty_overdue' THEN 1 ELSE 0 END) as overdue"
            ])
                .where('kpi.groupId = :groupId', { groupId: internalGroupId })
                .andWhere('kpi.eventDate BETWEEN :start AND :end', { start: periodStart.toDate(), end: periodEnd.toDate() });
            if (options.userId) {
                kpiQB = kpiQB.andWhere('kpi.userId = :userId', { userId: options.userId });
            }
            const kpiRow = await kpiQB.getRawOne();
            let completed = parseInt(kpiRow?.completed || '0');
            // ถ้าไม่มี KPI record ให้ fallback ไปดูจาก task status แทน
            if (completed === 0) {
                let taskCompletedQB = this.taskRepository
                    .createQueryBuilder('task')
                    .where('task.groupId = :groupId', { groupId: internalGroupId })
                    .andWhere('task.status = :status', { status: 'completed' })
                    .andWhere('task.completedAt BETWEEN :start AND :end', { start: periodStart.toDate(), end: periodEnd.toDate() });
                if (options.userId) {
                    taskCompletedQB = taskCompletedQB
                        .leftJoin('task.assignedUsers', 'assignee')
                        .andWhere('assignee.id = :uid', { uid: options.userId });
                }
                completed = await taskCompletedQB.getCount();
            }
            const early = parseInt(kpiRow?.early || '0');
            const ontime = parseInt(kpiRow?.ontime || '0');
            const late = parseInt(kpiRow?.late || '0');
            const overtime = 0;
            const overdue = parseInt(kpiRow?.overdue || '0');
            // งานทั้งหมดที่ได้รับมอบ (เพื่อคิด completionRate)
            let taskAssignedQB = this.taskRepository
                .createQueryBuilder('task')
                .leftJoin('task.assignedUsers', 'assignee')
                .where('task.groupId = :groupId', { groupId: internalGroupId })
                .andWhere('task.createdAt BETWEEN :start AND :end', { start: periodStart.toDate(), end: periodEnd.toDate() });
            if (options.userId) {
                taskAssignedQB = taskAssignedQB.andWhere('assignee.id = :uid', { uid: options.userId });
            }
            const totalAssigned = await taskAssignedQB.getCount();
            const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 1000) / 10 : 0;
            // นับจำนวนการตีกลับ (reject) จาก task.workflow.history ในช่วงเวลา
            // หมายเหตุ: ใช้วิธีโหลดเฉพาะงานที่อัพเดตในช่วงนี้ เพื่อลดภาระ
            let tasksQB = this.taskRepository
                .createQueryBuilder('task')
                .leftJoinAndSelect('task.assignedUsers', 'assignee')
                .where('task.groupId = :groupId', { groupId: internalGroupId })
                .andWhere('task.updatedAt BETWEEN :start AND :end', { start: periodStart.toDate(), end: periodEnd.toDate() });
            if (options.userId) {
                tasksQB = tasksQB.andWhere('assignee.id = :uid', { uid: options.userId });
            }
            const tasks = await tasksQB.getMany();
            let rejected = 0;
            for (const t of tasks) {
                const hist = (t.workflow?.history || []);
                if (!hist || hist.length === 0)
                    continue;
                for (const h of hist) {
                    if (h.action === 'reject' && h.at) {
                        const at = (0, moment_timezone_1.default)(h.at).tz(config_1.config.app.defaultTimezone);
                        if (at.isBetween(periodStart, periodEnd, undefined, '[]')) {
                            rejected++;
                        }
                    }
                }
            }
            return {
                periodStart: periodStart.toDate(),
                periodEnd: periodEnd.toDate(),
                totals: { completed, early, ontime, late, overtime, overdue, rejected, completionRate }
            };
        }
        catch (error) {
            console.error('❌ Error building report summary:', error);
            throw error;
        }
    }
    /** รายงานแยกตามบุคคลในกลุ่ม */
    async getReportByUsers(groupId, options = {}) {
        try {
            // รองรับ LINE Group ID และ 'default' → internal UUID
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId)
                return [];
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            const periodStart = options.startDate
                ? (0, moment_timezone_1.default)(options.startDate).tz(config_1.config.app.defaultTimezone)
                : options.period === 'monthly' ? now.clone().startOf('month') : now.clone().startOf('week');
            const periodEnd = options.endDate
                ? (0, moment_timezone_1.default)(options.endDate).tz(config_1.config.app.defaultTimezone)
                : options.period === 'monthly' ? now.clone().endOf('month') : now.clone().endOf('week');
            const rows = await this.kpiRepository
                .createQueryBuilder('kpi')
                .select([
                'kpi.userId as userId',
                'user.displayName as displayName',
                "SUM(CASE WHEN kpi.type IN ('assignee_early','assignee_ontime','assignee_late') THEN 1 ELSE 0 END) as completed",
                "SUM(CASE WHEN kpi.type = 'assignee_early' THEN 1 ELSE 0 END) as early",
                "SUM(CASE WHEN kpi.type = 'assignee_ontime' THEN 1 ELSE 0 END) as ontime",
                "SUM(CASE WHEN kpi.type = 'assignee_late' THEN 1 ELSE 0 END) as late",
                "SUM(CASE WHEN kpi.type = 'penalty_overdue' THEN 1 ELSE 0 END) as overdue"
            ])
                .leftJoin(models_1.User, 'user', 'user.id = kpi.userId')
                .where('kpi.groupId = :groupId', { groupId: internalGroupId })
                .andWhere('kpi.role = :role', { role: 'assignee' })
                .andWhere('kpi.eventDate BETWEEN :start AND :end', { start: periodStart.toDate(), end: periodEnd.toDate() })
                .groupBy('kpi.userId, user.displayName')
                .orderBy('completed', 'DESC')
                .getRawMany();
            return rows.map((r) => ({
                userId: r.userId,
                displayName: r.displayName,
                completed: parseInt(r.completed || '0'),
                early: parseInt(r.early || '0'),
                ontime: parseInt(r.ontime || '0'),
                late: parseInt(r.late || '0'),
                overtime: 0,
                overdue: parseInt(r.overdue || '0')
            }));
        }
        catch (error) {
            console.error('❌ Error getting report by users:', error);
            throw error;
        }
    }
    /**
     * บันทึกการทำงานเสร็จ
     */
    async recordTaskCompletion(task, completionType) {
        try {
            const eventDate = new Date();
            const weekOf = (0, moment_timezone_1.default)(eventDate).tz(config_1.config.app.defaultTimezone).startOf('week').toDate();
            const monthOf = (0, moment_timezone_1.default)(eventDate).tz(config_1.config.app.defaultTimezone).startOf('month').toDate();
            await this.removeLegacyOverdueRecords(task.id);
            const assigneeScores = config_1.config.app.kpiScoring.assignee;
            const creatorScores = config_1.config.app.kpiScoring.creator;
            const assigneeRecords = [];
            const assigneePoint = completionType === 'early'
                ? assigneeScores.early
                : completionType === 'ontime'
                    ? assigneeScores.ontime
                    : assigneeScores.late;
            for (const assignee of task.assignedUsers) {
                const record = this.kpiRepository.create({
                    userId: assignee.id,
                    groupId: task.groupId,
                    taskId: task.id,
                    type: completionType === 'early'
                        ? 'assignee_early'
                        : completionType === 'ontime'
                            ? 'assignee_ontime'
                            : 'assignee_late',
                    role: 'assignee',
                    points: assigneePoint,
                    eventDate,
                    weekOf,
                    monthOf,
                    metadata: { completionType }
                });
                const saved = await this.kpiRepository.save(record);
                assigneeRecords.push(saved);
                await this.maybeAwardStreakBonus({
                    userId: assignee.id,
                    groupId: task.groupId,
                    taskId: task.id,
                    eventDate,
                    weekOf,
                    monthOf
                });
            }
            const creatorRecords = [];
            if (task.createdBy) {
                const completionRecord = this.kpiRepository.create({
                    userId: task.createdBy,
                    groupId: task.groupId,
                    taskId: task.id,
                    type: 'creator_completion',
                    role: 'creator',
                    points: creatorScores.completion,
                    eventDate,
                    weekOf,
                    monthOf,
                    metadata: { completionType }
                });
                creatorRecords.push(await this.kpiRepository.save(completionRecord));
                if (completionType === 'early' || completionType === 'ontime') {
                    const onTimeRecord = this.kpiRepository.create({
                        userId: task.createdBy,
                        groupId: task.groupId,
                        taskId: task.id,
                        type: 'creator_ontime_bonus',
                        role: 'creator',
                        points: creatorScores.ontimeBonus,
                        eventDate,
                        weekOf,
                        monthOf,
                        metadata: { completionType }
                    });
                    creatorRecords.push(await this.kpiRepository.save(onTimeRecord));
                }
            }
            const allRecords = [...assigneeRecords, ...creatorRecords];
            console.log(`✅ Recorded KPI for task completion: ${task.title} (${completionType})`);
            return allRecords[0] || null;
        }
        catch (error) {
            console.error('❌ Error recording task completion:', error);
            throw error;
        }
    }
    /**
     * บันทึก KPI เมื่องานเกินเวลา (0 คะแนน)
     * เพื่อป้องกันการเล่นระบบโดยไม่ส่งงาน
     */
    async recordOverdueKPI(task) {
        try {
            const existing = await this.kpiRepository.find({
                where: {
                    taskId: task.id,
                    type: 'penalty_overdue'
                }
            });
            if (existing.length > 0) {
                return existing;
            }
            const eventDate = new Date();
            const weekOf = (0, moment_timezone_1.default)(eventDate).tz(config_1.config.app.defaultTimezone).startOf('week').toDate();
            const monthOf = (0, moment_timezone_1.default)(eventDate).tz(config_1.config.app.defaultTimezone).startOf('month').toDate();
            const penaltyPoints = config_1.config.app.kpiScoring.penalty.overdue7Days;
            const records = [];
            for (const assignee of task.assignedUsers) {
                const penaltyRecord = this.kpiRepository.create({
                    userId: assignee.id,
                    groupId: task.groupId,
                    taskId: task.id,
                    type: 'penalty_overdue',
                    role: 'penalty',
                    points: penaltyPoints,
                    eventDate,
                    weekOf,
                    monthOf,
                    metadata: { reason: 'overdue_7_days' }
                });
                records.push(await this.kpiRepository.save(penaltyRecord));
            }
            if (task.createdBy) {
                const creatorPenalty = this.kpiRepository.create({
                    userId: task.createdBy,
                    groupId: task.groupId,
                    taskId: task.id,
                    type: 'penalty_overdue',
                    role: 'penalty',
                    points: penaltyPoints,
                    eventDate,
                    weekOf,
                    monthOf,
                    metadata: { reason: 'overdue_7_days' }
                });
                records.push(await this.kpiRepository.save(creatorPenalty));
            }
            return records;
        }
        catch (error) {
            console.error('❌ Error recording overdue KPI:', error);
            throw error;
        }
    }
    /**
     * ลบ overdue KPI records เมื่องานถูกส่งแล้ว
     */
    async removeLegacyOverdueRecords(taskId) {
        try {
            await this.kpiRepository
                .createQueryBuilder()
                .delete()
                .from(models_1.KPIRecord)
                .where('taskId = :taskId', { taskId })
                .andWhere('type = :type', { type: 'overdue' })
                .execute();
        }
        catch (error) {
            console.error('❌ Error removing legacy overdue KPI records:', error);
        }
    }
    /**
     * คำนวณประเภทการทำงานเสร็จ
     */
    calculateCompletionType(task) {
        const dueTime = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone);
        const completedTime = (0, moment_timezone_1.default)(task.completedAt).tz(config_1.config.app.defaultTimezone);
        const diffMinutes = completedTime.diff(dueTime, 'minutes');
        if (diffMinutes <= -24 * 60) {
            return 'early';
        }
        if (diffMinutes <= 0) {
            return 'ontime';
        }
        return 'late';
    }
    async maybeAwardStreakBonus(params) {
        const { userId, groupId, taskId, eventDate, weekOf, monthOf } = params;
        try {
            const recentRecords = await this.kpiRepository
                .createQueryBuilder('kpi')
                .where('kpi.userId = :userId', { userId })
                .andWhere('kpi.groupId = :groupId', { groupId })
                .andWhere('kpi.role = :role', { role: 'assignee' })
                .orderBy('kpi.eventDate', 'DESC')
                .limit(10)
                .getMany();
            let streak = 0;
            for (const record of recentRecords) {
                if (record.type === 'assignee_early' || record.type === 'assignee_ontime') {
                    streak++;
                }
                else {
                    break;
                }
            }
            if (streak < 5 || streak % 5 !== 0) {
                return;
            }
            const existingBonus = await this.kpiRepository
                .createQueryBuilder('kpi')
                .where('kpi.userId = :userId', { userId })
                .andWhere('kpi.groupId = :groupId', { groupId })
                .andWhere('kpi.type = :type', { type: 'streak_bonus' })
                .andWhere("kpi.metadata ->> 'triggeredByTaskId' = :taskId", { taskId })
                .getOne();
            if (existingBonus) {
                return;
            }
            const bonusRecord = this.kpiRepository.create({
                userId,
                groupId,
                taskId,
                type: 'streak_bonus',
                role: 'bonus',
                points: config_1.config.app.kpiScoring.assignee.streakBonus,
                eventDate,
                weekOf,
                monthOf,
                metadata: {
                    streakCount: streak,
                    triggeredByTaskId: taskId
                }
            });
            await this.kpiRepository.save(bonusRecord);
            console.log(`🏅 Awarded streak bonus to user ${userId} (streak ${streak})`);
        }
        catch (error) {
            console.warn('⚠️ Failed to evaluate streak bonus:', error);
        }
    }
    /**
     * ดึง Leaderboard ของกลุ่ม (สูตรรวม 60/30/10)
     */
    async getGroupLeaderboard(groupId, period = 'weekly') {
        try {
            throttledLogger_1.throttledLogger.log('info', `🔍 Getting leaderboard for group: ${groupId}, period: ${period}`, 'get_leaderboard');
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId) {
                return [];
            }
            const members = await this.userRepository
                .createQueryBuilder('user')
                .leftJoin('user.groupMemberships', 'membership')
                .where('membership.groupId = :groupId', { groupId: internalGroupId })
                .select(['user.id', 'user.displayName', 'user.lineUserId'])
                .getMany();
            if (members.length === 0) {
                return [];
            }
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            let periodStart;
            if (period === 'weekly') {
                periodStart = now.clone().startOf('week').toDate();
            }
            else if (period === 'monthly') {
                periodStart = now.clone().startOf('month').toDate();
            }
            let kpiQuery = this.kpiRepository
                .createQueryBuilder('kpi')
                .select('kpi.userId', 'userId')
                .addSelect("SUM(CASE WHEN kpi.type IN ('assignee_early','assignee_ontime','assignee_late') THEN 1 ELSE 0 END)", 'assignmentsCompleted')
                .addSelect("SUM(CASE WHEN kpi.type IN ('assignee_early','assignee_ontime') THEN 1 ELSE 0 END)", 'assignmentsOnTime')
                .addSelect("SUM(CASE WHEN kpi.type = 'assignee_early' THEN 1 ELSE 0 END)", 'assignmentsEarly')
                .addSelect("SUM(CASE WHEN kpi.type = 'assignee_late' THEN 1 ELSE 0 END)", 'assignmentsLate')
                .addSelect("SUM(CASE WHEN kpi.type = 'penalty_overdue' THEN 1 ELSE 0 END)", 'penaltyCount')
                .addSelect("SUM(CASE WHEN kpi.type = 'streak_bonus' THEN kpi.points ELSE 0 END)", 'bonusPoints')
                .addSelect("SUM(CASE WHEN kpi.role = 'penalty' THEN kpi.points ELSE 0 END)", 'penaltyPoints')
                .addSelect('SUM(kpi.points)', 'totalRawPoints')
                .where('kpi.groupId = :groupId', { groupId: internalGroupId });
            if (period === 'weekly' && periodStart) {
                kpiQuery = kpiQuery.andWhere('kpi.weekOf = :weekOf', { weekOf: periodStart });
            }
            else if (period === 'monthly' && periodStart) {
                kpiQuery = kpiQuery.andWhere('kpi.monthOf = :monthOf', { monthOf: periodStart });
            }
            const kpiResults = await kpiQuery.groupBy('kpi.userId').getRawMany();
            const kpiMap = new Map();
            kpiResults.forEach((row) => {
                const userId = row.userId || row.userid;
                kpiMap.set(userId, {
                    assignmentsCompleted: parseInt(row.assignmentsCompleted || row.assignmentscompleted || '0'),
                    assignmentsOnTime: parseInt(row.assignmentsOnTime || row.assignmentsontime || '0'),
                    assignmentsEarly: parseInt(row.assignmentsEarly || row.assignmentsearly || '0'),
                    assignmentsLate: parseInt(row.assignmentsLate || row.assignmentslate || '0'),
                    penaltyCount: parseInt(row.penaltyCount || row.penaltycount || '0'),
                    bonusPoints: parseFloat(row.bonusPoints || row.bonuspoints) || 0,
                    penaltyPoints: parseFloat(row.penaltyPoints || row.penaltypoints) || 0,
                    totalRawPoints: parseFloat(row.totalRawPoints || row.totalrawpoints) || 0
                });
            });
            const memberMap = new Map(members.map(member => [member.id, member]));
            const missingIds = Array.from(kpiMap.keys()).filter(id => !memberMap.has(id));
            let extraUsers = [];
            if (missingIds.length > 0) {
                extraUsers = await this.userRepository
                    .createQueryBuilder('user')
                    .select(['user.id', 'user.displayName', 'user.lineUserId'])
                    .where('user.id IN (:...ids)', { ids: missingIds })
                    .getMany();
            }
            const displayUsers = [...members, ...extraUsers];
            let creatorQuery = this.taskRepository
                .createQueryBuilder('task')
                .select('task.createdBy', 'createdBy')
                .addSelect('COUNT(*)', 'createdCount')
                .addSelect("SUM(CASE WHEN task.status = 'completed' THEN 1 ELSE 0 END)", 'completedCount')
                .where('task.groupId = :groupId', { groupId: internalGroupId });
            if (period === 'weekly' && periodStart) {
                creatorQuery = creatorQuery
                    .addSelect("SUM(CASE WHEN task.completedAt IS NOT NULL AND task.completedAt >= :periodStart THEN 1 ELSE 0 END)", 'completedCountPeriod')
                    .addSelect("SUM(CASE WHEN task.createdAt >= :periodStart THEN 1 ELSE 0 END)", 'createdCountPeriod')
                    .setParameters({ periodStart });
            }
            else if (period === 'monthly' && periodStart) {
                creatorQuery = creatorQuery
                    .addSelect("SUM(CASE WHEN task.completedAt IS NOT NULL AND task.completedAt >= :periodStart THEN 1 ELSE 0 END)", 'completedCountPeriod')
                    .addSelect("SUM(CASE WHEN task.createdAt >= :periodStart THEN 1 ELSE 0 END)", 'createdCountPeriod')
                    .setParameters({ periodStart });
            }
            const creatorRows = await creatorQuery.groupBy('task.createdBy').getRawMany();
            const creatorMap = new Map();
            creatorRows.forEach((row) => {
                const userId = row.createdBy || row.createdby;
                if (!userId)
                    return;
                if (period === 'weekly' || period === 'monthly') {
                    const createdInPeriod = parseInt(row.createdCountPeriod || row.createdcountperiod || '0');
                    const completedInPeriod = parseInt(row.completedCountPeriod || row.completedcountperiod || '0');
                    creatorMap.set(userId, { created: createdInPeriod, completed: completedInPeriod });
                }
                else {
                    creatorMap.set(userId, {
                        created: parseInt(row.createdCount || row.createdcount || '0'),
                        completed: parseInt(row.completedCount || row.completedcount || '0')
                    });
                }
            });
            const weights = config_1.config.app.kpiScoring.weights;
            const leaderboard = [];
            for (const member of displayUsers) {
                const kpiData = kpiMap.get(member.id) || {
                    assignmentsCompleted: 0,
                    assignmentsOnTime: 0,
                    assignmentsEarly: 0,
                    assignmentsLate: 0,
                    penaltyCount: 0,
                    bonusPoints: 0,
                    penaltyPoints: 0,
                    totalRawPoints: 0
                };
                const creatorData = creatorMap.get(member.id) || { created: 0, completed: 0 };
                const onTimeRate = kpiData.assignmentsCompleted > 0
                    ? (kpiData.assignmentsOnTime / kpiData.assignmentsCompleted) * 100
                    : 0;
                const createdCompletedRate = creatorData.created > 0
                    ? (creatorData.completed / creatorData.created) * 100
                    : 0;
                const consistencyScore = Math.min(Math.max(kpiData.bonusPoints, 0), 100);
                const totalScoreRaw = (onTimeRate * weights.onTimeDelivery)
                    + (createdCompletedRate * weights.createdCompleted)
                    + (consistencyScore * weights.consistencyBonus)
                    + kpiData.penaltyPoints;
                const totalScore = Math.round(totalScoreRaw * 10) / 10;
                let trend = 'same';
                try {
                    trend = await this.calculateTrend(member.id, internalGroupId, period);
                }
                catch (error) {
                    console.warn(`⚠️ Error calculating trend for user ${member.id}:`, error);
                }
                leaderboard.push({
                    userId: member.id,
                    displayName: member.displayName || 'ไม่ทราบชื่อ',
                    weeklyPoints: period === 'weekly' ? totalScore : 0,
                    monthlyPoints: period === 'monthly' ? totalScore : 0,
                    totalPoints: Math.round(kpiData.totalRawPoints * 10) / 10,
                    tasksCompleted: kpiData.assignmentsCompleted,
                    tasksEarly: kpiData.assignmentsEarly,
                    tasksOnTime: kpiData.assignmentsOnTime,
                    tasksLate: kpiData.assignmentsLate,
                    tasksOverdue: kpiData.penaltyCount,
                    onTimeRate: Math.round(onTimeRate * 10) / 10,
                    createdCompletedRate: Math.round(createdCompletedRate * 10) / 10,
                    consistencyScore: Math.round(consistencyScore * 10) / 10,
                    bonusPoints: Math.round(kpiData.bonusPoints * 10) / 10,
                    penaltyPoints: Math.round(kpiData.penaltyPoints * 10) / 10,
                    totalScore,
                    rank: 0,
                    trend
                });
            }
            leaderboard.sort((a, b) => b.totalScore - a.totalScore);
            leaderboard.forEach((item, index) => {
                item.rank = index + 1;
            });
            return leaderboard;
        }
        catch (error) {
            console.error('❌ Error getting group leaderboard:', error);
            throw error;
        }
    }
    /**
     * สร้างข้อมูล KPI ตัวอย่างสำหรับทดสอบ
     */
    async createSampleKPIData(groupId) {
        try {
            // รองรับ LINE Group ID → internal UUID
            let internalGroupId = groupId;
            const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
            if (groupByLineId) {
                internalGroupId = groupByLineId.id;
            }
            // ดึงสมาชิกในกลุ่ม
            const members = await this.userRepository
                .createQueryBuilder('user')
                .leftJoin('user.groupMemberships', 'membership')
                .where('membership.groupId = :groupId', { groupId: internalGroupId })
                .getMany();
            if (members.length === 0) {
                console.log('⚠️ No members found in group to create sample KPI data');
                return;
            }
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            const weekOf = now.clone().startOf('week').toDate();
            const monthOf = now.clone().startOf('month').toDate();
            // สร้างข้อมูล KPI ตัวอย่างสำหรับสมาชิกแต่ละคน
            for (const member of members) {
                // สร้าง 3-5 records ต่อคน
                const recordCount = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < recordCount; i++) {
                    const completionPool = [
                        {
                            type: 'assignee_early',
                            role: 'assignee',
                            points: config_1.config.app.kpiScoring.assignee.early,
                            metadata: { completionType: 'early' }
                        },
                        {
                            type: 'assignee_ontime',
                            role: 'assignee',
                            points: config_1.config.app.kpiScoring.assignee.ontime,
                            metadata: { completionType: 'ontime' }
                        },
                        {
                            type: 'assignee_late',
                            role: 'assignee',
                            points: config_1.config.app.kpiScoring.assignee.late,
                            metadata: { completionType: 'late' }
                        }
                    ];
                    const randomEntry = completionPool[Math.floor(Math.random() * completionPool.length)];
                    const dummyTaskId = `dummy-task-${member.id}-${i}`;
                    const kpiRecord = this.kpiRepository.create({
                        userId: member.id,
                        groupId: internalGroupId,
                        taskId: dummyTaskId,
                        type: randomEntry.type,
                        role: randomEntry.role,
                        points: randomEntry.points,
                        metadata: randomEntry.metadata,
                        eventDate: now.clone().subtract(Math.floor(Math.random() * 7), 'days').toDate(),
                        weekOf,
                        monthOf
                    });
                    await this.kpiRepository.save(kpiRecord);
                }
            }
            console.log(`✅ Created sample KPI data for ${members.length} members`);
        }
        catch (error) {
            console.error('❌ Error creating sample KPI data:', error);
            throw error;
        }
    }
    /**
     * คำนวณค่าเฉลี่ยคะแนนของผู้ใช้
     */
    async getUserAverageScore(userId, groupId, period = 'weekly') {
        try {
            let queryBuilder = this.kpiRepository
                .createQueryBuilder('kpi')
                .select('AVG(kpi.points)', 'averagePoints')
                .where('kpi.userId = :userId', { userId })
                .andWhere('kpi.groupId = :groupId', { groupId });
            // เพิ่ม date filter ตาม period
            switch (period) {
                case 'weekly':
                    const weekStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').toDate();
                    queryBuilder = queryBuilder.andWhere('kpi.weekOf = :weekStart', { weekStart });
                    break;
                case 'monthly':
                    const monthStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('month').toDate();
                    queryBuilder = queryBuilder.andWhere('kpi.monthOf = :monthStart', { monthStart });
                    break;
                // 'all' ไม่ต้องกรอง
            }
            const result = await queryBuilder.getRawOne();
            if (!result || result.averagePoints === null || result.averagePoints === undefined) {
                return 0;
            }
            const averagePoints = parseFloat(result.averagePoints);
            return isNaN(averagePoints) ? 0 : averagePoints;
        }
        catch (error) {
            console.error('❌ Error calculating user average score:', error);
            return 0;
        }
    }
    /**
     * ดึงสถิติคะแนนรายสัปดาห์ของผู้ใช้
     */
    async getUserWeeklyScoreHistory(userId, groupId, weeks = 8) {
        try {
            const history = [];
            const currentWeek = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week');
            for (let i = 0; i < weeks; i++) {
                const weekStart = (0, moment_timezone_1.default)(currentWeek).subtract(i, 'weeks').toDate();
                const weekEnd = (0, moment_timezone_1.default)(currentWeek).subtract(i - 1, 'weeks').toDate();
                const result = await this.kpiRepository
                    .createQueryBuilder('kpi')
                    .select([
                    'AVG(kpi.points) as averageScore',
                    'COUNT(*) as totalTasks'
                ])
                    .where('kpi.userId = :userId', { userId })
                    .andWhere('kpi.groupId = :groupId', { groupId })
                    .andWhere('kpi.weekOf = :weekStart', { weekStart })
                    .getRawOne();
                if (result) {
                    const averageScore = result.averageScore !== null && result.averageScore !== undefined ? parseFloat(result.averageScore) : 0;
                    const totalTasks = result.totalTasks !== null && result.totalTasks !== undefined ? parseInt(result.totalTasks) : 0;
                    history.unshift({
                        week: (0, moment_timezone_1.default)(weekStart).format('YYYY-MM-DD'),
                        averageScore: isNaN(averageScore) ? 0 : averageScore,
                        totalTasks: isNaN(totalTasks) ? 0 : totalTasks
                    });
                }
                else {
                    history.unshift({
                        week: (0, moment_timezone_1.default)(weekStart).format('YYYY-MM-DD'),
                        averageScore: 0,
                        totalTasks: 0
                    });
                }
            }
            return history;
        }
        catch (error) {
            console.error('❌ Error getting user weekly score history:', error);
            return [];
        }
    }
    /**
     * ดึงสถิติตามช่วงเวลา
     */
    async getStatsByPeriod(groupId, period = 'this_week') {
        try {
            // รองรับ LINE Group ID และ 'default' → internal UUID
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId) {
                return {
                    totalTasks: 0,
                    completedTasks: 0,
                    pendingTasks: 0,
                    overdueTasks: 0,
                    avgCompletionTime: 0,
                    topPerformer: 'ไม่มีข้อมูล',
                    period: period === 'this_week' ? 'สัปดาห์นี้' : period === 'last_week' ? 'สัปดาห์ก่อน' : 'ทั้งหมด'
                };
            }
            let startDate = null;
            let endDate = null;
            let periodLabel = '';
            // กำหนดช่วงเวลาตาม period
            switch (period) {
                case 'this_week':
                    startDate = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').toDate();
                    endDate = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).endOf('week').toDate();
                    periodLabel = 'สัปดาห์นี้';
                    break;
                case 'last_week':
                    startDate = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).subtract(1, 'week').startOf('week').toDate();
                    endDate = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).subtract(1, 'week').endOf('week').toDate();
                    periodLabel = 'สัปดาห์ก่อน';
                    break;
                case 'all':
                    startDate = null;
                    endDate = null;
                    periodLabel = 'ทั้งหมด';
                    break;
            }
            // สร้าง query builder สำหรับงานทั้งหมด
            let totalTasksQuery = this.taskRepository
                .createQueryBuilder('task')
                .where('task.groupId = :groupId', { groupId: internalGroupId });
            // สร้าง query builder สำหรับงานที่เสร็จ
            let completedTasksQuery = this.taskRepository
                .createQueryBuilder('task')
                .where('task.groupId = :groupId', { groupId: internalGroupId })
                .andWhere('task.status = :status', { status: 'completed' });
            // สร้าง query builder สำหรับงานที่ค้าง (จำกัดช่วงเวลาหากระบุ period)
            let pendingTasksQuery = this.taskRepository
                .createQueryBuilder('task')
                .where('task.groupId = :groupId', { groupId: internalGroupId })
                .andWhere('task.status = :status', { status: 'pending' });
            // สร้าง query builder สำหรับงานที่เกินกำหนด (จำกัดช่วงเวลาหากระบุ period)
            let overdueTasksQuery = this.taskRepository
                .createQueryBuilder('task')
                .where('task.groupId = :groupId', { groupId: internalGroupId })
                .andWhere('task.status = :status', { status: 'overdue' });
            // เพิ่มเงื่อนไขช่วงเวลาถ้าไม่ใช่ 'all'
            if (period !== 'all') {
                totalTasksQuery = totalTasksQuery
                    .andWhere('task.createdAt >= :startDate', { startDate })
                    .andWhere('task.createdAt <= :endDate', { endDate });
                completedTasksQuery = completedTasksQuery
                    .andWhere('task.completedAt >= :startDate', { startDate })
                    .andWhere('task.completedAt <= :endDate', { endDate });
                // สำหรับงานค้างและงานเกินกำหนด ให้จำกัดตามกำหนดส่ง (dueTime) ภายในช่วงสัปดาห์/เดือนเดียวกัน
                // เพื่อให้สรุปรายสัปดาห์/รายเดือนสอดคล้องกับแดชบอร์ด
                pendingTasksQuery = pendingTasksQuery
                    .andWhere('task.dueTime >= :startDate', { startDate })
                    .andWhere('task.dueTime <= :endDate', { endDate });
                overdueTasksQuery = overdueTasksQuery
                    .andWhere('task.dueTime >= :startDate', { startDate })
                    .andWhere('task.dueTime <= :endDate', { endDate });
            }
            // ดึงข้อมูลสถิติ
            const [totalTasks, completedTasks, pendingTasks, overdueTasks] = await Promise.all([
                totalTasksQuery.getCount(),
                completedTasksQuery.getCount(),
                pendingTasksQuery.getCount(),
                overdueTasksQuery.getCount()
            ]);
            // ผู้ทำงานดีที่สุดตามช่วงเวลา
            const leaderboardPeriod = period === 'all' ? 'all' : 'weekly';
            const leaderboard = await this.getGroupLeaderboard(internalGroupId, leaderboardPeriod);
            const topPerformer = leaderboard.length > 0 ? leaderboard[0].displayName : 'ไม่มีข้อมูล';
            // เวลาเฉลี่ยในการทำงาน (ชั่วโมง)
            let avgCompletionTime = 0;
            if (period !== 'all') {
                const completedTasksWithTime = await this.taskRepository
                    .createQueryBuilder('task')
                    .select(['task.dueTime', 'task.completedAt'])
                    .where('task.groupId = :groupId', { groupId: internalGroupId })
                    .andWhere('task.status = :status', { status: 'completed' })
                    .andWhere('task.completedAt >= :startDate', { startDate })
                    .andWhere('task.completedAt <= :endDate', { endDate })
                    .getMany();
                if (completedTasksWithTime.length > 0) {
                    const totalTime = completedTasksWithTime.reduce((sum, task) => {
                        const diff = (0, moment_timezone_1.default)(task.completedAt).tz(config_1.config.app.defaultTimezone).diff((0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone), 'hours');
                        return sum + Math.abs(diff);
                    }, 0);
                    avgCompletionTime = totalTime / completedTasksWithTime.length;
                }
            }
            else {
                // สำหรับ 'all' ให้คำนวณจากงานที่เสร็จทั้งหมด
                const completedTasksWithTime = await this.taskRepository
                    .createQueryBuilder('task')
                    .select(['task.dueTime', 'task.completedAt'])
                    .where('task.groupId = :groupId', { groupId: internalGroupId })
                    .andWhere('task.status = :status', { status: 'completed' })
                    .getMany();
                if (completedTasksWithTime.length > 0) {
                    const totalTime = completedTasksWithTime.reduce((sum, task) => {
                        const diff = (0, moment_timezone_1.default)(task.completedAt).tz(config_1.config.app.defaultTimezone).diff((0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone), 'hours');
                        return sum + Math.abs(diff);
                    }, 0);
                    avgCompletionTime = totalTime / completedTasksWithTime.length;
                }
            }
            return {
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
                topPerformer,
                period: periodLabel
            };
        }
        catch (error) {
            console.error('❌ Error getting stats by period:', error);
            throw error;
        }
    }
    /**
     * ดึงสถิติรายสัปดาห์ (backward compatibility)
     */
    async getWeeklyStats(groupId) {
        const stats = await this.getStatsByPeriod(groupId, 'this_week');
        return {
            totalTasks: stats.totalTasks,
            completedTasks: stats.completedTasks,
            pendingTasks: stats.pendingTasks,
            overdueTasks: stats.overdueTasks,
            avgCompletionTime: stats.avgCompletionTime,
            topPerformer: stats.topPerformer
        };
    }
    /**
     * ดึงสถิติส่วนบุคคล
     */
    async getUserStats(userId, groupId, period = 'all') {
        try {
            // รองรับ LINE Group ID และ 'default' → internal UUID
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId) {
                return {
                    totalPoints: 0,
                    rank: 0,
                    tasksCompleted: 0,
                    tasksEarly: 0,
                    tasksOnTime: 0,
                    tasksLate: 0,
                    tasksOverdue: 0,
                    bonusPoints: 0,
                    penaltyPoints: 0,
                    completionRate: 0,
                    avgPointsPerTask: 0
                };
            }
            let dateFilter = {};
            switch (period) {
                case 'weekly':
                    const weekStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').toDate();
                    dateFilter = { weekOf: weekStart };
                    break;
                case 'monthly':
                    const monthStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('month').toDate();
                    dateFilter = { monthOf: monthStart };
                    break;
            }
            // คะแนนและสถิติของผู้ใช้
            const userStats = await this.kpiRepository
                .createQueryBuilder('kpi')
                .select([
                'SUM(kpi.points) as totalPoints',
                "SUM(CASE WHEN kpi.type IN ('assignee_early','assignee_ontime','assignee_late') THEN 1 ELSE 0 END) as tasksCompleted",
                "SUM(CASE WHEN kpi.type = 'assignee_early' THEN 1 ELSE 0 END) as tasksEarly",
                "SUM(CASE WHEN kpi.type = 'assignee_ontime' THEN 1 ELSE 0 END) as tasksOnTime",
                "SUM(CASE WHEN kpi.type = 'assignee_late' THEN 1 ELSE 0 END) as tasksLate",
                "SUM(CASE WHEN kpi.type = 'penalty_overdue' THEN 1 ELSE 0 END) as tasksOverdue",
                "SUM(CASE WHEN kpi.type = 'streak_bonus' THEN kpi.points ELSE 0 END) as bonusPoints",
                "SUM(CASE WHEN kpi.role = 'penalty' THEN kpi.points ELSE 0 END) as penaltyPoints"
            ])
                .where('kpi.userId = :userId', { userId })
                .andWhere('kpi.groupId = :groupId', { groupId: internalGroupId })
                .andWhere(dateFilter)
                .getRawOne();
            // หาอันดับ
            const leaderboard = await this.getGroupLeaderboard(internalGroupId, period);
            const userRank = leaderboard.find(u => u.userId === userId)?.rank || 0;
            // งานทั้งหมดที่ได้รับมอบหมาย
            const totalAssignedTasks = await this.taskRepository
                .createQueryBuilder('task')
                .leftJoin('task.assignedUsers', 'user')
                .where('user.id = :userId', { userId })
                .andWhere('task.groupId = :groupId', { groupId: internalGroupId })
                .getCount();
            const tasksCompleted = parseInt(userStats?.tasksCompleted || '0');
            const totalPoints = parseFloat(userStats?.totalPoints || '0');
            const completionRate = totalAssignedTasks > 0 ? (tasksCompleted / totalAssignedTasks) * 100 : 0;
            const avgPointsPerTask = tasksCompleted > 0 ? totalPoints / tasksCompleted : 0;
            return {
                totalPoints: Math.round(totalPoints * 10) / 10,
                rank: userRank,
                tasksCompleted,
                tasksEarly: parseInt(userStats?.tasksEarly || '0'),
                tasksOnTime: parseInt(userStats?.tasksOnTime || '0'),
                tasksLate: parseInt(userStats?.tasksLate || '0'),
                tasksOverdue: parseInt(userStats?.tasksOverdue || '0'),
                bonusPoints: parseFloat(userStats?.bonusPoints || '0') || 0,
                penaltyPoints: parseFloat(userStats?.penaltyPoints || '0') || 0,
                completionRate: Math.round(completionRate * 10) / 10,
                avgPointsPerTask: Math.round(avgPointsPerTask * 10) / 10
            };
        }
        catch (error) {
            console.error('❌ Error getting user stats:', error);
            throw error;
        }
    }
    /**
     * อัปเดต rankings ของ leaderboard
     */
    async updateLeaderboardRankings() {
        try {
            console.log('📈 Updating leaderboard rankings...');
            const groups = await this.groupRepository.find();
            for (const group of groups) {
                // อัปเดต weekly rankings
                await this.getGroupLeaderboard(group.id, 'weekly');
                // อัปเดต monthly rankings  
                await this.getGroupLeaderboard(group.id, 'monthly');
            }
            console.log('✅ Leaderboard rankings updated');
        }
        catch (error) {
            console.error('❌ Error updating leaderboard rankings:', error);
            throw error;
        }
    }
    /**
     * ทำความสะอาดข้อมูลเก่า
     */
    async cleanupOldRecords(daysToKeep = 365) {
        try {
            const cutoffDate = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).subtract(daysToKeep, 'days').toDate();
            const result = await this.kpiRepository.delete({
                eventDate: {
                    $lt: cutoffDate
                }
            });
            const deletedCount = result.affected || 0;
            console.log(`🗑️ Cleaned up ${deletedCount} old KPI records`);
            return deletedCount;
        }
        catch (error) {
            console.error('❌ Error cleaning up old KPI records:', error);
            throw error;
        }
    }
    /**
     * ส่งออกข้อมูล KPI
     */
    async exportKPIData(groupId, startDate, endDate) {
        try {
            const records = await this.kpiRepository
                .createQueryBuilder('kpi')
                .leftJoinAndSelect('kpi.user', 'user')
                .leftJoinAndSelect('kpi.task', 'task')
                .where('kpi.groupId = :groupId', { groupId })
                .andWhere('kpi.eventDate BETWEEN :startDate AND :endDate', { startDate, endDate })
                .orderBy('kpi.eventDate', 'DESC')
                .getMany();
            return records.map((record) => ({
                วันที่: (0, moment_timezone_1.default)(record.eventDate).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY'),
                ผู้ใช้: record.user.displayName,
                งาน: record.task.title,
                ประเภท: record.type,
                คะแนน: record.points,
                สัปดาห์: (0, moment_timezone_1.default)(record.weekOf).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY'),
                เดือน: (0, moment_timezone_1.default)(record.monthOf).tz(config_1.config.app.defaultTimezone).format('MM/YYYY')
            }));
        }
        catch (error) {
            console.error('❌ Error exporting KPI data:', error);
            throw error;
        }
    }
    // Helper Methods
    /**
     * คำนวณ trend ของคะแนน (เปรียบเทียบกับช่วงก่อน)
     */
    async calculateTrend(userId, groupId, period) {
        try {
            if (period === 'all')
                return 'same';
            let currentPeriod;
            let previousPeriod;
            // ใช้ try-catch สำหรับ timezone operations
            try {
                // หาคะแนนปัจจุบัน
                currentPeriod = period === 'weekly'
                    ? (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').toDate()
                    : (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('month').toDate();
                // หาคะแนนช่วงก่อน
                previousPeriod = period === 'weekly'
                    ? (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).subtract(1, 'week').startOf('week').toDate()
                    : (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).subtract(1, 'month').startOf('month').toDate();
            }
            catch (timezoneError) {
                console.warn('⚠️ Timezone error in calculateTrend, using local time:', timezoneError);
                // Fallback to local time
                const now = new Date();
                if (period === 'weekly') {
                    currentPeriod = new Date(now);
                    currentPeriod.setDate(now.getDate() - now.getDay());
                    currentPeriod.setHours(0, 0, 0, 0);
                    previousPeriod = new Date(currentPeriod);
                    previousPeriod.setDate(previousPeriod.getDate() - 7);
                }
                else {
                    currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
                    previousPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                }
            }
            const currentPoints = await this.kpiRepository
                .createQueryBuilder('kpi')
                .select('COALESCE(SUM(kpi.points), 0)', 'points')
                .where('kpi.userId = :userId', { userId })
                .andWhere('kpi.groupId = :groupId', { groupId })
                .andWhere(period === 'weekly' ? 'kpi.weekOf = :period' : 'kpi.monthOf = :period', { period: currentPeriod })
                .getRawOne();
            const previousPoints = await this.kpiRepository
                .createQueryBuilder('kpi')
                .select('COALESCE(SUM(kpi.points), 0)', 'points')
                .where('kpi.userId = :userId', { userId })
                .andWhere('kpi.groupId = :groupId', { groupId })
                .andWhere(period === 'weekly' ? 'kpi.weekOf = :period' : 'kpi.monthOf = :period', { period: previousPeriod })
                .getRawOne();
            const current = parseInt(currentPoints?.points || '0');
            const previous = parseInt(previousPoints?.points || '0');
            if (current > previous)
                return 'up';
            if (current < previous)
                return 'down';
            return 'same';
        }
        catch (error) {
            console.error('❌ Error calculating trend:', error);
            return 'same';
        }
    }
    /**
     * ดึงสถิติรายวันสำหรับรายงานผู้จัดการ
     */
    async getDailyStats(groupId) {
        try {
            // รองรับ LINE Group ID → internal UUID
            let internalGroupId = groupId;
            const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
            if (groupByLineId)
                internalGroupId = groupByLineId.id;
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            const today = now.clone().startOf('day').toDate();
            const tomorrow = now.clone().add(1, 'day').startOf('day').toDate();
            // งานทั้งหมดในกลุ่ม (ที่ยังไม่ถูกยกเลิก)
            const totalTasks = await this.taskRepository.count({
                where: {
                    groupId: internalGroupId,
                    status: { $ne: 'cancelled' }
                }
            });
            // งานที่เสร็จแล้วทั้งหมดในกลุ่ม (ไม่จำกัดวัน)
            const completedTasks = await this.taskRepository.count({
                where: {
                    groupId: internalGroupId,
                    status: 'completed'
                }
            });
            // งานที่เกินกำหนด (ทั้งหมดในกลุ่ม)
            const overdueTasks = await this.taskRepository.count({
                where: {
                    groupId: internalGroupId,
                    status: 'overdue'
                }
            });
            // งานที่รอการตรวจ (สถานะ in_progress)
            const pendingReviewTasks = await this.taskRepository.count({
                where: {
                    groupId: internalGroupId,
                    status: 'in_progress'
                }
            });
            // คำนวณงานที่รอดำเนินการ (pending)
            const pendingTasks = totalTasks - completedTasks - overdueTasks - pendingReviewTasks;
            console.log(`📊 Daily stats for group ${groupId}:`);
            console.log(`   - Total tasks: ${totalTasks}`);
            console.log(`   - Completed: ${completedTasks}`);
            console.log(`   - Overdue: ${overdueTasks}`);
            console.log(`   - Pending review: ${pendingReviewTasks}`);
            console.log(`   - Pending: ${pendingTasks}`);
            console.log(`   - Sum check: ${completedTasks + overdueTasks + pendingReviewTasks + pendingTasks} = ${totalTasks}`);
            return {
                totalTasks,
                completedTasks,
                overdueTasks,
                pendingReviewTasks,
                pendingTasks
            };
        }
        catch (error) {
            console.error('❌ Error getting daily stats:', error);
            return {
                totalTasks: 0,
                completedTasks: 0,
                overdueTasks: 0,
                pendingReviewTasks: 0,
                pendingTasks: 0
            };
        }
    }
    /**
     * อัปเดตสถิติกลุ่ม
     */
    async updateGroupStats(groupId) {
        try {
            // รองรับ LINE Group ID → internal UUID
            let internalGroupId = groupId;
            const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
            if (groupByLineId)
                internalGroupId = groupByLineId.id;
            // อัปเดตสถิติรายสัปดาห์
            await this.updateWeeklyStats(internalGroupId);
            // อัปเดตสถิติรายเดือน
            await this.updateMonthlyStats(internalGroupId);
        }
        catch (error) {
            console.error('❌ Error updating group stats:', error);
        }
    }
    /**
     * อัปเดตสถิติรายสัปดาห์
     */
    async updateWeeklyStats(groupId) {
        try {
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            const weekStart = now.clone().startOf('week');
            const weekEnd = now.clone().endOf('week');
            // คำนวณสถิติรายสัปดาห์
            const weeklyStats = await this.getReportSummary(groupId, {
                startDate: weekStart.toDate(),
                endDate: weekEnd.toDate(),
                period: 'weekly'
            });
            // บันทึกลงฐานข้อมูล (ในอนาคต)
            console.log(`📊 Updated weekly stats for group ${groupId}:`, weeklyStats);
        }
        catch (error) {
            console.error('❌ Error updating weekly stats:', error);
        }
    }
    /**
     * อัปเดตสถิติรายเดือน
     */
    async updateMonthlyStats(groupId) {
        try {
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            const monthStart = now.clone().startOf('month');
            const monthEnd = now.clone().endOf('month');
            // คำนวณสถิติรายเดือน
            const monthlyStats = await this.getReportSummary(groupId, {
                startDate: monthStart.toDate(),
                endDate: monthEnd.toDate(),
                period: 'monthly'
            });
            // บันทึกลงฐานข้อมูล (ในอนาคต)
            console.log(`📊 Updated monthly stats for group ${groupId}:`, monthlyStats);
        }
        catch (error) {
            console.error('❌ Error updating monthly stats:', error);
        }
    }
    /**
     * อัปเดต Leaderboard ของกลุ่ม
     */
    async updateGroupLeaderboard(groupId, period) {
        try {
            // รองรับ LINE Group ID และ 'default' → internal UUID
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId)
                return;
            // อัปเดต Leaderboard
            const leaderboard = await this.getGroupLeaderboard(internalGroupId, period);
            // บันทึกลงฐานข้อมูล (ในอนาคต)
            console.log(`🏆 Updated ${period} leaderboard for group ${groupId}:`, leaderboard.length, 'users');
        }
        catch (error) {
            console.error('❌ Error updating group leaderboard:', error);
        }
    }
    /**
     * ซิงค์และคำนวณคะแนน leaderboard ใหม่จากงานทั้งหมด
     */
    async syncLeaderboardScores(groupId, period) {
        try {
            throttledLogger_1.throttledLogger.log('info', `🔄 Starting leaderboard sync for group: ${groupId}, period: ${period}`);
            // รองรับ LINE Group ID และ 'default' → internal UUID
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId) {
                return {
                    processedTasks: 0,
                    updatedUsers: 0,
                    details: {
                        completedTasks: 0,
                        overdueTasks: 0,
                        earlyCompletions: 0,
                        onTimeCompletions: 0,
                        lateCompletions: 0,
                        penaltyRecords: 0
                    }
                };
            }
            // กำหนดช่วงเวลาตาม period
            const now = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone);
            let startDate;
            let endDate;
            if (period === 'weekly') {
                startDate = now.clone().startOf('week').toDate();
                endDate = now.clone().endOf('week').toDate();
            }
            else if (period === 'monthly') {
                startDate = now.clone().startOf('month').toDate();
                endDate = now.clone().endOf('month').toDate();
            }
            else {
                // 'all' - ใช้ข้อมูลทั้งหมด
                startDate = new Date(0); // เริ่มต้นจากปี 1970
                endDate = now.toDate();
            }
            // ดึงงานทั้งหมดในกลุ่มที่เกี่ยวข้องกับช่วงเวลานั้น
            let tasksQuery = this.taskRepository
                .createQueryBuilder('task')
                .leftJoinAndSelect('task.assignedUsers', 'assignee')
                .where('task.groupId = :groupId', { groupId: internalGroupId });
            if (period === 'weekly' || period === 'monthly') {
                // สำหรับ weekly/monthly: ดึงงานที่เสร็จหรือเกินกำหนดในช่วงเวลานั้น
                tasksQuery = tasksQuery.andWhere('(task.completedAt BETWEEN :startDate AND :endDate OR ' +
                    'task.dueTime < :now OR ' +
                    'task.status = :overdueStatus)', {
                    startDate,
                    endDate,
                    now: now.toDate(),
                    overdueStatus: 'overdue'
                });
            }
            else {
                // สำหรับ 'all': ดึงงานทั้งหมดในกลุ่ม
                console.log(`🔍 Fetching ALL tasks for group ${internalGroupId} (no date filter)`);
            }
            const tasks = await tasksQuery.getMany();
            console.log(`📋 Found ${tasks.length} tasks to process for ${period} period`);
            // แสดงรายละเอียดงานที่ถูกดึง
            if (tasks.length > 0) {
                const taskSummary = tasks.reduce((acc, task) => {
                    const status = task.status || 'unknown';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});
                console.log(`📊 Task breakdown:`, taskSummary);
                // แสดงตัวอย่างงาน 3 ชิ้นแรก
                const sampleTasks = tasks.slice(0, 3).map(task => ({
                    id: task.id,
                    title: task.title?.substring(0, 30) + '...',
                    status: task.status,
                    dueTime: task.dueTime,
                    completedAt: task.completedAt,
                    assignees: task.assignedUsers.length
                }));
                console.log(`🔍 Sample tasks:`, sampleTasks);
            }
            // ลบ KPI records เก่าสำหรับช่วงเวลานี้ (อิง weekOf/monthOf เพื่อลด timezone issue)
            const deleteQB = this.kpiRepository
                .createQueryBuilder()
                .delete()
                .where('groupId = :groupId', { groupId: internalGroupId });
            if (period === 'weekly') {
                deleteQB.andWhere('weekOf = :weekStart', { weekStart: (0, moment_timezone_1.default)(startDate).tz(config_1.config.app.defaultTimezone).startOf('week').toDate() });
            }
            else if (period === 'monthly') {
                deleteQB.andWhere('monthOf = :monthStart', { monthStart: (0, moment_timezone_1.default)(startDate).tz(config_1.config.app.defaultTimezone).startOf('month').toDate() });
            }
            else {
                // all: ไม่ลบทั้งหมด ป้องกันข้อมูลสะสมสูญหาย
            }
            const deletedRecords = await deleteQB.execute();
            console.log(`🗑️ Deleted ${deletedRecords.affected || 0} old KPI records`);
            // ตัวแปรสำหรับเก็บสถิติ
            let processedTasks = 0;
            let completedTasks = 0;
            let overdueTasks = 0;
            let earlyCompletions = 0;
            let onTimeCompletions = 0;
            let lateCompletions = 0;
            let penaltyRecords = 0;
            const processedUsers = new Set();
            // ประมวลผลงานแต่ละชิ้น
            for (const task of tasks) {
                try {
                    if (task.assignedUsers.length === 0) {
                        console.log(`⚠️ Task ${task.id} has no assignees, skipping`);
                        continue;
                    }
                    processedTasks++;
                    if (task.status === 'completed' && task.completedAt) {
                        const completionType = this.calculateCompletionType(task);
                        await this.recordTaskCompletion(task, completionType);
                        for (const assignee of task.assignedUsers) {
                            processedUsers.add(assignee.id);
                        }
                        if (task.createdBy) {
                            processedUsers.add(task.createdBy);
                        }
                        completedTasks++;
                        if (completionType === 'early') {
                            earlyCompletions++;
                        }
                        else if (completionType === 'ontime') {
                            onTimeCompletions++;
                        }
                        else {
                            lateCompletions++;
                        }
                    }
                    else if (task.status === 'overdue' ||
                        (task.dueTime && (0, moment_timezone_1.default)(task.dueTime).isBefore(now))) {
                        throttledLogger_1.throttledLogger.log('info', `⏰ Processing overdue task: ${task.title} (due: ${(0, moment_timezone_1.default)(task.dueTime).format('DD/MM/YYYY HH:mm')})`, 'process_overdue_task');
                        const overdueDays = (0, moment_timezone_1.default)().diff((0, moment_timezone_1.default)(task.dueTime), 'days');
                        if (overdueDays >= 7 && task.status !== 'cancelled') {
                            const penalties = await this.recordOverdueKPI(task);
                            penalties.forEach(record => processedUsers.add(record.userId));
                            penaltyRecords += penalties.length;
                        }
                        overdueTasks++;
                    }
                    else {
                        // งานที่ยังไม่ถึงกำหนดส่ง - ไม่ต้องทำอะไร
                        if (task.dueTime && (0, moment_timezone_1.default)(task.dueTime).isAfter(now)) {
                            throttledLogger_1.throttledLogger.log('info', `⏳ Skipping pending task: ${task.title} (due: ${(0, moment_timezone_1.default)(task.dueTime).format('DD/MM/YYYY HH:mm')})`, 'skip_pending_task');
                        }
                    }
                }
                catch (taskError) {
                    console.error(`❌ Error processing task ${task.id}:`, taskError);
                    // ดำเนินการต่อกับงานถัดไป
                }
            }
            // Update final summary to use throttledLogger
            throttledLogger_1.throttledLogger.forceLog('info', `✅ Leaderboard sync completed:`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - Processed tasks: ${processedTasks}`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - Updated users: ${processedUsers.size}`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - Completed tasks: ${completedTasks}`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - Overdue tasks: ${overdueTasks}`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - Early completions: ${earlyCompletions}`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - On-time completions: ${onTimeCompletions}`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - Late completions: ${lateCompletions}`);
            throttledLogger_1.throttledLogger.forceLog('info', `   - Penalty records: ${penaltyRecords}`);
            return {
                processedTasks,
                updatedUsers: processedUsers.size,
                details: {
                    completedTasks,
                    overdueTasks,
                    earlyCompletions,
                    onTimeCompletions,
                    lateCompletions,
                    penaltyRecords
                }
            };
        }
        catch (error) {
            console.error('❌ Error syncing leaderboard scores:', error);
            throw error;
        }
    }
    /**
     * ดึงข้อมูล KPI raw data สำหรับ debug
     */
    async getDebugKPIData(groupId, period) {
        try {
            console.log(`🔍 Getting debug KPI data for group: ${groupId}, period: ${period}`);
            // รองรับการส่งค่าเป็น 'default' และ LINE Group ID → internal UUID
            const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
            if (!internalGroupId) {
                return { totalRecords: 0, records: [], summary: { byType: {}, totalPoints: 0, averagePoints: 0 } };
            }
            // ดึงข้อมูล KPI raw data
            let kpiQuery = this.kpiRepository
                .createQueryBuilder('kpi')
                .leftJoinAndSelect('kpi.user', 'user')
                .select([
                'kpi.id',
                'kpi.userId',
                'kpi.groupId',
                'kpi.taskId',
                'kpi.type',
                'kpi.points',
                'kpi.eventDate',
                'kpi.weekOf',
                'kpi.monthOf',
                'user.displayName'
            ])
                .where('kpi.groupId = :groupId', { groupId: internalGroupId });
            // เพิ่ม date filter ตาม period
            switch (period) {
                case 'weekly':
                    const weekStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').toDate();
                    const weekEnd = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).endOf('week').toDate();
                    kpiQuery = kpiQuery.andWhere('kpi.eventDate BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd });
                    break;
                case 'monthly':
                    const monthStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('month').toDate();
                    const monthEnd = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).endOf('month').toDate();
                    kpiQuery = kpiQuery.andWhere('kpi.eventDate BETWEEN :monthStart AND :monthEnd', { monthStart, monthEnd });
                    break;
                // 'all' ไม่ต้องกรอง
            }
            const kpiRecords = await kpiQuery.getMany();
            console.log(`📊 Found ${kpiRecords.length} KPI records for debug`);
            return {
                totalRecords: kpiRecords.length,
                records: kpiRecords.map(record => ({
                    id: record.id,
                    userId: record.userId,
                    groupId: record.groupId,
                    taskId: record.taskId,
                    type: record.type,
                    points: record.points,
                    eventDate: record.eventDate,
                    weekOf: record.weekOf,
                    monthOf: record.monthOf,
                    userDisplayName: record.user?.displayName
                })),
                summary: {
                    byType: kpiRecords.reduce((acc, record) => {
                        acc[record.type] = (acc[record.type] || 0) + 1;
                        return acc;
                    }, {}),
                    totalPoints: kpiRecords.reduce((sum, record) => sum + (record.points || 0), 0),
                    averagePoints: kpiRecords.length > 0 ?
                        kpiRecords.reduce((sum, record) => sum + (record.points || 0), 0) / kpiRecords.length : 0
                }
            };
        }
        catch (error) {
            console.error('❌ Error getting debug KPI data:', error);
            throw error;
        }
    }
}
exports.KPIService = KPIService;
//# sourceMappingURL=KPIService.js.map