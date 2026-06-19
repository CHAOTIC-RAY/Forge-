import {
  type FirestoreExportPayload,
  type MigrationScanResult,
  type MigrationUnitId,
  type MigrationUnitScan,
  MIGRATION_UNITS,
  defaultMigrationSelection,
} from './migrationTypes';
import { looksLikeForgeExportText } from './jsonImportDetect';

export type MigrationScanBundle = {
  scan: MigrationScanResult;
  payload: FirestoreExportPayload;
};

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function docCount(
  collections: Record<string, unknown[] | undefined>,
  keys: string[],
  counts?: Record<string, number>
): number {
  if (counts) {
    let total = 0;
    for (const key of keys) {
      if (typeof counts[key] === 'number') total += counts[key]!;
    }
    if (total > 0) return total;
  }

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
  counts?: Record<string, number>,
  extra?: { samples?: string[]; details?: string[] }
): MigrationUnitScan {
  const meta = MIGRATION_UNITS.find((m) => m.id === id)!;
  const count = docCount(collections, meta.sourceCollections, counts);
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
  const counts = payload.counts;
  const users = collections.users || [];
  const businesses = collections.businesses || [];
  const posts = collections.posts || [];

  const businessIds = new Set(businesses.map((b) => b.id));
  const postsByBusiness: Record<string, number> = {};
  const postSampleLimit = 4;
  const postSamples: string[] = [];

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const bid = String(p.data.businessId || p.data.business_id || '');
    if (bid) postsByBusiness[bid] = (postsByBusiness[bid] || 0) + 1;
    if (postSamples.length < postSampleLimit) {
      postSamples.push(postTitle(p.data));
    }
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

  const inventoryDocs = [
    ...(collections.inventory_products || []),
    ...(collections.priority_products || []),
  ];
  const productSamples = inventoryDocs.slice(0, 3).map((p) => productName(p.data));

  const notebookCount = counts?.notebooks ?? collections.notebooks?.length ?? 0;
  let notebookBlocks = 0;
  if (!counts && collections.notebooks?.length) {
    for (const n of collections.notebooks.slice(0, 20)) {
      const blocks = n.data.blocks;
      if (Array.isArray(blocks)) notebookBlocks += blocks.length;
    }
    if ((collections.notebooks?.length || 0) > 20) {
      notebookBlocks = Math.max(notebookBlocks, notebookCount * 3);
    }
  }

  const units: MigrationUnitScan[] = [
    scanUnit('profiles', collections, counts, {
      samples: users.length ? [String(userDoc?.displayName || userDoc?.email || users[0].id)] : [],
      details: profileDetails,
    }),
    scanUnit('businesses', collections, counts, { samples: businessSamples, details: [] }),
    scanUnit('posts', collections, counts, { samples: postSamples }),
    scanUnit('inventory_products', collections, counts, { samples: productSamples }),
    scanUnit('inventory_category_counts', collections, counts),
    scanUnit('notebooks', collections, counts, {
      details:
        notebookCount > 0
          ? [
              notebookBlocks
                ? `${notebookBlocks} idea blocks across ${notebookCount} notebooks`
                : `${notebookCount} notebooks`,
            ]
          : [],
    }),
    scanUnit('brand_kits', collections, counts),
    scanUnit('brand_overviews', collections, counts),
    scanUnit('categories', collections, counts),
    scanUnit('inventory_maps', collections, counts),
    scanUnit('short_links', collections, counts),
    scanUnit('access_requests', collections, counts),
  ];

  if (posts.length > 0 && posts.length <= 5000) {
    const orphanPosts = posts.filter((p) => {
      const bid = String(p.data.businessId || p.data.business_id || '');
      return bid && !businessIds.has(bid);
    }).length;
    if (orphanPosts > 0) {
      const postsUnit = units.find((u) => u.id === 'posts');
      postsUnit?.details.push(
        `${orphanPosts} posts reference missing workspaces (will link if workspace imported)`
      );
    }
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

function invalidScan(error: string, fileName?: string): MigrationScanBundle {
  return {
    payload: { collections: {} },
    scan: {
      valid: false,
      error,
      fileName,
      units: MIGRATION_UNITS.map((m) => ({
        id: m.id,
        count: 0,
        available: false,
        samples: [],
        details: [],
      })),
      workspaces: [],
      defaultSelection: defaultMigrationSelection([]),
    },
  };
}

export async function scanFirestoreExportText(
  text: string,
  fileName?: string
): Promise<MigrationScanBundle> {
  if (!text.trim()) {
    return invalidScan('File is empty.', fileName);
  }

  if (!looksLikeForgeExportText(text)) {
    return invalidScan(
      'Not a Forge account export. Choose a forge-firestore-export-*.json file, or use Restore for schedule/product backups.',
      fileName
    );
  }

  await yieldToUi();

  try {
    const payload = parseFirestoreExportJson(text);
    await yieldToUi();
    return {
      payload,
      scan: scanFirestoreExport(payload, fileName),
    };
  } catch (error) {
    return invalidScan(error instanceof Error ? error.message : 'Failed to read export file', fileName);
  }
}

export async function scanFirestoreExportFile(file: File): Promise<MigrationScanBundle> {
  const text = await file.text();
  return scanFirestoreExportText(text, file.name);
}

/** @deprecated Use scanFirestoreExportFile which returns a bundle */
export async function scanFirestoreExportFileLegacy(file: File): Promise<MigrationScanResult> {
  const bundle = await scanFirestoreExportFile(file);
  return bundle.scan;
}
