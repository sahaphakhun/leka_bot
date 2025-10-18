# 🔍 การวิเคราะห์แดชบอร์ดเก่า (Old Dashboard Analysis)

เอกสารนี้วิเคราะห์การทำงานของแดชบอร์ดเก่าอย่างครบถ้วน เพื่อใช้เป็นแนวทางในการพัฒนาแดชบอร์ดใหม่ให้รองรับการใช้งานเหมือนกันทุกประการ

**วันที่อัพเดท**: 2025-01-XX  
**ที่อยู่ไฟล์**: `/Users/mac/pp/leka_bot/dashboard/`

---

## 📂 1. โครงสร้างไฟล์

### หน้าเว็บหลัก (HTML)

| ไฟล์ | ขนาด | จุดประสงค์ | เปิดจาก LINE |
|------|------|-----------|-------------|
| `index.html` | ~800 บรรทัด | หน้าหลัก - มีทุก views (Dashboard, Calendar, Tasks, Files, Leaderboard, Reports) | ✅ Rich Menu, ปุ่มในข้อความ |
| `submit-tasks.html` | ~500 บรรทัด | หน้าส่งงานแบบเฉพาะ (Upload ไฟล์, เพิ่ม comment) | ✅ ปุ่ม "ส่งงาน" |
| `members.html` | ~400 บรรทัด | จัดการสมาชิกกลุ่ม (เชิญ, ลบ, เปลี่ยนบทบาท) | ✅ ปุ่ม "สมาชิก" |
| `recurring-tasks.html` | ~450 บรรทัด | จัดการงานประจำ (สร้าง, แก้ไข, ดูประวัติ) | ✅ ปุ่ม "งานประจำ" |
| `profile.html` | ~300 บรรทัด | ตั้งค่าโปรไฟล์ส่วนตัว (Email, Timezone, Google Calendar) | ✅ ปุ่ม "โปรไฟล์" |

### ไฟล์ JavaScript

| ไฟล์ | ขนาด | จุดประสงค์ |
|------|------|-----------|
| `script.js` | ~2,500 บรรทัด | ตรรกะหลักทั้งหมด - Views, Modals, API calls, Event handling |
| `script-vanilla.js` | ~200 บรรทัด | Utilities สำหรับ DashboardApp class |
| `recurring-tasks.js` | ~600 บรรทัด | ตรรกะเฉพาะงานประจำ |
| `moment.min.js` | Library | จัดการวันที่/เวลา |
| `moment-timezone-with-data.min.js` | Library | รองรับ timezone (Bangkok/Asia) |

### ไฟล์ CSS

| ไฟล์ | จุดประสงค์ |
|------|-----------|
| `styles.css` | Style หลักของแดชบอร์ด |
| `tailwind.css` | Tailwind utility classes |
| `bordio-design-system.css` | Bordio UI design system |

---

## 🔐 2. ระบบ Authentication & Permissions

### 2.1 การอ่าน URL Parameters

```javascript
// จาก script.js
getGroupIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('groupId') || 'default';
}

getUserIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('userId') || '';
}

getActionFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('action') || '';  // เช่น 'openAddTask'
}
```

**ตัวอย่าง URL:**
```
https://dashboard.example.com/dashboard?groupId=C123abc&userId=U456def&action=openSubmitTask
```

### 2.2 โหมดการใช้งาน 3 แบบ

| โหมด | เงื่อนไข | สิทธิ์ที่ได้ | สิทธิ์ที่ไม่ได้ |
|------|---------|-------------|---------------|
| **Full Access** | มี `userId` + `groupId` | ✅ ดูข้อมูลทั้งหมด<br>✅ สร้าง/แก้ไข/ลบงาน<br>✅ มอบหมายงาน<br>✅ เชิญสมาชิก<br>✅ ส่งงาน<br>✅ Upload ไฟล์ | - |
| **Group View** | มีแค่ `groupId` | ✅ ดูข้อมูลทั้งหมด<br>✅ ส่งงาน<br>✅ ดาวน์โหลดไฟล์<br>✅ ดู Reports<br>✅ ดู Leaderboard | ❌ สร้าง/แก้ไข/ลบงาน<br>❌ เชิญสมาชิก<br>❌ Upload ไฟล์<br>❌ มอบหมายงาน |
| **No Access** | ไม่มีทั้ง 2 อย่าง | - | ❌ ทุกอย่าง |

