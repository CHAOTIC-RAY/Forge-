import { collection, getDocs, Firestore } from 'firebase/firestore';
import { firestoreEntityId, isUuid } from './firestoreMigrateIds';

export interface MigrationProgress {
  stage: string;
  count: number;
  total?: number;
}

export interface MigrationResult {
  counts: Record<string, number>;
}

interface MigrationContext {
  profileByFirebaseUid: Map<string, string>;
  profileByRawId: Map<string, string>;
}

function registerProfile(
  ctx: MigrationContext,
  profileId: string,
  firebaseUid: string,
  rawDocId: string
): void {
  ctx.profileByFirebaseUid.set(firebaseUid, profileId);
  ctx.profileByRawId.set(profileId, profileId);
  ctx.profileByRawId.set(firebaseUid, profileId);
  ctx.profileByRawId.set(rawDocId, profileId);
}

async function fetchExistingProfiles(getToken: () => Promise<string>): Promise<Map<string, string>> {
  const token = await getToken();
  const response = await fetch('/api/migrate/prefetch-profiles', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to prefetch profiles (${response.status})`);
  }
  const body = (await response.json()) as { profiles?: Array<{ id: string; firebase_uid: string }> };
  const map = new Map<string, string>();
  for (const profile of body.profiles || []) {
    map.set(profile.firebase_uid, profile.id);
  }
  return map;
}

function asIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const obj = value as { toDate?: () => Date; seconds?: number };
    if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
    if (typeof obj.seconds === 'number') return new Date(obj.seconds * 1000).toISOString();
  }
  return undefined;
}

function asDateOnly(value: unknown): string | undefined {
  const iso = asIso(value);
  return iso ? iso.split('T')[0] : typeof value === 'string' ? value.split('T')[0] : undefined;
}

async function readCollection(db: Firestore, name: string): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data() as Record<string, unknown>,
  }));
}

async function sendBatch(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string | undefined,
  getToken: () => Promise<string>
): Promise<number> {
  if (!rows.length) return 0;

  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const token = await getToken();
    const response = await fetch('/api/migrate/supabase-batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ table, rows: chunk, onConflict }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Failed to migrate ${table} (${response.status})`);
    }
    inserted += chunk.length;
  }
  return inserted;
}

function resolveProfileId(rawId: string | undefined, ctx: MigrationContext): string | null {
  if (!rawId) return null;
  if (ctx.profileByRawId.has(rawId)) return ctx.profileByRawId.get(rawId)!;
  if (ctx.profileByFirebaseUid.has(rawId)) return ctx.profileByFirebaseUid.get(rawId)!;
  return null;
}

function resolveBusinessId(rawId: string | undefined): string | null {
  return firestoreEntityId('business', rawId);
}

function filterByValidBusinessId(
  rows: Record<string, unknown>[],
  validBusinessIds: Set<string>
): Record<string, unknown>[] {
  return rows.filter((row) => {
    const businessId = row.business_id as string | null | undefined;
    return !businessId || validBusinessIds.has(businessId);
  });
}

function nullifyInvalidBusinessId(
  rows: Record<string, unknown>[],
  validBusinessIds: Set<string>
): Record<string, unknown>[] {
  return rows.map((row) => {
    const businessId = row.business_id as string | null | undefined;
    if (businessId && !validBusinessIds.has(businessId)) {
      return { ...row, business_id: null };
    }
    return row;
  });
}

function buildProfiles(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  existingByFirebaseUid: Map<string, string>
): {
  rows: Record<string, unknown>[];
  ctx: MigrationContext;
} {
  const ctx: MigrationContext = {
    profileByFirebaseUid: new Map(existingByFirebaseUid),
    profileByRawId: new Map(),
  };

  for (const [firebaseUid, profileId] of existingByFirebaseUid) {
    registerProfile(ctx, profileId, firebaseUid, firebaseUid);
  }

  const rows = docs.map(({ id, data }) => {
    const firebaseUid = String(data.firebaseUid || data.uid || data.userId || id);
    const existingId = existingByFirebaseUid.get(firebaseUid);
    const profileId =
      existingId ||
      (isUuid(String(data.id || ''))
        ? String(data.id)
        : isUuid(id)
          ? id
          : firestoreEntityId('profile', firebaseUid)!);

    registerProfile(ctx, profileId, firebaseUid, id);

    return {
      id: profileId,
      firebase_uid: firebaseUid,
      email: String(data.email || data.userEmail || ''),
      display_name: (data.displayName || data.userName || data.name || null) as string | null,
      photo_url: (data.photoURL || data.photoUrl || null) as string | null,
      settings: data.settings || {},
      theme_preset: (data.themePreset as string) || null,
      ai_settings: data.aiSettings || data.ai_settings || {},
      created_at: asIso(data.createdAt) || new Date().toISOString(),
      updated_at: asIso(data.updatedAt) || new Date().toISOString(),
    };
  });

  return { rows, ctx };
}

