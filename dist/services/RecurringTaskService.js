"use strict";
// Recurring Task Service - จัดการงานประจำ (รายสัปดาห์/รายเดือน)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringTaskService = void 0;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const config_1 = require("@/utils/config");
const logger_1 = require("@/utils/logger");
const TaskService_1 = require("./TaskService");
class RecurringTaskService {
    constructor() {
        try {
            this.repo = database_1.AppDataSource.getRepository(models_1.RecurringTask);
            logger_1.logger.info('✅ RecurringTaskService initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to initialize RecurringTaskService:', error);
            throw error;
        }
    }
    async create(template) {
        try {
            logger_1.logger.info('📝 RecurringTaskService.create called:', {
                lineGroupId: template.lineGroupId,
                title: template.title,
                recurrence: template.recurrence,
                assigneeCount: template.assigneeLineUserIds?.length || 0,
                createdBy: template.createdByLineUserId,
                initialDueTime: template.initialDueTime
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
            if (!template.initialDueTime) {
                throw new Error('initialDueTime is required');
            }
            // Check if repository is available
            if (!this.repo) {
                logger_1.logger.error('❌ Repository not initialized');
                throw new Error('Database repository not initialized');
            }
            const tz = template.timezone || config_1.config.app.defaultTimezone;
            // แปลง initial due
            const initialDue = typeof template.initialDueTime === 'string'
                ? new Date(template.initialDueTime)
                : template.initialDueTime;
            if (isNaN(initialDue.getTime())) {
                throw new Error('Invalid initialDueTime');
            }
            // อนุมานสัญญาณสำหรับ UI (ไม่บังคับผู้ใช้ต้องกรอก)
            const derivedWeekDay = initialDue.getDay(); // 0-6
            const derivedDayOfMonth = initialDue.getDate();
            const hh = String(initialDue.getHours()).padStart(2, '0');
            const mm = String(initialDue.getMinutes()).padStart(2, '0');
            const derivedTimeOfDay = `${hh}:${mm}`;
            const entity = this.repo.create({
                ...template,
                // เก็บค่าที่อนุมานจากกำหนดส่งครั้งแรก เพื่อแสดงผลสวยงาม
                weekDay: template.weekDay ?? derivedWeekDay,
                dayOfMonth: template.dayOfMonth ?? derivedDayOfMonth,
                timeOfDay: template.timeOfDay || derivedTimeOfDay,
                timezone: tz,
                priority: template.priority || 'medium',
                tags: template.tags || [],
                requireAttachment: template.requireAttachment ?? true,
                // ใช้ initial due เป็นตัวชี้วัดรอบล่าสุด (จะสร้างรอบถัดไปเมื่อเลยกำหนดนี้)
                nextRunAt: initialDue,
                active: template.active ?? true,
                totalInstances: 0
            });
            logger_1.logger.info('💾 Saving entity to database...');
            const saved = await this.repo.save(entity);
            logger_1.logger.info('✅ Recurring task saved successfully:', { id: saved.id });
            // สร้างงานรอบแรกทันทีตามกำหนดส่งที่ระบุ
            try {
                const taskService = new TaskService_1.TaskService();
                const newTask = await taskService.createTask({
                    groupId: template.lineGroupId,
                    title: template.title,
                    description: template.description,
                    assigneeIds: template.assigneeLineUserIds || [],
                    createdBy: template.createdByLineUserId,
                    dueTime: initialDue,
                    priority: template.priority || 'medium',
                    tags: template.tags || [],
                    requireAttachment: !!template.requireAttachment,
                    reviewerUserId: template.reviewerLineUserId
                });
                // ลิงก์ task → recurring
                await database_1.AppDataSource.getRepository(models_1.Task)
                    .createQueryBuilder()
                    .update()
                    .set({ recurringTaskId: saved.id, recurringInstance: 1 })
                    .where('id = :taskId', { taskId: newTask.id })
                    .execute();
                // อัปเดตตัวนับและเวลาทำงานล่าสุด
                saved.totalInstances = 1;
                saved.lastRunAt = new Date();
                await this.repo.save(saved);
                logger_1.logger.info('✅ First instance created and linked', { taskId: newTask.id, recurringId: saved.id });
            }
            catch (firstErr) {
                logger_1.logger.error('❌ Failed to create first instance of recurring task:', firstErr);
                // ไม่ throw ต่อเพื่อให้ยังคืน template ได้ แต่แนะนำให้ผู้ใช้ตรวจสอบ
            }
            return saved;
        }
        catch (error) {
            logger_1.logger.error('❌ Error in RecurringTaskService.create:', {
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
    async listByGroup(lineGroupId) {
        try {
            logger_1.logger.info('📝 Listing recurring tasks for group:', lineGroupId);
            // Check if repository is available
            if (!this.repo) {
                logger_1.logger.error('❌ Repository not initialized in listByGroup');
                throw new Error('Database repository not initialized');
            }
            const results = await this.repo.find({
                where: { lineGroupId },
                order: { createdAt: 'DESC' }
            });
            logger_1.logger.info('✅ Successfully retrieved recurring tasks:', { count: results.length });
            return results;
        }
        catch (error) {
            logger_1.logger.error('❌ Error in RecurringTaskService.listByGroup:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                lineGroupId
            });
            throw error;
        }
    }
    async findById(id) {
        return await this.repo.findOneBy({ id });
    }
    async update(id, updates) {
        const entity = await this.repo.findOneBy({ id });
        if (!entity)
            throw new Error('Recurring template not found');
        Object.assign(entity, updates);
        // ถ้ามีการเปลี่ยนรอบเวลา ให้คำนวณ nextRunAt ใหม่
        if (updates.recurrence !== undefined ||
            updates.weekDay !== undefined ||
            updates.dayOfMonth !== undefined ||
            updates.timeOfDay !== undefined ||
            updates.timezone !== undefined) {
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
    async remove(id) {
        await this.repo.delete({ id });
    }
    calculateNextRunAt(input) {
        try {
            logger_1.logger.info('🕰️ Calculating next run time:', input);
            // Simple fallback calculation using native Date instead of moment
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            // Parse time
            const timeParts = (input.timeOfDay || '09:00').split(':');
            const hours = parseInt(timeParts[0] || '9', 10);
            const minutes = parseInt(timeParts[1] || '0', 10);
            // Set the time
            tomorrow.setHours(hours, minutes, 0, 0);
            logger_1.logger.info('✅ Simple next run time calculated:', {
                input: input.timeOfDay,
                result: tomorrow.toISOString()
            });
            return tomorrow;
        }
        catch (error) {
            logger_1.logger.error('❌ Error in simple calculation, using moment fallback:', error);
            // Original moment-based calculation as fallback
            try {
                const tz = input.timezone || config_1.config.app.defaultTimezone;
                const now = (0, moment_timezone_1.default)().tz(tz);
                let next = now.clone();
                if (input.recurrence === 'weekly') {
                    const wd = input.weekDay ?? 1; // default Monday
                    next = now.clone().day(wd);
                    if (next.isSameOrBefore(now, 'day'))
                        next.add(1, 'week');
                }
                else if (input.recurrence === 'monthly') {
                    const dom = input.dayOfMonth ?? 1;
                    next = now.clone().date(Math.min(dom, now.daysInMonth()));
                    if (next.isSameOrBefore(now, 'day')) {
                        const nextMonth = now.clone().add(1, 'month');
                        next = nextMonth.clone().date(Math.min(dom, nextMonth.daysInMonth()));
                    }
                }
                else {
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
                    }
                    else {
                        next = target;
                    }
                }
                // Parse and set time
                const timeParts = input.timeOfDay.split(':');
                if (timeParts.length !== 2) {
                    logger_1.logger.warn('⚠️ Invalid time format, using default 09:00');
                    next.hour(9).minute(0);
                }
                else {
                    const h = parseInt(timeParts[0], 10);
                    const m = parseInt(timeParts[1], 10);
                    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
                        logger_1.logger.warn('⚠️ Invalid time values, using default 09:00');
                        next.hour(9).minute(0);
                    }
                    else {
                        next.hour(h).minute(m);
                    }
                }
                next.second(0).millisecond(0);
                const result = next.toDate();
                logger_1.logger.info('✅ Moment-based calculation successful:', {
                    from: now.format(),
                    to: next.format(),
                    result: result.toISOString()
                });
                return result;
            }
            catch (momentError) {
                logger_1.logger.error('❌ Moment calculation also failed:', momentError);
                // Ultimate fallback to tomorrow at 9 AM
                const fallback = new Date();
                fallback.setDate(fallback.getDate() + 1);
                fallback.setHours(9, 0, 0, 0);
                logger_1.logger.warn('⚠️ Using ultimate fallback next run time:', fallback.toISOString());
                return fallback;
            }
        }
    }
}
exports.RecurringTaskService = RecurringTaskService;
//# sourceMappingURL=RecurringTaskService.js.map