# 🚀 แผนการพัฒนาแดชบอร์ดใหม่ให้เทียบเท่าแดชบอร์ดเก่า

**วันที่**: 2025-01-XX  
**สถานะ**: กำลังดำเนินการ  
**เป้าหมาย**: ทำให้แดชบอร์ดใหม่เปิดจาก LINE แล้วใช้งานได้เหมือนแดชบอร์ดเก่าเต็มรูปแบบ

---

## 📊 สถานะปัจจุบัน

### ✅ สิ่งที่มีอยู่แล้ว (Foundation)

1. **AuthContext ครบถ้วน** ✅
   - `hasPermission(action)` - ตรวจสอบสิทธิ์ตาม action
   - `canModify()` - ตรวจว่าสามารถแก้ไขได้หรือไม่
   - `isPersonalMode()` / `isGroupMode()` - แยกโหมด
   - `userId`, `groupId` - อ่านจาก URL แล้ว
   - Permission lists ถูกต้อง (รวม `submit_task` ต้องการ userId แล้ว)

2. **Components ที่ implement permissions ถูกต้อง** ✅
   - `AddTaskModal.jsx` - ตรวจสอบสิทธิ์สร้างงาน
   - `MemberActionsModal.jsx` - ตรวจสอบสิทธิ์จัดการสมาชิก
   - `InviteMemberModal.jsx` - ตรวจสอบสิทธิ์เชิญสมาชิก
   - `FilesView.jsx` - ตรวจสอบสิทธิ์อัพโหลด/ลบไฟล์
   - `RecurringTasksView.jsx` - ตรวจสอบสิทธิ์จัดการงานประจำ
   - `RecurringTaskModal.jsx` - ตรวจสอบสิทธิ์ (เกือบสมบูรณ์)
   - `ReadOnlyBanner.jsx` - แสดงข้อมูลสิทธิ์ถูกต้อง

3. **Toast System** ✅
   - `react-hot-toast` ติดตั้งแล้ว
   - Helper functions ครบ 12 ตัว

### ⚠️ ปัญหาที่พบ (Gaps)

#### 🔴 CRITICAL - ต้องแก้ทันที

1. **EditTaskModal.jsx** - ไม่มีการตรวจสอบสิทธิ์เลย
   - ❌ ไม่มี `hasPermission('edit_task')`
   - ❌ ไม่มี `canModify()` check
   - ❌ ไม่มี UI warning สำหรับ read-only mode
   - ❌ Form ไม่ถูก disable

2. **TaskDetailModal.jsx** - ปุ่มทั้งหมดไม่ตรวจสอบสิทธิ์
   - ❌ ปุ่ม "แก้ไข" ไม่ตรวจสอบ `canModify()`
   - ❌ ปุ่ม "ลบ" ไม่ตรวจสอบ `canModify()`
   - ❌ ปุ่ม "อนุมัติ/ปฏิเสธ" ไม่ตรวจสอบสิทธิ์

3. **SubmitTaskModal.jsx** - การตรวจสอบอ่อนแอ
   - ⚠️ ใช้ userId แต่ไม่ตรวจว่ามีจริงหรือไม่
   - ❌ ไม่มี `hasPermission('submit_task')` check
   - ❌ ไม่มี UI warning

#### 🟡 HIGH PRIORITY - ควรแก้เร็ว

4. **TableView.jsx** (ใน TasksView)
   - ❌ ปุ่ม action ไม่ตรวจสอบสิทธิ์

5. **KanbanView.jsx** (ใน TasksView)
   - ❌ Drag-and-drop อาจทำงานได้โดยไม่มีสิทธิ์

6. **RecurringTaskModal.jsx**
   - ⚠️ ไม่มี UI warning สำหรับ read-only mode

---

## 🎯 แผนการพัฒนา (Development Roadmap)

### Phase 1: แก้ไข Critical Issues (1-2 ชั่วโมง)

#### Task 1.1: แก้ไข EditTaskModal.jsx
**ไฟล์**: `src/components/modals/EditTaskModal.jsx`

