import React, { useState } from 'react';
import { X, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export function AutoFillModal({ isOpen, onClose, onGenerate }: any) {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.warning('Please enter a target topic.');
      return;
    }
    setIsLoading(true);
    try {
      if (onGenerate) {
        await onGenerate(topic, 5);
      }
      toast.success('Successfully generated 5 new posts!');
      onClose();
    } catch (e) {
      toast.error('Failed to fill calendar with ideas.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 relative text-left shadow-xl">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800"
          type="button"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#2665fd]" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">AutoFill Calendar</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Provide a marketing focus topic, and our brand agent will populate 5 high-quality posts directly to your schedule.</p>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Focus Topic / Campaign Theme</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Summer sales promotions"
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 bg-transparent text-xs text-gray-905 dark:text-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-1.5 bg-[#2665fd] hover:bg-[#2665fd]/95 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition shadow-sm disabled:opacity-50"
          type="button"
        >
          <Wand2 size={14} className={isLoading ? "animate-spin" : ""} />
          <span>{isLoading ? 'Generating Assets...' : 'Generate Calendar Entries'}</span>
        </button>
      </div>
    </div>
  );
}
export default AutoFillModal;
