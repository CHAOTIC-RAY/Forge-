import React, { useState } from 'react';
import { X, Building2, Plus, Check, Trash2 } from 'lucide-react';
import { Business } from '../../data';
import { cn } from '../../lib/utils';

interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  activeBusiness: Business | null;
  onSelect: (biz: Business) => void;
  onCreate: (name: string, industry: string, position: string) => void;
  onDelete?: (bizId: string) => void;
}

export function BusinessModal({ 
  isOpen, 
  onClose, 
  businesses, 
  activeBusiness, 
  onSelect, 
  onCreate,
  onDelete
}: BusinessModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newIndustry.trim() && newPosition.trim()) {
      onCreate(newName.trim(), newIndustry.trim(), newPosition.trim());
      setNewName('');
      setNewIndustry('');
      setNewPosition('');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#191919] w-full max-w-md rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]  overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-[12px] flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">
              {isCreating ? 'New Workspace' : 'Workspaces'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isCreating ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest">Workspace Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Forge Buildware"
                  className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest">Industry / Niche</label>
                <input
                  type="text"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="e.g. Retail & Construction"
                  className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest">Your Position</label>
                <input
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="e.g. Marketing Manager"
                  className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 px-4 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[12px] font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-[#2383E2] hover:bg-[#1D6EB8] text-white rounded-[12px] font-bold transition-colors  "
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {businesses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#757681] dark:text-[#9B9A97] mb-4">No workspaces found. Create your first one to get started!</p>
                </div>
              ) : (
                businesses.map(biz => (
                  <div key={biz.id} className="relative group/item flex items-center">
                    <button
                      onClick={() => {
                        onSelect(biz);
                        onClose();
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-[12px] border transition-all group",
                        activeBusiness?.id === biz.id
                          ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30"
                          : "bg-white dark:bg-[#191919] border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-blue-200 dark:hover:border-blue-900/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-[8px] flex items-center justify-center font-bold text-sm transition-colors",
                          activeBusiness?.id === biz.id
                            ? "bg-blue-500 text-white"
                            : "bg-[#F7F7F5] dark:bg-[#202020] text-[#757681] dark:text-[#9B9A97] group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        )}>
                          {biz.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <h3 className={cn(
                            "font-bold text-sm",
                            activeBusiness?.id === biz.id ? "text-blue-600 dark:text-blue-400" : "text-[#37352F] dark:text-[#EBE9ED]"
                          )}>
                            {biz.name}
                          </h3>
                          <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">{biz.industry}</p>
                        </div>
                      </div>
                      {activeBusiness?.id === biz.id && (
                        <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-8" />
                      )}
                    </button>
                    {onDelete && (
                      <div className={cn(
                        "absolute right-4 flex items-center gap-2 transition-opacity",
                        deletingId === biz.id ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
                      )}>
                        {deletingId === biz.id ? (
                          <div className="flex items-center gap-2 bg-white dark:bg-[#191919] px-2 py-1 rounded-[8px] border border-red-200 dark:border-red-900/30 ">
                            <span className="text-xs text-red-500 font-medium">Delete?</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(biz.id);
                                setDeletingId(null);
                              }}
                              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                              className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-[#2E2E2E] dark:hover:bg-[#3E3E3E] text-[#37352F] dark:text-[#EBE9ED] px-2 py-1 rounded transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(biz.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[8px] transition-colors"
                            title="Delete Workspace"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-4 p-4 rounded-[12px] border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[#F7F7F5] dark:bg-[#202020] flex items-center justify-center text-[#757681] dark:text-[#9B9A97] group-hover:text-blue-500 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-[#757681] dark:text-[#9B9A97] group-hover:text-blue-500 transition-colors">Add Workspace</h3>
                  <p className="text-[10px] text-[#9B9A97] dark:text-[#7D7C78]">Create a new business profile</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
