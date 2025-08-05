# 🔑 วิธีการหา Environment Variables ทั้งหมด

## 📱 **LINE Configuration**

### 1. LINE_CHANNEL_ACCESS_TOKEN & LINE_CHANNEL_SECRET

**ใช้สำหรับ:** การส่งข้อความ, รับ webhook, ดาวน์โหลดไฟล์จาก LINE

**วิธีการหา:**
1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เข้าสู่ระบบด้วย LINE Account
3. สร้าง **Provider** ใหม่ (หรือใช้ที่มีอยู่)
4. สร้าง **Channel** ประเภท **Messaging API**

**Channel Settings:**
- **Channel Name**: เลขาบอท (หรือชื่อที่ต้องการ)
- **Channel Description**: เลขาบอทสำหรับจัดการงานกลุ่ม LINE
- **Category**: Productivity
- **Subcategory**: Task Management

**หา Credentials:**
- **LINE_CHANNEL_SECRET**: Basic Settings → Channel secret
- **LINE_CHANNEL_ACCESS_TOKEN**: Messaging API → Channel access token (long-lived)

**ตัวอย่าง:**
```bash
LINE_CHANNEL_ACCESS_TOKEN=abcd1234567890+ABCD1234567890abcd1234567890
LINE_CHANNEL_SECRET=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
```

---

### 2. LINE_LIFF_ID

**ใช้สำหรับ:** เปิดหน้าเว็บภายใน LINE App (Dashboard, Setup, Profile)

**วิธีการหา:**
1. ใน LINE Developers Console → เลือก Channel
2. ไปที่ **LIFF** tab
3. คลิก **Add** เพื่อสร้าง LIFF App ใหม่

**LIFF Settings:**
- **LIFF app name**: เลขาบอท Dashboard
- **Size**: Compact หรือ Tall
- **Endpoint URL**: `https://your-app.railway.app/dashboard/liff/setup`
- **Scope**: `profile`, `openid` (ถ้าต้องการ)

**หลังสร้างแล้ว:**
- คัดลอก **LIFF ID** มาใส่ใน environment variable

**ตัวอย่าง:**
```bash
LINE_LIFF_ID=1234567890-AbCdEfGh
```

---

## 🌐 **Google Services Configuration**

### 3. GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET

**ใช้สำหรับ:** 
- Google Calendar integration (สร้าง/อัปเดต events)
- Google OAuth authentication
- สร้าง Calendar ของกลุ่ม

**วิธีการหา:**
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง **Project** ใหม่ หรือเลือกที่มีอยู่

**Project Setup:**
- **Project Name**: เลขาบอท
- **Project ID**: leka-bot-xxxxx (จะสร้างให้อัตโนมัติ)

**Enable APIs:**
1. ไปที่ **APIs & Services** → **Library**
2. เปิดใช้งาน:
   - **Google Calendar API**
   - **Gmail API** (ถ้าต้องการส่งอีเมล)
   - **Google Drive API** (ถ้าต้องการเชื่อมไฟล์)

**สร้าง OAuth Credentials:**
1. ไปที่ **APIs & Services** → **Credentials**
2. คลิก **Create Credentials** → **OAuth 2.0 Client ID**

**OAuth Settings:**
- **Application type**: Web application
- **Name**: เลขาบอท OAuth Client
- **Authorized JavaScript origins**: 
  - `http://localhost:3000` (สำหรับ development)
  - `https://your-app.railway.app` (สำหรับ production)
- **Authorized redirect URIs**:
  - `http://localhost:3000/auth/google/callback`
  - `https://your-app.railway.app/auth/google/callback`

**หลังสร้างแล้ว:**
- คัดลอก **Client ID** และ **Client Secret**

**ตัวอย่าง:**
```bash
GOOGLE_CLIENT_ID=123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://your-app.railway.app/auth/google/callback
```

---

## 📧 **Email Configuration**

### 4. SMTP_USER & SMTP_PASS

