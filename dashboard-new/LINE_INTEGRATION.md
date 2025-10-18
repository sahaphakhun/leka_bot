# 📱 คู่มือการเปิดแดชบอร์ดใหม่จาก LINE

เอกสารนี้อธิบายวิธีการเปิดและใช้งานแดชบอร์ดใหม่ผ่าน LINE bot พร้อมทั้งการตรวจสอบสิทธิ์ที่แตกต่างกันระหว่าง Personal Mode และ Group Mode

---

## 🎯 ภาพรวม

แดชบอร์ดใหม่รองรับการเปิดจาก LINE ใน 2 โหมด:

1. **Personal Mode** (แชทส่วนตัว) - มีสิทธิ์เต็มรูปแบบ
2. **Group Mode** (แชทกลุ่ม) - โหมดดูอย่างเดียว

---

## 📋 สิทธิ์การใช้งาน (Permissions)

### ✅ Personal Mode
**URL Pattern:**
```
https://your-domain.com/dashboard-new?userId=U123456789&groupId=C123456789
```

**สิทธิ์ที่มี:**
- ✅ ดูข้อมูลทั้งหมด
- ✅ สร้าง/แก้ไข/ลบงาน
- ✅ สร้าง/แก้ไข/ลบงานประจำ
- ✅ เชิญสมาชิก/ลบสมาชิก
- ✅ เปลี่ยนบทบาทสมาชิก
- ✅ อัพโหลด/ลบไฟล์
- ✅ ส่งงาน (Submit Task)

**เข้าได้จาก:**
- แชทส่วนตัวกับบอท
- ปุ่ม Rich Menu ในแชทส่วนตัว
- LIFF App (Personal)

---

### 👥 Group Mode (Read-Only)
**URL Pattern:**
```
https://your-domain.com/dashboard-new?groupId=C123456789
```

**สิทธิ์ที่มี:**
- ✅ ดูข้อมูลทั้งหมด
  - ดู Dashboard
  - ดู Tasks
  - ดู Calendar
  - ดู Files
  - ดู Members
  - ดู Leaderboard
  - ดู Reports
- ❌ ส่งงาน (Submit Task) - **ต้องการ userId เพื่อระบุผู้ส่ง**
- ❌ สร้าง/แก้ไข/ลบงาน
- ❌ สร้าง/แก้ไข/ลบงานประจำ
- ❌ เชิญสมาชิก/ลบสมาชิก
- ❌ อัพโหลด/ลบไฟล์

**เข้าได้จาก:**
- แชทกลุ่ม
- ปุ่ม Rich Menu ในแชทกลุ่ม
- LIFF App (Group)

**หมายเหตุ:**
- จะแสดง **Read-Only Banner** สีเหลืองด้านบน
- ปุ่มที่ต้องการ userId จะถูก disable

---

## 🔧 วิธีการทำงาน

### 1. การตรวจสอบ Parameters

แดชบอร์ดจะตรวจสอบ URL parameters ตามลำดับ:

```javascript
// 1. อ่านจาก URL
const params = new URLSearchParams(window.location.search);
const userId = params.get('userId') || params.get('userid') || params.get('lineUserId');
const groupId = params.get('groupId') || params.get('groupid');

// 2. ถ้าไม่มีใน URL → ลอง localStorage
if (!userId) {
  userId = localStorage.getItem('leka_userId');
}
if (!groupId) {
  groupId = localStorage.getItem('leka_groupId');
}

// 3. กำหนด View Mode
if (userId && groupId) {
  viewMode = 'personal'; // Personal Mode
} else if (groupId) {
  viewMode = 'group';    // Group Mode (Read-Only)
} else {
  viewMode = null;       // ไม่สามารถใช้งานได้
}
```

---

### 2. การตรวจสอบสิทธิ์ในโค้ด

