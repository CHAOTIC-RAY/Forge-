import { describe, expect, it } from 'vitest';
import { detectJsonImportKind, looksLikeForgeExportText } from './jsonImportDetect';

describe('jsonImportDetect', () => {
  it('detects forge export payloads', () => {
    expect(
      detectJsonImportKind({
        exportedAt: '2026-01-01',
        collections: { posts: [] },
      })
    ).toBe('forge-export');
  });

  it('detects schedule backups', () => {
    expect(detectJsonImportKind({ posts: [], timestamp: 'x' })).toBe('schedule-backup');
  });

  it('detects product backups', () => {
    expect(detectJsonImportKind({ products: [] })).toBe('product-backup');
    expect(detectJsonImportKind({ categoryCounts: [] })).toBe('product-backup');
  });

  it('quickly checks export file headers', () => {
    expect(looksLikeForgeExportText('{"collections":{},"exportedAt":"x"}')).toBe(true);
    expect(looksLikeForgeExportText('{"posts":[]}')).toBe(false);
  });
});
