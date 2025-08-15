# Image API Documentation

## ภาพรวม
Image API ถูกสร้างขึ้นเพื่อแก้ไขปัญหา HTTP 400 Bad Request ที่เกิดขึ้นกับรูปภาพ

## Endpoints

### 1. GET /api/images/:filename
ดึงรูปภาพตามชื่อไฟล์

**Parameters:**
- `filename` (string): ชื่อไฟล์รูปภาพ (เช่น `a77b1356-b4a4-4777-9ad2-e8b2cd6a32d5.jpg`)

**Response:**
- `200 OK`: ส่งไฟล์รูปภาพ
- `400 Bad Request`: ชื่อไฟล์ไม่ถูกต้อง
- `404 Not Found`: ไม่พบไฟล์รูปภาพ
- `500 Internal Server Error`: ข้อผิดพลาดภายในเซิร์ฟเวอร์

**ตัวอย่าง:**
```
GET /api/images/a77b1356-b4a4-4777-9ad2-e8b2cd6a32d5.jpg
```

### 2. GET /api/images
รายการรูปภาพทั้งหมดในระบบ

**Response:**
```json
{
  "images": [
    {
      "filename": "example.jpg",
      "url": "/api/images/example.jpg",
      "size": 1024,
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## การตั้งค่า

### โฟลเดอร์ uploads
- รูปภาพทั้งหมดจะถูกเก็บในโฟลเดอร์ `uploads/`
- โฟลเดอร์นี้จะถูกสร้างอัตโนมัติเมื่อเริ่มเซิร์ฟเวอร์
- ไฟล์ `.gitkeep` ถูกใช้เพื่อให้ Git ติดตามโฟลเดอร์

### ไฟล์ที่รองรับ
- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.webp`

## ความปลอดภัย
- ตรวจสอบ path traversal เพื่อป้องกันการเข้าถึงไฟล์ที่ไม่ได้รับอนุญาต
- ตรวจสอบนามสกุลไฟล์เพื่อให้แน่ใจว่าเป็นรูปภาพเท่านั้น
- ไม่แสดงข้อมูลภายในเซิร์ฟเวอร์ในข้อผิดพลาด

## การแก้ไขปัญหา

### ปัญหา: HTTP 400 Bad Request
**สาเหตุ:** ไม่มี endpoint `/api/images` ในระบบ

**การแก้ไข:**
1. สร้าง `imageController.ts` สำหรับจัดการรูปภาพ
2. เพิ่ม route `/api/images` ใน `index.ts`
3. สร้างโฟลเดอร์ `uploads/` สำหรับเก็บรูปภาพ

### การทดสอบ
```bash
# ทดสอบ endpoint รายการรูปภาพ
curl http://localhost:3000/api/images

# ทดสอบดึงรูปภาพ (ต้องมีไฟล์ใน uploads/ ก่อน)
curl http://localhost:3000/api/images/test-image.jpg
```

## การใช้งานกับ Next.js
หากใช้ Next.js เป็น frontend สามารถเรียกใช้ API ได้ดังนี้:

```javascript
// ตัวอย่างการเรียกใช้ใน Next.js
const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/images/filename.jpg`;
```

## การอัปเดต
- เพิ่ม endpoint `/api/images` ใน `src/index.ts`
- สร้าง `src/controllers/imageController.ts`
- อัปเดต `.gitignore` เพื่อติดตามโฟลเดอร์ `uploads/`
- สร้างโฟลเดอร์ `uploads/` พร้อมไฟล์ `.gitkeep`
