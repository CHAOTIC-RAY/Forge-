import React from 'react';
import { Lightbulb, Zap } from 'lucide-react';

export function IdeasTab({ activeBusiness }: any) {
  const sampleIdeas = [
    { id: '1', title: 'Seasonal Promotion Launch Video', category: 'General' },
    { id: '2', title: 'Customer Success Story Showcase', category: 'Brand Story' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-505 text-amber-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Brainstorm Vault</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleIdeas.map(idea => (
          <div key={idea.id} className="p-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-sm text-left flex items-start justify-between">
            <div>
              <span className="inline-block bg-yellow-50 dark:bg-zinc-800 text-yellow-705 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mb-2">
                {idea.category}
              </span>
              <h4 className="font-bold text-sm text-gray-800 dark:text-zinc-200">{idea.title}</h4>
            </div>
            <button 
              className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-500 hover:text-gray-900 cursor-pointer"
              type="button"
            >
              <Zap size={14} className="text-amber-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
export default IdeasTab;
