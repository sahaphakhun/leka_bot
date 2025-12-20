# Frontend Lint — `dashboard-new`

## คำสั่งที่ใช้

- `npm -C dashboard-new run lint -- --quiet` (ดูเฉพาะ error)
- `npm -C dashboard-new run lint` (ดู warning ทั้งหมด)

## สรุปผล (ล่าสุด)

- ESLint: **ผ่าน (0 errors)**  
  - ยืนยันด้วย `npm -C dashboard-new run lint -- --quiet` → exit code `0`
- Warning: **40 warnings** (ส่วนใหญ่เป็น `react-hooks/exhaustive-deps` และ `react-refresh/only-export-components`)

## สิ่งที่แก้ไขเพื่อให้ error = 0

โฟกัสหลักคือแก้ `no-unused-vars`, `no-undef`, `no-case-declarations` แบบ minimal โดยไม่ปรับกฎ ESLint

- `dashboard-new/public/sw.js`
  - ใช้ `self.clients.openWindow(...)` แทน `clients.openWindow(...)` เพื่อตัด `no-undef`
- `dashboard-new/src/App.jsx`
  - ลบ import ที่ไม่ใช้ + แก้ dependency array ให้ครบ + ใช้ state `error` แสดง banner จริง
- `dashboard-new/src/components/common/ErrorBoundary.jsx`
  - ปรับ `getDerivedStateFromError` ไม่รับพารามิเตอร์ที่ไม่ได้ใช้
- `dashboard-new/src/components/common/PDFViewer.jsx`
  - ลบ state ที่ไม่ได้ใช้งาน (`currentPage`, `totalPages`)
- `dashboard-new/src/components/common/Toast.jsx`
  - ลบ prop `id` ออกจาก signature ของ `Toast` (ยังส่งเข้ามาได้ แต่ไม่ประกาศตัวแปรที่ไม่ใช้)
- `dashboard-new/src/components/files/FileFolderView.jsx`
  - ลบ `getFileIcon` ที่ไม่ได้ถูกเรียก + ลบ icon import ที่เหลือใช้เฉพาะในฟังก์ชันนั้น
- `dashboard-new/src/components/files/FileGridView.jsx`
  - ลบ `getFileIcon` ที่ไม่ได้ถูกเรียก + ลบ icon import ที่เหลือใช้เฉพาะในฟังก์ชันนั้น
- `dashboard-new/src/components/modals/EditTaskModal.jsx`
  - ลบ `userId` ออกจากการ destructure `useAuth()` (ไม่ได้ใช้งาน)
- `dashboard-new/src/components/modals/TaskDetailModal.jsx`
  - ลบ `userId` และ permission fns ที่ไม่ได้ใช้ เหลือใช้ `getTaskPermissions`
- `dashboard-new/src/components/tasks/TableView.jsx`
  - ใช้ optional catch binding `catch {}` (ตัดตัวแปร `error` ที่ไม่ใช้)
- `dashboard-new/src/context/PermissionContext.jsx`
  - ตัดพารามิเตอร์ `task` ที่ไม่ใช้ใน `canViewTask`
- `dashboard-new/src/hooks/useKeyboardShortcuts.js`
  - ลบ import `useCallback` ที่ไม่ได้ใช้
- `dashboard-new/src/services/apiWithCache.js`
  - ใช้ optional catch binding `catch {}` (ตัดตัวแปรที่ไม่ใช้)
- `dashboard-new/src/services/exportService.js`
  - เอาพารามิเตอร์ `filters` ที่ไม่ใช้ ออกจาก helper functions และ call sites
- `dashboard-new/src/services/recurringService.js`
  - ใส่ `{}` ครอบ `case` ที่มี `const` เพื่อแก้ `no-case-declarations`
- `dashboard-new/src/utils/exportUtils.js`
  - ใส่ `{}` ครอบ `case` ที่มี `const` เพื่อแก้ `no-case-declarations`
- `dashboard-new/src/utils/requestCache.js`
  - เปลี่ยน destructure `([_, ...])` เป็น `([, ...])` เพื่อเลี่ยงตัวแปรไม่ใช้
- `dashboard-new/vite.config.js`
  - เพิ่ม `__dirname` (ESM-safe) ผ่าน `fileURLToPath(import.meta.url)` และ `import process from "process"`
  - ลบ `mkdirSync` ที่ import มาแต่ไม่ได้ใช้

## Warning ที่ยังเหลือ (ภาพรวม)

1. `react-hooks/exhaustive-deps` (18 จุด): มี `useEffect/useMemo/useCallback` ที่ dependency ไม่ครบ → เสี่ยง stale closure / ข้อมูลไม่อัปเดตตามที่ควร
2. `react-refresh/only-export-components` (22 จุด): ไฟล์ที่ export ทั้ง component และ helper/hook ทำให้ Fast Refresh อาจทำงานไม่สมบูรณ์ (เป็น warning ด้าน DX)

รายละเอียด/แนวทางแก้เชิงลึก: `docs/audit_2025-12-20/05_frontend_hook_dependency_risks.md`

