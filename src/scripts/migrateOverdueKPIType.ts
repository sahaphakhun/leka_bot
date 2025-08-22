import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';

/**
 * Migration script to add 'overdue' to existing KPI record enum type
 * Run this after updating the code to support the new overdue KPI system
 */
async function migrateOverdueKPIType() {
  console.log('🔄 Starting KPI overdue type migration...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Check if the enum already includes 'overdue'
      const enumCheck = await queryRunner.query(`
        SELECT enumlabel 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'kpi_records_type_enum' 
        AND enumlabel = 'overdue'
      `);

      if (enumCheck.length > 0) {
        console.log('ℹ️ Overdue type already exists in KPI enum');
        return;
      }

      // Add 'overdue' to the existing enum
      await queryRunner.query(`
        ALTER TYPE kpi_records_type_enum ADD VALUE 'overdue'
      `);

      console.log('✅ Successfully added "overdue" type to KPI records enum');

      // Optional: Add the new overdue scoring to config if needed
      console.log('📝 Make sure to update your config.ts with:');
      console.log('   kpiScoring: { ..., overdue: 0 }');

    } finally {
      await queryRunner.release();
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    
    if (error?.message?.includes('already exists')) {
      console.log('ℹ️ Migration already applied or enum value exists');
    } else {
      process.exitCode = 1;
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  migrateOverdueKPIType();
}

export { migrateOverdueKPIType };