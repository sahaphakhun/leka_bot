# 🗄️ Database Setup Guide

คู่มือการตั้งค่า PostgreSQL database สำหรับเลขาบอท

---

## 🚨 **ปัญหาที่พบ: relation "tasks" does not exist**

Error นี้เกิดเมื่อ **database tables ยังไม่ได้ถูกสร้างขึ้น** ใน PostgreSQL

### **สาเหตุ:**
- TypeORM synchronization ยังไม่ทำงาน
- Database schema ยังไม่ได้ถูกสร้าง
- Migration ไม่ได้รัน

---

## ✅ **วิธีแก้ไข**

### **วิธีที่ 1: Automatic Schema Sync (แนะนำสำหรับ Railway)**

เลขาบอทจะสร้าง tables อัตโนมัติเมื่อเริ่มทำงาน:

```bash
# ไม่ต้องทำอะไรเพิ่ม - ระบบจะ auto sync
# ดู logs ใน Railway:
# ✅ [DATABASE] Schema synchronized successfully
```

### **วิธีที่ 2: Manual Database Initialization**

หากต้องการสร้าง database manually:

```bash
# Local development
npm run db:init

# Production (ใน Railway)
npm run db:sync
```

---

## 🏗️ **Database Schema**

### **Tables ที่จะถูกสร้าง:**

1. **`users`** - ข้อมูลผู้ใช้
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  lineUserId VARCHAR UNIQUE NOT NULL,
  displayName VARCHAR NOT NULL,
  realName VARCHAR,
  email VARCHAR,
  timezone VARCHAR DEFAULT 'Asia/Bangkok',
  isVerified BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

2. **`groups`** - ข้อมูลกลุ่ม LINE
```sql
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  lineGroupId VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  timezone VARCHAR DEFAULT 'Asia/Bangkok',
  settings JSONB DEFAULT '{}',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

3. **`tasks`** - งานทั้งหมด
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  groupId INTEGER REFERENCES groups(id),
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'pending',
  priority VARCHAR DEFAULT 'medium',
  tags TEXT[],
  startTime TIMESTAMP,
  dueTime TIMESTAMP NOT NULL,
  completedAt TIMESTAMP,
  createdBy VARCHAR NOT NULL,
  remindersSent JSONB DEFAULT '[]',
  customReminders TEXT[],
  googleEventId VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

4. **`task_assignees`** - ความสัมพันธ์งาน-ผู้รับผิดชอบ
```sql
CREATE TABLE task_assignees (
  taskId INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (taskId, userId)
);
```

5. **`files`** - ไฟล์ที่อัปโหลดในกลุ่ม
```sql
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  groupId INTEGER REFERENCES groups(id),
  taskId INTEGER REFERENCES tasks(id),
  originalName VARCHAR NOT NULL,
  fileName VARCHAR NOT NULL,
  filePath VARCHAR NOT NULL,
  fileSize INTEGER,
  mimeType VARCHAR,
  uploadedBy VARCHAR NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

6. **`kpi_records`** - บันทึก KPI และคะแนน
```sql
CREATE TABLE kpi_records (
  id SERIAL PRIMARY KEY,
  taskId INTEGER REFERENCES tasks(id),
  userId VARCHAR NOT NULL,
  groupId INTEGER REFERENCES groups(id),
  completionType VARCHAR NOT NULL,
  score INTEGER NOT NULL,
  completedAt TIMESTAMP NOT NULL,
  dueTime TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

---

## 🔍 **การตรวจสอบ Database**

### **1. ตรวจสอบ Tables**
```sql
-- เข้า PostgreSQL console
\dt

-- หรือ query
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### **2. ตรวจสอบ Data**
```sql
-- นับจำนวนข้อมูลในแต่ละ table
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 
  'groups' as table_name, COUNT(*) as count FROM groups
UNION ALL
SELECT 
  'tasks' as table_name, COUNT(*) as count FROM tasks;
```

### **3. ตรวจสอบผ่าน Health Check**
```bash
curl https://your-app.railway.app/health

# Response:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "database": "connected" // จะมีหาก database ทำงานปกติ
}
```

---

## 🛠️ **Troubleshooting**

### **❌ "relation does not exist"**
```bash
# วิธีแก้:
# 1. Restart application ใน Railway
# 2. ดู logs เพื่อตรวจสอบ sync process
# 3. หาก sync ไม่สำเร็จ ให้ทำ manual init:

npm run db:sync
```

