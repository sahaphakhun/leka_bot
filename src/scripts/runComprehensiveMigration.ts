#!/usr/bin/env tsx

/**
 * Comprehensive Migration Runner
 * 
 * This script runs the comprehensive migration system that handles
 * all data consistency issues and database schema updates.
 * 
 * Usage:
 *   npm run db:migrate-comprehensive
 *   OR
 *   tsx src/scripts/runComprehensiveMigration.ts
 * 
 * The script will:
 * 1. Initialize database connection
 * 2. Run comprehensive migration system
 * 3. Report detailed results
 * 4. Exit with appropriate code
 */

import 'reflect-metadata';
import { initializeDatabase, closeDatabase } from '@/utils/database';
import { comprehensiveMigration } from '@/utils/comprehensiveMigration';
import { logger } from '@/utils/logger';

async function runComprehensiveMigration(): Promise<void> {
  try {
    logger.info('🚀 Starting Comprehensive Migration Runner...');
    logger.info('='.repeat(60));
    
    // Initialize database connection
    logger.info('📡 Connecting to database...');
    await initializeDatabase();
    logger.info('✅ Database connected successfully');
    
    // Check if migration is needed
    logger.info('🔍 Checking if migration is needed...');
    const needsMigration = await comprehensiveMigration.checkMigrationNeeded();
    
    if (!needsMigration) {
      logger.info('✅ Database schema is already up to date');
      logger.info('ℹ️  No migration needed');
      return;
    }
    
    logger.info('📋 Migration is needed - starting comprehensive migration...');
    
    // Run comprehensive migration
    await comprehensiveMigration.runComprehensiveMigration();
    
    // Get and display results
    const results = comprehensiveMigration.getMigrationResults();
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    const failureCount = totalCount - successCount;
    
    logger.info('='.repeat(60));
    logger.info('📊 MIGRATION RESULTS SUMMARY');
    logger.info('='.repeat(60));
    
    if (totalCount > 0) {
      logger.info(`✅ Successful steps: ${successCount}`);
      logger.info(`❌ Failed steps: ${failureCount}`);
      logger.info(`📈 Success rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
      
      logger.info('\n📋 Detailed Results:');
      Object.entries(results).forEach(([step, result]) => {
        const status = result.success ? '✅' : '❌';
        logger.info(`  ${status} ${step}: ${result.message}`);
      });
      
      if (failureCount > 0) {
        logger.warn('\n⚠️  Some migration steps failed. Please review the errors above.');
        logger.warn('💡 You may need to manually resolve these issues or run the migration again.');
      } else {
        logger.info('\n🎉 All migration steps completed successfully!');
      }
    } else {
      logger.info('ℹ️  No migration steps were executed');
    }
    
    logger.info('='.repeat(60));
    
  } catch (error) {
    logger.error('❌ Critical error during migration:', error);
    throw error;
  } finally {
    // Clean up database connection
    try {
      await closeDatabase();
      logger.info('🔌 Database connection closed');
    } catch (error) {
      logger.warn('⚠️  Failed to close database connection:', error);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const startTime = Date.now();
  
  try {
    await runComprehensiveMigration();
    
    const duration = Date.now() - startTime;
    logger.info(`\n✅ Migration completed successfully in ${duration}ms`);
    process.exit(0);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(`\n❌ Migration failed after ${duration}ms`);
    
    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
      
      if (process.env.NODE_ENV === 'development' && error.stack) {
        logger.error('Stack trace:');
        console.error(error.stack);
      }
    }
    
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  logger.warn('🛑 Received SIGINT - shutting down gracefully...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.warn('🛑 Received SIGTERM - shutting down gracefully...');
  process.exit(1);
});

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runComprehensiveMigration };