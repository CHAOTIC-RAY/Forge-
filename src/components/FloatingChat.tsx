import React, { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MessageSquare, Send, X, Minimize2, Maximize2, Sparkles, Paperclip, Trash2, Check, Copy, Edit3, AlertCircle } from 'lucide-react';
import { Post } from '../data';
import { cn } from '../lib/utils';
import { chatWithAi } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedItem?: any;
  suggestedPost?: Partial<Post>;
  suggestedPosts?: Partial<Post>[];
  action?: 'delete' | 'update' | 'create';
  images?: string[];
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
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hi! I can help you create or edit tasks. Drag a task, product, or idea here to get started, or just type your request.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [attachedItem, setAttachedItem] = useState<any>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      attachedItem: currentAttached,
      images: currentImages.length > 0 ? currentImages : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setAttachedItem(null); // Clear attachment after sending
    setAttachedImages([]); // Clear images after sending

    try {
      let contextStr = "";
      
      const workspaceContext = {
        business: activeBusiness ? {
          name: activeBusiness.name,
          industry: activeBusiness.industry,
          position: activeBusiness.position
        } : null,
        scheduleSummary: posts.length > 0 
          ? posts.slice(0, 50).map(p => `- [${p.date}] ${p.title} (${p.outlet}): ${p.type}`).join('\n')
          : "No posts scheduled yet.",
        brandKit: brandKit ? {
          colors: brandKit.colors?.map((c: any) => `${c.name}: ${c.hex}`).join(', '),
          fonts: brandKit.fonts,
          hasLogos: (brandKit.logos?.length || 0) > 0,
          designGuideExcerpt: brandKit.designGuide?.substring(0, 500) + '...'
        } : "Not configured",
        productsSummary: products && products.length > 0
          ? `${products.length} products available. Top categories: ${Array.from(new Set(products.map(p => p.type))).slice(0, 5).join(', ')}`
          : "No products in database"
      };

      contextStr = `WORKSPACE CONTEXT:\n${JSON.stringify(workspaceContext, null, 2)}\n\n`;

      if (currentAttached) {
        if (currentAttached.type === 'post') {
          contextStr = `Existing Post Data: ${JSON.stringify(currentAttached.post)}`;
        } else if (currentAttached.type === 'product') {
          contextStr = `Product Data: ${JSON.stringify(currentAttached.product)}`;
        } else if (currentAttached.type === 'idea') {
          contextStr = `Idea Data: ${JSON.stringify(currentAttached.idea)}`;
        }
      }

      const chatHistory = messages.map(m => ({ role: m.role, content: m.content, images: m.images }));
      chatHistory.push({ role: 'user', content: input, images: currentImages.length > 0 ? currentImages : undefined });

      const response = await chatWithAi(chatHistory, contextStr);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message || `I've prepared some drafts for you.`,
        attachedItem: currentAttached,
        action: response.action
      };

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

      if (assistantMessage.suggestedPost || assistantMessage.suggestedPosts) {
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response.message || "I couldn't generate a valid post from that. Could you be more specific?" }]);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error.message || 'Sorry, I encountered an error processing your request.';
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: errorMessage.includes('JSON') ? 'Sorry, I had trouble formatting the response. Please try again.' : errorMessage 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteAction = (originalItem: any) => {
    if (originalItem?.type === 'post' && onDeletePost) {
      onDeletePost(originalItem.post.id);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '🗑️ Post has been deleted.' }]);
      onClearDroppedItem();
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '⚠️ I can only delete posts that are currently attached to the chat.' }]);
    }
  };

  const applySuggestion = (suggestion: Partial<Post>, originalItem: any) => {
    if (originalItem?.type === 'post') {
      onUpdatePost({ ...originalItem.post, ...suggestion } as Post);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '✅ Changes applied to the existing post!' }]);
    } else {
      // Create new post
      const newPost: Post = {
        id: Math.random().toString(36).substr(2, 9),
        date: suggestion.date || new Date().toISOString().split('T')[0], // Use suggestion date if available
        images: originalItem?.type === 'product' && originalItem.product.link ? [originalItem.product.link] : [],
        ...suggestion
      } as Post;
      onCreatePost(newPost);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `✅ New post created and added to ${newPost.date}!` }]);
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
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `✅ ${suggestions.length} new posts created and added to the calendar!` }]);
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
            initial={isFullPage ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={isFullPage ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-white dark:bg-[#191919]  border border-[#E9E9E7] dark:border-[#2E2E2E] flex flex-col overflow-hidden pointer-events-auto transition-all duration-300",
              isFullPage ? "w-full h-full rounded-none border-none" : "hidden md:flex w-80 md:w-96 h-[500px] rounded-[16px]",
              isContainerOver && "ring-2 ring-green-500"
            )}
          >
            {/* Header */}
            <div className={cn(
              "relative p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between overflow-hidden",
              isFullPage ? "pt-12 sm:pt-4" : "bg-white dark:bg-[#202020]"
            )}>
              {/* AI Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-blue-600/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-blue-500/20 animate-gradient-x" />
              
              <div className="relative flex items-center gap-3">
                {isFullPage && (
                  <button 
                    onClick={onClose}
                    className="hidden md:block p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors mr-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#191919] rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED] text-sm flex items-center gap-1.5">
                    Forge AI Assistant
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">v2.0</span>
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] text-[#757681] dark:text-[#9B9A97] font-medium">Always active & learning</p>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center gap-1">
                <button 
                  onClick={() => setMessages([{ id: '1', role: 'assistant', content: 'Chat cleared. How can I help you?' }])}
                  className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {!isFullPage && onFullScreen && (
                  <button 
                    onClick={onFullScreen}
                    className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
                    title="Full Screen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
                {!isFullPage && (
                  <button 
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
                    title="Minimize"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth relative"
            >
              {/* Subtle AI Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "relative flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "relative p-4 rounded-2xl text-sm shadow-sm transition-all group/message",
                    msg.role === 'user' 
                      ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-tr-none" 
                      : "bg-white dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-tl-none border border-[#E9E9E7] dark:border-[#2E2E2E]"
                  )}>
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-[#2E2E2E] rounded-md opacity-0 group-hover/message:opacity-100 transition-opacity shadow-sm border border-[#E9E9E7] dark:border-[#3E3E3E] text-[#757681] hover:text-indigo-600"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {msg.images.map((img, idx) => (
                          <img key={idx} src={img} alt="Attached" className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                        ))}
                      </div>
                    )}

                    {msg.role === 'assistant' ? (
                      <div className="markdown-body prose dark:prose-invert max-w-none text-sm">
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
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
                      className="mt-3 w-full bg-white dark:bg-[#202020] rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/10 group/card"
                    >
                      <div className="p-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-slate-50 dark:bg-[#1A1A1A] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#757681] dark:text-[#9B9A97]">AI Draft</span>
                        </div>
                        <Edit3 className="w-3 h-3 text-indigo-500 group-hover/card:scale-110 transition-transform" />
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight">{msg.suggestedPost.title}</p>
                        <p className="text-[11px] text-[#757681] dark:text-[#9B9A97] line-clamp-3 leading-relaxed">{msg.suggestedPost.caption}</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            applySuggestion(msg.suggestedPost!, msg.attachedItem);
                          }}
                          className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                          <Check className="w-3 h-3" />
                          Apply Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.suggestedPosts && msg.suggestedPosts.length > 0 && (
                    <div className="mt-3 w-full space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#757681] dark:text-[#9B9A97]">Suggested Batch ({msg.suggestedPosts.length})</span>
                        <button 
                          onClick={() => applyBatchSuggestions(msg.suggestedPosts!)}
                          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Approve All
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {msg.suggestedPosts.map((post, idx) => (
                          <div 
                            key={idx}
                            onClick={() => onPreviewPost?.(post)}
                            className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] p-3 cursor-pointer hover:border-indigo-500/30 transition-all group/item"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded uppercase">{post.date}</span>
                              <span className="text-[9px] font-medium text-[#757681] dark:text-[#9B9A97]">{post.type}</span>
                            </div>
                            <p className="text-[11px] font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">{post.title}</p>
                            <p className="text-[10px] text-[#757681] dark:text-[#9B9A97] line-clamp-1 mt-0.5">{post.caption}</p>
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

            {/* Input */}
            <div className="p-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]">
              {(attachedItem || attachedImages.length > 0) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedItem && (
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 w-full">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3 h-3 text-indigo-500" />
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate max-w-[200px]">
                          {attachedItem.type === 'post' ? attachedItem.post.title : 
                           attachedItem.type === 'product' ? attachedItem.product.title : 
                           attachedItem.idea.title}
                        </span>
                      </div>
                      <button 
                        onClick={() => setAttachedItem(null)}
                        className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-indigo-500" />
                      </button>
                    </div>
                  )}
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group animate-in slide-in-from-bottom-2 duration-300">
                      <img src={img} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E]" />
                      <button
                        onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative flex items-center gap-2">
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
                  className="p-2.5 text-[#757681] hover:text-indigo-600 dark:text-[#9B9A97] hover:bg-slate-50 dark:hover:bg-[#2E2E2E] rounded-xl transition-colors shrink-0"
                  title="Attach images"
                >
                  <Paperclip className="w-4 h-4" />
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
                  placeholder={isTyping ? "Forge is thinking..." : "Ask Forge anything..."}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#2E2E2E] rounded-2xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none h-12 max-h-32 text-[#37352F] dark:text-[#EBE9ED] disabled:opacity-50"
                />
                <button 
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachedItem && attachedImages.length === 0) || isTyping}
                  className="absolute right-1.5 bottom-1.5 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
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
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group relative overflow-hidden shadow-xl",
              isButtonOver 
                ? "bg-green-500 scale-110" 
                : "bg-gradient-to-br from-indigo-600 to-blue-600 hover:shadow-indigo-500/25",
              isOpen && !isMinimized ? "rotate-90 rounded-full" : "hover:scale-105"
            )}
          >
            {/* Animated Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            {isOpen && !isMinimized ? (
              <X className="w-6 h-6 text-white relative z-10" />
            ) : (
              <div className="relative z-10">
                <Sparkles className="w-6 h-6 text-white animate-pulse" />
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
