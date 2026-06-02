import { motion, AnimatePresence } from 'motion/react';
import { HeroHandwritingTitle } from './HeroHandwritingTitle';
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
  Target
} from 'lucide-react';
import { ForgeLogo } from './ForgeLogo';
import { cn } from '../lib/utils';
import { INDUSTRY_CONFIGS } from '../lib/industryConfig';

const landingTerms = INDUSTRY_CONFIGS.default.terminology;

const FEATURES = [
  {
    id: 'calendar',
    icon: CalendarIcon,
    title: landingTerms.calendar,
    description: 'Plan your content on a visual month grid. Drag, drop, and share with stakeholders.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'ideas',
    icon: Lightbulb,
    title: landingTerms.ideas,
    description: 'A creative inbox to capture and sort concepts before they hit the schedule.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10'
  },
  {
    id: 'products',
    icon: Database,
    title: landingTerms.products,
    description: 'Turn your website into a searchable catalogue. Sync products and info instantly.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10'
  },
  {
    id: 'assets',
    icon: Palette,
    title: landingTerms.assets,
    description: 'One hub for brand visuals, voice, and AI rules to keep content on-brand.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10'
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track posting rhythm and format mix directly from your calendar data.',
    color: 'text-green-500',
    bg: 'bg-green-500/10'
  }
];

export function LandingView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#151515] text-[#37352F] dark:text-[#EBE9ED] overflow-y-auto selection:bg-brand selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F7F5]/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ForgeLogo size={32} />
            <span className="text-xl font-black tracking-tighter uppercase">Forge</span>
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
                The multi-tenant calendar for modern brands. Plan, brainstorm, and publish across platforms with local AI assistance.
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
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#757681] mb-12">Core Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-3xl hover:border-brand/40 transition-all group"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", feature.bg)}>
                  <feature.icon className={cn("w-6 h-6", feature.color)} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#37352F] dark:text-[#EBE9ED]">{feature.title}</h3>
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
                  Join hundreds of marketers using Forge to streamline their publishing workflow.
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
            <span className="text-sm font-black tracking-tighter uppercase opacity-60">Forge Buildware</span>
          </div>
          <div className="flex gap-8 text-sm font-bold text-[#757681]">
            <button onClick={onLogin} className="hover:text-brand">About</button>
            <button onClick={onLogin} className="hover:text-brand">Privacy</button>
            <button onClick={onLogin} className="hover:text-brand">Terms</button>
          </div>
          <p className="text-xs text-[#757681]">© 2026 Forge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
