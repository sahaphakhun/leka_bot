// Task Service - จัดการงานและปฏิทิน

import { Repository, In, MoreThanOrEqual, QueryRunner } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { Task, Group, User, File } from '@/models';
import { Task as TaskType, CalendarEvent } from '@/types';
import moment from 'moment-timezone';
import { config, features } from '@/utils/config';
import { GoogleService } from './GoogleService';
import { NotificationService } from './NotificationService';
import { FileService } from './FileService';
import { LineService } from './LineService';
import { UserService } from './UserService';
import { FileBackupService } from './FileBackupService';

export class TaskService {
  private taskRepository: Repository<Task>;
  private groupRepository: Repository<Group>;
  private userRepository: Repository<User>;
  private googleService: GoogleService;
  private notificationService: NotificationService;
  private fileService: FileService;
  private lineService: LineService;
  private fileRepository: Repository<File>;
  private userService: UserService;
  private fileBackupService: FileBackupService;

  constructor() {
    this.taskRepository = AppDataSource.getRepository(Task);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.userRepository = AppDataSource.getRepository(User);
    this.googleService = new GoogleService();
    this.notificationService = new NotificationService();
    this.fileService = new FileService();
    this.lineService = new LineService();
    this.fileRepository = AppDataSource.getRepository(File);
    this.userService = new UserService();
    this.fileBackupService = new FileBackupService();
  }

