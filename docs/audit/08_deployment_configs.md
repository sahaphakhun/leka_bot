# 08) Deployment Configs (Docker / Railway / Nixpacks)

## สรุป

มีความไม่สอดคล้องเรื่อง “เครื่องมือ build/แพ็กเกจ” และ “Node version” ระหว่างแต่ละ config รวมถึงขาด `.dockerignore` ซึ่งควรแก้ก่อนทำ production deployment แบบจริงจัง

## Findings

### HIGH – ไม่มี `.dockerignore` (กระทบทั้ง security และ performance)

- ดูรายละเอียดเพิ่มใน `docs/audit/01_repo_hygiene_and_secrets.md`
- Dockerfile มี `COPY . .` → เสี่ยงเอาไฟล์ไม่ควรขึ้น image เข้าไป

### MEDIUM – Node/Package manager ไม่สอดคล้องกัน

- Root:
  - `package.json` ระบุ `engines.node >= 18`
  - `nixpacks.toml` ใช้ `nodejs-18_x`
  - `Dockerfile` ใช้ `node:20-alpine`
- `dashboard-new`:
  - `dashboard-new/nixpacks.toml` ใช้ `nodejs-18_x` + `pnpm`
  - แต่ build script ที่ root (`build.js`) ใช้ `npm ci` ภายใน `dashboard-new`
- ผลกระทบ:
  - build reproducibility ลดลง และเวลามีปัญหาจะ debug ยาก
- แนะนำ:
  - ตกลงให้ชัด: `dashboard-new` ใช้ `pnpm` หรือ `npm` และให้ทุก pipeline ใช้เหมือนกัน

### MEDIUM – Procfile build ตอน start

- `Procfile` คือ `web: npm run build:no-css && npm start`
- ผลกระทบ:
  - deploy/start ช้าและเสี่ยง failure ตอน runtime
- แนะนำ:
  - แยก build step ออกจาก start step (ทำ build ใน build phase)

## ไฟล์ที่เกี่ยวข้อง

- Docker: `Dockerfile`, `railway-build.sh`
- Railway root: `railway.json`
- Nixpacks root: `nixpacks.toml`
- dashboard-new deploy: `dashboard-new/railway.json`, `dashboard-new/nixpacks.toml`

