# 06) Frontend (dashboard-new) – Lint & Code Quality

## สรุป

`dashboard-new` build ได้ แต่ lint ไม่ผ่าน (มี errors/warnings จำนวนมาก) ซึ่งเพิ่มโอกาสเกิดบัคและทำให้ maintain ยาก

## Lint result (สรุปจาก `npm -C dashboard-new run lint`)

### Errors ที่ต้องแก้ก่อน (ตัวอย่างเด่น)

- Service worker globals:
  - `dashboard-new/public/sw.js:215` – `clients` ถูกมองว่า `no-undef`
- Node globals ใน Vite config:
  - `dashboard-new/vite.config.js:20-41` – `__dirname`, `process` ถูกมองว่า `no-undef`
- no-unused-vars:
  - `dashboard-new/src/App.jsx:6` – `useMemo` unused
  - `dashboard-new/src/components/common/ErrorBoundary.jsx:22` – `error` unused
  - `dashboard-new/src/services/exportService.js:40/50/62` – `filters` unused
  - `dashboard-new/src/services/apiWithCache.js:292` – `e` unused
- no-case-declarations:
  - `dashboard-new/src/services/recurringService.js:43-51`
  - `dashboard-new/src/utils/exportUtils.js:137/147`

### Warnings ที่ควรจัดการ

- `react-hooks/exhaustive-deps` – dependency array ไม่ครบหลายจุด
- `react-refresh/only-export-components` – ไฟล์ export อื่น ๆ ร่วมกับ component ทำให้ fast refresh ไม่เสถียร

## จุดเสี่ยงเชิงความปลอดภัย

- พบ `dangerouslySetInnerHTML` ใน `dashboard-new/src/components/ui/chart.jsx:64-80`
  - ปัจจุบันใช้ inject CSS จาก config
  - ถ้า config ถูก feed จาก user input → อาจเกิด CSS injection ได้ (ควรยืนยันว่า config เป็น trusted)

## ข้อเสนอแนะเชิงโครงสร้าง (เพื่อให้ lint ผ่านจริง)

1. แยก ESLint config ตามชนิดไฟล์ (สำคัญ)
   - `public/sw.js` → ตั้ง globals สำหรับ service worker
   - `vite.config.js` → ตั้ง node globals/`languageOptions` ให้ถูก
   - `src/**` → react/browser
2. ปรับ `no-unused-vars` ให้รองรับ:
   - underscore ใน function args: `argsIgnorePattern: '^_'`
   - catch param: `caughtErrorsIgnorePattern: '^_'`
3. แก้ `no-case-declarations` ด้วย `{}` รอบแต่ละ case ที่มี `const/let`
4. เคลียร์ unused imports/vars ให้หมด (เพื่อให้ CI lint gate ทำงานได้)

