import type { SupabaseAuthEnv } from './handleSupabaseTokenExchange';
import { firestoreEntityId } from './firestoreMigrateIds';
import { transformBusinessFromApi } from './supabaseBusinessTransform';
import {
  getServiceConfig,
  profileCorsHeaders,
  serviceHeaders,
  verifyFirebaseBearer,
} from './supabaseServiceHttp';

const BUSINESS_SELECT = `
  *,
  owner:profiles!businesses_owner_id_fkey ( firebase_uid ),
  business_members!business_members_business_id_fkey (
    profile_id,
    role,
    profiles ( firebase_uid, email, display_name )
  )
`;

type DbProfile = {
  id: string;
  firebase_uid: string;
  email: string;
  display_name?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
  settings?: Record<string, unknown>;
  theme_preset?: string | null;
  ai_settings?: Record<string, unknown>;
};

function mapProfile(row: DbProfile) {
  return {
    id: row.id,
    firebase_uid: row.firebase_uid,
    email: row.email,
    display_name: row.display_name ?? undefined,
    photo_url: row.photo_url ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    settings: row.settings ?? {},
    theme_preset: row.theme_preset ?? undefined,
    ai_settings: row.ai_settings ?? {},
  };
}

export async function fetchProfileByFirebaseUid(
  env: SupabaseAuthEnv,
  firebaseUid: string
): Promise<DbProfile | null> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?firebase_uid=eq.${encodeURIComponent(firebaseUid)}&select=*`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load profile: ${text}`);
  }
  const rows = (await response.json()) as DbProfile[];
  return rows[0] ?? null;
}

