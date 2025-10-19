import { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Advanced PDF Viewer Component
 *
 * Features:
 * - Zoom in/out with mouse wheel
 * - Pan with mouse drag
 * - Rotate PDF
 * - Page navigation
 * - Fullscreen mode
 * - Keyboard shortcuts
 *
 * @param {string} url - PDF file URL
 * @param {string} fileName - File name for download
 * @param {function} onClose - Close callback
 */
const PDFViewer = ({ url, fileName, onClose }) => {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Zoom levels
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3.0;
  const SCALE_STEP = 0.1;

  // Handle zoom
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + SCALE_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - SCALE_STEP, MIN_SCALE));
  };

  const handleZoomReset = () => {
    setScale(1.0);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)));
    }
  };

  // Handle pan start
  const handleMouseDown = (e) => {
    if (scale > 1.0) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
      e.preventDefault();
    }
  };

  // Handle pan move
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  // Handle pan end
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '+') {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
      // Rotation shortcut
      else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      }
      // Fullscreen shortcut
      else if (e.key === 'f' || e.key === 'F') {
        handleFullscreen();
      }
      // ESC to close
      else if (e.key === 'Escape' && !isFullscreen && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setLoading(false);
  };

  const zoomPercentage = Math.round(scale * 100);

  return (
    <div
      ref={containerRef}
      className={`relative bg-gray-900 ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'}`}
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center justify-between p-3">
          {/* Left: Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= MIN_SCALE}
              className="text-white hover:bg-gray-700"
              title="ซูมออก (Ctrl+-)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <div className="px-3 py-1 bg-gray-700 rounded text-white text-sm min-w-[60px] text-center">
              {zoomPercentage}%
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= MAX_SCALE}
              className="text-white hover:bg-gray-700"
              title="ซูมเข้า (Ctrl++)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomReset}
              className="text-white hover:bg-gray-700"
              title="รีเซ็ต (Ctrl+0)"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              className="text-white hover:bg-gray-700"
              title="หมุน 90° (R)"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Center: File Name */}
          <div className="flex-1 text-center px-4">
            <p className="text-white text-sm font-medium truncate">
              {fileName || 'PDF Document'}
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreen}
              className="text-white hover:bg-gray-700"
              title="เต็มหน้าจอ (F)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-white hover:bg-gray-700"
              title="ดาวน์โหลด"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">กำลังโหลด PDF...</p>
          </div>
        </div>
      )}

      {/* PDF Container */}
      <div
        className={`flex items-center justify-center overflow-hidden ${isFullscreen ? 'h-screen' : 'h-full'}`}
        style={{ paddingTop: '60px', cursor: isPanning ? 'grabbing' : scale > 1.0 ? 'grab' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
            width: '100%',
            height: 'calc(100% - 60px)',
            pointerEvents: isPanning ? 'none' : 'auto',
          }}
        >
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0 bg-white"
            title="PDF Preview"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Help (shown on hover) */}
      <div className="absolute bottom-4 right-4 bg-gray-800/95 backdrop-blur-sm text-white text-xs p-3 rounded-lg border border-gray-700 opacity-0 hover:opacity-100 transition-opacity">
        <p className="font-semibold mb-2">คีย์ลัด:</p>
        <ul className="space-y-1">
          <li>Ctrl/Cmd + Plus: ซูมเข้า</li>
          <li>Ctrl/Cmd + Minus: ซูมออก</li>
          <li>Ctrl/Cmd + 0: รีเซ็ต</li>
          <li>R: หมุน</li>
          <li>F: เต็มหน้าจอ</li>
          <li>Scroll + Ctrl: ซูม</li>
          <li>Drag: เลื่อนภาพ (เมื่อซูม)</li>
        </ul>
      </div>
    </div>
  );
};

export default PDFViewer;
