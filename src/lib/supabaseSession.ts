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

  inflightExchange = (async () => {
    const firebaseToken = await user.getIdToken(forceRefresh);
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
      throw new Error(body.error || `Supabase token exchange failed (${response.status})`);
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };
    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + expiresInMs,
    };
    return cachedToken.token;
  })();

  try {
    return await inflightExchange;
  } finally {
    inflightExchange = null;
  }
}
