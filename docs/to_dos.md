กำลังสรุปเป็น to-dos รายละเอียดแบบลงไฟล์/ฟังก์ชันชัดเจน เพื่อให้แก้ได้แม่นยำและครบถ้วน

### To‑Dos: Dashboard (Frontend)
- [ ] ปรับ mapping ข้อมูลสถิติหน้า “ภาพรวม”
  - แก้ `dashboard/script.js` → `loadStats()` ให้ส่ง `response.data.weekly` เข้า `updateStats`
  - แก้เฉพาะบรรทัดที่เรียก `updateStats(...)`
  - ผลลัพธ์ที่คาดหวัง: การ์ดสถิติขึ้นตัวเลขจริง (totalTasks, pendingTasks, completedTasks, overdueTasks)
- [ ] แก้ค่าที่ส่งในตัวกรองผู้รับผิดชอบให้เป็น LINE User ID
  - แก้ `dashboard/script.js` → `updateMembersList()`
  - เปลี่ยน `value` ของ `<option>` ทั้ง `#taskAssignees`, `#assigneeFilter`, `#reviewerSelect` จาก `member.id` เป็น `member.lineUserId`
  - ตั้งค่า default ของ `#reviewerSelect` เป็น `this.currentUserId` (LINE ID)
  - ยืนยันว่า `createTask()` และ `reviewerUserId` ยังรองรับ LINE ID (รองรับแล้วใน `TaskService.createTask`)
- [ ] ผูก event ปุ่ม/ลิงก์ที่ “กดแล้วไม่เกิดอะไรขึ้น”
  - `#exportBtn`: ผูกให้เรียก `exportReports('csv')` ของช่วงสัปดาห์ปัจจุบัน (หรือเปิด `/api/groups/:groupId/reports/export?startDate=…&endDate=…&format=csv`)
  - `#notificationBtn`: แสดง toast “ฟีเจอร์การแจ้งเตือนกำลังพัฒนา” (หรือเปิด side panel ถ้ามี)
  - ลิงก์ “ดูทั้งหมด” ในหน้า “งานใกล้ครบกำหนด/อันดับ” ให้ `preventDefault()` และเรียก `switchView('tasks'|'leaderboard')`
- [ ] ปรับปรุงปฏิทิน (อย่างน้อยให้ใช้งานระดับพื้นฐาน)
  - เติม `this.currentMonth/this.currentYear` ใน class
  - `navigateCalendar(direction)`: อัปเดตเดือน/ปี แล้วเรียก `loadCalendarEvents(month, year)`
  - `switchCalendarMode(mode)`: ตั้งค่าปุ่ม active และ (เฟสแรก) render โหมดเดือนเหมือนเดิม
  - `onCalendarDayClick(...)`: เปิด `openAddTaskModal()` และ prefill `#taskDueDate` ตามวันที่ที่คลิก
- [ ] สร้าง Task Detail Modal ให้ใช้งานได้จริง
  - เพิ่มฟังก์ชัน `loadTaskDetail(taskId)` เรียก API ใหม่ (ดูหัวข้อ Backend) จากนั้น render รายละเอียดลง `#taskModalBody` และ `document.getElementById('taskModal').classList.add('active')`
  - แก้ `openTaskModal(taskId)` ให้เรียก `loadTaskDetail(taskId)` (แทนการเปิด “ส่งงาน” ตรงๆ)
- [ ] เก็บ state ตัวกรอง/ค้นหาให้คงอยู่ระหว่างเปลี่ยนหน้า
  - เพิ่ม `this.taskFilters = {}` ใน class
  - ใน `filterTasks()` ตั้งค่า `this.taskFilters`
  - ใน `loadTasks(filters)` ให้ merge เข้ากับ `this.taskFilters`
  - ใน `updatePagination(...)` เรียก `loadTasks({ ...this.taskFilters, page: N })`
- [ ] รองรับการค้นหา (search) ฝั่งหน้าเว็บให้ยิงไปยังพารามิเตอร์ที่ Backend รองรับ
  - คงรูปแบบ `filterTasks()` ที่ส่ง `search` ได้ แต่ต้องแก้ Backend ให้รองรับ (ดูหัวข้อ Backend)
- [ ] ป้องกันกรณีไม่มี `userId` ใน URL
  - ก่อน `handleAddTask()`/`openUploadPicker()`/`handleSubmitTask()` ให้ตรวจ `this.currentUserId`
  - ถ้าไม่มี: `showToast('กรุณาเปิดลิงก์ Dashboard ผ่าน @เลขา /setup เพื่อยืนยันตัวตน', 'error')` และยุติการทำงาน
- [ ] ซ่อน/ปิดใช้งานปุ่มที่ยังไม่เสร็จ
  - ซ่อน `#exportPdfBtn` ชั่วคราว หรือเปลี่ยน label เป็น “JSON” ให้สอดคล้องกับที่มีจริง
  - หากยังไม่ทำ Notification panel ให้ซ่อน `#notificationBtn` หรือแสดง toast แทน

### To‑Dos: API/Backend
- [ ] เพิ่ม endpoint อ่านรายละเอียดงานเดี่ยว
  - `src/controllers/apiController.ts`: เพิ่มเมธอด `getTaskById(req, res)` ดึงจาก `TaskService` โดย `taskId`
  - เส้นทางแนะนำ:
    - `GET /api/groups/:groupId/tasks/:taskId` (ตรวจว่าตรงกลุ่ม) หรือ `GET /api/tasks/:taskId`
  - ส่งคืนข้อมูลรวม relations: assignedUsers, attachedFiles, createdByUser, group
- [ ] ให้ `GET /api/groups/:groupId/tasks` รองรับ `search`
  - ปัจจุบัน `ApiController.getTasks` ไม่อ่านพารามิเตอร์ `search`
  - แก้ให้ถ้ามี `search` ให้เรียก `TaskService.searchTasks(groupId, search, {limit, offset})` แทน `getGroupTasks`
  - ส่ง `pagination` ให้เหมือนเดิม
- [ ] (ถ้าต้องการทางเลือกฝั่ง Backend) รับได้ทั้ง LINE User ID และ DB User ID ในตัวกรองผู้รับผิดชอบ
  - ปรับ `TaskService.getGroupTasks()` ให้ถ้าหา user จาก `lineUserId` ไม่เจอ ให้ลองหา `id` (UUID) อีกครั้ง แล้ว where ด้วย `assignee.id` (รองรับทั้งสองแบบ)
  - ทางเลือกนี้ช่วยลด coupling กับ Frontend แต่ยังแนะนำให้ Frontend ส่ง LINE ID ตามที่แก้ด้านบน
- [ ] Flatten stats (ตัวเลือกภายหลัง)
  - เพิ่ม `totalTasks/pendingTasks/completedTasks/overdueTasks` ไว้ที่ `GET /api/groups/:groupId/stats` top-level (ดึงจาก weekly) เพื่อให้หน้าเว็บเรียกใช้ตรงๆ ได้ในอนาคต (ไม่บังคับหากเลือกแก้ฝั่ง Frontend แล้ว)
- [ ] โหมด Dashboard‑only (ไม่มี LINE env ก็รันได้)
  - `src/utils/config.ts`: ใช้ `features.lineEnabled` ที่มีอยู่แล้ว
  - `src/index.ts`: ใน `start()` เปลี่ยนเป็น
    - ถ้า `features.lineEnabled` จึงเรียก `this.lineService.initialize()`
    - ถ้าไม่: log “running in Dashboard‑only mode” และข้ามการ init LINE

### To‑Dos: UX/ซ่อนเมนูชั่วคราว
- [ ] ซ่อน/disable ปุ่ม “ส่งออก PDF” ในหน้า Reports จนกว่าจะมีฟังก์ชันจริง
- [ ] แจ้งสถานะฟีเจอร์ปฏิทิน/การแจ้งเตือนยังพัฒนาอยู่ หากผู้ใช้กด

### To‑Dos: QA/ทดสอบ
- [ ] ทดสอบเส้นทางใช้งานจริง
  - เปิด Dashboard ผ่านลิงก์ `@เลขา /setup` ให้มี `groupId` และ `userId`
  - ตรวจสถิติขึ้นข้อมูลจริง, รายการงาน filter ได้ตามผู้รับผิดชอบ, pagination ยังคงตัวกรอง
  - ปฏิทินเลื่อนเดือน/เปิด Add Task ได้
  - เปิดรายละเอียดงานได้ (ไฟล์แนบ/คนรับผิดชอบขึ้นครบ)
  - ส่งงานแนบไฟล์ได้ และ “อนุมัติ/ตีกลับ” ทำงานครบ
- [ ] Smoke test โหมด Dashboard-only
  - ลบ/ซ่อน LINE env, ตัวเว็บและ API (ที่ไม่พึ่ง LINE) ต้องยังใช้งานได้
- [ ] ตรวจ 404/500 UX
  - ไม่มี `groupId` → แสดงหน้าชี้แนะ `/setup`
  - `groupId` ไม่พบ → แสดง “ไม่พบกลุ่ม”

### หมายเหตุอ้างอิงไฟล์สำคัญ
- Frontend: `dashboard/index.html`, `dashboard/script.js`
- API: `src/controllers/apiController.ts`, `src/services/TaskService.ts`, `src/services/UserService.ts`, `src/services/FileService.ts`, `src/services/KPIService.ts`
- Server: `src/index.ts`, `src/utils/config.ts`

สรุป
- ระบุ to-dos ครบทั้งฝั่งหน้าเว็บ/ฝั่ง API พร้อมไฟล์และจุดแก้หลัก
- เป้าหมายหลัก: แก้ mapping สถิติ, ให้ filter ผู้รับผิดชอบทำงาน, เติมฟังก์ชันปฏิทิน/รายละเอียดงาน/ปุ่มต่างๆ, รองรับ search, คงตัวกรองขณะ pagination, และทำ Dashboard-only ให้รันได้