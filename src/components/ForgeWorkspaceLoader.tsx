import { useEffect, useMemo, useState } from 'react';
import { ForgeLoader } from './ForgeLoader';
import type { BuiltInAiStatus } from '../lib/builtinAi';
import { cn } from '../lib/utils';

export type WorkspaceLoadStage =
  | 'auth'
  | 'profile'
  | 'workspaces'
  | 'app'
  | 'ideas'
  | 'local-ai';

const STAGE_COPY: Record<
  WorkspaceLoadStage,
  { headline: string; detail: string; hint?: string }
> = {
  auth: {
    headline: 'Checking your forge pass',
    detail: 'Verifying sign-in with Firebase and Supabase…',
  },
  profile: {
    headline: 'Syncing your profile',
    detail: 'Loading account settings and workspace access…',
  },
  workspaces: {
    headline: 'Loading workspaces',
    detail: 'Fetching calendars, catalogues, and team data…',
  },
  app: {
    headline: 'Opening Forge',
    detail: 'Assembling your dashboard modules…',
    hint: 'Local AI models may download quietly in the background.',
  },
  ideas: {
    headline: 'Loading your ideas board',
    detail: 'Setting up Inbox, Ready, and Archive…',
  },
  'local-ai': {
    headline: 'Warming local AI',
    detail: 'Optional on-device models — keep working while this finishes.',
  },
};

function useLocalAiStatus(enabled: boolean) {
  const [status, setStatus] = useState<BuiltInAiStatus | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }
    let unsub: (() => void) | undefined;
    void import('../lib/builtinAi').then(({ builtInAi }) => {
      setStatus(builtInAi.getStatus());
      unsub = builtInAi.onStatusChange(setStatus);
    });
    return () => unsub?.();
  }, [enabled]);

  return status;
}

export function ForgeWorkspaceLoader({
  stage,
  size = 48,
  className,
  includeLocalAiStatus = false,
}: {
  stage: WorkspaceLoadStage;
  size?: number;
  className?: string;
  /** When true, append local-AI download progress to the subtitle (single loader UX). */
  includeLocalAiStatus?: boolean;
}) {
  const copy = STAGE_COPY[stage];
  const localAiStatus = useLocalAiStatus(includeLocalAiStatus);
  const localAiLoading = Boolean(localAiStatus?.isLoading || localAiStatus?.visionIsLoading);

  const detail = useMemo(() => {
    if (!includeLocalAiStatus || !localAiLoading) return copy.detail;
    const pct =
      localAiStatus?.progress != null ? ` · ${Math.round(localAiStatus.progress)}%` : '';
    const label = localAiStatus?.message || 'Downloading local AI models';
    return `${copy.detail} ${label}${pct}.`;
  }, [copy.detail, includeLocalAiStatus, localAiLoading, localAiStatus?.message, localAiStatus?.progress]);

  const progress =
    stage === 'local-ai'
      ? localAiStatus?.progress
      : includeLocalAiStatus && localAiLoading
        ? localAiStatus?.progress
        : undefined;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center px-6',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={copy.headline}
    >
      <ForgeLoader size={size} progress={progress} />
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-semibold text-[#37352F] dark:text-[#EBE9ED]">{copy.headline}</p>
        <p className="text-xs text-[#757681] dark:text-[#9B9A97] leading-relaxed">{detail}</p>
        {copy.hint && !localAiLoading ? (
          <p className="text-[10px] text-[#9B9A97] dark:text-[#7D7C78] italic">{copy.hint}</p>
        ) : null}
      </div>
    </div>
  );
}
