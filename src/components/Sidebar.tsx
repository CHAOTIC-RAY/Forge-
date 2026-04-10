import React from 'react';
import { X, Copy, Check, Download, MessageSquare, Search, Calendar, FileSpreadsheet, Sparkles, ArrowRight } from 'lucide-react';
import { MigrationTool } from './MigrationTool';
import { strategyNotes, hashtagBank } from '../data';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onOpenCaptionMaker: () => void;
  onOpenExcelImport: () => void;
  onOpenBulkGenerator: () => void;
  activeTab: 'schedule' | 'search';
  onTabChange: (tab: 'schedule' | 'search') => void;
  isAdmin?: boolean;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  onExport, 
  onOpenCaptionMaker, 
  onOpenExcelImport,
  onOpenBulkGenerator,
  activeTab, 
  onTabChange,
  isAdmin 
}: SidebarProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [showMigration, setShowMigration] = React.useState(false);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-80 bg-white dark:bg-[#1A1A1A] z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col border-l border-[#E9E9E7] dark:border-[#2E2E2E]",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:static lg:block lg:w-80 lg:flex-shrink-0"
      )}>
        <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-between items-center sticky top-0 bg-white dark:bg-[#1A1A1A] z-10">
          <h2 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">Strategy & Resources</h2>
          <button onClick={onClose} aria-label="Close Sidebar" className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[8px] lg:hidden">
            <X className="w-5 h-5 text-[#757681]" />
          </button>
        </div>

        <div className="p-4 space-y-6 flex-1">
          <section>
            <h3 className="text-xs font-medium text-[#757681] uppercase tracking-wider mb-3">AI Tools</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onOpenCaptionMaker();
                  onClose();
                }}
                className="flex items-center gap-3 px-4 py-3 bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-[8px] font-medium text-sm transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
              >
                <MessageSquare className="w-5 h-5 text-[#2665fd]" />
                Caption Maker
              </button>
              <button
                onClick={() => {
                  onTabChange('search');
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[8px] font-medium text-sm transition-colors border",
                  activeTab === 'search'
                    ? "bg-[#2665fd]/10 text-[#2665fd] border-[#2665fd]/20"
                    : "bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] border-[#E9E9E7] dark:border-[#2E2E2E]"
                )}
              >
                <Search className="w-5 h-5" />
                Advanced Product Search
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      onOpenBulkGenerator();
                      onClose();
                    }}
                    className="flex items-center gap-3 px-4 py-3 bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-[8px] font-medium text-sm transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
                  >
                    <Sparkles className="w-5 h-5 text-[#6074b9]" />
                    Bulk AI Generator
                  </button>
                  <button
                    onClick={() => {
                      onOpenExcelImport();
                      onClose();
                    }}
                    className="flex items-center gap-3 px-4 py-3 bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-[8px] font-medium text-sm transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-[#bd3800]" />
                    AI Excel Import
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  onTabChange('schedule');
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[8px] font-medium text-sm transition-colors border sm:hidden",
                  activeTab === 'schedule'
                    ? "bg-[#2665fd]/10 text-[#2665fd] border-[#2665fd]/20"
                    : "bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] border-[#E9E9E7] dark:border-[#2E2E2E]"
                )}
              >
                <Calendar className="w-5 h-5" />
                Schedule
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-[#757681] uppercase tracking-wider mb-3">System</h3>
            <button
              onClick={() => setShowMigration(!showMigration)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-[8px] font-medium text-sm transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
            >
              <div className="flex items-center gap-3">
                <ArrowRight className="w-5 h-5" />
                Data Migration
              </div>
            </button>
            {showMigration && (
              <div className="mt-3">
                <MigrationTool />
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium text-[#757681] uppercase tracking-wider mb-3">Strategy Notes</h3>
            <ul className="space-y-3">
              {strategyNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-[#37352F] dark:text-[#EBE9ED]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2665fd] mt-1.5 flex-shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-medium text-[#757681] uppercase tracking-wider mb-3">Hashtag Bank</h3>
            <div className="flex flex-wrap gap-2">
              {hashtagBank.map((tag, idx) => (
                <button
                  key={idx}
                  aria-label={`Copy hashtag ${tag}`}
                  onClick={() => copyToClipboard(tag, idx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] text-sm rounded-[8px] transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#757681] mt-2">Tap a hashtag to copy</p>
          </section>
        </div>

        <div className="p-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#1A1A1A] sm:hidden">
          <button
            onClick={() => {
              onExport();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2665fd] text-white hover:bg-[#1e52d0] rounded-[8px] font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Schedule to Excel
          </button>
        </div>
      </div>
    </>
  );
}
