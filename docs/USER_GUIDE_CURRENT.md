# 🤖 คู่มือการใช้งานและคำอธิบายระบบ (อัปเดตตามโค้ดจริง)

เอกสารฉบับนี้สรุปวิธีใช้งาน “เลขาบอท” และอธิบายส่วนประกอบของระบบตามโค้ดปัจจุบันในโปรเจ็ก ไม่อ้างอิง README เก่า เนื้อหาเน้นสิ่งที่ทำงานได้จริง ณ ตอนนี้

---

## ภาพรวมระบบ
- **หน้าที่หลัก**: จัดการงานในกลุ่ม LINE (สร้าง/มอบหมาย/เตือน/ส่งงาน/ตรวจงาน), คลังไฟล์, ปฏิทิน, KPI/Leaderboard และแดชบอร์ดเว็บ
- **สถาปัตยกรรมโดยย่อ**
  - Web server (Express) ให้บริการ REST API และหน้า Dashboard
  - LINE Webhook ที่ `POST /webhook`
  - Services (ธุรกิจหลัก): Tasks, Files, KPI, Notifications, Google Calendar, Cron
  - PostgreSQL + TypeORM เป็นฐานข้อมูลหลัก

---

## การติดตั้งและรันระบบ
### ข้อกำหนด
- Node.js >= 18
- PostgreSQL (ถ้าใช้แบบ Local; หรือใช้ `DATABASE_URL` จาก Railway/Cloud)

### ตัวแปรแวดล้อม (จาก `src/utils/config.ts`)
- จำเป็น (ต้องมี)
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_CHANNEL_SECRET`
- เสริม (มีแล้วเปิดฟีเจอร์ที่เกี่ยวข้อง)
  - Google Calendar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - Email (SMTP): `SMTP_USER`, `SMTP_PASS`, และปรับ `SMTP_HOST`, `SMTP_PORT` ตามผู้ให้บริการ
  - LIFF (ถ้ามี): `LINE_LIFF_ID`
- อื่นๆ และค่าเริ่มต้น
  - `PORT=3000`, `NODE_ENV=development`
  - `BASE_URL` ค่าเริ่มต้นชี้ Railway ตัวอย่าง: `https://lekabot-production.up.railway.app`
  - ฐานข้อมูล local: `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USERNAME=postgres`, `DB_PASSWORD=`, `DB_NAME=leka_bot`
  - พาธเก็บไฟล์: `UPLOAD_PATH=./uploads`

### สคริปต์ที่ใช้บ่อย (จาก `package.json`)
- Dev server: `npm run dev` (watch `src/index.ts`)
- Build TypeScript: `npm run build`
- Start (prod, ใช้ไฟล์ build): `npm start`
- เตรียม/ทดสอบฐานข้อมูล:
  - สร้าง/ซิงค์สคีมา (dev อัตโนมัติอยู่แล้ว): `npm run db:init` หรือ `npm run db:sync`
  - ทดสอบการเชื่อมต่อ: `npm run db:test`
  - แปลงสมาชิกทั้งหมดเป็น admin (สคริปต์เฉพาะกิจ): `npm run db:migrate-admin`

---

## จุดเชื่อมต่อหลักของระบบ (Routes จริงตามโค้ด)
- Health check: `GET /health`
- หน้าแรก (JSON แสดงสถานะ/ลิงก์): `GET /`
- LINE Webhook: `POST /webhook`
- Dashboard (เว็บ): `GET /dashboard` (ไฟล์ static + JS)
- Dashboard LIFF:
  - ตั้งค่ากลุ่ม: `GET /dashboard/liff/setup?groupId=...`, `POST /dashboard/liff/setup`
  - โปรไฟล์ผู้ใช้: `GET /dashboard/liff/profile?userId=...`, `POST /dashboard/liff/profile`
- Dashboard Data API (รวมหน้าเดียว): `GET /dashboard/group/:groupId`
- REST API หลักทั้งหมดอยู่ใต้ ` /api`

> หมายเหตุ: โค้ดปัจจุบันยังไม่ได้บังคับใช้ JWT บนเส้นทาง `/api` ส่วนใหญ่ (แม้อิมพอร์ต middleware แล้ว) จึงถือเป็น public API ในสภาพแวดล้อม dev/proto นี้ ควรติดตั้ง auth ก่อนใช้งานจริงในที่สาธารณะ (รายละเอียดดูส่วน “ความปลอดภัย/ข้อจำกัด” ด้านล่าง)

---

## วิธีใช้งานใน LINE (ตาม `CommandService`)
บอทรองรับคำสั่งในห้องแชทกลุ่ม LINE เท่านั้น หากใช้ใน 1:1 จะตอบว่ารองรับเฉพาะในกลุ่ม

