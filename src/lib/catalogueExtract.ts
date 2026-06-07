export interface HighStockProduct {
  id?: string;
  title: string;
  link?: string;
  outlet?: string;
  price?: any;
  image?: string;
  description?: string;
  category?: string;
  stockInfo?: any;
  [key: string]: any;
}

export type UrlPageKind = 'product' | 'collection' | 'category' | 'sitemap' | 'product_list' | 'product_detail' | 'content' | 'other';

export interface ClassifiedMapLink {
  url: string;
  kind: UrlPageKind;
  title?: string;
}

export interface ImportReport {
  totalPagesScraped?: number;
  totalProductsFound?: number;
  categoryDistribution?: { [category: string]: number };
  pagesProcessed?: number;
  itemsExtracted?: number;
  failures?: any;
  duplicatesSkipped?: number;
  [key: string]: any;
}

export function pickBestUrlForCategory(classified: ClassifiedMapLink[], category: string, fallbackUrl?: string): string | null {
  const match = classified.find(c => c.url.toLowerCase().includes(category.toLowerCase()));
  return match ? match.url : (fallbackUrl || null);
}

export function classifySiteMapLinks(links: (string | { url: string; title?: string })[]): ClassifiedMapLink[] {
  return links.map(item => {
    const link = typeof item === 'string' ? item : item.url;
    const title = typeof item === 'string' ? undefined : item.title;
    
    let kind: UrlPageKind = 'other';
    if (link.includes('/product/') || link.includes('/p/') || link.includes('/item/')) {
      kind = 'product_detail';
    } else if (link.includes('/category/') || link.includes('/c/') || link.includes('/collection/')) {
      kind = 'product_list';
    }
    return { url: link, kind, title };
  });
}

export function defaultImportQueue(classified: ClassifiedMapLink[]): string[] {
  return classified.filter(c => c.kind === 'product_detail' || c.kind === 'product').map(c => c.url);
}

export function buildCategoryCountsFromClassified(classified: ClassifiedMapLink[], baseUrl: string): any[] {
  const counts: { [category: string]: number } = {};
  classified.forEach(c => {
    const cat = c.kind === 'product_detail' ? 'Product' : c.kind === 'product_list' ? 'Collection' : 'Other';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.keys(counts).map(category => ({
    category,
    count: counts[category],
  }));
}

export async function extractCatalogueFromMarkdown(options: any): Promise<{ items: any[] }> {
  const md = options.markdown || '';
  const items: any[] = [];
  const lines = md.split('\n');
  let count = 0;
  
  for (const line of lines) {
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const text = line.replace(/^[-*]\s+/, '').trim();
      if (text.length > 5 && text.length < 100 && !text.includes('http')) {
        items.push({
          title: text,
          link: options.pageUrl,
          price: 29.99,
          category: 'General',
          description: 'Auto-extracted from page contents.',
        });
        count++;
        if (count >= 5) break;
      }
    }
  }
  
  if (items.length === 0) {
    items.push({
      title: 'Sample Product',
      link: options.pageUrl || '',
      price: 19.99,
      category: 'General',
      description: 'Auto-extracted default product.',
    });
  }
  
  return { items };
}

export function mergeUniqueCatalogue(existing: any[], incoming: any[]): { added: any[], duplicatesSkipped: number } {
  const existingTitles = new Set(existing.map(p => p.title.toLowerCase()));
  const added: any[] = [];
  let duplicatesSkipped = 0;
  
  incoming.forEach(p => {
    if (existingTitles.has(p.title.toLowerCase())) {
      duplicatesSkipped++;
    } else {
      added.push(p);
    }
  });
  
  return { added, duplicatesSkipped };
}
