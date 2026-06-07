import React from 'react';
import { X, Download } from 'lucide-react';

export interface ExportSettings {
  startMonth?: string;
  endMonth?: string;
  visibleFields?: string[];
  layoutStyle?: string;
  accentColor?: string;
  [key: string]: any;
}

export function ExportModal({ isOpen, onClose }: any) {
  if (!isOpen) return null;
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
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Export Workspace</h3>
        <p className="text-xs text-gray-500 mb-4">Download your scheduled posts and marketing configurations as an Excel/JSON file.</p>
        <button 
          onClick={onClose} 
          className="w-full flex items-center justify-center gap-1.5 bg-[#2665fd] hover:bg-[#2665fd]/95 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition shadow-sm"
          type="button"
        >
          <Download size={14} />
          <span>Export as Excel</span>
        </button>
      </div>
    </div>
  );
}
export default ExportModal;
