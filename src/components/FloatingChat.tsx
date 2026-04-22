import React, { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MessageSquare, Send, X, Minimize2, Maximize2, Sparkles, Paperclip, Trash2, Check, Copy, Edit3, AlertCircle, Globe, Plus, Settings, History, Zap, Brain, Shield } from 'lucide-react';
import { Post } from '../data';
import { cn } from '../lib/utils';
import { chatWithAi, GEMINI_MODELS, GROQ_MODELS, PUTER_MODELS, LOCAL_MODELS, getAiSettings, setAiSettings } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachedItem?: any;
  suggestedPost?: Partial<Post>;
  suggestedPosts?: Partial<Post>[];
  action?: 'delete' | 'update' | 'create';
  images?: string[];
  provider?: string;
}

interface FloatingChatProps {
  posts: Post[];
  activeBusiness?: any;
  brandKit?: any;
  products?: any[];
  onUpdatePost: (post: Post) => void;
  onCreatePost: (post: Post, date?: string) => void;
  onDeletePost?: (postId: string) => void;
  onPreviewPost?: (post: Partial<Post>) => void;
  droppedItem: any;
  onClearDroppedItem: () => void;
  isFullPage?: boolean;
  onClose?: () => void;
  onFullScreen?: () => void;
}

function ModelCategory({ title, models, provider, currentModel, currentProvider, onSelect }: any) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-[10px] font-black text-slate-400 px-3 py-2 uppercase tracking-widest bg-black/5 dark:bg-white/5 mb-1 rounded-lg">
        {title}
      </p>
      <div className="space-y-0.5">
        {models.map((m: any) => (
          <button 
            key={m.id}
            onClick={() => onSelect(m.id, provider === 'builtin' && m.id === 'webllm-local' ? 'webllm' : provider)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-xl text-[12px] transition-colors flex items-center justify-between group",
              (currentProvider === provider && currentModel === m.id) || (provider === 'builtin' && m.id === 'webllm-local' && currentModel === 'webllm-local')
                ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold" 
                : "hover:bg-black/5 dark:hover:bg-white/5 text-[#444746] dark:text-[#E3E3E3]"
            )}
          >
            <span className="truncate">{m.name}</span>
            {m.id.includes('flash') || m.id.includes('instant') ? (
               <Zap className="w-3 h-3 text-orange-400 opacity-60 group-hover:opacity-100" />
            ) : m.id.includes('pro') || m.id.includes('sonnet') ? (
               <Sparkles className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FloatingChat({ 
  posts, 
  activeBusiness, 
  brandKit,
  products,
  onUpdatePost, 
  onCreatePost, 
  onDeletePost, 
  onPreviewPost, 
  droppedItem, 
  onClearDroppedItem, 
  isFullPage, 
  onClose, 
  onFullScreen 
}: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-open if full page, and close if leaving full page on mobile
  useEffect(() => {
    if (isFullPage) {
      setIsOpen(true);
      setIsMinimized(false);
    } else if (window.innerWidth < 768) {
      // If we are on mobile and leaving the full page chat, just close it
      setIsOpen(false);
    }
  }, [isFullPage]);
  const [input, setInput] = useState('');
  const [activeStrategy, setActiveStrategy] = useState<'General' | 'Viral' | 'Sales' | 'Educational'>('General');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [attachedItem, setAttachedItem] = useState<any>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [aiSettings, setAiSettingsState] = useState(getAiSettings());
  const [showModelSelector, setShowModelSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and Filter History (Auto-delete older than 1 month)
  useEffect(() => {
    const savedHeaders = localStorage.getItem('forge_chat_history');
    if (savedHeaders) {
      try {
        const parsed = JSON.parse(savedHeaders) as Message[];
        const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filtered = parsed.filter(m => m.timestamp > oneMonthAgo);
        
        if (filtered.length > 0) {
          setMessages(filtered);
        } else {
          setMessages([{ 
            id: '1', 
            role: 'assistant', 
            content: 'Hi! I can help you create or edit tasks. My **Social Media Strategy Library** is active and ready to help you grow. Drag anything here or type a request.',
            timestamp: Date.now()
          }]);
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    } else {
      setMessages([{ 
        id: '1', 
        role: 'assistant', 
        content: 'Hi! I can help you create or edit tasks. My **Social Media Strategy Library** is active and ready to help you grow. Drag anything here or type a request.',
        timestamp: Date.now()
      }]);
    }
  }, []);

  // Save History
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('forge_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { setNodeRef: setButtonRef, isOver: isButtonOver } = useDroppable({
    id: 'floating-chat-button',
    data: { type: 'chat-drop-zone' }
  });

  const { setNodeRef: setContainerRef, isOver: isContainerOver } = useDroppable({
    id: 'floating-chat-container',
    data: { type: 'chat-drop-zone' }
  });

  const isOver = isButtonOver || isContainerOver;

  // Handle dropped items from parent
  useEffect(() => {
    if (droppedItem) {
      setAttachedItem(droppedItem);
      setIsOpen(true);
      setIsMinimized(false);
      onClearDroppedItem();
      
      const itemType = droppedItem.type;
      let itemName = '';
      if (itemType === 'post') itemName = droppedItem.post.title;
      else if (itemType === 'product') itemName = droppedItem.product.title;
      else if (itemType === 'idea') itemName = droppedItem.idea.title;

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I see you've attached "${itemName}". What would you like me to do with it? (e.g., "Improve the caption", "Change the outlet", "Make it more professional")`
      }]);
    }
  }, [droppedItem, onClearDroppedItem]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedItem && attachedImages.length === 0) return;

    const currentAttached = attachedItem;
    const currentImages = [...attachedImages];
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachedItem: currentAttached,
      images: currentImages.length > 0 ? currentImages : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setAttachedItem(null); // Clear attachment after sending
    setAttachedImages([]); // Clear images after sending

    try {
      // --- HYBRID INTELLIGENCE: Local RAG (Phase 1) ---
      let contextStr = "";
      
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content, images: m.images }));
      chatHistory.push({ role: 'user', content: input, images: currentImages.length > 0 ? currentImages : undefined });

      try {
        // Build the local index
        const { getDatabase, syncDatabase, searchChunks } = await import('../lib/rag');
        
        let chunks = getDatabase();
        if (chunks.length === 0) {
           // Fallback or Initial sync if missed
           chunks = syncDatabase(activeBusiness, products || [], posts || [], brandKit);
        }
        
        // Form a search query from the last few messages to gather context
        const recentContext = chatHistory.slice(-3).map(m => m.content).join(" ");
        const relevantChunks = searchChunks(recentContext, chunks, 5); // get top 5 chunks
        
        if (relevantChunks.length > 0) {
           contextStr = "RELEVANT WORKSPACE KNOWLEDGE (Retrieved from local database):\n" + 
             relevantChunks.map((c, i) => `[Source: ${c.source}]\n${c.content}`).join("\n\n") + "\n\n";
        } else {
           contextStr = "WORKSPACE CONTEXT: No specific relevant info found. Answer generally.\n\n";
        }
      } catch (e) {
        console.warn("RAG retrieval failed, falling back to basic context", e);
      }

      if (currentAttached) {
        contextStr += `\n\n[CRITICAL_FOCUS]: `;
        if (currentAttached.type === 'post') {
          contextStr += `Target Post: ${JSON.stringify(currentAttached.post)}`;
        } else if (currentAttached.type === 'product') {
          contextStr += `Product Data: ${JSON.stringify(currentAttached.product)}`;
        } else if (currentAttached.type === 'idea') {
          contextStr += `Idea Data: ${JSON.stringify(currentAttached.idea)}`;
        }
        contextStr += `\nEND FOCUS.\n\n`;
      }

      const contextPrefix = activeStrategy !== 'General' 
        ? `[USER SELECTED STRATEGY: ${activeStrategy}]\nPrioritize responses using ${activeStrategy} tactics.\n\n`
        : '';

      let finalResponse = await chatWithAi(chatHistory, contextPrefix + contextStr);
      
      // TOOL INTERCEPTOR LOOP
      if (finalResponse.tool_call && finalResponse.provider !== 'Local AI') {
         setMessages(prev => [...prev, { id: 'tool-' + Date.now().toString(), role: 'assistant', content: `*[Thinking: Calling ${finalResponse.tool_call?.name}...]*` }]);
         
         let toolResult = "";
         if (finalResponse.tool_call.name === 'search_web') {
           toolResult = `Mock search results for "${finalResponse.tool_call.query}":\nThis is a mocked result since actual live internet access is disconnected in this UI test framework. You can tell the user you've found what they need.`;
         } else if (finalResponse.tool_call.name === 'read_url') {
           toolResult = `Mock page content for ${finalResponse.tool_call.url}:\n[Mock HTML content...]`;
         } else {
           toolResult = `Tool ${finalResponse.tool_call.name} not found or supported.`;
         }
         
         // Update context string with tool result
         contextStr += `\n\nTOOL RESULT (${finalResponse.tool_call.name}):\n${toolResult}\n\nNow, answer the user.`;
         
         // Re-run the generation
         finalResponse = await chatWithAi(chatHistory, contextStr);
         
         // Remove the thinking message
         setMessages(prev => prev.filter(m => !m.id.startsWith('tool-')));
      }
      
      const response = finalResponse;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message || `I've prepared some drafts for you.`,
        timestamp: Date.now(),
        attachedItem: currentAttached,
        action: response.action,
        provider: response.provider,
      };
      
      if (response.generatedImage) {
        assistantMessage.images = [response.generatedImage];
      }

      if (response.suggestedPosts && response.suggestedPosts.length > 0) {
        assistantMessage.suggestedPosts = response.suggestedPosts.map(p => ({
          ...p,
          type: p.type || (currentAttached?.type === 'post' ? currentAttached.post.type : '🔴 General'),
          outlet: p.outlet || (currentAttached?.type === 'post' ? currentAttached.post.outlet : 'Rainbow Enterprises'),
        }));
      } else if (response.suggestedPost && response.suggestedPost.title) {
        assistantMessage.suggestedPost = {
          ...response.suggestedPost,
          type: response.suggestedPost.type || (currentAttached?.type === 'post' ? currentAttached.post.type : '🔴 General'),
          outlet: response.suggestedPost.outlet || (currentAttached?.type === 'post' ? currentAttached.post.outlet : 'Rainbow Enterprises'),
        };
      }

      if (assistantMessage.suggestedPost || assistantMessage.suggestedPosts || assistantMessage.images) {
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response.message || "I couldn't generate a valid post from that. Could you be more specific?", provider: response.provider, timestamp: Date.now() }]);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error.message || 'Sorry, I encountered an error processing your request.';
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: errorMessage.includes('JSON') ? 'Sorry, I had trouble formatting the response. Please try again.' : errorMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteAction = (originalItem: any) => {
    if (originalItem?.type === 'post' && onDeletePost) {
      onDeletePost(originalItem.post.id);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '🗑️ Post has been deleted.', timestamp: Date.now() }]);
      onClearDroppedItem();
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '⚠️ I can only delete posts that are currently attached to the chat.', timestamp: Date.now() }]);
    }
  };

  const applySuggestion = (suggestion: Partial<Post>, originalItem: any) => {
    if (originalItem?.type === 'post') {
      onUpdatePost({ ...originalItem.post, ...suggestion } as Post);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '✅ Changes applied to the existing post!', timestamp: Date.now() }]);
    } else {
      // Create new post
      const newPost: Post = {
        id: Math.random().toString(36).substr(2, 9),
        date: suggestion.date || new Date().toISOString().split('T')[0], // Use suggestion date if available
        images: originalItem?.type === 'product' && originalItem.product.link ? [originalItem.product.link] : [],
        ...suggestion
      } as Post;
      onCreatePost(newPost);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `✅ New post created and added to ${newPost.date}!`, timestamp: Date.now() }]);
    }
  };

  const applyBatchSuggestions = (suggestions: Partial<Post>[]) => {
    suggestions.forEach(suggestion => {
      const newPost: Post = {
        id: Math.random().toString(36).substr(2, 9),
        date: suggestion.date || new Date().toISOString().split('T')[0],
        images: [],
        ...suggestion
      } as Post;
      onCreatePost(newPost);
    });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `✅ ${suggestions.length} new posts created and added to the calendar!`, timestamp: Date.now() }]);
  };

  const suggestionPills = [
    "Write a viral caption for a New Arrival post",
    "Analyze my recent product analytics",
    "Generate a sales campaign for kitchenware",
    "Create 3 educational carousels about interior design",
    "Suggest hashtags for a minimalist sofa post"
  ];

  const changeModel = (modelId: string, provider: 'gemini' | 'groq' | 'puter' | 'builtin' | 'webllm') => {
    let updated = { ...aiSettings, preferredProvider: provider === 'webllm' ? 'auto' : provider };
    
    if (provider === 'gemini') updated.geminiModel = modelId;
    if (provider === 'groq') updated.groqModel = modelId;
    if (provider === 'puter') updated.puterTextModel = modelId;
    if (provider === 'builtin') updated.builtinModelId = modelId;
    if (provider === 'webllm') {
      updated.geminiModel = 'webllm-local';
      updated.preferredProvider = 'auto'; // Fallback logic usually handles this
    }

    setAiSettingsState(updated);
    setAiSettings(updated);
    setShowModelSelector(false);
  };

  return (
    <div className={cn(
      "fixed z-50 flex flex-col items-end gap-4 transition-all duration-300",
      isFullPage 
        ? "inset-0 bottom-[64px] md:bottom-0 bg-white dark:bg-[#191919] p-0 pointer-events-auto" 
        : "bottom-6 right-6 pointer-events-none"
    )}>
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div 
            ref={setContainerRef}
            initial={isFullPage ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            animate={isFullPage ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isFullPage ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex overflow-hidden pointer-events-auto relative",
              isFullPage 
                ? "flex-row w-full h-full rounded-none bg-[#FAFAFA] dark:bg-[#131314] border-none inset-0 absolute transition-opacity" 
                : "flex-col hidden md:flex w-[400px] md:w-[440px] h-[640px] rounded-[24px] bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-[0_8px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.4)] transition-all duration-300",
              isContainerOver && "ring-2 ring-indigo-500"
            )}
          >
            {/* Sidebar (Full page only) */}
            {isFullPage && (
              <div className="hidden lg:flex flex-col w-[260px] bg-[#F0F4F9] dark:bg-[#1E1F20] shrink-0 p-4 border-r border-[#E9E9E7] dark:border-[#333] relative z-10">
                 <div className="flex items-center gap-3 mb-8 mt-2 px-2">
                    <button 
                      onClick={onClose}
                      className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[#444746] dark:text-[#E3E3E3] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                        <Zap className="w-4 h-4 fill-current" />
                      </div>
                      <span className="text-[#444746] dark:text-[#E3E3E3] text-[18px] font-medium tracking-wide">Forge AI</span>
                    </div>
                 </div>

                 <button 
                   onClick={() => setMessages([{ id: '1', role: 'assistant', content: 'Chat cleared. How can I help you? My Social Media Strategy Library is active and ready to help you grow.', timestamp: Date.now() }])}
                   className="flex items-center gap-3 bg-[#D3E3FD] dark:bg-[#1A1A1C] hover:bg-[#B4D0FC] dark:hover:bg-[#333] border dark:border-[#333] border-transparent rounded-[16px] py-3 px-4 text-[#041E49] dark:text-[#E3E3E3] font-medium text-sm w-fit transition-colors mb-6 shadow-sm"
                 >
                    <Plus className="w-4 h-4" />
                    New chat
                 </button>

                 <div className="flex-1 overflow-y-auto w-full space-y-1">
                   <div className="flex items-center gap-2 px-4 mb-2 mt-4 text-[12px] font-medium text-[#444746] dark:text-[#8E8E8E]">
                     <History className="w-3.5 h-3.5" />
                     Recent
                   </div>
                   {messages.filter(m => m.role === 'user').slice(-5).reverse().map((msg, i) => (
                     <button 
                       key={i}
                       onClick={() => setInput(msg.content)}
                       className="w-full text-left px-4 py-2.5 text-[13px] text-[#444746] dark:text-[#E3E3E3] hover:bg-black/5 dark:hover:bg-[#333] rounded-full flex items-center gap-3 truncate transition-colors font-medium group"
                     >
                       <MessageSquare className="w-4 h-4 text-[#444746] dark:text-[#8E8E8E] shrink-0 group-hover:text-indigo-500" />
                       <span className="truncate">{msg.content}</span>
                     </button>
                   ))}
                 </div>

                 <div className="mt-auto p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      <Shield className="w-3 h-3" /> 
                      AUTO-CLEAN ACTIVE
                    </div>
                    <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">History older than 30 days is automatically deleted for privacy.</p>
                 </div>
              </div>
            )}

            {/* Main Chat Column */}
            <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
            {/* AI Glow Effect Background for FullPage */}
            {isFullPage && (
              <>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" />
              </>
            )}

            {/* Header */}
            {isFullPage ? (
              <div className="relative z-30 w-full max-w-4xl mx-auto">
                {/* Desktop Header */}
                <div className="hidden lg:flex p-4 items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-full border border-black/5 dark:border-white/10 shadow-sm cursor-pointer hover:bg-white dark:hover:bg-white/10 transition-all group" onClick={() => setShowModelSelector(!showModelSelector)}>
                      <Brain className="w-4 h-4 text-indigo-500" />
                      <span className="text-[12px] font-semibold text-[#444746] dark:text-[#E3E3E3]">
                        {aiSettings.preferredProvider === 'gemini' ? aiSettings.geminiModel : 
                         aiSettings.preferredProvider === 'groq' ? aiSettings.groqModel : 
                         aiSettings.preferredProvider === 'puter' ? aiSettings.puterTextModel : 
                         aiSettings.preferredProvider === 'builtin' ? 'Built-in AI' : 
                         aiSettings.geminiModel === 'webllm-local' ? 'Local LLM' : aiSettings.geminiModel}
                      </span>
                      <Plus className={cn("w-3 h-3 text-[#444746] dark:text-[#E3E3E3] transition-transform", showModelSelector ? "rotate-45" : "")} />
                    </div>
                    <AnimatePresence>
                      {showModelSelector && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-16 left-4 w-72 bg-white dark:bg-[#1E1F20] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 p-2 z-50 overflow-hidden"
                        >
                          <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                            <ModelCategory title="Google Gemini" models={GEMINI_MODELS} provider="gemini" currentModel={aiSettings.geminiModel} currentProvider={aiSettings.preferredProvider} onSelect={changeModel} />
                            <ModelCategory title="Groq (Cloud)" models={GROQ_MODELS} provider="groq" currentModel={aiSettings.groqModel} currentProvider={aiSettings.preferredProvider} onSelect={changeModel} />
                            <ModelCategory title="Puter (Enterprise)" models={PUTER_MODELS} provider="puter" currentModel={aiSettings.puterTextModel} currentProvider={aiSettings.preferredProvider} onSelect={changeModel} />
                            <ModelCategory title="Local AI" models={LOCAL_MODELS} provider="builtin" currentModel={aiSettings.geminiModel === 'webllm-local' ? 'webllm-local' : aiSettings.builtinModelId} currentProvider={aiSettings.geminiModel === 'webllm-local' ? 'builtin' : aiSettings.preferredProvider} onSelect={changeModel} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-2">
                     <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[#444746] dark:text-[#E3E3E3]">
                       <Settings className="w-5 h-5" />
                     </button>
                  </div>
                </div>

                {/* Mobile/Tablet Header for FullPage */}
                <div className="lg:hidden relative p-4 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl border-b border-[#E9E9E7] dark:border-[#2E2E2E] shadow-sm sticky top-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={onClose}
                      className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-[#757681] dark:text-[#E3E3E3] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full" onClick={() => setShowModelSelector(!showModelSelector)}>
                      <Brain className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[11px] font-bold text-[#444746] dark:text-[#E3E3E3] truncate max-w-[100px]">
                        {aiSettings.preferredProvider === 'gemini' ? aiSettings.geminiModel : 
                         aiSettings.preferredProvider === 'groq' ? aiSettings.groqModel : 
                         aiSettings.preferredProvider === 'puter' ? aiSettings.puterTextModel : 
                         aiSettings.preferredProvider === 'builtin' ? 'Built-in' : 
                         aiSettings.geminiModel === 'webllm-local' ? 'Local' : aiSettings.geminiModel}
                      </span>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-[#757681] dark:text-[#E3E3E3]">
                    <Plus className="w-5 h-5" onClick={() => setMessages([{ id: '1', role: 'assistant', content: 'Chat cleared.', timestamp: Date.now() }])} />
                  </button>
                </div>
              </div>
            ) : (
            <div className="relative p-4 border-b flex items-center justify-between shrink-0 z-20 bg-white/40 dark:bg-black/20 backdrop-blur-md border-[#E9E9E7] dark:border-[#2E2E2E]">
              {/* AI Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-purple-600/5 to-blue-600/5 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-blue-500/10 animate-gradient-x pointer-events-none" />
              
              <div className="relative flex items-center gap-3 w-full">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#191919] rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED] text-sm flex items-center gap-2">
                    Forge AI Assistant
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20 shadow-sm">v2.0</span>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <p className="text-[10px] text-[#757681] dark:text-[#9B9A97] font-medium mr-2">Always active & learning</p>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => setMessages([{ id: '1', role: 'assistant', content: 'Chat cleared. How can I help you?', timestamp: Date.now() }])}
                  className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {onFullScreen && (
                  <button 
                    onClick={onFullScreen}
                    className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
                    title="Full Screen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
                  title="Minimize"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            )}

            {/* Messages Area */}
            <div className={cn("flex flex-1 flex-col overflow-hidden relative", isFullPage ? "w-full z-10" : "")}>
              <div 
                ref={scrollRef}
                className={cn(
                  "flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth relative",
                  isFullPage && "pb-40"
                )}
              >
                {/* Subtle AI Background Pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className={cn(isFullPage ? "max-w-4xl mx-auto w-full flex flex-col space-y-6 pt-4" : "flex flex-col space-y-6")}>
                  {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "relative flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {msg.role === 'assistant' && isFullPage && (
                    <div className="absolute -left-6 top-6 w-3 h-3 bg-indigo-500 rounded-full blur-[8px] opacity-40 animate-pulse" />
                  )}
                  <div className={cn(
                    "relative p-4 rounded-[20px] text-[13px] leading-relaxed shadow-sm transition-all group/message border",
                    msg.role === 'user' 
                      ? "bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#111111] rounded-tr-[4px] border-transparent" 
                      : cn(
                          "bg-white dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-tl-[4px] border-[#E9E9E7] dark:border-[#2E2E2E]",
                          isFullPage && "shadow-[0_4px_24px_rgba(79,70,229,0.04)] dark:shadow-[0_4px_24px_rgba(79,70,229,0.08)]"
                        )
                  )}>
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        className="absolute -right-2 -top-2 p-1.5 bg-white dark:bg-[#333] rounded-full opacity-0 group-hover/message:opacity-100 transition-all shadow-md border border-[#E9E9E7] dark:border-[#444] text-[#757681] hover:text-indigo-600 scale-90 hover:scale-100"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {msg.images.map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt="Attached/Generated" 
                            className={cn(
                              "object-cover rounded-lg border shadow-sm",
                              msg.role === 'assistant' 
                                ? "w-full max-h-64 border-[#E9E9E7] dark:border-[#2E2E2E]" 
                                : "w-16 h-16 border-white/20"
                            )} 
                          />
                        ))}
                      </div>
                    )}

                    {msg.role === 'assistant' ? (
                      <div className="markdown-body prose dark:prose-invert max-w-none text-[13px] leading-relaxed">
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                        </Markdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}</div>
                    )}
                    
                    {msg.attachedItem && (
                      <div className={cn(
                        "mt-3 p-2 rounded-xl border flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider",
                        msg.role === 'user'
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400"
                      )}>
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate">
                          {msg.attachedItem.type === 'post' ? msg.attachedItem.post.title : 
                           msg.attachedItem.type === 'product' ? msg.attachedItem.product.title : 
                           msg.attachedItem.idea.title}
                        </span>
                      </div>
                    )}
                    
                    {msg.role === 'assistant' && msg.provider && (
                      <div className={cn(
                        "mt-3 text-[9px] font-bold uppercase tracking-widest",
                        msg.provider === 'Local AI' 
                          ? "text-emerald-500 flex items-center gap-1.5" 
                          : "text-slate-400 dark:text-slate-500"
                      )}>
                        {msg.provider === 'Local AI' && <Globe className="w-2.5 h-2.5" />}
                        AI: {msg.provider}
                      </div>
                    )}
                  </div>

                  {msg.action === 'delete' && msg.attachedItem && (
                    <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Confirm Deletion</span>
                      </div>
                      <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                        Are you sure you want to delete this post? This action cannot be undone.
                      </p>
                      <button 
                        onClick={() => handleDeleteAction(msg.attachedItem)}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" />
                        Confirm Delete
                      </button>
                    </div>
                  )}

                  {msg.suggestedPost && (
                    <div 
                      onClick={() => onPreviewPost?.(msg.suggestedPost!)}
                      className="mt-3 w-full bg-white dark:bg-[#202020] rounded-[20px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden cursor-pointer hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all group/card flex flex-col"
                    >
                      <div className="px-4 py-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-slate-50/50 dark:bg-[#1A1A1A]/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#757681] dark:text-[#9B9A97]">AI Draft</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white dark:bg-[#333] border border-[#E9E9E7] dark:border-[#444] shadow-sm flex items-center justify-center opacity-0 group-hover/card:opacity-100 scale-75 group-hover/card:scale-100 transition-all">
                          <Edit3 className="w-3 h-3 text-[#37352F] dark:text-[#EBE9ED]" />
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        <h4 className="text-[13px] font-bold text-[#37352F] dark:text-[#EBE9ED] leading-snug">{msg.suggestedPost.title}</h4>
                        <p className="text-[12px] text-[#757681] dark:text-[#9B9A97] line-clamp-3 leading-relaxed whitespace-pre-wrap">{msg.suggestedPost.caption}</p>
                        
                        {(msg.suggestedPost.hashtags || msg.suggestedPost.outlet) && (
                          <div className="flex items-center gap-2 mt-1">
                            {msg.suggestedPost.outlet && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#333] text-[9px] font-bold text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wider">{msg.suggestedPost.outlet}</span>
                            )}
                            {msg.suggestedPost.hashtags && (
                              <span className="text-[10px] text-indigo-500 font-medium truncate">{msg.suggestedPost.hashtags}</span>
                            )}
                          </div>
                        )}
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            applySuggestion(msg.suggestedPost!, msg.attachedItem);
                          }}
                          className="w-full mt-2 py-2.5 bg-[#37352F] hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#111111] text-[11px] font-bold rounded-[12px] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Apply Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.suggestedPosts && msg.suggestedPosts.length > 0 && (
                    <div className="mt-4 w-full space-y-3 bg-white/50 dark:bg-black/10 p-3 rounded-[24px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-indigo-500" /> Suggested Batch ({msg.suggestedPosts.length})</span>
                        <button 
                          onClick={() => applyBatchSuggestions(msg.suggestedPosts!)}
                          className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500 dark:hover:text-white px-2 py-1 rounded border border-indigo-100 dark:border-indigo-500/20 transition-all flex items-center gap-1"
                        >
                          <Check className="w-2.5 h-2.5" />
                          Approve All
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {msg.suggestedPosts.map((post, idx) => (
                          <div 
                            key={idx}
                            onClick={() => onPreviewPost?.(post)}
                            className="bg-white dark:bg-[#202020] rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E] p-4 cursor-pointer hover:border-indigo-500/40 hover:shadow-md transition-all group/item"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-widest">{post.date}</span>
                              <span className="text-[9px] font-bold text-[#757681] dark:text-[#9B9A97] tracking-wider uppercase">{post.type}</span>
                            </div>
                            <p className="text-[12px] font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">{post.title}</p>
                            <p className="text-[11px] text-[#757681] dark:text-[#9B9A97] line-clamp-2 mt-1 leading-relaxed">{post.caption}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest italic">AI is thinking...</span>
                </div>
              )}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className={cn(
              "z-30 transition-all duration-300",
              isFullPage 
                ? "fixed bottom-0 left-0 right-0 p-6 pointer-events-none lg:pl-[260px]" 
                : "p-4 border-t bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-xl border-[#E9E9E7] dark:border-[#2E2E2E] rounded-b-[24px]"
            )}>
              <div className="max-w-3xl mx-auto w-full pointer-events-auto flex flex-col gap-3">
                {/* Suggestion Pills (Moved here) */}
                {messages.length <= 1 && (
                  <div className={cn(
                    "flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500",
                    isFullPage ? "justify-start" : "justify-center"
                   )}>
                    {suggestionPills.map((pill, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(pill)}
                        className="px-4 py-2 bg-white/80 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-full text-[11px] text-[#444746] dark:text-[#E3E3E3] hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold shadow-sm"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                )}

                {/* Strategy Modes Indicator (Moved here) */}
                <div className={cn(
                  "flex flex-wrap gap-2 mb-1 z-10 w-fit",
                  !isFullPage && "mx-auto sticky top-0 p-1 bg-white/50 dark:bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[12px] shadow-sm border border-[#E9E9E7] dark:border-[#2E2E2E]"
                )}>
                  {(['General', 'Viral', 'Sales', 'Educational'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setActiveStrategy(mode)}
                      className={cn(
                        "rounded-[8px] font-bold capitalize transition-all duration-300 text-[11px]",
                        isFullPage ? "px-4 py-2 bg-transparent border dark:border-[#444] border-[#E9E9E7]" : "px-3 py-1.5",
                        activeStrategy === mode 
                          ? (isFullPage ? "bg-[#D3E3FD] dark:bg-indigo-500/20 text-[#041E49] dark:text-indigo-400 border-indigo-500/30 shadow-sm" : "bg-white dark:bg-[#2C2C2C] text-[#37352F] dark:text-[#EBE9ED] shadow-sm border border-[#E9E9E7] dark:border-[#3E3E3E]")
                          : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className={cn(
                  isFullPage && "w-full bg-[#f0f4f9] dark:bg-[#1E1F20] border border-black/5 dark:border-white/5 p-2 rounded-[28px] shadow-sm",
                  !isFullPage && "relative flex flex-col gap-2"
                )}>
                {(attachedItem || attachedImages.length > 0) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {attachedItem && (
                    <div className="px-3 py-2 bg-white dark:bg-[#252525] rounded-xl border border-[#E9E9E7] dark:border-[#333] flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 w-full shadow-sm hover:border-indigo-500/30 transition-colors group">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] truncate max-w-[200px]">
                          {attachedItem.type === 'post' ? attachedItem.post.title : 
                           attachedItem.type === 'product' ? attachedItem.product.title : 
                           attachedItem.idea.title}
                        </span>
                      </div>
                      <button 
                        onClick={() => setAttachedItem(null)}
                        className="p-1 text-[#757681] hover:bg-slate-100 dark:hover:bg-[#333] rounded-lg transition-colors opacity-60 hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group animate-in slide-in-from-bottom-2 duration-300">
                      <img src={img} alt="Preview" className="w-14 h-14 object-cover rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] shadow-sm" />
                      <button
                        onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-[#37352F] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="relative flex items-end gap-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[20px] shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/30 transition-all p-1.5">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 mb-0.5 text-[#757681] dark:text-[#9B9A97] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-[#2E2E2E] rounded-[14px] transition-all shrink-0"
                  title="Attach images"
                >
                  <Paperclip className="w-4.5 h-4.5" />
                </button>
                
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isTyping) handleSend();
                    }
                  }}
                  disabled={isTyping}
                  placeholder={isTyping ? "Forge is thinking..." : isFullPage ? "Ask Forge to generate campaigns, analyze data, or write content..." : "Ask Forge anything..."}
                  className="w-full px-2 py-3.5 bg-transparent text-sm focus:outline-none resize-none min-h-[48px] max-h-[160px] text-[#37352F] dark:text-[#EBE9ED] placeholder-[#A0A0A0] dark:placeholder-[#666] disabled:opacity-50"
                  style={{ height: input ? 'auto' : '48px', overflowY: input.length > 50 ? 'auto' : 'hidden' }}
                />
                
                <button 
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachedItem && attachedImages.length === 0) || isTyping}
                  className={cn(
                    "p-3 mb-0.5 rounded-[14px] transition-all shrink-0 flex items-center justify-center",
                    input.trim() || attachedItem || attachedImages.length > 0
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 active:scale-95"
                      : "bg-[#E9E9E7] dark:bg-[#2E2E2E] text-[#A0A0A0] dark:text-[#666]"
                  )}
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
              
              {isFullPage && (
                <div className="mt-3 text-center">
                  <p className="text-[11px] text-[#A0A0A0] dark:text-[#8E8E8E] font-medium tracking-wide">Forge AI can make mistakes. Verify important info.</p>
                </div>
              )}
            </div>
            </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      {!isFullPage && (
        <div className="relative pointer-events-auto hidden md:block">
          <button 
            ref={setButtonRef}
            onClick={() => {
              if (isOpen && !isMinimized) {
                setIsOpen(false);
              } else {
                setIsOpen(true);
                setIsMinimized(false);
              }
            }}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 group relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/20 dark:border-white/10",
              isButtonOver 
                ? "bg-[#37352F] dark:bg-white scale-110" 
                : "bg-gradient-to-br from-[#111] to-[#333] dark:from-white dark:to-[#E9E9E7] hover:scale-105",
              isOpen && !isMinimized ? "rotate-90 bg-[#F7F7F5] dark:bg-[#333] text-[#757681]" : ""
            )}
          >
            {/* Animated Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            {isOpen && !isMinimized ? (
              <X className="w-5 h-5 text-[#757681] dark:text-white relative z-10" />
            ) : (
              <div className="relative z-10">
                <Sparkles className="w-5 h-5 text-white dark:text-[#111] animate-pulse" />
              </div>
            )}
            
            {/* Pulse effect when item is over */}
            {isOver && (
              <div className="absolute inset-0 bg-white/20 animate-ping rounded-full"></div>
            )}
            
            {/* Tooltip */}
            {!isOpen && (
              <div className="absolute right-full mr-4 px-3 py-1.5 bg-[#1A1A1A] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
                AI Assistant
              </div>
            )}
          </button>
  
          {/* Minimized indicator */}
          {isOpen && isMinimized && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-[#191919] rounded-full animate-pulse"></div>
          )}
        </div>
      )}
    </div>
  );
}
