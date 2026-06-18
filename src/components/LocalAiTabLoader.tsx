import { useEffect, useState } from 'react';
import { ForgeLoader } from './ForgeLoader';
import type { BuiltInAiStatus } from '../lib/builtinAi';

/** Kick off WebGPU model downloads and show a compact sidebar-style loader. */
export function useLocalAiBootstrap(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void import('../lib/localAiBootstrap').then(({ ensureLocalAiEnginesReady }) =>
      ensureLocalAiEnginesReady().catch((err) => {
        console.warn('[LocalAiBootstrap] preload failed:', err);
      })
    );
  }, [enabled]);
}

export function LocalAiTabLoader({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const [status, setStatus] = useState<BuiltInAiStatus | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void import('../lib/builtinAi').then(({ builtInAi }) => {
      setStatus(builtInAi.getStatus());
      unsub = builtInAi.onStatusChange(setStatus);
    });
    return () => unsub?.();
  }, []);

  const loading = status?.isLoading || status?.visionIsLoading;
  if (!loading) return null;

  return (
    <div
      className={className}
      title={status?.message || 'Downloading local AI models…'}
      aria-live="polite"
      aria-label="Local AI models loading"
    >
      <ForgeLoader size={size} variant="monochrome" progress={status?.progress} />
    </div>
  );
}
