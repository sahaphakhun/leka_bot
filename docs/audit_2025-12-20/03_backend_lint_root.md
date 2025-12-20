# Backend Lint — Root (`src/`)

## สถานะปัจจุบัน

- เดิม `npm run lint` **รันไม่ได้** เพราะไม่มี ESLint config
- รอบนี้เพิ่มไฟล์ config: `.eslintrc.cjs` เพื่อให้ lint รันได้จริง
- หลังมี config แล้ว: `npm run lint` พบ **136 errors (0 warnings)**  
  (ส่วนใหญ่เป็น `@typescript-eslint/no-unused-vars`, `no-case-declarations`, และกฎ TypeScript บางตัว)

## คำสั่งที่ใช้

- `npm run lint`

## ประเภทปัญหาหลักที่เจอ

1. `@typescript-eslint/no-unused-vars`
   - import/ตัวแปร/พารามิเตอร์ถูกประกาศไว้แต่ไม่ใช้
   - แนวทางแก้: ลบสิ่งที่ไม่ใช้, หรือเปลี่ยนชื่อเป็น `_xxx` ถ้าตั้งใจเว้นไว้
2. `no-case-declarations`
   - `const/let` อยู่ใน `switch case` โดยไม่ครอบ `{}`  
   - แนวทางแก้: `case "X": { const ...; break }`
3. `@typescript-eslint/no-var-requires`
   - มี `require(...)` ในไฟล์ TS บางจุด
   - แนวทางแก้: เปลี่ยนเป็น `import ... from ...` หรือ `await import(...)`
4. `no-empty`
   - block ว่าง (เช่น `catch {}` ที่ไม่มีอะไร) ถูกมองเป็น error ในบางจุด
   - แนวทางแก้: ใส่เหตุผล/ทำอะไรสักอย่าง (log/return) หรือปรับกฎให้เป็น warn
5. `@typescript-eslint/ban-types`
   - ใช้ `Function` เป็น type ในบางจุด

## ไฟล์ที่เด่น ๆ (ควรเริ่มแก้ก่อน)

- `src/controllers/apiController.ts` (unused import/vars จำนวนมาก)
- `src/controllers/webhookController.ts` (unused vars หลายจุด + `no-case-declarations`)
- `src/services/NotificationService.ts` (unused vars/args หลายจุด)
- `src/services/TaskService.ts` (`no-empty`, unused imports)
- `src/services/ProjectChecklistService.ts` (`no-var-requires`, unused arg)

## ข้อเสนอแนะการจัดการ (practical)

ถ้าต้องการให้ `npm run lint` “ผ่าน” แบบเร็วและปลอดภัย:

1. เริ่มจากแก้ `no-case-declarations` และ `no-empty` ที่เป็น logic-risk ต่ำและแก้ง่าย
2. จากนั้นเคลียร์ `no-unused-vars` เฉพาะจุดที่ชัดว่าเป็นของทิ้ง/ของหลง (imports ที่ไม่ใช้)
3. ถ้าของที่ “ตั้งใจไม่ใช้” ให้ rename เป็น `_var` เพื่อสื่อเจตนา
4. ค่อยไล่ `no-var-requires` เป็นงานปรับโครงสร้าง (แนะนำทำทีละไฟล์)

> หมายเหตุ: รอบนี้ยังไม่ได้ไล่แก้ 136 errors ทั้งหมด (เป็นงานใหญ่) แต่จัดหมวดและชี้เป้าชุดแรกให้ชัดเพื่อทำต่อได้เป็นขั้น ๆ

