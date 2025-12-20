# Tests — Jest (Root)

## สรุปผล (รอบนี้)

- การรัน `npm test` ใช้เวลานานมาก และใน sandbox รอบนี้ **เกิน 10 นาที** จนถูก timeout
- พบ warning จาก `ts-jest` ว่า config แบบ `globals.ts-jest` ถูก deprecate (ยังไม่ทำให้ fail)
- พบ test บางชุด “ล้ม” เพราะพยายามเปิดพอร์ต (`server.listen`) แล้วโดนบล็อกด้วย `EPERM`

## คำสั่งที่ใช้

- `npm test`
- `npx jest src/controllers/uploadFiles.test.ts --runInBand` (ยืนยันจุดล้ม)

## Root cause ที่ยืนยันได้

ใน environment นี้ การเปิดพอร์ตด้วย `net.Server.listen(...)` ถูกบล็อก (error: `listen EPERM: operation not permitted`)

ผลกระทบหลัก:

- test ที่ใช้ `supertest(request(app))` จะพยายามสร้าง server และ `listen(...)` → crash ทันที

ไฟล์ที่กระทบชัดเจน:

- `src/controllers/uploadFiles.test.ts`
- `src/controllers/fileRoutes.test.ts` (รูปแบบเดียวกัน)

## Warning ที่พบ (ไม่ทำให้ fail แต่ควรแก้)

- `jest.config.js` ใช้ `globals.ts-jest` ซึ่งถูกเตือนให้ย้ายไปใช้ `transform: { ... }` แทน

## แนวทางแก้ (ตัวเลือก)

1. **ถ้าต้องการให้ test รันได้ใน sandbox ที่ห้าม listen**
   - ต้อง refactor test controller จาก `supertest` ไปเป็น unit test ที่เรียก handler ตรง/จำลอง `req/res` โดยไม่เปิดพอร์ต
2. **ถ้าใช้ CI ที่อนุญาต listen ได้ตามปกติ**
   - รันทดสอบใน CI/เครื่องจริงแทน sandbox (ผลล้ม `EPERM` จะไม่เกิด)
3. **ลดเวลา test**
   - ลด side-effect ตอน import (เช่น init service หนัก ๆ), ลด console log, และแยก integration test ออกจาก unit test