### 2.3 การตรวจสอบสิทธิ์ในโค้ด

```javascript
// จาก index.html - เมื่อ dashboard เริ่มต้น
if (!this.currentUserId) {
  // แสดง Read-Only Banner
  this.showReadOnlyBanner();
  
  // Disable ปุ่มที่ต้องการ userId
  const needUserButtons = ['addTaskBtn', 'addRecurringBtn', 'inviteMemberBtn'];
  needUserButtons.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('disabled', 'true');
      el.classList.add('opacity-50', 'cursor-not-allowed');
      el.title = 'โปรดเข้าผ่านลิงก์จากบอทเพื่อระบุตัวตน (userId)';
    }
  });
  
  // ปุ่มที่ใช้งานได้โดยไม่ต้องมี userId
  const submitBtn = document.getElementById('submitTaskBtn');
  if (submitBtn) {
    submitBtn.removeAttribute('disabled');
    submitBtn.title = 'ส่งงาน (สามารถใช้งานได้ทันที)';
  }
} else {
  // โหมดเข้าถึงเต็ม
  this.hideReadOnlyBanner();
}
```

### 2.4 การแยก Personal vs Group Context

```javascript
// การสร้างงาน - ต้องการ userId
async handleAddTask() {
  const createdBy = this.currentUserId || 'unknown';  // ไม่สามารถสร้างงานโดยไม่มี userId
  
  // ผู้รับมอบหมาย - ดึงจากสมาชิกกลุ่ม
  const assigneeIds = Array.from(
    document.querySelectorAll('.assignee-checkbox:checked')
  ).map(cb => cb.value);
  
  const taskPayload = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    dueDate: document.getElementById('taskDueDate').value,
    createdBy: createdBy,        // ตัวระบุส่วนบุคคล (Personal)
    assigneeIds: assigneeIds,     // บริบทกลุ่ม (Group)
    groupId: this.currentGroupId  // ตัวระบุกลุ่ม
  };
  
  // ถ้าไม่มี userId จะไม่สามารถสร้างงานได้
  if (!this.currentUserId) {
    alert('กรุณาเข้าใช้งานผ่าน LINE เพื่อสร้างงาน');
    return;
  }
  
  // ส่ง API
  await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks`, {
    method: 'POST',
    body: taskPayload
  });
}
```

---

## 📱 3. การเชื่อมต่อกับ LINE

### 3.1 วิธีเปิดหน้าเว็บจาก LINE

**จุดเชื่อมต่อกับ LINE Bot:**

1. **จาก Rich Menu** (เมนูด้านล่างของแชท)
   - บอทส่ง Rich Menu พร้อมปุ่ม
   - แต่ละปุ่มลิงก์ไปที่: `https://dashboard.example.com/dashboard/[page]?groupId=C123&userId=U456`

2. **จากข้อความของบอท**
   - บอทส่งข้อความพร้อมปุ่ม/ลิงก์
   - ตัวอย่าง: "กดเพื่อส่งงาน: [ลิงก์]"
   - รูปแบบ: `https://dashboard.example.com/dashboard/index.html?groupId=C123&userId=U456&action=openSubmitTask`

3. **จาก Quick Reply**
   - ปุ่มตอบกลับด่วนที่มีลิงก์ไปยังหน้าต่างๆ

### 3.2 รูปแบบ URL ที่ใช้