**การเปลี่ยนแปลง:**
```javascript
// 1. Import useAuth
import { useAuth } from '../../context/AuthContext';

// 2. เพิ่มการตรวจสอบสิทธิ์
const { groupId, userId, canModify, hasPermission } = useAuth();

// 3. เพิ่มใน handleSubmit
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!hasPermission('edit_task')) {
    showError('คุณไม่มีสิทธิ์แก้ไขงาน');
    return;
  }
  
  // ... rest of logic
};

// 4. เพิ่ม UI warning
{!canModify() && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      คุณไม่มีสิทธิ์แก้ไขงาน กรุณาเข้าผ่าน LINE ส่วนตัว
    </AlertDescription>
  </Alert>
)}

// 5. Disable form inputs
<Input disabled={!canModify()} />
<Textarea disabled={!canModify()} />
<Button disabled={loading || !canModify()}>บันทึก</Button>
```

**ตรวจสอบ:**
- [ ] ทดสอบเปิด modal โดยไม่มี userId → ควรแสดง warning และ disable form
- [ ] ทดสอบแก้ไขงานด้วย userId → ควรทำงานปกติ
- [ ] ตรวจสอบ toast แสดงเมื่อไม่มีสิทธิ์

---

#### Task 1.2: แก้ไข TaskDetailModal.jsx
**ไฟล์**: `src/components/modals/TaskDetailModal.jsx`

**การเปลี่ยนแปลง:**
```javascript
// 1. Import useAuth
import { useAuth } from '../../context/AuthContext';

// 2. เพิ่มการตรวจสอบสิทธิ์
const { groupId, userId, canModify } = useAuth();

// 3. แก้ไข handleEdit
const handleEdit = () => {
  if (!canModify()) {
    showWarning('คุณไม่มีสิทธิ์แก้ไขงาน');
    return;
  }
  openEditTask(task);
};

// 4. แก้ไข handleDelete
const handleDelete = () => {
  if (!canModify()) {
    showWarning('คุณไม่มีสิทธิ์ลบงาน');
    return;
  }
  
  openConfirmDialog({
    title: 'ยืนยันการลบงาน',
    message: 'คุณแน่ใจหรือไม่?',
    onConfirm: async () => {
      // ... delete logic
    }
  });
};

// 5. Disable ปุ่มตามสิทธิ์
<Button 
  variant="outline" 
  size="sm" 
  onClick={handleEdit}
  disabled={!canModify()}
  title={!canModify() ? 'ไม่มีสิทธิ์' : 'แก้ไขงาน'}
>
  <Edit className="w-4 h-4 mr-1" />
  แก้ไข
</Button>

<Button 
  variant="outline" 
  size="sm" 
  onClick={handleDelete}
  disabled={loading || !canModify()}
  title={!canModify() ? 'ไม่มีสิทธิ์' : 'ลบงาน'}
>
  <Trash2 className="w-4 h-4 mr-1" />
  ลบ
</Button>
```

**ตรวจสอบ:**
- [ ] ปุ่มแก้ไข/ลบถูก disable เมื่อไม่มี userId
- [ ] แสดง toast warning เมื่อคลิกปุ่มที่ disable
- [ ] ปุ่มทำงานปกติเมื่อมี userId

---

#### Task 1.3: แก้ไข SubmitTaskModal.jsx
**ไฟล์**: `src/components/modals/SubmitTaskModal.jsx`

**การเปลี่ยนแปลง:**
```javascript
// 1. Import useAuth
import { useAuth } from '../../context/AuthContext';

// 2. เพิ่มการตรวจสอบสิทธิ์
const { groupId, userId, hasPermission } = useAuth();

// 3. ตรวจสอบตั้งแต่ต้น modal
if (!hasPermission('submit_task')) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>ไม่สามารถส่งงานได้</AlertTitle>
        <AlertDescription>
          คุณต้องเข้าผ่าน LINE ส่วนตัวเพื่อส่งงาน (ต้องการ userId)
        </AlertDescription>
      </Alert>
      <Button onClick={onClose}>ปิด</Button>
    </Modal>
  );
}

// 4. เพิ่มใน handleSubmit
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Double check permission
  if (!hasPermission('submit_task')) {
    showError('ไม่มีสิทธิ์ส่งงาน');
    return;
  }
  
  // Verify userId exists
  if (!userId) {
    showError('ต้องมี userId เพื่อส่งงาน');
    return;
  }
  
  // ... rest of logic
  formData.append('submittedBy', userId);
};

// 5. แสดง warning ใน UI
{!hasPermission('submit_task') && (
  <Alert variant="warning" className="mb-4">
    <AlertDescription>
      โหมดดูอย่างเดียว - ไม่สามารถส่งงานได้
    </AlertDescription>
  </Alert>
)}
```

