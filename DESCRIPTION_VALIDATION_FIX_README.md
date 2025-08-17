# การแก้ไขปัญหา Validation Error สำหรับฟิลด์ Description

## ปัญหาที่พบ
เมื่อสร้างงานใหม่ใน Dashboard เกิด error:
```
❌ Validation failed: [
  {
    message: '"description" is not allowed to be empty',
    path: [ 'description' ],
    type: 'string.empty',
    context: { label: 'description', value: '', key: 'description' }
  }
]
```

## สาเหตุ
1. **ฟิลด์ Description เป็น Optional แต่ส่งค่าว่าง**: ใน validation schema ฟิลด์ `description` ถูกกำหนดเป็น `optional()` แต่เมื่อส่งข้อมูลไปยัง API ฟิลด์นี้ถูกส่งเป็นค่าว่าง `''` ซึ่งทำให้ validation fail

2. **การส่งข้อมูลที่ไม่จำเป็น**: โค้ดเดิมส่งฟิลด์ที่ไม่มีค่าไปยัง API แทนที่จะลบออก

## การแก้ไขที่ทำ

### 1. แก้ไขการสร้าง Task Data (`script.js:2083`)
- เปลี่ยนจาก `description: formData.get('description')?.trim() || ''` เป็น `description: description || undefined`
- สร้าง taskData ใหม่โดยไม่รวมฟิลด์ที่ไม่มีค่า
- เพิ่มการตรวจสอบและแสดงสถานะ success/error สำหรับแต่ละฟิลด์

### 2. เพิ่มการทำความสะอาดข้อมูล (`script.js:944`)
- เพิ่มการลบฟิลด์ที่ไม่มีค่า (undefined, null, empty string) ออกจาก taskData ก่อนส่งไปยัง API
- เพิ่มการตรวจสอบฟิลด์ที่จำเป็นก่อนส่งข้อมูล

### 3. ปรับปรุง UI และ UX
- เพิ่ม CSS class `optional-field` และ `field-hint` สำหรับฟิลด์ที่ไม่บังคับ
- แสดงข้อความ hint "ไม่บังคับ - สามารถเว้นว่างได้" สำหรับฟิลด์ description
- เพิ่มการแสดงสถานะ success/error สำหรับแต่ละฟิลด์ในฟอร์ม

### 4. เพิ่มการจัดการ Error ที่ดีขึ้น
- เพิ่มฟังก์ชัน `showFormErrors()` เพื่อแสดง error ในฟอร์ม
- ปรับปรุงข้อความ error ให้ชัดเจนขึ้น
- เพิ่มการ logging เพื่อ debug

## ไฟล์ที่แก้ไข

### `dashboard/script.js`
- บรรทัด 2083: แก้ไขการสร้าง taskData
- บรรทัด 944: เพิ่มการทำความสะอาดข้อมูล
- เพิ่มฟังก์ชัน `showFormErrors()`

### `dashboard/index.html`
- บรรทัด 467: เพิ่ม CSS class และ hint สำหรับฟิลด์ description

### `dashboard/styles.css`
- เพิ่ม CSS สำหรับ `field-hint` และ `optional-field`

## ผลลัพธ์
1. **แก้ปัญหา Validation Error**: ฟิลด์ description ที่เป็นค่าว่างจะไม่ถูกส่งไปยัง API
2. **ปรับปรุง UX**: ผู้ใช้เห็นชัดเจนว่าฟิลด์ไหนบังคับ/ไม่บังคับ
3. **ลดการส่งข้อมูลที่ไม่จำเป็น**: API จะได้รับเฉพาะข้อมูลที่มีค่าเท่านั้น
4. **การจัดการ Error ที่ดีขึ้น**: แสดงข้อความ error ที่ชัดเจนและตรงจุด

## การทดสอบ
1. สร้างงานใหม่โดยไม่กรอก description → ควรสำเร็จ
2. สร้างงานใหม่โดยกรอก description → ควรสำเร็จ
3. สร้างงานใหม่โดยไม่เลือก assignee → ควรแสดง error
4. สร้างงานใหม่โดยไม่กรอก title → ควรแสดง error

## หมายเหตุ
- ฟิลด์ description ยังคงเป็น optional ตามเดิม
- การเปลี่ยนแปลงนี้ไม่กระทบกับฟังก์ชันการทำงานอื่นๆ
- รองรับทั้งงานปกติและงานประจำ (recurring tasks)
