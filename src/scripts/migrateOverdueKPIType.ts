import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';

/**
 * Migration Script: เพิ่ม 'overdue' ใน kpi_records_type_enum
 * 
 * ปัญหา: Database บน Railway ไม่มี 'overdue' ใน enum kpi_records_type_enum
 * ทำให้ query ที่ใช้ 'overdue' ล้มเหลว
 */

async function migrateOverdueKPIType(): Promise<void> {
  try {
    console.log('🚀 Starting KPI Type Enum Migration...');
    
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ Database connected');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // ตรวจสอบ enum ปัจจุบัน
      console.log('🔍 Checking current enum values...');
      const enumResult = await queryRunner.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'kpi_records_type_enum'
        )
        ORDER BY enumlabel;
      `);
      
      const currentEnumValues = enumResult.map((row: any) => row.enumlabel);
      console.log('📊 Current enum values:', currentEnumValues);
      
      // ตรวจสอบว่ามี 'overdue' แล้วหรือไม่
      if (currentEnumValues.includes('overdue')) {
        console.log('✅ Enum already contains "overdue" value');
        return;
      }
      
      console.log('🔄 Adding "overdue" to kpi_records_type_enum...');
      
      // เพิ่ม 'overdue' ใน enum
      await queryRunner.query(`
        ALTER TYPE kpi_records_type_enum ADD VALUE 'overdue';
      `);
      
      console.log('✅ Successfully added "overdue" to enum');
      
      // ตรวจสอบผลลัพธ์
      const updatedEnumResult = await queryRunner.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'kpi_records_type_enum'
        )
        ORDER BY enumlabel;
      `);
      
      const updatedEnumValues = updatedEnumResult.map((row: any) => row.enumlabel);
      console.log('🎉 Updated enum values:', updatedEnumValues);
      
    } finally {
      await queryRunner.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    throw error;
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateOverdueKPIType()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateOverdueKPIType };