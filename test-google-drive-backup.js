// Test Google Drive Backup API
// ใช้สำหรับทดสอบการทำงานของ Google Drive Backup

const axios = require('axios');

// ตั้งค่า base URL (เปลี่ยนตาม environment ของคุณ)
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'your-api-key-here'; // ใส่ API key ของคุณ

// Headers สำหรับ API calls
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// ฟังก์ชันสำหรับแสดงผลลัพธ์
function logResult(title, data) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📋 ${title}`);
  console.log(`${'='.repeat(50)}`);
  console.log(JSON.stringify(data, null, 2));
}

// ฟังก์ชันสำหรับแสดง error
function logError(title, error) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`❌ ${title}`);
  console.log(`${'='.repeat(50)}`);
  if (error.response) {
    console.log('Status:', error.response.status);
    console.log('Data:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.log('Error:', error.message);
  }
}

// 1. ทดสอบการเชื่อมต่อ Google Drive
async function testConnection() {
  try {
    console.log('🔗 Testing Google Drive connection...');
    const response = await axios.get(`${BASE_URL}/api/backup/test-connection`, { headers });
    logResult('✅ Google Drive Connection Test', response.data);
    return response.data.success;
  } catch (error) {
    logError('❌ Google Drive Connection Test Failed', error);
    return false;
  }
}

// 2. ทดสอบการคัดลอกไฟล์แนบของงานเฉพาะ
async function testTaskBackup(taskId) {
  try {
    console.log(`📁 Testing task backup for task: ${taskId}...`);
    const response = await axios.post(
      `${BASE_URL}/api/backup/tasks/${taskId}/backup`,
      { date: new Date().toISOString() },
      { headers }
    );
    logResult('✅ Task Backup Test', response.data);
    return response.data;
  } catch (error) {
    logError('❌ Task Backup Test Failed', error);
    return null;
  }
}

// 3. ทดสอบการคัดลอกไฟล์แนบของกลุ่ม
async function testGroupBackup(groupId) {
  try {
    console.log(`📁 Testing group backup for group: ${groupId}...`);
    const response = await axios.post(
      `${BASE_URL}/api/backup/groups/${groupId}/backup`,
      { date: new Date().toISOString() },
      { headers }
    );
    logResult('✅ Group Backup Test', response.data);
    return response.data;
  } catch (error) {
    logError('❌ Group Backup Test Failed', error);
    return null;
  }
}

// 4. ทดสอบการคัดลอกไฟล์แนบทั้งหมด
async function testAllBackup() {
  try {
    console.log('📁 Testing system-wide backup...');
    const response = await axios.post(
      `${BASE_URL}/api/backup/backup-all`,
      { date: new Date().toISOString() },
      { headers }
    );
    logResult('✅ System-wide Backup Test', response.data);
    return response.data;
  } catch (error) {
    logError('❌ System-wide Backup Test Failed', error);
    return null;
  }
}

// 5. ทดสอบการคัดลอกไฟล์แนบตามช่วงวันที่
async function testDateRangeBackup(groupId) {
  try {
    console.log(`📁 Testing date range backup for group: ${groupId}...`);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 วันย้อนหลัง

    const response = await axios.post(
      `${BASE_URL}/api/backup/groups/${groupId}/backup-by-date-range`,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      { headers }
    );
    logResult('✅ Date Range Backup Test', response.data);
    return response.data;
  } catch (error) {
    logError('❌ Date Range Backup Test Failed', error);
    return null;
  }
}

// 6. ทดสอบการคัดลอกไฟล์แนบตามประเภท
async function testTypeBackup(groupId) {
  try {
    console.log(`📁 Testing type-based backup for group: ${groupId}...`);
    const response = await axios.post(
      `${BASE_URL}/api/backup/groups/${groupId}/backup-by-type`,
      {
        attachmentType: 'submission' // หรือ 'initial'
      },
      { headers }
    );
    logResult('✅ Type-based Backup Test', response.data);
    return response.data;
  } catch (error) {
    logError('❌ Type-based Backup Test Failed', error);
    return null;
  }
}

// 7. ดึงสถิติการคัดลอกไฟล์แนบ
async function getBackupStats() {
  try {
    console.log('📊 Getting backup statistics...');
    const response = await axios.get(`${BASE_URL}/api/backup/stats`, { headers });
    logResult('✅ Backup Statistics', response.data);
    return response.data;
  } catch (error) {
    logError('❌ Get Backup Statistics Failed', error);
    return null;
  }
}

// 8. เรียกใช้การคัดลอกไฟล์แนบตามกำหนดเวลา
async function runScheduledBackups() {
  try {
    console.log('⏰ Running scheduled backups...');
    const response = await axios.post(`${BASE_URL}/api/backup/run-scheduled`, {}, { headers });
    logResult('✅ Scheduled Backups', response.data);
    return response.data;
  } catch (error) {
    logError('❌ Scheduled Backups Failed', error);
    return null;
  }
}

// ฟังก์ชันหลักสำหรับรันการทดสอบ
async function runTests() {
  console.log('🚀 Starting Google Drive Backup Tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);

  // 1. ทดสอบการเชื่อมต่อ
  const isConnected = await testConnection();
  if (!isConnected) {
    console.log('\n❌ Cannot proceed with tests - Google Drive connection failed');
    return;
  }

  // ตัวอย่าง ID สำหรับทดสอบ (เปลี่ยนตามข้อมูลจริงในระบบของคุณ)
  const sampleTaskId = 'your-task-id-here';
  const sampleGroupId = 'your-group-id-here';

  // 2. ทดสอบการคัดลอกไฟล์แนบของงาน (ถ้ามี task ID)
  if (sampleTaskId !== 'your-task-id-here') {
    await testTaskBackup(sampleTaskId);
  }

  // 3. ทดสอบการคัดลอกไฟล์แนบของกลุ่ม (ถ้ามี group ID)
  if (sampleGroupId !== 'your-group-id-here') {
    await testGroupBackup(sampleGroupId);
    await testDateRangeBackup(sampleGroupId);
    await testTypeBackup(sampleGroupId);
  }

  // 4. ทดสอบการคัดลอกไฟล์แนบทั้งหมด
  await testAllBackup();

  // 5. ดึงสถิติ
  await getBackupStats();

  // 6. รัน scheduled backups
  await runScheduledBackups();

  console.log('\n🎉 All tests completed!');
}

// รันการทดสอบ
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testConnection,
  testTaskBackup,
  testGroupBackup,
  testAllBackup,
  testDateRangeBackup,
  testTypeBackup,
  getBackupStats,
  runScheduledBackups
};
