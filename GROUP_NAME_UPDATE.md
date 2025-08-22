# ระบบอัพเดทชื่อกลุ่มอัตโนมัติ

ระบบนี้ถูกออกแบบมาเพื่อแก้ไขปัญหาชื่อกลุ่มที่เป็นตัวย่อของไอดี (เช่น "กลุ่ม C1467a3d") ให้เป็นชื่อกลุ่มที่ถูกต้องโดยการดึงข้อมูลจาก LINE API

## ปัญหาที่แก้ไข

- ชื่อกลุ่มที่เป็นตัวย่อของ LINE Group ID
- ชื่อกลุ่มที่ไม่มีความหมาย (เช่น "กลุ่ม C1234567")
- ชื่อกลุ่มที่สร้างขึ้นโดยอัตโนมัติ

## ฟีเจอร์ใหม่

### 1. API Endpoint ใหม่
```
POST /api/groups/update-names
```

**การตอบกลับ:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "updated": 5,
    "skipped": 3,
    "errors": 2,
    "details": [
      {
        "groupId": "C1467a3dcec992659e48f958415757d5e",
        "oldName": "กลุ่ม C1467a3d",
        "newName": "ทีมพัฒนาระบบ",
        "status": "updated"
      }
    ]
  }
}
```

### 2. การตรวจจับชื่อกลุ่มที่เป็นตัวย่อ

ระบบจะตรวจจับชื่อกลุ่มที่เป็นตัวย่อตามรูปแบบต่อไปนี้:
- `กลุ่ม [A-Za-z0-9]{1,8}` - กลุ่ม C1234567
- `กลุ่ม [A-Za-z0-9]{8,}` - กลุ่ม Cxxxxxxxx (long IDs)
- `[INACTIVE]` - กลุ่มที่ไม่ได้ใช้งาน
- `Group ` - คำนำหน้าภาษาอังกฤษ
- `แชทส่วนตัว` - แชทส่วนตัว
- `personal_` - personal_xxxxx

### 3. การดึงข้อมูลจาก LINE API

ระบบจะพยายามดึงชื่อกลุ่มที่ถูกต้องจาก LINE API ผ่านวิธีต่างๆ:
1. `getGroupSummary` API (ถ้ามี)
2. `getGroupMemberProfile` API (ถ้ามี)
3. การตรวจสอบการเข้าถึงกลุ่มผ่าน `getGroupMemberUserIds`

## วิธีใช้งาน

### 1. ผ่าน curl
```bash
# Local development
curl -X POST http://localhost:3000/api/groups/update-names

# Production
curl -X POST https://your-domain.com/api/groups/update-names
```

### 2. ผ่าน Node.js script
```bash
# รันโดยตรง
node update-group-names.js

# ทดสอบการเชื่อมต่อ
node update-group-names.js --test

# โหมด interactive
node update-group-names.js --interactive
```

### 3. ผ่าน Environment Variables
```bash
# ตั้งค่า URL ของ API
export API_BASE_URL=https://your-domain.com
node update-group-names.js
```

## การทำงานของระบบ

### ขั้นตอนการอัพเดท

1. **ดึงกลุ่มทั้งหมด** จากฐานข้อมูล
2. **ตรวจสอบชื่อกลุ่ม** ว่าเป็นตัวย่อหรือไม่
3. **ข้ามกลุ่ม** ที่มีชื่อที่ถูกต้องแล้ว
4. **ดึงข้อมูลจาก LINE API** สำหรับกลุ่มที่ต้องอัพเดท
5. **ตรวจสอบชื่อใหม่** ว่าดีกว่าชื่อเดิมหรือไม่
6. **อัพเดทฐานข้อมูล** หากชื่อใหม่ดีกว่า
7. **บันทึกผลลัพธ์** และรายงาน

### การป้องกัน Rate Limiting

- เพิ่ม delay 200ms ระหว่างการเรียก API
- ใช้ Promise.allSettled เพื่อไม่ให้ error หนึ่งส่วนทำให้ทั้งหมดล้มเหลว
- จัดการ error แยกสำหรับแต่ละกลุ่ม

## การตั้งค่า

### Environment Variables
```bash
# URL ของ API (สำหรับ script)
API_BASE_URL=https://your-domain.com

