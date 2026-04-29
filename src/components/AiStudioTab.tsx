import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { ForgeLoader } from './ForgeLoader';
import { 
  Terminal, Sparkles, Send, Play, Code, Layout, Save, 
  Trash2, Copy, Check, ChevronRight, MessageSquare,
  Wand2, Maximize2, Minimize2, Globe, Cpu, ArrowLeft
} from 'lucide-react';
import { generateAppletCode, ChatMessage } from '../lib/gemini';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Business } from '../data';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface AiStudioTabProps {
  activeBusiness?: Business | null;
  userId?: string;
  onBack?: () => void;
}

export function AiStudioTab({ activeBusiness, userId, onBack }: AiStudioTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [displayedCode, setDisplayedCode] = useState<string>('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [fullScreen, setFullScreen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle messages from the Sandbox (iframe)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only process messages that originate from our own application (or are well-formed)
      if (!event.data || event.data.source !== 'forge_applet') return;

      const { action, payload, requestId } = event.data;

      const respond = (success: boolean, data?: any, error?: string) => {
        const iframe = document.querySelector('iframe[title="AI Studio Sandbox"]') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            source: 'forge_host',
            requestId,
            success,
            data,
            error
          }, '*');
        }
      };

      try {
        switch (action) {
          case 'savePost':
            // E.g. Saving a new post to the active business
            if (!activeBusiness?.id) throw new Error("No active business");
            if (!payload || !payload.title) throw new Error("Invalid post data");
            const newPost = {
              id: uuidv4(),
              status: 'draft',
              approvalStatus: 'draft',
              isAiGenerated: true,
              createdAt: new Date().toISOString(),
              ...payload
            };
            const postRef = doc(db, 'posts', newPost.id);
            await setDoc(postRef, {
               ...newPost,
               outlet: activeBusiness.name
            });
            respond(true, newPost);
            toast.success("Sandbox saved a post!");
            break;

          case 'getBusiness':
            respond(true, activeBusiness);
            break;

          case 'notify':
            if (payload?.message) {
              toast(payload.message);
            }
            respond(true);
            break;
            
          case 'saveData':
            // General purpose data saving for Applets
            if (!activeBusiness?.id) throw new Error("No active business");
            if (!payload || !payload.key || !payload.data) throw new Error("Missing key or data");
            const businessRef = doc(db, 'businesses', activeBusiness.id);
            // We can save to appletData map
            await updateDoc(businessRef, {
              [`appletData.${payload.key}`]: payload.data
            });
            respond(true, { key: payload.key });
            toast.success("Sandbox saved data!");
            break;

          default:
            respond(false, null, "Unknown action");
        }
      } catch (err: any) {
        console.error("Sandbox API error:", err);
        respond(false, null, err.message || "Internal error");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeBusiness]);

  const INJECTED_SDK = `
    window.ForgeAPI = {
      invoke: function(action, payload) {
        return new Promise((resolve, reject) => {
          const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
          
          const listener = (event) => {
            if (event.data && event.data.source === 'forge_host' && event.data.requestId === requestId) {
              window.removeEventListener('message', listener);
              if (event.data.success) {
                resolve(event.data.data);
              } else {
                reject(new Error(event.data.error || 'Unknown error'));
              }
            }
          };
          window.addEventListener('message', listener);
          
          window.parent.postMessage({
            source: 'forge_applet',
            requestId,
            action,
            payload
          }, '*');
        });
      },
      savePost: function(postData) { return this.invoke('savePost', postData); },
      getBusiness: function() { return this.invoke('getBusiness'); },
      saveData: function(key, data) { return this.invoke('saveData', { key, data }); },
      notify: function(message) { return this.invoke('notify', { message }); }
    };
    window.FORGE_CONTEXT = \${JSON.stringify(activeBusiness || {})};
  `;

  // Strip markdown code blocks if present
  const stripMarkdown = (code: string) => {
    return code
      .replace(/```html/g, '')
      .replace(/```javascript/g, '')
      .replace(/```css/g, '')
      .replace(/```/g, '')
      .trim();
  };

  // Simulate typing effect
  const typeCode = (fullCode: string) => {
    setIsTyping(true);
    setDisplayedCode('');
    let index = 0;
    const cleanCode = stripMarkdown(fullCode);
    
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    
    // Typing speed: faster for larger codebases
    const speed = cleanCode.length > 2000 ? 5 : 10;
    const chunkSize = cleanCode.length > 2000 ? 15 : 8;

    typingIntervalRef.current = setInterval(() => {
      index += chunkSize;
      if (index >= cleanCode.length) {
        setDisplayedCode(cleanCode);
        setIsTyping(false);
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      } else {
        setDisplayedCode(cleanCode.substring(0, index));
      }
    }, speed);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await generateAppletCode(newMessages, activeBusiness);
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
      if (response.code) {
        setGeneratedCode(response.code);
        typeCode(response.code);
        toast.success("Applet updated!");
      }
    } catch (error) {
      console.error("Studio error:", error);
      toast.error("Failed to generate code.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };

  const handleDeploy = async () => {
    if (!generatedCode || !activeBusiness?.id) {
      toast.error("No code to deploy or business not selected.");
      return;
    }
    const name = prompt("Name your new Applet:");
    if (!name) return;

    try {
      const newApplet = {
        id: uuidv4(),
        name,
        code: generatedCode,
        createdAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        applets: arrayUnion(newApplet)
      });
      toast.success(`${name} deployed to your workspace!`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to deploy applet.");
    }
  };

  const clearStudio = () => {
    if (confirm("Clear current session? This cannot be undone.")) {
      setMessages([]);
      setGeneratedCode('');
      setDisplayedCode('');
      setInput('');
    }
  };

  const initialPrompts = [
    { title: 'ROI Calculator', prompt: 'Build a premium ROI calculator for a marketing agency with charts.' },
    { title: 'Product Showcase', prompt: 'Create an interactive 3D-feeling product showcase using the FORGE_CONTEXT data.' },
    { title: 'Task Dashboard', prompt: 'Build a sleek task management dashboard for small businesses.' },
    { title: 'SEO Analyzer', prompt: 'Create a tool that simulates an SEO on-page analyzer with a cool UI.' }
  ];

  return (
    <div className={cn(
      "flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-[#F8F9FA] dark:bg-[#000000] overflow-hidden rounded-xl border border-[#E9E9E7] dark:border-[#222222]",
      fullScreen && "fixed inset-0 z-[100] h-screen rounded-none"
    )}>
      {/* Sidebar: Chat & Controls */}
      <div className="w-full lg:w-[380px] flex flex-col border-r border-[#E9E9E7] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] relative z-10">
        <div className="p-4 border-b border-[#E9E9E7] dark:border-[#222222] flex items-center justify-between bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] text-[#757681] rounded-lg transition-colors border border-[#E9E9E7] dark:border-[#222222]"
                title="Back to Modules"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">AI Studio</h2>
                <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">Low-Code Sandbox</p>
              </div>
            </div>
          </div>
          <button 
            onClick={clearStudio}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-[#757681] hover:text-red-500 rounded-lg transition-colors"
            title="Clear Session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide pb-24">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 opacity-60">
              <div className="p-4 bg-indigo-500/5 rounded-full ring-1 ring-indigo-500/20">
                <Cpu className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">AI Builder</h3>
                <p className="text-xs text-[#757681] mt-2 max-w-[240px]">
                  Describe an applet and watch it build itself in real-time.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full">
                {initialPrompts.map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => { setInput(p.prompt); }}
                    className="p-3 text-left border border-[#E9E9E7] dark:border-[#222222] rounded-xl hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-all hover:border-indigo-500/50 group"
                  >
                    <div className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center justify-between">
                      {p.title}
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={cn(
                  "flex flex-col gap-1 max-w-[92%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-md" 
                    : "bg-[#F7F7F5] dark:bg-[#1A1A1A] text-[#37352F] dark:text-[#EBE9ED] rounded-tl-none border border-[#E9E9E7] dark:border-[#2E2E2E]"
                )}>
                  {msg.content}
                </div>
              </motion.div>
            ))
          )}
          {(isGenerating || isTyping) && (
            <div className="flex items-start gap-2">
              <div className="px-4 py-2.5 bg-[#F7F7F5] dark:bg-[#1A1A1A] rounded-2xl rounded-tl-none border border-[#E9E9E7] dark:border-[#2E2E2E]">
                <div className="flex items-center gap-2">
                  <ForgeLoader size={14} />
                  <span className="text-[10px] font-bold text-indigo-500 animate-pulse">
                    {isGenerating ? "GENERATING..." : "BUILDING..."}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Prompt Bar at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-lg border-t border-[#E9E9E7] dark:border-[#222222] z-20">
          <form 
            onSubmit={handleSendMessage}
            className="relative flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Message AI Builder..."
              className="w-full bg-[#F7F7F5] dark:bg-[#141414] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl px-4 py-3 pr-12 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none resize-none transition-all max-h-[200px] min-h-[52px] text-[#37352F] dark:text-[#EBE9ED] shadow-inner"
              rows={Math.min(input.split('\n').length || 1, 4)}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="absolute right-2.5 bottom-2.5 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center h-9 w-9 shadow-lg shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Main Panel: Sandbox / Code */}
      <div className="flex-1 flex flex-col relative bg-[#F1F3F5] dark:bg-[#000000]">
        {/* Toolbar */}
        <div className="h-14 border-b border-[#E9E9E7] dark:border-[#222222] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-1 bg-[#F7F7F5] dark:bg-[#1A1A1A] p-1 rounded-xl border border-[#E9E9E7] dark:border-[#222222]">
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all",
                viewMode === 'preview' 
                  ? "bg-white dark:bg-[#2E2E2E] text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              <Layout className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all",
                viewMode === 'code' 
                  ? "bg-white dark:bg-[#2E2E2E] text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              <Code className="w-3.5 h-3.5" />
              Source
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'code' && (
              <button 
                onClick={copyCode}
                className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] text-[#757681] rounded-lg transition-colors border border-[#E9E9E7] dark:border-[#222222]"
                title="Copy Code"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleDeploy}
              disabled={!generatedCode}
              className="px-4 py-2 flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 transition-all border border-white/10 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              Deploy to Workspace
            </button>
            <button 
              onClick={() => setFullScreen(!fullScreen)}
              className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] text-[#757681] rounded-lg transition-colors border border-[#E9E9E7] dark:border-[#222222]"
              title="Toggle Fullscreen"
            >
              {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {viewMode === 'preview' ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-white dark:bg-[#000000]"
              >
                {(!displayedCode && !isGenerating) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-[#000000]">
                    <div className="w-20 h-20 bg-indigo-500/5 rounded-[32px] flex items-center justify-center mb-6 ring-1 ring-indigo-500/10">
                      <Wand2 className="w-10 h-10 text-indigo-500 opacity-20" />
                    </div>
                    <h3 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">Awaiting Instructions</h3>
                    <p className="text-sm text-[#757681] max-w-sm mt-3 leading-relaxed">
                      Send a message to start building. The preview will update live as the AI writes the code.
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full relative group">
                    <iframe
                      key={isTyping ? "typing" : "stable"} // Force re-render periodically or handle carefully
                      title="AI Studio Sandbox"
                      className="w-full h-full border-none shadow-premium bg-white"
                      sandbox="allow-scripts allow-forms allow-popups allow-modals"
                      srcDoc={displayedCode ? (
                        displayedCode.includes('<head>')
                          ? displayedCode.replace('<head>', `<head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><script>{INJECTED_SDK}</script>`.replace("{INJECTED_SDK}", INJECTED_SDK))
                          : `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><script>{INJECTED_SDK}</script></head><body>{displayedCode}</body></html>`.replace("{INJECTED_SDK}", INJECTED_SDK).replace("{displayedCode}", displayedCode)
                      ) : ''}
                    />
                    {isTyping && (
                      <div className="absolute bottom-6 right-6 px-4 py-2 bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-black rounded-full shadow-2xl animate-bounce tracking-widest border border-white/20">
                        BUILDING LIVE...
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-[#0D0D0D] flex flex-col"
              >
                <div className="flex-1 overflow-auto p-8 font-mono text-sm text-indigo-300/90 leading-relaxed select-text selection:bg-indigo-500/30">
                  <pre className="whitespace-pre-wrap">{displayedCode}</pre>
                  {isTyping && <span className="inline-block w-2 h-5 bg-indigo-500 ml-1 animate-pulse align-middle" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
