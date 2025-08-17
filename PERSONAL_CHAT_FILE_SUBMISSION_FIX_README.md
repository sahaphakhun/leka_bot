# การแก้ไขปัญหาการส่งงานแบบแนบไฟล์ในแชทส่วนตัว

## ปัญหาที่พบ
เมื่อผู้ใช้กดส่งงานแบบแนบไฟล์ในแชทส่วนตัว ระบบไม่สามารถบันทึกไฟล์และส่งงานได้ เนื่องจาก:

1. **ไฟล์ไม่ถูกบันทึก**: `handleFileMessage` ถูกตั้งค่าให้ไม่ทำอะไรกับไฟล์ที่ส่งมา
2. **ไม่มีกลไกเชื่อมโยงไฟล์กับงาน**: เมื่อผู้ใช้ส่งไฟล์ในแชทส่วนตัว ระบบไม่รู้ว่าจะผูกกับงานไหน
3. **groupId เป็น empty string**: ในแชทส่วนตัว `groupId` จะเป็น empty string ทำให้ไม่สามารถหาไฟล์ได้

## การแก้ไขที่ทำ

### 1. แก้ไข `handleFileMessage` ใน `webhookController.ts`
- เพิ่มการบันทึกไฟล์ในแชทส่วนตัว
- แจ้งให้ผู้ใช้ทราบว่าบันทึกไฟล์แล้ว
- ยังคงไม่บันทึกไฟล์ในแชทกลุ่ม (ตามเดิม)

```typescript
private async handleFileMessage(event: MessageEvent, message: ImageMessage | VideoMessage | AudioMessage | any): Promise<void> {
  const { source, replyToken } = event;
  
  if (source.type === 'user') {
    // แชทส่วนตัว - บันทึกไฟล์และแจ้งให้ผู้ใช้ทราบ
    const userId = source.userId!;
    
    try {
      const savedFile = await this.fileService.saveFileFromLine(message, userId, 'personal_chat');
      
      if (savedFile) {
        await this.lineService.replyMessage(replyToken!, 
          `📎 บันทึกไฟล์ "${savedFile.originalName}" เรียบร้อยแล้วค่ะ\n\n` +
          `หากต้องการแนบไฟล์นี้กับงาน กรุณากดปุ่ม "ส่ง" บนการ์ดงานที่ต้องการส่งค่ะ`
        );
      }
    } catch (error) {
      // จัดการ error
    }
  } else if (source.type === 'group') {
    // แชทกลุ่ม - ไม่บันทึกอัตโนมัติ (ตามเดิม)
  }
}
```

### 2. เพิ่มเมธอด `saveFileFromLine` ใน `FileService.ts`
- บันทึกไฟล์จาก LINE Message ในแชทส่วนตัว
- สร้าง personal group สำหรับแชทส่วนตัว
- เพิ่มแท็กเพื่อระบุว่าเป็นไฟล์จากแชทส่วนตัว

```typescript
public async saveFileFromLine(message: any, lineUserId: string, context: string = 'personal_chat'): Promise<File | null> {
  try {
    // ดึงข้อมูลไฟล์จาก LINE
    const content = await this.lineService.downloadContent(message.id);
    
    // หา user ในระบบ
    const user = await this.userRepository.findOne({ where: { lineUserId } });
    
    // สร้าง group จำลองสำหรับแชทส่วนตัว
    const tempGroupId = `personal_${user.id}`;
    
    // บันทึกไฟล์
    const fileData = { /* ... */ };
    const savedFile = await this.saveFile(fileData);
    
    // เพิ่มแท็ก
    await this.addFileTags(savedFile.id, [context, 'personal_chat']);
    
    return savedFile;
  } catch (error) {
    return null;
  }
}
```

### 3. แก้ไข `resolveInternalGroupId` ใน `FileService.ts`
- รองรับ personal chat group ID
- อนุญาตให้ personal group ID ผ่านการตรวจสอบได้

