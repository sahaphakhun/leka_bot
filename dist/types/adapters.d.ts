import { Task as TaskEntity, User as UserEntity, File as FileEntity } from '@/models';
import { Task, User, File } from '@/types';
/**
 * แปลง Task Entity เป็น Task Interface
 */
export declare const taskEntityToInterface: (entity: TaskEntity) => Task;
/**
 * แปลง User Entity เป็น User Interface
 */
export declare const userEntityToInterface: (entity: UserEntity) => User;
/**
 * แปลง File Entity เป็น File Interface
 */
export declare const fileEntityToInterface: (entity: FileEntity) => File;
/**
 * แปลง Task Interface เป็น partial Entity data สำหรับการสร้าง
 */
export declare const taskInterfaceToEntityData: (task: Partial<Task>) => Partial<TaskEntity>;
//# sourceMappingURL=adapters.d.ts.map