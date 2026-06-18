import { auth } from './firebase';
import type { Profile } from './supabase';
import type { Business } from '../data';

async function firebaseAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/** Sync profile via Worker service-role API (bypasses broken client JWT). */
export async function syncProfileViaApi(): Promise<Profile> {
  const headers = await firebaseAuthHeader();
  const response = await fetch('/api/profile/sync', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Profile sync failed (${response.status})`);
  }
  const body = (await response.json()) as { profile: Profile };
  return body.profile;
}

/** Mark onboarding complete via service-role API. */
export async function completeOnboardingViaApi(): Promise<void> {
  const headers = await firebaseAuthHeader();
  const response = await fetch('/api/profile/complete-onboarding', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `Complete onboarding failed (${response.status})`
    );
  }
}

/** Load workspaces via service-role API (works when Supabase client JWT is invalid). */
export async function fetchBusinessesViaApi(): Promise<Business[]> {
  const headers = await firebaseAuthHeader();
  const response = await fetch('/api/businesses/mine', { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Load businesses failed (${response.status})`);
  }
  const body = (await response.json()) as { businesses: unknown[] };
  const { transformBusinessFromApi } = await import('./supabaseBusinessTransform');
  return (body.businesses || []).map((row) => transformBusinessFromApi(row));
}
