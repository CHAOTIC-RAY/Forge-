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
    <div className={`flex flex-wrap gap-2 pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] ${className || ''}`}>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E]"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        Copy
      </button>
      <button
        type="button"
        onClick={handleSaveToIdeas}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-700 dark:text-amber-400 disabled:opacity-50"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        {saving ? 'Saving…' : 'Save to Ideas'}
      </button>
      {onCreatePost && (
        <button
          type="button"
          onClick={handleCreatePost}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover"
        >
          <FileText className="w-3.5 h-3.5" />
          Create post
        </button>
      )}
    </div>
  );
}
