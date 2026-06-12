import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wand2, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, count: number) => Promise<void>;
  isLoading? : boolean;
}

export function AutoFillModal({ isOpen, onClose, onGenerate, isLoading }: AutoFillModalProps) {
  const [prompt, setPrompt] = useState('Build awareness for our new summer collection');
  const [count, setCount] = useState(15);
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#191919] rounded-[24px] shadow-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-brand" />
              </div>
              <h2 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">Auto-Fill Month</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-full transition-colors text-[#757681]">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#37352F] dark:text-[#EBE9ED]">Campaign Goals / Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="What is the goal of this month? E.g., Promote our new eco-friendly product line..."
                className="w-full px-4 py-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[12px] focus:ring-2 focus:ring-brand focus:border-brand outline-none resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-[#37352F] dark:text-[#EBE9ED]">Number of Posts</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="5" 
                  max="30" 
                  value={count} 
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="flex-1 accent-brand"
                />
                <span className="w-16 text-center py-1.5 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-[8px] border border-[#E9E9E7] dark:border-[#3E3E3E] text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">
                  {count}
                </span>
              </div>
              <p className="text-xs text-[#757681] mt-2">The AI will distribute these posts starting from today.</p>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 text-sm font-medium text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => onGenerate(prompt, count)} 
              disabled={isLoading || !prompt.trim()}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  Auto-Fill Month
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
