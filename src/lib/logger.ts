/**
 * Tiny leveled logger. Silent in production except for warnings/errors, so the
 * console isn't noisy for end users. Prefer this over raw `console.*`.
 *
 * Usage: `import { logger } from '@/src/lib/logger'; logger.debug(...)`
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev =
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// In dev show everything; in prod only warn/error.
const threshold = isDev ? order.debug : order.warn;

function emit(level: LogLevel, args: unknown[]) {
  if (order[level] < threshold) return;
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'info'
          ? console.info
          : console.debug;
  fn(...args);
}

export const logger = {
  debug: (...args: unknown[]) => emit('debug', args),
  info: (...args: unknown[]) => emit('info', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
};
