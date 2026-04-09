import React, { useState, useEffect } from 'react';
import { ForgeLoader } from './ForgeLoader';
import { Search, ExternalLink, X, Globe, Info, AlertCircle } from 'lucide-react';
import { HighStockProduct, getAiSettings } from '../lib/gemini';
import { toast } from 'sonner';

interface DirectSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DirectSearch({ isOpen, onClose }: DirectSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const aiSettings = getAiSettings();
      const baseUrl = aiSettings.targetUrl || 'https://example.com';
      // Fetch directly from our backend using the direct-scrape endpoint
      const response = await fetch(`/api/direct-scrape?q=${encodeURIComponent(query)}&targetUrl=${encodeURIComponent(baseUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Search failed');
      }

      setResults(data.products || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 sm:p-6 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#191919] rounded-xl shadow-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">
                Node.js Product Scrape
              </h2>
              <p className="text-xs text-[#787774] dark:text-[#9B9A97]">Directly scraping target website</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] rounded-full transition-colors">
            <X className="w-5 h-5 text-[#787774] dark:text-[#9B9A97]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F7F7F5] dark:bg-[#202020]">
          <div className="flex flex-col h-full">
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter product name, brand or SKU..."
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B9A97]" />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <ForgeLoader size={16} /> : 'Search'}
                </button>
              </div>
            </form>

            <div className="flex-1 min-h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-[#787774]">
                  <ForgeLoader size={32} className="mb-4" />
                  <p className="text-sm">Scraping website directly...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-red-500 text-center px-6">
                  <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium mb-2">Search Error</p>
                  <p className="text-xs opacity-80">{error}</p>
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {results.map((product, idx) => (
                    <a
                      key={idx}
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl hover:border-blue-500 transition-all group"
                    >
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.title} 
                          className="w-16 h-16 object-cover rounded-lg bg-[#F7F7F5] dark:bg-[#202020]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-[#F7F7F5] dark:bg-[#202020] rounded-lg flex items-center justify-center text-[#9B9A97]">
                          <Globe className="w-6 h-6 opacity-20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] truncate group-hover:text-blue-600 transition-colors">
                          {product.title}
                        </h4>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                          {product.stockInfo}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-[#787774] mt-1">
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate">{new URL(product.link).hostname}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : query && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-[#787774]">
                  <Search className="w-12 h-12 mb-4 opacity-10" />
                  <p className="text-sm">No products found for "{query}"</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-[#787774] text-center px-6">
                  <Info className="w-12 h-12 mb-4 opacity-10" />
                  <p className="text-sm">Enter a search term above to find products directly from the target website</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#191919] rounded-lg transition-colors font-bold text-sm shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