- วิธีเรียกคำสั่ง
  - แท็กบอทจริงใน LINE แล้วพิมพ์คำสั่ง (แนะนำ)
  - หรือพิมพ์ @เลขา นำหน้าคำสั่ง
  - หรือพิมพ์คำสั่งขึ้นต้นด้วย `/`

- คำสั่งหลัก
  - `/setup` ส่งลิงก์ Dashboard ของกลุ่ม: `${BASE_URL}/dashboard?groupId=<LINE_GROUP_ID>`
  - `/help` แสดงคู่มือคำสั่งล่าสุด
  - `/whoami` แสดงข้อมูลโปรไฟล์ของฉัน
  - `เพิ่มงาน` หรือ `/task add` สร้างงานใหม่ด้วยภาษาธรรมชาติ
  - `/task list [today|week|pending]` ดูงานตามช่วง/สถานะ
  - `/task mine` ดูงานที่ฉันรับผิดชอบ
  - `/task move <รหัส/ชื่อ> <วันเวลาใหม่>` เลื่อนกำหนดส่ง
  - `/task done <รหัส/ชื่อ>` ปิดงาน
  - `/submit <รหัส/ชื่อ> [หมายเหตุ]` ผูก “ไฟล์ล่าสุดที่ฉันเพิ่งส่งในกลุ่มภายใน 24 ชม.” ให้เป็นการส่งงาน (Auto)
  - `/approve <รหัส/ชื่อ>` อนุมัติ/ปิดงาน (สำหรับผู้ตรวจ/ผู้เกี่ยวข้อง)
  - `/reject <รหัส/ชื่อ> <วันเวลาใหม่> [ความเห็น]` ตีกลับงาน พร้อมกำหนดส่งใหม่
  - `/files list` ดูไฟล์ล่าสุด, `/files search <คำค้น>` ค้นหาไฟล์

- ตัวอย่าง “เพิ่มงาน” แบบเร็ว
  - `@เลขา เพิ่มงาน "ส่งรายงาน Q3" @me due 25/12 14:00 #report #q3`
  - รองรับรูปแบบเวลา: `DD/MM HH:mm`, `DD/MM/YYYY HH:mm`, `วันนี้/พรุ่งนี้ มะรืนนี้ <เวลา>`, หรือเฉพาะเวลา `HH:mm` (ระบบเติมปี/วันเริ่มต้นอัตโนมัติ)

> การใส่ผู้รับผิดชอบ: แท็กชื่อจริง/ชื่อเล่นแบบ LINE mention ก็ได้, `@me` คือผู้ส่งข้อความ, จะถูกแม็ปไปยังผู้ใช้ในระบบโดยอัตโนมัติ

---

## Dashboard (เว็บ)
- เข้าใช้งาน: `GET /dashboard?groupId=<LINE_GROUP_ID>[&userId=<LINE_USER_ID>][&action=new-task]`
  - `action=new-task` จะเปิด Modal สำหรับกดเพิ่มงานทันที
- ฟีเจอร์ตามไฟล์ `dashboard/index.html` + `dashboard/script.js`
  - ภาพรวม, ปฏิทิน, งานทั้งหมด (ตัวกรองสถานะ/ผู้รับผิดชอบ/ค้นหา), คลังไฟล์, Leaderboard, รายงานผู้บริหาร
  - ส่งงานจากเว็บ: เลือกงาน + อัปโหลดไฟล์ (หลายไฟล์) → `POST /api/groups/:groupId/tasks/:taskId/submit`
  - ตั้ง “ผู้รับรายงานสรุปอัตโนมัติ” สำหรับผู้จัดการ (LINE user IDs) → `POST /api/groups/:groupId/settings/report-recipients`

---

## การใช้งาน REST API (จริงตาม `apiController`)
> หมายเหตุสำคัญเรื่อง ID:
> - ค่าพารามิเตอร์ `:groupId` ใน URL กลุ่ม = “LINE Group ID” (ขึ้นต้นด้วย C…)
> - ฟิลด์ `userId`, `assigneeIds`, `createdBy`, `reviewerUserId` ใน body: รับได้ทั้ง “LINE User ID” (ขึ้นต้นด้วย U…) และ “internal UUID” ระบบจะแม็ปอัตโนมัติเมื่อเป็น LINE ID

- กลุ่ม/สมาชิก/สถิติ
  - `GET /api/groups/:groupId` ข้อมูลกลุ่ม
  - `GET /api/groups/:groupId/members` รายชื่อสมาชิก (พร้อม role)
  - `GET /api/groups/:groupId/stats` สถิติภาพรวมกลุ่ม (งาน/ไฟล์/KPI แบบรวม)

