# การแก้ไขปัญหาการดาวน์โหลดไฟล์

## ปัญหาที่พบ
- การดาวน์โหลดไฟล์จาก URL ภายนอก (Cloudinary) ล้มเหลว
- ไม่มีการจัดการ timeout และ retry logic
- การ logging มากเกินไปทำให้เกิด Railway rate limit
- การจัดการ error ไม่เหมาะสม

## การแก้ไขที่ทำ

### 1. ปรับปรุง FileService.getFileContent()
**ไฟล์**: `src/services/FileService.ts`

#### การเปลี่ยนแปลง:
- เพิ่ม method `downloadRemoteFile()` แยกออกมา
- เพิ่ม timeout 30 วินาทีสำหรับการดาวน์โหลด
- เพิ่ม retry logic (ลองใหม่ 3 ครั้ง)
- เพิ่ม exponential backoff (รอ 1, 2, 3 วินาที)
- เพิ่ม User-Agent header
- ลดการ logging เพื่อป้องกัน rate limit

#### โค้ดที่เพิ่ม:
```typescript
private async downloadRemoteFile(file: File): Promise<{
  content: Buffer;
  mimeType: string;
  originalName: string;
}> {
  const maxRetries = 3;
  const timeout = 30000; // 30 วินาที
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const res = await fetch(file.path, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LekaBot/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const arrayBuf = await res.arrayBuffer();
      const content = Buffer.from(arrayBuf);
      
      return { 
        content, 
        mimeType: file.mimeType, 
        originalName: file.originalName 
      };
      
    } catch (error) {
      if (attempt === maxRetries) {
        if (error instanceof Error) {
          throw new Error(`Failed to fetch remote file after ${maxRetries} attempts: ${error.message}`);
        }
        throw new Error(`Failed to fetch remote file after ${maxRetries} attempts`);
      }
      
      // รอสักครู่ก่อนลองใหม่
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error('Failed to fetch remote file');
}
```

### 2. ปรับปรุงการจัดการ Error ใน ApiController
**ไฟล์**: `src/controllers/apiController.ts`

#### การเปลี่ยนแปลง:
- ลดการ logging เพื่อป้องกัน rate limit
- เพิ่มการตรวจสอบประเภทของ error
- ส่ง HTTP status code ที่เหมาะสม:
  - 404: File not found
  - 503: File temporarily unavailable (สำหรับ remote file errors)
  - 500: Internal server error

#### โค้ดที่แก้ไข:
```typescript
} catch (error) {
  // ลดการ logging เพื่อป้องกัน rate limit
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  // ตรวจสอบประเภทของ error เพื่อส่ง status code ที่เหมาะสม
  if (errorMessage.includes('File not found')) {
    res.status(404).json({ 
      success: false, 
      error: 'File not found' 
    });
  } else if (errorMessage.includes('Failed to fetch remote file')) {
    res.status(503).json({ 
      success: false, 
      error: 'File temporarily unavailable' 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
```

### 3. ลดการ Logging ใน FileService
**ไฟล์**: `src/services/FileService.ts`

#### การเปลี่ยนแปลง:
- ลบ console.error ใน method ที่ไม่จำเป็น
- ลดการ spam log เพื่อป้องกัน Railway rate limit

### 4. ลดการ Logging ใน WebhookController
**ไฟล์**: `src/controllers/webhookController.ts`

#### การเปลี่ยนแปลง:
- Comment out console.error ที่ไม่จำเป็น
- ลดการ logging เพื่อป้องกัน rate limit

## ผลลัพธ์ที่คาดหวัง

### 1. การดาวน์โหลดไฟล์ที่เสถียรขึ้น
- มี timeout ป้องกันการค้าง
- มี retry logic เมื่อการดาวน์โหลดล้มเหลว
- จัดการ error ได้ดีขึ้น

### 2. ลดปัญหา Railway Rate Limit
- ลดการ logging ที่ไม่จำเป็น
- ป้องกันการ spam log

### 3. ประสบการณ์ผู้ใช้ที่ดีขึ้น
- ได้รับ error message ที่ชัดเจน
- HTTP status code ที่เหมาะสม
- การตอบสนองที่เร็วขึ้น

## การทดสอบ

สร้างไฟล์ `test-file-download-fix.js` เพื่อทดสอบ:
- การดาวน์โหลดจาก URL ที่ไม่ถูกต้อง
- การทดสอบ retry logic
- การจัดการ timeout

## การ Deploy

1. Build โปรเจค:
```bash
npm run build
```

2. Deploy ไปยัง Railway

3. ตรวจสอบ logs ว่าการดาวน์โหลดไฟล์ทำงานได้ปกติ

## การติดตามผล

หลังจาก deploy แล้ว ให้ตรวจสอบ:
- จำนวน error logs ลดลง
- การดาวน์โหลดไฟล์ทำงานได้ปกติ
- ไม่มี Railway rate limit อีกต่อไป
