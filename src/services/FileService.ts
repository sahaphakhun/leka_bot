// File Service - จัดการไฟล์และ File Vault

import { Repository, In, QueryRunner } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { File, Group, Task, User } from '@/models';
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
      let userByLineId = await this.userRepository.findOne({ where: { lineUserId: data.uploadedBy } });
      if (userByLineId) {
        internalUserId = userByLineId.id;
      } else {
        // ถ้าไม่พบ และค่าเป็น UUID อยู่แล้ว ให้ยอมรับ
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.uploadedBy);
        if (isUuid) {
          internalUserId = data.uploadedBy;
        } else {
          // สร้าง temporary user สำหรับการอัปโหลดจาก Dashboard/ไม่ทราบตัวตน
          const tempUser = this.userRepository.create({
            lineUserId: data.uploadedBy,
            displayName: `ผู้ส่งงาน (${(data.uploadedBy || 'unknown').substring(0, 8)}...)`,
            timezone: 'Asia/Bangkok'
          });
          userByLineId = await this.userRepository.save(tempUser);
          internalUserId = userByLineId.id;
        }
      }

      // อัปโหลดไป Cloudinary ถ้าตั้งค่าพร้อม ใช้ remote storage แทน local
      let fileRecord;
      const useCloudinary = !!(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);

      // เตรียมชื่อไฟล์ให้เป็น UTF-8 และเติมนามสกุลหากหายไป
      const normalizedOriginalName = this.normalizeIncomingFilename(data.originalName, data.mimeType);

      if (useCloudinary) {
        // อัปโหลดจาก buffer ผ่าน data URI (base64)
        const base64 = data.content.toString('base64');
        const ext = this.getFileExtension(data.mimeType, data.originalName);
        const folder = `${config.cloudinary.uploadFolder}/${data.groupId}`;
        // กำหนด public_id โดยไม่ใส่นามสกุล เพื่อให้ Cloudinary จัดการ format เอง
        const publicIdBase = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        // ระบุ resource_type ให้ถูกต้อง: image | video | raw
        let resourceType: 'image' | 'video' | 'raw' = 'raw';
        if (data.mimeType.startsWith('image/')) resourceType = 'image';
        else if (data.mimeType.startsWith('video/') || data.mimeType.startsWith('audio/')) resourceType = 'video';
        else resourceType = 'raw';

        const uploadRes = await cloudinary.uploader.upload(`data:${data.mimeType};base64,${base64}` as any, {
          folder,
          public_id: publicIdBase,
          resource_type: resourceType
        } as any);

        fileRecord = this.fileRepository.create({
          groupId: internalGroupId,
          originalName: normalizedOriginalName || `file_${data.messageId}${ext}`,
          fileName: `${publicIdBase}${ext}`,
          mimeType: data.mimeType,
          size: (uploadRes as any).bytes || data.content.length,
          path: (uploadRes as any).secure_url, // เก็บเป็น URL
          storageProvider: 'cloudinary',
          // เก็บ storageKey เป็น public_id เต็ม (รวม path โฟลเดอร์) เพื่อใช้อ้างอิงในอนาคต
          storageKey: (uploadRes as any).public_id,
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
          originalName: normalizedOriginalName || `file_${data.messageId}${extension}`,
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
      const entityManager = queryRunner ? queryRunner.manager : AppDataSource.manager;
      const fileRepository = entityManager.getRepository(File);
      const taskRepository = entityManager.getRepository(Task);

      const [file, task] = await Promise.all([
        fileRepository.findOne({ where: { id: fileId } }),
        taskRepository.findOne({ where: { id: taskId }, relations: ['attachedFiles'] })
      ]);

      if (!file) {
        throw new Error('File not found');
      }

      if (!task) {
        throw new Error('Task not found');
      }

      if (file.groupId !== task.groupId) {
        throw new Error('File and task belong to different groups');
      }

      const attachedFiles = task.attachedFiles || [];
      const alreadyLinked = attachedFiles.some(attachedFile => attachedFile.id === fileId);
      if (!alreadyLinked) {
        task.attachedFiles = [...attachedFiles, file];
        await taskRepository.save(task);
      }

    } catch (error) {
      console.error('❌ Error linking file to task:', error);
      throw error;
    }
  }

  /**
   * ยกเลิกการผูกไฟล์กับงาน
   */
  public async unlinkFileFromTask(fileId: string, taskId: string, queryRunner?: QueryRunner): Promise<void> {
    try {
      const entityManager = queryRunner ? queryRunner.manager : AppDataSource.manager;
      const taskRepository = entityManager.getRepository(Task);

      const task = await taskRepository.findOne({ where: { id: taskId }, relations: ['attachedFiles'] });
      if (!task) {
        throw new Error('Task not found');
      }

      const currentFiles = task.attachedFiles || [];
      const hasFile = currentFiles.some(f => f.id === fileId);
      if (!hasFile) {
        return;
      }

      task.attachedFiles = currentFiles.filter(f => f.id !== fileId);
      await taskRepository.save(task);

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

      // กำหนด mimeType ตามประเภทไฟล์
      let mimeType: string;
      switch (message.type) {
        case 'image':
          mimeType = 'image/jpeg';
          break;
        case 'video':
          mimeType = 'video/mp4';
          break;
        case 'audio':
          mimeType = 'audio/mp3';
          break;
        case 'file':
          // สำหรับไฟล์ทั่วไป ให้ใช้ application/octet-stream
          mimeType = 'application/octet-stream';
          break;
        default:
          mimeType = 'application/octet-stream';
      }

      // บันทึกไฟล์
      const fileData = {
        groupId: tempGroupId,
        uploadedBy: user.id,
        messageId: message.id,
        content: content,
        originalName: this.generateSafeFileName(message.fileName, message.id, message.type, mimeType),
        mimeType: mimeType,
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
    const requestTimeoutMs = 120000; // 120 วินาที (เพิ่มเวลาเพื่อรองรับไฟล์ใหญ่/เครือข่ายช้า)

    const fetchWithHttp = (targetUrl: string): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        let timedOut = false;
        const controller = setTimeout(() => {
          timedOut = true;
          const timeoutErr: any = new Error('Request timeout');
          timeoutErr.url = targetUrl;
          timeoutErr.statusCode = 504; // Gateway timeout semantics for downstream
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
                redirectErr.statusCode = 502;
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

          req.on('error', (err: any) => {
            if (timedOut) return;
            clearTimeout(controller);
            err.url = urlToGet;
            // Normalize to a 502 for network layer errors
            if (!err.statusCode) err.statusCode = 502;
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
        // ถ้าเป็น 401/403/404 จาก Cloudinary ให้ลองสร้าง private download URL แล้ว retry ทันที
        if ([401,403,404].includes((err as any)?.statusCode) && file.path && file.path.includes('res.cloudinary.com')) {
          try {
            const fallbackUrl = this.getCloudinaryPrivateDownloadUrl(file);
            if (fallbackUrl) {
              const buf = await fetchWithHttp(fallbackUrl);
              return { content: buf, mimeType: file.mimeType, originalName: file.originalName };
            }
          } catch (fbErr) {
            lastErr = fbErr;
          }
        }
        // ถ้าเป็น error ที่มี status code 4xx ไม่ต้อง retry (ยกเว้นที่ลอง fallback ไปแล้ว)
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
    finalErr.statusCode = 502;
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
   * สกัดข้อมูล Cloudinary จาก path/record เพื่อใช้สร้างลิงก์ดาวน์โหลดแบบ private
   */
  private buildCloudinaryInfo(file: File): {
    resourceType: 'image' | 'video' | 'raw';
    deliveryType: string; // upload | authenticated | private | fetch
    publicId: string; // ไม่รวมสกุลไฟล์
    format?: string;  // สกุลไฟล์ เช่น pdf, jpg
  } {
    let resourceType: 'image' | 'video' | 'raw';
    if (file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/')) {
      resourceType = 'video';
    } else if (file.mimeType.startsWith('application/') || file.mimeType.startsWith('text/')) {
      resourceType = 'raw';
    } else {
      resourceType = 'image';
    }

    let deliveryType = 'upload';
    let publicIdWithExt: string | undefined;

    if (file.path && file.path.includes('res.cloudinary.com')) {
      try {
        const urlObj = new URL(file.path);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const startIdx = (parts[0] === (config.cloudinary.cloudName || '')) ? 1 : 0;
        if (parts.length >= startIdx + 2) {
          const rt = parts[startIdx];
          const dt = parts[startIdx + 1];
          if (rt === 'image' || rt === 'video' || rt === 'raw') {
            resourceType = rt as any;
          }
          deliveryType = dt || deliveryType;
        }
        let versionIndex = -1;
        for (let i = startIdx + 2; i < parts.length; i++) {
          if (parts[i].startsWith('v')) { versionIndex = i; break; }
        }
        if (versionIndex !== -1) {
          publicIdWithExt = parts.slice(versionIndex + 1).join('/');
        } else {
          publicIdWithExt = parts.slice(startIdx + 2).join('/');
        }
      } catch {}
    }

    if (!publicIdWithExt || publicIdWithExt.trim() === '') {
      publicIdWithExt = file.storageKey || file.fileName;
    }

    let publicId = publicIdWithExt || '';
    let format: string | undefined;
    const lastDot = publicId.lastIndexOf('.');
    if (lastDot > -1 && lastDot < publicId.length - 1) {
      format = publicId.substring(lastDot + 1);
      publicId = publicId.substring(0, lastDot);
    }

    return { resourceType, deliveryType, publicId, format };
  }

  /**
   * สร้าง URL ดาวน์โหลดแบบ private ของ Cloudinary สำหรับกรณี 401
   */
  private getCloudinaryPrivateDownloadUrl(file: File): string | null {
    try {
      if (!config.cloudinary.cloudName || !config.cloudinary.apiSecret) return null;
      const info = this.buildCloudinaryInfo(file);
      const format = info.format || this.inferFormatFromMime(file.mimeType);
      if (!format) return null;

      const url = cloudinary.utils.private_download_url(
        info.publicId,
        format,
        {
          resource_type: info.resourceType as any,
          type: info.deliveryType,
          secure: true,
        } as any
      ) as unknown as string;

      logger.info('🔁 Cloudinary private download URL generated (fallback)', {
        publicId: info.publicId,
        format,
        resourceType: info.resourceType,
        deliveryType: info.deliveryType
      });
      return url;
    } catch (err) {
      logger.warn('⚠️ Failed to build Cloudinary private download URL', err);
      return null;
    }
  }

  private inferFormatFromMime(mime: string): string | undefined {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'application/pdf': 'pdf',
      'application/json': 'json',
      'text/plain': 'txt',
    };
    return map[mime];
  }

  /**
   * ปรับชื่อไฟล์ขาเข้าให้เป็น UTF-8 และเติมนามสกุลให้เหมาะสม
   */
  private normalizeIncomingFilename(name: string | undefined, mimeType: string): string {
    let filename = (name || '').trim();
    // decode percent-encoding ถ้ามี
    if (/%[0-9A-Fa-f]{2}/.test(filename)) {
      try { filename = decodeURIComponent(filename); } catch {}
    }
    // แก้ไขกรณี mojibake เบื้องต้น (ไทยถูกตีความเป็น Latin-1)
    if (filename && !/[\u0E00-\u0E7F]/.test(filename) && /[àÃ]/.test(filename)) {
      try {
        const bytes = Uint8Array.from(Array.from(filename).map(ch => ch.charCodeAt(0) & 0xFF));
        const decoded = new TextDecoder('utf-8').decode(bytes);
        if (decoded && /[\u0E00-\u0E7F]/.test(decoded)) filename = decoded;
      } catch {}
    }
    // เติมนามสกุลถ้าหาย
    if (!filename || !filename.includes('.')) {
      const ext = this.getFileExtension(mimeType, filename);
      if (!filename) {
        const base = `file_${Date.now()}`;
        filename = `${base}${ext || ''}`;
      } else if (ext) {
        filename = `${filename}${ext}`;
      }
    }
    return filename;
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
   * สร้าง URL ดาวน์โหลดโดยตรงสำหรับผู้ให้บริการภายนอก (เช่น Cloudinary)
   * - หากเป็น Cloudinary จะพยายามสร้างลิงก์แบบ private download (แนบ header attachment)
   * - หากมี path เป็น URL ปกติ จะคืน URL นั้น
   * - หากเป็นไฟล์โลคอล จะคืนค่าว่างเพื่อให้ controller ตัดสินใจสตรีมเอง
   */
  public getDirectDownloadUrl(file: File): string {
    try {
      if (!file) return '';
      const path = (file as any).path as string | undefined;

      // Cloudinary storage → ใช้ลิงก์แบบ signed/private หากทำได้
      if (file.storageProvider === 'cloudinary' || (path && (path.includes('res.cloudinary.com') || path.includes('cloudinary.com')))) {
        // พยายามใช้ลิงก์บน res.cloudinary.com ที่ลงลายเซ็นและแนบ fl_attachment เพื่อหลีกเลี่ยง CSP กับ api.cloudinary.com
        try {
          // ใช้ข้อมูลจาก path เพื่อสร้าง publicId และพารามิเตอร์ให้ครบ
          const info = this.buildCloudinaryInfo(file as any);
          const options: any = {
            resource_type: info.resourceType,
            type: info.deliveryType,
            sign_url: true,
            secure: true,
            flags: 'attachment', // เพิ่ม fl_attachment ให้ดาวน์โหลดเป็นไฟล์
          };
          // แนบชื่อไฟล์สำหรับ Content-Disposition (ให้มีนามสกุล)
          options.attachment = this.ensureFilenameWithExtension(file as any);
          if ((file as any).version) options.version = (file as any).version;
          const signedAttachmentUrl = cloudinary.url(info.publicId + (info.format ? '.' + info.format : ''), options);
          if (signedAttachmentUrl) return signedAttachmentUrl;
        } catch (err) {
          logger.warn('⚠️ Failed to build signed attachment URL for Cloudinary, falling back', err);
        }
        // ถ้าสร้างแบบแนบไม่ได้ ให้ใช้ URL ที่ลงลายเซ็นทั่วไป (res.cloudinary.com)
        return this.resolveFileUrl(file as any);
      }

      // อื่นๆ ที่เป็น URL ตรง
      if (path && /^https?:\/\//i.test(path)) {
        return path;
      }

      // โลคอล: ให้ controller จัดการสตรีม
      return '';
    } catch (err) {
      logger.warn('⚠️ Failed to build direct download URL', err);
      return '';
    }
  }

  /**
   * สร้างชื่อไฟล์สำหรับดาวน์โหลดให้มีนามสกุลเสมอ
   */
  private ensureFilenameWithExtension(file: File): string {
    const name = (file as any).originalName as string | undefined;
    let filename = name && name.trim() !== '' ? name : ((file as any).fileName || `file_${file.id}`);
    if (!filename.includes('.')) {
      const ext = this.inferFormatFromMime((file as any).mimeType);
      if (ext) filename = `${filename}.${ext}`;
    }
    return filename;
  }

  /**
   * คืนชื่อไฟล์สำหรับดาวน์โหลดที่ปลอดภัยและมีนามสกุลเสมอ (ไม่ใส่ path)
   */
  public getSafeDownloadFilename(file: File): string {
    try {
      // เริ่มจาก originalName → fileName → file.id
      let filename = ((file as any).originalName as string) || (file as any).fileName || `file_${file.id}`;
      // ถอด percent-encoding ถ้ามี (ชื่อจากบางแหล่งมาเป็น %XX)
      if (/%[0-9A-Fa-f]{2}/.test(filename)) {
        try { filename = decodeURIComponent(filename); } catch {}
      }
      // แก้ mojibake ไทยที่ถูกตีความเป็น Latin-1
      if (filename && !/[\u0E00-\u0E7F]/.test(filename) && /[àÃ]/.test(filename)) {
        try {
          // Ensure correct typing for characters to avoid TS18046 (unknown)
          const bytes = Uint8Array.from(Array.from<string>(filename).map((ch) => ch.charCodeAt(0) & 0xFF));
          const decoded = new TextDecoder('utf-8').decode(bytes);
          if (decoded && /[\u0E00-\u0E7F]/.test(decoded)) filename = decoded;
        } catch {}
      }
      // ลองเติมนามสกุล
      if (!filename.includes('.')) {
        let ext = this.inferFormatFromMime((file as any).mimeType);
        if (!ext && (file as any).path) {
          try {
            const urlPath = ((file as any).path as string).split('?')[0];
            const lastSeg = urlPath.substring(urlPath.lastIndexOf('/') + 1);
            const dot = lastSeg.lastIndexOf('.');
            if (dot > 0 && dot < lastSeg.length - 1) {
              ext = lastSeg.substring(dot + 1);
            }
          } catch {}
        }
        if (ext) filename = `${filename}.${ext}`;
      }
      return filename;
    } catch {
      return (file as any).originalName || (file as any).fileName || `file_${file.id}`;
    }
  }

  /**
   * ซ่อมแซมชื่อไฟล์เก่าในฐานข้อมูล: แก้ percent-encoding/mojibake และเติมนามสกุลที่หายไป
   * @param apply ถ้า true จะบันทึกการเปลี่ยนแปลงลงฐานข้อมูล (default: false → dry-run)
   */
  public async repairFilenamesInDb(apply: boolean = false): Promise<{
    scanned: number;
    updated: number;
    samples: Array<{ id: string; beforeOriginalName?: string; afterOriginalName?: string; beforeFileName?: string; afterFileName?: string }>;
  }> {
    const files = await this.fileRepository.find();
    let updated = 0;
    const samples: Array<{ id: string; beforeOriginalName?: string; afterOriginalName?: string; beforeFileName?: string; afterFileName?: string }> = [];

    for (const f of files) {
      let change = false;
      const before = { on: f.originalName, fn: f.fileName };

      // แก้ชื่อไฟล์หลัก
      const fixedOriginal = this.normalizeIncomingFilename(f.originalName, f.mimeType);
      if (fixedOriginal !== f.originalName) {
        (f as any).originalName = fixedOriginal;
        change = true;
      }

      // แก้ fileName ให้มีนามสกุลถ้าหาย
      if (f.fileName && !f.fileName.includes('.')) {
        const extWithDot = this.getFileExtension(f.mimeType, f.fileName);
        if (extWithDot) {
          (f as any).fileName = `${f.fileName}${extWithDot}`;
          change = true;
        }
      }

      if (change) {
        updated++;
        samples.push({
          id: f.id,
          beforeOriginalName: before.on,
          afterOriginalName: (f as any).originalName,
          beforeFileName: before.fn,
          afterFileName: (f as any).fileName,
        });
        if (apply) {
          await this.fileRepository.save(f);
        }
      }
    }

    return { scanned: files.length, updated, samples: samples.slice(0, 25) };
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
      // Images
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'image/svg+xml': '.svg',
      'image/x-icon': '.ico',
      
      // Videos
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-ms-wmv': '.wmv',
      'video/webm': '.webm',
      'video/x-flv': '.flv',
      'video/3gpp': '.3gp',
      
      // Audio
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/aac': '.aac',
      'audio/flac': '.flac',
      'audio/mp4': '.m4a',
      'audio/x-ms-wma': '.wma',
      
      // Documents
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.oasis.opendocument.text': '.odt',
      'application/vnd.oasis.opendocument.spreadsheet': '.ods',
      'application/vnd.oasis.opendocument.presentation': '.odp',
      
      // Text
      'text/plain': '.txt',
      'text/csv': '.csv',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
      'text/xml': '.xml',
      'text/rtf': '.rtf',
      
      // Development
      'application/json': '.json',
      'application/xml': '.xml',
      'application/javascript': '.js',
      'application/typescript': '.ts',
      'text/x-python': '.py',
      'text/x-java-source': '.java',
      'text/x-c': '.c',
      'text/x-c++': '.cpp',
      'application/x-sh': '.sh',
      
      // Archives
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
      'application/x-tar': '.tar',
      'application/gzip': '.gz',
      'application/x-bzip2': '.bz2',
      
      // Design
      'application/postscript': '.ai',
      'image/vnd.adobe.photoshop': '.psd',
      'application/vnd.adobe.illustrator': '.ai',
      'application/x-indesign': '.indd',
      'application/x-figma': '.fig',
      'application/x-sketch': '.sketch',
      
      // CAD
      'application/vnd.autodesk.dwg': '.dwg',
      'application/vnd.autodesk.dwf': '.dwf',
      'image/vnd.dwg': '.dwg',
      'application/x-autocad': '.dwg',
      
      // 3D
      'model/obj': '.obj',
      'model/fbx': '.fbx',
      'model/3mf': '.3mf',
      'application/x-blender': '.blend',
      
      // Fonts
      'font/ttf': '.ttf',
      'font/otf': '.otf',
      'font/woff': '.woff',
      'font/woff2': '.woff2',
      'application/font-woff': '.woff',
      'application/x-font-ttf': '.ttf',
      
      // E-books
      'application/epub+zip': '.epub',
      'application/x-mobipocket-ebook': '.mobi',
      
      // Database
      'application/x-sqlite3': '.sqlite',
      'application/vnd.ms-access': '.mdb',
      
      // Custom
      'application/dvg': '.dvg',
      'application/x-dvg': '.dvg',
      'application/octet-stream': '.bin'
    };

    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * สร้างชื่อไฟล์ที่ปลอดภัยจากข้อมูล LINE
   */
  private generateSafeFileName(fileName?: string, messageId?: string, fileType?: string, mimeType?: string): string {
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
    
    // ถ้าไม่มีชื่อไฟล์ ให้สร้างชื่อจาก messageId และ fileType พร้อมนามสกุล
    const typeMap: Record<string, { name: string; ext: string }> = {
      'image': { name: 'image', ext: '.jpg' },
      'video': { name: 'video', ext: '.mp4' },
      'audio': { name: 'audio', ext: '.mp3' },
      'file': { name: 'document', ext: '.pdf' } // เปลี่ยนจาก .bin เป็น .pdf สำหรับไฟล์ทั่วไป
    };
    
    const typeInfo = typeMap[fileType || 'file'] || { name: 'file', ext: '.pdf' };
    const id = messageId ? messageId.substring(0, 8) : 'unknown';
    
    // ถ้ามี mimeType ให้ใช้ getFileExtension เพื่อหานามสกุลที่ถูกต้อง
    let extension = typeInfo.ext;
    if (mimeType) {
      extension = this.getFileExtension(mimeType);
    }
    
    return `${typeInfo.name}_${id}${extension}`;
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
