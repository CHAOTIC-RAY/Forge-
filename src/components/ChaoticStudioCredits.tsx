import React from 'react';
import { cn } from '../lib/utils';

export const CHAOTIC_STUDIO = {
  tagline: 'choasstudio.mv',
  email: 'chaos.studio.mv@gmail.com',
  telegram: 'https://t.me/Wafig',
  phone: '+960 9401011 (Telegram)',
  portfolio: 'https://portfolio.chaoticstudio.workers.dev/studio',
  portfolioLabel: 'chaos.studio',
} as const;

type ChaoticStudioCreditsProps = {
  variant?: 'landing' | 'default';
  className?: string;
};

export function ChaoticStudioCredits({ variant = 'default', className }: ChaoticStudioCreditsProps) {
  const isLanding = variant === 'landing';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 max-w-2xl w-full select-text',
        isLanding
          ? 'text-xs md:text-sm text-blue-100/75'
          : 'text-xs md:text-sm text-[#757681] dark:text-[#9B9A97]',
        className
      )}
    >
      <p className="font-medium text-center">
        Created from passion by{' '}
        <span
          className={cn(
            'font-semibold',
            isLanding ? 'text-white' : 'text-[#37352F] dark:text-[#EBE9ED]'
          )}
        >
          {CHAOTIC_STUDIO.tagline}
        </span>
      </p>
      <div
        className={cn(
          'flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs',
          isLanding ? 'text-blue-200/80' : 'text-[#757681] dark:text-[#9B9A97]'
        )}
      >
        <a
          href={`mailto:${CHAOTIC_STUDIO.email}`}
          className={cn(
            'hover:underline transition-colors',
            isLanding
              ? 'hover:text-white underline decoration-blue-200/30'
              : 'hover:text-brand'
          )}
        >
          {CHAOTIC_STUDIO.email}
        </a>
        <span className="hidden sm:inline opacity-40">•</span>
        <a
          href={CHAOTIC_STUDIO.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'hover:underline transition-colors',
            isLanding
              ? 'hover:text-white underline decoration-blue-200/30'
              : 'hover:text-brand'
          )}
        >
          {CHAOTIC_STUDIO.phone}
        </a>
        <span className="hidden sm:inline opacity-40">•</span>
        <a
          href={CHAOTIC_STUDIO.portfolio}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'hover:underline transition-colors',
            isLanding
              ? 'hover:text-white underline decoration-blue-200/30'
              : 'hover:text-brand'
          )}
        >
          {CHAOTIC_STUDIO.portfolioLabel}
        </a>
      </div>
    </div>
  );
}
