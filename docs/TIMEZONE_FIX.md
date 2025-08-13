# การแก้ไขปัญหาทีมโซนในระบบเลขาบอท

## ปัญหาที่พบ
ระบบมีปัญหาทีมโซนที่ทำให้เวลาแสดงผลไม่ตรงกันระหว่าง:
- เวลาใน Dashboard (หน้าเว็บ)
- เวลาที่ส่งไปยังกลุ่ม LINE
- เวลาในฐานข้อมูล

## สาเหตุของปัญหา
1. **Dashboard ใช้ `new Date()` โดยตรง** - ไม่ได้ใช้ timezone ที่ถูกต้อง
2. **Backend ใช้ moment-timezone ถูกต้อง** - แต่ dashboard ไม่ได้ใช้
3. **การส่งข้อมูลเวลา** - dashboard ส่ง ISO string ที่อาจมี timezone ผิด

## การแก้ไขที่ทำ

### 1. เพิ่ม moment-timezone ใน Dashboard
```html
<!-- เพิ่มใน dashboard/index.html -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.43/moment-timezone-with-data.min.js"></script>
```

### 2. ปรับปรุง Dashboard JavaScript
```javascript
// เพิ่ม moment-timezone สำหรับการจัดการเวลา
let moment;
if (typeof require !== 'undefined') {
  // Node.js environment
  moment = require('moment-timezone');
} else if (typeof window !== 'undefined' && window.moment) {
  // Browser environment - ใช้ moment ที่โหลดจาก CDN
  moment = window.moment;
} else {
  // Browser environment - ต้องโหลด moment-timezone จาก CDN
  console.warn('⚠️ moment-timezone ไม่ได้โหลด กรุณาเพิ่ม script tag ใน HTML');
}

class Dashboard {
  constructor() {
    // ตั้งค่า timezone เริ่มต้น
    this.timezone = 'Asia/Bangkok';
    // ... existing code ...
  }
}
```

### 3. แก้ไขฟังก์ชันการจัดการวันที่
```javascript
// แก้ไขฟังก์ชัน formatDate และ formatDateTime
formatDate(date) {
  if (moment) {
    return moment(date).tz(this.timezone).format('DD MMMM YYYY');
  }
  // fallback to native Date if moment is not available
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

formatDateTime(date) {
  if (moment) {
    return moment(date).tz(this.timezone).format('DD MMM YYYY HH:mm');
  }
  // fallback to native Date if moment is not available
  return new Date(date).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// เพิ่มฟังก์ชันสำหรับการจัดการวันที่ปัจจุบัน
getCurrentDate() {
  if (moment) {
    return moment().tz(this.timezone);
  }
  return new Date();
}

// เพิ่มฟังก์ชันสำหรับการแปลงวันที่ให้เป็น timezone ที่ถูกต้อง
formatDateForAPI(date) {
  if (moment) {
    return moment(date).tz(this.timezone).toISOString();
  }
  return new Date(date).toISOString();
}
```

### 4. แก้ไขฟังก์ชันการจัดการปฏิทิน
```javascript
// แก้ไขฟังก์ชัน updateCalendar
updateCalendar(events, month, year) {
  // ... existing code ...
  
  // Current month days
  let today;
  if (moment) {
    today = moment().tz(this.timezone);
  } else {
    today = new Date();
  }
  const isCurrentMonth = today.year() === year && today.month() === month - 1;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.date() === day;
    const dayEvents = events.filter(event => {
      let eventDate;
      if (moment) {
        eventDate = moment(event.end || event.dueTime || event.start).tz(this.timezone);
      } else {
        eventDate = new Date(event.end || event.dueTime || event.start);
      }
      return (
        eventDate.year() === year &&
        (eventDate.month() + 1) === month &&
        eventDate.date() === day
      );
    });
    // ... existing code ...
  }
}
```

### 5. แก้ไขฟังก์ชันการส่งข้อมูล
```javascript
// แก้ไขฟังก์ชัน handleAddTask
async handleAddTask() {
  const form = document.getElementById('addTaskForm');
  const formData = new FormData(form);
  
  const taskData = {
    // ... existing code ...
    dueTime: this.formatDateForAPI(formData.get('dueDate')), // ใช้ moment-timezone
    // ... existing code ...
  };
  
  // ถ้าเลือกเป็นงานประจำ
  if (recurrenceType !== 'none') {
    const payload = {
      // ... existing code ...
      timezone: this.timezone, // ใช้ timezone ที่ตั้งค่าไว้ใน class
      // ... existing code ...
    };
  }
}

// แก้ไขฟังก์ชัน handleRejectTask
async handleRejectTask() {
  // ... existing code ...
  const newDue = document.getElementById('reviewNewDue').value;
  if (!newDue) { this.showToast('ระบุกำหนดส่งใหม่', 'error'); return; }
  
  // ส่ง ISO string เพื่อลด edge case timezone และใช้ moment-timezone
  const isoDue = this.formatDateForAPI(newDue);
  // ... existing code ...
}
```

## ผลลัพธ์ที่ได้
1. **เวลาใน Dashboard** - แสดงผลตาม timezone ไทย (Asia/Bangkok)
2. **เวลาที่ส่งไปยัง LINE** - ตรงกับเวลาที่เลือกใน Dashboard
3. **เวลาในฐานข้อมูล** - เก็บเป็น UTC แต่แสดงผลตาม timezone ที่ถูกต้อง
4. **ความสอดคล้อง** - ใช้ timezone เดียวกันทั้งระบบ

## การทดสอบ
1. สร้างงานใหม่ใน Dashboard
2. ตรวจสอบเวลาที่แสดงในปฏิทิน
3. ตรวจสอบเวลาที่ส่งไปยังกลุ่ม LINE
4. ตรวจสอบเวลาที่เก็บในฐานข้อมูล

## หมายเหตุ
- ระบบจะใช้ moment-timezone เป็นหลัก
- มี fallback ไปใช้ native Date API หาก moment ไม่พร้อมใช้งาน
- timezone เริ่มต้นคือ 'Asia/Bangkok' (เวลาไทย)
- การส่งข้อมูลไปยัง API จะแปลงเป็น ISO string ที่มี timezone ถูกต้อง

