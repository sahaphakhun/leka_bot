# การแก้ไขปัญหา UUID Syntax Error

## ปัญหาที่พบ
ระบบเกิด error เมื่อพยายามใช้ `personal_1c959f74-bad0-4d4d-b32e-1271862c2294` เป็น groupId:

```
❌ Error getting group files: QueryFailedError: invalid input syntax for type uuid: "personal_1c959f74-bad0-4d4d-b32e-1271862c2294"
```

## สาเหตุของปัญหา
1. **Personal Group ID ไม่ใช่ UUID ที่ถูกต้อง**: `personal_1c959f74-bad0-4d4d-b32e-1271862c2294` ไม่ใช่ UUID ที่ PostgreSQL สามารถแปลงได้
2. **การสร้าง Group ID ผิดรูปแบบ**: ระบบใช้ `personal_${user.id}` ซึ่งทำให้เกิด string ที่ไม่ใช่ UUID
3. **PostgreSQL คาดหวัง UUID**: ฐานข้อมูลคาดหวัง UUID แต่ได้รับ string ที่ไม่ใช่ UUID

## การแก้ไขที่ทำ

### 1. แก้ไข `FileService.ts`
เปลี่ยนจากการใช้ `personal_${user.id}` เป็น `user.id` โดยตรง:

```typescript
// ก่อนการแก้ไข
const tempGroupId = `personal_${user.id}`;

// หลังการแก้ไข
const tempGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
```

### 2. แก้ไข `webhookController.ts`
แก้ไขทุกส่วนที่ใช้ `personal_${user.id}` ให้ใช้ `user.id` แทน:

```typescript
// ก่อนการแก้ไข
const personalGroupId = `personal_${user.id}`;

// หลังการแก้ไข
const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
```

### 3. แก้ไขการสร้าง Group Entity
เปลี่ยน lineGroupId ให้ใช้ LINE User ID แทน:

```typescript
group = this.groupRepository.create({
  id: tempGroupId, // ใช้ user.id (UUID ที่ถูกต้อง)
  lineGroupId: `personal_${user.lineUserId}`, // ใช้ LINE User ID สำหรับ lineGroupId
  name: `แชทส่วนตัว - ${user.displayName}`,
  // ... อื่นๆ
});
```

## ผลลัพธ์ที่ได้

### ก่อนการแก้ไข:
- ระบบเกิด error: `invalid input syntax for type uuid`
- ไม่สามารถบันทึกไฟล์ในแชทส่วนตัวได้
- ไม่สามารถดึงรายการไฟล์ได้

### หลังการแก้ไข:
- ระบบใช้ UUID ที่ถูกต้อง
- สามารถบันทึกไฟล์ในแชทส่วนตัวได้
- สามารถดึงรายการไฟล์ได้
- ไม่มี UUID syntax error

## ไฟล์ที่แก้ไข

- `src/services/FileService.ts` - แก้ไขการสร้าง personal group ID
- `src/controllers/webhookController.ts` - แก้ไขการใช้งาน personal group ID

## การทดสอบ

1. ส่งไฟล์ในแชทส่วนตัว
2. ตรวจสอบว่าระบบบันทึกไฟล์ได้
3. ตรวจสอบว่าระบบแสดงรายการไฟล์ได้
4. ตรวจสอบว่าไม่มี UUID syntax error

## หมายเหตุ

- Personal chat ใช้ user ID เป็น group ID (ซึ่งเป็น UUID ที่ถูกต้อง)
- lineGroupId ใช้ `personal_${lineUserId}` เพื่อระบุว่าเป็นแชทส่วนตัว
- ระบบยังคงทำงานเหมือนเดิม แต่ใช้ UUID ที่ถูกต้อง
