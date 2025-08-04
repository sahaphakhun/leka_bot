// Type Adapters - แปลงระหว่าง Entity กับ Interface

import { Task as TaskEntity, User as UserEntity, File as FileEntity } from '@/models';
import { Task, User, File } from '@/types';

/**
 * แปลง Task Entity เป็น Task Interface
 */
export const taskEntityToInterface = (entity: TaskEntity): Task => {
  return {
    id: entity.id,
    groupId: entity.groupId,
    title: entity.title,
    description: entity.description,
    status: entity.status,
    priority: entity.priority,
    tags: entity.tags,
    startTime: entity.startTime,
    dueTime: entity.dueTime,
    completedAt: entity.completedAt,
    assignees: entity.assignedUsers?.map(user => user.id) || [],
    createdBy: entity.createdBy,
    remindersSent: entity.remindersSent || [],
    customReminders: entity.customReminders,
    googleEventId: entity.googleEventId,
    attachedFiles: entity.attachedFiles?.map(file => file.id) || [],
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
};

/**
 * แปลง User Entity เป็น User Interface
 */
export const userEntityToInterface = (entity: UserEntity): User => {
  return {
    id: entity.id,
    lineUserId: entity.lineUserId,
    displayName: entity.displayName,
    realName: entity.realName,
    email: entity.email,
    timezone: entity.timezone,
    isVerified: entity.isVerified,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
};

/**
 * แปลง File Entity เป็น File Interface
 */
export const fileEntityToInterface = (entity: FileEntity): File => {
  return {
    id: entity.id,
    groupId: entity.groupId,
    originalName: entity.originalName,
    fileName: entity.fileName,
    mimeType: entity.mimeType,
    size: entity.size,
    uploadedBy: entity.uploadedBy,
    uploadedAt: entity.uploadedAt,
    tags: entity.tags,
    linkedTasks: entity.linkedTasks?.map(task => task.id) || [],
    path: entity.path,
    isPublic: entity.isPublic
  };
};

/**
 * แปลง Task Interface เป็น partial Entity data สำหรับการสร้าง
 */
export const taskInterfaceToEntityData = (task: Partial<Task>): Partial<TaskEntity> => {
  const entityData: Partial<TaskEntity> = {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    startTime: task.startTime,
    dueTime: task.dueTime,
    completedAt: task.completedAt,
    createdBy: task.createdBy,
    customReminders: task.customReminders,
    googleEventId: task.googleEventId
  };

  // ไม่รวม relations (assignedUsers, attachedFiles) เพราะต้องจัดการแยก
  return entityData;
};