**ตรวจสอบ:**
- [ ] Modal แสดง warning เมื่อไม่มี userId
- [ ] ไม่สามารถส่ง form ได้เมื่อไม่มี userId
- [ ] แสดง toast error ชัดเจน
- [ ] ส่งงานได้ปกติเมื่อมี userId

---

### Phase 2: แก้ไข High Priority (2-3 ชั่วโมง)

#### Task 2.1: ตรวจสอบและแก้ไข TableView.jsx
**ไฟล์**: `src/components/tasks/TableView.jsx`

**จุดที่ต้องเช็ค:**
- ปุ่ม Edit ในแต่ละแถว
- ปุ่ม Delete ในแต่ละแถว  
- Quick actions (ถ้ามี)

**การเปลี่ยนแปลง:**
```javascript
const { canModify } = useAuth();

// แก้ไข action column
{
  accessorKey: 'actions',
  cell: ({ row }) => (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="ghost"
        onClick={() => handleEdit(row.original)}
        disabled={!canModify()}
        title={!canModify() ? 'ไม่มีสิทธิ์' : 'แก้ไข'}
      >
        <Edit className="w-4 h-4" />
      </Button>
      <Button 
        size="sm" 
        variant="ghost"
        onClick={() => handleDelete(row.original)}
        disabled={!canModify()}
        title={!canModify() ? 'ไม่มีสิทธิ์' : 'ลบ'}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
```

---

#### Task 2.2: ตรวจสอบและแก้ไข KanbanView.jsx
**ไฟล์**: `src/components/tasks/KanbanView.jsx`

**จุดที่ต้องเช็ค:**
- Drag and drop cards
- Edit/Delete buttons บนการ์ด
- เปลี่ยนสถานะงาน

**การเปลี่ยนแปลง:**
```javascript
const { canModify } = useAuth();

// Disable drag when no permission
const canDrag = canModify();

<DndContext 
  onDragEnd={canDrag ? handleDragEnd : undefined}
  // ...
>

// แก้ไข card actions
<Button 
  onClick={() => handleEdit(task)}
  disabled={!canModify()}
>
  แก้ไข
</Button>
```

---

#### Task 2.3: เพิ่ม UI Warning ให้ RecurringTaskModal
**ไฟล์**: `src/components/recurring/RecurringTaskModal.jsx`

**การเปลี่ยนแปลง:**
```javascript
// เพิ่ม UI warning
{!canModify() && (
  <Alert variant="warning" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      คุณไม่มีสิทธิ์สร้าง/แก้ไขงานประจำ กรุณาเข้าผ่าน LINE ส่วนตัว
    </AlertDescription>
  </Alert>
)}

// Disable form
const hasPermission = canModify();
<Input disabled={!hasPermission} />
<Select disabled={!hasPermission} />
```

---

### Phase 3: การทดสอบและ Documentation (1-2 ชั่วโมง)

#### Task 3.1: สร้าง Test Cases

**Test Scenarios:**

1. **Group Mode (Read-Only)**
   ```
   URL: ?groupId=C123456
   Expected:
   - ✅ ดูข้อมูลได้
   - ❌ ไม่สามารถสร้าง/แก้ไข/ลบงาน
   - ❌ ไม่สามารถส่งงาน
   - ❌ ไม่สามารถอัพโหลดไฟล์
   - ✅ แสดง Read-Only Banner
   ```

2. **Personal Mode (Full Access)**
   ```
   URL: ?groupId=C123456&userId=U789012
   Expected:
   - ✅ ดูข้อมูลได้
   - ✅ สร้าง/แก้ไข/ลบงาน
   - ✅ ส่งงาน
   - ✅ อัพโหลดไฟล์
   - ❌ ไม่แสดง Read-Only Banner
   ```

3. **LINE Integration Test**
   ```
   - เปิดจากปุ่มใน LINE → ควรได้ userId + groupId
   - เปิดจากกลุ่ม → ควรได้แค่ groupId
   - localStorage persistence test
   ```

