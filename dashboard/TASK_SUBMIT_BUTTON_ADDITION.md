# การเพิ่มปุ่มส่งงานใน Modal รายละเอียดงาน

## สรุปฟีเจอร์

เพิ่มปุ่มส่งงานใน modal รายละเอียดงาน เพื่อให้ผู้ใช้สามารถส่งงานได้โดยตรงจาก modal โดยไม่ต้องกลับไปที่หน้างาน

## ฟีเจอร์ที่เพิ่ม

### 1. ปุ่มส่งงานใน Modal
- แสดงปุ่ม "ส่งงาน" สำหรับงานที่มีสถานะ `pending`
- ปุ่มแสดงด้วยไอคอน paper-plane และสี warning (ส้ม)
- สามารถส่งงานของผู้รับผิดชอบคนอื่นได้

### 2. ปุ่มแก้ไขงานใน Modal
- แสดงปุ่ม "แก้ไข" สำหรับงานที่มีสถานะ `pending`
- ปุ่มแสดงด้วยไอคอน edit และสี primary (น้ำเงิน)

### 3. Layout ปุ่มใน Modal
- จัดเรียงปุ่มใน footer ของ modal
- รองรับการแสดงผลบนมือถือ (responsive design)

## การเปลี่ยนแปลงที่ทำ

### 1. แก้ไข Modal HTML

**ไฟล์:** `dashboard/js/view-renderer.js`

**ก่อนแก้ไข:**
```html
<div class="modal-footer">
  <button class="btn btn-outline" onclick="closeTaskDetailsModal()">
    <i class="fas fa-times"></i>
    ปิด
  </button>
</div>
```

**หลังแก้ไข:**
```html
<div class="modal-footer">
  <div class="modal-actions">
    ${task.status === 'pending' ? `
      <button class="btn btn-warning" onclick="submitTaskFromModal('${task.id}')">
        <i class="fas fa-paper-plane"></i>
        ส่งงาน
      </button>
    ` : ''}
    ${task.status === 'pending' ? `
      <button class="btn btn-primary" onclick="editTaskFromModal('${task.id}')">
        <i class="fas fa-edit"></i>
        แก้ไข
      </button>
    ` : ''}
    <button class="btn btn-outline" onclick="closeTaskDetailsModal()">
      <i class="fas fa-times"></i>
      ปิด
    </button>
  </div>
</div>
```

### 2. เพิ่มฟังก์ชันใหม่

**ไฟล์:** `dashboard/js/view-renderer.js`

#### submitTaskFromModal(taskId)
```javascript
function submitTaskFromModal(taskId) {
  if (window.dashboardInstance) {
    window.dashboardInstance.submitTask(taskId);
    closeTaskDetailsModal();
  } else {
    showToast('ไม่สามารถส่งงานได้: ไม่พบข้อมูลแดชบอร์ด', 'error');
  }
}
```

#### editTaskFromModal(taskId)
```javascript
function editTaskFromModal(taskId) {
  if (window.dashboardInstance) {
    window.dashboardInstance.openEditTaskModal(taskId);
    closeTaskDetailsModal();
  } else {
    showToast('ไม่สามารถแก้ไขงานได้: ไม่พบข้อมูลแดชบอร์ด', 'error');
  }
}
```

### 3. เพิ่ม CSS สำหรับ Modal Actions

**ไฟล์:** `dashboard/css/components.css`

```css
.modal-footer {
  padding: var(--spacing-4) var(--spacing-5);
  border-top: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
  align-items: center;
}

.modal-actions .btn {
  min-width: 100px;
}

@media (max-width: 768px) {
  .modal-actions {
    flex-direction: column;
    gap: var(--spacing-2);
  }
  
  .modal-actions .btn {
    width: 100%;
    min-width: auto;
  }
}
```

## วิธีการทำงาน

### การส่งงานจาก Modal
1. ผู้ใช้คลิกปุ่ม "ส่งงาน" ใน modal รายละเอียดงาน
2. ระบบเรียก `submitTaskFromModal(taskId)`
3. ระบบเรียก `window.dashboardInstance.submitTask(taskId)`
4. แสดง modal ส่งงาน (showSubmitTaskModal)
5. ผู้ใช้ใส่ความคิดเห็นและ/หรืออัปโหลดไฟล์
6. ระบบส่งข้อมูลไปยัง API
7. แสดงข้อความสำเร็จและรีเฟรชข้อมูล
8. ปิด modal รายละเอียดงาน

### การแก้ไขงานจาก Modal
1. ผู้ใช้คลิกปุ่ม "แก้ไข" ใน modal รายละเอียดงาน
2. ระบบเรียก `editTaskFromModal(taskId)`
3. ระบบเรียก `window.dashboardInstance.openEditTaskModal(taskId)`
4. แสดง modal แก้ไขงาน
5. ปิด modal รายละเอียดงาน

## ข้อดีของฟีเจอร์

### ✅ ความสะดวกในการใช้งาน
- ไม่ต้องกลับไปที่หน้างานเพื่อส่งงาน
- สามารถส่งงานได้ทันทีจาก modal รายละเอียด

### ✅ ความยืดหยุ่น
- สามารถส่งงานของผู้รับผิดชอบคนอื่นได้
- รองรับการส่งความคิดเห็นและไฟล์แนบ

### ✅ UI ที่สวยงาม
- ปุ่มจัดเรียงอย่างเป็นระเบียบ
- รองรับการแสดงผลบนมือถือ
- ใช้สีและไอคอนที่เหมาะสม

### ✅ การจัดการ Error
- แสดงข้อความแจ้งเตือนเมื่อเกิดข้อผิดพลาด
- ตรวจสอบการมีอยู่ของ dashboardInstance

## การทดสอบ

ควรทดสอบ:
- [ ] การคลิกปุ่ม "ส่งงาน" ใน modal รายละเอียด
- [ ] การคลิกปุ่ม "แก้ไข" ใน modal รายละเอียด
- [ ] การส่งงานของผู้รับผิดชอบคนอื่น
- [ ] การส่งความคิดเห็นและไฟล์แนบ
- [ ] การแสดงผลบนมือถือ
- [ ] การจัดการ error
- [ ] การปิด modal หลังจากส่งงาน

## หมายเหตุ

- ปุ่มส่งงานและแก้ไขจะแสดงเฉพาะงานที่มีสถานะ `pending`
- สามารถส่งงานของผู้รับผิดชอบคนอื่นได้ (ไม่มีข้อจำกัด)
- ฟังก์ชันส่งงานใช้ API endpoint เดิม: `/api/groups/{groupId}/tasks/{taskId}/submit`
- Modal จะปิดอัตโนมัติหลังจากส่งงานหรือแก้ไขงาน
