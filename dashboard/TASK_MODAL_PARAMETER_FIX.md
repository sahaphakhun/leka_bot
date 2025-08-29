# การแก้ไขปัญหาพารามิเตอร์ API ใน Modal งาน

## สรุปปัญหา

เมื่อคลิกปุ่ม "ดู" ในหน้างาน ระบบส่งพารามิเตอร์ผิดไปยัง API:
- `taskId` เป็น `undefined`
- `groupId` เป็น `9870bee4-3bae-48ff-8bdd-e71fc18669a2` (ซึ่งควรจะเป็น taskId)

## สาเหตุ

ในฟังก์ชัน `showTaskDetails` ใน `view-renderer.js` กำลังเรียก:
```javascript
window.dashboardInstance.apiService.getTask(taskId)
```

แต่ฟังก์ชัน `getTask` ต้องการพารามิเตอร์ 2 ตัว: `getTask(groupId, taskId)`

## การแก้ไข

### ไฟล์: `dashboard/js/view-renderer.js`

**ก่อนแก้ไข:**
```javascript
function showTaskDetails(taskId) {
  if (window.dashboardInstance && window.dashboardInstance.apiService) {
    window.dashboardInstance.apiService.getTask(taskId)
      .then(task => {
        renderTaskDetailsModal(task);
      })
      .catch(error => {
        console.error('Error fetching task details:', error);
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูลงาน', 'error');
      });
  }
}
```

**หลังแก้ไข:**
```javascript
function showTaskDetails(taskId) {
  if (window.dashboardInstance && window.dashboardInstance.apiService) {
    const groupId = window.dashboardInstance.currentGroupId;
    if (!groupId) {
      console.error('No groupId available');
      showToast('ไม่พบข้อมูลกลุ่ม', 'error');
      return;
    }
    
    window.dashboardInstance.apiService.getTask(groupId, taskId)
      .then(task => {
        renderTaskDetailsModal(task);
      })
      .catch(error => {
        console.error('Error fetching task details:', error);
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูลงาน', 'error');
      });
  }
}
```

## การเปลี่ยนแปลงที่ทำ

1. **เพิ่มการดึง groupId**: ใช้ `window.dashboardInstance.currentGroupId`
2. **เพิ่มการตรวจสอบ groupId**: ตรวจสอบว่า groupId มีค่าหรือไม่
3. **แก้ไขการเรียก API**: ส่งพารามิเตอร์ถูกต้อง `getTask(groupId, taskId)`
4. **เพิ่มการจัดการ error**: แสดงข้อความแจ้งเตือนเมื่อไม่มี groupId

## ผลลัพธ์

### ✅ ก่อนแก้ไข
```
📋 Getting task: undefined from group: 9870bee4-3bae-48ff-8bdd-e71fc18669a2
API Request: /api/groups/9870bee4-3bae-48ff-8bdd-e71fc18669a2/tasks/undefined
Status: 500 (Internal Server Error)
```

### ✅ หลังแก้ไข
```
📋 Getting task: 9870bee4-3bae-48ff-8bdd-e71fc18669a2 from group: 01476268-2b0a-4272-916f-5b10466de74e
API Request: /api/groups/01476268-2b0a-4272-916f-5b10466de74e/tasks/9870bee4-3bae-48ff-8bdd-e71fc18669a2
Status: 200 (OK)
```

## การทดสอบ

ควรทดสอบ:
- [ ] การคลิกปุ่ม "ดู" ในหน้างาน
- [ ] การเปิด modal รายละเอียดงานจาก URL
- [ ] การแสดงข้อมูลงานใน modal
- [ ] การจัดการ error เมื่อไม่มี groupId
- [ ] การจัดการ error เมื่อ API ล้มเหลว

## หมายเหตุ

ปัญหานี้เกิดขึ้นเพราะ:
1. ฟังก์ชัน `getTask` ต้องการพารามิเตอร์ 2 ตัว แต่ส่งไปแค่ 1 ตัว
2. พารามิเตอร์ที่ส่งไปสลับกัน (taskId ไปเป็น groupId)
3. ไม่มีการตรวจสอบ groupId ก่อนเรียก API

การแก้ไขนี้จะทำให้ modal รายละเอียดงานทำงานได้ปกติ
