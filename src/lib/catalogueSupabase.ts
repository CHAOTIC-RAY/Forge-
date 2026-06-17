/**
 * Catalogue (Local DB) persistence via Supabase — not Firestore.
 */

import type { HighStockProduct, CategoryCount } from '../types/catalogue';
import {
  supabase,
  getInventoryProducts,
  upsertInventoryProducts,
  type InventoryProduct,
} from './supabase';

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

  return {
    id: existingId,
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
  const { error } = await supabase.from('inventory_products').delete().eq('id', row.id);
  if (error) throw error;
}

export async function fetchCategoryCounts(businessId: string): Promise<CategoryCount[]> {
  const { data, error } = await supabase
    .from('inventory_category_counts')
    .select('category, count')
    .eq('business_id', businessId);
  if (error) throw error;
  return (data || []).map((r) => ({ category: r.category, count: r.count }));
}

export async function saveCategoryCounts(
  businessId: string,
  counts: CategoryCount[]
): Promise<void> {
  if (!counts.length) return;
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
  const { data, error } = await supabase
    .from('inventory_maps')
    .select('links')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  return (data?.links as SiteMapLink[]) || [];
}

export async function saveSiteMap(businessId: string, links: SiteMapLink[]): Promise<void> {
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
  const { data, error } = await supabase
    .from('brand_overviews')
    .select('overview')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  return data?.overview || null;
}

export async function saveBrandOverview(businessId: string, overview: string): Promise<void> {
  const { error } = await supabase.from('brand_overviews').upsert(
    {
      business_id: businessId,
      overview,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' }
  );
  if (error) throw error;
}

export interface CatalogueImportState {
  crawlJobId?: string | null;
  processedCount?: number;
}

export async function fetchCatalogueImportState(
  businessId: string
): Promise<CatalogueImportState | null> {
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
  const channel = supabase
    .channel(`catalogue:${businessId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_products', filter: `business_id=eq.${businessId}` },
      async () => onProducts(await fetchCatalogueProducts(businessId))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_category_counts', filter: `business_id=eq.${businessId}` },
      async () => {
        if (onCounts) onCounts(await fetchCategoryCounts(businessId));
      }
    )
    .subscribe();

  void fetchCatalogueProducts(businessId).then(onProducts);
  if (onCounts) void fetchCategoryCounts(businessId).then(onCounts);

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchBrandKitCategories(businessId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('categories')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  const list = data?.categories;
  if (!Array.isArray(list)) return [];
  return list
    .filter((c: { enabled?: boolean; name?: string }) => c.enabled !== false && c.name)
    .map((c: { name: string }) => c.name);
}
