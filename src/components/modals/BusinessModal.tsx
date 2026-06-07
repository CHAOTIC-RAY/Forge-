import React, { useState } from 'react';
import { X, Briefcase, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

export function BusinessModal({
  isOpen,
  onClose,
  businesses = [],
  activeBusiness,
  onSelect,
  onCreate,
  onDelete,
  onAddNewWorkspace,
}: any) {
  const [newBizName, setNewBizName] = useState('');
  const [newBizIndustry, setNewBizIndustry] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newBizName.trim()) {
      toast.warning('Workspace name is required.');
      return;
    }
    try {
      await onCreate(newBizName, newBizIndustry || 'general', 'owner');
      setNewBizName('');
      setNewBizIndustry('');
      setShowAddForm(false);
      toast.success('Workspace created successfully!');
    } catch (e) {
      toast.error('Failed to create workspace.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 relative text-left shadow-xl max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800"
          type="button"
        >
          <X size={16} />
        </button>

        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Briefcase size={16} className="text-[#2665fd]" />
          <span>Switch Workspaces</span>
        </h3>

        {/* List Workspaces */}
        <div className="space-y-2 mb-4">
          {businesses.map((biz: any) => {
            const isActive = activeBusiness?.id === biz.id;
            return (
              <div 
                key={biz.id}
                onClick={() => {
                  onSelect(biz);
                  onClose();
                }}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  isActive 
                    ? "border-[#2665fd]/30 bg-blue-50/25 dark:bg-zinc-850" 
                    : "border-gray-105 dark:border-zinc-800 hover:bg-gray-50/80 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-200">{biz.name}</h4>
                  <p className="text-[10px] text-gray-500">{biz.industry}</p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isActive && <Check size={14} className="text-[#2665fd]" />}
                  {onDelete && businesses.length > 1 && (
                    <button 
                      onClick={() => {
                        onDelete(biz.id);
                        toast.success('Workspace deleted.');
                      }} 
                      className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 cursor-pointer"
                      title="Delete Workspace"
                      type="button"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showAddForm ? (
          <div className="p-4 border border-gray-100 dark:border-zinc-800 rounded-xl space-y-3 mb-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Workspace Name</label>
              <input 
                type="text" 
                value={newBizName} 
                onChange={(e) => setNewBizName(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Industry</label>
              <input 
                type="text" 
                value={newBizIndustry} 
                onChange={(e) => setNewBizIndustry(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent dark:text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowAddForm(false)} 
                className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                type="button"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate} 
                className="px-3 py-1 text-xs bg-[#2665fd] hover:bg-[#2665fd]/95 text-white rounded-lg cursor-pointer font-semibold"
                type="button"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-gray-50 dark:bg-zinc-850 hover:bg-gray-100 text-gray-700 dark:text-zinc-300 font-semibold text-xs py-2 rounded-xl cursor-pointer transition border border-gray-200/50 dark:border-zinc-800/80"
            type="button"
          >
            <Plus size={14} />
            <span>Create New Workspace</span>
          </button>
        )}
      </div>
    </div>
  );
}
export default BusinessModal;
