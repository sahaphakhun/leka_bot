const fetch = require('node-fetch');

// ทดสอบการดาวน์โหลดไฟล์จาก URL ที่ไม่ถูกต้อง
async function testFileDownload() {
  console.log('🧪 ทดสอบการดาวน์โหลดไฟล์...');
  
  const testUrls = [
    'https://httpbin.org/status/404', // URL ที่ไม่พบ
    'https://httpbin.org/delay/10',   // URL ที่ช้า
    'https://invalid-domain-12345.com/test.jpg', // URL ที่ไม่สามารถเข้าถึงได้
    'https://httpbin.org/status/500'  // Server error
  ];
  
  for (const url of testUrls) {
    console.log(`\n📥 ทดสอบ URL: ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 วินาที
      
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LekaBot/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.log(`❌ HTTP ${res.status}: ${res.statusText}`);
      } else {
        console.log(`✅ สำเร็จ: ${res.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// ทดสอบ retry logic
async function testRetryLogic() {
  console.log('\n🔄 ทดสอบ Retry Logic...');
  
  let attempt = 0;
  const maxRetries = 3;
  
  for (let i = 1; i <= maxRetries; i++) {
    attempt = i;
    console.log(`\n🔄 ลองครั้งที่ ${i}/${maxRetries}`);
    
    try {
      // จำลองการเรียก API ที่ล้มเหลว
      const res = await fetch('https://httpbin.org/status/500');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      console.log('✅ สำเร็จ!');
      break;
      
    } catch (error) {
      console.log(`❌ ล้มเหลว: ${error.message}`);
      
      if (i === maxRetries) {
        console.log('❌ ล้มเหลวทั้งหมดหลังจากลอง 3 ครั้ง');
        break;
      }
      
      // รอสักครู่ก่อนลองใหม่
      const delay = 1000 * i;
      console.log(`⏳ รอ ${delay}ms ก่อนลองใหม่...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// รันการทดสอบ
async function runTests() {
  console.log('🚀 เริ่มการทดสอบการแก้ไขปัญหาการดาวน์โหลดไฟล์\n');
  
  await testFileDownload();
  await testRetryLogic();
  
  console.log('\n✅ การทดสอบเสร็จสิ้น');
}

runTests().catch(console.error);