```bash
# หน้าหลัก (ทุก Views)
GET /dashboard/index.html?groupId=C123...&userId=U456...

# ส่งงาน
GET /dashboard/submit-tasks.html?userId=U456...&groupId=C123...&taskId=T789...

# จัดการสมาชิก
GET /dashboard/members.html?groupId=C123...&userId=U456...

# งานประจำ
GET /dashboard/recurring-tasks.html?groupId=C123...&userId=U456...

# โปรไฟล์ส่วนตัว
GET /dashboard/profile.html?userId=U456...
```

### 3.3 ไม่ได้ใช้ LIFF

**สำคัญ: แดชบอร์ดเก่าไม่ได้ใช้ LIFF (LINE Frontend Framework)**

แทนที่จะเป็น:
```javascript
// ❌ ไม่ได้ใช้ LIFF
liff.init({ liffId: '...' })
liff.getContext()
```

ใช้เป็น:
```javascript
// ✅ เรียก LINE API ผ่าน Backend
const lineResponse = await this.apiRequest(`/api/line/members/${this.currentGroupId}`);

// Response:
{
  success: true,
  data: [
    {
      userId: "U123...",
      displayName: "John",
      picture: "https://...",
      source: "line_api"
    }
  ]
}
```

**เหตุผล:**
- แดชบอร์ดไม่ได้ฝังอยู่ใน LINE app
- เป็นเว็บแอปแบบ standalone
- ผู้ใช้เข้าผ่านลิงก์ที่ LINE ส่ง (เปิดใน browser)
- Backend จัดการ LINE API เพื่อความปลอดภัย

### 3.4 การดึงรายชื่อสมาชิกจาก LINE

```javascript
// Hybrid approach: ลอง LINE API ก่อน, ถ้าไม่ได้ใช้ database
async loadGroupMembers() {
  try {
    // ลอง LINE API ก่อน
    const lineResponse = await this.apiRequest(
      `/api/line/members/${this.currentGroupId}`
    );
    
    if (lineResponse && lineResponse.data && lineResponse.data.length > 0) {
      console.log(`✅ ดึงจาก LINE API: ${lineResponse.data.length} คน`);
      return lineResponse.data;
    }
  } catch (lineError) {
    console.warn('⚠️ LINE API ไม่ทำงาน ใช้ database แทน:', lineError);
    
    // Fallback ไปใช้ database
    const response = await this.apiRequest(
      `/api/groups/${this.currentGroupId}/members`
    );
    return response.data;
  }
}
```

---

## ✨ 4. ฟีเจอร์และการทำงาน

### 4.1 Views ทั้งหมด (7 หน้า)

#### 1️⃣ Dashboard View (`#dashboard`)
**ฟีเจอร์:**
- สถิติการ์ด: งานทั้งหมด, เสร็จแล้ว, รอดำเนินการ, ใกล้ครบกำหนด
- สถิติแยกตามช่วงเวลา (สัปดาห์นี้, สัปดาห์ที่แล้ว, ทั้งหมด)
- รายการงานล่าสุด
- Preview Leaderboard (Top 3)
- ไฟล์ล่าสุด
- ปุ่มลัดทาง: Refresh, Submit, Export

#### 2️⃣ Calendar View (`#calendar`)
**ฟีเจอร์:**
- ปฏิทินรายเดือนพร้อมตัวบ่งชี้งาน
- นำทางเดือน (ก่อนหน้า/ถัดไป)
- คลิกวันเพื่อดูงานในวันนั้น
- สัญลักษณ์แสดงสถานะงาน

#### 3️⃣ Tasks View (`#tasks`)
**ฟีเจอร์:**
- รายการงานทั้งหมดพร้อมกรอง
- ตัวกรอง: สถานะ (ทั้งหมด, รอดำเนินการ, รอตรวจ, เสร็จแล้ว), ค้นหา
- รองรับ Pagination
- คลิกเพื่อดูรายละเอียด
- ส่งออกข้อมูล

