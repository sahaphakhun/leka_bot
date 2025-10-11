import { BackupResult } from './GoogleDriveService';
export interface BackupSchedule {
    id: string;
    groupId: string;
    taskId?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'on_submission';
    lastBackup?: Date;
    nextBackup?: Date;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface BackupHistory {
    id: string;
    scheduleId: string;
    groupId: string;
    taskId?: string;
    backupDate: Date;
    totalFiles: number;
    successCount: number;
    failureCount: number;
    results: BackupResult[];
    duration: number;
    createdAt: Date;
}
export declare class FileBackupService {
    private googleDriveService;
    private fileService;
    private groupRepository;
    private taskRepository;
    private fileRepository;
    constructor();
    /**
     * ตรวจสอบการเชื่อมต่อ Google Drive
     */
    testConnection(): Promise<boolean>;
    /**
     * คัดลอกไฟล์แนบของงานเฉพาะไปยัง Google Drive
     */
    backupTaskAttachments(taskId: string, date?: Date): Promise<BackupResult[]>;
    /**
     * คัดลอกไฟล์แนบของกลุ่มทั้งหมดไปยัง Google Drive
     */
    backupGroupAttachments(groupId: string, date?: Date): Promise<{
        groupName: string;
        totalTasks: number;
        totalFiles: number;
        taskResults: any[];
        error?: string;
    }>;
    /**
     * คัดลอกไฟล์แนบทั้งหมดในระบบไปยัง Google Drive
     */
    backupAllAttachments(date?: Date): Promise<{
        totalGroups: number;
        totalTasks: number;
        totalFiles: number;
        groupResults: any[];
    }>;
    /**
     * คัดลอกไฟล์แนบอัตโนมัติเมื่อมีการส่งงาน
     */
    backupOnTaskSubmission(taskId: string, submitterId: string, fileIds: string[]): Promise<void>;
    /**
     * คัดลอกไฟล์แนบตามกำหนดเวลา
     */
    runScheduledBackups(): Promise<void>;
    /**
     * ตรวจสอบว่าควรคัดลอกไฟล์แนบของกลุ่มหรือไม่
     */
    private shouldBackupGroup;
    /**
     * ตรวจสอบว่ามีการคัดลอกไฟล์แนบแล้วหรือไม่
     */
    private checkExistingBackup;
    /**
     * บันทึกประวัติการคัดลอกไฟล์แนบ
     */
    private recordBackupHistory;
    /**
     * ดึงสถิติการคัดลอกไฟล์แนบ
     */
    getBackupStats(groupId?: string, startDate?: Date, endDate?: Date): Promise<{
        totalBackups: number;
        totalFiles: number;
        successRate: number;
        averageDuration: number;
        recentBackups: any[];
    }>;
    /**
     * คัดลอกไฟล์แนบตามช่วงวันที่
     */
    backupAttachmentsByDateRange(groupId: string, startDate: Date, endDate: Date): Promise<{
        groupName: string;
        totalFiles: number;
        results: BackupResult[];
    }>;
    /**
     * คัดลอกไฟล์แนบตามประเภท
     */
    backupAttachmentsByType(groupId: string, attachmentType: 'initial' | 'submission', date?: Date): Promise<BackupResult[]>;
}
//# sourceMappingURL=FileBackupService.d.ts.map