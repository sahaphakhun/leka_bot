#!/usr/bin/env node

/**
 * สคริปต์ทดสอบการดึงข้อมูลสมาชิกในกลุ่ม LINE
 * ใช้สำหรับตรวจสอบว่า LINE API และฐานข้อมูลทำงานได้ถูกต้อง
 */

const { LineService } = require('./dist/services/LineService');
const { UserService } = require('./dist/services/UserService');

async function testLineMemberAPI() {
  console.log('🔍 เริ่มทดสอบการดึงข้อมูลสมาชิกในกลุ่ม LINE...\n');

  try {
    // สร้าง instance ของ services
    const lineService = new LineService();
    const userService = new UserService();

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
    
    console.log(`2️⃣ ทดสอบการดึงข้อมูลกลุ่ม: ${testGroupId}`);
    try {
      const groupInfo = await lineService.getGroupInformation(testGroupId);
      console.log('✅ ข้อมูลกลุ่ม:', {
        groupId: groupInfo.groupId,
        name: groupInfo.name,
        source: groupInfo.source
      });
    } catch (error) {
      console.log('❌ ไม่สามารถดึงข้อมูลกลุ่มได้:', error.message);
      if (error.status === 403) {
        console.log('🚫 บอทไม่มีสิทธิ์เข้าถึงข้อมูลกลุ่ม (ต้องเพิ่มสิทธิ์ในการตั้งค่า LINE Bot)');
      }
    }

    console.log('\n3️⃣ ทดสอบการดึง User IDs จากกลุ่ม...');
    try {
      const userIds = await lineService.getGroupMemberUserIds(testGroupId);
      console.log(`✅ พบ User IDs: ${userIds.length} คน`);
      console.log('📋 User IDs:', userIds.slice(0, 5).join(', ') + (userIds.length > 5 ? '...' : ''));
    } catch (error) {
      console.log('❌ ไม่สามารถดึง User IDs ได้:', error.message);
      if (error.status === 403) {
        console.log('🚫 บอทไม่มีสิทธิ์เข้าถึงรายชื่อสมาชิกกลุ่ม (ต้องการสิทธิ์ "Get member user IDs")');
      }
    }

    console.log('\n4️⃣ ทดสอบการดึงข้อมูลสมาชิกทั้งหมด...');
    try {
      const members = await lineService.getAllGroupMembers(testGroupId);
      console.log(`✅ ดึงข้อมูลสมาชิกสำเร็จ: ${members.length} คน`);
      members.slice(0, 3).forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.displayName} (${member.userId})`);
      });
      if (members.length > 3) {
        console.log(`   ... และอีก ${members.length - 3} คน`);
      }
    } catch (error) {
      console.log('❌ ไม่สามารถดึงข้อมูลสมาชิกได้:', error.message);
      if (error.status === 403) {
        console.log('🚫 บอทไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิกกลุ่ม (ต้องเพิ่มสิทธิ์ "Get group member profile")');
      }
    }

    console.log('\n5️⃣ ทดสอบวิธี Hybrid (LINE API + ฐานข้อมูล)...');
    try {
      const hybridMembers = await lineService.getGroupMembersHybrid(testGroupId);
      console.log(`✅ วิธี Hybrid สำเร็จ: ${hybridMembers.length} คน`);
      hybridMembers.slice(0, 3).forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.displayName} (${member.userId}) - ${member.source}`);
      });
      if (hybridMembers.length > 3) {
        console.log(`   ... และอีก ${hybridMembers.length - 3} คน`);
      }
    } catch (error) {
      console.log('❌ วิธี Hybrid ล้มเหลว:', error.message);
    }

    console.log('\n6️⃣ ทดสอบการดึงข้อมูลจากฐานข้อมูล...');
    try {
      const dbMembers = await userService.getGroupMembers(testGroupId);
      console.log(`✅ ข้อมูลจากฐานข้อมูล: ${dbMembers.length} คน`);
      dbMembers.slice(0, 3).forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.displayName} (${member.lineUserId}) - ${member.role}`);
      });
      if (dbMembers.length > 3) {
        console.log(`   ... และอีก ${dbMembers.length - 3} คน`);
      }
    } catch (error) {
      console.log('❌ ไม่สามารถดึงข้อมูลจากฐานข้อมูลได้:', error.message);
    }

    console.log('\n📊 สรุปผลการทดสอบ:');
    console.log('✅ การทดสอบเสร็จสิ้น');
    console.log('💡 หากพบข้อผิดพลาด 403 หมายความว่าบอทไม่มีสิทธิ์เข้าถึงข้อมูล');
    console.log('💡 ต้องไปตั้งค่า LINE Bot Console เพื่อเพิ่มสิทธิ์ที่จำเป็น');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// รันการทดสอบ
if (require.main === module) {
  testLineMemberAPI().catch(console.error);
}

module.exports = { testLineMemberAPI };
