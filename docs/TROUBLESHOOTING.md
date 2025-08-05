# 🔧 Troubleshooting Guide - คู่มือแก้ไขปัญหา

คู่มือแก้ไขปัญหาที่พบบ่อยในการใช้งานเลขาบอท รวมถึงวิธีการ debug และแก้ไขปัญหา

## 🚨 ปัญหาที่พบบ่อย

### 1. บอทไม่ตอบกลับ

#### 🔍 อาการ
- ส่งคำสั่งให้บอทแล้วไม่มีการตอบกลับ
- บอทไม่แสดงสถานะ "กำลังพิมพ์"
- ไม่มี reaction หรือการตอบสนองใดๆ

#### 🛠️ วิธีแก้ไข

##### ตรวจสอบการแท็กบอท
```bash
# วิธีแท็กที่ถูกต้อง
@เลขา /help                    # ✅ แท็กบอทจริงใน LINE
@เลขา เพิ่มงาน "ชื่องาน" @me    # ✅ แท็กข้อความ

# วิธีที่ผิด
เลขา /help                     # ❌ ไม่มี @
@เลขาบอท /help                 # ❌ ชื่อไม่ตรง
/help                          # ❌ ไม่แท็กบอท (ใช้ได้บางคำสั่ง)
```

##### ตรวจสอบสถานะบอท
```bash
# 1. ตรวจสอบบอทยังอยู่ในกลุ่มหรือไม่
# ดูรายชื่อสมาชิกในกลุ่ม LINE

# 2. ตรวจสอบ webhook status
curl https://your-domain.com/health
# Expected: {"status":"OK","timestamp":"..."}

# 3. ทดสอบใน LINE Developers Console
# Messaging API > Webhook > Verify
```

##### ตรวจสอบ Network และ Webhook
```bash
# ตรวจสอบ webhook URL ใน LINE Console
# URL ต้องเป็น HTTPS และเข้าถึงได้จากภายนอก

# ทดสอบ webhook endpoint
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

### 2. ไม่สามารถเข้า Dashboard ได้

#### 🔍 อาการ
- คลิกลิงก์ Dashboard แล้วไม่สามารถเข้าได้
- แสดง error 404 หรือ 500
- หน้าเว็บโหลดไม่เสร็จ

#### 🛠️ วิธีแก้ไข

##### ตรวจสอบ URL
```bash
# URL ที่ถูกต้อง
https://your-domain.com/dashboard?groupId=LINE_GROUP_ID

# ปัญหาที่พบบ่อย
https://your-domain.com/dashboard              # ❌ ไม่มี groupId
https://your-domain.com/dashboard?groupId=xxx  # ❌ groupId ไม่ถูกต้อง
http://your-domain.com/dashboard               # ❌ ใช้ HTTP แทน HTTPS
```

##### ดูลิงก์ใหม่
```bash
# ใช้คำสั่งในกลุ่ม LINE
@เลขา /setup

# บอทจะส่งลิงก์ที่ถูกต้อง
```

##### ตรวจสอบ Browser
```bash
# 1. ล้าง Cache และ Cookies
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete

# 2. ลองใช้ Incognito/Private Mode

# 3. ลองเบราว์เซอร์อื่น
```

##### ตรวจสอบ Server
```bash
# Health check
curl https://your-domain.com/health

# Dashboard endpoint
curl https://your-domain.com/dashboard

# ตรวจสอบ logs
railway logs --tail  # สำหรับ Railway
```

### 3. งานไม่แสดงใน Google Calendar

#### 🔍 อาการ
- สร้างงานแล้วไม่ปรากฏใน Google Calendar
- การแก้ไขงานไม่ sync กับ Calendar
- เกิด error เกี่ยวกับ Google API

#### 🛠️ วิธีแก้ไข

##### ตรวจสอบการตั้งค่า Google
```bash
# 1. ตรวจสอบ Environment Variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $GOOGLE_REDIRECT_URI

# 2. ตรวจสอบใน Dashboard
# Settings > Integrations > Google Calendar Status
```

##### ตรวจสอบ Calendar Permissions
```bash
# 1. เข้า Google Calendar
# 2. ตรวจสอบว่ามี Calendar ของกลุ่มหรือไม่
# 3. ตรวจสอบ sharing permissions