### **❌ "connection refused"**
```bash
# ตรวจสอบ DATABASE_URL
echo $DATABASE_URL

# Format ที่ถูกต้อง:
postgresql://user:password@host:port/database
```

### **❌ "authentication failed"**
```bash
# ตรวจสอบ credentials ใน DATABASE_URL
# Railway จะตั้งค่า DATABASE_URL อัตโนมัติ
# ไม่ต้องตั้งค่า DB_HOST, DB_PASSWORD แยก
```

### **❌ Tables มีแต่ไม่มีข้อมูล**
```bash
# ปกติ - tables จะว่างในการเริ่มต้น
# ข้อมูลจะเพิ่มเมื่อมีการใช้งานจริง:
# - users: เมื่อมีคนใช้บอทครั้งแรก
# - groups: เมื่อเพิ่มบอทเข้ากลุ่ม
# - tasks: เมื่อสร้างงานใหม่
```

---

## 🚀 **Railway Database Setup**

### **1. เพิ่ม PostgreSQL Plugin**
```
1. ไปที่ Railway project dashboard
2. คลิก "Add Plugin"
3. เลือก "PostgreSQL"
4. Plugin จะสร้าง DATABASE_URL อัตโนมัติ
```

### **2. Environment Variables**
```bash
# Railway จะตั้งค่าอัตโนมัติ:
DATABASE_URL=postgresql://postgres:password@hostname:port/dbname

# ไม่ต้องตั้งค่าเหล่านี้:
# DB_HOST=...
# DB_PORT=...
# DB_USERNAME=...
# DB_PASSWORD=...
# DB_NAME=...
```

### **3. Deploy & Auto-Sync**
```bash
# เมื่อ deploy เสร็จ ดู logs:
# 🔄 [STARTUP] Initializing database...
# ✅ [STARTUP] Database connected successfully
# 📋 [DATABASE] Available tables: [...]
# ✅ [DATABASE] Schema synchronized successfully
```

---

## 📊 **Database Performance**

### **Connection Pool Settings**
```typescript
// ใน database.ts
extra: {
  connectionLimit: 10,  // จำกัดจำนวน connections
},
maxQueryExecutionTime: 30000, // timeout 30 วินาที
```

### **Query Optimization**
```sql
-- สร้าง indexes สำหรับ queries ที่ใช้บ่อย
CREATE INDEX idx_tasks_group_status ON tasks(groupId, status);
CREATE INDEX idx_tasks_due_time ON tasks(dueTime);
CREATE INDEX idx_kpi_records_user_group ON kpi_records(userId, groupId);
```

---

## 🎯 **Best Practices**

### **✅ DO**
- ใช้ DATABASE_URL ที่ Railway ให้มา
- ปล่อยให้ TypeORM sync schema อัตโนมัติ
- Monitor database logs ใน Railway
- Backup ข้อมูลสำคัญ

### **❌ DON'T**
- ตั้งค่า DB credentials แยกใน Railway (ใช้ DATABASE_URL)
- ลบ synchronize: true ใน production (จนกว่าจะมี proper migrations)
- Run SQL commands โดยตรงใน production database
- Ignore database error logs

---

## 🆘 **Emergency Recovery**

หากเกิดปัญหา database corruption:

### **1. Reset Database**
```bash
# ใน Railway dashboard:
# 1. Delete PostgreSQL plugin
# 2. Add PostgreSQL plugin ใหม่
# 3. Redeploy application
# 4. ระบบจะสร้าง schema ใหม่อัตโนมัติ
```

### **2. Manual Recovery**
```bash
# Connect to database
psql $DATABASE_URL

# Drop all tables (ระวัง!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Restart application เพื่อสร้าง schema ใหม่
```

**⚠️ หมายเหตุ: การ reset จะทำให้ข้อมูลเก่าหายหมด!**

---

## 📈 **Monitoring**

### **Database Health Check**
```bash
# ตรวจสอบ connection
curl https://your-app.railway.app/health

# ตรวจสอบ tables
curl https://your-app.railway.app/api/debug/tables
```

### **Railway Metrics**
- CPU usage
- Memory usage  
- Database connections
- Query performance

**Database setup เสร็จแล้ว! เลขาบอทพร้อมใช้งาน** 🎉