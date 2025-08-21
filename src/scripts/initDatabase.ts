// Database Initialization Script
// สำหรับสร้าง tables และ initial data

import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';
import { config } from '@/utils/config';
import { QueryRunner } from 'typeorm';

async function runCustomMigrations(queryRunner: QueryRunner) {
  console.log('🔧 [MIGRATION] Starting custom migrations...');
  
  try {
    // Migration 1: Add attachment_type column to files table
    console.log('🔧 [MIGRATION] Checking attachment_type column...');
    
    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' AND column_name = 'attachment_type'
    `);
    
    if (columnExists.length === 0) {
      console.log('🔧 [MIGRATION] Adding attachment_type column...');
      
      await queryRunner.query(`
        ALTER TABLE files 
        ADD COLUMN attachment_type VARCHAR(20) 
        CHECK (attachment_type IN ('initial', 'submission'))
      `);
      
      console.log('✅ [MIGRATION] attachment_type column added');
      
      // Add index for better performance
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_files_attachment_type 
        ON files(attachment_type)
      `);
      
      console.log('✅ [MIGRATION] Index created for attachment_type');
    } else {
      console.log('✅ [MIGRATION] attachment_type column already exists');
    }
    
    // Migration 2: Update existing files (optional)
    console.log('🔧 [MIGRATION] Checking for files without attachment_type...');
    
    const filesWithoutType = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM files 
      WHERE attachment_type IS NULL
    `);
    
    const count = parseInt(filesWithoutType[0]?.count || '0');
    if (count > 0) {
      console.log(`🔧 [MIGRATION] Found ${count} files without attachment_type, setting as 'initial'...`);
      
      await queryRunner.query(`
        UPDATE files 
        SET attachment_type = 'initial' 
        WHERE attachment_type IS NULL
      `);
      
      console.log('✅ [MIGRATION] Updated existing files');
    } else {
      console.log('✅ [MIGRATION] All files have attachment_type');
    }
    
    // Verify migration
    const verifyResult = await queryRunner.query(`
      SELECT 
        COUNT(*) as total_files,
        COUNT(attachment_type) as files_with_type,
        attachment_type
      FROM files 
      GROUP BY attachment_type
    `);
    
    console.log('📊 [MIGRATION] Migration verification:', verifyResult);
    
  } catch (error) {
    console.error('❌ [MIGRATION] Migration failed:', error);
    throw error;
  }
}

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
    
    // Run custom migrations
    console.log('🔄 [INIT] Running custom migrations...');
    await runCustomMigrations(queryRunner);
    console.log('✅ [INIT] Custom migrations completed');
    
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