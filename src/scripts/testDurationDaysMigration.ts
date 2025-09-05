#!/usr/bin/env ts-node

/**
 * Test Duration Days Migration Script
 * 
 * This script tests whether the durationDays column exists and works correctly.
 */

import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

async function testDurationDaysMigration(): Promise<void> {
  try {
    logger.info('🔍 Testing durationDays column in recurring_tasks table...');
    
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ Database connected');
    }
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Check if recurring_tasks table exists
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'recurring_tasks'
        )
      `);
      
      if (!tableExists[0].exists) {
        logger.error('❌ recurring_tasks table does not exist');
        return;
      }
      
      logger.info('✅ recurring_tasks table exists');
      
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
        logger.info('✅ durationDays column exists in recurring_tasks table');
        
        // Test inserting a record with durationDays
        try {
          const result = await queryRunner.query(`
            INSERT INTO recurring_tasks (
              id, "lineGroupId", title, "assigneeLineUserIds", recurrence, 
              "timeOfDay", timezone, "durationDays", "nextRunAt", 
              "createdByLineUserId", "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid(), 'test-group-id', 'Test Task', '{}', 'weekly',
              '09:00', 'Asia/Bangkok', 7, NOW(),
              'test-user-id', NOW(), NOW()
            ) RETURNING "durationDays"
          `);
          
          if (result && result[0] && result[0].durationDays === 7) {
            logger.info('✅ Successfully inserted record with durationDays column');
            
            // Clean up test record
            await queryRunner.query(`
              DELETE FROM recurring_tasks 
              WHERE title = 'Test Task' AND "lineGroupId" = 'test-group-id'
            `);
            
            logger.info('✅ Test record cleaned up');
          } else {
            logger.error('❌ Failed to insert record with durationDays column');
          }
        } catch (insertError) {
          logger.error('❌ Failed to insert test record:', insertError);
        }
      } else {
        logger.error('❌ durationDays column is MISSING from recurring_tasks table');
        logger.error('💡 Run "npm run db:ensure-duration-days" to fix this issue');
      }
      
    } catch (error) {
      logger.error('❌ Error during test:', error);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
    
  } catch (error) {
    logger.error('❌ Failed to test durationDays column:', error);
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
  testDurationDaysMigration()
    .then(() => {
      logger.info('🎉 Duration days column test completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Duration days column test failed:', error);
      process.exit(1);
    });
}

export { testDurationDaysMigration };