# 🤖 Leka Bot - Complete Project

LINE Bot สำหรับจัดการงาน พร้อม Backend API และ Frontend Dashboard (เก่า + ใหม่)

---

## 📦 โครงสร้างโปรเจ็กต์

```
leka-bot-FULL/
├── src/                    # Backend (Node.js + TypeScript + Express)
│   ├── controllers/        # API Controllers
│   ├── models/            # Database Models
│   ├── routes/            # API Routes
│   ├── services/          # Business Logic
│   ├── middleware/        # Express Middleware
│   ├── utils/             # Utilities
│   └── index.ts           # Entry Point
│
├── dashboard/             # Frontend เก่า (Vanilla JS + Tailwind)
│   ├── index.html         # หน้าแดชบอร์ดหลัก
│   ├── members.html       # จัดการสมาชิก
│   ├── profile.html       # โปรไฟล์
│   ├── recurring-tasks.html  # งานประจำ
│   └── submit-tasks.html  # ส่งงานหลายรายการ
│
├── dashboard-new/         # Frontend ใหม่ (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # React Components (27 ไฟล์)
│   │   │   ├── modals/    # Modals (6)
│   │   │   ├── recurring/ # Recurring Tasks (3)
│   │   │   ├── files/     # Files Management (5)
│   │   │   ├── reports/   # Reports (4)
│   │   │   ├── members/   # Members (4)
│   │   │   ├── profile/   # Profile (3)
│   │   │   └── submit/    # Submit Multiple (2)
│   │   ├── hooks/         # Custom Hooks (3)
│   │   ├── services/      # API Services (3)
│   │   └── context/       # React Context (2)
│   └── package.json
│
├── scripts/               # Utility Scripts
├── docs/                  # Documentation
├── package.json           # Backend Dependencies
├── tsconfig.json          # TypeScript Config
├── railway.json           # Railway Deployment Config
└── README.md              # This file
```

---

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies

```bash
# Backend
npm install

# Frontend ใหม่
cd dashboard-new
npm install
cd ..
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จาก `env.example`:

```bash
cp env.example .env
```

แก้ไขค่าต่างๆ:
```env
# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret

# Database
DATABASE_URL=postgresql://...

# Google Calendar (Optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Server
PORT=3000
NODE_ENV=development
```

### 3. รัน Development

```bash
# Backend
npm run dev

# Frontend ใหม่ (terminal ใหม่)
cd dashboard-new
npm run dev
```

เข้าใช้งาน:
- Backend API: http://localhost:3000
- Frontend เก่า: http://localhost:3000/dashboard
- Frontend ใหม่: http://localhost:5173

---

## 🌐 Deployment

### Deploy บน Railway

1. **Push ไปยัง GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **เชื่อมต่อกับ Railway**
- ไปที่ https://railway.app
- New Project → Deploy from GitHub repo
- เลือก repository

3. **ตั้งค่า Environment Variables**
ใน Railway Dashboard → Settings → Variables:
- คัดลอกจากไฟล์ `.env`

4. **Deploy**
Railway จะ build และ deploy อัตโนมัติ

### Build Commands

Railway จะรัน:
```bash
npm install
npm run build
npm start
```

---

## 📱 Frontend Options

### Frontend เก่า (dashboard/)
- **Tech Stack:** Vanilla JavaScript + Tailwind CSS
- **URL:** `/dashboard/index.html`
- **Features:** ครบถ้วน 5 หน้า
- **Use Case:** Production-ready, stable

### Frontend ใหม่ (dashboard-new/)
- **Tech Stack:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **URL:** Deploy แยกหรือรวมกับ Backend
- **Features:** ครบถ้วน + ฟีเจอร์เพิ่มเติม 33 components
- **Use Case:** Modern, scalable, maintainable

---

## 🔧 Backend API Endpoints

### Authentication
- `POST /webhook` - LINE Bot Webhook

### Tasks
- `GET /api/groups/:groupId/tasks` - ดึงรายการงาน
- `POST /api/groups/:groupId/tasks` - สร้างงานใหม่
- `PUT /api/groups/:groupId/tasks/:taskId` - อัปเดตงาน
- `DELETE /api/groups/:groupId/tasks/:taskId` - ลบงาน

### Recurring Tasks
- `GET /api/groups/:groupId/recurring-tasks` - ดึงงานประจำ
- `POST /api/groups/:groupId/recurring-tasks` - สร้างงานประจำ
- `PUT /api/groups/:groupId/recurring-tasks/:taskId` - อัปเดตงานประจำ
- `DELETE /api/groups/:groupId/recurring-tasks/:taskId` - ลบงานประจำ

### Files
- `GET /api/groups/:groupId/files` - ดึงรายการไฟล์
- `POST /api/groups/:groupId/files` - อัปโหลดไฟล์
- `DELETE /api/groups/:groupId/files/:fileId` - ลบไฟล์

### Members
- `GET /api/groups/:groupId/members` - ดึงรายการสมาชิก
- `POST /api/groups/:groupId/invite` - เชิญสมาชิก
- `PUT /api/groups/:groupId/members/:memberId/role` - เปลี่ยนบทบาท

### Reports
- `GET /api/groups/:groupId/reports` - ดึงรายงานและสถิติ

---

## 📚 Documentation

- `dashboard-new/IMPLEMENTATION_SUMMARY.md` - สรุปการพัฒนา Frontend ใหม่
- `dashboard-new/DEPLOY_README.md` - คู่มือ Deploy Frontend
- `DEPLOY_NOW.md` - คู่มือ Deploy ทั้งโปรเจ็กต์
- `docs/` - เอกสารเพิ่มเติม

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **LINE SDK:** @line/bot-sdk
- **Google APIs:** googleapis

### Frontend เก่า
- **JavaScript:** Vanilla ES6+
- **CSS:** Tailwind CSS
- **UI:** Custom components

### Frontend ใหม่
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** JavaScript (JSX)
- **Styling:** Tailwind CSS
- **UI Library:** shadcn/ui
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Date:** date-fns

---

## 📊 Features

### ✅ Backend
- LINE Bot Integration
- Task Management (CRUD)
- Recurring Tasks
- File Upload/Download
- Member Management
- Reports & Analytics
- Google Calendar Integration
- Webhook Handling

### ✅ Frontend เก่า
- Dashboard Overview
- Calendar View
- Task Management
- Recurring Tasks
- Files Management
- Members Management
- Profile & Settings
- Submit Multiple Tasks

### ✅ Frontend ใหม่ (เพิ่มเติม)
- Modern React Architecture
- Component-based Design
- Custom Hooks
- Context API State Management
- Modals & Dialogs
- Drag & Drop
- Real-time Updates
- Responsive Design

---

## 🔐 Security

- Environment Variables สำหรับ sensitive data
- LINE Signature Verification
- CORS Configuration
- Input Validation
- Error Handling

---

## 📝 License

Private Project

---

## 👥 Support

หากมีปัญหา:
1. ตรวจสอบ Logs
2. ตรวจสอบ Environment Variables
3. ตรวจสอบ Database Connection
4. ตรวจสอบ LINE Bot Settings

---

**Version:** 2.0.3  
**Last Updated:** October 2024
