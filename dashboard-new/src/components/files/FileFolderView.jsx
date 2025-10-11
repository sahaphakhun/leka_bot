import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Eye, Download, Trash2, FileIcon, Image, FileText, Film, Music, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function FileFolderView({ groupedFiles, onPreview, onDownload, onDelete }) {
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'video':
        return <Film className="w-5 h-5 text-purple-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-pink-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      image: 'รูปภาพ',
      document: 'เอกสาร',
      video: 'วิดีโอ',
      audio: 'เสียง',
      other: 'อื่นๆ',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      image: 'bg-blue-100 text-blue-800',
      document: 'bg-green-100 text-green-800',
      video: 'bg-purple-100 text-purple-800',
      audio: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.other;
  };

  const getTotalSize = (files) => {
    const total = files.reduce((sum, file) => sum + (file.size || 0), 0);
    return formatFileSize(total);
  };

  if (groupedFiles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
        ไม่พบไฟล์
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <Accordion type="multiple" className="w-full">
        {groupedFiles.map((group, index) => (
          <AccordionItem key={group.taskId} value={`item-${index}`}>
            <AccordionTrigger className="px-6 hover:no-underline hover:bg-gray-50">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">{group.taskTitle}</p>
                    <p className="text-sm text-gray-500">
                      {group.files.length} ไฟล์ • {getTotalSize(group.files)}
                    </p>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-6 pb-4">
                <div className="space-y-2">
                  {group.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {/* File Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge className={getTypeColor(file.type)} variant="secondary">
                              {getTypeLabel(file.type)}
                            </Badge>
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>
                              {file.uploadedAt 
                                ? format(new Date(file.uploadedAt), 'dd MMM yyyy', { locale: th })
                                : '-'
                              }
                            </span>
                            {file.uploadedBy && (
                              <>
                                <span>•</span>
                                <span>{file.uploadedBy}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreview(file)}
                          title="แสดงตัวอย่าง"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(file)}
                          title="ดาวน์โหลด"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(file.id)}
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

