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
} from 'lucide-react';
import { ForgeLogo, ScribbleFlame } from './ForgeLogo';
import { cn } from '../lib/utils';
import { INDUSTRY_CONFIGS } from '../lib/industryConfig';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { HeroHandwritingTitle } from './HeroHandwritingTitle';
import { animateScrollTo, waitMs } from '../lib/guidedScroll';

const landingTerms = INDUSTRY_CONFIGS.default.terminology;

const IMPORT_TABS = ['Discover', 'Fetch', 'Convert', 'Review', 'Advanced'] as const;

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

function FeaturePreview({ id }: { id: string }) {
  switch (id) {
    case 'calendar':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-4 flex flex-col gap-2 overflow-hidden relative">
          <div className="flex justify-between items-center mb-2">
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30" />
              <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 flex-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className={cn("rounded-lg border border-gray-100 dark:border-gray-700 p-1.5", i === 12 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : "bg-gray-50 dark:bg-[#202020]")}>
                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-600 mb-1.5" />
                {i % 5 === 0 && <div className="w-full h-2 bg-blue-400 rounded-sm mb-1" />}
                {i % 8 === 0 && <div className="w-full h-2 bg-purple-400 rounded-sm" />}
              </div>
            ))}
          </div>
        </div>
      );
    case 'localdb':
      return <CatalogueImportLandingPreview />;
    case 'ai':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-4 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col gap-3 p-2">
            <div className="self-end bg-blue-500 text-white p-3 rounded-2xl rounded-tr-sm max-w-[80%]">
              <div className="w-24 h-2 bg-blue-200 rounded-full mb-2" />
              <div className="w-32 h-2 bg-blue-200 rounded-full" />
            </div>
            <div className="self-start bg-gray-100 dark:bg-[#202020] p-3 rounded-2xl rounded-tl-sm max-w-[80%] border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <div className="w-16 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="w-5/6 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="w-4/6 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
          <div className="h-12 bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 mt-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <div className="w-40 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      );
    case 'studio':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] flex overflow-hidden">
          <div className="w-16 border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] flex flex-col items-center py-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
          <div className="flex-1 p-6 flex items-center justify-center bg-gray-100/50 dark:bg-[#191919]">
            <div className="w-full max-w-xs aspect-[4/5] bg-white dark:bg-[#2E2E2E] rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
              <div className="flex-1 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 flex items-center justify-center">
                <Palette className="w-12 h-12 text-pink-400 opacity-50" />
              </div>
              <div className="p-3 space-y-2 bg-white dark:bg-[#2E2E2E]">
                <div className="w-3/4 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="w-1/2 h-2 bg-gray-100 dark:bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      );
    case 'analytics':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-6 overflow-hidden">
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 bg-gray-50 dark:bg-[#202020] rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <div className="w-12 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mb-3" />
                <div className="w-20 h-4 bg-gray-800 dark:bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
          <div className="flex-1 flex items-end gap-2 px-2">
            {[40, 70, 45, 90, 65, 80, 55, 100, 75, 85].map((h, i) => (
              <div key={i} className="flex-1 bg-green-100 dark:bg-green-900/30 rounded-t-md relative group">
                <div 
                  className="absolute bottom-0 left-0 w-full bg-green-500 rounded-t-md transition-all duration-1000"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    case 'tasks':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="w-20 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg" />
          </div>
          <div className="space-y-3 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-100 dark:border-gray-700">
                <CheckCircle2 className={cn("w-5 h-5", i === 0 ? "text-green-500" : "text-gray-300 dark:text-gray-600")} />
                <div className="flex-1 space-y-2">
                  <div className={cn("w-2/3 h-2.5 rounded-full", i === 0 ? "bg-gray-300 dark:bg-gray-600" : "bg-gray-800 dark:bg-gray-200")} />
                  <div className="w-1/3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'ideas':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div className="w-40 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-100 dark:border-yellow-900/20 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-full h-2 bg-gray-800 dark:bg-gray-200 rounded-full" />
                  <div className="w-3/4 h-2 bg-gray-800 dark:bg-gray-200 rounded-full" />
                  <div className="w-1/2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
                <div className="w-16 h-4 bg-yellow-200 dark:bg-yellow-800/50 rounded-md mt-4" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'workspace':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              F
            </div>
            <div className="flex-1 space-y-2">
              <div className="w-32 h-3 bg-indigo-900/80 dark:bg-indigo-100/80 rounded-full" />
              <div className="w-20 h-2 bg-indigo-900/40 dark:bg-indigo-100/40 rounded-full" />
            </div>
            <div className="flex -space-x-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#2E2E2E] bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#202020] rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                <div className="space-y-2">
                  <div className="w-full h-2 bg-gray-800 dark:bg-gray-200 rounded-full" />
                  <div className="w-1/2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
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
    description: 'Drag-and-drop content calendar: plan posts by day, attach media, share a read-only link with clients, and keep your whole team aligned in one schedule.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'ideas',
    icon: Lightbulb,
    title: landingTerms.ideas,
    description: 'Capture sparks before they fade. Sort inspiration by category, then promote the best lines into real posts on your calendar without losing context.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10'
  },
  {
    id: 'ai',
    icon: Sparkles,
    title: 'Widgets',
    description: 'Draft captions, images, and campaigns with local AI in your browser. Iterate fast, keep your voice, and paste results straight into posts.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10'
  },
  {
    id: 'studio',
    icon: Palette,
    title: landingTerms.assets,
    description: 'Logos, palettes, and references live next to your workflow so every asset and export stays on-brand—no more hunting through folders mid-campaign.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10'
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Insights & Analytics',
    description: 'See what resonates across channels. Track performance, compare formats, and double down on the content that actually moves your numbers.',
    color: 'text-green-500',
    bg: 'bg-green-500/10'
  },
  {
    id: 'localdb',
    icon: Database,
    title: landingTerms.products,
    description:
      'Build a searchable product catalogue or knowledge base from any website. Map URLs, fetch markdown with Firecrawl, convert pages with local AI, review items, then use them in posts and widgets.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    bullets: [
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

  const calloutScale = useTransform(scrollYProgress, [0, 0.35, 0.75, 1], [0.76, 0.9, 0.97, 1]);
  const calloutRadius = useTransform(scrollYProgress, [0, 0.5, 1], ['32px', '8px', '0px']);
  const calloutWidth = useTransform(scrollYProgress, [0, 0.6, 1], ['86%', '96%', '100%']);
  const sectionPadX = useTransform(scrollYProgress, [0, 1], ['1.5rem', '0px']);
  const purpleFillOpacity = useTransform(scrollYProgress, [0.68, 1], [0, 1]);
  const contentScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.94, 1, 1.06]);
  const headlineSize = useTransform(scrollYProgress, [0, 0.5, 1], ['2.25rem', '3.25rem', '4.5rem']);

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
    const stops: { id: string; dwellMs: number; scrollMs: number }[] = [
      ...sections.map((s, i) => ({
        id: s.id,
        scrollMs: 1200 + i * 80,
        dwellMs: 2600,
      })),
      { id: 'footer-cta', scrollMs: 1800, dwellMs: 3200 },
    ];

    for (const stop of stops) {
      if (tourAbortRef.current.aborted) break;
      const el = document.getElementById(stop.id);
      if (!el) continue;
      if (stop.id !== 'footer-cta') setActiveSection(stop.id);
      const targetTop = Math.max(0, el.offsetTop - (stop.id === 'footer-cta' ? 0 : 24));
      await animateScrollTo(container, targetTop, stop.scrollMs, tourAbortRef.current);
      await waitMs(stop.dwellMs, tourAbortRef.current);
    }

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
          setActiveSection(section.id);
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
  }, []);

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
    <div className="flex flex-col md:flex-row h-screen bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] overflow-hidden font-sans selection:bg-[#2383E2] selection:text-white">
      {/* Sidebar (Desktop) / Bottom Bar (Mobile) */}
      <aside className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto w-full md:w-16 h-[64px] md:h-full border-t md:border-t-0 md:border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] md:bg-[#F7F7F5] md:dark:bg-[#202020] flex md:flex-col items-center py-0 md:py-4 shrink-0 z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] md:shadow-none px-2 md:px-0">
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
      </aside>

      {/* Fixed Background Animation for all views */}
      <div className="fixed top-1/2 right-0 -translate-y-1/2 w-full md:w-1/2 max-w-[600px] aspect-[210/339] opacity-10 md:opacity-20 dark:opacity-10 md:dark:opacity-20 pointer-events-none z-0">
        <div className="w-full h-full scale-150 md:scale-100 origin-right">
          <ScribbleFlame />
        </div>
      </div>

      {/* Main Content */}
      <main ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth snap-y snap-proximity pb-24 md:pb-0">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-24 space-y-24 md:space-y-40">
          
          {/* Hero Section */}
          <section id="hero" className="min-h-[80vh] flex flex-col lg:flex-row items-center justify-between relative">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8 relative z-10 max-w-2xl lg:w-1/2"
            >
              <div className="flex items-center gap-4 mb-4">
                <ForgeLogo size={40} className="text-white" />
                <span className="font-bold text-3xl tracking-tight text-white">Forge</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.95] min-w-0">
                <HeroHandwritingTitle className="block shrink min-w-0" />
              </h1>
              <p className="text-lg md:text-2xl text-secondary-safe max-w-2xl leading-relaxed">
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
                <button
                  type="button"
                  onClick={startAutoScroll}
                  className="interactive focus-ring px-8 py-4 bg-white/90 dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] text-[#37352F] dark:text-[#EBE9ED] rounded-xl font-bold text-lg min-h-[48px]"
                >
                  See how it works
                </button>
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
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>

            {/* Decorative background elements - Scribble Logo removed from here as it's now global */}
          </section>

          <div className="space-y-16 md:space-y-20 py-12">
            {navSections.map((section, index) => {
              const Icon = section.icon!;
              return (
                <section key={section.id} id={section.id} className="min-h-[50vh] flex flex-col justify-center py-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20%" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
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
          className="relative min-h-[110dvh] w-full flex items-center justify-center snap-center snap-always overflow-hidden"
          style={{ paddingLeft: sectionPadX, paddingRight: sectionPadX }}
        >
          <motion.div
            className="absolute inset-0 bg-brand pointer-events-none"
            style={{ opacity: purpleFillOpacity }}
            aria-hidden
          />
          <motion.div
            style={{
              scale: calloutScale,
              borderRadius: calloutRadius,
              width: calloutWidth,
            }}
            className="bg-brand text-white text-center md:text-left flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 md:gap-14 relative overflow-hidden min-h-[72dvh] md:min-h-[100dvh] px-8 md:px-16 py-12 md:py-20 mx-auto"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <motion.div
              style={{ scale: contentScale }}
              className="w-full flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 md:gap-14 relative z-10"
            >
              <div className="space-y-6 max-w-3xl">
                <motion.h2
                  style={{ fontSize: headlineSize }}
                  className="font-bold tracking-tight leading-[1.05]"
                >
                  Ready to ship your next month of content?
                </motion.h2>
                <p className="text-lg md:text-2xl text-blue-100 max-w-2xl">
                  Sign in to map your site into a {landingTerms.products.toLowerCase()}, plan on the {landingTerms.calendar.toLowerCase()}, draft with local AI widgets, and share a live calendar when you are ready.
                </p>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                <button
                  onClick={onLogin}
                  className="interactive focus-ring w-full md:w-auto px-10 py-5 bg-white text-brand hover:bg-blue-50 rounded-xl font-bold text-xl transition-all shadow-xl min-h-[48px]"
                >
                  Sign Up Now
                </button>
              </div>
            </motion.div>
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