async function upsertProfileForFirebaseUser(
  env: SupabaseAuthEnv,
  firebaseUser: { uid: string; email?: string; name?: string; picture?: string }
): Promise<DbProfile> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const existing = await fetchProfileByFirebaseUid(env, firebaseUser.uid);
  const now = new Date().toISOString();

  if (existing) {
    const patch: Record<string, unknown> = { updated_at: now };
    if (firebaseUser.name) patch.display_name = firebaseUser.name;
    if (firebaseUser.picture) patch.photo_url = firebaseUser.picture;
    if (firebaseUser.email) patch.email = firebaseUser.email;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(existing.id)}`,
      {
        method: 'PATCH',
        headers: serviceHeaders(serviceKey, {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(patch),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Profile update failed: ${text}`);
    }
    const rows = (await response.json()) as DbProfile[];
    return rows[0] ?? { ...existing, ...patch, updated_at: now };
  }

  const id = firestoreEntityId('profile', firebaseUser.uid)!;
  const row = {
    id,
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    display_name: firebaseUser.name ?? null,
    photo_url: firebaseUser.picture ?? null,
    settings: {},
    theme_preset: null,
    ai_settings: {},
    created_at: now,
    updated_at: now,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: serviceHeaders(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Profile create failed: ${text}`);
  }
  const rows = (await response.json()) as DbProfile[];
  return rows[0] ?? (row as DbProfile);
}

export async function markOnboardingComplete(
  env: SupabaseAuthEnv,
  firebaseUid: string
): Promise<void> {
  const profile = await fetchProfileByFirebaseUid(env, firebaseUid);
  if (!profile) {
    throw new Error('No profile found to mark onboarding complete');
  }

  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const settings = { ...(profile.settings || {}), onboardingComplete: true };
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`,
    {
      method: 'PATCH',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify({ settings, updated_at: new Date().toISOString() }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to mark onboarding complete: ${text}`);
  }
}

export async function fetchBusinessesForFirebaseUser(
  env: SupabaseAuthEnv,
  firebaseUid: string
): Promise<unknown[]> {
  const profile = await fetchProfileByFirebaseUid(env, firebaseUid);
  if (!profile) return [];

  const { serviceKey, supabaseUrl } = getServiceConfig(env);

  const ownedRes = await fetch(
    `${supabaseUrl}/rest/v1/businesses?owner_id=eq.${encodeURIComponent(profile.id)}&select=${encodeURIComponent(BUSINESS_SELECT)}`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!ownedRes.ok) {
    const text = await ownedRes.text();
    throw new Error(`Failed to load owned businesses: ${text}`);
  }
  const owned = (await ownedRes.json()) as unknown[];

  const memberRes = await fetch(
    `${supabaseUrl}/rest/v1/business_members?profile_id=eq.${encodeURIComponent(profile.id)}&select=business_id`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!memberRes.ok) {
    const text = await memberRes.text();
    throw new Error(`Failed to load business memberships: ${text}`);
  }
  const memberRows = (await memberRes.json()) as Array<{ business_id: string }>;
  const memberIds = memberRows
    .map((m) => m.business_id)
    .filter((id) => !owned.some((b) => (b as { id: string }).id === id));

  let memberBusinesses: unknown[] = [];
  if (memberIds.length > 0) {
    const inFilter = memberIds.map((id) => encodeURIComponent(id)).join(',');
    const res = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=in.(${inFilter})&select=${encodeURIComponent(BUSINESS_SELECT)}`,
      { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to load member businesses: ${text}`);
    }
    memberBusinesses = await res.json();
  }

  return [...owned, ...memberBusinesses];
}

export async function handleProfileSync(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: profileCorsHeaders,
    });
  }

  try {
    const profile = await upsertProfileForFirebaseUser(env, auth);
    return new Response(JSON.stringify({ profile: mapProfile(profile) }), {
      status: 200,
      headers: profileCorsHeaders,
    });
  } catch (error) {
    console.error('[profile] sync failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Profile sync failed' }),
      { status: 500, headers: profileCorsHeaders }
    );
  }
}

export async function handleProfileCompleteOnboarding(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: profileCorsHeaders,
    });
  }

  try {
    await markOnboardingComplete(env, auth.uid);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: profileCorsHeaders,
    });
  } catch (error) {
    console.error('[profile] complete onboarding failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to complete onboarding' }),
      { status: 500, headers: profileCorsHeaders }
    );
  }
}

function generateShortCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createBusinessForProfile(
  env: SupabaseAuthEnv,
  profileId: string,
  business: {
    name?: string;
    industry?: string;
    description?: string;
    targetUrl?: string;
    position?: string;
    brandColors?: Record<string, unknown>;
    logoUrl?: string;
  }
): Promise<unknown> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const now = new Date().toISOString();
  const row = {
    name: business.name || 'My Business',
    owner_id: profileId,
    description: business.description ?? null,
    industry: business.industry ?? null,
    position: business.position ?? null,
    target_url: business.targetUrl ?? null,
    brand_colors: business.brandColors ?? null,
    logo_url: business.logoUrl ?? null,
    share_token: crypto.randomUUID(),
    share_short_code: generateShortCode(),
    created_at: now,
    updated_at: now,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/businesses`, {
    method: 'POST',
    headers: serviceHeaders(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create business: ${text}`);
  }
  const rows = (await response.json()) as unknown[];
  return rows[0];
}

async function upsertCategoriesForBusiness(
  env: SupabaseAuthEnv,
  businessId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const row: Record<string, unknown> = {
    business_id: businessId,
    updated_at: new Date().toISOString(),
  };
  if (payload.categories !== undefined) row.categories = payload.categories;
  if (payload.targetPlatforms !== undefined) row.target_platforms = payload.targetPlatforms;
  if (payload.target_platforms !== undefined) row.target_platforms = payload.target_platforms;
  if (payload.titles !== undefined) row.titles = payload.titles;

  const response = await fetch(`${supabaseUrl}/rest/v1/categories?on_conflict=business_id`, {
    method: 'POST',
    headers: serviceHeaders(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to save categories: ${text}`);
  }
}

async function upsertBrandKitForBusiness(
  env: SupabaseAuthEnv,
  businessId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const row = {
    business_id: businessId,
    kit_data: updates,
    ai_generated_guide:
      (updates.designGuide as string | undefined) ||
      (updates.ai_generated_guide as string | undefined) ||
      null,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/brand_kits?on_conflict=business_id`, {
    method: 'POST',
    headers: serviceHeaders(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to save brand kit: ${text}`);
  }
}

async function updateProfileFields(
  env: SupabaseAuthEnv,
  profileId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}`,
    {
      method: 'PATCH',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update profile: ${text}`);
  }
}

