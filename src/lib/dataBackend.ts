export type DataBackend = 'supabase';

const STORAGE_KEY = 'forge_data_backend';

/** Forge uses Supabase only. Clears any stale legacy mode from localStorage. */
export function ensureSupabaseBackend(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'supabase');
}

export function getDataBackend(): DataBackend {
  ensureSupabaseBackend();
  return 'supabase';
}

export function setDataBackend(_backend: DataBackend = 'supabase'): void {
  ensureSupabaseBackend();
}

export function isLegacyBackend(): boolean {
  return false;
}

export function isSupabaseBackend(): boolean {
  return true;
}

export function clearDataBackend(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
