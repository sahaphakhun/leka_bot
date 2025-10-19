import { Request } from 'express';
/**
 * Extract IP address from request
 */
export declare function getIpAddress(req: Request): string | undefined;
/**
 * Extract user agent from request
 */
export declare function getUserAgent(req: Request): string | undefined;
/**
 * Log activity helper
 */
export declare function logActivity(groupId: string, userId: string | undefined, action: string, resourceType: string, resourceId?: string, details?: any, req?: Request): Promise<void>;
/**
 * Common activity actions
 */
export declare const ActivityActions: {
    TASK_CREATED: string;
    TASK_UPDATED: string;
    TASK_DELETED: string;
    TASK_ASSIGNED: string;
    TASK_UNASSIGNED: string;
    TASK_STATUS_CHANGED: string;
    TASK_SUBMITTED: string;
    TASK_APPROVED: string;
    TASK_REJECTED: string;
    FILE_UPLOADED: string;
    FILE_DOWNLOADED: string;
    FILE_DELETED: string;
    FILE_PREVIEWED: string;
    MEMBER_ADDED: string;
    MEMBER_REMOVED: string;
    MEMBER_ROLE_CHANGED: string;
    MEMBERS_BULK_DELETED: string;
    MEMBERS_BULK_ROLE_UPDATED: string;
    RECURRING_TASK_CREATED: string;
    RECURRING_TASK_UPDATED: string;
    RECURRING_TASK_DELETED: string;
    RECURRING_TASK_GENERATED: string;
    USER_LOGIN: string;
    USER_LOGOUT: string;
    USER_PROFILE_UPDATED: string;
    USER_EMAIL_VERIFIED: string;
    GROUP_CREATED: string;
    GROUP_UPDATED: string;
    GROUP_SETTINGS_CHANGED: string;
    REPORT_GENERATED: string;
    REPORT_EXPORTED: string;
};
/**
 * Common resource types
 */
export declare const ResourceTypes: {
    TASK: string;
    FILE: string;
    MEMBER: string;
    USER: string;
    GROUP: string;
    RECURRING_TASK: string;
    REPORT: string;
};
//# sourceMappingURL=activityLogger.d.ts.map