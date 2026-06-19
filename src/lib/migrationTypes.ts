export type FirestoreExportDoc = { id: string; data: Record<string, unknown> };

export type FirestoreExportPayload = {
  exportedAt?: string;
  firestoreDatabaseId?: string;
  firebaseProjectId?: string;
  counts?: Record<string, number>;
  collections?: Record<string, FirestoreExportDoc[]>;
};

/** Selectable migration units (maps to Supabase tables / migration steps). */
export type MigrationUnitId =
  | 'profiles'
  | 'businesses'
  | 'posts'
  | 'inventory_products'
  | 'inventory_category_counts'
  | 'notebooks'
  | 'brand_kits'
  | 'brand_overviews'
  | 'categories'
  | 'inventory_maps'
  | 'short_links'
  | 'access_requests';

export type MigrationSelection = Record<MigrationUnitId, boolean>;

export type MigrationUnitMeta = {
  id: MigrationUnitId;
  label: string;
  description: string;
  /** Firestore collection keys that feed this unit */
  sourceCollections: string[];
  /** Other units that should be enabled when this is selected */
  requires?: MigrationUnitId[];
  /** Recommended default when count > 0 */
  defaultSelected: boolean;
};

export const MIGRATION_UNITS: MigrationUnitMeta[] = [
  {
    id: 'profiles',
    label: 'Profile & AI settings',
    description: 'Your account, AI system instructions, brand voice, and API preferences',
    sourceCollections: ['users'],
    defaultSelected: true,
  },
  {
    id: 'businesses',
    label: 'Workspaces',
    description: 'Business workspaces, branding, sharing settings, and members',
    sourceCollections: ['businesses'],
    requires: ['profiles'],
    defaultSelected: true,
  },
  {
    id: 'posts',
    label: 'Calendar posts',
    description: 'Scheduled and draft social posts with captions and images',
    sourceCollections: ['posts'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'inventory_products',
    label: 'Product catalogue',
    description: 'Local DB products and priority items',
    sourceCollections: ['inventory_products', 'priority_products'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'inventory_category_counts',
    label: 'Category counts',
    description: 'Cached category totals for catalogue browsing',
    sourceCollections: ['inventory_category_counts'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'notebooks',
    label: 'Ideas & notebooks',
    description: 'Ideas inbox blocks and notebook content',
    sourceCollections: ['notebooks'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'brand_kits',
    label: 'Brand kits',
    description: 'Logos, colors, typography, and design guides',
    sourceCollections: ['brand_kits'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'brand_overviews',
    label: 'Brand overviews',
    description: 'High-level brand overview documents',
    sourceCollections: ['brand_overviews'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'categories',
    label: 'Category config',
    description: 'Product category lists and platform targets',
    sourceCollections: ['categories'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'inventory_maps',
    label: 'Site maps',
    description: 'Catalogue import site-map links',
    sourceCollections: ['inventory_maps'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'short_links',
    label: 'Short links',
    description: 'URL shortener entries',
    sourceCollections: ['short_links'],
    requires: ['businesses'],
    defaultSelected: true,
  },
  {
    id: 'access_requests',
    label: 'Access requests',
    description: 'Pending workspace access requests',
    sourceCollections: ['access_requests'],
    requires: ['businesses'],
    defaultSelected: false,
  },
];

export type MigrationUnitScan = {
  id: MigrationUnitId;
  count: number;
  available: boolean;
  samples: string[];
  details: string[];
};

export type MigrationScanResult = {
  valid: boolean;
  error?: string;
  exportedAt?: string;
  firebaseProjectId?: string;
  fileName?: string;
  units: MigrationUnitScan[];
  workspaces: Array<{ id: string; name: string; industry?: string; postCount?: number }>;
  aiSettingsSummary?: {
    hasSystemInstructions: boolean;
    hasBrandVoice: boolean;
    hasBrandKnowledge: boolean;
    preferredProvider?: string;
    targetUrl?: string;
  };
  defaultSelection: MigrationSelection;
};

export function defaultMigrationSelection(units: MigrationUnitScan[]): MigrationSelection {
  const selection = {} as MigrationSelection;
  for (const meta of MIGRATION_UNITS) {
    const scan = units.find((u) => u.id === meta.id);
    selection[meta.id] = !!(scan?.available && scan.count > 0 && meta.defaultSelected);
  }
  if (selection.businesses) selection.profiles = true;
  return selection;
}

export function normalizeMigrationSelection(selection: MigrationSelection): MigrationSelection {
  const next = { ...selection };
  if (next.businesses) next.profiles = true;
  for (const meta of MIGRATION_UNITS) {
    if (next[meta.id] && meta.requires) {
      for (const req of meta.requires) next[req] = true;
    }
  }
  return next;
}

export function countSelectedItems(units: MigrationUnitScan[], selection: MigrationSelection): number {
  return units.reduce((sum, u) => (selection[u.id] ? sum + u.count : sum), 0);
}
