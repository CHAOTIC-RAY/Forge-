import { describe, expect, it } from 'vitest';
import { scanFirestoreExport, scanFirestoreExportText } from './migrationScan';

describe('migrationScan', () => {
  const samplePayload = {
    exportedAt: '2026-06-01T00:00:00.000Z',
    firebaseProjectId: 'demo',
    counts: {
      users: 1,
      businesses: 2,
      posts: 5,
      notebooks: 1,
    },
    collections: {
      users: [{ id: 'u1', data: { email: 'a@b.com', displayName: 'Ada' } }],
      businesses: [
        { id: 'b1', data: { name: 'Alpha Co' } },
        { id: 'b2', data: { name: 'Beta Co' } },
      ],
      posts: [
        { id: 'p1', data: { businessId: 'b1', title: 'Launch', date: '2026-06-01' } },
        { id: 'p2', data: { businessId: 'b1', title: 'Reel', date: '2026-06-02' } },
      ],
      notebooks: [{ id: 'n1', data: { blocks: [{ id: '1' }, { id: '2' }] } }],
    },
  };

  it('uses embedded counts for fast scanning', () => {
    const scan = scanFirestoreExport(samplePayload, 'demo.json');
    expect(scan.valid).toBe(true);
    expect(scan.units.find((u) => u.id === 'businesses')?.count).toBe(2);
    expect(scan.units.find((u) => u.id === 'posts')?.count).toBe(5);
    expect(scan.defaultSelection.businesses).toBe(true);
  });

  it('returns a bundle from text scan', async () => {
    const bundle = await scanFirestoreExportText(JSON.stringify(samplePayload), 'demo.json');
    expect(bundle.scan.valid).toBe(true);
    expect(bundle.payload.collections?.businesses).toHaveLength(2);
    expect(bundle.scan.workspaces.map((w) => w.name)).toEqual(['Alpha Co', 'Beta Co']);
  });

  it('rejects non-export JSON early', async () => {
    const bundle = await scanFirestoreExportText('{"posts":[]}', 'bad.json');
    expect(bundle.scan.valid).toBe(false);
    expect(bundle.scan.error).toMatch(/Not a Forge account export/i);
  });
});
