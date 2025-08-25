# การแก้ไขปัญหานามสกุลไฟล์ที่หายไป

## ปัญหา
เมื่อดาวน์โหลดไฟล์จากหน้า dashboard ที่ URL:
```
https://lekabot-production.up.railway.app/dashboard/?groupId=2f5b9113-b8cf-4196-8929-bff6b26cbd65&taskId=9f7c3ee8-3735-45fc-88b0-194d5316a51f&action=view
```

ไฟล์ที่ดาวน์โหลดได้ไม่มีนามสกุล (extension) ทำให้ระบบปฏิบัติการไม่สามารถระบุประเภทไฟล์ได้

## สาเหตุ
ปัญหานี้เกิดจากการที่ฟังก์ชัน `generateSafeFileName` ใน `FileService.ts` ไม่ได้เพิ่มนามสกุลไฟล์เมื่อสร้างชื่อไฟล์ใหม่สำหรับไฟล์ที่ไม่มีชื่อเดิม

### โค้ดเดิมที่มีปัญหา:
```typescript
// ถ้าไม่มีชื่อไฟล์ ให้สร้างชื่อจาก messageId และ fileType
const typeMap: Record<string, string> = {
  'image': 'image',
  'video': 'video',
  'audio': 'audio',
  'file': 'document'
};

const typeName = typeMap[fileType || 'file'] || 'file';
const id = messageId ? messageId.substring(0, 8) : 'unknown';

return `${typeName}_${id}`; // ❌ ไม่มีนามสกุล
```

## การแก้ไข

### 1. ปรับปรุงฟังก์ชัน `generateSafeFileName`
- เพิ่มพารามิเตอร์ `mimeType` เพื่อรับข้อมูล MIME type
- ใช้ฟังก์ชัน `getFileExtension` เพื่อสร้างนามสกุลที่ถูกต้อง

```typescript
private generateSafeFileName(fileName?: string, messageId?: string, fileType?: string, mimeType?: string): string {
  // ถ้ามีชื่อไฟล์เดิม ให้ใช้ชื่อนั้น
  if (fileName && fileName.trim() !== '') {
    // ... existing code ...
    return safeName;
  }
  
  // ถ้าไม่มีชื่อไฟล์ ให้สร้างชื่อจาก messageId และ fileType พร้อมนามสกุล
  const typeMap: Record<string, { name: string; ext: string }> = {
    'image': { name: 'image', ext: '.jpg' },
    'video': { name: 'video', ext: '.mp4' },
    'audio': { name: 'audio', ext: '.mp3' },
    'file': { name: 'document', ext: '.pdf' }
  };
  
  const typeInfo = typeMap[fileType || 'file'] || { name: 'file', ext: '.pdf' };
  const id = messageId ? messageId.substring(0, 8) : 'unknown';
  
  // ถ้ามี mimeType ให้ใช้ getFileExtension เพื่อหานามสกุลที่ถูกต้อง
  let extension = typeInfo.ext;
  if (mimeType) {
    extension = this.getFileExtension(mimeType);
  }
  
  return `${typeInfo.name}_${id}${extension}`; // ✅ มีนามสกุลแล้ว
}
```

### 2. ปรับปรุงฟังก์ชัน `getFileExtension`
- เพิ่มการรองรับ MIME type เพิ่มเติม
- เพิ่ม `application/octet-stream` สำหรับไฟล์ทั่วไป

```typescript
private getFileExtension(mimeType: string, originalName?: string): string {
  // ... existing code ...
  
  const mimeToExt: { [key: string]: string } = {
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

  return mimeToExt[mimeType] || '.bin';
}
```

### 3. ปรับปรุงฟังก์ชัน `saveFileFromLine`
- เพิ่มการกำหนด MIME type ที่ชัดเจนขึ้น
- ส่ง MIME type ไปยัง `generateSafeFileName`

```typescript
// กำหนด mimeType ตามประเภทไฟล์
let mimeType: string;
switch (message.type) {
  case 'image':
    mimeType = 'image/jpeg';
    break;
  case 'video':
    mimeType = 'video/mp4';
    break;
  case 'audio':
    mimeType = 'audio/mp3';
    break;
  case 'file':
    mimeType = 'application/octet-stream';
    break;
  default:
    mimeType = 'application/octet-stream';
}

const fileData = {
  // ... existing code ...
  originalName: this.generateSafeFileName(message.fileName, message.id, message.type, mimeType),
  mimeType: mimeType,
  // ... existing code ...
};
```

## ผลลัพธ์ที่คาดหวัง

### ก่อนแก้ไข:
- ไฟล์รูปภาพ: `image_12345678` (ไม่มีนามสกุล)
- ไฟล์วิดีโอ: `video_87654321` (ไม่มีนามสกุล)
- ไฟล์เสียง: `audio_abcdef12` (ไม่มีนามสกุล)
- ไฟล์ทั่วไป: `document_xyz78901` (ไม่มีนามสกุล)

### หลังแก้ไข:
- ไฟล์รูปภาพ: `image_12345678.jpg`
- ไฟล์วิดีโอ: `video_87654321.mp4`
- ไฟล์เสียง: `audio_abcdef12.mp3`
- ไฟล์ทั่วไป: `document_xyz78901.bin` (หรือตาม MIME type)

## การทดสอบ

สร้างไฟล์ `test-file-extension-fix.js` เพื่อทดสอบการแก้ไข:

```javascript
const testCases = [
  {
    fileName: 'test-image.jpg',
    messageId: '12345678',
    fileType: 'image',
    mimeType: 'image/jpeg',
    expected: 'test-image.jpg'
  },
  {
    fileName: '',
    messageId: '12345678',
    fileType: 'image',
    mimeType: 'image/jpeg',
    expected: 'image_12345678.jpg'
  },
  // ... more test cases
];
```

## ไฟล์ที่แก้ไข
1. `src/services/FileService.ts`
   - ฟังก์ชัน `generateSafeFileName`
   - ฟังก์ชัน `getFileExtension`
   - ฟังก์ชัน `saveFileFromLine`

## การ Deploy
การแก้ไขนี้จะทำให้ไฟล์ที่ดาวน์โหลดจากหน้า dashboard มีนามสกุลที่ถูกต้อง ทำให้ระบบปฏิบัติการสามารถระบุประเภทไฟล์และเปิดไฟล์ได้อย่างถูกต้อง
