// File Backup Service - จัดการการคัดลอกไฟล์แนบไปยัง Google Drive

import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { File, Group, Task } from '@/models';
import { GoogleDriveService, BackupResult } from './GoogleDriveService';
import { FileService } from './FileService';
import { logger } from '@/utils/logger';
import moment from 'moment-timezone';

export interface BackupSchedule {
  id: string;
  groupId: string;
  taskId?: string; // ถ้าไม่ระบุ จะคัดลอกไฟล์แนบทั้งหมดของกลุ่ม
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
  duration: number; // milliseconds
  createdAt: Date;
}

export class FileBackupService {
  private googleDriveService: GoogleDriveService;
  private fileService: FileService;
  private groupRepository: Repository<Group>;
  private taskRepository: Repository<Task>;
  private fileRepository: Repository<File>;

  constructor() {
    this.googleDriveService = new GoogleDriveService();
    this.fileService = new FileService();
    this.groupRepository = AppDataSource.getRepository(Group);
    this.taskRepository = AppDataSource.getRepository(Task);
    this.fileRepository = AppDataSource.getRepository(File);
  }

  /**
   * ตรวจสอบการเชื่อมต่อ Google Drive
   */
  public async testConnection(): Promise<boolean> {
    return await this.googleDriveService.testConnection();
  }

  /**
   * คัดลอกไฟล์แนบของงานเฉพาะไปยัง Google Drive
   */
  public async backupTaskAttachments(
    taskId: string,
    date: Date = new Date()
  ): Promise<BackupResult[]> {
    try {
      logger.info('Starting task backup', { taskId, date });

      // ดึงข้อมูลงานและกลุ่ม
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['group', 'attachedFiles']
      });

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (!task.group) {
        throw new Error(`Task has no group: ${taskId}`);
      }

      // ตรวจสอบว่ามีไฟล์แนบหรือไม่
      if (!task.attachedFiles || task.attachedFiles.length === 0) {
        logger.info('Task has no attachments, skipping backup', { taskId, taskTitle: task.title });
        return [];
      }

      // คัดลอกไฟล์แนบไปยัง Google Drive
      const results = await this.googleDriveService.backupTaskAttachments(taskId, date);

      // บันทึกประวัติการคัดลอก
      await this.recordBackupHistory({
        groupId: task.groupId,
        taskId: task.id,
        backupDate: date,
        totalFiles: task.attachedFiles.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results,
        duration: 0 // จะคำนวณในภายหลัง
      });

      logger.info('Task backup completed', {
        taskId,
        taskTitle: task.title,
        totalFiles: task.attachedFiles.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      });

