# 🔧 คู่มือแก้ไขปัญหา Dashboard ใหม่

## 🎯 เป้าหมาย
แก้ไขให้ Dashboard ใหม่ **พร้อมใช้งานจริง** โดยลบ sample data ออกหมด และเชื่อมต่อ API จริงทั้งหมด

---

## 📊 สถานะปัจจุบัน

### ❌ ปัญหาหลัก
1. **หลายฟีเจอร์ใช้ sample data** แทน API จริง
2. **Modals บางตัวไม่ save ข้อมูล**
3. **Reports View ใช้ sample data ทั้งหมด**
4. **ไม่มี Toast Notifications**
5. **Error handling ไม่ดีพอ**

### ⏱️ เวลาที่ต้องใช้
- **Priority 1 (Critical)**: 20-30 ชั่วโมง
- **Priority 2 (Important)**: 30-40 ชั่วโมง
- **รวมทั้งหมด**: 50-70 ชั่วโมง (1-2 สัปดาห์)

---

## 🚀 แผนการแก้ไข (Step-by-Step)

### ✅ STEP 1: Setup Toast Notifications (30 นาที)

#### 1.1 ติดตั้ง Library
```bash
cd dashboard-new
npm install react-hot-toast
```

#### 1.2 Setup ใน main.jsx
```jsx
// src/main.jsx
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 3000,
        success: {
          duration: 2000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
        },
        error: {
          duration: 4000,
          style: {
            background: '#ef4444',
            color: '#fff',
          },
        },
      }}
    />
  </React.StrictMode>
);
```

#### 1.3 สร้าง Toast Helper
```jsx
// src/utils/toast.js
import toast from 'react-hot-toast';

export const showSuccess = (message) => {
  toast.success(message);
};

export const showError = (message, error) => {
  const errorMsg = error?.message || error || 'เกิดข้อผิดพลาด';
  toast.error(`${message}: ${errorMsg}`);
};

export const showLoading = (message) => {
  return toast.loading(message);
};

export const updateToast = (toastId, message, type = 'success') => {
  toast[type](message, { id: toastId });
};
```

---

### ✅ STEP 2: ลบ Sample Data จาก RecurringTasksView (1 ชั่วโมง)

#### 2.1 เปิดไฟล์
```
src/components/recurring/RecurringTasksView.jsx
```

#### 2.2 ค้นหา Lines 38-77
```javascript
// ❌ ลบส่วนนี้ออก
catch (error) {
  console.error('Failed to load recurring tasks:', error);
  // Sample data for development
  setRecurringTasks([
    {
      id: '1',
      title: 'รายงานประจำสัปดาห์',
      // ... ลบทั้งหมด
    },
  ]);
}
```

#### 2.3 แทนที่ด้วย
```javascript
catch (error) {
  console.error('Failed to load recurring tasks:', error);
  showError('ไม่สามารถโหลดงานประจำได้', error);
  setRecurringTasks([]); // Empty array แทน sample data
  setError(error.message);
}
```

#### 2.4 เพิ่ม Error State UI
```jsx
// เพิ่มใน component
if (error) {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">ไม่สามารถโหลดข้อมูลได้</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadRecurringTasks}>
          <RefreshCw className="w-4 h-4 mr-2" />
          ลองอีกครั้ง
        </Button>
      </div>
    </div>
  );
}
```

---

### ✅ STEP 3: ลบ Sample Data จาก FilesView (1 ชั่วโมง)

#### 3.1 เปิดไฟล์
```
src/components/files/FilesView.jsx
```

#### 3.2 ค้นหา Lines 28-51
```javascript
// ❌ ลบส่วนนี้ออก
catch (error) {
  console.error('Failed to load files:', error);
  // Sample data for development
  setFiles([...]);
}
```

#### 3.3 แทนที่ด้วย
```javascript
catch (error) {
  console.error('Failed to load files:', error);
  showError('ไม่สามารถโหลดไฟล์ได้', error);
  setFiles([]);
  setError(error.message);
}
```

