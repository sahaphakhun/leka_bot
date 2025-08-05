# 🎛️ Optional Features Configuration

เลขาบอทได้รับการปรับปรุงให้สามารถทำงานได้แม้ไม่มี credentials บางตัว โดยจะข้ามฟีเจอร์ที่เกี่ยวข้องแทน

---

## 🚨 **Required Variables (2 ตัว)**

```bash
LINE_CHANNEL_ACCESS_TOKEN=your_messaging_api_token
LINE_CHANNEL_SECRET=your_messaging_api_secret
```

**หมายเหตุ:** หากไม่มีทั้ง 2 ตัวนี้ ระบบจะไม่สามารถทำงานได้

---

## ⚙️ **Optional Features**

### 🗓️ **Google Calendar Integration**

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**หากมี:** ✅
- งานจะ sync ไป Google Calendar อัตโนมัติ
- สร้าง event เมื่อเพิ่มงานใหม่
- อัปเดต event เมื่อแก้ไขงาน
- ลบ event เมื่อลบงาน
- เชิญผู้รับผิดชอบผ่าน Google Calendar

**หากไม่มี:** ⚠️
- ระบบยังทำงานได้ปกติ
- งานจะเก็บใน database เท่านั้น
- ไม่มี Google Calendar sync
- ไม่สามารถส่งเชิญผ่าน Google ได้

---

### 📧 **Email Notifications**

**Environment Variables:**
```bash
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_gmail_app_password
```

**หากมี:** ✅
- ส่งอีเมลแจ้งเตือนงานใกล้ครบกำหนด
- ส่งสรุปงานประจำสัปดาห์
- แจ้งเตือนงานเกินกำหนด
- ส่งรายละเอียดงานให้ผู้รับผิดชอบ

**หากไม่มี:** ⚠️
- ระบบยังทำงานได้ปกติ
- แจ้งเตือนผ่าน LINE กลุ่มเท่านั้น
- ไม่มีการส่งอีเมล
- ไม่มีสรุปงานทางอีเมล

---

## 🔧 **ตัวอย่างการตั้งค่า**

### **แบบเต็มรูปแบบ (Full Features)**
```bash
# Required
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret

# Optional - Google Calendar
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234567890

# Optional - Email
SMTP_USER=your-bot@gmail.com
SMTP_PASS=abcd efgh ijkl mnop

# Other
NODE_ENV=production
BASE_URL=https://your-app.railway.app
```

### **แบบ Basic (LINE Only)**
```bash
# Required เท่านั้น
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret

# Other
NODE_ENV=production
BASE_URL=https://your-app.railway.app
```

### **แบบ Partial (เลือกบางฟีเจอร์)**
```bash
# Required
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret

# เฉพาะ Google Calendar (ไม่มี Email)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234567890

# Other
NODE_ENV=production
BASE_URL=https://your-app.railway.app
```

---

## 🚀 **Startup Messages**

### **เมื่อเริ่มระบบ จะแสดงสถานะ:**

**แบบเต็มรูปแบบ:**
```
✅ Configuration validated successfully
✅ Database connected
✅ Google Calendar integration enabled
✅ Email notifications enabled
🚀 เลขาบอท Started Successfully!
📊 Dashboard available at: https://your-app.railway.app/dashboard
```

**แบบ Basic:**
```
⚠️  Optional features disabled due to missing variables: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SMTP_USER', 'SMTP_PASS']
ℹ️  The bot will work but some features will be unavailable:
   - Google Calendar integration disabled
   - Email notifications disabled
✅ Configuration validated successfully
✅ Database connected
🚀 เลขาบอท Started Successfully!
📊 Dashboard available at: https://your-app.railway.app/dashboard
```

**แบบ Partial:**
```
⚠️  Optional features disabled due to missing variables: ['SMTP_USER', 'SMTP_PASS']
ℹ️  The bot will work but some features will be unavailable:
   - Email notifications disabled
✅ Configuration validated successfully
✅ Database connected
✅ Google Calendar integration enabled
🚀 เลขาบอท Started Successfully!
📊 Dashboard available at: https://your-app.railway.app/dashboard
```

---

## 🎯 **การทำงานของแต่ละโหมด**

### **เมื่อเพิ่มงานใหม่:**

| Feature | Full | Basic | Partial |
|---------|------|-------|---------|
| เก็บใน Database | ✅ | ✅ | ✅ |
| แจ้งใน LINE กลุ่ม | ✅ | ✅ | ✅ |
| Sync Google Calendar | ✅ | ❌ | ✅ |
| ส่งอีเมลแจ้งเตือน | ✅ | ❌ | ❌ |

### **เมื่อใกล้ครบกำหนด:**

| Feature | Full | Basic | Partial |
|---------|------|-------|---------|
| แจ้งใน LINE กลุ่ม | ✅ | ✅ | ✅ |
| ส่งอีเมลเตือน | ✅ | ❌ | ❌ |
| Google Calendar notification | ✅ | ❌ | ✅ |

### **Dashboard:**

| Feature | Full | Basic | Partial |
|---------|------|-------|---------|
| ดูรายการงาน | ✅ | ✅ | ✅ |
| ปฏิทินงาน | ✅ | ✅ | ✅ |
| สถิติและ KPI | ✅ | ✅ | ✅ |
| จัดการไฟล์ | ✅ | ✅ | ✅ |
| ลิงก์ Google Calendar | ✅ | ❌ | ✅ |
| ตั้งค่าอีเมล | ✅ | ❌ | ❌ |

---

## 💡 **คำแนะนำ**

### **สำหรับการใช้งานเบื้องต้น:**
- ใช้แค่ LINE credentials ก็เพียงพอแล้ว
- ระบบจะทำงานได้ครบทุกฟีเจอร์หลัก
- เพิ่ม Google/Email ทีหลังได้

### **สำหรับองค์กร:**
- แนะนำให้มี Google Calendar integration
- ช่วยในการจัดการปฏิทินรวม
- สะดวกสำหรับการประชุม

### **สำหรับทีมใหญ่:**
- แนะนำให้มี Email notifications
- ช่วยให้ไม่พลาดงานสำคัญ
- สรุปงานประจำสัปดาห์

---

## 🔄 **การเพิ่มฟีเจอร์ทีหลัง**

**หากต้องการเพิ่ม Google Calendar:**
1. เพิ่ม `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
2. Restart application
3. ระบบจะ detect และเปิดใช้งานอัตโนมัติ

**หากต้องการเพิ่ม Email:**
1. เพิ่ม `SMTP_USER` และ `SMTP_PASS`
2. Restart application  
3. ระบบจะ detect และเปิดใช้งานอัตโนมัติ

**ไม่ต้องแก้ไขโค้ด หรือตั้งค่าใดๆ เพิ่มเติม!** 🎉

---

## 🛠️ **Troubleshooting**

### **ระบบไม่ sync Google Calendar:**
```bash
# ตรวจสอบ environment variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# ตรวจสอบ startup logs
# ต้องเห็น "Google Calendar integration enabled"
```

### **ไม่ได้รับอีเมล:**
```bash
# ตรวจสอบ environment variables
echo $SMTP_USER
echo $SMTP_PASS  

# ตรวจสอบ startup logs
# ต้องเห็น "Email notifications enabled"

# ตรวจสอบ Gmail App Password
# ต้องเป็น 16 ตัวอักษร เช่น abcd efgh ijkl mnop
```

---

**สรุป:** เลขาบอทสามารถปรับตัวได้ตามฟีเจอร์ที่มี ทำให้การใช้งานยืดหยุ่นขึ้นมาก! 🚀