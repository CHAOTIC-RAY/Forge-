import React, { useState, useEffect, useMemo } from 'react';
import { ForgeLoader } from './ForgeLoader';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { Lightbulb, PackageSearch, Search, Wand2, X as CloseIcon, History, Trash2, Sparkles, LayoutGrid, List as ListIcon, Heart, MessageSquare, Bookmark, ClipboardPaste, Package, Calendar, Copy, Share2, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { HighStockProduct, generateTaskIdeas, findProductsByCategory } from '../lib/gemini';
import { PRODUCT_CATEGORIES, Business } from '../data';
import { useWorkspaceConfig } from '../lib/workspaceConfig';
import { DraggableProduct } from './DraggableProduct';
import { useDraggable } from '@dnd-kit/core';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { PriorityProductsPanel } from './PriorityProductsPanel';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface IdeasPanelProps {
  onClose?: () => void;
  isFullPage?: boolean;
  activeBusiness?: Business | null;
}

interface IdeaHistoryItem {
  id: string;
  timestamp: number;
  ideas: any[];
  sourceUrl?: string;
}

export function IdeasPanel({ onClose, isFullPage, activeBusiness }: IdeasPanelProps) {
  const { config } = useWorkspaceConfig();
  const [sidebarTab, setSidebarTab] = useState<'ideas' | 'priority_products'>('ideas');
  const [ideas, setIdeas] = useState<any[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<any | null>(null);
  const [usePriorityProducts, setUsePriorityProducts] = useState(true);
  const [history, setHistory] = useState<IdeaHistoryItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [workspaceTitles, setWorkspaceTitles] = useState<{ [key: string]: string }>({
    category: 'Category',
    outlet: 'Outlet',
    campaign: 'Campaign',
    type: 'Type'
  });

  // Load categories and titles from Firestore
  useEffect(() => {
    if (!activeBusiness) return;
    const unsub = onSnapshot(doc(db, 'categories', activeBusiness.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCategories(data.categories || []);
        if (data.titles) {
          setWorkspaceTitles(prev => ({ ...prev, ...data.titles }));
        }
      }
    });
    return () => unsub();
  }, [activeBusiness]);

  // Load history from Firestore
  useEffect(() => {
    if (!activeBusiness) return;

    const q = query(
      collection(db, 'idea_history'),
      where('businessId', '==', activeBusiness.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IdeaHistoryItem[];
      setHistory(historyData.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => unsubscribe();
  }, [activeBusiness]);

  // Save history to Firestore
  const addHistoryItem = async (item: IdeaHistoryItem) => {
    if (!activeBusiness) return;
    try {
      await setDoc(doc(db, 'idea_history', item.id), {
        ...item,
        businessId: activeBusiness.id
      });
    } catch (e) {
      console.error("Error saving history", e);
      toast.error("Failed to save history.");
    }
  };

  const handleGenerateIdeas = async () => {
    setIsGeneratingIdeas(true);
    try {
      const newIdeas = await generateTaskIdeas(
        activeBusiness || undefined, 
        usePriorityProducts, 
        categories, 
        workspaceTitles,
        `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
      );
      setIdeas(newIdeas);
      
      // Add to history
      const historyItem: IdeaHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ideas: newIdeas
      };
      await addHistoryItem(historyItem);
      
      toast.success("Generated 10 new ideas!");
    } catch (error) {
      console.error("Failed to generate ideas", error);
      toast.error("Failed to generate ideas.");
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const clearHistory = async () => {
    if (!activeBusiness || !window.confirm("Are you sure you want to clear your idea history?")) return;
    try {
      const q = query(collection(db, 'idea_history'), where('businessId', '==', activeBusiness.id));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      toast.success("History cleared.");
    } catch (e) {
      console.error("Error clearing history", e);
      toast.error("Failed to clear history.");
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'idea_history', id));
      toast.success("History item deleted.");
    } catch (e) {
      console.error("Error deleting history item", e);
      toast.error("Failed to delete history item.");
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full",
      isFullPage ? "bg-transparent" : "w-72 bg-[#F7F7F5] dark:bg-[#121212]"
    )}>
      <div className={cn(
        "flex flex-col",
        isFullPage ? "w-full" : "bg-white dark:bg-[#1E1E1E] rounded-none shadow-none"
      )}>
        {/* Header - Android Style */}
        <div className={cn(
          "flex flex-col",
          isFullPage ? "hidden md:flex p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-8" : "bg-white dark:bg-[#1E1E1E]"
        )}>
          {isFullPage ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2665fd]/10 rounded-2xl flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-[#2665fd]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                    Creative Hub
                  </h2>
                  <p className="text-sm text-[#787774] dark:text-[#9B9A97] mt-1">
                    AI-powered strategy & product ideas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2665fd]/10 rounded-xl flex items-center justify-center text-[#2665fd]">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">Creative Hub</h2>
                  <p className="text-xs text-[#787774] dark:text-[#9B9A97]">AI-powered strategy & products</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-full text-[#787774] dark:text-[#9B9A97] transition-colors"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className={cn(
            "flex gap-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E]",
            isFullPage ? "px-2" : "px-6"
          )}>
            <button 
              onClick={() => setSidebarTab('ideas')}
              className={cn(
                "py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 relative -mb-[1px]",
                sidebarTab === 'ideas' 
                  ? "border-[#2665fd] text-[#2665fd]" 
                  : "border-transparent text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              <Lightbulb className="w-4 h-4" />
              Ideas & History
            </button>
            <button 
              onClick={() => setSidebarTab('priority_products')}
              className={cn(
                "py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 relative -mb-[1px]",
                sidebarTab === 'priority_products' 
                  ? "border-[#2665fd] text-[#2665fd]" 
                  : "border-transparent text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              <Package className="w-4 h-4" />
              Priority Products
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#F7F7F5] dark:bg-[#121212]">
          <AnimatePresence mode="wait">
            {sidebarTab === 'ideas' && (
              <motion.div 
                key="ideas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col pb-32 md:pb-6"
              >
                <div className="p-6 flex flex-col gap-8 w-full">
                  {/* Generate Section */}
                  <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <h3 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED] mb-4">Generate Content Strategy</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-xl border border-transparent">
                        <div>
                          <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Use Priority Products</h4>
                          <p className="text-xs text-[#787774] dark:text-[#9B9A97]">Focus ideas on your high-priority items</p>
                        </div>
                        <button
                          onClick={() => setUsePriorityProducts(!usePriorityProducts)}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative",
                            usePriorityProducts ? "bg-[#2665fd]" : "bg-[#E9E9E7] dark:bg-[#3E3E3E]"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                            usePriorityProducts ? "translate-x-5" : "translate-x-0.5"
                          )} />
                        </button>
                      </div>
                      <button
                        onClick={handleGenerateIdeas}
                        disabled={isGeneratingIdeas}
                        className="w-full py-4 bg-[#2665fd] hover:bg-[#2665fd]/90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isGeneratingIdeas ? <ForgeLoader size={20} /> : <Wand2 className="w-5 h-5" />}
                        Generate Strategy Ideas
                      </button>
                    </div>
                  </div>

                  {/* Current Ideas Section */}
                  {ideas.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest">New Suggestions</h4>
                        <button onClick={() => setIdeas([])} className="text-xs text-[#787774] dark:text-[#9B9A97] font-bold hover:text-red-500 transition-colors">Clear</button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {ideas.map((idea, idx) => (
                          <DraggableIdea 
                            key={idx} 
                            id={`idea-${idx}`} 
                            idea={idea} 
                            workspaceTitles={workspaceTitles}
                            onClick={() => setSelectedIdea(idea)} 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* History Section */}
                  <div className="space-y-6 pt-8 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED]">Idea History</h3>
                        <p className="text-sm text-[#787774] dark:text-[#9B9A97]">Your previous AI generations</p>
                      </div>
                      {history.length > 0 && (
                        <button 
                          onClick={clearHistory}
                          className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors text-sm font-bold"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear All
                        </button>
                      )}
                    </div>

                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-white dark:bg-[#1E1E1E] rounded-full flex items-center justify-center mb-4 shadow-sm">
                          <History className="w-8 h-8 text-[#9B9A97]" />
                        </div>
                        <p className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">No history yet</p>
                        <p className="text-xs text-[#787774] dark:text-[#9B9A97] mt-1">Generated ideas will appear here for you to reuse.</p>
                      </div>
                    ) : (
                      <div className="grid gap-8">
                        {history.map((item) => (
                          <div key={item.id} className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-[#2665fd] rounded-full" />
                                <span className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">
                                  {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {item.sourceUrl && (
                                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] bg-[#E9E9E7] dark:bg-[#2E2E2E] px-2 py-0.5 rounded-full truncate max-w-[200px]">
                                    {item.sourceUrl}
                                  </span>
                                )}
                              </div>
                              <button 
                                onClick={() => deleteHistoryItem(item.id)}
                                className="p-2 hover:bg-red-500/10 text-[#787774] hover:text-red-500 rounded-full transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {item.ideas.map((idea, idx) => (
                                <DraggableIdea 
                                  key={`${item.id}-${idx}`} 
                                  id={`history-${item.id}-${idx}`} 
                                  idea={idea} 
                                  workspaceTitles={workspaceTitles}
                                  onClick={() => setSelectedIdea(idea)} 
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {sidebarTab === 'priority_products' && (
              <motion.div 
                key="priority_products"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col"
              >
                <PriorityProductsPanel activeBusiness={activeBusiness} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

        {/* Idea Details Modal - Android Style */}
      <AnimatePresence>
        {selectedIdea && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#1E1E1E] rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-w-lg w-full p-6 sm:p-8 border-t sm:border border-[#E9E9E7] dark:border-[#2E2E2E] relative overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-[#E9E9E7] dark:bg-[#2E2E2E] rounded-full mx-auto mb-6 sm:hidden" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#2665fd] uppercase tracking-widest bg-[#2665fd]/10 px-2.5 py-1 rounded-full">{selectedIdea.type}</span>
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest bg-purple-500/10 px-2.5 py-1 rounded-full">{selectedIdea.outlet}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight">{selectedIdea.title}</h2>
                </div>
                <button onClick={() => setSelectedIdea(null)} className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-full text-[#787774] dark:text-[#9B9A97] transition-colors">
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] text-center">
                    <div className="text-[10px] font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest mb-1">Feasibility</div>
                    <div className="text-lg font-bold text-emerald-500">{selectedIdea.feasibility || 0}/10</div>
                  </div>
                  <div className="p-3 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] text-center">
                    <div className="text-[10px] font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest mb-1">Impact</div>
                    <div className="text-lg font-bold text-blue-500">{selectedIdea.impact || 0}/10</div>
                  </div>
                  <div className="p-3 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] text-center">
                    <div className="text-[10px] font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest mb-1">{workspaceTitles.type}</div>
                    <div className="text-sm font-bold text-[#2665fd] dark:text-blue-400 mt-1">{selectedIdea.format || 'Post'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">Campaign Brief</h4>
                  <p className="text-sm text-[#37352F] dark:text-[#EBE9ED] leading-relaxed bg-[#F7F7F5] dark:bg-[#2E2E2E] p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">{selectedIdea.brief}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">Social Caption</h4>
                  <div className="relative group">
                    <p className="text-sm text-[#37352F] dark:text-[#EBE9ED] whitespace-pre-wrap leading-relaxed bg-[#F7F7F5] dark:bg-[#2E2E2E] p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">{selectedIdea.caption}</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedIdea.caption);
                        toast.success("Caption copied!");
                      }}
                      className="absolute top-2 right-2 p-2 bg-white dark:bg-[#3E3E3E] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-[#E9E9E7] dark:border-[#2E2E2E]"
                    >
                      <LayoutGrid className="w-4 h-4 text-[#2665fd]" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">Recommended Hashtags</h4>
                  <p className="text-sm text-[#2665fd] font-medium bg-[#2665fd]/5 p-4 rounded-xl border border-[#2665fd]/10">{selectedIdea.hashtags}</p>
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setSelectedIdea(null)}
                  className="flex-1 py-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-xl text-sm font-bold hover:opacity-90 transition-all active:scale-95 border border-[#E9E9E7] dark:border-[#2E2E2E]"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // This would ideally trigger a "Add to Calendar" flow
                    toast.info("Drag the card from the list to schedule it!");
                    setSelectedIdea(null);
                  }}
                  className="flex-1 py-4 bg-[#2665fd] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all active:scale-95"
                >
                  Schedule Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DraggableIdea: React.FC<{ idea: any, id: string, onClick: () => void, workspaceTitles: any }> = ({ idea, id, onClick, workspaceTitles }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type: 'idea', idea }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 100 : 1,
  };

  const contextMenuItems: ContextMenuItem[] = [
    { label: 'View Details', icon: <Search className="w-3.5 h-3.5" />, onClick },
    { label: 'Copy Caption', icon: <ClipboardPaste className="w-3.5 h-3.5" />, onClick: () => {
      navigator.clipboard.writeText(idea.caption);
      toast.success("Caption copied!");
    }},
    { label: 'Save to Favorites', icon: <Heart className="w-3.5 h-3.5" />, onClick: () => toast.success("Added to favorites!") },
    { label: 'Schedule Post', icon: <Calendar className="w-3.5 h-3.5" />, onClick: () => toast.info("Drag to calendar to schedule") },
    { label: 'Share Idea', icon: <Share2 className="w-3.5 h-3.5" />, onClick: () => toast.success("Share link copied!") },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            onClick();
          }
        }}
        className={cn(
          "bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl p-5 cursor-grab active:cursor-grabbing hover:border-[#2665fd] transition-all flex flex-col gap-4 relative group",
          isDragging && "opacity-50 scale-105"
        )}
      >
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[9px] font-black text-white uppercase tracking-widest bg-[#2665fd] px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {idea.format || 'Post'}
          </span>
          <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-100 dark:border-purple-500/20">
            {idea.type}
          </span>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
            {idea.outlet}
          </span>
        </div>
        <div className="w-7 h-7 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Search className="w-3 h-3 text-[#787774] dark:text-[#9B9A97]" />
        </div>
      </div>
      <div className="flex-1">
        <h4 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight mb-2 group-hover:text-[#2665fd] dark:group-hover:text-blue-400 transition-colors">
          {idea.title}
        </h4>
        <p className="text-xs text-[#787774] dark:text-[#9B9A97] line-clamp-2 leading-relaxed mb-4">
          {idea.brief}
        </p>

        <div className="flex items-center gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[9px] font-medium text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
              <span>Feasibility</span>
              <span>{idea.feasibility || 0}/10</span>
            </div>
            <div className="h-0.5 w-full bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#787774]/30 transition-all duration-500" 
                style={{ width: `${(idea.feasibility || 0) * 10}%` }} 
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[9px] font-medium text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
              <span>Impact</span>
              <span>{idea.impact || 0}/10</span>
            </div>
            <div className="h-0.5 w-full bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#2665fd]/30 transition-all duration-500" 
                style={{ width: `${(idea.impact || 0) * 10}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-3 flex items-center justify-between mt-auto border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
        <div className="text-[10px] font-bold text-[#2665fd] dark:text-blue-400">View Details →</div>
      </div>
    </div>
    </ContextMenu>
  );
}

const FypIdeaCard: React.FC<{ idea: any, onSelect: () => void }> = ({ idea, onSelect }) => {
  const gradients = [
    'from-blue-600 to-purple-600',
    'from-emerald-500 to-teal-700',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-700'
  ];
  const gradient = useMemo(() => gradients[Math.floor(Math.random() * gradients.length)], []);

  return (
    <div className="h-full w-full snap-start snap-always relative overflow-hidden group">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", gradient)} />
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end pb-24 md:pb-12">
        <div className="max-w-2xl pr-16">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-[#2665fd] px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
              <Sparkles className="w-3 h-3" />
              {idea.format || 'Post'}
            </span>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full">
              {idea.type}
            </span>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full">
              {idea.outlet}
            </span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-md">
            {idea.title}
          </h2>
          
          <p className="text-sm md:text-base text-white/90 line-clamp-3 mb-6 leading-relaxed max-w-xl drop-shadow-sm">
            {idea.brief}
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={onSelect} 
              className="px-6 py-3 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-xl flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              View Details
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(idea.caption);
                toast.success("Caption copied!");
              }}
              className="px-6 py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full font-bold text-sm hover:bg-white/30 transition-colors shadow-xl flex items-center gap-2"
            >
              <ClipboardPaste className="w-4 h-4" />
              Copy Caption
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute right-4 bottom-28 md:bottom-16 flex flex-col gap-6 items-center">
         <button 
           onClick={() => toast.success("Added to favorites!")}
           className="flex flex-col items-center gap-1 group/btn"
         >
           <div className="w-12 h-12 bg-black/20 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white group-hover/btn:bg-white/20 transition-colors">
             <Heart className="w-6 h-6" />
           </div>
           <span className="text-white text-[10px] font-bold drop-shadow-md">Like</span>
         </button>
         
         <button onClick={onSelect} className="flex flex-col items-center gap-1 group/btn">
           <div className="w-12 h-12 bg-black/20 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white group-hover/btn:bg-white/20 transition-colors">
             <MessageSquare className="w-6 h-6" />
           </div>
           <span className="text-white text-[10px] font-bold drop-shadow-md">Details</span>
         </button>

         <button 
           onClick={() => toast.success("Idea saved!")}
           className="flex flex-col items-center gap-1 group/btn"
         >
           <div className="w-12 h-12 bg-black/20 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white group-hover/btn:bg-white/20 transition-colors">
             <Bookmark className="w-6 h-6" />
           </div>
           <span className="text-white text-[10px] font-bold drop-shadow-md">Save</span>
         </button>
         
         <div className="w-12 h-12 mt-2 rounded-full border-2 border-white overflow-hidden shadow-xl flex items-center justify-center bg-white">
           <Sparkles className="w-6 h-6 text-blue-500" />
         </div>
      </div>
    </div>
  );
};
