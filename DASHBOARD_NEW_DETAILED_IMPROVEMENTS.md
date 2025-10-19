# 🔧 Dashboard ใหม่ - รายละเอียดการปรับปรุงและแก้ไขทุกจุด

**วันที่สร้าง:** 19 ตุลาคม 2568  
**เวอร์ชัน:** 2.0.3  
**สถานะ:** Sprint 4.2 Complete, พร้อม Sprint 4.3

---

## 📋 สารบัญ

1. [ภาพรวมการปรับปรุง](#ภาพรวมการปรับปรุง)
2. [ปัญหาแบ่งตาม Priority](#ปัญหาแบ่งตาม-priority)
3. [รายละเอียดแต่ละ Component](#รายละเอียดแต่ละ-component)
4. [Backend APIs ที่ต้องเพิ่ม](#backend-apis-ที่ต้องเพิ่ม)
5. [แผนการแก้ไข Step-by-Step](#แผนการแก้ไข-step-by-step)

---

## 🎯 ภาพรวมการปรับปรุง

### สถานะปัจจุบัน

**✅ ทำเสร็จแล้ว (Sprint 4.1-4.2):**
- Error handling (Error boundaries, Circuit breaker)
- Performance optimization (Code splitting, Virtual scrolling, Lazy loading)
- Caching (API cache, Request deduplication)
- Security (CSRF, XSS prevention, Validation)
- UX improvements (Loading states, Empty states, Toast, Keyboard shortcuts)
- Data management (Sorting, Search, Pagination, Bulk actions)
- Export system (CSV, Excel, JSON, Clipboard)

**🔄 ต้องทำต่อ (Sprint 4.3-4.6):**
- Feature completeness (Templates, Advanced search, Real-time)
- Testing (E2E, Component tests, API tests)
- Documentation (User guide, API docs)
- Accessibility (ARIA, Keyboard navigation, Screen reader)
- PWA support (Service Worker, Offline mode)

---

## 📊 ปัญหาแบ่งตาม Priority

### 🔴 P0 - Critical (ต้องแก้ก่อน Production)

| # | Component/Feature | ปัญหา | ผลกระทบ | Status |
|---|------------------|-------|---------|--------|
| 1 | **Backend APIs** | ขาด APIs สำหรับ bulk actions, email verification | ฟีเจอร์ใช้งานไม่ได้เต็มที่ | ❌ Pending |
| 2 | **Authentication** | ไม่มี refresh token mechanism | Session หมดอายุต้อง login ใหม่ | ❌ Pending |
| 3 | **Error Tracking** | ยังไม่มี Sentry integration | ไม่ทราบ errors ใน production | ❌ Pending |
| 4 | **Testing** | E2E tests ยังไม่มี | อาจมี bugs ใน production | ❌ Pending |
| 5 | **Mobile Testing** | ยังไม่ได้ test บน real devices | อาจใช้งานบน mobile ไม่ได้ | ❌ Pending |

### 🟡 P1 - High Priority (ควรแก้เร็ว)

| # | Component/Feature | ปัญหา | ผลกระทบ | Status |
|---|------------------|-------|---------|--------|
| 6 | **DashboardView** | Stats loading ไม่มี visual feedback | UX ไม่ดีเมื่อ loading | 🟡 In Progress |
| 7 | **FilePreviewModal** | PDF viewer ใช้ iframe (limited controls) | ไม่สะดวกในการดู PDF | 🟡 In Progress |
| 8 | **AddTaskModal** | Custom recurrence UI ยังไม่ชัดเจน | ยากต่อการตั้งค่า recurring | 🟡 In Progress |
| 9 | **SubmitTaskModal** | ไม่มี file preview ก่อน submit | ไม่แน่ใจว่าเลือกไฟล์ถูก | 🟡 In Progress |
| 10 | **ProfileSettings** | Email verification ยังไม่มี | อีเมลอาจไม่ถูกต้อง | 🟡 In Progress |

### 🟢 P2 - Medium Priority (ปรับปรุงต่อเนื่อง)

| # | Component/Feature | ปัญหา | ผลกระทบ | Status |
|---|------------------|-------|---------|--------|
| 11 | **FileUploadZone** | ไม่มี chunked upload สำหรับไฟล์ใหญ่ | Upload ไฟล์ >50MB ช้า | 🟢 Future |
| 12 | **MembersView** | ไม่มี member activity log | ไม่รู้ว่าสมาชิกทำอะไรบ้าง | 🟢 Future |
| 13 | **LeaderboardView** | Score breakdown ไม่แสดงรายละเอียด | ไม่รู้ว่าคะแนนมาจากไหน | 🟢 Future |
| 14 | **RecurringTasksView** | ไม่มี preview upcoming tasks | ไม่แน่ใจว่างานจะสร้างเมื่อไหร่ | 🟢 Future |
| 15 | **App-wide** | ไม่มี Dark mode toggle | บางคนชอบ dark mode | 🟢 Future |

### 🔵 P3 - Low Priority (Nice to Have)

| # | Component/Feature | ปัญหา | ผลกระทบ | Status |
|---|------------------|-------|---------|--------|
| 16 | **App-wide** | ไม่มี Storybook | ยากต่อการ document components | 🔵 Optional |
| 17 | **App-wide** | ไม่มี i18n (แค่ภาษาไทย) | ใช้ได้แค่ภาษาไทย | 🔵 Optional |
| 18 | **SubmitTaskModal** | ไม่มี Markdown editor | ไม่สามารถ format text ได้ | 🔵 Optional |
| 19 | **FilePreviewModal** | ไม่มี EXIF metadata display | ไม่แสดงข้อมูลไฟล์ | 🔵 Optional |
| 20 | **ProfileSettings** | ไม่มี 2FA | ความปลอดภัยน้อยกว่า | 🔵 Optional |

---

## 🔧 รายละเอียดแต่ละ Component

### 1️⃣ DashboardView.jsx

**ตำแหน่ง:** `/dashboard-new/src/components/DashboardView.jsx`

**สถานะปัจจุบัน:** ✅ ใช้งานได้ แต่มีจุดปรับปรุง

#### ปัญหาที่พบ:

**🟡 P1 - Stats Loading State**
```jsx
// ปัญหา: เปลี่ยน period แล้วไม่มี loading indicator
const handlePeriodChange = (newPeriod) => {
  onStatsPeriodChange(newPeriod); // ไม่มี loading state
};
```

**แก้ไข:**
```jsx
// เพิ่ม loading state
const [statsLoading, setStatsLoading] = useState(false);

const handlePeriodChange = async (newPeriod) => {
  setStatsLoading(true);
  try {
    await onStatsPeriodChange(newPeriod);
  } finally {
    setStatsLoading(false);
  }
};

// ใน UI
{statsLoading ? (
  <LoadingSkeleton type="stat-card" count={4} />
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Stats cards */}
  </div>
)}
```

**🟢 P2 - Group Stats Fallback**
```jsx
// ปัญหา: ถ้า groupStats ไม่มีข้อมูลบางส่วน UI จะแสดงผิด
const memberSummaryItems = useMemo(() => {
  if (!groupStats) return getDefaultSummaryItems(statsData);
  // ... ถ้า groupStats.totalMembers เป็น undefined จะแสดง NaN
}, [groupStats, statsData]);
```

**แก้ไข:**
```jsx
const memberSummaryItems = useMemo(() => {
  if (!groupStats) return getDefaultSummaryItems(statsData);
  
  return [
    {
      icon: Users,
      label: "สมาชิกทั้งหมด",
      value: groupStats.totalMembers ?? 0, // ใช้ nullish coalescing
      color: "text-blue-600",
    },
    {
      icon: CheckCircle2,
      label: "สมาชิกที่ทำงานสำเร็จ",
      value: groupStats.activeMembers ?? 0,
      color: "text-green-600",
    },
    {
      icon: TrendingUp,
      label: "อัตราการทำงานสำเร็จ",
      value: groupStats.completionRate 
        ? `${groupStats.completionRate.toFixed(1)}%`
        : "0%",
      color: "text-purple-600",
    },
    {
      icon: Award,
      label: "คะแนนเฉลี่ย",
      value: groupStats.averageScore 
        ? groupStats.averageScore.toFixed(1)
        : "0.0",
      color: "text-yellow-600",
    },
  ];
}, [groupStats, statsData]);
```

**🟢 P2 - Mini Leaderboard Auto-refresh**
```jsx
// ปัญหา: เปลี่ยน period แล้ว mini leaderboard ไม่อัปเดต
```

**แก้ไข:**
```jsx
// เพิ่ม useEffect เพื่อ reload leaderboard
useEffect(() => {
  if (statsPeriod && groupId) {
    loadLeaderboardData(groupId, statsPeriod);
  }
}, [statsPeriod, groupId]);

const loadLeaderboardData = async (groupId, period) => {
  try {
    const data = await getLeaderboard(groupId, period);
    setLeaderboardData(data.slice(0, 3)); // Top 3 only
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
  }
};
```

**Priority:** 🟡 P1 (loading state), 🟢 P2 (fallback, auto-refresh)

**Effort:** ~4 hours

---

### 2️⃣ FileUploadZone.jsx

**ตำแหน่ง:** `/dashboard-new/src/components/files/FileUploadZone.jsx`

**สถานะปัจจุบัน:** ✅ ใช้งานได้ดี (Sprint 3.6 - File validation complete)

#### ปัญหาที่พบ:

**🟢 P2 - Chunked Upload for Large Files**
```jsx
// ปัญหา: ไฟล์ใหญ่ >50MB อาจ upload ล้มเหลว
const handleUpload = async (file) => {
  // ส่ง file ทีเดียวทั้งหมด
  await uploadFile(file);
};
```

**แก้ไข:**
```jsx
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

const handleUpload = async (file) => {
  if (file.size > 50 * 1024 * 1024) {
    // Large file - use chunked upload
    return uploadInChunks(file);
  }
  // Small file - normal upload
  return uploadFile(file);
};

const uploadInChunks = async (file) => {
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = generateUploadId();
  
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const progress = (i / chunks) * 100;
    setUploadProgress(prev => ({
      ...prev,
      [file.name]: { progress, chunk: i + 1, total: chunks }
    }));
    
    await uploadChunk(uploadId, chunk, i, chunks);
  }
  
  // Complete upload
  await completeChunkedUpload(uploadId);
};
```

**🟢 P2 - Enhanced Progress Tracking**
```jsx
// ปัญหา: แสดงแค่ percentage ไม่มีความเร็วและเวลาที่เหลือ
<div className="text-sm text-gray-600">
  {progress.percentage}%
</div>
```

**แก้ไข:**
```jsx
const [uploadMetrics, setUploadMetrics] = useState({});

const calculateUploadMetrics = (file, loaded, startTime) => {
  const elapsed = Date.now() - startTime; // ms
  const speed = loaded / (elapsed / 1000); // bytes/sec
  const remaining = (file.size - loaded) / speed; // sec
  
  return {
    percentage: (loaded / file.size) * 100,
    speed: formatSpeed(speed), // "2.5 MB/s"
    timeRemaining: formatTime(remaining), // "1 min 30 sec"
  };
};

// ใน UI
<div className="space-y-1">
  <div className="flex justify-between text-sm">
    <span>{metrics.percentage.toFixed(1)}%</span>
    <span className="text-gray-600">{metrics.speed}</span>
  </div>
  <Progress value={metrics.percentage} />
  <p className="text-xs text-gray-500">
    เหลืออีก {metrics.timeRemaining}
  </p>
</div>
```

**🔵 P3 - Pause/Resume Upload**
```jsx
// Nice to have: ปุ่ม pause/resume upload
const [uploadController, setUploadController] = useState(null);

const pauseUpload = () => {
  uploadController?.abort();
  setPaused(true);
};

const resumeUpload = () => {
  // Resume from last chunk
  setPaused(false);
  continueUpload();
};
```

**Priority:** 🟢 P2 (chunked upload, metrics), 🔵 P3 (pause/resume)

**Effort:** ~8 hours (chunked upload), ~4 hours (metrics)

**Note:** ต้องมี Backend API สำหรับ chunked upload:
```
POST /api/files/upload-chunk
POST /api/files/upload-complete
```

---

### 3️⃣ FilePreviewModal.jsx

**ตำแหน่ง:** `/dashboard-new/src/components/modals/FilePreviewModal.jsx`

**สถานะปัจจุบัน:** ✅ ใช้งานได้ แต่ preview ยังไม่ดีพอ

#### ปัญหาที่พบ:

**🟡 P1 - PDF Viewer with Controls**
```jsx
// ปัญหา: ใช้ iframe ธรรมดา ไม่มี zoom, pagination controls
{mimeType === 'application/pdf' && (
  <iframe
    src={previewUrl}
    className="w-full h-full"
    title="PDF Preview"
  />
)}
```

**แก้ไข:**
```jsx
// ติดตั้ง react-pdf
// npm install react-pdf

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            หน้า {pageNumber} / {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(Math.min(2.0, scale + 0.1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          className="flex justify-center p-4"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
};
```

**🟢 P2 - Image Zoom Controls**
```jsx
// ปัญหา: รูปภาพใหญ่ไม่สามารถ zoom/pan ได้
{mimeType.startsWith('image/') && (
  <img src={previewUrl} alt={selectedFile.name} />
)}
```

**แก้ไข:**
```jsx
// ติดตั้ง react-zoom-pan-pinch
// npm install react-zoom-pan-pinch

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const ImageViewer = ({ src, alt }) => {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={4}
      centerOnInit={true}
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div className="relative h-full">
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => zoomIn()}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => zoomOut()}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => resetTransform()}>
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Image */}
          <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-full !h-full flex items-center justify-center"
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain"
            />
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  );
};
```

**🟢 P2 - Enhanced Video Player**
```jsx
// ปัญหา: Video player ธรรมดา ไม่มี speed control, quality selection
{mimeType.startsWith('video/') && (
  <video src={previewUrl} controls className="w-full h-full" />
)}
```

**แก้ไข:**
```jsx
// ติดตั้ง react-player
// npm install react-player

import ReactPlayer from 'react-player';

const VideoPlayer = ({ url }) => {
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative h-full bg-black">
      <ReactPlayer
        url={url}
        controls
        playing={playing}
        playbackRate={playbackRate}
        width="100%"
        height="100%"
        config={{
          file: {
            attributes: {
              controlsList: 'nodownload',
              disablePictureInPicture: false,
            },
          },
        }}
      />
      
      {/* Speed Control */}
      <div className="absolute top-4 right-4 z-10">
        <Select value={playbackRate} onValueChange={(v) => setPlaybackRate(parseFloat(v))}>
          <SelectTrigger className="w-24 bg-black/50 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5x</SelectItem>
            <SelectItem value="1.0">1.0x</SelectItem>
            <SelectItem value="1.5">1.5x</SelectItem>
            <SelectItem value="2.0">2.0x</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
```

**🔵 P3 - File Metadata Display**
```jsx
// Nice to have: แสดง EXIF, duration, resolution, etc.
const FileMetadata = ({ file, metadata }) => {
  return (
    <div className="p-4 border-t space-y-2 text-sm">
      <h4 className="font-semibold">ข้อมูลไฟล์</h4>
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-gray-600">ขนาด:</span> {formatFileSize(file.size)}</div>
        <div><span className="text-gray-600">ประเภท:</span> {file.mimeType}</div>
        {metadata.dimensions && (
          <div><span className="text-gray-600">ขนาดภาพ:</span> {metadata.dimensions}</div>
        )}
        {metadata.duration && (
          <div><span className="text-gray-600">ความยาว:</span> {metadata.duration}</div>
        )}
        {metadata.uploadedAt && (
          <div><span className="text-gray-600">อัปโหลดเมื่อ:</span> {formatDate(metadata.uploadedAt)}</div>
        )}
      </div>
    </div>
  );
};
```

**Priority:** 🟡 P1 (PDF controls), 🟢 P2 (zoom, video), 🔵 P3 (metadata)

**Effort:** ~8 hours (PDF), ~4 hours (image zoom), ~4 hours (video), ~2 hours (metadata)

**Dependencies:**
```bash
npm install react-pdf react-zoom-pan-pinch react-player
```

---

### 4️⃣ AddTaskModal.jsx

**ตำแหน่ง:** `/dashboard-new/src/components/modals/AddTaskModal.jsx`

**สถานะปัจจุบัน:** ✅ ใช้งานได้ แต่ custom recurrence ยังไม่ชัดเจน

#### ปัญหาที่พบ:

**🟡 P1 - Custom Recurrence UI**
```jsx
// ปัญหา: เลือก "กำหนดเอง" แล้วไม่มี UI ให้ตั้งค่า
{recurringTask.recurrence === 'custom' && (
  <p className="text-sm text-gray-600">
    กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า
  </p>
)}
```

**แก้ไข:**
```jsx
// สร้าง CustomRecurrenceUI component
const CustomRecurrenceUI = ({ value, onChange }) => {
  const [type, setType] = useState(value?.type || 'daily');
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(value?.daysOfWeek || []);
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth || 1);

  useEffect(() => {
    onChange({
      type,
      interval,
      daysOfWeek: type === 'weekly' ? daysOfWeek : [],
      dayOfMonth: type === 'monthly' ? dayOfMonth : null,
    });
  }, [type, interval, daysOfWeek, dayOfMonth]);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">ตั้งค่าความถี่</h4>
      
      {/* Type Selection */}
      <div className="space-y-2">
        <Label>ประเภท</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">รายวัน</SelectItem>
            <SelectItem value="weekly">รายสัปดาห์</SelectItem>
            <SelectItem value="monthly">รายเดือน</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Interval */}
      <div className="space-y-2">
        <Label>ทุก</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
            className="w-20"
          />
          <span className="text-sm text-gray-600">
            {type === 'daily' && 'วัน'}
            {type === 'weekly' && 'สัปดาห์'}
            {type === 'monthly' && 'เดือน'}
          </span>
        </div>
      </div>
      
      {/* Days of Week (for weekly) */}
      {type === 'weekly' && (
        <div className="space-y-2">
          <Label>วันที่ทำ</Label>
          <div className="flex flex-wrap gap-2">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
              <Button
                key={index}
                type="button"
                variant={daysOfWeek.includes(index) ? "default" : "outline"}
                size="sm"
                className="w-10 h-10"
                onClick={() => {
                  if (daysOfWeek.includes(index)) {
                    setDaysOfWeek(daysOfWeek.filter(d => d !== index));
                  } else {
                    setDaysOfWeek([...daysOfWeek, index].sort());
                  }
                }}
              >
                {day}
              </Button>
            ))}
          </div>
          {daysOfWeek.length === 0 && (
            <p className="text-sm text-red-500">กรุณาเลือกอย่างน้อย 1 วัน</p>
          )}
        </div>
      )}
      
      {/* Day of Month (for monthly) */}
      {type === 'monthly' && (
        <div className="space-y-2">
          <Label>วันที่ของเดือน</Label>
          <Select value={dayOfMonth.toString()} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <SelectItem key={day} value={day.toString()}>
                  วันที่ {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Preview */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>ตัวอย่าง:</strong> {getRecurrenceDescription()}
        </p>
      </div>
    </div>
  );
  
  function getRecurrenceDescription() {
    if (type === 'daily') {
      return `ทุก ${interval} วัน`;
    }
    if (type === 'weekly') {
      const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const selectedDays = daysOfWeek.map(d => dayNames[d]).join(', ');
      return `ทุก ${interval} สัปดาห์ ในวัน ${selectedDays || '(ยังไม่ได้เลือก)'}`;
    }
    if (type === 'monthly') {
      return `ทุก ${interval} เดือน วันที่ ${dayOfMonth}`;
    }
    return '';
  }
};

// ใช้ใน AddTaskModal
{recurringTask.recurrence === 'custom' && (
  <CustomRecurrenceUI
    value={recurringTask.customRecurrence}
    onChange={(value) => setRecurringTask({
      ...recurringTask,
      customRecurrence: value
    })}
  />
)}
```

**🟢 P2 - Task Templates**
```jsx
// Feature: บันทึก task เป็น template เพื่อใช้ซ้ำ
const [templates, setTemplates] = useState([]);

useEffect(() => {
  // โหลด templates จาก localStorage
  const saved = localStorage.getItem('taskTemplates');
  if (saved) {
    setTemplates(JSON.parse(saved));
  }
}, []);

const saveAsTemplate = () => {
  const templateName = prompt('ชื่อ Template:');
  if (!templateName) return;
  
  const template = {
    id: Date.now().toString(),
    name: templateName,
    data: normalTask, // บันทึก task data ปัจจุบัน
    createdAt: new Date().toISOString(),
  };
  
  const updated = [...templates, template];
  setTemplates(updated);
  localStorage.setItem('taskTemplates', JSON.stringify(updated));
  showSuccess(`บันทึก Template "${templateName}" แล้ว`);
};

const loadTemplate = (template) => {
  if (confirm(`โหลด Template "${template.name}" หรือไม่?`)) {
    setNormalTask(template.data);
    showSuccess(`โหลด Template "${template.name}" แล้ว`);
  }
};

const deleteTemplate = (templateId) => {
  if (confirm('ลบ Template นี้หรือไม่?')) {
    const updated = templates.filter(t => t.id !== templateId);
    setTemplates(updated);
    localStorage.setItem('taskTemplates', JSON.stringify(updated));
    showSuccess('ลบ Template แล้ว');
  }
};

// ใน UI (ด้านบน Normal Task form)
{templates.length > 0 && (
  <div className="mb-4 p-4 border rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <Label>Templates</Label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={saveAsTemplate}
      >
        <Save className="w-4 h-4 mr-2" />
        บันทึกเป็น Template
      </Button>
    </div>
    <div className="flex flex-wrap gap-2">
      {templates.map(template => (
        <div key={template.id} className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => loadTemplate(template)}
          >
            {template.name}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => deleteTemplate(template.id)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  </div>
)}
```

**🔵 P3 - Due Date Validation**
```jsx
// ป้องกันการเลือกวันที่ผ่านมาแล้ว
const handleDueDateChange = (date) => {
  if (date < new Date()) {
    showError('ไม่สามารถเลือกวันที่ผ่านมาแล้วได้');
    return;
  }
  setNormalTask({ ...normalTask, dueDate: date });
};
```

**Priority:** 🟡 P1 (custom recurrence), 🟢 P2 (templates), 🔵 P3 (validation)

**Effort:** ~12 hours (custom recurrence), ~6 hours (templates)

---

### 5️⃣ SubmitTaskModal.jsx

**ตำแหน่ง:** `/dashboard-new/src/components/modals/SubmitTaskModal.jsx`

**สถานะปัจจุบัน:** ✅ ใช้งานได้

#### ปัญหาที่พบ:

**🟡 P1 - File Preview Before Submit**
```jsx
// ปัญหา: เลือกไฟล์แล้วไม่เห็น preview ก่อนส่ง
const handleFileChange = (e) => {
  const files = Array.from(e.target.files);
  setSelectedFiles(files);
};
```

**แก้ไข:**
```jsx
const [filePreviews, setFilePreviews] = useState([]);

const handleFileChange = (e) => {
  const files = Array.from(e.target.files);
  setSelectedFiles(files);
  
  // Generate previews
  const previews = [];
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push({
          file,
          type: 'image',
          url: e.target.result,
        });
        setFilePreviews([...previews]);
      };
      reader.readAsDataURL(file);
    } else {
      previews.push({
        file,
        type: 'file',
        icon: getFileIcon(file.type),
      });
    }
  });
  
  if (previews.length > 0) {
    setFilePreviews(previews);
  }
};

// ใน UI
{filePreviews.length > 0 && (
  <div className="space-y-2">
    <Label>ไฟล์ที่เลือก</Label>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {filePreviews.map((preview, index) => (
        <div key={index} className="relative group">
          {preview.type === 'image' ? (
            <img
              src={preview.url}
              alt={preview.file.name}
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-32 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
              {preview.icon}
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 truncate w-full px-2">
                {preview.file.name}
              </p>
            </div>
          )}
          
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeFile(index)}
          >
            <X className="w-4 h-4" />
          </Button>
          
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
            {formatFileSize(preview.file.size)}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
```

**🟢 P2 - Individual File Progress**
```jsx
// แสดง progress แต่ละไฟล์แทนที่จะรวมกัน
const [fileProgress, setFileProgress] = useState({});

const uploadFilesIndividually = async (files) => {
  const uploaded = [];
  
  for (const file of files) {
    try {
      const result = await uploadFile(groupId, file, taskId, userId, (progress) => {
        setFileProgress(prev => ({
          ...prev,
          [file.name]: progress
        }));
      });
      uploaded.push(result);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      showError(`ไม่สามารถอัปโหลด ${file.name} ได้`);
    }
  }
  
  return uploaded;
};

// ใน UI (แสดง progress ขณะ upload)
{isUploading && (
  <div className="space-y-2">
    {selectedFiles.map(file => (
      <div key={file.name} className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="truncate">{file.name}</span>
          <span>{fileProgress[file.name] || 0}%</span>
        </div>
        <Progress value={fileProgress[file.name] || 0} />
      </div>
    ))}
  </div>
)}
```

**🔵 P3 - Markdown Editor**
```jsx
// Nice to have: รองรับ Markdown ใน notes
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ReactMarkdown from 'react-markdown';

const [noteMode, setNoteMode] = useState('edit'); // 'edit' | 'preview'

<div className="space-y-2">
  <Label htmlFor="notes">บันทึกเพิ่มเติม</Label>
  <Tabs value={noteMode} onValueChange={setNoteMode}>
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="edit">แก้ไข</TabsTrigger>
      <TabsTrigger value="preview">ตัวอย่าง</TabsTrigger>
    </TabsList>
    <TabsContent value="edit">
      <Textarea
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="เขียนบันทึก... รองรับ Markdown"
        rows={6}
      />
      <p className="text-xs text-gray-500 mt-1">
        รองรับ **หนา**, *เอียง*, [ลิงก์](url), - รายการ
      </p>
    </TabsContent>
    <TabsContent value="preview">
      <div className="min-h-[150px] p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        {notes ? (
          <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
            {notes}
          </ReactMarkdown>
        ) : (
          <p className="text-gray-500 text-sm">ไม่มีบันทึก</p>
        )}
      </div>
    </TabsContent>
  </Tabs>
</div>
```

**Priority:** 🟡 P1 (preview), 🟢 P2 (individual progress), 🔵 P3 (markdown)

**Effort:** ~4 hours (preview), ~4 hours (progress), ~6 hours (markdown)

**Dependencies:**
```bash
npm install react-markdown
```

---

### 6️⃣ MembersView.jsx

**ตำแหน่ง:** `/dashboard-new/src/components/members/MembersView.jsx`

**สถานะปัจจุบัน:** ✅ Bulk actions ทำแล้ว (Sprint 4.2 Week 2)

#### ปัญหาที่พบ:

**🔴 P0 - Backend APIs Missing**
```jsx
// ปัญหา: Backend ยังไม่มี API สำหรับ bulk actions
const handleBulkDelete = async () => {
  // ต้องมี API endpoint นี้
  await bulkDeleteMembers(groupId, selectedMembers);
};

const handleBulkChangeRole = async (role) => {
  // ต้องมี API endpoint นี้
  await bulkUpdateMemberRole(groupId, selectedMembers, role);
};
```

**แก้ไข:** ดู [Backend APIs ที่ต้องเพิ่ม](#backend-apis-ที่ต้องเพิ่ม)

**🟢 P2 - Member Activity Log**
```jsx
// Feature: แสดง activity log ของสมาชิกแต่ละคน
const MemberDetailModal = ({ member, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemberActivities();
  }, [member.lineUserId]);

  const loadMemberActivities = async () => {
    try {
      setLoading(true);
      const data = await getMemberActivities(groupId, member.lineUserId);
      setActivities(data);
    } catch (error) {
      showError('ไม่สามารถโหลดประวัติกิจกรรมได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{member.displayName || member.name}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">ข้อมูล</TabsTrigger>
            <TabsTrigger value="tasks">งาน</TabsTrigger>
            <TabsTrigger value="activity">กิจกรรม</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info">
            {/* Member info */}
          </TabsContent>
          
          <TabsContent value="tasks">
            {/* Member tasks */}
          </TabsContent>
          
          <TabsContent value="activity">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {loading ? (
                <LoadingSkeleton type="list-item" count={5} />
              ) : activities.length === 0 ? (
                <EmptyState
                  icon={<Activity className="w-12 h-12" />}
                  title="ยังไม่มีกิจกรรม"
                  message="สมาชิกยังไม่มีประวัติการทำงาน"
                />
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className="flex gap-3 p-3 border rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                          locale: th
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
```

**Priority:** 🔴 P0 (Backend APIs), 🟢 P2 (Activity log)

**Effort:** Backend ~4 hours, Activity log ~6 hours

---

## 🔌 Backend APIs ที่ต้องเพิ่ม

### 🔴 P0 - Critical APIs

#### 1. Bulk Member Operations

```typescript
/**
 * Bulk delete members
 * POST /api/groups/:groupId/members/bulk-delete
 */
interface BulkDeleteMembersRequest {
  memberIds: string[]; // Array of lineUserId
}

interface BulkDeleteMembersResponse {
  success: boolean;
  deletedCount: number;
  errors?: Array<{ memberId: string; error: string }>;
}

// Controller (apiController.ts)
router.post('/groups/:groupId/members/bulk-delete',
  authenticate,
  requireGroupAdmin,
  validateUuid('groupId'),
  async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'memberIds must be a non-empty array'
      });
    }
    
    try {
      const results = await UserService.bulkRemoveMembers(groupId, memberIds);
      res.json({
        success: true,
        deletedCount: results.successCount,
        errors: results.errors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Bulk update member roles
 * POST /api/groups/:groupId/members/bulk-update-role
 */
interface BulkUpdateRoleRequest {
  memberIds: string[];
  role: 'admin' | 'moderator' | 'member';
}

interface BulkUpdateRoleResponse {
  success: boolean;
  updatedCount: number;
  errors?: Array<{ memberId: string; error: string }>;
}

router.post('/groups/:groupId/members/bulk-update-role',
  authenticate,
  requireGroupAdmin,
  validateUuid('groupId'),
  async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { memberIds, role } = req.body;
    
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'memberIds must be a non-empty array'
      });
    }
    
    if (!['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }
    
    try {
      const results = await UserService.bulkUpdateMemberRole(groupId, memberIds, role);
      res.json({
        success: true,
        updatedCount: results.successCount,
        errors: results.errors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

#### 2. Email Verification

```typescript
/**
 * Send email verification
 * POST /api/users/:userId/email/send-verification
 */
interface SendVerificationRequest {
  email: string;
}

interface SendVerificationResponse {
  success: boolean;
  message: string;
}

router.post('/users/:userId/email/send-verification',
  authenticate,
  validateUuid('userId'),
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { email } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }
    
    try {
      const token = await UserService.generateEmailVerificationToken(userId, email);
      await EmailService.sendVerificationEmail(email, token);
      
      res.json({
        success: true,
        message: 'Verification email sent'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Verify email
 * POST /api/users/:userId/email/verify
 */
interface VerifyEmailRequest {
  token: string;
}

interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

router.post('/users/:userId/email/verify',
  validateUuid('userId'),
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    try {
      await UserService.verifyEmail(userId, token);
      
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

#### 3. Authentication - Refresh Token

```typescript
/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
interface RefreshTokenRequest {
  refreshToken: string;
}

interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

router.post('/auth/refresh-token',
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }
    
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await UserService.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }
      
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);
      
      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600 // 1 hour
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }
  }
);
```

### 🟢 P2 - Medium Priority APIs

#### 4. Recurring Task Preview

```typescript
/**
 * Preview recurring task instances
 * GET /api/groups/:groupId/recurring/:id/preview?months=3
 */
interface RecurringPreviewResponse {
  success: boolean;
  preview: Array<{
    date: string; // ISO date
    title: string;
    dueDate: string;
    dueTime: string;
  }>;
}

router.get('/groups/:groupId/recurring/:id/preview',
  authenticate,
  requireGroupMember,
  validateUuid('groupId', 'id'),
  async (req: Request, res: Response) => {
    const { groupId, id } = req.params;
    const months = parseInt(req.query.months as string) || 3;
    
    try {
      const recurringTask = await RecurringTaskService.findById(id);
      
      if (!recurringTask) {
        return res.status(404).json({
          success: false,
          error: 'Recurring task not found'
        });
      }
      
      const preview = RecurringTaskService.previewInstances(recurringTask, months);
      
      res.json({
        success: true,
        preview
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

#### 5. Member Activity Log

```typescript
/**
 * Get member activity log
 * GET /api/groups/:groupId/members/:memberId/activities
 */
interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_submitted' | 'file_uploaded' | 'member_joined';
  description: string;
  metadata: any;
  createdAt: string;
}

interface MemberActivitiesResponse {
  success: boolean;
  activities: Activity[];
  total: number;
}

router.get('/groups/:groupId/members/:memberId/activities',
  authenticate,
  requireGroupMember,
  validateUuid('groupId'),
  async (req: Request, res: Response) => {
    const { groupId, memberId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    try {
      const activities = await UserService.getMemberActivities(
        groupId,
        memberId,
        { page, limit }
      );
      
      res.json({
        success: true,
        activities: activities.items,
        total: activities.total
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

#### 6. Chunked File Upload

```typescript
/**
 * Upload file chunk
 * POST /api/files/upload-chunk
 */
interface UploadChunkRequest {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  file: Buffer; // multipart/form-data
}

interface UploadChunkResponse {
  success: boolean;
  uploadId: string;
  chunkIndex: number;
  message: string;
}

router.post('/files/upload-chunk',
  authenticate,
  upload.single('chunk'),
  async (req: Request, res: Response) => {
    const { uploadId, chunkIndex, totalChunks } = req.body;
    const chunk = req.file;
    
    if (!chunk) {
      return res.status(400).json({
        success: false,
        error: 'No chunk provided'
      });
    }
    
    try {
      await FileService.saveChunk(uploadId, parseInt(chunkIndex), chunk);
      
      res.json({
        success: true,
        uploadId,
        chunkIndex: parseInt(chunkIndex),
        message: `Chunk ${chunkIndex}/${totalChunks} uploaded`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Complete chunked upload
 * POST /api/files/upload-complete
 */
interface CompleteUploadRequest {
  uploadId: string;
  groupId: string;
  taskId?: string;
  fileName: string;
  mimeType: string;
  totalSize: number;
}

interface CompleteUploadResponse {
  success: boolean;
  file: {
    id: string;
    fileName: string;
    fileSize: number;
    fileUrl: string;
  };
}

router.post('/files/upload-complete',
  authenticate,
  async (req: Request, res: Response) => {
    const { uploadId, groupId, taskId, fileName, mimeType, totalSize } = req.body;
    
    try {
      const file = await FileService.completeChunkedUpload(
        uploadId,
        groupId,
        taskId,
        fileName,
        mimeType,
        totalSize,
        req.user.id
      );
      
      res.json({
        success: true,
        file: {
          id: file.id,
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileUrl: file.googleFileUrl || `/api/files/${file.id}/download`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

---

## 📅 แผนการแก้ไข Step-by-Step

### Sprint 4.3 - Feature Completeness (2 weeks)

#### Week 1: Backend APIs + Critical Fixes

**Day 1-2: Backend APIs**
- [ ] Implement bulk member operations APIs
  - POST /api/groups/:groupId/members/bulk-delete
  - POST /api/groups/:groupId/members/bulk-update-role
- [ ] Implement email verification APIs
  - POST /api/users/:userId/email/send-verification
  - POST /api/users/:userId/email/verify
- [ ] Test APIs with Postman/Insomnia

**Day 3-4: Authentication & Testing**
- [ ] Implement refresh token API
  - POST /api/auth/refresh-token
- [ ] Integrate refresh token in frontend
- [ ] Test bulk actions in MembersView
- [ ] Fix any backend issues

**Day 5: Documentation**
- [ ] Update API documentation
- [ ] Update frontend integration guide
- [ ] Deploy to staging

#### Week 2: UI Improvements

**Day 6-7: Custom Recurrence UI**
- [ ] Create CustomRecurrenceUI component
- [ ] Integrate in AddTaskModal
- [ ] Test all recurrence patterns
- [ ] Fix edge cases

**Day 8-9: Task Templates**
- [ ] Implement template save/load
- [ ] Add template management UI
- [ ] Test template functionality
- [ ] Add localStorage persistence

**Day 10: File Preview & Stats Loading**
- [ ] Add stats loading state in DashboardView
- [ ] Add file preview in SubmitTaskModal
- [ ] Test loading states
- [ ] Polish UI transitions

---

### Sprint 4.4 - Advanced Features (2 weeks)

#### Week 1: File Upload & Preview Enhancements

**Day 1-3: Chunked Upload**
- [ ] Implement backend chunked upload APIs
- [ ] Implement frontend chunked upload
- [ ] Add progress tracking per file
- [ ] Test with large files (100MB+)

**Day 4-5: PDF Viewer**
- [ ] Install react-pdf
- [ ] Create PDFViewer component
- [ ] Add zoom/pagination controls
- [ ] Test PDF rendering

#### Week 2: Advanced Preview & Activity Log

**Day 6-7: Image & Video Viewers**
- [ ] Install react-zoom-pan-pinch
- [ ] Create ImageViewer with zoom
- [ ] Install react-player
- [ ] Create VideoPlayer with speed control

**Day 8-10: Activity Log**
- [ ] Implement backend activity log API
- [ ] Create MemberDetailModal with tabs
- [ ] Load and display activities
- [ ] Test activity tracking

---

### Sprint 4.5 - Polish & Testing (2 weeks)

#### Week 1: Testing

**Day 1-2: E2E Tests**
- [ ] Set up Playwright/Cypress
- [ ] Write E2E tests for critical flows
  - Task creation
  - File upload
  - Member management
  - Bulk actions

**Day 3-4: Component Tests**
- [ ] Set up Jest + React Testing Library
- [ ] Write tests for key components
  - AddTaskModal
  - FileUploadZone
  - MembersView
- [ ] Achieve 60%+ coverage

**Day 5: API Tests**
- [ ] Set up Supertest
- [ ] Write API integration tests
- [ ] Test error scenarios

#### Week 2: Accessibility & Documentation

**Day 6-7: Accessibility**
- [ ] Add ARIA labels to all interactive elements
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Fix color contrast issues

**Day 8-10: Documentation**
- [ ] Write user guide (Thai)
- [ ] Write admin guide
- [ ] Create API documentation (Swagger)
- [ ] Create deployment guide
- [ ] Update README

---

### Sprint 4.6 - Production Readiness (1 week)

**Day 1-2: Performance**
- [ ] Run Lighthouse audit
- [ ] Optimize bundle size
- [ ] Optimize images (WebP, lazy loading)
- [ ] Set up CDN

**Day 3: Monitoring**
- [ ] Set up Sentry (error tracking)
- [ ] Set up performance monitoring
- [ ] Set up uptime monitoring
- [ ] Configure alerts

**Day 4-5: Deployment**
- [ ] Set up CI/CD pipeline
- [ ] Deploy to staging
- [ ] Final testing
- [ ] Deploy to production

---

## ✅ Checklist ก่อน Production

### 🔴 Must Have
- [ ] All backend APIs implemented and tested
- [ ] E2E tests for critical flows (80%+ coverage)
- [ ] Security audit passed (no critical vulnerabilities)
- [ ] Performance Lighthouse score > 85
- [ ] Mobile testing on real devices
- [ ] Error tracking (Sentry) configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### 🟡 Should Have
- [ ] User guide (Thai language)
- [ ] Admin guide
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Component tests (60%+ coverage)
- [ ] Accessibility audit (WCAG 2.1 Level AA)
- [ ] Load testing (1000+ concurrent users)
- [ ] Performance monitoring
- [ ] Analytics (Google Analytics)

### 🟢 Nice to Have
- [ ] Storybook (component documentation)
- [ ] Dark mode toggle
- [ ] PWA support (Service Worker)
- [ ] Real-time updates (WebSocket)
- [ ] Advanced search (full-text)
- [ ] Markdown editor
- [ ] Activity logs
- [ ] 2FA

---

## 📊 Summary

**ปัญหาทั้งหมด:** 20 จุด

**แบ่งตาม Priority:**
- 🔴 P0 - Critical: 5 จุด (Backend APIs, Testing, Mobile)
- 🟡 P1 - High: 5 จุด (Loading states, Preview, Custom recurrence)
- 🟢 P2 - Medium: 5 จุด (Chunked upload, Activity log, Score breakdown)
- 🔵 P3 - Low: 5 จุด (Dark mode, Storybook, i18n, Markdown, 2FA)

**แบ่งตาม Component:**
- DashboardView: 3 จุด
- FileUploadZone: 3 จุด
- FilePreviewModal: 4 จุด
- AddTaskModal: 3 จุด
- SubmitTaskModal: 3 จุด
- MembersView: 2 จุด
- Backend APIs: 6+ endpoints

**ระยะเวลาโดยประมาณ:**
- Sprint 4.3 (Feature Completeness): 2 weeks
- Sprint 4.4 (Advanced Features): 2 weeks
- Sprint 4.5 (Polish & Testing): 2 weeks
- Sprint 4.6 (Production): 1 week
- **Total: 7 weeks** (ประมาณ 2 เดือน)

**Effort Estimation:**
- Backend development: ~40 hours
- Frontend development: ~80 hours
- Testing: ~40 hours
- Documentation: ~20 hours
- Deployment & monitoring: ~10 hours
- **Total: ~190 hours** (ประมาณ 24 วันทำงาน)

---

**เอกสารนี้สร้างโดย:** Claude (Anthropic AI)  
**วันที่:** 19 ตุลาคม 2568  
**เวอร์ชัน:** 1.0  
**Next Review:** หลังจบ Sprint 4.3

---

## 📞 สรุป

เอกสารนี้รวบรวม **รายละเอียดการปรับปรุงและแก้ไขทุกจุด** ของ Dashboard ใหม่ แบ่งตาม Priority และ Component พร้อม Code examples ที่ชัดเจน และแผนการดำเนินงานแบบ Step-by-Step

**คำแนะนำ:**
1. เริ่มจาก 🔴 P0 ก่อนเสมอ (Backend APIs, Testing)
2. ทำทีละ Sprint ไม่ต้องรีบ
3. Test ทุกฟีเจอร์ก่อน deploy
4. รับ feedback จาก users อย่างสม่ำเสมอ
5. Document ทุกการเปลี่ยนแปลง

**ความพร้อม Production:**
- ปัจจุบัน: ~75%
- หลัง Sprint 4.3: ~85%
- หลัง Sprint 4.4: ~92%
- หลัง Sprint 4.5-4.6: ~98% (Production Ready!)
