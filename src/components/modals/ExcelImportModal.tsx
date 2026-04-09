import React, { useState, useRef } from 'react';
import { ForgeLoader } from '../ForgeLoader';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Wand2, ArrowRight, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Post } from '../../data';
import { getExcelMappingWithAi } from '../../lib/gemini';
import { cn } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (posts: Post[]) => Promise<void>;
  userId?: string;
}

export function ExcelImportModal({ isOpen, onClose, onImport, userId }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isMapping, setIsMapping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws);
        setData(json);
        setStep('map');
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleAutoMap = async () => {
    if (data.length === 0) return;
    setIsMapping(true);
    try {
      const aiMapping = await getExcelMappingWithAi(data);
      setMapping(aiMapping);
      toast.success("AI has suggested a mapping!");
    } catch (error) {
      console.error("AI Mapping failed:", error);
      toast.error("AI mapping failed. Please map manually.");
    } finally {
      setIsMapping(false);
    }
  };

  const postFields = [
    { id: 'title', label: 'Title' },
    { id: 'brief', label: 'Brief' },
    { id: 'caption', label: 'Caption' },
    { id: 'hashtags', label: 'Hashtags' },
    { id: 'date', label: 'Date (YYYY-MM-DD)' },
    { id: 'outlet', label: 'Outlet' },
    { id: 'type', label: 'Type' },
    { id: 'link', label: 'Link' },
    { id: 'productCategory', label: 'Product Category' },
  ];

  const excelColumns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const postsToImport: Post[] = data.map(row => {
        const post: any = {
          id: uuidv4(),
          userId,
          platforms: ['instagram', 'facebook'],
          publishStatus: 'draft',
        };

        for (const excelCol in mapping) {
          const postField = (mapping as any)[excelCol];
          if (postField && postField !== 'none') {
            (post as any)[postField] = (row as any)[excelCol];
          }
        }

        // Defaults if missing
        if (!post.title) post.title = 'Imported Post';
        if (!post.date) post.date = new Date().toISOString().split('T')[0];
        if (!post.outlet) post.outlet = 'Forge Buildware';
        if (!post.type) post.type = '🔴 General';

        return post as Post;
      });

      await onImport(postsToImport);
      toast.success(`Successfully imported ${postsToImport.length} posts!`);
      onClose();
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import posts.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#191919] rounded-2xl shadow-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">AI Excel Import</h2>
              <p className="text-xs text-[#787774] dark:text-[#9B9A97]">Bulk import posts and map columns using AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] rounded-full transition-colors">
            <X className="w-5 h-5 text-[#787774] dark:text-[#9B9A97]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-[#2383E2] hover:bg-[#F7F7F5] dark:hover:bg-[#202020] transition-all cursor-pointer group"
            >
              <div className="p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-full group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10 text-[#787774] dark:text-[#9B9A97]" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-[#37352F] dark:text-[#EBE9ED]">Click to upload Excel or CSV</p>
                <p className="text-sm text-[#787774] dark:text-[#9B9A97]">Supports .xlsx, .xls, and .csv files</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
              />
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <div className="flex items-center gap-3">
                  <Wand2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Let AI do the work</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">AI will analyze your columns and map them to post fields.</p>
                  </div>
                </div>
                <button
                  onClick={handleAutoMap}
                  disabled={isMapping}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isMapping ? <ForgeLoader size={16} /> : <Wand2 className="w-4 h-4" />}
                  Auto-Map with AI
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Column Mapping
                  </h3>
                  <div className="space-y-3">
                    {excelColumns.map(col => (
                      <div key={col} className="flex items-center gap-3 p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E]">
                        <span className="flex-1 text-sm font-medium text-[#37352F] dark:text-[#EBE9ED] truncate" title={col}>
                          {col}
                        </span>
                        <select
                          value={mapping[col] || 'none'}
                          onChange={(e) => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                          className="w-40 px-2 py-1 text-xs bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded focus:ring-1 focus:ring-[#2383E2] outline-none"
                        >
                          <option value="none">Ignore</option>
                          {postFields.map(field => (
                            <option key={field.id} value={field.id}>{field.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Data Preview (First 3 rows)
                  </h3>
                  <div className="space-y-3">
                    {data.slice(0, 3).map((row, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-lg text-[10px] font-mono overflow-x-auto whitespace-pre">
                        {JSON.stringify(row, null, 2)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-between items-center bg-[#F7F7F5] dark:bg-[#202020]">
          <button
            onClick={() => setStep('upload')}
            className={cn(
              "px-4 py-2 text-sm font-medium text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] transition-colors",
              step === 'upload' && "invisible"
            )}
          >
            Back to Upload
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
            >
              Cancel
            </button>
            {step === 'map' && (
              <button
                onClick={handleImport}
                disabled={isImporting || Object.values(mapping).every(v => v === 'none')}
                className="px-8 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? <ForgeLoader size={16} /> : <Save className="w-4 h-4" />}
                Import {data.length} Posts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
