# 04) Backend Security Review (CRITICAL)

## สรุป

มีหลายจุดที่เข้าข่าย **CRITICAL** เพราะสามารถ “ปลอมตัวเป็นผู้ใช้คนอื่น / เรียก admin endpoints / อัปโหลดไฟล์มหาศาลเพื่อทำให้เซิร์ฟเวอร์ล่ม” ได้

> หมายเหตุ: รายงานนี้อ้างอิงจากโค้ดจริงเท่านั้น (ไม่เชื่อเอกสารเดิม)

## Findings

### CRITICAL – Authentication แบบ `userId` จาก query/payload (ปลอมตัวได้)

#### 1) Middleware authenticate ใช้ `?userId=...`

- หลักฐาน: `src/middleware/auth.ts:29-62`
  - ดึง `req.query.userId` แล้ว `findByLineUserId(...)`
  - ไม่มีการ verify signature/JWT/session ใด ๆ
- ผลกระทบ:
  - ผู้โจมตีที่รู้/เดา LINE userId ของเหยื่อ → เรียก API โดยปลอมเป็นเหยื่อได้

#### 2) Dashboard “no-auth endpoints” ใช้ `userId` จาก body

- หลักฐาน:
  - `src/controllers/apiController.ts:770-980` (`submitTaskFromDashboard`)
  - `src/controllers/apiController.ts:987-1136` (`updateTaskFromDashboard`)
- แม้มีการเช็ค “assigned/creator/membership” แต่ตัวตนมาจากค่า `userId` ที่ client ส่งเอง → spoof ได้

### CRITICAL – Admin/Maintenance endpoints ไม่ถูกป้องกัน

- หลักฐาน: routes `/api/admin/*` และ `/api/maintenance/*` ถูก mount โดยไม่มี `authenticate`/admin guard
  - ตัวอย่าง: `src/controllers/apiController.ts:5648-5747`
    - `/api/admin/migrate`
    - `/api/admin/groups/:groupId` (delete group)
    - `/api/maintenance/cleanup-inactive-groups`
    - `/api/admin/trigger-daily-summary` ฯลฯ
- ผลกระทบ:
  - ผู้โจมตีสามารถ trigger งานที่กระทบข้อมูล/ระบบได้ (migration, delete, cleanup)
- แนะนำ:
  - ต้องมี “admin auth” (เช่น header token จาก ENV) และจำกัด origin/IP ใน production
  - ปิด endpoint เหล่านี้ใน production หากไม่จำเป็น

### HIGH – CORS เปิดกว้างใน production

- หลักฐาน: `src/index.ts:83-107`
  - แม้มี `allowedOrigins` แต่กรณีไม่ match ก็ยัง `callback(null, true)`
- ผลกระทบ:
  - ทำให้ web ใด ๆ เรียก API ได้จาก browser context
  - เมื่อ combine กับ auth ที่อ่อน (`userId` spoofable) → ความเสี่ยงยิ่งสูง
- แนะนำ:
  - ใน production ต้อง `callback(new Error('Not allowed'), false)` เมื่อไม่อยู่ใน allowlist

### HIGH – File upload เสี่ยง DoS และ malware hosting

- หลักฐาน:
  - `multer.memoryStorage()` ไม่มี limits: `src/controllers/apiController.ts:63`
  - JSON body limit ใหญ่: `src/index.ts:126` (`limit: "200mb"`)
  - อนุญาต `application/octet-stream` (catch-all): `src/controllers/apiController.ts:911`, `src/controllers/apiController.ts:1906`, `src/controllers/apiController.ts:2235`
  - อนุญาต `.exe` (`application/x-msdownload`): `src/controllers/apiController.ts:2226`
- ผลกระทบ:
  - ส่งไฟล์ใหญ่มากเข้า memory → process OOM/ล่มง่าย
  - ระบบกลายเป็นที่เก็บไฟล์อันตราย
- แนะนำ:
  - ใส่ `limits` ใน multer (fileSize, files)
  - หลีกเลี่ยง memoryStorage สำหรับไฟล์ใหญ่ (ใช้ disk/stream)
  - จำกัดชนิดไฟล์ให้แคบลง + ทำ scanning/validation ที่เข้มขึ้น

### HIGH – CSP อนุญาต inline scripts/handlers (เพิ่มความเสี่ยง XSS)

- หลักฐาน: `src/index.ts:44-78`
  - `scriptSrc` มี `'unsafe-inline'`
  - `scriptSrcAttr` มี `'unsafe-inline'`
  - `styleSrc` มี `'unsafe-inline'`
- ผลกระทบ:
  - ถ้าเกิด XSS ที่หน้า dashboard → โอกาส exploit สูงขึ้นมาก
- แนะนำ:
  - ค่อย ๆ remove inline handlers ใน legacy dashboard
  - ออกแบบ CSP แบบ nonce/hash สำหรับ inline ที่จำเป็นจริง

### MEDIUM – Public file preview/download อาจ bypass authorization

- หลักฐาน:
  - route `"/files/:fileId/preview"` และ `"/files/:fileId/download"` อยู่ในหมวด “public access”: `src/controllers/apiController.ts:5378-5405`
  - `previewFile` จะตรวจ group เฉพาะเมื่อมี `groupId` param: `src/controllers/apiController.ts:1620-1632`
- ผลกระทบ:
  - ถ้า fileId ถูกเดา/รั่วไหล → อาจเข้าถึงไฟล์ได้โดยไม่ต้องรู้ group
- แนะนำ:
  - บังคับ auth หรือบังคับให้ทุกการเรียกต้องผ่าน group context ที่ตรวจสิทธิ์เสมอ
  - หรือใช้ signed URL ที่หมดอายุ

### MEDIUM – JWT secret default อ่อนมาก

- หลักฐาน: `src/utils/config.ts:81` ใช้ default `'your-secret-key'`
- ผลกระทบ:
  - ถ้า JWT ถูกใช้จริงในบาง flow → token forge ได้
- แนะนำ:
  - บังคับให้ตั้ง `JWT_SECRET` ใน production และทำ validation

### MEDIUM – Debug/temporary endpoints อาจหลุดข้อมูล/บายพาส validation

- หลักฐาน:
  - `/api/debug/recurring-test`: `src/controllers/apiController.ts:5509-5527`
  - `/api/groups/:groupId/recurring-no-validation`: `src/controllers/apiController.ts:5529-5554`
- แนะนำ:
  - ปิดใน production หรือใส่ admin guard

