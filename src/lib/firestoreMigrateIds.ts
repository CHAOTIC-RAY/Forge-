import { v5 as uuidv5, validate as uuidValidate } from 'uuid';

/** Namespace for deterministic Firestore document ID → UUID mapping during migration. */
const FORGE_MIGRATE_NS = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export function isUuid(value: string): boolean {
  return uuidValidate(value);
}

/** Map a Firestore string ID to a stable UUID for a given table scope. */
export function firestoreEntityId(scope: string, rawId: string | undefined | null): string | null {
  if (!rawId) return null;
  if (isUuid(rawId)) return rawId;
  return uuidv5(`${scope}:${rawId}`, FORGE_MIGRATE_NS);
}
