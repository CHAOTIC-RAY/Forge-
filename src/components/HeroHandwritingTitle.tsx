import React from 'react';
import { cn } from '../lib/utils';

/** Hero headline — Simplified static version. */
export function HeroHandwritingTitle({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-white font-bold tracking-tighter block w-full text-left',
        className
      )}
      style={{
        fontSize: 'clamp(2.25rem, 6.5vw, 4.75rem)',
        lineHeight: 1.05,
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      Sparks into substance
    </span>
  );
}
