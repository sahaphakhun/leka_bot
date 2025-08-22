// Test Leaderboard API - สำหรับ debug ปัญหา 500 error

import { AppDataSource } from '@/utils/database';
import { KPIService } from '@/services/KPIService';
import { Group, User, GroupMember } from '@/models';

async function testLeaderboard(): Promise<void> {
  try {
    console.log('🚀 Starting Leaderboard API test...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');
    
    // Test with a specific group ID
    const testGroupId = '2f5b9113-b8cf-4196-8929-bff6b26cbd65';
    console.log(`🔍 Testing with group ID: ${testGroupId}`);
    
    // Check if group exists
    const groupRepository = AppDataSource.getRepository(Group);
    const group = await groupRepository.findOne({ 
      where: { id: testGroupId } 
    });
    
    if (!group) {
      console.log('⚠️ Group not found by ID, checking by LINE Group ID...');
      const groupByLineId = await groupRepository.findOne({ 
        where: { lineGroupId: testGroupId } 
      });
      
      if (groupByLineId) {
        console.log(`✅ Found group by LINE ID: ${groupByLineId.id}`);
        console.log(`📝 Group name: ${groupByLineId.name}`);
        console.log(`🔧 Group settings:`, groupByLineId.settings);
      } else {
        console.log('❌ Group not found by either ID or LINE Group ID');
        return;
      }
    } else {
      console.log(`✅ Found group: ${group.name}`);
      console.log(`🔧 Group settings:`, group.settings);
    }
    
    // Check group members
    const memberRepository = AppDataSource.getRepository(GroupMember);
    const members = await memberRepository.find({
      where: { groupId: testGroupId },
      relations: ['user']
    });
    
    console.log(`👥 Found ${members.length} group members`);
    members.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.user?.displayName || 'Unknown'} (${member.user?.id})`);
    });
    
    // Check KPI records
    const kpiRepository = AppDataSource.getRepository('kpi_records');
    const kpiCount = await kpiRepository.count({
      where: { groupId: testGroupId }
    });
    
    console.log(`📊 Found ${kpiCount} KPI records for this group`);
    
    // Test KPIService
    const kpiService = new KPIService();
    
    console.log('🧪 Testing getGroupLeaderboard...');
    const leaderboard = await kpiService.getGroupLeaderboard(testGroupId, 'weekly');
    
    console.log(`✅ Leaderboard generated successfully with ${leaderboard.length} users`);
    leaderboard.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.displayName} - Rank: ${user.rank}, Points: ${user.weeklyPoints}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testLeaderboard()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testLeaderboard };
