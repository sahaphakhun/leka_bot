// Database Connection และ Configuration

import { DataSource } from 'typeorm';
import { Group, User, GroupMember, Task, File, KPIRecord, RecurringTask } from '@/models';

// สำหรับ Railway หรือ production environment
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    // Railway PostgreSQL URL format
    return {
      url: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  } else {
    // Local development
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'leka_bot',
    };
  }
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...getDatabaseConfig(),
  entities: [Group, User, GroupMember, Task, File, KPIRecord, RecurringTask],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  synchronize: process.env.NODE_ENV === 'development', // ใช้เฉพาะ development
  logging: process.env.NODE_ENV === 'development',
  extra: {
    // Configuration for connection pool
    max: 20,
    min: 5,
    idle: 10000,
    acquire: 30000,
  },
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    
    // ตรวจสอบว่าตารางหลักมีอยู่หรือไม่
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // อ่านรายการตารางทั้งหมดใน schema public
      const existingTablesResult = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const existingTableNames: string[] = existingTablesResult.map((t: any) => t.table_name);

      // กำหนดรายการตารางที่ระบบต้องมี (รวมตารางเชื่อมความสัมพันธ์)
      const requiredTables = [
        'users',
        'groups',
        'group_members',
        'tasks',
        'task_assignees',
        'task_files',
        'files',
        'kpi_records',
        'recurring_tasks'
      ];

      const hasAllRequired = requiredTables.every(t => existingTableNames.includes(t));

      if (!hasAllRequired) {
        const missing = requiredTables.filter(t => !existingTableNames.includes(t));
        console.log('🔄 Missing tables detected, synchronizing schema...', { missing });

        // สร้าง/อัปเดตสคีมาตาม entities ปัจจุบัน
        await AppDataSource.synchronize();
        console.log('✅ Database schema synchronized successfully');

        // ยืนยันอีกครั้งว่าตารางถูกสร้างครบ
        const finalTables = await queryRunner.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        const finalTableNames = finalTables.map((t: any) => t.table_name);
        const stillMissing = requiredTables.filter(t => !finalTableNames.includes(t));
        if (stillMissing.length > 0) {
          console.error('❌ Missing required tables after synchronize:', stillMissing);
          throw new Error(`Failed to create required tables: ${stillMissing.join(', ')}`);
        }
        console.log('✅ All required tables created successfully');
      } else {
        console.log('✅ All required database tables already exist');

        // ใน development ให้รัน migrations ต่อหากมี
        if (process.env.NODE_ENV === 'development') {
          await AppDataSource.runMigrations();
          console.log('✅ Database migrations completed');
        }
      }
      
    } finally {
      await queryRunner.release();
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
};