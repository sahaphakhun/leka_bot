# 🤖 ระบบ Rules และ Memory สำหรับเลขาบอท

## 📋 ภาพรวม

ระบบ Rules และ Memory เป็นระบบที่ออกแบบมาเพื่อให้ทีมพัฒนาสามารถ:

1. **ตรวจสอบโปรเจ็กก่อนเริ่มงานใด ๆ** เสมอ
2. **สร้าง To-dos ในระบบ** สำหรับงานที่ได้รับมอบหมาย
3. **เก็บและจัดการ rules** ที่ทีมต้องปฏิบัติตาม
4. **เก็บและค้นหา memories** จากประสบการณ์ที่ได้เรียนรู้
5. **จัดการ workflow** มาตรฐานสำหรับการทำงาน

## 🏗️ โครงสร้างระบบ

### 1. ProjectRules (src/services/ProjectRules.ts)
- **Rules**: กฎเกณฑ์ที่ทีมต้องปฏิบัติตาม
- **Memories**: ความทรงจำและบทเรียนที่ได้เรียนรู้
- **Checklists**: รายการตรวจสอบมาตรฐาน

### 2. ProjectChecklistService (src/services/ProjectChecklistService.ts)
- ตรวจสอบสถานะโปรเจ็ก
- รัน checklist ต่างๆ
- สร้าง To-dos อัตโนมัติ

### 3. ProjectMemoryService (src/services/ProjectMemoryService.ts)
- จัดการ rules และ memories
- ค้นหาและแนะนำ rules
- สร้าง project insights

### 4. ProjectWorkflowService (src/services/ProjectWorkflowService.ts)
- จัดการ workflow มาตรฐาน
- ติดตามความคืบหน้าของ workflow
- สร้าง To-dos ตาม workflow

### 5. ProjectController (src/controllers/projectController.ts)
- API endpoints สำหรับระบบทั้งหมด
- จัดการ HTTP requests และ responses

## 🚀 การใช้งาน

### เริ่มต้นการทำงาน

ก่อนเริ่มงานใด ๆ ต้องทำตามขั้นตอนนี้เสมอ:

1. **ตรวจสอบสถานะโปรเจ็ก**
   ```bash
   GET /api/project/status
   ```

2. **รัน Pre-Work Checklist**
   ```bash
   POST /api/project/checklist/CL-001/run
   {
     "userId": "your-user-id"
   }
   ```

3. **เริ่มต้น Project Start Workflow**
   ```bash
   POST /api/project/workflow/start
   {
     "templateId": "WF-PROJECT-START",
     "userId": "your-user-id",
     "groupId": "line-group-id"
   }
   ```

### Rules หลักที่ต้องปฏิบัติตาม

#### 🚨 Critical Rules (ต้องปฏิบัติตามเสมอ)
- **WF-001**: ตรวจสอบโปรเจ็กก่อนเริ่มงานใด ๆ
- **SEC-001**: ไม่เปิดเผยข้อมูลสำคัญในโค้ด

#### ⚠️ High Priority Rules
- **WF-002**: สร้าง To-dos สำหรับทุกงาน
- **QL-001**: ทดสอบก่อนส่งมอบ

#### 📝 Medium Priority Rules
- **WF-003**: อัปเดตสถานะงานเป็นประจำ
- **QL-002**: ตรวจสอบโค้ดก่อน commit
- **PERF-001**: ตรวจสอบประสิทธิภาพ

### Workflow Templates

#### 1. Project Start Workflow (WF-PROJECT-START)
- ตรวจสอบสถานะโปรเจ็ก
- ตรวจสอบฐานข้อมูล
- ตรวจสอบ LINE Bot
- สร้าง To-dos สำหรับงานที่ได้รับมอบหมาย
- ตรวจสอบ dependencies

#### 2. Daily Check Workflow (WF-DAILY-CHECK)
- ตรวจสอบสถานะระบบ
- ตรวจสอบงานที่ค้าง
- อัปเดตสถานะงาน

#### 3. Weekly Review Workflow (WF-WEEKLY-REVIEW)
- ทบทวนงานที่เสร็จสิ้น
- วางแผนงานสัปดาห์ถัดไป
- อัปเดต project rules และ memories

## 📊 API Endpoints

### Project Status & Checklist
- `GET /api/project/status` - ตรวจสอบสถานะโปรเจ็ก
- `GET /api/project/checklist` - รับ checklist ทั้งหมด
- `GET /api/project/checklist/:id` - รับ checklist ตาม ID
- `POST /api/project/checklist/:id/run` - รัน checklist