#### 3.4 แก้ไข Empty State
```jsx
if (files.length === 0 && !loading) {
  return (
    <EmptyState
      icon={<FolderOpen size={48} />}
      title={error ? 'เกิดข้อผิดพลาด' : 'ยังไม่มีไฟล์'}
      description={error || 'อัปโหลดไฟล์แรกของคุณเพื่อเริ่มต้น'}
      action={
        error ? (
          <Button onClick={loadFiles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            ลองอีกครั้ง
          </Button>
        ) : (
          <Button onClick={() => setShowUploadZone(true)}>
            <Upload className="w-4 h-4 mr-2" />
            อัปโหลดไฟล์
          </Button>
        )
      }
    />
  );
}
```

---

### ✅ STEP 4: แก้ไข ReportsView (3-4 ชั่วโมง) ⚠️ **ที่สำคัญที่สุด**

#### 4.1 ตรวจสอบว่า Backend มี API หรือไม่

**ทดสอบ**:
```bash
curl http://localhost:3000/api/groups/YOUR_GROUP_ID/reports
```

**ถ้าไม่มี** → ต้องสร้าง Backend API ก่อน (ดู STEP 4.2)
**ถ้ามีแล้ว** → ข้ามไป STEP 4.3

#### 4.2 สร้าง Backend API (ถ้ายังไม่มี)

**เปิดไฟล์**: `src/routes/groups.ts` (หรือที่เกี่ยวข้อง)

```typescript
// GET /api/groups/:groupId/reports
router.get('/:groupId/reports', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { dateRange, startDate, endDate, members, categories } = req.query;

    // คำนวณข้อมูลจริงจาก database
    const tasks = await Task.find({ groupId });
    
    // Summary
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => {
      return t.dueDate < new Date() && t.status !== 'completed';
    }).length;
    const completionRate = totalTasks > 0 
      ? (completedTasks / totalTasks * 100).toFixed(1)
      : 0;

    // Trends (7 วันล่าสุด)
    const last7Days = getLast7Days();
    const tasksCreated = last7Days.map(date => 
      tasks.filter(t => isSameDay(t.createdAt, date)).length
    );
    const tasksCompleted = last7Days.map(date =>
      tasks.filter(t => t.status === 'completed' && isSameDay(t.completedAt, date)).length
    );

    // By Category
    const categories = await getCategoriesWithCounts(groupId);

    // By Member
    const memberStats = await getMemberStatistics(groupId);

    res.json({
      success: true,
      data: {
        summary: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          completionRate: parseFloat(completionRate),
          avgCompletionTime: calculateAvgCompletionTime(tasks),
        },
        trends: {
          tasksCreated,
          tasksCompleted,
          labels: last7Days.map(d => format(d, 'E', { locale: th })),
        },
        byCategory: categories,
        byMember: memberStats,
      },
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

#### 4.3 แก้ไข Frontend ReportsView

**เปิดไฟล์**: `src/components/reports/ReportsView.jsx`

**ค้นหา Lines 30-52** และแทนที่:
```javascript
catch (error) {
  console.error('Failed to load reports:', error);
  showError('ไม่สามารถโหลดรายงานได้', error);
  setError(error.message);
  setReportData(null); // ไม่ใช้ sample data
}
```

**เพิ่ม Error UI**:
```jsx
if (error) {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">ไม่สามารถโหลดรายงานได้</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadReportData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          ลองอีกครั้ง
        </Button>
      </div>
    </div>
  );
}

if (!reportData) {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">ไม่มีข้อมูลรายงาน</h3>
        <p className="text-gray-600">กรุณาสร้างงานก่อนเพื่อดูรายงาน</p>
      </div>
    </div>
  );
}
```

#### 4.4 Implement ReportChart Component

**สร้างไฟล์**: `src/components/reports/ReportChart.jsx`

```jsx
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  Title,
  Tooltip,
  Legend
);