#### Task 3.2: อัพเดทเอกสาร

**เอกสารที่ต้องอัพเดท:**

1. **PROGRESS.md**
   - บันทึกความคืบหน้า Phase 1-3
   - อัพเดท % ความสำเร็จ
   - เพิ่ม checklist การแก้ไข

2. **LINE_INTEGRATION.md**
   - อัพเดทสถานะการ implement
   - เพิ่มตัวอย่างการทดสอบ
   - เพิ่ม troubleshooting

3. **MIGRATION_PLAN.md** (เอกสารนี้)
   - อัพเดทสถานะแต่ละ task
   - เพิ่มผลการทดสอบ

---

## 📋 Checklist การพัฒนา

### Phase 1: Critical Fixes ⚠️

- [ ] **EditTaskModal.jsx**
  - [ ] เพิ่ม `useAuth` hook
  - [ ] เพิ่มการตรวจสอบสิทธิ์ใน handleSubmit
  - [ ] เพิ่ม UI warning สำหรับ read-only
  - [ ] Disable form inputs เมื่อไม่มีสิทธิ์
  - [ ] ทดสอบ Group Mode → ต้อง disable
  - [ ] ทดสอบ Personal Mode → ต้องใช้งานได้
  - [ ] เพิ่ม toast notifications

- [ ] **TaskDetailModal.jsx**
  - [ ] เพิ่ม `useAuth` hook
  - [ ] แก้ไข handleEdit ให้ตรวจสอบ `canModify()`
  - [ ] แก้ไข handleDelete ให้ตรวจสอบ `canModify()`
  - [ ] แก้ไข handleApprove (ถ้ามี) ให้ตรวจสอบสิทธิ์
  - [ ] Disable ปุ่มแก้ไข/ลบเมื่อไม่มีสิทธิ์
  - [ ] เพิ่ม tooltip อธิบายเมื่อปุ่ม disabled
  - [ ] ทดสอบทุกปุ่ม

- [ ] **SubmitTaskModal.jsx**
  - [ ] เพิ่ม `useAuth` hook  
  - [ ] เพิ่มการตรวจสอบ `hasPermission('submit_task')`
  - [ ] ตรวจว่า userId มีค่าก่อนส่ง
  - [ ] เพิ่ม UI warning สำหรับ read-only
  - [ ] แสดง error ชัดเจนเมื่อไม่มี userId
  - [ ] ทดสอบ Group Mode → ไม่สามารถส่งได้
  - [ ] ทดสอบ Personal Mode → ส่งได้ปกติ

### Phase 2: High Priority 🟡

- [ ] **TableView.jsx**
  - [ ] หา file ที่ใช้ table view
  - [ ] เพิ่ม `useAuth` hook
  - [ ] Disable action buttons ตาม `canModify()`
  - [ ] เพิ่ม tooltips
  - [ ] ทดสอบ

- [ ] **KanbanView.jsx**
  - [ ] หา file ที่ใช้ kanban view
  - [ ] เพิ่ม `useAuth` hook
  - [ ] Disable drag-and-drop เมื่อไม่มีสิทธิ์
  - [ ] Disable card actions
  - [ ] ทดสอบ

- [ ] **RecurringTaskModal.jsx**
  - [ ] เพิ่ม UI warning banner
  - [ ] Disable form inputs อย่างชัดเจน
  - [ ] ทดสอบ

### Phase 3: Testing & Documentation 📚

- [ ] **การทดสอบ**
  - [ ] สร้าง test URL สำหรับ Group Mode
  - [ ] สร้าง test URL สำหรับ Personal Mode
  - [ ] ทดสอบทุก modal
  - [ ] ทดสอบทุกปุ่ม action
  - [ ] ทดสอบ localStorage persistence
  - [ ] ทดสอบเปิดจาก LINE จริง (ถ้าทำได้)
  - [ ] ทดสอบทุก toast notification
  - [ ] ทดสอบ error handling

- [ ] **อัพเดทเอกสาร**
  - [ ] PROGRESS.md - บันทึกความคืบหน้า
  - [ ] LINE_INTEGRATION.md - อัพเดทสถานะ
  - [ ] MIGRATION_PLAN.md - Mark tasks เสร็จ
  - [ ] สร้าง TESTING_GUIDE.md (ถ้าจำเป็น)

