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
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  History,
  Archive
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
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
import { toast } from 'sonner';
import { cn } from '../lib/utils';

/**
 * Shorthand for generating unique IDs
 */
const uuidv4 = () => Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9);

interface Block {
  id: string;
  type: 'text' | 'image' | 'prompt' | 'graph' | 'postcard';
  content: string;
  postcardData?: {
    frontText: string;
    backText: string;
    imageUrl: string;
  };
  metadata?: {
    feasibility?: number;
    impact?: number;
    brief?: string;
    caption?: string;
    hashtags?: string;
    format?: string;
  };
  x?: number; // Kept for schema backwards compatibility
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  title?: string;
  folderId?: string | null;
  status?: 'inbox' | 'organized' | 'history';
  parentId?: string | null; // useful for nested structure
}

interface Folder {
  id: string;
  name: string;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
}

interface Link {
  id: string;
  from: string;
  to: string;
}

interface NotebookTabProps {
  activeBusiness: any;
}

function DraggableBlock({ block, children, isSelected, onClick }: { block: Block, children: React.ReactNode, isSelected: boolean, onClick: () => void, key?: React.Key }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: block.id,
    data: {
      type: 'notebook-block',
      block
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-grab active:cursor-grabbing group transition-colors",
        isSelected ? "bg-[#E9E9E7] dark:bg-[#2E2E2E]" : "hover:bg-[#E9E9E7]/50 dark:hover:bg-[#2E2E2E]/50"
      )}
    >
      {children}
    </div>
  );
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
  const [ideaMode, setIdeaMode] = useState<'quick' | 'strategy' | 'postcard'>('quick');
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

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const archiveBlock = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlocks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, status: 'history' as const, folderId: null } : b);
      saveNotebook(updated, links, folders);
      return updated;
    });
    toast.success('Idea archived to History');
  };

  const generateIdeas = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);

    try {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }

      let prompt = '';
      if (ideaMode === 'strategy') {
        prompt = `You are a world-class creative strategist. Based on this prompt: "${aiPrompt}", generate 3-5 high-impact content strategies/ideas for a business in the ${activeBusiness.industry} industry. 
        For each idea, provide:
        - A catchy title
        - A visual brief for designers
        - A compelling caption using a marketing framework (AIDA/PAS)
        - Targeted hashtags
        - A feasibility score (1-10) and an impact score (1-10)
        - Content format (Post, Reel, Story, or Carousel)
        
        Return the result as a JSON array of objects, each with: "title", "brief", "caption", "hashtags", "feasibility", "impact", "format".`;
      } else if (ideaMode === 'postcard') {
         prompt = `You are a creative director. Based on this prompt: "${aiPrompt}", generate 3 distinct "Postcard" concepts for a business in the ${activeBusiness.industry} industry. 
         Each postcard needs:
         - A headline for the front
         - A short message for the back
         - A detailed image description for a photorealistic background
         
         Return the result as a JSON array of objects, each with: "title" (a name for the concept), "front", "back", "imagePrompt".`;
      } else {
        prompt = `You are a creative strategist. Based on this prompt: "${aiPrompt}", generate 3-5 distinct creative ideas for a business in the ${activeBusiness.industry} industry. 
        
        Return the result as a JSON array of objects, each with: "title", "brief", "caption", "hashtags", "feasibility", "impact", "format", "description".`;
      }

      const text = await generateTextWithCascade(prompt, true, activeBusiness.id);
      const ideas = safeParseJSONArray(text);

      if (ideas && Array.isArray(ideas)) {
        const newBlocks: Block[] = await Promise.all(ideas.map(async (idea: any) => {
          const id = Math.random().toString(36).substr(2, 9);
          
          if (ideaMode === 'strategy') {
            return {
              id,
              type: 'text' as const,
              title: idea.title,
              content: idea.caption,
              status: 'inbox' as const,
              folderId: null,
              metadata: {
                feasibility: idea.feasibility,
                impact: idea.impact,
                brief: idea.brief,
                caption: idea.caption,
                hashtags: idea.hashtags,
                format: idea.format
              }
            };
          } else if (ideaMode === 'postcard') {
            const { generateAiImage } = await import('../lib/gemini');
            const imageResult = await generateAiImage(idea.imagePrompt, 'photorealistic', activeBusiness);
            
            return {
              id,
              type: 'postcard' as const,
              title: `Postcard: ${idea.title}`,
              content: idea.back,
              status: 'inbox' as const,
              folderId: null,
              postcardData: {
                frontText: idea.front,
                backText: idea.back,
                imageUrl: imageResult.url
              }
            };
            return {
              id,
              type: 'text' as const,
              title: idea.title,
              content: idea.description || idea.caption,
              status: 'inbox' as const,
              folderId: null,
              metadata: {
                feasibility: idea.feasibility,
                impact: idea.impact,
                brief: idea.brief,
                caption: idea.caption,
                hashtags: idea.hashtags,
                format: idea.format
              }
            };
          }
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

      const text = await generateTextWithCascade(prompt, true, activeBusiness.id);
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

  const generatePostcard = async (block: Block) => {
    setIsAiLoading(true);
    try {
      const prompt = `Convert this idea into a professional social media "Postcard". 
      Idea: "${block.title} - ${block.content}"
      
      Generate:
      1. A catchy headline for the front.
      2. A short, persuasive message for the back (50-80 words).
      3. A detailed image description for a photorealistic background image.
      
      Return as a JSON object: { "front": "...", "back": "...", "imagePrompt": "..." }`;

      const text = await generateTextWithCascade(prompt, true, activeBusiness.id);
      const data = JSON.parse(text);

      const { generateAiImage } = await import('../lib/gemini');
      const imageResult = await generateAiImage(data.imagePrompt, 'photorealistic', activeBusiness);

      const newBlock: Block = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'postcard',
        title: `Postcard: ${data.front}`,
        content: data.back,
        status: 'organized',
        folderId: block.folderId,
        parentId: block.id,
        postcardData: {
          frontText: data.front,
          backText: data.back,
          imageUrl: imageResult.url
        }
      };

      const updatedBlocks = [...blocks, newBlock];
      const updatedLinks = [...links, { id: uuidv4(), from: block.id, to: newBlock.id }];
      
      setBlocks(updatedBlocks);
      setLinks(updatedLinks);
      saveNotebook(updatedBlocks, updatedLinks, folders);
      setSelectedBlockId(newBlock.id);
      
    } catch (error) {
       console.error('Postcard generation error:', error);
       toast.error('Failed to generate postcard');
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);
  const childBlocks = selectedBlock 
    ? blocks.filter(b => links.some(l => l.from === selectedBlock.id && l.to === b.id))
    : [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-[#151515] text-[#37352F] dark:text-[#EBE9ED] relative">
      
      {/* Header section (Matches Calendar style) */}
      <div className="hidden md:block p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#2665fd]/10 rounded-[16px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#2665fd]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                Strategy Lab
              </h2>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mt-1">
                Collaborative workspace for brainstorming and strategy development.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-xs font-medium text-[#757681] dark:text-[#9B9A97]">Lab Active</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
      
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
            
            <div className="mt-3 flex items-center gap-1.5 p-1 bg-white/50 dark:bg-black/20 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E]">
              {['quick', 'strategy', 'postcard'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setIdeaMode(mode as any)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all",
                    ideaMode === mode 
                      ? "bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#1A1A1A] shadow-sm" 
                      : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button 
              onClick={generateIdeas}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="absolute bottom-12 right-2 p-1.5 bg-transparent text-[#2665fd] hover:scale-110 disabled:opacity-40 transition-all"
              title="Generate with AI"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Workspace List */}
        <div className="flex-1 overflow-y-auto py-2">
          
          {/* Inbox / Uncategorized area */}
          <div className="px-2 mb-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#757681]">Inbox</span>
            </div>
            {blocks.filter(b => b.status === 'inbox').map(block => (
              <DraggableBlock 
                key={block.id} 
                block={block} 
                isSelected={selectedBlockId === block.id}
                onClick={() => setSelectedBlockId(block.id)}
              >
                {block.type === 'postcard' ? <Zap className="w-4 h-4 text-purple-500 shrink-0" /> : <Zap className="w-4 h-4 text-yellow-500 shrink-0" />}
                <span className="truncate">{block.title || 'Untitled'}</span>
              </DraggableBlock>
            ))}
          </div>

          <div className="px-2">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#757681]">Folders</span>
              <button 
                onClick={addFolder}
                className="text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
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
                      onClick={(e) => { e.stopPropagation(); addBlock(folder.id); toggleFolder(folder.id); }}
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
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {folderBlocks.length === 0 && (
                          <div className="pl-10 py-1.5 text-[10px] text-[#757681]/50 italic">Empty folder</div>
                        )}
                        {folderBlocks.map(block => (
                          <div key={block.id} className="pl-6">
                            <DraggableBlock 
                              block={block} 
                              isSelected={selectedBlockId === block.id}
                              onClick={() => setSelectedBlockId(block.id)}
                            >
                              {block.type === 'postcard' ? <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-[#757681] shrink-0" />}
                              <span className="truncate">{block.title || 'Untitled'}</span>
                            </DraggableBlock>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* History Section */}
          <div className="px-2 mt-4 pb-20">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#757681] flex items-center gap-1.5">
                <History className="w-3 h-3" />
                History
              </span>
            </div>
            {blocks.filter(b => b.status === 'history').length === 0 && (
              <div className="px-3 py-2 text-[10px] text-[#757681]/50 italic text-center">No archived items</div>
            )}
            {blocks.filter(b => b.status === 'history').map(block => (
              <DraggableBlock 
                key={block.id} 
                block={block} 
                isSelected={selectedBlockId === block.id}
                onClick={() => setSelectedBlockId(block.id)}
              >
                <Archive className="w-3.5 h-3.5 text-[#757681] shrink-0" />
                <span className="truncate opacity-60">{block.title || 'Untitled'}</span>
              </DraggableBlock>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#757681]">General Documents</span>
              <button onClick={() => addBlock(null)} className="text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {blocks.filter(b => !b.folderId && b.status === 'organized').map(block => (
              <DraggableBlock 
                key={block.id} 
                block={block} 
                isSelected={selectedBlockId === block.id}
                onClick={() => setSelectedBlockId(block.id)}
              >
                {block.type === 'postcard' ? <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-[#757681] shrink-0" />}
                <span className="truncate">{block.title || 'Untitled'}</span>
              </DraggableBlock>
            ))}
          </div>
        </div>
      </div>

      {/* Main Document Workspace */}
      <div className="flex-1 bg-white dark:bg-[#151515] overflow-y-auto relative p-0">
        <div className="p-8 md:p-12 border-b border-[#E9E9E7] dark:border-[#202020] bg-white dark:bg-[#1A1A1A] mb-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-[16px] flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#37352F] dark:text-[#EBE9ED] tracking-tight">
                  Strategy Lab
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#757681] font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    AI Strategy Workspace
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#D9D9D7] dark:bg-[#3E3E3E]" />
                  <span className="text-xs text-[#757681] font-medium">
                    {blocks.length} Ideas Captured
                  </span>
                </div>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-3">
              <div className="px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-[#757681] uppercase tracking-wider">Lab Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pb-12 lg:px-32 xl:px-48">
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
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#757681] bg-[#F7F7F5] dark:bg-[#202020] px-2.5 py-1 rounded-md">
                    <FolderIcon className="w-3.5 h-3.5 text-blue-400" />
                    {folders.find(f => f.id === selectedBlock.folderId)?.name || 'Unknown Folder'}
                  </div>
                )}
                <div className="flex-1" />
                {selectedBlock.type !== 'postcard' && (
                  <button 
                    onClick={() => generatePostcard(selectedBlock)}
                    disabled={isAiLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Generate Postcard
                  </button>
                )}
                <button 
                  onClick={() => expandWithAi(selectedBlock)}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#2665fd]/10 text-[#2665fd] hover:bg-[#2665fd]/20 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Expand Idea with AI
                </button>
                <button 
                  onClick={() => archiveBlock(selectedBlock.id)}
                  className="p-1.5 text-[#757681] hover:text-amber-500 rounded-md transition-colors"
                  title="Archive to History"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteBlock(selectedBlock.id)}
                  className="p-1.5 text-[#757681] hover:text-red-500 rounded-md transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Metadata Bar */}
              {selectedBlock.metadata && (
                <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#757681]">
                      <span>Feasibility</span>
                      <span className="text-[#37352F] dark:text-[#EBE9ED]">{selectedBlock.metadata.feasibility}/10</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E9E9E7] dark:bg-[#2E2E2E] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedBlock.metadata.feasibility || 0) * 10}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#757681]">
                      <span>Strategic Impact</span>
                      <span className="text-[#37352F] dark:text-[#EBE9ED]">{selectedBlock.metadata.impact}/10</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E9E9E7] dark:bg-[#2E2E2E] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedBlock.metadata.impact || 0) * 10}%` }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                  </div>

                  {selectedBlock.metadata.format && (
                    <div className="px-3 py-1 bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#1A1A1A] rounded-md text-[10px] font-black uppercase tracking-widest">
                      {selectedBlock.metadata.format}
                    </div>
                  )}
                </div>
              )}

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

              {/* Document Content or Postcard View */}
              {selectedBlock.type === 'postcard' && selectedBlock.postcardData ? (
                <div className="flex-1">
                  <div className="relative aspect-[4/3] w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl group border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <img 
                      src={selectedBlock.postcardData.imageUrl} 
                      alt="Postcard Background" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight uppercase tracking-tight">
                        {selectedBlock.postcardData.frontText}
                      </h2>
                      <div className="h-1 w-24 bg-purple-500 rounded-full mb-4" />
                    </div>
                  </div>
                  
                  <div className="mt-8 p-8 bg-[#F7F7F5] dark:bg-[#202020] rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-[#757681]">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      Message from AI
                    </div>
                    <p className="text-lg leading-relaxed italic text-[#37352F] dark:text-[#EBE9ED]">
                      "{selectedBlock.postcardData.backText}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {selectedBlock.metadata?.brief && (
                    <div className="p-5 rounded-2xl border border-[#2665fd]/10 bg-[#2665fd]/5">
                      <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2665fd] mb-3">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Visual Brief for Designers
                      </h4>
                      <p className="text-sm text-[#37352F] dark:text-[#EBE9ED] leading-relaxed">
                        {selectedBlock.metadata.brief}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                     {selectedBlock.metadata && (
                       <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#757681]">
                         <FileText className="w-3.5 h-3.5" />
                         Content Caption
                       </h4>
                     )}
                     <textarea
                      value={selectedBlock.content || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                      placeholder={selectedBlock.metadata ? "Refine the caption..." : "Start writing your brilliant idea..."}
                      className="w-full min-h-[200px] text-base leading-relaxed bg-transparent text-[#37352F] dark:text-[#EBE9ED] placeholder-[#E9E9E7] dark:placeholder-[#3E3E3E] resize-none focus:outline-none"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                  </div>

                  {selectedBlock.metadata?.hashtags && (
                    <div className="mt-4 pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <p className="text-xs text-[#2665fd] font-medium tracking-tight">
                        {selectedBlock.metadata.hashtags}
                      </p>
                    </div>
                  )}
                </div>
              )}

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
      </div>
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
