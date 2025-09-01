// File Backup Controller - จัดการ API endpoints สำหรับการคัดลอกไฟล์แนบ

import { Request, Response } from 'express';
import { FileBackupService } from '@/services/FileBackupService';
import { logger } from '@/utils/logger';

export class FileBackupController {
  private fileBackupService: FileBackupService;

  constructor() {
    this.fileBackupService = new FileBackupService();
  }

  /**
   * ทดสอบการเชื่อมต่อ Google Drive
   */
  public async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await this.fileBackupService.testConnection();
      
      if (isConnected) {
        res.json({
          success: true,
          message: 'Google Drive connection successful',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Google Drive connection failed',
          hint: 'Check GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_SHARED_FOLDER_ID. Ensure the service account has access to the Shared Drive root.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('❌ Test connection failed:', error);
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
  public async debugConnection(req: Request, res: Response): Promise<void> {
    try {
      const details: any = { steps: {}, env: {} };
      details.env.hasServiceAccountJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      details.env.hasServiceAccountKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      details.env.driveSharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID ? 'set' : 'missing';

      // ใช้บริการโดยตรงเพื่อเช็คละเอียด
      const g = (this.fileBackupService as any).googleDriveService;
      if (!g) throw new Error('GoogleDriveService unavailable');

      // init
      details.steps.initializeAuth = 'starting';
      const ok = await (g as any).ensureInitialized();
      details.steps.initializeAuth = ok ? 'ok' : 'failed';
      if (!ok) {
        res.status(500).json({ success: false, message: 'init failed', details });
        return;
      }

      // about.get
      try {
        const about = await (g as any).drive.about.get({ fields: 'user, storageQuota' });
        details.steps.about = {
          ok: true,
          user: about.data.user?.emailAddress,
          storage: about.data.storageQuota ? 'present' : 'n/a'
        };
      } catch (err) {
        details.steps.about = { ok: false, error: (err as any)?.message || err };
      }

      // shared folder get
      try {
        const resp = await (g as any).drive.files.get({
          fileId: (g as any).sharedFolderId,
          fields: 'id, name, driveId, permissions, mimeType, trashed',
          supportsAllDrives: true
        });
        details.steps.sharedFolder = {
          ok: true,
          id: resp.data.id,
          name: resp.data.name,
          driveId: (resp.data as any).driveId || null,
          inSharedDrive: !!(resp.data as any).driveId
        };
      } catch (err) {
        details.steps.sharedFolder = { ok: false, error: (err as any)?.message || err };
      }

      const overall = details.steps.about?.ok && details.steps.sharedFolder?.ok && details.steps.sharedFolder?.inSharedDrive;
      res.status(overall ? 200 : 500).json({ success: !!overall, details });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as any)?.message || err });
    }
  }

  /**
   * คัดลอกไฟล์แนบของงานเฉพาะ
   */
  public async backupTaskAttachments(req: Request, res: Response): Promise<void> {
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

      logger.info('Starting task backup via API', { taskId, backupDate });

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

    } catch (error) {
      logger.error('❌ Task backup via API failed:', error);
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
  public async backupGroupAttachments(req: Request, res: Response): Promise<void> {
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

      logger.info('Starting group backup via API', { groupId, backupDate });

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

    } catch (error) {
      logger.error('❌ Group backup via API failed:', error);
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
  public async backupAllAttachments(req: Request, res: Response): Promise<void> {
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

      logger.info('Starting system-wide backup via API', { backupDate });

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

    } catch (error) {
      logger.error('❌ System-wide backup via API failed:', error);
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
  public async backupByDateRange(req: Request, res: Response): Promise<void> {
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

      logger.info('Starting date range backup via API', { groupId, startDate: start, endDate: end });

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

    } catch (error) {
      logger.error('❌ Date range backup via API failed:', error);
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
  public async backupByType(req: Request, res: Response): Promise<void> {
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

      logger.info('Starting type-based backup via API', { groupId, attachmentType, backupDate });

      const results = await this.fileBackupService.backupAttachmentsByType(
        groupId,
        attachmentType as 'initial' | 'submission',
        backupDate
      );

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

    } catch (error) {
      logger.error('❌ Type-based backup via API failed:', error);
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
  public async getBackupStats(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, startDate, endDate } = req.query;

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)'
          });
          return;
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
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

      const stats = await this.fileBackupService.getBackupStats(
        groupId as string,
        start,
        end
      );

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

    } catch (error) {
      logger.error('❌ Get backup stats via API failed:', error);
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
  public async runScheduledBackups(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting scheduled backups via API');

      // เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา
      await this.fileBackupService.runScheduledBackups();

      res.json({
        success: true,
        message: 'Scheduled backups completed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Scheduled backups via API failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run scheduled backups',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}