---

## 🎯 ตารางเปรียบเทียบ: ก่อนและหลังการแก้ไข

| Component | ก่อนแก้ไข | หลังแก้ไข | สถานะ |
|-----------|-----------|-----------|-------|
| **AddTaskModal** | ✅ มี permission check | ✅ มี permission check | ไม่ต้องแก้ |
| **EditTaskModal** | ❌ ไม่มี permission check | ✅ เพิ่ม permission check | 🔧 ต้องแก้ |
| **TaskDetailModal** | ❌ ปุ่มไม่ตรวจสอบสิทธิ์ | ✅ ปุ่มตรวจสอบแล้ว | 🔧 ต้องแก้ |
| **SubmitTaskModal** | ⚠️ ตรวจสอบอ่อนแอ | ✅ ตรวจสอบเข้มงวด | 🔧 ต้องแก้ |
| **MemberActionsModal** | ✅ มี permission check | ✅ มี permission check | ไม่ต้องแก้ |
| **InviteMemberModal** | ✅ มี permission check | ✅ มี permission check | ไม่ต้องแก้ |
| **FilesView** | ✅ มี permission check | ✅ มี permission check | ไม่ต้องแก้ |
| **RecurringTasksView** | ✅ มี permission check | ✅ มี permission check | ไม่ต้องแก้ |
| **RecurringTaskModal** | ⚠️ ไม่มี UI warning | ✅ เพิ่ม UI warning | 🔧 ควรแก้ |
| **TableView** | ⚠️ ต้องตรวจสอบ | ✅ เพิ่ม permission check | 🔧 ต้องตรวจสอบ |
| **KanbanView** | ⚠️ ต้องตรวจสอบ | ✅ เพิ่ม permission check | 🔧 ต้องตรวจสอบ |

---

## 🔍 จุดที่ต้องระวัง (Gotchas)

### 1. Ownership Verification
แดชบอร์ดเก่าอาจตรวจสอบว่าผู้ใช้เป็นเจ้าของงานก่อนแก้ไข/ลบ:

```javascript
// Backend อาจ check:
if (task.createdBy !== userId) {
  return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขงานของคนอื่น' });
}
```

**แก้ไข**: ให้ frontend disable ปุ่มถ้าไม่ใช่เจ้าของ (อ่านจาก `task.createdBy`)

### 2. Submit Task vs Create Task
- **Submit**: ส่งงานที่ได้รับมอบหมาย (ตอนนี้ต้องการ userId แล้ว)
- **Create**: สร้างงานใหม่ (ต้องการ userId)

อย่าสับสน!

### 3. localStorage Persistence
```javascript
// ระวัง: localStorage อาจมีค่าเก่าค้างอยู่
// ควร clear เมื่อ logout หรือเปลี่ยน context
```

### 4. Read-Only Banner
```javascript
// ต้องแสดงเฉพาะเมื่อ:
// 1. มี groupId แต่ไม่มี userId
// 2. viewMode === 'group'
// 3. isReadOnly === true
```

---

## 📈 ตัววัดความสำเร็จ (Success Metrics)

### Phase 1 เสร็จสมบูรณ์เมื่อ:
- [ ] EditTaskModal ไม่สามารถแก้ไขงานได้โดยไม่มี userId
- [ ] TaskDetailModal ปุ่มถูก disable ถูกต้อง
- [ ] SubmitTaskModal ไม่สามารถส่งงานได้โดยไม่มี userId
- [ ] แสดง toast error ชัดเจนทุกกรณี

### Phase 2 เสร็จสมบูรณ์เมื่อ:
- [ ] Table view actions ตรวจสอบสิทธิ์
- [ ] Kanban view drag-drop ตรวจสอบสิทธิ์  
- [ ] RecurringTaskModal แสดง UI warning

### Phase 3 เสร็จสมบูรณ์เมื่อ:
- [ ] ผ่าน test ทั้ง Group Mode และ Personal Mode
- [ ] เอกสารอัพเดทครบถ้วน
- [ ] ไม่มี bug ที่รู้จัก

