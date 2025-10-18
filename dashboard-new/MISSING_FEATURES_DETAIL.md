# 🔧 รายละเอียดฟีเจอร์ที่ยังขาดและวิธีแก้ไข

## 📋 สารบัญ
- [ฟีเจอร์ที่ใช้ Sample Data](#ฟีเจอร์ที่ใช้-sample-data)
- [Modals ที่ยังไม่ทำงาน](#modals-ที่ยังไม่ทำงาน)
- [API Endpoints ที่ยังขาด](#api-endpoints-ที่ยังขาด)
- [UI Components ที่ยังไม่สมบูรณ์](#ui-components-ที่ยังไม่สมบูรณ์)
- [วิธีแก้ไขแต่ละปัญหา](#วิธีแก้ไขแต่ละปัญหา)

---

## 🎭 ฟีเจอร์ที่ใช้ Sample Data

### 1. **RecurringTasksView** 
**ไฟล์**: `src/components/recurring/RecurringTasksView.jsx`

**ปัญหา**:
```javascript
// Lines 38-77: ใช้ sample data เมื่อ API error
catch (error) {
  console.error('Failed to load recurring tasks:', error);
  // Sample data for development
  setRecurringTasks([
    {
      id: '1',
      title: 'รายงานประจำสัปดาห์',
      recurrence: 'weekly',
      isActive: true,
      nextRun: '2025-10-19T09:00:00',
      createdCount: 12,
      assignedUsers: [...],
    },
    // ...more sample data
  ]);
}
```

**วิธีแก้**:
- ❌ **ลบ sample data ออก**
- ✅ แสดง error state ที่เหมาะสม
- ✅ ให้ user รู้ว่าไม่สามารถโหลดข้อมูลได้
- ✅ เพิ่มปุ่ม retry

```javascript
catch (error) {
  console.error('Failed to load recurring tasks:', error);
  setError(error.message);
  setRecurringTasks([]); // ไม่ใช้ sample data
}
```

---

### 2. **FilesView**
**ไฟล์**: `src/components/files/FilesView.jsx`

**ปัญหา**:
```javascript
// Lines 28-51: ใช้ sample data เมื่อ API error
catch (error) {
  console.error('Failed to load files:', error);
  setFiles([
    {
      id: '1',
      name: 'รายงานประจำเดือน.pdf',
      type: 'document',
      size: 1024000,
      taskId: 'T001',
      // ...
    },
    // ...more sample data
  ]);
}
```

**วิธีแก้**:
```javascript
catch (error) {
  console.error('Failed to load files:', error);
  toast.error('ไม่สามารถโหลดไฟล์ได้: ' + error.message);
  setFiles([]); // Empty array แทน sample data
}
```

---

### 3. **ReportsView** ⚠️ **ปัญหาร้ายแรงที่สุด**
**ไฟล์**: `src/components/reports/ReportsView.jsx`

**ปัญหา**:
```javascript
// Lines 30-52: ใช้ sample data ทั้งหมด
catch (error) {
  console.error('Failed to load reports:', error);
  // Sample data - ใช้เสมอเมื่อ API ไม่ตอบ
  setReportData({
    summary: {
      totalTasks: 156,
      completedTasks: 98,
      inProgressTasks: 42,
      overdueTasks: 16,
      completionRate: 62.8,
      avgCompletionTime: 2.5,
    },
    trends: { ... },
    byCategory: [ ... ],
    byMember: [ ... ],
  });
}
```

**วิธีแก้**:
1. **ต้องสร้าง API endpoint จริง** (`/api/groups/:groupId/reports`)
2. **Backend ต้องคำนวณข้อมูลจริง**
3. **ลบ sample data ออกหมด**

```javascript
catch (error) {
  console.error('Failed to load reports:', error);
  setError('ไม่สามารถโหลดรายงานได้');
  setReportData(null);
}

// แสดง error state ใน UI
if (error) {
  return (
    <div className="error-state">
      <AlertCircle size={48} />
      <h2>ไม่สามารถโหลดรายงานได้</h2>
      <p>{error}</p>
      <Button onClick={loadReportData}>ลองอีกครั้ง</Button>
    </div>
  );
}
```

---

### 4. **DashboardView** (Leaderboard section)
**ไฟล์**: `src/components/DashboardView.jsx`

**ปัญหา**:
- ใช้ `loadMiniLeaderboard()` แต่ fallback เป็น empty array
- ไม่มี error handling ที่ดี

**วิธีแก้**:
- เพิ่ม loading state
- เพิ่ม error state
- แสดงข้อความที่เหมาะสม

---

## 🚪 Modals ที่ยังไม่ทำงาน

### 1. **RecurringTaskModal**
**ไฟล์**: `src/components/recurring/RecurringTaskModal.jsx`

**ปัญหา**:
- Modal เปิดได้
- Form มี UI ครบ
- แต่ **save ไม่ได้** หรือ **ไม่เชื่อม API จริง**

**ต้องตรวจสอบ**:
```javascript
// ในฟังก์ชัน handleSubmit
const handleSubmit = async (formData) => {
  try {
    if (isEditMode) {
      await updateRecurringTask(groupId, taskId, formData);
    } else {
      await createRecurringTask(groupId, formData);
    }
    onTaskCreated(); // หรือ onTaskUpdated()
    closeModal();
  } catch (error) {
    // ⚠️ ต้องมี error handling
    console.error('Failed to save:', error);
    toast.error('บันทึกไม่สำเร็จ: ' + error.message);
  }
};
```

**วิธีแก้**:
1. ตรวจสอบว่า API functions มีอยู่จริง
2. ตรวจสอบว่า backend endpoint ทำงาน
3. เพิ่ม loading state ขณะ save
4. เพิ่ม error handling

---

### 2. **RecurringHistoryModal**
**ไฟล์**: `src/components/recurring/RecurringHistoryModal.jsx`

**ปัญหา**:
- แสดงประวัติการสร้างงานจาก recurring task
- **อาจไม่เชื่อม API จริง**

**ต้องมี API**:
```javascript
// src/services/api.js
export const getRecurringTaskHistory = async (groupId, recurringId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring/${recurringId}/history`);
};
```

**Backend ต้องมี endpoint**:
```
GET /api/groups/:groupId/recurring/:recurringId/history
```

**Response ที่ต้องการ**:
```json
{
  "success": true,
  "data": [
    {
      "id": "task-123",
      "title": "รายงานประจำสัปดาห์ (สร้างอัตโนมัติ)",
      "createdAt": "2025-01-15T09:00:00Z",
      "status": "completed",
      "completedAt": "2025-01-16T14:30:00Z",
      "assignedUsers": [...]
    }
  ]
}
```

---

### 3. **InviteMemberModal**
**ไฟล์**: `src/components/members/InviteMemberModal.jsx`

**ปัญหา**:
- UI มี form สำหรับ invite
- แต่ **ไม่เชื่อม API จริง**

**API ที่ต้องการ** (อาจมีใน api.js แล้ว):
```javascript
// src/services/api.js

// Method 1: สร้าง invite link
export const createInviteLink = async (groupId, options = {}) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/invites`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
};

// Method 2: ส่งอีเมลเชิญ
export const sendInviteEmail = async (groupId, email, message) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/invites/email`, {
    method: 'POST',
    body: JSON.stringify({ email, message }),
  });
};

// Method 3: เพิ่มสมาชิกโดยตรง (ถ้ารู้ LINE User ID)
export const addMemberDirectly = async (groupId, lineUserId, role = 'member') => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ lineUserId, role }),
  });
};
```

**วิธีแก้**:
1. ใช้ API functions ที่มีอยู่แล้ว
2. เพิ่ม error handling
3. แสดง success message
4. ปิด modal หลัง invite สำเร็จ

---

### 4. **MemberActionsModal**
**ไฟล์**: `src/components/members/MemberActionsModal.jsx`

**ปัญหา**:
- แสดง actions สำหรับจัดการสมาชิก (เปลี่ยน role, ลบ, ระงับ)
- แต่ **actions ไม่ทำงาน**

**API ที่ต้องการ**:
```javascript
// src/services/api.js