export default function ReportChart({ type, data, options = {} }) {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    ...options,
  };

  if (type === 'line') {
    return (
      <div style={{ height: '300px' }}>
        <Line data={data} options={defaultOptions} />
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div style={{ height: '300px' }}>
        <Bar data={data} options={defaultOptions} />
      </div>
    );
  }

  return null;
}
```

**ติดตั้ง Dependencies**:
```bash
npm install chart.js react-chartjs-2
```

---

### ✅ STEP 5: แก้ไข RecurringTaskModal (2 ชั่วโมง)

#### 5.1 ตรวจสอบ API Functions

**เปิดไฟล์**: `src/services/api.js`

**ตรวจสอบว่ามี**:
- `createRecurringTask(groupId, data)`
- `updateRecurringTask(groupId, id, data)`

**ถ้าไม่มี** → เพิ่ม:
```javascript
export const createRecurringTask = async (groupId, data) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateRecurringTask = async (groupId, id, data) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/recurring/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
```

#### 5.2 แก้ไข RecurringTaskModal

**เปิดไฟล์**: `src/components/recurring/RecurringTaskModal.jsx`

**ตรวจสอบ handleSubmit**:
```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validation
  if (!formData.title?.trim()) {
    showError('กรุณากรอกชื่องาน');
    return;
  }

  setLoading(true);
  
  try {
    if (isEditMode) {
      await updateRecurringTask(groupId, taskId, formData);
      showSuccess('อัปเดตงานประจำสำเร็จ');
      onTaskUpdated?.();
    } else {
      await createRecurringTask(groupId, formData);
      showSuccess('สร้างงานประจำสำเร็จ');
      onTaskCreated?.();
    }
    
    closeModal();
  } catch (error) {
    console.error('Failed to save recurring task:', error);
    showError('บันทึกไม่สำเร็จ', error);
  } finally {
    setLoading(false);
  }
};
```

#### 5.3 เพิ่ม Loading State ในปุ่ม
```jsx
<Button type="submit" disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      กำลังบันทึก...
    </>
  ) : (
    <>
      <Save className="w-4 h-4 mr-2" />
      {isEditMode ? 'อัปเดต' : 'สร้าง'}งาน
    </>
  )}
</Button>
```

---

### ✅ STEP 6: แก้ไข InviteMemberModal (1.5 ชั่วโมง)

#### 6.1 ตรวจสอบ API

**ใน**: `src/services/api.js`

```javascript
// ตรวจสอบว่ามีอยู่แล้ว
export const createInviteLink = async (groupId, options = {}) => { ... }
export const sendInviteEmail = async (groupId, email, message) => { ... }
```

#### 6.2 แก้ไข InviteMemberModal

**เปิดไฟล์**: `src/components/members/InviteMemberModal.jsx`

```jsx
import { useState } from 'react';
import { createInviteLink, sendInviteEmail } from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';

