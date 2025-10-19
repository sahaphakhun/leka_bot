"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogService = void 0;
const database_1 = require("../utils/database");
const models_1 = require("../models");
const typeorm_1 = require("typeorm");
class ActivityLogService {
    constructor() {
        this.repository = database_1.AppDataSource.getRepository(models_1.ActivityLog);
    }
    /**
     * Log an activity
     */
    async logActivity(params) {
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
        }
        catch (error) {
            console.error("❌ Failed to log activity:", error);
            // Don't throw - logging failures shouldn't break the main operation
            return null;
        }
    }
    /**
     * Get activity logs with filters
     */
    async getActivityLogs(params) {
        const { groupId, userId, action, resourceType, resourceId, startDate, endDate, limit = 50, offset = 0, search, } = params;
        const queryBuilder = this.repository
            .createQueryBuilder("log")
            .leftJoinAndSelect("log.user", "user")
            .where("log.groupId = :groupId", { groupId });
        // Filter by user
        if (userId) {
            queryBuilder.andWhere("log.userId = :userId", { userId });
        }
        // Filter by action
        if (action) {
            queryBuilder.andWhere("log.action = :action", { action });
        }
        // Filter by resource type
        if (resourceType) {
            queryBuilder.andWhere("log.resourceType = :resourceType", {
                resourceType,
            });
        }
        // Filter by resource ID
        if (resourceId) {
            queryBuilder.andWhere("log.resourceId = :resourceId", { resourceId });
        }
        // Filter by date range
        if (startDate && endDate) {
            queryBuilder.andWhere("log.createdAt BETWEEN :startDate AND :endDate", {
                startDate,
                endDate,
            });
        }
        else if (startDate) {
            queryBuilder.andWhere("log.createdAt >= :startDate", { startDate });
        }
        else if (endDate) {
            queryBuilder.andWhere("log.createdAt <= :endDate", { endDate });
        }
        // Search in action, resourceType, or user display name
        if (search) {
            queryBuilder.andWhere("(log.action ILIKE :search OR log.resourceType ILIKE :search OR user.displayName ILIKE :search)", { search: `%${search}%` });
        }
        // Order by newest first
        queryBuilder.orderBy("log.createdAt", "DESC");
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
    async getActivityStats(groupId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const logs = await this.repository.find({
            where: {
                groupId,
                createdAt: (0, typeorm_1.Between)(startDate, new Date()),
            },
            relations: ["user"],
        });
        const stats = {
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
    async getResourceLogs(groupId, resourceType, resourceId, limit = 20) {
        return await this.repository.find({
            where: {
                groupId,
                resourceType,
                resourceId,
            },
            relations: ["user"],
            order: {
                createdAt: "DESC",
            },
            take: limit,
        });
    }
    /**
     * Get logs for a specific user
     */
    async getUserLogs(groupId, userId, limit = 50) {
        return await this.repository.find({
            where: {
                groupId,
                userId,
            },
            relations: ["user"],
            order: {
                createdAt: "DESC",
            },
            take: limit,
        });
    }
    /**
     * Delete old logs (cleanup)
     */
    async deleteOldLogs(groupId, daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await this.repository
            .createQueryBuilder()
            .delete()
            .from(models_1.ActivityLog)
            .where("groupId = :groupId", { groupId })
            .andWhere("createdAt < :cutoffDate", { cutoffDate })
            .execute();
        return result.affected || 0;
    }
    /**
     * Get unique actions in a group
     */
    async getUniqueActions(groupId) {
        const logs = await this.repository
            .createQueryBuilder("log")
            .select("DISTINCT log.action", "action")
            .where("log.groupId = :groupId", { groupId })
            .getRawMany();
        return logs.map((log) => log.action);
    }
    /**
     * Get unique resource types in a group
     */
    async getUniqueResourceTypes(groupId) {
        const logs = await this.repository
            .createQueryBuilder("log")
            .select("DISTINCT log.resourceType", "resourceType")
            .where("log.groupId = :groupId", { groupId })
            .getRawMany();
        return logs.map((log) => log.resourceType);
    }
}
exports.ActivityLogService = ActivityLogService;
//# sourceMappingURL=ActivityLogService.js.map