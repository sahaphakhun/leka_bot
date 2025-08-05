// Database Initialization Script
// สำหรับสร้าง tables และ initial data

import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';
import { config } from '@/utils/config';

async function initializeDatabase() {
  try {
    console.log('🔄 [INIT] Initializing database...');
    console.log('📊 [INIT] Environment:', config.nodeEnv);
    
    // Connect to database
    await AppDataSource.initialize();
    console.log('✅ [INIT] Database connected');
    
    // Get list of existing tables
    const queryRunner = AppDataSource.createQueryRunner();
    const existingTables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 [INIT] Existing tables:', existingTables.map((t: any) => t.table_name));
    
    // Run synchronization to create/update tables
    console.log('🔄 [INIT] Synchronizing schema...');
    await AppDataSource.synchronize();
    console.log('✅ [INIT] Schema synchronized');
    
    // Check final tables
    const finalTables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 [INIT] Final tables:', finalTables.map((t: any) => t.table_name));
    
    // Expected tables
    const expectedTables = ['users', 'groups', 'tasks', 'files', 'kpi_records', 'task_assignees'];
    const missingTables = expectedTables.filter(table => 
      !finalTables.some((t: any) => t.table_name === table)
    );
    
    if (missingTables.length > 0) {
      console.error('❌ [INIT] Missing tables:', missingTables);
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }
    
    console.log('✅ [INIT] All required tables are present');
    
    // Test basic queries
    console.log('🧪 [INIT] Testing basic queries...');
    
    const userCount = await queryRunner.query('SELECT COUNT(*) FROM users');
    const groupCount = await queryRunner.query('SELECT COUNT(*) FROM groups');
    const taskCount = await queryRunner.query('SELECT COUNT(*) FROM tasks');
    
    console.log('📊 [INIT] Current data:', {
      users: userCount[0]?.count || 0,
      groups: groupCount[0]?.count || 0,
      tasks: taskCount[0]?.count || 0
    });
    
    await queryRunner.release();
    await AppDataSource.destroy();
    
    console.log('🎉 [INIT] Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ [INIT] Database initialization failed:', error);
    
    if (error instanceof Error) {
      console.error('🔍 [INIT] Error details:', {
        message: error.message,
        code: (error as any).code,
        detail: (error as any).detail,
        stack: error.stack
      });
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };