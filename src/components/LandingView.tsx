import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Palette,
  BarChart3,
  LogIn,
  ChevronDown,
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  Pause,
  Square,
  Database,
  Image as ImageIcon,
  Globe,
  Search,
  LayoutGrid,
  Download,
  ClipboardPaste,
  List,
  Share2,
  ImagePlus,
  GripVertical,
  Wand2,
  Cpu,
  Link2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Hash,
  PenTool,
  Instagram,
  RefreshCw,
} from 'lucide-react';
import { ForgeLogo, ScribbleFlame } from './ForgeLogo';
import { cn } from '../lib/utils';
import { INDUSTRY_CONFIGS } from '../lib/industryConfig';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'motion/react';
import { HeroHandwritingTitle } from './HeroHandwritingTitle';
import { animateScrollTo, easeOutExpo, easeInOutQuint, waitMs } from '../lib/guidedScroll';

const landingTerms = INDUSTRY_CONFIGS.default.terminology;

const IMPORT_TABS = ['Discover', 'Fetch', 'Convert', 'Review', 'Advanced'] as const;

function FooterCtaGrid({ className }: { className?: string }) {
  return (
    <svg
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="footer-cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#footer-cta-grid)" />
    </svg>
  );
}

function CatalogueImportLandingPreview() {
  const [activeTab, setActiveTab] = useState<(typeof IMPORT_TABS)[number]>('Discover');

  return (
    <div className="w-full min-h-[320px] md:min-h-[360px] bg-white dark:bg-[#191919] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-3 md:p-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">Catalogue</p>
            <p className="text-[10px] text-[#787774] dark:text-[#9B9A97] truncate">Import & sync</p>
          </div>
        </div>
        <div className="hidden sm:flex p-0.5 rounded-lg bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E]">
          <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]">Catalogue</span>
          <span className="px-2 py-1 text-[10px] font-medium text-[#787774]">Knowledge</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total items', value: '248' },
          { label: 'Categories', value: '12' },
          { label: 'Showing', value: '64' },
          { label: 'Needs category', value: '3', accent: true },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] p-2"
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#787774] dark:text-[#9B9A97]">{stat.label}</p>
            <p className={cn('text-lg font-bold mt-0.5', stat.accent ? 'text-orange-500' : 'text-[#37352F] dark:text-[#EBE9ED]')}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
        {IMPORT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors shrink-0',
              activeTab === tab
                ? 'bg-brand text-white'
                : 'text-[#787774] dark:text-[#9B9A97] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] p-3 min-h-[140px]">
        {activeTab === 'Discover' && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="px-2 py-1 rounded-lg bg-brand text-white text-[10px] font-bold flex items-center gap-1">
                <Globe className="w-3 h-3" /> Map site
              </button>
              <span className="text-[10px] text-[#787774] self-center">1,240 URLs · 186 listing pages</span>
            </div>
            <div className="space-y-1.5 max-h-[88px] overflow-hidden">
              {[
                { kind: 'Listing', url: '/shop/sofas' },
                { kind: 'Product', url: '/product/rio-sofa' },
                { kind: 'Listing', url: '/collections/outdoor' },
              ].map((row) => (
                <div key={row.url} className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-[#191919] border border-[#E9E9E7]/80 dark:border-[#2E2E2E]">
                  <div className="w-3 h-3 rounded border-2 border-brand bg-brand/20 shrink-0" />
                  <span className="text-[9px] font-bold uppercase text-brand bg-brand/10 px-1 rounded shrink-0">{row.kind}</span>
                  <span className="text-[10px] font-mono text-[#787774] truncate">{row.url}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Fetch' && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-lg border border-brand/30 text-brand text-[10px] font-bold flex items-center gap-1">
                <Download className="w-3 h-3" /> Scrape selected (42)
              </span>
              <span className="px-2 py-1 rounded-lg bg-[#EFEFED] dark:bg-[#2E2E2E] text-[10px] font-bold">Crawl · limit 100</span>
            </div>
            <div className="h-2 rounded-full bg-[#E9E9E7] dark:bg-[#3E3E3E] overflow-hidden">
              <div className="h-full w-[68%] bg-brand rounded-full" />
            </div>
            <p className="text-[10px] text-[#787774]">Fetching markdown (Firecrawl → Crawlee → cloudscraper)… 29/42</p>
          </div>
        )}
        {activeTab === 'Convert' && (
          <div className="space-y-2">
            <button type="button" className="px-2 py-1 rounded-lg bg-brand text-white text-[10px] font-bold flex items-center gap-1 w-fit">
              <Sparkles className="w-3 h-3" /> Convert with local AI
            </button>
            <p className="text-[10px] text-[#787774]">Chunking page markdown → structured catalogue JSON</p>
            <div className="flex items-center gap-2 text-[10px] text-brand font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              18 items extracted · 3 chunks/page avg
            </div>
          </div>
        )}
        {activeTab === 'Review' && (
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              {['Rio Corner Sofa', 'Teak Dining Set', 'LED Pendant'].map((title) => (
                <div key={title} className="flex justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-[#191919] border border-[#E9E9E7]/80 dark:border-[#2E2E2E] text-[10px]">
                  <span className="font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">{title}</span>
                  <span className="text-[#787774] shrink-0">Furniture</span>
                </div>
              ))}
            </div>
            <div className="w-[38%] rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] p-2 space-y-1.5">
              <p className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight">Rio Corner Sofa</p>
              <p className="text-[9px] text-[#787774]">MVR 12,500 · In stock</p>
              <div className="h-6 rounded bg-brand/90" />
              <p className="text-[8px] text-center text-white font-bold">Save to catalogue</p>
            </div>
          </div>
        )}
        {activeTab === 'Advanced' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-[#191919] border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E]">
              <ClipboardPaste className="w-4 h-4 text-brand shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-full bg-[#E9E9E7] dark:bg-[#3E3E3E] rounded" />
                <div className="h-2 w-4/5 bg-[#E9E9E7] dark:bg-[#3E3E3E] rounded" />
              </div>
            </div>
            <p className="text-[10px] text-[#787774]">Paste JSON or upload Firecrawl exports</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9B9A97]" />
          <div className="h-8 pl-7 pr-2 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] flex items-center">
            <span className="text-[10px] text-[#9B9A97]">Search catalogue…</span>
          </div>
        </div>
        <div className="flex rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden shrink-0">
          <div className="p-2 bg-brand text-white">
            <LayoutGrid className="w-3.5 h-3.5" />
          </div>
          <div className="p-2 bg-white dark:bg-[#191919] text-[#787774]">
            <List className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

const LANDING_PREVIEW_SHELL =
  'w-full min-h-[320px] md:min-h-[360px] bg-white dark:bg-[#191919] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-3 md:p-4 flex flex-col gap-3 overflow-hidden';

function CalendarLandingPreview() {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const postsByDay: Record<number, { title: string; color: string }[]> = {
    3: [{ title: 'Summer drop', color: 'bg-brand' }],
    8: [{ title: 'Reel hook', color: 'bg-amber-400' }],
    12: [
      { title: 'Carousel', color: 'bg-brand' },
      { title: 'Story', color: 'bg-purple-400' },
    ],
    17: [{ title: 'Client review', color: 'bg-emerald-500' }],
    22: [{ title: 'UGC repost', color: 'bg-pink-400' }],
  };

  return (
    <div className={LANDING_PREVIEW_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">{landingTerms.calendar}</p>
            <p className="text-[10px] text-[#787774] dark:text-[#9B9A97]">May 2026 · Work mode</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:flex p-0.5 rounded-lg bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E]">
            <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-white dark:bg-[#2E2E2E] text-brand">Grid</span>
            <span className="px-2 py-1 text-[10px] font-medium text-[#787774]">Timeline</span>
          </div>
          <button type="button" className="p-1.5 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774]" aria-hidden>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="p-1.5 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774]" aria-hidden>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 py-1 rounded-lg bg-brand/10 text-brand text-[10px] font-bold flex items-center gap-1">
            <Share2 className="w-3 h-3" /> Share
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[9px] font-bold text-[#787774] dark:text-[#9B9A97] px-0.5">
        {weekDays.map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 gap-1 min-h-[180px]">
        {Array.from({ length: 28 }).map((_, i) => {
          const dayPosts = postsByDay[i] ?? [];
          const isToday = i === 12;
          return (
            <div
              key={i}
              className={cn(
                'rounded-lg border p-1 min-h-[52px] flex flex-col gap-0.5',
                isToday
                  ? 'bg-brand/5 border-brand/40 dark:border-brand/30'
                  : 'bg-[#FAFAF9] dark:bg-[#202020] border-[#E9E9E7]/80 dark:border-[#2E2E2E]'
              )}
            >
              <span
                className={cn(
                  'text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full',
                  isToday ? 'bg-brand text-white' : 'text-[#787774]'
                )}
              >
                {i + 1}
              </span>
              <div className="space-y-0.5 flex-1 overflow-hidden">
                {dayPosts.map((post) => (
                  <div
                    key={post.title}
                    className={cn('h-1.5 rounded-sm truncate opacity-90', post.color)}
                    title={post.title}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
        <span className="text-[10px] text-[#787774]">12 posts this month</span>
        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
          3 scheduled today
        </span>
        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold flex items-center gap-1">
          <ImagePlus className="w-3 h-3" /> Drop images on a day
        </span>
      </div>
    </div>
  );
}

function IdeasLandingPreview() {
  const columns = [
    {
      title: 'Inbox',
      count: 4,
      cards: [
        { title: 'Behind-the-scenes reel', tag: 'Campaign' },
        { title: 'Product comparison carousel', tag: 'Evergreen' },
      ],
    },
    {
      title: 'Ready',
      count: 2,
      cards: [{ title: 'Friday flash sale hook', tag: 'Promo' }],
    },
    {
      title: 'Archive',
      count: 8,
      cards: [{ title: 'Q1 testimonial post', tag: 'Social proof' }],
    },
  ] as const;

  return (
    <div className={LANDING_PREVIEW_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">{landingTerms.ideas}</p>
            <p className="text-[10px] text-[#787774] dark:text-[#9B9A97]">Board · Collections</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-lg bg-brand text-white text-[10px] font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI brainstorm
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-8 pl-3 pr-2 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] flex items-center text-[10px] text-[#9B9A97]">
          Quick capture — press Enter…
        </div>
        <div className="p-2 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774]">
          <Search className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-2 min-h-[160px]">
        {columns.map((col) => (
          <div
            key={col.title}
            className="flex flex-col rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] overflow-hidden min-h-0"
          >
            <div className="px-2.5 py-2 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between shrink-0">
              <div>
                <p className="text-[10px] font-black text-[#37352F] dark:text-[#EBE9ED]">{col.title}</p>
                <p className="text-[8px] text-[#787774]">{col.count} ideas</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-[#787774]" />
            </div>
            <div className="p-2 space-y-1.5 flex-1 overflow-hidden">
              {col.cards.map((card) => (
                <div
                  key={card.title}
                  className="p-2 rounded-lg bg-white dark:bg-[#191919] border border-[#E9E9E7]/80 dark:border-[#2E2E2E] shadow-sm"
                >
                  <p className="text-[9px] font-bold text-[#37352F] dark:text-[#EBE9ED] leading-snug line-clamp-2">
                    {card.title}
                  </p>
                  <span className="mt-1 inline-block text-[8px] font-bold uppercase tracking-wide text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-1 rounded">
                    {card.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#787774] flex items-center gap-1.5">
        <GripVertical className="w-3 h-3 text-brand" />
        Drag ready ideas onto the calendar to schedule
      </p>
    </div>
  );
}

function WidgetsLandingPreview() {
  const widgets = [
    { label: 'Caption writer', icon: PenTool },
    { label: 'Hashtag pack', icon: Hash },
    { label: 'Designer brief', icon: Wand2 },
    { label: 'Hook generator', icon: Sparkles },
  ];

  return (
    <div className={LANDING_PREVIEW_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Widgets</p>
            <p className="text-[10px] text-[#787774] dark:text-[#9B9A97]">Built-in tools · more coming soon</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
          <Cpu className="w-3 h-3" /> Local AI
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {widgets.map((w) => {
          const Icon = w.icon;
          return (
            <button
              key={w.label}
              type="button"
              className="p-2.5 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] text-left hover:border-brand/40 transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-brand mb-1.5" />
              <p className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight">{w.label}</p>
            </button>
          );
        })}
      </div>

      <div className="flex-1 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] p-3 flex flex-col gap-2 min-h-[120px]">
        <div className="self-end max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm bg-brand text-white text-[10px] leading-relaxed">
          Write a caption for our new outdoor collection — warm, premium tone.
        </div>
        <div className="self-start max-w-[90%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] text-[10px] text-[#37352F] dark:text-[#EBE9ED] leading-relaxed">
          <span className="font-bold text-amber-500 flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" /> Forge · Caption widget
          </span>
          Golden hour on the terrace. Built for slow evenings and open-air dining — discover the Outdoor ’26 line.
        </div>
        <div className="mt-auto flex items-center gap-2 p-2 rounded-lg border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]">
          <MessageSquare className="w-3.5 h-3.5 text-[#9B9A97] shrink-0" />
          <span className="text-[10px] text-[#9B9A97]">Refine tone or paste into calendar…</span>
        </div>
      </div>
    </div>
  );
}

function BrandKitLandingPreview() {
  const colors = [
    { name: 'Forge Blue', hex: '#2383E2' },
    { name: 'Ink', hex: '#37352F' },
    { name: 'Sand', hex: '#F7F7F5' },
  ];

  return (
    <div className={LANDING_PREVIEW_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Palette className="w-4 h-4 text-pink-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">{landingTerms.assets}</p>
            <p className="text-[10px] text-[#787774] dark:text-[#9B9A97]">Brand kit & references</p>
          </div>
        </div>
        <button type="button" className="px-2 py-1 rounded-lg bg-brand text-white text-[10px] font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Sync guide
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {colors.map((c) => (
          <div key={c.name} className="rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden">
            <div className="h-10" style={{ backgroundColor: c.hex }} />
            <div className="p-2 bg-white dark:bg-[#191919]">
              <p className="text-[9px] font-bold text-[#37352F] dark:text-[#EBE9ED]">{c.name}</p>
              <p className="text-[8px] font-mono text-[#787774]">{c.hex}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-[1fr_42%] gap-2 min-h-[120px]">
        <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] p-3 bg-[#FAFAF9] dark:bg-[#202020] space-y-2">
          <p className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED]">Typography</p>
          <p className="text-lg font-bold tracking-tight text-[#37352F] dark:text-[#EBE9ED]">Display · Cal Sans</p>
          <p className="text-sm text-[#787774]">Body · Inter — friendly, clear, product-led</p>
          <div className="flex gap-1.5 pt-1">
            {['Logo lockup', 'Wordmark'].map((label) => (
              <span key={label} className="px-2 py-1 rounded-md bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] text-[9px] font-bold text-[#787774]">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden flex flex-col">
          <div className="h-14 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/20 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-pink-400" />
          </div>
          <div className="p-2 bg-white dark:bg-[#191919] flex-1">
            <p className="text-[9px] font-bold text-[#37352F] dark:text-[#EBE9ED]">Reference post</p>
            <p className="text-[8px] text-[#787774] mt-0.5">Carousel · high engagement</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsLandingPreview() {
  const bars = [42, 68, 55, 88, 72, 95, 61];
  const stats = [
    { label: 'Posts / 30d', value: '24', delta: 'scheduled' },
    { label: 'Top day', value: 'Tuesday', delta: '6 posts' },
    { label: 'Top format', value: 'Carousel', delta: '42%' },
  ];

  return (
    <div className={LANDING_PREVIEW_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Insights</p>
            <p className="text-[10px] text-[#787774] dark:text-[#9B9A97]">From your calendar — no API keys</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
          Free
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] p-2.5"
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#787774]">{s.label}</p>
            <p className="text-base font-black text-[#37352F] dark:text-[#EBE9ED] mt-0.5">{s.value}</p>
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{s.delta}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 flex gap-2 min-h-[100px]">
        <div className="flex-[1.2] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] p-3 flex items-end gap-1.5">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1 min-w-0">
              <div className="w-full bg-emerald-500/80 rounded-t-md" style={{ height: `${h}%`, minHeight: 4 }} />
              <span className="text-[7px] text-center text-[#787774] font-bold">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-xl border border-brand/20 bg-brand/5 dark:bg-brand/10 p-2.5 flex flex-col gap-1">
          <p className="text-[9px] font-bold text-brand flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI summary
          </p>
          <p className="text-[9px] text-[#37352F] dark:text-[#EBE9ED] leading-relaxed flex-1">
            You post most on Tue/Thu. Carousels lead your mix—consider one reel this week to balance formats.
          </p>
          <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> From your calendar
          </span>
        </div>
      </div>
    </div>
  );
}

function FeaturePreview({ id }: { id: string }) {
  switch (id) {
    case 'calendar':
      return <CalendarLandingPreview />;
    case 'localdb':
      return <CatalogueImportLandingPreview />;
    case 'ai':
      return <WidgetsLandingPreview />;
    case 'studio':
      return <BrandKitLandingPreview />;
    case 'analytics':
      return <AnalyticsLandingPreview />;
    case 'ideas':
      return <IdeasLandingPreview />;
    default:
      return null;
  }
}

const ScribbleIcon = ({ Icon, className }: { Icon: any, className?: string }) => {
  return (
    <div className={cn("relative", className)}>
      <Icon className="w-full h-full absolute inset-0 opacity-50" strokeWidth={1.5} style={{ transform: 'translate(1px, 1px) rotate(2deg)' }} />
      <Icon className="w-full h-full absolute inset-0 opacity-50" strokeWidth={1.5} style={{ transform: 'translate(-1px, -1px) rotate(-2deg)' }} />
      <Icon className="w-full h-full relative z-10" strokeWidth={2} />
    </div>
  );
};

interface LandingViewProps {
  onLogin: () => void;
}

type LandingSection = {
  id: string;
  icon: React.ComponentType<{ className?: string }> | null;
  title: string;
  description: string;
  color: string;
  bg: string;
  bullets?: { icon: React.ComponentType<{ className?: string }>; label: string; text: string }[];
};

const SECTIONS: LandingSection[] = [
  {
    id: 'hero',
    icon: null,
    title: '',
    description: '',
    color: '',
    bg: ''
  },
  {
    id: 'calendar',
    icon: CalendarIcon,
    title: landingTerms.calendar,
    description:
      'Your publishing command center: plan every post on a visual month grid, attach creative, drag to reschedule, and share a live read-only view with clients or stakeholders.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    bullets: [
      {
        icon: GripVertical,
        label: 'Plan & reschedule',
        text: 'Drag posts between days, duplicate winning formats, and see your whole month at a glance—no spreadsheet juggling.',
      },
      {
        icon: ImagePlus,
        label: 'Media on every post',
        text: 'Drop images onto days for AI-assisted captions, collages for multi-image posts, and Cloudinary-backed hosting.',
      },
      {
        icon: Share2,
        label: 'Client-ready sharing',
        text: 'Generate a password-protected share link so clients approve content without logging into your workspace.',
      },
      {
        icon: CalendarIcon,
        label: 'Team alignment',
        text: 'One schedule for editors, designers, and approvers—status, outlets, and categories stay visible on every card.',
      },
    ],
  },
  {
    id: 'ideas',
    icon: Lightbulb,
    title: landingTerms.ideas,
    description:
      'A creative inbox before anything hits the calendar: capture lines in seconds, sort on a board, group by collection, then promote the best ideas into scheduled posts.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    bullets: [
      {
        icon: Lightbulb,
        label: 'Quick capture',
        text: 'Type an idea and press Enter—it lands in Inbox so nothing gets lost in notes or DMs.',
      },
      {
        icon: LayoutGrid,
        label: 'Board workflow',
        text: 'Inbox → Ready → Archive columns mirror how real teams triage concepts before production.',
      },
      {
        icon: List,
        label: 'Collections',
        text: 'Tag ideas by campaign, product line, or client so you can filter and brainstorm in context.',
      },
      {
        icon: Sparkles,
        label: 'AI brainstorm',
        text: 'Expand a theme into multiple post angles, then move winners straight to the calendar.',
      },
    ],
  },
  {
    id: 'ai',
    icon: Sparkles,
    title: 'Widgets',
    description:
      'Built-in AI widgets ship with the app—caption writer, hashtag packs, designer briefs, and hooks. Run locally in the browser when you want privacy; optional cloud models when you need more power. More widgets on the way.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    bullets: [
      {
        icon: Cpu,
        label: 'Local AI (WebLLM)',
        text: 'Run models in-browser with WebGPU—fast iteration for sensitive brands and offline-friendly drafts.',
      },
      {
        icon: Wand2,
        label: 'Caption & brief tools',
        text: 'Ready-made widgets for posts, hooks, hashtags, and designer briefs—paste straight into calendar cards.',
      },
      {
        icon: Sparkles,
        label: 'More coming soon',
        text: 'We are expanding the built-in library—no custom builder required; new tools land in your workspace automatically.',
      },
      {
        icon: Sparkles,
        label: 'Cloud when you need it',
        text: 'Optional Gemini, Groq, or Puter routes for heavier tasks while keeping local AI as the default.',
      },
    ],
  },
  {
    id: 'studio',
    icon: Palette,
    title: landingTerms.assets,
    description:
      'Brand kit and creative references beside your calendar—logos, palettes, fonts, and example posts so every export matches the guide your team already approved.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    bullets: [
      {
        icon: Palette,
        label: 'Visual identity',
        text: 'Store primary/secondary colors, logo marks, and typography rules where writers and designers actually work.',
      },
      {
        icon: ImageIcon,
        label: 'Reference posts',
        text: 'Pin high-performing examples so AI and humans mirror the look you want on the next campaign.',
      },
      {
        icon: Sparkles,
        label: 'Design guide sync',
        text: 'Generate or refresh a written style guide from uploads—feeds widgets and post generation automatically.',
      },
      {
        icon: Download,
        label: 'Export-ready assets',
        text: 'Pull on-brand elements into posts and mockups without digging through Drive folders mid-deadline.',
      },
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Insights & Analytics',
    description:
      'Track how you are really showing up online using the posts already on your calendar—posting rhythm, formats, outlets, and themes—plus optional profile links. Free insights with no Meta API keys required.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    bullets: [
      {
        icon: CalendarIcon,
        label: 'Calendar-native metrics',
        text: 'Scheduled and published posts in your workspace drive charts—no third-party analytics subscription.',
      },
      {
        icon: TrendingUp,
        label: 'Rhythm & format mix',
        text: 'See which days, outlets, and post types you use most so planning stays intentional.',
      },
      {
        icon: Sparkles,
        label: 'Local AI summaries',
        text: 'Optional narrative insights from your own data—built-in AI when you want a coach, not another dashboard login.',
      },
      {
        icon: Link2,
        label: 'Profile context (optional)',
        text: 'Save Instagram or Facebook page URLs for reference; deep API pulls stay optional, not required.',
      },
      {
        icon: BarChart3,
        label: 'Plan with data',
        text: 'Feed learnings back into the calendar and ideas board so the next month is intentional, not guesswork.',
      },
    ],
  },
  {
    id: 'localdb',
    icon: Database,
    title: landingTerms.products,
    description:
      'Turn any website into a searchable product catalogue or knowledge base: map URLs, fetch page markdown (Firecrawl with Crawlee and cloudscraper fallbacks), convert with local AI, review, then drop items into posts and widgets.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    bullets: [
      {
        icon: RefreshCw,
        label: 'One-click sync',
        text: 'Hit Sync to refresh from your site URL; open the panel for map, crawl, terminal logs, and advanced import.',
      },
      {
        icon: Globe,
        label: 'Discover',
        text: 'Map the site, classify listing vs product vs content pages, and queue URLs to import.',
      },
      {
        icon: Download,
        label: 'Fetch',
        text: 'Batch-scrape selected pages or run a filtered crawl (product paths in, cart/checkout out).',
      },
      {
        icon: Sparkles,
        label: 'Convert',
        text: 'Local AI turns markdown into structured items with categories, prices, and links.',
      },
      {
        icon: CheckCircle2,
        label: 'Review',
        text: 'Preview new entries, skip duplicates, and commit to your workspace catalogue.',
      },
      {
        icon: ClipboardPaste,
        label: 'Advanced',
        text: 'Paste console JSON or upload Firecrawl exports when you need a manual path.',
      },
    ],
  },
];

export function LandingView({ onLogin }: LandingViewProps) {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const tourAbortRef = useRef({ aborted: false });
  const tourRunningRef = useRef(false);

  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: footerRef,
    offset: ['start end', 'end end'],
  });

  const calloutScale = useTransform(scrollYProgress, [0, 0.4, 0.72], [0.92, 0.98, 1]);
  const calloutRadius = useTransform(scrollYProgress, [0, 0.55, 0.8], ['28px', '16px', '0px']);
  const sectionPadX = useTransform(scrollYProgress, [0, 0.72, 1], ['1.25rem', '0.75rem', '0px']);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.5, 0.72], [1, 1, 0]);
  const fullBleedOpacity = useTransform(scrollYProgress, [0.48, 0.68, 0.88], [0, 0.55, 1]);
  const headlineSize = useTransform(scrollYProgress, [0, 0.75, 1], ['1.875rem', '2.25rem', '3rem']);
  const contentY = useTransform(scrollYProgress, [0.7, 1], [12, 0]);
  const sidebarOpacity = useTransform(scrollYProgress, [0.48, 0.72], [1, 0]);
  const sidebarX = useTransform(scrollYProgress, [0.48, 0.72], ['0%', '-110%']);
  const decorOpacity = useTransform(scrollYProgress, [0.45, 0.7], [1, 0]);
  const [ctaImmersive, setCtaImmersive] = useState(false);
  const [tourFocusId, setTourFocusId] = useState<string | null>(null);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const immersive = v >= 0.72;
    setCtaImmersive(immersive);
    if (immersive) setActiveSection('footer-cta');
  });

  const stopAutoScroll = () => {
    tourAbortRef.current.aborted = true;
    tourRunningRef.current = false;
    setIsAutoScrolling(false);
  };

  const pauseAutoScroll = () => {
    stopAutoScroll();
  };

  const startAutoScroll = async () => {
    const container = containerRef.current;
    if (!container || tourRunningRef.current) return;

    stopAutoScroll();
    tourAbortRef.current = { aborted: false };
    tourRunningRef.current = true;
    setIsAutoScrolling(true);

    const sections = SECTIONS.filter((s) => s.icon !== null);
    const stops: { id: string; dwellMs: number }[] = [
      ...sections.map((s) => ({
        id: s.id,
        dwellMs: 2400,
      })),
      { id: 'footer-cta', dwellMs: 3800 },
    ];

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (tourAbortRef.current.aborted) break;
      const el = document.getElementById(stop.id);
      if (!el) continue;

      setTourFocusId(stop.id);
      if (stop.id !== 'footer-cta') setActiveSection(stop.id);

      const targetTop =
        stop.id === 'footer-cta'
          ? Math.max(
              0,
              el.offsetTop + el.offsetHeight - container.clientHeight * 0.12
            )
          : Math.max(0, el.offsetTop - 32);
      const isLast = stop.id === 'footer-cta';
      const scrollDelta = Math.abs(targetTop - container.scrollTop);
      await animateScrollTo(
        container,
        targetTop,
        isLast ? Math.min(3200, 1400 + scrollDelta * 0.55) : undefined,
        tourAbortRef.current,
        isLast ? easeInOutQuint : easeOutExpo
      );
      await waitMs(isLast ? stop.dwellMs + 600 : stop.dwellMs, tourAbortRef.current);
    }

    setTourFocusId(null);
    stopAutoScroll();
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const sections = containerRef.current.querySelectorAll('section');
      const scrollPosition = containerRef.current.scrollTop + window.innerHeight / 3;

      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          if (section.id !== 'footer-cta' || !ctaImmersive) {
            setActiveSection(section.id);
          }
        }
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Trigger once on mount
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [ctaImmersive]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element && containerRef.current) {
      containerRef.current.scrollTo({
        top: element.offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const navSections = SECTIONS.filter(s => s.icon !== null);

  return (
    <div
      className={cn(
        'relative flex flex-col md:flex-row h-screen bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] overflow-hidden font-sans selection:bg-[#2383E2] selection:text-white',
        ctaImmersive && 'bg-brand'
      )}
    >
      {/* Full-viewport purple + grid on final scroll (breaks out of content width) */}
      <motion.div
        className="fixed inset-0 z-[85] bg-brand pointer-events-none"
        style={{ opacity: fullBleedOpacity }}
        aria-hidden
      >
        <FooterCtaGrid className="opacity-[0.14]" />
      </motion.div>

      {/* Sidebar (Desktop) / Bottom Bar (Mobile) */}
      <motion.aside
        style={{ opacity: sidebarOpacity, x: sidebarX }}
        className={cn(
          'fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto w-full md:w-16 h-[64px] md:h-full border-t md:border-t-0 md:border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] md:bg-[#F7F7F5] md:dark:bg-[#202020] flex md:flex-col items-center py-0 md:py-4 shrink-0 z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] md:shadow-none px-2 md:px-0 transition-[visibility] duration-300',
          ctaImmersive && 'invisible md:w-0 md:min-w-0 md:border-0 md:p-0 md:overflow-hidden pointer-events-none'
        )}
      >
        <div className="hidden md:block mb-8">
          <ForgeLogo size={28} className="p-1" />
        </div>
        
        <nav className="flex-1 flex flex-row md:flex-col justify-between md:justify-start gap-0 md:gap-2 w-full px-0 md:px-2 overflow-hidden md:overflow-visible items-center h-full md:h-auto">
          {/* Desktop Nav Items */}
          <div className="hidden md:flex flex-col gap-2 w-full">
            {navSections.map((section) => {
              const Icon = section.icon!;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "flex p-2.5 rounded-xl items-center justify-center transition-all duration-200 relative group w-full",
                    isActive 
                      ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] shadow-sm" 
                      : "text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] hover:bg-[#E9E9E7] md:dark:hover:bg-[#2E2E2E]"
                  )}
                  title={section.title}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute left-0 w-1 h-5 bg-[#2383E2] rounded-r-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Nav Items - Same as Registered User */}
          <div className="md:hidden flex flex-1 flex-row justify-between w-full h-full items-center">
            {[
              ...navSections.slice(0, 3).map((s) => ({
                id: s.id,
                icon: s.icon!,
                title: s.title,
              })),
              { id: 'login', icon: LogIn, title: 'Log In', action: onLogin },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = 'action' in tab ? false : activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => 'action' in tab && tab.action ? tab.action() : scrollToSection(tab.id)}
                  className={cn(
                    "flex flex-col items-center justify-center transition-all duration-200 relative flex-1 h-full",
                    isActive ? "text-[#2383E2]" : "text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                  )}
                  title={tab.title}
                >
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTabIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#2383E2] rounded-b-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="hidden md:flex mt-auto md:pt-4 flex-col gap-0 px-2 md:px-2 shrink-0 items-center border-t border-[#E9E9E7] dark:border-[#2E2E2E] py-4">
          <button
            onClick={onLogin}
            className="flex p-2.5 rounded-xl items-center justify-center text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] md:hover:bg-[#E9E9E7] md:dark:hover:bg-[#2E2E2E] transition-colors"
            title="Sign Up / Log In"
          >
            <LogIn className="w-5 h-5" />
          </button>
        </div>
      </motion.aside>

      {/* Fixed Background Animation for all views */}
      <motion.div
        style={{ opacity: decorOpacity }}
        className="fixed top-1/2 right-0 -translate-y-1/2 w-full md:w-1/2 max-w-[600px] aspect-[210/339] opacity-10 md:opacity-20 dark:opacity-10 md:dark:opacity-20 pointer-events-none z-0"
      >
        <div className="w-full h-full scale-150 md:scale-100 origin-right">
          <ScribbleFlame />
        </div>
      </motion.div>

      {/* Main Content */}
      <main
        ref={containerRef}
        className={cn(
          'flex-1 overflow-y-auto pb-24 md:pb-0 min-w-0',
          !isAutoScrolling && 'scroll-smooth snap-y snap-proximity',
          ctaImmersive && 'md:w-full'
        )}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-24 space-y-24 md:space-y-40">
          
          {/* Hero Section */}
          <section id="hero" className="min-h-[80vh] flex flex-col lg:flex-row items-center justify-between relative">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-stretch w-full max-w-2xl lg:w-1/2 space-y-8 relative z-10"
            >
              <div className="flex items-center gap-4">
                <ForgeLogo size={40} className="text-white shrink-0" />
                <span className="font-display font-bold text-3xl tracking-tight text-white">Forge</span>
              </div>
              
              <h1 className="w-full m-0 p-0 text-left">
                <HeroHandwritingTitle />
              </h1>
              <p className="text-lg md:text-2xl text-secondary-safe w-full leading-relaxed m-0 text-left">
                One workspace for your calendar, {landingTerms.ideas.toLowerCase()}, local AI widgets, a website-to-catalogue importer, {landingTerms.assets}, and analytics—so you can ship consistent social content without tab chaos.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onLogin}
                  className="interactive focus-ring px-8 py-4 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold text-lg shadow-lg shadow-brand/25 min-h-[48px]"
                >
                  Get started free
                </button>
                <motion.button
                  type="button"
                  onClick={startAutoScroll}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="interactive focus-ring px-8 py-4 bg-white/90 dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] text-[#37352F] dark:text-[#EBE9ED] rounded-xl font-bold text-lg min-h-[48px]"
                >
                  See how it works
                </motion.button>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-6 text-sm text-secondary-safe">
                <span className="font-semibold text-[#37352F] dark:text-[#EBE9ED]">Trusted by teams who plan in public</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {[
                  { stat: '5-step', label: 'Catalogue import' },
                  { stat: 'Local AI', label: 'Markdown → items' },
                  { stat: '10k+', label: 'Posts scheduled' },
                ].map((item) => (
                  <div key={item.label} className="glass-card p-4 text-center">
                    <p className="text-2xl font-black text-brand">{item.stat}</p>
                    <p className="text-xs text-secondary-safe mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex flex-col gap-3">
                {window !== window.top && (
                  <button 
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="text-sm text-secondary-safe hover:text-brand underline text-left w-fit transition-colors"
                  >
                    Having trouble logging in? Open app in a new tab
                  </button>
                )}
              </div>
            </motion.div>

            {/* Removed Spline 3D Experience */}

            {/* Bouncy Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, 10, 0] }}
              transition={{ delay: 2, duration: 1.5, repeat: Infinity }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#787774] dark:text-[#9B9A97] cursor-pointer z-20"
              onClick={startAutoScroll}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && startAutoScroll()}
              aria-label="See how it works — guided scroll tour"
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>

            {/* Decorative background elements - Scribble Logo removed from here as it's now global */}
          </section>

          <div className="space-y-16 md:space-y-20 py-12">
            {navSections.map((section, index) => {
              const Icon = section.icon!;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className={cn(
                    'min-h-[50vh] flex flex-col justify-center py-10 rounded-3xl transition-shadow duration-500',
                    tourFocusId === section.id &&
                      'ring-2 ring-brand/50 ring-offset-4 ring-offset-[#F7F7F5] dark:ring-offset-[#202020]'
                  )}
                >
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20%" }}
                    transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                    animate={
                      tourFocusId === section.id
                        ? { scale: [1, 1.01, 1], transition: { duration: 1.2, repeat: Infinity } }
                        : { scale: 1 }
                    }
                    className={cn("flex flex-col items-center gap-12", index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse")}
                  >
                    <div className="flex-1 space-y-6 max-w-2xl w-full">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={cn("p-4 rounded-2xl shrink-0 shadow-sm", section.bg, section.color)}>
                          <ScribbleIcon Icon={Icon} className="w-8 h-8 md:w-10 md:h-10" />
                        </div>
                        <div className="inline-block px-3 py-1 rounded-full bg-[#E9E9E7] dark:bg-[#2E2E2E] text-xs font-bold tracking-wider uppercase text-[#787774] dark:text-[#9B9A97]">
                          Feature {index + 1}
                        </div>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{section.title}</h2>
                      <p className="text-lg md:text-xl text-[#787774] dark:text-[#9B9A97] leading-relaxed">
                        {section.description}
                      </p>
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="space-y-3 pt-2">
                          {section.bullets.map((bullet) => {
                            const BulletIcon = bullet.icon;
                            return (
                              <li key={bullet.label} className="flex gap-3 items-start">
                                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <BulletIcon className="w-4 h-4 text-brand" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">{bullet.label}</p>
                                  <p className="text-sm text-[#787774] dark:text-[#9B9A97] leading-relaxed">{bullet.text}</p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="flex-1 w-full max-w-xl perspective-[1000px]">
                      <motion.div
                        whileHover={{ scale: 1.02, rotateY: index % 2 === 0 ? -5 : 5 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <FeaturePreview id={section.id} />
                      </motion.div>
                    </div>
                  </motion.div>
                </section>
              );
            })}
          </div>
        </div>

        <motion.section
          id="footer-cta"
          ref={footerRef}
          className={cn(
            'relative min-h-[100dvh] w-full flex items-center justify-center snap-center snap-always overflow-hidden',
            ctaImmersive ? 'py-0' : 'py-16 md:py-24',
            tourFocusId === 'footer-cta' && 'ring-2 ring-white/30 ring-inset'
          )}
          style={{ paddingLeft: sectionPadX, paddingRight: sectionPadX }}
        >
          {/* Bordered card — fades out as you scroll in */}
          <motion.div
            style={{
              scale: calloutScale,
              borderRadius: calloutRadius,
              opacity: cardOpacity,
            }}
            className={cn(
              'relative z-[90] w-full max-w-4xl lg:max-w-5xl mx-auto',
              'bg-brand text-white overflow-hidden',
              'border border-white/25 shadow-[0_24px_80px_rgba(0,0,0,0.28)]',
              'ring-1 ring-inset ring-white/10',
              ctaImmersive && 'pointer-events-none'
            )}
          >
            <FooterCtaGrid className="opacity-[0.12]" />
            <div className="relative z-10 flex flex-col items-center text-center px-8 py-12 sm:px-12 sm:py-14 md:px-16 md:py-16 gap-8 md:gap-10">
              <div className="space-y-4 md:space-y-5 max-w-2xl">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                  Ready to ship your next month of content?
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-blue-100/95 leading-relaxed">
                  Sign in to map your site into a {landingTerms.products.toLowerCase()}, plan on the{' '}
                  {landingTerms.calendar.toLowerCase()}, draft with local AI widgets, and share a live calendar when you
                  are ready.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogin}
                className="interactive focus-ring w-full sm:w-auto px-10 py-4 md:py-5 bg-white text-brand hover:bg-blue-50 rounded-xl font-bold text-lg md:text-xl transition-all shadow-xl min-h-[48px]"
              >
                Sign Up Now
              </button>
            </div>
          </motion.div>

          {/* Full-bleed copy (no card) — visible when purple fills the viewport */}
          <motion.div
            style={{ opacity: fullBleedOpacity, y: contentY }}
            className="absolute inset-0 z-[95] flex flex-col items-center justify-center text-center px-6 sm:px-10 gap-8 md:gap-10 pointer-events-none"
          >
            <div
              className={cn(
                'flex flex-col items-center gap-8 md:gap-10 max-w-3xl w-full',
                ctaImmersive ? 'pointer-events-auto' : 'pointer-events-none'
              )}
            >
              <div className="space-y-4 md:space-y-5">
                <motion.h2
                  style={{ fontSize: headlineSize }}
                  className="font-bold tracking-tight leading-[1.08]"
                >
                  Ready to ship your next month of content?
                </motion.h2>
                <p className="text-base sm:text-lg md:text-xl text-blue-100/95 leading-relaxed">
                  Sign in to map your site into a {landingTerms.products.toLowerCase()}, plan on the{' '}
                  {landingTerms.calendar.toLowerCase()}, draft with local AI widgets, and share a live calendar when you
                  are ready.
                </p>
              </div>
              <motion.button
                type="button"
                onClick={onLogin}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="interactive focus-ring w-full sm:w-auto px-10 py-4 md:py-5 bg-white text-brand hover:bg-blue-50 rounded-xl font-bold text-lg md:text-xl transition-colors shadow-xl min-h-[48px]"
              >
                Sign Up Now
              </motion.button>
            </div>
          </motion.div>
        </motion.section>
      </main>

      {/* Auto-scroll Controls */}
      <AnimatePresence>
        {isAutoScrolling && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white dark:bg-[#2E2E2E] shadow-lg rounded-full p-2 border border-[#E9E9E7] dark:border-[#3E3E3E]"
          >
            <button
              onClick={pauseAutoScroll}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#3E3E3E] rounded-full text-[#787774] dark:text-[#9B9A97] transition-colors"
              title="Pause Scrolling"
            >
              <Pause className="w-5 h-5" />
            </button>
            <button
              onClick={stopAutoScroll}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#3E3E3E] rounded-full text-[#787774] dark:text-[#9B9A97] transition-colors"
              title="Stop Scrolling"
            >
              <Square className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
