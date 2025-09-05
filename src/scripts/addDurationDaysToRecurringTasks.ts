// Migration Script: เพิ่มคอลัมน์ durationDays ในตาราง recurring_tasks
// รันคำสั่ง: npm run migrate:add-duration-days

import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

async function addDurationDaysToRecurringTasks() {
  try {
    logger.info('🚀 เริ่มต้น migration: เพิ่มคอลัมน์ durationDays ในตาราง recurring_tasks...');
    
    // เชื่อมต่อฐานข้อมูล
    await AppDataSource.initialize();
    logger.info('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // เริ่ม transaction
      await queryRunner.startTransaction();
      logger.info('🔄 เริ่ม transaction...');
      
      // ตรวจสอบว่าตาราง recurring_tasks มีอยู่หรือไม่
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'recurring_tasks'
        )
      `);
      
      if (!tableExists[0].exists) {
        logger.warn('⚠️ ไม่พบตาราง recurring_tasks กำลังสร้างตาราง...');
        
        // สร้างตาราง recurring_tasks
        await queryRunner.query(`
          CREATE TABLE recurring_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "lineGroupId" VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            description TEXT,
            "assigneeLineUserIds" TEXT[] DEFAULT '{}',
            "reviewerLineUserId" VARCHAR,
            "requireAttachment" BOOLEAN DEFAULT true,
            priority VARCHAR(10) DEFAULT 'medium',
            tags TEXT[] DEFAULT '{}',
            recurrence VARCHAR(20) NOT NULL,
            "weekDay" SMALLINT,
            "dayOfMonth" SMALLINT,
            "timeOfDay" VARCHAR(5) DEFAULT '09:00',
            timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
            "durationDays" INTEGER DEFAULT 7,
            "totalInstances" INTEGER DEFAULT 0,
            "lastRunAt" TIMESTAMP,
            "nextRunAt" TIMESTAMP NOT NULL,
            active BOOLEAN DEFAULT true,
            "createdByLineUserId" VARCHAR NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);
        
        logger.info('✅ สร้างตาราง recurring_tasks สำเร็จ');
      } else {
        // ตรวจสอบว่าคอลัมน์ durationDays มีอยู่หรือไม่
        const existingColumns = await queryRunner.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'recurring_tasks' 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        logger.info('📋 คอลัมน์ที่มีอยู่ในตาราง recurring_tasks:');
        existingColumns.forEach((col: any) => {
          logger.info(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
        });
        
        const hasDurationDays = existingColumns.some((col: any) => col.column_name === 'durationDays');
        
        if (!hasDurationDays) {
          // เพิ่มคอลัมน์ durationDays
          await queryRunner.query(`
            ALTER TABLE recurring_tasks 
            ADD COLUMN "durationDays" INTEGER DEFAULT 7 NOT NULL
          `);
          
          logger.info('✅ เพิ่มคอลัมน์ durationDays สำเร็จ');
          
          // เพิ่ม comment
          await queryRunner.query(`
            COMMENT ON COLUMN recurring_tasks."durationDays" IS 'จำนวนวันที่ให้ทำงาน'
          `);
        } else {
          logger.info('ℹ️ คอลัมน์ durationDays มีอยู่แล้ว');
        }
      }
      
      // Commit transaction
      await queryRunner.commitTransaction();
      logger.info('✅ Commit transaction สำเร็จ');
      
      logger.info('🎉 Migration เสร็จสิ้น! เพิ่มคอลัมน์ durationDays ในตาราง recurring_tasks');
      
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
  addDurationDaysToRecurringTasks()
    .then(() => {
      logger.info('🎉 Migration เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration ล้มเหลว:', error);
      process.exit(1);
    });
}

export { addDurationDaysToRecurringTasks };