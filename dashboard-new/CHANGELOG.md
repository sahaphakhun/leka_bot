# Changelog

## [2.0.0-fixed] - 2025-10-11

### 🎯 Fixed
- **ปัญหา Loading ไม่สิ้นสุด**: แก้ไขปัญหาที่ Dashboard ติดสถานะ "Loading..." เมื่อไม่มี `userId` ใน URL
- **Security Issue**: แก้ไขปัญหาที่ต้องส่ง `userId` ใน URL ของกลุ่ม (ซึ่งไม่ปลอดภัย)

### ✨ Added
- **Smart URL Detection**: ระบบตรวจจับ mode อัตโนมัติจาก URL parameters
  - Group Mode: เมื่อมีแค่ `groupId`
  - Personal Mode: เมื่อมี `userId` + `groupId`

- **View Mode Indicator**: แสดง badge บอก mode ที่กำลังใช้งาน
  - 👥 Group Mode (สีเขียว)
  - 👤 Personal Mode (สีน้ำเงิน)

- **Task Filtering**: กรองงานอัตโนมัติตาม mode
  - Personal Mode: แสดงเฉพาะงานที่ user เป็นผู้รับผิดชอบหรือสร้าง
  - Group Mode: แสดงงานทั้งหมดของกลุ่ม

- **Enhanced Logging**: เพิ่ม console logs เพื่อ debug
  ```
  🔍 URL Parameters
  📍 View Mode
  👤 User ID
  👥 Group ID
  📥 Fetching data
  ✅ Success
  ❌ Error
  ```

- **Better Error Messages**: ข้อความ error ที่ชัดเจนขึ้น พร้อมแสดง URL parameters ปัจจุบัน

### 🔧 Changed
- **AuthContext.jsx**
  - เพิ่ม `viewMode` state
  - เพิ่ม `detectViewMode()` function
  - แก้ `isAuthenticated()` ให้รองรับทั้ง Personal และ Group mode
  - เพิ่ม `isPersonalMode()` และ `isGroupMode()` helpers
  - รองรับ URL parameters: `userId`, `lineUserId`, `groupId`, `taskId`, `action`, `view`

- **App.jsx**
  - เพิ่ม task filtering ตาม viewMode
  - เพิ่ม comprehensive logging
  - แสดง mode indicator ใน loading state
  - แสดง debug info ใน error state

- **DashboardView.jsx**
  - แสดง header ตาม mode (📋 งานของฉัน / 👥 งานกลุ่ม)
  - แสดง mode badge
  - แสดงชื่อกลุ่ม

### 🔒 Security
- ✅ ไม่ต้องส่ง `userId` ใน URL ของกลุ่ม
- ✅ Personal mode ใช้ได้เฉพาะในแชทส่วนตัว (ปลอดภัย)
- ✅ Group mode ไม่ต้องการ `userId` (ปลอดภัย)

### 📊 Performance
- ไม่มีผลกระทบต่อ performance
- Bundle size เพิ่มขึ้นเล็กน้อย (~2KB) จาก logging code

### 🧪 Testing
- ✅ ทดสอบ Group Mode URL
- ✅ ทดสอบ Personal Mode URL
- ✅ ทดสอบ URL ที่ไม่มี parameters
- ✅ ทดสอบ localStorage fallback
- ✅ ทดสอบ task filtering
- ✅ ทดสอบ error handling

### 📝 Documentation
- เพิ่ม README.md
- เพิ่ม DEPLOYMENT.md
- เพิ่ม CHANGELOG.md

### 🔄 Backward Compatibility
- ✅ รองรับ URL patterns เดิมทั้งหมด
- ✅ ไม่ต้องแก้ Backend
- ✅ แค่เปลี่ยน `/dashboard` → `/dashboard-new`

---

## [1.0.0] - 2025-10-10

### Initial Release
- Dashboard UI พื้นฐาน
- Task management
- Calendar view
- Stats cards
- Team view

### Known Issues
- ❌ ติด Loading เมื่อไม่มี `userId`
- ❌ ต้องส่ง `userId` ใน URL (ไม่ปลอดภัยในกลุ่ม)

