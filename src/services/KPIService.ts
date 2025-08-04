// KPI Service - จัดการคะแนนและ Leaderboard

import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { KPIRecord, Task, User, Group } from '@/models';
import { Leaderboard } from '@/types';
import { config } from '@/utils/config';
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
   * บันทึกการทำงานเสร็จ
   */
  public async recordTaskCompletion(
    task: Task, 
    completionType: 'early' | 'ontime' | 'late' | 'overtime'
  ): Promise<KPIRecord> {
    try {
      const points = config.app.kpiScoring[completionType];
      const eventDate = new Date();
      
      // คำนวณสัปดาห์และเดือน
      const weekOf = moment(eventDate).startOf('week').toDate();
      const monthOf = moment(eventDate).startOf('month').toDate();

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
   * คำนวณประเภทการทำงานเสร็จ
   */
  public calculateCompletionType(task: Task): 'early' | 'ontime' | 'late' | 'overtime' {
    const dueTime = moment(task.dueTime);
    const completedTime = moment(task.completedAt);
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
   * ดึง Leaderboard ของกลุ่ม
   */
  public async getGroupLeaderboard(
    groupId: string, 
    period: 'weekly' | 'monthly' | 'all' = 'weekly'
  ): Promise<Leaderboard[]> {
    try {
      let dateFilter: any = {};
      
      switch (period) {
        case 'weekly':
          const weekStart = moment().startOf('week').toDate();
          dateFilter = { weekOf: weekStart };
          break;
        case 'monthly':
          const monthStart = moment().startOf('month').toDate();
          dateFilter = { monthOf: monthStart };
          break;
        // 'all' ไม่ต้องกรอง
      }

      // Query คะแนนรวม
      const results = await this.kpiRepository
        .createQueryBuilder('kpi')
        .select([
          'kpi.userId as userId',
          'user.displayName as displayName',
          'SUM(kpi.points) as totalPoints',
          'COUNT(CASE WHEN kpi.type = \'early\' THEN 1 END) as tasksEarly',
          'COUNT(CASE WHEN kpi.type = \'ontime\' THEN 1 END) as tasksOnTime',
          'COUNT(CASE WHEN kpi.type = \'late\' THEN 1 END) as tasksLate',
          'COUNT(CASE WHEN kpi.type = \'overtime\' THEN 1 END) as tasksOvertime',
          'COUNT(*) as tasksCompleted'
        ])
        .leftJoin(User, 'user', 'user.id = kpi.userId')
        .where('kpi.groupId = :groupId', { groupId })
        .andWhere(dateFilter)
        .groupBy('kpi.userId, user.displayName')
        .orderBy('totalPoints', 'DESC')
        .getRawMany();

      // แปลงเป็น Leaderboard format และคำนวณ trend
      const leaderboard: Leaderboard[] = [];
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const userId = result.userId;
        
        // คำนวณ trend (เปรียบเทียบกับสัปดาห์/เดือนก่อน)
        const trend = await this.calculateTrend(userId, groupId, period);
        
        leaderboard.push({
          userId,
          displayName: result.displayName,
          weeklyPoints: period === 'weekly' ? parseInt(result.totalPoints) : 0,
          monthlyPoints: period === 'monthly' ? parseInt(result.totalPoints) : 0,
          totalPoints: parseInt(result.totalPoints),
          tasksCompleted: parseInt(result.tasksCompleted),
          tasksEarly: parseInt(result.tasksEarly),
          tasksOnTime: parseInt(result.tasksOnTime),
          tasksLate: parseInt(result.tasksLate),
          tasksOvertime: parseInt(result.tasksOvertime),
          rank: i + 1,
          trend
        });
      }

      return leaderboard;

    } catch (error) {
      console.error('❌ Error getting group leaderboard:', error);
      throw error;
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
      const weekStart = moment().startOf('week').toDate();
      const weekEnd = moment().endOf('week').toDate();

      // งานทั้งหมดในสัปดาห์
      const totalTasks = await this.taskRepository.count({
        where: {
          groupId,
          createdAt: {
            $gte: weekStart,
            $lte: weekEnd
          } as any
        }
      });

      // งานที่เสร็จ
      const completedTasks = await this.taskRepository.count({
        where: {
          groupId,
          status: 'completed',
          completedAt: {
            $gte: weekStart,
            $lte: weekEnd
          } as any
        }
      });

      // งานที่ค้าง
      const pendingTasks = await this.taskRepository.count({
        where: {
          groupId,
          status: 'pending'
        }
      });

      // งานที่เกินกำหนด
      const overdueTasks = await this.taskRepository.count({
        where: {
          groupId,
          status: 'overdue'
        }
      });

      // ผู้ทำงานดีที่สุด
      const leaderboard = await this.getGroupLeaderboard(groupId, 'weekly');
      const topPerformer = leaderboard.length > 0 ? leaderboard[0].displayName : 'ไม่มีข้อมูล';

      // เวลาเฉลี่ยในการทำงาน (ชั่วโมง)
      const completedTasksWithTime = await this.taskRepository.find({
        where: {
          groupId,
          status: 'completed',
          completedAt: {
            $gte: weekStart,
            $lte: weekEnd
          } as any
        },
        select: ['dueTime', 'completedAt']
      });

      let avgCompletionTime = 0;
      if (completedTasksWithTime.length > 0) {
        const totalTime = completedTasksWithTime.reduce((sum, task) => {
          const diff = moment(task.completedAt).diff(moment(task.dueTime), 'hours');
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
    completionRate: number;
    avgPointsPerTask: number;
  }> {
    try {
      let dateFilter: any = {};
      
      switch (period) {
        case 'weekly':
          const weekStart = moment().startOf('week').toDate();
          dateFilter = { weekOf: weekStart };
          break;
        case 'monthly':
          const monthStart = moment().startOf('month').toDate();
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
          'COUNT(CASE WHEN kpi.type = \'late\' THEN 1 END) as tasksLate'
        ])
        .where('kpi.userId = :userId', { userId })
        .andWhere('kpi.groupId = :groupId', { groupId })
        .andWhere(dateFilter)
        .getRawOne();

      // หาอันดับ
      const leaderboard = await this.getGroupLeaderboard(groupId, period);
      const userRank = leaderboard.find(u => u.userId === userId)?.rank || 0;

      // งานทั้งหมดที่ได้รับมอบหมาย
      const totalAssignedTasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoin('task.assignedUsers', 'user')
        .where('user.id = :userId', { userId })
        .andWhere('task.groupId = :groupId', { groupId })
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
      const cutoffDate = moment().subtract(daysToKeep, 'days').toDate();
      
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

      return records.map(record => ({
        วันที่: moment(record.eventDate).format('DD/MM/YYYY'),
        ผู้ใช้: record.user.displayName,
        งาน: record.task.title,
        ประเภท: record.type,
        คะแนน: record.points,
        สัปดาห์: moment(record.weekOf).format('DD/MM/YYYY'),
        เดือน: moment(record.monthOf).format('MM/YYYY')
      }));

    } catch (error) {
      console.error('❌ Error exporting KPI data:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * คำนวณ trend ของผู้ใช้
   */
  private async calculateTrend(
    userId: string, 
    groupId: string, 
    period: 'weekly' | 'monthly' | 'all'
  ): Promise<'up' | 'down' | 'same'> {
    try {
      if (period === 'all') return 'same';

      // หาคะแนนปัจจุบัน
      const currentPeriod = period === 'weekly' 
        ? moment().startOf('week').toDate()
        : moment().startOf('month').toDate();

      const currentPoints = await this.kpiRepository
        .createQueryBuilder('kpi')
        .select('SUM(kpi.points)', 'points')
        .where('kpi.userId = :userId', { userId })
        .andWhere('kpi.groupId = :groupId', { groupId })
        .andWhere(period === 'weekly' ? 'kpi.weekOf = :period' : 'kpi.monthOf = :period', { period: currentPeriod })
        .getRawOne();

      // หาคะแนนช่วงก่อน
      const previousPeriod = period === 'weekly'
        ? moment().subtract(1, 'week').startOf('week').toDate()
        : moment().subtract(1, 'month').startOf('month').toDate();

      const previousPoints = await this.kpiRepository
        .createQueryBuilder('kpi')
        .select('SUM(kpi.points)', 'points')
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
}