import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Sparkles, Palette, BarChart3, ListTodo, LogIn, ChevronDown, CheckCircle2, MessageSquare, Lightbulb, Pause, Square, Database, Image as ImageIcon, Users } from 'lucide-react';
import { ForgeLogo, GlowingScribbleLogo, ScribbleFlame } from './ForgeLogo';
import { cn } from '../lib/utils';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import Spline from '@splinetool/react-spline';

const TypewriterText = ({ text, delay = 0, onComplete, className }: { text: string, delay?: number, onComplete?: () => void, className?: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let currentIndex = 0;
    
    const startTyping = () => {
      timeout = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(timeout);
          if (onComplete) onComplete();
        }
      }, 100); // typing speed
    };

    const initialDelay = setTimeout(startTyping, delay);
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(timeout);
    };
  }, [text, delay]);

  return <span className={className}>{displayedText}</span>;
};

function FeaturePreview({ id }: { id: string }) {
  switch (id) {
    case 'calendar':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-4 flex flex-col gap-2 overflow-hidden relative">
          <div className="flex justify-between items-center mb-2">
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30" />
              <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 flex-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className={cn("rounded-lg border border-gray-100 dark:border-gray-700 p-1.5", i === 12 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : "bg-gray-50 dark:bg-[#202020]")}>
                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-600 mb-1.5" />
                {i % 5 === 0 && <div className="w-full h-2 bg-blue-400 rounded-sm mb-1" />}
                {i % 8 === 0 && <div className="w-full h-2 bg-purple-400 rounded-sm" />}
              </div>
            ))}
          </div>
        </div>
      );
    case 'localdb':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-4 flex flex-col gap-4 overflow-hidden">
          <div className="w-full h-10 bg-gray-100 dark:bg-[#202020] rounded-xl flex items-center px-4 gap-3 border border-gray-200 dark:border-gray-700">
            <Database className="w-4 h-4 text-gray-400" />
            <div className="w-32 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="p-2 space-y-1.5">
                  <div className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  <div className="w-2/3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'ai':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-4 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col gap-3 p-2">
            <div className="self-end bg-blue-500 text-white p-3 rounded-2xl rounded-tr-sm max-w-[80%]">
              <div className="w-24 h-2 bg-blue-200 rounded-full mb-2" />
              <div className="w-32 h-2 bg-blue-200 rounded-full" />
            </div>
            <div className="self-start bg-gray-100 dark:bg-[#202020] p-3 rounded-2xl rounded-tl-sm max-w-[80%] border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <div className="w-16 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="w-5/6 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="w-4/6 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
          <div className="h-12 bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 mt-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <div className="w-40 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      );
    case 'studio':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] flex overflow-hidden">
          <div className="w-16 border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] flex flex-col items-center py-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
          <div className="flex-1 p-6 flex items-center justify-center bg-gray-100/50 dark:bg-[#191919]">
            <div className="w-full max-w-xs aspect-[4/5] bg-white dark:bg-[#2E2E2E] rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
              <div className="flex-1 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 flex items-center justify-center">
                <Palette className="w-12 h-12 text-pink-400 opacity-50" />
              </div>
              <div className="p-3 space-y-2 bg-white dark:bg-[#2E2E2E]">
                <div className="w-3/4 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="w-1/2 h-2 bg-gray-100 dark:bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      );
    case 'analytics':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-6 overflow-hidden">
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 bg-gray-50 dark:bg-[#202020] rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <div className="w-12 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mb-3" />
                <div className="w-20 h-4 bg-gray-800 dark:bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
          <div className="flex-1 flex items-end gap-2 px-2">
            {[40, 70, 45, 90, 65, 80, 55, 100, 75, 85].map((h, i) => (
              <div key={i} className="flex-1 bg-green-100 dark:bg-green-900/30 rounded-t-md relative group">
                <div 
                  className="absolute bottom-0 left-0 w-full bg-green-500 rounded-t-md transition-all duration-1000"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    case 'tasks':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="w-20 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg" />
          </div>
          <div className="space-y-3 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-100 dark:border-gray-700">
                <CheckCircle2 className={cn("w-5 h-5", i === 0 ? "text-green-500" : "text-gray-300 dark:text-gray-600")} />
                <div className="flex-1 space-y-2">
                  <div className={cn("w-2/3 h-2.5 rounded-full", i === 0 ? "bg-gray-300 dark:bg-gray-600" : "bg-gray-800 dark:bg-gray-200")} />
                  <div className="w-1/3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'ideas':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div className="w-40 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-100 dark:border-yellow-900/20 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-full h-2 bg-gray-800 dark:bg-gray-200 rounded-full" />
                  <div className="w-3/4 h-2 bg-gray-800 dark:bg-gray-200 rounded-full" />
                  <div className="w-1/2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
                <div className="w-16 h-4 bg-yellow-200 dark:bg-yellow-800/50 rounded-md mt-4" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'workspace':
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              F
            </div>
            <div className="flex-1 space-y-2">
              <div className="w-32 h-3 bg-indigo-900/80 dark:bg-indigo-100/80 rounded-full" />
              <div className="w-20 h-2 bg-indigo-900/40 dark:bg-indigo-100/40 rounded-full" />
            </div>
            <div className="flex -space-x-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#2E2E2E] bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#202020] rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                <div className="space-y-2">
                  <div className="w-full h-2 bg-gray-800 dark:bg-gray-200 rounded-full" />
                  <div className="w-1/2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

const ScribbleIcon = ({ Icon, className }: { Icon: any, className?: string }) => {
  return (
    <div className={cn("relative", className)}>
      <Icon className="w-full h-full absolute inset-0 opacity-50" strokeWidth={1.5} style={{ transform: 'translate(1px, 1px) rotate(2deg)' }} />
      <Icon className="w-full h-full absolute inset-0 opacity-50" strokeWidth={1.5} style={{ transform: 'translate(-1px, -1px) rotate(-2deg)' }} />
      <Icon className="w-full h-full relative z-10" strokeWidth={2} />
    </div>
  );
};

interface LandingViewProps {
  onLogin: () => void;
}

const SECTIONS = [
  {
    id: 'hero',
    icon: null,
    title: '',
    description: '',
    color: '',
    bg: ''
  },
  {
    id: 'calendar',
    icon: CalendarIcon,
    title: 'Content Calendar',
    description: 'Master your schedule with a high-performance drag-and-drop calendar. Plan, coordinate, and execute your entire social media strategy in one place.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'ideas',
    icon: Lightbulb,
    title: 'Creative Hub',
    description: 'A centralized bank for your raw inspiration. Capture ideas, organize them by category, and seamlessly transition them into scheduled content.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10'
  },
  {
    id: 'ai',
    icon: Sparkles,
    title: 'AI Studio',
    description: 'Harness the power of Gemini to generate high-engagement captions, brainstorm creative angles, and refine your brand voice with intelligent assistance.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10'
  },
  {
    id: 'studio',
    icon: Palette,
    title: 'Brand Kit',
    description: 'Maintain absolute brand consistency. Store and manage your logos, color palettes, and visual assets for instant access during content creation.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10'
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Turn data into growth. Monitor cross-platform performance with real-time analytics and gain actionable insights to optimize your content strategy.',
    color: 'text-green-500',
    bg: 'bg-green-500/10'
  },
  {
    id: 'localdb',
    icon: Database,
    title: 'Inventory Database',
    description: 'Manage your product catalog and digital assets with a structured local database. Keep everything you need for your content at your fingertips.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10'
  }
];

export function LandingView({ onLogin }: LandingViewProps) {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: footerRef,
    offset: ["start end", "end end"]
  });

  const calloutScale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
  const calloutRadius = useTransform(scrollYProgress, [0, 1], ["24px", "0px"]);

  const startAutoScroll = () => {
    setIsAutoScrolling(true);
    if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
    
    // Find current section index
    const navSections = SECTIONS.filter(s => s.icon !== null);
    let currentIdx = navSections.findIndex(s => s.id === activeSection);
    if (currentIdx === -1) currentIdx = 0;

    autoScrollIntervalRef.current = setInterval(() => {
      currentIdx++;
      if (currentIdx < navSections.length) {
        scrollToSection(navSections[currentIdx].id);
      } else {
        // Scroll to footer at the end
        if (footerRef.current && containerRef.current) {
          containerRef.current.scrollTo({
            top: footerRef.current.offsetTop,
            behavior: 'smooth'
          });
        }
        stopAutoScroll();
      }
    }, 4000);
  };

  const pauseAutoScroll = () => {
    setIsAutoScrolling(false);
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  const stopAutoScroll = () => {
    setIsAutoScrolling(false);
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const sections = containerRef.current.querySelectorAll('section');
      const scrollPosition = containerRef.current.scrollTop + window.innerHeight / 3;

      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(section.id);
        }
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Trigger once on mount
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element && containerRef.current) {
      containerRef.current.scrollTo({
        top: element.offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const navSections = SECTIONS.filter(s => s.icon !== null);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] overflow-hidden font-sans selection:bg-[#2383E2] selection:text-white">
      {/* Sidebar (Desktop) / Bottom Bar (Mobile) */}
      <aside className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto w-full md:w-16 h-[64px] md:h-full border-t md:border-t-0 md:border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] md:bg-[#F7F7F5] md:dark:bg-[#202020] flex md:flex-col items-center py-0 md:py-4 shrink-0 z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] md:shadow-none px-2 md:px-0">
        <div className="hidden md:block mb-8">
          <ForgeLogo size={28} className="p-1" />
        </div>
        
        <nav className="flex-1 flex flex-row md:flex-col justify-between md:justify-start gap-0 md:gap-2 w-full px-0 md:px-2 overflow-hidden md:overflow-visible items-center h-full md:h-auto">
          {/* Desktop Nav Items */}
          <div className="hidden md:flex flex-col gap-2 w-full">
            {navSections.map((section) => {
              const Icon = section.icon!;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "flex p-2.5 rounded-xl items-center justify-center transition-all duration-200 relative group w-full",
                    isActive 
                      ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] shadow-sm" 
                      : "text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] hover:bg-[#E9E9E7] md:dark:hover:bg-[#2E2E2E]"
                  )}
                  title={section.title}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute left-0 w-1 h-5 bg-[#2383E2] rounded-r-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Nav Items - Same as Registered User */}
          <div className="md:hidden flex flex-1 flex-row justify-between w-full h-full items-center">
            {[
              { id: 'calendar', icon: CalendarIcon, title: 'Calendar' },
              { id: 'todos', icon: ListTodo, title: 'Tasks' },
              { id: 'ideas', icon: Lightbulb, title: 'Ideas' },
              { id: 'login', icon: LogIn, title: 'Log In', action: onLogin }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => tab.action ? tab.action() : scrollToSection(tab.id)}
                  className={cn(
                    "flex flex-col items-center justify-center transition-all duration-200 relative flex-1 h-full",
                    isActive ? "text-[#2383E2]" : "text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                  )}
                  title={tab.title}
                >
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTabIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#2383E2] rounded-b-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="hidden md:flex mt-auto md:pt-4 flex-col gap-0 px-2 md:px-2 shrink-0 items-center border-t border-[#E9E9E7] dark:border-[#2E2E2E] py-4">
          <button
            onClick={onLogin}
            className="flex p-2.5 rounded-xl items-center justify-center text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] md:hover:bg-[#E9E9E7] md:dark:hover:bg-[#2E2E2E] transition-colors"
            title="Sign Up / Log In"
          >
            <LogIn className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Fixed Background Animation for all views */}
      <div className="fixed top-1/2 right-0 -translate-y-1/2 w-full md:w-1/2 max-w-[600px] aspect-[210/339] opacity-10 md:opacity-20 dark:opacity-10 md:dark:opacity-20 pointer-events-none z-0">
        <div className="w-full h-full scale-150 md:scale-100 origin-right">
          <ScribbleFlame />
        </div>
      </div>

      {/* Main Content */}
      <main ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth pb-24 md:pb-0">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-24 space-y-24 md:space-y-40">
          
          {/* Hero Section */}
          <section id="hero" className="min-h-[80vh] flex flex-col lg:flex-row items-center justify-between relative">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8 relative z-10 max-w-2xl lg:w-1/2"
            >
              <div className="flex items-center gap-4 mb-4">
                <ForgeLogo size={40} className="text-white" />
                <span className="font-bold text-3xl tracking-tight text-white">Forge</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] flex flex-wrap items-baseline">
                <TypewriterText text="Sparks into substance" delay={0} className="text-gray-900 dark:text-white" />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="inline-block text-[#2383E2] ml-1"
                >
                  |
                </motion.span>
              </h1>
              <p className="text-lg md:text-2xl text-[#787774] dark:text-[#9B9A97] max-w-2xl leading-relaxed">
                Capture endless ideas in your Creative Hub and transform them into a polished, high-performing social media strategy.
              </p>
              <div className="pt-4 flex flex-col gap-3">
                {window !== window.top && (
                  <button 
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="text-sm text-[#787774] hover:text-[#2383E2] underline text-left w-fit transition-colors"
                  >
                    Having trouble logging in? Open app in a new tab
                  </button>
                )}
              </div>
            </motion.div>

            {/* Removed Spline 3D Experience */}

            {/* Bouncy Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, 10, 0] }}
              transition={{ delay: 2, duration: 1.5, repeat: Infinity }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#787774] dark:text-[#9B9A97] cursor-pointer z-20"
              onClick={startAutoScroll}
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>

            {/* Decorative background elements - Scribble Logo removed from here as it's now global */}
          </section>

          <div className="space-y-16 md:space-y-20 py-12">
            {navSections.map((section, index) => {
              const Icon = section.icon!;
              return (
                <section key={section.id} id={section.id} className="min-h-[50vh] flex flex-col justify-center py-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20%" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn("flex flex-col items-center gap-12", index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse")}
                  >
                    <div className="flex-1 space-y-6 max-w-2xl w-full">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={cn("p-4 rounded-2xl shrink-0 shadow-sm", section.bg, section.color)}>
                          <ScribbleIcon Icon={Icon} className="w-8 h-8 md:w-10 md:h-10" />
                        </div>
                        <div className="inline-block px-3 py-1 rounded-full bg-[#E9E9E7] dark:bg-[#2E2E2E] text-xs font-bold tracking-wider uppercase text-[#787774] dark:text-[#9B9A97]">
                          Feature {index + 1}
                        </div>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{section.title}</h2>
                      <p className="text-lg md:text-xl text-[#787774] dark:text-[#9B9A97] leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                    <div className="flex-1 w-full max-w-xl perspective-[1000px]">
                      <motion.div
                        whileHover={{ scale: 1.02, rotateY: index % 2 === 0 ? -5 : 5 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <FeaturePreview id={section.id} />
                      </motion.div>
                    </div>
                  </motion.div>
                </section>
              );
            })}
          </div>

          <section ref={footerRef} className="py-24 md:py-40 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
            <motion.div 
              style={{ 
                scale: calloutScale,
                borderRadius: calloutRadius
              }}
              className="bg-[#2383E2] p-8 md:p-16 text-white text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative overflow-hidden min-h-[60vh] md:min-h-[80vh]"
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
              
              <div className="space-y-6 max-w-2xl relative z-10">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready to transform your workflow?</h2>
                <p className="text-xl text-blue-100">
                  Join thousands of content creators who are already saving time and growing their audience with Forge.
                </p>
              </div>
              <div className="shrink-0 relative z-10 w-full md:w-auto">
                <button
                  onClick={onLogin}
                  className="w-full md:w-auto px-10 py-5 bg-white text-[#2383E2] hover:bg-blue-50 rounded-xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-xl"
                >
                  Sign Up Now
                </button>
              </div>
            </motion.div>
          </section>
        </div>
      </main>

      {/* Auto-scroll Controls */}
      <AnimatePresence>
        {isAutoScrolling && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white dark:bg-[#2E2E2E] shadow-lg rounded-full p-2 border border-[#E9E9E7] dark:border-[#3E3E3E]"
          >
            <button
              onClick={pauseAutoScroll}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#3E3E3E] rounded-full text-[#787774] dark:text-[#9B9A97] transition-colors"
              title="Pause Scrolling"
            >
              <Pause className="w-5 h-5" />
            </button>
            <button
              onClick={stopAutoScroll}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#3E3E3E] rounded-full text-[#787774] dark:text-[#9B9A97] transition-colors"
              title="Stop Scrolling"
            >
              <Square className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