**ตัวอย่างการใช้งาน:**

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { userId, groupId, viewMode, canModify, hasPermission } = useAuth();

  // ตรวจสอบว่ามี userId หรือไม่
  if (!userId) {
    return <ReadOnlyBanner />;
  }

  // ตรวจสอบสิทธิ์เฉพาะเจาะจง
  const canCreateTask = hasPermission('create_task');
  const canViewDashboard = hasPermission('view_dashboard');

  // ตรวจสอบว่าสามารถแก้ไขได้หรือไม่
  if (!canModify()) {
    return <p>คุณไม่มีสิทธิ์แก้ไข</p>;
  }

  return (
    <div>
      <h1>สร้างงานใหม่</h1>
      {/* ... */}
    </div>
  );
}
```

---

### 3. รายการ Permissions ทั้งหมด

#### ✅ Actions ที่อนุญาตในโหมด Group (ไม่ต้องมี userId)

```javascript
const allowedInGroupMode = [
  'view_dashboard',
  'view_tasks',
  'view_calendar',
  'view_files',
  'view_members',
  'view_leaderboard',
  'view_reports',
];
```

#### ❌ Actions ที่ต้องการ userId (Personal Mode เท่านั้น)

```javascript
const requiresUserId = [
  'create_task',
  'edit_task',
  'delete_task',
  'submit_task',        // ⚠️ ต้องการ userId เพื่อระบุว่าใครเป็นคนส่งงาน
  'create_recurring',
  'edit_recurring',
  'delete_recurring',
  'invite_member',
  'remove_member',
  'change_role',
  'upload_file',
  'delete_file',
];
```

---

## 🌐 การตั้งค่า LINE Bot

### 1. Rich Menu สำหรับ Personal Chat

```json
{
  "size": {
    "width": 2500,
    "height": 1686
  },
  "selected": true,
  "name": "Dashboard Menu (Personal)",
  "chatBarText": "เมนูแดชบอร์ด",
  "areas": [
    {
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "uri",
        "uri": "https://your-domain.com/dashboard-new?userId={userId}&groupId={groupId}"
      }
    }
  ]
}
```

**หมายเหตุ:**
- ใช้ `{userId}` placeholder - LINE จะแทนที่เป็น userId จริง
- ใช้ `{groupId}` placeholder - LINE จะแทนที่เป็น groupId จริง (ถ้าอยู่ในกลุ่ม)

---

### 2. Rich Menu สำหรับ Group Chat

```json
{
  "size": {
    "width": 2500,
    "height": 1686
  },
  "selected": true,
  "name": "Dashboard Menu (Group)",
  "chatBarText": "เมนูแดชบอร์ด",
  "areas": [
    {
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "uri",
        "uri": "https://your-domain.com/dashboard-new?groupId={groupId}"
      }
    }
  ]
}
```

**หมายเหตุ:**
- ใน Group Chat จะไม่มี `{userId}` (LINE ไม่ให้ userId ในกรณีนี้)
- จะเปิดในโหมด Read-Only

---

## 🧪 การทดสอบ

### 1. ทดสอบ Personal Mode

```bash
# เปิด URL นี้ในเบราว์เซอร์
http://localhost:5173/?userId=U1234567890&groupId=C1234567890
```

**ตรวจสอบ:**
- ✅ ไม่มี Read-Only Banner
- ✅ ปุ่มสร้างงานใช้งานได้
- ✅ ปุ่มอื่น ๆ ใช้งานได้หมด
- ✅ Console แสดง "🔐 Personal Mode"

---

### 2. ทดสอบ Group Mode

```bash
# เปิด URL นี้ในเบราว์เซอร์
http://localhost:5173/?groupId=C1234567890
```

**ตรวจสอบ:**
- ✅ แสดง Read-Only Banner สีเหลือง
- ✅ ปุ่มสร้างงาน disabled
- ✅ สามารถดูข้อมูลได้
- ✅ Console แสดง "👥 Group Mode"

---

### 3. ทดสอบ localStorage

```bash
# 1. เปิดแดชบอร์ดด้วย URL ปกติ
http://localhost:5173/?userId=U123&groupId=C123

# 2. Reload หน้าเว็บโดยไม่มี parameters
http://localhost:5173/

# ✅ ควรยังคงเข้าใช้งานได้ (โหลดจาก localStorage)
```

---

## 🚨 การแก้ปัญหา (Troubleshooting)

### ❌ ปัญหา: แสดง "ไม่พบ Group ID"

**สาเหตุ:**
- URL ไม่มี `groupId` parameter
- localStorage ไม่มีข้อมูล

**วิธีแก้:**
```bash
# เพิ่ม groupId ใน URL
https://your-domain.com/dashboard-new?groupId=C123456789
```

---

### ❌ ปัญหา: แสดง Read-Only Banner ทั้งที่เปิดจากแชทส่วนตัว

**สาเหตุ:**
- URL ไม่มี `userId` parameter
- Rich Menu ไม่ได้ตั้งค่า `{userId}` placeholder

**วิธีแก้:**
1. ตรวจสอบ Rich Menu ว่ามี `{userId}` ใน URL หรือไม่
2. ตรวจสอบ URL ที่เปิดจริง ๆ ว่ามี `userId` หรือไม่

```bash
# ถูกต้อง
https://your-domain.com/dashboard-new?userId=U123&groupId=C123

