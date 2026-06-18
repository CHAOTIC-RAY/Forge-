import { auth } from './firebase';
import { repairWorkspaceOwnership } from './workspaceRepair';
import { parseFirestoreExportJson } from './migrationScan';
import type { MigrationSelection } from './migrationTypes';
import { normalizeMigrationSelection } from './migrationTypes';

export async function importForgeJsonBackup(
  file: File,
  onProgress: (stage: string) => void,
  selection?: MigrationSelection
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in required');
  }

  const text = await file.text();
  const payload = parseFirestoreExportJson(text);
  const normalized = normalizeMigrationSelection(selection || ({} as MigrationSelection));

  const anySelected = Object.values(normalized).some(Boolean);
  if (!anySelected) {
    throw new Error('Select at least one item to import.');
  }

  const { migrateFirestoreExportToSupabase } = await import('./firestoreToSupabase');

  await migrateFirestoreExportToSupabase(
    { collections: payload.collections! },
    () => user.getIdToken(),
    (progress) => onProgress(progress.stage),
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
    normalized
  );

  onProgress('Linking workspaces to your account…');
  await repairWorkspaceOwnership();
}
