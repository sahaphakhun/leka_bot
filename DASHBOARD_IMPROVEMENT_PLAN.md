# 📊 แผนการปรับปรุงและแก้ไข Dashboard ใหม่ (Leka Bot)

**วันที่สร้าง:** 19 ตุลาคม 2568  
**เวอร์ชัน Dashboard:** 2.0.3  
**สถานะโครงการ:** Sprint 3.6 - File Validation Completed

---

## 📋 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [การเปรียบเทียบ Dashboard เก่า vs ใหม่](#การเปรียบเทียบ-dashboard-เก่า-vs-ใหม่)
3. [ประเด็นที่ต้องปรับปรุง - หมวดหมู่](#ประเด็นที่ต้องปรับปรุง---หมวดหมู่)
4. [รายละเอียดการแก้ไขทีละจุด](#รายละเอียดการแก้ไขทีละจุด)
5. [Backend API ที่ต้องเพิ่มหรือแก้ไข](#backend-api-ที่ต้องเพิ่มหรือแก้ไข)
6. [แผนการดำเนินงาน](#แผนการดำเนินงาน)

---

## 🎯 ภาพรวมระบบ

### Dashboard ใหม่ (React + Vite + shadcn/ui)
- **Framework:** React 18 + Vite 6
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **State Management:** Context API (AuthContext, ModalContext)
- **Routing:** Client-side routing
- **ตำแหน่ง:** `/dashboard-new`
- **Components:** 87+ components แบบ modular

### Dashboard เก่า (Vanilla JS + jQuery)
- **Framework:** Vanilla JavaScript + jQuery
- **UI:** Custom CSS + Bordio Design System
- **ตำแหน่ง:** `/dashboard`
- **ไฟล์หลัก:** index.html, script.js, recurring-tasks.js

### Backend API
- **Framework:** Node.js + Express + TypeORM
- **Database:** PostgreSQL
- **Controllers:** apiController.js, dashboardController.js
- **Services:** TaskService, UserService, FileService, RecurringTaskService, KPIService
- **ตำแหน่ง:** `/dist` (compiled TypeScript)

---

## 🔍 การเปรียบเทียบ Dashboard เก่า vs ใหม่

| Feature | Dashboard เก่า | Dashboard ใหม่ | Status |
|---------|--------------|--------------|--------|
| **UI Framework** | Vanilla JS + jQuery | React 18 + Vite | ✅ Improved |
| **Design System** | Custom Bordio CSS | shadcn/ui + Tailwind | ✅ Modern |
| **Component Structure** | Monolithic | Modular (87+ components) | ✅ Better |
| **State Management** | Global variables | Context API | ✅ Scalable |
| **Type Safety** | None | PropTypes/TypeScript-ready | ⚠️ Partial |
| **Performance** | jQuery DOM manipulation | Virtual DOM (React) | ✅ Faster |
| **Mobile Responsive** | ⚠️ Limited | ✅ Full responsive | ✅ Better |
| **File Upload** | Basic (10MB limit) | Enhanced (unlimited) | ✅ Improved |
| **Recurring Tasks** | Basic UI | Advanced management | ✅ Feature-rich |
| **Leaderboard** | Static | Dynamic with periods | ✅ Enhanced |
| **Export Features** | None | CSV, Excel, JSON | ✅ New |
| **Real-time Updates** | Manual refresh | Auto-refresh capable | ⚠️ Need implementation |
| **Error Handling** | Alert boxes | Toast notifications | ✅ Better UX |
| **Loading States** | Simple spinners | Skeleton screens | ✅ Professional |
| **Search & Filter** | Limited | Advanced multi-filter | ✅ Power user |
| **Pagination** | None | Smart pagination | ✅ Scalable |
| **Authentication** | URL params | Context-based | ✅ Secure |
| **Calendar Integration** | None | Google Calendar sync | ✅ New feature |
| **Report Generation** | None | Advanced charts + export | ✅ Analytics |

---

## ⚠️ ประเด็นที่ต้องปรับปรุง - หมวดหมู่

### 🔴 **P0 - Critical (ต้องแก้ก่อน Production)**

1. **Authentication & Authorization**
   - ❌ ไม่มี session management ที่เหมาะสม
   - ❌ Token refresh mechanism ยังไม่มี
   - ❌ CSRF protection ยังไม่ครบถ้วน
   - ❌ Read-only mode ต้องป้องกัน actions ให้ชัดเจน

2. **Error Handling & Resilience**
   - ❌ Network error recovery ยังไม่สมบูรณ์
   - ❌ API retry logic มีใน api.js แต่ไม่ครอบคลุมทุก endpoint
   - ❌ Offline mode ยังไม่รองรับ
   - ❌ Error boundary components ยังไม่มี

3. **Data Validation**
   - ⚠️ Frontend validation ยังไม่ครบทุก form
   - ⚠️ File type validation มีแล้ว แต่ควรเพิ่ม virus scan
   - ⚠️ XSS protection ในการแสดง user-generated content

4. **Performance Issues**
   - ❌ Large file list ยังไม่มี virtualization
   - ❌ Images ไม่มี lazy loading
   - ❌ Bundle size ใหญ่ (ควร code splitting)
   - ❌ API calls ซ้ำซ้อนในบาง components

### 🟡 **P1 - High Priority (ควรแก้เร็ว)**

5. **User Experience**
   - ⚠️ Loading states ยังไม่สม่ำเสมอทุก component
   - ⚠️ Empty states บาง views ยังไม่มี illustration
   - ⚠️ Success feedback หลังการทำงานบางอย่างยังไม่ชัดเจน
   - ⚠️ Keyboard shortcuts ยังไม่มี

6. **Mobile Responsiveness**
   - ⚠️ Table overflow ใน mobile (แก้บางส่วนแล้ว)
   - ⚠️ Touch gestures ยังไม่เหมาะสม
   - ⚠️ Modal size ใน mobile บางครั้งเกินจอ

7. **Accessibility (A11y)**
   - ❌ ARIA labels ยังไม่ครบถ้วน
   - ❌ Keyboard navigation ยังไม่สมบูรณ์
   - ❌ Screen reader support ต้องปรับปรุง
   - ❌ Color contrast บางจุดยังไม่ผ่าน WCAG

### 🟢 **P2 - Medium Priority (ปรับปรุงต่อเนื่อง)**

8. **Feature Completeness**
   - 📝 Batch operations (bulk delete, bulk assign)
   - 📝 Advanced search (full-text search)
   - 📝 Task templates
   - 📝 Notification preferences
   - 📝 Dark mode (UI components รองรับแล้ว แต่ยังไม่มี toggle)

9. **Data Synchronization**
   - 📝 Real-time updates with WebSocket
   - 📝 Optimistic UI updates
   - 📝 Conflict resolution
   - 📝 Sync status indicators

10. **Analytics & Insights**
    - 📝 More dashboard widgets
    - 📝 Custom KPI tracking
    - 📝 Export customization
    - 📝 Automated reports

### 🔵 **P3 - Low Priority (Nice to Have)**

11. **Developer Experience**
    - 📝 Storybook for component documentation
    - 📝 E2E testing with Playwright/Cypress
    - 📝 Performance monitoring
    - 📝 Error tracking (Sentry integration)

12. **Internationalization**
    - 📝 i18n setup (currently Thai only)
    - 📝 Date/time localization
    - 📝 Number formatting by locale

---

## 🛠️ รายละเอียดการแก้ไขทีละจุด

### 1️⃣ **DashboardView.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ Export ข้อมูล Dashboard (CSV, Excel) - **เพิ่งทำเสร็จใน code ที่ modified**
- ⚠️ Stats period selector ทำงาน แต่ยังไม่มี visual feedback ขณะ loading
- ⚠️ Group stats (memberSummaryItems) แสดงข้อมูลไม่ครบถ้วนเมื่อ API ไม่ส่งข้อมูลบางส่วน
- ❌ Mini leaderboard ไม่ auto-refresh ตาม period

#### แนวทางแก้ไข:
```jsx
// 1. เพิ่ม loading state สำหรับ period change
const [statsLoading, setStatsLoading] = useState(false);

const handlePeriodChange = async (newPeriod) => {
  setStatsLoading(true);
  await onStatsPeriodChange(newPeriod);
  setStatsLoading(false);
};

// 2. ปรับปรุง group stats fallback
const memberSummaryItems = useMemo(() => {
  if (!groupStats) return getDefaultSummaryItems(statsData);
  // ... existing logic with better defaults
}, [groupStats, statsData]);

// 3. Auto-refresh leaderboard
useEffect(() => {
  if (statsPeriod) {
    // Reload leaderboard data
  }
}, [statsPeriod]);
```

#### Priority: 🟡 P1

---

### 2️⃣ **FileUploadZone.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ File size limit ถูกยกเลิกแล้ว (was 10MB, now unlimited)
- ⚠️ File type validation มี แต่อาจต้อง scan virus
- ⚠️ Large file upload ไม่มี chunk upload (ควรใช้ chunked upload สำหรับไฟล์ >50MB)
- ❌ Upload progress bar แสดง percentage แต่ไม่แสดงความเร็ว upload
- ❌ Pause/Resume upload ยังไม่มี

#### แนวทางแก้ไข:
```jsx
// 1. Chunk upload for large files
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

const uploadLargeFile = async (file) => {
  if (file.size > 50 * 1024 * 1024) {
    // Use chunked upload
    return uploadInChunks(file, CHUNK_SIZE);
  }
  return normalUpload(file);
};

// 2. Enhanced progress tracking
const [uploadSpeed, setUploadSpeed] = useState(0);
const [timeRemaining, setTimeRemaining] = useState(null);

// Calculate speed and ETA
const updateProgress = ({ loaded, total, startTime }) => {
  const elapsed = Date.now() - startTime;
  const speed = loaded / (elapsed / 1000); // bytes per second
  const remaining = (total - loaded) / speed; // seconds
  
  setUploadSpeed(speed);
  setTimeRemaining(remaining);
};

// 3. Pause/Resume capability
const [uploadController, setUploadController] = useState(null);

const pauseUpload = () => {
  uploadController?.abort();
};

const resumeUpload = () => {
  // Resume from last chunk
};
```

#### Priority: 🟢 P2 (chunked upload), 🟡 P1 (progress enhancement)

---

### 3️⃣ **LeaderboardView.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ Period filtering (weekly, monthly, quarterly, yearly) - **ใช้งานได้**
- ✅ Sync functionality - **มีแล้ว**
- ⚠️ Leaderboard table ไม่มี sorting
- ⚠️ ไม่มี search/filter members
- ❌ Top 3 cards ไม่มี animation
- ❌ Score breakdown ไม่แสดงรายละเอียดว่ามาจากอะไรบ้าง

#### แนวทางแก้ไข:
```jsx
// 1. Add table sorting
const [sortBy, setSortBy] = useState('score');
const [sortOrder, setSortOrder] = useState('desc');

const sortedLeaderboard = useMemo(() => {
  return [...leaderboard].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });
}, [leaderboard, sortBy, sortOrder]);

// 2. Add search
const [searchTerm, setSearchTerm] = useState('');
const filteredLeaderboard = useMemo(() => {
  return sortedLeaderboard.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [sortedLeaderboard, searchTerm]);

// 3. Score breakdown tooltip
<Tooltip>
  <TooltipTrigger>{entry.score}</TooltipTrigger>
  <TooltipContent>
    <div>
      <p>งานเสร็จ: {entry.completionPoints} คะแนน</p>
      <p>ตรงเวลา: {entry.punctualityPoints} คะแนน</p>
      <p>คุณภาพ: {entry.qualityPoints} คะแนน</p>
    </div>
  </TooltipContent>
</Tooltip>
```

#### Priority: 🟡 P1 (sorting/search), 🟢 P2 (score breakdown)

---

### 4️⃣ **MembersView.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ Export members (CSV, Excel, JSON) - **เพิ่งทำเสร็จ**
- ✅ Pagination with SmartPagination - **มีแล้ว**
- ✅ Search and filters - **ใช้งานได้**
- ⚠️ Bulk actions (bulk role change, bulk delete) ยังไม่มี
- ⚠️ Member details modal ต้องดู task history
- ❌ Invite member ไม่มี QR code generation
- ❌ Member activity log ยังไม่มี

#### แนวทางแก้ไข:
```jsx
// 1. Bulk selection
const [selectedMembers, setSelectedMembers] = useState([]);

const handleSelectAll = () => {
  setSelectedMembers(filteredMembers.map(m => m.lineUserId));
};

const handleBulkAction = async (action) => {
  // Bulk update roles, status, etc.
};

// 2. Member task history in detail modal
const MemberDetailModal = ({ member }) => {
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    loadMemberTasks(member.lineUserId);
  }, [member]);
  
  return (
    <Dialog>
      <Tabs>
        <TabsList>
          <TabsTrigger value="info">ข้อมูล</TabsTrigger>
          <TabsTrigger value="tasks">งานที่รับผิดชอบ</TabsTrigger>
          <TabsTrigger value="activity">กิจกรรม</TabsTrigger>
        </TabsList>
      </Tabs>
    </Dialog>
  );
};
```

#### Priority: 🟡 P1 (bulk actions), 🟢 P2 (task history)

---

### 5️⃣ **AddTaskModal.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ Normal task และ Recurring task tabs - **ใช้งานได้**
- ✅ Calendar picker - **ใช้งานได้**
- ✅ Member selection with checkbox - **ใช้งานได้**
- ⚠️ Custom recurrence (กำหนดเอง) ยังไม่มี UI ที่ชัดเจน
- ⚠️ Task template ยังไม่มี (ควรมีการบันทึก template)
- ❌ Assignee ไม่มี search เมื่อมีสมาชิกเยอะ
- ❌ Due date validation (ไม่ควรเลือกวันที่ผ่านมาแล้ว) - มีบ้างแต่ไม่เข้มงวด
- ❌ Time zone awareness ยังไม่ชัดเจน

#### แนวทางแก้ไข:
```jsx
// 1. Custom recurrence UI
{recurringTask.recurrence === 'custom' && (
  <div className="space-y-4">
    <Select
      value={recurringTask.customRecurrence.type}
      onValueChange={(value) => setRecurringTask({
        ...recurringTask,
        customRecurrence: { ...recurringTask.customRecurrence, type: value }
      })}
    >
      <SelectItem value="daily">รายวัน</SelectItem>
      <SelectItem value="weekly">รายสัปดาห์</SelectItem>
      <SelectItem value="monthly">รายเดือน</SelectItem>
    </Select>
    
    <Label>ทุก</Label>
    <Input
      type="number"
      min="1"
      value={recurringTask.customRecurrence.interval}
      onChange={(e) => setRecurringTask({
        ...recurringTask,
        customRecurrence: { 
          ...recurringTask.customRecurrence, 
          interval: parseInt(e.target.value) 
        }
      })}
    />
    
    {recurringTask.customRecurrence.type === 'weekly' && (
      <div className="flex gap-2">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
          <Button
            key={index}
            variant={
              recurringTask.customRecurrence.daysOfWeek.includes(index)
                ? "default"
                : "outline"
            }
            onClick={() => toggleDayOfWeek(index)}
          >
            {day}
          </Button>
        ))}
      </div>
    )}
  </div>
)}

// 2. Task template save/load
const [templates, setTemplates] = useState([]);

const saveAsTemplate = () => {
  const template = {
    name: prompt('ชื่อ template:'),
    data: normalTask
  };
  setTemplates([...templates, template]);
  localStorage.setItem('taskTemplates', JSON.stringify(templates));
};

const loadTemplate = (template) => {
  setNormalTask(template.data);
};

// 3. Assignee search
const [assigneeSearch, setAssigneeSearch] = useState('');
const filteredMembers = members.filter(m => 
  m.displayName.toLowerCase().includes(assigneeSearch.toLowerCase())
);
```

#### Priority: 🟡 P1 (custom recurrence), 🟢 P2 (templates)

---

### 6️⃣ **SubmitTaskModal.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ File upload with drag & drop - **ใช้งานได้**
- ✅ Upload progress - **มีแล้ว**
- ✅ Permission check (hasPermission) - **ใช้งานได้**
- ⚠️ File preview before submit ยังไม่มี
- ❌ Multiple file uploads ใช้ FormData แต่ไม่มี individual file progress
- ❌ Upload retry on failure ยังไม่มี
- ❌ Notes field ไม่มี rich text editor (markdown support)

#### แนวทางแก้ไข:
```jsx
// 1. File preview before submit
const [previews, setPreviews] = useState([]);

const generatePreviews = (files) => {
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, { file, url: e.target.result }]);
      };
      reader.readAsDataURL(file);
    }
  });
};

// 2. Individual file progress
const [fileProgress, setFileProgress] = useState({});

const uploadFilesIndividually = async (files) => {
  for (const file of files) {
    await uploadSingleFile(file, (progress) => {
      setFileProgress(prev => ({
        ...prev,
        [file.name]: progress
      }));
    });
  }
};

// 3. Markdown editor for notes
import ReactMarkdown from 'react-markdown';

const [noteMode, setNoteMode] = useState('edit'); // 'edit' | 'preview'

<Tabs value={noteMode} onValueChange={setNoteMode}>
  <TabsList>
    <TabsTrigger value="edit">แก้ไข</TabsTrigger>
    <TabsTrigger value="preview">ตัวอย่าง</TabsTrigger>
  </TabsList>
  <TabsContent value="edit">
    <Textarea value={notes} onChange={...} />
  </TabsContent>
  <TabsContent value="preview">
    <ReactMarkdown>{notes}</ReactMarkdown>
  </TabsContent>
</Tabs>
```

#### Priority: 🟢 P2 (preview, individual progress), 🔵 P3 (markdown)

---

### 7️⃣ **FilePreviewModal.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ Support multiple file types (image, video, audio, pdf, document) - **ใช้งานได้**
- ✅ Download button - **มีแล้ว**
- ⚠️ PDF preview ใช้ iframe อาจไม่ทำงานใน some browsers
- ⚠️ Large images ไม่มี zoom/pan controls
- ❌ Video player ไม่มี speed control, quality selection
- ❌ File metadata (EXIF, duration, etc.) ไม่แสดง

#### แนวทางแก้ไข:
```jsx
// 1. Better PDF viewer
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const [numPages, setNumPages] = useState(null);
const [pageNumber, setPageNumber] = useState(1);

<Document
  file={previewUrl}
  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
>
  <Page pageNumber={pageNumber} />
</Document>

// 2. Image zoom controls
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

<TransformWrapper>
  <TransformComponent>
    <img src={previewUrl} alt={selectedFile.name} />
  </TransformComponent>
</TransformWrapper>

// 3. Enhanced video player
import ReactPlayer from 'react-player';

<ReactPlayer
  url={previewUrl}
  controls
  config={{
    file: {
      attributes: {
        controlsList: 'nodownload',
        disablePictureInPicture: false
      }
    }
  }}
  playbackRate={playbackSpeed}
/>
```

#### Priority: 🟡 P1 (PDF viewer), 🟢 P2 (zoom controls)

---

### 8️⃣ **ProfileSettings.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ Profile info edit - **ใช้งานได้**
- ✅ Notification preferences - **มีแล้ว**
- ✅ Timezone selection - **ครบถ้วน**
- ⚠️ Email validation ไม่มี email verification process
- ⚠️ Avatar upload ยังไม่มี (ใช้ LINE avatar เท่านั้น)
- ❌ Password change (ถ้ามี local auth) ยังไม่มี
- ❌ Two-factor authentication ยังไม่มี
- ❌ Session management (active devices) ยังไม่มี

#### แนวทางแก้ไข:
```jsx
// 1. Email verification
const [emailVerified, setEmailVerified] = useState(false);
const [verificationSent, setVerificationSent] = useState(false);

const sendVerificationEmail = async () => {
  await api.sendEmailVerification(settings.email);
  setVerificationSent(true);
  showSuccess('ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมาย');
};

// 2. Avatar upload (optional, in addition to LINE avatar)
const [customAvatar, setCustomAvatar] = useState(null);

const handleAvatarUpload = async (file) => {
  const uploaded = await api.uploadAvatar(file);
  setCustomAvatar(uploaded.url);
  showSuccess('อัปเดตรูปโปรไฟล์สำเร็จ');
};

// 3. Active sessions list
const [sessions, setSessions] = useState([]);

const loadSessions = async () => {
  const data = await api.getActiveSessions(userId);
  setSessions(data);
};

const revokeSession = async (sessionId) => {
  await api.revokeSession(sessionId);
  loadSessions();
};
```

#### Priority: 🟡 P1 (email verification), 🟢 P2 (avatar upload)

---

### 9️⃣ **RecurringTasksView.jsx** (Modified)

#### ปัญหาที่พบ:
- ✅ List recurring tasks with filters - **ใช้งานได้**
- ✅ Toggle active/inactive - **มีแล้ว**
- ✅ Edit/Delete actions - **ใช้งานได้**
- ✅ View history - **มีแล้ว**
- ⚠️ Custom recurrence display ยังไม่ชัดเจน (แสดงเป็น "กำหนดเอง" เฉยๆ)
- ⚠️ Next run time ไม่มี countdown timer
- ❌ Dry run / Preview ว่าจะสร้างงานเมื่อไหร่บ้างใน 3 เดือนข้างหน้า
- ❌ Bulk operations ยังไม่มี

#### แนวทางแก้ไข:
```jsx
// 1. Better custom recurrence display
const getRecurrenceDescription = (task) => {
  if (task.recurrence !== 'custom') {
    return getRecurrenceLabel(task.recurrence);
  }
  
  const { type, interval, daysOfWeek, dayOfMonth } = task.customRecurrence;
  
  if (type === 'weekly') {
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const selectedDays = daysOfWeek.map(d => dayNames[d]).join(', ');
    return `ทุก ${interval} สัปดาห์ ในวัน ${selectedDays}`;
  }
  
  if (type === 'monthly') {
    return `ทุก ${interval} เดือน วันที่ ${dayOfMonth}`;
  }
  
  return `ทุก ${interval} ${type}`;
};

// 2. Countdown to next run
const [timeUntilNext, setTimeUntilNext] = useState(null);

useEffect(() => {
  const interval = setInterval(() => {
    filteredTasks.forEach(task => {
      if (task.nextRunAt) {
        const diff = new Date(task.nextRunAt) - new Date();
        setTimeUntilNext(prev => ({
          ...prev,
          [task.id]: formatDuration(diff)
        }));
      }
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [filteredTasks]);

// 3. Preview upcoming tasks
const [previewTask, setPreviewTask] = useState(null);
const [previewDates, setPreviewDates] = useState([]);

const showPreview = async (task) => {
  const dates = await api.previewRecurringTask(task.id, { months: 3 });
  setPreviewDates(dates);
  setPreviewTask(task);
};
```

#### Priority: 🟡 P1 (recurrence description), 🟢 P2 (preview)

---

## 🔌 Backend API ที่ต้องเพิ่มหรือแก้ไข

### ✅ APIs ที่มีอยู่แล้ว (จาก apiController.js)
- `GET /api/groups/:groupId/tasks` - ดึงรายการงาน
- `POST /api/groups/:groupId/tasks` - สร้างงานใหม่
- `PUT /api/groups/:groupId/tasks/:taskId` - แก้ไขงาน
- `DELETE /api/groups/:groupId/tasks/:taskId` - ลบงาน
- `POST /api/groups/:groupId/tasks/:taskId/submit` - ส่งงาน
- `GET /api/groups/:groupId/members` - ดึงรายชื่อสมาชิก
- `POST /api/groups/:groupId/members/invite` - เชิญสมาชิก
- `PUT /api/users/:userId/profile` - อัปเดตโปรไฟล์
- `GET /api/groups/:groupId/leaderboard` - ดึงอันดับ
- `POST /api/groups/:groupId/leaderboard/sync` - ซิงก์อันดับ
- `GET /api/groups/:groupId/recurring-tasks` - ดึงงานประจำ
- `POST /api/groups/:groupId/recurring-tasks` - สร้างงานประจำ
- `PUT /api/groups/:groupId/recurring-tasks/:id` - แก้ไขงานประจำ
- `DELETE /api/groups/:groupId/recurring-tasks/:id` - ลบงานประจำ
- `POST /api/groups/:groupId/files/upload` - อัปโหลดไฟล์
- `GET /api/files/:fileId/preview` - ดู preview ไฟล์

### 🔴 APIs ที่ต้องเพิ่ม (Critical)

```typescript
// 1. Authentication & Session
POST /api/auth/refresh-token
POST /api/auth/logout
GET /api/auth/sessions (list active sessions)
DELETE /api/auth/sessions/:sessionId (revoke session)

// 2. Email Verification
POST /api/users/:userId/email/send-verification
POST /api/users/:userId/email/verify (with token)

// 3. Task Templates
GET /api/users/:userId/task-templates
POST /api/users/:userId/task-templates
DELETE /api/users/:userId/task-templates/:templateId

// 4. Recurring Task Preview
GET /api/groups/:groupId/recurring-tasks/:id/preview?months=3

// 5. Bulk Operations
POST /api/groups/:groupId/tasks/bulk-update
POST /api/groups/:groupId/members/bulk-update
DELETE /api/groups/:groupId/tasks/bulk-delete

// 6. Advanced File Upload
POST /api/files/upload-chunk (chunked upload)
POST /api/files/upload-resume (resume upload)

// 7. Search & Analytics
GET /api/groups/:groupId/search?q=keyword&type=tasks|members|files
GET /api/groups/:groupId/analytics/dashboard
GET /api/groups/:groupId/analytics/member/:memberId

// 8. Real-time Updates
GET /api/sse/groups/:groupId (Server-Sent Events)
// หรือ
WebSocket /ws/groups/:groupId

// 9. Export Enhancements
GET /api/groups/:groupId/export/tasks?format=csv|excel|json
GET /api/groups/:groupId/export/members?format=csv|excel|json
GET /api/groups/:groupId/export/reports?format=pdf|excel

// 10. Avatar Upload
POST /api/users/:userId/avatar
DELETE /api/users/:userId/avatar
```

### 🟡 APIs ที่ต้องปรับปรุง (Improvements)

```typescript
// 1. เพิ่ม pagination & sorting ให้ครบทุก list endpoint
GET /api/groups/:groupId/tasks?page=1&limit=20&sort=dueDate&order=asc

// 2. เพิ่ม filtering options
GET /api/groups/:groupId/tasks?status=completed&assignee=userId&startDate=2024-01-01

// 3. เพิ่ม response metadata
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}

// 4. Error responses ที่สม่ำเสมอ
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "ไม่พบงานที่ระบุ",
    "details": {...}
  }
}
```

---

## 📅 แผนการดำเนินงาน

### **Sprint 4.1 - Critical Fixes (2 weeks)**
**Focus:** แก้ปัญหา P0 Critical

**Week 1:**
- [ ] Error boundary components
- [ ] Enhanced error handling & retry logic
- [ ] CSRF protection
- [ ] Frontend validation ทุก forms
- [ ] API: Authentication endpoints (refresh token, sessions)

**Week 2:**
- [ ] Bundle optimization (code splitting)
- [ ] Virtual scrolling for large lists
- [ ] Image lazy loading
- [ ] API caching strategy
- [ ] API: Email verification

**Deliverables:**
- ระบบมั่นคงและปลอดภัยมากขึ้น
- Performance ดีขึ้น 30-50%
- Error handling ครบถ้วน

---

### **Sprint 4.2 - UX Improvements (2 weeks)**
**Focus:** ปรับปรุง P1 High Priority

**Week 1:**
- [ ] Loading states consistency
- [ ] Empty states with illustrations
- [ ] Success feedback improvements
- [ ] Keyboard shortcuts
- [ ] Mobile touch gestures

**Week 2:**
- [ ] Table sorting in LeaderboardView
- [ ] Search in LeaderboardView & AddTaskModal
- [ ] Bulk actions in MembersView
- [ ] Custom recurrence UI in AddTaskModal
- [ ] File preview before submit

**Deliverables:**
- User experience ดีขึ้นอย่างเห็นได้ชัด
- Mobile usability สมบูรณ์
- Power user features

---

### **Sprint 4.3 - Feature Completeness (2 weeks)**
**Focus:** P2 Medium Priority

**Week 1:**
- [ ] Task templates
- [ ] Advanced search (full-text)
- [ ] Notification preferences
- [ ] Member task history
- [ ] Recurring task preview

**Week 2:**
- [ ] Dark mode toggle
- [ ] Score breakdown in Leaderboard
- [ ] Avatar upload
- [ ] Markdown editor for notes
- [ ] Chunked file upload

**Deliverables:**
- Feature parity with competitors
- Advanced features for power users

---

### **Sprint 4.4 - Real-time & Analytics (2 weeks)**
**Focus:** Real-time updates & Better insights

**Week 1:**
- [ ] WebSocket/SSE setup
- [ ] Real-time task updates
- [ ] Optimistic UI updates
- [ ] Sync status indicators

**Week 2:**
- [ ] Advanced dashboard widgets
- [ ] Custom KPI tracking
- [ ] Automated reports
- [ ] Export customization

**Deliverables:**
- Real-time collaboration
- Better business intelligence

---

### **Sprint 4.5 - Accessibility & Polish (1-2 weeks)**
**Focus:** A11y & Final touches

- [ ] ARIA labels ครบถ้วน
- [ ] Keyboard navigation สมบูรณ์
- [ ] Screen reader testing
- [ ] Color contrast fixes
- [ ] Animation polish
- [ ] Micro-interactions

**Deliverables:**
- WCAG 2.1 Level AA compliance
- Professional polish

---

### **Sprint 4.6 - Testing & Documentation (1 week)**
**Focus:** QA & Documentation

- [ ] E2E tests (Playwright/Cypress)
- [ ] Component tests
- [ ] Performance testing
- [ ] User documentation
- [ ] Developer documentation
- [ ] Storybook setup

**Deliverables:**
- Test coverage > 80%
- Complete documentation

---

## 🎯 Success Metrics

### Performance Metrics
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse Score > 90
- [ ] Bundle size < 500KB (gzipped)

### User Experience Metrics
- [ ] Task creation time < 30s
- [ ] Page load time < 2s
- [ ] Zero critical bugs
- [ ] Mobile usability score > 95

### Business Metrics
- [ ] User adoption rate > 80%
- [ ] Feature usage rate > 60%
- [ ] User satisfaction score > 4.5/5
- [ ] Reduction in support tickets > 30%

---

## 📝 Notes & Observations

### จุดแข็งของ Dashboard ใหม่
1. ✅ **Modern Stack** - React + Vite ทำให้ development เร็วและ maintainable
2. ✅ **Component Reusability** - shadcn/ui components ใช้ซ้ำได้ดี
3. ✅ **Type Safety** - พร้อมสำหรับ TypeScript migration
4. ✅ **Performance** - Virtual DOM และ lazy loading
5. ✅ **Developer Experience** - Hot reload, debugging tools

### จุดอ่อนที่ต้องแก้
1. ❌ **Bundle Size** - ยังใหญ่เกินไป (ต้อง code splitting)
2. ❌ **Error Handling** - ยังไม่ครอบคลุมทุก edge case
3. ❌ **Real-time** - ยังไม่มี WebSocket/SSE
4. ❌ **Testing** - Test coverage ยังน้อย
5. ❌ **Documentation** - ต้องเขียน documentation เพิ่ม

### ข้อแนะนำ
1. **Incremental Migration** - ไม่ต้องทำทั้งหมดพร้อมกัน ทีละ Sprint
2. **User Feedback** - รับ feedback จาก users ก่อน implement features ใหม่
3. **Performance Budget** - กำหนด budget และวัดผลทุก Sprint
4. **Automated Testing** - เริ่ม E2E tests เร็วที่สุด
5. **Feature Flags** - ใช้ feature flags สำหรับ features ใหม่

---

## 📚 เอกสารอ้างอิง

- [React Best Practices](https://react.dev/learn)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Web Vitals](https://web.dev/vitals/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**สรุป:** Dashboard ใหม่มีพื้นฐานที่ดีมาก แต่ยังต้องปรับปรุงในด้าน Performance, Error Handling, และ Feature Completeness ก่อนที่จะ production-ready แนะนำให้ดำเนินการตามแผน Sprint ข้างต้นเป็นระยะๆ พร้อมรับ feedback จาก users อย่างสม่ำเสมอ

---

**เอกสารนี้สร้างโดย:** Claude (Anthropic AI)  
**วันที่:** 19 ตุลาคม 2568  
**เวอร์ชัน:** 1.0