# LINE Bot Configuration (สำหรับ server)
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
```

### การตั้งค่าใน Production

1. **Deploy โค้ดใหม่** ที่มี API endpoint
2. **ตั้งค่า Environment Variables** สำหรับ LINE Bot
3. **ทดสอบการเชื่อมต่อ** กับ LINE API
4. **รันการอัพเดท** ผ่าน curl หรือ script

## การตรวจสอบผลลัพธ์

### 1. ดู Logs
```bash
# ดู logs ของ server
tail -f logs/app.log

# ดู logs ของ script
node update-group-names.js 2>&1 | tee update.log
```

### 2. ตรวจสอบฐานข้อมูล
```sql
-- ดูกลุ่มทั้งหมด
SELECT id, lineGroupId, name, createdAt FROM groups ORDER BY createdAt DESC;

-- ดูกลุ่มที่อัพเดทล่าสุด
SELECT id, lineGroupId, name, updatedAt FROM groups 
WHERE updatedAt > NOW() - INTERVAL 1 HOUR 
ORDER BY updatedAt DESC;
```

### 3. ตรวจสอบ API Response
```bash
# ทดสอบ API endpoint
curl -X POST http://localhost:3000/api/groups/update-names | jq
```

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **LINE API 403 Error**
   - ตรวจสอบ Channel Access Token
   - ตรวจสอบสิทธิ์ของ Bot ในกลุ่ม

2. **Database Connection Error**
   - ตรวจสอบการเชื่อมต่อฐานข้อมูล
   - ตรวจสอบ Environment Variables

3. **Rate Limiting**
   - เพิ่ม delay ระหว่างการเรียก API
   - ลดจำนวนกลุ่มที่ประมวลผลพร้อมกัน

### การ Debug

```bash
# เปิด debug mode
DEBUG=* node update-group-names.js

# ดู logs แบบละเอียด
NODE_ENV=development node update-group-names.js
```

## การพัฒนาต่อ

### ฟีเจอร์ที่อาจเพิ่มในอนาคต

1. **Scheduled Updates** - อัพเดทอัตโนมัติตามเวลา
2. **Incremental Updates** - อัพเดทเฉพาะกลุ่มที่เปลี่ยนแปลง
3. **Webhook Integration** - อัพเดทเมื่อมีกลุ่มใหม่
4. **Admin Dashboard** - จัดการผ่าน UI
5. **Email Notifications** - แจ้งเตือนเมื่ออัพเดทเสร็จ

### การปรับปรุง Performance

1. **Batch Processing** - ประมวลผลหลายกลุ่มพร้อมกัน
2. **Caching** - เก็บ cache ชื่อกลุ่ม
3. **Retry Logic** - ลองใหม่เมื่อเกิด error
4. **Progress Tracking** - ติดตามความคืบหน้า

## การทดสอบ

### Unit Tests
```bash
npm test -- --grep "group name update"
```

### Integration Tests
```bash
# ทดสอบ API endpoint
curl -X POST http://localhost:3000/api/groups/update-names

# ทดสอบ script
node update-group-names.js --test
```

### Manual Testing
1. สร้างกลุ่มทดสอบที่มีชื่อเป็นตัวย่อ
2. รันการอัพเดท
3. ตรวจสอบผลลัพธ์ในฐานข้อมูล
4. ตรวจสอบ logs

## การ Deploy

### 1. Build โปรเจค
```bash
npm run build
```

### 2. Deploy ไปยัง Server
```bash
# ใช้ PM2
pm2 restart leka-bot

# ใช้ Docker
docker-compose up -d
```

### 3. ทดสอบหลัง Deploy
```bash
# ตรวจสอบ health check
curl http://your-domain.com/health

# ทดสอบ API endpoint
curl -X POST http://your-domain.com/api/groups/update-names
```

## การสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. ตรวจสอบ logs และ error messages
2. ดูเอกสารนี้และ README หลัก
3. ตรวจสอบ LINE Bot API documentation
4. ติดต่อทีมพัฒนา

---

**หมายเหตุ:** ระบบนี้จะทำงานเฉพาะกับกลุ่มที่ Bot มีสิทธิ์เข้าถึงเท่านั้น หาก Bot ถูกออกจากกลุ่ม ชื่อกลุ่มจะถูกตั้งเป็น `[INACTIVE]` โดยอัตโนมัติ