      return results;

    } catch (error) {
      logger.error('❌ Task backup failed:', error);
      throw error;
    }
  }

  /**
   * คัดลอกไฟล์แนบของกลุ่มทั้งหมดไปยัง Google Drive
   */
  public async backupGroupAttachments(
    groupId: string,
    date: Date = new Date()
  ): Promise<{
    groupName: string;
    totalTasks: number;
    totalFiles: number;
    taskResults: any[];
    error?: string;
  }> {
    try {
      logger.info('Starting group backup', { groupId, date });

      const startTime = Date.now();

      // คัดลอกไฟล์แนบของกลุ่ม
      const result = await this.googleDriveService.backupGroupAttachments(groupId, date);

      const duration = Date.now() - startTime;

      // บันทึกประวัติการคัดลอก
      await this.recordBackupHistory({
        groupId,
        backupDate: date,
        totalFiles: result.totalFiles,
        successCount: result.taskResults.filter((r: any) => r.results?.filter((fr: any) => fr.success).length || 0).reduce((a: number, b: number) => a + b, 0),
        failureCount: result.taskResults.filter((r: any) => r.results?.filter((fr: any) => !fr.success).length || 0).reduce((a: number, b: number) => a + b, 0),
        results: result.taskResults.flatMap((r: any) => r.results || []),
        duration
      });

      logger.info('Group backup completed', {
        groupId,
        groupName: result.groupName,
        totalTasks: result.totalTasks,
        totalFiles: result.totalFiles,
        duration: `${duration}ms`
      });

      return result;

    } catch (error) {
      logger.error('❌ Group backup failed:', error);
      throw error;
    }
  }

  /**
   * คัดลอกไฟล์แนบทั้งหมดในระบบไปยัง Google Drive
   */
  public async backupAllAttachments(
    date: Date = new Date()
  ): Promise<{
    totalGroups: number;
    totalTasks: number;
    totalFiles: number;
    groupResults: any[];
  }> {
    try {
      logger.info('Starting system-wide backup', { date });

      const startTime = Date.now();

      // คัดลอกไฟล์แนบทั้งหมด
      const result = await this.googleDriveService.backupAllAttachments(date);

      const duration = Date.now() - startTime;

      logger.info('System-wide backup completed', {
        totalGroups: result.totalGroups,
        totalTasks: result.totalTasks,
        totalFiles: result.totalFiles,
        duration: `${duration}ms`
      });

      return result;

    } catch (error) {
      logger.error('❌ System-wide backup failed:', error);
      throw error;
    }
  }

  /**
   * คัดลอกไฟล์แนบอัตโนมัติเมื่อมีการส่งงาน
   */
  public async backupOnTaskSubmission(
    taskId: string,
    submitterId: string,
    fileIds: string[]
  ): Promise<void> {
    try {
      if (fileIds.length === 0) {
        logger.debug('No files to backup for task submission', { taskId });
        return;
      }

      logger.info('Starting automatic backup for task submission', {
        taskId,
        submitterId,
        fileCount: fileIds.length
      });

      // คัดลอกไฟล์แนบไปยัง Google Drive
      await this.backupTaskAttachments(taskId, new Date());

      logger.info('Automatic backup completed for task submission', { taskId });

    } catch (error) {
      logger.error('❌ Automatic backup failed for task submission:', error);
      // ไม่ throw error เพื่อไม่ให้กระทบกับการส่งงาน
    }
  }

  /**
   * คัดลอกไฟล์แนบตามกำหนดเวลา
   */
  public async runScheduledBackups(): Promise<void> {
    try {
      logger.info('Starting scheduled backups');

      const groups = await this.groupRepository.find();

      for (const group of groups) {
        if (this.shouldBackupGroup(group)) {
          try {
            await this.backupGroupAttachments(group.id, new Date());
            logger.info(`Scheduled backup completed for group: ${group.name}`);
          } catch (error) {
            logger.error(`❌ Scheduled backup failed for group: ${group.name}`, error);
          }
        }
      }

      logger.info('Scheduled backups completed');

    } catch (error) {
      logger.error('❌ Scheduled backups failed:', error);
    }
  }

  /**
   * ตรวจสอบว่าควรคัดลอกไฟล์แนบของกลุ่มหรือไม่
   */
  private shouldBackupGroup(group: Group): boolean {
    // ตรวจสอบการตั้งค่ากลุ่ม (ถ้ามี)
    // สำหรับตอนนี้ ให้คัดลอกทุกกลุ่ม
    return true;
  }

  /**
   * ตรวจสอบว่ามีการคัดลอกไฟล์แนบแล้วหรือไม่
   */
  private async checkExistingBackup(
    groupId: string,
    taskId?: string,
    date?: Date
  ): Promise<boolean> {
    // ตรวจสอบประวัติการคัดลอก
    // สำหรับตอนนี้ ให้คัดลอกใหม่ทุกครั้ง
    return false;
  }

  /**
   * บันทึกประวัติการคัดลอกไฟล์แนบ
   */
  private async recordBackupHistory(data: {
    groupId: string;
    taskId?: string;
    backupDate: Date;
    totalFiles: number;
    successCount: number;
    failureCount: number;
    results: BackupResult[];
    duration: number;
  }): Promise<void> {
    // บันทึกประวัติการคัดลอก
    // สำหรับตอนนี้ ให้ log ไว้ก่อน
    logger.info('Backup history recorded', data);
  }

  /**
   * ดึงสถิติการคัดลอกไฟล์แนบ
   */
  public async getBackupStats(
    groupId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalBackups: number;
    totalFiles: number;
    successRate: number;
    averageDuration: number;
    recentBackups: any[];
  }> {
    // ดึงสถิติการคัดลอก
    // สำหรับตอนนี้ ให้ส่งข้อมูล mock
    return {
      totalBackups: 0,
      totalFiles: 0,
      successRate: 0,
      averageDuration: 0,
      recentBackups: []
    };
  }

  /**
   * คัดลอกไฟล์แนบตามช่วงวันที่
   */
  public async backupAttachmentsByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    groupName: string;
    totalFiles: number;
    results: BackupResult[];
  }> {
    try {
      logger.info('Starting date range backup', { groupId, startDate, endDate });

      // ดึงงานในช่วงวันที่ที่ระบุ
      const tasks = await this.taskRepository.find({
        where: {
          groupId,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          } as any
        },
        relations: ['attachedFiles', 'group']
      });

      if (tasks.length === 0) {
        logger.info('No tasks found in date range', { groupId, startDate, endDate });
        return {
          groupName: 'Unknown',
          totalFiles: 0,
          results: []
        };
      }

      const allResults: BackupResult[] = [];
      let totalFiles = 0;

      // คัดลอกไฟล์แนบของแต่ละงาน
      for (const task of tasks) {
        if (task.attachedFiles && task.attachedFiles.length > 0 && task.group) {
          try {
            const taskResults = await this.googleDriveService.backupTaskAttachments(
              task.id,
              task.createdAt
            );
            allResults.push(...taskResults);
            totalFiles += taskResults.filter(r => r.success).length;
          } catch (error) {
            logger.error('❌ Failed to backup task attachments:', error);
          }
        }
      }

      const groupName = tasks[0]?.group?.name || 'Unknown';

      const result = {
        groupName,
        totalFiles,
        results: allResults
      };

      logger.info('Date range backup completed', result);
      return result;

    } catch (error) {
      logger.error('❌ Date range backup failed:', error);
      throw error;
    }
  }

  /**
   * คัดลอกไฟล์แนบตามประเภท
   */
  public async backupAttachmentsByType(
    groupId: string,
    attachmentType: 'initial' | 'submission',
    date: Date = new Date()
  ): Promise<BackupResult[]> {
    try {
      logger.info('Starting type-based backup', { groupId, attachmentType, date });

      // ดึงไฟล์ตามประเภทที่ระบุ
      const files = await this.fileRepository.find({
        where: {
          groupId,
          attachmentType
        },
        relations: ['linkedTasks', 'group']
      });

      if (files.length === 0) {
        logger.info('No files found for type', { groupId, attachmentType });
        return [];
      }

      const results: BackupResult[] = [];

      // จัดกลุ่มไฟล์ตามงาน
      const filesByTask = new Map<string, File[]>();
      for (const file of files) {
        if (file.linkedTasks && file.linkedTasks.length > 0) {
          const taskId = file.linkedTasks[0].id;
          if (!filesByTask.has(taskId)) {
            filesByTask.set(taskId, []);
          }
          filesByTask.get(taskId)!.push(file);
        }
      }

      // คัดลอกไฟล์แนบของแต่ละงาน
      for (const [taskId, taskFiles] of filesByTask) {
        try {
          const task = await this.taskRepository.findOne({
            where: { id: taskId },
            relations: ['group']
          });

          if (task && task.group) {
            const taskResults = await this.googleDriveService.backupTaskAttachments(
              taskId,
              date
            );
            results.push(...taskResults);
          }
        } catch (error) {
          logger.error('❌ Failed to backup task attachments:', error);
        }
      }

      logger.info('Type-based backup completed', {
        groupId,
        attachmentType,
        totalFiles: files.length,
        successCount: results.filter(r => r.success).length
      });

      return results;

    } catch (error) {
      logger.error('❌ Type-based backup failed:', error);
      throw error;
    }
  }
}
