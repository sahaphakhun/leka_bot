// Recurring Task Service - จัดการงานประจำ (รายสัปดาห์/รายเดือน)

import moment from 'moment-timezone';
import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { RecurringTask } from '@/models';
import { config } from '@/utils/config';

export class RecurringTaskService {
  private repo: Repository<RecurringTask>;

  constructor() {
    this.repo = AppDataSource.getRepository(RecurringTask);
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
    const tz = template.timezone || config.app.defaultTimezone;
    const nextRunAt = this.calculateNextRunAt({
      recurrence: template.recurrence,
      weekDay: template.weekDay,
      dayOfMonth: template.dayOfMonth,
      timeOfDay: template.timeOfDay || '09:00',
      timezone: tz
    });

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

    return await this.repo.save(entity);
  }

  public async listByGroup(lineGroupId: string): Promise<RecurringTask[]> {
    return await this.repo.find({ where: { lineGroupId }, order: { createdAt: 'DESC' } });
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


