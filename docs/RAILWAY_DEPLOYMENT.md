# 🚄 Railway Deployment Guide

คู่มือการ deploy เลขาบอทใน Railway พร้อมแก้ปัญหา database

---

## 🚨 **ปัญหาที่เจอ: "relation tasks does not exist"**

### **สาเหตุ:**
- Database tables ยังไม่ถูกสร้างใน PostgreSQL
- TypeORM synchronization ไม่ทำงาน
- Railway database plugin ยังไม่ได้ตั้งค่า

### **✅ วิธีแก้ไข:**
เลขาบอทจะสร้าง database schema อัตโนมัติเมื่อ deploy!

---

## 🚀 **Steps to Deploy**

### **1. Setup Railway Project**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway new
cd your-project
railway link
```

### **2. Add PostgreSQL Database**
```
1. ไปที่ Railway dashboard
2. คลิก project ของคุณ
3. คลิก "Add Plugin"
4. เลือก "PostgreSQL"
5. Plugin จะสร้าง DATABASE_URL อัตโนมัติ
```

### **3. Set Environment Variables**
```bash
# Required (2 variables)
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret

# Optional (for full features)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_gmail_app_password

# Production settings
NODE_ENV=production
ENABLE_DEBUG_LOGS=true

# Railway จะสร้างอัตโนมัติ:
# DATABASE_URL=postgresql://postgres:password@host:port/db
```

### **4. Deploy Code**
```bash
# Push code to Railway
railway up

# หรือ connect กับ GitHub
# Railway จะ auto-deploy เมื่อ push
```

### **5. Set LINE Webhook URL**
```
1. ไปที่ LINE Developers Console
2. เลือก Messaging API channel
3. ตั้งค่า Webhook URL:
   https://your-app.railway.app/webhook
4. คลิก "Update" และ "Verify"
```

---

## 📊 **ตรวจสอบการ Deploy**

### **1. Health Check**
```bash
curl https://your-app.railway.app/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "service": "เลขาบอท",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "used": 85,
    "total": 128
  }
}
```

### **2. Check Logs**
```bash
# ใน Railway dashboard:
# Project → Deployments → Latest → View Logs

# หรือใช้ CLI:
railway logs --follow

# คาดหวัง logs:
# ✅ [STARTUP] Database connected successfully
# ✅ [DATABASE] Schema synchronized successfully
# 🎉 ===== เลขาบอท Started Successfully! =====
```

### **3. Test Bot**
```
1. เชิญบอทเข้ากลุ่ม LINE
2. พิมพ์: @เลขา /help
3. บอทควรตอบกลับพร้อมรายการคำสั่ง
```

---

## 🔧 **Database Auto-Setup**

เลขาบอทจะสร้าง database tables อัตโนมัติเมื่อเริ่มทำงาน:

### **Startup Sequence:**
```
🔄 [STARTUP] Initializing database...
📊 [DATABASE] Connection config: {...}
✅ [STARTUP] Database connected successfully
📋 [DATABASE] Available tables: []
⚠️ [DATABASE] No tables found, running synchronization...
✅ [DATABASE] Schema synchronized successfully
📋 [DATABASE] Available tables: [users, groups, tasks, files, kpi_records, task_assignees]
🎉 ===== เลขาบอท Started Successfully! =====
```

### **Tables Created:**
- ✅ **users** - ข้อมูลผู้ใช้
- ✅ **groups** - กลุ่ม LINE
- ✅ **tasks** - งานทั้งหมด
- ✅ **task_assignees** - ผู้รับผิดชอบงาน
- ✅ **files** - ไฟล์ที่อัปโหลด
- ✅ **kpi_records** - คะแนนและสถิติ

---

## 🚨 **Troubleshooting**

### **❌ "relation does not exist" ยังไม่หาย**

**วิธีแก้:**
```bash
# 1. Restart app ใน Railway dashboard
# 2. ดู logs เพื่อตรวจสอบ database sync

# หาก sync ล้มเหลว:
# 3. Delete PostgreSQL plugin
# 4. Add PostgreSQL plugin ใหม่
# 5. Redeploy application
```

### **❌ Database Connection Failed**

**ตรวจสอบ:**
```bash
# ใน Railway logs:
grep "DATABASE\|database" logs

