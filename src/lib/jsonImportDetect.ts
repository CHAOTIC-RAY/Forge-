export type JsonImportKind = 'forge-export' | 'schedule-backup' | 'product-backup' | 'unknown';

export function detectJsonImportKind(parsed: unknown): JsonImportKind {
  if (!parsed || typeof parsed !== 'object') return 'unknown';
  const root = parsed as Record<string, unknown>;

  if (root.collections && typeof root.collections === 'object') {
    return 'forge-export';
  }

  if (Array.isArray(root.posts)) {
    return 'schedule-backup';
  }

  if (Array.isArray(root.products) || Array.isArray(root.categoryCounts)) {
    return 'product-backup';
  }

  return 'unknown';
}

export function looksLikeForgeExportText(text: string): boolean {
  const head = text.slice(0, 4096);
  return head.includes('"collections"') && (head.includes('"exportedAt"') || head.includes('"firebaseProjectId"'));
}
