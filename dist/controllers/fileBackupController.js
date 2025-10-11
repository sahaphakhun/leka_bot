"use strict";
// File Backup Controller - จัดการ API endpoints สำหรับการคัดลอกไฟล์แนบ
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileBackupController = void 0;
const FileBackupService_1 = require("@/services/FileBackupService");
const logger_1 = require("@/utils/logger");
class FileBackupController {
    constructor() {
        this.fileBackupService = new FileBackupService_1.FileBackupService();
    }
    /**
     * ทดสอบการเชื่อมต่อ Google Drive
     */
    async testConnection(req, res) {
        try {
            const isConnected = await this.fileBackupService.testConnection();
            if (isConnected) {
                res.json({
                    success: true,
                    message: 'Google Drive connection successful',
                    timestamp: new Date().toISOString()
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    message: 'Google Drive connection failed',
                    hint: 'Check GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_SHARED_FOLDER_ID. Ensure the service account has access to the Shared Drive root.',
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
            logger_1.logger.error('❌ Test connection failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to test Google Drive connection',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * ทดสอบการเชื่อมต่อ Google Drive (รายละเอียด)
     */
    async debugConnection(req, res) {
        try {
            const details = { steps: {}, env: {} };
            details.env.hasServiceAccountJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
            details.env.hasServiceAccountKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
            details.env.driveSharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID ? 'set' : 'missing';
            // ใช้บริการโดยตรงเพื่อเช็คละเอียด
            const g = this.fileBackupService.googleDriveService;
            if (!g)
                throw new Error('GoogleDriveService unavailable');
            // init
            details.steps.initializeAuth = 'starting';
            const ok = await g.ensureInitialized();
            details.steps.initializeAuth = ok ? 'ok' : 'failed';
            if (!ok) {
                res.status(500).json({ success: false, message: 'init failed', details });
                return;
            }
            // about.get
            try {
                const about = await g.drive.about.get({ fields: 'user, storageQuota' });
                details.steps.about = {
                    ok: true,
                    user: about.data.user?.emailAddress,
                    storage: about.data.storageQuota ? 'present' : 'n/a'
                };
            }
            catch (err) {
                details.steps.about = { ok: false, error: err?.message || err };
            }
            // shared folder get
            try {
                const resp = await g.drive.files.get({
                    fileId: g.sharedFolderId,
                    fields: 'id, name, driveId, permissions, mimeType, trashed',
                    supportsAllDrives: true
                });
                details.steps.sharedFolder = {
                    ok: true,
                    id: resp.data.id,
                    name: resp.data.name,
                    driveId: resp.data.driveId || null,
                    inSharedDrive: !!resp.data.driveId
                };
            }
            catch (err) {
                details.steps.sharedFolder = { ok: false, error: err?.message || err };
            }
            const overall = details.steps.about?.ok && details.steps.sharedFolder?.ok && details.steps.sharedFolder?.inSharedDrive;
            res.status(overall ? 200 : 500).json({ success: !!overall, details });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err?.message || err });
        }
    }
    /**
     * คัดลอกไฟล์แนบของงานเฉพาะ
     */
    async backupTaskAttachments(req, res) {
        try {
            const { taskId } = req.params;
            const { date } = req.body;
            if (!taskId) {
                res.status(400).json({
                    success: false,
                    message: 'Task ID is required'
                });
                return;
            }
            const backupDate = date ? new Date(date) : new Date();
            if (isNaN(backupDate.getTime())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
                });
                return;
            }
            logger_1.logger.info('Starting task backup via API', { taskId, backupDate });
            const results = await this.fileBackupService.backupTaskAttachments(taskId, backupDate);
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;
            res.json({
                success: true,
                message: `Task backup completed. ${successCount} files backed up successfully, ${failureCount} failed.`,
                data: {
                    taskId,
                    backupDate: backupDate.toISOString(),
                    totalFiles: results.length,
                    successCount,
                    failureCount,
                    results
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Task backup via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to backup task attachments',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * คัดลอกไฟล์แนบของกลุ่มทั้งหมด
     */
    async backupGroupAttachments(req, res) {
        try {
            const { groupId } = req.params;
            const { date } = req.body;
            if (!groupId) {
                res.status(400).json({
                    success: false,
                    message: 'Group ID is required'
                });
                return;
            }
            const backupDate = date ? new Date(date) : new Date();
            if (isNaN(backupDate.getTime())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
                });
                return;
            }
            logger_1.logger.info('Starting group backup via API', { groupId, backupDate });
            const result = await this.fileBackupService.backupGroupAttachments(groupId, backupDate);
            res.json({
                success: true,
                message: `Group backup completed. ${result.totalFiles} files backed up from ${result.totalTasks} tasks.`,
                data: {
                    groupId,
                    groupName: result.groupName,
                    backupDate: backupDate.toISOString(),
                    totalTasks: result.totalTasks,
                    totalFiles: result.totalFiles,
                    taskResults: result.taskResults
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Group backup via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to backup group attachments',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * คัดลอกไฟล์แนบทั้งหมดในระบบ
     */
    async backupAllAttachments(req, res) {
        try {
            const { date } = req.body;
            const backupDate = date ? new Date(date) : new Date();
            if (isNaN(backupDate.getTime())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
                });
                return;
            }
            logger_1.logger.info('Starting system-wide backup via API', { backupDate });
            const result = await this.fileBackupService.backupAllAttachments(backupDate);
            res.json({
                success: true,
                message: `System-wide backup completed. ${result.totalFiles} files backed up from ${result.totalTasks} tasks across ${result.totalGroups} groups.`,
                data: {
                    backupDate: backupDate.toISOString(),
                    totalGroups: result.totalGroups,
                    totalTasks: result.totalTasks,
                    totalFiles: result.totalFiles,
                    groupResults: result.groupResults
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ System-wide backup via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to backup all attachments',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * คัดลอกไฟล์แนบตามช่วงวันที่
     */
    async backupByDateRange(req, res) {
        try {
            const { groupId } = req.params;
            const { startDate, endDate } = req.body;
            if (!groupId) {
                res.status(400).json({
                    success: false,
                    message: 'Group ID is required'
                });
                return;
            }
            if (!startDate || !endDate) {
                res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
                return;
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
                });
                return;
            }
            if (start > end) {
                res.status(400).json({
                    success: false,
                    message: 'Start date must be before end date'
                });
                return;
            }
            logger_1.logger.info('Starting date range backup via API', { groupId, startDate: start, endDate: end });
            const result = await this.fileBackupService.backupAttachmentsByDateRange(groupId, start, end);
            res.json({
                success: true,
                message: `Date range backup completed. ${result.totalFiles} files backed up.`,
                data: {
                    groupId,
                    groupName: result.groupName,
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    totalFiles: result.totalFiles,
                    results: result.results
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Date range backup via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to backup attachments by date range',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * คัดลอกไฟล์แนบตามประเภท
     */
    async backupByType(req, res) {
        try {
            const { groupId } = req.params;
            const { attachmentType, date } = req.body;
            if (!groupId) {
                res.status(400).json({
                    success: false,
                    message: 'Group ID is required'
                });
                return;
            }
            if (!attachmentType || !['initial', 'submission'].includes(attachmentType)) {
                res.status(400).json({
                    success: false,
                    message: 'Attachment type is required and must be either "initial" or "submission"'
                });
                return;
            }
            const backupDate = date ? new Date(date) : new Date();
            if (isNaN(backupDate.getTime())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
                });
                return;
            }
            logger_1.logger.info('Starting type-based backup via API', { groupId, attachmentType, backupDate });
            const results = await this.fileBackupService.backupAttachmentsByType(groupId, attachmentType, backupDate);
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;
            res.json({
                success: true,
                message: `Type-based backup completed. ${successCount} files backed up successfully, ${failureCount} failed.`,
                data: {
                    groupId,
                    attachmentType,
                    backupDate: backupDate.toISOString(),
                    totalFiles: results.length,
                    successCount,
                    failureCount,
                    results
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Type-based backup via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to backup attachments by type',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * ดึงสถิติการคัดลอกไฟล์แนบ
     */
    async getBackupStats(req, res) {
        try {
            const { groupId, startDate, endDate } = req.query;
            let start;
            let end;
            if (startDate) {
                start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                    return;
                }
            }
            if (endDate) {
                end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                    return;
                }
            }
            if (start && end && start > end) {
                res.status(400).json({
                    success: false,
                    message: 'Start date must be before end date'
                });
                return;
            }
            const stats = await this.fileBackupService.getBackupStats(groupId, start, end);
            res.json({
                success: true,
                message: 'Backup statistics retrieved successfully',
                data: {
                    groupId: groupId || 'all',
                    startDate: start?.toISOString(),
                    endDate: end?.toISOString(),
                    stats
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Get backup stats via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get backup statistics',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา
     */
    async runScheduledBackups(req, res) {
        try {
            logger_1.logger.info('Starting scheduled backups via API');
            // เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา
            await this.fileBackupService.runScheduledBackups();
            res.json({
                success: true,
                message: 'Scheduled backups completed successfully',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Scheduled backups via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to run scheduled backups',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * ตรวจสอบและทำความสะอาดไฟล์ที่หายไปจาก Cloudinary
     */
    async cleanupMissingFiles(req, res) {
        try {
            const { groupId } = req.params;
            logger_1.logger.info('Starting missing files cleanup via API', { groupId });
            const googleDriveService = this.fileBackupService.googleDriveService;
            const result = await googleDriveService.cleanupMissingFiles(groupId);
            res.json({
                success: true,
                message: `Missing files cleanup completed. Found ${result.missingFiles.length} missing files out of ${result.totalChecked} checked.`,
                data: {
                    totalChecked: result.totalChecked,
                    missingFilesCount: result.missingFiles.length,
                    missingFiles: result.missingFiles,
                    cleanedFiles: result.cleanedFiles
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Missing files cleanup via API failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup missing files',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
}
exports.FileBackupController = FileBackupController;
//# sourceMappingURL=fileBackupController.js.map