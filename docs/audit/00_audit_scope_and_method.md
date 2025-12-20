# 00) ขอบเขต/วิธีตรวจ (Audit Scope & Method)

## เวอร์ชันที่ตรวจ

- Git commit: `97517c7` (short SHA)
- วันที่ตรวจ: 2025-12-19 (ตาม timestamp log ที่รัน)

## สภาพแวดล้อมที่ใช้ตรวจ (สำคัญต่อการตีความผล)

- Node.js: `v25.2.1`
- npm: `11.6.2`
- Python: `3.13.7`
- ข้อจำกัดของ harness ที่กระทบผลทดสอบ:
  - **Network ถูกจำกัด** (เช่น `npm audit` ติดต่อ `registry.npmjs.org` ไม่ได้)
  - **ห้ามเปิดพอร์ต/listen** ใน runtime (`listen EPERM`) ทำให้ integration tests ที่ต้อง `supertest` เปิด server รันไม่ได้

> หมายเหตุ: รายงานนี้จึงเน้น “ตรวจจากโค้ด + คำสั่งที่ทำได้” และชี้ชัดว่าอะไรเป็นข้อจำกัด environment vs ปัญหาจริงของโปรเจกต์

## ขอบเขตที่ตรวจ

- Backend (Node.js + TypeScript + Express): `src/`
- Frontend ใหม่ (React + Vite): `dashboard-new/`
- Dashboard เก่า (Vanilla JS): `dashboard/`
- Mobile app (Expo): `mobile-app/`
- Tooling/Build/Deploy configs: `package.json`, `tsconfig.json`, `build.js`, `Dockerfile`, `railway*.{json,sh}`, `nixpacks.toml`, `Procfile`
- Repo hygiene: `.gitignore`, ไฟล์ลับที่ถูก track, ไฟล์ artifact ที่ commit

## หลักการ/แนวทางที่ใช้

- **ไม่เชื่อเอกสาร `.md` เดิม**: ตรวจจาก source code และผลรันคำสั่งจริงเท่านั้น
- ให้ severity ระดับ:
  - **CRITICAL**: โหว่/ความเสี่ยงที่ “ยึดระบบ/ลบข้อมูล/ปลอมตัว/ทำให้ข้อมูลรั่ว” ได้ง่าย หรือมีผลกระทบสูงมาก
  - **HIGH**: ช่องโหว่/ปัญหาที่มีผลกระทบสูง แต่ต้องมีเงื่อนไขเพิ่ม
  - **MEDIUM**: เสี่ยง/ผิดแนวปฏิบัติ/อาจเป็นบัคในบางเงื่อนไข
  - **LOW/INFO**: คุณภาพโค้ด/ความสะอาด/เตือนเพื่อความสม่ำเสมอ

## คำสั่งที่รัน (หลัก ๆ)

- Syntax check (JS): `node --check <file>`
- Backend lint: `npm run lint` (ล้มเหลวเพราะไม่มี config)
- TypeScript typecheck: `npx tsc -p tsconfig.json --noEmit`
- Build: `npm run build`
- dashboard-new lint: `npm -C dashboard-new run lint`
- dashboard-new build: `npm -C dashboard-new run build` (ถูกรันผ่าน `npm run build` ที่ root ด้วย)
- Tests list: `npx jest --listTests`
- Tests (ตัวอย่าง): `npx jest ... --detectOpenHandles --forceExit`
- Environment constraint proof: `node -e "http.createServer(...).listen(...)"` (พบ `listen EPERM`)

