# การแก้ไขปัญหา Leaderboard API 500 Error

## ปัญหาที่เกิดขึ้น
```
GET https://lekabot-production.up.railway.app/api/groups/2f5b9113-b8cf-4196-8929-bff6b26cbd65/leaderboard?period=weekly&limit=3 500 (Internal Server Error)
```

## สาเหตุที่เป็นไปได้
1. **Timezone Issues**: การใช้ `moment().tz()` อาจจะล้มเหลวใน production environment
2. **Database Query Errors**: การใช้ `AVG()` และ `SUM()` ใน query builder อาจจะมีปัญหา
3. **Foreign Key Issues**: ความสัมพันธ์ระหว่างตารางอาจจะไม่ถูกต้อง
4. **Missing Data**: กลุ่มหรือสมาชิกอาจจะไม่มีข้อมูล

## การแก้ไขที่ทำไปแล้ว

### 1. ปรับปรุง KPIService.ts
- เพิ่ม error handling สำหรับ timezone operations
- เพิ่ม fallback สำหรับ local time หาก timezone ล้มเหลว
- ปรับปรุง SQL query โดยใช้ `COALESCE()` เพื่อป้องกัน NULL values
- เพิ่ม detailed logging สำหรับ debugging

### 2. ปรับปรุง apiController.ts
- เพิ่ม validation สำหรับ groupId
- ปรับปรุง error handling และ response codes
- เพิ่ม detailed error logging
- ส่ง error details ใน development mode

### 3. สร้าง Test Script
- สร้าง `src/scripts/testLeaderboard.ts` สำหรับทดสอบ API
- เพิ่ม script `npm run test:leaderboard` ใน package.json

## วิธีการทดสอบ

### 1. ทดสอบด้วย Test Script
```bash
npm run test:leaderboard
```

### 2. ทดสอบด้วย API โดยตรง
```bash
curl "https://lekabot-production.up.railway.app/api/groups/2f5b9113-b8cf-4196-8929-bff6b26cbd65/leaderboard?period=weekly&limit=3"
```

### 3. ตรวจสอบ Logs
ดู console logs ใน production environment เพื่อหา error details

## การตรวจสอบเพิ่มเติม

### 1. ตรวจสอบ Database Schema
```bash
npm run db:check-schema
```

### 2. ตรวจสอบ KPI Foreign Keys
```bash
npm run db:check-kpi-foreign-keys
```

### 3. ตรวจสอบ Group และ Members
- ตรวจสอบว่ากลุ่มมีอยู่จริงในฐานข้อมูล
- ตรวจสอบว่ามีสมาชิกในกลุ่ม
- ตรวจสอบว่ามี KPI records

## การแก้ไขเพิ่มเติมที่อาจจะต้องทำ

### 1. แก้ไข Timezone Configuration
หากยังมีปัญหา timezone ให้แก้ไขใน `config.ts`:
```typescript
defaultTimezone: 'UTC' // ใช้ UTC แทน Asia/Bangkok
```

### 2. แก้ไข Database Connection
ตรวจสอบ database connection ใน production:
```typescript
// ใน database.ts
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

### 3. เพิ่ม Error Monitoring
เพิ่ม error monitoring service เช่น Sentry หรือ LogRocket

## ผลลัพธ์ที่คาดหวัง
หลังจากแก้ไขแล้ว API ควรจะ:
- ✅ ส่งคืน leaderboard data ได้ปกติ
- ✅ ไม่มี 500 error
- ✅ มี detailed error messages หากมีปัญหา
- ✅ รองรับ fallback สำหรับ timezone issues

## การติดตามผล
1. ตรวจสอบ production logs หลังจาก deploy
2. ทดสอบ API endpoint อีกครั้ง
3. ตรวจสอบ dashboard ว่าสามารถโหลด leaderboard ได้
4. ติดตาม error rate ใน production
