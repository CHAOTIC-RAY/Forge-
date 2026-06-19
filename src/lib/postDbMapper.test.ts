import { describe, expect, it } from 'vitest';
import { isUuid } from './firestoreMigrateIds';
import { postToDbRow } from './postDbMapper';

describe('postToDbRow', () => {
  it('maps legacy Firestore post IDs to UUIDs for Supabase', () => {
    const row = postToDbRow({ id: '0hz6x0mff', title: 'Test post' }, 'business-uuid', 'profile-uuid');
    expect(typeof row.id).toBe('string');
    expect(isUuid(String(row.id))).toBe(true);
  });

  it('preserves valid UUID post IDs', () => {
    const id = '1677339f-81d5-4f32-bd33-7dff05f75cc6';
    const row = postToDbRow({ id, title: 'Test post' }, 'business-uuid', 'profile-uuid');
    expect(row.id).toBe(id);
  });
});