### Rules & Memories
- `GET /api/project/rules` - รับ rules ทั้งหมด
- `GET /api/project/memories` - รับ memories ทั้งหมด
- `GET /api/project/search` - ค้นหา rules และ memories
- `GET /api/project/recommendations` - รับ rule recommendations
- `POST /api/project/rules` - เพิ่ม rule ใหม่
- `POST /api/project/memories` - เพิ่ม memory ใหม่

### Workflow Management
- `POST /api/project/workflow/start` - เริ่มต้น workflow
- `POST /api/project/workflow/:id/step/:stepId` - ดำเนินการ workflow step
- `GET /api/project/workflow/active` - รับ workflow ที่กำลังดำเนินการ
- `GET /api/project/workflow/templates` - รับ workflow templates

### Insights & Reports
- `GET /api/project/insights` - รับ project insights
- `GET /api/project/reports/summary` - รับรายงานสรุป
- `GET /api/project/consistency` - ตรวจสอบความสอดคล้อง

## 🔧 การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. Build โปรเจ็ก
```bash
npm run build
```

### 3. เริ่มต้นเซิร์ฟเวอร์
```bash
npm start
```

### 4. ทดสอบระบบ
```bash
# ตรวจสอบสถานะโปรเจ็ก
curl http://localhost:3000/api/project/status

# รับ checklist ทั้งหมด
curl http://localhost:3000/api/project/checklist

# รับ workflow templates
curl http://localhost:3000/api/project/workflow/templates
```

## 📝 ตัวอย่างการใช้งาน

### สร้าง Rule ใหม่
```bash
curl -X POST http://localhost:3000/api/project/rules \
  -H "Content-Type: application/json" \
  -d '{
    "category": "workflow",
    "title": "ตรวจสอบการทดสอบก่อน deploy",
    "description": "ต้องรัน test suite ทั้งหมดก่อน deploy",
    "priority": "high",
    "isActive": true
  }'
```

### เพิ่ม Memory ใหม่
```bash
curl -X POST http://localhost:3000/api/project/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "lesson",
    "title": "ปัญหา database connection timeout",
    "content": "เมื่อ database connection timeout ให้ตรวจสอบ connection pool และ retry logic",
    "tags": ["database", "connection", "timeout"],
    "relatedRules": []
  }'
```

### เริ่มต้น Workflow
```bash
curl -X POST http://localhost:3000/api/project/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "WF-PROJECT-START",
    "userId": "developer-001",
    "groupId": "C5d6c442ec0b3287f71787fdd9437e520"
  }'
```

## 🎯 ประโยชน์ของระบบ

### สำหรับทีมพัฒนา
- **ลดข้อผิดพลาด**: มี checklist และ rules ที่ชัดเจน
- **เพิ่มประสิทธิภาพ**: workflow มาตรฐานที่ผ่านการทดสอบ
- **เรียนรู้จากประสบการณ์**: เก็บ memories และ lessons learned

### สำหรับโปรเจ็ก
- **คุณภาพสูง**: มีการตรวจสอบและทดสอบที่ครอบคลุม
- **ความปลอดภัย**: rules สำหรับความปลอดภัยที่เข้มงวด
- **การบำรุงรักษา**: ระบบที่ง่ายต่อการบำรุงรักษาและขยาย

### สำหรับผู้จัดการ
- **ติดตามความคืบหน้า**: เห็นสถานะของงานและ workflow
- **รายงานและ insights**: ข้อมูลสำหรับการตัดสินใจ
- **มาตรฐานการทำงาน**: ระบบที่ช่วยให้ทีมทำงานตามมาตรฐาน

## 🔮 การพัฒนาต่อ

### Features ที่วางแผนไว้
- [ ] Dashboard สำหรับจัดการ rules และ memories
- [ ] Integration กับ LINE Bot สำหรับแจ้งเตือน
- [ ] AI-powered rule recommendations
- [ ] Advanced workflow automation
- [ ] Performance metrics และ analytics

### การปรับแต่ง
- เพิ่ม rules ใหม่ตามความต้องการของทีม
- สร้าง workflow templates ใหม่
- ปรับแต่ง checklist ตามกระบวนการทำงาน

## 📞 การสนับสนุน

หากมีคำถามหรือต้องการความช่วยเหลือ:

1. ตรวจสอบ API documentation
2. ดู logs ของระบบ
3. ตรวจสอบ project insights
4. ติดต่อทีมพัฒนา

---

**⚠️ ข้อสำคัญ**: ระบบนี้ถูกออกแบบมาเพื่อให้ทีมปฏิบัติตาม rules และ procedures ที่กำหนดไว้ เพื่อให้โปรเจ็กมีคุณภาพสูงและปลอดภัย อย่าลืมตรวจสอบโปรเจ็กและสร้าง To-dos ก่อนเริ่มงานใด ๆ เสมอ!
