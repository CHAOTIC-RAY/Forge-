import React from 'react';
import { cn } from '../lib/utils';

interface WidgetShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  onBack?: () => void;
  pinned?: boolean;
  onTogglePin?: (e: React.MouseEvent) => void;
  showPin?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function WidgetShell({
  title,
  subtitle,
  icon,
  iconClassName = 'bg-brand-bg',
  onBack,
  pinned,
  onTogglePin,
  showPin = false,
  actions,
  children,
  className,
}: WidgetShellProps) {
  return (
    <div
      className={cn(
        'bg-[#FDFDFD] dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px] shadow-sm overflow-hidden flex flex-col mb-8 transition-all hover:shadow-md hover:shadow-brand/[0.01]',
        className
      )}
    >
      <div className="px-6 py-5 border-b border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] bg-gradient-to-r from-[#F9F9F8] to-[#FDFDFD] dark:from-[#1E1E1E] dark:to-[#1A1A1A] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold text-[#757681] hover:text-brand bg-gray-100 dark:bg-white/[0.06] hover:bg-brand/10 dark:hover:bg-brand/20 px-3 py-1.5 rounded-full shrink-0 transition-all flex items-center gap-1"
            >
              <span>←</span> All widgets
            </button>
          )}
          {icon && (
            <div
              className={cn(
                'w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 hover:scale-105',
                iconClassName
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-[#37352F] dark:text-[#EBE9ED] tracking-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs font-medium text-[#757681] dark:text-[#9B9A97] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {showPin && onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={cn(
                'p-2 rounded-[10px] transition-all hover:scale-105 active:scale-95 border',
                pinned
                  ? 'text-brand bg-brand/[0.06] border-brand/20 dark:bg-brand/[0.15] dark:border-brand/40'
                  : 'text-[#757681] hover:text-brand border-transparent hover:bg-gray-100 dark:hover:bg-white/[0.06]'
              )}
              title={pinned ? 'Unpin' : 'Pin to top'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={pinned ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="p-6 md:p-8 bg-[#FDFDFD]/50 dark:bg-[#1A1A1A]/50">{children}</div>
    </div>
  );
}
