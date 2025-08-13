# การเพิ่มการดึงรายชื่อสมาชิกจาก LINE API

## สิ่งที่แก้ไข

### 1. เพิ่มฟังก์ชันใหม่ใน LineService (`src/services/LineService.ts`)

- **`getGroupMemberUserIds(groupId: string)`**: ดึงรายชื่อสมาชิกทั้งหมดในกลุ่มจาก LINE API
- **`getAllGroupMembers(groupId: string)`**: ดึงข้อมูลสมาชิกทั้งหมดในกลุ่มพร้อมรายละเอียด (displayName, pictureUrl)

### 2. เพิ่ม endpoint ใหม่ใน API Controller (`src/controllers/apiController.ts`)

- **`GET /api/line/members/:groupId`**: endpoint สำหรับดึงรายชื่อสมาชิกจาก LINE API
- เพิ่ม `LineService` ใน controller เพื่อใช้งานฟังก์ชันใหม่

### 3. ปรับปรุง Dashboard JavaScript (`dashboard/script.js`)

- **`loadGroupMembers()`**: ปรับปรุงให้ลองดึงจาก LINE API ก่อน แล้ว fallback ไปฐานข้อมูล
- **`loadLineMembers()`**: ฟังก์ชันใหม่สำหรับดึงรายชื่อสมาชิกจาก LINE API โดยตรง

## การใช้งาน

### API Endpoint ใหม่

```bash
GET /api/line/members/{groupId}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "U1234567890abcdef",
      "displayName": "ชื่อผู้ใช้",
      "pictureUrl": "https://..."
    }
  ]
}
```

### การใช้งานใน Dashboard

ระบบจะพยายามดึงรายชื่อสมาชิกจาก LINE API ก่อน หากไม่สำเร็จจะ fallback ไปใช้ข้อมูลจากฐานข้อมูล

## ประโยชน์

1. **ข้อมูลอัปเดต**: ได้ข้อมูลสมาชิกที่อัปเดตจาก LINE โดยตรง
2. **Fallback System**: หาก LINE API ไม่ทำงาน ระบบยังคงใช้ข้อมูลจากฐานข้อมูลได้
3. **ประสิทธิภาพ**: ลดการ sync ข้อมูลระหว่างฐานข้อมูลกับ LINE
4. **ความแม่นยำ**: แสดงรายชื่อสมาชิกที่อยู่ในกลุ่มจริงๆ ในปัจจุบัน

## หมายเหตุ

- ฟังก์ชันใหม่ใช้ LINE Messaging API: `getGroupMemberUserIds` และ `getGroupMemberProfile`
- ข้อมูลที่ได้จะถูกแปลงให้เข้ากับ format เดิมของระบบ
- หากไม่สามารถดึงข้อมูลจาก LINE API ได้ ระบบจะแสดง warning และใช้ข้อมูลจากฐานข้อมูลแทน

## การทดสอบ

1. ตรวจสอบว่า endpoint `/api/line/members/{groupId}` ทำงานได้
2. ตรวจสอบว่า dashboard แสดงรายชื่อสมาชิกได้ถูกต้อง
3. ตรวจสอบ fallback system เมื่อ LINE API ไม่ทำงาน
