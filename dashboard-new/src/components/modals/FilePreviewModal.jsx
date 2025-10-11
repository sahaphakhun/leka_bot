import { useState, useEffect } from 'react';
import { useModal } from '../../context/ModalContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, X, FileText, Image as ImageIcon, Film, Music } from 'lucide-react';

export default function FilePreviewModal() {
  const { isFilePreviewOpen, closeFilePreview, selectedFile } = useModal();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedFile) {
      detectFileType();
      loadPreview();
    }
  }, [selectedFile]);

  const detectFileType = () => {
    if (!selectedFile) return;

    const fileName = selectedFile.name || selectedFile.fileName || '';
    const ext = fileName.split('.').pop().toLowerCase();

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
    const pdfExts = ['pdf'];
    const textExts = ['txt', 'md', 'json', 'xml', 'csv'];
    const docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (imageExts.includes(ext)) setFileType('image');
    else if (videoExts.includes(ext)) setFileType('video');
    else if (audioExts.includes(ext)) setFileType('audio');
    else if (pdfExts.includes(ext)) setFileType('pdf');
    else if (textExts.includes(ext)) setFileType('text');
    else if (docExts.includes(ext)) setFileType('document');
    else setFileType('unknown');
  };

  const loadPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      // If file has a URL, use it directly
      if (selectedFile.url) {
        setPreviewUrl(selectedFile.url);
      }
      // If file is a File object, create object URL
      else if (selectedFile instanceof File) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      }
      // Otherwise, fetch from API
      else if (selectedFile.id) {
        const { getFilePreview } = await import('../../services/api');
        const url = await getFilePreview(selectedFile.id);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError('ไม่สามารถโหลดตัวอย่างไฟล์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFile) return;

    try {
      const link = document.createElement('a');
      link.href = previewUrl || selectedFile.url;
      link.download = selectedFile.name || selectedFile.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  const renderPreview = () => {
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

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
            <img
              src={previewUrl}
              alt={selectedFile.name}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        );

      case 'video':
        return (
          <div className="bg-gray-50 rounded-lg p-4">
            <video
              src={previewUrl}
              controls
              className="w-full max-h-[70vh]"
            >
              เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg p-4">
            <Music className="w-24 h-24 mb-6 text-gray-400" />
            <audio src={previewUrl} controls className="w-full max-w-md">
              เบราว์เซอร์ของคุณไม่รองรับการเล่นเสียง
            </audio>
          </div>
        );

      case 'pdf':
        return (
          <div className="bg-gray-50 rounded-lg">
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] rounded-lg"
              title="PDF Preview"
            />
          </div>
        );

      case 'text':
        return (
          <div className="bg-gray-50 rounded-lg p-4">
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] border-0"
              title="Text Preview"
            />
          </div>
        );

      case 'document':
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg p-4">
            <FileText className="w-24 h-24 mb-6 text-gray-400" />
            <p className="text-lg font-medium mb-2">{selectedFile.name}</p>
            <p className="text-sm text-gray-600 mb-6">
              ไฟล์เอกสาร - คลิกดาวน์โหลดเพื่อเปิดด้วยโปรแกรมที่เหมาะสม
            </p>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              ดาวน์โหลด
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg p-4">
            <FileText className="w-24 h-24 mb-6 text-gray-400" />
            <p className="text-lg font-medium mb-2">{selectedFile.name}</p>
            <p className="text-sm text-gray-600 mb-6">
              ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้
            </p>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              ดาวน์โหลด
            </Button>
          </div>
        );
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={isFilePreviewOpen} onOpenChange={closeFilePreview}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <p className="truncate">{selectedFile?.name || selectedFile?.fileName}</p>
              {selectedFile?.size && (
                <p className="text-sm text-muted-foreground font-normal">
                  {formatFileSize(selectedFile.size)}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              ดาวน์โหลด
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {renderPreview()}
        </div>

        {/* File Info */}
        {selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">ชื่อไฟล์</p>
                <p className="font-medium">{selectedFile.name || selectedFile.fileName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ขนาด</p>
                <p className="font-medium">{formatFileSize(selectedFile.size)}</p>
              </div>
              {selectedFile.uploadedBy && (
                <div>
                  <p className="text-muted-foreground">อัปโหลดโดย</p>
                  <p className="font-medium">{selectedFile.uploadedBy}</p>
                </div>
              )}
              {selectedFile.uploadedAt && (
                <div>
                  <p className="text-muted-foreground">วันที่อัปโหลด</p>
                  <p className="font-medium">
                    {new Date(selectedFile.uploadedAt).toLocaleDateString('th-TH')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

