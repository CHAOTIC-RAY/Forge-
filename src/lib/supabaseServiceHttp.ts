import type { SupabaseAuthEnv } from './handleSupabaseTokenExchange';
import { verifyFirebaseIdToken } from './supabaseAuthBridge';
import { resolveSupabaseServiceKey, validateSupabaseServiceKey } from './supabaseServiceKey';

export function getServiceConfig(env: SupabaseAuthEnv): { serviceKey: string; supabaseUrl: string } {
  const serviceKey = resolveSupabaseServiceKey(env);
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  if (!serviceKey || !supabaseUrl) {
    throw new Error(
      'Supabase service key is not configured on the server. Set SUPABASE_SERVICE_KEY in Cloudflare Worker variables.'
    );
  }
  validateSupabaseServiceKey(serviceKey);
  return { serviceKey, supabaseUrl };
}

export function serviceHeaders(serviceKey: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extra,
  };
}

export const profileCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export async function verifyFirebaseBearer(
  request: Request,
  env: SupabaseAuthEnv
): Promise<{ uid: string; email?: string; name?: string; picture?: string } | Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: profileCorsHeaders });
  }

  const firebaseProjectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0018612871';
  const firebaseApiKey = env.FIREBASE_API_KEY;
  const authHeader = request.headers.get('Authorization') || '';
  const firebaseToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!firebaseToken) {
    return new Response(JSON.stringify({ error: 'Missing Firebase ID token' }), {
      status: 401,
      headers: profileCorsHeaders,
    });
  }

  try {
    const user = await verifyFirebaseIdToken(firebaseToken, firebaseProjectId, firebaseApiKey);
    return user;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid Firebase ID token' }),
      { status: 401, headers: profileCorsHeaders }
    );
  }
}