# 4. ตรวจสอบ Service Account permissions
# Google Cloud Console > IAM & Admin > Service Accounts
```

##### ตรวจสอบ Google API Quota
```bash
# Google Cloud Console > APIs & Services > Quotas
# ตรวจสอบว่า Calendar API quota เหลืออยู่หรือไม่
```

##### Debug Google API
```bash
# เปิด debug logging
NODE_ENV=development npm run dev

# ดู error logs
railway logs --grep "google"
```

### 4. ไม่ได้รับการแจ้งเตือนทาง Email

#### 🔍 อาการ
- แจ้งเตือนใน LINE ได้ แต่ไม่ได้รับ Email
- Email ไปเข้าโฟลเดอร์ Spam
- Error เกี่ยวกับ SMTP

#### 🛠️ วิธีแก้ไข

##### ตรวจสอบการตั้งค่า Email
```bash
# ตรวจสอบ SMTP credentials
echo $SMTP_USER
echo $SMTP_PASS
echo $SMTP_HOST
echo $SMTP_PORT

# ทดสอบ SMTP connection
npm run test:email  # ถ้ามี script นี้
```

##### ตรวจสอบ Email Address
```bash
# 1. เข้า Dashboard > Profile
# 2. ตรวจสอบ Email address ถูกต้องหรือไม่
# 3. ตรวจสอบ Email verification status
```

##### Gmail App Password
```bash
# สำหรับ Gmail ต้องใช้ App Password
# 1. เปิด 2-Step Verification ในบัญชี Google
# 2. Google Account > Security > App passwords
# 3. สร้าง App password สำหรับ Mail
# 4. ใช้ 16-digit password ใน SMTP_PASS
```

##### ตรวจสอบ Email Provider
```bash
# Gmail Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Outlook Settings  
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# Yahoo Settings
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

### 5. Database Connection Issues

#### 🔍 อาการ
- Error เกี่ยวกับการเชื่อมต่อฐานข้อมูล
- "ECONNREFUSED" หรือ "Connection timeout"
- ข้อมูลไม่บันทึกหรือไม่อัปเดต

#### 🛠️ วิธีแก้ไข

##### ตรวจสอบ Database Configuration
```bash
# ตรวจสอบ connection string
echo $DATABASE_URL

# รูปแบบที่ถูกต้อง
postgresql://username:password@host:port/database
```

##### ทดสอบ Database Connection
```bash
# ใช้ built-in script
npm run db:test

# ผลลัพธ์ที่คาดหวัง
# ✅ Database connected successfully
# ✅ All required tables are present
```

##### ตรวจสอบ Database Service
```bash
# สำหรับ Railway
railway connect postgresql
\dt  # ดู tables

# สำหรับ local PostgreSQL
psql -h localhost -U postgres -d leka_bot
\dt
```

##### Database Migration
```bash
# Re-initialize database
npm run db:init

# สำหรับ production
npm run db:sync
```

### 6. File Upload Issues

#### 🔍 อาการ
- ไฟล์ที่ส่งในกลุ่มไม่ถูกบันทึก
- Error เมื่ออัปโหลดไฟล์ใน Dashboard
- ไฟล์หายไปหรือเข้าถึงไม่ได้

#### 🛠️ วิธีแก้ไข

##### ตรวจสอบ File Size
```bash
# ขนาดไฟล์สูงสุดที่รองรับ
echo $MAX_FILE_SIZE  # default: 10485760 (10MB)

# หากไฟล์ใหญ่เกิน limit จะไม่สามารถบันทึกได้
```

##### ตรวจสอบ Storage Directory
```bash
# ตรวจสอบ uploads directory
ls -la uploads/

# สร้าง directory ถ้าไม่มี
mkdir -p uploads
chmod 755 uploads
```

##### ตรวจสอบ File Permissions
```bash
# ตรวจสอบ permissions
ls -la uploads/

# แก้ไข permissions ถ้าจำเป็น
chmod 644 uploads/*
chmod 755 uploads/
```

##### Debug File Service
```bash
# เปิด debug mode
NODE_ENV=development npm run dev

# ส่งไฟล์ทดสอบและดู logs
```

### 7. KPI และ Leaderboard ไม่อัปเดต

#### 🔍 อาการ
- คะแนน KPI ไม่เปลี่ยนแปลงหลังปิดงาน
- Leaderboard ไม่แสดงข้อมูลล่าสุด
- อันดับไม่ถูกต้อง

#### 🛠️ วิธีแก้ไข

