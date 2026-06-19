import { auth } from './firebase';
import type { Post } from '../data';
import type { InventoryProduct } from './supabase';
import type { TodoItem } from './supabase';
import { transformPostFromDb } from './postDbMapper';

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

export async function fetchPostsViaApi(businessId: string): Promise<Post[]> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(
    `/api/data/posts?businessId=${encodeURIComponent(businessId)}`,
    { headers }
  );
  if (!response.ok) await parseError(response, 'Failed to load posts');
  const body = (await response.json()) as { posts: unknown[] };
  return (body.posts || []).map((row) => transformPostFromDb(row as Record<string, unknown>));
}

export async function fetchPostsByProfileViaApi(profileId: string): Promise<Post[]> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(
    `/api/data/posts?profileId=${encodeURIComponent(profileId)}`,
    { headers }
  );
  if (!response.ok) await parseError(response, 'Failed to load posts');
  const body = (await response.json()) as { posts: unknown[] };
  return (body.posts || []).map((row) => transformPostFromDb(row as Record<string, unknown>));
}

export async function createPostViaApi(
  post: Partial<Post>,
  businessId: string,
  profileId?: string
): Promise<Post> {
  const headers = await firebaseAuthHeader();
  const response = await fetch('/api/data/posts', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, profileId, post }),
  });
  if (!response.ok) await parseError(response, 'Failed to create post');
  const body = (await response.json()) as { post: unknown };
  return transformPostFromDb(body.post as Record<string, unknown>);
}

export async function updatePostViaApi(id: string, updates: Partial<Post>): Promise<Post> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(`/api/data/posts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!response.ok) await parseError(response, 'Failed to update post');
  const body = (await response.json()) as { post: unknown };
  return transformPostFromDb(body.post as Record<string, unknown>);
}

export async function deletePostViaApi(id: string): Promise<void> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(`/api/data/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) await parseError(response, 'Failed to delete post');
}

export async function importPostsViaApi(
  posts: Partial<Post>[],
  businessId: string,
  profileId?: string
): Promise<{ imported: number }> {
  const headers = await firebaseAuthHeader();
  const response = await fetch('/api/data/posts/batch-import', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, profileId, posts }),
  });
  if (!response.ok) await parseError(response, 'Failed to import posts');
  return (await response.json()) as { imported: number };
}

export interface WorkspaceSnapshot {
  brandKit: Record<string, unknown> | null;
  categories: Record<string, unknown> | null;
  inventory: InventoryProduct[];
  inventoryMaps: unknown;
  brandOverview: unknown;
  categoryCounts: Array<{ category: string; count: number }>;
  todos: TodoItem[];
}

export async function upsertCategoriesViaApi(
  businessId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(
    `/api/data/categories?businessId=${encodeURIComponent(businessId)}`,
    {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) await parseError(response, 'Failed to save categories');
}

export async function upsertBrandOverviewViaApi(
  businessId: string,
  overview: string
): Promise<void> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(
    `/api/data/brand-overview?businessId=${encodeURIComponent(businessId)}`,
    {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ overview }),
    }
  );
  if (!response.ok) await parseError(response, 'Failed to save brand overview');
}

export async function fetchWorkspaceSnapshotViaApi(businessId: string): Promise<WorkspaceSnapshot> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(
    `/api/data/workspace?businessId=${encodeURIComponent(businessId)}`,
    { headers }
  );
  if (!response.ok) await parseError(response, 'Failed to load workspace data');
  return (await response.json()) as WorkspaceSnapshot;
}

export type NotebookApiRow = {
  id: string;
  business_id: string;
  profile_id: string;
  title: string;
  blocks: unknown[];
  links: unknown[];
  folders: unknown[];
  created_at: string;
  updated_at: string;
};

export async function fetchNotebookViaApi(businessId: string): Promise<NotebookApiRow | null> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(
    `/api/data/notebook?businessId=${encodeURIComponent(businessId)}`,
    { headers }
  );
  if (!response.ok) await parseError(response, 'Failed to load notebook');
  const body = (await response.json()) as { notebook: NotebookApiRow | null };
  return body.notebook ?? null;
}

export async function upsertNotebookViaApi(
  businessId: string,
  updates: Partial<Pick<NotebookApiRow, 'title' | 'blocks' | 'links' | 'folders'>>
): Promise<NotebookApiRow> {
  const headers = await firebaseAuthHeader();
  const response = await fetch(
    `/api/data/notebook?businessId=${encodeURIComponent(businessId)}`,
    {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    }
  );
  if (!response.ok) await parseError(response, 'Failed to save notebook');
  const body = (await response.json()) as { notebook: NotebookApiRow };
  return body.notebook;
}
