# การแก้ไขปัญหา LINE API Error 400

## ปัญหาที่พบ

ระบบได้รับ LINE API Error 400 (Bad Request) จากการส่งข้อความไปยัง LINE API โดยมีสาเหตุหลักดังนี้:

1. **JSON Payload ไม่ถูกต้อง**: มีอักขระพิเศษ `;` อยู่ที่จุดเริ่มต้นของ JSON
2. **Content-Length ไม่ตรงกัน**: ระบบคำนวณ Content-Length ไม่ตรงกับข้อมูลจริง
3. **ข้อความมีอักขระควบคุมที่ไม่ปลอดภัย**: อักขระควบคุมที่อาจทำให้ JSON ไม่ถูกต้อง

## การแก้ไขที่ทำ

### 1. ปรับปรุง LineService.ts

#### เพิ่มการ validate ข้อมูล
- เพิ่ม `validateMessage()` method เพื่อตรวจสอบความถูกต้องของข้อความ
- ตรวจสอบความยาวข้อความไม่เกิน 5000 ตัวอักษร (LINE limit)
- ตรวจสอบ replyToken และ groupId ก่อนส่งข้อความ

#### เพิ่มการ sanitize ข้อความ
- เพิ่ม `sanitizeMessage()` method เพื่อทำความสะอาดข้อความ
- ลบอักขระควบคุมที่ไม่ปลอดภัย
- ลบ BOM characters
- จำกัดความยาวข้อความ

#### ปรับปรุงการจัดการ error
- เพิ่ม logging ที่ละเอียดขึ้นเพื่อ debug
- แสดงข้อมูล replyToken, messageType, messageLength เมื่อเกิด error

### 2. ปรับปรุง webhookController.ts

#### เพิ่ม safeReplyError method
- สร้าง `safeReplyError()` method เพื่อส่งข้อความ error อย่างปลอดภัย
- ตรวจสอบ replyToken ก่อนส่งข้อความ
- จำกัดความยาวข้อความ error
- จัดการ error ที่เกิดจากการส่งข้อความ error

#### แก้ไขการจัดการ error ใน postback handler
- ใช้ `safeReplyError()` แทนการส่งข้อความ error โดยตรง
- เพิ่มการตรวจสอบ replyToken ก่อนส่งข้อความ

## ไฟล์ที่แก้ไข

### src/services/LineService.ts
- เพิ่ม `validateMessage()` method
- เพิ่ม `sanitizeMessage()` method
- ปรับปรุง `replyMessage()` และ `pushMessage()` methods
- เพิ่มการ validate และ sanitize ข้อมูล

### src/controllers/webhookController.ts
- เพิ่ม `safeReplyError()` method
- แก้ไขการจัดการ error ใน postback handler
- ใช้ safeReplyError แทนการส่งข้อความ error โดยตรง

## ผลลัพธ์ที่คาดหวัง

1. **ลด LINE API Error 400**: การ validate และ sanitize ข้อมูลจะช่วยป้องกันการส่งข้อมูลที่ไม่ถูกต้อง
2. **การจัดการ error ที่ดีขึ้น**: ระบบจะไม่ crash เมื่อเกิด error ในการส่งข้อความ
3. **Debug ที่ง่ายขึ้น**: logging ที่ละเอียดขึ้นจะช่วยในการแก้ไขปัญหา
4. **ความเสถียรของระบบ**: การตรวจสอบข้อมูลก่อนส่งจะทำให้ระบบทำงานได้เสถียรขึ้น

## การทดสอบ

1. ทดสอบส่งข้อความธรรมดา
2. ทดสอบส่งข้อความที่มีอักขระพิเศษ
3. ทดสอบส่งข้อความยาวเกิน 5000 ตัวอักษร
4. ทดสอบส่งข้อความเมื่อไม่มี replyToken
5. ทดสอบการจัดการ error ต่างๆ

## หมายเหตุ

- การแก้ไขนี้จะช่วยป้องกันปัญหา LINE API Error 400 แต่ไม่สามารถแก้ไขปัญหา network หรือ LINE API server issues ได้
- ควรติดตาม log เพื่อดูการทำงานของระบบหลังการแก้ไข
- หากยังพบปัญหา ควรตรวจสอบ LINE Bot configuration และ environment variables
