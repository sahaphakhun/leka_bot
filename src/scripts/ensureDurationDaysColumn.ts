#!/usr/bin/env ts-node

/**
 * Ensure Duration Days Column Script
 * 
 * This script specifically ensures that the durationDays column exists in the recurring_tasks table.
 * It's a more focused approach than the comprehensive migration for cases where only this column is missing.
 */

import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

async function ensureDurationDaysColumn(): Promise<void> {
  try {
    logger.info('🔍 Checking for durationDays column in recurring_tasks table...');
    
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ Database connected');
    }
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Start transaction
      await queryRunner.startTransaction();
      logger.info('🔄 Transaction started');
      
      // Check if recurring_tasks table exists
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'recurring_tasks'
        )
      `);
      
      if (!tableExists[0].exists) {
        throw new Error('recurring_tasks table does not exist');
      }
      
      // Check if durationDays column exists
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'recurring_tasks' 
          AND column_name = 'durationDays'
        )
      `);
      
      if (columnExists[0].exists) {
        logger.info('✅ durationDays column already exists in recurring_tasks table');
      } else {
        logger.warn('⚠️ durationDays column missing, adding it now...');
        
        // Add the durationDays column
        await queryRunner.query(`
          ALTER TABLE recurring_tasks 
          ADD COLUMN "durationDays" INTEGER NOT NULL DEFAULT 7
        `);
        
        logger.info('✅ Added durationDays column to recurring_tasks table with default value 7');
        
        // Add comment for documentation
        await queryRunner.query(`
          COMMENT ON COLUMN recurring_tasks."durationDays" IS 'Number of days to complete the task'
        `);
        
        logger.info('✅ Added comment to durationDays column');
      }
      
      // Commit transaction
      await queryRunner.commitTransaction();
      logger.info('✅ Transaction committed successfully');
      
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      logger.error('❌ Transaction rolled back due to error:', error);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
    
  } catch (error) {
    logger.error('❌ Failed to ensure durationDays column:', error);
    throw error;
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  ensureDurationDaysColumn()
    .then(() => {
      logger.info('🎉 Duration days column check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Failed to ensure duration days column:', error);
      process.exit(1);
    });
}

export { ensureDurationDaysColumn };