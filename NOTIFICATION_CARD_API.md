# API การ์ดแจ้งเตือน (Notification Card API)

ระบบ API สำหรับสร้างและส่งการ์ดแจ้งเตือนแบบ Flex Message ไปยัง LINE Groups และ Users

## 📋 ภาพรวม

ระบบการ์ดแจ้งเตือนนี้ช่วยให้คุณสามารถ:
- ส่งการ์ดแจ้งเตือนแบบสวยงามไปยังกลุ่มหรือผู้ใช้
- กำหนดปุ่มต่างๆ สำหรับการโต้ตอบ
- ตั้งค่าความสำคัญของข้อความ
- ส่งการแจ้งเตือนแบบรวดเร็ว

## 🚀 API Endpoints

### 1. สร้างและส่งการ์ดแจ้งเตือน
**POST** `/api/notifications/cards`

สร้างและส่งการ์ดแจ้งเตือนแบบกำหนดเอง

#### Request Body:
```json
{
  "title": "หัวข้อการแจ้งเตือน",
  "description": "รายละเอียดการแจ้งเตือน (ไม่บังคับ)",
  "imageUrl": "https://example.com/image.jpg (ไม่บังคับ)",
  "targetType": "group|user|both",
  "groupIds": ["groupId1", "groupId2"],
  "userIds": ["userId1", "userId2"],
  "priority": "low|medium|high",
  "expiresAt": "2024-12-31T23:59:59Z (ไม่บังคับ)",
  "buttons": [
    {
      "id": "button1",
      "label": "ปุ่ม 1",
      "action": "add_task|close_task|request_extension|approve|reject|view_details|custom",
      "style": "primary|secondary|danger",
      "data": { "customData": "value" }
    }
  ]
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "id": "notification-id",
    "title": "หัวข้อการแจ้งเตือน",
    "status": "sent",
    "sentAt": "2024-01-01T12:00:00Z"
  },
  "message": "ส่งการ์ดแจ้งเตือนสำเร็จ"
}
```

### 2. ดึงเทมเพลตปุ่มมาตรฐาน
**GET** `/api/notifications/cards/templates`

ดึงเทมเพลตปุ่มมาตรฐานที่พร้อมใช้งาน

#### Response:
```json
{
  "success": true,
  "data": {
    "standard": [
      {
        "id": "add_task",
        "label": "➕ เพิ่มงาน",
        "action": "add_task",
        "style": "primary"
      },
      {
        "id": "close_task",
        "label": "✅ ปิดงาน",
        "action": "close_task",
        "style": "secondary"
      },
      {
        "id": "request_extension",
        "label": "⏰ ขอเลื่อนเวลา",
        "action": "request_extension",
        "style": "secondary"
      },
      {
        "id": "view_details",
        "label": "👁️ ดูรายละเอียด",
        "action": "view_details",
        "style": "secondary"
      }
    ],
    "approval": [
      {
        "id": "approve",
        "label": "✅ อนุมัติ",
        "action": "approve",
        "style": "primary"
      },
      {
        "id": "reject",
        "label": "❌ ไม่อนุมัติ",
        "action": "reject",
        "style": "danger"
      },
      {
        "id": "view_details",
        "label": "👁️ ดูรายละเอียด",
        "action": "view_details",
        "style": "secondary"
      }
    ]
  }
}
```

### 3. ส่งการแจ้งเตือนแบบรวดเร็ว
**POST** `/api/notifications/cards/quick`

ส่งการแจ้งเตือนแบบรวดเร็วพร้อมปุ่มมาตรฐาน

#### Request Body:
```json
{
  "title": "หัวข้อการแจ้งเตือน",
  "description": "รายละเอียดการแจ้งเตือน (ไม่บังคับ)",
  "groupIds": ["groupId1", "groupId2"],
  "userIds": ["userId1", "userId2"],
  "priority": "low|medium|high"
}
```

## 🎨 การออกแบบการ์ด

