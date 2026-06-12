import { describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  it('exposes the standard levels', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('forwards error calls to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('boom');
    expect(spy).toHaveBeenCalledWith('boom');
    spy.mockRestore();
  });
});
