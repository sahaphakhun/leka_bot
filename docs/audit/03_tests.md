# 03) Tests (Jest) + ข้อจำกัด Environment

## สรุป

- มี test suites ทั้งหมด 9 ชุด (`npx jest --listTests`)
- พบ 2 ประเด็นสำคัญ:
  1. **Jest มี open handle** ทำให้ไม่ยอม exit เอง (ต้อง `--forceExit` หรือแก้ root cause)
  2. **Environment นี้ห้ามเปิดพอร์ต/listen** ทำให้ `supertest` (controller tests) รันไม่ได้

## รายการ test suites

คำสั่ง: `npx jest --listTests`

พบ:

- `src/services/NotificationService.test.ts`
- `src/services/GoogleService.test.ts`
- `src/services/GoogleCalendarService.test.ts`
- `src/services/LineService.test.ts`
- `src/services/FileService.test.ts`
- `src/services/CronService.test.ts`
- `src/utils/sanitize.test.ts`
- `src/controllers/uploadFiles.test.ts`
- `src/controllers/fileRoutes.test.ts`

## ประเด็นที่ 1: Jest open handle (root cause ชัดเจน)

- รัน: `npx jest src/utils/sanitize.test.ts --runInBand --detectOpenHandles --forceExit`
- ผล: test ผ่าน แต่ Jest รายงาน open handle:
  - `setInterval` ใน `src/utils/throttledLogger.ts:134`
  - โซ่ import: `src/utils/throttledLogger.ts` → `src/services/KPIService.ts` → `src/utils/serviceContainer.ts` → `src/utils/index.ts`

### ผลกระทบ

- CI/test runner อาจ “ค้าง” หรือใช้เวลานานผิดปกติ
- มักต้องใช้ `--forceExit` (ไม่ควรเป็นทางออกหลัก)

### แนะนำแก้

- เปลี่ยน timer ให้ไม่ block process:
  - เก็บ handle แล้ว `unref()` หรือ `clearInterval` ตอน shutdown/test
  - หรือย้ายไป start แบบ explicit (เช่น `throttledLogger.startCleanup()` เรียกจาก `Server.start()` เท่านั้น)
  - หรือ disable interval ใน test (`if (process.env.NODE_ENV !== 'test') ...`)

## ประเด็นที่ 2: Controller tests รันไม่ได้ใน environment นี้ (listen EPERM)

### อาการ

- `npx jest src/controllers/uploadFiles.test.ts --runInBand --forceExit` ล้มเหลวด้วย:
  - `Error: listen EPERM: operation not permitted 0.0.0.0`
  - โดยเกิดจาก `supertest` ต้องสร้าง server และเรียก `listen(...)`

### หลักฐานว่าเป็นข้อจำกัด environment ไม่ใช่โค้ด

แม้รัน Node ตรง ๆ ก็ listen ไม่ได้:

- `node -e "require('http').createServer(...).listen(0,()=>console.log('listening'))"`
- ได้ error `listen EPERM`

### ผลกระทบ

- ใน harness นี้ **ไม่สามารถยืนยัน integration tests ของ controller routes ได้**
- แต่ใน environment ปกติ (เครื่อง dev/CI ที่เปิดพอร์ตได้) ควรรันได้

### แนะนำ

- สำหรับ CI จริง: ต้องรันใน environment ที่อนุญาต listen
- สำหรับ test design:
  - ลด side effects ระหว่าง import (ดู `src/utils/index.ts:6` ที่ export `serviceContainer`)
  - พิจารณาแยก pure-unit tests ออกให้ไม่ต้องเริ่ม server

## หมายเหตุ: ts-jest deprecation warning

- `jest.config.js:8-12` ใช้ `globals.ts-jest` ซึ่งถูก deprecate
- แนะนำ migrate ไปใช้ `transform` ตามคู่มือ ts-jest

