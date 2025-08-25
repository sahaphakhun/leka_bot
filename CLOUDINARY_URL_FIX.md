# การแก้ไขปัญหา Cloudinary 401 Unauthorized Error

## ปัญหาที่พบ
- ไฟล์ที่อัปโหลดไป Cloudinary แสดง error 401 Unauthorized เมื่อพยายามเข้าถึง
- รูปภาพสามารถดูได้ปกติ แต่ไฟล์อื่นๆ (PDF, DOC, etc.) ไม่สามารถเข้าถึงได้
- ปัญหาเกิดจากการที่ Cloudinary URL ไม่ได้ถูกเซ็นชื่อ (signed) อย่างถูกต้อง
- **ปัญหาหลัก**: การกำหนด resourceType ไม่ถูกต้อง (ไฟล์ PDF ถูกกำหนดเป็น 'image' แทนที่จะเป็น 'raw')

## สาเหตุของปัญหา
1. **การแยก publicId ไม่ถูกต้อง**: ฟังก์ชัน `signCloudinaryUrl` ไม่สามารถแยก `publicId` ออกจาก URL ได้อย่างถูกต้อง
2. **การจัดการ version segment**: ไม่ได้จัดการ version segment (เช่น v1, v2) อย่างถูกต้อง
3. **การจัดการ query parameters**: ไม่ได้ลบ query parameters ออกจาก publicId
4. **การกำหนด resourceType ผิด**: ใช้ resourceType จาก URL path แทนที่จะใช้จาก mimeType ของไฟล์

## การแก้ไขที่ทำ

### 1. ปรับปรุงฟังก์ชัน `signCloudinaryUrl` ใน `src/services/FileService.ts`

```typescript
private signCloudinaryUrl(file: File): string {
  try {
    if (
      !config.cloudinary.cloudName ||
      !config.cloudinary.apiSecret ||
      !file.path.includes('res.cloudinary.com')
    ) {
      return file.path;
    }

    const urlObj = new URL(file.path);
    const parts = urlObj.pathname.split('/').filter(Boolean);

    // Remove cloud name segment if present
    if (parts[0] === config.cloudinary.cloudName) {
      parts.shift();
    }

    // กำหนด resourceType ตาม mimeType ของไฟล์ (แก้ไขใหม่)
    let resourceType: string;
    if (file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/')) {
      resourceType = 'video';
    } else if (file.mimeType.startsWith('application/') || file.mimeType.startsWith('text/')) {
      resourceType = 'raw';
    } else {
      resourceType = 'image';
    }

    const deliveryType = parts[1] || 'upload';

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

    // สร้าง publicId จากส่วนที่เหลือของ path
    let publicId: string;
    if (versionIndex !== -1) {
      // เอาเฉพาะส่วนหลังจาก version
      publicId = parts.slice(versionIndex + 1).join('/');
    } else {
      // ถ้าไม่มี version ให้เอาเฉพาะส่วนหลังจาก deliveryType
      publicId = parts.slice(2).join('/');
    }

    // ถ้าไม่มี publicId ให้ใช้ storageKey หรือ fileName
    if (!publicId || publicId === '') {
      publicId = file.storageKey || file.fileName;
    }

    // ลบ query parameters ออกจาก publicId
    publicId = publicId.split('?')[0];

    const options: any = {
      resource_type: resourceType,
      type: deliveryType,
      sign_url: true,
      secure: true,
    };
    if (version) options.version = version;

    logger.info(`🔐 Signing Cloudinary URL:`, {
      publicId,
      resourceType,
      deliveryType,
      version,
      originalPath: file.path,
      mimeType: file.mimeType
    });

    return cloudinary.url(publicId, options);
  } catch (err) {
    logger.warn('⚠️ Failed to sign Cloudinary URL', err);
    return file.path;
  }
}
```

### 2. เพิ่มการตรวจสอบและ debug logging

