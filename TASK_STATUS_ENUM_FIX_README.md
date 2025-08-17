# การแก้ไขปัญหา Task Status Enum

## ปัญหาที่เกิดขึ้น

ระบบเกิดข้อผิดพลาด `invalid input value for enum tasks_status_enum` เนื่องจากฐานข้อมูลที่ deploy อยู่ยังไม่มี enum ที่ครบถ้วน

## สาเหตุ

ฐานข้อมูล PostgreSQL ที่ deploy อยู่ยังไม่มี enum values ที่ครบถ้วนตามที่กำหนดใน TypeORM model:

```typescript
enum: ['pending', 'in_progress', 'submitted', 'reviewed', 'approved', 'completed', 'rejected', 'cancelled', 'overdue']
```

## วิธีแก้ไข

### ขั้นตอนที่ 1: เพิ่ม Enum ที่ขาดหายไป

รัน script เพื่อเพิ่ม enum ที่ขาดหายไปในฐานข้อมูล:

```bash
npm run ts-node src/scripts/addMissingTaskStatusEnum.ts
```

Script นี้จะ:
- ตรวจสอบ enum ที่มีอยู่ในฐานข้อมูล
- เพิ่ม enum ที่ขาดหายไป
- แสดงผลการทำงาน

### ขั้นตอนที่ 2: อัปเดตสถานะงานที่มีอยู่

รัน script เพื่ออัปเดตสถานะงานที่มีอยู่ให้ตรงกับ enum ใหม่:

```bash
npm run ts-node src/scripts/updateTaskStatuses.ts
```

Script นี้จะ:
- ตรวจสอบงานทั้งหมดในฐานข้อมูล
- อัปเดตสถานะที่ไม่ถูกต้อง
- แสดงสถิติสถานะงาน

## สถานะงานที่รองรับ

| สถานะ | ความหมาย | การใช้งาน |
|-------|----------|-----------|
| `pending` | รอการดำเนินการ | งานที่สร้างใหม่ ยังไม่เริ่มทำ |
| `in_progress` | กำลังดำเนินการ | งานที่กำลังทำอยู่ |
| `submitted` | ส่งงานแล้ว | งานที่ผู้รับผิดชอบส่งแล้ว รอการตรวจ |
| `reviewed` | ผ่านการตรวจแล้ว | งานที่ผู้ตรวจอนุมัติแล้ว รอการอนุมัติการปิดงาน |
| `approved` | อนุมัติแล้ว | งานที่ผ่านการอนุมัติแล้ว |
| `completed` | เสร็จสิ้น | งานที่เสร็จสิ้นแล้ว |
| `rejected` | ถูกปฏิเสธ | งานที่ถูกตีกลับ |
| `cancelled` | ยกเลิก | งานที่ถูกยกเลิก |
| `overdue` | เกินกำหนด | งานที่เกินกำหนดส่ง |

## Flow การทำงาน

### กรณีที่ 1: ผู้ตรวจเป็นผู้สั่งงาน
1. `pending` → `in_progress` → `submitted` → `reviewed` → `completed`

### กรณีที่ 2: ผู้ตรวจไม่ใช่ผู้สั่งงาน
1. `pending` → `in_progress` → `submitted` → `reviewed` → `approved` → `completed`

## การตรวจสอบ

หลังจากรัน script แล้ว สามารถตรวจสอบได้โดย:

1. **ตรวจสอบ enum ในฐานข้อมูล:**
```sql
SELECT unnest(enum_range(NULL::tasks_status_enum)) as enum_value;
```

2. **ตรวจสอบสถานะงาน:**
```sql
SELECT status, COUNT(*) FROM tasks GROUP BY status;
```

## หมายเหตุ

- Script จะปลอดภัยและไม่ลบข้อมูลที่มีอยู่
- หาก enum มีอยู่แล้ว จะไม่เพิ่มซ้ำ
- หากสถานะงานถูกต้องแล้ว จะไม่เปลี่ยนแปลง

## การ Deploy

เมื่อ deploy ระบบใหม่ ให้รัน script ทั้งสองตัวตามลำดับ:

1. `addMissingTaskStatusEnum.ts` - เพิ่ม enum
2. `updateTaskStatuses.ts` - อัปเดตสถานะงาน

## การแก้ไขปัญหาเพิ่มเติม

หากยังเกิดปัญหา enum ให้ตรวจสอบ:

1. **การเชื่อมต่อฐานข้อมูล** - ตรวจสอบ environment variables
2. **สิทธิ์การเข้าถึง** - ตรวจสอบสิทธิ์ในการ ALTER TYPE
3. **เวอร์ชัน PostgreSQL** - ตรวจสอบว่าเวอร์ชันรองรับ IF NOT EXISTS

## ติดต่อ

หากมีปัญหาหรือคำถามเพิ่มเติม กรุณาติดต่อทีมพัฒนา
