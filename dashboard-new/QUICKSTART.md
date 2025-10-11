# Quick Start Guide

## 🚀 ติดตั้งใน 3 ขั้นตอน

### 1️⃣ แตกไฟล์

```bash
cd /path/to/leka_bot-main/dashboard-new
rm -rf *
unzip dashboard-new-fixed.zip
mv dashboard-new-deploy/* .
rm -rf dashboard-new-deploy
```

### 2️⃣ Commit & Push (ถ้าใช้ Git)

```bash
git add .
git commit -m "Fix dashboard-new: Add smart URL detection"
git push
```

### 3️⃣ ทดสอบ

เปิด Browser:
```
https://lekabot-production.up.railway.app/dashboard-new/?groupId=YOUR_GROUP_ID
```

---

## ✅ ตรวจสอบว่าทำงาน

### เช็คว่าไม่ติด Loading
- เปิด URL ข้างบน
- ควรเห็น Dashboard ภายใน 2-3 วินาที
- ไม่ควรติดที่ "Loading..." นานเกิน 5 วินาที

### เช็ค Mode Badge
- ควรเห็น badge "👥 Group Mode" มุมขวาบน
- ถ้าเปิดด้วย `?userId=xxx&groupId=yyy` จะเห็น "👤 Personal Mode"

### เช็ค Console Logs
- กด F12 เปิด Developer Tools
- ไปที่ tab "Console"
- ควรเห็น logs:
  ```
  🔍 URL Parameters: { groupId: "..." }
  📍 View Mode: group
  👥 Group ID: ...
  📥 Fetching tasks...
  ✅ Tasks loaded: ...
  ```

---

## 🧪 ทดสอบ URL Patterns

### Pattern 1: Group Dashboard
```
/dashboard-new?groupId=2f5b9113-b8cf-4196-8929-bff6b26cbd65
```
**Expected**: 👥 Group Mode, แสดงงานทั้งหมด

### Pattern 2: Personal Dashboard
```
/dashboard-new?userId=Uc92411a226e4d4c9866adef05068bdf1&groupId=2f5b9113-b8cf-4196-8929-bff6b26cbd65
```
**Expected**: 👤 Personal Mode, แสดงเฉพาะงานของ user

### Pattern 3: Task View
```
/dashboard-new?groupId=xxx&taskId=yyy&action=view
```
**Expected**: 👥 Group Mode, แสดงรายละเอียดงาน

---

## ❌ ถ้ามีปัญหา

### ยังติด Loading
1. เปิด Console (F12)
2. ดู error messages
3. ตรวจสอบว่ามี `groupId` ใน URL หรือไม่

### แสดง Authentication Required
1. ตรวจสอบ URL parameters
2. ต้องมี `groupId` อย่างน้อย
3. ลอง refresh หน้าเว็บ (Ctrl+Shift+R)

### ไม่แสดงงาน
1. ตรวจสอบว่า API ทำงานหรือไม่:
   ```bash
   curl "https://lekabot-production.up.railway.app/api/groups/YOUR_GROUP_ID/tasks"
   ```
2. ดู Console logs
3. ตรวจสอบ Network tab ใน Developer Tools

---

## 📞 ต้องการความช่วยเหลือ?

1. อ่าน **README.md** สำหรับข้อมูลโดยละเอียด
2. อ่าน **DEPLOYMENT.md** สำหรับคู่มือ deploy
3. อ่าน **CHANGELOG.md** เพื่อดูว่าแก้อะไรบ้าง
4. เช็ค Console logs และ Railway logs

