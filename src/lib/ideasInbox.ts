import { auth } from './firebase';
import { getNotebook, upsertNotebook } from './supabase';

export async function saveTextToIdeasInbox(
  businessId: string,
  title: string,
  content: string,
  profileId?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to save to Ideas.');
  if (!businessId) throw new Error('Select a workspace first.');

  let resolvedProfileId = profileId;
  if (!resolvedProfileId) {
    const { getProfile } = await import('./supabase');
    const profile = await getProfile(user.uid);
    if (!profile) throw new Error('Profile not found. Please sign in again.');
    resolvedProfileId = profile.id;
  }

  const existing = await getNotebook(businessId, resolvedProfileId);
  const currentBlocks = existing?.blocks || [];

  const newBlock = {
    id: crypto.randomUUID(),
    type: 'text',
    title: title.slice(0, 200),
    content,
    status: 'inbox',
    folderId: null,
    createdAt: Date.now(),
  };

  await upsertNotebook(businessId, resolvedProfileId, {
    title: existing?.title || 'Ideas',
    blocks: [newBlock, ...currentBlocks],
    links: existing?.links || [],
    folders: existing?.folders || [],
  });
}
