# Leka Bot - Complete Project (Updated)

## 🎯 เวอร์ชันนี้มีอะไรบ้าง

### ✅ Backend (เดิม)
- Node.js + TypeScript
- Express.js API
- LINE Bot Integration
- Google Sheets Integration
- Task Management System

### ✨ Dashboard New (Updated - Fixed)
- **แก้ไขแล้ว**: ปัญหา Loading ไม่สิ้นสุด
- **เพิ่มแล้ว**: Smart URL Detection (Personal/Group Mode)
- **ปลอดภัย**: ไม่ต้องส่ง userId ในกลุ่ม
- **พร้อมใช้**: รองรับ URL เดิมทั้งหมด

---

## 📁 โครงสร้างโปรเจค

```
leka-bot-complete/
├── src/                          # Backend source code
│   ├── controllers/              # API controllers
│   ├── services/                 # Business logic
│   ├── models/                   # Data models
│   └── index.ts                  # Main entry point
│
├── dashboard/                    # Dashboard เก่า (ทำงานปกติ)
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── dashboard-new/                # Dashboard ใหม่ (Fixed! ✅)
│   ├── index.html
│   ├── assets/
│   │   ├── index-CRyZPcbd.js    # React app bundle
│   │   └── index-D7LApWKU.css   # Styles
│   ├── README.md                 # คู่มือ Dashboard ใหม่
│   ├── QUICKSTART.md             # เริ่มต้นใช้งาน
│   ├── DEPLOYMENT.md             # คู่มือ Deploy
│   └── CHANGELOG.md              # รายการเปลี่ยนแปลง
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── Dockerfile                    # Docker config
├── railway.json                  # Railway config
└── README_UPDATED.md             # ไฟล์นี้
```

---

## 🚀 การติดตั้ง

### 1. Clone หรือแตกไฟล์

```bash
# ถ้าได้ zip file
unzip leka-bot-complete.zip
cd leka-bot-complete

# หรือถ้าใช้ Git
git clone <your-repo>
cd leka-bot-complete
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

```bash
cp env.example .env
```

แก้ไขไฟล์ `.env`:
```env
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
GOOGLE_SHEET_ID=your_sheet_id
PORT=3000
```

### 4. Build

```bash
npm run build
```

### 5. Run

```bash
# Development
npm run dev

# Production
npm start
```

---

## 🌐 Deploy บน Railway

### วิธีที่ 1: ผ่าน Git (แนะนำ)

```bash
# 1. Init Git (ถ้ายังไม่มี)
git init
git add .
git commit -m "Initial commit with fixed dashboard-new"

# 2. Connect to Railway
railway link

# 3. Deploy
railway up
```

### วิธีที่ 2: ผ่าน Railway Dashboard

1. ไปที่ https://railway.app/
2. สร้าง New Project
3. เลือก "Deploy from GitHub repo"
4. เลือก repository ของคุณ
5. Railway จะ auto-deploy

---

## 🧪 ทดสอบ

### ทดสอบ Backend

```bash
curl http://localhost:3000/health
```

### ทดสอบ Dashboard เก่า

```
http://localhost:3000/dashboard/?groupId=xxx
```

### ทดสอบ Dashboard ใหม่

#### Group Mode (ส่งในกลุ่ม)
```
http://localhost:3000/dashboard-new/?groupId=xxx
```

#### Personal Mode (ส่งในแชทส่วนตัว)
```
http://localhost:3000/dashboard-new/?userId=yyy&groupId=xxx
```

---

## 📊 Dashboard ใหม่ - สิ่งที่แก้ไข

### ปัญหาเดิม ❌
- ติดสถานะ "Loading..." ไม่สิ้นสุด
- ต้องการ userId และ groupId พร้อมกัน
- ไม่ปลอดภัยเมื่อส่งใน URL ของกลุ่ม

### หลังแก้ไข ✅
- **Smart URL Detection**: ตรวจจับ mode อัตโนมัติ
- **Group Mode**: มีแค่ groupId → แสดงงานทั้งหมด
- **Personal Mode**: มี userId + groupId → แสดงเฉพาะงานของ user
- **ปลอดภัย**: ไม่มี userId leak ในกลุ่ม
- **รองรับ URL เดิม**: ไม่ต้องแก้ Backend

### Features ใหม่
- ✅ Mode Badge (👤 Personal / 👥 Group)
- ✅ Task Filtering อัตโนมัติ
- ✅ Console Logging เพื่อ Debug
- ✅ Error Messages ที่ชัดเจน

---

## 📝 Documentation

### Backend
- `docs/` - API documentation
- `src/` - Source code พร้อม comments

### Dashboard ใหม่
- `dashboard-new/README.md` - คู่มือฉบับสมบูรณ์
- `dashboard-new/QUICKSTART.md` - เริ่มต้นใช้งาน
- `dashboard-new/DEPLOYMENT.md` - คู่มือ Deploy
- `dashboard-new/CHANGELOG.md` - รายการเปลี่ยนแปลง

---

## 🔧 Scripts

```bash
# Development
npm run dev              # รัน dev server พร้อม hot reload

