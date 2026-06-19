import { auth } from './firebase';
import type { Profile } from './supabase';
import type { Business } from '../data';

async function firebaseAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error((body as { error?: string }).error || `${fallback} (${response.status})`);
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
  if (!response.ok) await parseError(response, 'Load businesses failed');
  const body = (await response.json()) as { businesses: unknown[] };
  const { transformBusinessFromApi } = await import('./supabaseBusinessTransform');
  return (body.businesses || []).map((row) => transformBusinessFromApi(row));
}

/** Create a workspace via service-role API. */
export async function createBusinessViaApi(business: {
  name?: string;
  industry?: string;
  description?: string;
  targetUrl?: string;
  position?: string;
  brandColors?: Record<string, unknown>;
  logoUrl?: string;
}): Promise<Business> {
  const headers = await firebaseAuthHeader();
  const response = await fetch('/api/businesses/create', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(business),
  });
  if (!response.ok) await parseError(response, 'Create business failed');
  const body = (await response.json()) as { business: Business };
  return body.business;
}

/** Complete onboarding: business, categories, brand kit, profile settings. */
export async function completeOnboardingSetupViaApi(payload: {
  name?: string;
  industry?: string;
  description?: string;
  targetUrl?: string;
  brandColors?: { primary?: string; secondary?: string; accent?: string };
  outletNames?: string;
  geminiApiKey?: string;
  aiSettings?: Record<string, unknown>;
}): Promise<Business> {
  const headers = await firebaseAuthHeader();
  const response = await fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Complete onboarding failed');
  const body = (await response.json()) as { business: Business };
  return body.business;
}