##### ตรวจสอบการปิดงาน
```bash
# ต้องใช้คำสั่งปิดงานอย่างถูกต้อง
@เลขา /task done ABC123

# ไม่ใช่แค่เปลี่ยนสถานะใน Dashboard
```

##### ตรวจสอบ KPI Calculation
```bash
# KPI จะคำนวณตามเวลาที่ปิดงาน
# Early: เสร็จก่อนกำหนด ≥ 24 ชม = +2
# On-time: เสร็จตรงเวลา ±24 ชม = +1  
# Late: ล่าช้า 24-48 ชม = -1
# Overtime: ค้างนาน >48 ชม = -2
```

##### รอ Processing Time
```bash
# KPI อาจใช้เวลา 5-10 นาทีในการอัปเดต
# ลองรีเฟรช Dashboard หลังจากนั้น
```

##### Manual Recalculation
```bash
# ถ้ามี script recalculate
npm run recalculate:kpi

# หรือ restart server
npm run restart
```

## 🐛 Debug Methods

### 1. Logging และ Monitoring

#### ดู Application Logs
```bash
# Railway
railway logs --tail
railway logs --since 1h

# Local development
npm run dev

# PM2 (production)
pm2 logs leka-bot
```

#### Log Levels
```bash
# Debug logging
NODE_ENV=development

# Production logging  
NODE_ENV=production
```

### 2. Health Checks

#### System Health
```bash
# Application health
curl https://your-domain.com/health

# Database health
curl https://your-domain.com/api/health/db

# Expected response
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

#### Service Status
```bash
# ตรวจสอบ services ต่างๆ
curl https://your-domain.com/api/health/services

# Expected response
{
  "database": "connected",
  "line": "active", 
  "google": "authenticated",
  "email": "configured"
}
```

### 3. API Testing

#### Test API Endpoints
```bash
# Test with curl
curl -X GET https://your-domain.com/api/groups/GROUP_ID \
  -H "Authorization: Bearer TOKEN"

# Test with Postman
# Import postman collection from docs/postman/
```

#### Authentication Testing
```bash
# Get JWT token
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"lineUserId":"USER_ID"}'

# Use token
curl -X GET https://your-domain.com/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Performance Issues

### 1. Slow Response Times

#### 🔍 อาการ
- บอทตอบช้า
- Dashboard โหลดนาน
- API response timeout

#### 🛠️ วิธีแก้ไข

##### Database Optimization
```bash
# ตรวจสอบ slow queries
# Enable query logging
NODE_ENV=development

# ดู database performance
EXPLAIN ANALYZE SELECT * FROM tasks WHERE group_id = 'xxx';
```

##### Connection Pool
```bash
# ปรับ connection pool settings
export DB_POOL_SIZE=20
export DB_POOL_MIN=5
```

##### Caching
```bash
# Clear cache ถ้ามี
npm run cache:clear

# หรือ restart application
npm run restart
```

### 2. Memory Issues

#### 🔍 อาการ
- Server crash ด้วย "Out of memory"
- Response times เพิ่มขึ้นเรื่อยๆ
- High CPU usage

#### 🛠️ วิธีแก้ไข

##### Memory Monitoring
```bash
# ดู memory usage
curl https://your-domain.com/api/metrics

# PM2 monitoring
pm2 monit
```

##### Optimize Code
```bash
# ปิด debug logging ใน production
NODE_ENV=production

# จำกัด file upload size
MAX_FILE_SIZE=5242880  # 5MB instead of 10MB
```

## 🚫 Error Codes และ Messages

### HTTP Error Codes

#### 400 Bad Request
```bash
# สาเหตุ: Request data ไม่ถูกต้อง
# แก้ไข: ตรวจสอบ request format

curl -X POST /api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "งานทดสอบ",
    "dueTime": "2023-12-31T18:00:00.000Z",
    "assigneeIds": ["user-id"]
  }'
```

#### 401 Unauthorized
```bash
# สาเหตุ: ไม่มี authentication token
# แก้ไข: เพิ่ม Authorization header

curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/tasks
```

#### 403 Forbidden
```bash
# สาเหตุ: ไม่มีสิทธิ์เข้าถึง
# แก้ไข: ตรวจสอบสมาชิกในกลุ่ม หรือสิทธิ์ admin
```

#### 404 Not Found
```bash
# สาเหตุ: ไม่พบ resource ที่ต้องการ
# แก้ไข: ตรวจสอบ URL และ resource ID
```

