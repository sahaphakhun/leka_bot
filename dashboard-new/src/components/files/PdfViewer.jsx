import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';

export default function PdfViewer({ file, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfDoc, setPdfDoc] = useState(null);

  // Load PDF.js dynamically
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        // Check if PDF.js is already loaded
        if (window.pdfjsLib) {
          return;
        }

        // Load PDF.js from CDN
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // Set worker
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      } catch (err) {
        console.error('Failed to load PDF.js:', err);
        setError('ไม่สามารถโหลด PDF Viewer ได้');
      }
    };

    loadPdfJs();
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!file || !window.pdfjsLib) return;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const loadingTask = window.pdfjsLib.getDocument(file.url || file.downloadUrl);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('ไม่สามารถโหลดไฟล์ PDF ได้');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [file]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) return;

        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url || file.downloadUrl;
    link.download = file.name || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-lg font-medium">กำลังโหลด PDF...</p>
            <p className="text-sm text-gray-500">โปรดรอสักครู่</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">เกิดข้อผิดพลาด</h3>
            <p className="text-center text-gray-600">{error}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                ปิด
              </Button>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                ดาวน์โหลด
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            aria-label="ปิด"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-white font-medium truncate">
            {file?.name || 'PDF Document'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white hover:bg-gray-800"
          >
            <Download className="w-4 h-4 mr-2" />
            ดาวน์โหลด
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-3 py-1 bg-gray-700 rounded text-white text-sm min-w-[120px] text-center">
            หน้า {currentPage} / {numPages}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="px-3 py-1 bg-gray-700 rounded text-white text-sm min-w-[80px] text-center">
            {Math.round(scale * 100)}%
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white shadow-2xl">
          <canvas id="pdf-canvas" className="max-w-full h-auto" />
        </div>
      </div>

      {/* Mobile Navigation (Bottom) */}
      <div className="md:hidden bg-gray-800 px-4 py-3 flex items-center justify-center gap-4 border-t border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          className="text-white hover:bg-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
          ก่อนหน้า
        </Button>
        <span className="text-white text-sm font-medium">
          {currentPage}/{numPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage >= numPages}
          className="text-white hover:bg-gray-700"
        >
          ถัดไป
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
