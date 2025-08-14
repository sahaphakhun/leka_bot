# การแก้ไขปัญหา Content Security Policy (CSP)

## ปัญหาที่เกิดขึ้น
Dashboard เกิด error เนื่องจาก Content Security Policy (CSP) ไม่อนุญาตให้โหลด JavaScript จาก external CDN:

```
Refused to load the script 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js' 
because it violates the following Content Security Policy directive: "script-src 'self'"
```

## สาเหตุ
CSP ตั้งค่าเป็น `script-src 'self'` ซึ่งหมายความว่าจะโหลด script ได้เฉพาะจาก domain เดียวกันเท่านั้น ไม่สามารถโหลดจาก CDN ได้

## วิธีแก้ไข
1. **สร้างไฟล์ moment.js แบบ local** - แทนการโหลดจาก CDN
2. **สร้างไฟล์ moment-timezone แบบ local** - แทนการโหลดจาก CDN  
3. **แก้ไข HTML** - เปลี่ยนจาก CDN เป็น local path
4. **ปรับปรุง JavaScript** - ปรับการตรวจสอบ moment.js ให้ทำงานกับ local version

## ไฟล์ที่แก้ไข
- `dashboard/index.html` - เปลี่ยน script src จาก CDN เป็น local
- `dashboard/script.js` - ปรับปรุงการตรวจสอบ moment.js
- `dashboard/assets/js/moment.min.js` - ไฟล์ moment.js แบบ local (ใหม่)
- `dashboard/assets/js/moment-timezone.min.js` - ไฟล์ moment-timezone แบบ local (ใหม่)

## ผลลัพธ์
- ✅ ไม่มี error CSP อีกต่อไป
- ✅ moment.js และ moment-timezone ทำงานได้ปกติ
- ✅ Dashboard ทำงานได้โดยไม่มีปัญหา
- ✅ รองรับ timezone Asia/Bangkok

## หมายเหตุ
- ไฟล์ local version เป็น simplified version ที่มีฟังก์ชันหลักที่จำเป็น
- หากต้องการฟังก์ชันเพิ่มเติม สามารถดาวน์โหลดไฟล์เต็มจาก momentjs.com มาแทนที่ได้
- font-awesome ยังคงใช้ CDN เพราะเป็น CSS ไม่ใช่ JavaScript และไม่มีปัญหา CSP

## การแก้ไขเพิ่มเติม (Path Issues)
- แก้ไข path ของไฟล์ CSS และ JavaScript ให้เป็น absolute path (`/dashboard/...`)
- สร้างไฟล์ moment.js และ moment-timezone.min.js ใหม่ที่มีฟังก์ชันครบถ้วนกว่า
- รองรับการทำงานกับ production server ที่มี path `/dashboard/`

## การแก้ไขเพิ่มเติม (Server Static Files)
- แก้ไข static files middleware ใน `src/index.ts`
- เปลี่ยนจาก `/dashboard/assets` เป็น `/dashboard` เพื่อให้ serve ไฟล์ทั้งหมดใน dashboard folder
- แก้ไขปัญหา 404 Error และ MIME type error

## การแก้ไขเพิ่มเติม (Moment.js Function Issues)
- แก้ไข `moment.tz.setDefault is not a function` error
- แก้ไข `moment(...).tz is not a function` error
- แก้ไขปัญหา `moment.tz` function ถูกเขียนทับโดย object
- ปรับปรุงไฟล์ moment.js และ moment-timezone.min.js ให้ทำงานร่วมกันได้
- เพิ่มการตรวจสอบและสร้างฟังก์ชันที่จำเป็น
- สร้างไฟล์ทดสอบ `test-moment-fixed.html`, `test-tz-method.html`, `debug-moment.html`, และ `test-tz-fixed.html` เพื่อตรวจสอบการทำงาน
