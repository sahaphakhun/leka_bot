import { useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Upload, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { submitTaskWithProgress } from "../../services/api";
import {
  showUploadProgress,
  updateUploadProgress,
  hideUploadProgress,
} from "../../lib/uploadProgress";
import { showSuccess, showError, showWarning } from "../../lib/toast";

export default function SubmitTaskModal({ onTaskSubmitted }) {
  const { groupId, userId, hasPermission } = useAuth();
  const { isSubmitTaskOpen, closeSubmitTask, selectedTask } = useModal();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (!selectedTask) return null;

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = useCallback((newFiles) => {
    const validFiles = newFiles.filter((file) => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกิน 10MB`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback(
    (e) => {
      if (loading) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [loading],
  );

  const handleDragLeave = useCallback(
    (e) => {
      if (loading) return;
      e.preventDefault();
      setIsDragging(false);
    },
    [loading],
  );

  const handleDrop = useCallback(
    (e) => {
      if (loading) return;
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [loading, addFiles],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check permission
    if (!hasPermission("submit_task")) {
      showError(
        "คุณไม่มีสิทธิ์ส่งงาน",
        new Error("กรุณาเข้าผ่าน LINE ส่วนตัวเพื่อส่งงาน"),
      );
      return;
    }

    // Verify userId exists
    if (!userId) {
      showError(
        "ต้องมี userId เพื่อส่งงาน",
        new Error("กรุณาเข้าผ่าน LINE ส่วนตัว"),
      );
      return;
    }

    if (!groupId) {
      showError("ไม่พบข้อมูลกลุ่ม");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("taskId", selectedTask.id);
      formData.append("notes", notes);
      formData.append("submittedBy", userId);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const totalSize = files.reduce((sum, file) => sum + (file?.size || 0), 0);
      const subtitle =
        files.length > 0
          ? `${files.length} ไฟล์ • รวม ${formatFileSize(totalSize)}`
          : "กำลังส่งข้อมูลงาน";

      showUploadProgress({
        title: "📤 กำลังส่งงาน",
        subtitle,
      });

      await submitTaskWithProgress(
        groupId,
        selectedTask.id,
        formData,
        ({ loaded, total, lengthComputable }) => {
          if (lengthComputable && total > 0) {
            const pct = Math.round((loaded / total) * 100);
            setUploadProgress(pct);
            updateUploadProgress({ loaded, total, lengthComputable });
          } else {
            setUploadProgress((prev) => {
              const next = prev >= 95 ? prev : prev + 5;
              return next;
            });
            updateUploadProgress({ loaded, total, lengthComputable });
          }
        },
      );

      setUploadProgress(100);
      updateUploadProgress({
        percent: 100,
        detail:
          files.length > 0
            ? `${formatFileSize(totalSize)} / ${formatFileSize(totalSize)}`
            : "อัปโหลดเสร็จสมบูรณ์",
      });

      // Success
      showSuccess("ส่งงานสำเร็จ");
      setTimeout(() => {
        if (onTaskSubmitted) onTaskSubmitted();
        closeSubmitTask();
        resetForm();
      }, 500);
    } catch (error) {
      console.error("Failed to submit task:", error);
      showError("ส่งงานไม่สำเร็จ", error);
      setUploadProgress(0);
    } finally {
      setLoading(false);
      hideUploadProgress();
    }
  };

  const resetForm = () => {
    setNotes("");
    setFiles([]);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
    const docExts = ["doc", "docx", "pdf", "txt"];
    const excelExts = ["xls", "xlsx", "csv"];
    const archiveExts = ["zip", "rar", "7z"];
    const audioExts = ["mp3", "wav", "m4a", "aac", "flac"];
    const videoExts = ["mp4", "mov", "avi", "mkv", "webm"];

    if (imageExts.includes(ext)) return "🖼️";
    if (docExts.includes(ext)) return "📄";
    if (excelExts.includes(ext)) return "📊";
    if (archiveExts.includes(ext)) return "📦";
    if (audioExts.includes(ext)) return "🎵";
    if (videoExts.includes(ext)) return "🎬";
    return "📎";
  };

  const handleOpenChange = (open) => {
    if (!open) {
      closeSubmitTask();
    }
  };

  return (
    <Dialog open={isSubmitTaskOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ส่งงาน</DialogTitle>
          <DialogDescription>ส่งงานพร้อมหมายเหตุและไฟล์แนบ</DialogDescription>
        </DialogHeader>

        {/* Permission Warning */}
        {!hasPermission("submit_task") && (
          <Alert variant="warning" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ไม่สามารถส่งงานได้</AlertTitle>
            <AlertDescription className="text-amber-800">
              คุณต้องเข้าผ่าน LINE ส่วนตัวเพื่อส่งงาน (ต้องการ userId)
              <br />
              <strong>เหตุผล:</strong> ระบบต้องการระบุผู้ส่งงาน
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{selectedTask.title}</h3>
              <Badge variant="outline">{selectedTask.id}</Badge>
            </div>
            {selectedTask.dueDate && (
              <p className="text-sm text-muted-foreground">
                กำหนดส่ง:{" "}
                {format(new Date(selectedTask.dueDate), "PPP", { locale: th })}
                {selectedTask.dueTime && ` เวลา ${selectedTask.dueTime}`}
              </p>
            )}
            {selectedTask.description && (
              <p className="text-sm text-muted-foreground">
                {selectedTask.description}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
              rows={4}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>ไฟล์แนบ</Label>

            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                ลากไฟล์มาวางที่นี่ หรือ
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("file-input").click()}
                disabled={loading}
              >
                เลือกไฟล์
              </Button>
              <input
                id="file-input"
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.7z,.mp4,.mov,.avi,.mp3,.wav"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-gray-500 mt-2">
                รองรับไฟล์ทุกประเภท (สูงสุด 10MB ต่อไฟล์)
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium">
                  ไฟล์ที่เลือก ({files.length})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">
                          {getFileIcon(file.name)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>กำลังอัปโหลด...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeSubmitTask}
              disabled={loading}
            >
              ปิด
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasPermission("submit_task")}
              title={!hasPermission("submit_task") ? "ไม่มีสิทธิ์ส่งงาน" : ""}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  ส่งงาน
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