- งาน (Tasks)
  - `GET /api/groups/:groupId/tasks`
    - Query: `status`, `assignee`, `tags`, `startDate`, `endDate`, `page`, `limit`
  - `POST /api/groups/:groupId/tasks`
    - Required body: `title`, `assigneeIds[]`, `createdBy`, `dueTime`
    - Optional: `description`, `startTime`, `priority`, `tags[]`, `customReminders[]`, `requireAttachment`, `reviewerUserId`
  - `PUT /api/tasks/:taskId` (อัปเดตทั่วไป)
    - กรณี “ตีกลับงาน”: ส่งเพิ่ม `reviewAction: 'revise'`, `reviewerUserId`, `reviewerComment` และ `dueTime` ใหม่ → ระบบบันทึก workflow และแจ้งเตือนผู้เกี่ยวข้อง
  - `POST /api/tasks/:taskId/complete` ปิดงาน (ต้องส่ง `{ userId }` ของผู้ทำรายการ)
  - ส่งงาน (แนบไฟล์/ลิงก์): `POST /api/groups/:groupId/tasks/:taskId/submit`
    - Form-data: `attachments` (หลายไฟล์), `userId`, `comment`, `links` (ถ้ามี)

- ปฏิทิน (Calendar)
  - `GET /api/groups/:groupId/calendar?month=MM&year=YYYY` หรือ `?startDate&endDate` ดึง event ช่วงเวลาที่ต้องการ

- คลังไฟล์ (Files)
  - `GET /api/groups/:groupId/files` (ค้นหา/กรอง), `GET /api/files/:fileId/preview|download`
  - เส้นทางที่ผูกกับกลุ่ม: `GET /api/groups/:groupId/files/:fileId/preview|download` จะตรวจสอบว่าไฟล์อยู่ในกลุ่มนั้นจริงก่อนเสมอ
  - `POST /api/files/:fileId/tags` เพิ่มแท็กให้ไฟล์ (body: `{ tags: [] }`)

- Leaderboard & รายงานผู้บริหาร
  - `GET /api/groups/:groupId/leaderboard?period=weekly|monthly|all`
  - `GET /api/groups/:groupId/reports/summary[?period|startDate|endDate|userId]`
  - `GET /api/groups/:groupId/reports/by-users[?period|startDate|endDate]`
  - ส่งออก CSV/JSON: `GET /api/groups/:groupId/reports/export?startDate=...&endDate=...&format=csv|json`

- งานประจำ (Recurring)
  - `GET /api/groups/:groupId/recurring` รายการ template ของกลุ่ม
  - `POST /api/groups/:groupId/recurring` สร้าง template
    - ตัวอย่าง body หลัก: `{ title, description, assigneeLineUserIds:[], reviewerLineUserId, requireAttachment, priority, tags, recurrence: 'weekly'|'monthly'|'quarterly', weekDay, dayOfMonth, timeOfDay, timezone, createdBy }`
  - `PUT /api/recurring/:id` อัปเดต template (จะคำนวณ `nextRunAt` ใหม่อัตโนมัติเมื่อเปลี่ยนรอบ)
  - `DELETE /api/recurring/:id` ลบ template

- เส้นทางเก่า (ยังรองรับ)
  - `GET /api/tasks/:groupId`, `POST /api/tasks/:groupId`, `GET /api/calendar/:groupId`, `GET /api/files/:groupId`, `GET /api/leaderboard/:groupId`

---

## การแจ้งเตือน/งานเบื้องหลัง (Cron) – ตาม `CronService`
- รันงานอัตโนมัติ (ตาม timezone ใน config, เริ่มโดย `Server.start()`):
  - เตือนล่วงหน้า 1 วัน (ทุกชั่วโมง): ตรวจ `P1D` (หรือ customReminders ในงาน)
  - ตรวจงานเกินกำหนด (ทุกชั่วโมง): เปลี่ยนสถานะเป็น `overdue` + แจ้งเตือน + บันทึก KPI ล่าช้า
  - สรุปรายสัปดาห์ (ศุกร์ 13:00): ส่งรายงานกลุ่ม + (พยายาม)ส่งส่วนตัวให้ admin
  - สรุปรายวัน (ทุกวัน 08:00): ส่ง “งานค้างของกลุ่ม” + “รายงานสำหรับผู้จัดการ (recipients ใน settings)”
  - อัปเดต KPI/Leaderboard (เที่ยงคืน): สรุปคะแนนและทำความสะอาดข้อมูลเก่า
  - งานประจำ (ทุกนาที): ตรวจ `recurring_tasks.nextRunAt` แล้วสร้างงานจริง พร้อมเลื่อน `nextRunAt`