// เปลี่ยน role
export const updateMemberRole = async (groupId, memberId, role) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

// ลบสมาชิก
export const removeMember = async (groupId, memberId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
  });
};

// ระงับสมาชิก
export const banMember = async (groupId, memberId, reason) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

// ปลดระงับสมาชิก
export const unbanMember = async (groupId, memberId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/unban`, {
    method: 'POST',
  });
};
```

**ตรวจสอบว่า**:
- ✅ API functions มีอยู่ใน `api.js` (บางส่วนมีแล้ว)
- ❌ Backend endpoints อาจยังไม่มี
- ❌ Modal ไม่ได้เรียกใช้ API

---

### 5. **AddTaskModal & EditTaskModal**
**ไฟล์**: 
- `src/components/modals/AddTaskModal.jsx`
- `src/components/modals/EditTaskModal.jsx`

**ปัญหาที่อาจเกิด**:
1. **บางฟิลด์ไม่ save** (เช่น attachments, tags)
2. **File upload ไม่ทำงาน**
3. **Assignee selection มีปัญหา**
4. **Date picker บันทึกผิดเวลา**

**ต้องตรวจสอบ**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ตรวจสอบว่า formData ครบถ้วน
  console.log('Form Data:', formData);
  
  try {
    setLoading(true);
    
    // สร้างหรืออัปเดต task
    if (isEditMode) {
      await updateTask(groupId, taskId, formData);
      toast.success('อัปเดตงานสำเร็จ');
    } else {
      await createTask(groupId, formData);
      toast.success('สร้างงานสำเร็จ');
    }
    
    // Refresh data
    onTaskCreated(); // หรือ onTaskUpdated()
    
    // ปิด modal
    closeModal();
    
  } catch (error) {
    console.error('Failed to save task:', error);
    toast.error('บันทึกไม่สำเร็จ: ' + error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 📡 API Endpoints ที่ยังขาด

### Backend Endpoints ที่อาจยังไม่มี:

#### 1. Reports API
```
GET  /api/groups/:groupId/reports
     ?dateRange=month&startDate=xxx&endDate=xxx
     &members[]=xxx&categories[]=xxx
```

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTasks": 156,
      "completedTasks": 98,
      "inProgressTasks": 42,
      "overdueTasks": 16,
      "completionRate": 62.8,
      "avgCompletionTime": 2.5
    },
    "trends": {
      "tasksCreated": [12, 15, 18, 14, 20, 16, 19],
      "tasksCompleted": [8, 12, 14, 10, 16, 13, 15],
      "labels": ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"]
    },
    "byCategory": [...],
    "byMember": [...]
  }
}
```

#### 2. Recurring Task History
```
GET /api/groups/:groupId/recurring/:recurringId/history
```

#### 3. Member Ban/Unban
```
POST /api/groups/:groupId/members/:memberId/ban
POST /api/groups/:groupId/members/:memberId/unban
```

#### 4. Bulk Task Operations
```
POST /api/groups/:groupId/tasks/bulk-update
POST /api/groups/:groupId/tasks/bulk-delete
```

#### 5. Export APIs
```
GET /api/groups/:groupId/tasks/export?format=csv
GET /api/groups/:groupId/members/export?format=excel
GET /api/groups/:groupId/reports/export?format=pdf
```

---

## 🧩 UI Components ที่ยังไม่สมบูรณ์

### 1. **ReportChart Component**
**ไฟล์**: `src/components/reports/ReportChart.jsx`

**ปัญหา**: อาจยังไม่ implement หรือว่างเปล่า

**ต้องทำ**:
```jsx
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportChart({ type, data, options = {} }) {
  const ChartComponent = {
    line: Line,
    bar: Bar,
    pie: Pie,
  }[type] || Line;

  return (
    <div className="chart-container">
      <ChartComponent data={data} options={options} />
    </div>
  );
}
```

**ติดตั้ง library**:
```bash
npm install chart.js react-chartjs-2
```

---

### 2. **ReportFilters Component**
**ไฟล์**: `src/components/reports/ReportFilters.jsx`

**ปัญหา**: มี UI แต่ไม่ filter ข้อมูลจริง

**ต้องแก้**:
```jsx
export default function ReportFilters({ filters, onFilterChange }) {
  const handleFilterChange = (key, value) => {
    // ต้องเรียก onFilterChange จริงๆ
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="filters">
      <Select 
        value={filters.dateRange} 
        onChange={(value) => handleFilterChange('dateRange', value)}
      >
        {/* ... */}
      </Select>
      
      {/* Date range picker */}
      {filters.dateRange === 'custom' && (
        <DateRangePicker
          startDate={filters.startDate}
          endDate={filters.endDate}
          onChange={(start, end) => {
            onFilterChange({
              ...filters,
              startDate: start,
              endDate: end,
            });
          }}
        />
      )}
    </div>
  );
}
```

---

### 3. **ReportExport Component**
**ไฟล์**: `src/components/reports/ReportExport.jsx`

**ปัญหา**: ยังไม่ implement

**ต้องสร้าง**:
```jsx
import { Download, FileText, FileSpreadsheet, FilePdf } from 'lucide-react';

