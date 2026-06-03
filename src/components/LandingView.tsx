import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HeroHandwritingTitle } from "./HeroHandwritingTitle";
import {
  Calendar as CalendarIcon,
  Sparkles,
  Palette,
  BarChart3,
  LogIn,
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  Database,
  Search,
  LayoutGrid,
  ArrowRight,
  TrendingUp,
  Target,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { ForgeLogo } from "./ForgeLogo";
import { cn } from "../lib/utils";
import { INDUSTRY_CONFIGS } from "../lib/industryConfig";

const TypewriterText = ({
  text,
  delay = 0,
  onComplete,
  className,
}: {
  text: string;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}) => {
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
    case "calendar":
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
              <div
                key={i}
                className={cn(
                  "rounded-lg border border-gray-100 dark:border-gray-700 p-1.5",
                  i === 12
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200"
                    : "bg-gray-50 dark:bg-[#202020]",
                )}
              >
                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-600 mb-1.5" />
                {i % 5 === 0 && (
                  <div className="w-full h-2 bg-blue-400 rounded-sm mb-1" />
                )}
                {i % 8 === 0 && (
                  <div className="w-full h-2 bg-purple-400 rounded-sm" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    case "localdb":
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-4 flex flex-col gap-4 overflow-hidden">
          <div className="w-full h-10 bg-gray-100 dark:bg-[#202020] rounded-xl flex items-center px-4 gap-3 border border-gray-200 dark:border-gray-700">
            <Database className="w-4 h-4 text-gray-400" />
            <div className="w-32 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
              >
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
    case "ai":
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
    case "studio":
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] flex overflow-hidden">
          <div className="w-16 border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] flex flex-col items-center py-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700"
              />
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
    case "analytics":
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-6 overflow-hidden">
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gray-50 dark:bg-[#202020] rounded-xl p-3 border border-gray-100 dark:border-gray-700"
              >
                <div className="w-12 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mb-3" />
                <div className="w-20 h-4 bg-gray-800 dark:bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
          <div className="flex-1 flex items-end gap-2 px-2">
            {[40, 70, 45, 90, 65, 80, 55, 100, 75, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-green-100 dark:bg-green-900/30 rounded-t-md relative group"
              >
                <div
                  className="absolute bottom-0 left-0 w-full bg-green-500 rounded-t-md transition-all duration-1000"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    case "tasks":
      return (
        <div className="w-full aspect-video bg-white dark:bg-[#2E2E2E] rounded-2xl shadow-xl border border-[#E9E9E7] dark:border-[#3E3E3E] p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="w-20 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg" />
          </div>
          <div className="space-y-3 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-100 dark:border-gray-700"
              >
                <CheckCircle2
                  className={cn(
                    "w-5 h-5",
                    i === 0
                      ? "text-green-500"
                      : "text-gray-300 dark:text-gray-600",
                  )}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className={cn(
                      "w-2/3 h-2.5 rounded-full",
                      i === 0
                        ? "bg-gray-300 dark:bg-gray-600"
                        : "bg-gray-800 dark:bg-gray-200",
                    )}
                  />
                  <div className="w-1/3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      );
    case "ideas":
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
              <div
                key={i}
                className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-100 dark:border-yellow-900/20 flex flex-col justify-between"
              >
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
    case "workspace":
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
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-[#2E2E2E] bg-gray-300 dark:bg-gray-600 flex items-center justify-center"
                >
                  <Users className="w-4 h-4 text-white" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-50 dark:bg-[#202020] rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col justify-between"
              >
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

const ScribbleIcon = ({
  Icon,
  className,
}: {
  Icon: any;
  className?: string;
}) => {
  return (
    <div className={cn("relative", className)}>
      <Icon
        className="w-full h-full absolute inset-0 opacity-50"
        strokeWidth={1.5}
        style={{ transform: "translate(1px, 1px) rotate(2deg)" }}
      />
      <Icon
        className="w-full h-full absolute inset-0 opacity-50"
        strokeWidth={1.5}
        style={{ transform: "translate(-1px, -1px) rotate(-2deg)" }}
      />
      <Icon className="w-full h-full relative z-10" strokeWidth={2} />
    </div>
  );
};

interface LandingViewProps {
  onLogin: () => void;
}

const landingTerms = INDUSTRY_CONFIGS.default.terminology;

const FEATURES = [
  {
    id: "calendar",
    icon: CalendarIcon,
    title: landingTerms.calendar,
    description:
      "Plan your content on a visual month grid. Drag, drop, and share with stakeholders.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "ideas",
    icon: Lightbulb,
    title: landingTerms.ideas,
    description:
      "A creative inbox to capture and sort concepts before they hit the schedule.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    id: "products",
    icon: Database,
    title: landingTerms.products,
    description:
      "Turn your website into a searchable catalogue. Sync products and info instantly.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    id: "assets",
    icon: Palette,
    title: landingTerms.assets,
    description:
      "One hub for brand visuals, voice, and AI rules to keep content on-brand.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics",
    description:
      "Track posting rhythm and format mix directly from your calendar data.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

export function LandingView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#151515] text-[#37352F] dark:text-[#EBE9ED] overflow-y-auto selection:bg-brand selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F7F5]/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ForgeLogo size={32} />
            <span className="text-xl font-black tracking-tighter uppercase">
              Forge
            </span>
          </div>
          <button
            onClick={onLogin}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-full text-sm font-bold hover:bg-brand-hover transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                <Sparkles className="w-3 h-3" />
                AI-Powered Content Strategy
              </div>
              <HeroHandwritingTitle className="mb-8 text-[#1a1a1a] dark:text-white" />
              <p className="text-lg md:text-xl text-[#757681] dark:text-[#9B9A97] leading-relaxed mb-10">
                The multi-tenant calendar for modern brands. Plan, brainstorm,
                and publish across platforms with local AI assistance.
              </p>
              <button
                onClick={onLogin}
                className="group flex items-center gap-3 px-8 py-4 bg-brand text-white rounded-2xl text-lg font-bold hover:bg-brand-hover transition-all shadow-xl shadow-brand/20 active:scale-95"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto border-t border-[#E9E9E7] dark:border-[#2E2E2E] pt-20">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#757681] mb-12">
            Core Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-3xl hover:border-brand/40 transition-all group"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                    feature.bg,
                  )}
                >
                  <feature.icon className={cn("w-6 h-6", feature.color)} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#37352F] dark:text-[#EBE9ED]">
                  {feature.title}
                </h3>
                <p className="text-[#757681] dark:text-[#9B9A97] leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}

            {/* CTA Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-8 bg-brand rounded-3xl text-white flex flex-col justify-between"
            >
              <div>
                <Target className="w-8 h-8 mb-6 opacity-80" />
                <h3 className="text-xl font-bold mb-3">Ready to scale?</h3>
                <p className="opacity-90 leading-relaxed text-sm">
                  Join hundreds of marketers using Forge to streamline their
                  publishing workflow.
                </p>
              </div>
              <button
                onClick={onLogin}
                className="mt-8 px-6 py-3 bg-white text-brand rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all active:scale-95 text-center"
              >
                Sign Up Now
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <ForgeLogo size={24} />
            <span className="text-sm font-black tracking-tighter uppercase opacity-60">
              Forge Buildware
            </span>
          </div>
          <div className="flex gap-8 text-sm font-bold text-[#757681]">
            <button onClick={onLogin} className="hover:text-brand">
              About
            </button>
            <button onClick={onLogin} className="hover:text-brand">
              Privacy
            </button>
            <button onClick={onLogin} className="hover:text-brand">
              Terms
            </button>
          </div>
          <p className="text-xs text-[#757681]">
            © 2026 Forge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
