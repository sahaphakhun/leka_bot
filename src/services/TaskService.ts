// Task Service - จัดการงานและปฏิทิน

import { Repository, In } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { Task, Group, User } from '@/models';
import { Task as TaskType, CalendarEvent } from '@/types';
import moment from 'moment-timezone';
import { config } from '@/utils/config';
import { GoogleService } from './GoogleService';
import { NotificationService } from './NotificationService';

export class TaskService {
  private taskRepository: Repository<Task>;
  private groupRepository: Repository<Group>;
  private userRepository: Repository<User>;
  private googleService: GoogleService;
  private notificationService: NotificationService;

  constructor() {
    this.taskRepository = AppDataSource.getRepository(Task);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.userRepository = AppDataSource.getRepository(User);
    this.googleService = new GoogleService();
    this.notificationService = new NotificationService();
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
  }): Promise<Task> {
    try {
      // ค้นหา Group entity จาก LINE Group ID
      const group = await this.groupRepository.findOneBy({ lineGroupId: data.groupId });
      if (!group) {
        throw new Error(`Group not found for LINE ID: ${data.groupId}`);
      }

      // ค้นหา Creator User entity จาก LINE User ID
      const creator = await this.userRepository.findOneBy({ lineUserId: data.createdBy });
      if (!creator) {
        throw new Error(`Creator user not found for LINE ID: ${data.createdBy}`);
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
        status: 'pending'
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

      // ซิงค์ไปยัง Google Calendar
      try {
        if (group.settings.googleCalendarId) {
          const eventId = await this.googleService.syncTaskToCalendar(savedTask, group.settings.googleCalendarId);
          // อัปเดต task ด้วย eventId
          savedTask.googleEventId = eventId;
          await this.taskRepository.save(savedTask);
        }
      } catch (error) {
        console.warn('⚠️ Failed to sync task to Google Calendar:', error);
      }

      // โหลด task พร้อม relations เพื่อ return ข้อมูลครบถ้วน
      const taskWithRelations = await this.taskRepository.findOne({
        where: { id: savedTask.id },
        relations: ['assignedUsers', 'createdByUser', 'group']
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
   * อัปเดตงาน
   */
  public async updateTask(taskId: string, updates: Partial<TaskType>): Promise<Task> {
    try {
      const task = await this.taskRepository.findOneBy({ id: taskId });
      if (!task) {
        throw new Error('Task not found');
      }

      Object.assign(task, updates);
      const updatedTask = await this.taskRepository.save(task);

      // อัปเดตใน Google Calendar
      try {
        await this.googleService.updateTaskInCalendar(task, updates);
      } catch (error) {
        console.warn('⚠️ Failed to update task in Google Calendar:', error);
      }

      return updatedTask;

    } catch (error) {
      console.error('❌ Error updating task:', error);
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
        relations: ['assignedUsers']
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // ตรวจสอบสิทธิ์
      const isAssignee = task.assignedUsers.some(user => user.id === completedBy);
      const isCreator = task.createdBy === completedBy;

      if (!isAssignee && !isCreator) {
        throw new Error('Unauthorized to complete this task');
      }

      task.status = 'completed';
      task.completedAt = new Date();

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

      return completedTask;

    } catch (error) {
      console.error('❌ Error completing task:', error);
      throw error;
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
      tags?: string[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ tasks: Task[]; total: number }> {
    try {
      // ค้นหา Group entity จาก LINE Group ID
      const group = await this.groupRepository.findOneBy({ lineGroupId: groupId });
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
   * ดึงงานที่เกินกำหนด
   */
  public async getOverdueTasks(): Promise<Task[]> {
    try {
      const now = new Date();

      return await this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.group', 'group')
        .where('task.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
        .andWhere('task.dueTime < :now', { now })
        .getMany();

    } catch (error) {
      console.error('❌ Error getting overdue tasks:', error);
      throw error;
    }
  }

  /**
   * ดึงงานที่กำลังดำเนินการ
   */
  public async getActiveTasks(groupId: string): Promise<Task[]> {
    try {
      return await this.taskRepository.find({
        where: {
          groupId,
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
      const queryBuilder = this.taskRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUsers', 'assignee')
        .leftJoinAndSelect('task.createdByUser', 'creator')
        .where('task.groupId = :groupId', { groupId })
        .andWhere(
          '(task.title ILIKE :query OR task.description ILIKE :query OR :query = ANY(task.tags))',
          { query: `%${query}%` }
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
}