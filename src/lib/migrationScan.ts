import {
  type FirestoreExportPayload,
  type MigrationScanResult,
  type MigrationUnitId,
  type MigrationUnitScan,
  MIGRATION_UNITS,
  defaultMigrationSelection,
} from './migrationTypes';

function docCount(
  collections: Record<string, unknown[] | undefined>,
  keys: string[]
): number {
  let total = 0;
  for (const key of keys) {
    const arr = collections[key];
    if (Array.isArray(arr)) total += arr.length;
  }
  return total;
}

function businessName(data: Record<string, unknown>): string {
  return String(data.name || data.title || 'Unnamed workspace');
}

function postTitle(data: Record<string, unknown>): string {
  return String(data.title || data.caption || 'Untitled post').slice(0, 80);
}

function productName(data: Record<string, unknown>): string {
  return String(data.name || data.title || 'Product').slice(0, 60);
}

function scanUnit(
  id: MigrationUnitId,
  collections: Record<string, Array<{ id: string; data: Record<string, unknown> }>>,
  extra?: { samples?: string[]; details?: string[] }
): MigrationUnitScan {
  const meta = MIGRATION_UNITS.find((m) => m.id === id)!;
  const count = docCount(collections, meta.sourceCollections);
  return {
    id,
    count,
    available: count > 0,
    samples: extra?.samples ?? [],
    details: extra?.details ?? [],
  };
}

export function parseFirestoreExportJson(text: string): FirestoreExportPayload {
  const parsed = JSON.parse(text) as FirestoreExportPayload;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON file.');
  }
  if (!parsed.collections || typeof parsed.collections !== 'object') {
    throw new Error('Invalid Forge export — expected a top-level "collections" object.');
  }
  return parsed;
}

export function scanFirestoreExport(
  payload: FirestoreExportPayload,
  fileName?: string
): MigrationScanResult {
  const collections = payload.collections || {};
  const users = collections.users || [];
  const businesses = collections.businesses || [];
  const posts = collections.posts || [];

  const businessIds = new Set(businesses.map((b) => b.id));
  const postsByBusiness: Record<string, number> = {};
  for (const p of posts) {
    const bid = String(p.data.businessId || p.data.business_id || '');
    if (bid) postsByBusiness[bid] = (postsByBusiness[bid] || 0) + 1;
  }

  const workspaces = businesses.map((b) => ({
    id: b.id,
    name: businessName(b.data),
    industry: b.data.industry ? String(b.data.industry) : undefined,
    postCount: postsByBusiness[b.id] ?? postsByBusiness[String(b.data.id)] ?? 0,
  }));

  const userDoc = users[0]?.data;
  const ai = userDoc?.aiSettings as Record<string, unknown> | undefined;
  const aiSettingsSummary = userDoc
    ? {
        hasSystemInstructions: !!(ai?.systemInstructions && String(ai.systemInstructions).length > 10),
        hasBrandVoice: !!(ai?.brandVoice && String(ai.brandVoice).length > 3),
        hasBrandKnowledge: !!(ai?.brandKnowledge && String(ai.brandKnowledge).length > 3),
        preferredProvider: ai?.preferredProvider ? String(ai.preferredProvider) : undefined,
        targetUrl: ai?.targetUrl ? String(ai.targetUrl) : undefined,
      }
    : undefined;

  const profileDetails: string[] = [];
  if (users.length) {
    profileDetails.push(`Email: ${String(userDoc?.email || 'unknown')}`);
    if (aiSettingsSummary?.hasSystemInstructions) profileDetails.push('Custom AI system instructions');
    if (aiSettingsSummary?.hasBrandVoice) profileDetails.push('Brand voice rules');
    if (aiSettingsSummary?.hasBrandKnowledge) profileDetails.push('Brand knowledge base');
    if (aiSettingsSummary?.preferredProvider) {
      profileDetails.push(`AI provider: ${aiSettingsSummary.preferredProvider}`);
    }
  }

  const businessSamples = workspaces.slice(0, 5).map((w) => {
    const extra = w.postCount ? ` · ${w.postCount} posts` : '';
    return `${w.name}${extra}`;
  });

  const postSamples = posts.slice(0, 4).map((p) => postTitle(p.data));
  const inventoryDocs = [
    ...(collections.inventory_products || []),
    ...(collections.priority_products || []),
  ];
  const productSamples = inventoryDocs.slice(0, 3).map((p) => productName(p.data));

  const notebookBlocks = (collections.notebooks || []).reduce((sum, n) => {
    const blocks = n.data.blocks;
    return sum + (Array.isArray(blocks) ? blocks.length : 0);
  }, 0);

  const units: MigrationUnitScan[] = [
    scanUnit('profiles', collections, {
      samples: users.length ? [String(userDoc?.displayName || userDoc?.email || users[0].id)] : [],
      details: profileDetails,
    }),
    scanUnit('businesses', collections, { samples: businessSamples, details: [] }),
    scanUnit('posts', collections, { samples: postSamples }),
    scanUnit('inventory_products', collections, { samples: productSamples }),
    scanUnit('inventory_category_counts', collections),
    scanUnit('notebooks', collections, {
      details: notebookBlocks ? [`${notebookBlocks} idea blocks across ${collections.notebooks?.length || 0} notebooks`] : [],
    }),
    scanUnit('brand_kits', collections),
    scanUnit('brand_overviews', collections),
    scanUnit('categories', collections),
    scanUnit('inventory_maps', collections),
    scanUnit('short_links', collections),
    scanUnit('access_requests', collections),
  ];

  const orphanPosts = posts.filter((p) => {
    const bid = String(p.data.businessId || p.data.business_id || '');
    return bid && !businessIds.has(bid);
  }).length;
  if (orphanPosts > 0) {
    const postsUnit = units.find((u) => u.id === 'posts');
    postsUnit?.details.push(`${orphanPosts} posts reference missing workspaces (will link if workspace imported)`);
  }

  const defaultSelection = defaultMigrationSelection(units);

  return {
    valid: true,
    exportedAt: payload.exportedAt,
    firebaseProjectId: payload.firebaseProjectId,
    fileName,
    units,
    workspaces,
    aiSettingsSummary,
    defaultSelection,
  };
}

export async function scanFirestoreExportFile(file: File): Promise<MigrationScanResult> {
  const text = await file.text();
  try {
    const payload = parseFirestoreExportJson(text);
    return scanFirestoreExport(payload, file.name);
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to read export file',
      units: MIGRATION_UNITS.map((m) => ({
        id: m.id,
        count: 0,
        available: false,
        samples: [],
        details: [],
      })),
      workspaces: [],
      defaultSelection: defaultMigrationSelection([]),
    };
  }
}
