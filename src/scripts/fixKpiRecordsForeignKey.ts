import { AppDataSource } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * แก้ไข foreign key constraint ของ kpi_records ให้รองรับ CASCADE DELETE
 * เพื่อป้องกัน foreign key constraint violation เมื่อลบ task
 */
export async function fixKpiRecordsForeignKey(): Promise<void> {
  try {
    logger.info('🔄 เริ่มแก้ไข foreign key constraint ของ kpi_records...');
    
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. ลบ foreign key constraint เดิม
      logger.info('🗑️ ลบ foreign key constraint เดิม...');
      await queryRunner.query(`
        ALTER TABLE kpi_records 
        DROP CONSTRAINT IF EXISTS "FK_6b25efaa5b668fd4be03ef8e319"
      `);

      // 2. เพิ่ม foreign key constraint ใหม่พร้อม CASCADE DELETE
      logger.info('➕ เพิ่ม foreign key constraint ใหม่พร้อม CASCADE DELETE...');
      await queryRunner.query(`
        ALTER TABLE kpi_records 
        ADD CONSTRAINT "FK_kpi_records_task_cascade" 
        FOREIGN KEY ("taskId") 
        REFERENCES tasks(id) 
        ON DELETE CASCADE
      `);

      // 3. ตรวจสอบว่าสร้าง constraint สำเร็จ
      const constraints = await queryRunner.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'kpi_records' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'taskId'
      `);

      logger.info('📋 Foreign key constraints ที่มีอยู่:');
      constraints.forEach((constraint: any) => {
        logger.info(`  - ${constraint.constraint_name}: ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name} (DELETE: ${constraint.delete_rule})`);
      });

      await queryRunner.commitTransaction();
      logger.info('✅ แก้ไข foreign key constraint สำเร็จ!');

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    logger.error('❌ เกิดข้อผิดพลาดในการแก้ไข foreign key constraint:', error);
    throw error;
  }
}

// รัน script ถ้าเรียกโดยตรง
if (require.main === module) {
  fixKpiRecordsForeignKey()
    .then(() => {
      logger.info('🎉 Migration เสร็จสิ้น!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration ล้มเหลว:', error);
      process.exit(1);
    });
}
