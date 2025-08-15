// Migration Script: ปรับปรุง Task table ให้รองรับ workflow ใหม่
// รันคำสั่ง: npm run migrate:task-workflow

import { AppDataSource } from '@/utils/database';
import { Task } from '@/models';
import { logger } from '@/utils/logger';

async function migrateTaskWorkflow() {
  try {
    logger.info('🚀 เริ่มต้น migration: ปรับปรุง Task workflow...');
    
    // เชื่อมต่อฐานข้อมูล
    await AppDataSource.initialize();
    logger.info('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    
    const taskRepository = AppDataSource.getRepository(Task);
    
    // ดึงงานทั้งหมด
    const tasks = await taskRepository.find();
    logger.info(`📋 พบงานทั้งหมด ${tasks.length} งาน`);
    
    let updatedCount = 0;
    
    for (const task of tasks) {
      try {
        // ตรวจสอบว่ามี workflow หรือไม่
        if (!task.workflow) {
          task.workflow = {};
        }
        
        // ตรวจสอบและอัปเดต workflow.review
        if (!task.workflow.review) {
          task.workflow.review = {
            reviewerUserId: task.createdBy,
            status: 'not_requested'
          };
        }
        
        // ตรวจสอบและอัปเดต workflow.approval
        if (!task.workflow.approval) {
          task.workflow.approval = {
            creatorUserId: task.createdBy,
            status: 'not_requested'
          };
        }
        
        // ตรวจสอบและอัปเดต workflow.history
        if (!task.workflow.history) {
          task.workflow.history = [];
        }
        
        // เพิ่ม history สำหรับงานที่สร้างแล้ว
        if (task.workflow.history.length === 0) {
          task.workflow.history.push({
            action: 'create',
            byUserId: task.createdBy,
            at: task.createdAt,
            note: 'งานถูกสร้าง'
          });
        }
        
        // อัปเดตสถานะตาม workflow ปัจจุบัน
        if (task.status === 'completed' && task.workflow.review.status === 'approved') {
          task.workflow.approval.status = 'approved';
          task.workflow.approval.approvedAt = task.completedAt;
        }
        
        // บันทึกการเปลี่ยนแปลง
        await taskRepository.save(task);
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          logger.info(`📊 อัปเดตแล้ว ${updatedCount}/${tasks.length} งาน`);
        }
        
      } catch (error) {
        logger.error(`❌ เกิดข้อผิดพลาดในการอัปเดตงาน ${task.id}:`, error);
      }
    }
    
    logger.info(`✅ Migration เสร็จสิ้น! อัปเดตแล้ว ${updatedCount} งาน`);
    
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
  migrateTaskWorkflow()
    .then(() => {
      logger.info('🎉 Migration เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration ล้มเหลว:', error);
      process.exit(1);
    });
}

export { migrateTaskWorkflow };
