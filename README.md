# 🤖 เลขาบอท (Leka Bot)

**เลขานุการอัตโนมัติสำหรับกลุ่ม LINE** - ระบบจัดการงาน ปฏิทิน และไฟล์อย่างครบวงจร

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![LINE Bot SDK](https://img.shields.io/badge/LINE%20Bot%20SDK-7.5+-brightgreen.svg)](https://github.com/line/line-bot-sdk-nodejs)

## 🎯 ภาพรวม

เลขาบอทเป็นบอท LINE ที่ออกแบบมาเพื่อช่วยจัดการงานในกลุ่มอย่างมีประสิทธิภาพ ด้วยฟีเจอร์ครบครันตั้งแต่การสร้างงาน การแจ้งเตือน การติดตามประสิทธิภาพ ไปจนถึงการเชื่อมต่อกับ Google Calendar

### ✨ ฟีเจอร์หลัก

#### 📋 การจัดการงาน (Task Management)
- สร้าง แก้ไข และลบงานผ่านคำสั่งใน LINE
- มอบหมายงานให้สมาชิกหลายคนพร้อมกัน
- ติดตามสถานะงาน (pending, in_progress, completed, cancelled, overdue)
- จัดระดับความสำคัญ (high, medium, low)
- ระบบแท็กสำหรับจัดหมวดหมู่งาน
- กำหนดเวลาเริ่มต้นและครบกำหนด

#### 🔔 ระบบแจ้งเตือน
- แจ้งเตือนอัตโนมัติผ่าน LINE และอีเมล
- ตั้งค่าการเตือนแบบกำหนดเอง (7 วัน, 1 วัน, 3 ชั่วโมงก่อนครบกำหนด)
- แจ้งเตือนงานที่ใกล้ครบกำหนดและเกินกำหนด
- รองรับหลายช่องทางการแจ้งเตือน

#### 📁 จัดการไฟล์
- เก็บไฟล์ที่แชร์ในกลุ่มอัตโนมัติ
- จัดหมวดหมู่ไฟล์ด้วยระบบแท็ก
- ค้นหาไฟล์ตามชื่อ ประเภท และวันที่
- เชื่อมโยงไฟล์กับงานต่างๆ
- ระบบพรีวิวไฟล์

#### 🏆 KPI และ Leaderboard
- ติดตามประสิทธิภาพการทำงานของสมาชิก
- ระบบให้คะแนนตามความเร็วในการทำงาน
- จัดอันดับรายสัปดาห์และรายเดือน
- วิเคราะห์แนวโน้มประสิทธิภาพ

#### 📅 Google Calendar Integration
- ซิงค์งานไป Google Calendar อัตโนมัติ
- อัปเดตแบบสองทาง (Two-way sync)
- แชร์ปฏิทินให้สมาชิกในกลุ่ม
- ส่งออกข้อมูลเป็นไฟล์ .ics

#### 🌐 Dashboard และ LIFF
- หน้าเว็บสำหรับจัดการงานและดูสถิติ
- LIFF Pages สำหรับตั้งค่าโปรไฟล์
- มุมมองปฏิทินแบบเดือน/สัปดาห์/วัน
- ส่งออกรายงานเป็น CSV/Excel

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/leka-bot.git
cd leka-bot
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
```bash
cp .env.example .env
# แก้ไขไฟล์ .env ตามการตั้งค่าของคุณ
```

### 4. ตั้งค่า Database
```bash
npm run db:init
```

### 5. เริ่มต้น Development Server
```bash
npm run dev
```

## 📚 เอกสารประกอบ

- **[📖 คู่มือติดตั้งและตั้งค่า](./docs/INSTALLATION.md)** - วิธีติดตั้งและตั้งค่าโปรเจ็กอย่างละเอียด
- **[👥 คู่มือผู้ใช้](./docs/USER_GUIDE.md)** - วิธีใช้งานบอทใน LINE ทุกคำสั่ง
- **[🔌 API Documentation](./docs/API.md)** - เอกสาร REST API endpoints
- **[🏗️ Database Schema](./docs/DATABASE.md)** - โครงสร้างฐานข้อมูลและ ERD
- **[🚀 Deployment Guide](./docs/DEPLOYMENT.md)** - คู่มือ deploy บน Railway
- **[🛠️ Development Guide](./docs/DEVELOPMENT.md)** - คู่มือสำหรับนักพัฒนา
- **[✨ Features Overview](./docs/FEATURES.md)** - รายละเอียดฟีเจอร์ทั้งหมด
- **[🔧 Troubleshooting](./docs/TROUBLESHOOTING.md)** - คู่มือแก้ไขปัญหา
- **[📊 Dashboard Guide](./dashboard/README.md)** - คู่มือใช้งาน Web Dashboard

## 🏗️ สถาปัตยกรรม

```
เลขาบอท
├── 🤖 LINE Bot (Webhook Handler)
├── 🌐 REST API (Express.js)
├── 📊 Web Dashboard (HTML/CSS/JS)
├── 🗄️ PostgreSQL Database
├── 📅 Google Calendar API
├── 📧 Email Service (Nodemailer)
└── ⏰ Cron Jobs (การแจ้งเตือนอัตโนมัติ)
```

## 🛠️ เทคโนโลยีที่ใช้

### Backend
- **Node.js** + **TypeScript** - Runtime และภาษา
- **Express.js** - Web framework
- **PostgreSQL** - ฐานข้อมูลหลัก
- **TypeORM** - Object-Relational Mapping

### LINE Platform
- **LINE Bot SDK** - การเชื่อมต่อกับ LINE
- **LINE LIFF** - หน้าเว็บใน LINE (Optional)
- **LINE Login** - Authentication (Optional)

### External Services
- **Google Calendar API** - การซิงค์ปฏิทิน
- **Google OAuth 2.0** - Authentication
- **Nodemailer** - ส่งอีเมล
- **Node-cron** - จัดการงานตามเวลา

### Deployment
- **Railway** - Platform hosting
- **Docker** - Containerization (Optional)

## 📊 คำสั่งหลักใน LINE

```
🤖 คำสั่งพื้นฐาน
├── @เลขา /help           # ดูคำสั่งทั้งหมด
├── @เลขา /setup          # ตั้งค่าเริ่มต้น
└── @เলخา /whoami         # ข้อมูลโปรไฟล์

📋 จัดการงาน
├── @เลขา เพิ่มงาน [ชื่องาน] [วันที่] [@คน1 @คน2]
├── @เลขา /task list       # ดูรายการงาน
├── @เลขา /task done [ID]  # ทำเครื่องหมายเสร็จ
└── @เลขา /task edit [ID]  # แก้ไขงาน

📁 จัดการไฟล์
├── @เลขา /files list      # ดูรายการไฟล์
├── @เลขา /files search [คำค้น]
└── อัปโหลดไฟล์ + แท็ก @เลขา #แท็ก1 #แท็ก2
```

## 🔑 Environment Variables

### Required (จำเป็น)
```env
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
DATABASE_URL=your_postgresql_url
```

### Optional (เสริม)
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🚀 Production Deployment

บอทนี้พร้อม deploy บน Railway โดยมีไฟล์ `railway.json` และ `Procfile` ที่ตั้งค่าไว้แล้ว

```bash
# Deploy to Railway
railway login
railway link
railway up
```

## 🤝 Contributing

ยินดีรับการมีส่วนร่วม! โปรดอ่าน [Development Guide](./docs/DEVELOPMENT.md) ก่อนเริ่มพัฒนา

1. Fork โปรเจ็ก
2. สร้าง feature branch (`git checkout -b feature/amazing-feature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add amazing feature'`)
4. Push ไป branch (`git push origin feature/amazing-feature`)
5. เปิด Pull Request

## 📝 License

โปรเจ็กนี้อยู่ภายใต้สัญญาอนุญาต MIT - ดู [LICENSE](LICENSE) สำหรับรายละเอียด

## 🙏 Acknowledgments

- [LINE Developers](https://developers.line.biz/) - สำหรับ LINE Bot SDK
- [Google Calendar API](https://developers.google.com/calendar) - สำหรับการเชื่อมต่อปฏิทิน
- [Railway](https://railway.app/) - สำหรับ hosting platform

## 📞 ติดต่อและสนับสนุน

- 📧 Email: your-email@example.com
- 💬 LINE: @your-line-id
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/leka-bot/issues)

---

**Made with ❤️ in Thailand**