#### 4️⃣ Recurring Tasks View (`#recurring`)
**ฟีเจอร์:**
- สร้างงานประจำใหม่
- ดูงานประจำทั้งหมดพร้อมข้อมูลกำหนดการ
- เปิด/ปิดงานประจำ
- แก้ไขรูปแบบการทำซ้ำ (รายสัปดาห์, รายเดือน, รายไตรมาส)
- ลบงานประจำ
- ดูประวัติการทำงาน

#### 5️⃣ Files View (`#files`)
**ฟีเจอร์:**
- เรียกดูไฟล์ที่อัพโหลด
- ตัวกรอง: ตามงาน, ตามประเภทไฟล์
- ค้นหาไฟล์
- ดาวน์โหลดไฟล์
- แสดงตัวอย่างไฟล์ (รูปภาพ, PDF)
- อัพโหลดไฟล์

#### 6️⃣ Leaderboard View (`#leaderboard`)
**ฟีเจอร์:**
- รายชื่อผู้ใช้จัดอันดับตามอัตราความสำเร็จ
- เลือกช่วงเวลา: รายสัปดาห์, รายเดือน, ทั้งหมด
- แสดง: ชื่อผู้ใช้, คะแนน, อัตราความสำเร็จ
- เหรียญทอง/เงิน/ทองแดง สำหรับ Top 3

#### 7️⃣ Reports View (`#reports`)
**ฟีเจอร์:**
- สถิติความสำเร็จของกลุ่ม
- รายงานประสิทธิภาพผู้ใช้
- กราฟแสดงผลตามเวลา
- ส่งออกรายงาน

### 4.2 การดำเนินการที่มี (Actions)

| การดำเนินการ | ต้องการ userId | ต้องการ groupId | API ที่ใช้ |
|--------------|---------------|----------------|-----------|
| **สร้างงาน** | ✅ | ✅ | `POST /api/groups/{id}/tasks` |
| **แก้ไขงาน** | ✅ (ถ้าเป็นเจ้าของ) | ✅ | `PATCH /api/groups/{id}/tasks/{id}` |
| **ลบงาน** | ✅ (ถ้าเป็นเจ้าของ) | ✅ | `DELETE /api/groups/{id}/tasks/{id}` |
| **ส่งงาน** | ⚠️ (แนะนำให้มี) | ✅ | `POST /api/dashboard/tasks/{id}/submit` |
| **ตรวจงาน** | ✅ (ถ้าเป็นผู้ตรวจ) | ✅ | `POST /api/groups/{id}/tasks/{id}/review` |
| **ดูงาน** | ❌ | ✅ | `GET /api/groups/{id}/tasks` |
| **ดาวน์โหลดไฟล์** | ❌ | ✅ | `GET /api/groups/{id}/files/{id}/download` |
| **อัพโหลดไฟล์** | ✅ | ✅ | `POST /api/groups/{id}/files/upload` |
| **สร้างงานประจำ** | ✅ | ✅ | `POST /api/groups/{id}/recurring` |
| **เชิญสมาชิก** | ✅ (admin) | ✅ | `POST /api/groups/{id}/invite` |
| **ดูโปรไฟล์** | ✅ | ❌ | `GET /api/users/{id}` |

**หมายเหตุ:** แดชบอร์ดเก่าอนุญาตให้ส่งงานโดยไม่มี userId (ใช้ 'unknown' หรือ groupId แทน) แต่แดชบอร์ดใหม่ควรต้องการ userId เพื่อระบุผู้ส่งอย่างชัดเจน

### 4.3 Modals ทั้งหมด

```javascript
// จาก index.html
const modals = [
  'addTaskModal',        // สร้างงานใหม่
  'editTaskModal',       // แก้ไขงาน
  'taskModal',           // ดูรายละเอียดงาน & ส่งงาน
  'submitTaskModal',     // ส่งงานพร้อมไฟล์
  'reviewTaskModal',     // ตรวจงาน
  'fileViewerModal',     // แสดงตัวอย่างไฟล์
  'successModal'         // ยืนยันความสำเร็จ
];
```

