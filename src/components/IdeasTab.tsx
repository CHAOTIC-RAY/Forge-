import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Zap,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FileText,
  Plus,
  Link as LinkIcon,
  Image as ImageIcon,
  History,
  Archive,
  Lightbulb,
  Search,
  LayoutGrid,
  List,
  X,
  GripVertical,
  Upload,
  CalendarPlus,
} from 'lucide-react';
import { useIsMobile } from './Calendar';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { useProfile } from '../hooks/useSupabaseAuth';
import { getNotebook, upsertNotebook, subscribeToNotebook } from '../lib/supabase';
import {
  generateTextWithCascade,
  safeParseJSON,
  safeParseJSONArray,
  isGeminiKeyAvailable,
  fetchServerConfig,
  generateTaskIdeas,
  generateIdeasFromImages,
  type IdeasFromImagesMode,
} from '../lib/gemini';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { TabHeaderBadge, TabPageHeader, TabPageShell } from './ui/TabPageHeader';
import { ForgeWorkspaceLoader } from './ForgeWorkspaceLoader';

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
  createdAt?: number;
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

interface IdeasTabProps {
  activeBusiness: any;
  onAddToCalendar?: (block: Block) => void;
}

type IdeasViewMode = 'board' | 'list';

function formatIdeaAge(ts?: number): string {
  if (!ts) return 'Just now';
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function IdeaCard({
  block,
  isSelected,
  onSelect,
  onArchive,
  onDelete,
  folderName,
}: {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  folderName?: string;
}) {
  const snippet = (block.content || block.metadata?.caption || '').trim();
  return (
    <div className="mb-2">
    <DraggableBlock block={block} isSelected={isSelected} onClick={onSelect}>
      {block.type === 'image' ? (
        <img
          src={block.content}
          alt=""
          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#E9E9E7] dark:border-[#2E2E2E]"
        />
      ) : block.type === 'postcard' ? (
        <ImageIcon className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
      ) : (
        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm line-clamp-2 break-words text-[#37352F] dark:text-[#EBE9ED]">
            {block.title || 'Untitled idea'}
          </p>
          <span className="text-[9px] text-[#757681] shrink-0">{formatIdeaAge(block.createdAt)}</span>
        </div>
        {snippet ? (
          <p className="text-xs text-[#757681] dark:text-[#9B9A97] line-clamp-2 mt-0.5">{snippet}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {block.type === 'postcard' && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              Visual
            </span>
          )}
          {block.metadata?.format && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E9E9E7] dark:bg-[#2E2E2E] text-[#757681]">
              {block.metadata.format}
            </span>
          )}
          {folderName && (
            <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 truncate max-w-[100px]">
              {folderName}
            </span>
          )}
          {block.metadata?.impact != null && (
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              Impact {block.metadata.impact}/10
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={onArchive}
          className="p-1 text-[#757681] hover:text-amber-500 rounded"
          title="Archive"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-[#757681] hover:text-red-500 rounded"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </DraggableBlock>
    </div>
  );
}

function DraggableBlock({ block, children, isSelected, onClick }: { block: Block, children: React.ReactNode, isSelected: boolean, onClick: () => void, key?: React.Key }) {
  const isMobile = useIsMobile();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: block.id,
    disabled: isMobile,
    data: {
      type: 'notebook-block',
      block
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    touchAction: isMobile ? 'auto' : 'none',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...(isMobile ? {} : listeners)}
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 px-3 py-2.5 rounded-xl border text-sm group transition-all w-full",
        isMobile ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isSelected
          ? "border-brand/30 bg-white dark:bg-[#1A1A1A] shadow-sm"
          : "border-transparent bg-[#F7F7F5]/80 dark:bg-[#202020]/80 hover:border-[#E9E9E7] dark:hover:border-[#2E2E2E]",
        isDragging && "shadow-xl z-50 ring-2 ring-brand/20 opacity-90",
        !isDragging && "hover:shadow-sm"
      )}
    >
      {children}
    </div>
  );
}

export function IdeasTab({ activeBusiness, onAddToCalendar }: IdeasTabProps) {
  const profile = useProfile();
  const isMobile = useIsMobile();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isInitialLoad = useRef(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [ideaMode, setIdeaMode] = useState<IdeasFromImagesMode>('quick');
  const [isIdeaGeneratorExpanded, setIsIdeaGeneratorExpanded] = useState(false);
  const [ideaReferenceImages, setIdeaReferenceImages] = useState<string[]>([]);
  const ideaImageInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<IdeasViewMode>('board');
  const [quickCapture, setQuickCapture] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    if (!activeBusiness?.id || !profile) return;

    setIsReady(false);
    isInitialLoad.current = true;

    const applyNotebook = async (docData: { id: string; blocks?: Block[]; links?: Link[]; folders?: Folder[] } | null) => {
      try {
        if (!docData) {
          const created = await upsertNotebook(activeBusiness.id, profile.id, {
            title: 'Ideas',
            blocks: [],
            links: [],
            folders: [],
          });
          setNotebookId(created.id);
          setBlocks([]);
          setLinks([]);
          setFolders([]);
          setIsReady(true);
          isInitialLoad.current = false;
          return;
        }

        setNotebookId(docData.id);
        if (isInitialLoad.current) {
          let loadedBlocks = docData.blocks || [];
          let hasChanges = false;

          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          loadedBlocks = loadedBlocks.filter((b: Block) => {
            if (b.status === 'history' && b.createdAt && b.createdAt < thirtyDaysAgo) {
              hasChanges = true;
              return false;
            }
            return true;
          });

          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          loadedBlocks = loadedBlocks.map((b: Block) => {
            if (b.status === 'inbox' && b.createdAt && b.createdAt < sevenDaysAgo) {
              hasChanges = true;
              return { ...b, status: 'history' as const };
            }
            return b;
          });

          setBlocks(loadedBlocks);
          setLinks(docData.links || []);
          setFolders(docData.folders || []);
          isInitialLoad.current = false;

          if (hasChanges) {
            await upsertNotebook(activeBusiness.id, profile.id, {
              blocks: loadedBlocks,
              links: docData.links || [],
              folders: docData.folders || [],
            });
          }
        }
        setIsReady(true);
      } catch (error) {
        console.error('Error loading ideas notebook:', error);
        toast.error('Could not load ideas — showing an empty board.');
        setBlocks([]);
        setLinks([]);
        setFolders([]);
        setIsReady(true);
        isInitialLoad.current = false;
      }
    };

    const unsubscribe = subscribeToNotebook(activeBusiness.id, profile.id, (notebook) => {
      void applyNotebook(notebook);
    });

    return () => unsubscribe();
  }, [activeBusiness?.id, profile?.id]);

  const saveNotebook = async (newBlocks: Block[], newLinks: Link[], newFolders: Folder[] = folders) => {
    if (!activeBusiness?.id || !profile) return;
    try {
      await upsertNotebook(activeBusiness.id, profile.id, {
        blocks: newBlocks,
        links: newLinks,
        folders: newFolders,
      });
    } catch (error) {
      console.error('Error saving notebook:', error);
      toast.error('Failed to save ideas to cloud.');
    }
  };

  const addFolder = () => {
    const name = typeof window !== 'undefined' ? window.prompt('Collection name', 'New collection') : 'New collection';
    if (!name?.trim()) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newFolder: Folder = { id, name: name.trim() };
    setFolders(prev => {
      const updated = [...prev, newFolder];
      saveNotebook(blocks, links, updated);
      return updated;
    });
  };

  const addBlock = (folderId: string | null = null, status: Block['status'] = 'organized') => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      title: 'Untitled Idea',
      content: '',
      status,
      folderId,
      createdAt: Date.now()
    };
    setBlocks(prev => {
      const updated = [...prev, newBlock];
      saveNotebook(updated, links, folders);
      return updated;
    });
    setSelectedBlockId(newBlock.id);
  };

  const submitQuickCapture = () => {
    const text = quickCapture.trim();
    if (!text) return;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = lines[0].slice(0, 120);
    const content = lines.length > 1 ? lines.slice(1).join('\n') : (lines[0].length > 120 ? lines[0] : '');
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      title: title || 'New idea',
      content,
      status: 'inbox',
      folderId: null,
      createdAt: Date.now(),
    };
    setBlocks((prev) => {
      const updated = [...prev, newBlock];
      saveNotebook(updated, links, folders);
      return updated;
    });
    setQuickCapture('');
    setSelectedBlockId(newBlock.id);
    toast.success('Idea saved to Inbox');
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

  const archiveBlock = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlocks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, status: 'history' as const, folderId: null } : b);
      saveNotebook(updated, links, folders);
      return updated;
    });
    toast.success('Idea archived to History');
  };

  const handleIdeaImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl) setIdeaReferenceImages((prev) => [...prev, dataUrl].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
    if (ideaImageInputRef.current) ideaImageInputRef.current.value = '';
    if (!isIdeaGeneratorExpanded) setIsIdeaGeneratorExpanded(true);
  };

  const generateIdeas = async () => {
    if ((!aiPrompt.trim() && ideaReferenceImages.length === 0) || isAiLoading) return;
    setIsAiLoading(true);

    try {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }

      let ideas: any[] = [];
      const visionMode: IdeasFromImagesMode =
        ideaMode === 'visual' || ideaReferenceImages.length > 0
          ? ideaMode === 'postcard'
            ? 'postcard'
            : ideaMode === 'quick'
              ? 'quick'
              : 'visual'
          : ideaMode;

      if (ideaReferenceImages.length > 0) {
        const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
        const extraContext =
          selectedBlock?.type === 'text'
            ? selectedBlock.content
            : selectedBlock?.type === 'image'
              ? 'Related to attached reference image idea'
              : undefined;
        ideas = await generateIdeasFromImages(
          aiPrompt.trim() || 'Suggest strong content ideas based on these images',
          ideaReferenceImages,
          activeBusiness,
          visionMode,
          extraContext
        );
      } else if (ideaMode === 'quick') {
        const selectedBlock = blocks.find(b => b.id === selectedBlockId);
        const extraContext = selectedBlock?.type === 'text' ? selectedBlock.content : undefined;
        const generatedIdeas = await generateTaskIdeas(activeBusiness, undefined, undefined, `USER PROMPT: ${aiPrompt}`, extraContext);
        ideas = generatedIdeas;
      } else {
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
        }

        const text = await generateTextWithCascade(prompt, true, activeBusiness.id);
        ideas = safeParseJSONArray(text) || [];
      }

      if (ideas && Array.isArray(ideas) && ideas.length > 0) {
        const refImageBlocks: Block[] = ideaReferenceImages.map((url) => ({
          id: Math.random().toString(36).substr(2, 9),
          type: 'image' as const,
          title: 'Reference image',
          content: url,
          status: 'inbox' as const,
          folderId: null,
          createdAt: Date.now(),
        }));

        const newBlocks: Block[] = await Promise.all(ideas.map(async (idea: any) => {
          const id = Math.random().toString(36).substr(2, 9);
          
          if (ideaMode === 'strategy' || ideaMode === 'quick') {
            return {
              id,
              type: 'text' as const,
              title: idea.title,
              content: idea.caption || idea.description,
              status: 'inbox' as const,
              folderId: null,
              createdAt: Date.now(),
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
              createdAt: Date.now(),
              postcardData: {
                frontText: idea.front,
                backText: idea.back,
                imageUrl: imageResult.url
              }
            };
          }
          return {
            id,
            type: 'text' as const,
            title: idea.title,
            content: idea.description || idea.caption,
            status: 'inbox' as const,
            folderId: null,
            createdAt: Date.now(),
            metadata: {
              feasibility: idea.feasibility,
              impact: idea.impact,
              brief: idea.brief,
              caption: idea.caption,
              hashtags: idea.hashtags,
              format: idea.format
            }
          };
        }));

        setBlocks((prev) => {
          const updated = [...prev, ...refImageBlocks, ...newBlocks];
          saveNotebook(updated, links, folders);
          return updated;
        });
        setAiPrompt('');
        setIdeaReferenceImages([]);
        toast.success(
          `Added ${ideas.length} idea${ideas.length === 1 ? '' : 's'}${refImageBlocks.length ? ' with reference images' : ''} to Inbox`
        );
      }
    } catch (error) {
      console.error('Idea generation error:', error);
      toast.error('Could not generate ideas. Check AI settings and try again.');
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
      const data = safeParseJSON(text) || {};

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

  const inboxCount = blocks.filter((b) => b.status === 'inbox').length;
  const activeCount = blocks.filter((b) => b.status === 'organized').length;

  const matchesSearch = (b: Block) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.title || '').toLowerCase().includes(q) ||
      (b.content || '').toLowerCase().includes(q) ||
      (b.metadata?.caption || '').toLowerCase().includes(q)
    );
  };

  const matchesCollection = (b: Block) => {
    if (collectionFilter === 'all') return true;
    if (collectionFilter === 'none') return !b.folderId;
    return b.folderId === collectionFilter;
  };

  const filterIdea = (b: Block) => matchesSearch(b) && matchesCollection(b);

  const inboxIdeas = useMemo(
    () => blocks.filter((b) => b.status === 'inbox' && filterIdea(b)),
    [blocks, searchQuery, collectionFilter]
  );
  const activeIdeas = useMemo(
    () => blocks.filter((b) => b.status === 'organized' && filterIdea(b)),
    [blocks, searchQuery, collectionFilter]
  );
  const archiveIdeas = useMemo(
    () => blocks.filter((b) => b.status === 'history' && filterIdea(b)),
    [blocks, searchQuery, collectionFilter]
  );

  const renderIdeaList = (items: Block[], emptyLabel: string) => {
    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] p-6 text-center text-xs text-[#757681]">
          {emptyLabel}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((block) => (
          <IdeaCard
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            onSelect={() => setSelectedBlockId(block.id)}
            onArchive={(e) => {
              e.stopPropagation();
              archiveBlock(block.id);
            }}
            onDelete={(e) => {
              e.stopPropagation();
              deleteBlock(block.id);
            }}
            folderName={block.folderId ? folders.find((f) => f.id === block.folderId)?.name : undefined}
          />
        ))}
      </div>
    );
  };

  const detailPanel = selectedBlock ? (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#151515] border-l border-[#E9E9E7] dark:border-[#2E2E2E]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] shrink-0">
        <button
          type="button"
          onClick={() => setSelectedBlockId(null)}
          className="flex items-center gap-2 text-xs font-bold text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back
        </button>
        <div className="flex items-center gap-1">
          {selectedBlock.status === 'inbox' && (
            <button
              type="button"
              onClick={() => updateBlock(selectedBlock.id, { status: 'organized' })}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-brand text-white rounded-md"
            >
              Mark ready
            </button>
          )}
          <button type="button" onClick={() => archiveBlock(selectedBlock.id)} className="p-2 text-[#757681] hover:text-amber-500" title="Archive">
            <Archive className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => deleteBlock(selectedBlock.id)} className="p-2 text-[#757681] hover:text-red-500" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setSelectedBlockId(null)} className="p-2 text-[#757681] md:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="w-full flex flex-col gap-4">
          {selectedBlock.status === 'inbox' && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Inbox — not scheduled yet</p>
          )}
          {selectedBlock.folderId && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#757681]">
              <FolderIcon className="w-3.5 h-3.5 text-blue-400" />
              {folders.find((f) => f.id === selectedBlock.folderId)?.name}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {selectedBlock.type !== 'postcard' && (
              <button
                type="button"
                onClick={() => generatePostcard(selectedBlock)}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 rounded-md text-xs font-bold disabled:opacity-50"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Visual concept
              </button>
            )}
            <button
              type="button"
              onClick={() => expandWithAi(selectedBlock)}
              disabled={isAiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg text-brand rounded-md text-xs font-bold disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Expand with AI
            </button>
          </div>
          {selectedBlock.metadata && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
              {selectedBlock.metadata.feasibility != null && (
                <div className="flex-1 min-w-[120px]">
                  <span className="text-[10px] font-bold uppercase text-[#757681]">Feasibility {selectedBlock.metadata.feasibility}/10</span>
                  <div className="h-1.5 mt-1 bg-[#E9E9E7] dark:bg-[#2E2E2E] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(selectedBlock.metadata.feasibility || 0) * 10}%` }} />
                  </div>
                </div>
              )}
              {selectedBlock.metadata.impact != null && (
                <div className="flex-1 min-w-[120px]">
                  <span className="text-[10px] font-bold uppercase text-[#757681]">Impact {selectedBlock.metadata.impact}/10</span>
                  <div className="h-1.5 mt-1 bg-[#E9E9E7] dark:bg-[#2E2E2E] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(selectedBlock.metadata.impact || 0) * 10}%` }} />
                  </div>
                </div>
              )}
              {selectedBlock.metadata.format && (
                <span className="text-[10px] font-black uppercase px-2 py-1 bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#1A1A1A] rounded-md">
                  {selectedBlock.metadata.format}
                </span>
              )}
            </div>
          )}
          {selectedBlock.type === 'image' && selectedBlock.content ? (
            <div className="rounded-2xl overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
              <img
                src={selectedBlock.content}
                alt={selectedBlock.title || 'Reference'}
                className="w-full max-h-[min(50vh,420px)] object-contain"
              />
            </div>
          ) : null}
          <textarea
            value={selectedBlock.title || ''}
            onChange={(e) => updateBlock(selectedBlock.id, { title: e.target.value })}
            placeholder="Idea title"
            rows={1}
            className="text-2xl md:text-3xl font-bold bg-transparent resize-none focus:outline-none w-full break-words"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          {selectedBlock.type === 'postcard' && selectedBlock.postcardData ? (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E]">
                <img src={selectedBlock.postcardData.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                  <h3 className="text-2xl font-black text-white uppercase">{selectedBlock.postcardData.frontText}</h3>
                </div>
              </div>
              <p className="text-sm italic text-[#757681]">"{selectedBlock.postcardData.backText}"</p>
            </div>
          ) : (
            <>
              {selectedBlock.metadata?.brief && (
                <div className="p-4 rounded-xl border border-brand/10 bg-brand/5">
                  <h4 className="text-[10px] font-bold uppercase text-brand mb-2">Visual brief</h4>
                  <p className="text-sm">{selectedBlock.metadata.brief}</p>
                </div>
              )}
              <textarea
                value={selectedBlock.content || ''}
                onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                placeholder="Notes, caption draft, or angle..."
                className="w-full min-h-[160px] text-sm leading-relaxed bg-[#F7F7F5] dark:bg-[#202020] rounded-xl p-4 border border-[#E9E9E7] dark:border-[#2E2E2E] resize-none focus:outline-none focus:border-brand break-words"
              />
              {selectedBlock.metadata?.hashtags && (
                <p className="text-xs text-brand font-medium">{selectedBlock.metadata.hashtags}</p>
              )}
            </>
          )}
          {onAddToCalendar && (
            <button
              type="button"
              onClick={() => onAddToCalendar(selectedBlock)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-brand text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
            >
              <CalendarPlus className="w-4 h-4" />
              Add to calendar
            </button>
          )}
          {!isMobile && (
            <p className="text-[10px] text-[#757681] flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              Drag this idea to the calendar to turn it into a scheduled post.
            </p>
          )}
          {childBlocks.length > 0 && (
            <div className="pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <h4 className="text-xs font-bold text-[#757681] mb-3">Related ideas</h4>
              <div className="grid gap-2">
                {childBlocks.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedBlockId(child.id)}
                    className="text-left p-3 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand/40 transition-colors"
                  >
                    <p className="font-bold text-sm break-words line-clamp-2">{child.title}</p>
                    <p className="text-xs text-[#757681] line-clamp-2">{child.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <TabPageShell className="relative">
      <TabPageHeader
        icon={Lightbulb}
        iconBgClassName="bg-amber-500/10"
        iconClassName="text-amber-500"
        title="Ideas"
        subtitle={
          isMobile
            ? 'Capture, organize, and ship content — open an idea to add it to the calendar.'
            : 'Capture, organize, and ship content — drag to calendar when ready.'
        }
        actions={
          <>
            <TabHeaderBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {inboxCount} inbox
            </TabHeaderBadge>
            <TabHeaderBadge className="bg-brand/10 text-brand">{activeCount} ready</TabHeaderBadge>
          </>
        }
      >
        <div className="w-full flex gap-2">
          <input
            value={quickCapture}
            onChange={(e) => setQuickCapture(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitQuickCapture();
              }
            }}
            placeholder="Quick capture — type an idea and press Enter"
            className="flex-1 px-4 py-3 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#202020] text-sm focus:outline-none focus:border-brand shadow-sm"
          />
          <button
            type="button"
            onClick={submitQuickCapture}
            disabled={!quickCapture.trim()}
            className="px-4 py-3 bg-brand text-white rounded-xl text-sm font-bold disabled:opacity-40 shrink-0"
          >
            Add
          </button>
        </div>

        <div className="mt-3 w-full flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-[#EFEFED] dark:bg-[#2E2E2E] rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                viewMode === 'board' ? 'bg-white dark:bg-[#1A1A1A] shadow-sm' : 'text-[#757681]'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                viewMode === 'list' ? 'bg-white dark:bg-[#1A1A1A] shadow-sm' : 'text-[#757681]'
              )}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
          <div className="flex-1 min-w-[160px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757681]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#202020] text-xs focus:outline-none focus:border-brand"
            />
          </div>
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value as string | 'all')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#202020]"
          >
            <option value="all">All collections</option>
            <option value="none">Uncategorized</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <button type="button" onClick={addFolder} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] hover:bg-white dark:hover:bg-[#202020]">
            + Collection
          </button>
          <button
            type="button"
            onClick={() => setIsIdeaGeneratorExpanded(!isIdeaGeneratorExpanded)}
            className={cn(
              'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold',
              isIdeaGeneratorExpanded ? 'bg-brand text-white' : 'bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E]'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI brainstorm
          </button>
        </div>

        <AnimatePresence>
          {isIdeaGeneratorExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden w-full"
            >
              <div className="mt-3 p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#202020]">
                <input
                  ref={ideaImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleIdeaImageUpload}
                />
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => ideaImageInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-brand/40 text-brand text-xs font-bold hover:bg-brand/5"
                  >
                    <Upload className="w-4 h-4" />
                    Upload images
                  </button>
                  <span className="text-[10px] text-[#757681]">
                    Local AI uses vision when Gemini/Groq is configured; otherwise drafts from your prompt + brand.
                  </span>
                </div>
                {ideaReferenceImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ideaReferenceImages.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt="Reference"
                          className="w-16 h-16 rounded-lg object-cover border border-[#E9E9E7] dark:border-[#2E2E2E]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setIdeaReferenceImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#37352F] text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want (e.g. product features, campaign angles, mood board) — optional if images are attached"
                  className="w-full h-20 text-sm rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] p-3 resize-none focus:outline-none focus:border-brand"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(['quick', 'strategy', 'visual', 'postcard'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setIdeaMode(mode)}
                      className={cn(
                        'px-3 py-1 rounded-md text-[10px] font-bold uppercase',
                        ideaMode === mode ? 'bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#1A1A1A]' : 'text-[#757681]'
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={generateIdeas}
                    disabled={isAiLoading || (!aiPrompt.trim() && ideaReferenceImages.length === 0)}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold disabled:opacity-40"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </TabPageHeader>

      <div
        className={cn(
          'flex-1 overflow-hidden relative pb-20 md:pb-0 min-h-0',
          selectedBlockId ? 'flex flex-row' : 'flex flex-col'
        )}
      >
        {!isReady && (
          <div className="absolute inset-0 z-40 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-sm flex items-center justify-center">
            <ForgeWorkspaceLoader stage="ideas" size={44} />
          </div>
        )}

        <div
          className={cn(
            'flex flex-col min-h-0 overflow-hidden',
            selectedBlockId ? 'md:w-[min(42%,720px)] md:max-w-[720px] md:shrink-0' : 'flex-1 min-w-0'
          )}
        >
          <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full min-w-0">
            {viewMode === 'board' ? (
              <div
                className={cn(
                  'gap-4 min-h-[240px] h-full',
                  selectedBlockId
                    ? 'grid grid-cols-3 w-full'
                    : 'grid grid-cols-1 md:grid-cols-3 w-full'
                )}
              >
                {(
                  [
                    {
                      title: 'Inbox',
                      subtitle: 'Capture & AI drafts',
                      items: inboxIdeas,
                      empty: 'Nothing in inbox — use quick capture above',
                      onAdd: () => addBlock(null, 'inbox'),
                    },
                    {
                      title: 'Ready',
                      subtitle: isMobile ? 'Open an idea to add to calendar' : 'Drag to calendar to schedule',
                      items: activeIdeas,
                      empty: 'No ready ideas yet',
                      onAdd: () => addBlock(null, 'organized'),
                    },
                    {
                      title: 'Archive',
                      subtitle: 'Older ideas',
                      items: archiveIdeas,
                      empty: 'No archived ideas',
                      onAdd: undefined as (() => void) | undefined,
                    },
                  ] as const
                ).map((col) => (
                  <div
                    key={col.title}
                    className="flex flex-col rounded-2xl glass-card min-h-[240px] max-h-[calc(100vh-280px)] overflow-hidden min-w-0 w-full"
                  >
                    <div className="px-4 py-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between shrink-0 sticky top-0 z-10 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-sm">
                      <div>
                        <h3 className="text-sm font-black text-[#37352F] dark:text-[#EBE9ED]">{col.title}</h3>
                        <p className="text-[10px] text-secondary-safe">{col.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#757681] tabular-nums">{col.items.length}</span>
                        {col.onAdd && (
                          <button
                            type="button"
                            onClick={col.onAdd}
                            className="p-1 rounded-lg hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] text-[#757681]"
                            title={`Add to ${col.title}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">{renderIdeaList(col.items, col.empty)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8 w-full">
                {[
                  { title: 'Inbox', items: inboxIdeas },
                  { title: 'Ready', items: activeIdeas },
                  { title: 'Archive', items: archiveIdeas },
                ].map((section) => (
                  <section key={section.title}>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#757681] mb-3 flex items-center justify-between">
                      {section.title}
                      <span className="text-[10px] font-bold tabular-nums">{section.items.length}</span>
                    </h3>
                    {renderIdeaList(section.items, `No ideas in ${section.title.toLowerCase()}`)}
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedBlockId && (
          <>
            <div className="hidden md:flex flex-1 min-w-[280px] min-h-0 overflow-hidden">
              {detailPanel}
            </div>
            <div className="md:hidden fixed inset-0 z-[60]">{detailPanel}</div>
          </>
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
                <div className="w-12 h-12 border-4 border-brand-border border-t-[#2665fd] rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED]">AI is thinking...</h3>
                <p className="text-sm text-[#757681]">Structuring your creative concepts</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </TabPageShell>
  );
}
