"use strict";
// Activity Logger Utility
// Helper functions for logging user activities across the application
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceTypes = exports.ActivityActions = void 0;
exports.getIpAddress = getIpAddress;
exports.getUserAgent = getUserAgent;
exports.logActivity = logActivity;
const ActivityLogService_1 = require("@/services/ActivityLogService");
const activityLogService = new ActivityLogService_1.ActivityLogService();
/**
 * Extract IP address from request
 */
function getIpAddress(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined);
}
/**
 * Extract user agent from request
 */
function getUserAgent(req) {
    return req.headers['user-agent'];
}
/**
 * Log activity helper
 */
async function logActivity(groupId, userId, action, resourceType, resourceId, details, req) {
    try {
        const params = {
            groupId,
            userId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress: req ? getIpAddress(req) : undefined,
            userAgent: req ? getUserAgent(req) : undefined,
        };
        await activityLogService.logActivity(params);
    }
    catch (error) {
        console.error('Failed to log activity:', error);
        // Don't throw - logging failures shouldn't break the main operation
    }
}
/**
 * Common activity actions
 */
exports.ActivityActions = {
    // Task actions
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_DELETED: 'task.deleted',
    TASK_ASSIGNED: 'task.assigned',
    TASK_UNASSIGNED: 'task.unassigned',
    TASK_STATUS_CHANGED: 'task.status_changed',
    TASK_SUBMITTED: 'task.submitted',
    TASK_APPROVED: 'task.approved',
    TASK_REJECTED: 'task.rejected',
    // File actions
    FILE_UPLOADED: 'file.uploaded',
    FILE_DOWNLOADED: 'file.downloaded',
    FILE_DELETED: 'file.deleted',
    FILE_PREVIEWED: 'file.previewed',
    // Member actions
    MEMBER_ADDED: 'member.added',
    MEMBER_REMOVED: 'member.removed',
    MEMBER_ROLE_CHANGED: 'member.role_changed',
    MEMBERS_BULK_DELETED: 'members.bulk_deleted',
    MEMBERS_BULK_ROLE_UPDATED: 'members.bulk_role_updated',
    // Recurring task actions
    RECURRING_TASK_CREATED: 'recurring_task.created',
    RECURRING_TASK_UPDATED: 'recurring_task.updated',
    RECURRING_TASK_DELETED: 'recurring_task.deleted',
    RECURRING_TASK_GENERATED: 'recurring_task.generated',
    // User actions
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_PROFILE_UPDATED: 'user.profile_updated',
    USER_EMAIL_VERIFIED: 'user.email_verified',
    // Group actions
    GROUP_CREATED: 'group.created',
    GROUP_UPDATED: 'group.updated',
    GROUP_SETTINGS_CHANGED: 'group.settings_changed',
    // Report actions
    REPORT_GENERATED: 'report.generated',
    REPORT_EXPORTED: 'report.exported',
};
/**
 * Common resource types
 */
exports.ResourceTypes = {
    TASK: 'task',
    FILE: 'file',
    MEMBER: 'member',
    USER: 'user',
    GROUP: 'group',
    RECURRING_TASK: 'recurring_task',
    REPORT: 'report',
};
//# sourceMappingURL=activityLogger.js.map