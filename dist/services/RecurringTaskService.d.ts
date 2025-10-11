import { RecurringTask } from '@/models';
export declare class RecurringTaskService {
    private repo;
    constructor();
    create(template: Partial<RecurringTask> & {
        lineGroupId: string;
        title: string;
        assigneeLineUserIds: string[];
        recurrence: 'weekly' | 'monthly' | 'quarterly';
        weekDay?: number;
        dayOfMonth?: number;
        timeOfDay?: string;
        timezone?: string;
        createdByLineUserId: string;
        initialDueTime: string | Date;
    }): Promise<RecurringTask>;
    listByGroup(lineGroupId: string): Promise<RecurringTask[]>;
    findById(id: string): Promise<RecurringTask | null>;
    update(id: string, updates: Partial<RecurringTask>): Promise<RecurringTask>;
    remove(id: string): Promise<void>;
    calculateNextRunAt(input: {
        recurrence: 'weekly' | 'monthly' | 'quarterly';
        weekDay?: number;
        dayOfMonth?: number;
        timeOfDay: string;
        timezone: string;
    }): Date;
}
//# sourceMappingURL=RecurringTaskService.d.ts.map