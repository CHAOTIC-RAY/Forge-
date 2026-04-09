import React, { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MessageSquare, Send, X, Minimize2, Maximize2, Sparkles, Paperclip, Trash2, Check, Copy, Edit3 } from 'lucide-react';
import { Post } from '../data';
import { cn } from '../lib/utils';
import { generatePostContent } from '../lib/gemini';
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
  droppedItem: any;
  onClearDroppedItem: () => void;
  isFullPage?: boolean;
  onClose?: () => void;
}

export function FloatingChat({ posts, onUpdatePost, onCreatePost, droppedItem, onClearDroppedItem, isFullPage, onClose }: FloatingChatProps) {
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
      let prompt = input;
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

      const fullPrompt = `
        Context: ${contextStr}
        User Request: ${input || 'Generate/Improve this post content.'}
        
        Please provide a title, brief, caption, and hashtags.
      `;

      const response = await generatePostContent(fullPrompt);
      
      if (response.title) {
        const suggestedPost: Partial<Post> = {
          title: response.title,
          brief: response.brief,
          caption: response.caption,
          hashtags: response.hashtags,
          type: response.type || (currentAttached?.type === 'post' ? currentAttached.post.type : '🔴 General'),
          outlet: response.outlet || (currentAttached?.type === 'post' ? currentAttached.post.outlet : 'Rainbow Enterprises'),
        };

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've prepared a draft for you. You can see the details below.`,
          suggestedPost: suggestedPost,
          attachedItem: currentAttached
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "I couldn't generate a valid post from that. Could you be more specific?" }]);
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
        ? "inset-0 bg-white dark:bg-[#191919] p-0 pointer-events-auto" 
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
              "bg-white dark:bg-[#191919] shadow-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] flex flex-col overflow-hidden pointer-events-auto transition-all duration-300",
              isFullPage ? "w-full h-full rounded-none border-none" : "hidden md:flex w-80 md:w-96 h-[500px] rounded-2xl",
              isContainerOver && "ring-2 ring-green-500"
            )}
          >
            {/* Header */}
            <div className={cn(
              "p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F7F7F5] dark:bg-[#202020]",
              isFullPage && "pt-12 sm:pt-4" // Extra padding for mobile status bar if full page
            )}>
              <div className="flex items-center gap-2">
                {isFullPage && (
                  <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-lg text-[#787774] dark:text-[#9B9A97] transition-colors mr-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED] text-sm">Forge AI Assistant</h3>
                  <p className="text-[10px] text-[#787774] dark:text-[#9B9A97]">Always active</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isFullPage && (
                  <button 
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-lg text-[#787774] dark:text-[#9B9A97] transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                )}
                {!isFullPage && (
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-lg text-[#787774] dark:text-[#9B9A97] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-blue-500 text-white rounded-tr-none" 
                      : "bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-tl-none border border-[#E9E9E7] dark:border-[#2E2E2E]"
                  )}>
                    {msg.content}
                    
                    {msg.attachedItem && (
                      <div className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded-lg border border-white/20 dark:border-white/5 flex items-center gap-2 text-xs">
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
                    <div className="mt-2 w-full bg-[#F7F7F5] dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden shadow-md">
                      <div className="p-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">Suggested Draft</span>
                        <Edit3 className="w-3 h-3 text-blue-500" />
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">{msg.suggestedPost.title}</p>
                        <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] line-clamp-3">{msg.suggestedPost.caption}</p>
                        <button 
                          onClick={() => applySuggestion(msg.suggestedPost!, msg.attachedItem)}
                          className="w-full mt-2 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
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
                <div className="flex items-center gap-2 text-[#787774] dark:text-[#9B9A97]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-xs italic">AI is thinking...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
              {attachedItem && (
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[180px]">
                      {attachedItem.type === 'post' ? attachedItem.post.title : 
                       attachedItem.type === 'product' ? attachedItem.product.title : 
                       attachedItem.idea.title}
                    </span>
                  </div>
                  <button 
                    onClick={() => setAttachedItem(null)}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded text-blue-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="relative">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-12 max-h-32 text-[#37352F] dark:text-[#EBE9ED]"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() && !attachedItem}
                  className="absolute right-2 bottom-2 p-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white rounded-lg transition-all"
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
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 group relative overflow-hidden",
              isButtonOver ? "scale-125 bg-green-500" : "bg-blue-500 hover:bg-blue-600",
              isOpen && !isMinimized ? "rotate-90" : ""
            )}
          >
            {isOpen && !isMinimized ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <MessageSquare className="w-6 h-6 text-white" />
            )}
            
            {/* Pulse effect when item is over */}
            {isOver && (
              <div className="absolute inset-0 bg-white/20 animate-ping rounded-full"></div>
            )}
            
            {/* Tooltip */}
            {!isOpen && (
              <div className="absolute right-full mr-4 px-3 py-1.5 bg-[#37352F] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                AI Chat Assistant
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
