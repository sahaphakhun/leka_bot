// ประเภทข้อมูลหลักสำหรับระบบ Leka Bot

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
  reminderIntervals: string[]; // เช่น ['7d', '1d', '3h']
  enableLeaderboard: boolean;
  googleCalendarId?: string;
  googleRefreshToken?: string;
  defaultReminders: string[];
  workingHours: {
    start: string; // 'HH:mm'
    end: string;   // 'HH:mm'
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
  
  // วันเวลา
  startTime?: Date;
  dueTime: Date;
  completedAt?: Date;
  
  // เพิ่มฟิลด์เวลาใหม่สำหรับ workflow
  submittedAt?: Date;      // เวลาส่งงาน
  reviewedAt?: Date;       // เวลาตรวจสอบ
  approvedAt?: Date;       // เวลาอนุมัติ
  
  // ผู้รับผิดชอบ
  assignees: string[]; // User IDs
  createdBy: string;   // User ID
  
  // การเตือน
  remindersSent: ReminderLog[];
  customReminders?: string[];
  
  // การเชื่อมต่อ
  googleEventId?: string;
  attachedFiles: string[]; // File IDs
  
  // Workflow
  workflow?: TaskWorkflow;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderLog {
  type: string; // '7d', '1d', '3h', 'due'
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
  fileName: string; // ชื่อไฟล์ที่เก็บจริง
  mimeType: string;
  size: number;
  uploadedBy: string; // User ID
  uploadedAt: Date;
  
  // การจัดหมวดหมู่
  tags: string[];
  linkedTasks: string[]; // Task IDs
  
  // เส้นทางไฟล์
  path: string;
  isPublic: boolean;
}

export interface KPIRecord {
  id: string;
  userId: string;
  groupId: string;
  taskId: string;
  
  // ประเภทการให้คะแนน
  type: 'early' | 'ontime' | 'late' | 'overtime' | 'overdue' | 'approval' | 'review';
  points: number;
  
  // วันเวลาที่เกิดเหตุการณ์
  eventDate: Date;
  weekOf: Date; // วันแรกของสัปดาห์
  monthOf: Date; // วันแรกของเดือน
  
  createdAt: Date;
}

export interface Leaderboard {
  userId: string;
  displayName: string;
  weeklyPoints: number;
  monthlyPoints: number;
  totalPoints: number;
  
  // สถิติการทำงาน
  tasksCompleted: number;
  tasksEarly: number;
  tasksOnTime: number;
  tasksLate: number;
  tasksOvertime: number;
  tasksOverdue: number;
  
  rank: number;
  trend: 'up' | 'down' | 'same';
}

// LINE Bot Types
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
  mentions: string[]; // User IDs ที่ถูกแท็ก
  groupId: string;
  userId: string;
  originalText: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  debug?: any; // สำหรับข้อมูล debug เพิ่มเติม
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard Types
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

// Email & Notification Types
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationPayload {
  type: 'task_created' | 'task_reminder' | 'task_overdue' | 'task_completed' | 'weekly_summary';
  groupId: string;
  recipients: string[]; // User IDs
  data: any;
  channels: ('line' | 'email')[];
}

// Google Calendar Types
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