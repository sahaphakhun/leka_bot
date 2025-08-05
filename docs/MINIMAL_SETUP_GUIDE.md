# 🚀 การตั้งค่าแบบง่าย - เลขาบอท

สำหรับการใช้งานเบื้องต้น ต้องมีเพียง 2 ตัวแปรหลักเท่านั้น!

---

## 🎯 **Quick Start (2 Steps)**

### **Step 1: สร้าง LINE Bot**
1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง **Messaging API Channel** 
3. คัดลอก **Channel Access Token** และ **Channel Secret**

### **Step 2: Deploy ไป Railway**
```bash
# Environment Variables ที่จำเป็น (เพียง 2 ตัว!)
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# Optional (ไม่จำเป็นสำหรับการทำงานพื้นฐาน)
NODE_ENV=production
BASE_URL=https://your-app.railway.app
```

**เท่านี้เลขาบอทก็ใช้งานได้แล้ว!** 🎉

---

## ✅ **ฟีเจอร์ที่ทำงานได้ทันที**

### **📝 การจัดการงาน**
- เพิ่มงานผ่าน LINE: `@เลขา /task add "ชื่องาน" @คน1 @คน2 due 31/12 14:00`
- ดูรายการงาน: `@เลขา /task list`
- งานของฉัน: `@เลขา /task mine`
- เสร็จงาน: `@เลขา /task done 1`

### **📊 Dashboard**
- พิมพ์: `@เลขา /setup`
- เปิดลิงก์ที่บอทส่งมา
- ดูปฏิทิน, รายการงาน, สถิติ KPI

### **📁 File Vault**
- อัปโหลดไฟล์ในกลุ่ม → บอทจะเก็บอัตโนมัติ
- ดูไฟล์ใน Dashboard
- `@เลขา /files list` ดูรายการไฟล์

### **🏆 KPI & Leaderboard**
- จัดอันดับการทำงาน
- คะแนนตามความรวดเร็ว
- สรุปใน Dashboard

### **⏰ การแจ้งเตือน**
- แจ้งเตือนในกลุ่ม LINE
- Mention ผู้รับผิดชอบ
- ปุ่ม "เลื่อน/เสร็จแล้ว"

---

## 🔧 **การเพิ่มฟีเจอร์ (Optional)**

เมื่อต้องการฟีเจอร์เพิ่มเติม เพียงเพิ่ม Environment Variables:

### **📧 Email Notifications**
```bash
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_gmail_app_password
```
**ได้อะไรเพิ่ม:**
- แจ้งเตือนทางอีเมล
- สรุปงานประจำสัปดาห์
- รายละเอียดงานส่งตรงเมล

### **🗓️ Google Calendar Integration**
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```
**ได้อะไรเพิ่ม:**
- งานจะขึ้น Google Calendar อัตโนมัติ
- เชิญผู้รับผิดชอบผ่าน Google
- Sync 2 ทาง (แก้ใน Dashboard = อัปเดตใน Google)

---

## 📱 **การใช้งานจริง**

### **1. เพิ่มบอทเข้ากลุ่ม LINE**
```
1. เชิญ @เลขาบอท เข้ากลุ่ม
2. พิมพ์ @เลขา /setup
3. เปิดลิงก์ Dashboard
4. เริ่มใช้งาน!
```

### **2. คำสั่งพื้นฐาน**
```bash
# เพิ่มงาน
@เลขา /task add "ประชุมลูกค้า" @โอม @แนท due 25/12 10:00

# ดูงาน
@เลขา /task list today

# เสร็จงาน
@เลขา /task done ประชุมลูกค้า

# ดูไฟล์
@เลขา /files list

# Dashboard
@เลขา /setup
```

### **3. Dashboard Features**
- 📅 **Calendar View**: ดูงานในรูปแบบปฏิทิน
- 📋 **Task List**: รายการงานพร้อมฟิลเตอร์
- 📁 **File Vault**: ไฟล์ทั้งหมดในกลุ่ม
- 🏆 **Leaderboard**: อันดับคะแนนสมาชิก
- ⚙️ **Settings**: ตั้งค่ากลุ่ม

---

## 🔍 **Troubleshooting**

### **❌ บอทไม่ตอบ**
```bash
# ตรวจสอบ
1. Webhook URL ตั้งค่าแล้วหรือยัง?
   → https://your-app.railway.app/webhook
2. Environment Variables ครบหรือยัง?
3. App ทำงานอยู่หรือยัง?
```

### **❌ Dashboard ไม่เปิด**
```bash
# ตรวจสอบ
1. BASE_URL ตั้งค่าถูกต้องหรือยัง?
2. ลองเปิด https://your-app.railway.app/health
3. ดู Railway logs
```

### **❌ งานไม่บันทึกใน Database**
```bash
# สาเหตุ
1. DATABASE_URL ไม่ได้ตั้งค่า (Railway ตั้งอัตโนมัติ)
2. การเชื่อมต่อ Database ขัดข้อง
3. ดู logs เพื่อหาสาเหตุ
```

---

## 🎉 **สรุป**

### **ใช้งานได้ทันทีด้วย:**
- ✅ LINE_CHANNEL_ACCESS_TOKEN
- ✅ LINE_CHANNEL_SECRET

### **ฟีเจอร์ที่ได้:**
- ✅ จัดการงานผ่าน LINE และ Dashboard
- ✅ File Vault สำหรับไฟล์กลุ่ม
- ✅ KPI และ Leaderboard
- ✅ การแจ้งเตือนใน LINE
- ✅ Dashboard แบบ Responsive

### **เพิ่มฟีเจอร์ได้ตลอดเวลา:**
- 📧 Email (เพิ่ม SMTP credentials)
- 🗓️ Google Calendar (เพิ่ม Google credentials)

**เลขาบอทถูกออกแบบมาให้เริ่มต้นง่าย แต่ขยายได้ตามต้องการ!** 🚀

---

## 📞 **Support**

หากมีปัญหาหรือคำถาม:
1. ตรวจสอบ Railway logs
2. ทดสอบ webhook ด้วย ngrok (ถ้า dev locally)
3. ดู error messages ใน logs

**Happy Coding!** 💻✨