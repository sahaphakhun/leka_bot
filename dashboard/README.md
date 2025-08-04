# เลขาบอท Dashboard

Dashboard UI สำหรับจัดการงานและข้อมูลในแต่ละกลุ่ม LINE

## ฟีเจอร์หลัก

- **ภาพรวมกลุ่ม**: สถิติงาน และงานใกล้ครบกำหนด
- **ปฏิทินงาน**: มุมมองเดือน/สัปดาห์/วัน พร้อมแสดงงานต่างๆ
- **จัดการงาน**: ดูรายการงาน กรองตามสถานะ และผู้รับผิดชอบ
- **คลังไฟล์**: ดูไฟล์ที่แชร์ในกลุ่ม ค้นหาและดาวน์โหลด
- **อันดับผลงาน**: KPI และ Leaderboard รายสัปดาห์/เดือน
- **รายงาน**: ส่งออกข้อมูลเป็น CSV/Excel

## การใช้งาน

### เข้าถึง Dashboard

```
http://localhost:3000/dashboard?groupId={LINE_GROUP_ID}
```

### API Endpoints ที่ใช้

- `GET /api/groups/:groupId/stats` - สถิติกลุ่ม
- `GET /api/groups/:groupId/tasks` - รายการงาน
- `GET /api/groups/:groupId/calendar` - ข้อมูลปฏิทิน
- `GET /api/groups/:groupId/files` - รายการไฟล์
- `GET /api/groups/:groupId/leaderboard` - อันดับผลงาน
- `POST /api/groups/:groupId/tasks` - เพิ่มงานใหม่

## ดีไซน์

### หลักการออกแบบ

- **มินิมอล**: เน้นเนื้อหาสำคัญ ลด visual clutter
- **ใช้งานง่าย**: Navigation ที่ชัดเจน และ intuitive
- **Responsive**: ใช้งานได้ทั้ง desktop และ mobile
- **Accessible**: รองรับผู้ใช้ทุกกลุ่ม

### สีหลัก

- Primary: `#2563eb` (Blue)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Orange)
- Danger: `#ef4444` (Red)
- Gray Scale: `#f9fafb` ถึง `#111827`

### Typography

- Font: Inter (Clean, modern sans-serif)
- Hierarchy: ใช้ font-weight และ size เพื่อแยกระดับข้อมูล

## โครงสร้างไฟล์

```
dashboard/
├── index.html          # HTML structure
├── styles.css          # CSS styling (มินิมอล responsive)
├── script.js           # JavaScript functionality
└── README.md          # เอกสารนี้
```

## ฟีเจอร์เด่น

### 1. Real-time Updates
- Auto-refresh ข้อมูลทุก 30 วินาที
- Toast notifications สำหรับ actions

### 2. Smart Filtering
- กรองงานตามสถานะ, ผู้รับผิดชอบ, tags
- ค้นหาแบบ real-time

### 3. Calendar Integration
- แสดงงานในรูปแบบปฏิทิน
- Click วันเพื่อดูรายละเอียด

### 4. File Management
- Preview ไฟล์ต่างประเภท
- Tag และ search ไฟล์
- Link ไฟล์กับงาน

### 5. KPI Dashboard
- คำนวณคะแนนอัตโนมัติ
- แสดง Leaderboard
- Export รายงาน

## การพัฒนาต่อ

### Next Steps
- [ ] Push notifications
- [ ] Dark mode
- [ ] Advanced charts
- [ ] Mobile app (PWA)
- [ ] Collaboration features

### การ Customize
- แก้ไข CSS variables ใน `:root` สำหรับ colors
- ปรับ layout ใน grid classes
- เพิ่ม components ใน JavaScript class

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

สำหรับ modern browsers ที่รองรับ CSS Grid และ ES6+ modules