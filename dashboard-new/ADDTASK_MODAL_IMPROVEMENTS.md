# 📝 การปรับปรุง AddTaskModal

เอกสารนี้สรุปการปรับปรุง `AddTaskModal.jsx` ให้พร้อมใช้งานจริงกับ LINE bot

---

## 🎯 ภาพรวมการปรับปรุง

### ก่อนปรับปรุง ❌
- ❌ ไม่มีการตรวจสอบ permissions
- ❌ ไม่มี validation ที่ครบถ้วน
- ❌ ไม่มี toast notifications
- ❌ ใช้ข้อมูล members แบบ hardcode
- ❌ ไม่มี loading states
- ❌ Error handling ไม่ดีพอ
- ❌ UI ไม่สื่อสารสถานะได้ชัดเจน

### หลังปรับปรุง ✅
- ✅ ตรวจสอบ permissions ครบถ้วน
- ✅ Validation ทุก field อย่างละเอียด
- ✅ Toast notifications สำหรับทุก action
- ✅ โหลด members จริงจาก API
- ✅ Loading states ทุกที่
- ✅ Error handling ที่ดี พร้อมข้อความชัดเจน
- ✅ UI สื่อสารสถานะได้ดี

---

## 📋 รายละเอียดการปรับปรุง

### 1. Permission Checks ✅

**เพิ่ม:**
```javascript
const { userId, groupId, canModify, hasPermission } = useAuth();
const canCreate = canModify();
```

**การใช้งาน:**
```javascript
// ตรวจสอบก่อน submit
if (!hasPermission('create_task')) {
  toast({
    title: 'ไม่มีสิทธิ์',
    description: 'คุณไม่มีสิทธิ์สร้างงาน กรุณาเข้าผ่าน LINE ส่วนตัว',
    variant: 'destructive',
  });
  return;
}
```

**แสดง Warning Banner:**
```jsx
{!canCreate && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
    <AlertCircle className="h-5 w-5 text-yellow-600" />
    <p>คุณไม่มีสิทธิ์สร้างงาน กรุณาเข้าผ่าน LINE ส่วนตัว</p>
  </div>
)}
```

---

### 2. Form Validation ✅

**เพิ่มฟังก์ชัน validateForm:**

```javascript
const validateForm = (taskData, isRecurring = false) => {
  const newErrors = {};

  // 1. Title validation
  if (!taskData.title || taskData.title.trim().length === 0) {
    newErrors.title = 'กรุณาระบุชื่องาน';
  } else if (taskData.title.length > 200) {
    newErrors.title = 'ชื่องานต้องไม่เกิน 200 ตัวอักษร';
  }

  // 2. Description validation
  if (taskData.description && taskData.description.length > 2000) {
    newErrors.description = 'รายละเอียดต้องไม่เกิน 2000 ตัวอักษร';
  }

  // 3. Due date validation (Normal tasks)
  if (!isRecurring && !taskData.dueDate) {
    newErrors.dueDate = 'กรุณาเลือกวันที่ครบกำหนด';
  } else if (!isRecurring) {
    const selectedDate = new Date(taskData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      newErrors.dueDate = 'ไม่สามารถเลือกวันที่ในอดีตได้';
    }
  }

  // 4. Start date validation (Recurring tasks)
  if (isRecurring && !taskData.startDate) {
    newErrors.startDate = 'กรุณาเลือกวันที่เริ่มต้น';
  }

  // 5. Assigned users validation
  if (!taskData.assignedUsers || taskData.assignedUsers.length === 0) {
    newErrors.assignedUsers = 'กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน';
  }

  // 6. Custom recurrence validation
  if (isRecurring && taskData.recurrence === 'custom') {
    if (taskData.customRecurrence.type === 'weekly' &&
        taskData.customRecurrence.daysOfWeek.length === 0) {
      newErrors.customRecurrence = 'กรุณาเลือกวันในสัปดาห์อย่างน้อย 1 วัน';
    }
  }

  return newErrors;
};
```

**แสดง Error Messages:**
```jsx
<Input
  value={normalTask.title}
  className={errors.title ? 'border-red-500' : ''}
  // ...
/>
{errors.title && (
  <p className="text-sm text-red-500">{errors.title}</p>
)}
```

---

### 3. Toast Notifications ✅

**เพิ่ม useToast:**
```javascript
import { useToast } from '../../hooks/use-toast';

const { toast } = useToast();
```

**Success Toasts:**
```javascript
// สำหรับงานทั่วไป
toast({
  title: '✅ สร้างงานสำเร็จ',
  description: `งาน "${taskData.title}" ถูกสร้างแล้ว`,
});

// สำหรับงานประจำ
toast({
  title: '✅ สร้างงานประจำสำเร็จ',
  description: `งานประจำ "${taskData.title}" ถูกสร้างแล้ว`,
});
```

**Error Toasts:**
```javascript
toast({
  title: 'เกิดข้อผิดพลาด',
  description: errorMessage,
  variant: 'destructive',
});
```

**Validation Error Toast:**
```javascript
toast({
  title: 'ข้อมูลไม่ครบถ้วน',
  description: 'กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วน',
  variant: 'destructive',
});
```

---

### 4. Loading Members from API ✅

**ก่อน:**
```javascript
const [members, setMembers] = useState([
  { id: '1', name: 'John Doe', lineUserId: 'U001' },
  { id: '2', name: 'Jane Smith', lineUserId: 'U002' },
]);
```

**หลัง:**
```javascript
const [members, setMembers] = useState([]);
const [loadingMembers, setLoadingMembers] = useState(false);

const loadMembers = async () => {
  setLoadingMembers(true);
  try {
    const { getGroupMembers } = await import('../../services/api');
    const response = await getGroupMembers(groupId);
    const membersList = response.members || response.data || response || [];
    setMembers(membersList);
    console.log('✅ Loaded members:', membersList.length);
  } catch (error) {
    console.error('❌ Failed to load members:', error);
    toast({
      title: 'ไม่สามารถโหลดรายชื่อสมาชิก',
      description: error.message || 'กรุณาลองใหม่อีกครั้ง',
      variant: 'destructive',
    });
    setMembers([]);
  } finally {
    setLoadingMembers(false);
  }
};
```

**แสดง Loading State:**
```jsx
{loadingMembers ? (
  <div className="flex items-center justify-center py-4">
    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
    <span className="ml-2 text-sm text-gray-600">กำลังโหลดรายชื่อ...</span>
  </div>
) : members.length === 0 ? (
  <div className="text-center py-4 text-sm text-gray-500">
    ไม่พบสมาชิกในกลุ่ม
  </div>
) : (
  // แสดงรายชื่อสมาชิก
)}
```

---

### 5. Enhanced Error Handling ✅

**Better Error Messages:**
```javascript
try {
  await createTask(groupId, taskPayload);
  // Success...
} catch (error) {
  console.error('❌ Failed to create task:', error);

  let errorMessage = 'ไม่สามารถสร้างงานได้ กรุณาลองใหม่อีกครั้ง';

  if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error.message) {
    errorMessage = error.message;
  }

  toast({
    title: 'เกิดข้อผิดพลาด',
    description: errorMessage,
    variant: 'destructive',
  });
}
```

---

### 6. Loading States ✅

**Submit Button:**
```jsx
<Button
  type="submit"
  disabled={loading || !canCreate}
>
  {loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      กำลังสร้าง...
    </>
  ) : (
    '✅ สร้างงาน'
  )}
</Button>
```

**Disable All Inputs:**
```jsx
<Input
  disabled={!canCreate || loading}
  // ...
/>
```

---

### 7. UI Improvements ✅

#### Character Counters:
```jsx
<Input
  value={normalTask.title}
  maxLength={200}
  // ...
/>
<p className="text-xs text-gray-500">
  {normalTask.title.length}/200
</p>
```

#### Better Select Options with Icons:
```jsx
<Select value={normalTask.priority}>
  <SelectContent>
    <SelectItem value="low">🟢 ต่ำ</SelectItem>
    <SelectItem value="medium">🟡 ปานกลาง</SelectItem>
    <SelectItem value="high">🟠 สูง</SelectItem>
    <SelectItem value="urgent">🔴 ด่วน</SelectItem>
  </SelectContent>
</Select>
```

#### Assignee Selection with Counter:
```jsx
<div className="flex justify-between items-center">
  <span className="text-sm text-gray-600">
    เลือก {normalTask.assignedUsers.length} คน
  </span>
  <div className="space-x-2">
    <Button onClick={handleSelectAll}>เลือกทั้งหมด</Button>
    <Button onClick={handleClearAll}>ล้าง</Button>
  </div>
</div>
```

#### Thai Locale for Date Picker:
```jsx
import { th } from 'date-fns/locale';

<Calendar
  locale={th}
  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
/>
```

#### Custom Recurrence Settings:
```jsx
{recurringTask.recurrence === 'custom' && (
  <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
    <Label>การตั้งค่าแบบกำหนดเอง</Label>
    
    {/* Week day selector */}
    <div className="grid grid-cols-7 gap-2">
      {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
        <Button
          variant={isSelected ? 'default' : 'outline'}
          onClick={() => handleDayOfWeekToggle(index)}
        >
          {day}
        </Button>
      ))}
    </div>
  </div>
)}
```

---

### 8. Data Payload Preparation ✅

**Normal Task:**
```javascript
const taskPayload = {
  title: taskData.title.trim(),
  description: taskData.description?.trim() || '',
  dueDate: taskData.dueDate,
  dueTime: taskData.dueTime || null,
  priority: taskData.priority || 'medium',
  category: taskData.category || 'general',
  assignedUsers: taskData.assignedUsers,
  reviewer: taskData.reviewer || null,
  createdBy: userId, // Include creator's userId
};

console.log('📤 Creating normal task:', taskPayload);
await createTask(groupId, taskPayload);
```

**Recurring Task:**
```javascript
const recurringPayload = {
  title: taskData.title.trim(),
  description: taskData.description?.trim() || '',
  recurrence: taskData.recurrence,
  startDate: taskData.startDate,
  time: taskData.time || null,
  priority: taskData.priority || 'medium',
  category: taskData.category || 'general',
  assignedUsers: taskData.assignedUsers,
  reviewer: taskData.reviewer || null,
  createdBy: userId,
};

// Add custom recurrence if needed
if (taskData.recurrence === 'custom') {
  recurringPayload.customRecurrence = taskData.customRecurrence;
}

console.log('📤 Creating recurring task:', recurringPayload);
await createRecurringTask(groupId, recurringPayload);
```

---

### 9. Reset and Cleanup ✅

**Reset Forms on Close:**
```javascript
useEffect(() => {
  if (!isAddTaskOpen) {
    resetForms();
    setErrors({});
  }
}, [isAddTaskOpen]);
```

**Clear Errors on Input:**
```javascript
<Input
  onChange={(e) => {
    setNormalTask({ ...normalTask, title: e.target.value });
    setErrors(prev => ({ ...prev, title: undefined })); // Clear error
  }}
/>
```

---

## 📊 สรุปการเปลี่ยนแปลง

### Lines of Code
- **เพิ่ม**: ~200 บรรทัด
- **ปรับปรุง**: ~150 บรรทัด
- **รวม**: ~350 บรรทัดที่แก้ไข

### Files Modified
- ✅ `src/components/modals/AddTaskModal.jsx`

### Dependencies Added
- ✅ `date-fns/locale` - Thai locale support
- ✅ `lucide-react` icons - AlertCircle, Loader2
- ✅ `useToast` hook

---

## 🎯 ผลลัพธ์

### Before vs After

| ฟีเจอร์ | Before | After |
|---------|--------|-------|
| Permission Check | ❌ | ✅ |
| Validation | ⚠️ พื้นฐาน | ✅ ครบถ้วน |
| Error Handling | ⚠️ Basic alert | ✅ Toast + Details |
| Loading States | ❌ | ✅ |
| Members Data | ❌ Hardcoded | ✅ API |
| Character Counter | ❌ | ✅ |
| Thai Locale | ❌ | ✅ |
| Date Validation | ❌ | ✅ |
| Custom Recurrence | ⚠️ พื้นฐาน | ✅ ครบถ้วน |
| UI Feedback | ⚠️ น้อย | ✅ ชัดเจน |

---

## ✅ Checklist

- [x] Permission checks ทุกจุด
- [x] Validation ครบทุก field
- [x] Toast notifications ทุก action
- [x] Loading states ทุกจุด
- [x] Error handling ที่ดี
- [x] โหลดข้อมูลจาก API จริง
- [x] Character counters
- [x] Thai locale
- [x] Date validation (ไม่ให้เลือกอดีต)
- [x] Custom recurrence UI
- [x] Clear errors on input
- [x] Reset on close
- [x] Disable when no permission
- [x] Loading members indicator
- [x] Empty state for members
- [x] Icon in select options
- [x] Better button labels

---

## 🧪 การทดสอบ

### Test Cases

1. ✅ เปิด modal ในโหมด Personal (ต้องใช้งานได้)
2. ✅ เปิด modal ในโหมด Group (ต้องแสดง warning และ disable)
3. ✅ Submit โดยไม่กรอกชื่องาน (ต้อง show error)
4. ✅ Submit โดยไม่เลือกผู้รับผิดชอบ (ต้อง show error)
5. ✅ Submit โดยไม่เลือกวันที่ (ต้อง show error)
6. ✅ เลือกวันที่ในอดีต (ต้อง show error)
7. ✅ โหลด members สำเร็จ (ต้องแสดงรายชื่อ)
8. ✅ โหลด members ล้มเหลว (ต้อง show error toast)
9. ✅ Submit สำเร็จ (ต้อง show success toast และปิด modal)
10. ✅ Submit ล้มเหลว (ต้อง show error toast)
11. ✅ เปลี่ยน tab (ต้อง reset form)
12. ✅ ปิด modal (ต้อง reset form และ errors)

---

## 📚 เอกสารที่เกี่ยวข้อง

- [LINE_INTEGRATION.md](./LINE_INTEGRATION.md) - การเปิดจาก LINE
- [PROGRESS.md](./PROGRESS.md) - ความคืบหน้า
- [MODAL_INTEGRATION_CHECK.md](./MODAL_INTEGRATION_CHECK.md) - การตรวจสอบ Modals

---

## 🎉 สรุป

AddTaskModal ได้รับการปรับปรุงให้:
- ✅ ตรวจสอบสิทธิ์อย่างเข้มงวด
- ✅ Validate ข้อมูลครบถ้วน
- ✅ แจ้งเตือนผู้ใช้ได้ชัดเจน
- ✅ โหลดข้อมูลจริงจาก API
- ✅ Handle errors ได้ดี
- ✅ UI/UX ที่ดีขึ้นมาก

**พร้อมใช้งานจริงกับ LINE bot แล้ว! 🚀**