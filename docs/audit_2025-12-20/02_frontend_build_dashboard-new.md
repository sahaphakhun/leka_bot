# Frontend Build — `dashboard-new`

## คำสั่งที่ใช้

- `npm -C dashboard-new run build`

## สรุปผล

- Build: **ผ่าน**
- พบ warning ที่ควรรับรู้:
  1. `baseline-browser-mapping` ข้อมูลเก่า (แนะนำอัปเดต devDependency เมื่อเปิดเน็ตได้)
  2. มี module `src/services/api.js` ถูก import ทั้งแบบ static และ dynamic → bundler เตือนว่า dynamic import จะไม่ช่วยแยก chunk
  3. มี chunk ใหญ่เกิน 500 kB หลัง minify → แนะนำ code-splitting / manualChunks หากอยากลดขนาด initial load

## ข้อเสนอแนะ (ลำดับความสำคัญ)

1. ถ้าอยากลด bundle แรกโหลด: แยกหน้า/โมดัลหนัก ๆ ด้วย dynamic import จริง ๆ (ให้ไม่มี static import ซ้ำ)
2. ตั้ง `build.rollupOptions.output.manualChunks` สำหรับ vendor/feature ใหญ่ ๆ ถ้าต้องคุมขนาด chunk
3. อัปเดต `baseline-browser-mapping@latest -D` ตอนที่อนุญาต network ได้

