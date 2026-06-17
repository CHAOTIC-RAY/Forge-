import { auth } from './firebase';
import { repairWorkspaceOwnership } from './workspaceRepair';

export async function importForgeJsonBackup(
  file: File,
  onProgress: (stage: string) => void
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in required');
  }

  const text = await file.text();
  const payload = JSON.parse(text) as {
    collections?: Record<string, Array<{ id: string; data: Record<string, unknown> }>>;
  };
  if (!payload.collections) {
    throw new Error('Invalid Forge export — expected a collections object.');
  }

  const { migrateFirestoreExportToSupabase } = await import('./firestoreToSupabase');

  await migrateFirestoreExportToSupabase(
    payload,
    () => user.getIdToken(),
    (progress) => onProgress(progress.stage),
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }
  );

  onProgress('Linking workspaces to your account…');
  await repairWorkspaceOwnership();
}
