# 🤖 Auto-Migration System for Railway

## 🎯 **Overview**

ระบบ Auto-Migration ที่จะรันอัตโนมัติเมื่อ server เริ่มใน Railway เพื่อแก้ปัญหา database schema ที่ไม่ตรงกับ entity models โดยไม่ต้องรันคำสั่ง migration เอง

## 🚀 **How It Works**

### **1. Automatic Detection**
- ตรวจสอบคอลัมน์ที่หายไปในตาราง `tasks` เมื่อ server เริ่ม
- เปรียบเทียบกับคอลัมน์ที่จำเป็นตาม entity models
- รัน migration อัตโนมัติถ้าจำเป็น

### **2. Safe Migration**
- เพิ่มเฉพาะคอลัมน์ที่หายไป
- ไม่ลบหรือแก้ไขข้อมูลที่มีอยู่
- ใช้ default values ที่ปลอดภัย
- ไม่มี downtime

### **3. Railway Integration**
- รันอัตโนมัติเมื่อ deploy ใหม่
- ไม่ต้องเข้า terminal หรือรันคำสั่งเอง
- Logs จะแสดงใน Railway logs

## 🔧 **Files Created**

### **`src/utils/autoMigration.ts`**
- ระบบ Auto-Migration หลัก
- ตรวจสอบและเพิ่มคอลัมน์ที่หายไป
- จัดการ workflow data initialization

### **`src/index.ts` (Updated)**
- เพิ่ม auto-migration เมื่อ server เริ่ม
- Health check endpoints สำหรับ migration status

## 📋 **Columns Being Added**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `submittedAt` | TIMESTAMP | YES | NULL | เวลาส่งงาน |
| `reviewedAt` | TIMESTAMP | YES | NULL | เวลาตรวจสอบ |
| `approvedAt` | TIMESTAMP | YES | NULL | เวลาอนุมัติ |
| `requireAttachment` | BOOLEAN | NO | false | บังคับให้ต้องมีไฟล์แนบ |
| `workflow` | JSONB | NO | {} | ข้อมูลเวิร์กโฟลว์ |

## 🚀 **Deployment Process**

### **1. Deploy to Railway**
```bash
git add .
git commit -m "Add auto-migration system"
git push
```

### **2. Railway Auto-Deploy**
- Railway จะ build และ deploy โค้ดใหม่
- Server จะเริ่มและรัน auto-migration อัตโนมัติ
- ตรวจสอบ logs ใน Railway dashboard

### **3. Monitor Migration**
ดู logs ใน Railway:
```
🚀 เริ่มต้น Auto-Migration...
📋 พบคอลัมน์ในตาราง tasks: X คอลัมน์
✅ เพิ่มคอลัมน์ submittedAt สำเร็จ
✅ เพิ่มคอลัมน์ reviewedAt สำเร็จ
✅ เพิ่มคอลัมน์ approvedAt สำเร็จ
✅ เพิ่มคอลัมน์ requireAttachment สำเร็จ
✅ เพิ่มคอลัมน์ workflow สำเร็จ
🎉 เพิ่มคอลัมน์แล้ว 5 คอลัมน์
✅ Auto-Migration เสร็จสิ้น
```

## 🔍 **Monitoring & Debugging**

### **Health Check Endpoints**

#### **`/health`**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

#### **`/migration-status`**
```json
{
  "status": "OK",
  "needsMigration": false,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "message": "Database schema is up to date"
}
```

### **Railway Logs**
- ดู logs ใน Railway dashboard
- ค้นหา "Auto-Migration" เพื่อติดตามสถานะ
- ตรวจสอบ error messages ถ้ามีปัญหา

## 🧪 **Testing the Fix**

### **1. Check Migration Status**
```bash
curl https://your-railway-app.up.railway.app/migration-status
```

### **2. Test Dashboard**
- เปิด dashboard URL
- ตรวจสอบว่าไม่มี error เกี่ยวกับ missing columns
- ทดสอบการโหลด tasks และสร้างงานใหม่

### **3. Monitor API Calls**
- ตรวจสอบ console logs
- ไม่มี "column task.submittedAt does not exist" error
- API calls ทำงานปกติ

## 🔄 **Migration Flow**

```
Server Start
     ↓
Database Connected
     ↓
Check Migration Needed
     ↓
If Needed: Run Auto-Migration
     ↓
Add Missing Columns
     ↓
Initialize Workflow Data
     ↓
Migration Complete
     ↓
Continue Server Startup
```

## ⚠️ **Safety Features**

### **1. Non-Blocking**
- Migration ล้มเหลวไม่ทำให้ server หยุดทำงาน
- Server จะทำงานต่อแม้ migration จะมีปัญหา

### **2. Idempotent**
- รันหลายครั้งได้โดยไม่มีผลข้างเคียง
- ตรวจสอบคอลัมน์ที่มีอยู่ก่อนเพิ่ม

### **3. Transaction Safe**
- ใช้ queryRunner สำหรับ database operations
- ไม่มี global transactions ที่อาจทำให้ server hang

### **4. Error Handling**
- จัดการ error แยกสำหรับแต่ละคอลัมน์
- Log errors แต่ยังคงดำเนินการต่อ

## 🚨 **Troubleshooting**

### **Migration Fails**
1. **Check Railway Logs**: ดู error messages ใน logs
2. **Check Database Connection**: ตรวจสอบว่า database เชื่อมต่อได้
3. **Check Permissions**: ตรวจสอบ database user permissions
4. **Manual Fix**: ถ้าจำเป็น สามารถรัน SQL manual ได้

### **Still Getting Column Errors**
1. **Restart Server**: บางครั้งต้อง restart เพื่อให้ TypeORM รู้จักคอลัมน์ใหม่
2. **Check Migration Status**: ใช้ `/migration-status` endpoint
3. **Verify Columns**: ตรวจสอบว่าคอลัมน์ถูกเพิ่มจริงใน database

### **Performance Issues**
1. **Migration Time**: การเพิ่มคอลัมน์ใช้เวลาประมาณ 1-5 วินาที
2. **Large Tables**: ถ้ามีงานเยอะ workflow initialization อาจใช้เวลานาน
3. **Monitor Logs**: ดู progress ใน logs

## 📊 **Expected Results**

### **Before Auto-Migration:**
- ❌ 500 Server Error: `column task.submittedAt does not exist`
- ❌ Dashboard fails to load
- ❌ Task API calls fail
- ❌ Poor user experience

### **After Auto-Migration:**
- ✅ Dashboard loads successfully
- ✅ All task API calls work
- ✅ No more column errors
- ✅ Full workflow support
- ✅ Better user experience

## 🔮 **Future Enhancements**

### **1. Migration Versioning**
- เก็บ migration history
- Support rollback migrations
- Version-based migration checks

### **2. Advanced Schema Validation**
- ตรวจสอบ data types
- ตรวจสอบ constraints
- ตรวจสอบ indexes

### **3. Performance Monitoring**
- Migration execution time
- Database performance impact
- Resource usage tracking

## 📝 **Notes**

- **Zero Downtime**: Migration ไม่ทำให้ service หยุดทำงาน
- **Automatic**: ไม่ต้องรันคำสั่งใดๆ เอง
- **Safe**: ไม่มี data loss หรือ breaking changes
- **Railway Optimized**: ออกแบบมาให้ทำงานดีใน Railway environment

---

**Status**: ✅ Ready for Railway Deployment  
**Auto-Run**: ✅ Yes (on server start)  
**Safety Level**: 🟢 High (non-blocking, safe)  
**Railway Compatible**: ✅ Yes
