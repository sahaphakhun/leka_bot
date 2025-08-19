// TypeORM Database Models

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable, JoinColumn } from 'typeorm';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  lineGroupId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', default: 'Asia/Bangkok' })
  timezone: string;

  @Column('jsonb', { default: {} })
  settings: {
    reminderIntervals: string[];
    enableLeaderboard: boolean;
    googleCalendarId?: string;
    googleRefreshToken?: string;
    defaultReminders: string[];
    workingHours: {
      start: string;
      end: string;
    };
    // ผู้ที่จะได้รับรายงานสรุปอัตโนมัติ (LINE User IDs)
    reportRecipients?: string[];
    // ผู้บังคับบัญชาที่จะได้รับสรุปงานของผู้ใต้บังคับบัญชา (LINE User IDs)
    supervisors?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GroupMember, member => member.group)
  members: GroupMember[];

  @OneToMany(() => Task, task => task.group)
  tasks: Task[];

  @OneToMany(() => File, file => file.group)
  files: File[];
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  lineUserId: string;

  @Column({ type: 'varchar' })
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  realName?: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  email?: string;

  @Column({ type: 'varchar', default: 'Asia/Bangkok' })
  timezone: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GroupMember, member => member.user)
  groupMemberships: GroupMember[];

  @OneToMany(() => Task, task => task.createdByUser)
  createdTasks: Task[];

  @ManyToMany(() => Task, task => task.assignedUsers)
  assignedTasks: Task[];

  @OneToMany(() => KPIRecord, record => record.user)
  kpiRecords: KPIRecord[];
}

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['admin', 'member'], default: 'admin' })
  role: 'admin' | 'member';

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Group, group => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, user => user.groupMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'in_progress', 'submitted', 'reviewed', 'approved', 'completed', 'rejected', 'cancelled', 'overdue'],
    default: 'pending'
  })
  status: 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 'approved' | 'completed' | 'rejected' | 'cancelled' | 'overdue';

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  })
  priority: 'low' | 'medium' | 'high';

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ nullable: true })
  startTime?: Date;

  @Column()
  dueTime: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  // เพิ่มฟิลด์เวลาใหม่สำหรับ workflow
  @Column({ nullable: true })
  submittedAt?: Date;      // เวลาส่งงาน

  @Column({ nullable: true })
  reviewedAt?: Date;       // เวลาตรวจสอบ

  @Column({ nullable: true })
  approvedAt?: Date;       // เวลาอนุมัติ

  // บังคับให้ต้องมีไฟล์แนบเมื่อส่งงาน
  @Column({ type: 'boolean', default: false })
  requireAttachment: boolean;

  @Column()
  createdBy: string;

  @Column('jsonb', { default: [] })
  remindersSent: {
    type: string;
    sentAt: Date;
    channels: ('line' | 'email')[];
  }[];

  @Column('text', { array: true, default: '{}' })
  customReminders?: string[];

  @Column({ type: 'varchar', nullable: true })
  googleEventId?: string;

  // ข้อมูลเวิร์กโฟลว์การส่งงาน/ตรวจงาน/อนุมัติ
  @Column('jsonb', { default: {} })
  workflow: {
    submissions?: Array<{
      submittedByUserId: string; // internal user UUID
      submittedAt: Date;
      fileIds: string[];
      comment?: string;
      links?: string[];
      lateSubmission?: boolean;
    }>;
    review?: {
      reviewerUserId: string; // internal user UUID
      status: 'not_requested' | 'pending' | 'approved' | 'rejected';
      reviewRequestedAt?: Date;
      reviewDueAt?: Date; // +2 days หลังส่ง
      reviewedAt?: Date;
      reviewerComment?: string;
      lateReview?: boolean;
    };
    approval?: {
      creatorUserId: string; // internal user UUID
      status: 'not_requested' | 'pending' | 'approved';
      approvalRequestedAt?: Date;
      approvedAt?: Date;
      creatorComment?: string;
    };
    history?: Array<{
      action: 'create' | 'submit' | 'review' | 'approve' | 'reject' | 'revise_due' | 'complete';
      byUserId: string;
      at: Date;
      note?: string;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Group, group => group.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, user => user.createdTasks)
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @ManyToMany(() => User, user => user.assignedTasks)
  @JoinTable({
    name: 'task_assignees',
    joinColumn: { name: 'taskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  assignedUsers: User[];

  @ManyToMany(() => File, file => file.linkedTasks)
  @JoinTable({
    name: 'task_files',
    joinColumn: { name: 'taskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'fileId', referencedColumnName: 'id' }
  })
  attachedFiles: File[];

  @OneToMany(() => KPIRecord, record => record.task)
  kpiRecords: KPIRecord[];
}

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column({ type: 'varchar' })
  originalName: string;

  @Column({ type: 'varchar' })
  fileName: string;

  @Column({ type: 'varchar' })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'varchar' })
  path: string;

  // ผู้ให้บริการจัดเก็บไฟล์: 'local' | 'cloudinary' (optional)
  @Column({ type: 'varchar', nullable: true })
  storageProvider?: string;

  // สำหรับ Cloudinary: เก็บ public_id เพื่อใช้ลบไฟล์จาก Cloudinary ได้แม่นยำ
  @Column({ type: 'varchar', nullable: true })
  storageKey?: string;

  @Column({ type: 'varchar' })
  uploadedBy: string;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ default: false })
  isPublic: boolean;

  // สถานะไฟล์ในเวิร์กโฟลเดอร์: draft/in_progress/completed
  @Column({ type: 'enum', enum: ['in_progress', 'completed'], default: 'in_progress' })
  folderStatus: 'in_progress' | 'completed';

  @CreateDateColumn()
  uploadedAt: Date;

  @ManyToOne(() => Group, group => group.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploadedByUser: User;

  @ManyToMany(() => Task, task => task.attachedFiles)
  linkedTasks: Task[];
}

