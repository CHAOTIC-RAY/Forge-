import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  MessageSquare,
  Sparkles,
  Lightbulb,
  BarChart3,
  Database,
  Instagram,
  Facebook,
  Users,
  Eye,
  Heart
} from 'lucide-react';
import { format, isToday, parseISO, isAfter, startOfDay } from 'date-fns';
import { Post, Business } from '../data';
import { cn } from '../lib/utils';
import { generateDailyGreetings, HighStockProduct, generateTaskIdeas } from '../lib/gemini';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface HomeTabProps {
  posts: Post[];
  activeBusiness: Business | null;
  setActiveTab: (tab: any) => void;
  onAddPost: () => void;
  isAdmin: boolean;
  isViewer?: boolean;
  onHandleRequestAccess?: () => void;
  user?: User | null;
}

export function HomeTab({ posts, activeBusiness, setActiveTab, onAddPost, isAdmin, isViewer, onHandleRequestAccess, user }: HomeTabProps) {
  const [greeting, setGreeting] = useState<string>('');
  const [products, setProducts] = useState<HighStockProduct[]>([]);
  const [recommendedIdea, setRecommendedIdea] = useState<any>(null);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);

  // Sync products with Firestore
  useEffect(() => {
    if (!activeBusiness?.id) return;

    const q = query(collection(db, 'inventory_products'), where('businessId', '==', activeBusiness.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudProducts: HighStockProduct[] = [];
      snapshot.forEach((doc) => {
        cloudProducts.push(doc.data() as HighStockProduct);
      });
      setProducts(cloudProducts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rainbow_products');
    });

    return () => unsubscribe();
  }, [activeBusiness?.id]);

  useEffect(() => {
    const fetchGreeting = async () => {
      const userName = user?.displayName || 'User';
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const cacheKey = `daily_greetings_${userName}`;
      const cached = localStorage.getItem(cacheKey);
      
      const hour = new Date().getHours();
      let timeOfDay: 'morning' | 'evening' | 'night' | 'midnight' = 'morning';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'evening';
      else if (hour >= 18 && hour < 22) timeOfDay = 'night';
      else timeOfDay = 'midnight';

      let greetings: any = null;

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.date === todayStr) {
            greetings = parsed.greetings;
          }
        } catch (e) {
          console.error("Failed to parse cached greetings", e);
        }
      }

      if (!greetings) {
        greetings = await generateDailyGreetings(userName);
        localStorage.setItem(cacheKey, JSON.stringify({
          date: todayStr,
          greetings
        }));
      }

      setGreeting(greetings[timeOfDay] || greetings.morning);
    };

    fetchGreeting();
  }, [user?.displayName]);

  useEffect(() => {
    const fetchRecommendedIdea = async () => {
      if (!activeBusiness?.id) return;
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const cacheKey = `daily_inspiration_${activeBusiness.id}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.date === todayStr) {
            setRecommendedIdea(parsed.idea);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached inspiration", e);
        }
      }

      setIsGeneratingIdea(true);
      try {
        const ideas = await generateTaskIdeas(activeBusiness, undefined, undefined, "Generate 1 single, highly creative and actionable content idea for today.");
        if (ideas && ideas.length > 0) {
          const idea = ideas[0];
          setRecommendedIdea(idea);
          localStorage.setItem(cacheKey, JSON.stringify({
            date: todayStr,
            idea
          }));
        }
      } catch (error) {
        console.error("Failed to fetch recommended idea:", error);
      } finally {
        setIsGeneratingIdea(false);
      }
    };

    fetchRecommendedIdea();
  }, [activeBusiness?.id]);

  const todayPosts = useMemo(() => {
    return posts.filter(post => isToday(parseISO(post.date)));
  }, [posts]);

  const upcomingPosts = useMemo(() => {
    const today = startOfDay(new Date());
    return posts
      .filter(post => isAfter(parseISO(post.date), today) && !isToday(parseISO(post.date)))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 3);
  }, [posts]);

  const inventorySummary = useMemo(() => {
    return {
      total: products.length,
      categories: new Set(products.map(p => p.type)).size
    };
  }, [products]);

  const stats = [
    { label: 'Inventory Items', value: inventorySummary.total.toString(), icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Categories', value: inventorySummary.categories.toString(), icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Upcoming Posts', value: upcomingPosts.length.toString(), icon: CalendarIcon, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Total Posts', value: posts.length.toString(), icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const socialStats = [
    { 
      platform: 'Instagram', 
      icon: Instagram, 
      color: 'text-pink-500', 
      bg: 'bg-pink-500/10',
      metrics: [
        { label: 'Followers', value: '1.2k', icon: Users },
        { label: 'Reach', value: '5.4k', icon: Eye },
        { label: 'Engagement', value: '8.2%', icon: Heart }
      ]
    },
    { 
      platform: 'Facebook', 
      icon: Facebook, 
      color: 'text-blue-600', 
      bg: 'bg-blue-600/10',
      metrics: [
        { label: 'Followers', value: '2.8k', icon: Users },
        { label: 'Reach', value: '12.1k', icon: Eye },
        { label: 'Engagement', value: '4.5%', icon: Heart }
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 md:p-8 lg:p-12 w-full overflow-y-auto no-scrollbar pb-24 md:pb-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1"
        >
          <h2 className="text-3xl font-black text-[#37352F] dark:text-[#EBE9ED] tracking-tight">
            {greeting || `Welcome back, ${user?.displayName || 'User'}`}
          </h2>
          <p className="text-base text-[#757681] dark:text-[#9B9A97]">
            {activeBusiness ? `Managing workspace: ${activeBusiness.name}` : "Here's what's happening with your brand today."}
          </p>
        </motion.div>

        {isAdmin && (
          <button 
            onClick={onAddPost}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white rounded-[8px] text-sm font-bold hover:bg-brand-hover transition-all active:scale-95 shrink-0 min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            Create Post
          </button>
        )}
        {isViewer && (
          <button 
            onClick={onHandleRequestAccess}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand/10 text-brand rounded-[8px] text-sm font-bold hover:bg-brand/20 transition-all active:scale-95 shrink-0 min-h-[44px]"
          >
            <Sparkles className="w-5 h-5" />
            Request Full Access
          </button>
        )}
      </div>

      {/* Daily Inspiration Section - Moved Up */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#1A1A1A] border-2 border-brand/20 dark:border-brand/40 rounded-[24px] p-8 relative overflow-hidden group shadow-xl shadow-brand/5"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Sparkles className="w-48 h-48 text-brand" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1.5 bg-brand text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-brand/20">
              Daily Inspiration
            </div>
            <div className="flex items-center gap-1.5 text-[#757681] dark:text-[#9B9A97] text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Freshly generated for {activeBusiness?.name || 'you'}</span>
            </div>
          </div>

          {isGeneratingIdea ? (
            <div className="flex items-center gap-4 py-6">
              <div className="w-6 h-6 border-3 border-brand border-t-transparent rounded-full animate-spin" />
              <span className="text-base font-bold text-[#757681] animate-pulse">AI is crafting your daily strategy...</span>
            </div>
          ) : recommendedIdea ? (
            <div className="space-y-6">
              <div className="max-w-4xl">
                <h3 className="text-2xl md:text-3xl font-black text-[#37352F] dark:text-[#EBE9ED] mb-3 leading-tight tracking-tight">{recommendedIdea.title}</h3>
                <p className="text-base text-[#757681] dark:text-[#9B9A97] leading-relaxed">
                  {recommendedIdea.description || recommendedIdea.brief}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <button 
                  onClick={() => isAdmin ? setActiveTab('creative') : onHandleRequestAccess?.()}
                  className="px-6 py-3 bg-brand text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-brand-hover transition-all flex items-center gap-2 shadow-lg shadow-brand/25 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAdmin ? 'Use in AI Studio' : 'Request Access to Use'}
                </button>
                <button 
                  onClick={() => isAdmin ? setActiveTab('notebook') : onHandleRequestAccess?.()}
                  className="px-6 py-3 bg-white dark:bg-[#252525] border border-[#E9E9E7] dark:border-[#333333] text-[#37352F] dark:text-[#EBE9ED] rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-all flex items-center gap-2 active:scale-95"
                >
                  <Database className="w-4 h-4" />
                  {isAdmin ? 'Save to Strategy Lab' : 'Request Access to Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6">
              <p className="text-base text-[#757681]">No recommendation available right now. Check back later!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] p-4 md:p-5 rounded-[12px] flex flex-col justify-between md:gap-4 transition-colors hover:border-brand/50"
          >
            <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-[8px] flex items-center justify-center mb-2 md:mb-0", stat.bg)}>
              <stat.icon className={cn("w-5 h-5 md:w-6 md:h-6", stat.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] md:text-[10px] font-bold text-[#757681] uppercase tracking-widest">
                {stat.label}
              </span>
              <span className="text-xl md:text-2xl font-black text-[#37352F] dark:text-[#EBE9ED]">
                {stat.value}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Social Analytics Bento Boxes - Smaller */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {socialStats.map((platform, idx) => (
          <motion.div
            key={platform.platform}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F7F7F5]/30 dark:bg-[#2E2E2E]/30">
              <div className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-[6px] flex items-center justify-center", platform.bg)}>
                  <platform.icon className={cn("w-4 h-4", platform.color)} />
                </div>
                <h3 className="font-black text-sm">{platform.platform}</h3>
              </div>
              <TrendingUp className="w-3 h-3 text-green-500" />
            </div>
            <div className="p-4 grid grid-cols-3 gap-2">
              {platform.metrics.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-[#757681]">
                    <metric.icon className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{metric.label}</span>
                  </div>
                  <span className="text-base font-black text-[#37352F] dark:text-[#EBE9ED]">{metric.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Schedule */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] overflow-hidden h-full flex flex-col"
          >
            <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F7F7F5]/50 dark:bg-[#2E2E2E]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-brand-bg flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-brand" />
                </div>
                <h3 className="font-black text-lg">Today's Schedule</h3>
              </div>
              <button 
                onClick={() => setActiveTab('schedule')}
                className="px-4 py-2 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] text-xs font-bold text-brand hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-all flex items-center gap-2 min-h-[44px]"
              >
                View Calendar <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-6 flex-1">
              {todayPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayPosts.map(post => (
                    <div key={post.id} className="flex items-center gap-4 p-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-[12px] border border-[#E9E9E7] dark:border-[#3E3E3E] hover:border-brand transition-colors group cursor-pointer">
                      <div className="w-16 h-16 rounded-[8px] bg-white dark:bg-[#1E1E1E] flex items-center justify-center border border-[#E9E9E7] dark:border-[#3E3E3E] shrink-0 overflow-hidden">
                        {post.images && post.images[0] ? (
                          <img 
                            src={post.images[0]} 
                            alt="" 
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/600x600/f3f4f6/94a3b8?text=Image+Unavailable';
                              (e.target as HTMLImageElement).onerror = null;
                            }}
                          />
                        ) : (
                          <MessageSquare className="w-6 h-6 text-[#757681]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black truncate group-hover:text-brand transition-colors">{post.title}</h4>
                        <p className="text-xs text-[#757681] line-clamp-2 mt-1">{post.caption}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                           <CheckCircle2 className="w-3 h-3 text-green-500" />
                           <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Scheduled for Today</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <div className="w-20 h-20 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-[8px] flex items-center justify-center mb-4">
                    <CalendarIcon className="w-10 h-10 text-[#757681]/30" />
                  </div>
                  <h4 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED] mb-2">Clear Schedule</h4>
                  <p className="text-sm text-[#757681] max-w-xs mx-auto mb-6">No posts scheduled for today. Use the AI Studio to generate some fresh content!</p>
                  {isAdmin && (
                    <button 
                      onClick={onAddPost}
                      className="px-6 py-3 bg-brand text-white rounded-[8px] text-sm font-bold hover:bg-brand-hover transition-all flex items-center gap-2 min-h-[44px]"
                    >
                      <Plus className="w-4 h-4" /> Create First Post
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Actions & Upcoming */}
        <div className="flex flex-col gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h3 className="text-xs font-black text-[#757681] uppercase tracking-[0.2em] px-1">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => isAdmin ? setActiveTab('creative') : onHandleRequestAccess?.()}
                className="p-5 bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] hover:border-brand transition-all flex items-center gap-4 group text-left min-h-[44px]"
              >
                <div className="w-12 h-12 rounded-[8px] bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <span className="block text-sm font-black">AI Studio</span>
                  <span className="text-xs text-[#757681]">Generate new content</span>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-[#757681] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </button>
              <button 
                onClick={() => isAdmin ? setActiveTab('ideas') : onHandleRequestAccess?.()}
                className="p-5 bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] hover:border-brand transition-all flex items-center gap-4 group text-left min-h-[44px]"
              >
                <div className="w-12 h-12 rounded-[8px] bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <span className="block text-sm font-black">Ideas Bank</span>
                  <span className="text-xs text-[#757681]">Browse inspiration</span>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-[#757681] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </button>
            </div>
          </motion.div>

          {/* Upcoming */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <h3 className="text-xs font-black text-[#757681] uppercase tracking-[0.2em] px-1">Upcoming</h3>
            <div className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] overflow-hidden divide-y divide-[#E9E9E7] dark:divide-[#2E2E2E]">
              {upcomingPosts.length > 0 ? (
                upcomingPosts.map(post => (
                  <div key={post.id} className="p-4 flex items-center justify-between group cursor-pointer hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors min-h-[44px]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-brand uppercase tracking-wider">{format(parseISO(post.date), 'MMM d')}</span>
                      <span className="text-sm font-bold truncate max-w-[180px] mt-0.5">{post.title}</span>
                    </div>
                    <div className="w-8 h-8 rounded-[8px] bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                      <ArrowRight className="w-4 h-4 text-[#757681]" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs font-bold text-[#757681]">No upcoming posts.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile Floating Chat Button */}
      <div className="md:hidden fixed bottom-20 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab('chat')}
          className="w-14 h-14 bg-brand text-white rounded-[8px] flex items-center justify-center border-2 border-white dark:border-[#191919]"
        >
          <MessageSquare className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
}
