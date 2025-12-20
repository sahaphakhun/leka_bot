# 05) Backend Logic & Maintainability

## สรุป

Backend build/typecheck ผ่าน แต่มีหลายจุดที่เป็น “บัคเชิงโครงสร้าง” หรือทำให้ดูแลต่อยาก เช่น route ซ้ำ, side effects ตอน import, กลยุทธ์จัดการ schema ที่ปะปน, logging แบบไม่ควรอยู่ใน production

## Findings

### MEDIUM – Route ซ้ำ/โค้ดบางส่วน unreachable

- `GET /` ถูกประกาศ 2 ครั้งใน `src/index.ts`
  - หลักฐาน: `src/index.ts:256` และ `src/index.ts:296`
  - ผล: handler ตัวหลัง **จะไม่ถูกเรียก** (ตัวแรกจบ response แล้ว)
- `GET /api/files/:fileId/download` ถูก mount 2 ครั้งใน `src/controllers/apiController.ts`
  - หลักฐาน: `src/controllers/apiController.ts:5380` และ `src/controllers/apiController.ts:5638`
  - ผล: ซ้ำซ้อน ทำให้สับสนว่าอันไหนคือ behavior จริง

### MEDIUM – Side effects ตอน import ทำให้ test/process ค้าง + startup หนัก

- `src/utils/index.ts` export `serviceContainer` (`src/utils/index.ts:6`)
  - ส่งผลให้ “แค่ import utils” ก็ลาก import ของ service จำนวนมาก (`src/utils/serviceContainer.ts`) และ dependency chain อื่น ๆ
- `src/utils/throttledLogger.ts` เปิด `setInterval` ตอน import (`src/utils/throttledLogger.ts:133-136`)
  - ทำให้ Jest เจอ open handle และไม่ยอม exit

### MEDIUM – กลยุทธ์ schema/migration ปะปน (เสี่ยง schema drift)

- `src/utils/database.ts` มีทั้ง:
  - เช็คตารางแล้ว `AppDataSource.synchronize()` หากตารางไม่ครบ (`src/utils/database.ts:77-83`)
  - `AppDataSource.runMigrations()` (แต่ไม่พบไดเรกทอรี `src/migrations/`) (`src/utils/database.ts:30`, `src/utils/database.ts:105`)
  - “ensure columns” ด้วย SQL ตรง (`src/utils/database.ts:139+`)
- ผลกระทบ:
  - behavior ใน production อาจคาดเดายาก (โดยเฉพาะถ้า DB ว่าง/ขาดตาราง)
- แนะนำ:
  - เลือกแนวทางเดียว: migrations อย่างเป็นระบบ (preferred) หรือ synchronize เฉพาะ dev
  - ถ้าจะมี ensure-columns → ทำเป็น migration ชัดเจน

### LOW – Runtime command ที่พึ่ง network (ไม่เสถียรใน production/offline)

- `ProjectChecklistService` ใช้ `execSync('npm audit --json')` (`src/services/ProjectChecklistService.ts:205-221`)
- เมื่อ network ปิด/ช้า → จะทำให้ผลตรวจ “ไม่แม่น” และเพิ่ม latency
- แนะนำ:
  - ทำ security audit ใน CI/CD แทน runtime
  - ถ้าจำเป็นต้องทำ runtime → ต้อง handle “ตรวจไม่ได้” ให้สะท้อนสถานะจริง (ไม่ควรคืน vulnerabilities=0)

### LOW – Logging แบบ debug ด้วย `console.log` ใน middleware

- หลักฐาน: `src/index.ts:133-183` มี `console.log` ทุก request ที่ `/dashboard`
- แนะนำ:
  - ใช้ logger ที่มีระดับ (info/debug) และปิดใน production

