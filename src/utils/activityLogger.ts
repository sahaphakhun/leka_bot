// Activity Logger Utility
// Helper functions for logging user activities across the application

import { Request } from 'express';
import { ActivityLogService, LogActivityParams } from '@/services/ActivityLogService';

const activityLogService = new ActivityLogService();

/**
 * Extract IP address from request
 */
export function getIpAddress(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    undefined
  );
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

/**
 * Log activity helper
 */
export async function logActivity(
  groupId: string,
  userId: string | undefined,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any,
  req?: Request
): Promise<void> {
  try {
    const params: LogActivityParams = {
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
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

/**
 * Common activity actions
 */
export const ActivityActions = {
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
export const ResourceTypes = {
  TASK: 'task',
  FILE: 'file',
  MEMBER: 'member',
  USER: 'user',
  GROUP: 'group',
  RECURRING_TASK: 'recurring_task',
  REPORT: 'report',
};
