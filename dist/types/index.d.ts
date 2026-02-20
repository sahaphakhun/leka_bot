export interface Group {
    id: string;
    lineGroupId: string;
    name: string;
    timezone: string;
    settings: GroupSettings;
    createdAt: Date;
    updatedAt: Date;
}
export interface GroupSettings {
    reminderIntervals: string[];
    enableLeaderboard: boolean;
    googleCalendarId?: string;
    googleRefreshToken?: string;
    defaultReminders: string[];
    workingHours: {
        start: string;
        end: string;
    };
    pendingDeletionRequest?: {
        id: string;
        filter?: 'all' | 'incomplete' | 'custom';
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
}
export interface User {
    id: string;
    lineUserId: string;
    displayName: string;
    realName?: string;
    email?: string;
    timezone: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    settings?: {
        googleCalendarId?: string;
        googleRefreshToken?: string;
    };
}
export interface GroupMember {
    id: string;
    groupId: string;
    userId: string;
    role: 'admin' | 'member';
    joinedAt: Date;
}
export interface Task {
    id: string;
    groupId: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 'approved' | 'completed' | 'rejected' | 'cancelled' | 'overdue';
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    startTime?: Date;
    dueTime: Date;
    completedAt?: Date;
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    assignees: string[];
    createdBy: string;
    reviewerUserId?: string;
    assignedUsers?: Array<{
        id: string;
        lineUserId: string;
        displayName: string;
        realName?: string;
        email?: string;
    }>;
    createdByUser?: {
        id: string;
        lineUserId: string;
        displayName: string;
        realName?: string;
        email?: string;
    } | null;
    remindersSent: ReminderLog[];
    customReminders?: string[];
    googleEventId?: string;
    googleEventIds?: Record<string, {
        calendarId: string;
        eventId: string;
    }>;
    attachedFiles: File[];
    workflow?: TaskWorkflow;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReminderLog {
    type: string;
    sentAt: Date;
    channels: ('line' | 'email')[];
}
export interface TaskWorkflow {
    submissions?: TaskSubmission[];
    review?: TaskReview;
    approval?: TaskApproval;
    history?: WorkflowHistory[];
}
export interface TaskSubmission {
    submittedByUserId: string;
    submittedAt: Date;
    fileIds: string[];
    comment?: string;
    links?: string[];
    lateSubmission?: boolean;
}
export interface TaskReview {
    reviewerUserId: string;
    status: 'not_requested' | 'pending' | 'approved' | 'rejected';
    reviewRequestedAt?: Date;
    reviewDueAt?: Date;
    reviewedAt?: Date;
    reviewerComment?: string;
    lateReview?: boolean;
}
export interface TaskApproval {
    creatorUserId: string;
    status: 'not_requested' | 'pending' | 'approved';
    approvalRequestedAt?: Date;
    approvedAt?: Date;
    creatorComment?: string;
}
export interface WorkflowHistory {
    action: 'create' | 'submit' | 'review' | 'approve' | 'reject' | 'revise_due' | 'complete';
    byUserId: string;
    at: Date;
    note?: string;
}
export interface File {
    id: string;
    groupId: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    uploadedAt: Date;
    attachmentType?: 'initial' | 'submission';
    tags: string[];
    linkedTasks: string[];
    path: string;
    isPublic: boolean;
}
export interface KPIRecord {
    id: string;
    userId: string;
    groupId: string;
    taskId: string;
    type: 'assignee_early' | 'assignee_ontime' | 'assignee_late' | 'creator_completion' | 'creator_ontime_bonus' | 'streak_bonus' | 'penalty_overdue';
    role: 'assignee' | 'creator' | 'bonus' | 'penalty';
    points: number;
    metadata?: Record<string, any>;
    eventDate: Date;
    weekOf: Date;
    monthOf: Date;
    createdAt: Date;
}
export interface Leaderboard {
    userId: string;
    displayName: string;
    weeklyPoints: number;
    monthlyPoints: number;
    totalPoints: number;
    tasksCompleted: number;
    tasksEarly: number;
    tasksOnTime: number;
    tasksLate: number;
    tasksOverdue: number;
    onTimeRate: number;
    createdCompletedRate: number;
    consistencyScore: number;
    bonusPoints: number;
    penaltyPoints: number;
    totalScore: number;
    rank: number;
    trend: 'up' | 'down' | 'same';
}
export interface LineWebhookEvent {
    type: string;
    source: {
        type: 'group' | 'user';
        groupId?: string;
        userId: string;
    };
    message?: {
        type: string;
        text?: string;
        id?: string;
    };
    timestamp: number;
    replyToken?: string;
}
export interface BotCommand {
    command: string;
    args: string[];
    mentions: string[];
    groupId: string;
    userId: string;
    originalText: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    debug?: any;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    assignees: {
        id: string;
        name: string;
    }[];
    status: Task['status'];
    priority: Task['priority'];
    tags: string[];
}
export interface DashboardStats {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    pendingTasks: number;
    thisWeekTasks: number;
    thisMonthTasks: number;
    activeMembers: number;
    totalFiles: number;
}
export interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}
export interface NotificationPayload {
    type: 'task_created' | 'task_reminder' | 'task_overdue' | 'task_completed' | 'weekly_summary';
    groupId: string;
    recipients: string[];
    data: any;
    channels: ('line' | 'email')[];
}
export interface GoogleCalendarEvent {
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: {
        email: string;
        displayName?: string;
    }[];
    reminders: {
        useDefault: boolean;
        overrides?: {
            method: 'email' | 'popup';
            minutes: number;
        }[];
    };
}
export interface NotificationCard {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    buttons: NotificationButton[];
    targetType: 'group' | 'user' | 'both';
    groupIds?: string[];
    userIds?: string[];
    priority: 'low' | 'medium' | 'high';
    expiresAt?: Date;
    createdAt: Date;
    sentAt?: Date;
    status: 'pending' | 'sent' | 'failed';
}
export interface NotificationButton {
    id: string;
    label: string;
    action: 'add_task' | 'close_task' | 'request_extension' | 'approve' | 'reject' | 'view_details' | 'custom';
    data?: Record<string, any>;
    style?: 'primary' | 'secondary' | 'danger';
    url?: string;
}
export interface CreateNotificationCardRequest {
    title: string;
    description?: string;
    imageUrl?: string;
    buttons?: NotificationButton[];
    targetType: 'group' | 'user' | 'both';
    groupIds?: string[];
    userIds?: string[];
    priority?: 'low' | 'medium' | 'high';
    expiresAt?: Date;
}
export interface NotificationCardResponse {
    success: boolean;
    data?: NotificationCard;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map