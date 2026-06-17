import {
  signSupabaseAccessToken,
  verifyFirebaseIdToken,
  type VerifiedFirebaseUser,
} from './supabaseAuthBridge';

export interface SupabaseAuthEnv {
  VITE_SUPABASE_URL?: string;
  SUPABASE_JWT_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
}

async function bootstrapProfile(
  env: SupabaseAuthEnv,
  user: VerifiedFirebaseUser
): Promise<Record<string, unknown> | null> {
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return null;

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?on_conflict=firebase_uid`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      firebase_uid: user.uid,
      email: user.email ?? '',
      display_name: user.name ?? null,
      photo_url: user.picture ?? null,
    }),
  });

  if (!response.ok) {
    console.error('[auth] Profile bootstrap failed:', await response.text());
    return null;
  }

  const rows = (await response.json()) as Record<string, unknown>[];
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function handleSupabaseTokenExchange(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const jwtSecret = env.SUPABASE_JWT_SECRET;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const firebaseProjectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0018612871';

  if (!jwtSecret || !supabaseUrl) {
    return new Response(
      JSON.stringify({
        error: 'Supabase auth bridge is not configured on the server (missing JWT secret).',
      }),
      { status: 503, headers: corsHeaders }
    );
  }

  const authHeader = request.headers.get('Authorization') || '';
  const firebaseToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!firebaseToken) {
    return new Response(JSON.stringify({ error: 'Missing Firebase ID token' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const firebaseUser = await verifyFirebaseIdToken(firebaseToken, firebaseProjectId);
    const profile = await bootstrapProfile(env, firebaseUser);
    const expiresIn = 3600;
    const accessToken = await signSupabaseAccessToken(
      jwtSecret,
      supabaseUrl,
      firebaseUser,
      expiresIn
    );

    return new Response(
      JSON.stringify({
        access_token: accessToken,
        expires_in: expiresIn,
        token_type: 'bearer',
        profile,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[auth] Supabase token exchange failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Token exchange failed',
      }),
      { status: 401, headers: corsHeaders }
    );
  }
}
