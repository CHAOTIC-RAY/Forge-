import React, { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MessageSquare, Send, X, Minimize2, Maximize2, Sparkles, Paperclip, Trash2, Check, Copy, Edit3 } from 'lucide-react';
import { Post } from '../data';
import { cn } from '../lib/utils';
import { chatWithAi } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedItem?: any;
  suggestedPost?: Partial<Post>;
}

interface FloatingChatProps {
  posts: Post[];
  onUpdatePost: (post: Post) => void;
  onCreatePost: (post: Post, date?: string) => void;
  onPreviewPost?: (post: Partial<Post>) => void;
  droppedItem: any;
  onClearDroppedItem: () => void;
  isFullPage?: boolean;
  onClose?: () => void;
}

export function FloatingChat({ posts, onUpdatePost, onCreatePost, onPreviewPost, droppedItem, onClearDroppedItem, isFullPage, onClose }: FloatingChatProps) {
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

  const handleSend = async () => {
    if (!input.trim() && !attachedItem) return;

    const currentAttached = attachedItem;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachedItem: currentAttached
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setAttachedItem(null); // Clear attachment after sending

    try {
      let contextStr = "";
      
      if (currentAttached) {
        if (currentAttached.type === 'post') {
          contextStr = `Existing Post Data: ${JSON.stringify(currentAttached.post)}`;
        } else if (currentAttached.type === 'product') {
          contextStr = `Product Data: ${JSON.stringify(currentAttached.product)}`;
        } else if (currentAttached.type === 'idea') {
          contextStr = `Idea Data: ${JSON.stringify(currentAttached.idea)}`;
        }
      }

      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: 'user', content: input });

      const response = await chatWithAi(chatHistory, contextStr);
      
      if (response.suggestedPost && response.suggestedPost.title) {
        const suggestedPost: Partial<Post> = {
          title: response.suggestedPost.title,
          brief: response.suggestedPost.brief,
          caption: response.suggestedPost.caption,
          hashtags: response.suggestedPost.hashtags,
          type: response.suggestedPost.type || (currentAttached?.type === 'post' ? currentAttached.post.type : '🔴 General'),
          outlet: response.suggestedPost.outlet || (currentAttached?.type === 'post' ? currentAttached.post.outlet : 'Rainbow Enterprises'),
        };

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message || `I've prepared a draft for you. You can see the details below.`,
          suggestedPost: suggestedPost,
          attachedItem: currentAttached
        };
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

  const applySuggestion = (suggestion: Partial<Post>, originalItem: any) => {
    if (originalItem?.type === 'post') {
      onUpdatePost({ ...originalItem.post, ...suggestion } as Post);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '✅ Changes applied to the existing post!' }]);
    } else {
      // Create new post
      const newPost: Post = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0], // Default to today
        images: originalItem?.type === 'product' && originalItem.product.link ? [originalItem.product.link] : [],
        ...suggestion
      } as Post;
      onCreatePost(newPost);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '✅ New post created and added to today!' }]);
    }
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
                {!isFullPage && (
                  <button 
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                )}
                {!isFullPage && (
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/20 dark:hover:bg-black/20 rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors"
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
                    "relative p-4 rounded-2xl text-sm shadow-sm transition-all",
                    msg.role === 'user' 
                      ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-tr-none" 
                      : "bg-white dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-tl-none border border-[#E9E9E7] dark:border-[#2E2E2E]"
                  )}>
                    {msg.content}
                    
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
              {attachedItem && (
                <div className="mb-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
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
              <div className="relative flex items-center gap-2">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask Forge anything..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#2E2E2E] rounded-2xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none h-12 max-h-32 text-[#37352F] dark:text-[#EBE9ED]"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() && !attachedItem}
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
              setIsOpen(true);
              setIsMinimized(false);
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