**ใช้สำหรับ:** 
- ส่งอีเมลแจ้งเตือนงาน
- ส่งเชิญเข้า Google Calendar
- ส่งรายงานประจำสัปดาห์
- ส่งสรุป KPI

**สำหรับ Gmail (แนะนำ):**

**เตรียม Gmail Account:**
1. มี Gmail account ที่ต้องการใช้ส่งอีเมล
2. **เปิด 2-Factor Authentication** (จำเป็น!)

**สร้าง App Password:**
1. ไปที่ [Google Account Security](https://myaccount.google.com/security)
2. เปิด **2-Step Verification** (ถ้ายังไม่ได้เปิด)
3. ไปที่ **App passwords**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. เลือก **Select app** → **Other (Custom name)**
5. ใส่ชื่อ: "เลขาบอท"
6. คลิก **Generate**
7. **คัดลอก App Password** (จะเป็นรหัส 16 หลัก เช่น `abcd efgh ijkl mnop`)

**ตัวอย่าง:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-bot-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

**⚠️ สำคัญ:** ใช้ **App Password** ไม่ใช่รหัสผ่าน Gmail ปกติ!

---

## 🔐 **Optional Credentials**

### Google Service Account (Advanced)

**ใช้สำหรับ:** การจัดการ Google Calendar แบบ server-to-server

**วิธีการสร้าง:**
1. ใน Google Cloud Console → **IAM & Admin** → **Service Accounts**
2. คลิก **Create Service Account**
3. **Service account name**: เลขาบอท Service Account
4. **Description**: สำหรับ Calendar API access
5. **Role**: Editor หรือ Calendar Admin
6. สร้าง **JSON Key** → ดาวน์โหลดไฟล์

**ตัวอย่าง:**
```bash
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"leka-bot-xxxxx","private_key_id":"..."}
```

---

## 🚀 **Railway Deployment**

**ตั้งค่า Environment Variables ใน Railway:**

1. เข้า [Railway Dashboard](https://railway.app/)
2. เลือก Project
3. ไปที่ **Variables** tab
4. เพิ่มตัวแปรทีละตัว:

```bash
# จำเป็น
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
LINE_LIFF_ID=your_liff_id_here
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password_here

# Production Settings
NODE_ENV=production
BASE_URL=https://your-app.railway.app
```

---

## ✅ **ตรวจสอบการตั้งค่า**

**Test การตั้งค่า:**
```bash
npm run build
npm start
```

**ถ้าสำเร็จจะเห็น:**
```
✅ Configuration validated successfully
✅ Database connected
✅ LINE service initialized
🚀 เลขาบอท Started Successfully!
```

**ถ้าผิดพลาดจะเห็น:**
```
❌ Missing required environment variables:
  - LINE_CHANNEL_ACCESS_TOKEN
  - GOOGLE_CLIENT_ID
```

---

## 🆘 **Troubleshooting**

### LINE Bot ไม่ตอบ
- ตรวจสอบ `LINE_CHANNEL_ACCESS_TOKEN`
- ตรวจสอบ Webhook URL ใน LINE Console

### Google Calendar ไม่ sync
- ตรวจสอบ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
- ตรวจสอบ OAuth Redirect URI

### Email ไม่ส่ง
- ตรวจสอบใช้ **App Password** ไม่ใช่รหัสผ่าน Gmail
- ตรวจสอบ 2FA เปิดอยู่

### LIFF ไม่เปิด
- ตรวจสอบ `LINE_LIFF_ID`
- ตรวจสอบ Endpoint URL ใน LIFF Console

---

## 💡 **Tips**

1. **ใช้ Gmail account แยก** สำหรับบอท
2. **เก็บ credentials ปลอดภัย** ไม่ commit ลง Git
3. **ใช้ environment variables** สำหรับทุก sensitive data
4. **Test ทุกอย่างใน development** ก่อน deploy production
5. **Rotate credentials เป็นประจำ** เพื่อความปลอดภัย