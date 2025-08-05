# 🔐 Environment Variables

## ภาพรวม Environment Variables ที่ใช้ในเลขาบอท

### 📋 **รายการ Environment Variables ทั้งหมด**

## ⚙️ **Server Configuration**

```bash
PORT=3000                    # พอร์ตที่เซิร์ฟเวอร์จะรัน (Railway จะกำหนดให้อัตโนมัติ)
NODE_ENV=development         # สภาพแวดล้อม (development/production)
BASE_URL=http://localhost:3000  # URL หลักของแอปพลิเคชัน
```

## 📱 **LINE Configuration (Required)**

```bash
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here  
LINE_LIFF_ID=your_line_liff_id_here
```

**วิธีการหา:**
1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Channel ของคุณ
3. **Channel Access Token**: ไปที่ Messaging API → Channel access token (long-lived)
4. **Channel Secret**: ไปที่ Basic Settings → Channel secret
5. **LIFF ID**: ไปที่ LIFF → สร้าง LIFF app ใหม่

## 🗄️ **Database Configuration**

```bash
# Railway PostgreSQL (แนะนำสำหรับ Production)
DATABASE_URL=postgresql://user:password@host:port/database

# หรือ Local PostgreSQL (Development)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_db_password
DB_NAME=leka_bot
```

## 🌐 **Google Services (Required)**

```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Service Account Key (Optional - สำหรับ Calendar API)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

**วิธีการหา:**
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่
3. เปิดใช้งาน Google Calendar API
4. ไปที่ APIs & Services → Credentials
5. สร้าง OAuth 2.0 Client ID
6. ตั้งค่า Authorized redirect URIs

## 📧 **Email Configuration (Required)**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**สำหรับ Gmail:**
1. เปิด 2-Factor Authentication
2. สร้าง App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. ใช้ App Password แทน password ปกติ

## 📁 **File Storage (Optional)**

```bash
UPLOAD_PATH=./uploads        # โฟลเดอร์สำหรับเก็บไฟล์
MAX_FILE_SIZE=10485760      # ขนาดไฟล์สูงสุด (10MB)
```

## 🔒 **Security & App Settings (Optional)**

```bash
JWT_SECRET=your-super-secret-jwt-key-here
DEFAULT_TIMEZONE=Asia/Bangkok
```

---

## 🚨 **Required Environment Variables**

**ตัวแปรที่จำเป็นต้องมี (แอปจะไม่รันหากไม่มี):**

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET` 
- `LINE_LIFF_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SMTP_USER`
- `SMTP_PASS`

## 📝 **วิธีการตั้งค่า**

### 1. Development (Local)

สร้างไฟล์ `.env` ใน root directory:

```bash
# คัดลอกจาก env template ข้างบน
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
LINE_CHANNEL_ACCESS_TOKEN=...
# ... ใส่ค่าต่างๆ
```

### 2. Production (Railway)

ตั้งค่าใน Railway Dashboard:
1. ไปที่ Project → Variables
2. เพิ่ม environment variables ทีละตัว
3. Deploy จะเริ่มอัตโนมัติ

### 3. ตรวจสอบการตั้งค่า

```bash
npm run start
```

ถ้าขาดตัวแปรจำเป็น จะมี error message แจ้ง:
```
❌ Missing required environment variables:
  - LINE_CHANNEL_ACCESS_TOKEN
  - GOOGLE_CLIENT_ID
```

---

## 🔗 **Related Configuration**

### Default Application Settings

```javascript
// ใน src/utils/config.ts
app: {
  defaultReminders: ['P7D', 'P1D', 'PT3H'], // 7วัน, 1วัน, 3ชม.
  kpiScoring: {
    early: 2,     // เสร็จก่อนกำหนด
    ontime: 1,    // ตรงเวลา  
    late: -1,     // ล่าช้า
    overtime: -2, // ค้างนาน
  },
  workingHours: {
    start: '09:00',
    end: '18:00',
  }
}
```

### สำหรับการพัฒนา

```bash
# Optional environment variables สำหรับ development
DEBUG=true
LOG_LEVEL=debug
WEBHOOK_TIMEOUT=30000
```

---

## 🛡️ **Security Best Practices**

1. **ไม่เก็บ secrets ใน code**
2. **ใช้ different keys for dev/prod**
3. **Rotate keys เป็นประจำ**
4. **ใช้ strong JWT secret**
5. **Enable 2FA สำหรับ external services**

---

## 🆘 **Troubleshooting**

### LINE Bot ไม่ตอบ
- ตรวจสอบ `LINE_CHANNEL_ACCESS_TOKEN`
- ตรวจสอบ Webhook URL ใน LINE Console

### Google Calendar ไม่ sync
- ตรวจสอบ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
- ตรวจสอบ OAuth redirect URI

### Email ไม่ส่ง
- ตรวจสอบ `SMTP_USER` และ `SMTP_PASS`
- ใช้ App Password สำหรับ Gmail

### Database connection error
- ตรวจสอบ `DATABASE_URL` format
- ตรวจสอบ network access ถึง database