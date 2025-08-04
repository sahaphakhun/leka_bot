# เลขาบอท (Leka Bot) - LINE Group Secretary Bot

เลขาบอทสำหรับ LINE กลุ่ม ระบบจัดการงานและปฏิทินแบบครบวงจร

## ฟีเจอร์หลัก

### 🤖 LINE Bot Integration
- รองรับหลายกลุ่ม แยกข้อมูลตาม groupId
- คำสั่งภาษาไทยธรรมชาติและคำสั่งแบบย่อ
- การแท็กและจัดการสมาชิกในกลุ่ม

### 📋 Task & Calendar Management
- เพิ่มงานผ่าน LINE chat
- มอบหมายงานให้หลายคนได้
- ระบบเตือนล่วงหน้าทั้งในกลุ่มและอีเมล
- เชื่อมต่อ Google Calendar

### 📊 Dashboard ต่อกลุ่ม
- มุมมองปฏิทิน (เดือน/สัปดาห์/วัน)
- ตารางงานพร้อมผู้รับผิดชอบ
- ฟิลเตอร์และการค้นหา
- ออกรายงาน CSV/Excel

### 📁 File Vault
- เก็บไฟล์ที่ส่งในกลุ่มอัตโนมัติ
- จัดหมวดหมู่และค้นหาไฟล์
- ผูกไฟล์กับงาน
- ดาวน์โหลดจาก Dashboard

### 🏆 KPI & Leaderboard
- จัดอันดับประสิทธิภาพการทำงาน
- คะแนนตามการทำงานเสร็จตรงเวลา
- สรุปรายงานรายสัปดาห์
- เปิด/ปิดได้ตามนโยบายกลุ่ม

## การติดตั้งและใช้งาน

### ข้อกำหนดระบบ
- Node.js 18+
- PostgreSQL
- LINE Developer Account
- Google Cloud Account (สำหรับ Calendar & Email)

### การติดตั้ง

1. Clone repository
```bash
git clone <repository-url>
cd leka_bot
```

2. ติดตั้ง dependencies
```bash
npm install
```

3. ตั้งค่า environment variables
```bash
cp .env.example .env
# แก้ไขค่าต่างๆ ใน .env
```

4. ตั้งค่า database
```bash
npm run db:migrate
```

5. รันในโหมดพัฒนา
```bash
npm run dev
```

### การ Deploy บน Railway

1. Push โค้ดไปยัง Git repository
2. เชื่อมต่อ Railway กับ repository
3. ตั้งค่า Environment Variables บน Railway
4. เพิ่ม PostgreSQL plugin
5. Deploy

## การใช้งาน

### Onboarding กลุ่ม
1. เพิ่มบอทเข้ากลุ่ม LINE
2. พิมพ์ `@เลขา /setup`
3. คลิกลิงก์ LIFF เพื่อตั้งค่า
4. สมาชิกลิงก์บัญชีผ่าน LIFF

### คำสั่งหลัก
- `@เลขา เพิ่มงาน "ชื่อเรื่อง" @คน1 @คน2 เริ่ม dd/mm hh:mm ถึง dd/mm hh:mm`
- `@เลขา /task list` - ดูรายการงาน
- `@เลขา /task mine` - งานของฉัน  
- `@เลขา /task done <รหัสงาน>` - ปิดงาน
- `@เลขา /files list` - ดูไฟล์ที่เก็บไว้

## โครงสร้างโปรเจ็ก

```
src/
├── controllers/     # API Controllers
├── services/        # Business Logic
├── models/          # Database Models  
├── middleware/      # Express Middleware
├── utils/           # Utility Functions
├── types/           # TypeScript Types
├── jobs/            # Cron Jobs
└── index.ts         # Entry Point

dashboard/           # Frontend Dashboard (Next.js)
uploads/             # File Storage
docs/                # Documentation
```

## License

MIT License