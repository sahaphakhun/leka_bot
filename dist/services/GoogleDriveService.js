"use strict";
// Google Drive Service - จัดการการอัปโหลดไฟล์ไปยัง Google Drive
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveService = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const config_1 = require("@/utils/config");
const logger_1 = require("@/utils/logger");
const models_1 = require("@/models");
const database_1 = require("@/utils/database");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const FileService_1 = require("./FileService");
class GoogleDriveService {
    constructor() {
        this.isInitialized = false;
        this.sharedFolderId = config_1.config.google.driveSharedFolderId || '1Ubleu_mHtzvPQbfHT0PQqDmQqPgSe66j'; // โฟลเดอร์ที่คุณแชร์ให้
        this.hasValidatedSharedRoot = false;
        this.initializeAuth();
    }
    /**
     * เริ่มต้นการเชื่อมต่อ Google Drive
     */
    async initializeAuth() {
        try {
            let credentials;
            let keyFile;
            // ลำดับการตรวจสอบ credentials
            credentials = this.tryBuildCredentialsFromEnvVars();
            if (!credentials && config_1.config.google.serviceAccountJson) {
                credentials = JSON.parse(config_1.config.google.serviceAccountJson);
            }
            else if (!credentials && config_1.config.google.serviceAccountKey) {
                credentials = JSON.parse(config_1.config.google.serviceAccountKey);
            }
            else if (!credentials) {
                // ใช้ไฟล์จาก GOOGLE_APPLICATION_CREDENTIALS หรือไฟล์ในโปรเจกต์
                keyFile = (config_1.config.google.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS);
                if (!keyFile) {
                    const fallback = path_1.default.resolve(process.cwd(), 'google-service-account.json');
                    if (fs_1.default.existsSync(fallback))
                        keyFile = fallback;
                }
            }
            if (!credentials && !keyFile) {
                logger_1.logger.warn('⚠️ Google Service Account not configured - set individual env vars or GOOGLE_SERVICE_ACCOUNT_JSON');
                return;
            }
            const authOpts = {
                scopes: [
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/drive.file'
                ]
            };
            if (credentials) {
                authOpts.credentials = credentials;
                logger_1.logger.info('✅ Using Google Service Account from environment variables');
            }
            if (keyFile) {
                authOpts.keyFile = keyFile;
                logger_1.logger.info('✅ Using Google Service Account from file');
            }
            this.auth = new googleapis_1.google.auth.GoogleAuth(authOpts);
            this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.auth });
            this.isInitialized = true;
            const folderSource = config_1.config.google.driveSharedFolderId ? 'env' : 'fallback';
            const maskedId = this.sharedFolderId ? `${this.sharedFolderId.substring(0, 4)}...${this.sharedFolderId.substring(this.sharedFolderId.length - 4)}` : 'undefined';
            logger_1.logger.info('✅ Google Drive Service initialized successfully', {
                usingSharedFolderIdFrom: folderSource,
                sharedFolderId: maskedId
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to initialize Google Drive Service:', error);
            this.isInitialized = false;
        }
    }
    /**
     * พยายามสร้าง credentials จาก environment variables แยก
     */
    tryBuildCredentialsFromEnvVars() {
        const { serviceAccountType, serviceAccountProjectId, serviceAccountPrivateKeyId, serviceAccountPrivateKey, serviceAccountClientEmail, serviceAccountClientId, serviceAccountAuthUri, serviceAccountTokenUri, serviceAccountAuthProviderX509CertUrl, serviceAccountClientX509CertUrl, serviceAccountUniverseDomain } = config_1.config.google;
        // ตรวจสอบว่ามี environment variables ที่จำเป็นหรือไม่
        if (!serviceAccountType || !serviceAccountProjectId || !serviceAccountPrivateKey || !serviceAccountClientEmail) {
            return null;
        }
        // แปลง\n ใน private key ให้เป็น line break จริง และจัดการกับ Railway's environment variable formatting
        let privateKey = serviceAccountPrivateKey;
        // ถ้า private key มาจาก environment variable ที่มี \n ต้องแปลงเป็น line break จริง
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        // ตรวจสอบว่ามี header และ footer ของ private key
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            logger_1.logger.error('❌ Invalid private key format: missing BEGIN header');
            return null;
        }
        if (!privateKey.includes('-----END PRIVATE KEY-----')) {
            logger_1.logger.error('❌ Invalid private key format: missing END footer');
            return null;
        }
        // ดีบักข้อมูล private key (ไม่แสดงเนื้อหาเต็ม)
        logger_1.logger.info('✅ Google Service Account credentials built from environment variables', {
            type: serviceAccountType,
            project_id: serviceAccountProjectId,
            client_email: serviceAccountClientEmail,
            private_key_preview: `${privateKey.substring(0, 50)}...${privateKey.substring(privateKey.length - 50)}`,
            private_key_length: privateKey.length,
            has_newlines: privateKey.includes('\n')
        });
        return {
            type: serviceAccountType,
            project_id: serviceAccountProjectId,
            private_key_id: serviceAccountPrivateKeyId,
            private_key: privateKey,
            client_email: serviceAccountClientEmail,
            client_id: serviceAccountClientId,
            auth_uri: serviceAccountAuthUri || 'https://accounts.google.com/o/oauth2/auth',
            token_uri: serviceAccountTokenUri || 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: serviceAccountAuthProviderX509CertUrl || 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: serviceAccountClientX509CertUrl,
            universe_domain: serviceAccountUniverseDomain || 'googleapis.com'
        };
    }
    /**
     * Ensure auth is initialized (constructor cannot await)
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initializeAuth();
        }
        return this.isInitialized;
    }
    /**
     * ตรวจสอบการเชื่อมต่อ Google Drive และการเข้าถึงโฟลเดอร์ที่แชร์
     */
    async testConnection() {
        try {
            if (!this.isInitialized) {
                await this.initializeAuth();
            }
            if (!this.isInitialized) {
                return false;
            }
            // ทดสอบการเชื่อมต่อโดยการดึงข้อมูล user profile
            const response = await this.drive.about.get({
                fields: 'user'
            });
            // ตรวจสอบโฟลเดอร์ที่กำหนด (ต้องอยู่ใน Shared Drive)
            const folderResponse = await this.drive.files.get({
                fileId: this.sharedFolderId,
                fields: 'id, name, permissions, driveId, mimeType, trashed',
                supportsAllDrives: true
            });
            if (!folderResponse.data || !folderResponse.data.driveId) {
                const msg = 'Configured GOOGLE_DRIVE_SHARED_FOLDER_ID is not inside a Shared Drive or is inaccessible.';
                logger_1.logger.error(`❌ ${msg}`, { folderId: this.sharedFolderId });
                return false;
            }
            this.hasValidatedSharedRoot = true;
            logger_1.logger.info('✅ Google Drive connection test successful', {
                user: response.data.user?.emailAddress,
                sharedFolder: folderResponse.data.name,
                folderId: this.sharedFolderId,
                driveId: folderResponse.data.driveId || null,
                inSharedDrive: !!folderResponse.data.driveId
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('❌ Google Drive connection test failed:', error);
            return false;
        }
    }
    /**
     * ตรวจสอบว่า root folder อยู่ใน Shared Drive และเข้าถึงได้ (เรียกครั้งเดียว)
     */
    async ensureSharedRoot() {
        if (this.hasValidatedSharedRoot)
            return;
        const folderResponse = await this.drive.files.get({
            fileId: this.sharedFolderId,
            fields: 'id, name, driveId, mimeType, trashed',
            supportsAllDrives: true
        });
        if (!folderResponse.data || !folderResponse.data.driveId) {
            const msg = 'Configured GOOGLE_DRIVE_SHARED_FOLDER_ID is not inside a Shared Drive or is inaccessible.';
            logger_1.logger.error(`❌ ${msg}`, { folderId: this.sharedFolderId });
            throw new Error(msg);
        }
        this.hasValidatedSharedRoot = true;
    }
    /**
     * สร้างโฟลเดอร์ใน Google Drive
     */
    async createFolder(folderName, parentFolderId) {
        try {
            if (!(await this.ensureInitialized())) {
                throw new Error('Google Drive Service not initialized');
            }
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                ...(parentFolderId && { parents: [parentFolderId] })
            };
            const response = await this.drive.files.create({
                requestBody: folderMetadata,
                fields: 'id',
                supportsAllDrives: true
            });
            const folderId = response.data.id;
            logger_1.logger.info(`✅ Created Google Drive folder: ${folderName}`, { folderId });
            return folderId;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to create Google Drive folder:', error);
            throw error;
        }
    }
    /**
     * สร้างโครงสร้างโฟลเดอร์สำหรับการจัดเก็บไฟล์แนบ
     */
    async createBackupFolderStructure(group, task, date) {
        try {
            if (!(await this.ensureInitialized())) {
                throw new Error('Google Drive Service not initialized');
            }
            await this.ensureSharedRoot();
            const groupName = this.sanitizeFolderName(group.name);
            const taskName = this.sanitizeFolderName(task.title);
            const dateStr = (0, moment_timezone_1.default)(date).format('YYYY-MM-DD');
            // สร้างโฟลเดอร์หลักสำหรับกลุ่ม (ถ้ายังไม่มี) - ภายในโฟลเดอร์ที่แชร์
            let groupFolderId = await this.findOrCreateFolder(groupName, this.sharedFolderId, { groupId: group.id });
            // สร้างโฟลเดอร์สำหรับงาน (ถ้ายังไม่มี)
            const taskFolderName = `${taskName}_${task.id.substring(0, 8)}`;
            let taskFolderId = await this.findOrCreateFolder(taskFolderName, groupFolderId, { groupId: group.id, taskId: task.id });
            // สร้างโฟลเดอร์สำหรับวันที่ (ถ้ายังไม่มี)
            let dateFolderId = await this.findOrCreateFolder(dateStr, taskFolderId, { groupId: group.id, taskId: task.id, date: dateStr });
            const folderStructure = {
                groupName,
                taskName,
                date: dateStr,
                folderId: dateFolderId,
                path: `${groupName}/${taskFolderName}/${dateStr}`
            };
            logger_1.logger.info('✅ Created backup folder structure', folderStructure);
            return folderStructure;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to create backup folder structure:', error);
            throw error;
        }
    }
    /**
     * ค้นหาหรือสร้างโฟลเดอร์
     */
    async findOrCreateFolder(folderName, parentFolderId, appProperties) {
        try {
            // 1) พยายามหาโฟลเดอร์ตาม appProperties ก่อน (ถ้ามีระบุ)
            if (appProperties && Object.keys(appProperties).length > 0) {
                const appPropsConditions = Object.entries(appProperties)
                    .map(([k, v]) => `appProperties has { key='${k}' and value='${v}' }`)
                    .join(' and ');
                const parentQuery = parentFolderId ? ` and '${parentFolderId}' in parents` : '';
                const propQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and ${appPropsConditions}${parentQuery}`;
                const byProp = await this.drive.files.list({
                    q: propQuery,
                    fields: 'files(id, name, createdTime, parents)',
                    pageSize: 10,
                    includeItemsFromAllDrives: true,
                    supportsAllDrives: true,
                    corpora: 'allDrives',
                    spaces: 'drive'
                });
                if (byProp.data.files && byProp.data.files.length > 0) {
                    const existing = byProp.data.files[0];
                    logger_1.logger.debug(`Found folder by appProperties: ${folderName}`, { folderId: existing.id });
                    return existing.id;
                }
            }
            // 2) หาโดยชื่อภายใต้ parent (รองรับกรณีที่เคยสร้างไปแล้วแต่ยังไม่ได้ใส่ appProperties)
            const nameQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const parentQuery2 = parentFolderId ? ` and '${parentFolderId}' in parents` : '';
            const byName = await this.drive.files.list({
                q: nameQuery + parentQuery2,
                fields: 'files(id, name, createdTime, parents)',
                pageSize: 10,
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
                corpora: 'allDrives',
                spaces: 'drive'
            });
            if (byName.data.files && byName.data.files.length > 0) {
                const existingFolder = byName.data.files[0];
                logger_1.logger.debug(`Found existing folder by name: ${folderName}`, { folderId: existingFolder.id });
                // อัปเดต appProperties ให้โฟลเดอร์เดิม เพื่อกันซ้ำในอนาคต
                if (appProperties && Object.keys(appProperties).length > 0) {
                    try {
                        await this.drive.files.update({
                            fileId: existingFolder.id,
                            requestBody: { appProperties },
                            supportsAllDrives: true
                        });
                    }
                    catch (e) {
                        logger_1.logger.warn('⚠️ Unable to set appProperties on existing folder', { folderId: existingFolder.id, error: e });
                    }
                }
                return existingFolder.id;
            }
            // 3) ไม่พบจริงๆ ให้สร้างใหม่ พร้อม appProperties (ถ้ามี)
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                ...(parentFolderId && { parents: [parentFolderId] }),
                ...(appProperties && { appProperties })
            };
            const response = await this.drive.files.create({
                requestBody: folderMetadata,
                fields: 'id',
                supportsAllDrives: true
            });
            const folderId = response.data.id;
            logger_1.logger.info(`✅ Created Google Drive folder: ${folderName}`, { folderId });
            return folderId;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to find or create folder:', error);
            throw error;
        }
    }
    /**
     * อัปโหลดไฟล์ไปยัง Google Drive
     */
    async uploadFileToDrive(file, folderId, fileName) {
        try {
            if (!(await this.ensureInitialized())) {
                throw new Error('Google Drive Service not initialized');
            }
            await this.ensureSharedRoot();
            // ดึงเนื้อหาไฟล์
            const fileService = new FileService_1.FileService();
            const fileContent = await fileService.getFileContent(file.id);
            if (!fileContent || !fileContent.content) {
                throw new Error(`Failed to get file content for file: ${file.id}`);
            }
            // สร้าง metadata สำหรับไฟล์
            const fileMetadata = {
                name: fileName || file.originalName,
                parents: [folderId]
            };
            // สร้าง media สำหรับไฟล์ (ใช้ Stream แทน Buffer โดยตรง เพื่อหลีกเลี่ยงปัญหา part.body.pipe)
            const bodyStream = new stream_1.PassThrough();
            bodyStream.end(fileContent.content);
            const media = {
                mimeType: file.mimeType || 'application/octet-stream',
                body: bodyStream
            };
            // อัปโหลดไฟล์
            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, name, size, webViewLink',
                supportsAllDrives: true
            });
            const driveFileId = response.data.id;
            logger_1.logger.info('✅ File uploaded to Google Drive successfully', {
                fileName: response.data.name,
                fileId: driveFileId,
                size: response.data.size,
                webViewLink: response.data.webViewLink
            });
            return driveFileId;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to upload file to Google Drive:', error);
            throw error;
        }
    }
    /**
     * คัดลอกไฟล์แนบของงานไปยัง Google Drive
     */
    async backupTaskAttachments(taskId, backupDate) {
        try {
            if (!(await this.ensureInitialized())) {
                throw new Error('Google Drive Service not initialized');
            }
            const taskRepository = database_1.AppDataSource.getRepository(models_1.Task);
            const fileRepository = database_1.AppDataSource.getRepository(models_1.File);
            // ดึงข้อมูลงานและกลุ่ม
            const task = await taskRepository.findOne({
                where: { id: taskId },
                relations: ['group']
            });
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }
            if (!task.group) {
                throw new Error(`Task ${taskId} has no associated group`);
            }
            // ดึงไฟล์แนบของงาน
            const files = await fileRepository
                .createQueryBuilder('file')
                .leftJoin('file.linkedTasks', 'task')
                .where('task.id = :taskId', { taskId })
                .getMany();
            if (files.length === 0) {
                logger_1.logger.info(`No files found for task: ${taskId}`);
                return [];
            }
            const results = [];
            // อัปโหลดไฟล์แต่ละไฟล์ โดยใช้วันที่ที่ไฟล์ถูกอัปโหลดจริง
            for (const file of files) {
                try {
                    // ใช้วันที่ที่ไฟล์ถูกอัปโหลดจริง (uploadedAt) แทนวันที่ที่ส่งมา
                    const fileUploadDate = file.uploadedAt || new Date();
                    const folderStructure = await this.createBackupFolderStructure(task.group, task, fileUploadDate);
                    const driveFileId = await this.uploadFileToDrive(file, folderStructure.folderId);
                    results.push({
                        success: true,
                        fileId: file.id,
                        driveFileId,
                        folderPath: folderStructure.path
                    });
                    logger_1.logger.info(`✅ Backed up file: ${file.originalName}`, {
                        fileId: file.id,
                        driveFileId,
                        folderPath: folderStructure.path,
                        uploadDate: fileUploadDate
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    const statusCode = error?.statusCode;
                    // ตรวจสอบว่าเป็น error ของไฟล์หายไปจาก Cloudinary หรือไม่
                    if (statusCode === 404 || errorMessage.includes('Remote file not found') || errorMessage.includes('not found')) {
                        logger_1.logger.warn(`⚠️ Skipping missing file: ${file.originalName} (File not found in Cloudinary)`, {
                            fileId: file.id,
                            fileName: file.originalName,
                            filePath: file.path,
                            statusCode,
                            error: 'File not found in storage'
                        });
                        results.push({
                            success: false,
                            fileId: file.id,
                            error: 'Remote file not found',
                            folderPath: 'skipped'
                        });
                    }
                    else {
                        // Error อื่นๆ ที่ไม่ใช่ไฟล์หายไป
                        logger_1.logger.error(`❌ Failed to backup file: ${file.originalName}`, {
                            error: errorMessage,
                            fileId: file.id,
                            fileName: file.originalName,
                            statusCode
                        });
                        results.push({
                            success: false,
                            fileId: file.id,
                            error: errorMessage,
                            folderPath: 'unknown'
                        });
                    }
                }
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to backup task attachments:', error);
            throw error;
        }
    }
    /**
     * คัดลอกไฟล์แนบของกลุ่มไปยัง Google Drive
     */
    async backupGroupAttachments(groupId, date) {
        try {
            if (!(await this.ensureInitialized())) {
                throw new Error('Google Drive Service not initialized');
            }
            const groupRepository = database_1.AppDataSource.getRepository(models_1.Group);
            const taskRepository = database_1.AppDataSource.getRepository(models_1.Task);
            // ดึงข้อมูลกลุ่ม
            const group = await groupRepository.findOne({
                where: { id: groupId }
            });
            if (!group) {
                throw new Error(`Group not found: ${groupId}`);
            }
            // ดึงงานทั้งหมดในกลุ่ม
            const tasks = await taskRepository.find({
                where: { groupId },
                relations: ['group']
            });
            if (tasks.length === 0) {
                logger_1.logger.info(`No tasks found for group: ${group.name}`);
                return {
                    groupName: group.name,
                    totalTasks: 0,
                    totalFiles: 0,
                    taskResults: []
                };
            }
            const taskResults = [];
            let totalFiles = 0;
            // คัดลอกไฟล์แนบของแต่ละงาน
            for (const task of tasks) {
                try {
                    const backupResults = await this.backupTaskAttachments(task.id, date);
                    taskResults.push({
                        taskId: task.id,
                        taskTitle: task.title,
                        filesBackedUp: backupResults.filter(r => r.success).length,
                        totalFiles: backupResults.length,
                        results: backupResults
                    });
                    totalFiles += backupResults.length;
                }
                catch (error) {
                    logger_1.logger.error(`❌ Failed to backup task: ${task.title}`, error);
                    taskResults.push({
                        taskId: task.id,
                        taskTitle: task.title,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            const summary = {
                groupName: group.name,
                totalTasks: tasks.length,
                totalFiles,
                taskResults
            };
            logger_1.logger.info('✅ Group backup completed', summary);
            return summary;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to backup group attachments:', error);
            throw error;
        }
    }
    /**
     * คัดลอกไฟล์แนบทั้งหมดในระบบไปยัง Google Drive
     */
    async backupAllAttachments(date) {
        try {
            if (!(await this.ensureInitialized())) {
                throw new Error('Google Drive Service not initialized');
            }
            const groupRepository = database_1.AppDataSource.getRepository(models_1.Group);
            const groups = await groupRepository.find();
            if (groups.length === 0) {
                logger_1.logger.info('No groups found for backup');
                return {
                    totalGroups: 0,
                    totalTasks: 0,
                    totalFiles: 0,
                    groupResults: []
                };
            }
            const groupResults = [];
            let totalTasks = 0;
            let totalFiles = 0;
            // คัดลอกไฟล์แนบของแต่ละกลุ่ม
            for (const group of groups) {
                try {
                    const groupResult = await this.backupGroupAttachments(group.id, date);
                    groupResults.push(groupResult);
                    totalTasks += groupResult.totalTasks;
                    totalFiles += groupResult.totalFiles;
                }
                catch (error) {
                    logger_1.logger.error('❌ Failed to backup group:', error);
                    groupResults.push({
                        groupName: group.name,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            const summary = {
                totalGroups: groups.length,
                totalTasks,
                totalFiles,
                groupResults
            };
            logger_1.logger.info('✅ System-wide backup completed', summary);
            return summary;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to backup all attachments:', error);
            throw error;
        }
    }
    /**
     * ทำความสะอาดชื่อโฟลเดอร์เพื่อให้เข้ากับ Google Drive
     */
    sanitizeFolderName(name) {
        return name
            .replace(/[<>:"/\\|?*]/g, '_') // ลบอักขระที่ไม่ปลอดภัย
            .replace(/\s+/g, '_') // แทนที่ช่องว่างด้วย underscore
            .substring(0, 100); // จำกัดความยาว
    }
    /**
     * ตรวจสอบและทำความสะอาดไฟล์ที่หายไปจาก Cloudinary
     */
    async cleanupMissingFiles(groupId) {
        try {
            logger_1.logger.info('Starting cleanup of missing files from Cloudinary', { groupId });
            const fileRepository = database_1.AppDataSource.getRepository(models_1.File);
            // ดึงไฟล์ที่เก็บใน Cloudinary
            const queryBuilder = fileRepository.createQueryBuilder('file')
                .where("file.path LIKE 'https://res.cloudinary.com%'");
            if (groupId) {
                queryBuilder.andWhere('file.groupId = :groupId', { groupId });
            }
            const cloudinaryFiles = await queryBuilder.getMany();
            const missingFiles = [];
            const cleanedFiles = [];
            logger_1.logger.info(`Checking ${cloudinaryFiles.length} Cloudinary files for availability`);
            // ตรวจสอบไฟล์แต่ละไฟล์
            for (const file of cloudinaryFiles) {
                try {
                    const fileService = new FileService_1.FileService();
                    await fileService.getFileContent(file.id);
                    // ถ้าไม่มี error แปลว่าไฟล์ยังอยู่
                }
                catch (error) {
                    const statusCode = error?.statusCode;
                    if (statusCode === 404 || error?.message?.includes('Remote file not found')) {
                        missingFiles.push({
                            fileId: file.id,
                            fileName: file.originalName,
                            filePath: file.path,
                            groupId: file.groupId,
                            uploadedAt: file.uploadedAt
                        });
                        logger_1.logger.warn(`Found missing file: ${file.originalName}`, {
                            fileId: file.id,
                            fileName: file.originalName,
                            filePath: file.path
                        });
                    }
                }
            }
            // ถามผู้ใช้ก่อนลบ หรือเพียงแค่รายงานผล
            logger_1.logger.info('Missing files cleanup summary', {
                totalChecked: cloudinaryFiles.length,
                missingFilesCount: missingFiles.length,
                missingFiles: missingFiles.map(f => ({ id: f.fileId, name: f.fileName }))
            });
            return {
                totalChecked: cloudinaryFiles.length,
                missingFiles,
                cleanedFiles
            };
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to cleanup missing files:', error);
            throw error;
        }
    }
    /**
     * ดึงข้อมูลโฟลเดอร์ที่แชร์
     */
    async getSharedFolderInfo() {
        try {
            if (!this.isInitialized) {
                throw new Error('Google Drive Service not initialized');
            }
            const response = await this.drive.files.get({
                fileId: this.sharedFolderId,
                fields: 'id, name, createdTime, modifiedTime, webViewLink, permissions'
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to get shared folder info:', error);
            throw error;
        }
    }
}
exports.GoogleDriveService = GoogleDriveService;
//# sourceMappingURL=GoogleDriveService.js.map