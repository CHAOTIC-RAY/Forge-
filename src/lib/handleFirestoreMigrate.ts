import type { SupabaseAuthEnv } from './handleSupabaseTokenExchange';
import { verifyFirebaseIdToken } from './supabaseAuthBridge';
import { resolveSupabaseServiceKey, validateSupabaseServiceKey } from './supabaseServiceKey';

export interface MigrateBatchRequest {
  table: string;
  rows: Record<string, unknown>[];
  onConflict?: string;
}

export interface ExistingProfile {
  id: string;
  firebase_uid: string;
}

function getServiceConfig(env: SupabaseAuthEnv): { serviceKey: string; supabaseUrl: string } {
  const serviceKey = resolveSupabaseServiceKey(env);
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  if (!serviceKey || !supabaseUrl) {
    throw new Error(
      'Supabase service key is not configured on the server. Set SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) to the service_role secret from Supabase Dashboard → API.'
    );
  }
  validateSupabaseServiceKey(serviceKey);
  return { serviceKey, supabaseUrl };
}

function serviceHeaders(serviceKey: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extra,
  };
}

export async function fetchExistingProfiles(env: SupabaseAuthEnv): Promise<ExistingProfile[]> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,firebase_uid`, {
    headers: serviceHeaders(serviceKey, { Accept: 'application/json' }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load existing Supabase profiles: ${text}`);
  }

  return (await response.json()) as ExistingProfile[];
}

async function upsertProfiles(
  env: SupabaseAuthEnv,
  rows: Record<string, unknown>[]
): Promise<{ inserted: number }> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  if (!rows.length) return { inserted: 0 };

  const firebaseUids = [...new Set(rows.map((row) => String(row.firebase_uid || '')).filter(Boolean))];
  const existingByUid = new Map<string, string>();

  if (firebaseUids.length) {
    const inFilter = firebaseUids.map((uid) => encodeURIComponent(uid)).join(',');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?firebase_uid=in.(${inFilter})&select=id,firebase_uid`,
      { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to look up existing profiles: ${text}`);
    }
    const existing = (await response.json()) as ExistingProfile[];
    for (const profile of existing) {
      existingByUid.set(profile.firebase_uid, profile.id);
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  const toPatch: Array<{ id: string; fields: Record<string, unknown> }> = [];

  for (const row of rows) {
    const firebaseUid = String(row.firebase_uid || '');
    const existingId = existingByUid.get(firebaseUid);
    if (existingId) {
      const { id: _id, ...fields } = row;
      toPatch.push({ id: existingId, fields });
    } else {
      toInsert.push(row);
    }
  }

  for (const patch of toPatch) {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(patch.id)}`, {
      method: 'PATCH',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify(patch.fields),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase profile update failed: ${text}`);
    }
  }

  if (toInsert.length) {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify(toInsert),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase profile insert failed: ${text}`);
    }
  }

  return { inserted: rows.length };
}

export async function serviceRoleUpsert(
  env: SupabaseAuthEnv,
  table: string,
  rows: Record<string, unknown>[],
  onConflict?: string
): Promise<{ inserted: number }> {
  if (table === 'profiles' && onConflict === 'firebase_uid') {
    return upsertProfiles(env, rows);
  }

  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  if (!rows.length) return { inserted: 0 };

  const conflictQuery = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${conflictQuery}`, {
    method: 'POST',
    headers: serviceHeaders(serviceKey, {
      'Content-Type': 'application/json',
      Prefer: onConflict ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upsert to ${table} failed: ${text}`);
  }

  return { inserted: rows.length };
}

async function verifyMigrationRequest(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response | null> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const firebaseProjectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0018612871';
  const firebaseApiKey = env.FIREBASE_API_KEY;
  const authHeader = request.headers.get('Authorization') || '';
  const firebaseToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!firebaseToken) {
    return new Response(JSON.stringify({ error: 'Missing Firebase ID token' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    await verifyFirebaseIdToken(firebaseToken, firebaseProjectId, firebaseApiKey);
    return null;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid Firebase ID token' }),
      { status: 401, headers: corsHeaders }
    );
  }
}

export async function handleMigratePrefetchProfiles(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const authError = await verifyMigrationRequest(request, env);
  if (authError) return authError;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const profiles = await fetchExistingProfiles(env);
    return new Response(JSON.stringify({ profiles }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[migrate] prefetch profiles failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Prefetch failed' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function repairMigratedOwnership(
  env: SupabaseAuthEnv,
  firebaseUid: string
): Promise<{ repairedBusinesses: number; repairedMembers: number }> {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);

  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?firebase_uid=eq.${encodeURIComponent(firebaseUid)}&select=id`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!profileRes.ok) {
    const text = await profileRes.text();
    throw new Error(`Failed to load profile for repair: ${text}`);
  }
  const profiles = (await profileRes.json()) as Array<{ id: string }>;
  const profileId = profiles[0]?.id;
  if (!profileId) {
    throw new Error('No Supabase profile found for this Firebase user. Migrate profiles first.');
  }

  const businessesRes = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id,owner_id`, {
    headers: serviceHeaders(serviceKey, { Accept: 'application/json' }),
  });
  if (!businessesRes.ok) {
    const text = await businessesRes.text();
    throw new Error(`Failed to load businesses for repair: ${text}`);
  }
  const businesses = (await businessesRes.json()) as Array<{ id: string; owner_id: string | null }>;

  let repairedBusinesses = 0;
  for (const business of businesses) {
    if (business.owner_id === profileId) continue;
    const response = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(business.id)}`,
      {
        method: 'PATCH',
        headers: serviceHeaders(serviceKey, {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify({ owner_id: profileId }),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to repair business ${business.id}: ${text}`);
    }
    repairedBusinesses++;
  }

  let repairedMembers = 0;
  for (const business of businesses) {
    const memberRes = await fetch(
      `${supabaseUrl}/rest/v1/business_members?business_id=eq.${encodeURIComponent(business.id)}&profile_id=eq.${encodeURIComponent(profileId)}&select=business_id`,
      { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
    );
    if (!memberRes.ok) continue;
    const existing = (await memberRes.json()) as Array<{ business_id: string }>;
    if (existing.length > 0) continue;

    const response = await fetch(`${supabaseUrl}/rest/v1/business_members`, {
      method: 'POST',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify({
        business_id: business.id,
        profile_id: profileId,
        role: 'admin',
        joined_at: new Date().toISOString(),
      }),
    });
    if (response.ok) repairedMembers++;
  }

  return { repairedBusinesses, repairedMembers };
}

export async function handleMigrateRepairOwnership(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const authError = await verifyMigrationRequest(request, env);
  if (authError) return authError;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await request.json()) as { firebase_uid?: string };
    if (!body.firebase_uid) {
      return new Response(JSON.stringify({ error: 'firebase_uid is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const result = await repairMigratedOwnership(env, body.firebase_uid);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[migrate] repair ownership failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Repair failed' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function handleFirestoreMigrateBatch(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const authError = await verifyMigrationRequest(request, env);
  if (authError) return authError;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await request.json()) as MigrateBatchRequest;
    if (!body.table || !Array.isArray(body.rows)) {
      return new Response(JSON.stringify({ error: 'Invalid migration batch payload' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const result = await serviceRoleUpsert(env, body.table, body.rows, body.onConflict);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[migrate] batch failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Migration batch failed' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
