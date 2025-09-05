import 'reflect-metadata';
import { AppDataSource, initializeDatabase } from '@/utils/database';
import { logger } from '@/utils/logger';

export async function ensureRecurringTasksTable(): Promise<void> {
  let needsClose = false;
  
  try {
    logger.info('🔍 Checking recurring_tasks table...');
    
    // Initialize database if not already initialized
    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
      needsClose = true;
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
      
      if (tableExists[0].exists) {
        logger.info('✅ recurring_tasks table already exists');
        
        // Check table structure
        const columns = await queryRunner.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'recurring_tasks'
          ORDER BY ordinal_position
        `);
        
        logger.info('📋 Table structure:', {
          tableExists: true,
          columnCount: columns.length,
          columns: columns.map((c: any) => `${c.column_name}(${c.data_type})`).join(', ')
        });
        
      } else {
        logger.warn('⚠️ recurring_tasks table does not exist, creating...');
        
        // Force synchronization to create the table
        await AppDataSource.synchronize();
        
        // Verify it was created
        const tableExistsAfter = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'recurring_tasks'
          )
        `);
        
        if (tableExistsAfter[0].exists) {
          logger.info('✅ recurring_tasks table created successfully');
        } else {
          throw new Error('Failed to create recurring_tasks table');
        }
      }
      
    } finally {
      await queryRunner.release();
    }
    
  } catch (error) {
    logger.error('❌ Error ensuring recurring_tasks table:', error);
    throw error;
    
  } finally {
    if (needsClose && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  ensureRecurringTasksTable()
    .then(() => {
      logger.info('🎉 Recurring tasks table check completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Failed to ensure recurring tasks table:', error);
      process.exit(1);
    });
}