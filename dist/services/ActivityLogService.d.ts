import { ActivityLog } from "../models";
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
    byAction: {
        [key: string]: number;
    };
    byUser: {
        [key: string]: number;
    };
    byResourceType: {
        [key: string]: number;
    };
    recentActivity: number;
}
export declare class ActivityLogService {
    private repository;
    constructor();
    /**
     * Log an activity
     */
    logActivity(params: LogActivityParams): Promise<ActivityLog>;
    /**
     * Get activity logs with filters
     */
    getActivityLogs(params: GetActivityLogsParams): Promise<{
        logs: ActivityLog[];
        total: number;
    }>;
    /**
     * Get activity statistics
     */
    getActivityStats(groupId: string, days?: number): Promise<ActivityStats>;
    /**
     * Get logs for a specific resource
     */
    getResourceLogs(groupId: string, resourceType: string, resourceId: string, limit?: number): Promise<ActivityLog[]>;
    /**
     * Get logs for a specific user
     */
    getUserLogs(groupId: string, userId: string, limit?: number): Promise<ActivityLog[]>;
    /**
     * Delete old logs (cleanup)
     */
    deleteOldLogs(groupId: string, daysToKeep?: number): Promise<number>;
    /**
     * Get unique actions in a group
     */
    getUniqueActions(groupId: string): Promise<string[]>;
    /**
     * Get unique resource types in a group
     */
    getUniqueResourceTypes(groupId: string): Promise<string[]>;
}
//# sourceMappingURL=ActivityLogService.d.ts.map