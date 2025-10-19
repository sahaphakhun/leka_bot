import { AppDataSource } from '../index';
import { ActivityLog } from '../models';
import { Repository, Between, In, Like } from 'typeorm';

export interface LogActivityParams {
  groupId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: {
    oldValue?: any;
    newValue?: any;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface GetActivityLogsParams {
  groupId: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ActivityStats {
  totalLogs: number;
  byAction: { [key: string]: number };
  byUser: { [key: string]: number };
  byResourceType: { [key: string]: number };
  recentActivity: number; // Last 24 hours
}

export class ActivityLogService {
  private repository: Repository<ActivityLog>;

  constructor() {
    this.repository = AppDataSource.getRepository(ActivityLog);
  }

  /**
   * Log an activity
   */
  async logActivity(params: LogActivityParams): Promise<ActivityLog> {
    try {
      const log = this.repository.create({
        groupId: params.groupId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      return await this.repository.save(log);
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      // Don't throw - logging failures shouldn't break the main operation
      return null as any;
    }
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(params: GetActivityLogsParams): Promise<{
    logs: ActivityLog[];
    total: number;
  }> {
    const {
      groupId,
      userId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      search,
    } = params;

    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.groupId = :groupId', { groupId });

    // Filter by user
    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    // Filter by action
    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    // Filter by resource type
    if (resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', { resourceType });
    }

    // Filter by resource ID
    if (resourceId) {
      queryBuilder.andWhere('log.resourceId = :resourceId', { resourceId });
    }

    // Filter by date range
    if (startDate && endDate) {
      queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    // Search in action, resourceType, or user display name
    if (search) {
      queryBuilder.andWhere(
        '(log.action ILIKE :search OR log.resourceType ILIKE :search OR user.displayName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Order by newest first
    queryBuilder.orderBy('log.createdAt', 'DESC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Get logs
    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(groupId: string, days: number = 30): Promise<ActivityStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.repository.find({
      where: {
        groupId,
        createdAt: Between(startDate, new Date()) as any,
      },
      relations: ['user'],
    });

    const stats: ActivityStats = {
      totalLogs: logs.length,
      byAction: {},
      byUser: {},
      byResourceType: {},
      recentActivity: 0,
    };

    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    logs.forEach((log) => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by user
      if (log.user) {
        const userName = log.user.displayName || log.user.lineUserId;
        stats.byUser[userName] = (stats.byUser[userName] || 0) + 1;
      }

      // Count by resource type
      stats.byResourceType[log.resourceType] =
        (stats.byResourceType[log.resourceType] || 0) + 1;

      // Count recent activity (last 24 hours)
      if (log.createdAt >= yesterday) {
        stats.recentActivity++;
      }
    });

    return stats;
  }

  /**
   * Get logs for a specific resource
   */
  async getResourceLogs(
    groupId: string,
    resourceType: string,
    resourceId: string,
    limit: number = 20
  ): Promise<ActivityLog[]> {
    return await this.repository.find({
      where: {
        groupId,
        resourceType,
        resourceId,
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(
    groupId: string,
    userId: string,
    limit: number = 50
  ): Promise<ActivityLog[]> {
    return await this.repository.find({
      where: {
        groupId,
        userId,
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Delete old logs (cleanup)
   */
  async deleteOldLogs(groupId: string, daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(ActivityLog)
      .where('groupId = :groupId', { groupId })
      .andWhere('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get unique actions in a group
   */
  async getUniqueActions(groupId: string): Promise<string[]> {
    const logs = await this.repository
      .createQueryBuilder('log')
      .select('DISTINCT log.action', 'action')
      .where('log.groupId = :groupId', { groupId })
      .getRawMany();

    return logs.map((log) => log.action);
  }

  /**
   * Get unique resource types in a group
   */
  async getUniqueResourceTypes(groupId: string): Promise<string[]> {
    const logs = await this.repository
      .createQueryBuilder('log')
      .select('DISTINCT log.resourceType', 'resourceType')
      .where('log.groupId = :groupId', { groupId })
      .getRawMany();

    return logs.map((log) => log.resourceType);
  }
}