  /** ดึงงานตาม ID พร้อม relations หลัก */
  public async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['assignedUsers', 'createdByUser', 'group', 'attachedFiles']
      });
      return task || null;
    } catch (error) {
      console.error('❌ Error getting task by id:', error);
      throw error;
    }
  }

  /**
   * สร้างงานใหม่
   * @param data.groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
   * @param data.assigneeIds - LINE User IDs (เช่น ["Uc92411a226e4d4c9866adef05068bdf1"])
   * @param data.createdBy - LINE User ID (เช่น "Uc92411a226e4d4c9866adef05068bdf1")
   */
  public async createTask(data: {
    groupId: string;
    title: string;
    description?: string;
    assigneeIds: string[];
    createdBy: string;
    dueTime: Date;
    startTime?: Date;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    customReminders?: string[];
    requireAttachment?: boolean;
    reviewerUserId?: string; // ผู้สั่งงาน/ผู้ตรวจ
    _tempId?: string; // สำหรับป้องกันการสร้างงานซ้ำ
    fileIds?: string[]; // ไฟล์ที่แนบมาตอนสร้างงาน
  }): Promise<Task> {
    try {
      // ค้นหา Group entity จาก LINE Group ID หรือ internal UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.groupId);
      const group = isUuid
        ? await this.groupRepository.findOneBy({ id: data.groupId as any })
        : await this.groupRepository.findOneBy({ lineGroupId: data.groupId });
      if (!group) {
        throw new Error(`Group not found for LINE ID: ${data.groupId}`);
      }

      // ค้นหา Creator User entity จาก LINE User ID
      const creator = await this.userRepository.findOneBy({ lineUserId: data.createdBy });
      if (!creator) {
        throw new Error(`Creator user not found for LINE ID: ${data.createdBy}`);
      }

      // ตรวจสอบงานซ้ำในระยะเวลา 2 นาทีที่ผ่านมา (ลดเวลาลงเพื่อป้องกันการสร้างซ้ำ)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const existingTask = await this.taskRepository.findOne({
        where: {
          groupId: group.id,
          title: data.title.trim(), // ใช้ trim เพื่อป้องกันการสร้างซ้ำจากช่องว่าง
          createdBy: creator.id,
          createdAt: MoreThanOrEqual(twoMinutesAgo)
        }
      });

      if (existingTask) {
        console.log(`⚠️ Duplicate task detected: ${data.title} by ${data.createdBy} in group ${data.groupId}`);
        throw new Error('งานนี้ถูกสร้างไปแล้วในระยะเวลาอันสั้น กรุณารอสักครู่ก่อนสร้างงานใหม่');
      }

      // ตรวจสอบ _tempId ถ้ามี (ป้องกันการสร้างซ้ำจาก frontend)
      if (data._tempId) {
        const tempTask = await this.taskRepository.findOne({
          where: {
            groupId: group.id,
            title: data.title.trim(),
            createdBy: creator.id,
            createdAt: MoreThanOrEqual(twoMinutesAgo)
          }
        });
        
        if (tempTask) {
          console.log(`⚠️ Task with tempId ${data._tempId} already exists`);
          throw new Error('งานนี้ถูกสร้างไปแล้ว กรุณารอสักครู่ก่อนสร้างงานใหม่');
        }
      }

      // แปลง reviewerUserId จาก LINE → internal ID ถ้าจำเป็น
      let reviewerInternalId: string | undefined = data.reviewerUserId;
      if (reviewerInternalId && reviewerInternalId.startsWith('U')) {
        const reviewer = await this.userRepository.findOneBy({ lineUserId: reviewerInternalId });
        reviewerInternalId = reviewer ? reviewer.id : undefined;
      }

      // ถ้าไม่ระบุผู้ตรวจ ให้ผู้สร้างงานเป็นผู้อนุมัติ
      if (!reviewerInternalId) {
        reviewerInternalId = creator.id;
        console.log(`📝 No reviewer specified, creator ${creator.displayName} will be the reviewer`);
      }

      const task = this.taskRepository.create({
        groupId: group.id,
        title: data.title,
        description: data.description,
        dueTime: data.dueTime,
        startTime: data.startTime,
        createdBy: creator.id,
        priority: data.priority || 'medium',
        tags: data.tags || [],
        customReminders: data.customReminders,
        status: 'pending',
        requireAttachment: data.requireAttachment ?? false,
        workflow: {
          review: {
            reviewerUserId: reviewerInternalId,
            status: 'not_requested'
          },
          history: [
            { action: 'create', byUserId: creator.id, at: new Date() }
          ]
        }
      });

      // บันทึกงาน
      const savedTask = await this.taskRepository.save(task);

      // เพิ่มผู้รับผิดชอบ
      if (data.assigneeIds.length > 0) {
        // ตรวจสอบว่า assigneeIds เป็น database user IDs หรือ LINE user IDs
        let assignees: User[];
        
        // ถ้า ID ขึ้นต้นด้วย 'U' จะเป็น LINE user ID, ถ้าไม่ใช่จะเป็น database user ID
        const isLineUserIds = data.assigneeIds.some(id => id.startsWith('U'));
        
        if (isLineUserIds) {
          // ค้นหาจาก LINE user IDs
          assignees = await this.userRepository.find({
            where: {
              lineUserId: In(data.assigneeIds)
            }
          });
        } else {
          // ค้นหาจาก database user IDs
          assignees = await this.userRepository.find({
            where: {
              id: In(data.assigneeIds)
            }
          });
        }
        
        if (assignees.length !== data.assigneeIds.length) {
          const foundIds = isLineUserIds 
            ? assignees.map(u => u.lineUserId)
            : assignees.map(u => u.id);
          const missingIds = data.assigneeIds.filter(id => !foundIds.includes(id));
          console.warn(`⚠️ Some assignees not found: ${missingIds.join(', ')}`);
        }

        savedTask.assignedUsers = assignees;
        await this.taskRepository.save(savedTask);
      }

      // ผูกไฟล์เข้ากับงานถ้ามีการแนบไฟล์มาตอนสร้างงาน
      if (data.fileIds && data.fileIds.length > 0) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          for (const fileId of data.fileIds) {
            await this.fileService.linkFileToTask(fileId, savedTask.id, queryRunner);
            // อัปเดตข้อมูลไฟล์ให้เชื่อมโยงกับกลุ่มและเปลี่ยนสถานะ
            const file = await queryRunner.manager.findOne(File, { where: { id: fileId } });
            if (file) {
              file.groupId = group.id;
              file.folderStatus = 'in_progress'; // งานยังไม่เสร็จ
              file.attachmentType = 'initial'; // ไฟล์แนบตอนสร้างงาน
              await queryRunner.manager.save(file);
            }
          }
          await queryRunner.commitTransaction();
          console.log(`✅ Linked ${data.fileIds.length} initial files to task: ${savedTask.title}`);

          // คัดลอกไฟล์แนบตอนสร้างงานไปยัง Google Drive อัตโนมัติ
          try {
            console.log(`📁 Starting automatic backup for task creation: ${savedTask.id}`);
            
            await this.fileBackupService.backupTaskAttachments(savedTask.id, new Date());
            
            console.log(`✅ Automatic backup completed for task creation: ${savedTask.id}`);
          } catch (err) {
            console.error('❌ Failed to backup task creation files:', err);
            // ไม่ throw error เพื่อไม่ให้กระทบกับการสร้างงาน
          }
        } catch (error) {
          await queryRunner.rollbackTransaction();
          console.warn('⚠️ Failed to link files to task. Transaction rolled back:', error);
          // ไม่ throw error เพราะไม่ต้องการให้การสร้างงานล้มเหลว
        } finally {
          await queryRunner.release();
        }
      }

      // ซิงค์ไปยัง Google Calendar
      try {
        // ตรวจสอบว่า Google Calendar feature เปิดใช้งานหรือไม่
        if (!features.googleCalendar) {
          console.log('ℹ️ Google Calendar feature is disabled - skipping calendar sync');
        } else {
          console.log(`🔍 Checking Google Calendar for group: ${group.name}`);
          console.log(`📅 Group calendar ID: ${group.settings.googleCalendarId || 'Not configured'}`);
          
          if (group.settings.googleCalendarId) {
            console.log('✅ Group has Google Calendar configured, syncing task...');
            
            // รวบรวมผู้เข้าร่วมทั้งหมด (ผู้สร้าง ผู้รับผิดชอบ ผู้ตรวจ)
            const participantIds = new Set<string>();
            participantIds.add(creator.id);
            if (reviewerInternalId) participantIds.add(reviewerInternalId);
            if (savedTask.assignedUsers) {
              for (const user of savedTask.assignedUsers) {
                participantIds.add(user.id);
              }
            }

            // ดึงอีเมลและลบซ้ำ
            const attendeeUsers = await Promise.all(
              Array.from(participantIds).map(id => this.userService.findById(id))
            );
            const attendeeEmails = Array.from(
              new Set(
                attendeeUsers
                  .filter(u => u && u.email && u.isVerified)
                  .map(u => u!.email!)
              )
            );

            console.log(`📧 Syncing task with ${attendeeEmails.length} attendees:`, attendeeEmails);

            const eventId = await this.googleService.syncTaskToCalendar(
              savedTask,
              group.settings.googleCalendarId,
              attendeeEmails
            );
            
            // อัปเดต task ด้วย eventId
            savedTask.googleEventId = eventId;
            await this.taskRepository.save(savedTask);

            console.log(`✅ Task synced to Google Calendar with event ID: ${eventId}`);

            await this.googleService.shareCalendarWithMembers(
              group.id,
              Array.from(participantIds)
            );
            
            console.log('✅ Calendar shared with group members');
          } else {
            console.log('🔄 Group does not have Google Calendar, creating one automatically...');
            
            try {
              // สร้าง Google Calendar อัตโนมัติ
              const calendarId = await this.googleService.setupGroupCalendar(
                group.id,
                group.name,
                config.app.defaultTimezone
              );
              
              console.log(`✅ Created Google Calendar for group: ${group.name} (${calendarId})`);
              
              // อัปเดตการตั้งค่ากลุ่ม
              group.settings = {
                ...group.settings,
                googleCalendarId: calendarId
              };
              await this.groupRepository.save(group);
              
              console.log('✅ Updated group settings with calendar ID');
              
              // ซิงค์งานไปยัง Calendar ที่เพิ่งสร้าง
              const participantIds = new Set<string>();
              participantIds.add(creator.id);
              if (reviewerInternalId) participantIds.add(reviewerInternalId);
              if (savedTask.assignedUsers) {
                for (const user of savedTask.assignedUsers) {
                  participantIds.add(user.id);
                }
              }

              const attendeeUsers = await Promise.all(
                Array.from(participantIds).map(id => this.userService.findById(id))
              );
              const attendeeEmails = Array.from(
                new Set(
                  attendeeUsers
                    .filter(u => u && u.email && u.isVerified)
                    .map(u => u!.email!)
                )
              );

              console.log(`📧 Syncing task with ${attendeeEmails.length} attendees:`, attendeeEmails);

              const eventId = await this.googleService.syncTaskToCalendar(
                savedTask,
                calendarId,
                attendeeEmails
              );
              
              // อัปเดต task ด้วย eventId
              savedTask.googleEventId = eventId;
              await this.taskRepository.save(savedTask);

              console.log(`✅ Task synced to new Google Calendar with event ID: ${eventId}`);

              await this.googleService.shareCalendarWithMembers(
                group.id,
                Array.from(participantIds)
              );
              
              console.log('✅ New calendar shared with group members');
              
            } catch (calendarError) {
              console.warn('⚠️ Failed to create Google Calendar automatically:', calendarError);
              console.log('ℹ️ Task created successfully, but Google Calendar integration failed');
              console.log('💡 You can manually set up Google Calendar later');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to sync task to Google Calendar:', error);
      }

      // โหลด task พร้อม relations เพื่อ return ข้อมูลครบถ้วน
      const taskWithRelations = await this.taskRepository.findOne({
        where: { id: savedTask.id },
        relations: ['assignedUsers', 'createdByUser', 'group', 'attachedFiles']
      });

      // ส่งการแจ้งเตือนงานใหม่
      try {
        if (taskWithRelations) {
          await this.notificationService.sendTaskCreatedNotification(taskWithRelations);
        }
      } catch (error) {
        console.warn('⚠️ Failed to send task created notification:', error);
      }

      return taskWithRelations || savedTask;

    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  /**
   * อัปเดตผู้บังคับบัญชาในกลุ่ม
   */
  public async updateGroupSupervisors(lineGroupId: string, supervisorLineUserIds: string[]): Promise<boolean> {
    try {
      // ค้นหากลุ่มจาก LINE Group ID
      const group = await this.groupRepository.findOneBy({ lineGroupId });
      if (!group) {
        console.error('❌ Group not found for LINE ID:', lineGroupId);
        return false;
      }

      // อัปเดตการตั้งค่ากลุ่ม
      const updatedSettings = {
        ...group.settings,
        supervisors: supervisorLineUserIds
      };

      group.settings = updatedSettings;
      await this.groupRepository.save(group);

      console.log(`✅ Updated supervisors for group ${lineGroupId}:`, supervisorLineUserIds);
      return true;

    } catch (error) {
      console.error('❌ Error updating group supervisors:', error);
      return false;
    }
  }

  /**
   * อัปเดตงาน
   */
  public async updateTask(taskId: string, updates: Partial<TaskType>): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['assignedUsers', 'group', 'createdByUser']
      });
      if (!task) {
        throw new Error('Task not found');
      }

      Object.assign(task, updates);
      
      // จัดการผู้รับผิดชอบถ้ามีการอัปเดต
      const assigneeUpdates = updates as any;
      if (assigneeUpdates.assigneeIds && Array.isArray(assigneeUpdates.assigneeIds)) {
        // ตรวจสอบว่า assigneeIds เป็น database user IDs หรือ LINE user IDs
        let assignees: User[];
        
        const isLineUserIds = assigneeUpdates.assigneeIds.some((id: string) => id.startsWith('U'));
        
        if (isLineUserIds) {
          // ค้นหาจาก LINE user IDs
          assignees = await this.userRepository.find({
            where: {
              lineUserId: In(assigneeUpdates.assigneeIds)
            }
          });
        } else {
          // ค้นหาจาก database user IDs
          assignees = await this.userRepository.find({
            where: {
              id: In(assigneeUpdates.assigneeIds)
            }
          });
        }
        
        if (assignees.length !== assigneeUpdates.assigneeIds.length) {
          const foundIds = isLineUserIds 
            ? assignees.map(u => u.lineUserId)
            : assignees.map(u => u.id);
          const missingIds = assigneeUpdates.assigneeIds.filter((id: string) => !foundIds.includes(id));
          console.warn(`⚠️ Some assignees not found during update: ${missingIds.join(', ')}`);
        }

        task.assignedUsers = assignees;
      }
      // รองรับตีกลับจากผู้ตรวจผ่าน API โดยใช้ฟิลด์ชั่วคราวใน updates
      const anyUpdates: any = updates as any;
      if (anyUpdates && anyUpdates.reviewAction === 'revise') {
        const reviewerId = anyUpdates.reviewerUserId as string | undefined;
        const reviewerComment = anyUpdates.reviewerComment as string | undefined;
        const newDueTime = updates.dueTime as Date | undefined;
        task.workflow = {
          ...(task.workflow || {}),
          review: {
            ...(task.workflow?.review || {}),
            status: 'rejected',
            reviewerComment,
            reviewedAt: new Date()
          },
          history: [
            ...(task.workflow?.history || []),
            { action: 'reject', byUserId: reviewerId || task.createdBy, at: new Date(), note: reviewerComment },
            { action: 'revise_due', byUserId: reviewerId || task.createdBy, at: new Date(), note: newDueTime ? newDueTime.toISOString() : undefined }
          ]
        } as any;
        task.status = 'pending';
      }
      const updatedTask = await this.taskRepository.save(task);

      // อัปเดตใน Google Calendar
      try {
        await this.googleService.updateTaskInCalendar(task, updates);
      } catch (error) {
        console.warn('⚠️ Failed to update task in Google Calendar:', error);
      }

      // แจ้งเตือนเมื่อผู้ตรวจตีกลับงานและมีการกำหนดวันใหม่
      try {
        const anyUpdates: any = updates as any;
        if (anyUpdates && anyUpdates.reviewAction === 'revise') {
          const reviewerId = anyUpdates.reviewerUserId as string | undefined;
          let reviewerDisplayName: string | undefined;
          if (reviewerId) {
            const reviewer = reviewerId.startsWith('U')
              ? await this.userRepository.findOneBy({ lineUserId: reviewerId })
              : await this.userRepository.findOneBy({ id: reviewerId });
            reviewerDisplayName = reviewer?.displayName;
          }
          if (updates.dueTime) {
            await this.notificationService.sendTaskRejectedNotification(updatedTask as any, reviewerDisplayName || 'ไม่ระบุ', updates.dueTime.toISOString());
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to send task rejected notification:', err);
      }

      // แจ้งในกลุ่มเมื่อมีการแก้งาน/อัปเดตข้อมูล (ยกเว้นกรณีตีกลับ ซึ่งมีแจ้งเฉพาะแล้ว)
      try {
        const anyUpdates2: any = updates as any;
        if (!anyUpdates2 || anyUpdates2.reviewAction !== 'revise') {
          await this.notificationService.sendTaskUpdatedNotification(updatedTask as any, updates as any);
        }
      } catch (err) {
        console.warn('⚠️ Failed to send task updated notification:', err);
      }

      return updatedTask;

    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  /** ลบงาน พร้อมลบ Event ใน Google Calendar ถ้ามี */
  public async deleteTask(taskId: string): Promise<void> {
    try {
      const task = await this.taskRepository.findOne({ where: { id: taskId }, relations: ['assignedUsers', 'group'] });
      if (!task) return;

      // ลบจาก Google Calendar ถ้ามี event
      try {
        await this.googleService.removeTaskFromCalendar(task as any);
      } catch (error) {
        console.warn('⚠️ Failed to remove task from Google Calendar:', error);
      }

      await this.taskRepository.delete({ id: taskId });

      // แจ้งในกลุ่มว่าลบงานแล้ว
      try {
        await this.notificationService.sendTaskDeletedNotification(task as any);
      } catch (err) {
        console.warn('⚠️ Failed to send task deleted notification:', err);
      }
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  /**
   * อัปเดตสถานะงาน
   */
  public async updateTaskStatus(taskId: string, status: TaskType['status']): Promise<Task> {
    try {
      const task = await this.taskRepository.findOneBy({ id: taskId });
      if (!task) {
        throw new Error('Task not found');
      }

      task.status = status;
      
      if (status === 'completed') {
        task.completedAt = new Date();
        // ย้ายไฟล์ที่แนบกับงานไปอยู่โฟลเดอร์ completed
        try {
          const files = await AppDataSource
            .getRepository('files')
            .createQueryBuilder('file' as any)
            .leftJoin('file.linkedTasks', 'task')
            .where('task.id = :taskId', { taskId })
            .getMany() as any[];
          for (const f of files) {
            await AppDataSource
              .createQueryBuilder()
              .update('files' as any)
              .set({ folderStatus: 'completed' })
              .where('id = :id', { id: f.id })
              .execute();
          }
        } catch (err) {
          console.warn('⚠️ Failed to move files to completed folder:', err);
        }
      }

      return await this.taskRepository.save(task);

    } catch (error) {
      console.error('❌ Error updating task status:', error);
      throw error;
    }
  }

  /**
   * ปิดงาน
   */
  public async completeTask(taskId: string, completedBy: string): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['assignedUsers', 'attachedFiles', 'group']
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // แปลง LINE User ID → internal user id หากส่งมาเป็น LINE ID
      let completedByInternalId = completedBy;
      if (completedByInternalId && completedByInternalId.startsWith('U')) {
        const user = await this.userRepository.findOneBy({ lineUserId: completedByInternalId });
        if (!user) {
          throw new Error('CompletedBy user not found');
        }
        completedByInternalId = user.id;
      }

      // ตรวจสอบสิทธิ์ตามกฎใหม่
      if (task.status === 'pending' || task.status === 'in_progress') {
        // กรณีงานยังไม่เสร็จ - ต้องเป็นผู้ตรวจหรือผู้สร้างเพื่ออนุมัติ
        if (!this.checkApprovalPermission(task, completedByInternalId)) {
          throw new Error('Only task reviewers or creators can approve tasks');
        }
      } else {
        // กรณีงานเสร็จแล้ว - ต้องเป็นผู้ตรวจเพื่อปิดงาน
        if (!this.checkCompletionPermission(task, completedByInternalId)) {
          throw new Error('Only task reviewers can complete tasks');
        }
      }

      // ตรวจสอบ requireAttachment ในขั้นตอนการส่งงานแล้ว ไม่ต้องตรวจสอบที่นี่
      // if (task.requireAttachment) {
      //   const hasFile = (task.attachedFiles && task.attachedFiles.length > 0);
      //   if (!hasFile) {
      //     throw new Error('Attachment required to complete this task');
      //   }
      // }

      task.status = 'completed';
      task.completedAt = new Date();
      // อัปเดตเวิร์กโฟลว์
      task.workflow = {
        ...(task.workflow || {}),
        review: {
          ...(task.workflow as any)?.review,
          status: 'approved',
          reviewedAt: new Date()
        },
        history: [
          ...((task.workflow as any)?.history || []),
          { action: 'approve', byUserId: completedByInternalId, at: new Date() }
        ]
      } as any;

      const completedTask = await this.taskRepository.save(task);

      // อัปเดตใน Google Calendar
      try {
        await this.googleService.updateTaskInCalendar(task, { 
          status: 'completed',
          completedAt: task.completedAt 
        });
      } catch (error) {
        console.warn('⚠️ Failed to update completed task in Google Calendar:', error);
      }

      // แจ้งเตือนในกลุ่มว่าอนุมัติ/ปิดงานแล้ว และแจ้งผู้ทำรายการ
      try {
        const completedByUser = await this.userRepository.findOneBy({ id: completedByInternalId });
        if (completedByUser) {
          await this.notificationService.sendTaskCompletedNotification({ ...completedTask, group: task.group } as any, completedByUser as any);
        }
      } catch (err) {
        console.warn('⚠️ Failed to send task completed notification:', err);
      }

      return completedTask;

    } catch (error) {
      console.error('❌ Error completing task:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบสิทธิ์การอนุมัติงาน
   */
  private checkApprovalPermission(task: Task, userId: string): boolean {
    const isCreator = task.createdBy === userId;
    const isReviewer = (task.workflow as any)?.review?.reviewerUserId === userId;
    return isCreator || isReviewer;
  }

  /**
   * ตรวจสอบสิทธิ์การปิดงาน
   */
  private checkCompletionPermission(task: Task, userId: string): boolean {
    const reviewerUserId = (task.workflow as any)?.review?.reviewerUserId;
    return reviewerUserId === userId;
  }

  /**
   * ตรวจสอบสิทธิ์ทั่วไปในการทำงานกับงาน
   */
  private checkTaskPermission(task: Task, userId: string): boolean {
    const isAssignee = task.assignedUsers.some(user => user.id === userId);
    const isCreator = task.createdBy === userId;
    const isReviewer = (task.workflow as any)?.review?.reviewerUserId === userId;
    return isAssignee || isCreator || isReviewer;
  }

  /**
   * ดึงข้อมูลผู้ตรวจงาน ถ้าไม่มีให้ผู้สร้างเป็นผู้อนุมัติ
   */
  private getTaskReviewer(task: Task): string {
    const reviewerUserId = (task.workflow as any)?.review?.reviewerUserId;
    return reviewerUserId || task.createdBy;
  }

  /** บันทึกการส่งงาน (แนบไฟล์) */
  public async recordSubmission(
    taskId: string,
    submitterLineUserId: string,
    fileIds: string[],
    comment?: string,
    links?: string[]
  ): Promise<Task> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: Task;
    let task: Task;
    let submitter: User;

    try {
      const foundTask = await queryRunner.manager.findOne(Task, {
        where: { id: taskId },
        relations: ['assignedUsers', 'group', 'attachedFiles']
      });
      if (!foundTask) throw new Error('Task not found');
      task = foundTask;

      // แปลง LINE → internal user id หรือสร้าง temporary user
      let foundSubmitter = await queryRunner.manager.findOne(User, {
        where: { lineUserId: submitterLineUserId }
      });
      
      if (!foundSubmitter) {
        // สร้าง temporary user สำหรับการส่งงาน
        console.log(`สร้าง temporary user สำหรับการส่งงาน: ${submitterLineUserId}`);
        foundSubmitter = queryRunner.manager.create(User, {
          lineUserId: submitterLineUserId,
          displayName: `ผู้ส่งงาน (${submitterLineUserId.substring(0, 8)}...)`,
          groupId: task.groupId,
          role: 'member',
          isActive: true
        });
        foundSubmitter = await queryRunner.manager.save(foundSubmitter);
      }
      
      submitter = foundSubmitter;

      // ผูกไฟล์เข้ากับงานและอัปเดตข้อมูลไฟล์
      for (const fid of fileIds) {
        await this.fileService.linkFileToTask(fid, task.id, queryRunner);
        const file = await queryRunner.manager.findOne(File, { where: { id: fid } });
        if (file) {
          file.groupId = task.groupId;
          file.folderStatus = 'completed';
          file.attachmentType = 'submission'; // ไฟล์แนบตอนส่งงาน
          await queryRunner.manager.save(file);
        }
      }

      // ตรวจสอบ requireAttachment
      if (task.requireAttachment && fileIds.length === 0) {
        throw new Error('งานนี้ต้องแนบไฟล์เพื่อส่งงาน กรุณาแนบไฟล์ก่อนส่งงาน');
      }

      // อัปเดตเวิร์กโฟลว์
      const now = new Date();
      const lateSubmission = task.dueTime < now;
      const existingSubmissions = (task.workflow as any)?.submissions || [];
      const submissions = existingSubmissions.concat({
        submittedByUserId: submitter.id,
        submittedAt: now,
        fileIds,
        comment,
        links: links || [],
        lateSubmission
      });

      const reviewDue = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      // ใช้ helper method เพื่อดึงข้อมูลผู้ตรวจ
      const reviewerUserId = this.getTaskReviewer(task);

      task.workflow = {
        ...(task.workflow || {}),
        submissions,
        review: {
          reviewerUserId: reviewerUserId,
          status: 'pending',
          reviewRequestedAt: now,
          reviewDueAt: reviewDue,
          lateReview: false
        },
        history: [
          ...(task.workflow?.history || []),
          { action: 'submit', byUserId: submitter.id, at: now, note: `files=${fileIds.join(',')}` }
        ]
      } as any;

      // สถานะงานเข้าสู่ in_progress
      if (task.status === 'pending') {
        task.status = 'in_progress';
      }

      saved = await queryRunner.manager.save(task);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error recording submission:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // เตรียมลิงก์ไฟล์สำหรับผู้ตรวจ
    const fileLinks = fileIds.map(fid => this.fileService.generateDownloadUrl(task.group.id, fid));

    // แจ้งผู้ตรวจให้ตรวจภายใน 2 วัน
    try {
      const reviewerInternalId = this.getTaskReviewer(saved);
      console.log(`🔍 Looking for reviewer with ID: ${reviewerInternalId}`);

      const reviewer = await this.userRepository.findOneBy({ id: reviewerInternalId });
      if (reviewer) {
        console.log(`✅ Found reviewer: ${reviewer.displayName} (${reviewer.lineUserId})`);

        await this.notificationService.sendReviewRequest(saved as any, reviewer.lineUserId, {
          submitterDisplayName: submitter.displayName,
          fileCount: fileIds.length,
          links: (links && links.length > 0) ? links : fileLinks
        } as any);

        console.log(`📤 Review request sent to reviewer: ${reviewer.displayName}`);
      } else {
        console.warn(`⚠️ Reviewer not found for ID: ${reviewerInternalId}`);
      }
    } catch (err) {
      console.error('❌ Failed to send review request notification:', err);
      // ไม่ throw error เพราะไม่ต้องการให้การส่งงานล้มเหลว
    }

    // แจ้งในกลุ่มว่ามีการส่งงาน
    try {
      if (task.group) {
        console.log(`📢 Sending task submitted notification to group: ${task.group.name || task.group.id}`);

        await this.notificationService.sendTaskSubmittedNotification(
          { ...saved, group: task.group } as any,
          submitter.displayName,
          fileIds.length,
          links && links.length > 0 ? links : fileLinks
        );

        console.log(`✅ Task submitted notification sent to group`);
      } else {
        console.warn(`⚠️ Task has no group, skipping group notification`);
      }
    } catch (err) {
      console.error('❌ Failed to send task submitted notification:', err);
      // ไม่ throw error เพราะไม่ต้องการให้การส่งงานล้มเหลว
    }

    // คัดลอกไฟล์แนบไปยัง Google Drive อัตโนมัติ
    try {
      if (fileIds.length > 0) {
        console.log(`📁 Starting automatic backup for task submission: ${task.id}`);
        
        await this.fileBackupService.backupOnTaskSubmission(
          task.id,
          submitter.lineUserId || submitter.id,
          fileIds
        );
        
        console.log(`✅ Automatic backup completed for task submission: ${task.id}`);
      }
    } catch (err) {
      console.error('❌ Failed to backup task submission files:', err);
      // ไม่ throw error เพื่อไม่ให้กระทบกับการส่งงาน
    }

    return saved;
  }

  /** ดึงงานที่รอการตรวจและพ้นกำหนด 2 วันแล้ว */
  public async getTasksLateForReview(): Promise<Task[]> {
    try {
      const candidates = await this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.group', 'group')
        .where('task.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
        .orderBy('task.updatedAt', 'DESC')
        .getMany();

      const now = new Date();
      return candidates.filter(t => {
        const rv: any = (t as any).workflow?.review;
        if (!rv) return false;
        return rv.status === 'pending' && rv.reviewDueAt && new Date(rv.reviewDueAt) < now && !rv.lateReview;
      });
    } catch (error) {
      console.error('❌ Error getting tasks late for review:', error);
      return [];
    }
  }

  /** ทำเครื่องหมายตรวจล่าช้า */
  public async markLateReview(taskId: string): Promise<void> {
    try {
      const task = await this.taskRepository.findOneBy({ id: taskId });
      if (!task) return;
      const wf: any = task.workflow || {};
      if (wf.review) {
        wf.review.lateReview = true;
        wf.history = [...(wf.history || []), { action: 'reject', byUserId: this.getTaskReviewer(task), at: new Date(), note: 'late_review' }];
        task.workflow = wf;
        await this.taskRepository.save(task);
      }
    } catch (error) {
      console.error('❌ Error marking late review:', error);
    }
  }
  /**
   * ดึงงานในกลุ่ม
   * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
   * @param options.assigneeId - LINE User ID (เช่น "Uc92411a226e4d4c9866adef05068bdf1")
   */
  public async getGroupTasks(
    groupId: string, 
    options: {
      status?: TaskType['status'];
      assigneeId?: string;
      requireAttachmentOnly?: boolean;
      tags?: string[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ tasks: Task[]; total: number }> {
    try {
      // ค้นหา Group entity จาก LINE Group ID หรือ UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
      const group = isUuid
        ? await this.groupRepository.findOneBy({ id: groupId as any })
        : await this.groupRepository.findOneBy({ lineGroupId: groupId });
      if (!group) {
        throw new Error(`Group not found for LINE ID: ${groupId}`);
      }

      const queryBuilder = this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.createdByUser', 'creator')
        .leftJoinAndSelect('task.attachedFiles', 'file')
        .where('task.groupId = :groupId', { groupId: group.id });

      if (options.status) {
        queryBuilder.andWhere('task.status = :status', { status: options.status });
      }

      if (options.assigneeId) {
        // แปลง LINE User ID เป็น internal UUID
        const assignee = await this.userRepository.findOneBy({ lineUserId: options.assigneeId });
        if (assignee) {
          queryBuilder.andWhere('assignee.id = :assigneeId', { assigneeId: assignee.id });
        } else {
          // ถ้าไม่เจอ user จะไม่มี tasks ใดๆ
          queryBuilder.andWhere('1 = 0'); // Force empty result
        }
      }

      if (options.requireAttachmentOnly) {
        queryBuilder.andWhere('task.requireAttachment = TRUE');
      }

      if (options.tags && options.tags.length > 0) {
        queryBuilder.andWhere('task.tags && :tags', { tags: options.tags });
      }

      if (options.startDate) {
        queryBuilder.andWhere('task.dueTime >= :startDate', { startDate: options.startDate });
      }

      if (options.endDate) {
        queryBuilder.andWhere('task.dueTime <= :endDate', { endDate: options.endDate });
      }

      queryBuilder.orderBy('task.dueTime', 'ASC');

      const total = await queryBuilder.getCount();

      if (options.limit) {
        queryBuilder.limit(options.limit);
      }

      if (options.offset) {
        queryBuilder.offset(options.offset);
      }

      const tasks = await queryBuilder.getMany();

      return { tasks, total };

    } catch (error) {
      console.error('❌ Error getting group tasks:', error);
      throw error;
    }
  }

  /**
   * ดึงงานที่ต้องส่งการเตือน
   */
  public async getTasksForReminder(): Promise<Task[]> {
    try {
      const now = new Date();
      const next24Hours = moment().add(24, 'hours').toDate();

      return await this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.group', 'group')
        .where('task.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
        .andWhere('task.dueTime BETWEEN :now AND :next24Hours', { now, next24Hours })
        .getMany();

    } catch (error) {
      console.error('❌ Error getting tasks for reminder:', error);
      throw error;
    }
  }

  /**
   * ดึงงานของผู้ใช้ตามสถานะที่ระบุ
   */
  public async getUserTasks(userId: string, statuses: string[] = ['pending', 'in_progress']): Promise<Task[]> {
    try {
      return await this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.group', 'group')
        .where('assignee.id = :userId', { userId })
        .andWhere('task.status IN (:...statuses)', { statuses })
        .orderBy('task.dueTime', 'ASC')
        .getMany();
    } catch (error) {
      console.error('❌ Error getting user tasks:', error);
      throw error;
    }
  }

  /**
   * ดึงงานทั้งหมดที่ยังไม่เสร็จ เพื่อใช้เตือนซ้ำทุกเช้า (08:00)
   * รวมสถานะ: pending, in_progress, overdue
   * 
   * ⚠️ ฟังก์ชันนี้ไม่ได้ใช้งานแล้ว เนื่องจากเอาการเตือนตอนเช้า 08:00 น. ออกไปแล้ว
   * @deprecated ใช้สำหรับการเตือนตอนเช้า 08:00 น. ที่ถูกลบออกไปแล้ว
   */
  public async getTasksForDailyMorningReminder(): Promise<Task[]> {
    try {
      return await this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.group', 'group')
        .where('task.status IN (:...statuses)', { statuses: ['pending', 'in_progress', 'overdue'] })
        .getMany();
    } catch (error) {
      console.error('❌ Error getting tasks for daily morning reminder:', error);
      throw error;
    }
  }

  /**
   * ดึงงานเกินกำหนดทั้งหมดในกลุ่ม
   */
  public async getOverdueTasksByGroup(groupId: string): Promise<Task[]> {
    try {
      return await this.taskRepository.find({
        where: { 
          groupId,
          status: 'overdue'
        },
        relations: ['assignedUsers', 'group']
      });
    } catch (error) {
      console.error('❌ Error getting overdue tasks by group:', error);
      throw error;
    }
  }

  /**
   * ดึงกลุ่มทั้งหมด
   */
  public async getAllGroups(): Promise<Group[]> {
    try {
      return await this.groupRepository.find();
    } catch (error) {
      console.error('❌ Error getting all groups:', error);
      throw error;
    }
  }

  /**
   * ดึงงานที่กำลังดำเนินการ
   */
  public async getActiveTasks(groupId: string): Promise<Task[]> {
    try {
      console.log(`🔍 Looking for group with ID: ${groupId}`);
      
      // ค้นหา Group entity จาก LINE Group ID หรือ UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
      const group = isUuid
        ? await this.groupRepository.findOneBy({ id: groupId as any })
        : await this.groupRepository.findOneBy({ lineGroupId: groupId });
      if (!group) {
        console.error(`❌ Group not found for ID: ${groupId}`);
        throw new Error(`Group not found for LINE ID: ${groupId}`);
      }

      console.log(`✅ Found group: ${group.id} (${group.name})`);

      return await this.taskRepository.find({
        where: {
          groupId: group.id,
          status: 'in_progress'
        },
        relations: ['assignedUsers', 'attachedFiles'],
        order: {
          dueTime: 'ASC'
        }
      });

    } catch (error) {
      console.error('❌ Error getting active tasks:', error);
      throw error;
    }
  }

  /** ดึงงานที่ผู้ใช้เป็นผู้รับผิดชอบและยังไม่เสร็จ */
  public async getUserIncompleteTasks(lineUserId: string): Promise<Task[]> {
    try {
      // หา user จาก LINE User ID
      const user = await this.userRepository.findOneBy({ lineUserId });
      if (!user) {
        return [];
      }

      // ใช้เฉพาะ enum values ที่มีอยู่จริงในฐานข้อมูล
      // ตรวจสอบจาก enum ที่มีอยู่และใช้เฉพาะที่ปลอดภัย
      return await this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.group', 'group')
        .where('assignee.id = :userId', { userId: user.id })
        .andWhere('task.status IN (:...statuses)', { statuses: ['pending', 'in_progress', 'overdue'] })
        .orderBy('task.dueTime', 'ASC')
        .getMany();
    } catch (error) {
      console.error('❌ Error getting user incomplete tasks:', error);
      throw error;
    }
  }

  /** ดึงงานที่ยังไม่เสร็จของกลุ่ม (pending, in_progress, overdue) โดยระบุ LINE Group ID */
  public async getIncompleteTasksOfGroup(lineGroupId: string): Promise<Task[]> {
    try {
      // หา internal group UUID จาก LINE Group ID หรือใช้ UUID ตรง ๆ
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lineGroupId);
      const group = isUuid ? await this.groupRepository.findOneBy({ id: lineGroupId as any }) : await this.groupRepository.findOneBy({ lineGroupId });
      if (!group) {
        throw new Error(`Group not found for LINE ID: ${lineGroupId}`);
      }
      return await this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.group', 'group')
        .where('task.groupId = :gid', { gid: group.id })
        .andWhere('task.status IN (:...statuses)', { statuses: ['pending', 'in_progress', 'overdue'] })
        .orderBy('task.dueTime', 'ASC')
        .getMany();
    } catch (error) {
      console.error('❌ Error getting incomplete tasks of group:', error);
      throw error;
    }
  }

  /**
   * ดึงกลุ่มที่ยังใช้งานอยู่
   */
  public async getAllActiveGroups(): Promise<Group[]> {
    try {
      return await this.groupRepository.find({
        relations: ['members']
      });

    } catch (error) {
      console.error('❌ Error getting active groups:', error);
      throw error;
    }
  }

  /**
   * บันทึกการส่งการเตือน
   */
  public async recordReminderSent(taskId: string, reminderType: string): Promise<void> {
    try {
      const task = await this.taskRepository.findOneBy({ id: taskId });
      if (!task) {
        throw new Error('Task not found');
      }

      task.remindersSent.push({
        type: reminderType,
        sentAt: new Date(),
        channels: ['line', 'email']
      });

      await this.taskRepository.save(task);

    } catch (error) {
      console.error('❌ Error recording reminder sent:', error);
      throw error;
    }
  }

  /**
   * แปลงงานเป็น Calendar Event
   */
  public async getCalendarEvents(
    groupId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      const { tasks } = await this.getGroupTasks(groupId, { startDate, endDate });

      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        start: task.startTime || task.dueTime,
        end: task.dueTime,
        allDay: false,
        assignees: task.assignedUsers?.map(user => ({
          id: user.id,
          name: user.displayName
        })) || [],
        status: task.status,
        priority: task.priority,
        tags: task.tags
      }));

    } catch (error) {
      console.error('❌ Error getting calendar events:', error);
      throw error;
    }
  }

  /**
   * ค้นหางาน
   */
  public async searchTasks(
    groupId: string, 
    query: string, 
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ tasks: Task[]; total: number }> {
    try {
      // รองรับการส่งค่าเป็น LINE Group ID หรือ internal UUID
      let internalGroupId: string | null = groupId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
      if (!isUuid) {
        const group = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
        internalGroupId = group ? group.id : null;
      }

      if (!internalGroupId) {
        // ถ้าหา group ไม่เจอ ให้คืนค่าว่างแทนที่จะโยน error เพื่อหลีกเลี่ยง 22P02
        return { tasks: [], total: 0 };
      }

      const queryBuilder = this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.createdByUser', 'creator')
        .where('task.groupId = :groupId', { groupId: internalGroupId })
        .andWhere(
          `(
            task.title ILIKE :query 
            OR task.description ILIKE :query 
            OR :query = ANY(task.tags)
            OR CAST(task.id AS TEXT) ILIKE :idQuery
          )`,
          { query: `%${query}%`, idQuery: `${query}%` }
        );

      const total = await queryBuilder.getCount();

      queryBuilder.orderBy('task.dueTime', 'DESC');

      if (options.limit) {
        queryBuilder.limit(options.limit);
      }

      if (options.offset) {
        queryBuilder.offset(options.offset);
      }

      const tasks = await queryBuilder.getMany();

      return { tasks, total };

    } catch (error) {
      console.error('❌ Error searching tasks:', error);
      throw error;
    }
  }

  /**
   * ดึงงานประจำทั้งหมด
   */
  public async getAllRecurringTasks(): Promise<Task[]> {
    try {
      // ดึงงานที่มีการตั้งค่าประจำ
      const recurringTasks = await this.taskRepository.find({
        where: {
          // งานที่มีการตั้งค่าประจำ (ในอนาคตจะเพิ่ม field recurring)
          status: In(['pending', 'in_progress'])
        },
        relations: ['group', 'assignedUsers', 'createdByUser']
      });

      return recurringTasks;
    } catch (error) {
      console.error('❌ Error getting recurring tasks:', error);
      return [];
    }
  }

  /**
   * ดำเนินการงานประจำ
   */
  public async executeRecurringTask(taskId: string): Promise<void> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['group', 'assignedUsers']
      });

      if (!task) {
        console.warn(`⚠️ Task not found: ${taskId}`);
        return;
      }

      // สร้างงานใหม่จากงานประจำ
      const newTask = await this.createTask({
        groupId: task.group.lineGroupId,
        title: task.title,
        description: task.description,
        assigneeIds: task.assignedUsers.map(u => u.lineUserId),
        createdBy: task.createdByUser.lineUserId,
        dueTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 วันจากนี้
        priority: task.priority,
        tags: task.tags,
        customReminders: task.customReminders,
        requireAttachment: false
      });

      console.log(`✅ Created recurring task: ${newTask.title}`);

    } catch (error) {
      console.error('❌ Error executing recurring task:', error);
    }
  }

  /**
   * อัปเดตเวลารันถัดไปของงานประจำ
   */
  public async updateRecurringTaskNextRunAt(taskId: string): Promise<void> {
    try {
      // อัปเดตเวลารันถัดไป (ในอนาคตจะเพิ่ม field nextRunAt)
      // สำหรับตอนนี้ให้อัปเดต updatedAt
      await this.taskRepository.update(taskId, {
        updatedAt: new Date()
      });

      console.log(`✅ Updated recurring task next run time: ${taskId}`);

    } catch (error) {
      console.error('❌ Error updating recurring task next run time:', error);
    }
  }

  /**
   * ตีกลับงานและขยายเวลา
   */
  public async rejectTaskAndExtendDeadline(taskId: string, rejectedBy: string, extensionDays: number = 3): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['assignedUsers', 'attachedFiles', 'group']
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // แปลง LINE User ID → internal user id หากส่งมาเป็น LINE ID
      let rejectedByInternalId = rejectedBy;
      if (rejectedByInternalId && rejectedByInternalId.startsWith('U')) {
        const user = await this.userRepository.findOneBy({ lineUserId: rejectedByInternalId });
        if (!user) {
          throw new Error('RejectedBy user not found');
        }
        rejectedByInternalId = user.id;
      }

      // ตรวจสอบสิทธิ์ - ต้องเป็นผู้ตรวจหรือผู้สร้าง
      if (!this.checkApprovalPermission(task, rejectedByInternalId)) {
        throw new Error('Only task reviewers or creators can reject tasks');
      }

      // ขยายเวลาออกไป
      const newDueTime = new Date(task.dueTime.getTime() + extensionDays * 24 * 60 * 60 * 1000);
      task.dueTime = newDueTime;

      // อัปเดตเวิร์กโฟลว์
      const now = new Date();
      task.workflow = {
        ...(task.workflow || {}),
        review: {
          ...(task.workflow as any)?.review,
          status: 'rejected',
          reviewedAt: now,
          rejectionReason: `ตีกลับโดย ${rejectedByInternalId} และขยายเวลาออกไป ${extensionDays} วัน`
        },
        history: [
          ...((task.workflow as any)?.history || []),
          { 
            action: 'reject', 
            byUserId: rejectedByInternalId, 
            at: now, 
            note: `extend_deadline_${extensionDays}_days` 
          }
        ]
      } as any;

      // รีเซ็ตสถานะงานกลับเป็น pending
      task.status = 'pending';

      const updatedTask = await this.taskRepository.save(task);

      // อัปเดตใน Google Calendar
      try {
        await this.googleService.updateTaskInCalendar(task, { 
          status: 'pending',
          dueTime: newDueTime
        });
      } catch (error) {
        console.warn('⚠️ Failed to update rejected task in Google Calendar:', error);
      }

      // แจ้งเตือนผู้รับผิดชอบว่าถูกตีกลับและขยายเวลา
      try {
        const rejectedByUser = await this.userRepository.findOneBy({ id: rejectedByInternalId });
        if (rejectedByUser) {
          await this.notificationService.sendTaskRejectedNotification({ ...updatedTask, group: task.group } as any, rejectedByUser as any, extensionDays.toString());
        }
      } catch (err) {
        console.warn('⚠️ Failed to send task rejected notification:', err);
      }

      return updatedTask;

    } catch (error) {
      console.error('❌ Error rejecting task and extending deadline:', error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
   */
  public async sendExtensionApprovalNotification(taskId: string, newDueTime: Date): Promise<void> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['group', 'assignedUsers', 'createdByUser']
      });

      if (!task) {
        throw new Error('ไม่พบงานที่ระบุ');
      }

      // หาผู้ขอเลื่อนเวลาจาก workflow history
      const extensionRequester = this.findExtensionRequester(task);
      
      if (extensionRequester) {
        // ส่งการ์ดแจ้งเตือนการอนุมัติ
        await this.notificationService.sendExtensionApprovedNotification(
          task as any, 
          extensionRequester, 
          newDueTime
        );
      }

    } catch (error) {
      console.error('❌ Error sending extension approval notification:', error);
      throw error;
    }
  }

  /**
   * หาผู้ขอเลื่อนเวลาจาก workflow history
   */
  private findExtensionRequester(task: any): any {
    try {
      const workflow = task.workflow as any;
      if (workflow && workflow.history) {
        // หาการกระทำล่าสุดที่เป็น request_extension
        const extensionRequest = workflow.history
          .reverse()
          .find((entry: any) => entry.action === 'request_extension');
        
        if (extensionRequest && extensionRequest.byUserId) {
          // หา user จาก assignedUsers หรือ createdByUser
          const requester = task.assignedUsers?.find((user: any) => user.id === extensionRequest.byUserId) ||
                           (task.createdByUser?.id === extensionRequest.byUserId ? task.createdByUser : null);
          return requester;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not find extension requester:', error);
    }
    return null;
  }

  /**
   * อนุมัติการตรวจงาน
   */
  public async approveReview(taskId: string, approvedBy: string): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['assignedUsers', 'attachedFiles', 'group', 'createdByUser']
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // แปลง LINE User ID → internal user id หากส่งมาเป็น LINE ID
      let approvedByInternalId = approvedBy;
      if (approvedByInternalId && approvedByInternalId.startsWith('U')) {
        const user = await this.userRepository.findOneBy({ lineUserId: approvedByInternalId });
        if (!user) {
          throw new Error('ApprovedBy user not found');
        }
        approvedByInternalId = user.id;
      }

      // ตรวจสอบสิทธิ์ - ต้องเป็นผู้ตรวจหรือผู้สร้าง
      if (!this.checkApprovalPermission(task, approvedByInternalId)) {
        throw new Error('Only task reviewers or creators can approve reviews');
      }

      // อัปเดตเวิร์กโฟลว์
      const now = new Date();
      task.workflow = {
        ...(task.workflow || {}),
        review: {
          ...(task.workflow as any)?.review,
          status: 'approved',
          reviewedAt: now
        },
        history: [
          ...((task.workflow as any)?.history || []),
          { 
            action: 'review_approved', 
            byUserId: approvedByInternalId, 
            at: now, 
            note: 'งานผ่านการตรวจแล้ว' 
          }
        ]
      } as any;

      // ไม่เปลี่ยนสถานะงาน เพื่อหลีกเลี่ยงปัญหา enum
      // เก็บข้อมูลการอนุมัติการตรวจไว้ใน workflow เท่านั้น
      // สถานะจะยังคงเป็น 'submitted' หรือ 'in_progress' ตามเดิม

      const updatedTask = await this.taskRepository.save(task);

      // อัปเดตใน Google Calendar (ไม่เปลี่ยนสถานะ)
      try {
        await this.googleService.updateTaskInCalendar(task, { 
          // ไม่เปลี่ยนสถานะ เก็บสถานะเดิมไว้
        });
      } catch (error) {
        console.warn('⚠️ Failed to update reviewed task in Google Calendar:', error);
      }

      // ตรวจสอบว่าผู้ตรวจเป็นผู้สั่งงานหรือไม่
      const isReviewerCreator = approvedByInternalId === task.createdBy;
      
      if (isReviewerCreator) {
        // ถ้าผู้ตรวจเป็นผู้สั่งงาน ให้อนุมัติการปิดงานทันที
        console.log(`✅ Reviewer is creator, auto-approving completion for task: ${task.title}`);
        return await this.completeTask(taskId, approvedByInternalId);
      } else {
        // ส่งการ์ดขออนุมัติการปิดงานให้ผู้สั่งงาน
        try {
          const reviewer = await this.userRepository.findOneBy({ id: approvedByInternalId });
          if (reviewer && task.createdByUser) {
            await this.notificationService.sendApprovalRequest(updatedTask, task.createdBy, reviewer);
            console.log(`📤 Sent approval request to task creator: ${task.createdByUser.displayName}`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to send approval request:', err);
        }
      }

      return updatedTask;

    } catch (error) {
      console.error('❌ Error approving review:', error);
      throw error;
    }
  }

  /**
   * อนุมัติการปิดงาน (หลังจากผ่านการตรวจแล้ว)
   */
  public async approveCompletion(taskId: string, approvedBy: string): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['assignedUsers', 'attachedFiles', 'group', 'createdByUser']
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // แปลง LINE User ID → internal user id หากส่งมาเป็น LINE ID
      let approvedByInternalId = approvedBy;
      if (approvedByInternalId && approvedByInternalId.startsWith('U')) {
        const user = await this.userRepository.findOneBy({ lineUserId: approvedByInternalId });
        if (!user) {
          throw new Error('ApprovedBy user not found');
        }
        approvedByInternalId = user.id;
      }

      // ตรวจสอบสิทธิ์ - ต้องเป็นผู้สั่งงาน (ผู้สร้างงาน)
      if (approvedByInternalId !== task.createdBy) {
        throw new Error('Only task creator can approve completion');
      }

      // ตรวจสอบว่างานผ่านการตรวจแล้วหรือไม่
      const reviewStatus = (task.workflow as any)?.review?.status;
      if (reviewStatus !== 'approved') {
        throw new Error('Task must be reviewed before completion can be approved');
      }

      // อัปเดตเวิร์กโฟลว์
      const now = new Date();
      task.workflow = {
        ...(task.workflow || {}),
        approval: {
          ...(task.workflow as any)?.approval,
          status: 'approved',
          approvedAt: now
        },
        history: [
          ...((task.workflow as any)?.history || []),
          { 
            action: 'completion_approved', 
            byUserId: approvedByInternalId, 
            at: now, 
            note: 'อนุมัติการปิดงานแล้ว' 
          }
        ]
      } as any;

      // เปลี่ยนสถานะงานเป็น completed (สถานะนี้มีอยู่แล้วในฐานข้อมูล)
      task.status = 'completed';
      task.completedAt = now;

      const updatedTask = await this.taskRepository.save(task);

      // อัปเดตใน Google Calendar
      try {
        await this.googleService.updateTaskInCalendar(task, { 
          status: 'completed',
          completedAt: now
        });
      } catch (error) {
        console.warn('⚠️ Failed to update completed task in Google Calendar:', error);
      }

      // แจ้งเตือนในกลุ่มว่าอนุมัติการปิดงานแล้ว
      try {
        const approvedByUser = await this.userRepository.findOneBy({ id: approvedByInternalId });
        if (approvedByUser) {
          await this.notificationService.sendTaskCompletedNotification({ ...updatedTask, group: task.group } as any, approvedByUser as any);
        }
      } catch (err) {
        console.warn('⚠️ Failed to send task completed notification:', err);
      }

      return updatedTask;

    } catch (error) {
      console.error('❌ Error approving completion:', error);
      throw error;
    }
  }

  /**
   * อนุมัติงานอัตโนมัติหลังจากครบกำหนดตรวจ 2 วัน
   */
  public async autoApproveTaskAfterDeadline(taskId: string): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['assignedUsers', 'attachedFiles', 'group']
      });
      
      if (!task) {
        throw new Error('Task not found');
      }

      const wf: any = task.workflow || {};
      if (!wf.review || wf.review.status !== 'pending') {
        throw new Error('Task is not pending review');
      }

      // ตรวจสอบว่าครบกำหนดตรวจ 2 วันแล้วหรือไม่
      const now = new Date();
      const reviewDue = new Date(wf.review.reviewDueAt);
      if (now < reviewDue) {
        throw new Error('Review deadline not reached yet');
      }

      // อนุมัติงานอัตโนมัติ
      task.status = 'completed';
      task.completedAt = new Date();
      
      // อัปเดตเวิร์กโฟลว์
      task.workflow = {
        ...wf,
        review: {
          ...wf.review,
          status: 'auto_approved',
          reviewedAt: now,
          autoApproved: true
        },
        history: [
          ...(wf.history || []),
          { 
            action: 'auto_approve', 
            byUserId: 'system', 
            at: now, 
            note: 'อนุมัติอัตโนมัติหลังจากครบกำหนดตรวจ 2 วัน' 
          }
        ]
      };

      const updatedTask = await this.taskRepository.save(task);

      // อัปเดตใน Google Calendar
      try {
        await this.googleService.updateTaskInCalendar(task, { 
          status: 'completed',
          completedAt: task.completedAt 
        });
      } catch (error) {
        console.warn('⚠️ Failed to update auto-approved task in Google Calendar:', error);
      }

      // แจ้งในกลุ่มว่าอนุมัติอัตโนมัติแล้ว
      try {
        if (task.group) {
          await this.notificationService.sendTaskAutoApprovedNotification({ ...updatedTask, group: task.group } as any);
        }
      } catch (err) {
        console.warn('⚠️ Failed to send task auto-approved notification:', err);
      }

      return updatedTask;

    } catch (error) {
      console.error('❌ Error auto-approving task:', error);
      throw error;
    }
  }

  /**
   * ดึงงานในกลุ่ม
   */
}