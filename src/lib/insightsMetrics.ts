import type { Post } from '../data';

export type InsightsRangeDays = 7 | 30 | 90;

export interface PostingStats {
  rangeDays: InsightsRangeDays;
  postsCount: number;
  priorPostsCount: number;
  deltaPercent: number | null;
  avgPerWeek: number;
  busiestWeekday: string;
  topOutlet: { name: string; count: number; percent: number } | null;
  topFormat: { name: string; count: number; percent: number } | null;
  postsByWeekday: { day: string; count: number }[];
  outletMix: { name: string; count: number; percent: number }[];
  formatMix: { name: string; count: number; percent: number }[];
  postsPerWeek: { label: string; count: number }[];
  topHashtags: { tag: string; count: number }[];
  topTerms: { term: string; count: number }[];
  gaps: string[];
  consistencyPercent: number;
  recentPosts: { id: string; title: string; date: string; outlet: string; format: string }[];
  upcomingCount: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'your', 'our', 'we', 'you',
  'is', 'are', 'at', 'from', 'this', 'that', 'it', 'be', 'as', 'by', 'new', 'all', 'get', 'out',
]);

function parsePostDate(post: Post): Date | null {
  if (!post.date) return null;
  const d = new Date(`${post.date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getPostFormatLabel(post: Post): string {
  const cf = post.contentFormats?.[0];
  if (cf) return cf;
  const t = (post.type || '').trim();
  if (t) return t;
  return 'Post';
}

function countByKey(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const k of items) {
    const key = k.trim() || 'Unknown';
    m.set(key, (m.get(key) || 0) + 1);
  }
  return m;
}

function toMix(map: Map<string, number>, total: number) {
  return [...map.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function extractHashtags(post: Post): string[] {
  const raw = `${post.hashtags || ''} ${post.caption || ''}`;
  const tags = raw.match(/#[\w\u0080-\uFFFF]+/g) || [];
  return tags.map((t) => t.toLowerCase());
}

function extractTerms(post: Post): string[] {
  const raw = `${post.title || ''} ${post.caption || ''}`.toLowerCase();
  return raw
    .replace(/#[\w]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function postsInRange(posts: Post[], start: Date, end: Date): Post[] {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime() + 86400000;
  return posts.filter((p) => {
    const d = parsePostDate(p);
    if (!d) return false;
    const t = startOfDay(d).getTime();
    return t >= s && t < e;
  });
}

function computeGaps(posts: Post[], today: Date): string[] {
  const gaps: string[] = [];
  const upcoming = posts.filter((p) => {
    const d = parsePostDate(p);
    return d && startOfDay(d).getTime() >= startOfDay(today).getTime();
  });
  if (upcoming.length === 0) {
    gaps.push('No posts scheduled from today onward—add dates on the calendar.');
    return gaps;
  }
  const byDay = new Set(upcoming.map((p) => p.date));
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    if (!byDay.has(key)) {
      gaps.push(`No post on ${WEEKDAYS[d.getDay()]} ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`);
      if (gaps.length >= 3) break;
    }
  }
  return gaps;
}

export function computePostingStats(posts: Post[], rangeDays: InsightsRangeDays): PostingStats {
  const today = startOfDay(new Date());
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - rangeDays);

  const priorEnd = new Date(rangeStart);
  const priorStart = new Date(rangeStart);
  priorStart.setDate(priorStart.getDate() - rangeDays);

  const inRange = postsInRange(posts, rangeStart, rangeEnd);
  const priorRange = postsInRange(posts, priorStart, priorEnd);
  const total = inRange.length;

  let deltaPercent: number | null = null;
  if (priorRange.length > 0) {
    deltaPercent = Math.round(((total - priorRange.length) / priorRange.length) * 100);
  } else if (total > 0) {
    deltaPercent = 100;
  }

  const weekdayCounts = new Array(7).fill(0);
  for (const p of inRange) {
    const d = parsePostDate(p);
    if (d) weekdayCounts[d.getDay()]++;
  }
  const busiestIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts, 0));
  const busiestWeekday = total > 0 && weekdayCounts[busiestIdx] > 0 ? WEEKDAYS[busiestIdx] : '—';

  const outletMix = toMix(
    countByKey(inRange.map((p) => p.outlet || 'Unknown')),
    total
  );
  const formatMix = toMix(
    countByKey(inRange.map(getPostFormatLabel)),
    total
  );

  const postsByWeekday = WEEKDAYS.map((day, i) => ({ day, count: weekdayCounts[i] }));

  const weekBuckets = new Map<string, number>();
  for (const p of inRange) {
    const d = parsePostDate(p);
    if (!d) continue;
    const w = new Date(d);
    w.setDate(w.getDate() - w.getDay());
    const label = w.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    weekBuckets.set(label, (weekBuckets.get(label) || 0) + 1);
  }
  const postsPerWeek = [...weekBuckets.entries()]
    .map(([label, count]) => ({ label, count }))
    .slice(-8);

  const tagCounts = new Map<string, number>();
  for (const p of inRange) {
    for (const tag of extractHashtags(p)) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topHashtags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const termCounts = new Map<string, number>();
  for (const p of inRange) {
    for (const term of extractTerms(p)) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
  }
  const topTerms = [...termCounts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const withCaption = inRange.filter((p) => (p.caption || '').trim().length > 10).length;
  const withMedia = inRange.filter((p) => (p.images?.length || 0) > 0).length;
  const consistencyPercent =
    total > 0 ? Math.round(((withCaption + withMedia) / (total * 2)) * 100) : 0;

  const upcomingCount = posts.filter((p) => {
    const d = parsePostDate(p);
    return d && startOfDay(d).getTime() >= today.getTime();
  }).length;

  const recentPosts = [...inRange]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      title: p.title || 'Untitled',
      date: p.date,
      outlet: p.outlet || '—',
      format: getPostFormatLabel(p),
    }));

  return {
    rangeDays,
    postsCount: total,
    priorPostsCount: priorRange.length,
    deltaPercent,
    avgPerWeek: Math.round((total / rangeDays) * 7 * 10) / 10,
    busiestWeekday,
    topOutlet: outletMix[0] || null,
    topFormat: formatMix[0] || null,
    postsByWeekday,
    outletMix,
    formatMix,
    postsPerWeek,
    topHashtags,
    topTerms,
    gaps: computeGaps(posts, today),
    consistencyPercent,
    recentPosts,
    upcomingCount,
  };
}

export function statsPayloadForCoach(stats: PostingStats) {
  return {
    range: `${stats.rangeDays}d`,
    postsCount: stats.postsCount,
    deltaPercent: stats.deltaPercent,
    topOutlet: stats.topOutlet?.name,
    topFormat: stats.topFormat?.name,
    busiestDay: stats.busiestWeekday,
    avgPerWeek: stats.avgPerWeek,
    gaps: stats.gaps,
    topHashtags: stats.topHashtags.slice(0, 5).map((h) => h.tag),
    consistencyPercent: stats.consistencyPercent,
    upcomingScheduled: stats.upcomingCount,
  };
}
