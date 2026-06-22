/**
 * Catalogue (Local DB) persistence via Supabase — not Firestore.
 */

import type { HighStockProduct, CategoryCount } from '../types/catalogue';
import {
  getInventoryProducts,
  upsertInventoryProducts,
  type InventoryProduct,
} from './supabase';
import {
  fetchWorkspaceSnapshotViaApi,
  upsertBrandOverviewViaApi,
} from './dataAccessApi';

export interface SiteMapLink {
  url: string;
  title?: string;
}

export function highStockToInventory(
  p: HighStockProduct,
  businessId: string,
  existingId?: string
): Partial<InventoryProduct> & { business_id: string; name: string } {
  const priceNum =
    p.price && !Number.isNaN(parseFloat(p.price.replace(/[^0-9.]/g, '')))
      ? parseFloat(p.price.replace(/[^0-9.]/g, ''))
      : undefined;

  const base = {
    business_id: businessId,
    name: p.title,
    category: p.type,
    link: p.link || undefined,
    outlet: p.outlet || undefined,
    sku: p.sku,
    stock_status: p.stockInfo || undefined,
    price: priceNum,
    ai_extracted_data: {
      priceLabel: p.price,
      categories: p.categories,
      legacyTitle: p.title,
    },
  };

  if (existingId) {
    return { ...base, id: existingId } as Partial<InventoryProduct> & { business_id: string; name: string };
  }

  return base as Partial<InventoryProduct> & { business_id: string; name: string };
}

export function inventoryToHighStock(p: InventoryProduct): HighStockProduct {
  const meta = p.ai_extracted_data || {};
  return {
    title: p.name,
    type: p.category || 'Uncategorized',
    link: p.link || '',
    stockInfo: p.stock_status || p.notes || '',
    outlet: p.outlet || '',
    sku: p.sku,
    price: meta.priceLabel || (p.price != null ? String(p.price) : undefined),
    categories: meta.categories,
  };
}

function matchKey(p: { link?: string; sku?: string; name?: string; title?: string }) {
  return (
    p.link?.toLowerCase().trim() ||
    p.sku?.toLowerCase().trim() ||
    (p.name || p.title || '').toLowerCase().trim()
  );
}

export async function fetchCatalogueProducts(businessId: string): Promise<HighStockProduct[]> {
  const rows = await getInventoryProducts(businessId);
  return rows.map(inventoryToHighStock);
}

export async function syncCatalogueProducts(
  businessId: string,
  items: HighStockProduct[]
): Promise<void> {
  if (!items.length) return;
  const existing = await getInventoryProducts(businessId);
  const byKey = new Map(existing.map((r) => [matchKey(r), r]));

  const rows = items.map((item) => {
    const key = matchKey({ ...item, name: item.title });
    const found = byKey.get(key);
    return highStockToInventory(item, businessId, found?.id);
  });

  await upsertInventoryProducts(rows);
}

export async function deleteCatalogueProduct(businessId: string, title: string): Promise<void> {
  const existing = await getInventoryProducts(businessId);
  const row = existing.find((r) => r.name === title);
  if (!row) return;
  const { supabase } = await import('./supabase');
  const { error } = await supabase.from('inventory_products').delete().eq('id', row.id);
  if (error) throw error;
}

export async function fetchCategoryCounts(businessId: string): Promise<CategoryCount[]> {
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    if (snapshot.categoryCounts?.length) {
      return snapshot.categoryCounts.map((row) => ({
        category: row.category,
        count: row.count,
      }));
    }
    const derived = snapshot.inventory.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(derived).map(([category, count]) => ({ category, count }));
  } catch (error) {
    console.warn('[fetchCategoryCounts] failed:', error);
    return [];
  }
}

export async function saveCategoryCounts(
  businessId: string,
  counts: CategoryCount[]
): Promise<void> {
  if (!counts.length) return;
  const { supabase } = await import('./supabase');
  const rows = counts.map((c) => ({
    business_id: businessId,
    category: c.category,
    count: c.count,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from('inventory_category_counts')
    .upsert(rows, { onConflict: 'business_id,category' });
  if (error) throw error;
}

export async function fetchSiteMap(businessId: string): Promise<SiteMapLink[]> {
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    const links = snapshot.inventoryMaps;
    return Array.isArray(links) ? (links as SiteMapLink[]) : [];
  } catch (error) {
    console.warn('[fetchSiteMap] failed:', error);
    return [];
  }
}

export async function saveSiteMap(businessId: string, links: SiteMapLink[]): Promise<void> {
  const { supabase } = await import('./supabase');
  const { error } = await supabase.from('inventory_maps').upsert(
    {
      business_id: businessId,
      links,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' }
  );
  if (error) throw error;
}

export async function fetchBrandOverview(businessId: string): Promise<string | null> {
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    const overview = snapshot.brandOverview;
    return typeof overview === 'string' && overview.trim() ? overview : null;
  } catch (error) {
    console.warn('[fetchBrandOverview] failed:', error);
    return null;
  }
}

export async function saveBrandOverview(businessId: string, overview: string): Promise<void> {
  await upsertBrandOverviewViaApi(businessId, overview);
}

export interface CatalogueImportState {
  crawlJobId?: string | null;
  processedCount?: number;
}

export async function fetchCatalogueImportState(
  businessId: string
): Promise<CatalogueImportState | null> {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('catalogue_import_state')
    .select('crawl_job_id, processed_count')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    crawlJobId: data.crawl_job_id,
    processedCount: data.processed_count,
  };
}

export async function saveCatalogueImportState(
  businessId: string,
  state: CatalogueImportState
): Promise<void> {
  const { supabase } = await import('./supabase');
  const { error } = await supabase.from('catalogue_import_state').upsert(
    {
      business_id: businessId,
      crawl_job_id: state.crawlJobId,
      processed_count: state.processedCount ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' }
  );
  if (error) throw error;
}

export function subscribeToCatalogue(
  businessId: string,
  onProducts: (items: HighStockProduct[]) => void,
  onCounts?: (counts: CategoryCount[]) => void
): () => void {
  let cancelled = false;

  const refresh = async () => {
    try {
      const products = await fetchCatalogueProducts(businessId);
      if (!cancelled) onProducts(products);
      if (onCounts) {
        const counts = await fetchCategoryCounts(businessId);
        if (!cancelled) onCounts(counts);
      }
    } catch (error) {
      console.warn('[subscribeToCatalogue] refresh failed:', error);
      if (!cancelled) onProducts([]);
      if (onCounts && !cancelled) onCounts([]);
    }
  };

  void refresh();
  const intervalId = window.setInterval(refresh, 15000);

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

export async function fetchBrandKitCategories(businessId: string): Promise<string[]> {
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    const doc = snapshot.categories as { categories?: Array<{ enabled?: boolean; name?: string }> } | null;
    const list = doc?.categories;
    if (!Array.isArray(list)) return [];
    return list
      .filter((c) => c.enabled !== false && c.name)
      .map((c) => c.name as string);
  } catch (error) {
    console.warn('[fetchBrandKitCategories] failed:', error);
    return [];
  }
}
