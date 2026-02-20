export declare class Group {
    id: string;
    lineGroupId: string;
    name: string;
    timezone: string;
    settings: {
        reminderIntervals: string[];
        enableLeaderboard: boolean;
        googleCalendarId?: string;
        googleRefreshToken?: string;
        defaultReminders: string[];
        workingHours: {
            start: string;
            end: string;
        };
        reportRecipients?: string[];
        supervisors?: string[];
        pendingDeletionRequest?: {
            id: string;
            filter?: "all" | "incomplete" | "custom";
            requestedBy: {
                userId: string;
                lineUserId: string;
                displayName?: string;
            };
            createdAt: string;
            tasks: Array<{
                id: string;
                title: string;
                status: string;
                assignees?: string[];
            }>;
            totalMembers: number;
            requiredApprovals: number;
            approvals: Array<{
                userId: string;
                lineUserId: string;
                displayName?: string;
                approvedAt: string;
            }>;
        };
    };
    createdAt: Date;
    updatedAt: Date;
    members: GroupMember[];
    tasks: Task[];
    files: File[];
}
export declare class User {
    id: string;
    lineUserId: string;
    displayName: string;
    realName?: string;
    email?: string;
    timezone: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    settings: {
        googleCalendarId?: string;
        googleRefreshToken?: string;
        emailVerification?: {
            email: string;
            token: string;
            expiresAt: string;
        };
    };
    groupMemberships: GroupMember[];
    createdTasks: Task[];
    assignedTasks: Task[];
    kpiRecords: KPIRecord[];
}
export declare class GroupMember {
    id: string;
    groupId: string;
    userId: string;
    role: "admin" | "member";
    joinedAt: Date;
    group: Group;
    user: User;
}
export declare class Task {
    id: string;
    groupId: string;
    title: string;
    description?: string;
    status: "pending" | "in_progress" | "submitted" | "reviewed" | "approved" | "completed" | "rejected" | "cancelled" | "overdue";
    priority: "low" | "medium" | "high";
    tags: string[];
    startTime?: Date;
    dueTime: Date;
    completedAt?: Date;
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    requireAttachment: boolean;
    recurringTaskId?: string;
    recurringInstance?: number;
    createdBy: string;
    remindersSent: {
        type: string;
        sentAt: Date;
        channels: ("line" | "email")[];
    }[];
    customReminders?: string[];
    googleEventId?: string;
    googleEventIds: Record<string, {
        calendarId: string;
        eventId: string;
    }>;
    workflow: {
        submissions?: Array<{
            submittedByUserId: string;
            submittedAt: Date;
            fileIds: string[];
            comment?: string;
            links?: string[];
            lateSubmission?: boolean;
        }>;
        review?: {
            reviewerUserId: string;
            status: "not_requested" | "pending" | "approved" | "rejected";
            reviewRequestedAt?: Date;
            reviewDueAt?: Date;
            reviewedAt?: Date;
            reviewerComment?: string;
            lateReview?: boolean;
        };
        approval?: {
            creatorUserId: string;
            status: "not_requested" | "pending" | "approved";
            approvalRequestedAt?: Date;
            approvedAt?: Date;
            creatorComment?: string;
        };
        history?: Array<{
            action: "create" | "submit" | "review" | "approve" | "reject" | "revise_due" | "complete";
            byUserId: string;
            at: Date;
            note?: string;
        }>;
    };
    createdAt: Date;
    updatedAt: Date;
    group: Group;
    createdByUser: User;
    assignedUsers: User[];
    attachedFiles: File[];
    kpiRecords: KPIRecord[];
}
export declare class File {
    id: string;
    groupId: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    path: string;
    storageProvider?: string;
    storageKey?: string;
    uploadedBy: string;
    tags: string[];
    isPublic: boolean;
    folderStatus: "in_progress" | "completed";
    attachmentType?: "initial" | "submission";
    uploadedAt: Date;
    group: Group;
    uploadedByUser: User;
    linkedTasks: Task[];
}
export declare class KPIRecord {
    id: string;
    userId: string;
    groupId: string;
    taskId: string;
    type: "assignee_early" | "assignee_ontime" | "assignee_late" | "creator_completion" | "creator_ontime_bonus" | "streak_bonus" | "penalty_overdue";
    role: "assignee" | "creator" | "bonus" | "penalty";
    points: number;
    metadata?: Record<string, any>;
    eventDate: Date;
    weekOf: Date;
    monthOf: Date;
    createdAt: Date;
    user: User;
    group: Group;
    task: Task;
}
export declare class RecurringTask {
    id: string;
    lineGroupId: string;
    title: string;
    description?: string;
    assigneeLineUserIds: string[];
    reviewerLineUserId?: string;
    requireAttachment: boolean;
    priority: "low" | "medium" | "high";
    tags: string[];
    recurrence: "weekly" | "monthly" | "quarterly";
    weekDay?: number;
    dayOfMonth?: number;
    timeOfDay: string;
    timezone: string;
    durationDays: number;
    totalInstances: number;
    lastRunAt?: Date;
    nextRunAt: Date;
    active: boolean;
    createdByLineUserId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ActivityLog {
    id: string;
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
    createdAt: Date;
    group: Group;
    user?: User;
}
//# sourceMappingURL=index.d.ts.map