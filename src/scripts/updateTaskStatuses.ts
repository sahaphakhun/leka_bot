// Script สำหรับอัปเดตสถานะงานที่มีอยู่
// รัน: npm run ts-node src/scripts/updateTaskStatuses.ts

import { AppDataSource } from '@/utils/database';
import { Task } from '@/models';
import { logger } from '@/utils/logger';

async function updateTaskStatuses() {
  try {
    console.log('🔄 เริ่มต้นการอัปเดตสถานะงาน...');
    
    // เชื่อมต่อฐานข้อมูล
    await AppDataSource.initialize();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    const taskRepository = AppDataSource.getRepository(Task);

    // ดึงงานทั้งหมด
    const tasks = await taskRepository.find();
    console.log(`📋 พบงานทั้งหมด ${tasks.length} งาน`);

    let updatedCount = 0;

    for (const task of tasks) {
      let needsUpdate = false;
      let newStatus = task.status;

      // ตรวจสอบและแก้ไขสถานะที่ไม่ถูกต้อง
      if (task.status === 'submitted' && task.workflow?.review?.status === 'approved') {
        // งานที่ส่งแล้วและผ่านการตรวจแล้ว ควรเป็น 'reviewed'
        newStatus = 'reviewed';
        needsUpdate = true;
        console.log(`🔄 อัปเดตงาน ${task.id}: submitted → reviewed`);
      } else if (task.status === 'submitted' && task.workflow?.review?.status === 'pending') {
        // งานที่ส่งแล้วแต่ยังไม่ผ่านการตรวจ เก็บเป็น 'submitted'
        console.log(`ℹ️ งาน ${task.id}: เก็บสถานะ submitted (รอการตรวจ)`);
      } else if (task.status === 'completed') {
        // งานที่เสร็จแล้ว เก็บเป็น 'completed'
        console.log(`ℹ️ งาน ${task.id}: เก็บสถานะ completed`);
      } else if (task.status === 'pending' || task.status === 'in_progress') {
        // งานที่ยังไม่เสร็จ เก็บสถานะเดิม
        console.log(`ℹ️ งาน ${task.id}: เก็บสถานะ ${task.status}`);
      }

      if (needsUpdate) {
        task.status = newStatus as any;
        await taskRepository.save(task);
        updatedCount++;
      }
    }

    console.log(`✅ อัปเดตสถานะงานเสร็จสิ้น: ${updatedCount} งาน`);

    // แสดงสถิติสถานะงาน
    const statusStats = await taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    console.log('📊 สถิติสถานะงาน:');
    statusStats.forEach((stat: any) => {
      console.log(`  ${stat.status}: ${stat.count} งาน`);
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

// รัน script
if (require.main === module) {
  updateTaskStatuses()
    .then(() => {
      console.log('✅ Script เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script ล้มเหลว:', error);
      process.exit(1);
    });
}
