import { File, Group, Task } from '@/models';
export interface DriveFolderStructure {
    groupName: string;
    taskName: string;
    date: string;
    folderId: string;
    path: string;
}
export interface BackupResult {
    success: boolean;
    fileId?: string;
    driveFileId?: string;
    error?: string;
    folderPath: string;
}
export declare class GoogleDriveService {
    private drive;
    private auth;
    private isInitialized;
    private sharedFolderId;
    private hasValidatedSharedRoot;
    constructor();
    /**
     * เริ่มต้นการเชื่อมต่อ Google Drive
     */
    private initializeAuth;
    /**
     * พยายามสร้าง credentials จาก environment variables แยก
     */
    private tryBuildCredentialsFromEnvVars;
    /**
     * Ensure auth is initialized (constructor cannot await)
     */
    private ensureInitialized;
    /**
     * ตรวจสอบการเชื่อมต่อ Google Drive และการเข้าถึงโฟลเดอร์ที่แชร์
     */
    testConnection(): Promise<boolean>;
    /**
     * ตรวจสอบว่า root folder อยู่ใน Shared Drive และเข้าถึงได้ (เรียกครั้งเดียว)
     */
    private ensureSharedRoot;
    /**
     * สร้างโฟลเดอร์ใน Google Drive
     */
    createFolder(folderName: string, parentFolderId?: string): Promise<string>;
    /**
     * สร้างโครงสร้างโฟลเดอร์สำหรับการจัดเก็บไฟล์แนบ
     */
    createBackupFolderStructure(group: Group, task: Task, date: Date): Promise<DriveFolderStructure>;
    /**
     * ค้นหาหรือสร้างโฟลเดอร์
     */
    private findOrCreateFolder;
    /**
     * อัปโหลดไฟล์ไปยัง Google Drive
     */
    uploadFileToDrive(file: File, folderId: string, fileName?: string): Promise<string>;
    /**
     * คัดลอกไฟล์แนบของงานไปยัง Google Drive
     */
    backupTaskAttachments(taskId: string, backupDate: Date): Promise<BackupResult[]>;
    /**
     * คัดลอกไฟล์แนบของกลุ่มไปยัง Google Drive
     */
    backupGroupAttachments(groupId: string, date: Date): Promise<{
        groupName: string;
        totalTasks: number;
        totalFiles: number;
        taskResults: any[];
        error?: string;
    }>;
    /**
     * คัดลอกไฟล์แนบทั้งหมดในระบบไปยัง Google Drive
     */
    backupAllAttachments(date: Date): Promise<{
        totalGroups: number;
        totalTasks: number;
        totalFiles: number;
        groupResults: any[];
    }>;
    /**
     * ทำความสะอาดชื่อโฟลเดอร์เพื่อให้เข้ากับ Google Drive
     */
    private sanitizeFolderName;
    /**
     * ตรวจสอบและทำความสะอาดไฟล์ที่หายไปจาก Cloudinary
     */
    cleanupMissingFiles(groupId?: string): Promise<{
        totalChecked: number;
        missingFiles: any[];
        cleanedFiles: string[];
    }>;
    /**
     * ดึงข้อมูลโฟลเดอร์ที่แชร์
     */
    getSharedFolderInfo(): Promise<any>;
}
//# sourceMappingURL=GoogleDriveService.d.ts.map