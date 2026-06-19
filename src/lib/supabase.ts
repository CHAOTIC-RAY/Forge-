import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Post, Business } from '../data';
import { auth } from './firebase';
import { exchangeSupabaseAccessToken, clearSupabaseAccessToken } from './supabaseSession';
import { firestoreEntityId } from './firestoreMigrateIds';
import {
  createPostViaApi,
  deletePostViaApi,
  fetchPostsByProfileViaApi,
  fetchPostsViaApi,
  fetchWorkspaceSnapshotViaApi,
  fetchNotebookViaApi,
  upsertNotebookViaApi,
  updatePostViaApi,
} from './dataAccessApi';
import { transformPostFromDb } from './postDbMapper';

declare global {
  interface Window {
    __FORGE_ENV__?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
    };
  }
}

function resolveSupabaseCredentials(): { url: string; anonKey: string } {
  const buildUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const buildKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (buildUrl && buildKey) {
    return { url: buildUrl, anonKey: buildKey };
  }

  const runtime = typeof window !== 'undefined' ? window.__FORGE_ENV__ : undefined;
  const url = runtime?.VITE_SUPABASE_URL || '';
  const anonKey = runtime?.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

let supabaseClient: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  const { url, anonKey } = resolveSupabaseCredentials();
  if (!url || !anonKey) {
    console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  return createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
    auth: {
      persistSession: true,
      storage: localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    accessToken: async () => {
      try {
        const token = await exchangeSupabaseAccessToken();
        if (token) return token;
        return await exchangeSupabaseAccessToken(true);
      } catch (error) {
        console.warn('[supabase] access token exchange failed:', error);
        try {
          return await exchangeSupabaseAccessToken(true);
        } catch (retryError) {
          console.warn('[supabase] access token retry failed:', retryError);
          return null;
        }
      }
    },
  });
}

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
}

/** Ensure runtime config is loaded (Worker HTML injection or /api/config). */
export async function ensureSupabaseConfig(): Promise<void> {
  const { url, anonKey } = resolveSupabaseCredentials();
  if (url && anonKey) return;

  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const cfg = await res.json();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      window.__FORGE_ENV__ = {
        VITE_SUPABASE_URL: cfg.supabaseUrl,
        VITE_SUPABASE_ANON_KEY: cfg.supabaseAnonKey,
      };
      supabaseClient = createSupabaseClient();
    }
  } catch (e) {
    console.error('Failed to load Supabase config from /api/config', e);
  }
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

// ============================================
// TYPES
// ============================================

export interface Profile {
  id: string;
  firebase_uid: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
  theme_preset?: string;
  ai_settings?: Record<string, any>;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  profile_id: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
}

