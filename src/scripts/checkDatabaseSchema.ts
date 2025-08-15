// Script: ตรวจสอบโครงสร้างฐานข้อมูลปัจจุบัน
// รันคำสั่ง: npm run db:check-schema

import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

async function checkDatabaseSchema() {
  try {
    logger.info('🔍 เริ่มต้นตรวจสอบโครงสร้างฐานข้อมูล...');
    
    // เชื่อมต่อฐานข้อมูล
    await AppDataSource.initialize();
    logger.info('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // ตรวจสอบตารางที่มีอยู่
      const existingTables = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      logger.info('📋 ตารางที่มีอยู่ในฐานข้อมูล:');
      existingTables.forEach((table: any) => {
        logger.info(`   - ${table.table_name}`);
      });
      
      // ตรวจสอบโครงสร้างตาราง tasks
      if (existingTables.some((t: any) => t.table_name === 'tasks')) {
        logger.info('\n🔍 ตรวจสอบโครงสร้างตาราง tasks:');
        
        const taskColumns = await queryRunner.query(`
          SELECT 
            column_name, 
            data_type, 
            is_nullable, 
            column_default,
            ordinal_position
          FROM information_schema.columns 
          WHERE table_name = 'tasks' 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        logger.info('📊 คอลัมน์ในตาราง tasks:');
        taskColumns.forEach((col: any) => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          logger.info(`   ${col.ordinal_position}. ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`);
        });
        
        // ตรวจสอบคอลัมน์ที่หายไป
        const expectedColumns = [
          'id', 'title', 'description', 'status', 'priority', 'dueTime', 'startTime',
          'createdAt', 'updatedAt', 'createdBy', 'groupId', 'tags', 'customReminders',
          'completedAt', 'submittedAt', 'reviewedAt', 'approvedAt', 'requireAttachment',
          'workflow', 'googleEventId', 'remindersSent'
        ];
        
        const existingColumnNames = taskColumns.map((col: any) => col.column_name);
        const missingColumns = expectedColumns.filter(col => !existingColumnNames.includes(col));
        
        if (missingColumns.length > 0) {
          logger.warn('\n⚠️ คอลัมน์ที่หายไป:');
          missingColumns.forEach(col => {
            logger.warn(`   - ${col}`);
          });
          
          logger.info('\n💡 แนะนำให้รัน migration: npm run db:migrate-add-columns');
        } else {
          logger.info('\n✅ คอลัมน์ทั้งหมดครบถ้วน');
        }
        
        // ตรวจสอบ foreign keys
        const foreignKeys = await queryRunner.query(`
          SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name='tasks'
        `);
        
        if (foreignKeys.length > 0) {
          logger.info('\n🔗 Foreign Keys ในตาราง tasks:');
          foreignKeys.forEach((fk: any) => {
            logger.info(`   - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          });
        }
        
      } else {
        logger.warn('⚠️ ไม่พบตาราง tasks ในฐานข้อมูล');
      }
      
      // ตรวจสอบตารางอื่นๆ ที่เกี่ยวข้อง
      const relatedTables = ['users', 'groups', 'files', 'kpi_records'];
      for (const tableName of relatedTables) {
        if (existingTables.some((t: any) => t.table_name === tableName)) {
          const columnCount = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_name = '${tableName}' 
            AND table_schema = 'public'
          `);
          logger.info(`📊 ตาราง ${tableName}: ${columnCount[0].count} คอลัมน์`);
        }
      }
      
    } finally {
      await queryRunner.release();
    }
    
  } catch (error) {
    logger.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
    throw error;
    
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('🔌 ปิดการเชื่อมต่อฐานข้อมูล');
    }
  }
}

// รัน script ถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  checkDatabaseSchema()
    .then(() => {
      logger.info('🎉 การตรวจสอบเสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ การตรวจสอบล้มเหลว:', error);
      process.exit(1);
    });
}

export { checkDatabaseSchema };
