import React, { useState } from 'react';
import { Copy, Lightbulb, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import { saveTextToIdeasInbox } from '../lib/ideasInbox';
import { Business, Post } from '../data';

interface WidgetOutputActionsProps {
  text: string;
  title?: string;
  activeBusiness?: Business | null;
  onCreatePost?: (partial: Partial<Post>) => void;
  className?: string;
}

export function WidgetOutputActions({
  text,
  title = 'Widget output',
  activeBusiness,
  onCreatePost,
  className,
}: WidgetOutputActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!text?.trim()) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleSaveToIdeas = async () => {
    if (!activeBusiness?.id) {
      toast.error('Select a workspace first');
      return;
    }
    setSaving(true);
    try {
      await saveTextToIdeasInbox(activeBusiness.id, title, text);
      toast.success('Saved to Ideas inbox');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePost = () => {
    if (!onCreatePost) {
      toast.error('Create post is not available here');
      return;
    }
    const lines = text.split('\n').filter(Boolean);
    onCreatePost({
      title: title.slice(0, 120),
      caption: text.slice(0, 2000),
      brief: lines[0]?.slice(0, 500) || '',
      type: '🔴 General',
      outlet: 'All Outlets',
    });
    toast.success('Opening post editor…');
  };

  return (
    <div className={`flex flex-wrap gap-2.5 pt-4 border-t border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] mt-2 ${className || ''}`}>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] text-xs font-bold text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-all hover:scale-105 active:scale-95"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        Copy Result
      </button>
      <button
        type="button"
        onClick={handleSaveToIdeas}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-amber-500/20 bg-amber-500/[0.05] hover:bg-amber-500/10 text-xs font-bold text-amber-700 dark:text-amber-500 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        {saving ? 'Saving…' : 'Save to Ideas'}
      </button>
      {onCreatePost && (
        <button
          type="button"
          onClick={handleCreatePost}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-brand text-white text-xs font-extrabold hover:bg-brand/90 transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <FileText className="w-3.5 h-3.5" />
          Create Content Post
        </button>
      )}
    </div>
  );
}