@Entity('kpi_records')
export class KPIRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  groupId: string;

  @Column()
  taskId: string;

  @Column({
    type: 'enum',
    enum: ['early', 'ontime', 'late', 'overtime']
  })
  type: 'early' | 'ontime' | 'late' | 'overtime';

  @Column({ type: 'int' })
  points: number;

  @Column()
  eventDate: Date;

  @Column()
  weekOf: Date;

  @Column()
  monthOf: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.kpiRecords)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => Task, task => task.kpiRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;
}

@Entity('recurring_tasks')
export class RecurringTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  lineGroupId: string; // ใช้ LINE Group ID เพื่อเรียกใช้ TaskService.createTask ได้เลย

  @Column({ type: 'varchar' })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  // LINE User IDs สำหรับผู้รับผิดชอบ (เริ่มด้วย 'U')
  @Column('text', { array: true, default: '{}' })
  assigneeLineUserIds: string[];

  // LINE User ID ของผู้ตรวจ/ผู้สั่งงาน (อาจเว้นว่างได้)
  @Column({ type: 'varchar', nullable: true })
  reviewerLineUserId?: string;

  @Column({ type: 'boolean', default: true })
  requireAttachment: boolean;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: 'low' | 'medium' | 'high';

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'enum', enum: ['weekly', 'monthly', 'quarterly'] })
  recurrence: 'weekly' | 'monthly' | 'quarterly';

  // สำหรับ weekly: 0-6 (อาทิตย์=0)
  @Column({ type: 'smallint', nullable: true })
  weekDay?: number;

  // สำหรับ monthly: 1-31 (ถ้าเกินจำนวนวันในเดือน จะเลื่อนไปวันสุดท้าย)
  @Column({ type: 'smallint', nullable: true })
  dayOfMonth?: number;

  // เวลาในรูปแบบ 'HH:mm'
  @Column({ type: 'varchar', default: '09:00' })
  timeOfDay: string;

  @Column({ type: 'varchar', default: 'Asia/Bangkok' })
  timezone: string;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'timestamp' })
  nextRunAt: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // เก็บ LINE User ID ของผู้สร้าง template เพื่อ audit
  @Column({ type: 'varchar' })
  createdByLineUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}