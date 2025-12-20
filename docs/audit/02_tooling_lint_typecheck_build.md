# 02) Tooling: Lint / Typecheck / Build

## สรุปผลย่อ

- Backend:
  - Lint: ❌ รันไม่ได้ (ไม่มี ESLint config)
  - Typecheck: ✅ ผ่าน
  - Build: ✅ ผ่าน
- dashboard-new:
  - Lint: ❌ ไม่ผ่าน (38 errors / 41 warnings)
  - Build: ✅ ผ่าน

## Backend (root)

### ❌ `npm run lint` ล้มเหลวเพราะไม่มี ESLint configuration

- คำสั่ง: `npm run lint`
- ผลลัพธ์: ESLint แจ้ง `couldn't find a configuration file`
- หลักฐาน: script มีอยู่ใน `package.json` แต่ไม่มี `.eslintrc*` หรือ `eslint.config.*`
- ผลกระทบ:
  - ไม่สามารถ enforce code style / catch bug ด้วย lint ได้จริง
- แนะนำ:
  - เพิ่ม `eslint.config.js` (หรือ `.eslintrc.cjs`) ที่ root และกำหนด rules สำหรับ TS (`@typescript-eslint`)
  - เพิ่ม ignore ที่เหมาะสม (`dist/`, `node_modules/`)

### ✅ TypeScript typecheck ผ่าน

- คำสั่ง: `npx tsc -p tsconfig.json --noEmit`
- ผลลัพธ์: ผ่าน (exit 0)

### ✅ Build ผ่าน แต่มี warnings ที่ควรจัดการ

- คำสั่ง: `npm run build`
- ผลลัพธ์: ผ่าน
- Warnings ที่พบ:
  - Browserslist/caniuse-lite outdated (แนะนำอัปเดตใน environment ที่มี network)
  - Vite baseline-browser-mapping outdated
  - chunk > 500kB ใน dashboard-new build (เป็น performance warning)

## dashboard-new

### ❌ `npm -C dashboard-new run lint` ไม่ผ่าน

- คำสั่ง: `npm -C dashboard-new run lint`
- ผลลัพธ์: 38 errors / 41 warnings
- กลุ่ม error สำคัญ:
  - `no-undef`: `clients` ใน service worker (`dashboard-new/public/sw.js:215`)
  - `no-undef`: `__dirname`, `process` ใน `dashboard-new/vite.config.js` (ไฟล์ Node แต่ ESLint ใช้ browser globals)
  - `no-unused-vars`: unused import/vars หลายจุด เช่น `dashboard-new/src/App.jsx:6`, `dashboard-new/src/components/common/ErrorBoundary.jsx:22`
  - `no-case-declarations`: ประกาศ `const` ใน `switch case` ไม่มี `{}` เช่น `dashboard-new/src/services/recurringService.js:43`
  - `react-hooks/exhaustive-deps`: missing deps ใน hooks หลายไฟล์
- แนะนำ:
  - ปรับ `dashboard-new/eslint.config.js` ให้แยก environment ตาม file pattern:
    - `public/sw.js` → service worker globals
    - `vite.config.js` → node globals
    - `src/**` → browser/react globals
  - เพิ่ม config สำหรับ ignore unused args/caught errors (เช่น `_`)

### ✅ `npm -C dashboard-new run build` ผ่าน

- รันผ่าน `npm run build` ที่ root แล้ว (vite build สำเร็จ)

