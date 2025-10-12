import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Upload, RefreshCw, Search, LayoutList, LayoutGrid, FolderOpen } from 'lucide-react';
import FileListView from './FileListView';
import FileGridView from './FileGridView';
import FileFolderView from './FileFolderView';
import FileUploadZone from './FileUploadZone';

export default function FilesView() {
  const { groupId } = useAuth();
  const { openFilePreview } = useModal();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeView, setActiveView] = useState('list');
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadFiles();
    loadTasks();
  }, [groupId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { getGroupFiles } = await import('../../services/api');
      const response = await getGroupFiles(groupId);
      setFiles(response.data || response);
    } catch (error) {
      console.error('Failed to load files:', error);
      // Sample data for development
      setFiles([
        {
          id: '1',
          name: 'รายงานประจำเดือน.pdf',
          type: 'document',
          size: 1024000,
          taskId: 'T001',
          taskTitle: 'รายงานประจำเดือน',
          uploadedBy: 'John Doe',
          uploadedAt: '2025-10-10T10:00:00',
          url: '/files/report.pdf',
        },
        {
          id: '2',
          name: 'screenshot.png',
          type: 'image',
          size: 512000,
          taskId: 'T002',
          taskTitle: 'ตรวจสอบระบบ',
          uploadedBy: 'Jane Smith',
          uploadedAt: '2025-10-11T14:30:00',
          url: '/files/screenshot.png',
        },
        {
          id: '3',
          name: 'presentation.pptx',
          type: 'document',
          size: 2048000,
          taskId: 'T003',
          taskTitle: 'นำเสนอโครงการ',
          uploadedBy: 'Bob Johnson',
          uploadedAt: '2025-10-12T09:15:00',
          url: '/files/presentation.pptx',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const { fetchTasks } = await import('../../services/api');
      const response = await fetchTasks(groupId);
      setTasks(response.data || response.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleFileUpload = async (uploadedFiles) => {
    try {
      const { uploadFiles } = await import('../../services/api');
      await uploadFiles(groupId, uploadedFiles);
      loadFiles();
      setShowUploadZone(false);
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('ไม่สามารถอัปโหลดไฟล์ได้');
    }
  };

  const handleFileDelete = async (fileId) => {
    try {
      const { deleteFile } = await import('../../services/api');
      await deleteFile(groupId, fileId);
      loadFiles();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('ไม่สามารถลบไฟล์ได้');
    }
  };

  const handleFilePreview = (file) => {
    openFilePreview(file);
  };

  const handleFileDownload = async (file) => {
    try {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  const filteredFiles = files.filter(file => {
    const displayName = file.name || file.originalName || file.filename || file.fileName || '';
    const matchesSearch = displayName.toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesTask = taskFilter === 'all' || file.taskId === taskFilter;
    const matchesType = typeFilter === 'all' || (file.type || '').toLowerCase() === (typeFilter || '').toLowerCase();
    
    return matchesSearch && matchesTask && matchesType;
  });

  const groupFilesByTask = () => {
    const grouped = {};
    filteredFiles.forEach(file => {
      const taskId = file.taskId || 'unassigned';
      if (!grouped[taskId]) {
        grouped[taskId] = {
          taskId,
          taskTitle: file.taskTitle || 'ไม่ระบุงาน',
          files: [],
        };
      }
      grouped[taskId].files.push(file);
    });
    return Object.values(grouped);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">คลังไฟล์</h1>
          <p className="text-muted-foreground">จัดการไฟล์และเอกสารทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadFiles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={() => setShowUploadZone(!showUploadZone)}>
            <Upload className="w-4 h-4 mr-2" />
            อัปโหลดไฟล์
          </Button>
        </div>
      </div>

      {/* Upload Zone */}
      {showUploadZone && (
        <FileUploadZone
          onFilesUploaded={handleFileUpload}
          onCancel={() => setShowUploadZone(false)}
        />
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ค้นหาไฟล์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Task Filter */}
          <Select value={taskFilter} onValueChange={setTaskFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">งาน: ทั้งหมด</SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ประเภท: ทั้งหมด</SelectItem>
              <SelectItem value="image">รูปภาพ</SelectItem>
              <SelectItem value="document">เอกสาร</SelectItem>
              <SelectItem value="video">วิดีโอ</SelectItem>
              <SelectItem value="audio">เสียง</SelectItem>
              <SelectItem value="other">อื่นๆ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">ไฟล์ทั้งหมด</p>
          <p className="text-2xl font-bold">{files.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">รูปภาพ</p>
          <p className="text-2xl font-bold">{files.filter(f => f.type === 'image').length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">เอกสาร</p>
          <p className="text-2xl font-bold">{files.filter(f => f.type === 'document').length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">อื่นๆ</p>
          <p className="text-2xl font-bold">
            {files.filter(f => f.type !== 'image' && f.type !== 'document').length}
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list">
              <LayoutList className="w-4 h-4 mr-2" />
              รายการ
            </TabsTrigger>
            <TabsTrigger value="grid">
              <LayoutGrid className="w-4 h-4 mr-2" />
              กริด
            </TabsTrigger>
            <TabsTrigger value="folder">
              <FolderOpen className="w-4 h-4 mr-2" />
              จัดกลุ่มตามงาน
            </TabsTrigger>
          </TabsList>

          <p className="text-sm text-muted-foreground">
            แสดง {filteredFiles.length} ไฟล์
          </p>
        </div>

        <TabsContent value="list">
          <FileListView
            files={filteredFiles}
            onPreview={handleFilePreview}
            onDownload={handleFileDownload}
            onDelete={handleFileDelete}
          />
        </TabsContent>

        <TabsContent value="grid">
          <FileGridView
            files={filteredFiles}
            onPreview={handleFilePreview}
            onDownload={handleFileDownload}
            onDelete={handleFileDelete}
          />
        </TabsContent>

        <TabsContent value="folder">
          <FileFolderView
            groupedFiles={groupFilesByTask()}
            onPreview={handleFilePreview}
            onDownload={handleFileDownload}
            onDelete={handleFileDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
