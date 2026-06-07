import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  isOpen?: boolean;
  images: string[];
  initialIndex?: number;
  aiProvider?: string;
  onClose: () => void;
}

export function ImageViewer({
  isOpen,
  images = [],
  initialIndex = 0,
  aiProvider,
  onClose,
}: ImageViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  if (!images || images.length === 0) return null;

  const currentUrl = images[activeIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:scale-105 cursor-pointer transition border border-white/10"
        type="button"
      >
        <X size={20} />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            type="button"
            className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer transition border border-white/10"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            type="button"
            className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer transition border border-white/10"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <div className="flex flex-col items-center gap-3 max-w-4xl max-h-[85vh] overflow-hidden rounded-xl shadow-2xl border border-white/10 bg-zinc-950/40 p-2">
        {currentUrl && (
          <img 
            src={currentUrl} 
            alt="Preview" 
            className="max-w-full max-h-[75vh] object-contain"
            referrerPolicy="no-referrer"
          />
        )}
        {aiProvider && (
          <div className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md mb-1 border border-white/5">
            Model: {aiProvider}
          </div>
        )}
      </div>
    </div>
  );
}
export default ImageViewer;
