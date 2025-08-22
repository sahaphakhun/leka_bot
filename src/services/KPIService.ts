// KPI Service - จัดการคะแนนและ Leaderboard

import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { KPIRecord, Task, User, Group } from '@/models';
import { Leaderboard } from '@/types';
import { Task as TaskEntity } from '@/models';
import { config } from '@/utils/config';
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
      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) internalGroupId = groupByLineId.id;

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
      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) internalGroupId = groupByLineId.id;

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
      console.log(`🔍 Getting leaderboard for group: ${groupId}, period: ${period}`);
      
      // รองรับการส่งค่าเป็น LINE Group ID หรือ internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) {
        internalGroupId = groupByLineId.id;
        console.log(`🔄 Converted LINE Group ID to internal ID: ${internalGroupId}`);
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

      // เพิ่ม date filter ตาม period - ชั่วคราวไม่กรองเพื่อทดสอบ
      console.log(`🔍 Temporarily removing date filter for debugging - period: ${period}`);
      /*
      try {
        switch (period) {
          case 'weekly':
            const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').toDate();
            const weekEnd = moment().tz(config.app.defaultTimezone).endOf('week').toDate();
            kpiQuery = kpiQuery.andWhere('kpi.eventDate BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd });
            console.log(`📅 Weekly filter: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
            break;
          case 'monthly':
            const monthStart = moment().tz(config.app.defaultTimezone).startOf('month').toDate();
            const monthEnd = moment().tz(config.app.defaultTimezone).endOf('month').toDate();
            kpiQuery = kpiQuery.andWhere('kpi.eventDate BETWEEN :monthStart AND :monthEnd', { monthStart, monthEnd });
            console.log(`📅 Monthly filter: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);
            break;
          // 'all' ไม่ต้องกรอง
        }
      } catch (timezoneError) {
        console.warn('⚠️ Timezone error, using local time:', timezoneError);
        // Fallback to local time if timezone fails
        switch (period) {
          case 'weekly':
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            kpiQuery = kpiQuery.andWhere('kpi.eventDate BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd });
            break;
          case 'monthly':
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
            kpiQuery = kpiQuery.andWhere('kpi.eventDate BETWEEN :monthStart AND :monthEnd', { monthStart, monthEnd });
            break;
        }
      }
      */

      // Debug: ตรวจสอบข้อมูล KPI ทั้งหมดก่อนกรอง
      const allKpiData = await this.kpiRepository
        .createQueryBuilder('kpi')
        .select([
          'kpi.userId as userId',
          'kpi.eventDate as eventDate',
          'kpi.points as points',
          'kpi.type as type'
        ])
        .where('kpi.groupId = :groupId', { groupId: internalGroupId })
        .orderBy('kpi.eventDate', 'DESC')
        .limit(10)
        .getRawMany();
      
      console.log('🔍 All KPI data (latest 10):', JSON.stringify(allKpiData, null, 2));

      // Execute KPI query
      const kpiResults = await kpiQuery
        .groupBy('kpi.userId')
        .getRawMany();
      
      console.log(`📈 Found KPI data for ${kpiResults.length} users`);
      console.log('🔍 KPI Results:', JSON.stringify(kpiResults, null, 2));
      
      // สร้าง Map สำหรับ KPI data
      const kpiMap = new Map();
      kpiResults.forEach((result: any) => {
        kpiMap.set(result.userId, {
          averagePoints: parseFloat(result.averagePoints) || 0,
          totalPoints: parseFloat(result.totalPoints) || 0,
          tasksCompleted: parseInt(result.tasksCompleted) || 0,
          tasksEarly: parseInt(result.tasksEarly) || 0,
          tasksOnTime: parseInt(result.tasksOnTime) || 0,
          tasksLate: parseInt(result.tasksLate) || 0,
          tasksOvertime: parseInt(result.tasksOvertime) || 0,
          tasksOverdue: parseInt(result.tasksOverdue) || 0
        });
      });
      
      // รวมข้อมูลสมาชิกกับ KPI data
      const leaderboard: Leaderboard[] = [];
      
      for (const member of allMembers) {
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
        
        // คำนวณ trend (เปรียบเทียบกับสัปดาห์/เดือนก่อน)
        let trend: 'up' | 'down' | 'same' = 'same';
        try {
          trend = await this.calculateTrend(member.id, internalGroupId, period);
        } catch (trendError) {
          console.warn(`⚠️ Error calculating trend for user ${member.id}:`, trendError);
          trend = 'same';
        }
        
        leaderboard.push({
          userId: member.id,
          displayName: member.displayName || 'ไม่ทราบชื่อ',
          weeklyPoints: period === 'weekly' ? kpiData.averagePoints : 0,
          monthlyPoints: period === 'monthly' ? kpiData.averagePoints : 0,
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
      console.log('🔍 Final Leaderboard Data:', JSON.stringify(leaderboard, null, 2));
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
   * ดึงสถิติรายสัปดาห์
   */
  public async getWeeklyStats(groupId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    avgCompletionTime: number;
    topPerformer: string;
  }> {
    try {
      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) {
        internalGroupId = groupByLineId.id;
      }

      const weekStart = moment().tz(config.app.defaultTimezone).startOf('week').toDate();
      const weekEnd = moment().tz(config.app.defaultTimezone).endOf('week').toDate();

      // งานทั้งหมดในสัปดาห์
      const totalTasks = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.createdAt >= :weekStart', { weekStart })
        .andWhere('task.createdAt <= :weekEnd', { weekEnd })
        .getCount();

      // งานที่เสร็จ
      const completedTasks = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.status = :status', { status: 'completed' })
        .andWhere('task.completedAt >= :weekStart', { weekStart })
        .andWhere('task.completedAt <= :weekEnd', { weekEnd })
        .getCount();

      // งานที่ค้าง
      const pendingTasks = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.status = :status', { status: 'pending' })
        .getCount();

      // งานที่เกินกำหนด
      const overdueTasks = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.status = :status', { status: 'overdue' })
        .getCount();

      // ผู้ทำงานดีที่สุด
      const leaderboard = await this.getGroupLeaderboard(internalGroupId, 'weekly');
      const topPerformer = leaderboard.length > 0 ? leaderboard[0].displayName : 'ไม่มีข้อมูล';

      // เวลาเฉลี่ยในการทำงาน (ชั่วโมง)
      const completedTasksWithTime = await this.taskRepository
        .createQueryBuilder('task')
        .select(['task.dueTime', 'task.completedAt'])
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.status = :status', { status: 'completed' })
        .andWhere('task.completedAt >= :weekStart', { weekStart })
        .andWhere('task.completedAt <= :weekEnd', { weekEnd })
        .getMany();

      let avgCompletionTime = 0;
      if (completedTasksWithTime.length > 0) {
        const totalTime = completedTasksWithTime.reduce((sum: number, task: any) => {
          const diff = moment(task.completedAt).tz(config.app.defaultTimezone).diff(moment(task.dueTime).tz(config.app.defaultTimezone), 'hours');
          return sum + Math.abs(diff);
        }, 0);
        avgCompletionTime = totalTime / completedTasksWithTime.length;
      }

      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
        topPerformer
      };

    } catch (error) {
      console.error('❌ Error getting weekly stats:', error);
      throw error;
    }
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
      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) {
        internalGroupId = groupByLineId.id;
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

      // งานที่เสร็จแล้ววันนี้ (ใช้ completedAt แทน status เพื่อความแม่นยำ)
      const completedTasks = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.status = :status', { status: 'completed' })
        .andWhere('task.completedAt >= :today', { today })
        .andWhere('task.completedAt < :tomorrow', { tomorrow })
        .getCount();

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

      console.log(`📊 Daily stats for group ${groupId}: Total=${totalTasks}, Completed today=${completedTasks}, Overdue=${overdueTasks}, Pending review=${pendingReviewTasks}`);

      return {
        totalTasks,
        completedTasks,
        overdueTasks,
        pendingReviewTasks
      };

    } catch (error) {
      console.error('❌ Error getting daily stats:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        pendingReviewTasks: 0
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
      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) internalGroupId = groupByLineId.id;

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
      console.log(`🔄 Starting leaderboard sync for group: ${groupId}, period: ${period}`);

      // รองรับ LINE Group ID → internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) internalGroupId = groupByLineId.id;

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

      // ดึงงานทั้งหมดในกลุ่มในช่วงเวลาที่กำหนด
      const tasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere('task.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .getMany();

      console.log(`📋 Found ${tasks.length} tasks to process`);

      // ลบ KPI records เก่าสำหรับช่วงเวลานี้
      const deletedRecords = await this.kpiRepository
        .createQueryBuilder()
        .delete()
        .where('groupId = :groupId', { groupId: internalGroupId })
        .andWhere('eventDate BETWEEN :startDate AND :endDate', { startDate, endDate })
        .execute();

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
            for (const assignee of task.assignedUsers) {
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
          }
        } catch (taskError) {
          console.error(`❌ Error processing task ${task.id}:`, taskError);
          // ดำเนินการต่อกับงานถัดไป
        }
      }

      console.log(`✅ Leaderboard sync completed:`);
      console.log(`   - Processed tasks: ${processedTasks}`);
      console.log(`   - Updated users: ${processedUsers.size}`);
      console.log(`   - Completed tasks: ${completedTasks}`);
      console.log(`   - Overdue tasks: ${overdueTasks}`);
      console.log(`   - Early completions: ${earlyCompletions}`);
      console.log(`   - On-time completions: ${onTimeCompletions}`);
      console.log(`   - Late completions: ${lateCompletions}`);
      console.log(`   - Overtime completions: ${overtimeCompletions}`);

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
      
      // รองรับการส่งค่าเป็น LINE Group ID หรือ internal UUID
      let internalGroupId = groupId;
      const groupByLineId = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
      if (groupByLineId) {
        internalGroupId = groupByLineId.id;
        console.log(`🔄 Converted LINE Group ID to internal ID: ${internalGroupId}`);
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