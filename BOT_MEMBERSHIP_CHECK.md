# 🤖 Bot Membership Check & Cleanup System

ระบบตรวจสอบการเป็นสมาชิกของ LINE Bot ในกลุ่มและลบข้อมูลงานอัตโนมัติ

## 📋 ภาพรวม

ระบบนี้จะตรวจสอบทุกวันว่า LINE Bot ยังอยู่ในกลุ่มหรือไม่ หาก Bot ไม่อยู่ในกลุ่มแล้ว ระบบจะลบข้อมูลงานทั้งหมดในกลุ่มนั้นอัตโนมัติ (แต่จะไม่ลบข้อมูลผู้ใช้ เพราะอาจจะอยู่ในกลุ่มอื่น)

## 🔧 ฟีเจอร์ที่เพิ่มเข้ามา

### 1. ฟังก์ชันใน TaskService

#### `checkBotMembershipInGroup(groupId: string): Promise<boolean>`
- ตรวจสอบว่า Bot ยังอยู่ในกลุ่มหรือไม่
- ใช้ LINE API `getGroupIds()` เพื่อดึงรายการกลุ่มที่บอทเป็นสมาชิก
- เปรียบเทียบ groupId กับรายการที่ได้
- คืนค่า `true` หาก Bot ยังอยู่ในกลุ่ม, `false` หากไม่อยู่

#### `deleteAllTasksInGroup(groupId: string): Promise<{success: boolean, deletedCount: number, errors: string[]}>`
- ลบงานทั้งหมดในกลุ่ม
- ลบไฟล์แนบและ Google Calendar events ด้วย
- คืนค่าสถิติการลบ

#### `checkAndCleanupInactiveGroups(): Promise<{checkedGroups: number, cleanedGroups: number, totalDeletedTasks: number, errors: string[]}>`
- ตรวจสอบกลุ่มทั้งหมดในฐานข้อมูล
- ลบข้อมูลงานของกลุ่มที่ Bot ไม่อยู่แล้ว
- คืนค่าสถิติการตรวจสอบและทำความสะอาด

### 2. Cron Job ใหม่

#### เวลาทำงาน: ทุกวันเวลา 10:00 น.
- ตรวจสอบการเป็นสมาชิกของ Bot ในทุกกลุ่ม
- ลบข้อมูลงานของกลุ่มที่ Bot ไม่อยู่แล้ว
- ส่งรายงานการทำความสะอาด (log)

### 3. API Endpoint ใหม่

#### `POST /admin/check-bot-membership`
- เรียกใช้การตรวจสอบและทำความสะอาดด้วยตนเอง
- ใช้สำหรับการทดสอบหรือการบังคับรัน
- คืนค่าสถิติการทำงาน

## 🚀 วิธีการใช้งาน

### การทดสอบด้วยตนเอง

```bash
# ทดสอบการตรวจสอบการเป็นสมาชิก
node test-bot-membership-check.js

# ทดสอบผ่าน API
curl -X POST http://localhost:3000/api/admin/check-bot-membership
```

### การตรวจสอบผ่าน API

```javascript
// เรียกใช้ API endpoint
const response = await fetch('/api/admin/check-bot-membership', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('ผลการตรวจสอบ:', result.data.result);
```

## 📊 ตัวอย่างผลลัพธ์

```json
{
  "success": true,
  "data": {
    "message": "Bot membership check and cleanup completed",
    "result": {
      "checkedGroups": 5,
      "cleanedGroups": 2,
      "totalDeletedTasks": 15,
      "errors": []
    }
  }
}
```

## ⚠️ ข้อควรระวัง

1. **การลบข้อมูล**: ระบบจะลบงานทั้งหมดในกลุ่มที่ Bot ไม่อยู่แล้ว
2. **ข้อมูลผู้ใช้**: จะไม่ลบข้อมูลผู้ใช้ เพราะอาจจะอยู่ในกลุ่มอื่น
3. **การสำรองข้อมูล**: ควรมีการสำรองข้อมูลก่อนใช้งาน
4. **สิทธิ์ Bot**: Bot ต้องมีสิทธิ์ "Get group IDs" ใน LINE Bot Console

## 🔍 การตรวจสอบสถานะ

### Error Codes
- **API Error**: ข้อผิดพลาดในการเรียก LINE API (ถือว่า Bot ยังอยู่ในกลุ่มเพื่อความปลอดภัย)

### Log Messages
```
✅ Bot ยังอยู่ในกลุ่ม: C5d6c442ec0b3287f71787fdd9437e520
🚫 Bot ไม่อยู่ในกลุ่ม: C5d6c442ec0b3287f71787fdd9437e520
❌ Error checking bot membership for group: C5d6c442ec0b3287f71787fdd9437e520
```

## 🛠️ การตั้งค่า

### Environment Variables
```bash
# ต้องมี LINE Bot credentials
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here

# สำหรับการทดสอบ
TEST_GROUP_ID=C5d6c442ec0b3287f71787fdd9437e520
```

### LINE Bot Console Settings
- เปิดใช้งาน "Get group IDs" permission

## 📝 การพัฒนาต่อ

### ฟีเจอร์ที่อาจเพิ่มในอนาคต
1. การส่งการแจ้งเตือนให้ admin เมื่อมีการทำความสะอาด
2. การตั้งค่าเวลาตรวจสอบที่ยืดหยุ่น
3. การยกเว้นกลุ่มบางกลุ่มจากการตรวจสอบ
4. การเก็บสถิติการทำความสะอาดในฐานข้อมูล

## 🐛 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย
1. **API Error**: ตรวจสอบสิทธิ์ "Get group IDs" ใน LINE Bot Console
2. **การลบไม่สำเร็จ**: ตรวจสอบการเชื่อมต่อฐานข้อมูล

### การ Debug
```bash
# ดู log ของระบบ
tail -f logs/app.log

# ทดสอบการเชื่อมต่อ LINE API
node test-line-members.js
```

## 📞 การสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา
