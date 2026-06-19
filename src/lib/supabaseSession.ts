import { auth } from './firebase';

interface CachedSupabaseToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedSupabaseToken | null = null;
let inflightExchange: Promise<string | null> | null = null;

export function clearSupabaseAccessToken(): void {
  cachedToken = null;
  inflightExchange = null;
}

export async function exchangeSupabaseAccessToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    clearSupabaseAccessToken();
    return null;
  }

  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  if (!forceRefresh && inflightExchange) {
    return inflightExchange;
  }

  const runExchange = async (refreshFirebaseToken: boolean): Promise<string | null> => {
    const firebaseToken = await user.getIdToken(refreshFirebaseToken);
    const response = await fetch('/api/auth/supabase-token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      clearSupabaseAccessToken();
      const body = await response.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || `Supabase token exchange failed (${response.status})`);
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };
    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + expiresInMs,
    };
    return cachedToken.token;
  };

  inflightExchange = (async () => {
    try {
      return await runExchange(forceRefresh);
    } catch (firstError) {
      if (!forceRefresh) {
        try {
          return await runExchange(true);
        } catch {
          throw firstError;
        }
      }
      throw firstError;
    }
  })();

  try {
    return await inflightExchange;
  } finally {
    inflightExchange = null;
  }
}

/** Exchange Firebase session for Supabase JWT — required before direct Supabase REST calls. */
export async function ensureSupabaseAccessToken(forceRefresh = false): Promise<string> {
  const token = await exchangeSupabaseAccessToken(forceRefresh);
  if (!token) {
    throw new Error('Supabase token exchange returned no token. Sign in again.');
  }
  return token;
}
