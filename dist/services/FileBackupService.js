"use strict";
// File Backup Service - จัดการการคัดลอกไฟล์แนบไปยัง Google Drive
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileBackupService = void 0;
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const GoogleDriveService_1 = require("./GoogleDriveService");
const FileService_1 = require("./FileService");
const logger_1 = require("@/utils/logger");
class FileBackupService {
    constructor() {
        this.googleDriveService = new GoogleDriveService_1.GoogleDriveService();
        this.fileService = new FileService_1.FileService();
        this.groupRepository = database_1.AppDataSource.getRepository(models_1.Group);
        this.taskRepository = database_1.AppDataSource.getRepository(models_1.Task);
        this.fileRepository = database_1.AppDataSource.getRepository(models_1.File);
    }
    /**
     * ตรวจสอบการเชื่อมต่อ Google Drive
     */
    async testConnection() {
        return await this.googleDriveService.testConnection();
    }
    /**
     * คัดลอกไฟล์แนบของงานเฉพาะไปยัง Google Drive
     */
    async backupTaskAttachments(taskId, date = new Date()) {
        try {
            logger_1.logger.info('Starting task backup', { taskId, date });
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
                logger_1.logger.info('Task has no attachments, skipping backup', { taskId, taskTitle: task.title });
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
            logger_1.logger.info('Task backup completed', {
                taskId,
                taskTitle: task.title,
                totalFiles: task.attachedFiles.length,
                successCount: results.filter(r => r.success).length,
                failureCount: results.filter(r => !r.success).length
            });
            return results;
        }
        catch (error) {
            logger_1.logger.error('❌ Task backup failed:', error);
            throw error;
        }
    }
    /**
     * คัดลอกไฟล์แนบของกลุ่มทั้งหมดไปยัง Google Drive
     */
    async backupGroupAttachments(groupId, date = new Date()) {
        try {
            logger_1.logger.info('Starting group backup', { groupId, date });
            const startTime = Date.now();
            // คัดลอกไฟล์แนบของกลุ่ม
            const result = await this.googleDriveService.backupGroupAttachments(groupId, date);
            const duration = Date.now() - startTime;
            // บันทึกประวัติการคัดลอก
            await this.recordBackupHistory({
                groupId,
                backupDate: date,
                totalFiles: result.totalFiles,
                successCount: result.taskResults.filter((r) => r.results?.filter((fr) => fr.success).length || 0).reduce((a, b) => a + b, 0),
                failureCount: result.taskResults.filter((r) => r.results?.filter((fr) => !fr.success).length || 0).reduce((a, b) => a + b, 0),
                results: result.taskResults.flatMap((r) => r.results || []),
                duration
            });
            logger_1.logger.info('Group backup completed', {
                groupId,
                groupName: result.groupName,
                totalTasks: result.totalTasks,
                totalFiles: result.totalFiles,
                duration: `${duration}ms`
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('❌ Group backup failed:', error);
            throw error;
        }
    }
    /**
     * คัดลอกไฟล์แนบทั้งหมดในระบบไปยัง Google Drive
     */
    async backupAllAttachments(date = new Date()) {
        try {
            logger_1.logger.info('Starting system-wide backup', { date });
            const startTime = Date.now();
            // คัดลอกไฟล์แนบทั้งหมด
            const result = await this.googleDriveService.backupAllAttachments(date);
            const duration = Date.now() - startTime;
            logger_1.logger.info('System-wide backup completed', {
                totalGroups: result.totalGroups,
                totalTasks: result.totalTasks,
                totalFiles: result.totalFiles,
                duration: `${duration}ms`
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('❌ System-wide backup failed:', error);
            throw error;
        }
    }
    /**
     * คัดลอกไฟล์แนบอัตโนมัติเมื่อมีการส่งงาน
     */
    async backupOnTaskSubmission(taskId, submitterId, fileIds) {
        try {
            if (fileIds.length === 0) {
                logger_1.logger.debug('No files to backup for task submission', { taskId });
                return;
            }
            logger_1.logger.info('Starting automatic backup for task submission', {
                taskId,
                submitterId,
                fileCount: fileIds.length
            });
            // คัดลอกไฟล์แนบไปยัง Google Drive
            await this.backupTaskAttachments(taskId, new Date());
            logger_1.logger.info('Automatic backup completed for task submission', { taskId });
        }
        catch (error) {
            logger_1.logger.error('❌ Automatic backup failed for task submission:', error);
            // ไม่ throw error เพื่อไม่ให้กระทบกับการส่งงาน
        }
    }
    /**
     * คัดลอกไฟล์แนบตามกำหนดเวลา
     */
    async runScheduledBackups() {
        try {
            logger_1.logger.info('Starting scheduled backups');
            const groups = await this.groupRepository.find();
            for (const group of groups) {
                if (this.shouldBackupGroup(group)) {
                    try {
                        await this.backupGroupAttachments(group.id, new Date());
                        logger_1.logger.info(`Scheduled backup completed for group: ${group.name}`);
                    }
                    catch (error) {
                        logger_1.logger.error(`❌ Scheduled backup failed for group: ${group.name}`, error);
                    }
                }
            }
            logger_1.logger.info('Scheduled backups completed');
        }
        catch (error) {
            logger_1.logger.error('❌ Scheduled backups failed:', error);
        }
    }
    /**
     * ตรวจสอบว่าควรคัดลอกไฟล์แนบของกลุ่มหรือไม่
     */
    shouldBackupGroup(group) {
        // ตรวจสอบการตั้งค่ากลุ่ม (ถ้ามี)
        // สำหรับตอนนี้ ให้คัดลอกทุกกลุ่ม
        return true;
    }
    /**
     * ตรวจสอบว่ามีการคัดลอกไฟล์แนบแล้วหรือไม่
     */
    async checkExistingBackup(groupId, taskId, date) {
        // ตรวจสอบประวัติการคัดลอก
        // สำหรับตอนนี้ ให้คัดลอกใหม่ทุกครั้ง
        return false;
    }
    /**
     * บันทึกประวัติการคัดลอกไฟล์แนบ
     */
    async recordBackupHistory(data) {
        // บันทึกประวัติการคัดลอก
        // สำหรับตอนนี้ ให้ log ไว้ก่อน
        logger_1.logger.info('Backup history recorded', data);
    }
    /**
     * ดึงสถิติการคัดลอกไฟล์แนบ
     */
    async getBackupStats(groupId, startDate, endDate) {
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
    async backupAttachmentsByDateRange(groupId, startDate, endDate) {
        try {
            logger_1.logger.info('Starting date range backup', { groupId, startDate, endDate });
            // ดึงงานในช่วงวันที่ที่ระบุ
            const tasks = await this.taskRepository.find({
                where: {
                    groupId,
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                },
                relations: ['attachedFiles', 'group']
            });
            if (tasks.length === 0) {
                logger_1.logger.info('No tasks found in date range', { groupId, startDate, endDate });
                return {
                    groupName: 'Unknown',
                    totalFiles: 0,
                    results: []
                };
            }
            const allResults = [];
            let totalFiles = 0;
            // คัดลอกไฟล์แนบของแต่ละงาน
            for (const task of tasks) {
                if (task.attachedFiles && task.attachedFiles.length > 0 && task.group) {
                    try {
                        const taskResults = await this.googleDriveService.backupTaskAttachments(task.id, task.createdAt);
                        allResults.push(...taskResults);
                        totalFiles += taskResults.filter(r => r.success).length;
                    }
                    catch (error) {
                        logger_1.logger.error('❌ Failed to backup task attachments:', error);
                    }
                }
            }
            const groupName = tasks[0]?.group?.name || 'Unknown';
            const result = {
                groupName,
                totalFiles,
                results: allResults
            };
            logger_1.logger.info('Date range backup completed', result);
            return result;
        }
        catch (error) {
            logger_1.logger.error('❌ Date range backup failed:', error);
            throw error;
        }
    }
    /**
     * คัดลอกไฟล์แนบตามประเภท
     */
    async backupAttachmentsByType(groupId, attachmentType, date = new Date()) {
        try {
            logger_1.logger.info('Starting type-based backup', { groupId, attachmentType, date });
            // ดึงไฟล์ตามประเภทที่ระบุ
            const files = await this.fileRepository.find({
                where: {
                    groupId,
                    attachmentType
                },
                relations: ['linkedTasks', 'group']
            });
            if (files.length === 0) {
                logger_1.logger.info('No files found for type', { groupId, attachmentType });
                return [];
            }
            const results = [];
            // จัดกลุ่มไฟล์ตามงาน
            const filesByTask = new Map();
            for (const file of files) {
                if (file.linkedTasks && file.linkedTasks.length > 0) {
                    const taskId = file.linkedTasks[0].id;
                    if (!filesByTask.has(taskId)) {
                        filesByTask.set(taskId, []);
                    }
                    filesByTask.get(taskId).push(file);
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
                        const taskResults = await this.googleDriveService.backupTaskAttachments(taskId, date);
                        results.push(...taskResults);
                    }
                }
                catch (error) {
                    logger_1.logger.error('❌ Failed to backup task attachments:', error);
                }
            }
            logger_1.logger.info('Type-based backup completed', {
                groupId,
                attachmentType,
                totalFiles: files.length,
                successCount: results.filter(r => r.success).length
            });
            return results;
        }
        catch (error) {
            logger_1.logger.error('❌ Type-based backup failed:', error);
            throw error;
        }
    }
}
exports.FileBackupService = FileBackupService;
//# sourceMappingURL=FileBackupService.js.map