# Build
npm run build            # Build TypeScript → JavaScript

# Production
npm start                # รัน production server

# Test
npm test                 # รัน tests

# Lint
npm run lint             # ตรวจสอบ code style
```

---

## 🌍 Environment Variables

```env
# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email
GOOGLE_PRIVATE_KEY=your_private_key

# Server
PORT=3000
NODE_ENV=production

# Base URL
BASE_URL=https://your-domain.com
```

---

## 📊 API Endpoints

### Health Check
```
GET /health
```

### Tasks
```
GET /api/groups/:groupId/tasks
POST /api/groups/:groupId/tasks
PUT /api/groups/:groupId/tasks/:taskId
DELETE /api/groups/:groupId/tasks/:taskId
```

### Groups
```
GET /api/groups/:groupId
GET /api/groups/:groupId/members
```

### Dashboard
```
GET /dashboard
GET /dashboard-new
```

---

## 🔍 Troubleshooting

### Backend ไม่ทำงาน
1. ตรวจสอบ `.env` file
2. ตรวจสอบ port ว่าว่างหรือไม่
3. ดู logs: `railway logs` หรือ `npm run dev`

### Dashboard ใหม่ติด Loading
1. เปิด Browser Console (F12)
2. ดู logs และ error messages
3. ตรวจสอบ URL parameters
4. อ่าน `dashboard-new/README.md`

### LINE Bot ไม่ตอบ
1. ตรวจสอบ webhook URL
2. ตรวจสอบ LINE credentials
3. ดู Railway logs

---

## 🎯 Next Steps

1. **Deploy**: Deploy บน Railway
2. **Test**: ทดสอบทุก features
3. **Monitor**: ดู logs และ performance
4. **Update**: อัพเดท LINE Bot URLs ถ้าจำเป็น

---

## 📞 Support

- Dashboard ใหม่: อ่าน `dashboard-new/README.md`
- Backend: ดู `docs/` directory
- Issues: เช็ค logs และ error messages

---

## 📈 Version

- **Backend**: 1.0.0
- **Dashboard เก่า**: 1.0.0
- **Dashboard ใหม่**: 2.0.0-fixed
- **Updated**: 2025-10-11

---

## ✅ Checklist

- [x] Backend พร้อมใช้งาน
- [x] Dashboard เก่าทำงานปกติ
- [x] Dashboard ใหม่แก้ไขเรียบร้อย
- [x] Documentation ครบถ้วน
- [x] พร้อม Deploy บน Railway
- [ ] Deploy และทดสอบ
- [ ] อัพเดท LINE Bot URLs
- [ ] Monitor logs

---

## 🎉 พร้อมใช้งาน!

โปรเจคนี้พร้อม deploy บน Railway แล้ว ทั้ง Backend และ Dashboard ใหม่ที่แก้ไขเรียบร้อย

Happy coding! 🚀

