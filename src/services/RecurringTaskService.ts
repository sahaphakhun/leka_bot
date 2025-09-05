// Recurring Task Service - จัดการงานประจำ (รายสัปดาห์/รายเดือน)

import moment from 'moment-timezone';
import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { RecurringTask } from '@/models';
import { config } from '@/utils/config';
import { logger } from '@/utils/logger';

export class RecurringTaskService {
  private repo: Repository<RecurringTask>;

  constructor() {
    try {
      this.repo = AppDataSource.getRepository(RecurringTask);
      logger.info('✅ RecurringTaskService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize RecurringTaskService:', error);
      throw error;
    }
  }

  public async create(template: Partial<RecurringTask> & {
    lineGroupId: string;
    title: string;
    assigneeLineUserIds: string[];
    recurrence: 'weekly' | 'monthly' | 'quarterly';
    // weekly
    weekDay?: number;
    // monthly
    dayOfMonth?: number;
    timeOfDay?: string; // 'HH:mm'
    timezone?: string;
    createdByLineUserId: string;
  }): Promise<RecurringTask> {
    try {
      logger.info('📝 RecurringTaskService.create called:', {
        lineGroupId: template.lineGroupId,
        title: template.title,
        recurrence: template.recurrence,
        assigneeCount: template.assigneeLineUserIds?.length || 0,
        createdBy: template.createdByLineUserId
      });
      
      // Validate required fields
      if (!template.lineGroupId) {
        throw new Error('lineGroupId is required');
      }
      if (!template.title) {
        throw new Error('title is required');
      }
      if (!template.recurrence) {
        throw new Error('recurrence type is required');
      }
      if (!template.createdByLineUserId) {
        throw new Error('createdByLineUserId is required');
      }
      
      // Check if repository is available
      if (!this.repo) {
        logger.error('❌ Repository not initialized');
        throw new Error('Database repository not initialized');
      }
      
      const tz = template.timezone || config.app.defaultTimezone;
      logger.info('🕰️ Calculating next run time with timezone:', tz);
      
      const nextRunAt = this.calculateNextRunAt({
        recurrence: template.recurrence,
        weekDay: template.weekDay,
        dayOfMonth: template.dayOfMonth,
        timeOfDay: template.timeOfDay || '09:00',
        timezone: tz
      });
      
      logger.info('📅 Next run calculated:', nextRunAt);

      const entity = this.repo.create({
        ...template,
        timeOfDay: template.timeOfDay || '09:00',
        timezone: tz,
        priority: template.priority || 'medium',
        tags: template.tags || [],
        requireAttachment: template.requireAttachment ?? true,
        nextRunAt,
        active: template.active ?? true
      });
      
      logger.info('💾 Saving entity to database...');
      const saved = await this.repo.save(entity);
      logger.info('✅ Recurring task saved successfully:', { id: saved.id });
      
      return saved;
    } catch (error) {
      logger.error('❌ Error in RecurringTaskService.create:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        template: {
          lineGroupId: template.lineGroupId,
          title: template.title,
          recurrence: template.recurrence
        }
      });
      throw error;
    }
  }

  public async listByGroup(lineGroupId: string): Promise<RecurringTask[]> {
    try {
      logger.info('📝 Listing recurring tasks for group:', lineGroupId);
      
      // Check if repository is available
      if (!this.repo) {
        logger.error('❌ Repository not initialized in listByGroup');
        throw new Error('Database repository not initialized');
      }
      
      const results = await this.repo.find({ 
        where: { lineGroupId }, 
        order: { createdAt: 'DESC' } 
      });
      
      logger.info('✅ Successfully retrieved recurring tasks:', { count: results.length });
      return results;
    } catch (error) {
      logger.error('❌ Error in RecurringTaskService.listByGroup:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        lineGroupId
      });
      throw error;
    }
  }

  public async findById(id: string): Promise<RecurringTask | null> {
    return await this.repo.findOneBy({ id });
  }

  public async update(id: string, updates: Partial<RecurringTask>): Promise<RecurringTask> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new Error('Recurring template not found');

    Object.assign(entity, updates);

    // ถ้ามีการเปลี่ยนรอบเวลา ให้คำนวณ nextRunAt ใหม่
    if (
      updates.recurrence !== undefined ||
      updates.weekDay !== undefined ||
      updates.dayOfMonth !== undefined ||
      updates.timeOfDay !== undefined ||
      updates.timezone !== undefined
    ) {
      entity.nextRunAt = this.calculateNextRunAt({
        recurrence: entity.recurrence,
        weekDay: entity.weekDay,
        dayOfMonth: entity.dayOfMonth,
        timeOfDay: entity.timeOfDay,
        timezone: entity.timezone
      });
    }

    return await this.repo.save(entity);
  }

  public async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  public calculateNextRunAt(input: {
    recurrence: 'weekly' | 'monthly' | 'quarterly';
    weekDay?: number;
    dayOfMonth?: number;
    timeOfDay: string;
    timezone: string;
  }): Date {
    const tz = input.timezone || config.app.defaultTimezone;
    const now = moment().tz(tz);
    let next = now.clone();
    if (input.recurrence === 'weekly') {
      const wd = input.weekDay ?? 1; // default Monday
      next = now.clone().day(wd);
      if (next.isSameOrBefore(now, 'day')) next.add(1, 'week');
    } else if (input.recurrence === 'monthly') {
      const dom = input.dayOfMonth ?? 1;
      next = now.clone().date(Math.min(dom, now.daysInMonth()));
      if (next.isSameOrBefore(now, 'day')) {
        const nextMonth = now.clone().add(1, 'month');
        next = nextMonth.clone().date(Math.min(dom, nextMonth.daysInMonth()));
      }
    } else {
      // quarterly: ทุกไตรมาส (3 เดือน)
      const dom = input.dayOfMonth ?? 1;
      // หาเดือนของไตรมาสถัดไป
      const currentMonth = now.month(); // 0-11
      const nextQuarterStartMonth = Math.floor(currentMonth / 3) * 3 + 3; // 0,3,6,9 → +3
      const base = now.clone().month(nextQuarterStartMonth).date(1);
      const target = base.clone().date(Math.min(dom, base.daysInMonth()));
      if (target.isSameOrBefore(now, 'day')) {
        const base2 = base.clone().add(3, 'months');
        next = base2.clone().date(Math.min(dom, base2.daysInMonth()));
      } else {
        next = target;
      }
    }
    const [h, m] = input.timeOfDay.split(':').map(v => parseInt(v, 10));
    next.hour(h).minute(m).second(0).millisecond(0);
    return next.toDate();
  }
}


