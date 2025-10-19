import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Upload, X, AlertCircle } from "lucide-react";
import { showError, showWarning } from "../../lib/toast";

// File validation constants - NO SIZE LIMIT per user request
// const MAX_FILE_SIZE = 10 * 1024 * 1024; // REMOVED - no file size limit
const ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg", // Images
  "pdf",
  "doc",
  "docx",
  "txt", // Documents
  "xls",
  "xlsx",
  "csv", // Spreadsheets
  "ppt",
  "pptx", // Presentations
  "zip",
  "rar",
  "7z", // Archives
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm", // Videos
  "mp3",
  "wav",
  "m4a",
  "aac",
  "flac", // Audio
];

const MIME_TYPE_WHITELIST = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument",
  "application/zip",
  "application/x-rar-compressed",
  "text/plain",
  "text/csv",
];

export default function FileUploadZone({ onFilesUploaded, onCancel }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const validateFile = (file) => {
    const errors = [];

    // NO FILE SIZE CHECK - removed per user request (unlimited file size)

    // Check file extension
    const extension = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`ไฟล์ "${file.name}" มีนามสกุล .${extension} ที่ไม่รองรับ`);
      return { valid: false, errors };
    }

    // Check MIME type
    const mimeType = file.type;
    const isMimeAllowed = MIME_TYPE_WHITELIST.some((allowed) =>
      mimeType.startsWith(allowed),
    );
    if (!isMimeAllowed && mimeType) {
      errors.push(`ไฟล์ "${file.name}" มีประเภท ${mimeType} ที่ไม่รองรับ`);
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = useCallback((newFiles) => {
    const validFiles = [];
    const errors = [];

    newFiles.forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(...validation.errors);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      showWarning(`พบปัญหา ${errors.length} ไฟล์ที่ไม่ผ่านการตรวจสอบ`);

      // Clear errors after 10 seconds
      setTimeout(() => setValidationErrors([]), 10000);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback(
    (e) => {
      if (uploading) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [uploading],
  );

  const handleDragLeave = useCallback(
    (e) => {
      if (uploading) return;
      e.preventDefault();
      setIsDragging(false);
    },
    [uploading],
  );

  const handleDrop = useCallback(
    (e) => {
      if (uploading) return;
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [uploading, addFiles],
  );

  const handleUpload = async () => {
    if (files.length === 0) {
      showWarning("กรุณาเลือกไฟล์ก่อนอัปโหลด");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(0);

    try {
      await onFilesUploaded(files, ({ loaded, total, lengthComputable }) => {
        if (lengthComputable && total > 0) {
          const pct = Math.round((loaded / total) * 100);
          setUploadProgress(pct);
          setUploadedBytes(loaded);
          setTotalBytes(total);
        } else {
          setUploadProgress((prev) => (prev >= 95 ? prev : prev + 5));
        }
      });

      setUploadProgress(100);

      // Reset after success
      setTimeout(() => {
        setFiles([]);
        setUploadProgress(0);
        setUploadedBytes(0);
        setTotalBytes(0);
      }, 500);
    } catch (error) {
      console.error("Upload failed:", error);
      showError("ไม่สามารถอัปโหลดไฟล์ได้", error);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">อัปโหลดไฟล์</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={uploading}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-2">
                ไฟล์ที่ไม่ผ่านการตรวจสอบ ({validationErrors.length})
              </h4>
              <ul className="text-xs text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setValidationErrors([])}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
        <p className="text-sm text-gray-600 mb-2">ลากไฟล์มาวางที่นี่ หรือ</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById("file-input-zone").click()}
          disabled={uploading}
        >
          เลือกไฟล์
        </Button>
        <input
          id="file-input-zone"
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">ไฟล์ที่เลือก ({files.length})</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              ล้างทั้งหมด
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{getFileIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
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
                  disabled={uploading}
                  className="ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress - Enhanced with detailed info */}
      {uploading && uploadProgress > 0 && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                กำลังอัปโหลด...
              </span>
            </div>
            <span className="text-lg font-bold text-blue-700">
              {uploadProgress}%
            </span>
          </div>
          <Progress value={uploadProgress} className="h-3" />
          {totalBytes > 0 && (
            <div className="flex items-center justify-between text-xs text-blue-700">
              <span>ขนาดที่อัปโหลดแล้ว</span>
              <span className="font-mono font-medium">
                {formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)}
              </span>
            </div>
          )}
          <div className="text-xs text-blue-600">
            {files.length} ไฟล์ • รอสักครู่...
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={uploading}>
          ยกเลิก
        </Button>
        <Button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              กำลังอัปโหลด...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              อัปโหลด ({files.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
