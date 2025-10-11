# Dashboard New - Fixed Version

## 🎯 สิ่งที่แก้ไข

### ปัญหาเดิม
- Dashboard ใหม่ติดสถานะ "Loading..." เพราะต้องการทั้ง `userId` และ `groupId`
- ปุ่มจาก LINE Bot ไม่ส่ง `userId` ในกลุ่ม (เพื่อความปลอดภัย)

### วิธีแก้
เพิ่ม **Smart URL Detection** ที่ตรวจจับ mode อัตโนมัติ:

1. **Group Mode**: มีแค่ `groupId` → แสดงงานทั้งหมดของกลุ่ม
2. **Personal Mode**: มี `userId` + `groupId` → แสดงเฉพาะงานของ user

---

## 📁 การติดตั้งบน Railway

### วิธีที่ 1: แตกไฟล์ในโฟลเดอร์ dashboard-new

```bash
# ใน Railway project directory
cd dashboard-new
rm -rf *
unzip dashboard-new-fixed.zip
```

### วิธีที่ 2: Deploy ทั้ง Backend

```bash
# Copy ไฟล์ทั้งหมดไปแทนที่ dashboard-new/ ใน backend project
cp -r * /path/to/leka_bot-main/dashboard-new/
```

---

## 🔗 URL Patterns ที่รองรับ

### Group Dashboard (ส่งในกลุ่ม)
```
/dashboard-new?groupId=xxx
/dashboard-new?groupId=xxx&taskId=yyy&action=view
```

### Personal Dashboard (ส่งในแชทส่วนตัว)
```
/dashboard-new?userId=zzz&groupId=xxx
/dashboard-new?userId=zzz&groupId=xxx&taskId=yyy&action=edit
```

---

## ✅ Features

- ✅ รองรับ URL เดิมทั้งหมด (ไม่ต้องแก้ Backend)
- ✅ ตรวจจับ mode อัตโนมัติ
- ✅ แสดง badge บอก mode (👤 Personal / 👥 Group)
- ✅ Filter งานตาม mode
- ✅ Console logging เพื่อ debug
- ✅ Error messages ที่ชัดเจน

---

## 🧪 การทดสอบ

### Test 1: Group Mode
```
URL: /dashboard-new?groupId=2f5b9113-b8cf-4196-8929-bff6b26cbd65
Expected: แสดงงานทั้งหมดของกลุ่ม ✅
```

### Test 2: Personal Mode
```
URL: /dashboard-new?userId=Uc92411a226e4d4c9866adef05068bdf1&groupId=2f5b9113-b8cf-4196-8929-bff6b26cbd65
Expected: แสดงเฉพาะงานของ user ✅
```

---

## 📊 ไฟล์ที่แก้ไข

1. **src/context/AuthContext.jsx**
   - เพิ่ม `viewMode` state
   - เพิ่ม `detectViewMode()` function
   - แก้ `isAuthenticated()` รองรับทั้งสอง mode
   - เพิ่ม `isPersonalMode()` และ `isGroupMode()`

2. **src/App.jsx**
   - เพิ่ม filter งานตาม mode
   - เพิ่ม console.log เพื่อ debug
   - แสดง mode indicator ใน loading

3. **src/components/DashboardView.jsx**
   - แสดง header ตาม mode
   - แสดง badge บอก mode
   - แสดงชื่อกลุ่ม

---

## 🔍 Debug

เปิด Browser Console (F12) จะเห็น logs:

```
🔍 URL Parameters: { userId: "xxx", groupId: "yyy" }
📍 View Mode: personal
👤 User ID: xxx
👥 Group ID: yyy
📥 Fetching group info...
✅ Group loaded: { ... }
📥 Fetching tasks...
✅ Tasks loaded: { ... }
🔍 Filtering tasks for user: xxx
✅ Filtered tasks: 5
📊 Stats: { ... }
✅ Setting loading to false
```

---

## 📝 Version

- **Version**: 2.0.0-fixed
- **Build Date**: 2025-10-11
- **Built with**: Vite 6.3.5 + React 19.1.4

---

## 🆘 Support

หากมีปัญหา:
1. เช็ค Browser Console (F12)
2. ตรวจสอบ URL parameters
3. ดู logs ที่ระบุ viewMode และ authentication status