```typescript
private async resolveInternalGroupId(groupId: string): Promise<string | null> {
  // ถ้าเป็น UUID แล้ว ให้ส่งกลับทันที
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
  if (isUuid) return groupId;

  // ถ้าเป็น personal chat ให้ส่งกลับทันที
  if (groupId.startsWith('personal_')) return groupId;

  // ลองหา group จาก LINE Group ID
  const group = await this.groupRepository.findOne({ where: { lineGroupId: groupId } });
  return group ? group.id : null;
}
```

### 4. แก้ไขการจัดการ postback events ใน `webhookController.ts`
- รองรับ personal chat ในทุก action ที่เกี่ยวข้องกับการส่งงาน
- ใช้ personal group ID แทน empty groupId
- หาไฟล์จาก personal chat เมื่ออยู่ในแชทส่วนตัว

#### แก้ไข `complete_task`:
```typescript
if (task.requireAttachment) {
  let groupIdToUse = groupId;
  let groupName = 'กลุ่ม';
  if (source.type === 'user') {
    const user = await this.userService.findByLineUserId(userId);
    if (user) {
      groupIdToUse = `personal_${user.id}`;
      groupName = 'แชทส่วนตัว';
    }
  }
  
  const group = { id: groupIdToUse, lineGroupId: groupIdToUse, name: groupName };
  // ...
}
```

#### แก้ไข `submit_confirm`:
```typescript
// ในแชทส่วนตัว ให้หาไฟล์ที่ส่งล่าสุด (24 ชม.) ถ้าไม่มี fileIds
let finalFileIds = fileIds;
if (source.type === 'user' && fileIds.length === 0) {
  const user = await this.userService.findByLineUserId(userId);
  if (user) {
    const personalGroupId = `personal_${user.id}`;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
    finalFileIds = result.files?.map((f: any) => f.id) || [];
  }
}
```

## ผลลัพธ์ที่ได้

### ก่อนการแก้ไข:
- ไฟล์ที่ส่งในแชทส่วนตัวไม่ถูกบันทึก
- ไม่สามารถส่งงานแบบแนบไฟล์ได้
- ระบบแสดง error เมื่อพยายามส่งงาน

### หลังการแก้ไข:
- ไฟล์ที่ส่งในแชทส่วนตัวถูกบันทึกอัตโนมัติ
- สามารถส่งงานแบบแนบไฟล์ได้
- ระบบทำงานได้ปกติทั้งในแชทส่วนตัวและแชทกลุ่ม

## วิธีการใช้งาน

1. **ส่งไฟล์ในแชทส่วนตัว**: ระบบจะบันทึกไฟล์อัตโนมัติและแจ้งให้ทราบ
2. **กดปุ่มส่งงาน**: ระบบจะแสดงการ์ดให้แนบไฟล์
3. **กดปุ่มส่ง**: ระบบจะหาไฟล์ที่ส่งล่าสุด (24 ชม.) และแนบกับงาน
4. **ยืนยันการส่งงาน**: ระบบจะแสดงรายชื่อไฟล์ที่จะแนบ
5. **ส่งงานสำเร็จ**: งานจะถูกส่งพร้อมไฟล์แนบ

## ไฟล์ที่แก้ไข

- `src/controllers/webhookController.ts` - แก้ไขการจัดการไฟล์และ postback events
- `src/services/FileService.ts` - เพิ่มเมธอด saveFileFromLine และแก้ไข resolveInternalGroupId

## การทดสอบ

1. ส่งไฟล์ในแชทส่วนตัว
2. กดปุ่มส่งงาน
3. กดปุ่มส่งบนการ์ดแนบไฟล์
4. ตรวจสอบว่าระบบแสดงการ์ดยืนยันพร้อมรายชื่อไฟล์
5. กดยืนยันและตรวจสอบว่างานถูกส่งสำเร็จ
