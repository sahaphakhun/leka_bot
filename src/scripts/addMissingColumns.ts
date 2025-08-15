// Migration Script: เพิ่มคอลัมน์ที่หายไปในตาราง tasks
// รันคำสั่ง: npm run migrate:add-columns

import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

async function addMissingColumns() {
  try {
    logger.info('🚀 เริ่มต้น migration: เพิ่มคอลัมน์ที่หายไปในตาราง tasks...');
    
    // เชื่อมต่อฐานข้อมูล
    await AppDataSource.initialize();
    logger.info('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // เริ่ม transaction
      await queryRunner.startTransaction();
      logger.info('🔄 เริ่ม transaction...');
      
      // ตรวจสอบคอลัมน์ที่มีอยู่ในตาราง tasks
      const existingColumns = await queryRunner.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      logger.info('📋 คอลัมน์ที่มีอยู่ในตาราง tasks:');
      existingColumns.forEach((col: any) => {
        logger.info(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      const columnNames = existingColumns.map((col: any) => col.column_name);
      
      // เพิ่มคอลัมน์ที่หายไป
      const missingColumns = [
        {
          name: 'submittedAt',
          type: 'TIMESTAMP',
          nullable: true,
          comment: 'เวลาส่งงาน'
        },
        {
          name: 'reviewedAt',
          type: 'TIMESTAMP',
          nullable: true,
          comment: 'เวลาตรวจสอบ'
        },
        {
          name: 'approvedAt',
          type: 'TIMESTAMP',
          nullable: true,
          comment: 'เวลาอนุมัติ'
        },
        {
          name: 'requireAttachment',
          type: 'BOOLEAN',
          nullable: false,
          defaultValue: 'false',
          comment: 'บังคับให้ต้องมีไฟล์แนบเมื่อส่งงาน'
        },
        {
          name: 'workflow',
          type: 'JSONB',
          nullable: false,
          defaultValue: '{}',
          comment: 'ข้อมูลเวิร์กโฟลว์การส่งงาน/ตรวจงาน/อนุมัติ'
        }
      ];
      
      let addedCount = 0;
      
      for (const column of missingColumns) {
        if (!columnNames.includes(column.name)) {
          try {
            let sql = `ALTER TABLE tasks ADD COLUMN "${column.name}" ${column.type}`;
            
            if (column.nullable === false) {
              sql += ' NOT NULL';
            }
            
            if (column.defaultValue) {
              sql += ` DEFAULT ${column.defaultValue}`;
            }
            
            await queryRunner.query(sql);
            
            // เพิ่ม comment
            await queryRunner.query(`
              COMMENT ON COLUMN tasks."${column.name}" IS '${column.comment}'
            `);
            
            logger.info(`✅ เพิ่มคอลัมน์ ${column.name} สำเร็จ`);
            addedCount++;
            
          } catch (error) {
            logger.error(`❌ ไม่สามารถเพิ่มคอลัมน์ ${column.name}:`, error);
            throw error;
          }
        } else {
          logger.info(`ℹ️ คอลัมน์ ${column.name} มีอยู่แล้ว`);
        }
      }
      
      // อัปเดตข้อมูลในคอลัมน์ workflow สำหรับงานที่มีอยู่
      if (columnNames.includes('workflow')) {
        logger.info('🔄 อัปเดตข้อมูล workflow สำหรับงานที่มีอยู่...');
        
        const tasks = await queryRunner.query('SELECT id, "createdBy", "createdAt", status FROM tasks');
        logger.info(`📋 พบงานทั้งหมด ${tasks.length} งาน`);
        
        for (const task of tasks) {
          try {
            // สร้าง workflow เริ่มต้น
            const workflow = {
              review: {
                reviewerUserId: task.createdBy,
                status: 'not_requested'
              },
              approval: {
                creatorUserId: task.createdBy,
                status: 'not_requested'
              },
              history: [
                {
                  action: 'create',
                  byUserId: task.createdBy,
                  at: task.createdAt,
                  note: 'งานถูกสร้าง'
                }
              ]
            };
            
            // อัปเดตสถานะตามข้อมูลที่มีอยู่
            if (task.status === 'completed') {
              workflow.review.status = 'approved';
              workflow.approval.status = 'approved';
            }
            
            await queryRunner.query(`
              UPDATE tasks 
              SET workflow = $1::jsonb 
              WHERE id = $2
            `, [JSON.stringify(workflow), task.id]);
            
          } catch (error) {
            logger.error(`❌ ไม่สามารถอัปเดต workflow สำหรับงาน ${task.id}:`, error);
          }
        }
        
        logger.info('✅ อัปเดต workflow เสร็จสิ้น');
      }
      
      // Commit transaction
      await queryRunner.commitTransaction();
      logger.info('✅ Commit transaction สำเร็จ');
      
      // ตรวจสอบคอลัมน์หลังจากเพิ่ม
      const finalColumns = await queryRunner.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      logger.info('📋 คอลัมน์หลังจากเพิ่ม:');
      finalColumns.forEach((col: any) => {
        logger.info(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      logger.info(`🎉 Migration เสร็จสิ้น! เพิ่มคอลัมน์แล้ว ${addedCount} คอลัมน์`);
      
    } catch (error) {
      // Rollback ถ้าเกิดข้อผิดพลาด
      await queryRunner.rollbackTransaction();
      logger.error('❌ Rollback transaction เนื่องจากเกิดข้อผิดพลาด:', error);
      throw error;
      
    } finally {
      // ปิด query runner
      await queryRunner.release();
    }
    
  } catch (error) {
    logger.error('❌ เกิดข้อผิดพลาดในการ migration:', error);
    throw error;
    
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('🔌 ปิดการเชื่อมต่อฐานข้อมูล');
    }
  }
}

// รัน migration ถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  addMissingColumns()
    .then(() => {
      logger.info('🎉 Migration เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration ล้มเหลว:', error);
      process.exit(1);
    });
}

export { addMissingColumns };
