// File Service - จัดการไฟล์และ File Vault

import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { File } from '@/models';
import { config } from '@/utils/config';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class FileService {
  private fileRepository: Repository<File>;

  constructor() {
    this.fileRepository = AppDataSource.getRepository(File);
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
  }): Promise<File> {
    try {
      // สร้างชื่อไฟล์ที่ไม่ซ้ำ
      const timestamp = Date.now();
      const random = crypto.randomBytes(8).toString('hex');
      const extension = this.getFileExtension(data.mimeType, data.originalName);
      const fileName = `${timestamp}_${random}${extension}`;

      // สร้างเส้นทางไฟล์
      const groupFolder = path.join(config.storage.uploadPath, data.groupId);
      const filePath = path.join(groupFolder, fileName);

      // สร้างโฟลเดอร์ถ้าไม่มี
      await fs.mkdir(groupFolder, { recursive: true });

      // บันทึกไฟล์
      await fs.writeFile(filePath, data.content);

      // สร้าง record ในฐานข้อมูล
      const fileRecord = this.fileRepository.create({
        groupId: data.groupId,
        originalName: data.originalName || `file_${data.messageId}${extension}`,
        fileName,
        mimeType: data.mimeType,
        size: data.content.length,
        path: filePath,
        uploadedBy: data.uploadedBy,
        isPublic: false,
        tags: []
      });

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
  public async linkFileToTask(fileId: string, taskId: string): Promise<void> {
    try {
      const file = await this.fileRepository.findOne({
        where: { id: fileId },
        relations: ['linkedTasks']
      });

      if (!file) {
        throw new Error('File not found');
      }

      // ตรวจสอบว่าผูกแล้วหรือยัง
      const alreadyLinked = file.linkedTasks.some(task => task.id === taskId);
      if (!alreadyLinked) {
        // ใช้ query builder เพื่อเพิ่มความสัมพันธ์
        await AppDataSource
          .createQueryBuilder()
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
  ): Promise<{ files: File[]; total: number }> {
    try {
      const queryBuilder = this.fileRepository.createQueryBuilder('file')
        .leftJoinAndSelect('file.uploadedByUser', 'uploader')
        .leftJoinAndSelect('file.linkedTasks', 'task')
        .where('file.groupId = :groupId', { groupId });

      if (options.tags && options.tags.length > 0) {
        queryBuilder.andWhere('file.tags && :tags', { tags: options.tags });
      }

      if (options.mimeType) {
        queryBuilder.andWhere('file.mimeType LIKE :mimeType', { 
          mimeType: `${options.mimeType}%` 
        });
      }

      if (options.uploadedBy) {
        queryBuilder.andWhere('file.uploadedBy = :uploadedBy', { 
          uploadedBy: options.uploadedBy 
        });
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

      const files = await queryBuilder.getMany();

      return { files, total };

    } catch (error) {
      console.error('❌ Error getting group files:', error);
      throw error;
    }
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
      console.error('❌ Error getting task files:', error);
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

      const content = await fs.readFile(file.path);

      return {
        content,
        mimeType: file.mimeType,
        originalName: file.originalName
      };

    } catch (error) {
      console.error('❌ Error getting file content:', error);
      throw error;
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

      // ลบไฟล์จากระบบ
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.warn('⚠️ Could not delete physical file:', error);
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
      const files = await this.fileRepository.find({
        where: { groupId }
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
   * สร้าง URL สำหรับดาวน์โหลดไฟล์
   */
  public generateDownloadUrl(fileId: string): string {
    return `${config.baseUrl}/api/files/${fileId}/download`;
  }

  /**
   * สร้าง URL สำหรับแสดงตัวอย่างไฟล์
   */
  public generatePreviewUrl(fileId: string): string {
    return `${config.baseUrl}/api/files/${fileId}/preview`;
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
}