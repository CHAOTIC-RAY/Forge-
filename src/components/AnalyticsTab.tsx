import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Hash,
  Sparkles,
  Settings,
  ChevronRight,
  Instagram,
  Facebook,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { generateTextWithCascade } from '../lib/gemini';
import { getAnalyticsSettings, setAnalyticsSettings, cn } from '../lib/utils';
import {
  computePostingStats,
  statsPayloadForCoach,
  type InsightsRangeDays,
} from '../lib/insightsMetrics';
import type { Post } from '../data';
import type { Business } from '../data';
import { ForgeLoader } from './ForgeLoader';

type AnalyticsTabProps = {
  posts?: Post[];
  activeBusiness?: Business | null;
  setActiveTab?: (
    tab:
      | 'home'
      | 'schedule'
      | 'calendar'
      | 'search'
      | 'brandkit'
      | 'more'
      | 'chat'
      | 'widgets'
      | 'creative'
      | 'analytics'
      | 'ideas'
      | 'notebook'
  ) => void;
};

function StatCard({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className="glass-card p-4 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-safe">{label}</p>
      <p
        className={cn(
          'text-2xl font-bold mt-1 tabular-nums truncate',
          alert ? 'text-amber-600 dark:text-amber-400' : 'text-[#37352F] dark:text-[#EBE9ED]'
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[10px] text-[#757681] mt-1">{hint}</p> : null}
    </div>
  );
}

function BarChart({
  items,
  maxCount,
}: {
  items: { label: string; count: number }[];
  maxCount: number;
}) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-[#757681] py-8 text-center">No posts in this period yet.</p>
    );
  }
  return (
    <div className="flex items-end justify-between gap-2 h-[140px] pt-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-1 flex-1 min-w-0 group">
          <span className="text-[9px] font-bold text-brand opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
            {item.count}
          </span>
          <div
            className="w-full bg-brand/20 rounded-t-md overflow-hidden flex flex-col justify-end"
            style={{ height: `${maxCount > 0 ? Math.max(8, (item.count / maxCount) * 120) : 8}px` }}
          >
            <div className="w-full bg-brand rounded-t-md min-h-[4px]" style={{ flex: 1 }} />
          </div>
          <span className="text-[8px] text-[#757681] truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function MixList({ items, emptyLabel }: { items: { name: string; percent: number }[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-[#757681] py-4">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-3">
      {items.slice(0, 6).map((item) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-xs font-bold gap-2">
            <span className="truncate text-[#37352F] dark:text-[#EBE9ED]">{item.name}</span>
            <span className="text-brand shrink-0 tabular-nums">{item.percent}%</span>
          </div>
          <div className="h-1.5 bg-[#F7F7F5] dark:bg-[#202020] rounded-full overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E]">
            <div className="h-full bg-brand rounded-full" style={{ width: `${item.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsTab({ posts = [], activeBusiness, setActiveTab }: AnalyticsTabProps) {
  const [rangeDays, setRangeDays] = useState<InsightsRangeDays>(30);
  const [coachSummary, setCoachSummary] = useState<string | null>(null);
  const [isCoaching, setIsCoaching] = useState(false);

  const settings = getAnalyticsSettings();
  const hasProfileLinks = !!(settings.instagramUrl || settings.facebookUrl);

  const stats = useMemo(() => computePostingStats(posts, rangeDays), [posts, rangeDays]);

  const weekdayMax = Math.max(...stats.postsByWeekday.map((d) => d.count), 1);
  const weekChartItems = stats.postsByWeekday.map((d) => ({
    label: d.day.slice(0, 3),
    count: d.count,
  }));

  const handleCoach = async () => {
    if (stats.postsCount === 0) {
      toast.error('Add scheduled posts on the calendar first.');
      return;
    }
    setIsCoaching(true);
    try {
      const payload = statsPayloadForCoach(stats);
      const prompt = `You are a social media coach. Use ONLY the JSON stats below. Do NOT invent follower counts, engagement rates, or demographics.

Stats:
${JSON.stringify(payload, null, 2)}

Business: ${activeBusiness?.name || 'Workspace'}

Return 4–6 short bullet recommendations (markdown bullets) for what to post next, format/outlet balance, and schedule gaps. If profile URLs are not in the stats, do not claim you analyzed live Instagram/Facebook metrics.`;

      const text = await generateTextWithCascade(prompt, false, activeBusiness?.id);
      setCoachSummary(text.trim());
      const today = new Date().toISOString().split('T')[0];
      setAnalyticsSettings({ ...settings, lastRunDate: today });
      toast.success('Summary ready');
    } catch (e) {
      console.error(e);
      toast.error('Could not generate summary. Try again or check AI settings.');
    } finally {
      setIsCoaching(false);
    }
  };

  const deltaLabel =
    stats.deltaPercent == null
      ? '—'
      : `${stats.deltaPercent >= 0 ? '+' : ''}${stats.deltaPercent}% vs prior`;

  return (
    <div className="flex flex-col bg-transparent relative h-full min-h-0">
      <div className="shrink-0 p-4 md:p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] mb-6 rounded-[16px]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-500/10 rounded-[14px] flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED]">
                Insights & Analytics
              </h2>
              <p className="text-xs md:text-sm text-[#757681] dark:text-[#9B9A97]">
                Built from your calendar—no API keys required.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([7, 30, 90] as InsightsRangeDays[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRangeDays(d)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors min-h-[36px]',
                  rangeDays === d
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white dark:bg-[#191919] border-[#E9E9E7] dark:border-[#2E2E2E] text-[#757681]'
                )}
              >
                {d}d
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveTab?.('more')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#757681] hover:text-brand min-h-[36px]"
            >
              <Settings className="w-3.5 h-3.5" />
              Profile links
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full space-y-6 pb-12 flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label={`Posts (${rangeDays}d)`} value={String(stats.postsCount)} hint={deltaLabel} />
          <StatCard label="Avg / week" value={String(stats.avgPerWeek)} hint="scheduled in range" />
          <StatCard
            label="Top outlet"
            value={stats.topOutlet?.name || '—'}
            hint={stats.topOutlet ? `${stats.topOutlet.percent}% of posts` : undefined}
          />
          <StatCard
            label="Top format"
            value={stats.topFormat?.name || '—'}
            hint={stats.topFormat ? `${stats.topFormat.percent}% of posts` : undefined}
          />
          <StatCard
            label="Upcoming"
            value={String(stats.upcomingCount)}
            hint="from today onward"
            alert={stats.upcomingCount === 0}
          />
        </div>

        {stats.postsCount === 0 ? (
          <div className="glass-card p-8 text-center">
            <Calendar className="w-10 h-10 text-brand mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED] mb-2">No posts in this window</h3>
            <p className="text-sm text-[#757681] max-w-md mx-auto mb-4">
              Schedule content on the calendar to see posting rhythm, outlet mix, and AI coaching here—free, from your own data.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab?.('calendar')}
              className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-bold"
            >
              Open calendar
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand" />
                    Posting rhythm
                  </h3>
                  <p className="text-[10px] text-[#757681] mt-0.5">
                    Busiest day: <span className="font-bold text-[#37352F] dark:text-[#EBE9ED]">{stats.busiestWeekday}</span>
                  </p>
                </div>
                <div className="p-4">
                  <BarChart items={weekChartItems} maxCount={weekdayMax} />
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    Outlet & format mix
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#757681] mb-2">Outlets</p>
                    <MixList items={stats.outletMix} emptyLabel="No outlets" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#757681] mb-2">Formats</p>
                    <MixList items={stats.formatMix} emptyLabel="No formats" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-brand" />
                  Top hashtags
                </h3>
                {stats.topHashtags.length === 0 ? (
                  <p className="text-xs text-[#757681]">Add hashtags on post captions to see trends.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {stats.topHashtags.map((h) => (
                      <span
                        key={h.tag}
                        className="px-2.5 py-1 rounded-lg bg-brand/10 text-brand text-xs font-bold"
                      >
                        {h.tag} <span className="text-[#757681] font-medium">×{h.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card p-4">
                <h3 className="text-sm font-bold mb-3">Recent in range</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {stats.recentPosts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] text-xs"
                    >
                      <span className="font-bold truncate text-[#37352F] dark:text-[#EBE9ED]">{p.title}</span>
                      <span className="text-[#757681] shrink-0 tabular-nums">{p.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {stats.gaps.length > 0 && (
              <div className="glass-card p-4 border-amber-200/50 dark:border-amber-900/40 bg-amber-500/5">
                <h3 className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Schedule gaps
                </h3>
                <ul className="space-y-1 text-xs text-[#37352F] dark:text-[#EBE9ED]">
                  {stats.gaps.map((g) => (
                    <li key={g}>• {g}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {hasProfileLinks && (
          <div className="flex flex-wrap gap-2 items-center text-xs text-[#757681]">
            <span className="font-bold uppercase tracking-wider text-[10px]">Profile links (reference)</span>
            {settings.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-500" />
                Instagram
              </a>
            )}
            {settings.facebookUrl && (
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand"
              >
                <Facebook className="w-3.5 h-3.5 text-brand" />
                Facebook
              </a>
            )}
            <span className="text-[10px]">Live reach metrics via API — coming later.</span>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              AI coach
            </h3>
            <p className="text-xs text-[#757681] mt-1">
              Summarizes your calendar stats only—does not scrape profiles or invent engagement numbers.
            </p>
          </div>
          <div className="p-4 space-y-4">
            <button
              type="button"
              onClick={handleCoach}
              disabled={isCoaching || stats.postsCount === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl text-sm font-bold disabled:opacity-50 min-h-[44px]"
            >
              {isCoaching ? <ForgeLoader size={18} /> : <Sparkles className="w-4 h-4" />}
              {isCoaching ? 'Summarizing…' : 'Generate summary from my calendar'}
            </button>
            <AnimatePresence>
              {coachSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl border border-brand/20 bg-brand/5 text-sm leading-relaxed text-[#37352F] dark:text-[#EBE9ED] whitespace-pre-wrap"
                >
                  {coachSummary}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
