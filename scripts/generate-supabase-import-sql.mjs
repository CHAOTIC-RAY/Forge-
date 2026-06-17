#!/usr/bin/env node
/**
 * Generate Supabase SQL from a Forge Firestore JSON export.
 * Usage: node scripts/generate-supabase-import-sql.mjs path/to/export.json > import.sql
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { v5 as uuidv5, validate as uuidValidate } from 'uuid';

const FORGE_MIGRATE_NS = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FIREBASE_UID = 'WR31B3zXQ7Sla6Pb28sOtTatREu2';

function entityId(scope, rawId) {
  if (!rawId) return null;
  if (uuidValidate(String(rawId))) return String(rawId);
  return uuidv5(`${scope}:${rawId}`, FORGE_MIGRATE_NS);
}

function sqlStr(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function sqlTextArray(arr) {
  if (!Array.isArray(arr) || !arr.length) return "'{}'::text[]";
  const items = arr.map((v) => sqlStr(String(v))).join(', ');
  return `ARRAY[${items}]::text[]`;
}

function asIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return null;
}

function asDateOnly(value) {
  const iso = asIso(value);
  return iso ? iso.split('T')[0] : typeof value === 'string' ? value.split('T')[0] : null;
}

function profileSubquery() {
  return `(SELECT id FROM profiles WHERE firebase_uid = ${sqlStr(FIREBASE_UID)} LIMIT 1)`;
}

function businessId(raw) {
  return sqlStr(entityId('business', raw));
}

function scopedId(scope, rawId) {
  return sqlStr(entityId(scope, rawId));
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/generate-supabase-import-sql.mjs <export.json> [output.sql]');
  process.exit(1);
}

const exportData = JSON.parse(readFileSync(inputPath, 'utf8'));
const collections = exportData.collections || {};
const profileId = entityId('profile', FIREBASE_UID);

const lines = [];
lines.push('-- Forge Firestore export → Supabase import');
lines.push(`-- Generated from: ${inputPath}`);
lines.push(`-- Export date: ${exportData.exportedAt || 'unknown'}`);
lines.push('BEGIN;');
lines.push('');

// Profile
for (const { id, data } of collections.users || []) {
  const firebaseUid = String(data.uid || data.firebaseUid || data.userId || id);
  lines.push('-- profiles');
  lines.push(`INSERT INTO profiles (id, firebase_uid, email, display_name, photo_url, settings, ai_settings, created_at, updated_at)`);
  lines.push(`VALUES (`);
  lines.push(`  ${sqlStr(profileId)},`);
  lines.push(`  ${sqlStr(firebaseUid)},`);
  lines.push(`  ${sqlStr(data.email || data.userEmail || '')},`);
  lines.push(`  ${sqlStr(data.displayName || data.userName || data.name || null)},`);
  lines.push(`  ${sqlStr(data.photoURL || data.photoUrl || null)},`);
  lines.push(`  ${sqlJson(data.settings || {})},`);
  lines.push(`  ${sqlJson(data.aiSettings || data.ai_settings || {})},`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt))}::timestamptz, now()),`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.updatedAt))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (firebase_uid) DO UPDATE SET`);
  lines.push(`  email = EXCLUDED.email,`);
  lines.push(`  display_name = EXCLUDED.display_name,`);
  lines.push(`  photo_url = EXCLUDED.photo_url,`);
  lines.push(`  ai_settings = EXCLUDED.ai_settings,`);
  lines.push(`  updated_at = EXCLUDED.updated_at;`);
  lines.push('');
}

// Businesses
lines.push('-- businesses');
for (const { id, data } of collections.businesses || []) {
  const rawId = String(data.id || id);
  lines.push(`INSERT INTO businesses (`);
  lines.push(`  id, name, owner_id, description, industry, position, target_url, brand_colors, logo_url,`);
  lines.push(`  status, share_token, share_short_code, share_restriction, share_analytics, created_at, updated_at`);
  lines.push(`) VALUES (`);
  lines.push(`  ${sqlStr(rawId)},`);
  lines.push(`  ${sqlStr(data.name || 'Workspace')},`);
  lines.push(`  ${profileSubquery()},`);
  lines.push(`  ${sqlStr(data.description || null)},`);
  lines.push(`  ${sqlStr(data.industry || null)},`);
  lines.push(`  ${sqlStr(data.position || null)},`);
  lines.push(`  ${sqlStr(data.targetUrl || data.target_url || null)},`);
  lines.push(`  ${sqlJson(data.brandColors || data.brand_colors || {})},`);
  lines.push(`  ${sqlStr(data.logoUrl || data.logo_url || null)},`);
  lines.push(`  ${sqlStr(data.status || 'active')},`);
  lines.push(`  ${sqlStr(data.shareToken || data.share_token || null)},`);
  lines.push(`  ${sqlStr(data.shareShortCode || data.share_short_code || null)},`);
  lines.push(`  ${sqlStr(data.shareRestriction || data.share_restriction || 'guest')},`);
  lines.push(`  ${sqlJson(data.shareAnalytics || data.share_analytics || { views: 0 })},`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt || data.created_at))}::timestamptz, now()),`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.updatedAt || data.updated_at))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`  name = EXCLUDED.name, owner_id = EXCLUDED.owner_id, industry = EXCLUDED.industry,`);
  lines.push(`  share_token = EXCLUDED.share_token, share_short_code = EXCLUDED.share_short_code,`);
  lines.push(`  updated_at = EXCLUDED.updated_at;`);
}

lines.push('');

// Business members
lines.push('-- business_members');
for (const { id, data } of collections.businesses || []) {
  const businessIdVal = sqlStr(String(data.id || id));
  const members = data.members || [];
  const roles = data.memberRoles || data.member_roles || {};
  for (const memberUid of members) {
    lines.push(`INSERT INTO business_members (business_id, profile_id, role, joined_at)`);
    lines.push(`VALUES (${businessIdVal}, ${profileSubquery()}, ${sqlStr(roles[memberUid] || 'editor')}, now())`);
    lines.push(`ON CONFLICT (business_id, profile_id) DO UPDATE SET role = EXCLUDED.role;`);
  }
}

lines.push('');

// Posts
lines.push('-- posts');
for (const { id, data } of collections.posts || []) {
  const rawPostId = String(data.id || id);
  const biz = data.businessId || data.business_id;
  lines.push(`INSERT INTO posts (`);
  lines.push(`  id, business_id, profile_id, date, outlet, type, title, brief, caption, hashtags, images,`);
  lines.push(`  publish_status, platforms, content_formats, approval_status, is_ai_generated, campaign_type, analytics, created_at, updated_at`);
  lines.push(`) VALUES (`);
  lines.push(`  ${scopedId('post', rawPostId)},`);
  lines.push(`  ${biz ? businessId(biz) : 'NULL'},`);
  lines.push(`  ${profileSubquery()},`);
  lines.push(`  ${sqlStr(asDateOnly(data.date) || new Date().toISOString().split('T')[0])},`);
  lines.push(`  ${sqlStr(data.outlet || null)},`);
  lines.push(`  ${sqlStr(data.type || null)},`);
  lines.push(`  ${sqlStr(data.title || null)},`);
  lines.push(`  ${sqlStr(data.brief || null)},`);
  lines.push(`  ${sqlStr(data.caption || null)},`);
  lines.push(`  ${sqlStr(data.hashtags || null)},`);
  lines.push(`  ${sqlTextArray(data.images || [])},`);
  lines.push(`  ${sqlStr(data.publishStatus || data.status || data.publish_status || 'draft')},`);
  lines.push(`  ${sqlTextArray(data.platforms || [])},`);
  lines.push(`  ${sqlTextArray(data.contentFormats || data.content_formats || [])},`);
  lines.push(`  ${sqlStr(data.approvalStatus || data.approval_status || 'draft')},`);
  lines.push(`  ${data.isAiGenerated ?? data.is_ai_generated ?? false},`);
  lines.push(`  ${sqlStr(data.campaignType || data.campaign_type || null)},`);
  lines.push(`  ${sqlJson(data.analytics || {})},`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt || data.created_at))}::timestamptz, now()),`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.updatedAt || data.updated_at))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`  caption = EXCLUDED.caption, title = EXCLUDED.title, images = EXCLUDED.images, updated_at = EXCLUDED.updated_at;`);
}

lines.push('');

// Inventory
const inventoryDocs = [
  ...(collections.inventory_products || []),
  ...(collections.priority_products || []).map((doc) => ({
    ...doc,
    data: { ...doc.data, priority: doc.data.priority || 'high' },
  })),
];

lines.push('-- inventory_products');
for (const { id, data } of inventoryDocs) {
  const rawId = String(data.id || id);
  const biz = data.businessId || data.business_id;
  const priceRaw = data.price;
  const priceNum =
    typeof priceRaw === 'number'
      ? priceRaw
      : typeof priceRaw === 'string'
        ? parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || null
        : null;

  lines.push(`INSERT INTO inventory_products (`);
  lines.push(`  id, business_id, name, sku, category, subcategory, price, outlet, description, link, image_url, priority, notes, stock_status, ai_extracted_data, created_at, updated_at`);
  lines.push(`) VALUES (`);
  lines.push(`  ${scopedId('inventory_product', rawId)},`);
  lines.push(`  ${biz ? businessId(biz) : 'NULL'},`);
  lines.push(`  ${sqlStr(data.name || data.title || 'Product')},`);
  lines.push(`  ${sqlStr(data.sku || null)},`);
  lines.push(`  ${sqlStr(data.category || data.type || null)},`);
  lines.push(`  ${sqlStr(data.subcategory || null)},`);
  lines.push(`  ${priceNum === null ? 'NULL' : priceNum},`);
  lines.push(`  ${sqlStr(data.outlet || null)},`);
  lines.push(`  ${sqlStr(data.description || null)},`);
  lines.push(`  ${sqlStr(data.link || null)},`);
  lines.push(`  ${sqlStr(data.imageUrl || data.image_url || null)},`);
  lines.push(`  ${sqlStr(data.priority || 'medium')},`);
  lines.push(`  ${sqlStr(data.notes || data.stockInfo || null)},`);
  lines.push(`  ${sqlStr(data.stockStatus || data.stock_status || data.stockInfo || 'in_stock')},`);
  lines.push(`  ${sqlJson(data.aiExtractedData || data.ai_extracted_data || {})},`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt || data.created_at))}::timestamptz, now()),`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.updatedAt || data.updated_at))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, updated_at = EXCLUDED.updated_at;`);
}

lines.push('');

// Category counts
lines.push('-- inventory_category_counts');
for (const { id, data } of collections.inventory_category_counts || []) {
  const biz = data.businessId || data.business_id || id;
  lines.push(`INSERT INTO inventory_category_counts (business_id, category, count, updated_at)`);
  lines.push(`VALUES (${businessId(biz)}, ${sqlStr(data.category || data.name || 'Uncategorized')}, ${data.count ?? 0}, now())`);
  lines.push(`ON CONFLICT (business_id, category) DO UPDATE SET count = EXCLUDED.count, updated_at = EXCLUDED.updated_at;`);
}

lines.push('');

// Notebooks
lines.push('-- notebooks');
for (const { id, data } of collections.notebooks || []) {
  const rawId = String(data.id || id);
  const biz = data.businessId || data.business_id;
  lines.push(`INSERT INTO notebooks (id, business_id, profile_id, title, blocks, links, folders, created_at, updated_at)`);
  lines.push(`VALUES (`);
  lines.push(`  ${scopedId('notebook', rawId)},`);
  lines.push(`  ${biz ? businessId(biz) : 'NULL'},`);
  lines.push(`  ${profileSubquery()},`);
  lines.push(`  ${sqlStr(data.title || 'Ideas')},`);
  lines.push(`  ${sqlJson(data.blocks || [])},`);
  lines.push(`  ${sqlJson(data.links || [])},`);
  lines.push(`  ${sqlJson(data.folders || [])},`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt || data.created_at))}::timestamptz, now()),`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.updatedAt || data.updated_at))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (id) DO UPDATE SET blocks = EXCLUDED.blocks, updated_at = EXCLUDED.updated_at;`);
}

lines.push('');

// Brand kits
lines.push('-- brand_kits');
for (const { id, data } of collections.brand_kits || []) {
  const biz = data.businessId || data.business_id || id;
  lines.push(`INSERT INTO brand_kits (business_id, logo_url, brand_colors, typography, brand_voice, kit_data, created_at, updated_at)`);
  lines.push(`VALUES (`);
  lines.push(`  ${businessId(biz)},`);
  lines.push(`  ${sqlStr(data.logoUrl || data.logo_url || null)},`);
  lines.push(`  ${sqlJson(data.brandColors || data.brand_colors || {})},`);
  lines.push(`  ${sqlJson(data.typography || {})},`);
  lines.push(`  ${sqlStr(data.brandVoice || data.brand_voice || null)},`);
  lines.push(`  ${sqlJson(data.kitData || data.kit_data || data)},`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt || data.created_at))}::timestamptz, now()),`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.updatedAt || data.updated_at))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (business_id) DO UPDATE SET logo_url = EXCLUDED.logo_url, brand_colors = EXCLUDED.brand_colors, updated_at = EXCLUDED.updated_at;`);
}

lines.push('');

// Brand overviews
if (collections.brand_overviews?.length) {
  lines.push('-- brand_overviews');
  for (const { id, data } of collections.brand_overviews) {
    const biz = data.businessId || data.business_id || id;
    lines.push(`INSERT INTO brand_overviews (business_id, overview, updated_at)`);
    lines.push(`VALUES (${businessId(biz)}, ${sqlStr(data.overview || data.text || null)}, now())`);
    lines.push(`ON CONFLICT (business_id) DO UPDATE SET overview = EXCLUDED.overview, updated_at = EXCLUDED.updated_at;`);
  }
  lines.push('');
}

// Categories
if (collections.categories?.length) {
  lines.push('-- categories');
  for (const { id, data } of collections.categories) {
    const biz = data.businessId || data.business_id || id;
    lines.push(`INSERT INTO categories (business_id, categories, target_platforms, titles, updated_at)`);
    lines.push(`VALUES (${businessId(biz)}, ${sqlJson(data.categories || [])}, ${sqlJson(data.targetPlatforms || data.target_platforms || [])}, ${sqlJson(data.titles || {})}, now())`);
    lines.push(`ON CONFLICT (business_id) DO UPDATE SET categories = EXCLUDED.categories, updated_at = EXCLUDED.updated_at;`);
  }
  lines.push('');
}

// Inventory maps
if (collections.inventory_maps?.length) {
  lines.push('-- inventory_maps');
  for (const { id, data } of collections.inventory_maps) {
    const biz = data.businessId || data.business_id || id;
    lines.push(`INSERT INTO inventory_maps (business_id, links, updated_at)`);
    lines.push(`VALUES (${businessId(biz)}, ${sqlJson(data.links || [])}, now())`);
    lines.push(`ON CONFLICT (business_id) DO UPDATE SET links = EXCLUDED.links, updated_at = EXCLUDED.updated_at;`);
  }
  lines.push('');
}

// Short links
lines.push('-- short_links');
for (const { id, data } of collections.short_links || []) {
  const rawId = String(data.id || id);
  const biz = data.businessId || data.business_id;
  lines.push(`INSERT INTO short_links (id, business_id, profile_id, short_code, original_url, title, clicks, last_clicked_at, created_at)`);
  lines.push(`VALUES (`);
  lines.push(`  ${scopedId('short_link', rawId)},`);
  lines.push(`  ${biz ? businessId(biz) : 'NULL'},`);
  lines.push(`  ${profileSubquery()},`);
  lines.push(`  ${sqlStr(data.shortCode || data.short_code || id)},`);
  lines.push(`  ${sqlStr(data.originalUrl || data.original_url || data.url || '')},`);
  lines.push(`  ${sqlStr(data.title || null)},`);
  lines.push(`  ${data.clicks ?? 0},`);
  lines.push(`  ${sqlStr(asIso(data.lastClickedAt || data.last_clicked_at))}::timestamptz,`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt || data.created_at))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (short_code) DO UPDATE SET clicks = EXCLUDED.clicks, original_url = EXCLUDED.original_url;`);
}

lines.push('');
lines.push('-- Ensure all businesses owned by this user');
lines.push(`UPDATE businesses SET owner_id = ${profileSubquery()} WHERE owner_id IS DISTINCT FROM ${profileSubquery()};`);
lines.push('');
lines.push('COMMIT;');
lines.push('');
lines.push('-- Verify:');
lines.push(`-- SELECT count(*) FROM businesses WHERE owner_id = (SELECT id FROM profiles WHERE firebase_uid = '${FIREBASE_UID}');`);

const sql = lines.join('\n');

// Sanity check: no raw Firestore short IDs in UUID columns
const badUuid = sql.match(/VALUES \(\s*'[0-9a-z]{6,12}'/gi);
if (badUuid?.length) {
  console.error('Warning: possible unmapped Firestore IDs in output:', badUuid.slice(0, 5));
}

const outputPath = process.argv[3] || 'supabase/import-forge-firestore-export.sql';

if (process.argv.includes('--stdout')) {
  process.stdout.write(sql);
} else {
  writeFileSync(outputPath, sql);
  console.error(`Wrote ${outputPath} (${sql.length} bytes)`);
  console.error(`Profile ID: ${profileId}`);
  console.error(`Counts: users=${collections.users?.length || 0}, businesses=${collections.businesses?.length || 0}, posts=${collections.posts?.length || 0}, inventory=${inventoryDocs.length}`);
}
