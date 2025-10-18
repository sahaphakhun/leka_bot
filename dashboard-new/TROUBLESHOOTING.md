# 🔧 คู่มือแก้ไขปัญหา Dashboard

## 🚨 ปัญหาที่พบบ่อย

### 1. 📡 ไม่สามารถเชื่อมต่อ API (Cannot connect to API)

#### อาการ:
- หน้าจอแสดง "กำลังโหลด..." ตลอดเวลา
- ไม่มีข้อมูลแสดง
- Console แสดง "Network Error" หรือ "Failed to fetch"

#### วิธีแก้:

**ตรวจสอบ 1: Backend Server ทำงานหรือไม่**
```bash
# ตรวจสอบว่า backend ทำงานอยู่
curl https://lekabot-production.up.railway.app/api/health

# ถ้าได้ response แปลว่า backend ทำงาน
```

**ตรวจสอบ 2: Environment Variables**
```bash
# ตรวจสอบไฟล์ .env.production
cat dashboard-new/.env.production

# ต้องมี:
VITE_API_URL=https://lekabot-production.up.railway.app/api
```

**ตรวจสอบ 3: CORS Settings**
- ตรวจสอบว่า backend อนุญาต CORS จาก domain ของ dashboard
- ตรวจสอบที่ backend `src/index.js` หรือ `app.js`:

```javascript
// ต้องมี CORS config
app.use(cors({
  origin: [
    'https://lekabot-production.up.railway.app',
    'http://localhost:5173',
    // เพิ่ม domain อื่นๆ ตามต้องการ
  ],
  credentials: true
}));
```

**วิธีแก้ที่ 4: ตรวจสอบ Console**
```javascript
// เปิด Browser Console (F12)
// ดูว่ามี error อะไร
// ตัวอย่าง error ที่พบบ่อย:
// - "CORS policy: No 'Access-Control-Allow-Origin'"
// - "net::ERR_CONNECTION_REFUSED"
// - "404 Not Found"
```

---

### 2. 🔒 Authentication Required (ต้องการการยืนยันตัวตน)

#### อาการ:
- หน้าจอแสดง "ต้องการการยืนยันตัวตน"
- ไม่สามารถโหลดข้อมูลได้

#### วิธีแก้:

**วิธีที่ 1: เข้าผ่าน LINE Bot**
```
ใช้ลิงก์จาก LINE Bot โดยตรง
- Bot จะส่ง URL พร้อม groupId อัตโนมัติ
```

**วิธีที่ 2: เพิ่ม Query Parameters**
```
# สำหรับ Group Dashboard
https://your-domain.com/dashboard-new/?groupId=YOUR_GROUP_ID

# สำหรับ Personal Dashboard
https://your-domain.com/dashboard-new/?userId=USER_ID&groupId=GROUP_ID
```

**วิธีที่ 3: ตรวจสอบ URL Parameters**
```javascript
// เปิด Console และรัน:
const urlParams = new URLSearchParams(window.location.search);
console.log('groupId:', urlParams.get('groupId'));
console.log('userId:', urlParams.get('userId'));

// ถ้าไม่มี groupId แสดงว่าต้องเพิ่มใน URL
```

---

### 3. 💾 ไม่สามารถส่งออกข้อมูล (Export ไม่ทำงาน)

#### อาการ:
- คลิกปุ่ม "ส่งออก" แล้วไม่มีอะไรเกิดขึ้น
- ไฟล์ดาวน์โหลดว่างเปล่า

#### วิธีแก้:

**ตรวจสอบ 1: Browser Console**
```javascript
// เปิด Console (F12) และดู error
// ถ้าเจอ "Blocked by browser" หรือ "Download blocked"
// แก้ไขที่ Browser Settings > Downloads > Allow downloads
```

**ตรวจสอบ 2: Popup Blocker**
```
- ตรวจสอบว่า browser ไม่ได้บล็อค popup/download
- Settings > Privacy > Popups and redirects > Allow
```

**ตรวจสอบ 3: ข้อมูล**
```javascript
// ตรวจสอบว่ามีข้อมูลหรือไม่
// ถ้าไม่มีข้อมูล export จะไม่ทำงาน
console.log('Has data:', members.length > 0);
```

---

### 4. 📁 ไม่สามารถดู PDF (PDF Viewer ไม่ทำงาน)

#### อาการ:
- คลิกเปิด PDF แล้วไม่แสดงอะไร
- PDF แสดงผิดพลาด

#### วิธีแก้:

**วิธีที่ 1: ตรวจสอบ PDF.js**
```javascript
// เปิด Console และตรวจสอบ
console.log('PDF.js loaded:', !!window.pdfjsLib);

// ถ้าเป็น false แสดงว่า PDF.js ยังไม่โหลด
// ลองรีเฟรชหน้าอีกครั้ง
```

**วิธีที่ 2: ใช้ Browser PDF Viewer**
```javascript
// ถ้า PDF.js ไม่ทำงาน browser จะใช้ default viewer
// หรือดาวน์โหลดไฟล์แล้วเปิดด้วย Adobe Reader
```

**วิธีที่ 3: ตรวจสอบไฟล์**
```javascript
// บางไฟล์ PDF อาจเสีย
// ลองเปิดไฟล์ด้วยโปรแกรมอื่นก่อน
```

---

### 5. 🌐 หน้าจอว่างเปล่า (Blank Screen)

#### อาการ:
- เปิดหน้า dashboard แล้วไม่มีอะไรแสดง
- หน้าจอขาวหรือดำล้วน

#### วิธีแก้:

**วิธีที่ 1: ล้าง Cache**
```
1. กด Ctrl+Shift+Delete (Windows) หรือ Cmd+Shift+Delete (Mac)
2. เลือก "Cached images and files"
3. คลิก Clear data
4. รีเฟรชหน้า (F5)
```

