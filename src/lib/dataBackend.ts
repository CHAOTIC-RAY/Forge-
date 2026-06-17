export type DataBackend = 'legacy' | 'supabase';

const STORAGE_KEY = 'forge_data_backend';

export function getDataBackend(): DataBackend {
  if (typeof window === 'undefined') return 'supabase';
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'legacy' ? 'legacy' : 'supabase';
}

export function setDataBackend(backend: DataBackend): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, backend);
}

export function isLegacyBackend(): boolean {
  return getDataBackend() === 'legacy';
}

export function isSupabaseBackend(): boolean {
  return getDataBackend() === 'supabase';
}

export function clearDataBackend(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