> เกณฑ์ KPI (ดู `config.app.kpiScoring`): early +2, ontime +1, late -1, overtime -2 โดยอิงเวลาปิดงานเทียบกำหนดส่ง (±ชั่วโมง)

---

## คลังไฟล์ (ตาม `FileService`)
- เก็บไฟล์ในดิสก์ที่โฟลเดอร์ `UPLOAD_PATH/<groupId>` โดย `groupId` คือค่าที่ส่งเข้ามา (มักเป็น LINE Group ID)
- จำกัดขนาดอัปโหลดผ่าน multer ที่ ~25MB ต่อไฟล์ (ตั้งใน `apiController`)
- ประเภทที่พรีวิวได้: `image/jpeg|png|gif|webp`, `application/pdf`, `text/plain`
- ผูกไฟล์เข้ากับงานได้หลายไฟล์/หลายงาน (ตารางเชื่อม `task_files`)

---

## Google Calendar (ถ้าเปิดใช้)
- ใช้ได้เมื่อมี credentials ครบ (Service Account หรือ OAuth ตาม `GoogleCalendarService`)
- งานใหม่/อัปเดต/ลบ จะซิงค์ไป Calendar ของกลุ่มอัตโนมัติเมื่อ `group.settings.googleCalendarId` ถูกตั้งค่า (ผ่าน `GoogleService`)

---

## ความปลอดภัย/ข้อจำกัด ณ เวลานี้ (ตามโค้ดจริง)
- Webhook Signature ตรวจแบบผิวเผิน (เช็คว่า header มีค่าเท่านั้น) ควรปรับเป็นการตรวจลายเซ็นจริงของ LINE ก่อนใช้ production
- เส้นทาง `/api` ส่วนใหญ่ยัง “ไม่บังคับ JWT” (แม้มี middleware `auth.ts`) ควรครอบด้วย auth/authorization ให้เหมาะสมก่อนเปิดสาธารณะ
- เส้นทางดาวน์โหลดไฟล์ที่ระบุ `groupId` จะตรวจสอบการเป็นไฟล์ของกลุ่มนั้นจริง ช่วยกันข้อมูลข้ามกลุ่มได้ระดับหนึ่ง

> ข้อแนะนำสำหรับ production
> - เปิดใช้ JWT และตรวจสิทธิ์สมาชิก/แอดมินของกลุ่มในทุก API ที่เหมาะสม
> - ปรับ webhook ให้ validate ลายเซ็นถูกต้อง
> - กำหนด CORS และ Helmet policy ให้เข้มงวดมากขึ้น

---

## เคล็ดลับและแนวทางปฏิบัติ
- ใส่ `@me` และแท็กสมาชิกให้ครบในการสร้างงาน จะช่วยระบุผู้รับผิดชอบได้ถูกต้อง
- ใช้แท็กงาน/แท็กไฟล์อย่างสม่ำเสมอ เช่น `#report`, `#finance`, `#q4` เพื่อค้นหาง่าย
- ผู้ตรวจสามารถตีกลับงานพร้อมกำหนดส่งใหม่ผ่าน `/reject` (หรือผ่าน API `PUT /api/tasks/:taskId` ด้วย `reviewAction: 'revise'`)
- สร้าง “งานประจำ” จาก Dashboard (แท็บ Reports มี UI บางส่วน + Modal “เพิ่มงาน”) หรือเรียก API ตามด้านบน

---

## การแก้ปัญหาที่พบบ่อย
- 404 “Group not found”: ตรวจว่า `:groupId` ที่ส่งเป็น “LINE Group ID” ถูกต้อง และบอทเข้าร่วมกลุ่มนั้นแล้ว
- ส่งงานไม่สำเร็จ: ตรวจว่าแนบไฟล์แล้ว, ส่ง `userId` (LINE User ID) ถูกต้อง, และ `taskId` ตรงกับงาน
- ไม่เห็นการเตือน/สรุป: ตรวจ Cron logs และ timezone ของกลุ่ม/ระบบ
- Google Calendar ไม่ซิงค์: ตรวจ `group.settings.googleCalendarId` และ credentials Google

---

## อ้างอิงโค้ดส่วนสำคัญ
- Entry: `src/index.ts` (กำหนด middleware/route + start + graceful shutdown)
- Controllers: `src/controllers/*.ts`
- Services: `src/services/*.ts`
- Models/Entities: `src/models/index.ts`
- Config/DB: `src/utils/config.ts`, `src/utils/database.ts`
- Dashboard: `dashboard/index.html`, `dashboard/script.js`, `dashboard/styles.css`

---

เวอร์ชันเอกสาร: อัปเดตตามโค้ดใน repository ปัจจุบัน (อัตโนมัติ ณ วันที่จัดทำ)