**วิธีที่ 2: ตรวจสอบ Console**
```javascript
// เปิด Console (F12)
// ดู error message
// error ที่พบบ่อย:
// - "Cannot read property of undefined"
// - "Failed to load resource"
// - "Unexpected token"
```

**วิธีที่ 3: ตรวจสอบ Build**
```bash
# Re-build application
cd dashboard-new
npm run build

# Deploy ใหม่
git push origin main
```

---

### 6. 📱 ปัญหาบนมือถือ (Mobile Issues)

#### อาการ:
- Layout ผิดเพี้ยน
- ปุ่มคลิกไม่ได้
- เมนูไม่แสดง

#### วิธีแก้:

**วิธีที่ 1: Responsive Mode**
```
- Dashboard รองรับหน้าจอ 375px ขึ้นไป
- ถ้าหน้าจอเล็กกว่า ให้หมุนเป็น landscape
```

**วิธีที่ 2: Browser ที่รองรับ**
```
- Chrome Mobile 90+
- Safari Mobile 14+
- Firefox Mobile 88+
```

**วิธีที่ 3: ล้าง Cache**
```
Settings > Safari/Chrome > Clear History and Website Data
```

---

### 7. 🔔 การแจ้งเตือนไม่ทำงาน (Notifications not working)

#### อาการ:
- ตั้งค่าแล้วแต่ไม่ได้รับการแจ้งเตือน
- Toggle เปิดแล้วแต่ไม่มีอะไรเกิดขึ้น

#### วิธีแก้:

**ตรวจสอบ 1: Browser Permission**
```
1. คลิก 🔒 ข้างแถบ URL
2. ไปที่ Notifications
3. เลือก "Allow"
```

**ตรวจสอบ 2: Email**
```
- การแจ้งเตือนทางอีเมลต้องใส่อีเมลก่อน
- ไปที่ Profile > ข้อมูลส่วนตัว > ใส่อีเมล
- เปิด "แจ้งเตือนทางอีเมล"
```

**ตรวจสอบ 3: Backend Service**
```bash
# ตรวจสอบว่า notification service ทำงาน
curl https://your-api.com/api/notifications/test
```

---

## 🔍 วิธีดู Error Logs

### Browser Console
```
1. กด F12 (Windows) หรือ Cmd+Option+I (Mac)
2. ไปที่แท็บ "Console"
3. ดู error messages (สีแดง)
4. คัดลอก error และค้นหาใน Google หรือถามทีม
```

### Network Tab
```
1. เปิด Developer Tools (F12)
2. ไปที่แท็บ "Network"
3. รีเฟรชหน้า (F5)
4. ดู request ที่ failed (สีแดง)
5. คลิกเพื่อดูรายละเอียด
```

### Application Tab
```
1. เปิด Developer Tools (F12)
2. ไปที่แท็บ "Application"
3. ดูที่ Local Storage, Session Storage
4. ตรวจสอบ cookies
```

---

## 🛠️ วิธีแก้ไขเบื้องต้น

### 1. Hard Refresh
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2. ล้าง Local Storage
```javascript
// เปิด Console แล้วรัน:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 3. ลอง Incognito/Private Mode
```
Windows: Ctrl + Shift + N
Mac: Cmd + Shift + N
```

### 4. ตรวจสอบ Internet
```bash
# Test connection
ping google.com
ping lekabot-production.up.railway.app
```

---

## 🚀 การ Deploy ใหม่

### สำหรับ Railway

```bash
# 1. Build
cd dashboard-new
npm run build

# 2. Commit
git add -A
git commit -m "Fix: Your fix description"

# 3. Push
git push origin main

# Railway จะ auto-deploy ภายใน 2-3 นาที
```

### ตรวจสอบ Deploy Status
```
1. ไปที่ Railway Dashboard
2. เลือก Project "leka_bot"
3. ดู Deploy logs
4. ตรวจสอบว่า deploy สำเร็จ (✓)
```

---

## 📞 ติดต่อทีมพัฒนา

### เมื่อไรควรติดต่อ:
- ✅ ลองทุกวิธีแล้วแต่ยังไม่ได้
- ✅ เจอ bug ที่ซ้ำซ้อน
- ✅ ต้องการฟีเจอร์ใหม่
- ✅ มีข้อเสนอแนะ

### ข้อมูลที่ต้องเตรียม:
```
1. ภาพหน้าจอของปัญหา
2. Error message จาก Console
3. URL ที่เกิดปัญหา
4. Browser และ version
5. ขั้นตอนการทำซ้ำปัญหา
```

---

## 📚 Resources

### Documentation
- [README.md](./README.md) - คู่มือการใช้งาน
- [CHANGELOG.md](./CHANGELOG.md) - บันทึกการเปลี่ยนแปลง
- [API Documentation](../docs/API.md) - เอกสาร API

### External Links
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Railway Documentation](https://docs.railway.app/)

---

## ✅ Checklist ก่อนรายงานปัญหา

- [ ] ลอง hard refresh แล้ว (Ctrl+Shift+R)
- [ ] ล้าง cache แล้ว
- [ ] ลองใน incognito mode แล้ว
- [ ] ตรวจสอบ console errors แล้ว
- [ ] ตรวจสอบ network tab แล้ว
- [ ] ตรวจสอบ internet connection แล้ว
- [ ] ลองบน browser อื่นแล้ว
- [ ] เช็ค URL parameters แล้ว
- [ ] อ่าน TROUBLESHOOTING นี้แล้ว

---

**Last Updated:** 2024-01-10

**Version:** 2.0.0

**Status:** ✅ Active