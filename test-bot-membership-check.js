#!/usr/bin/env node

/**
 * สคริปต์ทดสอบการตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่ม
 * ใช้สำหรับทดสอบฟังก์ชันใหม่ที่เพิ่มเข้ามา
 */

const { TaskService } = require('./dist/services/TaskService');
const { LineService } = require('./dist/services/LineService');

async function testBotMembershipCheck() {
  console.log('🤖 เริ่มทดสอบการตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่ม...\n');

  try {
    // สร้าง instance ของ services
    const taskService = new TaskService();
    const lineService = new LineService();

    // ทดสอบ LINE Bot connection
    console.log('1️⃣ ทดสอบการเชื่อมต่อ LINE Bot...');
    try {
      await lineService.initialize();
      console.log('✅ LINE Bot connection สำเร็จ\n');
    } catch (error) {
      console.log('❌ LINE Bot connection ล้มเหลว:', error.message);
      console.log('⚠️  ตรวจสอบ LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET\n');
      return;
    }

    // ตัวอย่าง Group ID สำหรับทดสอบ (ต้องเป็น Group ID จริง)
    const testGroupId = process.env.TEST_GROUP_ID || 'C5d6c442ec0b3287f71787fdd9437e520';
    
    console.log(`2️⃣ ทดสอบการตรวจสอบการเป็นสมาชิกของ Bot ในกลุ่ม: ${testGroupId}`);
    try {
      const isBotInGroup = await taskService.checkBotMembershipInGroup(testGroupId);
      console.log(`✅ ผลการตรวจสอบ: Bot ${isBotInGroup ? 'ยังอยู่ใน' : 'ไม่อยู่ใน'} กลุ่ม`);
    } catch (error) {
      console.log('❌ ไม่สามารถตรวจสอบการเป็นสมาชิกได้:', error.message);
    }

    console.log('\n3️⃣ ทดสอบการดึงงานทั้งหมดในกลุ่ม...');
    try {
      const { tasks } = await taskService.getGroupTasks(testGroupId);
      console.log(`✅ พบงาน ${tasks.length} รายการในกลุ่ม`);
      if (tasks.length > 0) {
        tasks.slice(0, 3).forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.title} (${task.status})`);
        });
        if (tasks.length > 3) {
          console.log(`   ... และอีก ${tasks.length - 3} รายการ`);
        }
      }
    } catch (error) {
      console.log('❌ ไม่สามารถดึงงานในกลุ่มได้:', error.message);
    }

    console.log('\n4️⃣ ทดสอบการลบงานทั้งหมดในกลุ่ม (จำลอง)...');
    try {
      // หมายเหตุ: ไม่ควรรันการลบจริงในการทดสอบ
      console.log('⚠️  ข้ามการทดสอบการลบจริง เพื่อความปลอดภัย');
      console.log('💡 ใช้ API endpoint /admin/check-bot-membership สำหรับทดสอบจริง');
    } catch (error) {
      console.log('❌ ไม่สามารถทดสอบการลบงานได้:', error.message);
    }

    console.log('\n5️⃣ ทดสอบการตรวจสอบและทำความสะอาดกลุ่มทั้งหมด...');
    try {
      // หมายเหตุ: ไม่ควรรันการทำความสะอาดจริงในการทดสอบ
      console.log('⚠️  ข้ามการทดสอบการทำความสะอาดจริง เพื่อความปลอดภัย');
      console.log('💡 ใช้ API endpoint /admin/check-bot-membership สำหรับทดสอบจริง');
    } catch (error) {
      console.log('❌ ไม่สามารถทดสอบการทำความสะอาดได้:', error.message);
    }

    console.log('\n📊 สรุปผลการทดสอบ:');
    console.log('✅ การทดสอบเสร็จสิ้น');
    console.log('💡 ฟังก์ชันใหม่ที่เพิ่มเข้ามา:');
    console.log('   - checkBotMembershipInGroup(): ตรวจสอบการเป็นสมาชิกของ Bot');
    console.log('   - deleteAllTasksInGroup(): ลบงานทั้งหมดในกลุ่ม');
    console.log('   - checkAndCleanupInactiveGroups(): ตรวจสอบและทำความสะอาดกลุ่มทั้งหมด');
    console.log('💡 Cron Job ใหม่: ตรวจสอบทุกวันเวลา 10:00 น.');
    console.log('💡 API Endpoint ใหม่: POST /admin/check-bot-membership');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// รันการทดสอบ
if (require.main === module) {
  testBotMembershipCheck().catch(console.error);
}

module.exports = { testBotMembershipCheck };
