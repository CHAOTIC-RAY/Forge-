import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

/** Bump when auth/storage integration changes and stale sessions must be cleared. */
export const AUTH_SESSION_VERSION = 'forge_supabase_auth_v2';

function waitForFirebaseAuthReady(): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
}

/** Clear pre-migration Firebase sessions once so Supabase sync starts clean. */
export async function ensureAuthSessionVersion(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (localStorage.getItem(AUTH_SESSION_VERSION)) return;

    await waitForFirebaseAuthReady();
    if (auth.currentUser) {
      await auth.signOut();
    }
    localStorage.setItem(AUTH_SESSION_VERSION, '1');
  } catch (error) {
    console.warn('[auth] Session migration failed:', error);
    localStorage.setItem(AUTH_SESSION_VERSION, '1');
  }
}

export function isSupabaseAuthFailure(error: unknown): boolean {
  const err = error as { status?: number; code?: string; message?: string };
  const message = err?.message?.toLowerCase() ?? '';
  return (
    err?.status === 401 ||
    err?.status === 403 ||
    err?.code === 'PGRST301' ||
    message.includes('jwt') ||
    message.includes('invalid claim') ||
    message.includes('not authenticated')
  );
}
