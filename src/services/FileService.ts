// File Service - จัดการไฟล์และ File Vault

import { Repository, In, QueryRunner } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { File, Group, User } from '@/models';
import { config } from '@/utils/config';
import { serviceContainer } from '@/utils/serviceContainer';
import { LineService } from '@/services/LineService';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { logger } from '@/utils/logger';

export class FileService {
  private fileRepository: Repository<File>;
  private groupRepository: Repository<Group>;
  private userRepository: Repository<User>;
  private lineService: LineService;

  constructor() {
    this.fileRepository = AppDataSource.getRepository(File);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.userRepository = AppDataSource.getRepository(User);
    this.lineService = serviceContainer.get<LineService>('LineService');
    
    // ตั้งค่า Cloudinary ถ้ามีค่า env
    if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret
      });
      logger.info('✅ Cloudinary configured successfully', {
        cloudName: config.cloudinary.cloudName,
        apiKey: config.cloudinary.apiKey ? '***' + config.cloudinary.apiKey.slice(-4) : 'undefined',
        apiSecret: config.cloudinary.apiSecret ? '***' + config.cloudinary.apiSecret.slice(-4) : 'undefined',
        uploadFolder: config.cloudinary.uploadFolder
      });
    } else {
      logger.warn('⚠️ Cloudinary not configured - missing environment variables', {
        cloudName: !!config.cloudinary.cloudName,
        apiKey: !!config.cloudinary.apiKey,
        apiSecret: !!config.cloudinary.apiSecret
      });
    }
  }

  /**
   * บันทึกไฟล์ที่อัปโหลดจาก LINE
   */
  public async saveFile(data: {
    groupId: string;
    uploadedBy: string;
    messageId: string;
    content: Buffer;
    originalName?: string;
    mimeType: string;
    folderStatus?: 'in_progress' | 'completed';
    attachmentType?: 'initial' | 'submission';
  }): Promise<File> {
    try {
      // แปลง LINE Group ID → internal UUID (ถ้าเป็น LINE ID)
      const internalGroupId = await this.resolveInternalGroupId(data.groupId);
      if (!internalGroupId) {
        throw new Error(`Group not found for ID: ${data.groupId}`);
      }

      // แปลง LINE User ID → internal UUID (ถ้ามี record อยู่)
      let internalUserId: string | null = null;
      // พยายามหาโดย lineUserId ก่อน
      const userByLineId = await this.userRepository.findOne({ where: { lineUserId: data.uploadedBy } });
      if (userByLineId) {
        internalUserId = userByLineId.id;
      } else {
        // ถ้าไม่พบ และค่าเป็น UUID อยู่แล้ว ให้ยอมรับ
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.uploadedBy);
        if (isUuid) {
          internalUserId = data.uploadedBy;
        }
      }

      if (!internalUserId) {
        throw new Error(`User not found for uploadedBy: ${data.uploadedBy}`);
      }

      // อัปโหลดไป Cloudinary ถ้าตั้งค่าพร้อม ใช้ remote storage แทน local
      let fileRecord;
      const useCloudinary = !!(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);

      if (useCloudinary) {
        // อัปโหลดจาก buffer ผ่าน data URI (base64)
        const base64 = data.content.toString('base64');
        const ext = this.getFileExtension(data.mimeType, data.originalName);
        const folder = `${config.cloudinary.uploadFolder}/${data.groupId}`;
        const publicId = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        const resourceType = data.mimeType.startsWith('application/') ? 'raw' : 'auto';
        const uploadRes = await cloudinary.uploader.upload(`data:${data.mimeType};base64,${base64}` as any, {
          folder,
          public_id: publicId,
          resource_type: resourceType
        } as any);

        fileRecord = this.fileRepository.create({
          groupId: internalGroupId,
          originalName: data.originalName || `file_${data.messageId}${ext}`,
          fileName: uploadRes.public_id,
          mimeType: data.mimeType,
          size: uploadRes.bytes || data.content.length,
          path: uploadRes.secure_url, // เก็บเป็น URL
          storageProvider: 'cloudinary',
          storageKey: uploadRes.public_id,
          uploadedBy: internalUserId,
          isPublic: false,
          tags: [],
          folderStatus: data.folderStatus || 'in_progress',
          attachmentType: data.attachmentType
        });
      } else {
        // เดิม: บันทึกโลคอล
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const extension = this.getFileExtension(data.mimeType, data.originalName);
        const fileName = `${timestamp}_${random}${extension}`;
        const groupFolder = path.join(config.storage.uploadPath, data.groupId);
        const filePath = path.join(groupFolder, fileName);
        await fs.mkdir(groupFolder, { recursive: true });
        await fs.writeFile(filePath, data.content);

        fileRecord = this.fileRepository.create({
          groupId: internalGroupId,
          originalName: data.originalName || `file_${data.messageId}${extension}`,
          fileName,
          mimeType: data.mimeType,
          size: data.content.length,
          path: filePath,
          uploadedBy: internalUserId,
          isPublic: false,
          tags: [],
          folderStatus: data.folderStatus || 'in_progress',
          attachmentType: data.attachmentType
        });
      }

      return await this.fileRepository.save(fileRecord);

    } catch (error) {
      console.error('❌ Error saving file:', error);
      throw error;
    }
  }

  /**
   * เพิ่มแท็กให้ไฟล์
   */
  public async addFileTags(fileId: string, tags: string[]): Promise<File> {
    try {
      const file = await this.fileRepository.findOneBy({ id: fileId });
      if (!file) {
        throw new Error('File not found');
      }

      // รวมแท็กใหม่กับแท็กเดิม (ไม่ซ้ำ)
      const uniqueTags = [...new Set([...file.tags, ...tags])];
      file.tags = uniqueTags;

      return await this.fileRepository.save(file);

    } catch (error) {
      console.error('❌ Error adding file tags:', error);
      throw error;
    }
  }

  /**
   * ผูกไฟล์กับงาน
   */
  public async linkFileToTask(fileId: string, taskId: string, queryRunner?: QueryRunner): Promise<void> {
    try {
      const repo = queryRunner ? queryRunner.manager.getRepository(File) : this.fileRepository;
      const file = await repo.findOne({
        where: { id: fileId },
        relations: ['linkedTasks']
      });

      if (!file) {
        throw new Error('File not found');
      }

      // ตรวจสอบว่าผูกแล้วหรือยัง
      const alreadyLinked = file.linkedTasks.some(task => task.id === taskId);
      if (!alreadyLinked) {
        const builder = queryRunner ? queryRunner.manager.createQueryBuilder() : AppDataSource.createQueryBuilder();
        await builder
          .relation(File, 'linkedTasks')
          .of(fileId)
          .add(taskId);
      }

    } catch (error) {
      console.error('❌ Error linking file to task:', error);
      throw error;
    }
  }

  /**
   * ยกเลิกการผูกไฟล์กับงาน
   */
  public async unlinkFileFromTask(fileId: string, taskId: string): Promise<void> {
    try {
      await AppDataSource
        .createQueryBuilder()
        .relation(File, 'linkedTasks')
        .of(fileId)
        .remove(taskId);

    } catch (error) {
      console.error('❌ Error unlinking file from task:', error);
      throw error;
    }
  }

  /**
   * บันทึกไฟล์จาก LINE Message ในแชทส่วนตัว
   */
  public async saveFileFromLine(message: any, lineUserId: string, context: string = 'personal_chat'): Promise<File | null> {
    try {
      // ดึงข้อมูลไฟล์จาก LINE
      const content = await this.lineService.downloadContent(message.id);
      if (!content) {
        throw new Error('Cannot get file content from LINE');
      }

      // หา user ในระบบ
      const user = await this.userRepository.findOne({ where: { lineUserId } });
      if (!user) {
        throw new Error('User not found');
      }

      // สร้าง group จำลองสำหรับแชทส่วนตัว (ใช้ UUID ที่ถูกต้อง)
      const tempGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)

      // บันทึกไฟล์
      const fileData = {
        groupId: tempGroupId,
        uploadedBy: user.id,
        messageId: message.id,
        content: content,
        originalName: this.generateSafeFileName(message.fileName, message.id, message.type),
        mimeType: message.type === 'image' ? 'image/jpeg' : 
                  message.type === 'video' ? 'video/mp4' : 
                  message.type === 'audio' ? 'audio/mp3' : 'application/octet-stream',
        folderStatus: 'in_progress' as const
      };

      // ตรวจสอบว่า group นี้มีอยู่หรือไม่ ถ้าไม่มีให้สร้าง
      let group = await this.groupRepository.findOne({ where: { id: tempGroupId } });
      if (!group) {
        group = this.groupRepository.create({
          id: tempGroupId,
          lineGroupId: `personal_${user.lineUserId}`, // ใช้ LINE User ID สำหรับ lineGroupId
          name: `แชทส่วนตัว - ${user.displayName}`,
          timezone: 'Asia/Bangkok',
          settings: {
            reminderIntervals: [],
            enableLeaderboard: false,
            defaultReminders: [],
            workingHours: {
              start: '09:00',
              end: '18:00'
            }
          }
        });
        await this.groupRepository.save(group);
      }

      const savedFile = await this.saveFile(fileData);
      
      // เพิ่มแท็กเพื่อระบุว่าเป็นไฟล์จากแชทส่วนตัว
      await this.addFileTags(savedFile.id, [context, 'personal_chat']);
      
      return savedFile;

    } catch (error) {
      console.error('❌ Error saving file from LINE:', error);
      return null;
    }
  }

  /**
   * ดึงไฟล์ตาม IDs
   */
  public async getFilesByIds(fileIds: string[]): Promise<File[]> {
    try {
      if (fileIds.length === 0) {
        return [];
      }

      const files = await this.fileRepository.find({
        where: { id: In(fileIds) },
        relations: ['uploadedByUser', 'linkedTasks']
      });
      return files;
    } catch (error) {
      console.error('❌ Error getting files by IDs:', error);
      throw error;
    }
  }

  /**
   * ดึงไฟล์ในกลุ่ม
   */
  public async getGroupFiles(
    groupId: string,
    options: {
      tags?: string[];
      mimeType?: string;
      uploadedBy?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ files: (File & { taskNames?: string[] })[]; total: number }> {
    try {
      const internalGroupId = await this.resolveInternalGroupId(groupId);
      if (!internalGroupId) {
        return { files: [], total: 0 };
      }

      // แปลง uploadedBy (LINE User ID → internal UUID) หากระบุมา
      let internalUploadedBy: string | undefined;
      if (options.uploadedBy) {
        const uploadedBy = options.uploadedBy;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadedBy);
        if (isUuid) {
          internalUploadedBy = uploadedBy;
        } else if (uploadedBy.startsWith('U')) {
          const user = await this.userRepository.findOne({ where: { lineUserId: uploadedBy } });
          if (!user) {
            return { files: [], total: 0 };
          }
          internalUploadedBy = user.id;
        } else {
          return { files: [], total: 0 };
        }
      }

      const queryBuilder = this.fileRepository.createQueryBuilder('file')
        .leftJoinAndSelect('file.uploadedByUser', 'uploader')
        .leftJoinAndSelect('file.linkedTasks', 'task')
        .where('file.groupId = :groupId', { groupId: internalGroupId });

      if (options.tags && options.tags.length > 0) {
        queryBuilder.andWhere('file.tags && :tags', { tags: options.tags });
      }

      if (options.mimeType) {
        queryBuilder.andWhere('file.mimeType LIKE :mimeType', { 
          mimeType: `${options.mimeType}%` 
        });
      }

      if (internalUploadedBy) {
        queryBuilder.andWhere('file.uploadedBy = :uploadedBy', { uploadedBy: internalUploadedBy });
      }

      if (options.startDate) {
        queryBuilder.andWhere('file.uploadedAt >= :startDate', { 
          startDate: options.startDate 
        });
      }

      if (options.endDate) {
        queryBuilder.andWhere('file.uploadedAt <= :endDate', { 
          endDate: options.endDate 
        });
      }

      if (options.search) {
        queryBuilder.andWhere(
          '(file.originalName ILIKE :search OR :search = ANY(file.tags))',
          { search: `%${options.search}%` }
        );
      }

      const total = await queryBuilder.getCount();

      queryBuilder.orderBy('file.uploadedAt', 'DESC');

      if (options.limit) {
        queryBuilder.limit(options.limit);
      }

      if (options.offset) {
        queryBuilder.offset(options.offset);
      }

      const rawFiles = await queryBuilder.getMany();

      const files = rawFiles.map(f => {
        const plain: any = { ...f };
        if (f.linkedTasks && f.linkedTasks.length > 0) {
          plain.taskNames = f.linkedTasks.map(t => t.title);
        }
        return plain;
      });

      return { files, total };

    } catch (error) {
      console.error('❌ Error getting group files:', error);
      throw error;
    }
  }

  /**
   * กรองรายการไฟล์ให้เหลือเฉพาะไฟล์ที่ยังอยู่จริงบนดิสก์
   */
  public async filterExistingFiles(files: File[]): Promise<File[]> {
    const existing: File[] = [];
    for (const file of files) {
      try {
        if (!file.path) continue;
        // ถ้าเป็น URL (เช่น Cloudinary) ให้ถือว่ายังใช้งานได้
        if (/^https?:\/\//i.test(file.path)) {
          existing.push(file);
          continue;
        }
        // กรณี local file
        await fs.access(file.path);
        existing.push(file);
      } catch {
        // skip missing file
      }
    }
    return existing;
  }

  /**
   * ดึงไฟล์ที่ผูกกับงาน
   */
  public async getTaskFiles(taskId: string): Promise<File[]> {
    try {
      return await this.fileRepository.createQueryBuilder('file')
        .leftJoinAndSelect('file.uploadedByUser', 'uploader')
        .leftJoin('file.linkedTasks', 'task')
        .where('task.id = :taskId', { taskId })
        .orderBy('file.uploadedAt', 'DESC')
        .getMany();

    } catch (error) {
      // ลดการ logging เพื่อป้องกัน rate limit
      throw error;
    }
  }

  /**
   * ดึงไฟล์ที่ผูกกับงานแยกตามประเภท
   */
  public async getTaskFilesByType(taskId: string): Promise<{
    initialFiles: File[];
    submissionFiles: File[];
    allFiles: File[];
  }> {
    try {
      const allFiles = await this.fileRepository.createQueryBuilder('file')
        .leftJoinAndSelect('file.uploadedByUser', 'uploader')
        .leftJoin('file.linkedTasks', 'task')
        .where('task.id = :taskId', { taskId })
        .orderBy('file.uploadedAt', 'DESC')
        .getMany();

      const initialFiles = allFiles.filter(file => file.attachmentType === 'initial');
      const submissionFiles = allFiles.filter(file => file.attachmentType === 'submission');

      return {
        initialFiles,
        submissionFiles,
        allFiles
      };

    } catch (error) {
      // ลดการ logging เพื่อป้องกัน rate limit
      throw error;
    }
  }

  /**
   * ดึงข้อมูลไฟล์
   */
  public async getFileInfo(fileId: string): Promise<File | null> {
    try {
      const file = await this.fileRepository.findOneBy({ id: fileId });
      return file;
    } catch (error) {
      // ลดการ logging เพื่อป้องกัน rate limit
      throw error;
    }
  }

  /**
   * ดาวน์โหลดไฟล์
   */
  public async getFileContent(fileId: string): Promise<{
    content: Buffer;
    mimeType: string;
    originalName: string;
  }> {
    try {
      const file = await this.fileRepository.findOneBy({ id: fileId });
      if (!file) {
        throw new Error('File not found');
      }
      
      // ถ้า path เป็น URL (cloudinary) ให้ดาวน์โหลดจาก URL
      if (/^https?:\/\//i.test(file.path)) {
        return await this.downloadRemoteFile(file);
      } else {
        const content = await fs.readFile(file.path);
        return { content, mimeType: file.mimeType, originalName: file.originalName };
      }

    } catch (error) {
      const statusCode = (error as any)?.statusCode;
      const url = (error as any)?.url;
      if (statusCode || url) {
        logger.error('❌ Failed to get file content', { fileId, url, statusCode, error });
      }
      if (error instanceof Error) {
        if (statusCode) {
          const err: any = new Error(error.message);
          err.statusCode = statusCode;
          if (url) err.url = url;
          throw err;
        }
        throw new Error(`Failed to get file content: ${error.message}`);
      }
      throw new Error('Failed to get file content');
    }
  }

  /**
   * ดาวน์โหลดไฟล์จาก URL พร้อม retry logic และ timeout
   */
  private async downloadRemoteFile(file: File): Promise<{
    content: Buffer;
    mimeType: string;
    originalName: string;
  }> {
    const maxRetries = 3;
    const requestTimeoutMs = 45000; // 45 วินาที

    const fetchWithHttp = (targetUrl: string): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        let timedOut = false;
        const controller = setTimeout(() => {
          timedOut = true;
          const timeoutErr: any = new Error('Request timeout');
          timeoutErr.url = targetUrl;
          logger.error('❌ Remote file request timeout', { url: targetUrl });
          reject(timeoutErr);
        }, requestTimeoutMs);

        const doRequest = (urlToGet: string, redirectsLeft: number) => {
          const urlObj = new URL(urlToGet);
          const lib = urlObj.protocol === 'https:' ? https : http;
          const options: http.RequestOptions = {
            method: 'GET',
            headers: {
              'User-Agent': 'LekaBot/1.0',
              'Accept': '*/*',
              'Connection': 'close'
            }
          };

          const req = lib.request(urlObj, options, (res) => {
            // Handle redirects (3xx)
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              if (redirectsLeft <= 0) {
                clearTimeout(controller);
                const redirectErr: any = new Error('Too many redirects');
                redirectErr.url = urlToGet;
                logger.error('❌ Too many redirects fetching remote file', { url: urlToGet });
                reject(redirectErr);
                return;
              }
              const location = res.headers.location.startsWith('http')
                ? res.headers.location
                : `${urlObj.protocol}//${urlObj.host}${res.headers.location}`;
              res.resume(); // discard
              return doRequest(location, redirectsLeft - 1);
            }

            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              clearTimeout(controller);
              const statusCode = res.statusCode || 0;
              const errMsg = statusCode === 404
                ? 'Remote file not found'
                : statusCode === 403
                  ? 'Remote file access denied'
                  : `Remote file responded with status ${statusCode}`;
              const statusErr: any = new Error(errMsg);
              statusErr.statusCode = statusCode;
              statusErr.url = urlToGet;
              logger.error('❌ Remote file HTTP error', { url: urlToGet, statusCode });
              reject(statusErr);
              return;
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            res.on('end', () => {
              if (timedOut) return;
              clearTimeout(controller);
              resolve(Buffer.concat(chunks));
            });
          });

          req.on('error', (err) => {
            if (timedOut) return;
            clearTimeout(controller);
            (err as any).url = urlToGet;
            logger.error('❌ Remote file request error', { url: urlToGet, error: err });
            reject(err);
          });

          req.end();
        };

        doRequest(targetUrl, 5);
      });
    };

    let lastErr: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const targetUrl = this.resolveFileUrl(file);
        const content = await fetchWithHttp(targetUrl);
        return { content, mimeType: file.mimeType, originalName: file.originalName };
      } catch (err) {
        lastErr = err;
        // ถ้าเป็น error ที่มี status code 4xx ไม่ต้อง retry
        if ((err as any)?.statusCode && (err as any).statusCode < 500) {
          break;
        }
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    logger.error('❌ Failed to fetch remote file after retries', {
      url: (lastErr as any)?.url || file.path,
      statusCode: (lastErr as any)?.statusCode,
      error: lastErr
    });

    if (lastErr && (lastErr as any).statusCode) {
      throw lastErr;
    }

    const finalErr: any = new Error(`Failed to fetch remote file after ${maxRetries} attempts: ${lastErr instanceof Error ? lastErr.message : 'unknown error'}`);
    if ((lastErr as any)?.url) finalErr.url = (lastErr as any).url;
    throw finalErr;
  }

  /**
   * สร้าง URL สำหรับเข้าถึงไฟล์ โดยเซ็นชื่อให้ Cloudinary หากจำเป็น
   */
  public resolveFileUrl(file: File): string {
    if (!file.path) return file.path;
    
    if (file.storageProvider === 'cloudinary') {
      const signedUrl = this.signCloudinaryUrl(file);
      logger.info(`🔗 Resolved Cloudinary URL:`, {
        originalPath: file.path,
        signedUrl: signedUrl,
        fileId: file.id,
        fileName: file.fileName
      });
      return signedUrl;
    }
    
    return file.path;
  }

  /**
   * สร้างลายเซ็นสำหรับ Cloudinary URL เพื่อหลีกเลี่ยงปัญหา 401
   */
  private signCloudinaryUrl(file: File): string {
    try {
      if (
        !config.cloudinary.cloudName ||
        !config.cloudinary.apiSecret ||
        !file.path.includes('res.cloudinary.com')
      ) {
        return file.path;
      }

      const urlObj = new URL(file.path);
      const parts = urlObj.pathname.split('/').filter(Boolean);

      // Remove cloud name segment if present
      if (parts[0] === config.cloudinary.cloudName) {
        parts.shift();
      }

      // กำหนด resourceType ตาม mimeType ของไฟล์
      let resourceType: string;
      if (file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/')) {
        resourceType = 'video';
      } else if (file.mimeType.startsWith('application/') || file.mimeType.startsWith('text/')) {
        resourceType = 'raw';
      } else {
        resourceType = 'image';
      }

      const deliveryType = parts[1] || 'upload';

      // Find version segment (e.g., v1)
      let version: string | undefined;
      let versionIndex = -1;
      for (let i = 2; i < parts.length; i++) {
        if (parts[i].startsWith('v')) {
          version = parts[i].substring(1);
          versionIndex = i;
          break;
        }
      }

      // สร้าง publicId จากส่วนที่เหลือของ path
      let publicId: string;
      if (versionIndex !== -1) {
        // เอาเฉพาะส่วนหลังจาก version
        publicId = parts.slice(versionIndex + 1).join('/');
      } else {
        // ถ้าไม่มี version ให้เอาเฉพาะส่วนหลังจาก deliveryType
        publicId = parts.slice(2).join('/');
      }

      // ถ้าไม่มี publicId ให้ใช้ storageKey หรือ fileName
      if (!publicId || publicId === '') {
        publicId = file.storageKey || file.fileName;
      }

      // ลบ query parameters ออกจาก publicId
      publicId = publicId.split('?')[0];

      const options: any = {
        resource_type: resourceType,
        type: deliveryType,
        sign_url: true,
        secure: true,
      };
      if (version) options.version = version;

      logger.info(`🔐 Signing Cloudinary URL:`, {
        publicId,
        resourceType,
        deliveryType,
        version,
        originalPath: file.path,
        mimeType: file.mimeType
      });

      return cloudinary.url(publicId, options);
    } catch (err) {
      logger.warn('⚠️ Failed to sign Cloudinary URL', err);
      return file.path;
    }
  }

  /**
   * ลบไฟล์
   */
  public async deleteFile(fileId: string): Promise<void> {
    try {
      const file = await this.fileRepository.findOneBy({ id: fileId });
      if (!file) {
        throw new Error('File not found');
      }

      // ลบไฟล์จากระบบจัดเก็บ
      try {
        if (file.path && /^https?:\/\//i.test(file.path) && config.cloudinary.cloudName) {
          // Cloudinary
          const resourceType = file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/')
            ? 'video'
            : file.mimeType.startsWith('application/')
              ? 'raw'
              : 'image';
          const publicId = file.storageKey || file.fileName;
          await cloudinary.uploader.destroy(publicId, { resource_type: resourceType as any });
        } else if (file.path) {
          // Local
          try {
            await fs.unlink(file.path);
          } catch (err) {
            console.warn('⚠️ Could not delete physical file:', err);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error deleting from storage:', error);
      }

      // ลบ record จากฐานข้อมูล
      await this.fileRepository.remove(file);

    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  }

  /**
   * สถิติไฟล์ในกลุ่ม
   */
  public async getGroupFileStats(groupId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: { [mimeType: string]: number };
    recentFiles: number; // ไฟล์ที่อัปโหลดในสัปดาห์นี้
  }> {
    try {
      const internalGroupId = await this.resolveInternalGroupId(groupId);
      if (!internalGroupId) {
        return { totalFiles: 0, totalSize: 0, fileTypes: {}, recentFiles: 0 };
      }

      const files = await this.fileRepository.find({
        where: { groupId: internalGroupId }
      });

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      const fileTypes: { [mimeType: string]: number } = {};
      files.forEach(file => {
        const baseType = file.mimeType.split('/')[0];
        fileTypes[baseType] = (fileTypes[baseType] || 0) + 1;
      });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentFiles = files.filter(file => file.uploadedAt >= weekAgo).length;

      return {
        totalFiles,
        totalSize,
        fileTypes,
        recentFiles
      };

    } catch (error) {
      console.error('❌ Error getting file stats:', error);
      throw error;
    }
  }

  /**
   * ทำความสะอาดไฟล์เก่า
   */
  public async cleanupOldFiles(daysOld: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldFiles = await this.fileRepository.find({
        where: {
          uploadedAt: {
            $lt: cutoffDate
          } as any
        }
      });

      let deletedCount = 0;

      for (const file of oldFiles) {
        try {
          await this.deleteFile(file.id);
          deletedCount++;
        } catch (error) {
          console.warn('⚠️ Could not delete old file:', file.id, error);
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('❌ Error cleaning up old files:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบว่าไฟล์อยู่ในกลุ่มที่ระบุหรือไม่
   */  
  public async isFileInGroup(fileId: string, groupId: string): Promise<boolean> {
    try {
      const internalGroupId = await this.resolveInternalGroupId(groupId);
      if (!internalGroupId) return false;

      const file = await this.fileRepository.findOne({
        where: { id: fileId, groupId: internalGroupId },
        select: ['id'] // ดึงเฉพาะ id เพื่อประหยัด memory
      });
      
      return !!file;
    } catch (error) {
      console.error('❌ Error checking file in group:', error);
      return false;
    }
  }

  /**
   * สร้าง URL สำหรับดาวน์โหลดไฟล์
   */
  public generateDownloadUrl(groupId: string, fileId: string): string {
    return `${config.baseUrl}/api/groups/${groupId}/files/${fileId}/download`;
  }

  /**
   * สร้าง URL สำหรับแสดงตัวอย่างไฟล์
   */
  public generatePreviewUrl(groupId: string, fileId: string): string {
    return `${config.baseUrl}/api/groups/${groupId}/files/${fileId}/preview`;
  }

  /**
   * ตรวจสอบประเภทไฟล์และสร้าง extension
   */
  private getFileExtension(mimeType: string, originalName?: string): string {
    // ถ้ามีชื่อไฟล์เดิม ใช้ extension จากชื่อไฟล์
    if (originalName && originalName.includes('.')) {
      const ext = originalName.split('.').pop();
      if (ext) return `.${ext}`;
    }

    // ถ้าไม่มี ใช้ mimeType
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'text/plain': '.txt',
    };

    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * สร้างชื่อไฟล์ที่ปลอดภัยจากข้อมูล LINE
   */
  private generateSafeFileName(fileName?: string, messageId?: string, fileType?: string): string {
    // ถ้ามีชื่อไฟล์เดิม ให้ใช้ชื่อนั้น
    if (fileName && fileName.trim() !== '') {
      // ลบอักขระที่ไม่ปลอดภัยออกจากชื่อไฟล์
      let safeName = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      
      // จำกัดความยาว
      if (safeName.length > 100) {
        const ext = safeName.split('.').pop();
        const name = safeName.substring(0, 100 - (ext ? ext.length + 1 : 0));
        safeName = ext ? `${name}.${ext}` : name;
      }
      
      return safeName;
    }
    
    // ถ้าไม่มีชื่อไฟล์ ให้สร้างชื่อจาก messageId และ fileType
    const typeMap: Record<string, string> = {
      'image': 'image',
      'video': 'video',
      'audio': 'audio',
      'file': 'document'
    };
    
    const typeName = typeMap[fileType || 'file'] || 'file';
    const id = messageId ? messageId.substring(0, 8) : 'unknown';
    
    return `${typeName}_${id}`;
  }

  /**
   * แปลง LINE Group ID → internal UUID ถ้าเป็นไปได้
   */
  private async resolveInternalGroupId(groupId: string): Promise<string | null> {
    // ถ้าเป็น UUID แล้ว ให้ส่งกลับทันที
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
    if (isUuid) return groupId;

    // ถ้าเป็น personal chat ให้ส่งกลับทันที
    if (groupId.startsWith('personal_')) return groupId;

    // ลองหา group จาก LINE Group ID
    const group = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
    return group ? group.id : null;
  }
}