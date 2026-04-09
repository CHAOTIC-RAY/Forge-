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
  Database
} from 'lucide-react';
import { format, isToday, parseISO, isAfter, startOfDay } from 'date-fns';
import { Post, Business } from '../data';
import { cn } from '../lib/utils';
import { generateGreeting, HighStockProduct } from '../lib/gemini';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface HomeTabProps {
  posts: Post[];
  activeBusiness: Business | null;
  setActiveTab: (tab: any) => void;
  onAddPost: () => void;
  isAdmin: boolean;
  user?: User | null;
}

export function HomeTab({ posts, activeBusiness, setActiveTab, onAddPost, isAdmin, user }: HomeTabProps) {
  const [greeting, setGreeting] = useState<string>('');
  const [products, setProducts] = useState<HighStockProduct[]>([]);

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
    });

    return () => unsubscribe();
  }, [activeBusiness?.id]);

  useEffect(() => {
    const fetchGreeting = async () => {
      const userName = user?.displayName || 'User';
      const cacheKey = `greeting_${userName}`;
      const cached = localStorage.getItem(cacheKey);
      
      const hour = new Date().getHours();
      let timeOfDay = 'morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17) timeOfDay = 'evening';

      if (cached) {
        try {
          const { text, timestamp, timeOfDay: cachedTime } = JSON.parse(cached);
          const now = Date.now();
          const twoHours = 2 * 60 * 60 * 1000;
          
          if (now - timestamp < twoHours && timeOfDay === cachedTime) {
            setGreeting(text);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached greeting", e);
        }
      }

      // Generate new greeting
      const newGreeting = await generateGreeting(userName, timeOfDay);
      setGreeting(newGreeting);
      localStorage.setItem(cacheKey, JSON.stringify({
        text: newGreeting,
        timestamp: Date.now(),
        timeOfDay
      }));
    };

    fetchGreeting();
  }, [user?.displayName]);

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

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 md:p-8 lg:p-12 w-full overflow-y-auto no-scrollbar">
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
          <p className="text-base text-[#787774] dark:text-[#9B9A97]">
            {activeBusiness ? `Managing workspace: ${activeBusiness.name}` : "Here's what's happening with your brand today."}
          </p>
        </motion.div>

        {isAdmin && (
          <button 
            onClick={onAddPost}
            className="flex items-center gap-2 px-6 py-3 bg-[#2383E2] text-white rounded-2xl text-sm font-bold hover:bg-[#1D6EB8] transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" />
            Create Post
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] p-5 rounded-3xl shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest">
                {stat.label}
              </span>
              <span className="text-2xl font-black text-[#37352F] dark:text-[#EBE9ED]">
                {stat.value}
              </span>
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
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-3xl shadow-sm overflow-hidden h-full flex flex-col"
          >
            <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F7F7F5]/50 dark:bg-[#2E2E2E]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-[#2383E2]" />
                </div>
                <h3 className="font-black text-lg">Today's Schedule</h3>
              </div>
              <button 
                onClick={() => setActiveTab('schedule')}
                className="px-4 py-2 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl text-xs font-bold text-[#2383E2] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-all flex items-center gap-2 shadow-sm"
              >
                View Calendar <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-6 flex-1">
              {todayPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayPosts.map(post => (
                    <div key={post.id} className="flex items-center gap-4 p-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-2xl border border-[#E9E9E7] dark:border-[#3E3E3E] hover:border-[#2383E2] transition-colors group cursor-pointer">
                      <div className="w-16 h-16 rounded-xl bg-white dark:bg-[#1E1E1E] flex items-center justify-center border border-[#E9E9E7] dark:border-[#3E3E3E] shrink-0 overflow-hidden shadow-sm">
                        {post.images && post.images[0] ? (
                          <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <MessageSquare className="w-6 h-6 text-[#787774]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black truncate group-hover:text-[#2383E2] transition-colors">{post.title}</h4>
                        <p className="text-xs text-[#787774] dark:text-[#9B9A97] line-clamp-2 mt-1">{post.caption}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                           <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Scheduled for Today</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <div className="w-20 h-20 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full flex items-center justify-center mb-4">
                    <CalendarIcon className="w-10 h-10 text-[#787774]/30" />
                  </div>
                  <h4 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED] mb-2">Clear Schedule</h4>
                  <p className="text-sm text-[#787774] dark:text-[#9B9A97] max-w-xs mx-auto mb-6">No posts scheduled for today. Use the AI Studio to generate some fresh content!</p>
                  {isAdmin && (
                    <button 
                      onClick={onAddPost}
                      className="px-6 py-3 bg-[#2383E2] text-white rounded-2xl text-sm font-bold hover:bg-[#1D6EB8] transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
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
            <h3 className="text-xs font-black text-[#787774] dark:text-[#9B9A97] uppercase tracking-[0.2em] px-1">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => setActiveTab('creative')}
                className="p-5 bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-3xl shadow-sm hover:border-[#2383E2] hover:shadow-md transition-all flex items-center gap-4 group text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <span className="block text-sm font-black">AI Studio</span>
                  <span className="text-xs text-[#787774] dark:text-[#9B9A97]">Generate new content</span>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-[#787774] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </button>
              <button 
                onClick={() => setActiveTab('ideas')}
                className="p-5 bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-3xl shadow-sm hover:border-[#2383E2] hover:shadow-md transition-all flex items-center gap-4 group text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <span className="block text-sm font-black">Ideas Bank</span>
                  <span className="text-xs text-[#787774] dark:text-[#9B9A97]">Browse inspiration</span>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-[#787774] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
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
            <h3 className="text-xs font-black text-[#787774] dark:text-[#9B9A97] uppercase tracking-[0.2em] px-1">Upcoming</h3>
            <div className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-3xl shadow-sm overflow-hidden divide-y divide-[#E9E9E7] dark:divide-[#2E2E2E]">
              {upcomingPosts.length > 0 ? (
                upcomingPosts.map(post => (
                  <div key={post.id} className="p-4 flex items-center justify-between group cursor-pointer hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#2383E2] uppercase tracking-wider">{format(parseISO(post.date), 'MMM d')}</span>
                      <span className="text-sm font-bold truncate max-w-[180px] mt-0.5">{post.title}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                      <ArrowRight className="w-4 h-4 text-[#787774]" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs font-bold text-[#787774] dark:text-[#9B9A97]">No upcoming posts.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
