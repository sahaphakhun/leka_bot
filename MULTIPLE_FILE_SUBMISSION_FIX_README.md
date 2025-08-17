# การแก้ไขระบบให้รองรับการส่งหลายไฟล์ต่อเนื่องกัน

## ปัญหาที่พบ
เดิมระบบไม่รองรับการส่งหลายไฟล์ต่อเนื่องกัน ผู้ใช้ต้องส่งไฟล์ทีละไฟล์และกดส่งงานทีละครั้ง ทำให้ไม่สะดวกในการใช้งาน

## การแก้ไขที่ทำ

### 1. แก้ไข `handleFileMessage` ใน `webhookController.ts`
- เมื่อผู้ใช้ส่งไฟล์ในแชทส่วนตัว ระบบจะแสดงรายการไฟล์ทั้งหมดที่ส่งมาแล้ว
- แสดงการ์ดรายการไฟล์พร้อมปุ่มดูงานที่ต้องส่ง

```typescript
// เมื่อส่งไฟล์ในแชทส่วนตัว
if (savedFile) {
  // หาไฟล์ทั้งหมดที่ส่งล่าสุด (24 ชม.)
  const user = await this.userService.findByLineUserId(userId);
  if (user) {
    const personalGroupId = `personal_${user.id}`;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
    
    // สร้างการ์ดแสดงรายการไฟล์
    const fileListCard = FlexMessageTemplateService.createPersonalFileListCard(files, user);
    await this.lineService.replyMessage(replyToken!, fileListCard);
  }
}
```

### 2. เพิ่มการ์ดใหม่ใน `FlexMessageTemplateService.ts`

#### `createPersonalFileListCard` - การ์ดแสดงรายการไฟล์
- แสดงไฟล์ทั้งหมดที่ส่งมา (สูงสุด 5 ไฟล์)
- แสดงขนาดไฟล์และเวลาที่ส่ง
- มีปุ่มดูงานที่ต้องส่งและล้างไฟล์

#### `createPersonalTaskWithFilesCard` - การ์ดแสดงงานพร้อมไฟล์
- แสดงงานที่ต้องส่งพร้อมรายการไฟล์ที่แนบได้
- มีปุ่มส่งงานและดูไฟล์ทั้งหมด

### 3. เพิ่มเมธอด `getUserTasks` ใน `TaskService.ts`
- ดึงงานของผู้ใช้ตามสถานะที่ระบุ
- ใช้ query builder เพื่อประสิทธิภาพ

```typescript
public async getUserTasks(userId: string, statuses: string[] = ['pending', 'in_progress']): Promise<Task[]> {
  try {
    return await this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedUsers', 'assignee')
      .leftJoinAndSelect('task.group', 'group')
      .where('assignee.id = :userId', { userId })
      .andWhere('task.status IN (:...statuses)', { statuses })
      .orderBy('task.dueTime', 'ASC')
      .getMany();
  } catch (error) {
    console.error('❌ Error getting user tasks:', error);
    throw error;
  }
}
```

### 4. เพิ่มการจัดการ postback events ใหม่

#### `show_personal_tasks` - แสดงงานที่ต้องส่ง
- หางานที่ต้องส่ง (pending, in_progress)
- แสดงงานแรกพร้อมไฟล์ที่แนบได้
- แสดงการ์ดรายการไฟล์พร้อม taskId

#### `show_personal_files` - แสดงรายการไฟล์
- แสดงไฟล์ทั้งหมดที่ส่งล่าสุด (24 ชม.)
- มีปุ่มส่งงานพร้อมไฟล์ (ถ้ามีไฟล์)

#### `clear_personal_files` - ล้างไฟล์เก่า
- ลบไฟล์เก่าเกิน 24 ชม.
- แจ้งจำนวนไฟล์ที่ลบ

#### `submit_with_personal_files` - ส่งงานพร้อมไฟล์
- ส่งงานพร้อมไฟล์ทั้งหมดที่ส่งล่าสุด (24 ชม.)
- รองรับการส่งงานเฉพาะที่ระบุหรือแสดงงานที่ต้องส่ง

### 5. แก้ไขการ์ดแนบไฟล์
- เปลี่ยนข้อความให้ชัดเจนว่าส่งหลายไฟล์ได้
- เพิ่มปุ่มดูรายการไฟล์และดูงานที่ต้องส่ง

## วิธีการใช้งานใหม่

### ขั้นตอนการส่งงานแบบหลายไฟล์:

1. **ส่งไฟล์ในแชทส่วนตัว**
   - ส่งไฟล์หลายไฟล์ได้เลย
   - ระบบจะแสดงรายการไฟล์ทั้งหมดที่ส่งมา

2. **ดูรายการไฟล์**
   - กดปุ่ม "📎 ดูรายการไฟล์" เพื่อตรวจสอบ
   - แสดงไฟล์ทั้งหมดพร้อมขนาดและเวลา

3. **ดูงานที่ต้องส่ง**
   - กดปุ่ม "📋 ดูงานที่ต้องส่ง" เพื่อดูงานที่ต้องส่ง
   - ระบบจะแสดงงานแรกพร้อมไฟล์ที่แนบได้

4. **ส่งงาน**
   - กดปุ่ม "📤 ส่งงาน" เพื่อส่งงานพร้อมไฟล์ทั้งหมด
   - ระบบจะแนบไฟล์ทั้งหมดที่ส่งล่าสุด (24 ชม.)

### ฟีเจอร์เพิ่มเติม:

- **ล้างไฟล์เก่า**: กดปุ่ม "🗑️ ล้างไฟล์ทั้งหมด" เพื่อลบไฟล์เก่า
- **ส่งไฟล์เพิ่มเติม**: ส่งไฟล์เพิ่มเติมได้ตลอดเวลา
- **ดูรายการไฟล์**: ตรวจสอบไฟล์ที่ส่งมาได้ทุกเมื่อ

## ผลลัพธ์ที่ได้

### ก่อนการแก้ไข:
- ส่งไฟล์ทีละไฟล์
- ต้องกดส่งงานทีละครั้ง
- ไม่สะดวกในการส่งหลายไฟล์

### หลังการแก้ไข:
- ส่งไฟล์หลายไฟล์ได้ต่อเนื่อง
- แสดงรายการไฟล์ทั้งหมด
- ส่งงานพร้อมไฟล์ทั้งหมดทีเดียว
- สะดวกและรวดเร็วมากขึ้น

## ไฟล์ที่แก้ไข

- `src/controllers/webhookController.ts` - แก้ไขการจัดการไฟล์และเพิ่ม postback events
- `src/services/FlexMessageTemplateService.ts` - เพิ่มการ์ดใหม่
- `src/services/TaskService.ts` - เพิ่มเมธอด getUserTasks

## การทดสอบ

1. ส่งไฟล์หลายไฟล์ในแชทส่วนตัว
2. ตรวจสอบว่าระบบแสดงรายการไฟล์ทั้งหมด
3. กดปุ่มดูงานที่ต้องส่ง
4. กดปุ่มส่งงานพร้อมไฟล์
5. ตรวจสอบว่างานถูกส่งพร้อมไฟล์ทั้งหมด
