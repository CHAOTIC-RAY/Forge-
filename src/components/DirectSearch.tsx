import React, { useState } from 'react';
import { Search, X, Calendar, Database } from 'lucide-react';
import { useAppStore } from '../store';

export function DirectSearch({ isOpen, onClose }: any) {
  const [query, setQuery] = useState('');
  const posts = useAppStore(state => state.posts) || [];
  const products = useAppStore(state => state.products) || [];

  if (!isOpen) return null;

  const filteredPosts = query.trim() === '' ? [] : posts.filter((p: any) => 
    p.title?.toLowerCase().includes(query.toLowerCase()) || 
    p.caption?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProducts = query.trim() === '' ? [] : products.filter((p: any) => 
    p.title?.toLowerCase().includes(query.toLowerCase()) ||
    p.type?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-[10vh] animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[70vh] text-left">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
          <Search className="text-gray-400 w-5 h-5 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Search workspace posts, draft marketing titles, or products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-gray-850 dark:text-white"
            autoFocus
          />
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {query.trim() === '' ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-xs">Type to search scheduled content, draft frameworks, and items...</p>
            </div>
          ) : filteredPosts.length === 0 && filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-xs">No matching results found for "{query}"</p>
            </div>
          ) : (
            <>
              {filteredPosts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-zinc-550 flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Scheduled Posts ({filteredPosts.length})</span>
                  </h4>
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800 bg-gray-50/50 dark:bg-zinc-850/30 rounded-xl border border-gray-105-10">
                    {filteredPosts.map((p: any) => (
                      <div key={p.id} className="p-3 text-xs flex justify-between items-center gap-4 hover:bg-gray-100/30 dark:hover:bg-zinc-800/30">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-zinc-200">{p.title || 'Untitled Post'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 max-w-sm truncate">{p.caption}</p>
                        </div>
                        <span className="p-1 px-2.5 bg-blue-50 dark:bg-zinc-800/80 text-[#2665fd] dark:text-blue-400 uppercase font-black text-[8px] rounded-full">
                          {p.publishStatus || 'draft'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredProducts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-zinc-550 flex items-center gap-1">
                    <Database size={12} />
                    <span>Catalog Products ({filteredProducts.length})</span>
                  </h4>
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800 bg-gray-50/50 dark:bg-zinc-850/30 rounded-xl border border-gray-105-10">
                    {filteredProducts.map((p: any) => (
                      <div key={p.id || p.title} className="p-3 text-xs flex justify-between items-center gap-4 hover:bg-gray-100/30 dark:hover:bg-zinc-800/30">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-zinc-200">{p.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{p.type || 'Product'}</p>
                        </div>
                        <span className="font-bold text-xs text-gray-650 dark:text-zinc-400 font-mono">
                          {p.price || 'In Stock'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default DirectSearch;
