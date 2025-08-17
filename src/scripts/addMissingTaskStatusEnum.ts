// Script สำหรับเพิ่ม enum ที่ขาดหายไปในฐานข้อมูล
// รัน: npm run ts-node src/scripts/addMissingTaskStatusEnum.ts

import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

async function addMissingTaskStatusEnum() {
  try {
    console.log('🔄 เริ่มต้นการเพิ่ม enum ที่ขาดหายไป...');
    
    // เชื่อมต่อฐานข้อมูล
    await AppDataSource.initialize();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // ตรวจสอบ enum ที่มีอยู่
      const existingEnums = await queryRunner.query(`
        SELECT unnest(enum_range(NULL::tasks_status_enum)) as enum_value;
      `);
      
      console.log('📋 Enum ที่มีอยู่:', existingEnums.map((e: any) => e.enum_value));

      // ตรวจสอบ enum ที่ต้องการ
      const requiredEnums = [
        'pending',
        'in_progress', 
        'submitted',
        'reviewed',
        'approved',
        'completed',
        'rejected',
        'cancelled',
        'overdue'
      ];

      const missingEnums = requiredEnums.filter(required => 
        !existingEnums.some((existing: any) => existing.enum_value === required)
      );

      if (missingEnums.length === 0) {
        console.log('✅ Enum ทั้งหมดมีอยู่แล้ว ไม่ต้องเพิ่ม');
        return;
      }

      console.log('❌ Enum ที่ขาดหายไป:', missingEnums);

      // เพิ่ม enum ที่ขาดหายไป
      for (const enumValue of missingEnums) {
        console.log(`➕ เพิ่ม enum: ${enumValue}`);
        
        // ใช้ ALTER TYPE เพื่อเพิ่ม enum value
        await queryRunner.query(`
          ALTER TYPE tasks_status_enum ADD VALUE IF NOT EXISTS '${enumValue}';
        `);
        
        console.log(`✅ เพิ่ม enum ${enumValue} สำเร็จ`);
      }

      // ตรวจสอบอีกครั้ง
      const updatedEnums = await queryRunner.query(`
        SELECT unnest(enum_range(NULL::tasks_status_enum)) as enum_value;
      `);
      
      console.log('📋 Enum หลังอัปเดต:', updatedEnums.map((e: any) => e.enum_value));

    } finally {
      await queryRunner.release();
    }

    console.log('🎉 เพิ่ม enum สำเร็จแล้ว!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

// รัน script
if (require.main === module) {
  addMissingTaskStatusEnum()
    .then(() => {
      console.log('✅ Script เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script ล้มเหลว:', error);
      process.exit(1);
    });
}
