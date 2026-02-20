import { Task, Group } from '@/models';
import { Task as TaskType, CalendarEvent } from '@/types';
export declare class TaskService {
    private taskRepository;
    private groupRepository;
    private userRepository;
    private googleService;
    private notificationService;
    private fileService;
    private lineService;
    private fileRepository;
    private userService;
    private fileBackupService;
    private isLineUserId;
    private isUuid;
    private normalizeUserIds;
    private resolveUserByIdentifier;
    private resolveUsersByIdentifiers;
    constructor();
    /** ดึงงานตาม ID พร้อม relations หลัก */
    getTaskById(taskId: string): Promise<Task | null>;
    /**
     * สร้างงานใหม่
     * @param data.groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     * @param data.assigneeIds - LINE User IDs (เช่น ["Uc92411a226e4d4c9866adef05068bdf1"])
     * @param data.createdBy - LINE User ID (เช่น "Uc92411a226e4d4c9866adef05068bdf1")
     */
    createTask(data: {
        groupId: string;
        title: string;
        description?: string;
        assigneeIds: string[];
        createdBy: string;
        dueTime: Date;
        startTime?: Date;
        priority?: 'low' | 'medium' | 'high';
        tags?: string[];
        customReminders?: string[];
        requireAttachment?: boolean;
        reviewerUserId?: string;
        _tempId?: string;
        fileIds?: string[];
    }): Promise<Task>;
    /**
     * อัปเดตผู้บังคับบัญชาในกลุ่ม
     */
    updateGroupSupervisors(lineGroupId: string, supervisorLineUserIds: string[]): Promise<boolean>;
    /**
     * อัปเดตงาน
     */
    updateTask(taskId: string, updates: Partial<TaskType>): Promise<Task>;
    /** ลบงาน พร้อมลบ Event ใน Google Calendar ถ้ามี */
    deleteTask(taskId: string): Promise<void>;
    /**
     * อัปเดตสถานะงาน
     */
    updateTaskStatus(taskId: string, status: TaskType['status']): Promise<Task>;
    /**
     * ปิดงาน
     */
    completeTask(taskId: string, completedBy: string): Promise<Task>;
    /**
     * ตรวจสอบสิทธิ์การอนุมัติงาน
     */
    private checkApprovalPermission;
    /**
     * ตรวจสอบสิทธิ์การปิดงาน
     */
    private checkCompletionPermission;
    /**
     * ตรวจสอบสิทธิ์ทั่วไปในการทำงานกับงาน
     */
    private checkTaskPermission;
    /** ตรวจสอบว่างานยังค้างอยู่จริงหรือไม่ (ไม่มีการส่งงาน/ไม่อยู่ในสถานะเสร็จสิ้น) */
    private isTaskPendingAction;
    /** ตรวจสอบจาก workflow ว่ามีประวัติการส่งงานหรือไม่ */
    private taskHasSubmission;
    /**
     * ดึงข้อมูลผู้ตรวจงาน ถ้าไม่มีให้ผู้สร้างเป็นผู้อนุมัติ
     */
    private getTaskReviewer;
    /** บันทึกการส่งงาน (แนบไฟล์) */
    recordSubmission(taskId: string, submitterLineUserId: string, fileIds: string[], comment?: string, links?: string[]): Promise<Task>;
    /** ดึงงานที่รอการตรวจและพ้นกำหนด 2 วันแล้ว */
    getTasksLateForReview(): Promise<Task[]>;
    /** ดึงงานที่อยู่ในสถานะรอตรวจ (review.status === 'pending') */
    getTasksPendingReview(): Promise<Task[]>;
    /** ทำเครื่องหมายตรวจล่าช้า */
    markLateReview(taskId: string): Promise<void>;
    /**
     * ดึงงานในกลุ่ม
     * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     * @param options.assigneeId - LINE User ID (เช่น "Uc92411a226e4d4c9866adef05068bdf1")
     */
    getGroupTasks(groupId: string, options?: {
        status?: TaskType['status'][] | TaskType['status'];
        assigneeId?: string;
        requireAttachmentOnly?: boolean;
        tags?: string[];
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        tasks: Task[];
        total: number;
    }>;
    /**
     * ดึงงานที่ต้องส่งการเตือน
     */
    getTasksForReminder(): Promise<Task[]>;
    /**
     * ดึงงานของผู้ใช้ตามสถานะที่ระบุ
     */
    getUserTasks(userId: string, statuses?: string[]): Promise<Task[]>;
    /**
     * ดึงงานทั้งหมดที่ยังไม่เสร็จ เพื่อใช้เตือนซ้ำทุกเช้า (08:00)
     * รวมสถานะ: pending, in_progress, overdue
     *
     * ⚠️ ฟังก์ชันนี้ไม่ได้ใช้งานแล้ว เนื่องจากเอาการเตือนตอนเช้า 08:00 น. ออกไปแล้ว
     * @deprecated ใช้สำหรับการเตือนตอนเช้า 08:00 น. ที่ถูกลบออกไปแล้ว
     */
    getTasksForDailyMorningReminder(): Promise<Task[]>;
    /**
     * ดึงงานเกินกำหนดทั้งหมดในกลุ่ม
     */
    getOverdueTasksByGroup(groupId: string): Promise<Task[]>;
    /**
     * ดึงกลุ่มทั้งหมด
     */
    getAllGroups(): Promise<Group[]>;
    /**
     * ดึงงานที่กำลังดำเนินการ
     */
    getActiveTasks(groupId: string): Promise<Task[]>;
    /** ดึงงานที่ผู้ใช้เป็นผู้รับผิดชอบและยังไม่เสร็จ */
    getUserIncompleteTasks(lineUserId: string): Promise<Task[]>;
    /** ดึงงานที่ยังไม่เสร็จของกลุ่ม (pending, in_progress, overdue) โดยระบุ LINE Group ID */
    getIncompleteTasksOfGroup(lineGroupId: string): Promise<Task[]>;
    /**
     * ดึงกลุ่มที่ยังใช้งานอยู่
     */
    getAllActiveGroups(): Promise<Group[]>;
    /**
     * บันทึกการส่งการเตือน
     */
    recordReminderSent(taskId: string, reminderType: string): Promise<void>;
    /**
     * แปลงงานเป็น Calendar Event
     */
    getCalendarEvents(groupId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
    /**
     * ค้นหางาน
     */
    searchTasks(groupId: string, query: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        tasks: Task[];
        total: number;
    }>;
    /**
     * ดึงงานประจำทั้งหมด
     */
    getAllRecurringTasks(): Promise<Task[]>;
    /**
     * ดำเนินการงานประจำ
     */
    executeRecurringTask(taskId: string): Promise<void>;
    /**
     * อัปเดตเวลารันถัดไปของงานประจำ
     */
    updateRecurringTaskNextRunAt(taskId: string): Promise<void>;
    /**
     * ดึงงานที่สร้างจากแม่แบบงานประจำ
     */
    getTasksByRecurringId(recurringId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        tasks: Task[];
        total: number;
    }>;
    /**
     * ดึงสถิติงานประจำ
     */
    getRecurringTaskStats(recurringId: string): Promise<any>;
    /**
     * ดึงสถิติงานประจำทั้งหมดในกลุ่ม
     */
    getGroupRecurringStats(groupId: string): Promise<any>;
    /**
     * ตีกลับงานและขยายเวลา
     */
    rejectTaskAndExtendDeadline(taskId: string, rejectedBy: string, extensionDays?: number): Promise<Task>;
    /**
     * ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
     */
    sendExtensionApprovalNotification(taskId: string, newDueTime: Date): Promise<void>;
    /**
     * หาผู้ขอเลื่อนเวลาจาก workflow history
     */
    private findExtensionRequester;
    /**
     * อนุมัติการตรวจงาน
     */
    approveReview(taskId: string, approvedBy: string): Promise<Task>;
    /**
     * อนุมัติการปิดงาน (หลังจากผ่านการตรวจแล้ว)
     */
    approveCompletion(taskId: string, approvedBy: string): Promise<Task>;
    /**
     * ตรวจสอบว่า Bot ยังอยู่ในกลุ่มหรือไม่
     */
    checkBotMembershipInGroup(groupId: string): Promise<boolean>;
    /**
     * ลบงานทั้งหมดในกลุ่ม (สำหรับกรณีที่ Bot ไม่อยู่ในกลุ่มแล้ว)
     */
    deleteAllTasksInGroup(groupId: string): Promise<{
        success: boolean;
        deletedCount: number;
        errors: string[];
    }>;
    /**
     * ตรวจสอบและลบข้อมูลงานของกลุ่มที่ Bot ไม่อยู่แล้ว
     */
    checkAndCleanupInactiveGroups(): Promise<{
        checkedGroups: number;
        cleanedGroups: number;
        totalDeletedTasks: number;
        errors: string[];
    }>;
    /**
     * อนุมัติงานอัตโนมัติหลังจากครบกำหนดตรวจ 2 วัน
     */
    autoApproveTaskAfterDeadline(taskId: string): Promise<Task>;
}
//# sourceMappingURL=TaskService.d.ts.map