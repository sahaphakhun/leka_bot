# ✅ Railway Deployment Checklist

## 🚀 การเตรียมพร้อมสำหรับ Railway

### ✅ ไฟล์ที่อัพเดทแล้ว

#### 1. **Procfile**
```
web: npm run deploy:migrate && npm start
```

#### 2. **railway.json**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci --include=dev && npm run build"
  },
  "deploy": {
    "startCommand": "npm run deploy:migrate && npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 3. **package.json Scripts**
- ✅ `railway:deploy` - สำหรับ Railway deployment
- ✅ `railway:build` - สำหรับ Railway build
- ✅ `deploy:migrate` - รัน migration ก่อน start

#### 4. **.railwayignore**
- ✅ ไฟล์ที่ไม่จำเป็นสำหรับ production
- ✅ Test files และ development files
- ✅ Documentation files

#### 5. **env.example**
- ✅ Railway-specific environment variables
- ✅ Production URLs และ settings

### ✅ การแก้ไข Build Issues

#### 1. **ลบไฟล์ Migration Scripts ที่ไม่จำเป็น**
- ✅ ลบไฟล์ scripts ที่ไม่ใช้แล้ว
- ✅ แก้ไข import statements ใน apiController
- ✅ ใช้ comprehensiveMigration แทน

#### 2. **แก้ไข TypeScript Errors**
- ✅ แก้ไข import ที่ไม่พบ
- ✅ ใช้ AppDataSource โดยตรงสำหรับ database check
- ✅ Build สำเร็จแล้ว ✅

### 📋 Environment Variables ที่ต้องตั้งค่าใน Railway

#### 🔑 Required Variables
```env
# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
LINE_BOT_USER_ID=your_bot_id
LINE_LOGIN_CHANNEL_ID=your_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_login_secret

# Database (Railway จะให้อัตโนมัติ)
DATABASE_URL=postgresql://...

# Google Services
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-app.railway.app/auth/google/callback

# Google Service Account (เลือกวิธีใดวิธีหนึ่ง)
# วิธีที่ 1: JSON ทั้งหมด
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# วิธีที่ 2: แยกเป็นตัวแปร
GOOGLE_SA_TYPE=service_account
GOOGLE_SA_PROJECT_ID=your_project_id
GOOGLE_SA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
GOOGLE_SA_CLIENT_EMAIL=your_service_account@...

# App Settings
JWT_SECRET=your_jwt_secret
DEFAULT_TIMEZONE=Asia/Bangkok
BASE_URL=https://your-app.railway.app
NODE_ENV=production
```

#### 🔧 Optional Variables
```env
# Email (ถ้าต้องการ)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cloudinary (ถ้าต้องการ)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=leka-uploads

# Google Drive
GOOGLE_DRIVE_SHARED_FOLDER_ID=your_folder_id
```

### 🚀 ขั้นตอนการ Deploy

#### 1. **เตรียม Repository**
```bash
# Commit การเปลี่ยนแปลง
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

#### 2. **ตั้งค่า Railway Project**
1. ไปที่ [Railway Dashboard](https://railway.app)
2. สร้างโปรเจ็กต์ใหม่
3. เชื่อมต่อกับ GitHub repository
4. เพิ่ม PostgreSQL service
5. ตั้งค่า Environment Variables

#### 3. **ตรวจสอบการ Deploy**
- ✅ Build สำเร็จ
- ✅ Migration รันสำเร็จ
- ✅ Application start สำเร็จ
- ✅ Health check ผ่าน

### 🔍 การตรวจสอบหลัง Deploy

#### 1. **ตรวจสอบ Logs**
```bash
railway logs
```

#### 2. **ตรวจสอบ Health Check**
```
GET https://your-app.railway.app/health
```

#### 3. **ตรวจสอบ Database**
```bash
railway connect
```

#### 4. **ทดสอบ API Endpoints**
```bash
# ตรวจสอบ LINE Bot
curl https://your-app.railway.app/api/line/webhook

# ตรวจสอบ Groups
curl https://your-app.railway.app/api/groups

# ตรวจสอบ Dashboard
curl https://your-app.railway.app/dashboard
```

### 🛠️ การแก้ไขปัญหา

#### ปัญหา Build
- ✅ ตรวจสอบ TypeScript compilation
- ✅ ตรวจสอบ dependencies
- ✅ ตรวจสอบ file paths

#### ปัญหา Migration
- ✅ ตรวจสอบ DATABASE_URL
- ✅ ตรวจสอบ database permissions
- ✅ ตรวจสอบ migration logs

#### ปัญหา LINE Bot
- ✅ ตรวจสอบ webhook URL
- ✅ ตรวจสอบ LINE credentials
- ✅ ตรวจสอบ LINE Developer Console

#### ปัญหา Google Services
- ✅ ตรวจสอบ Service Account JSON
- ✅ ตรวจสอบ Google Cloud Console
- ✅ ตรวจสอบ API permissions

### 📊 Monitoring

#### Railway Dashboard
- ✅ Resource usage
- ✅ Logs
- ✅ Metrics
- ✅ Environment variables

#### Application Monitoring
- ✅ Health check endpoint
- ✅ Database connection
- ✅ LINE Bot status
- ✅ Google Services status

### 🎯 สรุป

โปรเจ็กต์พร้อมสำหรับ Railway deployment แล้ว:

- ✅ **Build Process**: สำเร็จ
- ✅ **Migration Scripts**: อัพเดทแล้ว
- ✅ **Environment Variables**: เตรียมแล้ว
- ✅ **Railway Configuration**: ตั้งค่าแล้ว
- ✅ **Documentation**: สร้างแล้ว

**ขั้นตอนต่อไป:**
1. ตั้งค่า Environment Variables ใน Railway
2. Deploy โปรเจ็กต์
3. ตรวจสอบการทำงาน
4. ตั้งค่า LINE Bot webhook
5. ทดสอบระบบ

---

## 📞 การขอความช่วยเหลือ

หากมีปัญหาในการ deploy:
1. ตรวจสอบ logs ใน Railway Dashboard
2. ตรวจสอบ environment variables
3. ตรวจสอบ database connection
4. ตรวจสอบ LINE Bot configuration
5. ตรวจสอบ Google Services configuration

**ไฟล์ที่สำคัญ:**
- `RAILWAY_DEPLOYMENT_GUIDE.md` - คู่มือการ deploy แบบละเอียด
- `env.example` - ตัวอย่าง environment variables
- `Procfile` - Railway start command
- `railway.json` - Railway configuration
