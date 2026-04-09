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
        "fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:static lg:block lg:w-80 lg:flex-shrink-0 lg:border-l lg:border-gray-200 dark:lg:border-gray-800"
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Strategy & Resources</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full lg:hidden">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-6 flex-1">
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">AI Tools</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onOpenCaptionMaker();
                  onClose();
                }}
                className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg font-medium text-sm transition-colors border border-purple-200 dark:border-purple-800/50"
              >
                <MessageSquare className="w-5 h-5" />
                Caption Maker
              </button>
              <button
                onClick={() => {
                  onTabChange('search');
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors border",
                  activeTab === 'search'
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                    : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800/50"
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
                    className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg font-medium text-sm transition-colors border border-purple-200 dark:border-purple-800/50"
                  >
                    <Sparkles className="w-5 h-5" />
                    Bulk AI Generator
                  </button>
                  <button
                    onClick={() => {
                      onOpenExcelImport();
                      onClose();
                    }}
                    className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg font-medium text-sm transition-colors border border-green-200 dark:border-green-800/50"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
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
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors border sm:hidden",
                  activeTab === 'schedule'
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700"
                )}
              >
                <Calendar className="w-5 h-5" />
                Schedule
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">System</h3>
            <button
              onClick={() => setShowMigration(!showMigration)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium text-sm transition-colors border border-gray-200 dark:border-gray-700"
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
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Strategy Notes</h3>
            <ul className="space-y-3">
              {strategyNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Hashtag Bank</h3>
            <div className="flex flex-wrap gap-2">
              {hashtagBank.map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => copyToClipboard(tag, idx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Tap a hashtag to copy</p>
          </section>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 sm:hidden">
          <button
            onClick={() => {
              onExport();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Schedule to Excel
          </button>
        </div>
      </div>
    </>
  );
}
