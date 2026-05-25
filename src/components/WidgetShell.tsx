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
        'bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden flex flex-col mb-6',
        className
      )}
    >
      <div className="p-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold text-[#757681] hover:text-brand shrink-0"
            >
              ← All widgets
            </button>
          )}
          {icon && (
            <div
              className={cn(
                'w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0',
                iconClassName
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#757681] dark:text-[#9B9A97] truncate">{subtitle}</p>
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
                'p-1.5 rounded-[8px] transition-colors',
                pinned
                  ? 'text-brand bg-blue-50 dark:bg-blue-900/20'
                  : 'text-[#757681] hover:text-brand'
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
                strokeWidth="2"
              >
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
