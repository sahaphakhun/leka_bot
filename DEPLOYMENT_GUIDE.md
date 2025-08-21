# คำแนะนำการ Deploy - File Attachment System

## สรุปการเปลี่ยนแปลง

### 🎯 ฟีเจอร์ใหม่: การแนบไฟล์เริ่มต้นในเว็บไซต์

ตอนนี้ผู้ใช้สามารถแนบไฟล์เริ่มต้น (เอกสารข้อกำหนด, แบบฟอร์ม, ฯลฯ) ได้เมื่อสร้างงานผ่านเว็บไซต์ dashboard

### 📋 ไฟล์ที่เปลี่ยนแปลง

#### Frontend (Dashboard)
- `dashboard/index.html` - เพิ่มฟอร์มแนบไฟล์เริ่มต้น
- `dashboard/styles.css` - เพิ่ม CSS สำหรับ file preview
- `dashboard/script.js` - เพิ่ม JavaScript สำหรับจัดการไฟล์

#### Backend (Server)
- `src/index.ts` - อัปเดต CSP headers สำหรับ external stylesheets
- `src/scripts/initDatabase.ts` - เพิ่ม auto-migration สำหรับ `attachment_type` column
- `package.json` - ลบ migrate script ที่ไม่จำเป็น

### 🔧 ระบบที่รองรับอยู่แล้ว

✅ **File Entity** มี `attachmentType` column อยู่แล้ว
✅ **TaskService.createTask** รองรับ `fileIds` parameter อยู่แล้ว  
✅ **API Controller** รับ `fileIds` ในการสร้างงานอยู่แล้ว
✅ **FileService** มี methods สำหรับแยกไฟล์ตามประเภทอยู่แล้ว
✅ **FlexMessageTemplateService** แสดงไฟล์เริ่มต้นแยกจากไฟล์ส่งงานอยู่แล้ว

## 🚀 การ Deploy บน Railway

### 1. Auto-Migration จะรันอัตโนมัติ

เมื่อ deploy บน Railway, `initDatabase.ts` จะรันอัตโนมัติและ:
- ตรวจสอบว่ามี `attachment_type` column หรือยัง
- เพิ่ม column ถ้ายังไม่มี (แต่น่าจะมีอยู่แล้ว)
- อัปเดตไฟล์เดิมให้มี `attachment_type = 'initial'`
- สร้าง index สำหรับ performance

### 2. CSP Headers จะอัปเดตอัตโนมัติ

Server จะอนุญาตให้โหลด:
- Google Fonts: `https://fonts.googleapis.com`
- Font Awesome: `https://cdnjs.cloudflare.com`

### 3. ไม่ต้องรันคำสั่งเพิ่มเติม

ทุกอย่างจะทำงานอัตโนมัติตอน deploy ไม่ต้อง:
- รัน migration scripts
- อัปเดต environment variables
- ติดตั้ง dependencies เพิ่มเติม

## 🧪 การทดสอบหลัง Deploy

### 1. ทดสอบ CSP Headers

เปิด browser developer tools และตรวจสอบว่าไม่มี CSP errors:
```
❌ ไม่ควรเห็น: "Refused to load the stylesheet..."
✅ ควรเห็น: Google Fonts และ Font Awesome โหลดสำเร็จ
```

### 2. ทดสอบการแนบไฟล์เริ่มต้น

1. เข้าเว็บไซต์ dashboard
2. กดปุ่ม "เพิ่มงาน"
3. เลื่อนลงไปหาส่วน "ไฟล์แนบเริ่มต้น"
4. เลือกไฟล์ → ควรแสดงตัวอย่างไฟล์
5. กรอกข้อมูลงานและกด "เพิ่มงาน"
6. ตรวจสอบการ์ดงานใน LINE → ควรแสดง "📋 ไฟล์เริ่มต้น: X ไฟล์"

### 3. ทดสอบ Database

ตรวจสอบใน Railway database console:
```sql
-- ตรวจสอบ column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'files' AND column_name = 'attachment_type';

-- ตรวจสอบข้อมูล
SELECT 
  COUNT(*) as total_files,
  COUNT(attachment_type) as files_with_type,
  attachment_type
FROM files 
GROUP BY attachment_type;
```

## 🔍 การ Debug

### Server Logs
ดู logs ใน Railway console สำหรับ:
```
🔧 [MIGRATION] Starting custom migrations...
✅ [MIGRATION] attachment_type column already exists
📊 [MIGRATION] Migration verification: [...]
```

### Browser Console
ตรวจสอบ JavaScript errors:
```javascript
// ตรวจสอบไฟล์ที่เลือก
console.log('Selected files:', app.selectedInitialFiles);

// ตรวจสอบการอัปโหลด
// ดูใน Network tab เมื่อสร้างงาน
```

## 🎯 Expected Results

### ✅ สิ่งที่ควรทำงาน

1. **เว็บไซต์ dashboard** โหลดไม่มี CSP errors
2. **ฟอร์มเพิ่มงาน** มีส่วน "ไฟล์แนบเริ่มต้น"
3. **การเลือกไฟล์** แสดงตัวอย่างไฟล์ที่เลือก
4. **การสร้างงาน** อัปโหลดไฟล์และผูกเข้ากับงาน
5. **การ์ดงานใน LINE** แสดงไฟล์เริ่มต้นแยกจากไฟล์ส่งงาน

### ❌ สิ่งที่ไม่ควรเกิดขึ้น

1. CSP errors ใน browser console
2. Database errors เกี่ยวกับ `attachment_type`
3. ไฟล์ที่แนบหายไป
4. การ์ดงานไม่แสดงไฟล์เริ่มต้น

## 📞 การแก้ไขปัญหา

หากมีปัญหา ให้ตรวจสอบ:

1. **Railway Logs** - ดู deployment logs
2. **Database Console** - ตรวจสอบ schema และข้อมูล
3. **Browser DevTools** - ดู network requests และ console errors
4. **LINE Webhook Logs** - ตรวจสอบการส่งการ์ดงาน

## 🎉 สรุป

การ deploy ครั้งนี้จะ:
- ✅ เพิ่มฟีเจอร์การแนบไฟล์เริ่มต้นในเว็บไซต์
- ✅ แก้ไข CSP errors สำหรับ external stylesheets  
- ✅ รัน auto-migration สำหรับ database
- ✅ ไม่กระทบระบบเดิมที่ทำงานอยู่

ทุกอย่างจะทำงานอัตโนมัติ ไม่ต้องรันคำสั่งเพิ่มเติมหลัง deploy! 🚀
