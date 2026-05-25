import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ForgeLoaderProps {
  size?: number;
  className?: string;
  /** Grey stroke, no color cycling — for AI model download indicators */
  variant?: 'default' | 'monochrome';
  /** When set (0–100), shows rounded percentage below the logo */
  progress?: number;
}

const CYCLE_COLORS = ['#2383E2', '#E2234D', '#E2A123', '#23E25D', '#9333EA'];

export function ForgeLoader({
  size = 40,
  className,
  variant = 'default',
  progress,
}: ForgeLoaderProps) {
  const isMonochrome = variant === 'monochrome';
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    if (isMonochrome) return;
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % CYCLE_COLORS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isMonochrome]);

  const strokeColor = isMonochrome ? '#9B9A97' : CYCLE_COLORS[colorIndex];

  const loader = (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size * 1.6 }}
    >
      {isMonochrome ? (
        <div
          className="absolute inset-0 blur-xl rounded-full bg-[#9B9A97]/20 dark:bg-[#757681]/25"
          aria-hidden
        />
      ) : (
        <motion.div
          className="absolute inset-0 blur-xl opacity-30 rounded-full"
          animate={{ backgroundColor: strokeColor }}
          transition={{ duration: 1 }}
        />
      )}
      <motion.svg
        viewBox="0 0 210.06 339.18"
        className={cn(
          'w-full h-full relative z-10',
          isMonochrome && 'text-[#9B9A97] dark:text-[#757681]'
        )}
        animate={isMonochrome ? undefined : { color: strokeColor }}
        transition={isMonochrome ? undefined : { duration: 1 }}
        style={isMonochrome ? undefined : { color: strokeColor }}
      >
        <motion.path
          d="M80.94,339.18C54.87,305.14,1.11,253.95,24.35,206.95c19.57-39.57,85.35-54.11,122.96-71.32,22.58-10.33,49.32-24.04,59.45-48.04l3.3,16.72c-1.5,34.98-17.01,51.98-47.34,65.85-9.29,4.25-42.44,13.21-44.92,22.07-1.23,4.4,2.15,8.29,6.11,9.36,5.31,1.43,20.62-6.08,26.58-8.63,13.92-5.95,28.69-13.54,41.9-20.98-2.86,36.18-36.16,66.88-69.22,78.06-8.2,2.77-42.23,7.56-42.23,16.69v72.45Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.8, 1], ease: 'easeInOut' }}
        />
        <motion.path
          d="M10.86,234.07c-2.26-.04-3.13-4.53-3.9-6.42-18.16-44.69.65-84.17,40.06-107.91,36.8-22.18,136.59-47.56,137.48-99.91.11-6.63-4.19-13.12-2.44-19.82,19.74,18.71,27.39,43.38,20.72,70.07-12.87,51.53-90.85,66.89-132.46,87.29-31.16,15.27-62.01,37.69-59.45,76.71Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.8, 1], ease: 'easeInOut', delay: 0.2 }}
        />
      </motion.svg>
    </div>
  );

  if (progress != null) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {loader}
        <span className="text-[9px] font-bold text-[#9B9A97] dark:text-[#757681] tabular-nums leading-none">
          {Math.round(progress)}%
        </span>
      </div>
    );
  }

  return loader;
}
