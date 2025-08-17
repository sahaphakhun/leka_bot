# แก้ไขปัญหา Foreign Key Constraint ของ KPI Records

## ปัญหาที่เกิดขึ้น

เมื่อพยายามลบ task ที่มี KPI records อยู่ จะเกิดข้อผิดพลาด:

```
QueryFailedError: update or delete on table "tasks" violates foreign key constraint "FK_6b25efaa5b668fd4be03ef8e319" on table "kpi_records"
```

## สาเหตุ

1. **Foreign Key Constraint**: ตาราง `kpi_records` มี foreign key ไปยังตาราง `tasks` โดยไม่มี `ON DELETE CASCADE`
2. **Missing Cascade Delete**: เมื่อลบ task ที่มี KPI records อยู่ จะเกิด constraint violation
3. **Current Implementation**: `deleteTask` method ไม่ได้ลบ KPI records ที่เกี่ยวข้องก่อน

## การแก้ไข

### 1. อัปเดต Entity Model

เพิ่ม `onDelete: 'CASCADE'` ใน KPIRecord entity:

```typescript
@ManyToOne(() => Task, task => task.kpiRecords, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'taskId' })
task: Task;
```

### 2. สร้าง Migration Script

สร้าง script `fixKpiRecordsForeignKey.ts` เพื่อ:

- ลบ foreign key constraint เดิม
- เพิ่ม foreign key constraint ใหม่พร้อม CASCADE DELETE
- ตรวจสอบว่าสร้าง constraint สำเร็จ

### 3. รัน Migration

```bash
# ตรวจสอบสถานะปัจจุบันก่อน
npm run db:check-kpi-foreign-keys

# รัน migration script
npm run db:fix-kpi-foreign-key

# ตรวจสอบผลลัพธ์
npm run db:check-kpi-foreign-keys
```

## ผลลัพธ์

หลังจากแก้ไขแล้ว:

1. ✅ ลบ task ได้โดยไม่เกิด foreign key constraint violation
2. ✅ KPI records ที่เกี่ยวข้องจะถูกลบอัตโนมัติ (CASCADE DELETE)
3. ✅ ข้อมูลมีความสอดคล้องกัน (referential integrity)
4. ✅ ไม่ต้องแก้ไข business logic ใน TaskService

## ไฟล์ที่แก้ไข

- `src/models/index.ts` - เพิ่ม `onDelete: 'CASCADE'` ใน KPIRecord entity
- `src/scripts/fixKpiRecordsForeignKey.ts` - Migration script ใหม่

## การทดสอบ

1. ตรวจสอบสถานะปัจจุบัน: `npm run db:check-kpi-foreign-keys`
2. รัน migration script: `npm run db:fix-kpi-foreign-key`
3. ตรวจสอบผลลัพธ์: `npm run db:check-kpi-foreign-keys`
4. ลองลบ task ที่มี KPI records อยู่
5. ตรวจสอบว่า KPI records ถูกลบไปด้วย
6. ตรวจสอบว่าไม่มี orphaned records ในตาราง kpi_records

## การจัดการ Orphaned Records

หากพบ orphaned KPI records (records ที่อ้างอิง task ที่ไม่มีอยู่แล้ว):

```sql
-- ตรวจสอบ orphaned records
SELECT kr.* FROM kpi_records kr
LEFT JOIN tasks t ON kr."taskId" = t.id
WHERE t.id IS NULL;

-- ลบ orphaned records (ระวัง!)
DELETE FROM kpi_records kr
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t WHERE t.id = kr."taskId"
);
```

## หมายเหตุ

- การใช้ CASCADE DELETE เป็นมาตรฐานที่ดีในการจัดการ foreign key relationships
- ข้อมูล KPI records จะถูกลบไปพร้อมกับ task ซึ่งสมเหตุสมผลทางธุรกิจ
- หากต้องการเก็บข้อมูล KPI ไว้ ควรพิจารณาใช้ soft delete แทน
