import type { SupabaseAuthEnv } from './handleSupabaseTokenExchange';

export function resolveSupabaseServiceKey(env: SupabaseAuthEnv): string | undefined {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
}

export function validateSupabaseServiceKey(key: string): void {
  const parts = key.split('.');
  if (parts.length !== 3) return;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
          (c) => c.charCodeAt(0)
        )
      )
    ) as { role?: string };

    if (payload.role && payload.role !== 'service_role') {
      throw new Error(
        'The configured Supabase key is not a service_role key. In Supabase Dashboard → Project Settings → API, copy the service_role secret (not the anon/publishable key). You can set it as SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY on the Worker.'
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('service_role')) {
      throw error;
    }
  }
}