# ผิด (ไม่มี userId)
https://your-domain.com/dashboard-new?groupId=C123
```

---

### ❌ ปัญหา: กดปุ่มแล้วไม่ทำงาน

**สาเหตุ:**
- อยู่ใน Group Mode (Read-Only)
- ไม่มีสิทธิ์

**วิธีแก้:**
1. ตรวจสอบ console ว่าแสดง mode อะไร
2. ตรวจสอบว่ามี `userId` ใน URL หรือไม่
3. เข้าผ่านแชทส่วนตัวแทน

---

## 📊 การเปรียบเทียบกับแดชบอร์ดเก่า

| ฟีเจอร์ | Dashboard เก่า | Dashboard ใหม่ |
|---------|---------------|---------------|
| URL Parameters | `?userId=xxx&groupId=xxx` | `?userId=xxx&groupId=xxx` ✅ |
| Personal Mode | รองรับ | รองรับ ✅ |
| Group Mode | รองรับ | รองรับ ✅ |
| Permission Check | `currentUserId` && `currentGroupId` | `hasPermission()` ✅ |
| Read-Only Banner | แสดง | แสดง ✅ |
| Submit Task | อนุญาตเสมอ | อนุญาตเสมอ ✅ |
| localStorage | ใช้ | ใช้ ✅ |
| React Context | ไม่มี | มี (AuthContext) ✅ |

---

## 🔐 ความปลอดภัย

### 1. Validation ฝั่ง Frontend

```javascript
// ✅ ตรวจสอบก่อนเรียก API
if (!hasPermission('create_task')) {
  toast({
    title: 'ไม่มีสิทธิ์',
    description: 'คุณไม่มีสิทธิ์สร้างงาน',
    variant: 'destructive',
  });
  return;
}
```

### 2. Validation ฝั่ง Backend

```javascript
// ✅ Backend ต้องตรวจสอบอีกครั้ง
app.post('/api/groups/:groupId/tasks', async (req, res) => {
  const { userId, groupId } = req.body;
  
  // ตรวจสอบว่า userId มีอยู่จริง
  if (!userId) {
    return res.status(403).json({ error: 'User ID required' });
  }
  
  // ตรวจสอบว่าเป็นสมาชิกของกลุ่ม
  const isMember = await checkMembership(userId, groupId);
  if (!isMember) {
    return res.status(403).json({ error: 'Not a member' });
  }
  
  // ดำเนินการต่อ...
});
```

---

## 📝 Checklist สำหรับการ Deploy

- [ ] ตรวจสอบว่า Rich Menu มี `{userId}` และ `{groupId}` placeholders
- [ ] ทดสอบเปิดจากแชทส่วนตัว (ต้องได้ Personal Mode)
- [ ] ทดสอบเปิดจากแชทกลุ่ม (ต้องได้ Group Mode)
- [ ] ทดสอบ localStorage (Reload หน้าเว็บแล้วยังใช้งานได้)
- [ ] ตรวจสอบ Read-Only Banner แสดงถูกต้อง
- [ ] ทดสอบปุ่มต่าง ๆ ใน Personal Mode
- [ ] ตรวจสอบว่าปุ่มถูก disable ใน Group Mode
- [ ] ทดสอบ Submit Task (ต้องใช้งานได้ทั้ง 2 mode)
- [ ] ตรวจสอบ Error Messages
- [ ] ตรวจสอบ Toast Notifications

---

## 📚 เอกสารเพิ่มเติม

- [PROGRESS.md](./PROGRESS.md) - ความคืบหน้าการพัฒนา
- [FEATURE_COMPARISON.md](./FEATURE_COMPARISON.md) - เปรียบเทียบฟีเจอร์
- [MODAL_INTEGRATION_CHECK.md](./MODAL_INTEGRATION_CHECK.md) - การตรวจสอบ Modals
- [README.md](./README.md) - คู่มือหลัก

---

## 🎯 สรุป

แดชบอร์ดใหม่รองรับการเปิดจาก LINE เต็มรูปแบบ โดยแยก permissions ชัดเจนระหว่าง:

1. **Personal Mode** - มีสิทธิ์เต็มรูปแบบ (ต้องมี `userId` + `groupId`)
2. **Group Mode** - โหมดดูอย่างเดียว (มีแค่ `groupId`)

ระบบจะตรวจสอบสิทธิ์อัตโนมัติและแสดง UI ที่เหมาะสมตาม mode ที่ใช้งาน

**🚀 พร้อมใช้งาน!**