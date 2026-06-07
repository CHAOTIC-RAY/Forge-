import React from 'react';
import { Calendar } from 'lucide-react';

interface ForgeLogoProps {
  size?: number;
  className?: string;
}

export function ForgeLogo({ size = 24, className }: ForgeLogoProps) {
  return (
    <div className={`flex items-center gap-2 font-bold text-[#2665fd] ${className}`}>
      <Calendar size={size} />
      <span>Forge</span>
    </div>
  );
}