### สีตามความสำคัญ:
- **High Priority**: สีแดง (#FF3B30)
- **Medium Priority**: สีส้ม (#FF9500)
- **Low Priority**: สีเขียว (#34C759)

### สีปุ่ม:
- **Primary**: สีน้ำเงิน (#007AFF)
- **Secondary**: สีเทา (#8E8E93)
- **Danger**: สีแดง (#FF3B30)

## 📝 ตัวอย่างการใช้งาน

### ตัวอย่าง 1: ส่งการแจ้งเตือนไปยังกลุ่ม
```bash
curl -X POST http://localhost:3000/api/notifications/cards \
  -H "Content-Type: application/json" \
  -d '{
    "title": "📢 ประชุมทีมประจำสัปดาห์",
    "description": "ประชุมทีมประจำสัปดาห์จะเริ่มในอีก 30 นาที กรุณาเตรียมข้อมูลที่เกี่ยวข้อง",
    "targetType": "group",
    "groupIds": ["C1234567890abcdef"],
    "priority": "high",
    "buttons": [
      {
        "id": "join_meeting",
        "label": "เข้าร่วมประชุม",
        "action": "custom",
        "style": "primary",
        "data": { "meetingUrl": "https://meet.google.com/abc-defg-hij" }
      },
      {
        "id": "view_agenda",
        "label": "ดูวาระการประชุม",
        "action": "view_details",
        "style": "secondary"
      }
    ]
  }'
```

### ตัวอย่าง 2: ส่งการแจ้งเตือนแบบรวดเร็ว
```bash
curl -X POST http://localhost:3000/api/notifications/cards/quick \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 ยินดีต้อนรับสมาชิกใหม่!",
    "description": "ขอต้อนรับคุณสมชาย เข้าสู่ทีมพัฒนาซอฟต์แวร์",
    "groupIds": ["C1234567890abcdef"],
    "priority": "medium"
  }'
```

### ตัวอย่าง 3: ส่งการแจ้งเตือนไปยังผู้ใช้หลายคน
```bash
curl -X POST http://localhost:3000/api/notifications/cards \
  -H "Content-Type: application/json" \
  -d '{
    "title": "⏰ งานใกล้ถึงกำหนดส่ง",
    "description": "งาน 'พัฒนาระบบรายงาน' จะถึงกำหนดส่งในอีก 2 ชั่วโมง",
    "targetType": "user",
    "userIds": ["user1", "user2", "user3"],
    "priority": "high",
    "buttons": [
      {
        "id": "submit_work",
        "label": "ส่งงาน",
        "action": "add_task",
        "style": "primary"
      },
      {
        "id": "request_extension",
        "label": "ขอเลื่อนเวลา",
        "action": "request_extension",
        "style": "secondary"
      }
    ]
  }'
```

## 🔧 การจัดการ Postback Actions

เมื่อผู้ใช้กดปุ่มใน LINE จะส่ง postback event มาที่ webhook ด้วยข้อมูล:

```json
{
  "action": "add_task",
  "notificationId": "notification-uuid",
  "buttonId": "add_task",
  "customData": "value"
}
```

คุณสามารถจัดการ postback เหล่านี้ใน `webhookController.ts` เพื่อดำเนินการตาม action ที่กำหนด

## ⚠️ ข้อจำกัด

1. **จำนวนปุ่ม**: ไม่เกิน 4 ปุ่มต่อการ์ด (ตามข้อจำกัดของ LINE)
2. **ความยาวข้อความ**: 
   - หัวข้อ: ไม่เกิน 100 ตัวอักษร
   - รายละเอียด: ไม่เกิน 1000 ตัวอักษร
3. **รูปภาพ**: ต้องเป็น URL ที่เข้าถึงได้จาก LINE servers
4. **การส่ง**: ต้องมีกลุ่มหรือผู้ใช้อย่างน้อย 1 รายการ

## 🛠️ การพัฒนาต่อ

### การเพิ่มฟีเจอร์ใหม่:
1. **การบันทึกลงฐานข้อมูล**: เพิ่มการบันทึกประวัติการส่ง
2. **การตั้งเวลา**: ส่งการแจ้งเตือนตามเวลาที่กำหนด
3. **การทำซ้ำ**: ส่งการแจ้งเตือนซ้ำตามช่วงเวลา
4. **การติดตาม**: ติดตามการเปิดอ่านและคลิกปุ่ม

### การปรับแต่งการออกแบบ:
1. **เทมเพลตเพิ่มเติม**: เพิ่มเทมเพลตการ์ดรูปแบบต่างๆ
2. **การปรับแต่งสี**: อนุญาตให้กำหนดสีเอง
3. **การเพิ่มรูปภาพ**: รองรับการอัปโหลดรูปภาพ

## 📞 การสนับสนุน

หากมีปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา
