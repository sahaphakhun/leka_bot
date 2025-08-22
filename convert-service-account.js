#!/usr/bin/env node

/**
 * สคริปต์สำหรับแปลงไฟล์ Google Service Account JSON เป็น Environment Variable
 * สำหรับใช้ใน Railway หรือ platform อื่นๆ ที่ไม่รองรับการอัปโหลดไฟล์
 */

const fs = require('fs');
const path = require('path');

// ตรวจสอบ argument
if (process.argv.length < 3) {
  console.log('❌ วิธีใช้: node convert-service-account.js <path-to-json-file>');
  console.log('ตัวอย่าง: node convert-service-account.js ./google-service-account.json');
  process.exit(1);
}

const jsonFilePath = process.argv[2];

try {
  // อ่านไฟล์ JSON
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  
  // แปลงเป็น JSON string ที่ปลอดภัยสำหรับ environment variable
  const jsonString = JSON.stringify(JSON.parse(jsonContent));
  
  console.log('✅ แปลงไฟล์ Service Account สำเร็จ!');
  console.log('');
  console.log('📋 คัดลอกข้อความด้านล่างไปใส่ใน Railway Environment Variables:');
  console.log('');
  console.log('GOOGLE_SERVICE_ACCOUNT_JSON=' + jsonString);
  console.log('');
  console.log('📝 วิธีใส่ใน Railway:');
  console.log('1. ไปที่ Railway Dashboard');
  console.log('2. เลือกโปรเจ็กต์ของคุณ');
  console.log('3. ไปที่แท็บ "Variables"');
  console.log('4. เพิ่ม variable ใหม่:');
  console.log('   - Key: GOOGLE_SERVICE_ACCOUNT_JSON');
  console.log('   - Value: (ใส่ข้อความด้านบน)');
  console.log('');
  console.log('⚠️  หมายเหตุ: อย่าลืมเพิ่ม environment variables อื่นๆ ด้วย:');
  console.log('   - GOOGLE_CLIENT_ID');
  console.log('   - GOOGLE_CLIENT_SECRET');
  console.log('   - GOOGLE_REDIRECT_URI');
  
} catch (error) {
  console.error('❌ เกิดข้อผิดพลาด:', error.message);
  console.log('');
  console.log('🔍 ตรวจสอบว่า:');
  console.log('   - ไฟล์ JSON มีอยู่จริง');
  console.log('   - ไฟล์ JSON มีรูปแบบถูกต้อง');
  console.log('   - มีสิทธิ์ในการอ่านไฟล์');
  process.exit(1);
}
