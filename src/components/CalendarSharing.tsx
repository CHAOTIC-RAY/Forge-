import React, { useState } from 'react';
import { Share2, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function CalendarSharing({ activeBusiness, onUpdateBusiness }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!activeBusiness) return;
    const shareUrl = `${window.location.origin}/share/${activeBusiness.id}/${activeBusiness.shareToken || 'default'}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Share link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    if (!activeBusiness) return;
    const newToken = Math.random().toString(36).substring(2, 10);
    onUpdateBusiness({
      ...activeBusiness,
      shareToken: newToken,
    });
    toast.success('Generated new share link!');
  };

  return (
    <div className="p-4 border border-blue-100 dark:border-zinc-800 rounded-xl bg-blue-50/20 dark:bg-zinc-900/30 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <Share2 className="text-[#2665fd] w-4 h-4 shrink-0" />
        <div>
          <h4 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">Share Calendar</h4>
          <p className="text-[10px] text-gray-500">Enable others to view your calendar via a secure link.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 bg-white hover:bg-gray-50 dark:bg-zinc-850 dark:hover:bg-zinc-750 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-xs text-gray-700 dark:text-zinc-300 transition cursor-pointer"
          type="button"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          <span>Copy</span>
        </button>
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg bg-white hover:bg-gray-50 dark:bg-zinc-850 dark:hover:bg-zinc-750 border border-gray-200 dark:border-zinc-700 text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300 transition cursor-pointer"
          title="Regenerate token"
          type="button"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
}
export default CalendarSharing;
