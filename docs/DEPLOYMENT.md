# การ Deploy บน Railway

## ขั้นตอนการ Deploy

### 1. เตรียม Repository

```bash
# Clone และเข้าไปใน directory
git clone <your-repo-url>
cd leka_bot

# Install dependencies
npm install

# Build โปรเจ็ก
npm run build
```

### 2. สร้างโปรเจ็กใน Railway

1. เข้าไปที่ [Railway.app](https://railway.app)
2. คลิก "New Project"
3. เลือก "Deploy from GitHub repo"
4. เลือก repository ของคุณ

### 3. เพิ่ม PostgreSQL Database

1. ในโปรเจ็ก Railway คลิก "New Service"
2. เลือก "Database" → "PostgreSQL"
3. Railway จะสร้าง database และ connection string ให้อัตโนมัติ

### 4. ตั้งค่า Environment Variables

ใน Railway Project Settings → Variables เพิ่มตัวแปรต่อไปนี้:

#### จำเป็น (Required)
```
NODE_ENV=production
PORT=3000

# DATABASE (Railway จะตั้งให้อัตโนมัติ)
DATABASE_URL=postgresql://...

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_LIFF_ID=your_liff_id

# Google Services
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app.railway.app/auth/google/callback

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password

# Application
JWT_SECRET=your_jwt_secret_key
BASE_URL=https://your-app.railway.app
```

#### ไม่จำเป็น (Optional)
```
# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Timezone
DEFAULT_TIMEZONE=Asia/Bangkok

# Google Service Account (สำหรับ Calendar)
GOOGLE_SERVICE_ACCOUNT_KEY=path_to_key.json
```

### 5. Deploy

1. Railway จะ deploy อัตโนมัติเมื่อ push code
2. ตรวจสอบ logs ใน Railway dashboard
3. URL ของแอปจะเป็น `https://your-app.railway.app`

## การตั้งค่า LINE Bot

### 1. ตั้งค่า Webhook URL

ใน LINE Developers Console:
- Webhook URL: `https://your-app.railway.app/webhook`
- เปิดใช้งาน Webhook

### 2. ตั้งค่า LIFF

1. สร้าง LIFF App ใหม่:
   - Endpoint URL: `https://your-app.railway.app/dashboard/liff/setup`
   - Size: Compact หรือ Tall

2. คัดลอก LIFF ID มาใส่ใน `LINE_LIFF_ID`

## การตั้งค่า Google Services

### 1. Google Cloud Console

1. สร้าง Project ใหม่ใน Google Cloud Console
2. เปิดใช้งาน APIs:
   - Google Calendar API
   - Gmail API (ถ้าใช้)

### 2. สร้าง OAuth Credentials

1. ไปที่ APIs & Services → Credentials
2. สร้าง OAuth 2.0 Client ID
3. เพิ่ม Authorized redirect URIs:
   - `https://your-app.railway.app/auth/google/callback`

### 3. Service Account (สำหรับ Calendar)

1. สร้าง Service Account
2. ดาวน์โหลด JSON key file
3. อัปโหลดไฟล์หรือใส่เนื้อหาใน environment variable

## การตรวจสอบหลัง Deploy

### 1. Health Check

```bash
curl https://your-app.railway.app/health
```

ควรได้ response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### 2. Database Connection

ตรวจสอบ logs ใน Railway ว่ามีข้อความ:
```
✅ Database connected successfully
✅ Database migrations completed
```

### 3. LINE Bot

1. เพิ่มบอทเข้ากลุ่มทดสอบ
2. ลอง ping บอท: พิมพ์ "เลขา"
3. ลองคำสั่ง: "@เลขา /help"

## การ Debug

### ดู Logs

```bash
# ใน Railway dashboard
railway logs --follow
```

### ตรวจสอบ Environment Variables

```bash
railway variables
```

### Connect ฐานข้อมูล

```bash
railway connect postgresql
```

## การอัปเดต

1. Push code ใหม่ไป GitHub
2. Railway จะ deploy อัตโนมัติ
3. ตรวจสอบ deployment ใน Railway dashboard

## การ Backup ฐานข้อมูล

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Import database
railway run psql $DATABASE_URL < backup.sql
```

## Performance Tips

1. **Scaling**: Railway จะ scale อัตโนมัติ
2. **Memory**: ตั้งค่า memory limit ใน Railway settings
3. **File Storage**: ใช้ external storage สำหรับไฟล์ขนาดใหญ่
4. **Database**: ใช้ connection pooling
5. **Logs**: จำกัดระดับ logging ใน production

## Troubleshooting

### Database Connection Error
- ตรวจสอบ `DATABASE_URL`
- ตรวจสอบ network connectivity

### LINE Webhook Error
- ตรวจสอบ Webhook URL
- ตรวจสอบ SSL certificate
- ตรวจสอบ signature validation

### File Upload Error
- ตรวจสอบ permission ของ upload directory
- ตรวจสอบ disk space

### Memory Issues
- เพิ่ม memory limit ใน Railway
- ปรับแต่ง connection pool size
- ใช้ streaming สำหรับไฟล์ใหญ่