**ตัวอย่าง Form - Add Task Modal:**
```javascript
{
  taskTitle: string,           // ชื่องาน
  taskDescription: string,     // รายละเอียด
  taskDueDate: date,          // วันครบกำหนด
  assigneeIds: array,         // ผู้รับมอบหมาย
  reviewerSelect: userId,     // ผู้ตรวจ
  initialFiles: fileArray,    // ไฟล์เริ่มต้น
  recurrencePattern: 'weekly|monthly|quarterly'  // รูปแบบการทำซ้ำ
}
```

---

## 🔌 5. การเชื่อมต่อ API

### 5.1 API Endpoints ทั้งหมด

#### กลุ่ม (Groups)
```
GET    /api/groups/{groupId}                    - ข้อมูลกลุ่ม
GET    /api/groups/{groupId}/members            - รายชื่อสมาชิก
GET    /api/groups/{groupId}/stats?period=X     - สถิติ
GET    /api/line/members/{groupId}              - สมาชิกจาก LINE API
```

#### งาน (Tasks)
```
GET    /api/groups/{groupId}/tasks              - รายการงาน (พร้อมกรอง/แบ่งหน้า)
POST   /api/groups/{groupId}/tasks              - สร้างงาน
PATCH  /api/groups/{groupId}/tasks/{taskId}     - แก้ไขงาน
DELETE /api/groups/{groupId}/tasks/{taskId}     - ลบงาน
GET    /api/groups/{groupId}/tasks/{taskId}     - รายละเอียดงาน
POST   /api/dashboard/tasks/{taskId}/submit     - ส่งงาน
POST   /api/groups/{groupId}/tasks/{taskId}/review - ตรวจงาน
```

#### ไฟล์ (Files)
```
GET    /api/groups/{groupId}/files              - รายการไฟล์
POST   /api/groups/{groupId}/files/upload       - อัพโหลดไฟล์
GET    /api/groups/{groupId}/files/{fileId}/download     - ดาวน์โหลด
GET    /api/groups/{groupId}/files/{fileId}/preview      - ดูตัวอย่าง
GET    /api/groups/{groupId}/tasks/{taskId}/files        - ไฟล์ของงาน
```

#### ปฏิทิน (Calendar)
```
GET    /api/groups/{groupId}/calendar?month=X&year=Y    - ข้อมูลปฏิทิน
```

#### งานประจำ (Recurring)
```
GET    /api/groups/{groupId}/recurring         - รายการงานประจำ
POST   /api/groups/{groupId}/recurring         - สร้างงานประจำ
PATCH  /api/recurring/{id}                     - แก้ไขงานประจำ
DELETE /api/recurring/{id}                     - ลบงานประจำ
GET    /api/recurring/{id}                     - รายละเอียด
GET    /api/recurring/{id}/history             - ประวัติการทำงาน
GET    /api/recurring/{id}/stats               - สถิติ
```

#### Leaderboard
```
GET    /api/groups/{groupId}/leaderboard?period=X&limit=Y
```

#### ผู้ใช้ (Users)
```
GET    /api/users/{userId}                    - ข้อมูลผู้ใช้
PUT    /api/users/{userId}                    - แก้ไขโปรไฟล์
GET    /api/users/{userId}/groups             - กลุ่มของผู้ใช้
```

#### สมาชิก (Members)
```
POST   /api/groups/{groupId}/invite           - เชิญสมาชิก
GET    /api/line/members/{groupId}            - สมาชิก LINE
```

### 5.2 รูปแบบ Request/Response

**Request มาตรฐาน:**
```javascript
// ตัวอย่าง: สร้างงานพร้อม parameters ทั้งหมด
const payload = {
  title: "ทำรายงาน",
  description: "รายงานรายไตรมาส",
  dueDate: "2024-12-31",
  createdBy: "U456def...",           // LINE User ID
  assigneeIds: ["U111...", "U222..."],
  groupId: "C123abc...",             // LINE Group ID
  reviewerId: "U789...",
  files: FormData                    // ถ้ามีไฟล์
};

// ส่งไปที่: POST /api/groups/{groupId}/tasks
```

