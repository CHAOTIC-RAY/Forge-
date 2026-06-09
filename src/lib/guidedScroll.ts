/** Eased scroll animation for landing-page guided tour. */

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Smoother, more cinematic ease for long scroll segments */
export function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

/** Gentle deceleration into each stop */
export function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function scrollDurationForDistance(px: number, baseMs = 900, maxMs = 2600): number {
  return Math.min(maxMs, Math.max(baseMs, baseMs + Math.abs(px) * 0.45));
}

export function animateScrollTo(
  container: HTMLElement,
  targetTop: number,
  durationMs?: number,
  signal?: { aborted: boolean },
  ease: (t: number) => number = easeInOutQuint
): Promise<void> {
  const start = container.scrollTop;
  const delta = targetTop - start;
  const resolvedDuration = durationMs ?? scrollDurationForDistance(delta);

  if (Math.abs(delta) < 2 || resolvedDuration <= 0) {
    container.scrollTop = targetTop;
    return Promise.resolve();
  }

  const startTime = performance.now();

  return new Promise((resolve) => {
    const step = (now: number) => {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - startTime) / resolvedDuration);
      const eased = ease(t);
      container.scrollTop = start + delta * eased;
      if (t < 1) requestAnimationFrame(step);
      else {
        container.scrollTop = targetTop;
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

export function waitMs(ms: number, signal?: { aborted: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      if (signal?.aborted || now - start >= ms) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
