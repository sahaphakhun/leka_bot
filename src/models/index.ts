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
    defaultReminders: string[];
    workingHours: {
      start: string;
      end: string;
    };
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

  @Column({ type: 'enum', enum: ['admin', 'member'], default: 'member' })
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
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'],
    default: 'pending'
  })
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

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

  @Column({ type: 'varchar' })
  uploadedBy: string;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ default: false })
  isPublic: boolean;

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

  @ManyToOne(() => Task, task => task.kpiRecords)
  @JoinColumn({ name: 'taskId' })
  task: Task;
}