# สรุปการปรับปรุงระบบอัพเดทชื่อกลุ่ม

## 🎯 วัตถุประสงค์
แก้ไขปัญหาชื่อกลุ่มที่เป็นตัวย่อของไอดี (เช่น "กลุ่ม C1467a3d") ให้เป็นชื่อกลุ่มที่ถูกต้องโดยการดึงข้อมูลจาก LINE API

## 📝 การเปลี่ยนแปลงที่ทำ

### 1. เพิ่ม API Endpoint ใหม่
**ไฟล์:** `src/controllers/apiController.ts`
- เพิ่มเมธอด `updateAllGroupNames()` สำหรับการอัพเดทชื่อกลุ่มทั้งหมด
- เพิ่มเมธอด `isAbbreviatedGroupName()` สำหรับการตรวจจับชื่อกลุ่มที่เป็นตัวย่อ
- เพิ่มเมธอด `isImprovedName()` สำหรับการตรวจสอบว่าชื่อใหม่ดีกว่าชื่อเดิมหรือไม่
- เพิ่ม route `POST /api/groups/update-names`

### 2. เพิ่มเมธอดใน UserService
**ไฟล์:** `src/services/UserService.ts`
- เพิ่มเมธอด `getAllGroups()` สำหรับดึงกลุ่มทั้งหมดจากฐานข้อมูล
- เพิ่มเมธอด `updateGroupName()` สำหรับอัพเดทชื่อกลุ่ม

### 3. ปรับปรุง LineService
**ไฟล์:** `src/services/LineService.ts`
- ปรับปรุงเมธอด `getGroupInformation()` ให้สามารถดึงชื่อกลุ่มที่ถูกต้องจาก LINE API ได้ดีขึ้น
- เพิ่มการตรวจสอบ personal chat
- เพิ่มการลองใช้ API หลายวิธี (getGroupSummary, getGroupMemberProfile)
- เพิ่มการจัดการ error และ fallback

### 4. สร้างสคริปต์สำหรับการใช้งาน
**ไฟล์:** `update-group-names.js`
- สคริปต์ Node.js สำหรับการเรียกใช้ API endpoint
- รองรับการใช้งานแบบ interactive และ test mode
- จัดการ error และแสดงผลลัพธ์แบบละเอียด

### 5. สร้างสคริปต์ bash สำหรับ curl
**ไฟล์:** `update-group-names.sh`
- สคริปต์ bash สำหรับการใช้งานผ่าน curl
- ตรวจสอบการเชื่อมต่อก่อนเรียกใช้ API
- แสดงผลลัพธ์แบบสวยงาม (ใช้ jq ถ้ามี)

### 6. สร้างสคริปต์ทดสอบ
**ไฟล์:** `test-group-name-update.js`
- ทดสอบการตรวจจับชื่อกลุ่มที่เป็นตัวย่อ
- ทดสอบการเชื่อมต่อ API
- ทดสอบการทำงานแบบ end-to-end
- ทดสอบการจัดการ error

### 7. สร้างเอกสาร
**ไฟล์:** `GROUP_NAME_UPDATE.md`
- คู่มือการใช้งานระบบอัพเดทชื่อกลุ่ม
- คำอธิบายฟีเจอร์และการตั้งค่า
- วิธีแก้ไขปัญหาและการทดสอบ

## 🔧 ฟีเจอร์ใหม่

### การตรวจจับชื่อกลุ่มที่เป็นตัวย่อ
ระบบจะตรวจจับชื่อกลุ่มที่เป็นตัวย่อตามรูปแบบต่อไปนี้:
- `กลุ่ม [A-Za-z0-9]{1,8}` - กลุ่ม C1234567
- `กลุ่ม [A-Za-z0-9]{8,}` - กลุ่ม Cxxxxxxxx (long IDs)
- `[INACTIVE]` - กลุ่มที่ไม่ได้ใช้งาน
- `Group ` - คำนำหน้าภาษาอังกฤษ
- `แชทส่วนตัว` - แชทส่วนตัว
- `personal_` - personal_xxxxx

### การดึงข้อมูลจาก LINE API
ระบบจะพยายามดึงชื่อกลุ่มที่ถูกต้องจาก LINE API ผ่านวิธีต่างๆ:
1. `getGroupSummary` API (ถ้ามี)
2. `getGroupMemberProfile` API (ถ้ามี)
3. การตรวจสอบการเข้าถึงกลุ่มผ่าน `getGroupMemberUserIds`

### การป้องกัน Rate Limiting
- เพิ่ม delay 200ms ระหว่างการเรียก API
- ใช้ Promise.allSettled เพื่อไม่ให้ error หนึ่งส่วนทำให้ทั้งหมดล้มเหลว
- จัดการ error แยกสำหรับแต่ละกลุ่ม

## 🚀 วิธีใช้งาน

### 1. ผ่าน curl
```bash
# Local development
curl -X POST http://localhost:3000/api/groups/update-names

# Production
curl -X POST https://your-domain.com/api/groups/update-names

# ใช้สคริปต์ bash
./update-group-names.sh
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

## 📊 การตอบกลับของ API

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

## 🧪 การทดสอบ

### รันการทดสอบทั้งหมด
```bash
node test-group-name-update.js
```

### ทดสอบเฉพาะส่วน
```bash
# ทดสอบการตรวจจับชื่อกลุ่มที่เป็นตัวย่อ
node test-group-name-update.js detection

# ทดสอบการเชื่อมต่อ API
node test-group-name-update.js api

# ทดสอบการทำงานแบบ end-to-end
node test-group-name-update.js e2e

# ทดสอบการจัดการ error
node test-group-name-update.js error
```

## 🔍 การตรวจสอบผลลัพธ์

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

## ⚠️ ข้อควรระวัง

1. **สิทธิ์ของ Bot**: ระบบจะทำงานเฉพาะกับกลุ่มที่ Bot มีสิทธิ์เข้าถึงเท่านั้น
2. **Rate Limiting**: LINE API มีข้อจำกัดในการเรียกใช้ ระบบจึงเพิ่ม delay ระหว่างการเรียก
3. **การเชื่อมต่อ**: ตรวจสอบการเชื่อมต่อกับ LINE API และฐานข้อมูลก่อนใช้งาน
4. **การ Backup**: แนะนำให้ backup ฐานข้อมูลก่อนรันการอัพเดทครั้งแรก

## 🔄 การ Deploy

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

## 📈 ผลลัพธ์ที่คาดหวัง

หลังจากรันการอัพเดท:
- ชื่อกลุ่มที่เป็นตัวย่อจะถูกเปลี่ยนเป็นชื่อที่ถูกต้อง
- กลุ่มที่มีชื่อที่ถูกต้องแล้วจะถูกข้ามไป
- ระบบจะรายงานผลการทำงานแบบละเอียด
- ฐานข้อมูลจะถูกอัพเดทด้วยชื่อกลุ่มที่ถูกต้อง

## 🎉 สรุป

ระบบอัพเดทชื่อกลุ่มอัตโนมัตินี้จะช่วยแก้ไขปัญหาชื่อกลุ่มที่ไม่ถูกต้องและทำให้ระบบมีข้อมูลที่ถูกต้องมากขึ้น การใช้งานผ่าน curl ทำให้สามารถเรียกใช้ได้ง่ายและสะดวกสำหรับการบำรุงรักษาระบบ
