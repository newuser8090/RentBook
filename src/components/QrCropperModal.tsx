import React, { useState, useRef, useEffect } from 'react';
import { AppTheme } from '../App';
import { X, Check, ZoomIn, ZoomOut, RotateCcw, QrCode, Sparkles, Image as ImageIcon } from 'lucide-react';

interface QrCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  theme: AppTheme;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const QrCropperModal: React.FC<QrCropperModalProps> = ({
  isOpen,
  imageSrc,
  theme,
  onClose,
  onCropComplete,
}) => {
  const isDark = theme === 'dark';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Transform states: zoom and pan offsets
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load the image when imageSrc changes
  useEffect(() => {
    if (!imageSrc || !isOpen) {
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Reset zoom and pan to center
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Redraw the canvas on transform changes
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const size = canvas.width; // 300x300 canvas size

    ctx.clearRect(0, 0, size, size);

    // Calculate base fit (cover square)
    const imgAspect = img.width / img.height;
    let drawWidth = size;
    let drawHeight = size;

    if (imgAspect > 1) {
      // Landscape: height matches, width scales
      drawHeight = size;
      drawWidth = size * imgAspect;
    } else {
      // Portrait: width matches, height scales
      drawWidth = size;
      drawHeight = size / imgAspect;
    }

    // Apply zoom
    drawWidth *= zoom;
    drawHeight *= zoom;

    // Centered base position + pan
    const centerX = (size - drawWidth) / 2 + pan.x;
    const centerY = (size - drawHeight) / 2 + pan.y;

    ctx.save();
    // Clip to square
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.clip();

    ctx.drawImage(img, centerX, centerY, drawWidth, drawHeight);
    ctx.restore();
  }, [imageLoaded, zoom, pan]);

  // Mouse & Touch Pan Handling
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCropAndSave = () => {
    if (!canvasRef.current) return;
    // Export optimized JPEG square from canvas under 30KB
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
    onCropComplete(dataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDark 
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between ${
          isDark ? 'border-zinc-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Position Payment QR</h3>
              <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Drag & zoom to frame the QR code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Frame */}
        <div className="p-4 flex flex-col items-center justify-center space-y-3.5">
          <div 
            className="relative w-[260px] h-[260px] rounded-xl overflow-hidden border-2 border-emerald-500 shadow-inner select-none cursor-grab active:cursor-grabbing touch-none bg-black flex items-center justify-center"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Viewfinder Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-r border-b border-white/10" />
              <div className="border-r border-b border-white/10" />
              <div className="border-b border-white/10" />
              <div className="border-r border-b border-white/10" />
              <div className="border-r border-b border-white/10" />
              <div className="border-b border-white/10" />
              <div className="border-r border-white/10" />
              <div className="border-r border-white/10" />
              <div />
            </div>

            {/* Corner Markers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />
          </div>

          {/* Zoom Slider & Reset Controls */}
          <div className="w-full max-w-[260px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                <ZoomIn className="w-3 h-3 text-emerald-500" /> Zoom Level: {zoom.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={handleReset}
                className={`text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Reset position"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0.6"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-3.5 border-t flex items-center gap-2 ${
          isDark ? 'border-zinc-800 bg-[#121215]' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 px-3 border rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isDark 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-crop-save-qr"
            onClick={handleCropAndSave}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save QR Code</span>
          </button>
        </div>
      </div>
    </div>
  );
};
