import { Request, Response } from 'express';
export declare class FileBackupController {
    private fileBackupService;
    constructor();
    /**
     * ทดสอบการเชื่อมต่อ Google Drive
     */
    testConnection(req: Request, res: Response): Promise<void>;
    /**
     * ทดสอบการเชื่อมต่อ Google Drive (รายละเอียด)
     */
    debugConnection(req: Request, res: Response): Promise<void>;
    /**
     * คัดลอกไฟล์แนบของงานเฉพาะ
     */
    backupTaskAttachments(req: Request, res: Response): Promise<void>;
    /**
     * คัดลอกไฟล์แนบของกลุ่มทั้งหมด
     */
    backupGroupAttachments(req: Request, res: Response): Promise<void>;
    /**
     * คัดลอกไฟล์แนบทั้งหมดในระบบ
     */
    backupAllAttachments(req: Request, res: Response): Promise<void>;
    /**
     * คัดลอกไฟล์แนบตามช่วงวันที่
     */
    backupByDateRange(req: Request, res: Response): Promise<void>;
    /**
     * คัดลอกไฟล์แนบตามประเภท
     */
    backupByType(req: Request, res: Response): Promise<void>;
    /**
     * ดึงสถิติการคัดลอกไฟล์แนบ
     */
    getBackupStats(req: Request, res: Response): Promise<void>;
    /**
     * เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา
     */
    runScheduledBackups(req: Request, res: Response): Promise<void>;
    /**
     * ตรวจสอบและทำความสะอาดไฟล์ที่หายไปจาก Cloudinary
     */
    cleanupMissingFiles(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=fileBackupController.d.ts.map