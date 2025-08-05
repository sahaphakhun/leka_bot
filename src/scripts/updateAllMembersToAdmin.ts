// Migration Script: อัปเดตสมาชิกทั้งหมดให้เป็น Admin
// สำหรับแก้ไขข้อมูลเก่าที่ยังมี role เป็น 'member' อยู่

import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';
import { GroupMember } from '@/models';
import { config } from '@/utils/config';

async function updateAllMembersToAdmin() {
  console.log('🔄 [MIGRATE] Starting member role migration...');
  console.log('📊 [MIGRATE] Environment:', config.nodeEnv);
  
  try {
    // Connect to database
    await AppDataSource.initialize();
    console.log('✅ [MIGRATE] Database connected successfully');
    
    const groupMemberRepository = AppDataSource.getRepository(GroupMember);
    
    // ค้นหาสมาชิกที่ยังเป็น 'member'
    const membersToUpdate = await groupMemberRepository.find({
      where: { role: 'member' },
      relations: ['user', 'group']
    });
    
    console.log(`📋 [MIGRATE] Found ${membersToUpdate.length} members with 'member' role`);
    
    if (membersToUpdate.length === 0) {
      console.log('✅ [MIGRATE] No members to update - all members are already admin');
      await AppDataSource.destroy();
      return;
    }
    
    // แสดงรายการสมาชิกที่จะอัปเดต
    console.log('👥 [MIGRATE] Members to be updated:');
    membersToUpdate.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.user?.displayName || 'Unknown'} in group ${member.group?.name || member.groupId}`);
    });
    
    console.log('');
    console.log('🔄 [MIGRATE] Updating members to admin role...');
    
    // อัปเดตทีละคน
    let updated = 0;
    for (const member of membersToUpdate) {
      try {
        member.role = 'admin';
        await groupMemberRepository.save(member);
        updated++;
        console.log(`  ✅ Updated: ${member.user?.displayName || 'Unknown'} (${updated}/${membersToUpdate.length})`);
      } catch (error) {
        console.error(`  ❌ Failed to update member ${member.id}:`, error);
      }
    }
    
    console.log('');
    console.log(`🎉 [MIGRATE] Migration completed successfully!`);
    console.log(`📊 [MIGRATE] Summary:`);
    console.log(`   - Total found: ${membersToUpdate.length}`);
    console.log(`   - Successfully updated: ${updated}`);
    console.log(`   - Failed: ${membersToUpdate.length - updated}`);
    
    // ตรวจสอบผลลัพธ์
    const remainingMembers = await groupMemberRepository.count({
      where: { role: 'member' }
    });
    
    const totalAdmins = await groupMemberRepository.count({
      where: { role: 'admin' }
    });
    
    console.log(`📈 [MIGRATE] Current status:`);
    console.log(`   - Admin members: ${totalAdmins}`);
    console.log(`   - Regular members: ${remainingMembers}`);
    
    if (remainingMembers === 0) {
      console.log('🎯 [MIGRATE] Perfect! All members are now admins');
    } else {
      console.log(`⚠️  [MIGRATE] ${remainingMembers} members still have 'member' role`);
    }
    
  } catch (error) {
    console.error('❌ [MIGRATE] Migration failed:', error);
    
    if (error instanceof Error) {
      console.error('🔍 [MIGRATE] Error details:', {
        name: error.name,
        message: error.message,
        stack: config.nodeEnv === 'development' ? error.stack : undefined
      });
    }
    
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 [MIGRATE] Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  updateAllMembersToAdmin();
}

export { updateAllMembersToAdmin };