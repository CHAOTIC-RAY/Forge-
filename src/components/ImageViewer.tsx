import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '../lib/firebase';

interface ImageViewerProps {
  isOpen: boolean;
  images: string[] | null;
  initialIndex?: number;
  aiProvider?: string | null;
  onClose: () => void;
}

export function ImageViewer({ isOpen, images, initialIndex = 0, aiProvider, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  if (!isOpen || !images || images.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const currentImageUrl = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50 border border-white/10"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-50 border border-white/5 group"
          >
            <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-50 border border-white/5 group"
          >
            <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
          </button>
        </>
      )}
      
      {/* Container optimized for 1080x1350 (4:5 aspect ratio) */}
      <div className="relative w-full max-w-[calc(100vh*0.8)] aspect-[4/5] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={currentImageUrl}
          alt={`Preview ${currentIndex + 1}`}
          crossOrigin="anonymous"
          className="max-w-full max-h-full object-contain rounded-[12px] shadow-2xl"
        />
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full px-6">
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((_, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    idx === currentIndex ? "bg-white w-4" : "bg-white/30"
                  )}
                />
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {auth.currentUser && aiProvider && currentImageUrl.startsWith('data:') && (
              <div className="px-3 py-1.5 bg-purple-500/80 backdrop-blur-md text-white text-[10px] font-black rounded-full uppercase tracking-widest border border-purple-400/30">
                AI: {aiProvider}
              </div>
            )}
            {images.length > 1 && (
              <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md text-white text-[10px] font-black rounded-full uppercase tracking-widest border border-white/10">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for cn
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
