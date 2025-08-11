// Migration Script: อัปเดต Group settings เพื่อรองรับฟิลด์ supervisors
// รันคำสั่ง: npm run ts-node src/scripts/updateGroupSettingsForSupervisors.ts

import { AppDataSource } from '@/utils/database';
import { Group } from '@/models';

async function updateGroupSettingsForSupervisors() {
  try {
    console.log('🔄 Starting migration: Add supervisors field to Group settings...');
    
    // เชื่อมต่อฐานข้อมูล
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const groupRepository = AppDataSource.getRepository(Group);
    
    // ดึงกลุ่มทั้งหมด
    const groups = await groupRepository.find();
    console.log(`📊 Found ${groups.length} groups to update`);

    let updatedCount = 0;
    
    for (const group of groups) {
      try {
        // ตรวจสอบว่ามีฟิลด์ supervisors หรือไม่
        if (!group.settings.supervisors) {
          // เพิ่มฟิลด์ supervisors เป็น array ว่าง
          group.settings = {
            ...group.settings,
            supervisors: []
          };
          
          await groupRepository.save(group);
          updatedCount++;
          console.log(`✅ Updated group: ${group.name} (${group.lineGroupId})`);
        } else {
          console.log(`⏭️ Group already has supervisors field: ${group.name}`);
        }
      } catch (error) {
        console.error(`❌ Error updating group ${group.name}:`, error);
      }
    }

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📈 Updated ${updatedCount} groups`);
    console.log(`💡 You can now use "/setup @user1 @user2" to set supervisors`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
    
    process.exit(0);
  }
}

// รัน migration
updateGroupSettingsForSupervisors();
