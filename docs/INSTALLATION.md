# 📖 Installation Guide - คู่มือติดตั้งและตั้งค่า

คู่มือติดตั้งเลขาบอทอย่างละเอียด สำหรับสภาพแวดล้อม Development และ Production

## 📋 ข้อกำหนดเบื้องต้น (Prerequisites)

### ระบบปฏิบัติการ
- **Windows 10/11**, **macOS**, หรือ **Linux** (Ubuntu 18.04+)

### Software Requirements
- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 8.0.0 (มาพร้อม Node.js)
- **PostgreSQL** >= 12.0 ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

### บัญชีและ API Keys ที่จำเป็น
- **LINE Developers Account** ([สมัครที่นี่](https://developers.line.biz/))
  - LINE Bot Channel (Messaging API)
  - LINE Login Channel (Optional)
- **Google Cloud Console** ([สมัครที่นี่](https://console.cloud.google.com/)) - สำหรับ Calendar API
- **Email Account** - สำหรับส่งการแจ้งเตือน (Gmail แนะนำ)

## 🚀 ขั้นตอนการติดตั้ง

### 1. Clone Repository

```bash
# Clone โปรเจ็กจาก GitHub
git clone https://github.com/yourusername/leka-bot.git

# เข้าไปในโฟลเดอร์โปรเจ็ก
cd leka-bot
```

### 2. ติดตั้ง Dependencies

```bash
# ติดตั้ง packages ทั้งหมด
npm install

# ตรวจสอบการติดตั้ง
npm ls --depth=0
```

### 3. ตั้งค่า PostgreSQL Database

#### Option A: ติดตั้ง PostgreSQL ในเครื่อง

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (ใช้ Homebrew)
brew install postgresql
brew services start postgresql

# Windows - ดาวน์โหลดจาก https://www.postgresql.org/download/windows/
```

#### สร้าง Database และ User

```sql
-- เข้าสู่ PostgreSQL console
sudo -u postgres psql

-- สร้าง database
CREATE DATABASE leka_bot;

-- สร้าง user (เปลี่ยน password)
CREATE USER leka_user WITH PASSWORD 'your_secure_password';

-- ให้สิทธิ์
GRANT ALL PRIVILEGES ON DATABASE leka_bot TO leka_user;

-- ออกจาก console
\q
```

#### Option B: ใช้ Cloud Database (แนะนำสำหรับ Production)

- **Supabase** (Free tier ใช้ได้) - [supabase.com](https://supabase.com/)
- **Railway** (มีฟรี tier) - [railway.app](https://railway.app/)
- **Heroku Postgres** - [heroku.com](https://www.heroku.com/postgres)
- **AWS RDS** - [aws.amazon.com](https://aws.amazon.com/rds/)

### 4. ตั้งค่า Environment Variables

```bash
# คัดลอกไฟล์ตัวอย่าง
cp .env.example .env

# แก้ไขไฟล์ .env
nano .env
# หรือ
code .env
```

#### ไฟล์ `.env` ตัวอย่าง:

```env
# ===== SERVER CONFIGURATION =====
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# ===== DATABASE CONFIGURATION =====
# สำหรับ local database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=leka_user
DB_PASSWORD=your_secure_password
DB_NAME=leka_bot

# หรือใช้ DATABASE_URL สำหรับ cloud database
DATABASE_URL=postgresql://user:password@host:port/database

# ===== LINE BOT CONFIGURATION =====
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_BOT_USER_ID=your_bot_user_id

# ===== LINE LOGIN (Optional) =====
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret
LINE_LIFF_ID=your_liff_id

# ===== GOOGLE SERVICES (Optional) =====
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# ===== EMAIL CONFIGURATION (Optional) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# ===== APPLICATION SETTINGS =====
JWT_SECRET=your_very_secure_jwt_secret_key_here
DEFAULT_TIMEZONE=Asia/Bangkok
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### 5. ตั้งค่า LINE Bot

#### 5.1 สร้าง LINE Bot Channel

1. เข้า [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider ใหม่หรือเลือกที่มีอยู่
3. สร้าง Channel ใหม่ > **Messaging API**
4. กรอกข้อมูล Channel:
   - **Channel name**: เลขาบอท
   - **Channel description**: เลขานุการอัตโนมัติสำหรับกลุ่ม LINE
   - **Category**: Business
   - **Subcategory**: Other

#### 5.2 ตั้งค่า Webhook

1. ในหน้า Channel > **Messaging API**
2. ตั้งค่า **Webhook URL**: `https://your-domain.com/webhook`
   - สำหรับ development: `https://your-ngrok-url.ngrok.io/webhook`
3. เปิด **Use webhook**: ON
4. ปิด **Auto-reply messages**: OFF
5. ปิด **Greeting messages**: OFF

#### 5.3 คัดลอก Credentials

```env
# จาก Channel > Messaging API
LINE_CHANNEL_ACCESS_TOKEN=ใส่ Channel access token
LINE_CHANNEL_SECRET=ใส่ Channel secret

# จาก Channel > Basic settings
LINE_BOT_USER_ID=ใส่ User ID (เริ่มต้นด้วย U)
```

### 6. ตั้งค่า Google Calendar (Optional)

#### 6.1 สร้าง Google Cloud Project

1. เข้า [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่
3. เปิดใช้งาน **Google Calendar API**
4. สร้าง **OAuth 2.0 Credentials**

#### 6.2 ตั้งค่า OAuth

1. ไป **APIs & Services** > **Credentials**
2. สร้าง **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. **Authorized redirect URIs**: 
   - `http://localhost:3000/auth/google/callback`
   - `https://your-domain.com/auth/google/callback`

#### 6.3 คัดลอก Credentials

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### 7. ตั้งค่า Email (Optional)

#### สำหรับ Gmail:

1. เปิด **2-Step Verification** ในบัญชี Google
2. สร้าง **App Password**:
   - Google Account > Security > 2-Step Verification > App passwords
   - เลือก **Mail** และอุปกรณ์ของคุณ
   - คัดลอก 16-digit password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_digit_app_password
```

### 8. Initialize Database

```bash
# ทดสอบการเชื่อมต่อ database
npm run db:test

# สร้างตารางทั้งหมด
npm run db:init

# ตรวจสอบอีกครั้ง
npm run db:test
```

### 9. Build และ Test

```bash
# Build โปรเจ็ก
npm run build

# เริ่มต้น development server
npm run dev
```

### 10. ทดสอบการทำงาน

#### 10.1 เข้าถึง Endpoints

- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api
- **Dashboard**: http://localhost:3000/dashboard

#### 10.2 ทดสอบ LINE Bot

1. เพิ่มบอทเข้ากลุ่ม LINE
2. ลองส่งคำสั่ง: `@เลขา /help`
3. ตรวจสอบ log ใน console

## 🔧 การตั้งค่าเพิ่มเติม

### การใช้งาน ngrok สำหรับ Development

```bash
# ติดตั้ง ngrok
npm install -g ngrok

# รัน ngrok (terminal แยก)
ngrok http 3000

# คัดลอก HTTPS URL ไปใส่ใน LINE Webhook
# เช่น: https://abc123.ngrok.io/webhook
```

### ตั้งค่า PM2 สำหรับ Production

```bash
# ติดตั้ง PM2
npm install -g pm2

# สร้างไฟล์ ecosystem.config.js
npm run build

# เริ่มต้นด้วย PM2
pm2 start ecosystem.config.js

# ดู status
pm2 status

# ดู logs
pm2 logs leka-bot
```

### การสำรองข้อมูล Database

```bash
# Export ข้อมูล
pg_dump -h localhost -U leka_user -d leka_bot > backup.sql

# Import ข้อมูล
psql -h localhost -U leka_user -d leka_bot < backup.sql
```

## 🐛 การแก้ไขปัญหาเบื้องต้น

### Database Connection Issues

```bash
# ตรวจสอบ PostgreSQL service
sudo systemctl status postgresql

# รีสตาร์ท service
sudo systemctl restart postgresql

# ทดสอบการเชื่อมต่อ
psql -h localhost -U leka_user -d leka_bot
```

### LINE Webhook Issues

1. ตรวจสอบ URL ว่าเข้าถึงได้จากภายนอก
2. ตรวจสอบ SSL Certificate (HTTPS จำเป็น)
3. ตรวจสอบ Webhook URL ใน LINE Console

### Dependencies Issues

```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install

# หรือใช้ npm ci สำหรับ production
npm ci
```

## ✅ Checklist สำหรับการติดตั้ง

- [ ] Node.js และ npm ติดตั้งแล้ว
- [ ] PostgreSQL เซ็ตอัพแล้ว
- [ ] `.env` ตั้งค่าครบถ้วน
- [ ] LINE Bot สร้างและตั้งค่าแล้ว
- [ ] Database tables สร้างแล้ว (`npm run db:init`)
- [ ] Build สำเร็จ (`npm run build`)
- [ ] Development server รันได้ (`npm run dev`)
- [ ] Health check ผ่าน (http://localhost:3000/health)
- [ ] LINE Bot ตอบกลับได้ (`@เลขา /help`)

## 🚀 Next Steps

หลังจากติดตั้งเสร็จแล้ว:

1. **อ่าน [User Guide](./USER_GUIDE.md)** - เรียนรู้วิธีใช้งานบอท
2. **อ่าน [Features Guide](./FEATURES.md)** - ทำความเข้าใจฟีเจอร์ต่างๆ
3. **อ่าน [Deployment Guide](./DEPLOYMENT.md)** - สำหรับ deploy production
4. **อ่าน [Development Guide](./DEVELOPMENT.md)** - สำหรับการพัฒนาต่อ

## 📞 ขอความช่วยเหลือ

หากพบปัญหาในการติดตั้ง:

1. ตรวจสอบ [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. ดู [GitHub Issues](https://github.com/yourusername/leka-bot/issues)
3. สร้าง Issue ใหม่พร้อมรายละเอียดข้อผิดพลาด

---

**Happy Coding! 🎉**