#!/usr/bin/env node

/**
 * สคริปต์สำหรับการอัพเดทชื่อกลุ่มทั้งหมดให้ดึงจาก LINE API
 * ใช้งานผ่าน curl หรือเรียกใช้โดยตรง
 * 
 * วิธีใช้งาน:
 * 1. เรียกใช้ผ่าน curl:
 *    curl -X POST http://localhost:3000/api/groups/update-names
 * 
 * 2. เรียกใช้ผ่าน Node.js:
 *    node update-group-names.js
 */

const https = require('https');
const http = require('http');

// ตั้งค่า URL ของ API (ปรับเปลี่ยนตาม environment)
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = '/api/groups/update-names';

async function updateGroupNames() {
  console.log('🔄 เริ่มต้นการอัพเดทชื่อกลุ่มทั้งหมด...');
  console.log(`📡 เรียกใช้ API: ${API_BASE_URL}${API_ENDPOINT}`);
  
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + API_ENDPOINT);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GroupNameUpdater/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.success) {
            console.log('✅ การอัพเดทชื่อกลุ่มสำเร็จ!');
            console.log('\n📊 สรุปผลการทำงาน:');
            console.log(`• กลุ่มทั้งหมด: ${response.data.total}`);
            console.log(`• อัพเดทแล้ว: ${response.data.updated}`);
            console.log(`• ข้ามไป: ${response.data.skipped}`);
            console.log(`• เกิดข้อผิดพลาด: ${response.data.errors}`);
            
            if (response.data.details && response.data.details.length > 0) {
              console.log('\n📋 รายละเอียดการอัพเดท:');
              response.data.details.forEach((detail, index) => {
                const status = detail.status === 'updated' ? '✅' : 
                             detail.status === 'skipped' ? '⏭️' : '❌';
                console.log(`${status} ${detail.groupId}: ${detail.oldName}${detail.newName ? ` → ${detail.newName}` : ''}`);
                if (detail.error) {
                  console.log(`   ข้อผิดพลาด: ${detail.error}`);
                }
              });
            }
            
            resolve(response);
          } else {
            console.error('❌ การอัพเดทชื่อกลุ่มล้มเหลว:', response.error || 'Unknown error');
            reject(new Error(response.error || 'Unknown error'));
          }
        } catch (parseError) {
          console.error('❌ ไม่สามารถ parse response ได้:', parseError);
          console.log('Response data:', data);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ:', error.message);
      reject(error);
    });

    req.end();
  });
}

// ฟังก์ชันสำหรับการทดสอบ API endpoint
async function testEndpoint() {
  try {
    console.log('🧪 ทดสอบการเชื่อมต่อ API...');
    const response = await updateGroupNames();
    console.log('\n🎉 การทดสอบสำเร็จ!');
    return response;
  } catch (error) {
    console.error('\n💥 การทดสอบล้มเหลว:', error.message);
    process.exit(1);
  }
}

// ฟังก์ชันสำหรับการใช้งานแบบ interactive
async function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🤔 คุณต้องการอัพเดทชื่อกลุ่มทั้งหมดหรือไม่? (y/N): ', async (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        try {
          await updateGroupNames();
          resolve();
        } catch (error) {
          console.error('❌ การอัพเดทล้มเหลว:', error.message);
          process.exit(1);
        }
      } else {
        console.log('👋 ยกเลิกการอัพเดท');
        resolve();
      }
    });
  });
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test') || args.includes('-t')) {
    testEndpoint();
  } else if (args.includes('--interactive') || args.includes('-i')) {
    interactiveMode();
  } else {
    // Default: run directly
    updateGroupNames()
      .then(() => {
        console.log('\n✨ ทำงานเสร็จสิ้น');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 เกิดข้อผิดพลาด:', error.message);
        process.exit(1);
      });
  }
}

module.exports = { updateGroupNames, testEndpoint };
