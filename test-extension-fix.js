// ทดสอบการทำงานของฟังก์ชัน ensureExtension
function ensureExtension(name, mimeType) {
  // ตรวจสอบว่าชื่อไฟล์มีนามสกุลหรือไม่
  const hasExt = /\.[A-Za-z0-9]{1,8}$/i.test(name);
  if (hasExt) return name;
  
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/json': '.json',
    'application/xml': '.xml',
    'application/octet-stream': '.bin'
  };
  const ext = map[mimeType] || '.bin';
  return name + ext;
}

// ทดสอบกรณีต่างๆ
const testCases = [
  { name: 'document_12345678', mimeType: 'application/pdf', expected: 'document_12345678.pdf' },
  { name: 'image_87654321', mimeType: 'image/jpeg', expected: 'image_87654321.jpg' },
  { name: 'video_abcdef12', mimeType: 'video/mp4', expected: 'video_abcdef12.mp4' },
  { name: 'file_xyz78901', mimeType: 'application/octet-stream', expected: 'file_xyz78901.bin' },
  { name: 'test.pdf', mimeType: 'application/pdf', expected: 'test.pdf' }, // มีนามสกุลแล้ว
  { name: 'image.jpg', mimeType: 'image/jpeg', expected: 'image.jpg' }, // มีนามสกุลแล้ว
  { name: '', mimeType: 'application/pdf', expected: '.pdf' }, // ชื่อว่าง
  { name: 'file_123', mimeType: 'unknown/mime', expected: 'file_123.bin' } // mime type ไม่รู้จัก
];

console.log('🧪 ทดสอบฟังก์ชัน ensureExtension');
console.log('=====================================');

testCases.forEach((testCase, index) => {
  const result = ensureExtension(testCase.name, testCase.mimeType);
  const status = result === testCase.expected ? '✅' : '❌';
  
  console.log(`\n📋 Test Case ${index + 1}:`);
  console.log(`   Input: name="${testCase.name}", mimeType="${testCase.mimeType}"`);
  console.log(`   Expected: ${testCase.expected}`);
  console.log(`   Result: ${result}`);
  console.log(`   Status: ${status}`);
  
  if (result !== testCase.expected) {
    console.log(`   ❌ FAILED: Expected "${testCase.expected}" but got "${result}"`);
  }
});

console.log('\n📝 สรุปการทดสอบ:');
console.log('- ฟังก์ชัน ensureExtension ควรเพิ่มนามสกุลไฟล์ตาม mimeType');
console.log('- ถ้าชื่อไฟล์มีนามสกุลแล้ว ไม่ควรเพิ่มซ้ำ');
console.log('- ถ้า mimeType ไม่รู้จัก ควรใช้ .bin เป็น default');
