import type { SupabaseAuthEnv } from './handleSupabaseTokenExchange';
import { verifyFirebaseIdToken } from './supabaseAuthBridge';

export interface MigrateBatchRequest {
  table: string;
  rows: Record<string, unknown>[];
  onConflict?: string;
}

export async function serviceRoleUpsert(
  env: SupabaseAuthEnv,
  table: string,
  rows: Record<string, unknown>[],
  onConflict?: string
): Promise<{ inserted: number }> {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  if (!serviceKey || !supabaseUrl) {
    throw new Error('Supabase service role is not configured on the server.');
  }
  if (!rows.length) return { inserted: 0 };

  const conflictQuery = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${conflictQuery}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: onConflict ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upsert to ${table} failed: ${text}`);
  }

  return { inserted: rows.length };
}

export async function handleFirestoreMigrateBatch(
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

  const firebaseProjectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0018612871';
  const authHeader = request.headers.get('Authorization') || '';
  const firebaseToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!firebaseToken) {
    return new Response(JSON.stringify({ error: 'Missing Firebase ID token' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    await verifyFirebaseIdToken(firebaseToken, firebaseProjectId);
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
