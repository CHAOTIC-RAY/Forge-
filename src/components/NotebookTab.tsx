import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TransformWrapper, 
  TransformComponent, 
  useTransformEffect 
} from 'react-zoom-pan-pinch';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Image as ImageIcon, 
  Type, 
  Share2, 
  Download, 
  Trash2, 
  Maximize2, 
  Minimize2,
  MousePointer2,
  Hand,
  Link as LinkIcon,
  Zap,
  BarChart3,
  ChevronRight,
  MoreVertical,
  PenTool,
  Folder as FolderIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  deleteDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { getAi, safeParseJSONArray, getAiSettings, isGeminiKeyAvailable, fetchServerConfig } from '../lib/gemini';
import * as d3 from 'd3';

interface Block {
  id: string;
  type: 'text' | 'image' | 'prompt' | 'graph';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  title?: string;
  folderId?: string | null;
  status?: 'inbox' | 'organized';
}

interface Folder {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
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
  const [isLinking, setIsLinking] = useState(false);
  const [linkStartId, setLinkStartId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [tool, setTool] = useState<'select' | 'hand' | 'link'>('select');
  const [viewMode, setViewMode] = useState<'canvas' | 'split'>('split');
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformComponentRef = useRef<any>(null);
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isInitialLoad = useRef(true);
  const [aiPrompt, setAiPrompt] = useState('');

  // Load notebook data
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
        // Create initial notebook if doesn't exist
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
              content: `Welcome to your Creative Notebook for ${activeBusiness.name}. Use the Idea Lab on the left to generate concepts, then drag them to the Strategy Board to organize.`,
              x: 100,
              y: 100,
              width: 300,
              height: 150,
              color: '#FDFD96',
              status: 'organized'
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

  const addBlock = (x: number, y: number, type: Block['type'] = 'text', status: 'inbox' | 'organized' = 'organized') => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'prompt' ? 'Ask AI something...' : 'New Thought...',
      x,
      y,
      width: 250,
      height: 150,
      color: type === 'prompt' ? '#E0F2FE' : '#FFFFFF',
      status,
      folderId: null
    };
    
