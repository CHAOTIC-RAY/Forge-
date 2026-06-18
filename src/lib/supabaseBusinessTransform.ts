import type { Business } from '../data';

/** Map Supabase business row (with joins) to app Business type. */
export function transformBusinessFromApi(data: any): Business {
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
