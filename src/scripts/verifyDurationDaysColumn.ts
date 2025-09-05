#!/usr/bin/env ts-node

/**
 * Verify Duration Days Column Script
 * 
 * This script verifies that the durationDays column exists in the recurring_tasks table
 * and that it can be used properly.
 */

import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

async function verifyDurationDaysColumn(): Promise<void> {
  try {
    logger.info('🔍 Verifying durationDays column in recurring_tasks table...');
    
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
        process.exit(1);
      }
      
      logger.info('✅ recurring_tasks table exists');
      
      // Check if durationDays column exists
      const columnQuery = await queryRunner.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'recurring_tasks' 
        AND column_name = 'durationDays'
      `);
      
      if (columnQuery.length > 0) {
        const columnInfo = columnQuery[0];
        logger.info('✅ durationDays column exists in recurring_tasks table');
        logger.info(`   Column details: ${columnInfo.column_name} (${columnInfo.data_type})`);
        logger.info(`   Nullable: ${columnInfo.is_nullable}`);
        logger.info(`   Default: ${columnInfo.column_default || 'None'}`);
        
        // Test querying the column
        try {
          const testQuery = await queryRunner.query(`
            SELECT COUNT(*) as count FROM recurring_tasks 
            WHERE "durationDays" IS NOT NULL OR "durationDays" IS NULL
          `);
          
          logger.info(`✅ Successfully queried durationDays column. Found ${testQuery[0].count} records`);
        } catch (queryError) {
          logger.error('❌ Failed to query durationDays column:', queryError);
        }
      } else {
        logger.error('❌ durationDays column is MISSING from recurring_tasks table');
        logger.error('💡 Solution: Run "npm run db:ensure-duration-days" to fix this issue');
        process.exit(1);
      }
      
    } catch (error) {
      logger.error('❌ Error during verification:', error);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
    
  } catch (error) {
    logger.error('❌ Failed to verify durationDays column:', error);
    process.exit(1);
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
  verifyDurationDaysColumn()
    .then(() => {
      logger.info('🎉 Duration days column verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Duration days column verification failed:', error);
      process.exit(1);
    });
}

export { verifyDurationDaysColumn };