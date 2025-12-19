import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SmartPagination } from "../ui/pagination";
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
  LayoutGrid,
  FolderOpen,
  AlertCircle,
  FileX,
} from "lucide-react";
import FileGridView from "./FileGridView";
import FileFolderView from "./FileFolderView";
import FileUploadZone from "./FileUploadZone";
import {
  uploadFilesWithProgress,
  fetchTasks,
  getGroupFiles,
  deleteFile,
  downloadFile,
  previewFile,
} from "../../services/api";
import {
  showUploadProgress,
  updateUploadProgress,
  hideUploadProgress,
} from "../../lib/uploadProgress";
import { showSuccess, showError, showWarning } from "../../lib/toast";

const ITEMS_PER_PAGE = 20;

const deriveFileType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.startsWith("application/pdf") ||
    mimeType.includes("msword") ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("spreadsheetml") ||
    mimeType.includes("ms-excel") ||
    mimeType.includes("presentation") ||
    mimeType.includes("text")
  ) {
    return "document";
  }
  return "other";
};

const normaliseMemberName = (member) =>
  member?.displayName ||
  member?.realName ||
  member?.name ||
  member?.lineUserId ||
  "-";

const normaliseFileRecord = (file) => {
  const linkedTasks = Array.isArray(file?.linkedTasks) ? file.linkedTasks : [];
  const firstTask = linkedTasks[0] || null;
  const fallbackTaskName = Array.isArray(file?.taskNames)
    ? file.taskNames[0]
    : null;

  return {
    id: file.id,
    name: file.originalName || file.fileName || file.name || "ไฟล์ไม่มีชื่อ",
    type: deriveFileType(file.mimeType),
    mimeType: file.mimeType || "",
    size: file.size || 0,
    uploadedAt: file.uploadedAt || null,
    taskId: firstTask?.id || null,
    taskTitle:
      firstTask?.title || fallbackTaskName || (firstTask ? firstTask.id : null),
    uploadedBy: normaliseMemberName(file.uploadedByUser),
    raw: file,
  };
};

const normaliseTaskRecord = (task) => ({
  id: task.id,
  title: task.title || task.name || "ไม่ทราบชื่องาน",
});

