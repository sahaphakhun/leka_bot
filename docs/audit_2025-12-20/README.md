# Audit (Fresh Run) — 2025-12-20

เอกสารชุดนี้เป็น “ผลตรวจใหม่” จากการรันคำสั่งจริงใน repo ปัจจุบัน โดย **ไม่อ้างอิง/ไม่เชื่อ** เอกสาร `.md` เดิมที่มีอยู่ใน repo

## Scope ที่ตรวจ (รอบนี้)

1. **Frontend (`dashboard-new`)**
   - ESLint: แก้ให้ “ผ่าน” (ไม่มี error)
   - Build: ตรวจว่าบิลด์ได้ และเก็บ warning สำคัญ
2. **Backend (`src/`)**
   - สถานะ tooling (lint/test) และข้อจำกัดจาก sandbox

## สภาพแวดล้อมที่มีผลต่อผลตรวจ

- Network policy: restricted (ไม่มีการดึง dependency เพิ่มจากเน็ตในรอบนี้)
- Sandbox: พบว่า `net.Server.listen(...)` ถูกบล็อกด้วย `EPERM` (ส่งผลให้ test ที่ต้องเปิดพอร์ตล้ม)

## เอกสารรายหมวด

- `docs/audit_2025-12-20/01_frontend_lint_dashboard-new.md`
- `docs/audit_2025-12-20/02_frontend_build_dashboard-new.md`
- `docs/audit_2025-12-20/03_backend_lint_root.md`
- `docs/audit_2025-12-20/04_tests_jest.md`
- `docs/audit_2025-12-20/05_frontend_hook_dependency_risks.md`

