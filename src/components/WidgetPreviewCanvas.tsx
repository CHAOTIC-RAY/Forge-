import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, MessageCircle, Heart, Bookmark, Share2, MoreHorizontal, Repeat2, BarChart3, ThumbsUp, Send } from 'lucide-react';
import { cn } from '../lib/utils';

export type SocialPlatform = 'instagram' | 'twitter' | 'linkedin' | 'facebook';

interface WidgetPreviewCanvasProps {
  caption: string;
  hashtags?: string[];
  businessName?: string;
  businessHandle?: string;
  avatarUrl?: string;
  imageUrl?: string;
  className?: string;
  onCaptionChange?: (caption: string) => void;
}

const PLATFORMS: { id: SocialPlatform; label: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', color: '#e1306c' },
  { id: 'twitter', label: 'X / Twitter', color: '#000000' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2' },
];

const TWITTER_LIMIT = 280;

function hashtagify(text: string, tags: string[]) {
  if (!tags.length) return text;
  return text + '\n\n' + tags.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' ');
}

function HighlightedCaption({ text, tags }: { text: string; tags: string[] }) {
  const tagSet = new Set(tags.map(t => (t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`)));
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (tagSet.has(part.toLowerCase())) {
          return (
            <span key={i} className="text-[#1877f2] dark:text-blue-400 font-medium">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function InstagramPreview({ caption, hashtags = [], businessName, handle }: any) {
  const full = hashtagify(caption, hashtags);
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#dbdbdb] font-sans">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-black text-gray-800">
            {businessName?.[0]?.toUpperCase() ?? 'F'}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-gray-900 leading-none">{businessName || 'forge_workspace'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Sponsored</p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-700" />
      </div>
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-square flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-400 to-blue-500 opacity-30" />
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 text-gray-800" />
          <MessageCircle className="w-6 h-6 text-gray-800" />
          <Share2 className="w-6 h-6 text-gray-800" />
          <Bookmark className="w-6 h-6 text-gray-800 ml-auto" />
        </div>
        <p className="text-xs font-bold text-gray-900">1,284 likes</p>
        <p className="text-xs text-gray-900 leading-relaxed line-clamp-4">
          <span className="font-bold">{businessName || 'forge_workspace'}</span>{' '}
          <HighlightedCaption text={full} tags={hashtags} />
        </p>
      </div>
    </div>
  );
}

function TwitterPreview({ caption, hashtags = [], businessName, handle }: any) {
  const full = hashtagify(caption, hashtags);
  const charCount = full.length;
  const overLimit = charCount > TWITTER_LIMIT;
  return (
    <div className="bg-black rounded-2xl overflow-hidden border border-[#2f3336] text-white font-sans">
      <div className="flex gap-3 px-4 py-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black shrink-0">
          {businessName?.[0]?.toUpperCase() ?? 'F'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm font-bold">{businessName || 'Forge'}</span>
            <span className="text-[#71767b] text-sm">{handle ? `@${handle.replace('@', '')}` : '@forge_app'}</span>
            <span className="text-[#71767b] text-sm ml-auto">· now</span>
          </div>
          <p className={cn('text-sm leading-relaxed', overLimit && 'text-red-400')}>
            <HighlightedCaption text={full} tags={hashtags} />
          </p>
          <div className="flex items-center gap-6 mt-3">
            <div className="flex items-center gap-1.5 text-[#71767b] text-xs">
              <MessageCircle className="w-4 h-4" /><span>24</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#71767b] text-xs">
              <Repeat2 className="w-4 h-4" /><span>8</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#71767b] text-xs">
              <Heart className="w-4 h-4" /><span>142</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#71767b] text-xs ml-auto">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className={cn('text-xs mt-2 font-mono', overLimit ? 'text-red-400' : 'text-[#71767b]')}>
            {charCount}/{TWITTER_LIMIT}{overLimit ? ' — over limit!' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ caption, hashtags = [], businessName, handle }: any) {
  const full = hashtagify(caption, hashtags);
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#d0d0d0] font-sans">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="w-12 h-12 rounded-xl bg-[#0a66c2] flex items-center justify-center text-white text-lg font-black shrink-0">
          {businessName?.[0]?.toUpperCase() ?? 'F'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 leading-tight">{businessName || 'Forge Workspace'}</p>
          <p className="text-xs text-gray-500">{handle ? `${handle}` : '3,482 followers'}</p>
          <p className="text-xs text-gray-500">Now · 🌐</p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-900 leading-relaxed line-clamp-5">
          <HighlightedCaption text={full} tags={hashtags} />
        </p>
      </div>
      <div className="bg-gray-50 mx-4 mb-3 rounded-xl p-3 border border-gray-200">
        <div className="h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg" />
      </div>
      <div className="border-t border-gray-200 px-4 py-2">
        <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
          <span>👍❤️</span><span>128 reactions</span>
        </div>
        <div className="flex items-center gap-2">
          {['👍 Like', '💬 Comment', '🔁 Repost', '📤 Send'].map(action => (
            <button key={action} className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-600 font-medium py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ caption, hashtags = [], businessName, handle }: any) {
  const full = hashtagify(caption, hashtags);
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#dddfe2] font-sans">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-base font-black">
          {businessName?.[0]?.toUpperCase() ?? 'F'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 leading-tight">{businessName || 'Forge Workspace'}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Just now</span><span>·</span>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 1 0-1h5.793L8.146 4.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 7.5H4.5z"/></svg>
            <span>Public</span>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-900 leading-relaxed line-clamp-4">
          <HighlightedCaption text={full} tags={hashtags} />
        </p>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 h-48 border-y border-gray-200 flex items-center justify-center">
        <div className="text-4xl opacity-20">🖼</div>
      </div>
      <div className="px-4 py-2 border-b border-gray-200 text-xs text-gray-500 flex justify-between">
        <span>👍❤️😍 248</span>
        <span>32 comments · 18 shares</span>
      </div>
      <div className="flex border-b border-gray-200">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageCircle, label: 'Comment' },
          { icon: Share2, label: 'Share' },
          { icon: Send, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 font-medium hover:bg-gray-50 transition-colors">
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WidgetPreviewCanvas({
  caption,
  hashtags = [],
  businessName,
  businessHandle,
  className,
  onCaptionChange,
}: WidgetPreviewCanvasProps) {
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [isFineTuning, setIsFineTuning] = useState(false);
  const [draftCaption, setDraftCaption] = useState(caption);

  const handleSave = () => {
    onCaptionChange?.(draftCaption);
    setIsFineTuning(false);
  };

  const activePlatform = PLATFORMS.find(p => p.id === platform)!;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              platform === p.id
                ? 'text-white shadow-sm'
                : 'bg-[#F7F7F5] dark:bg-[#202020] text-[#787774] dark:text-[#9B9A97] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#2E2E2E]'
            )}
            style={platform === p.id ? { backgroundColor: p.color } : undefined}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setIsFineTuning(v => !v)}
          className={cn(
            'ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
            isFineTuning
              ? 'bg-brand text-white border-brand'
              : 'border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] hover:border-brand/40'
          )}
        >
          {isFineTuning ? 'Close editor' : 'Fine-Tune ✏️'}
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-[340px]">
        <div className="bg-[#1a1a2e] rounded-[32px] p-3 shadow-2xl ring-1 ring-white/10">
          <div className="bg-[#111] rounded-[24px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#111]">
              <span className="text-[10px] text-white/70 font-medium">9:41</span>
              <div className="w-20 h-3 bg-[#111] rounded-full" />
              <div className="flex gap-1 items-center">
                <div className="w-3 h-2 rounded-sm bg-white/70" />
                <div className="w-1 h-1.5 bg-white/40 rounded-sm" />
              </div>
            </div>
            <div className="bg-white rounded-b-[20px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  {platform === 'instagram' && (
                    <InstagramPreview caption={caption} hashtags={hashtags} businessName={businessName} handle={businessHandle} />
                  )}
                  {platform === 'twitter' && (
                    <TwitterPreview caption={caption} hashtags={hashtags} businessName={businessName} handle={businessHandle} />
                  )}
                  {platform === 'linkedin' && (
                    <LinkedInPreview caption={caption} hashtags={hashtags} businessName={businessName} handle={businessHandle} />
                  )}
                  {platform === 'facebook' && (
                    <FacebookPreview caption={caption} hashtags={hashtags} businessName={businessName} handle={businessHandle} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFineTuning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#202020] p-3 space-y-2">
              <p className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">
                Fine-tune for{' '}
                <span className="font-black" style={{ color: activePlatform.color }}>{activePlatform.label}</span>
              </p>
              <textarea
                value={draftCaption}
                onChange={e => setDraftCaption(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-xs border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#EBE9ED] resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 leading-relaxed"
                placeholder="Refine your caption here…"
              />
              {platform === 'twitter' && (
                <p className={cn(
                  'text-[10px] font-mono',
                  hashtagify(draftCaption, hashtags).length > TWITTER_LIMIT ? 'text-red-500' : 'text-[#787774]'
                )}>
                  {hashtagify(draftCaption, hashtags).length}/{TWITTER_LIMIT} chars
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setDraftCaption(caption); setIsFineTuning(false); }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand text-white font-bold hover:bg-brand-hover transition-colors"
                >
                  Apply changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