export default function FilesView({ refreshKey = 0 }) {
  const { groupId, userId, canModify } = useAuth();
  const { openFilePreview } = useModal();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeView, setActiveView] = useState(() => {
    // Load saved view preference from localStorage
    const saved = localStorage.getItem("filesViewMode");
    return saved && ["grid", "folder"].includes(saved) ? saved : "grid";
  });
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!groupId) {
      setFiles([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [filesResponse, tasksResponse] = await Promise.all([
        getGroupFiles(groupId),
        fetchTasks(groupId).catch((err) => {
          console.warn("⚠️ Failed to load tasks (non-critical):", err);
          return { data: [] };
        }),
      ]);

      const rawFiles =
        filesResponse?.data || filesResponse?.files || filesResponse || [];
      const normalisedFiles = rawFiles.map(normaliseFileRecord);
      setFiles(normalisedFiles);
      console.log("✅ Loaded files:", normalisedFiles.length);

      const rawTasks = tasksResponse?.data || tasksResponse?.tasks || [];
      const normalisedTasks = rawTasks.map(normaliseTaskRecord);
      setTasks(normalisedTasks);
      console.log("✅ Loaded tasks:", normalisedTasks.length);
    } catch (err) {
      console.error("❌ Failed to load files:", err);
      setError(err.message || "ไม่สามารถโหลดไฟล์ได้");
      setFiles([]);
      setTasks([]);
      showError("ไม่สามารถโหลดไฟล์ได้", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const loadFiles = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }, []);

  const handleFileUpload = useCallback(
    async (uploadedFiles, onProgress) => {
      if (!canModify() || !userId) {
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
          { userId },
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
      } catch (err) {
        console.error("Failed to upload files:", err);
        showError("ไม่สามารถอัปโหลดไฟล์ได้", err);
      } finally {
        hideUploadProgress();
      }
    },
    [canModify, formatFileSize, groupId, loadFiles, userId],
  );

  const handleFileDelete = useCallback(
    async (fileId) => {
      if (!canModify()) {
        showWarning("คุณไม่มีสิทธิ์ลบไฟล์");
        return;
      }

      try {
        await deleteFile(null, fileId);
        showSuccess("ลบไฟล์สำเร็จ");
        loadFiles();
      } catch (err) {
        console.error("Failed to delete file:", err);
        showError("ไม่สามารถลบไฟล์ได้", err);
      }
    },
    [canModify, loadFiles],
  );

  const handleFilePreview = useCallback(
    async (file) => {
      try {
        const previewUrl = await previewFile(groupId, file.id);
        openFilePreview({ ...file, previewUrl });
      } catch (err) {
        console.error("Failed to preview file:", err);
        showError("ไม่สามารถแสดงตัวอย่างไฟล์ได้", err);
      }
    },
    [groupId, openFilePreview],
  );

  const handleFileDownload = useCallback(
    async (file) => {
      try {
        const url = await downloadFile(groupId, file.id);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess("เริ่มดาวน์โหลดไฟล์");
      } catch (err) {
        console.error("Failed to download file:", err);
        showError("ไม่สามารถดาวน์โหลดไฟล์ได้", err);
      }
    },
    [groupId],
  );

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const displayName = file.name || "";
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
  }, [files, searchTerm, taskFilter, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, taskFilter, typeFilter]);

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE) || 1;

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredFiles.slice(startIndex, endIndex);
  }, [filteredFiles, currentPage]);

  const summaryText = `แสดง ${filteredFiles.length} จาก ${files.length} ไฟล์`;

  const groupFilesByTask = useMemo(() => {
    const groupedMap = new Map();

    paginatedFiles.forEach((file) => {
      const taskId = file.taskId || "unassigned";
      if (!groupedMap.has(taskId)) {
        groupedMap.set(taskId, {
          taskId,
          taskTitle:
            file.taskTitle ||
            (taskId === "unassigned"
              ? "ไฟล์ที่ไม่ได้ผูกกับงาน"
              : tasks.find((t) => t.id === taskId)?.title || "ไม่ทราบงาน"),
          files: [],
        });
      }
      groupedMap.get(taskId).files.push(file);
    });

    return Array.from(groupedMap.values());
  }, [paginatedFiles, tasks]);

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

  if (error) {
    return (
      <div className="p-3 md:p-6">
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

  if (!loading && !error && files.length === 0) {
    return (
      <div className="p-3 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">คลังไฟล์</h1>
            <p className="text-muted-foreground">จัดการไฟล์และเอกสารทั้งหมด</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadFiles}>
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
            {canModify() ? (
              <Button
                onClick={() => setShowUploadZone(true)}
                disabled={!userId}
              >
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
              <Button
                onClick={() => setShowUploadZone(true)}
                disabled={!userId}
              >
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
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">คลังไฟล์</h1>
          <p className="text-muted-foreground">จัดการไฟล์และเอกสารทั้งหมด</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadFiles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          {canModify() ? (
            <Button
              onClick={() => setShowUploadZone((prev) => !prev)}
              disabled={!userId}
            >
              <Upload className="w-4 h-4 mr-2" />
              {showUploadZone ? "ปิดกล่องอัปโหลด" : "อัปโหลดไฟล์"}
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

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              ค้นหาไฟล์
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ชื่อไฟล์..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full md:w-56">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              งาน
            </label>
            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกงาน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกงาน</SelectItem>
                <SelectItem value="unassigned">ไม่ผูกกับงาน</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              ประเภทไฟล์
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="image">รูปภาพ</SelectItem>
                <SelectItem value="document">เอกสาร</SelectItem>
                <SelectItem value="video">วิดีโอ</SelectItem>
                <SelectItem value="audio">เสียง</SelectItem>
                <SelectItem value="other">อื่นๆ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-gray-500 self-start md:self-auto">
          {summaryText}
        </div>
      </div>

      <Tabs
        value={activeView}
        onValueChange={(value) => {
          setActiveView(value);
          // Save view preference to localStorage
          localStorage.setItem("filesViewMode", value);
        }}
      >
        <TabsList>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            กริด
          </TabsTrigger>
          <TabsTrigger value="folder" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            แยกตามงาน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <FileGridView
            files={paginatedFiles}
            onPreview={handleFilePreview}
            onDownload={handleFileDownload}
            onDelete={handleFileDelete}
          />
        </TabsContent>
        <TabsContent value="folder">
          <FileFolderView
            groupedFiles={groupFilesByTask}
            onPreview={handleFilePreview}
            onDownload={handleFileDownload}
            onDelete={handleFileDelete}
          />
        </TabsContent>
      </Tabs>

      {filteredFiles.length > ITEMS_PER_PAGE && (
        <SmartPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
