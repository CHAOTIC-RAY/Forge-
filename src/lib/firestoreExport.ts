import { collection, getDocs, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const FIRESTORE_EXPORT_COLLECTIONS = [
  'users',
  'businesses',
  'posts',
  'inventory_products',
  'priority_products',
  'inventory_category_counts',
  'notebooks',
  'brand_kits',
  'brand_overviews',
  'categories',
  'inventory_maps',
  'short_links',
  'access_requests',
] as const;

export type FirestoreExportCollection = (typeof FIRESTORE_EXPORT_COLLECTIONS)[number];

export interface FirestoreExportPayload {
  exportedAt: string;
  firestoreDatabaseId: string;
  firebaseProjectId: string;
  collections: Record<string, Array<{ id: string; data: Record<string, unknown> }>>;
  counts: Record<string, number>;
}

async function readCollection(
  db: Firestore,
  name: string
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data() as Record<string, unknown>,
  }));
}

export async function exportFirestoreDatabase(
  db: Firestore,
  onProgress?: (stage: string) => void
): Promise<FirestoreExportPayload> {
  const collections: FirestoreExportPayload['collections'] = {};
  const counts: Record<string, number> = {};

  for (const name of FIRESTORE_EXPORT_COLLECTIONS) {
    onProgress?.(`Reading ${name}`);
    try {
      const docs = await readCollection(db, name);
      collections[name] = docs;
      counts[name] = docs.length;
    } catch {
      collections[name] = [];
      counts[name] = 0;
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    firebaseProjectId: firebaseConfig.projectId,
    collections,
    counts,
  };
}

export async function downloadFirestoreExport(
  db: Firestore,
  onProgress?: (stage: string) => void
): Promise<FirestoreExportPayload> {
  const payload = await exportFirestoreDatabase(db, onProgress);
  const stamp = payload.exportedAt.split('T')[0];
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `forge-firestore-export-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return payload;
}
