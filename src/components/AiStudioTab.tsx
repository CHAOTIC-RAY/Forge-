import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { ForgeLoader } from './ForgeLoader';
import { 
  Terminal, Sparkles, Send, Play, Code, Layout, Save, 
  Trash2, Copy, Check, ChevronRight, MessageSquare,
  Wand2, Maximize2, Minimize2, Globe, Cpu
} from 'lucide-react';
import { generateAppletCode, ChatMessage } from '../lib/gemini';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Business } from '../data';

interface AiStudioTabProps {
  activeBusiness?: Business | null;
  userId?: string;
}

export function AiStudioTab({ activeBusiness, userId }: AiStudioTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [fullScreen, setFullScreen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update Iframe content
  useEffect(() => {
    if (iframeRef.current && generatedCode) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        // Inject context into window
        const contextStr = JSON.stringify(activeBusiness || {});
        // Try to inject right after <head> or at start
        let finalCode = generatedCode;
        if (finalCode.includes('<head>')) {
          finalCode = finalCode.replace(
            '<head>',
            `<head><script>window.FORGE_CONTEXT = ${contextStr};</script>`
          );
        } else {
          finalCode = `<script>window.FORGE_CONTEXT = ${contextStr};</script>` + finalCode;
        }
        
        doc.write(finalCode);
        doc.close();
      }
    }
  }, [generatedCode, activeBusiness]);

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

  const clearStudio = () => {
    if (confirm("Clear current session? This cannot be undone.")) {
      setMessages([]);
      setGeneratedCode('');
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
      "flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-[#F8F9FA] dark:bg-[#0F0F0F] overflow-hidden rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]",
      fullScreen && "fixed inset-0 z-[100] h-screen rounded-none"
    )}>
      {/* Sidebar: Chat & Controls */}
      <div className="w-full lg:w-[400px] flex flex-col border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#161616] relative z-10 transition-all duration-300">
        <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-white dark:bg-[#161616] sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">AI Studio</h2>
              <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">Low-Code Sandbox</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={clearStudio}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-[#757681] hover:text-red-500 rounded-lg transition-colors"
              title="Clear Session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
              <div className="p-4 bg-indigo-500/5 rounded-full ring-1 ring-indigo-500/20">
                <Cpu className="w-10 h-10 text-indigo-400 opacity-50" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">Welcome to AI Studio</h3>
                <p className="text-xs text-[#757681] mt-2 max-w-[240px]">
                  Describe the mini-app you want to build. I'll code it live in the sandbox.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full">
                {initialPrompts.map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => { setInput(p.prompt); }}
                    className="p-3 text-left border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl hover:bg-[#F7F7F5] dark:hover:bg-[#202020] transition-colors group"
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
                  "flex flex-col gap-1 max-w-[90%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-[#F7F7F5] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-tl-none border border-[#E9E9E7] dark:border-[#3E3E3E]"
                )}>
                  {msg.content}
                </div>
              </motion.div>
            ))
          )}
          {isGenerating && (
            <div className="flex items-start gap-2">
              <div className="px-4 py-2.5 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-2xl rounded-tl-none border border-[#E9E9E7] dark:border-[#3E3E3E]">
                <ForgeLoader size={16} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#161616]">
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
              placeholder="Describe your applet..."
              className="w-full bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl px-4 py-3 pr-12 text-sm focus:border-indigo-500 outline-none resize-none transition-all max-h-[200px] min-h-[48px] text-[#37352F] dark:text-[#EBE9ED] placeholder:text-[#9B9A97]"
              rows={Math.min(input.split('\n').length || 1, 5)}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center h-8 w-8"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-[#757681] mt-3 text-center">
            Describe UI or logic and I'll generate the code instantly.
          </p>
        </div>
      </div>

      {/* Main Panel: Sandbox / Code */}
      <div className="flex-1 flex flex-col relative bg-[#F1F3F5] dark:bg-[#0A0A0A]">
        {/* Toolbar */}
        <div className="h-14 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#161616] flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-1 bg-[#F7F7F5] dark:bg-[#202020] p-1 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'preview' 
                  ? "bg-white dark:bg-[#2E2E2E] text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-[#757681] hover:text-[#37352F]"
              )}
            >
              <Layout className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'code' 
                  ? "bg-white dark:bg-[#2E2E2E] text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-[#757681] hover:text-[#37352F]"
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
                className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] text-[#757681] rounded-lg transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
                title="Copy Code"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => setFullScreen(!fullScreen)}
              className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] text-[#757681] rounded-lg transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
              title="Toggle Fullscreen"
            >
              {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {viewMode === 'preview' ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-white dark:bg-black"
              >
                {!generatedCode ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-[#111111]">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-4">
                      <Terminal className="w-8 h-8 text-indigo-500 opacity-30" />
                    </div>
                    <h3 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">Empty Sandbox</h3>
                    <p className="text-sm text-[#757681] max-w-sm mt-2">
                      Start a conversation on the left to generate your first mini-app.
                    </p>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    title="AI Studio Sandbox"
                    className="w-full h-full border-none shadow-premium bg-white"
                    sandbox="allow-scripts allow-forms allow-popups allow-modals"
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-[#1E1E1E] flex flex-col"
              >
                <div className="flex-1 overflow-auto p-6 font-mono text-sm text-[#D4D4D4] leading-relaxed select-text">
                  <pre className="whitespace-pre-wrap">{generatedCode}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
