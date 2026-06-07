import React from 'react';
import { LayoutGrid, Plus } from 'lucide-react';

export function WidgetsTab({ userId, activeBusiness, onDraftPost }: any) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-[#2665fd]" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Creative Studio</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-sm text-left">
          <h3 className="font-bold text-sm mb-1 text-gray-800 dark:text-zinc-200">Daily Marketing Checklist</h3>
          <p className="text-xs text-gray-500 mb-4">Draft content for your active products today.</p>
          <button 
            type="button" 
            onClick={() => onDraftPost?.({ title: 'New Widget Draft', contentFormats: ['Standard'] })}
            className="flex items-center gap-1.5 bg-blue-50 dark:bg-zinc-800 hover:bg-blue-100 dark:hover:bg-zinc-750 text-blue-600 dark:text-blue-400 text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Draft Checkin Post</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default WidgetsTab;
