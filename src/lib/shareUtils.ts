import { isAfter, parseISO } from 'date-fns';
import { Business, Post } from '../data';

export function isShareExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return isAfter(new Date(), parseISO(expiresAt));
}

export function applyShareFilters(posts: Post[], filters?: Business['shareFilters']): Post[] {
  if (!filters) return posts;

  let filtered = posts;

  if (filters.tags?.length) {
    filtered = filtered.filter((p) => filters.tags!.includes(p.outlet || ''));
  }
  if (filters.dateRange?.start) {
    filtered = filtered.filter((p) => p.date >= filters.dateRange!.start);
  }
  if (filters.dateRange?.end) {
    filtered = filtered.filter((p) => p.date <= filters.dateRange!.end);
  }

  return filtered;
}

export function getShareOutletOptions(brandKit: { categories?: { name: string; type: string; enabled?: boolean }[] } | null): string[] {
  const fromBrandKit =
    brandKit?.categories
      ?.filter((c) => c.type === 'outlet' && c.enabled !== false)
      .map((c) => c.name) ?? [];

  if (fromBrandKit.length > 0) {
    return fromBrandKit;
  }

  return ['Main Store', 'Online Shop', 'Showroom'];
}