#### 429 Too Many Requests
```bash
# สาเหตุ: ส่ง request มากเกินไป
# แก้ไข: รอสักครู่แล้วลองใหม่
```

#### 500 Internal Server Error
```bash
# สาเหตุ: Server error
# แก้ไข: ตรวจสอบ logs และติดต่อ admin
```

### LINE Bot Errors

#### Invalid Reply Token
```bash
# สาเหตุ: Reply token หมดอายุ
# แก้ไข: Reply token ใช้ได้ครั้งเดียวภายใน 30 วินาที
```

#### Invalid Signature
```bash
# สาเหตุ: Webhook signature ไม่ถูกต้อง
# แก้ไข: ตรวจสอบ Channel Secret

# Debug signature validation
console.log('Signature:', req.headers['x-line-signature']);
console.log('Body:', req.body);
```

#### Channel Access Token Expired
```bash
# สาเหตุ: Access token หมดอายุ
# แก้ไข: สร้าง access token ใหม่ใน LINE Console
```

## 🛠️ Recovery Procedures

### 1. Service Recovery

#### Application Restart
```bash
# Railway
railway restart

# PM2
pm2 restart leka-bot

# Docker
docker restart leka-bot-container
```

#### Database Recovery
```bash
# ตรวจสอบ database connection
npm run db:test

# Re-initialize ถ้าจำเป็น
npm run db:init

# Restore from backup
psql -d leka_bot < backup.sql
```

### 2. Data Recovery

#### Task Data Recovery
```bash
# หาง
SELECT * FROM tasks 
WHERE created_at >= '2023-01-01'
ORDER BY created_at DESC;

# Restore specific task
UPDATE tasks 
SET status = 'pending' 
WHERE id = 'task-id' AND status = 'cancelled';
```

#### File Recovery
```bash
# ตรวจสอบ file system
ls -la uploads/

# Restore file metadata
INSERT INTO files (id, group_id, file_name, ...) 
VALUES (...);
```

### 3. Configuration Recovery

#### Environment Variables
```bash
# Backup current config
railway variables > backup.env

# Restore from backup
railway variables set $(cat backup.env)
```

#### LINE Webhook Reset
```bash
# Reset webhook URL ใน LINE Console
# 1. ไป Messaging API settings
# 2. อัปเดต Webhook URL
# 3. Verify webhook
```

## 📞 Getting Additional Help

### 1. Documentation Resources

#### เอกสารที่เกี่ยวข้อง
- [Installation Guide](./INSTALLATION.md) - การติดตั้งและตั้งค่า
- [User Guide](./USER_GUIDE.md) - วิธีใช้งานผู้ใช้
- [API Documentation](./API.md) - เอกสาร API
- [Development Guide](./DEVELOPMENT.md) - คู่มือนักพัฒนา

### 2. Community Support

#### GitHub Resources
- **Issues:** [Report Problems](https://github.com/yourusername/leka-bot/issues)
- **Discussions:** [Ask Questions](https://github.com/yourusername/leka-bot/discussions)
- **Wiki:** [Additional Documentation](https://github.com/yourusername/leka-bot/wiki)

#### Contact Information
- **Email:** support@example.com
- **LINE:** @support-bot
- **Discord:** [Join Server](https://discord.gg/xxx)

### 3. Professional Support

#### Bug Reports
เมื่อรายงาน bug กรุณารวมข้อมูล:
- **Environment:** Development/Production
- **Version:** เวอร์ชันของเลขาบอท
- **Steps to Reproduce:** ขั้นตอนที่ทำให้เกิดปัญหา
- **Expected Behavior:** สิ่งที่คาดหวัง
- **Actual Behavior:** สิ่งที่เกิดขึ้นจริง
- **Error Logs:** Log หรือ error message
- **Screenshots:** ภาพหน้าจอ (ถ้ามี)

#### Feature Requests
สำหรับขอฟีเจอร์ใหม่:
- **Use Case:** กรณีการใช้งาน
- **Business Value:** ประโยชน์ที่จะได้รับ
- **Priority:** ระดับความสำคัญ
- **Mockups:** แบบจำลอง UI (ถ้ามี)

---

**Troubleshooting Version:** 1.0.0  
**Last Updated:** January 2024

**หากยังไม่สามารถแก้ไขปัญหาได้ โปรดติดต่อทีมสนับสนุน! 🆘**