function buildBusinesses(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  ctx: MigrationContext
): Record<string, unknown>[] {
  return docs.map(({ id, data }) => {
    const ownerRaw = String(data.ownerId || data.owner_id || '');
    const ownerId = resolveProfileId(ownerRaw, ctx);
    const rawBusinessId = String(data.id || id);
    return {
      id: firestoreEntityId('business', rawBusinessId)!,
      name: String(data.name || 'Workspace'),
      owner_id: ownerId,
      description: data.description || null,
      industry: data.industry || null,
      position: data.position || null,
      target_url: data.targetUrl || data.target_url || null,
      brand_colors: data.brandColors || data.brand_colors || {},
      logo_url: data.logoUrl || data.logo_url || null,
      theme_preset: data.themePreset || data.theme_preset || null,
      status: data.status || 'active',
      share_token: data.shareToken || data.share_token || null,
      share_short_code: data.shareShortCode || data.share_short_code || null,
      share_restriction: data.shareRestriction || data.share_restriction || 'guest',
      share_password: data.sharePassword || data.share_password || null,
      share_expires_at: asIso(data.shareExpiresAt || data.share_expires_at) || null,
      share_filters: data.shareFilters || data.share_filters || {},
      share_analytics: data.shareAnalytics || data.share_analytics || { views: 0 },
      onedrive_credentials: data.oneDriveCredentials || data.onedrive_credentials || null,
      applets: data.applets || [],
      applet_data: data.appletData || data.applet_data || {},
      created_at: asIso(data.createdAt || data.created_at) || new Date().toISOString(),
      updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
    };
  });
}

