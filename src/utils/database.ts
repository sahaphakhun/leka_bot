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
      // เช็คว่าตาราง tasks มีอยู่หรือไม่ (ใช้เป็นตัวแทนตารางหลัก)
      const tablesResult = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tasks'
      `);
      
      const hasTasksTable = tablesResult.length > 0;
      
      if (!hasTasksTable) {
        console.log('🔄 Tables not found, creating database schema...');
        
        // สร้างตารางทั้งหมดโดยใช้ synchronize
        await AppDataSource.synchronize();
        console.log('✅ Database schema synchronized successfully');
        
        // ตรวจสอบตารางที่ถูกสร้าง
        const finalTables = await queryRunner.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        
        console.log('📋 Created tables:', finalTables.map((t: any) => t.table_name));
        
        // ตรวจสอบตารางที่จำเป็น
        const expectedTables = ['users', 'groups', 'tasks', 'files', 'kpi_records', 'task_assignees', 'group_members'];
        const createdTableNames = finalTables.map((t: any) => t.table_name);
        const missingTables = expectedTables.filter(table => !createdTableNames.includes(table));
        
        if (missingTables.length > 0) {
          console.error('❌ Missing required tables:', missingTables);
          throw new Error(`Failed to create required tables: ${missingTables.join(', ')}`);
        }
        
        console.log('✅ All required tables created successfully');
      } else {
        console.log('✅ Database tables already exist');
        
        // ใน development ยังคงรัน migrations
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