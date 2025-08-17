# การแก้ไขปัญหา Task Status Enum

## ปัญหาที่เกิดขึ้น

ระบบเกิดข้อผิดพลาด `invalid input value for enum tasks_status_enum` เนื่องจากฐานข้อมูลที่ deploy อยู่ยังไม่มี enum ที่ครบถ้วน

## สาเหตุ

ฐานข้อมูล PostgreSQL ที่ deploy อยู่ยังไม่มี enum values ที่ครบถ้วนตามที่กำหนดใน TypeORM model:

```typescript
enum: ['pending', 'in_progress', 'submitted', 'reviewed', 'approved', 'completed', 'rejected', 'cancelled', 'overdue']
```

## ข้อผิดพลาดล่าสุด

เมื่อใช้ฟีเจอร์แชทส่วนตัว ระบบเกิดข้อผิดพลาด:

```
code: '22P02',
routine: 'enum_in',
where: "unnamed portal parameter $5 = '...'"
```

เนื่องจากฟังก์ชัน `getUserIncompleteTasks` พยายามใช้ enum values ที่ไม่มีอยู่ในฐานข้อมูล:
- `'pending'` ✅ (มีอยู่)
- `'in_progress'` ✅ (มีอยู่)  
- `'overdue'` ✅ (มีอยู่)
- `'submitted'` ❌ (ไม่มีอยู่)
- `'reviewed'` ❌ (ไม่มีอยู่)

## วิธีแก้ไข

### ขั้นตอนที่ 1: แก้ไขโค้ด (ทำแล้ว)

แก้ไขฟังก์ชัน `getUserIncompleteTasks` ใน `src/services/TaskService.ts`:

**ก่อนการแก้ไข:**
```typescript
.andWhere('task.status IN (:...statuses)', { 
  statuses: ['pending', 'in_progress', 'overdue', 'submitted', 'reviewed'] 
})
```

**หลังการแก้ไข:**
```typescript
// ใช้เฉพาะ enum values ที่มีอยู่จริงในฐานข้อมูล
// ตรวจสอบจาก enum ที่มีอยู่และใช้เฉพาะที่ปลอดภัย
.andWhere('task.status IN (:...statuses)', { 
  statuses: ['pending', 'in_progress', 'overdue'] 
})
```

### ขั้นตอนที่ 2: เพิ่ม Enum ที่ขาดหายไป

รัน script เพื่อเพิ่ม enum ที่ขาดหายไปในฐานข้อมูล:

```bash
npm run ts-node src/scripts/addMissingTaskStatusEnum.ts
```

Script นี้จะ:
- ตรวจสอบ enum ที่มีอยู่ในฐานข้อมูล
- เพิ่ม enum ที่ขาดหายไป
- แสดงผลการทำงาน

### ขั้นตอนที่ 3: อัปเดตสถานะงานที่มีอยู่

รัน script เพื่ออัปเดตสถานะงานที่มีอยู่ให้ตรงกับ enum ใหม่:

```bash
npm run ts-node src/scripts/updateTaskStatuses.ts
```

Script นี้จะ:
- ตรวจสอบงานทั้งหมดในฐานข้อมูล
- อัปเดตสถานะที่ไม่ถูกต้อง
- แสดงสถิติสถานะงาน

## สถานะงานที่รองรับ

### สถานะที่ปลอดภัย (ใช้ได้ทันที):
| สถานะ | ความหมาย | การใช้งาน |
|-------|----------|-----------|
| `pending` | รอการดำเนินการ | งานที่สร้างใหม่ ยังไม่เริ่มทำ |
| `in_progress` | กำลังดำเนินการ | งานที่กำลังทำอยู่ |
| `overdue` | เกินกำหนด | งานที่เกินกำหนดส่ง |

### สถานะที่ต้องเพิ่ม enum ก่อน:
| สถานะ | ความหมาย | การใช้งาน |
|-------|----------|-----------|
| `submitted` | ส่งงานแล้ว | งานที่ผู้รับผิดชอบส่งแล้ว รอการตรวจ |
| `reviewed` | ผ่านการตรวจแล้ว | งานที่ผู้ตรวจอนุมัติแล้ว รอการอนุมัติการปิดงาน |
| `approved` | อนุมัติแล้ว | งานที่ผ่านการอนุมัติแล้ว |
| `completed` | เสร็จสิ้น | งานที่เสร็จสิ้นแล้ว |
| `rejected` | ถูกปฏิเสธ | งานที่ถูกตีกลับ |
| `cancelled` | ยกเลิก | งานที่ถูกยกเลิก |

## การแก้ไขปัญหาในโค้ด

### ไฟล์ที่แก้ไข:
- `src/services/TaskService.ts` - ฟังก์ชัน `getUserIncompleteTasks`

### การเปลี่ยนแปลง:
1. ลบ enum values ที่ไม่มีอยู่: `'submitted'`, `'reviewed'`
2. ใช้เฉพาะ enum values ที่ปลอดภัย: `'pending'`, `'in_progress'`, `'overdue'`
3. เพิ่มคอมเมนต์อธิบายการแก้ไข

### ผลลัพธ์:
- ระบบไม่เกิดข้อผิดพลาด enum
- ฟีเจอร์แชทส่วนตัวทำงานได้
- แสดงงานที่มีสถานะที่ปลอดภัยเท่านั้น

## การทดสอบ

### การทดสอบการแก้ไข:
- ✅ Build สำเร็จ (npm run build)
- ✅ ไม่มี TypeScript errors
- ✅ ฟังก์ชันทำงานได้โดยไม่เกิดข้อผิดพลาด enum

### การทดสอบฟีเจอร์:
1. เปิดแชทส่วนตัวกับบอท
2. พิมพ์ "งาน"
3. บอทควรตอบกลับด้วยการ์ดงานที่ไม่มีข้อผิดพลาด

## การแก้ไขปัญหาเพิ่มเติม

หากต้องการใช้ enum values เพิ่มเติม ให้:

1. **รัน script เพิ่ม enum:**
```bash
npm run ts-node src/scripts/addMissingTaskStatusEnum.ts
```

2. **อัปเดตสถานะงาน:**
```bash
npm run ts-node src/scripts/updateTaskStatuses.ts
```

3. **แก้ไขโค้ดกลับมา:**
```typescript
.andWhere('task.status IN (:...statuses)', { 
  statuses: ['pending', 'in_progress', 'overdue', 'submitted', 'reviewed'] 
})
```

## หมายเหตุ

- การแก้ไขนี้เป็นการแก้ไขชั่วคราวเพื่อให้ระบบทำงานได้
- หากต้องการใช้ enum values เพิ่มเติม ต้องเพิ่มในฐานข้อมูลก่อน
- ระบบจะแสดงเฉพาะงานที่มีสถานะที่ปลอดภัยเท่านั้น
- งานที่มีสถานะอื่นจะไม่แสดงในฟีเจอร์แชทส่วนตัว

## ติดต่อ

หากยังเกิดปัญหาหลังจากแก้ไขแล้ว กรุณาติดต่อทีมพัฒนาเพื่อตรวจสอบเพิ่มเติม
