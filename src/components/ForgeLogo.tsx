import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ForgeLogoProps {
  className?: string;
  size?: number;
}

export function ForgeLogo({ className, size = 32 }: ForgeLogoProps) {
  return (
    <svg 
      id="Layer_2" 
      data-name="Layer 2" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 210.06 339.18"
      className={cn(className)}
      width={size}
      height={size * (339.18 / 210.06)}
    >
      <defs>
        <style>
          {`.cls-1 { fill: currentColor; }`}
        </style>
      </defs>
      <g id="Layer_1-2" data-name="Layer 1">
        <g>
          <path className="cls-1" d="M80.94,339.18C54.87,305.14,1.11,253.95,24.35,206.95c19.57-39.57,85.35-54.11,122.96-71.32,22.58-10.33,49.32-24.04,59.45-48.04l3.3,16.72c-1.5,34.98-17.01,51.98-47.34,65.85-9.29,4.25-42.44,13.21-44.92,22.07-1.23,4.4,2.15,8.29,6.11,9.36,5.31,1.43,20.62-6.08,26.58-8.63,13.92-5.95,28.69-13.54,41.9-20.98-2.86,36.18-36.16,66.88-69.22,78.06-8.2,2.77-42.23,7.56-42.23,16.69v72.45Z"/>
          <path className="cls-1" d="M10.86,234.07c-2.26-.04-3.13-4.53-3.9-6.42-18.16-44.69.65-84.17,40.06-107.91,36.8-22.18,136.59-47.56,137.48-99.91.11-6.63-4.19-13.12-2.44-19.82,19.74,18.71,27.39,43.38,20.72,70.07-12.87,51.53-90.85,66.89-132.46,87.29-31.16,15.27-62.01,37.69-59.45,76.71Z"/>
        </g>
      </g>
    </svg>
  );
}

export const ScribbleFlame = () => {
  const colors = ['#2383E2', '#E2234D', '#E2A123', '#23E25D', '#9333EA'];
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const path1 = "M80.94,339.18C54.87,305.14,1.11,253.95,24.35,206.95c19.57-39.57,85.35-54.11,122.96-71.32,22.58-10.33,49.32-24.04,59.45-48.04l3.3,16.72c-1.5,34.98-17.01,51.98-47.34,65.85-9.29,4.25-42.44,13.21-44.92,22.07-1.23,4.4,2.15,8.29,6.11,9.36,5.31,1.43,20.62-6.08,26.58-8.63,13.92-5.95,28.69-13.54,41.9-20.98-2.86,36.18-36.16,66.88-69.22,78.06-8.2,2.77-42.23,7.56-42.23,16.69v72.45Z";
  const path2 = "M10.86,234.07c-2.26-.04-3.13-4.53-3.9-6.42-18.16-44.69.65-84.17,40.06-107.91,36.8-22.18,136.59-47.56,137.48-99.91.11-6.63-4.19-13.12-2.44-19.82,19.74,18.71,27.39,43.38,20.72,70.07-12.87,51.53-90.85,66.89-132.46,87.29-31.16,15.27-62.01,37.69-59.45,76.71Z";

  return (
    <motion.div 
      className="w-full h-full relative"
      animate={{ color: colors[colorIndex] }}
      transition={{ duration: 0.5 }}
    >
      <svg viewBox="0 0 210 340" className="w-full h-full text-current absolute inset-0 overflow-visible">
        {/* Glow Layer */}
        <motion.path
          d={path1}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          initial={{ opacity: 0, filter: "blur(0px)", scale: 1 }}
          animate={{ opacity: [0, 0, 0.8, 0, 0], filter: ["blur(0px)", "blur(0px)", "blur(20px)", "blur(60px)", "blur(0px)"], scale: [1, 1, 1.1, 1.5, 1] }}
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.6, 0.8, 1], ease: "easeInOut" }}
          style={{ transformOrigin: "center" }}
        />
        <motion.path
          d={path2}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          initial={{ opacity: 0, filter: "blur(0px)", scale: 1 }}
          animate={{ opacity: [0, 0, 0.8, 0, 0], filter: ["blur(0px)", "blur(0px)", "blur(20px)", "blur(60px)", "blur(0px)"], scale: [1, 1, 1.1, 1.5, 1] }}
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.6, 0.8, 1], ease: "easeInOut", delay: 0.1 }}
          style={{ transformOrigin: "center" }}
        />
        
        {/* Outline Layer */}
        <motion.path
          d={path1}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 1, 0], opacity: [1, 1, 0.5, 0, 0] }}
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.6, 0.8, 1], ease: "easeInOut" }}
        />
        <motion.path
          d={path2}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 1, 0], opacity: [1, 1, 0.5, 0, 0] }}
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.6, 0.8, 1], ease: "easeInOut", delay: 0.1 }}
        />
      </svg>
    </motion.div>
  );
};

export const GlowingScribbleLogo = ({ size = 32 }: { size?: number }) => {
  const colors = ['#2383E2', '#E2234D', '#E2A123', '#23E25D', '#9333EA'];
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size * 1.6 }}>
      <motion.div
        className="absolute inset-0 blur-xl opacity-40 rounded-full"
        animate={{ backgroundColor: colors[colorIndex] }}
        transition={{ duration: 1 }}
      />
      <motion.svg 
        viewBox="0 0 210.06 339.18" 
        className="w-full h-full relative z-10 overflow-visible"
        animate={{ color: colors[colorIndex] }}
        transition={{ duration: 1 }}
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
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.3, 0.8, 1], ease: "easeInOut" }}
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
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.3, 0.8, 1], ease: "easeInOut", delay: 0.2 }}
        />
      </motion.svg>
    </div>
  );
};
