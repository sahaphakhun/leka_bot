// KPI Service - จัดการคะแนนและ Leaderboard

import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { KPIRecord, Task, User, Group } from '@/models';
import { Leaderboard } from '@/types';
import { Task as TaskEntity } from '@/models';
import { config } from '@/utils/config';
import { throttledLogger } from '@/utils/throttledLogger';
// @ts-ignore
import moment from 'moment-timezone';

export class KPIService {
  private kpiRepository: Repository<KPIRecord>;
  private taskRepository: Repository<Task>;
  private userRepository: Repository<User>;
  private groupRepository: Repository<Group>;

  constructor() {
    this.kpiRepository = AppDataSource.getRepository(KPIRecord);
    this.taskRepository = AppDataSource.getRepository(Task);
    this.userRepository = AppDataSource.getRepository(User);
    this.groupRepository = AppDataSource.getRepository(Group);
  }

  /**
   * แปลง groupId ที่มาจาก URL ให้เป็น internal UUID ของกลุ่ม
   * - รองรับ LINE Group ID
   * - รองรับค่า 'default' โดยเลือกกลุ่มที่อัปเดตล่าสุดเป็นค่าเริ่มต้น (สำหรับ deployment บน Railway)
   */
  private async resolveInternalGroupIdOrDefault(inputGroupId: string): Promise<string | null> {
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
      if (groupByLineId) return groupByLineId.id;

      // หาไม่เจอ
      return null;
    } catch (e) {
      console.warn('⚠️ Failed to resolve group id, falling back to null:', e);
      return null;
    }
  }

  /** สรุปรายงานตามช่วงเวลา: กลุ่ม/บุคคล */
  public async getReportSummary(
    groupId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      period?: 'weekly' | 'monthly';
      userId?: string; // internal user UUID (ถ้าเป็น LINE ID ให้แปลงก่อนใน controller)
    } = {}
  ): Promise<{
    periodStart: Date;
    periodEnd: Date;
    totals: {
      completed: number;
      early: number;
      ontime: number;
      late: number;
      overtime: number;
      overdue: number;
      rejected: number;
      completionRate: number;
    };
  }> {
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

      const now = moment().tz(config.app.defaultTimezone);
      const periodStart = options.startDate
        ? moment(options.startDate).tz(config.app.defaultTimezone)
        : options.period === 'monthly' ? now.clone().startOf('month') : now.clone().startOf('week');
      const periodEnd = options.endDate
        ? moment(options.endDate).tz(config.app.defaultTimezone)
        : options.period === 'monthly' ? now.clone().endOf('month') : now.clone().endOf('week');

      // KPI จากการปิดงาน - ใช้ข้อมูล KPI record ที่บันทึกไว้
      let kpiQB = this.kpiRepository
        .createQueryBuilder('kpi')
        .select([
          'COUNT(*) as completed',
          "COUNT(CASE WHEN kpi.type = 'early' THEN 1 END) as early",
          "COUNT(CASE WHEN kpi.type = 'ontime' THEN 1 END) as ontime",
          "COUNT(CASE WHEN kpi.type = 'late' THEN 1 END) as late",
          "COUNT(CASE WHEN kpi.type = 'overtime' THEN 1 END) as overtime",
          "COUNT(CASE WHEN kpi.type = 'overdue' THEN 1 END) as overdue",
        ])
        .where('kpi.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('kpi.eventDate BETWEEN :start AND :end', { start: periodStart.toDate(), end: periodEnd.toDate() });

      if (options.userId) {
        kpiQB = kpiQB.andWhere('kpi.userId = :userId', { userId: options.userId });
      }

      const kpiRow: any = await kpiQB.getRawOne();
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
      const overtime = parseInt(kpiRow?.overtime || '0');
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
      for (const t of tasks as any[]) {
        const hist = (t.workflow?.history || []) as Array<{ action: string; at?: Date }>;
        if (!hist || hist.length === 0) continue;
        for (const h of hist) {
          if (h.action === 'reject' && h.at) {
            const at = moment(h.at).tz(config.app.defaultTimezone);
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
    } catch (error) {
      console.error('❌ Error building report summary:', error);
      throw error;
    }
  }

  /** รายงานแยกตามบุคคลในกลุ่ม */
  public async getReportByUsers(
    groupId: string,
    options: { startDate?: Date; endDate?: Date; period?: 'weekly' | 'monthly' } = {}
  ): Promise<Array<{ userId: string; displayName: string; completed: number; early: number; ontime: number; late: number; overtime: number }>> {
    try {
      // รองรับ LINE Group ID และ 'default' → internal UUID
      const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
      if (!internalGroupId) return [];

      const now = moment().tz(config.app.defaultTimezone);
      const periodStart = options.startDate
        ? moment(options.startDate).tz(config.app.defaultTimezone)
        : options.period === 'monthly' ? now.clone().startOf('month') : now.clone().startOf('week');
      const periodEnd = options.endDate
        ? moment(options.endDate).tz(config.app.defaultTimezone)
        : options.period === 'monthly' ? now.clone().endOf('month') : now.clone().endOf('week');

      const rows = await this.kpiRepository
        .createQueryBuilder('kpi')
        .select([
          'kpi.userId as userId',
          'user.displayName as displayName',
          'COUNT(*) as completed',
          "COUNT(CASE WHEN kpi.type = 'early' THEN 1 END) as early",
          "COUNT(CASE WHEN kpi.type = 'ontime' THEN 1 END) as ontime",
          "COUNT(CASE WHEN kpi.type = 'late' THEN 1 END) as late",
          "COUNT(CASE WHEN kpi.type = 'overtime' THEN 1 END) as overtime",
          "COUNT(CASE WHEN kpi.type = 'overdue' THEN 1 END) as overdue"
        ])
        .leftJoin(User, 'user', 'user.id = kpi.userId')
        .where('kpi.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('kpi.eventDate BETWEEN :start AND :end', { start: periodStart.toDate(), end: periodEnd.toDate() })
        .groupBy('kpi.userId, user.displayName')
        .orderBy('completed', 'DESC')
        .getRawMany();

      return rows.map((r: any) => ({
        userId: r.userId,
        displayName: r.displayName,
        completed: parseInt(r.completed || '0'),
        early: parseInt(r.early || '0'),
        ontime: parseInt(r.ontime || '0'),
        late: parseInt(r.late || '0'),
        overtime: parseInt(r.overtime || '0'),
        overdue: parseInt(r.overdue || '0')
      }));
    } catch (error) {
      console.error('❌ Error getting report by users:', error);
      throw error;
    }
  }

  /**
   * บันทึกการทำงานเสร็จ
   */
  public async recordTaskCompletion(
    task: Task | TaskEntity, 
    completionType: 'early' | 'ontime' | 'late' | 'overtime'
  ): Promise<KPIRecord> {
    try {
      const points = config.app.kpiScoring[completionType];
      const eventDate = new Date();
      
      // คำนวณสัปดาห์และเดือน
      const weekOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('week').toDate();
      const monthOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('month').toDate();

      // ลบ KPI record เก่าหากมี (เพื่ออัปเดตจาก overdue เป็น completion)
      await this.removeOverdueKPIRecords(task.id);

      // บันทึก KPI สำหรับผู้รับผิดชอบทุกคน
      const records: KPIRecord[] = [];
      
      for (const assignee of task.assignedUsers) {
        const record = this.kpiRepository.create({
          userId: assignee.id,
          groupId: task.groupId,
          taskId: task.id,
          type: completionType,
          points,
          eventDate,
          weekOf,
          monthOf
        });

        const savedRecord = await this.kpiRepository.save(record);
        records.push(savedRecord);
      }

      console.log(`✅ Recorded KPI for task completion: ${task.title} (${completionType}, ${points} points)`);
      
      return records[0]; // ส่งกลับ record แรก

    } catch (error) {
      console.error('❌ Error recording task completion:', error);
      throw error;
    }
  }

  /**
   * บันทึก KPI เมื่องานเกินเวลา (0 คะแนน)
   * เพื่อป้องกันการเล่นระบบโดยไม่ส่งงาน
   */
  public async recordOverdueKPI(
    task: Task | TaskEntity
  ): Promise<KPIRecord[]> {
    try {
      const points = config.app.kpiScoring.overdue; // 0 คะแนน
      const eventDate = new Date();
      
      // คำนวณสัปดาห์และเดือน
      const weekOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('week').toDate();
      const monthOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('month').toDate();

      // ตรวจสอบว่ามี overdue KPI อยู่แล้วหรือไม่
      const existingOverdueRecords = await this.kpiRepository.find({
        where: {
          taskId: task.id,
          type: 'overdue'
        }
      });

      if (existingOverdueRecords.length > 0) {
        console.log(`⚠️ Overdue KPI already recorded for task: ${task.title}`);
        return existingOverdueRecords;
      }

      // บันทึก overdue KPI สำหรับผู้รับผิดชอบทุกคน
      const records: KPIRecord[] = [];
      
      for (const assignee of task.assignedUsers) {
        const record = this.kpiRepository.create({
          userId: assignee.id,
          groupId: task.groupId,
          taskId: task.id,
          type: 'overdue',
          points,
          eventDate,
          weekOf,
          monthOf
        });

        const savedRecord = await this.kpiRepository.save(record);
        records.push(savedRecord);
      }

      console.log(`✅ Recorded overdue KPI for task: ${task.title} (${points} points for ${records.length} assignees)`);
      
      return records;

    } catch (error) {
      console.error('❌ Error recording overdue KPI:', error);
      throw error;
    }
  }

  /**
   * ลบ overdue KPI records เมื่องานถูกส่งแล้ว
   */
  private async removeOverdueKPIRecords(taskId: string): Promise<void> {
    try {
      const deletedRecords = await this.kpiRepository.delete({
        taskId,
        type: 'overdue'
      });
      
      if (deletedRecords.affected && deletedRecords.affected > 0) {
        console.log(`✅ Removed ${deletedRecords.affected} overdue KPI records for task ${taskId}`);
      }
    } catch (error) {
      console.error('❌ Error removing overdue KPI records:', error);
      // ไม่ throw error เพื่อไม่ให้การบันทึก completion ล้มเหลว
    }
  }

  /**
   * คำนวณประเภทการทำงานเสร็จ
   */
  public calculateCompletionType(task: Task | TaskEntity): 'early' | 'ontime' | 'late' | 'overtime' {
    const dueTime = moment(task.dueTime).tz(config.app.defaultTimezone);
    const completedTime = moment(task.completedAt).tz(config.app.defaultTimezone);
    const diffHours = completedTime.diff(dueTime, 'hours');

    if (diffHours <= -24) {
      return 'early';    // เสร็จก่อนกำหนด ≥ 24 ชม.
    } else if (diffHours <= 24) {
      return 'ontime';   // เสร็จตรงเวลา ± 24 ชม.
    } else if (diffHours <= 48) {
      return 'late';     // ล่าช้า 24-48 ชม.
    } else {
      return 'overtime'; // ค้างนาน > 48 ชม.
    }
  }

  /**
   * ดึง Leaderboard ของกลุ่ม (ใช้ค่าเฉลี่ยคะแนน)
   */
  public async getGroupLeaderboard(
    groupId: string, 
    period: 'weekly' | 'monthly' | 'all' = 'weekly'
  ): Promise<Leaderboard[]> {
    try {
      throttledLogger.log('info', `🔍 Getting leaderboard for group: ${groupId}, period: ${period}`, 'get_leaderboard');

      // แปลง groupId (รองรับ 'default' และ LINE Group ID)
      const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
      if (!internalGroupId) {
        console.warn(`⚠️ No valid group found for groupId=${groupId}`);
        return [];
      }
      
      // ดึงสมาชิกทั้งหมดในกลุ่มก่อน
      const allMembers = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.groupMemberships', 'membership')
        .where('membership.groupId = :groupId', { groupId: internalGroupId })
        .select(['user.id', 'user.displayName', 'user.lineUserId'])
        .getMany();
      
      console.log(`📊 Found ${allMembers.length} members in group ${groupId}`);
      
      if (allMembers.length === 0) {
        console.log('⚠️ No members found in group, returning empty leaderboard');
        return [];
      }
      
      // สร้าง query builder สำหรับ KPI data
      let kpiQuery = this.kpiRepository
        .createQueryBuilder('kpi')
        .select([
          'kpi.userId as userId',
          'COALESCE(AVG(kpi.points), 0) as averagePoints',
          'COALESCE(SUM(kpi.points), 0) as totalPoints',
          'COUNT(CASE WHEN kpi.type = \'early\' THEN 1 END) as tasksEarly',
          'COUNT(CASE WHEN kpi.type = \'ontime\' THEN 1 END) as tasksOnTime',
          'COUNT(CASE WHEN kpi.type = \'late\' THEN 1 END) as tasksLate',
          'COUNT(CASE WHEN kpi.type = \'overtime\' THEN 1 END) as tasksOvertime',
          'COUNT(CASE WHEN kpi.type = \'overdue\' THEN 1 END) as tasksOverdue',
          'COUNT(*) as tasksCompleted'
        ])
        .where('kpi.groupId = :groupId', { groupId: internalGroupId });

      // เพิ่มการกรองตามช่วงเวลา (ใช้อิง weekOf/monthOf เพื่อลดปัญหา timezone)
      let periodFilter = '';
      let periodStart: Date | undefined;
      let periodEnd: Date | undefined;
      
      if (period === 'weekly') {
        periodStart = moment().tz(config.app.defaultTimezone).startOf('week').toDate();
        periodEnd = moment().tz(config.app.defaultTimezone).endOf('week').toDate();
        periodFilter = 'weekly';
        // ใช้คอลัมน์ weekOf แทนการเทียบช่วงเวลาเพื่อให้แม่นยำในหลาย timezone
        kpiQuery = kpiQuery.andWhere('kpi.weekOf = :weekStart', { weekStart: periodStart });
      } else if (period === 'monthly') {
        periodStart = moment().tz(config.app.defaultTimezone).startOf('month').toDate();
        periodEnd = moment().tz(config.app.defaultTimezone).endOf('month').toDate();
        periodFilter = 'monthly';
        // ใช้คอลัมน์ monthOf แทนการเทียบช่วงเวลาเพื่อให้แม่นยำในหลาย timezone
        kpiQuery = kpiQuery.andWhere('kpi.monthOf = :monthStart', { monthStart: periodStart });
      } else {
        periodFilter = 'all time';
      }
      
      console.log(`🔍 Period filter: ${periodFilter}`);
      if (periodStart && periodEnd) {
        console.log(`📅 Date range: ${moment(periodStart).format('DD/MM/YYYY')} - ${moment(periodEnd).format('DD/MM/YYYY')}`);
      }

      // Debug: ตรวจสอบข้อมูล KPI ในช่วงเวลาที่กำหนด
      const allKpiData = await this.kpiRepository
        .createQueryBuilder('kpi')
        .select([
          'kpi.userId as userId',
          'kpi.eventDate as eventDate',
          'kpi.points as points',
          'kpi.type as type'
        ])
        .where('kpi.groupId = :groupId', { groupId: internalGroupId });
      
      // เพิ่ม date filter สำหรับ debug data
      if (period === 'weekly' && periodStart) {
        allKpiData.andWhere('kpi.weekOf = :start', { start: periodStart });
      } else if (period === 'monthly' && periodStart) {
        allKpiData.andWhere('kpi.monthOf = :start', { start: periodStart });
      }
      
      const debugKpiData = await allKpiData
        .orderBy('kpi.eventDate', 'DESC')
        .limit(5)
        .getRawMany();
      
      console.log(`🔍 Found ${debugKpiData.length} KPI records for ${periodFilter} in group ${internalGroupId}`);

      // แสดง SQL query ที่ถูกสร้าง
      const sqlQuery = kpiQuery.getQueryAndParameters();
      console.log('🔍 SQL Query:', sqlQuery[0]);
      console.log('🔍 SQL Parameters:', sqlQuery[1]);

      // Execute KPI query
      const kpiResults = await kpiQuery
        .groupBy('kpi.userId')
        .getRawMany();
      
      console.log(`📈 Found KPI data for ${kpiResults.length} users`);
      // ลด logging เพื่อแก้ rate limit - แสดงเฉพาะข้อมูลสำคัญ
      if (kpiResults.length > 0) {
        console.log('🔍 Sample KPI Result:', {
          userId: kpiResults[0].userId || kpiResults[0].userid,
          averagePoints: kpiResults[0].averagePoints || kpiResults[0].averagepoints,
          totalPoints: kpiResults[0].totalPoints || kpiResults[0].totalpoints,
          tasksCompleted: kpiResults[0].tasksCompleted || kpiResults[0].taskscompleted
        });
      }
      
      // สร้าง Map สำหรับ KPI data
      const kpiMap = new Map();
      kpiResults.forEach((result: any) => {
        // แก้ไข case sensitivity ของ field names
        const userId = result.userId || result.userid;
        const mappedData = {
          averagePoints: parseFloat(result.averagePoints || result.averagepoints) || 0,
          totalPoints: parseFloat(result.totalPoints || result.totalpoints) || 0,
          tasksCompleted: parseInt(result.tasksCompleted || result.taskscompleted) || 0,
          tasksEarly: parseInt(result.tasksEarly || result.tasksearly) || 0,
          tasksOnTime: parseInt(result.tasksOnTime || result.tasksontime) || 0,
          tasksLate: parseInt(result.tasksLate || result.taskslate) || 0,
          tasksOvertime: parseInt(result.tasksOvertime || result.tasksovertime) || 0,
          tasksOverdue: parseInt(result.tasksOverdue || result.tasksoverdue) || 0
        };
        
        console.log(`🔍 Mapping user ${userId}:`, {
          averagePoints: mappedData.averagePoints,
          totalPoints: mappedData.totalPoints,
          tasksCompleted: mappedData.tasksCompleted
        });
        kpiMap.set(userId, mappedData);
      });
      
      console.log(`📊 KPI Map size: ${kpiMap.size}`);
      
      // รวมข้อมูลสมาชิกกับ KPI data
      // เดิม: แสดงเฉพาะผู้ที่มี membership ในกลุ่ม แม้มี KPI ก็จะไม่ถูกแสดงหากไม่มีสมาชิกภาพ
      // ปรับ: รวมผู้ใช้ที่มี KPI ในช่วงเวลาด้วย แม้ไม่พบในตารางสมาชิก เพื่อไม่ให้คะแนน “หายไป”
      const memberMap = new Map(allMembers.map(m => [m.id, m]));
      const kpiUserIds = Array.from(kpiMap.keys());

      // หา userIds ที่มี KPI แต่ไม่อยู่ในรายชื่อสมาชิก
      const missingIds = kpiUserIds.filter(id => !memberMap.has(id));

      let extraUsers: Array<{ id: string; displayName: string; lineUserId: string }> = [];
      if (missingIds.length > 0) {
        try {
          extraUsers = await this.userRepository
            .createQueryBuilder('user')
            .select(['user.id', 'user.displayName', 'user.lineUserId'])
            .where('user.id IN (:...ids)', { ids: missingIds })
            .getMany();
          console.log(`ℹ️ Added ${extraUsers.length} KPI-only users to leaderboard view`);
        } catch (e) {
          console.warn('⚠️ Failed to fetch KPI-only users:', e);
        }
      }

      const displayUsers = [...allMembers, ...extraUsers];

      const leaderboard: Leaderboard[] = [];

      for (const member of displayUsers) {
        const kpiData = kpiMap.get(member.id) || {
          averagePoints: 0,
          totalPoints: 0,
          tasksCompleted: 0,
          tasksEarly: 0,
          tasksOnTime: 0,
          tasksLate: 0,
          tasksOvertime: 0,
          tasksOverdue: 0
        };
        
        console.log(`🔍 Member ${member.id} (${member.displayName}): found=${kpiMap.has(member.id)}, tasks=${kpiData.tasksCompleted}, points=${kpiData.totalPoints}`);
        
        // คำนวณ trend (เปรียบเทียบกับสัปดาห์/เดือนก่อน)
        let trend: 'up' | 'down' | 'same' = 'same';
        try {
          trend = await this.calculateTrend(member.id, internalGroupId, period);
        } catch (trendError) {
          console.warn(`⚠️ Error calculating trend for user ${member.id}:`, trendError);
          trend = 'same';
        }
        
        // คำนวณคะแนนตามช่วงเวลา: ใช้ “ค่าเฉลี่ย” = คะแนนรวม / จำนวนงาน
        // เก็บคะแนนรวมไว้ที่ totalPoints เพื่อใช้งานในอนาคต
        const tasksInPeriod = kpiData.tasksCompleted || 0;
        const periodAverage = tasksInPeriod > 0 ? (kpiData.totalPoints / tasksInPeriod) : 0;
        
        leaderboard.push({
          userId: member.id,
          displayName: member.displayName || 'ไม่ทราบชื่อ',
          weeklyPoints: period === 'weekly' ? periodAverage : 0,
          monthlyPoints: period === 'monthly' ? periodAverage : 0,
          totalPoints: kpiData.totalPoints,
          tasksCompleted: kpiData.tasksCompleted,
          tasksEarly: kpiData.tasksEarly,
          tasksOnTime: kpiData.tasksOnTime,
          tasksLate: kpiData.tasksLate,
          tasksOvertime: kpiData.tasksOvertime,
          tasksOverdue: kpiData.tasksOverdue,
          rank: 0, // จะคำนวณหลังจากเรียงลำดับ
          trend
        });
      }
      
      // เรียงลำดับตามคะแนนเฉลี่ย (สูงสุดก่อน)
      leaderboard.sort((a, b) => {
        const scoreA = period === 'weekly' ? a.weeklyPoints : 
                      period === 'monthly' ? a.monthlyPoints : a.totalPoints;
        const scoreB = period === 'weekly' ? b.weeklyPoints : 
                      period === 'monthly' ? b.monthlyPoints : b.totalPoints;
        return scoreB - scoreA;
      });
      
      // กำหนดอันดับ
      leaderboard.forEach((user, index) => {
        user.rank = index + 1;
      });
      
      console.log(`✅ Generated leaderboard with ${leaderboard.length} users`);
      // ลด logging เพื่อแก้ rate limit - แสดงเฉพาะข้อมูลสำคัญ
      if (leaderboard.length > 0) {
        console.log('🔍 Leaderboard Summary:', leaderboard.map(user => ({
          name: user.displayName,
          tasks: user.tasksCompleted,
          points: user.totalPoints,
          weeklyPoints: user.weeklyPoints
        })));
      }
      return leaderboard;

    } catch (error) {
      console.error('❌ Error getting group leaderboard:', error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          groupId,
          period
        });
        
        // Check for specific database errors
        if (error.message.includes('enum')) {
          console.error('🔍 Database enum error detected - this might be a schema issue');
        }
        if (error.message.includes('connection')) {
          console.error('🔍 Database connection error detected');
        }
        if (error.message.includes('relation')) {
          console.error('🔍 Database table/relation error detected');
        }
      }
      throw error;
    }
  }

  /**
   * สร้างข้อมูล KPI ตัวอย่างสำหรับทดสอบ
   */
  public async createSampleKPIData(groupId: string): Promise<void> {
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
      
      const now = moment().tz(config.app.defaultTimezone);
      const weekOf = now.clone().startOf('week').toDate();
      const monthOf = now.clone().startOf('month').toDate();
      
      // สร้างข้อมูล KPI ตัวอย่างสำหรับสมาชิกแต่ละคน
      for (const member of members) {
        // สร้าง 3-5 records ต่อคน
        const recordCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < recordCount; i++) {
          const types: ('early' | 'ontime' | 'late' | 'overtime')[] = ['early', 'ontime', 'late', 'overtime'];
          const randomType = types[Math.floor(Math.random() * types.length)];
          const points = config.app.kpiScoring[randomType];
          
          // สร้าง dummy task ID (ต้องมี task จริงสำหรับ production)
          const dummyTaskId = `dummy-task-${member.id}-${i}`;
          
          const kpiRecord = this.kpiRepository.create({
            userId: member.id,
            groupId: internalGroupId,
            taskId: dummyTaskId,
            type: randomType,
            points,
            eventDate: now.clone().subtract(Math.floor(Math.random() * 7), 'days').toDate(),
            weekOf,
            monthOf
          });
          
          await this.kpiRepository.save(kpiRecord);
        }
      }
      
      console.log(`✅ Created sample KPI data for ${members.length} members`);
      
    } catch (error) {
      console.error('❌ Error creating sample KPI data:', error);
      throw error;
    }
  }

  /**
   * คำนวณค่าเฉลี่ยคะแนนของผู้ใช้
   */
  public async getUserAverageScore(
    userId: string,
    groupId: string,
    period: 'weekly' | 'monthly' | 'all' = 'weekly'
  ): Promise<number> {
    try {
      let queryBuilder = this.kpiRepository
        .createQueryBuilder('kpi')
        .select('AVG(kpi.points)', 'averagePoints')
        .where('kpi.userId = :userId', { userId })
        .andWhere('kpi.groupId = :groupId', { groupId });

      // เพิ่ม date filter ตาม period
      switch (period) {
        case 'weekly':
          const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').toDate();
          queryBuilder = queryBuilder.andWhere('kpi.weekOf = :weekStart', { weekStart });
          break;
        case 'monthly':
          const monthStart = moment().tz(config.app.defaultTimezone).startOf('month').toDate();
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

    } catch (error) {
      console.error('❌ Error calculating user average score:', error);
      return 0;
    }
  }

  /**
   * ดึงสถิติคะแนนรายสัปดาห์ของผู้ใช้
   */
  public async getUserWeeklyScoreHistory(
    userId: string,
    groupId: string,
    weeks: number = 8
  ): Promise<Array<{ week: string; averageScore: number; totalTasks: number }>> {
    try {
      const history: Array<{ week: string; averageScore: number; totalTasks: number }> = [];
      const currentWeek = moment().tz(config.app.defaultTimezone).startOf('week');

      for (let i = 0; i < weeks; i++) {
        const weekStart = moment(currentWeek).subtract(i, 'weeks').toDate();
        const weekEnd = moment(currentWeek).subtract(i - 1, 'weeks').toDate();

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
            week: moment(weekStart).format('YYYY-MM-DD'),
            averageScore: isNaN(averageScore) ? 0 : averageScore,
            totalTasks: isNaN(totalTasks) ? 0 : totalTasks
          });
        } else {
          history.unshift({
            week: moment(weekStart).format('YYYY-MM-DD'),
            averageScore: 0,
            totalTasks: 0
          });
        }
      }

      return history;

    } catch (error) {
      console.error('❌ Error getting user weekly score history:', error);
      return [];
    }
  }

  /**
   * ดึงสถิติตามช่วงเวลา
   */
  public async getStatsByPeriod(groupId: string, period: 'this_week' | 'last_week' | 'all' = 'this_week'): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    avgCompletionTime: number;
    topPerformer: string;
    period: string;
  }> {
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

      let startDate: Date | null = null;
      let endDate: Date | null = null;
      let periodLabel = '';

      // กำหนดช่วงเวลาตาม period
      switch (period) {
        case 'this_week':
          startDate = moment().tz(config.app.defaultTimezone).startOf('week').toDate();
          endDate = moment().tz(config.app.defaultTimezone).endOf('week').toDate();
          periodLabel = 'สัปดาห์นี้';
          break;
        case 'last_week':
          startDate = moment().tz(config.app.defaultTimezone).subtract(1, 'week').startOf('week').toDate();
          endDate = moment().tz(config.app.defaultTimezone).subtract(1, 'week').endOf('week').toDate();
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

      // สร้าง query builder สำหรับงานที่ค้าง
      let pendingTasksQuery = this.taskRepository
        .createQueryBuilder('task')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.status = :status', { status: 'pending' });

      // สร้าง query builder สำหรับงานที่เกินกำหนด
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
          const totalTime = completedTasksWithTime.reduce((sum: number, task: any) => {
            const diff = moment(task.completedAt).tz(config.app.defaultTimezone).diff(moment(task.dueTime).tz(config.app.defaultTimezone), 'hours');
            return sum + Math.abs(diff);
          }, 0);
          avgCompletionTime = totalTime / completedTasksWithTime.length;
        }
      } else {
        // สำหรับ 'all' ให้คำนวณจากงานที่เสร็จทั้งหมด
        const completedTasksWithTime = await this.taskRepository
          .createQueryBuilder('task')
          .select(['task.dueTime', 'task.completedAt'])
          .where('task.groupId = :groupId', { groupId: internalGroupId })
          .andWhere('task.status = :status', { status: 'completed' })
          .getMany();

        if (completedTasksWithTime.length > 0) {
          const totalTime = completedTasksWithTime.reduce((sum: number, task: any) => {
            const diff = moment(task.completedAt).tz(config.app.defaultTimezone).diff(moment(task.dueTime).tz(config.app.defaultTimezone), 'hours');
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

    } catch (error) {
      console.error('❌ Error getting stats by period:', error);
      throw error;
    }
  }

  /**
   * ดึงสถิติรายสัปดาห์ (backward compatibility)
   */
  public async getWeeklyStats(groupId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    avgCompletionTime: number;
    topPerformer: string;
  }> {
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
  public async getUserStats(
    userId: string, 
    groupId: string, 
    period: 'weekly' | 'monthly' | 'all' = 'all'
  ): Promise<{
    totalPoints: number;
    rank: number;
    tasksCompleted: number;
    tasksEarly: number;
    tasksOnTime: number;
    tasksLate: number;
    tasksOvertime: number;
    tasksOverdue: number;
    completionRate: number;
    avgPointsPerTask: number;
  }> {
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
          tasksOvertime: 0,
          tasksOverdue: 0,
          completionRate: 0,
          avgPointsPerTask: 0
        };
      }

      let dateFilter: any = {};
      
      switch (period) {
        case 'weekly':
          const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').toDate();
          dateFilter = { weekOf: weekStart };
          break;
        case 'monthly':
          const monthStart = moment().tz(config.app.defaultTimezone).startOf('month').toDate();
          dateFilter = { monthOf: monthStart };
          break;
      }

      // คะแนนและสถิติของผู้ใช้
      const userStats = await this.kpiRepository
        .createQueryBuilder('kpi')
        .select([
          'SUM(kpi.points) as totalPoints',
          'COUNT(*) as tasksCompleted',
          'COUNT(CASE WHEN kpi.type = \'early\' THEN 1 END) as tasksEarly',
          'COUNT(CASE WHEN kpi.type = \'ontime\' THEN 1 END) as tasksOnTime',
          'COUNT(CASE WHEN kpi.type = \'late\' THEN 1 END) as tasksLate',
          'COUNT(CASE WHEN kpi.type = \'overtime\' THEN 1 END) as tasksOvertime',
          'COUNT(CASE WHEN kpi.type = \'overdue\' THEN 1 END) as tasksOverdue'
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
      const totalPoints = parseInt(userStats?.totalPoints || '0');
      
      const completionRate = totalAssignedTasks > 0 ? (tasksCompleted / totalAssignedTasks) * 100 : 0;
      const avgPointsPerTask = tasksCompleted > 0 ? totalPoints / tasksCompleted : 0;

      return {
        totalPoints,
        rank: userRank,
        tasksCompleted,
        tasksEarly: parseInt(userStats?.tasksEarly || '0'),
        tasksOnTime: parseInt(userStats?.tasksOnTime || '0'),
        tasksLate: parseInt(userStats?.tasksLate || '0'),
        tasksOvertime: parseInt(userStats?.tasksOvertime || '0'),
        tasksOverdue: parseInt(userStats?.tasksOverdue || '0'),
        completionRate: Math.round(completionRate * 10) / 10,
        avgPointsPerTask: Math.round(avgPointsPerTask * 10) / 10
      };

    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * อัปเดต rankings ของ leaderboard
   */
  public async updateLeaderboardRankings(): Promise<void> {
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

    } catch (error) {
      console.error('❌ Error updating leaderboard rankings:', error);
      throw error;
    }
  }

  /**
   * ทำความสะอาดข้อมูลเก่า
   */
  public async cleanupOldRecords(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = moment().tz(config.app.defaultTimezone).subtract(daysToKeep, 'days').toDate();
      
      const result = await this.kpiRepository.delete({
        eventDate: {
          $lt: cutoffDate
        } as any
      });

      const deletedCount = result.affected || 0;
      console.log(`🗑️ Cleaned up ${deletedCount} old KPI records`);
      
      return deletedCount;

    } catch (error) {
      console.error('❌ Error cleaning up old KPI records:', error);
      throw error;
    }
  }

  /**
   * ส่งออกข้อมูล KPI
   */
  public async exportKPIData(
    groupId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any[]> {
    try {
      const records = await this.kpiRepository
        .createQueryBuilder('kpi')
        .leftJoinAndSelect('kpi.user', 'user')
        .leftJoinAndSelect('kpi.task', 'task')
        .where('kpi.groupId = :groupId', { groupId })
        .andWhere('kpi.eventDate BETWEEN :startDate AND :endDate', { startDate, endDate })
        .orderBy('kpi.eventDate', 'DESC')
        .getMany();

      return records.map((record: any) => ({
        วันที่: moment(record.eventDate).tz(config.app.defaultTimezone).format('DD/MM/YYYY'),
        ผู้ใช้: record.user.displayName,
        งาน: record.task.title,
        ประเภท: record.type,
        คะแนน: record.points,
        สัปดาห์: moment(record.weekOf).tz(config.app.defaultTimezone).format('DD/MM/YYYY'),
        เดือน: moment(record.monthOf).tz(config.app.defaultTimezone).format('MM/YYYY')
      }));

    } catch (error) {
      console.error('❌ Error exporting KPI data:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * คำนวณ trend ของคะแนน (เปรียบเทียบกับช่วงก่อน)
   */
  private async calculateTrend(
    userId: string, 
    groupId: string, 
    period: 'weekly' | 'monthly' | 'all'
  ): Promise<'up' | 'down' | 'same'> {
    try {
      if (period === 'all') return 'same';

      let currentPeriod: Date;
      let previousPeriod: Date;

      // ใช้ try-catch สำหรับ timezone operations
      try {
        // หาคะแนนปัจจุบัน
        currentPeriod = period === 'weekly' 
          ? moment().tz(config.app.defaultTimezone).startOf('week').toDate()
          : moment().tz(config.app.defaultTimezone).startOf('month').toDate();

        // หาคะแนนช่วงก่อน
        previousPeriod = period === 'weekly'
          ? moment().tz(config.app.defaultTimezone).subtract(1, 'week').startOf('week').toDate()
          : moment().tz(config.app.defaultTimezone).subtract(1, 'month').startOf('month').toDate();
      } catch (timezoneError) {
        console.warn('⚠️ Timezone error in calculateTrend, using local time:', timezoneError);
        // Fallback to local time
        const now = new Date();
        if (period === 'weekly') {
          currentPeriod = new Date(now);
          currentPeriod.setDate(now.getDate() - now.getDay());
          currentPeriod.setHours(0, 0, 0, 0);
          
          previousPeriod = new Date(currentPeriod);
          previousPeriod.setDate(previousPeriod.getDate() - 7);
        } else {
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

      if (current > previous) return 'up';
      if (current < previous) return 'down';
      return 'same';

    } catch (error) {
      console.error('❌ Error calculating trend:', error);
      return 'same';
    }
  }

  /**
   * ดึงสถิติรายวันสำหรับรายงานผู้จัดการ
   */
  public async getDailyStats(groupId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    pendingReviewTasks: number;
    pendingTasks: number;
  }> {
    try {
      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) internalGroupId = groupByLineId.id;

      const now = moment().tz(config.app.defaultTimezone);
      const today = now.clone().startOf('day').toDate();
      const tomorrow = now.clone().add(1, 'day').startOf('day').toDate();

      // งานทั้งหมดในกลุ่ม (ที่ยังไม่ถูกยกเลิก)
      const totalTasks = await this.taskRepository.count({
        where: { 
          groupId: internalGroupId,
          status: { $ne: 'cancelled' } as any
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

    } catch (error) {
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
  public async updateGroupStats(groupId: string): Promise<void> {
    try {
      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) internalGroupId = groupByLineId.id;

      // อัปเดตสถิติรายสัปดาห์
      await this.updateWeeklyStats(internalGroupId);
      
      // อัปเดตสถิติรายเดือน
      await this.updateMonthlyStats(internalGroupId);

    } catch (error) {
      console.error('❌ Error updating group stats:', error);
    }
  }

  /**
   * อัปเดตสถิติรายสัปดาห์
   */
  private async updateWeeklyStats(groupId: string): Promise<void> {
    try {
      const now = moment().tz(config.app.defaultTimezone);
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

    } catch (error) {
      console.error('❌ Error updating weekly stats:', error);
    }
  }

  /**
   * อัปเดตสถิติรายเดือน
   */
  private async updateMonthlyStats(groupId: string): Promise<void> {
    try {
      const now = moment().tz(config.app.defaultTimezone);
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

    } catch (error) {
      console.error('❌ Error updating monthly stats:', error);
    }
  }

  /**
   * อัปเดต Leaderboard ของกลุ่ม
   */
  public async updateGroupLeaderboard(groupId: string, period: 'weekly' | 'monthly'): Promise<void> {
    try {
      // รองรับ LINE Group ID และ 'default' → internal UUID
      const internalGroupId = await this.resolveInternalGroupIdOrDefault(groupId);
      if (!internalGroupId) return;

      // อัปเดต Leaderboard
      const leaderboard = await this.getGroupLeaderboard(internalGroupId, period);
      
      // บันทึกลงฐานข้อมูล (ในอนาคต)
      console.log(`🏆 Updated ${period} leaderboard for group ${groupId}:`, leaderboard.length, 'users');

    } catch (error) {
      console.error('❌ Error updating group leaderboard:', error);
    }
  }

  /**
   * ซิงค์และคำนวณคะแนน leaderboard ใหม่จากงานทั้งหมด
   */
  public async syncLeaderboardScores(
    groupId: string, 
    period: 'weekly' | 'monthly' | 'all'
  ): Promise<{
    processedTasks: number;
    updatedUsers: number;
    details: {
      completedTasks: number;
      overdueTasks: number;
      earlyCompletions: number;
      onTimeCompletions: number;
      lateCompletions: number;
      overtimeCompletions: number;
    };
  }> {
    try {
      throttledLogger.log('info', `🔄 Starting leaderboard sync for group: ${groupId}, period: ${period}`);
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
            overtimeCompletions: 0
          }
        };
      }

      // กำหนดช่วงเวลาตาม period
      const now = moment().tz(config.app.defaultTimezone);
      let startDate: Date;
      let endDate: Date;

      if (period === 'weekly') {
        startDate = now.clone().startOf('week').toDate();
        endDate = now.clone().endOf('week').toDate();
      } else if (period === 'monthly') {
        startDate = now.clone().startOf('month').toDate();
        endDate = now.clone().endOf('month').toDate();
      } else {
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
        tasksQuery = tasksQuery.andWhere(
          '(task.completedAt BETWEEN :startDate AND :endDate OR ' +
          'task.dueTime < :now OR ' +
          'task.status = :overdueStatus)',
          { 
            startDate, 
            endDate, 
            now: now.toDate(),
            overdueStatus: 'overdue'
          }
        );
      } else {
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
        }, {} as Record<string, number>);
        
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
        deleteQB.andWhere('weekOf = :weekStart', { weekStart: moment(startDate).tz(config.app.defaultTimezone).startOf('week').toDate() });
      } else if (period === 'monthly') {
        deleteQB.andWhere('monthOf = :monthStart', { monthStart: moment(startDate).tz(config.app.defaultTimezone).startOf('month').toDate() });
      } else {
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
      let overtimeCompletions = 0;
      const processedUsers = new Set<string>();

      // ประมวลผลงานแต่ละชิ้น
      for (const task of tasks) {
        try {
          if (task.assignedUsers.length === 0) {
            console.log(`⚠️ Task ${task.id} has no assignees, skipping`);
            continue;
          }

          processedTasks++;

          if (task.status === 'completed' && task.completedAt) {
            // งานเสร็จแล้ว - คำนวณประเภทการเสร็จ
            const completionType = this.calculateCompletionType(task);
            
            // บันทึก KPI สำหรับผู้รับผิดชอบทุกคน
            for (const assignee of task.assignedUsers) {
              const points = config.app.kpiScoring[completionType];
              const eventDate = task.completedAt;
              
              // คำนวณสัปดาห์และเดือน
              const weekOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('week').toDate();
              const monthOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('month').toDate();

              const kpiRecord = this.kpiRepository.create({
                userId: assignee.id,
                groupId: internalGroupId,
                taskId: task.id,
                type: completionType,
                points,
                eventDate,
                weekOf,
                monthOf
              });

              await this.kpiRepository.save(kpiRecord);
              processedUsers.add(assignee.id);

              // อัปเดตสถิติ
              completedTasks++;
              switch (completionType) {
                case 'early':
                  earlyCompletions++;
                  break;
                case 'ontime':
                  onTimeCompletions++;
                  break;
                case 'late':
                  lateCompletions++;
                  break;
                case 'overtime':
                  overtimeCompletions++;
                  break;
              }
            }
          } else if (task.status === 'overdue' || 
                     (task.dueTime && moment(task.dueTime).isBefore(now))) {
            // งานเกินกำหนด - บันทึก overdue KPI
            throttledLogger.log('info', `⏰ Processing overdue task: ${task.title} (due: ${moment(task.dueTime).format('DD/MM/YYYY HH:mm')})`, 'process_overdue_task');
              const points = config.app.kpiScoring.overdue; // 0 คะแนน
              const eventDate = new Date();
              
              // คำนวณสัปดาห์และเดือน
              const weekOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('week').toDate();
              const monthOf = moment(eventDate).tz(config.app.defaultTimezone).startOf('month').toDate();

              const kpiRecord = this.kpiRepository.create({
                userId: assignee.id,
                groupId: internalGroupId,
                taskId: task.id,
                type: 'overdue',
                points,
                eventDate,
                weekOf,
                monthOf
              });

              await this.kpiRepository.save(kpiRecord);
              processedUsers.add(assignee.id);
              overdueTasks++;
            }
          } else {
            // งานที่ยังไม่ถึงกำหนดส่ง - ไม่ต้องทำอะไร
            if (task.dueTime && moment(task.dueTime).isAfter(now)) {
              throttledLogger.log('info', `⏳ Skipping pending task: ${task.title} (due: ${moment(task.dueTime).format('DD/MM/YYYY HH:mm')})`, 'skip_pending_task');
            }
          }
        } catch (taskError) {
          console.error(`❌ Error processing task ${task.id}:`, taskError);
          // ดำเนินการต่อกับงานถัดไป
        }
      }

      // Update final summary to use throttledLogger
      throttledLogger.forceLog('info', `✅ Leaderboard sync completed:`);
      throttledLogger.forceLog('info', `   - Processed tasks: ${processedTasks}`);
      throttledLogger.forceLog('info', `   - Updated users: ${processedUsers.size}`);
      throttledLogger.forceLog('info', `   - Completed tasks: ${completedTasks}`);
      throttledLogger.forceLog('info', `   - Overdue tasks: ${overdueTasks}`);
      throttledLogger.forceLog('info', `   - Early completions: ${earlyCompletions}`);
      throttledLogger.forceLog('info', `   - On-time completions: ${onTimeCompletions}`);
      throttledLogger.forceLog('info', `   - Late completions: ${lateCompletions}`);
      throttledLogger.forceLog('info', `   - Overtime completions: ${overtimeCompletions}`);

      return {
        processedTasks,
        updatedUsers: processedUsers.size,
        details: {
          completedTasks,
          overdueTasks,
          earlyCompletions,
          onTimeCompletions,
          lateCompletions,
          overtimeCompletions
        }
      };

    } catch (error) {
      console.error('❌ Error syncing leaderboard scores:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูล KPI raw data สำหรับ debug
   */
  public async getDebugKPIData(
    groupId: string, 
    period: 'weekly' | 'monthly' | 'all'
  ): Promise<any> {
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
          const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').toDate();
          const weekEnd = moment().tz(config.app.defaultTimezone).endOf('week').toDate();
          kpiQuery = kpiQuery.andWhere('kpi.eventDate BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd });
          break;
        case 'monthly':
          const monthStart = moment().tz(config.app.defaultTimezone).startOf('month').toDate();
          const monthEnd = moment().tz(config.app.defaultTimezone).endOf('month').toDate();
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
          }, {} as Record<string, number>),
          totalPoints: kpiRecords.reduce((sum, record) => sum + (record.points || 0), 0),
          averagePoints: kpiRecords.length > 0 ? 
            kpiRecords.reduce((sum, record) => sum + (record.points || 0), 0) / kpiRecords.length : 0
        }
      };

    } catch (error) {
      console.error('❌ Error getting debug KPI data:', error);
      throw error;
    }
  }
}