### ความสำเร็จโดยรวม (100%):
- [ ] **ฟีเจอร์ครบเหมือนแดชบอร์ดเก่า** - เปรียบเทียบกับ OLD_DASHBOARD_ANALYSIS.md
- [ ] **Permission ถูกต้องทุกจุด** - ตรวจสอบตาม checklist
- [ ] **เปิดจาก LINE ได้** - ทดสอบกับ LINE bot จริง
- [ ] **UX ดีกว่าแดชบอร์ดเก่า** - ใช้ React, modern UI, responsive

---

## 🚀 ขั้นตอนถัดไป (Next Steps)

### ทันที (Immediate)
1. เริ่ม Phase 1 Task 1.1 - แก้ไข EditTaskModal.jsx
2. Test ทันทีหลังแก้แต่ละ modal
3. Commit เป็นชิ้นเล็กๆ

### หลังจาก Phase 1-3 เสร็จ
1. ทดสอบกับ Backend API จริง
2. ทดสอบเปิดจาก LINE จริง
3. ขอ feedback จากผู้ใช้
4. ปรับปรุง UX ตาม feedback

### Long-term
1. เพิ่ม feature ที่แดชบอร์ดเก่าไม่มี
2. ปรับปรุง performance
3. เพิ่ม unit tests
4. เพิ่ม E2E tests

---

## 📚 เอกสารอ้างอิง

1. **OLD_DASHBOARD_ANALYSIS.md** - วิเคราะห์แดชบอร์ดเก่าครบถ้วน
2. **LINE_INTEGRATION.md** - คู่มือการเชื่อมต่อกับ LINE
3. **PROGRESS.md** - ความคืบหน้าโดยรวม
4. **ADDTASK_MODAL_IMPROVEMENTS.md** - ตัวอย่างการแก้ไข modal
5. **MODAL_INTEGRATION_CHECK.md** - ตรวจสอบ modal integration

---

## 💬 คำแนะนำ (Tips)

### สำหรับการพัฒนา:
- ✅ Test ใน local ด้วย URL parameters จำลอง
- ✅ ใช้ Browser DevTools Console เพื่อดู auth logs
- ✅ ตรวจสอบ localStorage ว่ามีค่าถูกต้อง
- ✅ Commit เล็กๆ บ่อยๆ
- ✅ เขียน commit message ให้ชัดเจน

### สำหรับการทดสอบ:
- ✅ ทดสอบ edge cases (ไม่มี userId, ไม่มี groupId, ทั้งคู่)
- ✅ ทดสอบ localStorage persistence
- ✅ ทดสอบ refresh หน้าเว็บ
- ✅ ทดสอบ navigate ระหว่างหน้า
- ✅ ทดสอบ logout และ login ใหม่

### สำหรับ Debugging:
```javascript
// เพิ่มใน AuthContext.jsx
useEffect(() => {
  console.log('🔐 Auth Debug:', {
    userId,
    groupId,
    viewMode,
    isReadOnly,
    canModify: canModify(),
    isAuthenticated: isAuthenticated()
  });
}, [userId, groupId, viewMode]);
```

---

## ✅ สรุป

แผนนี้แบ่งการพัฒนาเป็น 3 phases:
1. **Phase 1 (Critical)**: แก้ไข 3 modals ที่มีปัญหาร้ายแรง
2. **Phase 2 (High)**: แก้ไข view components และปรับปรุง UX
3. **Phase 3 (Quality)**: ทดสอบครบถ้วนและอัพเดทเอกสาร

ประมาณเวลารวม: **4-7 ชั่วโมง**

เมื่อเสร็จทั้งหมด จะได้แดชบอร์ดใหม่ที่:
- ✅ เปิดจาก LINE ได้เหมือนแดชบอร์ดเก่า
- ✅ รองรับทั้ง Personal Mode และ Group Mode
- ✅ ตรวจสอบสิทธิ์ถูกต้องครบทุกจุด
- ✅ UX ดีกว่า และ responsive
- ✅ ใช้ React และ modern tech stack

---

**ผู้จัดทำ**: Leka Bot Development Team  
**วันที่**: 2025-01-XX  
**เวอร์ชัน**: 1.0  
**สถานะ**: 🚀 Ready to Start!
