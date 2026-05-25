import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3 rounded-md', i === lines - 1 && lines > 1 ? 'w-4/5' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function HomeDashboardSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-5 md:gap-8 p-4 sm:p-6 md:p-8 lg:p-12 w-full" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-48 max-w-full rounded-md" />
      </div>
      <Skeleton className="h-40 w-full rounded-[20px]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[12px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="h-64 lg:col-span-2 rounded-[12px]" />
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-[12px]" />
          <Skeleton className="h-20 rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}

export function CalendarGridSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-[320px]" aria-busy="true" aria-label="Loading calendar">
      <div className="grid grid-cols-7 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] shrink-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 m-2 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 gap-px bg-[#E9E9E7] dark:bg-[#2E2E2E] p-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="min-h-[72px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function IdeasBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:p-6" aria-busy="true" aria-label="Loading ideas">
      {Array.from({ length: 3 }).map((col) => (
        <div key={col} className="flex flex-col rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] glass-card min-h-[240px] p-3 gap-2">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
