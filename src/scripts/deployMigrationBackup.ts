#!/usr/bin/env tsx

/**
 * Backup Deployment Migration Script
 * 
 * This is a TypeScript version of the deployment migration script
 * that's guaranteed to be available in the compiled dist folder.
 * 
 * Usage:
 *   tsx src/scripts/deployMigrationBackup.ts
 *   OR
 *   node dist/scripts/deployMigrationBackup.js
 */

import 'reflect-metadata';
import { initializeDatabase, closeDatabase } from '@/utils/database';
import { comprehensiveMigration } from '@/utils/comprehensiveMigration';
import { logger } from '@/utils/logger';

async function runDeploymentMigration(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('🚀 Starting deployment migration (backup script)...');
    
    // Initialize database
    await initializeDatabase();
    logger.info('✅ Database connected');
    
    // Check if migration is needed
    const needsMigration = await comprehensiveMigration.checkMigrationNeeded();
    
    if (!needsMigration) {
      logger.info('✅ Database schema is already up to date');
      return;
    }
    
    logger.info('📋 Running comprehensive migration...');
    
    // Run comprehensive migration
    await comprehensiveMigration.runComprehensiveMigration();
    
    // Get results
    const results = comprehensiveMigration.getMigrationResults();
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    const duration = Date.now() - startTime;
    
    logger.info('==========================================');
    logger.info('🎉 DEPLOYMENT MIGRATION COMPLETED');
    logger.info('==========================================');
    logger.info(`✅ Duration: ${duration}ms`);
    logger.info(`✅ Successful steps: ${successCount}/${totalCount}`);
    logger.info('✅ System ready for deployment');
    logger.info('==========================================');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('==========================================');
    logger.error('❌ DEPLOYMENT MIGRATION FAILED');
    logger.error('==========================================');
    logger.error(`❌ Duration: ${duration}ms`);
    logger.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger.error('==========================================');
    
    throw error;
    
  } finally {
    // Clean up
    try {
      await closeDatabase();
    } catch (error) {
      logger.warn('⚠️ Failed to close database connection:', error);
    }
  }
}

// Run if called directly
if (require.main === module) {
  runDeploymentMigration()
    .then(() => {
      logger.info('✅ Deployment migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Deployment migration failed:', error);
      process.exit(1);
    });
}

export { runDeploymentMigration };