import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Zap,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FileText,
  Plus,
  MoreVertical,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  setDoc,
  doc, 
  serverTimestamp
} from 'firebase/firestore';
import { generateTextWithCascade, safeParseJSONArray, isGeminiKeyAvailable, fetchServerConfig } from '../lib/gemini';

interface Block {
  id: string;
  type: 'text' | 'image' | 'prompt' | 'graph';
  content: string;
  x?: number; // Kept for schema backwards compatibility
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  title?: string;
  folderId?: string | null;
  status?: 'inbox' | 'organized';
  parentId?: string | null; // useful for nested structure
}

interface Folder {
  id: string;
  name: string;
  color?: string;
  x?: number;
  y?: number;
}

interface Link {
  id: string;
  from: string;
  to: string;
}

interface NotebookTabProps {
  activeBusiness: any;
}

export function NotebookTab({ activeBusiness }: NotebookTabProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isInitialLoad = useRef(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeBusiness?.id || !auth.currentUser) return;

    setIsReady(false);
    isInitialLoad.current = true;

    const q = query(
      collection(db, 'notebooks'),
      where('businessId', '==', activeBusiness.id),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        const docId = snapshot.docs[0].id;
        setNotebookId(docId);
        
        if (isInitialLoad.current) {
          setBlocks(docData.blocks || []);
          setLinks(docData.links || []);
          setFolders(docData.folders || []);
          isInitialLoad.current = false;
        }
        setIsReady(true);
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        const newNotebook = {
          id: newId,
          businessId: activeBusiness.id,
          userId: auth.currentUser.uid,
          title: 'Creative Strategy',
          blocks: [
            {
              id: 'initial-1',
              type: 'text',
              title: "Welcome to your Creative Notebook",
              content: `Use the Idea Lab to brainstorm concepts, organize them into folders, and hit "Expand with AI" to flesh out details. Everything is structured instantly.`,
              status: 'organized',
              folderId: null
            }
          ],
          links: [],
          folders: [],
          updatedAt: serverTimestamp()
        };
        
        try {
          setNotebookId(newId);
          await setDoc(doc(db, 'notebooks', newId), newNotebook);
        } catch (error) {
          console.error('Error creating initial notebook:', error);
          handleFirestoreError(error, OperationType.WRITE, `notebooks/${newId}`);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notebooks');
    });

    return () => unsubscribe();
  }, [activeBusiness?.id, auth.currentUser?.uid]);

  const saveNotebook = async (newBlocks: Block[], newLinks: Link[], newFolders: Folder[] = folders) => {
    if (!notebookId) return;
    try {
      await updateDoc(doc(db, 'notebooks', notebookId), {
        blocks: newBlocks,
        links: newLinks,
        folders: newFolders,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving notebook:', error);
      handleFirestoreError(error, OperationType.UPDATE, `notebooks/${notebookId}`);
    }
  };

  const addFolder = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newFolder: Folder = { id, name: 'New Folder' };
    setFolders(prev => {
      const updated = [...prev, newFolder];
      saveNotebook(blocks, links, updated);
      return updated;
    });
    setExpandedFolders(prev => ({ ...prev, [id]: true }));
  };

  const addBlock = (folderId: string | null = null) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      title: 'Untitled Idea',
      content: '',
      status: 'organized',
      folderId
    };
    setBlocks(prev => {
      const updated = [...prev, newBlock];
      saveNotebook(updated, links, folders);
      return updated;
    });
    setSelectedBlockId(newBlock.id);
  };

  const deleteBlock = (id: string) => {
    const updatedLinks = links.filter(l => l.from !== id && l.to !== id);
    setLinks(updatedLinks);
    
    setBlocks(prev => {
      const updated = prev.filter(b => b.id !== id);
      saveNotebook(updated, updatedLinks, folders);
      return updated;
    });

    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const deleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlocks(prev => {
      const updated = prev.map(b => b.folderId === id ? { ...b, folderId: null } : b);
      return updated;
    });
    setFolders(prev => {
      const updated = prev.filter(f => f.id !== id);
      saveNotebook(blocks, links, updated);
      return updated;
    });
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, ...updates } : b);
      saveNotebook(updated, links, folders);
      return updated;
    });
  };

  const updateFolder = (id: string, updates: Partial<Folder>) => {
    setFolders(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...updates } : f);
      saveNotebook(blocks, links, updated);
      return updated;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateIdeas = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);

    try {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }

      const prompt = `You are a creative strategist. Based on this prompt: "${aiPrompt}", generate 3-5 distinct creative ideas for a business in the ${activeBusiness.industry} industry. 
      Return the result as a JSON array of objects, each with "title" and "description".`;

      const text = await generateTextWithCascade(prompt, true);
      const ideas = safeParseJSONArray(text);

      if (ideas && Array.isArray(ideas)) {
        const newBlocks: Block[] = ideas.map((idea: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          type: 'text',
          title: idea.title,
          content: idea.description,
          status: 'inbox',
          folderId: null
        }));

        setBlocks(prev => {
          const updated = [...prev, ...newBlocks];
          saveNotebook(updated, links, folders);
          return updated;
        });
        setAiPrompt('');
      }
    } catch (error) {
      console.error('Idea generation error:', error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const expandWithAi = async (block: Block) => {
    setIsAiLoading(true);
    try {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }
      
      const prompt = `You are a creative strategist. Deepen this central idea: "${block.title} - ${block.content}". 
      Generate 3 highly actionable, related sub-strategies or expansions for a business in the ${activeBusiness.industry} industry. 
      Return the result as a JSON array of objects, each with "title" and "description" fields.`;

      const text = await generateTextWithCascade(prompt, true);
      const ideas = safeParseJSONArray(text);

      if (ideas && Array.isArray(ideas)) {
        const newBlocks: Block[] = [];
        const newLinks: Link[] = [];
        
        ideas.forEach((idea: any) => {
          const id = Math.random().toString(36).substr(2, 9);
          newBlocks.push({
            id,
            type: 'text',
            title: idea.title,
            content: idea.description,
            status: 'organized',
            folderId: block.folderId,
            parentId: block.id
          });

          newLinks.push({
            id: Math.random().toString(36).substr(2, 9),
            from: block.id,
            to: id
          });
        });

        const updatedBlocks = [...blocks, ...newBlocks];
        const updatedLinks = [...links, ...newLinks];
        setBlocks(updatedBlocks);
        setLinks(updatedLinks);
        saveNotebook(updatedBlocks, updatedLinks, folders);
      }
    } catch (error) {
      console.error('AI Expansion error:', error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);
  const childBlocks = selectedBlock 
    ? blocks.filter(b => links.some(l => l.from === selectedBlock.id && l.to === b.id))
    : [];

  return (
    <div className="h-full flex overflow-hidden bg-white dark:bg-[#151515] text-[#37352F] dark:text-[#EBE9ED]">
      
      {/* Sidebar Navigation */}
      <div className="w-72 border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] flex flex-col shrink-0 relative">
        
        {!isReady && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
             <div className="w-6 h-6 border-2 border-[#2665fd] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Idea Lab Generation UI */}
        <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#757681] mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500" />
            Idea Generator
          </h3>
          <div className="relative">
            <textarea 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Brainstorm new campaigns..."
              className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl p-3 text-sm focus:outline-none focus:border-[#2665fd] resize-none h-20 shadow-sm"
            />
            <button 
              onClick={generateIdeas}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="absolute bottom-2 right-2 p-1.5 bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#1A1A1A] rounded-lg hover:opacity-80 disabled:opacity-40 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Workspace List */}
        <div className="flex-1 overflow-y-auto py-2">
          
          {/* Inbox / Uncategorized area */}
          <div className="px-2 mb-4">
            <div className="flex items-center justify-between px-2 mb-1 group cursor-pointer" onClick={() => {}}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#757681]">Inbox</span>
            </div>
            {blocks.filter(b => b.status === 'inbox').map(block => (
              <div 
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer group transition-colors",
                  selectedBlockId === block.id ? "bg-[#E9E9E7] dark:bg-[#2E2E2E]" : "hover:bg-[#E9E9E7]/50 dark:hover:bg-[#2E2E2E]/50"
                )}
              >
                <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
                <span className="truncate">{block.title || 'Untitled'}</span>
              </div>
            ))}
          </div>

          <div className="px-2">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#757681]">Folders</span>
              <button 
                onClick={addFolder}
                className="text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Add Folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {folders.map(folder => {
              const folderBlocks = blocks.filter(b => b.folderId === folder.id);
              const isExpanded = expandedFolders[folder.id];

              return (
                <div key={folder.id} className="mb-1">
                  <div 
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-[#E9E9E7]/50 dark:hover:bg-[#2E2E2E]/50 group"
                  >
                    <ChevronRight className={cn("w-3.5 h-3.5 text-[#757681] transition-transform", isExpanded ? "rotate-90" : "")} />
                    <FolderIcon className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="flex-1 truncate font-medium">{folder.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addBlock(folder.id); expandedFolders[folder.id] = true; }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                      title="Add document"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => deleteFolder(folder.id, e)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-[#757681] hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="pl-6 pr-2">
                      {folderBlocks.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-[#757681] italic">Empty</div>
                      )}
                      {folderBlocks.map(block => (
                        <div 
                          key={block.id}
                          onClick={() => setSelectedBlockId(block.id)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer group transition-colors",
                            selectedBlockId === block.id ? "bg-[#E9E9E7] dark:bg-[#2E2E2E]" : "hover:bg-[#E9E9E7]/50 dark:hover:bg-[#2E2E2E]/50"
                          )}
                        >
                          <FileText className="w-3.5 h-3.5 text-[#757681] shrink-0" />
                          <span className="truncate">{block.title || 'Untitled'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-4 pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#757681]">General Documents</span>
                <button onClick={() => addBlock(null)} className="text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {blocks.filter(b => !b.folderId && b.status === 'organized').map(block => (
                <div 
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer group transition-colors",
                    selectedBlockId === block.id ? "bg-[#E9E9E7] dark:bg-[#2E2E2E]" : "hover:bg-[#E9E9E7]/50 dark:hover:bg-[#2E2E2E]/50"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-[#757681] shrink-0" />
                  <span className="truncate">{block.title || 'Untitled'}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Main Document Workspace */}
      <div className="flex-1 bg-white dark:bg-[#151515] overflow-y-auto relative py-12 px-16 lg:px-32 xl:px-48">
        {selectedBlock ? (
          <div className="max-w-3xl mx-auto flex flex-col min-h-full">
            {/* Document Header Controls */}
            <div className="flex items-center gap-3 mb-6">
              {selectedBlock.status === 'inbox' && (
                <button 
                  onClick={() => updateBlock(selectedBlock.id, { status: 'organized' })}
                  className="px-3 py-1.5 bg-[#E9E9E7] dark:bg-[#2E2E2E] hover:bg-[#D5D5D3] dark:hover:bg-[#3E3E3E] rounded-md text-xs font-semibold tracking-wide transition-colors text-[#37352F] dark:text-[#EBE9ED]"
                >
                  Move out of Inbox
                </button>
              )}
              {selectedBlock.folderId && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#757681] bg-[#F7F7F5] dark:bg-[#2E2E2E] px-2.5 py-1 rounded-md">
                  <FolderIcon className="w-3.5 h-3.5 text-blue-400" />
                  {folders.find(f => f.id === selectedBlock.folderId)?.name || 'Unknown Folder'}
                </div>
              )}
              <div className="flex-1" />
              <button 
                onClick={() => expandWithAi(selectedBlock)}
                disabled={isAiLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#2665fd]/10 text-[#2665fd] hover:bg-[#2665fd]/20 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Expand Idea with AI
              </button>
              <button 
                onClick={() => deleteBlock(selectedBlock.id)}
                className="p-1.5 text-[#757681] hover:text-red-500 rounded-md transition-colors"
                title="Delete Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Document Title */}
            <textarea
              value={selectedBlock.title || ''}
              onChange={(e) => updateBlock(selectedBlock.id, { title: e.target.value })}
              placeholder="Untitled"
              className="text-4xl md:text-5xl font-bold bg-transparent text-[#37352F] dark:text-[#EBE9ED] placeholder-[#D5D5D3] dark:placeholder-[#3E3E3E] resize-none focus:outline-none mb-6 leading-tight break-words overflow-visible"
              rows={1}
              style={{ minHeight: '64px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />

            {/* Document Content */}
            <textarea
              value={selectedBlock.content || ''}
              onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
              placeholder="Start writing your brilliant idea, or paste some text here..."
              className="flex-1 text-base leading-relaxed bg-transparent text-[#37352F] dark:text-[#EBE9ED] placeholder-[#E9E9E7] dark:placeholder-[#3E3E3E] resize-none focus:outline-none mb-8"
            />

            {/* Sub-Ideas / Brainstorming Links */}
            {childBlocks.length > 0 && (
              <div className="mt-8 pt-8 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                <h3 className="text-sm font-bold text-[#757681] mb-4 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  AI Linked Sub-Ideas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {childBlocks.map(child => (
                    <div 
                      key={child.id}
                      onClick={() => setSelectedBlockId(child.id)}
                      className="p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] hover:border-[#2665fd]/50 cursor-pointer transition-all flex flex-col"
                    >
                      <h4 className="font-bold text-sm mb-1 line-clamp-1">{child.title || 'Untitled'}</h4>
                      <p className="text-xs text-[#757681] line-clamp-2">{child.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-[#E9E9E7] dark:bg-[#2E2E2E] flex items-center justify-center">
              <FileText className="w-8 h-8 text-[#757681]" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Document Selected</h2>
            <p className="text-sm text-[#757681] max-w-sm">
              Select an idea from the sidebar, create a new one, or ask the Idea Generator to brainstorm.
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen AI Loading Overlay */}
      <AnimatePresence>
        {isAiLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
          >
            <div className="bg-white dark:bg-[#2E2E2E] p-6 rounded-2xl shadow-2xl border border-[#E9E9E7] dark:border-[#3E3E3E] flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-[#2665fd]/20 border-t-[#2665fd] rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-[#2665fd] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED]">AI is thinking...</h3>
                <p className="text-sm text-[#757681]">Structuring your creative concepts</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