function buildBusinessMembers(
  businessDocs: Array<{ id: string; data: Record<string, unknown> }>,
  ctx: MigrationContext
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (const { id, data } of businessDocs) {
    const businessId = firestoreEntityId('business', String(data.id || id))!;
    const members = (data.members as string[] | undefined) || [];
    const memberRoles = (data.memberRoles as Record<string, string> | undefined) || {};

    for (const memberUid of members) {
      const profileId = resolveProfileId(memberUid, ctx);
      if (!profileId) continue;
      const key = `${businessId}:${profileId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        business_id: businessId,
        profile_id: profileId,
        role: memberRoles[memberUid] || 'viewer',
        joined_at: asIso(data.updatedAt || data.createdAt) || new Date().toISOString(),
      });
    }
  }

  return rows;
}

function buildPosts(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  ctx: MigrationContext
): Record<string, unknown>[] {
  return docs.map(({ id, data }) => {
    const businessId = resolveBusinessId(String(data.businessId || data.business_id || ''));
    const userRaw = String(data.userId || data.user_id || data.profileId || data.profile_id || '');
    const rawPostId = String(data.id || id);
    return {
      id: firestoreEntityId('post', rawPostId)!,
      business_id: businessId,
      profile_id: resolveProfileId(userRaw, ctx),
      date: asDateOnly(data.date) || new Date().toISOString().split('T')[0],
      outlet: data.outlet || null,
      product_category: data.productCategory || data.product_category || null,
      type: data.type || null,
      title: data.title || null,
      brief: data.brief || null,
      caption: data.caption || null,
      hashtags: data.hashtags || null,
      images: data.images || [],
      link: data.link || null,
      publish_status: data.publishStatus || data.status || data.publish_status || 'draft',
      scheduled_time: asIso(data.scheduledTime || data.scheduled_time) || null,
      published_at: asIso(data.publishedAt || data.published_at) || null,
      instagram_post_id: data.instagramPostId || data.instagram_post_id || null,
      facebook_post_id: data.facebookPostId || data.facebook_post_id || null,
      publish_error: data.publishError || data.publish_error || null,
      platforms: data.platforms || [],
      is_ai_generated: data.isAiGenerated ?? data.is_ai_generated ?? false,
      ai_provider: data.aiProvider || data.ai_provider || null,
      framework: data.framework || null,
      campaign_type: data.campaignType || data.campaign_type || null,
      campaign_name: data.campaignName || data.campaign_name || null,
      content_formats: data.contentFormats || data.content_formats || [],
      approval_status: data.approvalStatus || data.approval_status || 'draft',
      approval_note: data.approvalNote || data.approval_note || null,
      submitted_at: asIso(data.submittedAt || data.submitted_at) || null,
      reviewed_at: asIso(data.reviewedAt || data.reviewed_at) || null,
      repeat_enabled: data.repeatEnabled ?? data.repeat_enabled ?? false,
      repeat_interval: data.repeatInterval || data.repeat_interval || null,
      last_repeat_date: asDateOnly(data.lastRepeatDate || data.last_repeat_date) || null,
      analytics: data.analytics || {},
      postcard_data: data.postcardData || data.postcard_data || null,
      is_hidden_for_others: data.isHiddenForOthers ?? data.is_hidden_for_others ?? false,
      created_at: asIso(data.createdAt || data.created_at) || new Date().toISOString(),
      updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
    };
  });
}

function buildInventoryProducts(docs: Array<{ id: string; data: Record<string, unknown> }>): Record<string, unknown>[] {
  return docs.map(({ id, data }) => {
    const priceRaw = data.price;
    const priceNum =
      typeof priceRaw === 'number'
        ? priceRaw
        : typeof priceRaw === 'string'
          ? parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || null
          : null;

    return {
      id: firestoreEntityId('inventory_product', String(data.id || id))!,
      business_id: resolveBusinessId(String(data.businessId || data.business_id || '')),
      name: data.name || data.title || 'Product',
      sku: data.sku || null,
      category: data.category || data.type || null,
      subcategory: data.subcategory || null,
      price: priceNum,
      outlet: data.outlet || null,
      description: data.description || null,
      link: data.link || null,
      image_url: data.imageUrl || data.image_url || null,
      priority: data.priority || 'medium',
      notes: data.notes || data.stockInfo || null,
      stock_status: data.stockStatus || data.stock_status || data.stockInfo || 'in_stock',
      stock_count: data.stockCount ?? data.stock_count ?? null,
      ai_extracted_data: data.aiExtractedData || data.ai_extracted_data || {},
      created_at: asIso(data.createdAt || data.created_at) || new Date().toISOString(),
      updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
    };
  });
}

function buildCategoryCounts(docs: Array<{ id: string; data: Record<string, unknown> }>): Record<string, unknown>[] {
  return docs.map(({ id, data }) => ({
    business_id: resolveBusinessId(String(data.businessId || data.business_id || id)),
    category: data.category || data.name || 'Uncategorized',
    count: data.count ?? 0,
    updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
  }));
}

function buildNotebooks(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  ctx: MigrationContext
): Record<string, unknown>[] {
  return docs.map(({ id, data }) => {
    const businessId = resolveBusinessId(String(data.businessId || data.business_id || ''));
    const userRaw = String(data.userId || data.user_id || data.profileId || data.profile_id || '');
    return {
      id: firestoreEntityId('notebook', String(data.id || id))!,
      business_id: businessId,
      profile_id: resolveProfileId(userRaw, ctx),
      title: data.title || 'Ideas',
      blocks: data.blocks || [],
      links: data.links || [],
      folders: data.folders || [],
      created_at: asIso(data.createdAt || data.created_at) || new Date().toISOString(),
      updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
    };
  });
}

function buildBrandKits(docs: Array<{ id: string; data: Record<string, unknown> }>): Record<string, unknown>[] {
  return docs.map(({ id, data }) => ({
    business_id: resolveBusinessId(String(data.businessId || data.business_id || id)),
    logo_url: data.logoUrl || data.logo_url || null,
    secondary_logo_url: data.secondaryLogoUrl || data.secondary_logo_url || null,
    brand_colors: data.brandColors || data.brand_colors || {},
    typography: data.typography || {},
    brand_voice: data.brandVoice || data.brand_voice || null,
    tone_keywords: data.toneKeywords || data.tone_keywords || [],
    do_words: data.doWords || data.do_words || [],
    dont_words: data.dontWords || data.dont_words || [],
    design_rules: data.designRules || data.design_rules || {},
    ai_generated_guide: data.aiGeneratedGuide || data.ai_generated_guide || null,
    kit_data: data.kitData || data.kit_data || data,
    created_at: asIso(data.createdAt || data.created_at) || new Date().toISOString(),
    updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
  }));
}

function buildBrandOverviews(docs: Array<{ id: string; data: Record<string, unknown> }>): Record<string, unknown>[] {
  return docs.map(({ id, data }) => ({
    business_id: resolveBusinessId(String(data.businessId || data.business_id || id)),
    overview: data.overview || data.text || null,
    updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
  }));
}

function buildCategories(docs: Array<{ id: string; data: Record<string, unknown> }>): Record<string, unknown>[] {
  return docs.map(({ id, data }) => ({
    business_id: resolveBusinessId(String(data.businessId || data.business_id || id)),
    categories: data.categories || [],
    target_platforms: data.targetPlatforms || data.target_platforms || [],
    titles: data.titles || {},
    updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
  }));
}

function buildInventoryMaps(docs: Array<{ id: string; data: Record<string, unknown> }>): Record<string, unknown>[] {
  return docs.map(({ id, data }) => ({
    business_id: resolveBusinessId(String(data.businessId || data.business_id || id)),
    links: data.links || [],
    updated_at: asIso(data.updatedAt || data.updated_at) || new Date().toISOString(),
  }));
}

function buildShortLinks(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  ctx: MigrationContext
): Record<string, unknown>[] {
  return docs.map(({ id, data }) => {
    const userRaw = String(data.userId || data.user_id || data.profileId || data.profile_id || '');
    return {
      id: firestoreEntityId('short_link', String(data.id || id))!,
      business_id: resolveBusinessId(String(data.businessId || data.business_id || '')),
      profile_id: resolveProfileId(userRaw, ctx),
      short_code: data.shortCode || data.short_code || id,
      original_url: data.originalUrl || data.original_url || data.url || '',
      title: data.title || null,
      clicks: data.clicks ?? 0,
      last_clicked_at: asIso(data.lastClickedAt || data.last_clicked_at) || null,
      created_at: asIso(data.createdAt || data.created_at) || new Date().toISOString(),
      expires_at: asIso(data.expiresAt || data.expires_at) || null,
    };
  });
}

function buildAccessRequests(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  ctx: MigrationContext
): Record<string, unknown>[] {
  return docs.map(({ id, data }) => {
    const userRaw = String(data.userId || data.user_id || '');
    return {
      id: firestoreEntityId('access_request', String(data.id || id))!,
      business_id: resolveBusinessId(String(data.businessId || data.business_id || '')),
      profile_id: resolveProfileId(userRaw, ctx),
      status: data.status || 'pending',
      requested_role: data.requestedRole || data.requested_role || 'viewer',
      message: data.message || data.userEmail || null,
      reviewed_at: asIso(data.reviewedAt || data.reviewed_at) || null,
      created_at: asIso(data.createdAt || data.created_at) || new Date().toISOString(),
    };
  });
}

const FIRESTORE_COLLECTIONS = [
  'users',
  'businesses',
  'posts',
  'inventory_products',
  'priority_products',
  'inventory_category_counts',
  'notebooks',
  'brand_kits',
  'brand_overviews',
  'categories',
  'inventory_maps',
  'short_links',
  'access_requests',
] as const;

export async function migrateFirestoreToSupabase(
  db: Firestore,
  getFirebaseIdToken: () => Promise<string>,
  onProgress?: (progress: MigrationProgress) => void,
  currentUser?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  }
): Promise<MigrationResult> {
  const counts: Record<string, number> = {};
  const raw: Partial<Record<string, Array<{ id: string; data: Record<string, unknown> }>>> = {};

  for (const name of FIRESTORE_COLLECTIONS) {
    onProgress?.({ stage: `Reading ${name}`, count: 0 });
    try {
      raw[name] = await readCollection(db, name);
      counts[`read:${name}`] = raw[name]!.length;
    } catch {
      raw[name] = [];
      counts[`read:${name}`] = 0;
    }
  }

  const inventoryDocs = [
    ...(raw.inventory_products || []),
    ...(raw.priority_products || []).map((doc) => ({
      ...doc,
      data: { ...doc.data, priority: doc.data.priority || 'high' },
    })),
  ];

  const existingByFirebaseUid = await fetchExistingProfiles(getFirebaseIdToken);
  onProgress?.({ stage: 'Loading existing Supabase profiles', count: existingByFirebaseUid.size });

  const { rows: profileRows, ctx } = buildProfiles(raw.users || [], existingByFirebaseUid);

  if (currentUser && !ctx.profileByFirebaseUid.has(currentUser.uid)) {
    const profileId = firestoreEntityId('profile', currentUser.uid)!;
    profileRows.push({
      id: profileId,
      firebase_uid: currentUser.uid,
      email: currentUser.email || '',
      display_name: currentUser.displayName || null,
      photo_url: currentUser.photoURL || null,
      settings: {},
      theme_preset: null,
      ai_settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    registerProfile(ctx, profileId, currentUser.uid, currentUser.uid);
  }
  onProgress?.({ stage: 'Migrating profiles', count: 0 });
  counts.profiles = await sendBatch('profiles', profileRows, 'firebase_uid', getFirebaseIdToken);

  const businessRows = buildBusinesses(raw.businesses || [], ctx);
  onProgress?.({ stage: 'Migrating businesses', count: 0 });
  counts.businesses = await sendBatch('businesses', businessRows, 'id', getFirebaseIdToken);

  const validBusinessIds = new Set(businessRows.map((row) => String(row.id)));

  const memberRows = filterByValidBusinessId(
    buildBusinessMembers(raw.businesses || [], ctx),
    validBusinessIds
  );
  onProgress?.({ stage: 'Migrating business members', count: 0 });
  counts.business_members = await sendBatch('business_members', memberRows, 'business_id,profile_id', getFirebaseIdToken);

  const postRows = nullifyInvalidBusinessId(buildPosts(raw.posts || [], ctx), validBusinessIds);
  onProgress?.({ stage: 'Migrating posts', count: 0 });
  counts.posts = await sendBatch('posts', postRows, 'id', getFirebaseIdToken);

  const inventoryRows = nullifyInvalidBusinessId(buildInventoryProducts(inventoryDocs), validBusinessIds);
  onProgress?.({ stage: 'Migrating inventory', count: 0 });
  counts.inventory_products = await sendBatch('inventory_products', inventoryRows, 'id', getFirebaseIdToken);

  const categoryCountRows = filterByValidBusinessId(
    buildCategoryCounts(raw.inventory_category_counts || []),
    validBusinessIds
  );
  onProgress?.({ stage: 'Migrating category counts', count: 0 });
  counts.inventory_category_counts = await sendBatch(
    'inventory_category_counts',
    categoryCountRows,
    'business_id,category',
    getFirebaseIdToken
  );

  const notebookRows = nullifyInvalidBusinessId(buildNotebooks(raw.notebooks || [], ctx), validBusinessIds);
  onProgress?.({ stage: 'Migrating notebooks', count: 0 });
  counts.notebooks = await sendBatch('notebooks', notebookRows, 'id', getFirebaseIdToken);

  const brandKitRows = filterByValidBusinessId(buildBrandKits(raw.brand_kits || []), validBusinessIds);
  onProgress?.({ stage: 'Migrating brand kits', count: 0 });
  counts.brand_kits = await sendBatch('brand_kits', brandKitRows, 'business_id', getFirebaseIdToken);

  const brandOverviewRows = filterByValidBusinessId(
    buildBrandOverviews(raw.brand_overviews || []),
    validBusinessIds
  );
  onProgress?.({ stage: 'Migrating brand overviews', count: 0 });
  counts.brand_overviews = await sendBatch('brand_overviews', brandOverviewRows, 'business_id', getFirebaseIdToken);

  const categoryRows = filterByValidBusinessId(buildCategories(raw.categories || []), validBusinessIds);
  onProgress?.({ stage: 'Migrating categories', count: 0 });
  counts.categories = await sendBatch('categories', categoryRows, 'business_id', getFirebaseIdToken);

  const mapRows = filterByValidBusinessId(buildInventoryMaps(raw.inventory_maps || []), validBusinessIds);
  onProgress?.({ stage: 'Migrating inventory maps', count: 0 });
  counts.inventory_maps = await sendBatch('inventory_maps', mapRows, 'business_id', getFirebaseIdToken);

  const shortLinkRows = nullifyInvalidBusinessId(buildShortLinks(raw.short_links || [], ctx), validBusinessIds);
  onProgress?.({ stage: 'Migrating short links', count: 0 });
  counts.short_links = await sendBatch('short_links', shortLinkRows, 'short_code', getFirebaseIdToken);

  const accessRequestRows = nullifyInvalidBusinessId(
    buildAccessRequests(raw.access_requests || [], ctx),
    validBusinessIds
  );
  onProgress?.({ stage: 'Migrating access requests', count: 0 });
  counts.access_requests = await sendBatch('access_requests', accessRequestRows, 'id', getFirebaseIdToken);

  return { counts };
}
