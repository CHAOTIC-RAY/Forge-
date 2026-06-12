import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Post, Business } from '../data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching profile:', error);
    throw error;
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
    firebase_uid: firebaseUid,
    email,
    display_name: displayName,
    photo_url: photoUrl,
  });
}

// ============================================
// BUSINESS OPERATIONS
// ============================================

export async function getBusinesses(profileId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      business_members!business_members_business_id_fkey (
        profile_id,
        role
      )
    `)
    .or(`owner_id.eq.${profileId},business_members.profile_id.eq.${profileId}`);

  if (error) {
    console.error('Error fetching businesses:', error);
    throw error;
  }

  return (data || []).map(transformBusiness);
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

export async function createBusiness(business: Partial<Business>, profileId: string): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      name: business.name,
      owner_id: profileId,
      description: business.description,
      industry: business.industry,
      brand_colors: business.brandColors,
      logo_url: business.logoUrl,
      share_token: crypto.randomUUID(),
      share_short_code: generateShortCode(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating business:', error);
    throw error;
  }

  return transformBusiness(data);
}

export async function updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .update({
      name: updates.name,
      description: updates.description,
      industry: updates.industry,
      brand_colors: updates.brandColors,
      logo_url: updates.logoUrl,
      theme_preset: updates.themePreset,
      onedrive_credentials: updates.oneDriveCredentials,
      applets: updates.applets,
      share_restriction: updates.shareRestriction,
      share_password: updates.sharePassword,
      share_expires_at: updates.shareExpiresAt,
      share_filters: updates.shareFilters,
    })
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

// ============================================
// POSTS OPERATIONS
// ============================================

export async function getPosts(businessId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('business_id', businessId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  return (data || []).map(transformPost);
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
  const { data, error } = await supabase
    .from('posts')
    .insert({
      business_id: businessId,
      profile_id: profileId,
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
      scheduled_time: post.scheduledTime,
      platforms: post.platforms,
      is_ai_generated: post.isAiGenerated,
      ai_provider: post.aiProvider,
      framework: post.framework,
      campaign_type: post.campaignType,
      campaign_name: post.campaignName,
      content_formats: post.contentFormats,
      approval_status: post.approvalStatus,
      repeat_enabled: post.repeatEnabled,
      repeat_interval: post.repeatInterval,
      analytics: post.analytics,
      postcard_data: post.postcardData,
      is_hidden_for_others: post.isHiddenForOthers,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    throw error;
  }

  return transformPost(data);
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .update({
      date: updates.date,
      outlet: updates.outlet,
      product_category: updates.productCategory,
      type: updates.type,
      title: updates.title,
      brief: updates.brief,
      caption: updates.caption,
      hashtags: updates.hashtags,
      images: updates.images,
      link: updates.link,
      publish_status: updates.publishStatus || updates.status,
      scheduled_time: updates.scheduledTime,
      published_at: updates.publishedAt,
      instagram_post_id: updates.instagramPostId,
      facebook_post_id: updates.facebookPostId,
      publish_error: updates.publishError,
      platforms: updates.platforms,
      is_ai_generated: updates.isAiGenerated,
      ai_provider: updates.aiProvider,
      framework: updates.framework,
      campaign_type: updates.campaignType,
      campaign_name: updates.campaignName,
      content_formats: updates.contentFormats,
      approval_status: updates.approvalStatus,
      approval_note: updates.approvalNote,
      reviewed_at: updates.reviewedAt,
      repeat_enabled: updates.repeatEnabled,
      repeat_interval: updates.repeatInterval,
      last_repeat_date: updates.lastRepeatDate,
      analytics: updates.analytics,
      postcard_data: updates.postcardData,
      is_hidden_for_others: updates.isHiddenForOthers,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating post:', error);
    throw error;
  }

  return transformPost(data);
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
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

// ============================================
// INVENTORY OPERATIONS
// ============================================

export async function getInventoryProducts(businessId: string): Promise<InventoryProduct[]> {
  const { data, error } = await supabase
    .from('inventory_products')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
  return data || [];
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
  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .eq('business_id', businessId)
    .eq('profile_id', profileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching notebook:', error);
    throw error;
  }
  return data;
}

export async function upsertNotebook(
  businessId: string,
  profileId: string,
  updates: Partial<Notebook>
): Promise<Notebook> {
  const { data, error } = await supabase
    .from('notebooks')
    .upsert({
      business_id: businessId,
      profile_id: profileId,
      ...updates,
    }, { onConflict: 'business_id,profile_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting notebook:', error);
    throw error;
  }
  return data;
}

// ============================================
// SHORT LINKS OPERATIONS
// ============================================

export async function getShortLink(shortCode: string): Promise<ShortLink | null> {
  const { data, error } = await supabase
    .from('short_links')
    .select('*')
    .eq('short_code', shortCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching short link:', error);
    throw error;
  }
  return data;
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

// ============================================
// BRAND KIT OPERATIONS
// ============================================

export async function getBrandKit(businessId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('brand_kits')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching brand kit:', error);
    throw error;
  }
  return data;
}

export async function upsertBrandKit(businessId: string, updates: Record<string, any>): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('brand_kits')
    .upsert({
      business_id: businessId,
      ...updates,
    }, { onConflict: 'business_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting brand kit:', error);
    throw error;
  }
  return data;
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
    .select('*')
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
  const channel = supabase
    .channel(`posts:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `business_id=eq.${businessId}`,
      },
      async () => {
        const posts = await getPosts(businessId);
        callback(posts);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToInventory(
  businessId: string,
  callback: (products: InventoryProduct[]) => void
): () => void {
  const channel = supabase
    .channel(`inventory:${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_products',
        filter: `business_id=eq.${businessId}`,
      },
      async () => {
        const products = await getInventoryProducts(businessId);
        callback(products);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToNotebook(
  businessId: string,
  profileId: string,
  callback: (notebook: Notebook | null) => void
): () => void {
  const channel = supabase
    .channel(`notebook:${businessId}:${profileId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notebooks',
        filter: `business_id=eq.${businessId}`,
      },
      async () => {
        const notebook = await getNotebook(businessId, profileId);
        callback(notebook);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// HELPERS
// ============================================

function transformBusiness(data: any): Business {
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
  await supabase.rpc('set_config', { name: 'request.jwt.claims', value: JSON.stringify({ sub: firebaseUid }) });
}
