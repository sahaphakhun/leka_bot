// Test Database Connection และ Schema Creation
// สำหรับทดสอบการเชื่อมต่อฐานข้อมูลและตรวจสอบตาราง

import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';
import { config } from '@/utils/config';
import { Group, User, Task, File, KPIRecord, GroupMember } from '@/models';

async function testDatabase() {
  console.log('🧪 [TEST] Starting database connection test...');
  console.log('📊 [TEST] Environment:', config.nodeEnv);
  console.log('🔗 [TEST] Database URL:', process.env.DATABASE_URL ? 'PROVIDED' : 'LOCAL');
  
  try {
    // Connect to database
    console.log('🔄 [TEST] Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ [TEST] Database connected successfully');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Test basic connection
      console.log('🧪 [TEST] Testing basic query...');
      const result = await queryRunner.query('SELECT NOW() as current_time');
      console.log('✅ [TEST] Database query successful:', result[0].current_time);
      
      // Check existing tables
      console.log('🔍 [TEST] Checking existing tables...');
      const existingTables = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tableNames = existingTables.map((t: any) => t.table_name);
      console.log('📋 [TEST] Existing tables:', tableNames);
      
      // Expected tables
      const expectedTables = ['users', 'groups', 'tasks', 'files', 'kpi_records', 'task_assignees', 'group_members'];
      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      const extraTables = tableNames.filter(table => !expectedTables.includes(table) && !table.startsWith('typeorm_'));
      
      if (missingTables.length > 0) {
        console.log('⚠️  [TEST] Missing tables:', missingTables);
        console.log('🔄 [TEST] Will be created automatically on next app start');
      }
      
      if (extraTables.length > 0) {
        console.log('ℹ️  [TEST] Additional tables found:', extraTables);
      }
      
      // Test each expected table if exists
      for (const tableName of expectedTables) {
        if (tableNames.includes(tableName)) {
          try {
            const count = await queryRunner.query(`SELECT COUNT(*) FROM ${tableName}`);
            console.log(`📊 [TEST] ${tableName}: ${count[0].count} records`);
          } catch (error) {
            console.log(`❌ [TEST] Error querying ${tableName}:`, error);
          }
        }
      }
      
      // Test TypeORM entities
      console.log('🧪 [TEST] Testing TypeORM entities...');
      try {
        const userRepo = AppDataSource.getRepository(User);
        const groupRepo = AppDataSource.getRepository(Group);
        const taskRepo = AppDataSource.getRepository(Task);
        const fileRepo = AppDataSource.getRepository(File);
        const kpiRepo = AppDataSource.getRepository(KPIRecord);
        const memberRepo = AppDataSource.getRepository(GroupMember);
        
        console.log('✅ [TEST] All entity repositories loaded successfully');
        
        // Test a simple query if tables exist
        if (tableNames.includes('users')) {
          const userCount = await userRepo.count();
          console.log(`📊 [TEST] User repository test: ${userCount} users`);
        }
        
      } catch (error) {
        console.log('⚠️  [TEST] Entity test failed (normal if tables don\'t exist yet):', error);
      }
      
      console.log('');
      console.log('🎉 [TEST] Database test completed successfully!');
      console.log('=====================================');
      
      if (missingTables.length > 0) {
        console.log('💡 [NEXT STEPS]:');
        console.log('1. Run your application normally: npm start');
        console.log('2. The missing tables will be created automatically');
        console.log('3. Or run: npm run db:sync to create tables manually');
      } else {
        console.log('✅ [STATUS]: Database is ready for use!');
      }
      
    } finally {
      await queryRunner.release();
    }
    
  } catch (error) {
    console.error('❌ [TEST] Database test failed:', error);
    
    if (error instanceof Error) {
      console.error('🔍 [TEST] Error details:', {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        detail: (error as any).detail
      });
      
      // Common error suggestions
      if ((error as any).code === 'ENOTFOUND') {
        console.log('💡 [SUGGESTION]: Check your DATABASE_URL or database host');
      } else if ((error as any).code === '28P01') {
        console.log('💡 [SUGGESTION]: Check your database username/password');
      } else if ((error as any).code === '3D000') {
        console.log('💡 [SUGGESTION]: Check your database name');
      } else if ((error as any).code === '42P01') {
        console.log('💡 [SUGGESTION]: Tables don\'t exist yet - they will be created on app start');
      }
    }
    
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 [TEST] Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  testDatabase();
}

export { testDatabase };