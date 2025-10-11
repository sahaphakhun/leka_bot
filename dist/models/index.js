"use strict";
// TypeORM Database Models
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringTask = exports.KPIRecord = exports.File = exports.Task = exports.GroupMember = exports.User = exports.Group = void 0;
const typeorm_1 = require("typeorm");
let Group = class Group {
};
exports.Group = Group;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Group.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true }),
    __metadata("design:type", String)
], Group.prototype, "lineGroupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Group.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'Asia/Bangkok' }),
    __metadata("design:type", String)
], Group.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: {} }),
    __metadata("design:type", Object)
], Group.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Group.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Group.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GroupMember, member => member.group),
    __metadata("design:type", Array)
], Group.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Task, task => task.group),
    __metadata("design:type", Array)
], Group.prototype, "tasks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => File, file => file.group),
    __metadata("design:type", Array)
], Group.prototype, "files", void 0);
exports.Group = Group = __decorate([
    (0, typeorm_1.Entity)('groups')
], Group);
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true }),
    __metadata("design:type", String)
], User.prototype, "lineUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], User.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "realName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'Asia/Bangkok' }),
    __metadata("design:type", String)
], User.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: {} }),
    __metadata("design:type", Object)
], User.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GroupMember, member => member.user),
    __metadata("design:type", Array)
], User.prototype, "groupMemberships", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Task, task => task.createdByUser),
    __metadata("design:type", Array)
], User.prototype, "createdTasks", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Task, task => task.assignedUsers),
    __metadata("design:type", Array)
], User.prototype, "assignedTasks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => KPIRecord, record => record.user),
    __metadata("design:type", Array)
], User.prototype, "kpiRecords", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
let GroupMember = class GroupMember {
};
exports.GroupMember = GroupMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GroupMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], GroupMember.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], GroupMember.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['admin', 'member'], default: 'admin' }),
    __metadata("design:type", String)
], GroupMember.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GroupMember.prototype, "joinedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group, group => group.members, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'groupId' }),
    __metadata("design:type", Group)
], GroupMember.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.groupMemberships, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User)
], GroupMember.prototype, "user", void 0);
exports.GroupMember = GroupMember = __decorate([
    (0, typeorm_1.Entity)('group_members')
], GroupMember);
let Task = class Task {
};
exports.Task = Task;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Task.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Task.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Task.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'in_progress', 'submitted', 'reviewed', 'approved', 'completed', 'rejected', 'cancelled', 'overdue'],
        default: 'pending'
    }),
    __metadata("design:type", String)
], Task.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }),
    __metadata("design:type", String)
], Task.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, default: '{}' }),
    __metadata("design:type", Array)
], Task.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Task.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Task.prototype, "dueTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Task.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Task.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Task.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Task.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Task.prototype, "requireAttachment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "recurringTaskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Task.prototype, "recurringInstance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Task.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: [] }),
    __metadata("design:type", Array)
], Task.prototype, "remindersSent", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, default: '{}' }),
    __metadata("design:type", Array)
], Task.prototype, "customReminders", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "googleEventId", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: {} }),
    __metadata("design:type", Object)
], Task.prototype, "googleEventIds", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: {} }),
    __metadata("design:type", Object)
], Task.prototype, "workflow", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Task.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Task.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group, group => group.tasks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'groupId' }),
    __metadata("design:type", Group)
], Task.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.createdTasks),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", User)
], Task.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => User, user => user.assignedTasks),
    (0, typeorm_1.JoinTable)({
        name: 'task_assignees',
        joinColumn: { name: 'taskId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Task.prototype, "assignedUsers", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => File, file => file.linkedTasks),
    (0, typeorm_1.JoinTable)({
        name: 'task_files',
        joinColumn: { name: 'taskId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'fileId', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Task.prototype, "attachedFiles", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => KPIRecord, record => record.task),
    __metadata("design:type", Array)
], Task.prototype, "kpiRecords", void 0);
exports.Task = Task = __decorate([
    (0, typeorm_1.Entity)('tasks')
], Task);
let File = class File {
};
exports.File = File;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], File.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], File.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], File.prototype, "originalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], File.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], File.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], File.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], File.prototype, "path", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], File.prototype, "storageProvider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], File.prototype, "storageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], File.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, default: '{}' }),
    __metadata("design:type", Array)
], File.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], File.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['in_progress', 'completed'], default: 'in_progress' }),
    __metadata("design:type", String)
], File.prototype, "folderStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['initial', 'submission'], nullable: true }),
    __metadata("design:type", String)
], File.prototype, "attachmentType", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], File.prototype, "uploadedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group, group => group.files, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'groupId' }),
    __metadata("design:type", Group)
], File.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User),
    (0, typeorm_1.JoinColumn)({ name: 'uploadedBy' }),
    __metadata("design:type", User)
], File.prototype, "uploadedByUser", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Task, task => task.attachedFiles),
    __metadata("design:type", Array)
], File.prototype, "linkedTasks", void 0);
exports.File = File = __decorate([
    (0, typeorm_1.Entity)('files')
], File);
let KPIRecord = class KPIRecord {
};
exports.KPIRecord = KPIRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], KPIRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KPIRecord.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KPIRecord.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KPIRecord.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], KPIRecord.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['assignee', 'creator', 'bonus', 'penalty'] }),
    __metadata("design:type", String)
], KPIRecord.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], KPIRecord.prototype, "points", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], KPIRecord.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], KPIRecord.prototype, "eventDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], KPIRecord.prototype, "weekOf", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], KPIRecord.prototype, "monthOf", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], KPIRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.kpiRecords),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User)
], KPIRecord.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group),
    (0, typeorm_1.JoinColumn)({ name: 'groupId' }),
    __metadata("design:type", Group)
], KPIRecord.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Task, task => task.kpiRecords, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'taskId' }),
    __metadata("design:type", Task)
], KPIRecord.prototype, "task", void 0);
exports.KPIRecord = KPIRecord = __decorate([
    (0, typeorm_1.Entity)('kpi_records')
], KPIRecord);
let RecurringTask = class RecurringTask {
};
exports.RecurringTask = RecurringTask;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RecurringTask.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RecurringTask.prototype, "lineGroupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RecurringTask.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], RecurringTask.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, default: '{}' }),
    __metadata("design:type", Array)
], RecurringTask.prototype, "assigneeLineUserIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], RecurringTask.prototype, "reviewerLineUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RecurringTask.prototype, "requireAttachment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' }),
    __metadata("design:type", String)
], RecurringTask.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, default: '{}' }),
    __metadata("design:type", Array)
], RecurringTask.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['weekly', 'monthly', 'quarterly'] }),
    __metadata("design:type", String)
], RecurringTask.prototype, "recurrence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', nullable: true }),
    __metadata("design:type", Number)
], RecurringTask.prototype, "weekDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', nullable: true }),
    __metadata("design:type", Number)
], RecurringTask.prototype, "dayOfMonth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: '09:00' }),
    __metadata("design:type", String)
], RecurringTask.prototype, "timeOfDay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'Asia/Bangkok' }),
    __metadata("design:type", String)
], RecurringTask.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 7 }),
    __metadata("design:type", Number)
], RecurringTask.prototype, "durationDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RecurringTask.prototype, "totalInstances", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], RecurringTask.prototype, "lastRunAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], RecurringTask.prototype, "nextRunAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RecurringTask.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], RecurringTask.prototype, "createdByLineUserId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RecurringTask.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RecurringTask.prototype, "updatedAt", void 0);
exports.RecurringTask = RecurringTask = __decorate([
    (0, typeorm_1.Entity)('recurring_tasks')
], RecurringTask);
//# sourceMappingURL=index.js.map