**Response มาตรฐาน:**
```javascript
// สำเร็จ
{
  success: true,
  data: { /* ข้อมูล object */ },
  error: null,
  message: "สร้างงานสำเร็จ"
}

// ผิดพลาด
{
  success: false,
  data: null,
  error: "ข้อความ error ภาษาไทย",
  message: "เกิดข้อผิดพลาด"
}
```

### 5.3 วิธีส่ง userId/groupId

**วิธีที่ 1: Query Parameters (ใช้บ่อยที่สุด)**
```javascript
const url = `/api/groups/${this.currentGroupId}/tasks`;
// groupId อยู่ใน URL
// userId อาจอยู่ใน body หรือ Authorization header
```

**วิธีที่ 2: ใน Request Body**
```javascript
formData.append('userId', this.currentUserId);
formData.append('groupId', this.currentGroupId);

// สำหรับ JSON
{
  groupId: this.currentGroupId,
  userId: this.currentUserId,
  ...otherData
}
```

**วิธีที่ 3: Authorization Header**
```javascript
fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### 5.4 รูปแบบการอัพโหลดไฟล์

```javascript
// จาก script.js - handleAddTask
const url = `/api/groups/${this.currentGroupId}/files/upload`;
const formData = new FormData();
formData.append('userId', this.currentUserId);
formData.append('taskId', taskId);
formData.append('files', fileInput.files[0]);

const response = await fetch(url, {
  method: 'POST',
  body: formData  // อย่าตั้ง Content-Type สำหรับ FormData
});
```

---

## 💡 6. รูปแบบโค้ดสำคัญที่ควรทำตาม

### 6.1 การเริ่มต้น Dashboard

```javascript
class Dashboard {
  constructor() {
    this.currentGroupId = this.getGroupIdFromUrl();  // จาก ?groupId=
    this.currentUserId = this.getUserIdFromUrl();    // จาก ?userId=
    this.initialAction = this.getActionFromUrl();    // จาก ?action=
    this.apiBase = window.location.origin;
  }
  
  init() {
    this.closeAllModals();
    this.bindEvents();
    this.loadInitialData();
    
    // ตรวจสอบสิทธิ์
    if (!this.currentUserId) {
      this.showReadOnlyBanner();
      this.disableUserRequiredButtons();
    }
  }
}
```

### 6.2 การตรวจสอบสิทธิ์

```javascript
canUserAction(action) {
  if (action === 'create' || action === 'edit' || action === 'delete') {
    return !!this.currentUserId;
  }
  if (action === 'view' || action === 'submit') {
    return !!this.currentGroupId;
  }
  return false;
}

