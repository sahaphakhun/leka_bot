#!/usr/bin/env node

/**
 * สคริปต์สำหรับการทดสอบระบบอัพเดทชื่อกลุ่ม
 * ทดสอบการทำงานของ API endpoint และการตรวจจับชื่อกลุ่มที่เป็นตัวย่อ
 */

const { updateGroupNames } = require('./update-group-names');

// ข้อมูลทดสอบ
const testCases = [
  {
    name: 'ชื่อกลุ่มที่เป็นตัวย่อสั้น',
    oldName: 'กลุ่ม C1467a3d',
    lineGroupId: 'C1467a3dcec992659e48f958415757d5e',
    expected: true
  },
  {
    name: 'ชื่อกลุ่มที่เป็นตัวย่อยาว',
    oldName: 'กลุ่ม C1467a3dcec992659e48f958415757d5e',
    lineGroupId: 'C1467a3dcec992659e48f958415757d5e',
    expected: true
  },
  {
    name: 'ชื่อกลุ่มที่ถูกต้อง',
    oldName: 'ทีมพัฒนาระบบ',
    lineGroupId: 'C1467a3dcec992659e48f958415757d5e',
    expected: false
  },
  {
    name: 'กลุ่มที่ไม่ได้ใช้งาน',
    oldName: '[INACTIVE] 2024-01-01T00:00:00.000Z',
    lineGroupId: 'C1467a3dcec992659e48f958415757d5e',
    expected: true
  },
  {
    name: 'แชทส่วนตัว',
    oldName: 'แชทส่วนตัว',
    lineGroupId: 'personal_123456789',
    expected: true
  }
];

