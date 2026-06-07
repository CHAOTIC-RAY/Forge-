import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export function ExcelImportModal({ isOpen, onClose }: any) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      toast.success('Excel file loaded!');
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
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Import from Excel</h3>
        <p className="text-xs text-gray-500 mb-4">Schedules new posts by importing lists. Supports .xlsx and .csv formats.</p>

        <label className="border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-[#2665fd]/50 active:border-[#2665fd] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center mb-4 bg-gray-50/30 dark:bg-zinc-950/20">
          <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
            {selectedFile ? selectedFile.name : 'Choose file or drag here'}
          </span>
        </label>

        <button 
          onClick={onClose} 
          disabled={!selectedFile}
          className="w-full flex items-center justify-center gap-1.5 bg-[#2665fd] hover:bg-[#2665fd]/95 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-zinc-650 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition shadow-sm"
          type="button"
        >
          <FileSpreadsheet size={14} />
          <span>Upload and Import</span>
        </button>
      </div>
    </div>
  );
}
export default ExcelImportModal;