export interface SupabasePost {
  id: string;
  business_id: string;
  profile_id?: string;
  date: string;
  outlet?: string;
  product_category?: string;
  type?: string;
  title?: string;
  brief?: string;
  caption?: string;
  hashtags?: string;
  images?: string[];
  link?: string;
  publish_status?: string;
  scheduled_time?: string;
  published_at?: string;
  instagram_post_id?: string;
  facebook_post_id?: string;
  publish_error?: string;
  platforms?: string[];
  is_ai_generated?: boolean;
  ai_provider?: string;
  framework?: string;
  campaign_type?: string;
  campaign_name?: string;
  content_formats?: string[];
  approval_status?: string;
  approval_note?: string;
  submitted_at?: string;
  reviewed_at?: string;
  repeat_enabled?: boolean;
  repeat_interval?: string;
  last_repeat_date?: string;
  analytics?: Record<string, any>;
  postcard_data?: Record<string, any>;
  is_hidden_for_others?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryProduct {
  id: string;
  business_id: string;
  name: string;
  sku?: string;
  category?: string;
  subcategory?: string;
  price?: number;
  outlet?: string;
  description?: string;
  link?: string;
  image_url?: string;
  priority?: string;
  notes?: string;
  stock_status?: string;
  stock_count?: number;
  ai_extracted_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Notebook {
  id: string;
  business_id: string;
  profile_id: string;
  title: string;
  blocks: any[];
  links: any[];
  folders: any[];
  created_at: string;
  updated_at: string;
}

export interface ShortLink {
  id: string;
  business_id?: string;
  profile_id?: string;
  short_code: string;
  original_url: string;
  clicks: number;
  last_clicked_at?: string;
  created_at: string;
  expires_at?: string;
}

// ============================================
// PROFILE OPERATIONS
// ============================================

export async function getProfile(firebaseUid: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST301' || error.code === 'PGRST116') return null;
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function createProfile(profile: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
  return data;
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
  return data;
}

export async function upsertProfileByFirebaseUid(
  firebaseUid: string,
  email: string,
  displayName?: string,
  photoUrl?: string
): Promise<Profile> {
  const existing = await getProfile(firebaseUid);

  if (existing) {
    return updateProfile(existing.id, {
      display_name: displayName,
      photo_url: photoUrl,
    });
  }

  return createProfile({
    id: firestoreEntityId('profile', firebaseUid)!,
    firebase_uid: firebaseUid,
    email,
    display_name: displayName,
    photo_url: photoUrl,
  });
}

// ============================================
// BUSINESS OPERATIONS
// ============================================

const BUSINESS_SELECT = `
  *,
  owner:profiles!businesses_owner_id_fkey ( firebase_uid ),
  business_members!business_members_business_id_fkey (
    profile_id,
    role,
    profiles ( firebase_uid, email, display_name )
  )
`;

export async function getBusinesses(profileId: string): Promise<Business[]> {
  // Rely on RLS (owner/member/guest) instead of pre-filtering by owner_id, which breaks
  // when the signed-in profile id differs from migrated owner_id until repair runs.
  const { data, error } = await supabase.from('businesses').select(BUSINESS_SELECT);

  if (error) {
    console.error('Error fetching businesses:', error);
    throw error;
  }

  const businesses = (data || []).map(transformBusiness);

  if (businesses.length > 0) {
    return businesses;
  }

  // Fallback for legacy client-side filtering if RLS returns nothing
  const [ownedResult, memberResult] = await Promise.all([
    supabase.from('businesses').select(BUSINESS_SELECT).eq('owner_id', profileId),
    supabase.from('business_members').select('business_id').eq('profile_id', profileId),
  ]);

  if (ownedResult.error) {
    console.error('Error fetching owned businesses:', ownedResult.error);
    throw ownedResult.error;
  }
  if (memberResult.error) {
    console.error('Error fetching business memberships:', memberResult.error);
    throw memberResult.error;
  }

  const owned = ownedResult.data || [];
  const memberIds = (memberResult.data || [])
    .map((m) => m.business_id)
    .filter((id) => !owned.some((b) => b.id === id));

  let memberBusinesses: typeof owned = [];
  if (memberIds.length > 0) {
    const { data: memberData, error: memberError } = await supabase
      .from('businesses')
      .select(BUSINESS_SELECT)
      .in('id', memberIds);
    if (memberError) {
      console.error('Error fetching member businesses:', memberError);
      throw memberError;
    }
    memberBusinesses = memberData || [];
  }

  return [...owned, ...memberBusinesses].map(transformBusiness);
}

export async function getBusinessByIdAndShareToken(
  businessId: string,
  shareToken: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .eq('share_token', shareToken)
    .maybeSingle();

  if (error) {
    console.error('Error fetching business by share token:', error);
    throw error;
  }
  if (!data) return null;
  return transformBusiness(data);
}

export async function getBusiness(id: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching business:', error);
    throw error;
  }

  return transformBusiness(data);
}

export async function getBusinessByShareToken(shareToken: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('share_token', shareToken)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching business by share token:', error);
    throw error;
  }

  return transformBusiness(data);
}

export async function getBusinessByShortCode(shortCode: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('share_short_code', shortCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching business by short code:', error);
    throw error;
  }

  return transformBusiness(data);
}

export async function createBusiness(business: Partial<Business>, _profileId: string): Promise<Business> {
  const { createBusinessViaApi } = await import('./profileApi');
  return createBusinessViaApi({
    name: business.name,
    industry: business.industry,
    description: business.description,
    targetUrl: business.targetUrl,
    position: business.position,
    brandColors: business.brandColors as Record<string, unknown> | undefined,
    logoUrl: business.logoUrl,
  });
}

export async function updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.industry !== undefined) patch.industry = updates.industry;
  if (updates.position !== undefined) patch.position = updates.position;
  if (updates.targetUrl !== undefined) patch.target_url = updates.targetUrl;
  if (updates.brandColors !== undefined) patch.brand_colors = updates.brandColors;
  if (updates.logoUrl !== undefined) patch.logo_url = updates.logoUrl;
  if (updates.themePreset !== undefined) patch.theme_preset = updates.themePreset;
  if (updates.oneDriveCredentials !== undefined) patch.onedrive_credentials = updates.oneDriveCredentials;
  if (updates.applets !== undefined) patch.applets = updates.applets;
  if (updates.shareToken !== undefined) patch.share_token = updates.shareToken;
  if (updates.shareShortCode !== undefined) patch.share_short_code = updates.shareShortCode;
  if (updates.shareRestriction !== undefined) patch.share_restriction = updates.shareRestriction;
  if (updates.sharePassword !== undefined) patch.share_password = updates.sharePassword;
  if (updates.shareExpiresAt !== undefined) patch.share_expires_at = updates.shareExpiresAt;
  if (updates.shareFilters !== undefined) patch.share_filters = updates.shareFilters;
  if (updates.shareAnalytics !== undefined) patch.share_analytics = updates.shareAnalytics;
  if ((updates as any).appletData !== undefined) patch.applet_data = (updates as any).appletData;

  const { data, error } = await supabase
    .from('businesses')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating business:', error);
    throw error;
  }

  return transformBusiness(data);
}

