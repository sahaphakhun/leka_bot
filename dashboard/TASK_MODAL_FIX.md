# การแก้ไขปัญหา Modal งาน

## สรุปปัญหา

เมื่อคลิกปุ่ม "ดู" ในหน้างาน ระบบ log ขึ้นว่า `openTaskModal` ถูกเรียกใช้ แต่ไม่มี modal แสดงขึ้นบนหน้าจอ

## สาเหตุ

ฟังก์ชัน `openTaskModal` และ `openEditTaskModal` ใน `dashboard-core.js` เป็นเพียง stub ที่แค่ log แต่ไม่ได้ทำงานจริง

## การแก้ไข

### 1. แก้ไขฟังก์ชัน openTaskModal และ openEditTaskModal

**ไฟล์:** `dashboard/js/dashboard-core.js`

- เปลี่ยนจาก stub เป็นฟังก์ชันที่ทำงานจริง
- เพิ่มการดึงข้อมูลงานผ่าน API
- เพิ่มการแสดง modal รายละเอียดงาน

### 2. เพิ่มฟังก์ชัน getTask ใน API Service

**ไฟล์:** `dashboard/js/api-service.js`

- เพิ่มฟังก์ชัน `getTask(groupId, taskId)` สำหรับดึงข้อมูลงาน
- จัดการ error ที่เฉพาะเจาะจง
- เพิ่ม logging สำหรับ debugging

### 3. เพิ่มฟังก์ชันแสดง Modal

**ไฟล์:** `dashboard/js/dashboard-core.js`

#### showTaskDetailsModal(task)
- แสดง modal รายละเอียดงาน
- แสดงข้อมูลครบถ้วน: ชื่องาน, คำอธิบาย, สถานะ, ผู้รับผิดชอบ, วันที่ครบกำหนด
- แสดงข้อมูลเพิ่มเติม: โปรเจกต์, แท็ก, ไฟล์แนบ, ความคิดเห็น
- มีปุ่มส่งงานและแก้ไขสำหรับงานที่ยังไม่เสร็จ

#### showEditTaskModal(task)
- แสดง modal แก้ไขงาน
- ฟอร์มสำหรับแก้ไข: ชื่องาน, คำอธิบาย, ความสำคัญ, วันที่ครบกำหนด
- จัดการการบันทึกการเปลี่ยนแปลง

### 4. เพิ่มฟังก์ชัน completeTask

**ไฟล์:** `dashboard/js/dashboard-core.js`

- เพิ่มฟังก์ชัน `completeTask(taskId)` สำหรับทำเสร็จงาน
- อัปเดตสถานะงานเป็น 'completed'
- แสดงข้อความสำเร็จและรีเฟรชข้อมูล

### 5. เพิ่มฟังก์ชัน updateTask

**ไฟล์:** `dashboard/js/dashboard-core.js`

- เพิ่มฟังก์ชัน `updateTask(taskId, updateData)` สำหรับอัปเดตงาน
- ส่งข้อมูลไปยัง API endpoint `/api/groups/{groupId}/tasks/{taskId}`
- จัดการ error และ response

### 6. เพิ่ม CSS สำหรับ Modal

**ไฟล์:** `dashboard/css/components.css`

#### Task Details Modal
- `.task-details`: Layout หลักของ modal
- `.task-detail-section`: ส่วนต่างๆ ของข้อมูล
- `.task-detail-grid`: Grid layout สำหรับข้อมูล
- `.task-priority-badge`: Badge แสดงความสำคัญ
- `.task-status-badge`: Badge แสดงสถานะ
- `.task-detail-item`: Item แต่ละรายการ
- `.task-tags`, `.task-attachments`, `.task-comments`: ส่วนแสดงข้อมูลเพิ่มเติม

#### Edit Task Form
- `.edit-task-form`: Layout ฟอร์มแก้ไข
- `.form-group`: กลุ่มฟิลด์
- `.form-row`: แถวฟิลด์
- `.form-actions`: ส่วนปุ่มดำเนินการ

## วิธีการทำงาน

### การดูรายละเอียดงาน
1. ผู้ใช้คลิกปุ่ม "ดู" ในหน้างาน
2. ระบบเรียก `openTaskModal(taskId)`
3. ระบบดึงข้อมูลงานผ่าน `api.getTask(groupId, taskId)`
4. แสดง modal รายละเอียดงานด้วย `showTaskDetailsModal(task)`
5. ผู้ใช้สามารถดูข้อมูลครบถ้วนและดำเนินการอื่นๆ ได้

### การแก้ไขงาน
1. ผู้ใช้คลิกปุ่ม "แก้ไข" ใน modal รายละเอียด
2. ระบบเรียก `openEditTaskModal(taskId)`
3. แสดง modal แก้ไขงานด้วย `showEditTaskModal(task)`
4. ผู้ใช้แก้ไขข้อมูลและบันทึก
5. ระบบส่งข้อมูลไปยัง API และรีเฟรชข้อมูล

### การทำเสร็จงาน
1. ผู้ใช้คลิกปุ่ม "เสร็จ" ในหน้างาน
2. ระบบเรียก `completeTask(taskId)`
3. อัปเดตสถานะงานเป็น 'completed'
4. แสดงข้อความสำเร็จและรีเฟรชข้อมูล

## ผลลัพธ์

### ✅ Modal รายละเอียดงาน
- แสดงข้อมูลงานครบถ้วน
- UI สวยงามและใช้งานง่าย
- มีปุ่มดำเนินการต่างๆ
- รองรับการแสดงข้อมูลเพิ่มเติม

### ✅ Modal แก้ไขงาน
- ฟอร์มแก้ไขที่ใช้งานง่าย
- การจัดการ error ที่ดี
- การบันทึกข้อมูลที่ถูกต้อง

### ✅ ฟังก์ชันครบถ้วน
- ดูรายละเอียดงาน ✅
- แก้ไขงาน ✅
- ทำเสร็จงาน ✅
- ส่งงาน ✅

## การทดสอบ

ควรทดสอบ:
- [ ] การคลิกปุ่ม "ดู" ในหน้างาน
- [ ] การคลิกปุ่ม "แก้ไข" ใน modal รายละเอียด
- [ ] การคลิกปุ่ม "เสร็จ" ในหน้างาน
- [ ] การแสดงข้อมูลใน modal
- [ ] การบันทึกการแก้ไข
- [ ] การจัดการ error
- [ ] การใช้งานบนมือถือ
