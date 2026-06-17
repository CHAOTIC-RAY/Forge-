import { auth } from './firebase';

export async function repairWorkspaceOwnership(): Promise<{
  repairedBusinesses?: number;
  repairedMembers?: number;
} | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const token = await user.getIdToken();
  const response = await fetch('/api/migrate/repair-ownership', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firebase_uid: user.uid }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Workspace repair failed (${response.status})`);
  }

  return response.json();
}