export default function InviteMemberModal({ groupId, onInvited, onClose }) {
  const [method, setMethod] = useState('link'); // 'link' | 'email'
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const response = await createInviteLink(groupId);
      setInviteLink(response.inviteUrl || response.link || response.url);
      showSuccess('สร้างลิงก์เชิญสำเร็จ');
    } catch (error) {
      showError('สร้างลิงก์ไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      showError('กรุณากรอกอีเมล');
      return;
    }

    setLoading(true);
    try {
      await sendInviteEmail(groupId, email, message);
      showSuccess('ส่งอีเมลเชิญสำเร็จ');
      onInvited?.();
      onClose();
    } catch (error) {
      showError('ส่งอีเมลไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    showSuccess('คัดลอกลิงก์แล้ว');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เชิญสมาชิกเข้ากลุ่ม</DialogTitle>
        </DialogHeader>

        <Tabs value={method} onValueChange={setMethod}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">ลิงก์เชิญ</TabsTrigger>
            <TabsTrigger value="email">ส่งอีเมล</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <p className="text-sm text-gray-600">
              สร้างลิงก์เชิญเพื่อแชร์กับผู้อื่น
            </p>
            
            <Button onClick={handleGenerateLink} disabled={loading}>
              {loading ? 'กำลังสร้าง...' : 'สร้างลิงก์เชิญ'}
            </Button>

            {inviteLink && (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly />
                <Button onClick={copyToClipboard}>คัดลอก</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <Label>อีเมล</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div>
                <Label>ข้อความ (ถ้ามี)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="เชิญคุณเข้าร่วมกลุ่ม..."
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'กำลังส่ง...' : 'ส่งอีเมลเชิญ'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

---

### ✅ STEP 7: แก้ไข MemberActionsModal (1.5 ชั่วโมง)

#### 7.1 ตรวจสอบ Backend APIs

**ต้องมี Endpoints**:
- `PUT /api/groups/:groupId/members/:memberId/role`
- `DELETE /api/groups/:groupId/members/:memberId`
- `POST /api/groups/:groupId/members/:memberId/ban`
- `POST /api/groups/:groupId/members/:memberId/unban`

#### 7.2 เพิ่ม API ใน Frontend (ถ้ายังไม่มี)

**ใน**: `src/services/api.js`

```javascript
export const banMember = async (groupId, memberId, reason = '') => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const unbanMember = async (groupId, memberId) => {
  return apiCall(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/unban`, {
    method: 'POST',
  });
};
```

#### 7.3 แก้ไข MemberActionsModal

**เปิดไฟล์**: `src/components/members/MemberActionsModal.jsx`

```jsx
import { updateMemberRole, removeMember, banMember, unbanMember } from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';

export default function MemberActionsModal({ member, groupId, onUpdated, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleChangeRole = async (newRole) => {
    setLoading(true);
    try {
      await updateMemberRole(groupId, member.lineUserId, newRole);
      showSuccess('เปลี่ยนบทบาทสำเร็จ');
      onUpdated?.();
      onClose();
    } catch (error) {
      showError('เปลี่ยนบทบาทไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`ต้องการลบ ${member.displayName} ออกจากกลุ่ม?`)) {
      return;
    }

    setLoading(true);
    try {
      await removeMember(groupId, member.lineUserId);
      showSuccess('ลบสมาชิกสำเร็จ');
      onUpdated?.();
      onClose();
    } catch (error) {
      showError('ลบสมาชิกไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    const reason = prompt('ระบุเหตุผล (ถ้ามี):');
    
    setLoading(true);
    try {
      await banMember(groupId, member.lineUserId, reason);
      showSuccess('ระงับสมาชิกสำเร็จ');
      onUpdated?.();
      onClose();
    } catch (error) {
      showError('ระงับสมาชิกไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    setLoading(true);
    try {
      await unbanMember(groupId, member.lineUserId);
      showSuccess('ปลดระงับสมาชิกสำเร็จ');
      onUpdated?.();
      onClose();
    } catch (error) {
      showError('ปลดระงับสมาชิกไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>จัดการสมาชิก: {member.displayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Change Role */}
          <div>
            <Label>เปลี่ยนบทบาท</Label>
            <Select
              value={member.role}
              onValueChange={handleChangeRole}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">สมาชิก</SelectItem>
                <SelectItem value="moderator">ผู้ควบคุม</SelectItem>
                <SelectItem value="admin">ผู้ดูแล</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {member.status === 'banned' ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleUnban}
                disabled={loading}
              >
                ปลดระงับสมาชิก
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleBan}
                disabled={loading}
              >
                ระงับสมาชิก
              </Button>
            )}

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleRemove}
              disabled={loading}
            >
              ลบสมาชิกออกจากกลุ่ม
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### ✅ STEP 8: เพิ่ม Error Boundary (30 นาที)

#### 8.1 สร้าง Error Boundary Component

**สร้างไฟล์**: `src/components/ErrorBoundary.jsx`

```jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                เกิดข้อผิดพลาด
              </h1>
              <p className="text-gray-600 mb-4">
                ขออภัย แอปพลิเคชันเกิดข้อผิดพลาด
              </p>
              
              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-left">
                  <p className="text-sm text-red-800 font-mono">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                โหลดหน้าใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### 8.2 ใช้งานใน App

**แก้ไข**: `src/App.jsx`

```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ModalProvider>
          <AppContent />
        </ModalProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

---

### ✅ STEP 9: เพิ่ม Loading Skeletons (1 ชั่วโมง)

#### 9.1 สร้าง Skeleton Components

**สร้างไฟล์**: `src/components/common/Skeletons.jsx`

```jsx
export function TaskCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg p-4