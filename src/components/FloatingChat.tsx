import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Plus, RefreshCw } from 'lucide-react';
import { generateGenericText } from '../lib/gemini';
import { toast } from 'sonner';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  actions?: any[];
}

export function FloatingChat({
  posts = [],
  activeBusiness,
  brandKit,
  products = [],
  onUpdatePost,
  onCreatePost,
  onDeletePost,
  onPreviewPost
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I am your AI Brand Assistant. I can help you brainstorm content ideas, create new scheduled posts, or draft copy matching your brand voice. Try asking me to create a draft or check my recommendations!",
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async () => {
    if (!inputVal.trim()) return;
    const userMsg = inputVal.trim();
    setInputVal('');
    
    setMessages(prev => [...prev, {
      sender: 'user',
      text: userMsg,
      timestamp: new Date()
    }]);

    setIsTyping(true);

    try {
      const promptContext = `
You are a social media AI assistant for a business named "${activeBusiness?.name || 'Example Business'}".
The industry is "${activeBusiness?.industry || 'General'}".
The brand voice is "${activeBusiness?.brandVoice || brandKit?.brandVoice || 'Professional, bright and modern'}".
Here are some products: ${JSON.stringify(products.slice(0, 5).map((p: any) => p.title))}.

User message: ${userMsg}

Helpful guidelines:
If the user asks to "create", "draft", "make", or "schedule" a post, write a concise post title and caption matching their voice style, and we will offer them a button to inject this into their calendar. Keep the response polite, focused, and under 150 words.
`;

      let responseText = '';
      try {
        responseText = await generateGenericText(promptContext);
      } catch (e) {
        responseText = `I'd love to help you draft that post! Here is a post draft for your active campaign:

**Caption**: Spark change and illuminate your feed with our latest ${products[0]?.title || 'collection'} update! 🌟 Handcrafted with premium design details and engineered for high durability. Ready to elevate your everyday?

*Let me know if you would like me to instantly schedule this post to your workspace!*`;
      }

      const actions: any[] = [];
      const hasCreateIntent = /create|draft|schedule|make/i.test(userMsg);
      if (hasCreateIntent) {
        actions.push({
          label: 'Incorporate as Draft Post',
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => {
            const title = `AI Assisted: ${userMsg.slice(0, 30)}...`;
            onCreatePost?.({
              title,
              caption: responseText.replace(/\*\*Caption\*\*:/i, '').slice(0, 500),
              publishStatus: 'draft',
              date: new Date().toISOString().split('T')[0],
              outlet: 'Digital Store',
              type: 'campaign',
              platforms: ['instagram', 'facebook']
            });
            toast.success('Assisted post draft created!');
          }
        });
      }

      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: responseText,
        timestamp: new Date(),
        actions
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: "I experienced a minor connection disruption. However, feel free to try again or ask me to draft standard promotional posts!",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-45 flex items-center gap-2 bg-[#2665fd] hover:bg-[#2665fd]/95 text-white p-3.5 rounded-full shadow-xl shadow-blue-500/10 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 group"
          title="Open AI Brand Assistant"
          type="button"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out text-xs font-bold whitespace-nowrap">
            AI Assistant
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-45 w-[360px] sm:w-[380px] h-[500px] bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in text-left">
          <div className="p-4 bg-gradient-to-r from-[#2665fd]/10 to-[#2665fd]/5 dark:from-zinc-850 dark:to-zinc-800 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#2665fd] text-white rounded-lg">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">Workspace AI Assistant</h3>
                <p className="text-[9px] text-[#757681]">Offline & Sandbox Friendly Context</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#2665fd] text-white rounded-tr-none'
                      : 'bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 text-gray-850 dark:text-zinc-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200/50 dark:border-zinc-700/50 flex flex-wrap gap-2">
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={act.onClick}
                          className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-white text-[10px] px-2.5 py-1 rounded-lg font-bold transition shadow-sm cursor-pointer"
                          type="button"
                        >
                          {act.icon}
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[8px] text-gray-400 mt-1 uppercase font-semibold">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <RefreshCw size={10} className="animate-spin" />
                <span>AI is writing a suggestion...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-gray-100 dark:border-zinc-805 bg-gray-50/50 dark:bg-zinc-900/60 flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask AI to draft a post..."
              className="flex-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-[#2665fd] hover:bg-[#2665fd]/95 text-white rounded-xl shadow-md shadow-blue-500/5 cursor-pointer disabled:opacity-50 transition"
              disabled={!inputVal.trim()}
              type="button"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
export default FloatingChat;
