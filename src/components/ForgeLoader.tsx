import React from 'react';

interface ForgeLoaderProps {
  size?: number;
  className?: string;
}

export function ForgeLoader({ size = 40, className }: ForgeLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div 
        style={{ width: size, height: size }}
        className="animate-spin rounded-full border-2 border-t-2 border-t-[#2665fd] border-blue-500/20"
      />
    </div>
  );
}