export async function handleBusinessCreate(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: profileCorsHeaders,
    });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      industry?: string;
      description?: string;
      targetUrl?: string;
      position?: string;
      brandColors?: Record<string, unknown>;
      logoUrl?: string;
    };
    const profile = await fetchProfileByFirebaseUid(env, auth.uid);
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: profileCorsHeaders,
      });
    }

    const row = await createBusinessForProfile(env, profile.id, body);
    const business = transformBusinessFromApi(row);
    return new Response(JSON.stringify({ business }), {
      status: 200,
      headers: profileCorsHeaders,
    });
  } catch (error) {
    console.error('[profile] create business failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create business' }),
      { status: 500, headers: profileCorsHeaders }
    );
  }
}

export async function handleOnboardingComplete(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: profileCorsHeaders,
    });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      industry?: string;
      description?: string;
      targetUrl?: string;
      brandColors?: { primary?: string; secondary?: string; accent?: string };
      outletNames?: string;
      geminiApiKey?: string;
      aiSettings?: Record<string, unknown>;
    };

    const profile = await upsertProfileForFirebaseUser(env, auth);
    const businessRow = await createBusinessForProfile(env, profile.id, {
      name: body.name || 'My Business',
      industry: body.industry || 'Retail',
      description: body.description || '',
      targetUrl: body.targetUrl,
    });
    const businessId = (businessRow as { id: string }).id;

    const outletNames = (body.outletNames || body.name || 'Main Store')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueOutlets = [...new Set(outletNames)];
    await upsertCategoriesForBusiness(env, businessId, {
      categories: uniqueOutlets.map((name) => ({
        id: crypto.randomUUID(),
        name,
        type: 'outlet',
        enabled: true,
      })),
    });

    await upsertBrandKitForBusiness(env, businessId, {
      brand_colors: {
        primary: body.brandColors?.primary || '#2665fd',
        secondary: body.brandColors?.secondary || '#0f172a',
        accent: body.brandColors?.accent || '#60a5fa',
      },
      ai_generated_guide: `Brand Voice: Professional and engaging.\nIndustry: ${body.industry || 'Retail'}.\nDescription: ${body.description || ''}.`,
    });

    const profilePatch: Record<string, unknown> = {
      settings: { ...(profile.settings || {}), onboardingComplete: true },
    };
    if (body.targetUrl || body.geminiApiKey || body.aiSettings) {
      profilePatch.ai_settings = {
        ...(profile.ai_settings || {}),
        ...(body.aiSettings || {}),
        ...(body.targetUrl ? { targetUrl: body.targetUrl } : {}),
        ...(body.geminiApiKey ? { geminiApiKey: body.geminiApiKey } : {}),
      };
    }
    await updateProfileFields(env, profile.id, profilePatch);

    const business = transformBusinessFromApi(businessRow);
    return new Response(JSON.stringify({ business }), {
      status: 200,
      headers: profileCorsHeaders,
    });
  } catch (error) {
    console.error('[profile] onboarding complete failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
      }),
      { status: 500, headers: profileCorsHeaders }
    );
  }
}

export async function handleBusinessesMine(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: profileCorsHeaders,
    });
  }

  try {
    const businesses = await fetchBusinessesForFirebaseUser(env, auth.uid);
    return new Response(JSON.stringify({ businesses }), {
      status: 200,
      headers: profileCorsHeaders,
    });
  } catch (error) {
    console.error('[profile] businesses list failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to load businesses' }),
      { status: 500, headers: profileCorsHeaders }
    );
  }
}
