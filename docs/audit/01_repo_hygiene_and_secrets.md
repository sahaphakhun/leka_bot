# 01) Repo Hygiene & Secrets (CRITICAL)

## สรุป

ปัญหาใหญ่สุดของ repo ตอนนี้คือ **มีไฟล์ลับถูก track ใน git** และ **.gitignore ไม่ครอบคลุมไฟล์สำคัญ** ทำให้โอกาส “หลุด token/secret” สูงมาก รวมถึง deployment ผ่าน Docker มีความเสี่ยง “เอาไฟล์ไม่ควรขึ้น image” เข้าไปด้วย เพราะไม่มี `.dockerignore`

## Findings

### CRITICAL – `.env` ถูก track ใน git (secret leak)

- หลักฐาน:
  - `.gitignore` มีแค่ `node_modules` (`.gitignore:1`)
  - `.env` อยู่ในรายการ tracked files (`git ls-files .env` พบ `.env`)
- ผลกระทบ:
  - ถ้า `.env` มี `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` จริง → **หลุด token/secret**
  - ต้องถือว่า “secret ถูกเปิดเผยแล้ว” และควร rotate
- แนะนำ:
  1. เพิ่ม `.env` ลง `.gitignore`
  2. `git rm --cached .env` (เอาออกจากการ track แต่คงไฟล์ไว้ในเครื่อง)
  3. Rotate secrets ทั้งหมดที่เคยอยู่ใน `.env`
  4. ใช้ `env.example` เป็นไฟล์ตัวอย่างแทน

### HIGH – `dist/` ถูก commit/tracked (artifact ใน repo)

- หลักฐาน: `git ls-files dist/...` พบไฟล์จำนวนมาก เช่น `dist/controllers/*` และ `dist/dashboard-new/dist/*`
- ผลกระทบ:
  - เสี่ยง “artifact ค้าง/ไม่ตรงกับ src” (debug ยาก)
  - ทำให้ repo ใหญ่ขึ้น และ PR/merge noisy
- แนะนำ:
  - ตัดสิน policy ให้ชัด:
    - ถ้าจะไม่ commit artifact → ignore `dist/` ใน `.gitignore` และ build ใน CI/CD
    - ถ้าจำเป็นต้อง commit (บาง workflow) → ต้องมีขั้นตอนตรวจว่าตรงกับ source เสมอ

### HIGH – ไม่มี `.dockerignore` (เสี่ยง secret และ build context ใหญ่)

- หลักฐาน: ไม่มีไฟล์ `.dockerignore` (ตรวจไม่พบ)
- ผลกระทบ:
  - `Dockerfile` มี `COPY . .` → build context อาจรวม `.env`, `dist`, `node_modules`, docs ฯลฯ
  - ทำให้ build ช้า/ใหญ่ และเพิ่มความเสี่ยงเอาของไม่ควรไปอยู่ใน image
- แนะนำ:
  - เพิ่ม `.dockerignore` อย่างน้อยให้ ignore:
    - `.env`, `node_modules/`, `dashboard-new/node_modules/`, `dist/` (ขึ้นกับ policy), `.git/`, logs

### MEDIUM – Lockfile/Package manager ไม่สอดคล้องกันใน `dashboard-new/`

- หลักฐาน: `dashboard-new/` มีทั้ง `package-lock.json` และ `pnpm-lock.yaml`
- ผลกระทบ:
  - ทีมอาจ install คนละ tool → dependency drift / reproducibility ลดลง
- แนะนำ:
  - เลือกให้ชัดว่า `dashboard-new` ใช้ `npm` หรือ `pnpm` แล้วลบ lockfile ที่ไม่ใช้

## Quick checklist (ทำแล้วควรตรวจอะไรต่อ)

- ตรวจด้วยคำสั่ง:
  - `git grep -n \"LINE_CHANNEL_ACCESS_TOKEN|LINE_CHANNEL_SECRET\" -S .`
  - `git log -- .env` (ดูประวัติการหลุด)
  - ใช้ secret scanner (เช่น gitleaks) ใน CI (ต้องมี network/เครื่องมือ)

