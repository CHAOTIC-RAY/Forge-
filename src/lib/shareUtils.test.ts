import { describe, expect, it } from 'vitest';
import { applyShareFilters, getShareOutletOptions, isShareExpired } from './shareUtils';
import { Post } from '../data';

const samplePosts: Post[] = [
  {
    id: '1',
    businessId: 'b1',
    userId: 'u1',
    date: '2026-05-01',
    outlet: 'Main Store',
    title: 'A',
    caption: '',
    status: 'draft',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: '2',
    businessId: 'b1',
    userId: 'u1',
    date: '2026-05-15',
    outlet: 'Online Shop',
    title: 'B',
    caption: '',
    status: 'draft',
    createdAt: '',
    updatedAt: '',
  },
];

describe('shareUtils', () => {
  it('detects expired share links', () => {
    expect(isShareExpired(null)).toBe(false);
    expect(isShareExpired('2000-01-01T00:00:00.000Z')).toBe(true);
    expect(isShareExpired('2099-01-01T00:00:00.000Z')).toBe(false);
  });

  it('filters posts by outlet and date range', () => {
    const filtered = applyShareFilters(samplePosts, {
      tags: ['Main Store'],
      dateRange: { start: '2026-05-01', end: '2026-05-10' },
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('returns brand kit outlets when available', () => {
    const outlets = getShareOutletOptions({
      categories: [
        { name: 'Flagship', type: 'outlet', enabled: true },
        { name: 'Hidden', type: 'outlet', enabled: false },
      ],
    });
    expect(outlets).toEqual(['Flagship']);
  });
});
