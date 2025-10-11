import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Upload, X, FileIcon } from 'lucide-react';

export default function FileUploadZone({ onFilesUploaded, onCancel }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกิน 10MB`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('กรุณาเลือกไฟล์');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onFilesUploaded(files);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reset after success
      setTimeout(() => {
        setFiles([]);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('ไม่สามารถอัปโหลดไฟล์ได้');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const docExts = ['doc', 'docx', 'pdf', 'txt'];
    const excelExts = ['xls', 'xlsx', 'csv'];
    
    if (imageExts.includes(ext)) return '🖼️';
    if (docExts.includes(ext)) return '📄';
    if (excelExts.includes(ext)) return '📊';
    return '📎';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">อัปโหลดไฟล์</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
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
          onClick={() => document.getElementById('file-input-zone').click()}
          disabled={uploading}
        >
          เลือกไฟล์
        </Button>
        <input
          id="file-input-zone"
          type="file"
          multiple
          className="hidden"
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
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
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

      {/* Upload Progress */}
      {uploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>กำลังอัปโหลด...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={uploading}
        >
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

