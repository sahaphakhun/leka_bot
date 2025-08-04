// Database Connection และ Configuration

import { DataSource } from 'typeorm';
import { Group, User, GroupMember, Task, File, KPIRecord } from '@/models';

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
  entities: [Group, User, GroupMember, Task, File, KPIRecord],
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
    
    if (process.env.NODE_ENV === 'development') {
      // Run migrations in development
      await AppDataSource.runMigrations();
      console.log('✅ Database migrations completed');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
};