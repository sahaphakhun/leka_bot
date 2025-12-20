# 07) Legacy Dashboard (`dashboard/`) – ความเสี่ยง/บัคที่พบบ่อย

## สรุป

Dashboard เก่าเป็นโค้ดก้อนใหญ่และใช้การประกอบ HTML ด้วย `innerHTML/insertAdjacentHTML` จำนวนมาก รวมถึง inline event handlers ซึ่งเป็นรูปแบบที่ “เสี่ยง XSS” และทำให้รักษาความปลอดภัยด้วย CSP ยาก

## Code size (สเกลของความเสี่ยง)

- `dashboard/script.js`: ~5659 บรรทัด
- `dashboard/script-vanilla.js`: ~7876 บรรทัด
- `dashboard/recurring-tasks.js`: ~844 บรรทัด

## Findings

### HIGH – ใช้ `innerHTML` / `insertAdjacentHTML` เยอะมาก (เสี่ยง XSS)

ตัวอย่างตำแหน่ง (ไม่ได้ไล่ครบทุกจุด):

- `dashboard/script.js:2321` (`container.innerHTML = html;`)
- `dashboard/script-vanilla.js:4052` (`insertAdjacentHTML`)
- `dashboard/submit-tasks.html:588` (`taskList.innerHTML = ...`)

> ถ้ามี “ข้อมูลจากผู้ใช้/จาก API ที่ไม่ได้ sanitize” ถูกเอามาใส่ string → สามารถ XSS ได้ง่าย

### HIGH – Inline event handlers และ inline scripts (ต้องพึ่ง `'unsafe-inline'`)

- พบการใช้ inline เช่น `onerror="..."` ใน `dashboard/script-vanilla.js:5125` และ `dashboard/script-vanilla.js:5177`
- Backend CSP ตอนนี้อนุญาต `'unsafe-inline'` (`src/index.ts:44-78`) เพื่อให้ legacy dashboard ทำงานได้
- ผลกระทบ:
  - ลดระดับความปลอดภัยของทั้งเว็บ เพราะ CSP อ่อนลง

## แนะนำ

- ถ้าใช้ dashboard-new เป็นหลัก: วางแผน deprecate legacy dashboard เพื่อลด attack surface
- ถ้าจำเป็นต้องคง legacy:
  - ทำ sanitization ให้เข้ม (เช่น DOMPurify) ก่อนเขียน `innerHTML`
  - ลด inline handlers ทีละส่วน แล้วทำ CSP แบบ nonce/hash

