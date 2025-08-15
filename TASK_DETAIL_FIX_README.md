# แก้ไขปัญหาการแสดงรายละเอียดงานเมื่อคลิกปุ่มในแชท

## 🚨 ปัญหาที่พบ
เมื่อกดดูรายละเอียดงานบนการ์ดงานในแชท LINE ปัจจุบันมันแสดงแค่หน้าเว็บเหมือนเข้าแดชบอร์ดปกติ ไม่มีรายละเอียดงาน

## 🔍 สาเหตุของปัญหา
1. **ไม่มี case 'view_details'** ใน `handlePostbackEvent` ของ webhook controller
2. **ไม่มีหน้าเว็บสำหรับแสดงรายละเอียดงาน** เมื่อคลิกปุ่ม "ดูรายละเอียดงาน" ในแชท
3. **ปัจจุบันเมื่อคลิกปุ่ม จะไม่มีอะไรเกิดขึ้น** เพราะไม่มี case ที่จัดการ action `view_details`

## ✅ สิ่งที่แก้ไขแล้ว

### 1. เพิ่ม case 'view_details' ใน Webhook Controller
**ไฟล์:** `src/controllers/webhookController.ts`
**บรรทัด:** ประมาณ 350-370

```typescript
case 'view_details': {
  const taskId = params.get('taskId');
  if (taskId) {
    try {
      // สร้างลิงก์ไปยังหน้ารายละเอียดงาน
      const taskDetailUrl = `${config.baseUrl}/dashboard/task/${taskId}`;
      const message = `📋 รายละเอียดงาน\n\n🔗 ดูรายละเอียดเพิ่มเติมได้ที่:\n${taskDetailUrl}`;
      
      await this.lineService.replyMessage(replyToken, message);
    } catch (err: any) {
      await this.lineService.replyMessage(replyToken, `❌ ไม่สามารถแสดงรายละเอียดงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
    }
  }
  break;
}
```

### 2. เพิ่มเส้นทางใหม่ใน Dashboard Controller
**ไฟล์:** `src/controllers/dashboardController.ts`
**เส้นทาง:** `GET /dashboard/task/:taskId`

```typescript
dashboardRouter.get('/task/:taskId', dashboardController.getTaskDetail.bind(dashboardController));
```

### 3. สร้างหน้าเว็บแสดงรายละเอียดงาน
**Method:** `getTaskDetail()` และ `generateTaskDetailHtml()`

หน้านี้จะแสดง:
- ชื่องาน
- สถานะงาน (รอดำเนินการ, กำลังดำเนินการ, เสร็จสิ้น, ยกเลิก, เกินกำหนด)
- ความสำคัญ (ต่ำ, ปานกลาง, สูง)
- วันเริ่มงานและกำหนดส่ง
- ข้อมูลกลุ่มและผู้รับผิดชอบ
- แท็กต่างๆ
- รายละเอียดงาน
- ไฟล์แนบ (ถ้ามี)

### 4. เพิ่ม Helper Methods
- `getStatusText()` - แปลงสถานะงานเป็นภาษาไทย
- `getPriorityText()` - แปลงความสำคัญเป็นภาษาไทย
- `formatDate()` - จัดรูปแบบวันที่
- `formatFileSize()` - จัดรูปแบบขนาดไฟล์

## 🧪 วิธีการทดสอบ

### 1. ทดสอบผ่านไฟล์ HTML
เปิดไฟล์ `dashboard/test-task-detail.html` ในเบราว์เซอร์

### 2. ทดสอบผ่าน LINE Bot
1. ส่งการ์ดแจ้งเตือนที่มีปุ่ม "ดูรายละเอียดงาน"
2. คลิกปุ่มในแชท
3. บอทจะตอบกลับด้วยลิงก์ไปยังหน้ารายละเอียดงาน

### 3. ทดสอบผ่าน URL โดยตรง
```
http://localhost:3000/dashboard/task/task-123
```

## 📁 ไฟล์ที่เปลี่ยนแปลง

1. **`src/controllers/webhookController.ts`**
   - เพิ่ม case 'view_details' ใน handlePostbackEvent

2. **`src/controllers/dashboardController.ts`**
   - เพิ่ม method getTaskDetail()
   - เพิ่ม method generateTaskDetailHtml()
   - เพิ่ม helper methods สำหรับการแสดงผล
   - เพิ่มเส้นทาง /dashboard/task/:taskId

3. **`dashboard/test-task-detail.html`** (ใหม่)
   - ไฟล์ทดสอบหน้ารายละเอียดงาน

## 🔧 การทำงานหลังจากแก้ไข

1. **เมื่อคลิกปุ่ม "ดูรายละเอียดงาน" ในแชท:**
   - บอทจะตอบกลับด้วยข้อความและลิงก์
   - ลิงก์จะนำไปยังหน้าเว็บแสดงรายละเอียดงาน

2. **หน้ารายละเอียดงานจะแสดง:**
   - ข้อมูลงานครบถ้วน
   - การจัดรูปแบบที่สวยงาม
   - ปุ่มกลับไปแดชบอร์ด

3. **การจัดการ Error:**
   - แสดงข้อความ error ที่เหมาะสม
   - ไม่ทำให้ระบบล่ม

## 🎯 ผลลัพธ์ที่คาดหวัง

- ✅ ปุ่ม "ดูรายละเอียดงาน" ในแชททำงานได้
- ✅ แสดงหน้ารายละเอียดงานที่มีข้อมูลครบถ้วน
- ✅ UI สวยงามและใช้งานง่าย
- ✅ รองรับการแสดงข้อมูลงานทุกประเภท
- ✅ มีการจัดการ error ที่เหมาะสม

## 📝 หมายเหตุ

- หน้ารายละเอียดงานจะแสดงข้อมูลตามที่อยู่ในฐานข้อมูล
- หากไม่มีข้อมูลงาน จะแสดงข้อความ "Task not found"
- การแสดงผลรองรับภาษาไทยและภาษาอังกฤษ
- UI ออกแบบให้ใช้งานได้ทั้งบนมือถือและเดสก์ท็อป