export async function deleteBusiness(id: string): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting business:', error);
    throw error;
  }
}

// ============================================
// BUSINESS MEMBERS OPERATIONS
// ============================================

export async function getBusinessMembers(businessId: string): Promise<BusinessMember[]> {
  const { data, error } = await supabase
    .from('business_members')
    .select(`
      *,
      profiles!business_members_profile_id_fkey (
        email,
        display_name,
        photo_url
      )
    `)
    .eq('business_id', businessId);

  if (error) {
    console.error('Error fetching business members:', error);
    throw error;
  }
  return data || [];
}

export async function addBusinessMember(
  businessId: string,
  profileId: string,
  role: 'admin' | 'editor' | 'viewer' = 'viewer'
): Promise<BusinessMember> {
  const { data, error } = await supabase
    .from('business_members')
    .insert({
      business_id: businessId,
      profile_id: profileId,
      role,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding business member:', error);
    throw error;
  }
  return data;
}

export async function updateBusinessMemberRole(
  businessId: string,
  profileId: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<BusinessMember> {
  const { data, error } = await supabase
    .from('business_members')
    .update({ role })
    .eq('business_id', businessId)
    .eq('profile_id', profileId)
    .select()
    .single();

  if (error) {
    console.error('Error updating business member:', error);
    throw error;
  }
  return data;
}

export async function removeBusinessMember(
  businessId: string,
  profileId: string
): Promise<void> {
  const { error } = await supabase
    .from('business_members')
    .delete()
    .eq('business_id', businessId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing business member:', error);
    throw error;
  }
}

export async function updateMemberRoleByFirebaseUid(
  businessId: string,
  firebaseUid: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<void> {
  const profile = await getProfile(firebaseUid);
  if (!profile) throw new Error('Profile not found');
  await updateBusinessMemberRole(businessId, profile.id, role);
}

export async function removeMemberByFirebaseUid(
  businessId: string,
  firebaseUid: string
): Promise<void> {
  const profile = await getProfile(firebaseUid);
  if (!profile) throw new Error('Profile not found');
  await removeBusinessMember(businessId, profile.id);
}

// ============================================
// POSTS OPERATIONS
// ============================================

export async function getPosts(businessId: string): Promise<Post[]> {
  try {
    return await fetchPostsViaApi(businessId);
  } catch (error) {
    console.error('Error fetching posts via API:', error);
    throw error;
  }
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching post:', error);
    throw error;
  }

  return transformPost(data);
}

export async function createPost(post: Partial<Post>, businessId: string, profileId?: string): Promise<Post> {
  return createPostViaApi(post, businessId, profileId);
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post> {
  return updatePostViaApi(id, updates);
}

export async function deletePost(id: string): Promise<void> {
  return deletePostViaApi(id);
}

export async function deleteAllPosts(businessId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('business_id', businessId);

  if (error) {
    console.error('Error deleting all posts:', error);
    throw error;
  }
}

export async function getPostsByProfileId(profileId: string): Promise<Post[]> {
  return fetchPostsByProfileViaApi(profileId);
}

export function subscribeToBusinesses(
  profileId: string,
  callback: (businesses: Business[]) => void
): () => void {
  const refresh = () => {
    void getBusinesses(profileId)
      .then(callback)
      .catch((e) => {
        console.error('[businesses]', e);
        callback([]);
      });
  };
  const channel = supabase
    .channel(`businesses:${profileId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'business_members' }, refresh)
    .subscribe();
  refresh();
  return () => supabase.removeChannel(channel);
}

export function subscribeToPostsForProfile(
  profileId: string,
  callback: (posts: Post[]) => void
): () => void {
  let cancelled = false;
  const load = () => {
    getPostsByProfileId(profileId)
      .then((posts) => {
        if (!cancelled) callback(posts);
      })
      .catch((error) => {
        console.error('[subscribeToPostsForProfile] poll failed:', error);
      });
  };
  load();
  const intervalId = window.setInterval(load, 12000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

// ============================================
// INVENTORY OPERATIONS
// ============================================

export async function getInventoryProducts(businessId: string): Promise<InventoryProduct[]> {
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    return snapshot.inventory;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
}

export async function createInventoryProduct(product: Partial<InventoryProduct>): Promise<InventoryProduct> {
  const { data, error } = await supabase
    .from('inventory_products')
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory product:', error);
    throw error;
  }
  return data;
}

export async function updateInventoryProduct(id: string, updates: Partial<InventoryProduct>): Promise<InventoryProduct> {
  const { data, error } = await supabase
    .from('inventory_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating inventory product:', error);
    throw error;
  }
  return data;
}

export async function deleteInventoryProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting inventory product:', error);
    throw error;
  }
}

export async function deleteAllInventoryProducts(businessId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_products')
    .delete()
    .eq('business_id', businessId);

  if (error) {
    console.error('Error deleting all inventory:', error);
    throw error;
  }
}

export async function upsertInventoryProducts(products: Partial<InventoryProduct>[]): Promise<void> {
  const { error } = await supabase
    .from('inventory_products')
    .upsert(products, { onConflict: 'id' });

  if (error) {
    console.error('Error upserting inventory products:', error);
    throw error;
  }
}

export async function getCategoryCounts(businessId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('inventory_category_counts')
    .select('category, count')
    .eq('business_id', businessId);

  if (error) {
    console.error('Error fetching category counts:', error);
    throw error;
  }

  return (data || []).reduce((acc, item) => {
    acc[item.category] = item.count;
    return acc;
  }, {} as Record<string, number>);
}

// ============================================
// NOTEBOOK OPERATIONS
// ============================================

export async function getNotebook(businessId: string, profileId: string): Promise<Notebook | null> {
  try {
    return await fetchNotebookViaApi(businessId);
  } catch (error) {
    console.error('Error fetching notebook:', error);
    throw error;
  }
}

export async function upsertNotebook(
  businessId: string,
  _profileId: string,
  updates: Partial<Notebook>
): Promise<Notebook> {
  try {
    return await upsertNotebookViaApi(businessId, {
      title: updates.title,
      blocks: updates.blocks,
      links: updates.links,
      folders: updates.folders,
    });
  } catch (error) {
    console.error('Error upserting notebook:', error);
    throw error;
  }
}

// ============================================
// SHORT LINKS OPERATIONS
// ============================================

export async function getShortLink(shortCode: string): Promise<ShortLink | null> {
  const { data, error } = await supabase.rpc('resolve_short_link', { p_short_code: shortCode });

  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data;
    return (row as ShortLink) ?? null;
  }

  if (error && error.code !== 'PGRST202') {
    console.error('Error resolving short link via RPC:', error);
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('short_links')
    .select('*')
    .eq('short_code', shortCode)
    .maybeSingle();

  if (fallbackError) {
    if (fallbackError.code === 'PGRST116') return null;
    console.error('Error fetching short link:', fallbackError);
    throw fallbackError;
  }
  return fallback;
}

export async function createShortLink(
  shortCode: string,
  originalUrl: string,
  businessId?: string,
  profileId?: string
): Promise<ShortLink> {
  const { data, error } = await supabase
    .from('short_links')
    .insert({
      short_code: shortCode,
      original_url: originalUrl,
      business_id: businessId,
      profile_id: profileId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating short link:', error);
    throw error;
  }
  return data;
}

export async function incrementShortLinkClicks(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_short_link_clicks', { link_id: id });

  if (error) {
    // Fallback if RPC doesn't exist
    const { data } = await supabase
      .from('short_links')
      .select('clicks')
      .eq('id', id)
      .single();

    if (data) {
      await supabase
        .from('short_links')
        .update({
          clicks: (data.clicks || 0) + 1,
          last_clicked_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  }
}

export async function getShortLinks(businessId: string): Promise<ShortLink[]> {
  const { data, error } = await supabase
    .from('short_links')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching short links:', error);
    throw error;
  }
  return data || [];
}

export async function deleteShortLink(id: string): Promise<void> {
  const { error } = await supabase.from('short_links').delete().eq('id', id);
  if (error) throw error;
}

export async function updateShortLink(
  id: string,
  updates: { original_url?: string; title?: string }
): Promise<void> {
  const { error } = await supabase.from('short_links').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getShortLinkByCode(shortCode: string): Promise<ShortLink | null> {
  const { data, error } = await supabase
    .from('short_links')
    .select('*')
    .eq('short_code', shortCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function subscribeToShortLinks(
  businessId: string,
  callback: (links: ShortLink[]) => void
): () => void {
  const channel = supabase
    .channel(`short-links:${businessId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'short_links', filter: `business_id=eq.${businessId}` },
      async () => callback(await getShortLinks(businessId))
    )
    .subscribe();
  void getShortLinks(businessId).then(callback);
  return () => supabase.removeChannel(channel);
}

export async function createShortLinkWithTitle(
  shortCode: string,
  originalUrl: string,
  businessId?: string,
  profileId?: string,
  title?: string,
  id?: string
): Promise<ShortLink> {
  const { data, error } = await supabase
    .from('short_links')
    .insert({
      id,
      short_code: shortCode,
      original_url: originalUrl,
      business_id: businessId,
      profile_id: profileId,
      title,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// COMMENTS
// ============================================

export interface PostComment {
  id: string;
  postId: string;
  profileId?: string;
  userId?: string;
  userName?: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      profiles ( firebase_uid, display_name, photo_url )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((c: any) => ({
    id: c.id,
    postId: c.post_id,
    profileId: c.profile_id,
    userId: c.profiles?.firebase_uid,
    userName: c.profiles?.display_name || 'User',
    userPhoto: c.profiles?.photo_url || '',
    text: c.content,
    createdAt: c.created_at,
  }));
}

export async function createPostComment(
  postId: string,
  profileId: string,
  text: string
): Promise<PostComment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, profile_id: profileId, content: text })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    postId: data.post_id,
    profileId: data.profile_id,
    text: data.content,
    createdAt: data.created_at,
  };
}

export async function deletePostComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToPostComments(
  postId: string,
  callback: (comments: PostComment[]) => void
): () => void {
  const channel = supabase
    .channel(`comments:${postId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
      async () => callback(await getPostComments(postId))
    )
    .subscribe();
  void getPostComments(postId).then(callback);
  return () => supabase.removeChannel(channel);
}

export async function createPostsBatch(
  posts: Partial<Post>[],
  businessId: string,
  profileId?: string
): Promise<void> {
  if (!posts.length) return;
  const rows = posts.map((post) => ({
    id: post.id,
    business_id: businessId,
    profile_id: profileId || post.userId,
    date: post.date || new Date().toISOString().split('T')[0],
    outlet: post.outlet,
    product_category: post.productCategory,
    type: post.type,
    title: post.title,
    brief: post.brief,
    caption: post.caption,
    hashtags: post.hashtags,
    images: post.images || [],
    link: post.link,
    publish_status: post.publishStatus || post.status || 'draft',
    platforms: post.platforms,
    is_ai_generated: post.isAiGenerated,
    approval_status: post.approvalStatus,
  }));
  const { error } = await supabase.from('posts').insert(rows);
  if (error) throw error;
}

export function subscribeToAccessRequests(
  businessId: string,
  callback: (requests: AccessRequest[]) => void
): () => void {
  const channel = supabase
    .channel(`access-requests:${businessId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'access_requests', filter: `business_id=eq.${businessId}` },
      async () => callback(await getAccessRequests(businessId))
    )
    .subscribe();
  void getAccessRequests(businessId).then(callback);
  return () => supabase.removeChannel(channel);
}

export async function upsertTodo(
  profileId: string,
  todo: TodoItem & { businessId?: string }
): Promise<void> {
  const { error } = await supabase.from('todos').upsert({
    id: todo.id,
    profile_id: profileId,
    business_id: todo.businessId || null,
    text: todo.text,
    completed: todo.completed,
    due_date: todo.dueDate || null,
    due_time: todo.dueTime || null,
    priority: todo.priority,
    project: todo.project || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw error;
}

export async function getProfileByFirebaseUid(firebaseUid: string): Promise<Profile | null> {
  return getProfile(firebaseUid);
}

// ============================================
// BRAND KIT OPERATIONS
// ============================================

export async function getBrandKit(businessId: string): Promise<Record<string, any> | null> {
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    return snapshot.brandKit;
  } catch (error) {
    console.error('Error fetching brand kit:', error);
    return null;
  }
}

export async function upsertBrandKit(businessId: string, updates: Record<string, any>): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('brand_kits')
    .upsert({
      business_id: businessId,
      kit_data: updates,
      ai_generated_guide: updates.designGuide || updates.ai_generated_guide || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting brand kit:', error);
    throw error;
  }
  const kitData = (data.kit_data as Record<string, unknown>) || updates;
  return { ...kitData, designGuide: updates.designGuide || data.ai_generated_guide || '' };
}

export function subscribeToBrandKit(
  businessId: string,
  callback: (data: Record<string, unknown> | null) => void
): () => void {
  let cancelled = false;
  const load = () => {
    getBrandKit(businessId)
      .then((data) => {
        if (!cancelled) callback(data);
      })
      .catch(() => {
        if (!cancelled) callback(null);
      });
  };
  load();
  const intervalId = window.setInterval(load, 15000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

// ============================================
// ACCESS REQUESTS OPERATIONS
// ============================================

export interface AccessRequest {
  id: string;
  business_id: string;
  profile_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_role: 'admin' | 'editor' | 'viewer';
  message?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export async function getAccessRequests(businessId: string): Promise<AccessRequest[]> {
  const { data, error } = await supabase
    .from('access_requests')
    .select(`
      *,
      profiles ( firebase_uid, email, display_name )
    `)
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching access requests:', error);
    throw error;
  }
  return data || [];
}

export async function createAccessRequest(
  businessId: string,
  profileId: string,
  requestedRole: 'admin' | 'editor' | 'viewer' = 'viewer',
  message?: string
): Promise<AccessRequest> {
  const { data, error } = await supabase
    .from('access_requests')
    .insert({
      business_id: businessId,
      profile_id: profileId,
      requested_role: requestedRole,
      message,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating access request:', error);
    throw error;
  }
  return data;
}

export async function updateAccessRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
): Promise<AccessRequest> {
  const { data, error } = await supabase
    .from('access_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating access request:', error);
    throw error;
  }
  return data;
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToPosts(
  businessId: string,
  callback: (posts: Post[]) => void
): () => void {
  let cancelled = false;
  const load = () => {
    getPosts(businessId)
      .then((posts) => {
        if (!cancelled) callback(posts);
      })
      .catch((error) => {
        console.error('[subscribeToPosts] poll failed:', error);
      });
  };
  load();
  const intervalId = window.setInterval(load, 12000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

export function subscribeToInventory(
  businessId: string,
  callback: (products: InventoryProduct[]) => void
): () => void {
  let cancelled = false;
  const load = () => {
    getInventoryProducts(businessId)
      .then((products) => {
        if (!cancelled) callback(products);
      })
      .catch((error) => {
        console.error('[subscribeToInventory] poll failed:', error);
        if (!cancelled) callback([]);
      });
  };
  load();
  const intervalId = window.setInterval(load, 15000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

export function subscribeToNotebook(
  businessId: string,
  profileId: string,
  callback: (notebook: Notebook | null) => void
): () => void {
  let cancelled = false;

  const load = () => {
    getNotebook(businessId, profileId)
      .then((notebook) => {
        if (!cancelled) callback(notebook);
      })
      .catch((error) => {
        console.error('[subscribeToNotebook] load failed:', error);
        if (!cancelled) callback(null);
      });
  };

  load();
  const intervalId = window.setInterval(load, 15000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

// ============================================
// HELPERS
// ============================================

function transformBusiness(data: any): Business {
  const members: string[] = [];
  const memberRoles: Record<string, 'admin' | 'editor' | 'viewer'> = {};

  const ownerUid = data.owner?.firebase_uid;
  if (ownerUid) {
    members.push(ownerUid);
    memberRoles[ownerUid] = 'admin';
  }

  for (const m of data.business_members || []) {
    const uid = m.profiles?.firebase_uid;
    if (uid && !members.includes(uid)) {
      members.push(uid);
      memberRoles[uid] = m.role;
    }
  }

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    description: data.description,
    industry: data.industry,
    position: data.position,
    targetUrl: data.target_url,
    brandColors: data.brand_colors,
    logoUrl: data.logo_url,
    shareToken: data.share_token,
    shareShortCode: data.share_short_code,
    shareRestriction: data.share_restriction,
    sharePassword: data.share_password,
    shareExpiresAt: data.share_expires_at,
    shareFilters: data.share_filters,
    shareAnalytics: data.share_analytics,
    themePreset: data.theme_preset,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    oneDriveCredentials: data.onedrive_credentials,
    applets: data.applets,
    appletData: data.applet_data,
    members,
    memberRoles,
  };
}

function transformPost(data: SupabasePost): Post {
  return {
    id: data.id,
    businessId: data.business_id,
    userId: data.profile_id,
    date: data.date,
    outlet: data.outlet,
    productCategory: data.product_category,
    type: data.type,
    title: data.title || '',
    brief: data.brief || '',
    caption: data.caption || '',
    hashtags: data.hashtags || '',
    images: data.images || [],
    link: data.link,
    publishStatus: data.publish_status as Post['publishStatus'],
    status: data.publish_status as Post['status'],
    scheduledTime: data.scheduled_time,
    publishedAt: data.published_at,
    instagramPostId: data.instagram_post_id,
    facebookPostId: data.facebook_post_id,
    publishError: data.publish_error,
    platforms: data.platforms,
    isAiGenerated: data.is_ai_generated,
    aiProvider: data.ai_provider,
    framework: data.framework as Post['framework'],
    campaignType: data.campaign_type,
    campaignName: data.campaign_name,
    contentFormats: data.content_formats as Post['contentFormats'],
    approvalStatus: data.approval_status as Post['approvalStatus'],
    approvalNote: data.approval_note,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    repeatEnabled: data.repeat_enabled,
    repeatInterval: data.repeat_interval as Post['repeatInterval'],
    lastRepeatDate: data.last_repeat_date,
    analytics: data.analytics,
    postcardData: data.postcard_data as Post['postcardData'],
    isHiddenForOthers: data.is_hidden_for_others,
    createdAt: data.created_at,
  };
}

function generateShortCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Set the Firebase UID for RLS policies
export async function setFirebaseUidForRls(firebaseUid: string): Promise<void> {
  const { error } = await supabase.rpc('set_firebase_uid', { uid: firebaseUid });
  if (error) {
    console.warn('[supabase] set_firebase_uid RPC unavailable:', error.message);
  }
}

// ============================================
// CATEGORIES (Brand Kit product categories)
// ============================================

export async function getCategoriesDoc(businessId: string): Promise<Record<string, unknown> | null> {
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    return snapshot.categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return null;
  }
}

export async function upsertCategoriesDoc(
  businessId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const row: Record<string, unknown> = {
    business_id: businessId,
    updated_at: new Date().toISOString(),
  };
  if (payload.categories !== undefined) row.categories = payload.categories;
  if (payload.targetPlatforms !== undefined) row.target_platforms = payload.targetPlatforms;
  if (payload.target_platforms !== undefined) row.target_platforms = payload.target_platforms;
  if (payload.titles !== undefined) row.titles = payload.titles;
  const { error } = await supabase.from('categories').upsert(row, { onConflict: 'business_id' });
  if (error) throw error;
}

export function subscribeToCategories(
  businessId: string,
  callback: (data: Record<string, unknown> | null) => void
): () => void {
  let cancelled = false;
  const load = () => {
    getCategoriesDoc(businessId)
      .then((data) => {
        if (!cancelled) callback(data);
      })
      .catch(() => {
        if (!cancelled) callback(null);
      });
  };
  load();
  const intervalId = window.setInterval(load, 15000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

export function normalizeCategoriesDoc(
  doc: Record<string, unknown> | null
): { categories: unknown[]; targetPlatforms: string[]; titles: Record<string, string> } {
  if (!doc) {
    return {
      categories: [],
      targetPlatforms: ['instagram', 'facebook', 'viber', 'tiktok'],
      titles: {
        category: 'Product Category',
        outlet: 'Outlet',
        campaign: 'Campaign Type',
        type: 'Type',
      },
    };
  }
  return {
    categories: (doc.categories as unknown[]) || [],
    targetPlatforms:
      (doc.target_platforms as string[]) ||
      (doc.targetPlatforms as string[]) ||
      ['instagram', 'facebook', 'viber', 'tiktok'],
    titles: (doc.titles as Record<string, string>) || {
      category: 'Product Category',
      outlet: 'Outlet',
      campaign: 'Campaign Type',
      type: 'Type',
    },
  };
}

// ============================================
// TODOS
// ============================================

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  project?: string;
}

export async function getTodos(profileId: string, businessId?: string): Promise<TodoItem[]> {
  if (!businessId) return [];
  try {
    const snapshot = await fetchWorkspaceSnapshotViaApi(businessId);
    return snapshot.todos;
  } catch (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
}

export function subscribeToTodos(
  profileId: string,
  callback: (todos: TodoItem[]) => void,
  businessId?: string
): () => void {
  if (!businessId) {
    callback([]);
    return () => undefined;
  }
  let cancelled = false;
  const load = () => {
    getTodos(profileId, businessId)
      .then((todos) => {
        if (!cancelled) callback(todos);
      })
      .catch(() => {
        if (!cancelled) callback([]);
      });
  };
  load();
  const intervalId = window.setInterval(load, 15000);
  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

export async function updateProfileAiSettings(
  profileId: string,
  aiSettings: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ai_settings: aiSettings, updated_at: new Date().toISOString() })
    .eq('id', profileId);
  if (error) throw error;
}
