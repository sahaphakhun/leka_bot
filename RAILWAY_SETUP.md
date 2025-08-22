# คู่มือการตั้งค่า Google Calendar ใน Railway

## วิธีแก้ไขปัญหาไฟล์ Service Account ใน Railway

Railway ไม่รองรับการอัปโหลดไฟล์โดยตรง แต่เราสามารถใช้ Environment Variable แทนได้

## ขั้นตอนการตั้งค่า

### 1. แปลงไฟล์ Service Account JSON

#### วิธีที่ 1: ใช้สคริปต์ (แนะนำ)
```bash
# รันสคริปต์ที่สร้างไว้
node convert-service-account.js ./google-service-account.json
```

#### วิธีที่ 2: ทำมือ
1. เปิดไฟล์ `google-service-account.json`
2. คัดลอกเนื้อหาทั้งหมด
3. ใส่ใน Environment Variable

### 2. ตั้งค่า Environment Variables ใน Railway

ไปที่ Railway Dashboard > โปรเจ็กต์ > Variables และเพิ่ม:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-app-name.railway.app/api/auth/google/callback
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret

# Database
DATABASE_URL=your_database_url

# App Settings
NODE_ENV=production
BASE_URL=https://your-app-name.railway.app
```

### 3. ตัวอย่างค่า GOOGLE_SERVICE_ACCOUNT_JSON

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "leka-bot@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/leka-bot%40your-project-id.iam.gserviceaccount.com"
}
```

**หมายเหตุ:** ต้องแปลงเป็น JSON string เดียว (ไม่มี line breaks)

### 4. การตรวจสอบการตั้งค่า

#### ตรวจสอบใน Railway Logs:
```
✅ Using Google Service Account from environment variable
✅ Google Calendar connection successful
```

#### ทดสอบการเชื่อมต่อ:
```javascript
// ใน console หรือ API endpoint
const googleService = new GoogleService();
const result = await googleService.testConnection();
console.log(result); // { calendar: true }
```

### 5. การแก้ไขปัญหา

#### ปัญหา: "Service Account JSON parsing failed"
- ตรวจสอบว่า JSON string ถูกต้อง
- ไม่มี line breaks หรือ special characters
- ใช้ `JSON.stringify()` ในการแปลง

#### ปัญหา: "Google Calendar connection failed"
- ตรวจสอบว่า Service Account มีสิทธิ์เข้าถึงปฏิทิน
- แชร์ปฏิทินกับ Service Account email
- เปิดใช้งาน Google Calendar API

#### ปัญหา: "Missing required environment variables"
- ตรวจสอบว่าใส่ environment variables ครบ
- ตรวจสอบการสะกดชื่อ variables

### 6. การแชร์ปฏิทินกับ Service Account

1. เปิด Google Calendar
2. คลิกที่ปฏิทินที่ต้องการใช้
3. คลิก "Settings and sharing"
4. ในส่วน "Share with specific people":
   - เพิ่ม email ของ Service Account
   - ให้สิทธิ์ "Make changes to events"

### 7. การอัปเดตโค้ด

โค้ดได้รับการอัปเดตให้รองรับ:
- การอ่าน Service Account จาก Environment Variable
- การ fallback ไปใช้ OAuth หาก Service Account ไม่ทำงาน
- การแสดง log ที่ชัดเจน

### 8. การ Deploy

1. Commit และ push โค้ดที่อัปเดต
2. Railway จะ deploy อัตโนมัติ
3. ตรวจสอบ logs ว่าการเชื่อมต่อ Google Calendar สำเร็จ

## หมายเหตุสำคัญ

- **ความปลอดภัย:** อย่า commit ไฟล์ Service Account JSON เข้า git
- **Backup:** เก็บไฟล์ JSON ไว้ในที่ปลอดภัย
- **Rotation:** เปลี่ยน Service Account key เป็นระยะ
- **Monitoring:** ติดตามการใช้งาน API ใน Google Cloud Console
