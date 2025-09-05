# คู่มือการ Deploy เลขาบอทบน Railway

## 🚀 การ Deploy แบบง่าย

### 1. การตั้งค่า Environment Variables

ไปที่ Railway Dashboard > โปรเจ็กต์ > Variables และเพิ่มตัวแปรต่อไปนี้:

#### 📱 LINE Bot Configuration
```env
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_BOT_USER_ID=your_line_bot_user_id
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret
```

#### 🗄️ Database Configuration
```env
# Railway จะให้ DATABASE_URL อัตโนมัติเมื่อเชื่อมต่อ PostgreSQL
DATABASE_URL=postgresql://username:password@host:port/database
```

#### 🔐 Google Services Configuration
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app-name.railway.app/auth/google/callback
```

#### 📁 Google Service Account (สำหรับ Google Drive)
```env
# วิธีที่ 1: ใส่ JSON ทั้งหมดในบรรทัดเดียว
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id",...}

# หรือวิธีที่ 2: แยกเป็นตัวแปรแต่ละตัว
GOOGLE_SA_TYPE=service_account
GOOGLE_SA_PROJECT_ID=your-project-id
GOOGLE_SA_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_SA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n
GOOGLE_SA_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
GOOGLE_SA_CLIENT_ID=your-client-id
GOOGLE_SA_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_SA_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_SA_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_SA_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com
GOOGLE_SA_UNIVERSE_DOMAIN=googleapis.com
```

#### 📧 Email Configuration (ถ้าต้องการ)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### 🎨 Cloudinary (ถ้าต้องการ)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=leka-uploads
```

#### ⚙️ Application Settings
```env
JWT_SECRET=your_jwt_secret
DEFAULT_TIMEZONE=Asia/Bangkok
BASE_URL=https://your-app-name.railway.app
NODE_ENV=production
```

### 2. การ Deploy

#### วิธีที่ 1: ใช้ GitHub (แนะนำ)
1. Push โค้ดไปยัง GitHub repository
2. เชื่อมต่อ Railway กับ GitHub repository
3. Railway จะ build และ deploy อัตโนมัติ

#### วิธีที่ 2: ใช้ Railway CLI
```bash
# ติดตั้ง Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### 3. การตรวจสอบการ Deploy

#### ตรวจสอบ Logs
```bash
railway logs
```

#### ตรวจสอบ Health Check
```
GET https://your-app-name.railway.app/health
```

#### ตรวจสอบ Database
```bash
railway connect
```

### 4. การแก้ไขปัญหา

#### ปัญหาการ Build
- ตรวจสอบว่า `package.json` มี scripts ที่จำเป็น
- ตรวจสอบว่า `tsconfig.json` ถูกต้อง
- ตรวจสอบ logs ใน Railway Dashboard

#### ปัญหาการเชื่อมต่อฐานข้อมูล
- ตรวจสอบ `DATABASE_URL`
- ตรวจสอบว่า PostgreSQL service เชื่อมต่อแล้ว
- ตรวจสอบ SSL settings

#### ปัญหา Migration
- ตรวจสอบ logs ใน Railway Dashboard
- รัน migration manually ผ่าน Railway Shell
- ตรวจสอบตารางในฐานข้อมูล

#### ปัญหา LINE Bot
- ตรวจสอบ `LINE_CHANNEL_ACCESS_TOKEN`
- ตรวจสอบ `LINE_CHANNEL_SECRET`
- ตรวจสอบ webhook URL ใน LINE Developer Console

#### ปัญหา Google Services
- ตรวจสอบ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
- ตรวจสอบ `GOOGLE_REDIRECT_URI`
- ตรวจสอบ Service Account JSON

### 5. การ Monitor

#### Railway Dashboard
- ตรวจสอบ metrics
- ตรวจสอบ logs
- ตรวจสอบ environment variables
- ตรวจสอบ resource usage

#### Application Logs
- ตรวจสอบ LINE webhook
- ตรวจสอบ database connections
- ตรวจสอบ API responses
- ตรวจสอบ cron jobs

### 6. การ Backup

#### Database Backup
```bash
# ใช้ Railway CLI
railway connect

# หรือใช้ pg_dump
pg_dump $DATABASE_URL > backup.sql
```

#### File Backup
- ไฟล์ที่อัปโหลดจะถูกเก็บใน Google Drive
- ตรวจสอบ Google Drive service account settings

### 7. การ Update

#### การ Update Code
1. Push code ไปยัง GitHub repository
2. Railway จะ build และ deploy อัตโนมัติ
3. Migration scripts จะรันอัตโนมัติ

#### การ Update Dependencies
```bash
npm update
npm run build
```

### 8. การ Debug

#### ตรวจสอบ Environment
```bash
railway shell
env | grep -E "(NODE_ENV|DATABASE_URL|LINE_)"
```

#### ตรวจสอบ Database Schema
```bash
railway connect
\dt
\d recurring_tasks
```

#### ตรวจสอบ API Endpoints
```bash
curl https://your-app-name.railway.app/api/groups/test-group/recurring
```

### 9. การ Rollback

#### Rollback Code
- ใช้ Railway Dashboard
- หรือใช้ Git revert

#### Rollback Database
- ใช้ database backup
- หรือรัน migration rollback scripts

---

## 📋 Checklist การ Deploy

### ก่อน Deploy
- [ ] ตั้งค่า Environment Variables ครบถ้วน
- [ ] เชื่อมต่อ PostgreSQL service
- [ ] ตั้งค่า LINE Bot webhook URL
- [ ] ตั้งค่า Google Services
- [ ] ตรวจสอบ `package.json` scripts

### หลัง Deploy
- [ ] ตรวจสอบ Health Check
- [ ] ตรวจสอบ Database connection
- [ ] ตรวจสอบ LINE Bot webhook
- [ ] ตรวจสอบ Google Services
- [ ] ทดสอบ API endpoints
- [ ] ตรวจสอบ Logs

### การ Monitor
- [ ] ตั้งค่า alerts
- [ ] ตรวจสอบ resource usage
- [ ] ตรวจสอบ error rates
- [ ] ตรวจสอบ response times

---

## 🆘 การขอความช่วยเหลือ

หากมีปัญหาในการ deploy:

1. **ตรวจสอบ Logs** ใน Railway Dashboard
2. **ตรวจสอบ Environment Variables** ว่าถูกต้อง
3. **ตรวจสอบ Database Connection**
4. **ตรวจสอบ LINE Bot Configuration**
5. **ตรวจสอบ Google Services Configuration**

สำหรับปัญหาที่ซับซ้อน ให้ตรวจสอบ:
- Railway Documentation
- LINE Bot API Documentation
- Google APIs Documentation
- TypeORM Documentation

---

## 🎉 สรุป

หลังจาก deploy สำเร็จ ระบบจะทำงานได้ปกติ:
- ✅ LINE Bot รับและส่งข้อความ
- ✅ Database เก็บข้อมูลงาน
- ✅ Google Calendar integration
- ✅ File upload/download
- ✅ Recurring tasks
- ✅ Dashboard interface

หากมีปัญหา ให้ตรวจสอบ logs และ environment variables ตามที่ระบุไว้ข้างต้น
