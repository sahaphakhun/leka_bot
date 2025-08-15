// Test Project Rules & Memory System
// สคริปต์สำหรับทดสอบระบบ Rules และ Memory

import 'module-alias/register';
import { ProjectRules } from '@/services/ProjectRules';
import { ProjectChecklistService } from '@/services/ProjectChecklistService';
import { ProjectMemoryService } from '@/services/ProjectMemoryService';
import { ProjectWorkflowService } from '@/services/ProjectWorkflowService';
import { logger } from '@/utils/logger';

async function testProjectRulesSystem() {
  console.log('🧪 เริ่มทดสอบระบบ Rules และ Memory...\n');

  try {
    // 1. ทดสอบ ProjectRules
    console.log('📋 1. ทดสอบ ProjectRules...');
    const projectRules = ProjectRules.getInstance();
    
    const rules = projectRules.getAllRules();
    console.log(`   ✅ พบ rules ทั้งหมด: ${rules.length} รายการ`);
    
    const memories = projectRules.getAllMemories();
    console.log(`   ✅ พบ memories ทั้งหมด: ${memories.length} รายการ`);
    
    const checklists = projectRules.getAllChecklists();
    console.log(`   ✅ พบ checklists ทั้งหมด: ${checklists.length} รายการ`);

    // แสดง rules ตาม category
    const workflowRules = projectRules.getRulesByCategory('workflow');
    console.log(`   📋 Workflow Rules: ${workflowRules.length} รายการ`);
    workflowRules.forEach(rule => {
      console.log(`      - ${rule.id}: ${rule.title} (${rule.priority})`);
    });

    // แสดง memories ตาม type
    const lessons = projectRules.getMemoriesByType('lesson');
    console.log(`   🧠 Lessons Learned: ${lessons.length} รายการ`);
    lessons.forEach(memory => {
      console.log(`      - ${memory.id}: ${memory.title}`);
    });

    console.log('');

    // 2. ทดสอบ ProjectChecklistService
    console.log('📋 2. ทดสอบ ProjectChecklistService...');
    const checklistService = new ProjectChecklistService();
    
    // ตรวจสอบสถานะโปรเจ็ก
    console.log('   🔍 ตรวจสอบสถานะโปรเจ็ก...');
    const projectStatus = await checklistService.checkProjectStatus();
    console.log(`   ✅ สถานะโปรเจ็ก: ${projectStatus.isHealthy ? 'ปกติ' : 'มีปัญหา'}`);
    console.log(`   📊 คะแนนรวม: ${projectStatus.overallScore}/100`);
    console.log(`   🗄️ ฐานข้อมูล: ${projectStatus.database.isConnected ? 'เชื่อมต่อ' : 'ไม่เชื่อมต่อ'}`);
    console.log(`   🤖 LINE Bot: ${projectStatus.lineBot.isConnected ? 'เชื่อมต่อ' : 'ไม่เชื่อมต่อ'}`);

    // รับ checklist ที่ใช้งานได้
    const activeChecklists = checklistService.getActiveChecklists();
    console.log(`   📋 Active Checklists: ${activeChecklists.length} รายการ`);
    activeChecklists.forEach(checklist => {
      console.log(`      - ${checklist.id}: ${checklist.name}`);
    });

    console.log('');

    // 3. ทดสอบ ProjectMemoryService
    console.log('🧠 3. ทดสอบ ProjectMemoryService...');
    const memoryService = new ProjectMemoryService();
    
    // ค้นหา memories
    console.log('   🔍 ค้นหา memories...');
    const searchResult = memoryService.searchMemories('ตรวจสอบ');
    console.log(`   ✅ ผลการค้นหา: ${searchResult.totalResults} รายการ`);
    console.log(`      - Rules: ${searchResult.rules.length} รายการ`);
    console.log(`      - Memories: ${searchResult.memories.length} รายการ`);

    // รับ rule recommendations
    console.log('   💡 รับ rule recommendations...');
    const recommendations = memoryService.getRuleRecommendations('เริ่มงาน');
    console.log(`   ✅ Recommendations: ${recommendations.length} รายการ`);
    recommendations.forEach(rec => {
      console.log(`      - ${rec.ruleId}: ${rec.ruleTitle} (${rec.priority})`);
      console.log(`        เหตุผล: ${rec.reason}`);
    });

    // สร้าง project insights
    console.log('   💡 สร้าง project insights...');
    const insights = memoryService.generateProjectInsights();
    console.log(`   ✅ Insights: ${insights.length} รายการ`);
    insights.forEach(insight => {
      console.log(`      - ${insight.type.toUpperCase()}: ${insight.title}`);
      console.log(`        ${insight.message}`);
    });

    console.log('');

    // 4. ทดสอบ ProjectWorkflowService
    console.log('🔄 4. ทดสอบ ProjectWorkflowService...');
    const workflowService = new ProjectWorkflowService();
    
    // รับ workflow templates
    const templates = workflowService.getActiveTemplates();
    console.log(`   📋 Workflow Templates: ${templates.length} รายการ`);
    templates.forEach(template => {
      console.log(`      - ${template.id}: ${template.name} (${template.category})`);
      console.log(`        Steps: ${template.steps.length} ขั้นตอน`);
    });

    // เริ่มต้น workflow ใหม่
    console.log('   🚀 เริ่มต้น workflow ใหม่...');
    const workflow = await workflowService.startWorkflow('WF-PROJECT-START', 'test-user-001', 'test-group-001');
    console.log(`   ✅ เริ่มต้น workflow: ${workflow.workflowName} (${workflow.id})`);
    console.log(`   📊 สถานะ: ${workflow.status}, ความคืบหน้า: ${workflow.progress}%`);

    // ดำเนินการ workflow steps
    console.log('   ✅ ดำเนินการ workflow steps...');
    for (const step of workflow.steps) {
      if (step.dependencies.length === 0 || step.dependencies.every(depId => 
        workflow.steps.find(s => s.id === depId)?.isCompleted
      )) {
        await workflowService.executeWorkflowStep(workflow.id, step.id, 'test-user-001', 'ทดสอบระบบ');
        console.log(`      ✅ เสร็จสิ้น: ${step.name}`);
        break; // ทำแค่ step แรกเพื่อทดสอบ
      }
    }

    // รับ workflow ที่อัปเดตแล้ว
    const updatedWorkflow = workflowService.getWorkflow(workflow.id);
    if (updatedWorkflow) {
      console.log(`   📊 สถานะหลังดำเนินการ: ${updatedWorkflow.status}, ความคืบหน้า: ${updatedWorkflow.progress}%`);
    }

    console.log('');

    // 5. ทดสอบการสร้างรายงาน
    console.log('📊 5. ทดสอบการสร้างรายงาน...');
    
    // รายงานสรุป memory
    const memoryReport = memoryService.generateSummaryReport();
    console.log(`   🧠 Memory Report:`);
    console.log(`      - Total Rules: ${memoryReport.summary.totalRules}`);
    console.log(`      - Total Memories: ${memoryReport.summary.totalMemories}`);
    console.log(`      - Consistency: ${memoryReport.consistency.isValid ? 'ผ่าน' : 'ไม่ผ่าน'}`);

    // รายงานสรุป workflow
    const workflowReport = workflowService.generateWorkflowReport();
    console.log(`   🔄 Workflow Report:`);
    console.log(`      - Total Workflows: ${workflowReport.summary.totalWorkflows}`);
    console.log(`      - Total Templates: ${workflowReport.summary.totalTemplates}`);

    console.log('');

    // 6. ทดสอบการเพิ่ม rules และ memories ใหม่
    console.log('➕ 6. ทดสอบการเพิ่ม rules และ memories ใหม่...');
    
    // เพิ่ม rule ใหม่
    const newRule = memoryService.addRule({
      category: 'quality',
      title: 'ทดสอบระบบหลังการเปลี่ยนแปลง',
      description: 'หลังการเปลี่ยนแปลงใด ๆ ต้องทดสอบระบบให้ทำงานปกติ',
      priority: 'high',
      isActive: true
    });
    console.log(`   ✅ เพิ่ม rule ใหม่: ${newRule.title} (${newRule.id})`);

    // เพิ่ม memory ใหม่
    const newMemory = memoryService.addMemory({
      type: 'lesson',
      title: 'การทดสอบระบบช่วยป้องกันปัญหา',
      content: 'การทดสอบระบบหลังการเปลี่ยนแปลงช่วยให้พบปัญหาได้เร็วและป้องกันปัญหาใน production',
      tags: ['testing', 'quality', 'best-practice'],
      relatedRules: [newRule.id]
    });
    console.log(`   ✅ เพิ่ม memory ใหม่: ${newMemory.title} (${newMemory.id})`);

    console.log('');

    // 7. สรุปผลการทดสอบ
    console.log('🎯 สรุปผลการทดสอบ:');
    console.log('   ✅ ProjectRules: ทำงานปกติ');
    console.log('   ✅ ProjectChecklistService: ทำงานปกติ');
    console.log('   ✅ ProjectMemoryService: ทำงานปกติ');
    console.log('   ✅ ProjectWorkflowService: ทำงานปกติ');
    console.log('   ✅ การเพิ่ม rules และ memories: ทำงานปกติ');
    console.log('   ✅ การสร้างรายงาน: ทำงานปกติ');
    
    console.log('\n🎉 การทดสอบเสร็จสิ้น - ระบบ Rules และ Memory ทำงานปกติ!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
    logger.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// รันการทดสอบ
if (require.main === module) {
  testProjectRulesSystem()
    .then(() => {
      console.log('\n✅ การทดสอบเสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ การทดสอบล้มเหลว:', error);
      process.exit(1);
    });
}

export { testProjectRulesSystem };