# คาดหวัง:
# ✅ [STARTUP] Database connected successfully

# หากเจอ error:
# ❌ connection refused
# ❌ authentication failed
```

**วิธีแก้:**
- ตรวจสอบ PostgreSQL plugin มีอยู่หรือไม่
- ตรวจสอบ DATABASE_URL ถูกตั้งค่าหรือไม่
- Restart PostgreSQL plugin

### **❌ Bot ไม่ตอบข้อความ**

**Debug steps:**
```bash
# 1. ตรวจสอบ webhook
curl -X POST https://your-app.railway.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# 2. ดู debug logs
railway logs | grep "WEBHOOK\|EVENT"

# 3. ตรวจสอบ LINE credentials
# - Channel Access Token ถูกต้อง?
# - Webhook URL verified?
# - Bot อยู่ในกลุ่มหรือยัง?
```

### **❌ Out of Memory**

**เพิ่ม memory ใน Railway:**
```
1. Project Settings
2. Variables
3. เพิ่ม: RAILWAY_HEALTHCHECK_TIMEOUT_SEC=300
4. Redeploy
```

---

## 📈 **Production Optimizations**

### **1. Environment Variables**
```bash
# Performance
NODE_ENV=production
RAILWAY_HEALTHCHECK_TIMEOUT_SEC=300

# Debug (เปิดเมื่อมีปัญหา)
ENABLE_DEBUG_LOGS=false

# Database
DATABASE_URL=postgresql://... (auto-generated)
```

### **2. Railway Configuration**
```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **3. Monitoring**
```bash
# Health checks
curl https://your-app.railway.app/health

# Memory usage
railway logs | grep "Memory:"

# Response times
railway logs | grep "Duration:"
```

---

## 🔄 **Updates and Maintenance**

### **Code Updates**
```bash
# If using GitHub integration:
git push origin main  # Auto-deploy

# If using Railway CLI:
railway up
```

### **Database Migrations**
```bash
# เลขาบอทจะ auto-sync schema
# ไม่ต้องทำ manual migration

# หากต้องการ reset database:
# 1. Delete PostgreSQL plugin
# 2. Add PostgreSQL plugin ใหม่
# 3. Redeploy (จะสร้าง schema ใหม่)
```

### **Environment Variable Updates**
```bash
# ใน Railway dashboard:
# Project → Variables → Add/Edit

# หรือใช้ CLI:
railway variables set KEY=value
```

---

## 🎯 **Best Practices**

### **✅ DO**
- เปิด debug logs เมื่อ deploy ครั้งแรก
- Monitor Railway logs ใน 24 ชั่วโมงแรก
- Test bot functionality หลัง deploy
- Backup environment variables
- Use Railway PostgreSQL plugin (ไม่ใช้ external DB)

### **❌ DON'T**
- ตั้งค่า database credentials แยก (ใช้ DATABASE_URL)
- ลืม verify LINE webhook URL
- Deploy โดยไม่ test locally ก่อน
- เปิด debug logs ใน production เสมอ
- ลืม monitor memory/CPU usage

---

## 🆘 **Emergency Procedures**

### **App Crash Recovery**
```bash
# 1. ดู error logs
railway logs | tail -100

# 2. Restart app
railway service restart

# 3. หากยังไม่ได้ redeploy
railway up --detach
```

### **Database Recovery**
```bash
# 1. Full database reset:
# - Delete PostgreSQL plugin
# - Add PostgreSQL plugin ใหม่
# - Redeploy app

# 2. Partial recovery:
railway logs | grep "DATABASE\|ERROR"
# วิเคราะห์ error และแก้ตาม
```

### **Contact Support**
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- GitHub Issues: Create issue with logs

---

## ✅ **Deployment Checklist**

### **Pre-deployment:**
- [ ] LINE Bot channel created and configured
- [ ] Environment variables prepared
- [ ] Code tested locally
- [ ] Railway account ready

### **During deployment:**
- [ ] PostgreSQL plugin added
- [ ] Environment variables set
- [ ] Code deployed successfully
- [ ] Health check passes

### **Post-deployment:**
- [ ] LINE webhook URL verified
- [ ] Bot responds to test messages
- [ ] Database tables created
- [ ] Debug logs reviewed
- [ ] Production monitoring enabled

**🎉 Ready to deploy เลขาบอท to Railway!**