```typescript
// ใน constructor ของ FileService
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret
  });
  logger.info('✅ Cloudinary configured successfully', {
    cloudName: config.cloudinary.cloudName,
    apiKey: config.cloudinary.apiKey ? '***' + config.cloudinary.apiKey.slice(-4) : 'undefined',
    apiSecret: config.cloudinary.apiSecret ? '***' + config.cloudinary.apiSecret.slice(-4) : 'undefined',
    uploadFolder: config.cloudinary.uploadFolder
  });
} else {
  logger.warn('⚠️ Cloudinary not configured - missing environment variables', {
    cloudName: !!config.cloudinary.cloudName,
    apiKey: !!config.cloudinary.apiKey,
    apiSecret: !!config.cloudinary.apiSecret
  });
}
```

### 3. ปรับปรุงฟังก์ชัน `resolveFileUrl`

```typescript
public resolveFileUrl(file: File): string {
  if (!file.path) return file.path;
  
  if (file.storageProvider === 'cloudinary') {
    const signedUrl = this.signCloudinaryUrl(file);
    logger.info(`🔗 Resolved Cloudinary URL:`, {
      originalPath: file.path,
      signedUrl: signedUrl,
      fileId: file.id,
      fileName: file.fileName
    });
    return signedUrl;
  }
  
  return file.path;
}
```

## การกำหนด ResourceType ที่ถูกต้อง

| MIME Type | Resource Type | ตัวอย่างไฟล์ |
|-----------|---------------|-------------|
| `image/*` | `image` | JPG, PNG, GIF, WebP |
| `video/*` | `video` | MP4, MOV, AVI |
| `audio/*` | `video` | MP3, WAV, AAC |
| `application/*` | `raw` | PDF, DOC, XLS, ZIP |
| `text/*` | `raw` | TXT, JSON, XML |

## การทดสอบ

### ไฟล์ test: `test-cloudinary-fix-v2.js`
- ทดสอบการแยก publicId จาก URL
- ทดสอบการกำหนด resourceType ตาม mimeType
- ทดสอบการสร้าง signed URL
- ทดสอบการเข้าถึงไฟล์

### วิธีการรัน test
```bash
# ตั้งค่า environment variables
export CLOUDINARY_API_KEY="your-api-key"
export CLOUDINARY_API_SECRET="your-api-secret"

# รัน test
node test-cloudinary-fix-v2.js
```

## Environment Variables ที่ต้องตรวจสอบ

ตรวจสอบว่า environment variables เหล่านี้ถูกตั้งค่าใน Railway:

```bash
CLOUDINARY_CLOUD_NAME=dqe39sjzf
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=leka-uploads
```

## ผลลัพธ์ที่คาดหวัง

หลังจากแก้ไขแล้ว:
1. ไฟล์ทั้งหมดที่อัปโหลดไป Cloudinary จะสามารถเข้าถึงได้โดยไม่มี 401 error
2. URL ที่สร้างขึ้นจะมี signature ที่ถูกต้อง
3. ResourceType จะถูกกำหนดตาม mimeType ของไฟล์
4. ระบบจะแสดง log ที่ชัดเจนเมื่อมีการเซ็นชื่อ URL

## การตรวจสอบ

1. ตรวจสอบ log เมื่อเริ่มต้นแอปพลิเคชัน:
   ```
   ✅ Cloudinary configured successfully
   ```

2. ตรวจสอบ log เมื่อเข้าถึงไฟล์:
   ```
   🔐 Signing Cloudinary URL: { publicId, resourceType, deliveryType, version, originalPath, mimeType }
   🔗 Resolved Cloudinary URL: { originalPath, signedUrl, fileId, fileName }
   ```

3. ทดสอบการเข้าถึงไฟล์ผ่าน dashboard หรือ API endpoint

## หมายเหตุ

- การแก้ไขนี้จะไม่กระทบกับไฟล์ที่เก็บใน local storage
- ไฟล์ที่อัปโหลดใหม่จะใช้ signed URL โดยอัตโนมัติ
- ไฟล์เก่าที่มีปัญหา 401 จะได้รับการแก้ไขเมื่อมีการเข้าถึงครั้งต่อไป
- **สำคัญ**: ResourceType จะถูกกำหนดตาม mimeType ของไฟล์ ไม่ใช่จาก URL path
