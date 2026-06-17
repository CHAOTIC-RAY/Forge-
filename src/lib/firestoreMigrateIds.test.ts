import { describe, expect, it } from 'vitest';
import { firestoreEntityId, isUuid } from './firestoreMigrateIds';

describe('firestoreMigrateIds', () => {
  it('keeps valid UUIDs unchanged', () => {
    const uuid = '1677339f-81d5-4f32-bd33-7dff05f75cc6';
    expect(isUuid(uuid)).toBe(true);
    expect(firestoreEntityId('post', uuid)).toBe(uuid);
  });

  it('maps Firestore short IDs to stable UUIDs', () => {
    const mapped = firestoreEntityId('post', '0hz6x0mff');
    expect(mapped).toBeTruthy();
    expect(isUuid(mapped!)).toBe(true);
    expect(firestoreEntityId('post', '0hz6x0mff')).toBe(mapped);
    expect(firestoreEntityId('business', '0hz6x0mff')).not.toBe(mapped);
  });
});
