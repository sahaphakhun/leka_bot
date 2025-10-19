import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Eye,
  Download,
  Trash2,
  FileIcon,
  Image,
  FileText,
  Film,
  Music,
  File,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function FileGridView({
  files,
  onPreview,
  onDownload,
  onDelete,
}) {
  const [imageErrors, setImageErrors] = useState(new Set());

  const formatFileSize = (bytes) => {
    if (!bytes) return "-";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "image":
        return <Image className="w-16 h-16 text-blue-500" />;
      case "document":
        return <FileText className="w-16 h-16 text-green-500" />;
      case "video":
        return <Film className="w-16 h-16 text-purple-500" />;
      case "audio":
        return <Music className="w-16 h-16 text-pink-500" />;
      default:
        return <FileIcon className="w-16 h-16 text-gray-500" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      image: "รูปภาพ",
      document: "เอกสาร",
      video: "วิดีโอ",
      audio: "เสียง",
      other: "อื่นๆ",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      image: "bg-blue-100 text-blue-800",
      document: "bg-green-100 text-green-800",
      video: "bg-purple-100 text-purple-800",
      audio: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.other;
  };

  const getFileExtension = (fileName) => {
    const parts = fileName.split(".");
    if (parts.length > 1) {
      return parts[parts.length - 1].toUpperCase();
    }
    return "FILE";
  };

  const getExtensionColor = (extension) => {
    const ext = extension.toLowerCase();
    // Images
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
      return "bg-blue-500";
    }
    // Documents
    if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) {
      return "bg-red-500";
    }
    // Spreadsheets
    if (["xls", "xlsx", "csv"].includes(ext)) {
      return "bg-green-500";
    }
    // Presentations
    if (["ppt", "pptx"].includes(ext)) {
      return "bg-orange-500";
    }
    // Videos
    if (["mp4", "avi", "mov", "wmv", "flv", "mkv"].includes(ext)) {
      return "bg-purple-500";
    }
    // Audio
    if (["mp3", "wav", "aac", "flac", "m4a"].includes(ext)) {
      return "bg-pink-500";
    }
    // Archives
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return "bg-yellow-500";
    }
    return "bg-gray-500";
  };

  const handleImageError = (fileId) => {
    setImageErrors((prev) => new Set([...prev, fileId]));
  };

  const canPreviewImage = (file) => {
    if (file.type !== "image") return false;
    if (imageErrors.has(file.id)) return false;
    // Check if file has URL from raw data
    const url = file.raw?.url || file.raw?.fileUrl || file.url;
    return !!url;
  };

  const getImageUrl = (file) => {
    return file.raw?.url || file.raw?.fileUrl || file.url;
  };

  const renderThumbnail = (file) => {
    // Try to show image preview
    if (canPreviewImage(file)) {
      const imageUrl = getImageUrl(file);
      return (
        <div className="relative w-full h-full bg-gray-50">
          <img
            src={imageUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => handleImageError(file.id)}
          />
        </div>
      );
    }

    const extension = getFileExtension(file.name);
    const bgColor = getExtensionColor(extension);

    // Show file extension badge for non-previewable files
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg`}>
          <File className="w-12 h-12 mb-2 mx-auto opacity-90" />
          <div className="text-center font-bold text-lg tracking-wider">
            .{extension}
          </div>
        </div>
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
        ไม่พบไฟล์
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Thumbnail */}
          <div
            className="aspect-square cursor-pointer"
            onClick={() => onPreview(file)}
          >
            {renderThumbnail(file)}
          </div>

          {/* Info */}
          <div className="p-3 space-y-2">
            {/* File Name */}
            <h3 className="font-medium text-sm truncate" title={file.name}>
              {file.name}
            </h3>

            {/* Type & Size */}
            <div className="flex items-center justify-between text-xs">
              <Badge className={getTypeColor(file.type)} variant="secondary">
                {getTypeLabel(file.type)}
              </Badge>
              <span className="text-gray-500">{formatFileSize(file.size)}</span>
            </div>

            {/* Task */}
            {file.taskTitle && (
              <p
                className="text-xs text-gray-500 truncate"
                title={file.taskTitle}
              >
                งาน: {file.taskTitle}
              </p>
            )}

            {/* Upload Info */}
            <div className="text-xs text-gray-500">
              <p className="truncate" title={file.uploadedBy}>
                {file.uploadedBy || "-"}
              </p>
              <p>
                {file.uploadedAt
                  ? format(new Date(file.uploadedAt), "dd MMM yyyy", {
                      locale: th,
                    })
                  : "-"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-1 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => onPreview(file)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => onDownload(file)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => onDelete(file.id)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
