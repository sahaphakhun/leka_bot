# 🔐 Environment Variables (Updated สำหรับ LINE Changes)

## ⚠️ **สำคัญ: LINE LIFF Policy Changes**

LINE ได้เปลี่ยนนโยบาย LIFF แล้ว:
- ✅ **ไม่สามารถเพิ่ม LIFF ไปยัง Messaging API Channel ได้แล้ว**
- ✅ **ต้องใช้ LINE Login Channel แทน**
- 🔄 **เลขาบอทปรับใช้ External Web Dashboard แทน**

---

## 📋 **Required Environment Variables (อัปเดต)**

### 🚨 **จำเป็นต้องมี (5 ตัว)**
```bash
LINE_CHANNEL_ACCESS_TOKEN=your_messaging_api_token
LINE_CHANNEL_SECRET=your_messaging_api_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_gmail_app_password
```

### ⚙️ **Optional Variables**
```bash
# LINE Login (สำหรับอนาคต)
LINE_LOGIN_CHANNEL_ID=your_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_login_channel_secret

# Server
PORT=3000
NODE_ENV=development
BASE_URL=https://lekabot-production.up.railway.app

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Security & App
JWT_SECRET=your-secret-key
DEFAULT_TIMEZONE=Asia/Bangkok
```

---

## 🔄 **การเปลี่ยนแปลง**

### **ก่อนหน้า (เก่า):**
```bash
# ❌ ไม่ใช้แล้ว
LINE_LIFF_ID=1234567890-AbCdEfGh
```

### **ปัจจุบัน (ใหม่):**
```bash
# ✅ ใช้แทน
# Dashboard จะเปิดในเบราว์เซอร์โดยตรง
# ไม่ต้องใช้ LIFF แล้ว
```

---

## 🎯 **แนวทางใหม่**

### **วิธีการใช้งาน:**
1. พิมพ์ `@เลขา /setup` ในกลุ่ม LINE
2. บอทจะส่งลิงก์ Dashboard 
3. เปิดลิงก์ในเบราว์เซอร์ (Chrome, Safari, etc.)
4. ใช้งาน Dashboard ได้เต็มรูปแบบ

### **ข้อดีของแนวทางใหม่:**
- ✅ **ไม่ซับซ้อน** - ไม่ต้องจัดการ LIFF
- ✅ **Flexible** - ควบคุม UI/UX ได้เต็มที่
- ✅ **Cross-platform** - ใช้ได้ทุก device
- ✅ **Future-proof** - ไม่กระทบจากการเปลี่ยนแปลง LINE

---

## 🚀 **Railway Deployment**

**Environment Variables ที่ต้องตั้งใน Railway:**

```bash
# Required (5 ตัว)
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password_here

# Production Settings
NODE_ENV=production
BASE_URL=https://your-app.railway.app
```

---

## ✅ **การตรวจสอบ**

**ทดสอบการตั้งค่า:**
```bash
npm run build
npm start
```

**ผลลัพธ์ที่คาดหวัง:**
```
✅ Configuration validated successfully
✅ Database connected
✅ LINE service initialized
🚀 เลขาบอท Started Successfully!
📊 Dashboard available at: http://localhost:3000/dashboard
```

**⚠️ ไม่มี error เรื่อง LINE_LIFF_ID แล้ว**

---

## 🔧 **วิธีการหา Credentials**

### **1. LINE Messaging API**
- [developers.line.biz](https://developers.line.biz/) → Messaging API Channel
- Channel Access Token & Channel Secret

### **2. Google Cloud Console**
- [console.cloud.google.com](https://console.cloud.google.com/) → Credentials
- OAuth 2.0 Client ID & Secret

### **3. Gmail App Password**
- [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- 2FA Required

---

## 🆘 **Troubleshooting**

### **บอทไม่ตอบ**
```bash
# ตรวจสอบ Messaging API credentials
curl -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
     https://api.line.me/v2/bot/info
```

### **Dashboard ไม่เปิด**
```bash
# ตรวจสอบ URL directly
curl https://your-app.railway.app/health
```

### **Google Calendar ไม่ sync**
- ตรวจสอบ Google Cloud Console → APIs enabled
- ตรวจสอบ OAuth redirect URIs

---

## 🎉 **สรุป**

**การเปลี่ยนแปลงนี้ทำให้:**
- ❌ **ไม่ต้องใช้ LINE_LIFF_ID แล้ว**
- ✅ **Dashboard ทำงานผ่านเว็บเบราว์เซอร์**
- ✅ **ใช้งานง่ายขึ้น ไม่ซับซ้อน**
- ✅ **ไม่กระทบจากการเปลี่ยนแปลงของ LINE ในอนาคต**

**เลขาบอทยังคงทำงานได้เต็มรูปแบบ!** 🚀