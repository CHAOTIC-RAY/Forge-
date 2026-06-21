import type { SupabaseAuthEnv } from './handleSupabaseTokenExchange';
import { fetchProfileByFirebaseUid } from './handleSupabaseProfile';
import {
  getServiceConfig,
  profileCorsHeaders,
  serviceHeaders,
  verifyFirebaseBearer,
} from './supabaseServiceHttp';
import { postToDbRow, transformPostFromDb } from './postDbMapper';

const corsHeaders = profileCorsHeaders;

async function assertBusinessAccess(
  env: SupabaseAuthEnv,
  firebaseUid: string,
  businessId: string
): Promise<{ profileId: string } | Response> {
  const profile = await fetchProfileByFirebaseUid(env, firebaseUid);
  if (!profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 404,
      headers: corsHeaders,
    });
  }

  const { serviceKey, supabaseUrl } = getServiceConfig(env);

  const ownedRes = await fetch(
    `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&owner_id=eq.${encodeURIComponent(profile.id)}&select=id`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!ownedRes.ok) {
    const text = await ownedRes.text();
    throw new Error(`Business access check failed: ${text}`);
  }
  const owned = (await ownedRes.json()) as Array<{ id: string }>;
  if (owned.length > 0) return { profileId: profile.id };

  const memberRes = await fetch(
    `${supabaseUrl}/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&profile_id=eq.${encodeURIComponent(profile.id)}&select=business_id`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!memberRes.ok) {
    const text = await memberRes.text();
    throw new Error(`Business membership check failed: ${text}`);
  }
  const members = (await memberRes.json()) as Array<{ business_id: string }>;
  if (members.length > 0) return { profileId: profile.id };

  return new Response(JSON.stringify({ error: 'Access denied for this workspace' }), {
    status: 403,
    headers: corsHeaders,
  });
}

async function fetchPostsForBusiness(env: SupabaseAuthEnv, businessId: string) {
  const { serviceKey, supabaseUrl } = getServiceConfig(env);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/posts?business_id=eq.${encodeURIComponent(businessId)}&select=*&order=date.asc`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load posts: ${text}`);
  }
  const rows = (await response.json()) as Record<string, unknown>[];
  return rows.map(transformPostFromDb);
}

export async function handleDataPosts(request: Request, env: SupabaseAuthEnv): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);

  if (request.method === 'GET') {
    const businessId = url.searchParams.get('businessId') || '';
    const profileId = url.searchParams.get('profileId') || '';
    if (!businessId && !profileId) {
      return new Response(JSON.stringify({ error: 'businessId or profileId is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    try {
      if (businessId) {
        const access = await assertBusinessAccess(env, auth.uid, businessId);
        if (access instanceof Response) return access;
        const posts = await fetchPostsForBusiness(env, businessId);
        return new Response(JSON.stringify({ posts }), { status: 200, headers: corsHeaders });
      }

      const profile = await fetchProfileByFirebaseUid(env, auth.uid);
      if (!profile || profile.id !== profileId) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: corsHeaders,
        });
      }
      const { serviceKey, supabaseUrl } = getServiceConfig(env);
      const response = await fetch(
        `${supabaseUrl}/rest/v1/posts?profile_id=eq.${encodeURIComponent(profileId)}&select=*&order=date.asc`,
        { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to load posts: ${text}`);
      }
      const rows = (await response.json()) as Record<string, unknown>[];
      return new Response(JSON.stringify({ posts: rows.map(transformPostFromDb) }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to load posts' }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as {
        businessId?: string;
        profileId?: string;
        post?: Record<string, unknown>;
      };
      const businessId = body.businessId || '';
      if (!businessId || !body.post) {
        return new Response(JSON.stringify({ error: 'businessId and post are required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const access = await assertBusinessAccess(env, auth.uid, businessId);
      if (access instanceof Response) return access;

      const { serviceKey, supabaseUrl } = getServiceConfig(env);
      const row = postToDbRow(body.post as never, businessId, body.profileId || access.profileId);
      const response = await fetch(`${supabaseUrl}/rest/v1/posts?on_conflict=id`, {
        method: 'POST',
        headers: serviceHeaders(serviceKey, {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        }),
        body: JSON.stringify(row),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create post: ${text}`);
      }
      const rows = (await response.json()) as Record<string, unknown>[];
      return new Response(JSON.stringify({ post: transformPostFromDb(rows[0]) }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create post' }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders,
  });
}

export async function handleDataPostById(
  request: Request,
  env: SupabaseAuthEnv,
  postId: string
): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  const { serviceKey, supabaseUrl } = getServiceConfig(env);

  const existingRes = await fetch(
    `${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}&select=business_id`,
    { headers: serviceHeaders(serviceKey, { Accept: 'application/json' }) }
  );
  if (!existingRes.ok) {
    const text = await existingRes.text();
    throw new Error(`Failed to load post: ${text}`);
  }
  const existingRows = (await existingRes.json()) as Array<{ business_id: string }>;
  const businessId = existingRows[0]?.business_id;
  if (!businessId) {
    return new Response(JSON.stringify({ error: 'Post not found' }), {
      status: 404,
      headers: corsHeaders,
    });
  }

  const access = await assertBusinessAccess(env, auth.uid, businessId);
  if (access instanceof Response) return access;

  if (request.method === 'PATCH') {
    try {
      const body = (await request.json()) as { updates?: Record<string, unknown> };
      const updates = body.updates || {};
      const patch = postToDbRow(updates as never, businessId, access.profileId);
      delete patch.business_id;
      delete patch.profile_id;
      patch.updated_at = new Date().toISOString();

      const response = await fetch(
        `${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}`,
        {
          method: 'PATCH',
          headers: serviceHeaders(serviceKey, {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          }),
          body: JSON.stringify(patch),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to update post: ${text}`);
      }
      const rows = (await response.json()) as Record<string, unknown>[];
      return new Response(JSON.stringify({ post: transformPostFromDb(rows[0]) }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update post' }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  if (request.method === 'DELETE') {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}`,
      {
        method: 'DELETE',
        headers: serviceHeaders(serviceKey, { Prefer: 'return=minimal' }),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `Failed to delete post: ${text}` }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders,
  });
}

export async function handleDataPostsBatchImport(
  request: Request,
  env: SupabaseAuthEnv
): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await request.json()) as {
      businessId?: string;
      profileId?: string;
      posts?: Record<string, unknown>[];
    };
    const businessId = body.businessId || '';
    const posts = body.posts || [];
    if (!businessId || !posts.length) {
      return new Response(JSON.stringify({ error: 'businessId and posts are required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const access = await assertBusinessAccess(env, auth.uid, businessId);
    if (access instanceof Response) return access;

    const { serviceKey, supabaseUrl } = getServiceConfig(env);
    const rows = posts.map((post) =>
      postToDbRow(post as never, businessId, body.profileId || access.profileId)
    );

    const response = await fetch(`${supabaseUrl}/rest/v1/posts?on_conflict=id`, {
      method: 'POST',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(rows),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to import posts: ${text}`);
    }

    return new Response(JSON.stringify({ imported: rows.length }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to import posts' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function handleDataWorkspace(request: Request, env: SupabaseAuthEnv): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const businessId = new URL(request.url).searchParams.get('businessId') || '';
  if (!businessId) {
    return new Response(JSON.stringify({ error: 'businessId is required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const access = await assertBusinessAccess(env, auth.uid, businessId);
    if (access instanceof Response) return access;

    const { serviceKey, supabaseUrl } = getServiceConfig(env);
    const headers = serviceHeaders(serviceKey, { Accept: 'application/json' });

    const [brandKitRes, categoriesRes, inventoryRes, mapsRes, overviewRes, countsRes, todosRes] =
      await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/brand_kits?business_id=eq.${encodeURIComponent(businessId)}&select=*`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/categories?business_id=eq.${encodeURIComponent(businessId)}&select=*`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/inventory_products?business_id=eq.${encodeURIComponent(businessId)}&select=*&order=name.asc`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/inventory_maps?business_id=eq.${encodeURIComponent(businessId)}&select=links`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/brand_overviews?business_id=eq.${encodeURIComponent(businessId)}&select=overview`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/inventory_category_counts?business_id=eq.${encodeURIComponent(businessId)}&select=category,count`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/todos?profile_id=eq.${encodeURIComponent(access.profileId)}&select=*`,
          { headers }
        ),
      ]);

    const readJson = async (res: Response) => (res.ok ? res.json() : []);
    const brandKitRows = (await readJson(brandKitRes)) as Array<Record<string, unknown>>;
    const categoriesRows = (await readJson(categoriesRes)) as Array<Record<string, unknown>>;
    const inventory = await readJson(inventoryRes);
    const mapsRows = (await readJson(mapsRes)) as Array<{ links?: unknown }>;
    const overviewRows = (await readJson(overviewRes)) as Array<{ overview?: unknown }>;
    const countRows = (await readJson(countsRes)) as Array<{ category?: string; count?: number }>;
    const todoRows = (await readJson(todosRes)) as Array<Record<string, unknown>>;

    const brandKitRow = brandKitRows[0];
    const brandKit = brandKitRow
      ? {
          ...((brandKitRow.kit_data as Record<string, unknown>) || {}),
          designGuide:
            (brandKitRow.kit_data as Record<string, unknown>)?.designGuide ||
            brandKitRow.ai_generated_guide ||
            '',
        }
      : null;

    const todos = todoRows.map((t) => ({
      id: String(t.id),
      text: String(t.text || ''),
      completed: Boolean(t.completed),
      dueDate: t.due_date as string | undefined,
      dueTime: t.due_time as string | undefined,
      priority: (t.priority as 'low' | 'medium' | 'high') || 'medium',
      project: t.project as string | undefined,
    }));

    return new Response(
      JSON.stringify({
        brandKit,
        categories: categoriesRows[0] || null,
        inventory,
        inventoryMaps: mapsRows[0]?.links ?? null,
        brandOverview: overviewRows[0]?.overview ?? null,
        categoryCounts: countRows.map((row) => ({
          category: String(row.category || ''),
          count: Number(row.count || 0),
        })),
        todos,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to load workspace data' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

type NotebookRow = {
  id?: string;
  business_id?: string;
  profile_id?: string;
  title?: string;
  blocks?: unknown;
  links?: unknown;
  folders?: unknown;
};

export async function handleDataNotebook(request: Request, env: SupabaseAuthEnv): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  const businessId = new URL(request.url).searchParams.get('businessId') || '';
  if (!businessId) {
    return new Response(JSON.stringify({ error: 'businessId is required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const access = await assertBusinessAccess(env, auth.uid, businessId);
    if (access instanceof Response) return access;

    const { profileId } = access;
    const { serviceKey, supabaseUrl } = getServiceConfig(env);
    const headers = serviceHeaders(serviceKey, { Accept: 'application/json' });

    if (request.method === 'GET') {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/notebooks?business_id=eq.${encodeURIComponent(businessId)}&profile_id=eq.${encodeURIComponent(profileId)}&select=*`,
        { headers }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to load notebook: ${text}`);
      }
      const rows = (await response.json()) as NotebookRow[];
      return new Response(JSON.stringify({ notebook: rows[0] ?? null }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      let body: { updates?: NotebookRow } & NotebookRow;
      try {
        body = (await request.json()) as { updates?: NotebookRow } & NotebookRow;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const updates = body.updates ?? body;
      const payload = {
        business_id: businessId,
        profile_id: profileId,
        title: updates.title ?? 'Ideas',
        blocks: updates.blocks ?? [],
        links: updates.links ?? [],
        folders: updates.folders ?? [],
      };

      const response = await fetch(`${supabaseUrl}/rest/v1/notebooks?on_conflict=business_id,profile_id`, {
        method: 'POST',
        headers: serviceHeaders(serviceKey, {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        }),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to save notebook: ${text}`);
      }
      const rows = (await response.json()) as NotebookRow[];
      return new Response(JSON.stringify({ notebook: rows[0] }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Notebook request failed' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function handleDataCategories(request: Request, env: SupabaseAuthEnv): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const businessId = new URL(request.url).searchParams.get('businessId') || '';
  if (!businessId) {
    return new Response(JSON.stringify({ error: 'businessId is required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const access = await assertBusinessAccess(env, auth.uid, businessId);
    if (access instanceof Response) return access;

    const payload = (await request.json()) as Record<string, unknown>;
    const { serviceKey, supabaseUrl } = getServiceConfig(env);
    const row: Record<string, unknown> = {
      business_id: businessId,
      updated_at: new Date().toISOString(),
    };
    if (payload.categories !== undefined) row.categories = payload.categories;
    if (payload.targetPlatforms !== undefined) row.target_platforms = payload.targetPlatforms;
    if (payload.target_platforms !== undefined) row.target_platforms = payload.target_platforms;
    if (payload.titles !== undefined) row.titles = payload.titles;

    const response = await fetch(`${supabaseUrl}/rest/v1/categories?on_conflict=business_id`, {
      method: 'POST',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to save categories: ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to save categories' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function handleDataBrandOverview(request: Request, env: SupabaseAuthEnv): Promise<Response> {
  const auth = await verifyFirebaseBearer(request, env);
  if (auth instanceof Response) return auth;

  if (request.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const businessId = new URL(request.url).searchParams.get('businessId') || '';
  if (!businessId) {
    return new Response(JSON.stringify({ error: 'businessId is required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const access = await assertBusinessAccess(env, auth.uid, businessId);
    if (access instanceof Response) return access;

    const body = (await request.json()) as { overview?: string };
    const overview = body.overview ?? '';
    const { serviceKey, supabaseUrl } = getServiceConfig(env);

    const response = await fetch(`${supabaseUrl}/rest/v1/brand_overviews?on_conflict=business_id`, {
      method: 'POST',
      headers: serviceHeaders(serviceKey, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        business_id: businessId,
        overview,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to save brand overview: ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to save brand overview' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