    setBlocks(prev => {
      const updated = [...prev, newBlock];
      saveNotebook(updated, links, folders);
      return updated;
    });
  };

  const addFolder = (x: number, y: number) => {
    const newFolder: Folder = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Folder',
      color: '#F3F4F6',
      x,
      y
    };
    setFolders(prev => {
      const updated = [...prev, newFolder];
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

  const deleteBlock = (id: string) => {
    const updatedLinks = links.filter(l => l.from !== id && l.to !== id);
    setLinks(updatedLinks);
    
    setBlocks(prev => {
      const updated = prev.filter(b => b.id !== id);
      saveNotebook(updated, updatedLinks, folders);
      return updated;
    });
  };

  const deleteFolder = (id: string) => {
    // Unset folderId for blocks in this folder
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

  const generateIdeas = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
        if (!isGeminiKeyAvailable()) {
          throw new Error("Gemini API Key is missing.");
        }
      }

      const ai = getAi();
      const settings = getAiSettings();
      const model = (ai as any).getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `You are a creative strategist for ${activeBusiness.name} (${activeBusiness.industry}). 
      Based on this prompt: "${aiPrompt}", generate 5 unique, actionable creative ideas or strategic concepts.
      Return the result as a JSON array of objects, each with "title" and "description" fields.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const ideas = safeParseJSONArray(text);

      if (ideas && Array.isArray(ideas)) {
        const newBlocks: Block[] = ideas.map((idea: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          type: 'text',
          title: idea.title,
          content: idea.description,
          x: 0,
          y: 0,
          width: 250,
          height: 150,
          color: '#FFFFFF',
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

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Account for zoom/pan
    if (transformComponentRef.current) {
      const { scale, positionX, positionY } = transformComponentRef.current.state;
      x = (e.clientX - rect.left - positionX) / scale;
      y = (e.clientY - rect.top - positionY) / scale;
    }

    addBlock(x, y, 'text', 'organized');
  };

  const handleLink = (id: string) => {
    if (tool !== 'link') return;
    if (!linkStartId) {
      setLinkStartId(id);
    } else if (linkStartId !== id) {
      const newLink = {
        id: Math.random().toString(36).substr(2, 9),
        from: linkStartId,
        to: id
      };
      const updatedLinks = [...links, newLink];
      setLinks(updatedLinks);
      saveNotebook(blocks, updatedLinks, folders);
      setLinkStartId(null);
    }
  };

  const handleOrganize = (blockId: string) => {
    updateBlock(blockId, { status: 'organized', x: 100, y: 100 });
  };

  const expandWithAi = async (block: Block) => {
    setIsAiLoading(true);
    try {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
        if (!isGeminiKeyAvailable()) {
          throw new Error("Gemini API Key is missing.");
        }
      }

      const ai = getAi();
      const settings = getAiSettings();
      const model = (ai as any).getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const systemInstruction = settings.systemInstructions ? `\n\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : '';
      
      const prompt = `You are a creative strategist. Based on this central idea: "${block.content}", generate 5-6 related sub-ideas or strategic branches for a business in the ${activeBusiness.industry} industry. 
      ${systemInstruction}
      Return the result as a JSON array of objects, each with "title" and "description" fields.
      Central Idea: ${block.content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const ideas = safeParseJSONArray(text);

      if (ideas && Array.isArray(ideas)) {
        const newBlocks: Block[] = [];
        const newLinks: Link[] = [];
        
        ideas.forEach((idea: any, index: number) => {
          const angle = (index / ideas.length) * Math.PI * 2;
          const radius = 300;
          const id = Math.random().toString(36).substr(2, 9);
          
          newBlocks.push({
            id,
            type: 'text',
            title: idea.title,
            content: idea.description,
            x: block.x + Math.cos(angle) * radius,
            y: block.y + Math.sin(angle) * radius,
            width: 200,
            height: 120,
            color: '#F0F9FF',
            status: block.status || 'organized',
            folderId: block.folderId
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

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5] dark:bg-[#1A1A1A] overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#202020] flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex bg-[#F7F7F5] dark:bg-[#2E2E2E] p-1 rounded-lg border border-[#E9E9E7] dark:border-[#3E3E3E]">
            <button 
              onClick={() => setTool('select')}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                tool === 'select' ? "bg-white dark:bg-[#3E3E3E] shadow-sm text-[#2665fd]" : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTool('hand')}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                tool === 'hand' ? "bg-white dark:bg-[#3E3E3E] shadow-sm text-[#2665fd]" : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              <Hand className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTool('link')}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                tool === 'link' ? "bg-white dark:bg-[#3E3E3E] shadow-sm text-[#2665fd]" : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="h-6 w-px bg-[#E9E9E7] dark:bg-[#2E2E2E] mx-1" />
          <button 
            onClick={() => addBlock(500, 500, 'text', 'organized')}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2665fd] text-white rounded-lg text-sm font-medium hover:bg-[#1e52d0] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </button>
          <button 
            onClick={() => addFolder(500, 500)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-lg text-sm font-medium hover:bg-[#F7F7F5] dark:hover:bg-[#3E3E3E] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Folder
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#F7F7F5] dark:bg-[#2E2E2E] p-1 rounded-lg border border-[#E9E9E7] dark:border-[#3E3E3E]">
            <button 
              onClick={() => setViewMode('canvas')}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                viewMode === 'canvas' ? "bg-white dark:bg-[#3E3E3E] shadow-sm text-[#2665fd]" : "text-[#757681]"
              )}
            >
              Canvas
            </button>
            <button 
              onClick={() => setViewMode('split')}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                viewMode === 'split' ? "bg-white dark:bg-[#3E3E3E] shadow-sm text-[#2665fd]" : "text-[#757681]"
              )}
            >
              Idea Lab
            </button>
          </div>
          <div className="h-6 w-px bg-[#E9E9E7] dark:bg-[#2E2E2E] mx-1" />
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full border border-[#E9E9E7] dark:border-[#3E3E3E]">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-[#757681]">AI Assistant Active</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Idea Lab Sidebar */}
        {viewMode === 'split' && (
          <div className="w-80 border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#202020] flex flex-col shrink-0">
            <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
              <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Idea Lab
              </h3>
              <div className="relative">
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="What should we brainstorm today?"
                  className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2665fd]/50 resize-none h-24"
                />
                <button 
                  onClick={generateIdeas}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="absolute bottom-2 right-2 p-2 bg-[#2665fd] text-white rounded-lg hover:bg-[#1e52d0] disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#757681]">Inbox ({blocks.filter(b => b.status === 'inbox').length})</span>
              </div>
              
              {blocks.filter(b => b.status === 'inbox').length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl">
                  <p className="text-xs text-[#757681]">No new ideas yet. Use the prompt above to generate some!</p>
                </div>
              ) : (
                blocks.filter(b => b.status === 'inbox').map(block => (
                  <motion.div 
                    key={block.id}
                    layoutId={block.id}
                    className="p-3 bg-white dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-xl shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">{block.title || 'Untitled Idea'}</h4>
                      <button 
                        onClick={() => handleOrganize(block.id)}
                        className="p-1 hover:bg-[#2665fd]/10 text-[#2665fd] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Move to Strategy Board"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#757681] line-clamp-3 mb-2">{block.content}</p>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => deleteBlock(block.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Strategy Board (Canvas) */}
        <div className="flex-1 relative overflow-hidden cursor-crosshair" ref={canvasRef}>
          <TransformWrapper
            ref={transformComponentRef}
            initialScale={1}
            minScale={0.1}
            maxScale={5}
            centerOnInit
            disabled={tool !== 'hand'}
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {!isReady && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-[#2665fd] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-medium text-[#757681]">Loading Board...</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
                  <button onClick={() => zoomIn()} className="p-2 bg-white dark:bg-[#2E2E2E] rounded-lg shadow-lg border border-[#E9E9E7] dark:border-[#3E3E3E] text-[#757681] hover:text-[#2665fd]">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => zoomOut()} className="p-2 bg-white dark:bg-[#2E2E2E] rounded-lg shadow-lg border border-[#E9E9E7] dark:border-[#3E3E3E] text-[#757681] hover:text-[#2665fd]">
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => resetTransform()} className="p-2 bg-white dark:bg-[#2E2E2E] rounded-lg shadow-lg border border-[#E9E9E7] dark:border-[#3E3E3E] text-[#757681] hover:text-[#2665fd]">
                    <MousePointer2 className="w-5 h-5" />
                  </button>
                </div>

                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{ width: '5000px', height: '5000px' }}
                >
                  <div 
                    className="w-full h-full relative bg-[#F7F7F5] dark:bg-[#1A1A1A]"
                    onDoubleClick={handleCanvasDoubleClick}
                    style={{
                      backgroundImage: `radial-gradient(var(--border-main) 1px, transparent 1px), radial-gradient(var(--border-main) 1px, transparent 1px)`,
                      backgroundSize: '40px 40px',
                      backgroundPosition: '0 0, 20px 20px'
                    }}
                  >
                    {/* Links */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {links.map(link => {
                        const fromBlock = blocks.find(b => b.id === link.from);
                        const toBlock = blocks.find(b => b.id === link.to);
                        if (!fromBlock || !toBlock) return null;
                        
                        return (
                          <line
                            key={link.id}
                            x1={fromBlock.x + fromBlock.width / 2}
                            y1={fromBlock.y + fromBlock.height / 2}
                            x2={toBlock.x + toBlock.width / 2}
                            y2={toBlock.y + toBlock.height / 2}
                            stroke="#2665fd"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="opacity-40"
                          />
                        );
                      })}
                    </svg>

                    {/* Folders */}
                    {folders.map(folder => (
                      <FolderItem 
                        key={folder.id}
                        folder={folder}
                        blocks={blocks.filter(b => b.folderId === folder.id)}
                        onUpdate={(updates) => updateFolder(folder.id, updates)}
                        onDelete={() => deleteFolder(folder.id)}
                        onSelectBlock={setSelectedBlockId}
                        tool={tool}
                      />
                    ))}

                    {/* Blocks (Organized and not in folder) */}
                    {blocks.filter(b => b.status === 'organized' && !b.folderId).map(block => (
                      <ThoughtBlock 
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onUpdate={(updates: Partial<Block>) => updateBlock(block.id, updates)}
                        onDelete={() => deleteBlock(block.id)}
                        onExpand={() => expandWithAi(block)}
                        onLink={() => handleLink(block.id)}
                        isLinking={linkStartId === block.id}
                        tool={tool}
                        folders={folders}
                        blocks={blocks}
                        setBlocks={setBlocks}
                        setFolders={setFolders}
                        saveNotebook={saveNotebook}
                        links={links}
                      />
                    ))}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>

      {/* AI Loading Overlay */}
      <AnimatePresence>
        {isAiLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="bg-white dark:bg-[#2E2E2E] p-6 rounded-2xl shadow-2xl border border-[#E9E9E7] dark:border-[#3E3E3E] flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-[#2665fd]/20 border-t-[#2665fd] rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-[#2665fd] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED]">AI is thinking...</h3>
                <p className="text-sm text-[#757681]">Expanding your creative strategy</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FolderItemProps {
  folder: Folder;
  blocks: Block[];
  onUpdate: (updates: Partial<Folder>) => void;
  onDelete: () => void;
  onSelectBlock: (id: string) => void;
  tool: string;
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, blocks, onUpdate, onDelete, onSelectBlock, tool }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const handleDragStart = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = folder.x;
    const initialY = folder.y;

    const handleMouseMove = (moveE: MouseEvent) => {
      const dx = moveE.clientX - startX;
      const dy = moveE.clientY - startY;
      onUpdate({ x: initialX + dx, y: initialY + dy });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div
      initial={false}
      animate={{ x: folder.x, y: folder.y }}
      className="absolute p-4 rounded-2xl bg-[#F3F4F6] dark:bg-[#2E2E2E] border-2 border-[#E9E9E7] dark:border-[#3E3E3E] shadow-lg group min-w-[200px]"
      onMouseDown={handleDragStart}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderIcon className="w-5 h-5 text-blue-500" />
          {isEditing ? (
            <input 
              autoFocus
              className="bg-transparent font-bold text-sm outline-none w-32 border-b border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setIsEditing(false);
                onUpdate({ name });
              }}
            />
          ) : (
            <h4 
              className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED] cursor-text"
              onDoubleClick={() => setIsEditing(true)}
            >
              {folder.name}
            </h4>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {blocks.length === 0 ? (
          <p className="text-[10px] text-[#757681] italic py-2 text-center">Empty folder</p>
        ) : (
          blocks.map(block => (
            <div 
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              className="p-2 bg-white dark:bg-[#1A1A1A] rounded-lg border border-[#E9E9E7] dark:border-[#3E3E3E] text-[11px] text-[#37352F] dark:text-[#EBE9ED] truncate cursor-pointer hover:border-blue-500 transition-colors"
            >
              {block.title || block.content}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

interface ThoughtBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onExpand: () => void;
  onLink: () => void;
  isLinking: boolean;
  tool: string;
  folders: Folder[];
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  saveNotebook: (blocks: Block[], links: Link[], folders: Folder[]) => void;
  links: Link[];
}

const ThoughtBlock: React.FC<ThoughtBlockProps> = ({ 
  block, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete, 
  onExpand,
  onLink,
  isLinking,
  tool,
  folders,
  blocks,
  setBlocks,
  setFolders,
  saveNotebook,
  links
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.content);
  const [title, setTitle] = useState(block.title || '');
  const [isOverFolder, setIsOverFolder] = useState<string | null>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    onSelect();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = block.x;
    const initialY = block.y;

    const handleMouseMove = (moveE: MouseEvent) => {
      const dx = moveE.clientX - startX;
      const dy = moveE.clientY - startY;
      const newX = initialX + dx;
      const newY = initialY + dy;
      
      onUpdate({ x: newX, y: newY });

      // Check for folder collision
      const overFolder = folders.find(f => {
        const dist = Math.sqrt(Math.pow(f.x - newX, 2) + Math.pow(f.y - newY, 2));
        return dist < 100;
      });
      
      // Check for block collision (to create new folder)
      const overBlock = !overFolder ? blocks.find(b => {
        if (b.id === block.id || b.folderId || b.status !== 'organized') return false;
        const dist = Math.sqrt(Math.pow(b.x - newX, 2) + Math.pow(b.y - newY, 2));
        return dist < 80;
      }) : null;

      setIsOverFolder(overFolder?.id || (overBlock ? 'new-folder-' + overBlock.id : null));
    };

    const handleMouseUp = () => {
      if (isOverFolder) {
        if (isOverFolder.startsWith('new-folder-')) {
          const targetBlockId = isOverFolder.replace('new-folder-', '');
          const newFolderId = Math.random().toString(36).substr(2, 9);
          const newFolder: Folder = {
            id: newFolderId,
            name: 'New Group',
            color: '#F3F4F6',
            x: block.x,
            y: block.y
          };
          
          const updatedFolders = [...folders, newFolder];
          const updatedBlocks = blocks.map(b => 
            (b.id === block.id || b.id === targetBlockId) 
              ? { ...b, folderId: newFolderId, status: 'organized' } 
              : b
          );

          setFolders(updatedFolders);
          setBlocks(updatedBlocks);
          saveNotebook(updatedBlocks, links, updatedFolders);
        } else {
          onUpdate({ folderId: isOverFolder, status: 'organized' });
        }
      }
      setIsOverFolder(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div
      initial={false}
      animate={{ x: block.x, y: block.y }}
      className={cn(
        "absolute p-4 rounded-xl shadow-lg border-2 transition-all group",
        isSelected ? "border-[#2665fd] ring-4 ring-[#2665fd]/10" : "border-[#E9E9E7] dark:border-[#2E2E2E]",
        isLinking ? "border-green-500 ring-4 ring-green-500/10" : "",
        isOverFolder ? "scale-90 opacity-50 border-blue-500" : ""
      )}
      style={{ 
        width: block.width, 
        height: block.height, 
        backgroundColor: block.color,
        cursor: tool === 'select' ? 'grab' : tool === 'link' ? 'pointer' : 'inherit'
      }}
      onMouseDown={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        if (tool === 'link') onLink();
        else onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          {isEditing ? (
            <input 
              autoFocus
              className="bg-transparent font-bold text-sm outline-none w-full border-b border-[#2665fd]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                setIsEditing(false);
                onUpdate({ title });
              }}
              placeholder="Title..."
            />
          ) : (
            <h4 className="font-bold text-sm text-[#37352F] truncate">
              {block.title || (block.type === 'prompt' ? 'AI Prompt' : 'Thought')}
            </h4>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onExpand(); }}
              className="p-1 hover:bg-black/5 rounded text-[#2665fd]"
              title="Expand with AI"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 hover:bg-black/5 rounded text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {isEditing ? (
            <textarea 
              className="w-full h-full bg-transparent text-sm resize-none outline-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => {
                setIsEditing(false);
                onUpdate({ content });
              }}
            />
          ) : (
            <p className="text-sm text-[#757681] line-clamp-4">
              {block.content}
            </p>
          )}
        </div>

        {block.type === 'graph' && (
          <div className="mt-2 flex-1 bg-black/5 rounded-lg overflow-hidden">
            <StrategyGraph />
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100"
        onMouseDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          const initialW = block.width;
          const initialH = block.height;

          const handleMouseMove = (moveE: MouseEvent) => {
            onUpdate({ 
              width: Math.max(150, initialW + (moveE.clientX - startX)),
              height: Math.max(100, initialH + (moveE.clientY - startY))
            });
          };

          const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
          };

          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        }}
      />
    </motion.div>
  );
};

function StrategyGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 200;
    const height = 150;
    const margin = { top: 10, right: 10, bottom: 20, left: 20 };

    const data = [
      { x: 20, y: 80, label: 'Social' },
      { x: 50, y: 40, label: 'Ads' },
      { x: 80, y: 90, label: 'SEO' },
      { x: 30, y: 20, label: 'Email' },
      { x: 60, y: 70, label: 'PR' }
    ];

    const xScale = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(0))
      .call(g => g.select(".domain").attr("stroke", "#E9E9E7"))
      .call(g => g.selectAll(".tick text").attr("fill", "#757681").attr("font-size", "8px"));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickSize(0))
      .call(g => g.select(".domain").attr("stroke", "#E9E9E7"))
      .call(g => g.selectAll(".tick text").attr("fill", "#757681").attr("font-size", "8px"));

    // Labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", "#757681")
      .text("Effort");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", "#757681")
      .text("Impact");

    // Points
    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 4)
      .attr("fill", "#2665fd")
      .attr("opacity", 0.6);

    svg.selectAll(".point-label")
      .data(data)
      .enter()
      .append("text")
      .attr("x", d => xScale(d.x) + 6)
      .attr("y", d => yScale(d.y) + 3)
      .attr("font-size", "7px")
      .attr("fill", "#37352F")
      .text(d => d.label);

  }, []);

  return (
    <svg ref={svgRef} className="w-full h-full" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet" />
  );
}