// ใช้กับ UI
if (!this.currentUserId) {
  document.getElementById('addTaskBtn').disabled = true;
} else {
  document.getElementById('addTaskBtn').disabled = false;
}
```

### 6.3 การเรียก API

```javascript
async apiRequest(endpoint, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : undefined;
  
  try {
    const response = await fetch(`${this.apiBase}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    throw error;
  }
}
```

### 6.4 การจัดการ Modal

```javascript
// ปิดทั้งหมดก่อนเปิดใหม่
closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
    modal.style.display = 'none';
  });
}

// เปิด modal เฉพาะ
openModal(modalId) {
  this.closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}
```

### 6.5 การส่ง Form

```javascript
async handleAddTask() {
  // ป้องกันการส่งซ้ำ
  if (this._isHandlingAddTask) return;
  this._isHandlingAddTask = true;
  
  try {
    // รวบรวมข้อมูลจาก form
    const formData = new FormData();
    formData.append('title', document.getElementById('taskTitle').value);
    formData.append('userId', this.currentUserId || 'unknown');
    formData.append('groupId', this.currentGroupId);
    
    // ส่ง request
    const response = await this.apiRequest(
      `/api/groups/${this.currentGroupId}/tasks`, 
      {
        method: 'POST',
        body: Object.fromEntries(formData)
      }
    );
    
    // แสดงความสำเร็จ
    this.showModal('successModal');
    this.closeModal('addTaskModal');
  } catch (error) {
    this.showToast(error.message, 'error');
  } finally {
    this._isHandlingAddTask = false;
  }
}
```

---

## 📊 7. ตารางเปรียบเทียบฟีเจอร์

| ฟีเจอร์ | userId + groupId | groupId อย่างเดียว | หมายเหตุ |
|---------|-----------------|-------------------|---------|
| **ดู Dashboard** | ✅ | ✅ | แสดงสถิติเต็มหรือจำกัด |
| **ดูรายการงาน** | ✅ | ✅ | ดูงานทั้งหมดในกลุ่ม |
| **ดูรายละเอียดงาน** | ✅ | ✅ | ดูรายละเอียดทั้งหมด |
| **สร้างงาน** | ✅ | ❌ | ต้องระบุผู้สร้าง |
| **แก้ไขงาน** | ✅ (ถ้าเป็นเจ้าของ) | ❌ | เฉพาะผู้สร้างแก้ไขได้ |
| **ลบงาน** | ✅ (ถ้าเป็นเจ้าของ) | ❌ | เฉพาะผู้สร้างลบได้ |
| **มอบหมายงาน** | ✅ | ❌ | ต้องระบุผู้มอบหมาย |
| **ส่งงาน** | ✅ | ⚠️ ✅ | **แดชบอร์ดเก่าอนุญาต แต่ควรต้องการ userId** |
| **ตรวจงาน** | ✅ (ถ้าเป็นผู้ตรวจ) | ❌ | ต้องระบุผู้ตรวจ |
| **อัพโหลดไฟล์** | ✅ | ❌ | ต้องระบุผู้อัพโหลด |
| **ดาวน์โหลดไฟล์** | ✅ | ✅ | ทุกคนดาวน์โหลดได้ |
| **ดูสมาชิก** | ✅ | ✅ | อ่านอย่างเดียวหรือจัดการ |
| **เชิญสมาชิก** | ✅ (admin) | ❌ | การดำเนินการของ admin |
| **ดูปฏิทิน** | ✅ | ✅ | ปฏิทินเหมือนกัน |
| **ดู Leaderboard** | ✅ | ✅ | Leaderboard เหมือนกัน |
| **สร้างงานประจำ** | ✅ | ❌ | ต้องระบุผู้สร้าง |
| **ดูโปรไฟล์** | ✅ | ❌ | ข้อมูลส่วนตัว |

---

## ⚠️ 8. การจัดการ Error และกรณีพิเศษ

### 8.1 จัดการเมื่อไม่มี userId

```javascript
if (!this.currentUserId) {
  // แสดง banner
  const banner = document.getElementById('readOnlyBanner');
  banner.style.display = 'block';
  
  // ซ่อนรูปผู้ใช้
  const userBadge = document.getElementById('currentUserBadge');
  userBadge.classList.add('hidden');
  
  // Disable ปุ่ม
  ['addTaskBtn', 'addRecurringBtn', 'inviteMemberBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
  });
}
```

### 8.2 Fallback เมื่อ API ผิดพลาด

```javascript
// LINE API ล้มเหลว - ใช้ database แทน
async loadGroupMembers() {
  try {
    const lineMembers = await this.apiRequest(
      `/api/line/members/${this.currentGroupId}`
    );
    return lineMembers.data;
  } catch (error) {
    console.warn('LINE API ล้มเหลว ใช้ database:', error);
    
    // Fallback
    const dbMembers = await this.apiRequest(
      `/api/groups/${this.currentGroupId}/members`
    );
    return dbMembers.data;
  }
}
```

### 8.3 จัดการ Timezone

```javascript
// ทุก timestamp ใช้ timezone กรุงเทพฯ
const THAILAND_TIMEZONE = 'Asia/Bangkok';
const THAILAND_UTC_OFFSET = 7;

// เริ่มต้น moment.js พร้อม timezone
if (window.moment && window.moment.tz) {
  moment.tz.setDefault(THAILAND_TIMEZONE);
}
```

---

## ✅ 9. สิ่งที่ควรทำตาม

**ต้องทำตาม:**

1. ✅ อ่าน URL parameters: `?groupId=X&userId=Y&action=Z`
2. ✅ ระบบสิทธิ์ 3 โหมด (Full, Group-Only, None)
3. ✅ Disable UI elements ตาม userId
4. ✅ ส่งงานโดยไม่มี userId (แต่ควรแก้ไขให้ต้องการ userId)
5. ✅ ดึงรายชื่อสมาชิก LINE ผ่าน backend API (ไม่ใช่ LIFF)
6. ✅ ใช้ FormData สำหรับอัพโหลดไฟล์
7. ✅ ปิด modals ทั้งหมดก่อนเปิดใหม่
8. ✅ เข้าถึงผ่านลิงก์จาก LINE (ไม่ฝังใน LINE)
9. ✅ จัดการ timezone (Bangkok/Asia)
10. ✅ รูปแบบ API endpoint: `/api/groups/{id}/{resource}`

**ไม่ควรทำตาม (Anti-patterns):**

1. ❌ ผสม HTML modals กับ states หลายแบบ
2. ❌ ใช้ `onclick="app.method()"` (ควรใช้ event delegation)
3. ❌ Hardcode emoji ใน CSS (ใช้ icons ที่เหมาะสม)
4. ❌ Inline styles ทุกที่ (theming ไม่สอดคล้อง)
5. ❌ สร้าง DOM ด้วย template strings (เสี่ยง XSS)
6. ❌ ไม่มี validation ฝั่ง client ก่อนส่ง form

---

## 📍 10. ตำแหน่งไฟล์อ้างอิง

ไฟล์ทั้งหมดอยู่ที่: `/Users/mac/pp/leka_bot/dashboard/`

**ไฟล์สำคัญสำหรับอ้างอิง:**
- ตรรกะหลัก: `/Users/mac/pp/leka_bot/dashboard/script.js`
- โครงสร้าง HTML: `/Users/mac/pp/leka_bot/dashboard/index.html`
- หน้าส่งงาน: `/Users/mac/pp/leka_bot/dashboard/submit-tasks.html`
- ตรรกะงานประจำ: `/Users/mac/pp/leka_bot/dashboard/recurring-tasks.js`
- หน้าโปรไฟล์: `/Users/mac/pp/leka_bot/dashboard/profile.html`

---

## 🎯 สรุป

เอกสารนี้วิเคราะห์แดชบอร์ดเก่าอย่างครบถ้วน เพื่อใช้เป็นพิมพ์เขียวสำหรับ:

1. **การพัฒนาแดชบอร์ดใหม่** ให้มีฟีเจอร์ครบเหมือนเดิม
2. **การรักษาความเข้ากันได้กับ API** ของ backend
3. **การจัดการสิทธิ์** ที่ถูกต้องตามบริบท (Personal vs Group)
4. **การเปิดจาก LINE** โดยไม่ใช้ LIFF
5. **UX ที่คุ้นเคย** สำหรับผู้ใช้ปัจจุบัน

แดชบอร์ดใหม่ควรปรับปรุงประสบการณ์ผู้ใช้ด้วย React และ modern UI แต่รักษาการทำงานหลักเหมือนเดิมทุกประการ

---

**ผู้วิเคราะห์**: Leka Bot Development Team  
**วันที่**: 2025-01-XX  
**เวอร์ชัน**: 1.0
