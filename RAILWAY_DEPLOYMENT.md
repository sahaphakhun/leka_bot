# Railway Deployment Guide

## การ Deploy เลขาบอทบน Railway

### 1. การตั้งค่า Environment Variables

ตั้งค่า environment variables ต่อไปนี้ใน Railway Dashboard:

#### LINE Configuration
```
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_BOT_USER_ID=your_line_bot_user_id
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret
```

#### Database Configuration
```
DATABASE_URL=postgresql://username:password@host:port/database
```

#### Google Services Configuration
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.railway.app/auth/google/callback
```

#### Application Settings
```
JWT_SECRET=your_jwt_secret
DEFAULT_TIMEZONE=Asia/Bangkok
BASE_URL=https://your-domain.railway.app
NODE_ENV=production
```

### 2. การ Deploy

#### วิธีที่ 1: ใช้ railway.json (แนะนำ)
Railway จะใช้การตั้งค่าใน `railway.json` โดยอัตโนมัติ:
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm run railway:migrate && npm run start`

#### วิธีที่ 2: ใช้ Procfile
หาก railway.json ไม่ทำงาน จะใช้ `Procfile`:
```
web: npm run railway:migrate && npm start
```

### 3. Migration Scripts

ระบบจะรัน migration scripts อัตโนมัติเมื่อ deploy:

#### หลัก Migration Scripts
- `npm run railway:migrate` - รัน migration หลัก
- `npm run db:migrate-total-instances` - เพิ่มคอลัมน์ totalInstances
- `npm run db:create-recurring-tasks` - สร้างตาราง recurring_tasks

#### Manual Migration Scripts (ถ้าจำเป็น)
```bash
# เพิ่มคอลัมน์ totalInstances
npm run db:migrate-total-instances

# สร้างตาราง recurring_tasks
npm run db:create-recurring-tasks

# Migration อื่นๆ
npm run db:migrate-comprehensive
npm run db:migrate-all
```

### 4. การตรวจสอบการ Deploy

#### ตรวจสอบ Logs
```bash
railway logs
```

#### ตรวจสอบ Health Check
```
GET https://your-domain.railway.app/health
```

#### ตรวจสอบ Database
```bash
railway connect
```

### 5. การแก้ไขปัญหา

#### ปัญหาการเชื่อมต่อฐานข้อมูล
- ตรวจสอบ DATABASE_URL
- ตรวจสอบ SSL settings
- ตรวจสอบ connection pool settings

#### ปัญหา Migration
- ตรวจสอบ logs ใน Railway Dashboard
- รัน migration manually ผ่าน Railway Shell
- ตรวจสอบตารางในฐานข้อมูล

#### ปัญหาการสร้างงานประจำ
- ตรวจสอบตาราง recurring_tasks
- ตรวจสอบคอลัมน์ totalInstances
- ตรวจสอบ API endpoints

### 6. การ Monitor

#### Railway Dashboard
- ตรวจสอบ metrics
- ตรวจสอบ logs
- ตรวจสอบ environment variables

#### Application Logs
- ตรวจสอบ recurring task creation
- ตรวจสอบ cron job execution
- ตรวจสอบ API responses

### 7. การ Backup

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

### 8. การ Update

#### การ Update Code
1. Push code ไปยัง Git repository
2. Railway จะ build และ deploy อัตโนมัติ
3. Migration scripts จะรันอัตโนมัติ

#### การ Update Dependencies
```bash
npm update
npm run build
```

### 9. การ Debug

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
curl https://your-domain.railway.app/api/groups/test-group/recurring
```

### 10. การ Rollback

#### Rollback Code
- ใช้ Railway Dashboard
- หรือใช้ Git revert

#### Rollback Database
- ใช้ database backup
- หรือรัน migration rollback scripts

---

## สรุป

ระบบการสร้างงานประจำจะทำงานได้ปกติหลังจาก:
1. ✅ ตาราง recurring_tasks ถูกสร้าง
2. ✅ คอลัมน์ totalInstances ถูกเพิ่ม
3. ✅ API endpoints ทำงานได้
4. ✅ Frontend สามารถเรียกใช้ API ได้

หากมีปัญหา ให้ตรวจสอบ logs และรัน migration scripts ตามที่ระบุไว้ข้างต้น