export default function ReportExport({ reportData, filters, onClose }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const { exportReport } = await import('../../services/exportService');
      await exportReport(reportData, filters, format);
      toast.success('ส่งออกรายงานสำเร็จ');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('ส่งออกไม่สำเร็จ: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ส่งออกรายงาน</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4">
          <Button onClick={() => handleExport('pdf')} disabled={exporting}>
            <FilePdf className="mr-2" />
            PDF Document
          </Button>
          
          <Button onClick={() => handleExport('excel')} disabled={exporting}>
            <FileSpreadsheet className="mr-2" />
            Excel Spreadsheet
          </Button>
          
          <Button onClick={() => handleExport('csv')} disabled={exporting}>
            <FileText className="mr-2" />
            CSV File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 วิธีแก้ไขแต่ละปัญหา

### ขั้นตอนที่ 1: ลบ Sample Data ออกทั้งหมด

**ค้นหาไฟล์ที่ใช้ sample data**:
```bash
grep -r "Sample data" src/
grep -r "sample data" src/
grep -r "// Sample" src/
```

**แก้ไขทุกจุด**:
```javascript
// ❌ เดิม
catch (error) {
  console.error('Failed:', error);
  setData(SAMPLE_DATA);
}

// ✅ ใหม่
catch (error) {
  console.error('Failed:', error);
  setError(error.message);
  setData([]);
}
```

---

### ขั้นตอนที่ 2: เพิ่ม Toast Notifications

**ติดตั้ง library**:
```bash
npm install react-hot-toast
# หรือ
npm install sonner
```

**Setup**:
```jsx
// src/main.jsx
import { Toaster } from 'react-hot-toast';

<App />
<Toaster 
  position="top-right"
  toastOptions={{
    duration: 3000,
    success: { duration: 2000 },
    error: { duration: 4000 },
  }}
/>
```

**ใช้งาน**:
```javascript
import toast from 'react-hot-toast';

// Success
toast.success('สร้างงานสำเร็จ');

// Error
toast.error('เกิดข้อผิดพลาด: ' + error.message);

// Loading
const toastId = toast.loading('กำลังบันทึก...');
// เมื่อเสร็จ
toast.success('บันทึกสำเร็จ', { id: toastId });
```

---

### ขั้นตอนที่ 3: แก้ไข Error Handling

**สร้าง Error Boundary**:
```jsx
// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>เกิดข้อผิดพลาด</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            โหลดหน้าใหม่
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**ใช้งาน**:
```jsx
// src/App.jsx
<ErrorBoundary>
  <AppContent />
</ErrorBoundary>
```

---

### ขั้นตอนที่ 4: เพิ่ม Loading States

**สร้าง Loading Skeleton**:
```jsx
// src/components/common/LoadingSkeleton.jsx
export function TaskCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-200 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

**ใช้งาน**:
```jsx
if (loading) {
  return <TaskCardSkeleton />;
}
```

---

### ขั้นตอนที่ 5: เพิ่ม Empty States

**สร้าง Empty State Component**:
```jsx
// src/components/common/EmptyState.jsx
export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="action">{action}</div>}
    </div>
  );
}
```

**ใช้งาน**:
```jsx
if (tasks.length === 0) {
  return (
    <EmptyState
      icon={<Inbox size={48} />}
      title="ยังไม่มีงาน"
      description="สร้างงานแรกของคุณเพื่อเริ่มต้น"
      action={
        <Button onClick={() => openAddTask()}>
          <Plus className="mr-2" />
          สร้างงานใหม่
        </Button>
      }
    />
  );
}
```

---

### ขั้นตอนที่ 6: ตรวจสอบ API Integration

**สร้าง API Test Page**:
```jsx
// src/pages/ApiTestPage.jsx
export default function ApiTestPage() {
  const [results, setResults] = useState({});

  const testEndpoints = async () => {
    const tests = {
      tasks: () => fetchTasks(groupId),
      members: () => getGroupMembers(groupId),
      files: () => getGroupFiles(groupId),
      recurring: () => listRecurringTasks(groupId),
      reports: () => getReports(groupId),
      leaderboard: () => getLeaderboard(groupId),
    };

    const results = {};
    for (const [name, fn] of Object.entries(tests)) {
      try {
        await fn();
        results[name] = '✅ OK';
      } catch (error) {
        results[name] = '❌ ' + error.message;
      }
    }
    
    setResults(results);
  };

  return (
    <div>
      <h1>API Integration Test</h1>
      <button onClick={testEndpoints}>Test All</button>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
}
```

---

## 📝 Checklist การแก้ไข

### Priority 1: Critical (ทำก่อน)
- [ ] ลบ sample data ออกทั้งหมด
- [ ] แก้ไข RecurringTasksView ไม่ให้ใช้ sample data
- [ ] แก้ไข FilesView ไม่ให้ใช้ sample data
- [ ] แก้ไข ReportsView ไม่ให้ใช้ sample data (ต้องสร้าง API)
- [ ] เพิ่ม toast notifications
- [ ] แก้ไข error handling ทุก API call
- [ ] เพิ่ม loading states ทุกหน้า

### Priority 2: Important (ควรทำ)
- [ ] Implement ReportChart component
- [ ] แก้ไข RecurringTaskModal ให้ save ได้จริง
- [ ] แก้ไข RecurringHistoryModal ให้เชื่อม API
- [ ] แก้ไข InviteMemberModal ให้ทำงาน
- [ ] แก้ไข MemberActionsModal ให้ทำงาน
- [ ] ตรวจสอบ AddTaskModal/EditTaskModal
- [ ] เพิ่ม empty states ทุกหน้า

### Priority 3: Nice to Have
- [ ] เพิ่ม Error Boundary
- [ ] เพิ่ม Loading Skeletons
- [ ] สร้าง API Test Page
- [ ] เพิ่ม Pagination
- [ ] เพิ่ม Retry mechanisms
- [ ] เพิ่ม Offline support

---

## 🎯 สรุป

### ปัญหาหลัก 3 อันดับแรก:

1. **ใช้ Sample Data แทน API จริง**
   - RecurringTasksView
   - FilesView
   - ReportsView ⚠️ ร้ายแรงที่สุด

2. **Modals ไม่ทำงาน**
   - RecurringTaskModal
   - RecurringHistoryModal
   - InviteMemberModal
   - MemberActionsModal

3. **Components ยังไม่สมบูรณ์**
   - ReportChart (ว่างเปล่า)
   - ReportFilters (ไม่ filter จริง)
   - ReportExport (ยังไม่มี)

### การแก้ไขที่จำเป็น:

1. **ลบ sample data** ออกทั้งหมด
2. **แสดง error states** ที่เหมาะสม
3. **เชื่อมต่อ API จริง** ทุกจุด
4. **เพิ่ม toast notifications**
5. **ปรับปรุง error handling**

### Effort Estimation:
- Priority 1: **20-30 ชั่วโมง**
- Priority 2: **30-40 ชั่วโมง**
- Priority 
