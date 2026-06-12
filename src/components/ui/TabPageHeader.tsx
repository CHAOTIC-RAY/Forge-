import React from 'react';
import { cn } from '../../lib/utils';

export type TabHeaderSegmentOption<T extends string = string> = {
  id: T;
  label: string;
};

type TabPageHeaderProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  /** e.g. "bg-brand/10" */
  iconBgClassName?: string;
  /** e.g. "text-brand" */
  iconClassName?: string;
  actions?: React.ReactNode;
  /** Extra row below title row (quick capture, section tabs, etc.) */
  children?: React.ReactNode;
  className?: string;
};

/** Full-height tab shell — matches Ideas tab page chrome */
export function TabPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col h-full min-h-0 overflow-hidden bg-[#F7F7F5] dark:bg-[#151515] text-[#37352F] dark:text-[#EBE9ED]',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Scrollable body below tab header — horizontal padding matches Ideas content area */
export function TabPageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Status pill in tab header (Ideas inbox / ready badges) */
export function TabHeaderBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-bold shrink-0',
        className
      )}
    >
      {children}
    </span>
  );
}

/** Consistent tab header — sized like Ideas (full-width card, generous padding) */
export function TabPageHeader({
  icon: Icon,
  title,
  subtitle,
  iconBgClassName = 'bg-brand/10',
  iconClassName = 'text-brand',
  actions,
  children,
  className,
}: TabPageHeaderProps) {
  return (
    <div
      className={cn(
        'shrink-0 mb-4 p-5 md:p-6 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] rounded-[16px]',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0',
              iconBgClassName
            )}
          >
            <Icon className={cn('w-6 h-6', iconClassName)} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] tracking-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-xs md:text-sm text-[#757681] dark:text-[#9B9A97] mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

type TabHeaderSegmentsProps<T extends string> = {
  options: TabHeaderSegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
};

/** Segmented control styled like Insights range toggles */
export function TabHeaderSegments<T extends string>({
  options,
  value,
  onChange,
  className,
}: TabHeaderSegmentsProps<T>) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors min-h-[36px]',
            value === opt.id
              ? 'bg-brand text-white border-brand'
              : 'bg-white dark:bg-[#191919] border-[#E9E9E7] dark:border-[#2E2E2E] text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
