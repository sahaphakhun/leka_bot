# Leka Bot – Code Audit Reports

รายงานชุดนี้สร้างจากการตรวจสอบ “โค้ดจริง + ผลรันคำสั่งในเครื่อง” โดย **ไม่อ้างอิง/ไม่เชื่อ** เอกสาร `.md` เดิมที่มีอยู่ใน repo

## รายงานตามหมวด

- `docs/audit/00_audit_scope_and_method.md` – ขอบเขต วิธีตรวจ ข้อจำกัดสภาพแวดล้อม
- `docs/audit/01_repo_hygiene_and_secrets.md` – ความสะอาดของ repo + ความลับ/ไฟล์เสี่ยงหลุด
- `docs/audit/02_tooling_lint_typecheck_build.md` – ผล Lint/Typecheck/Build (backend + dashboard-new)
- `docs/audit/03_tests.md` – สถานะ tests, ปัญหา open handles, ข้อจำกัด environment
- `docs/audit/04_backend_security.md` – ความปลอดภัย backend (Auth/CORS/Admin/File upload/CSP)
- `docs/audit/05_backend_logic_and_maintainability.md` – บัคเชิงโครงสร้าง/maintainability (duplicate routes, side effects, DB schema strategy)
- `docs/audit/06_frontend_dashboard_new_lint_and_quality.md` – dashboard-new lint/คุณภาพโค้ด
- `docs/audit/07_frontend_legacy_dashboard_risks.md` – dashboard เก่า: XSS/inline handlers/โค้ดก้อนใหญ่
- `docs/audit/08_deployment_configs.md` – Deployment configs (Docker/Railway/Nixpacks/Procfile) + ความสอดคล้องของ Node/Package manager
- `docs/audit/09_mobile_app_review.md` – mobile-app (Expo) ภาพรวมความเสี่ยง/ข้อเสนอแนะ

