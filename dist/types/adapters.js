"use strict";
// Type Adapters - แปลงระหว่าง Entity กับ Interface
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskInterfaceToEntityData = exports.fileEntityToInterface = exports.userEntityToInterface = exports.taskEntityToInterface = void 0;
/**
 * แปลง Task Entity เป็น Task Interface
 */
const taskEntityToInterface = (entity) => {
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
        googleEventIds: entity.googleEventIds || {},
        attachedFiles: entity.attachedFiles?.map(file => (0, exports.fileEntityToInterface)(file)) || [],
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        // เพิ่มข้อมูลผู้ใช้ที่สมบูรณ์สำหรับการแสดงผล
        assignedUsers: entity.assignedUsers?.map(user => ({
            id: user.id,
            lineUserId: user.lineUserId,
            displayName: user.displayName,
            realName: user.realName,
            email: user.email
        })) || [],
        createdByUser: entity.createdByUser ? {
            id: entity.createdByUser.id,
            lineUserId: entity.createdByUser.lineUserId,
            displayName: entity.createdByUser.displayName,
            realName: entity.createdByUser.realName,
            email: entity.createdByUser.email
        } : null,
        // เพิ่มข้อมูลผู้ตรวจจาก workflow
        reviewerUserId: entity.workflow?.review?.reviewerUserId,
        workflow: entity.workflow
    };
};
exports.taskEntityToInterface = taskEntityToInterface;
/**
 * แปลง User Entity เป็น User Interface
 */
const userEntityToInterface = (entity) => {
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
exports.userEntityToInterface = userEntityToInterface;
/**
 * แปลง File Entity เป็น File Interface
 */
const fileEntityToInterface = (entity) => {
    return {
        id: entity.id,
        groupId: entity.groupId,
        originalName: entity.originalName,
        fileName: entity.fileName,
        mimeType: entity.mimeType,
        size: entity.size,
        uploadedBy: entity.uploadedBy,
        uploadedAt: entity.uploadedAt,
        attachmentType: entity.attachmentType,
        tags: entity.tags,
        linkedTasks: entity.linkedTasks?.map(task => task.id) || [],
        path: entity.path,
        isPublic: entity.isPublic
    };
};
exports.fileEntityToInterface = fileEntityToInterface;
/**
 * แปลง Task Interface เป็น partial Entity data สำหรับการสร้าง
 */
const taskInterfaceToEntityData = (task) => {
    const entityData = {
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
exports.taskInterfaceToEntityData = taskInterfaceToEntityData;
//# sourceMappingURL=adapters.js.map