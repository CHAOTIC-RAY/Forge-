import React from 'react';
import { X } from 'lucide-react';
import { auth } from '../lib/firebase';

interface ImageViewerProps {
  isOpen: boolean;
  imageUrl: string | null;
  aiProvider?: string | null;
  onClose: () => void;
}

export function ImageViewer({ isOpen, imageUrl, aiProvider, onClose }: ImageViewerProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Container optimized for 1080x1350 (4:5 aspect ratio) */}
      <div className="relative w-full max-w-[calc(100vh*0.8)] aspect-[4/5] max-h-[90vh] flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Full screen preview"
          className="max-w-full max-h-full object-contain rounded-[6px] "
        />
        {auth.currentUser && aiProvider && imageUrl.startsWith('data:') && (
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-purple-500/80 text-white text-xs font-bold rounded uppercase tracking-widest pointer-events-none">
            AI: {aiProvider}
          </div>
        )}
      </div>
    </div>
  );
}