// ฟังก์ชันทดสอบการตรวจจับชื่อกลุ่มที่เป็นตัวย่อ
function testAbbreviatedNameDetection() {
  console.log('🧪 ทดสอบการตรวจจับชื่อกลุ่มที่เป็นตัวย่อ...\n');
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`📋 Test Case ${index + 1}: ${testCase.name}`);
    console.log(`   Old Name: "${testCase.oldName}"`);
    console.log(`   Line Group ID: "${testCase.lineGroupId}"`);
    console.log(`   Expected: ${testCase.expected}`);
    
    // จำลองการตรวจจับ (ใช้ regex patterns จาก API Controller)
    const abbreviatedPatterns = [
      /^กลุ่ม [A-Za-z0-9]{1,8}$/,
      /^กลุ่ม [A-Za-z0-9]{8,}$/,
      /^\[INACTIVE\]/,
      /^Group /,
      /^แชทส่วนตัว$/,
      /^personal_/
    ];
    
    const isAbbreviated = abbreviatedPatterns.some(pattern => pattern.test(testCase.oldName));
    const shortId = testCase.lineGroupId.length > 8 ? testCase.lineGroupId.substring(0, 8) : testCase.lineGroupId;
    const isIdAbbreviation = testCase.oldName.includes(shortId) || testCase.oldName.includes(testCase.lineGroupId);
    const result = isAbbreviated || isIdAbbreviation;
    
    console.log(`   Result: ${result}`);
    
    if (result === testCase.expected) {
      console.log('   ✅ PASSED\n');
      passed++;
    } else {
      console.log('   ❌ FAILED\n');
      failed++;
    }
  });
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// ฟังก์ชันทดสอบการเชื่อมต่อ API
async function testAPIConnection() {
  console.log('\n🌐 ทดสอบการเชื่อมต่อ API...\n');
  
  try {
    const response = await updateGroupNames();
    console.log('✅ API Connection Test: PASSED');
    console.log(`📊 Response: ${JSON.stringify(response, null, 2)}`);
    return true;
  } catch (error) {
    console.log('❌ API Connection Test: FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// ฟังก์ชันทดสอบการทำงานแบบ end-to-end
async function testEndToEnd() {
  console.log('\n🔄 ทดสอบการทำงานแบบ end-to-end...\n');
  
  try {
    console.log('1️⃣ เรียกใช้ API endpoint...');
    const response = await updateGroupNames();
    
    console.log('2️⃣ ตรวจสอบ response structure...');
    if (!response.success) {
      throw new Error('API response indicates failure');
    }
    
    if (!response.data || typeof response.data.total !== 'number') {
      throw new Error('Invalid response data structure');
    }
    
    console.log('3️⃣ ตรวจสอบผลลัพธ์...');
    console.log(`   Total groups: ${response.data.total}`);
    console.log(`   Updated: ${response.data.updated}`);
    console.log(`   Skipped: ${response.data.skipped}`);
    console.log(`   Errors: ${response.data.errors}`);
    
    if (response.data.details && response.data.details.length > 0) {
      console.log('\n4️⃣ รายละเอียดการอัพเดท:');
      response.data.details.forEach((detail, index) => {
        const status = detail.status === 'updated' ? '✅' : 
                     detail.status === 'skipped' ? '⏭️' : '❌';
        console.log(`   ${status} ${detail.groupId}: ${detail.oldName}${detail.newName ? ` → ${detail.newName}` : ''}`);
      });
    }
    
    console.log('\n✅ End-to-End Test: PASSED');
    return true;
    
  } catch (error) {
    console.log('\n❌ End-to-End Test: FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// ฟังก์ชันทดสอบการจัดการ error
async function testErrorHandling() {
  console.log('\n🚨 ทดสอบการจัดการ error...\n');
  
  try {
    // ทดสอบการเรียก API ด้วย URL ที่ไม่ถูกต้อง
    const originalUrl = process.env.API_BASE_URL;
    process.env.API_BASE_URL = 'http://invalid-url:9999';
    
    console.log('1️⃣ ทดสอบการเชื่อมต่อกับ URL ที่ไม่ถูกต้อง...');
    try {
      await updateGroupNames();
      console.log('   ❌ Expected error but got success');
      return false;
    } catch (error) {
      console.log('   ✅ Correctly caught connection error');
    }
    
    // คืนค่า URL เดิม
    if (originalUrl) {
      process.env.API_BASE_URL = originalUrl;
    } else {
      delete process.env.API_BASE_URL;
    }
    
    console.log('\n✅ Error Handling Test: PASSED');
    return true;
    
  } catch (error) {
    console.log('\n❌ Error Handling Test: FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// ฟังก์ชันหลักสำหรับการทดสอบ
async function runAllTests() {
  console.log('🚀 เริ่มต้นการทดสอบระบบอัพเดทชื่อกลุ่ม\n');
  console.log('=' .repeat(50));
  
  const results = {
    abbreviatedDetection: false,
    apiConnection: false,
    endToEnd: false,
    errorHandling: false
  };
  
  // ทดสอบการตรวจจับชื่อกลุ่มที่เป็นตัวย่อ
  const detectionResult = testAbbreviatedNameDetection();
  results.abbreviatedDetection = detectionResult.failed === 0;
  
  // ทดสอบการเชื่อมต่อ API
  results.apiConnection = await testAPIConnection();
  
  // ทดสอบการทำงานแบบ end-to-end
  if (results.apiConnection) {
    results.endToEnd = await testEndToEnd();
  }
  
  // ทดสอบการจัดการ error
  results.errorHandling = await testErrorHandling();
  
  // สรุปผลการทดสอบ
  console.log('\n' + '=' .repeat(50));
  console.log('📊 สรุปผลการทดสอบ');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} - ${testName}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! System is ready for production.');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please check the issues above.');
    process.exit(1);
  }
}

// ฟังก์ชันสำหรับการทดสอบเฉพาะส่วน
async function runSpecificTest(testName) {
  console.log(`🎯 Running specific test: ${testName}\n`);
  
  switch (testName) {
    case 'detection':
      testAbbreviatedNameDetection();
      break;
    case 'api':
      await testAPIConnection();
      break;
    case 'e2e':
      await testEndToEnd();
      break;
    case 'error':
      await testErrorHandling();
      break;
    default:
      console.log('❌ Unknown test name. Available tests: detection, api, e2e, error');
      process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // รันการทดสอบเฉพาะส่วน
    runSpecificTest(args[0]);
  } else {
    // รันการทดสอบทั้งหมด
    runAllTests();
  }
}

module.exports = {
  testAbbreviatedNameDetection,
  testAPIConnection,
  testEndToEnd,
  testErrorHandling,
  runAllTests
};
