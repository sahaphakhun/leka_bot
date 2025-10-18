import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Upload,
  RefreshCw,
  Search,
  LayoutList,
  LayoutGrid,
  FolderOpen,
  AlertCircle,
  FileX,
} from "lucide-react";
import FileListView from "./FileListView";
import FileGridView from "./FileGridView";
import FileFolderView from "./FileFolderView";
import FileUploadZone from "./FileUploadZone";
import {
  uploadFilesWithProgress,
  fetchTasks,
  getGroupFiles,
  deleteFile,
} from "../../services/api";
import {
  showUploadProgress,
  updateUploadProgress,
  hideUploadProgress,
} from "../../lib/uploadProgress";
import { showSuccess, showError, showWarning } from "../../lib/toast";

export default function FilesView({ refreshKey = 0 }) {
  const { groupId, canModify } = useAuth();
  const { openFilePreview } = useModal();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeView, setActiveView] = useState("list");
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadFiles();
    loadTasks();
  }, [groupId, refreshKey]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGroupFiles(groupId);
      setFiles(response.data || response);
      console.log("✅ Loaded files:", (response.data || response).length);
    } catch (error) {
      console.error("❌ Failed to load files:", error);
      setError(error.message || "ไม่สามารถโหลดไฟล์ได้");
      setFiles([]);
      showError("ไม่สามารถโหลดไฟล์ได้", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetchTasks(groupId);
      setTasks(response.data || response.tasks || []);
    } catch (error) {
      console.error("⚠️ Failed to load tasks:", error);
      // ไม่แสดง toast เพราะไม่ critical
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const handleFileUpload = async (uploadedFiles, onProgress) => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์อัปโหลดไฟล์");
      return;
    }

    try {
      const fileArray = Array.from(uploadedFiles || []);
      if (fileArray.length === 0) {
        return;
      }
      const totalSize = fileArray.reduce(
        (sum, file) => sum + (file?.size || 0),
        0,
      );
      const subtitle =
        fileArray.length > 0
          ? `${fileArray.length} ไฟล์ • รวม ${formatFileSize(totalSize)}`
          : "กำลังอัปโหลดไฟล์...";

      showUploadProgress({
        title: "📤 กำลังอัปโหลดไฟล์",
        subtitle,
      });

      await uploadFilesWithProgress(
        groupId,
        fileArray,
        {},
        ({ loaded, total, lengthComputable }) => {
          updateUploadProgress({ loaded, total, lengthComputable });
          if (typeof onProgress === "function") {
            onProgress({ loaded, total, lengthComputable });
          }
        },
      );

      updateUploadProgress({
        percent: 100,
        detail:
          fileArray.length > 0
            ? `${formatFileSize(totalSize)} / ${formatFileSize(totalSize)}`
            : "อัปโหลดเสร็จสมบูรณ์",
      });
      showSuccess(`อัปโหลดไฟล์สำเร็จ ${fileArray.length} ไฟล์`);
      loadFiles();
      setShowUploadZone(false);
    } catch (error) {
      console.error("Failed to upload files:", error);
      showError("ไม่สามารถอัปโหลดไฟล์ได้", error);
    } finally {
      hideUploadProgress();
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์ลบไฟล์");
      return;
    }

    try {
      await deleteFile(groupId, fileId);
      showSuccess("ลบไฟล์สำเร็จ");
      loadFiles();
    } catch (error) {
      console.error("Failed to delete file:", error);
      showError("ไม่สามารถลบไฟล์ได้", error);
    }
  };

  const handleFilePreview = (file) => {
    openFilePreview(file);
  };

  const handleFileDownload = async (file) => {
    try {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("เริ่มดาวน์โหลดไฟล์");
    } catch (error) {
      console.error("Failed to download file:", error);
      showError("ไม่สามารถดาวน์โหลดไฟล์ได้", error);
    }
  };

  const filteredFiles = files.filter((file) => {
    const displayName =
      file.name || file.originalName || file.filename || file.fileName || "";
    const matchesSearch = displayName
      .toLowerCase()
      .includes((searchTerm || "").toLowerCase());
    const matchesTask =
      taskFilter === "all" ||
      (taskFilter === "unassigned" && !file.taskId) ||
      file.taskId === taskFilter;
    const matchesType =
      typeFilter === "all" ||
      (file.type || "").toLowerCase() === (typeFilter || "").toLowerCase();

    return matchesSearch && matchesTask && matchesType;
  });

  const summaryText = `แสดง ${filteredFiles.length} จาก ${files.length} ไฟล์`;

  const groupFilesByTask = () => {
    const grouped = {};
    filteredFiles.forEach((file) => {
      const taskId = file.taskId || "unassigned";
      if (!grouped[taskId]) {
        grouped[taskId] = {
          taskId,
          taskTitle: file.taskTitle || "ไม่ระบุงาน",
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
          <p className="text-gray-600">กำลังโหลดไฟล์...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ไม่สามารถโหลดไฟล์ได้
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={loadFiles} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                ลองอีกครั้ง
              </Button>
              <p className="text-xs text-gray-500">
                หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State (no files)
  if (!loading && !error && files.length === 0) {
    return (
      <div className="p-6 space-y-6">
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
            {canModify() ? (
              <Button onClick={() => setShowUploadZone(!showUploadZone)}>
                <Upload className="w-4 h-4 mr-2" />
                อัปโหลดไฟล์
              </Button>
            ) : (
              <Button disabled variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                อัปโหลดไฟล์ (ไม่มีสิทธิ์)
              </Button>
            )}
          </div>
        </div>

        {showUploadZone && (
          <FileUploadZone
            onFilesUploaded={handleFileUpload}
            onCancel={() => setShowUploadZone(false)}
          />
        )}

        <div className="flex items-center justify-center h-96 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center max-w-md px-6">
            <FileX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ยังไม่มีไฟล์
            </h3>
            <p className="text-gray-600 mb-6">
              อัปโหลดไฟล์แรกของคุณเพื่อเริ่มต้นใช้งานคลังไฟล์
            </p>
            {canModify() ? (
              <Button onClick={() => setShowUploadZone(true)}>
                <Upload className="w-4 h-4 mr-2" />
                อัปโหลดไฟล์แรก
              </Button>
            ) : (
              <p className="text-sm text-amber-600">
                ⚠️ คุณไม่มีสิทธิ์อัปโหลดไฟล์
              </p>
            )}
          </div>
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
          {canModify() ? (
            <Button onClick={() => setShowUploadZone(!showUploadZone)}>
              <Upload className="w-4 h-4 mr-2" />
              อัปโหลดไฟล์
            </Button>
          ) : (
            <Button disabled variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              อัปโหลดไฟล์ (ไม่มีสิทธิ์)
            </Button>
          )}
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
              <SelectValue placeholder="เลือกงาน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">งาน: ทั้งหมด</SelectItem>
              <SelectItem value="unassigned">ไฟล์ทั่วไป (ไม่ผูกงาน)</SelectItem>
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
              <SelectValue placeholder="เลือกประเภทไฟล์" />
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
          <p className="text-2xl font-bold">
            {files.filter((f) => f.type === "image").length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">เอกสาร</p>
          <p className="text-2xl font-bold">
            {files.filter((f) => f.type === "document").length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">อื่นๆ</p>
          <p className="text-2xl font-bold">
            {
              files.filter((f) => f.type !== "image" && f.type !== "document")
                .length
            }
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

          <p className="text-sm text-muted-foreground">{summaryText}</p>
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
