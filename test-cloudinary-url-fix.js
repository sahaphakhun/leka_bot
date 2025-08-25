const { v2: cloudinary } = require('cloudinary');

// ตั้งค่า environment variables สำหรับ test
process.env.CLOUDINARY_CLOUD_NAME = 'dqe39sjzf';
process.env.CLOUDINARY_API_KEY = 'your-api-key'; // ใส่ API key จริง
process.env.CLOUDINARY_API_SECRET = 'your-api-secret'; // ใส่ API secret จริง

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ฟังก์ชันทดสอบการแยก publicId จาก URL
function testExtractPublicId() {
  const testUrl = 'https://res.cloudinary.com/dqe39sjzf/image/upload/s--fYSeATnB--/v1756056963/leka-uploads/Cec6a57dd1dad2d1daf74f3c1e7913530/1756056961419_45e3d6ab8a6e?_a=BAMAK+Ri0';
  
  console.log('🔍 Testing URL parsing:');
  console.log('Original URL:', testUrl);
  
  const urlObj = new URL(testUrl);
  const parts = urlObj.pathname.split('/').filter(Boolean);
  
  console.log('Path parts:', parts);
  
  // Remove cloud name segment if present
  if (parts[0] === process.env.CLOUDINARY_CLOUD_NAME) {
    parts.shift();
  }
  
  const resourceType = parts[0] || 'image';
  const deliveryType = parts[1] || 'upload';
  
  console.log('Resource type:', resourceType);
  console.log('Delivery type:', deliveryType);
  
  // Find version segment (e.g., v1)
  let version: string | undefined;
  let versionIndex = -1;
  for (let i = 2; i < parts.length; i++) {
    if (parts[i].startsWith('v')) {
      version = parts[i].substring(1);
      versionIndex = i;
      break;
    }
  }
  
  console.log('Version:', version);
  console.log('Version index:', versionIndex);
  
  // สร้าง publicId จากส่วนที่เหลือของ path
  let publicId: string;
  if (versionIndex !== -1) {
    // เอาเฉพาะส่วนหลังจาก version
    publicId = parts.slice(versionIndex + 1).join('/');
  } else {
    // ถ้าไม่มี version ให้เอาเฉพาะส่วนหลังจาก deliveryType
    publicId = parts.slice(2).join('/');
  }
  
  // ลบ query parameters ออกจาก publicId
  publicId = publicId.split('?')[0];
  
  console.log('Extracted publicId:', publicId);
  
  // ทดสอบสร้าง signed URL
  const options = {
    resource_type: resourceType,
    type: deliveryType,
    sign_url: true,
    secure: true,
  };
  if (version) options.version = version;
  
  try {
    const signedUrl = cloudinary.url(publicId, options);
    console.log('✅ Signed URL:', signedUrl);
    return signedUrl;
  } catch (error) {
    console.error('❌ Error creating signed URL:', error);
    return null;
  }
}

// ฟังก์ชันทดสอบการเข้าถึงไฟล์
async function testFileAccess(signedUrl) {
  if (!signedUrl) {
    console.log('❌ No signed URL to test');
    return;
  }
  
  console.log('\n🔍 Testing file access:');
  console.log('Signed URL:', signedUrl);
  
  try {
    const https = require('https');
    const response = await new Promise((resolve, reject) => {
      https.get(signedUrl, (res) => {
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        resolve(res);
      }).on('error', reject);
    });
    
    if (response.statusCode === 200) {
      console.log('✅ File access successful!');
    } else {
      console.log('❌ File access failed with status:', response.statusCode);
    }
  } catch (error) {
    console.error('❌ Error accessing file:', error.message);
  }
}

// รันการทดสอบ
async function runTests() {
  console.log('🚀 Starting Cloudinary URL fix tests...\n');
  
  const signedUrl = testExtractPublicId();
  await testFileAccess(signedUrl);
  
  console.log('\n✅ Tests completed!');
}

// ตรวจสอบ environment variables
if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.log('⚠️ Please set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables');
  console.log('Example:');
  console.log('export CLOUDINARY_API_KEY="your-api-key"');
  console.log('export CLOUDINARY_API_SECRET="your-api-secret"');
} else {
  runTests();
}
