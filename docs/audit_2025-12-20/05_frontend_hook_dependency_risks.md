# Frontend Bug-Risk — React Hook Dependencies (`react-hooks/exhaustive-deps`)

## ทำไมอันนี้สำคัญ

Warning กลุ่มนี้ไม่ได้ทำให้ build พัง แต่มีโอกาสทำให้เกิด “บัคเงียบ” เช่น:

- effect ไม่ rerun ตอนตัวแปร/ฟังก์ชันที่ใช้เปลี่ยน → ข้อมูลค้าง (stale)
- memo/callback จับค่าจาก closure เก่า → กดแล้วทำงานผิด state ล่าสุด

## รายการ warning ที่พบ (18 จุด)

> อ้างอิงจาก `npm -C dashboard-new run lint` (ไม่มีการปิด warning)

### Data loading / useEffect

- `dashboard-new/src/components/activity/ActivityLogsView.jsx`
  - `useEffect` ขาด deps: `loadData`, `loadFilterOptions`
  - `useEffect` ขาด deps: `loadLogs`
- `dashboard-new/src/components/common/PDFViewer.jsx`
  - `useEffect` ขาด deps: `handleFullscreen`, `onClose`
- `dashboard-new/src/components/modals/EditTaskModal.jsx`
  - `useEffect` ขาด dep: `loadMembers`
- `dashboard-new/src/components/modals/FilePreviewModal.jsx`
  - `useEffect` ขาด deps: `detectFileType`, `loadPreview`
- `dashboard-new/src/components/profile/ProfileView.jsx`
  - `useEffect` ขาด dep: `loadProfile`
- `dashboard-new/src/components/recurring/RecurringHistoryModal.jsx`
  - `useEffect` ขาด dep: `loadHistory`
- `dashboard-new/src/components/recurring/RecurringTaskModal.jsx`
  - `useEffect` ขาด deps: `loadMembers`, `prefillRecurringTask`, `selectedRecurring`
- `dashboard-new/src/components/recurring/RecurringTasksView.jsx`
  - `useEffect` ขาด dep: `loadData`
- `dashboard-new/src/components/reports/ReportFilters.jsx`
  - `useEffect` ขาด dep: `loadMembers`
- `dashboard-new/src/components/reports/ReportsView.jsx`
  - `useEffect` ขาด dep: `loadReportData`
- `dashboard-new/src/hooks/useFiles.js`
  - `useEffect` ขาด dep: `loadFiles`
- `dashboard-new/src/hooks/useMembers.js`
  - `useEffect` ขาด dep: `loadMembers`
- `dashboard-new/src/hooks/useRecurringTasks.js`
  - `useEffect` ขาด dep: `loadRecurringTasks`

### Memoization / useMemo / useCallback

- `dashboard-new/src/components/activity/ActivityLogsView.jsx`
  - `useCallback` ขาด dep: `loadData`
- `dashboard-new/src/components/calendar/CalendarView.jsx`
  - `useMemo` ขาด dep: `getTasksForDate`
- `dashboard-new/src/components/common/Toast.jsx`
  - `useCallback` ขาด dep: `dismissToast`
- `dashboard-new/src/components/recurring/RecurringTasksView.jsx`
  - `useMemo` ขาด dep: `normalizedTasks`
- `dashboard-new/src/components/tasks/TasksView.jsx`
  - `useMemo` ขาด deps: `completedStatuses`, `inProgressStatuses`, `pendingStatuses`

## แนวทางแก้มาตรฐาน (เลือกแบบใดแบบหนึ่ง)

### แบบ A: ย้ายฟังก์ชันเข้า effect/memo (ลด dependency surface)

- เหมาะกับ: ฟังก์ชันใช้แค่ใน effect เดียว และไม่ต้องแชร์ที่อื่น
- ข้อดี: dependency ชัด, ลดโอกาสวนลูปจาก callback เปลี่ยนทุก render

### แบบ B: ทำฟังก์ชันให้ stable ด้วย `useCallback` แล้วใส่ deps ให้ครบ

- เหมาะกับ: ต้อง reuse ฟังก์ชันหลายที่ หรือส่งลง child
- ข้อดี: ลด re-render downstream และทำให้ `useEffect([...])` อ่านง่ายขึ้น

## ลำดับงานที่แนะนำถ้าจะ “เคลียร์ warning ให้หมด”

1. เริ่มจาก hooks ใน `src/hooks/*` (impact สูง กระทบหลายหน้าจอ)
2. ต่อด้วย view ที่โหลดข้อมูล (`ActivityLogsView`, `ReportsView`, `Recurring*`)
3. ปิดท้ายด้วย `useMemo/useCallback` ที่เป็น optimization

