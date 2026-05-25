/** Eased scroll animation for landing-page guided tour (video-guide feel). */

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function animateScrollTo(
  container: HTMLElement,
  targetTop: number,
  durationMs: number,
  signal?: { aborted: boolean }
): Promise<void> {
  const start = container.scrollTop;
  const delta = targetTop - start;
  if (Math.abs(delta) < 2 || durationMs <= 0) {
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
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      container.scrollTop = start + delta * easeInOutCubic(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
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
