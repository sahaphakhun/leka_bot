// Simple Google Drive Backup Test
// ใช้สำหรับทดสอบการทำงานของ Google Drive Backup

const https = require('https');
const http = require('http');

// ตั้งค่า
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  groupId: process.env.GROUP_ID || 'your_group_uuid_here',
  taskId: process.env.TASK_ID || 'your_task_uuid_here'
};

/**
 * ส่ง HTTP request
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 3000),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleDriveBackup-Test/1.0'
      }
    };

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * ทดสอบการเชื่อมต่อ Google Drive
 */
async function testConnection() {
  console.log('🔍 ทดสอบการเชื่อมต่อ Google Drive...');
  
  try {
    const response = await makeRequest('GET', '/api/backup/test-connection');
    
    if (response.statusCode === 200) {
      console.log('✅ การเชื่อมต่อสำเร็จ:', response.data.message);
      return true;
    } else {
      console.log('❌ การเชื่อมต่อล้มเหลว:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ:', error.message);
    return false;
  }
}

/**
 * ทดสอบการคัดลอกไฟล์แนบทั้งหมด
 */
async function testAllBackup() {
  console.log('🔍 ทดสอบการคัดลอกไฟล์แนบทั้งหมด...');
  
  try {
    const response = await makeRequest('POST', '/api/backup/backup-all', {
      date: new Date().toISOString()
    });
    
    if (response.statusCode === 200) {
      console.log('✅ การคัดลอกไฟล์แนบทั้งหมดสำเร็จ:', response.data.message);
      console.log('📊 สถิติ:', {
        totalGroups: response.data.data?.totalGroups,
        totalTasks: response.data.data?.totalTasks,
        totalFiles: response.data.data?.totalFiles
      });
      return true;
    } else {
      console.log('❌ การคัดลอกไฟล์แนบทั้งหมดล้มเหลว:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการคัดลอกไฟล์แนบทั้งหมด:', error.message);
    return false;
  }
}

/**
 * ทดสอบการดึงสถิติ
 */
async function testGetStats() {
  console.log('🔍 ทดสอบการดึงสถิติ...');
  
  try {
    const response = await makeRequest('GET', '/api/backup/stats');
    
    if (response.statusCode === 200) {
      console.log('✅ การดึงสถิติสำเร็จ:', response.data.message);
      console.log('📊 ข้อมูลสถิติ:', response.data.data);
      return true;
    } else {
      console.log('❌ การดึงสถิติล้มเหลว:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงสถิติ:', error.message);
    return false;
  }
}

/**
 * ฟังก์ชันหลัก
 */
async function main() {
  console.log('🚀 เริ่มต้นการทดสอบ Google Drive Backup...\n');
  
  console.log('📋 การตั้งค่า:');
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Group ID: ${config.groupId}`);
  console.log(`   Task ID: ${config.taskId}`);
  console.log('');
  
  try {
    // ทดสอบการเชื่อมต่อ
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('\n❌ การเชื่อมต่อ Google Drive ล้มเหลว - หยุดการทดสอบ');
      process.exit(1);
    }
    
    console.log('');
    
    // ทดสอบการคัดลอกไฟล์แนบทั้งหมด
    await testAllBackup();
    console.log('');
    
    // ทดสอบการดึงสถิติ
    await testGetStats();
    console.log('');
    
    console.log('🎉 การทดสอบเสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
    process.exit(1);
  }
}

// เรียกใช้ฟังก์ชันหลัก
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testConnection,
  testAllBackup,
  testGetStats
};
