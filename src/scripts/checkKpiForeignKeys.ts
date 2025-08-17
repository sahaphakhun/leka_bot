import { AppDataSource } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * ตรวจสอบสถานะของ foreign key constraints ในตาราง kpi_records
 */
export async function checkKpiForeignKeys(): Promise<void> {
  try {
    logger.info('🔍 ตรวจสอบ foreign key constraints ของตาราง kpi_records...');
    
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // ตรวจสอบ foreign key constraints ทั้งหมด
      const constraints = await queryRunner.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'kpi_records' 
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY kcu.column_name
      `);

      if (constraints.length === 0) {
        logger.warn('⚠️ ไม่พบ foreign key constraints ในตาราง kpi_records');
        return;
      }

      logger.info(`📋 พบ foreign key constraints ${constraints.length} รายการ:`);
      constraints.forEach((constraint: any) => {
        const status = constraint.delete_rule === 'CASCADE' ? '✅' : '❌';
        logger.info(`${status} ${constraint.constraint_name}:`);
        logger.info(`   ตาราง: ${constraint.table_name}.${constraint.column_name}`);
        logger.info(`   อ้างอิง: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
        logger.info(`   DELETE RULE: ${constraint.delete_rule || 'NO ACTION'}`);
        logger.info(`   UPDATE RULE: ${constraint.update_rule || 'NO ACTION'}`);
        logger.info('');
      });

      // ตรวจสอบ taskId constraint โดยเฉพาะ
      const taskConstraint = constraints.find((c: any) => c.column_name === 'taskId');
      if (taskConstraint) {
        if (taskConstraint.delete_rule === 'CASCADE') {
          logger.info('✅ taskId foreign key constraint รองรับ CASCADE DELETE แล้ว');
        } else {
          logger.warn('⚠️ taskId foreign key constraint ยังไม่รองรับ CASCADE DELETE');
          logger.warn('   ควรรัน migration script เพื่อแก้ไข');
        }
      }

      // ตรวจสอบจำนวน KPI records ที่มีอยู่
      const kpiCount = await queryRunner.query(`
        SELECT COUNT(*) as total_count FROM kpi_records
      `);
      logger.info(`📊 จำนวน KPI records ทั้งหมด: ${kpiCount[0].total_count}`);

      // ตรวจสอบ orphaned KPI records (ถ้ามี)
      const orphanedCount = await queryRunner.query(`
        SELECT COUNT(*) as orphaned_count 
        FROM kpi_records kr
        LEFT JOIN tasks t ON kr."taskId" = t.id
        WHERE t.id IS NULL
      `);
      
      if (orphanedCount[0].orphaned_count > 0) {
        logger.warn(`⚠️ พบ orphaned KPI records: ${orphanedCount[0].orphaned_count} รายการ`);
        logger.warn('   ควรลบ orphaned records เหล่านี้ก่อนรัน migration');
      } else {
        logger.info('✅ ไม่พบ orphaned KPI records');
      }

    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    logger.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ foreign key constraints:', error);
    throw error;
  }
}

// รัน script ถ้าเรียกโดยตรง
if (require.main === module) {
  checkKpiForeignKeys()
    .then(() => {
      logger.info('🎉 การตรวจสอบเสร็จสิ้น!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 การตรวจสอบล้มเหลว:', error);
      process.exit(1);
    });
}
