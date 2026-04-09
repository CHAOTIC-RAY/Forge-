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
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-0 max-w-4xl mx-auto w-full">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED]">
          {greeting || `Welcome back, ${user?.displayName || 'User'}`}
        </h2>
        <p className="text-sm text-[#787774] dark:text-[#9B9A97]">
          {activeBusiness ? `Managing workspace: ${activeBusiness.name}` : "Here's what's happening with your brand today."}
        </p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] p-3 md:p-4 rounded-2xl shadow-sm flex flex-col gap-2"
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] md:text-xs font-medium text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
                {stat.label}
              </span>
              <span className="text-sm md:text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">
                {stat.value}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#2383E2]" />
            <h3 className="font-bold text-sm">Today's Schedule</h3>
          </div>
          <button 
            onClick={() => setActiveTab('schedule')}
            className="text-[10px] font-bold text-[#2383E2] hover:underline flex items-center gap-1"
          >
            View Calendar <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-4">
          {todayPosts.length > 0 ? (
            <div className="space-y-3">
              {todayPosts.map(post => (
                <div key={post.id} className="flex items-center gap-3 p-3 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-xl border border-[#E9E9E7] dark:border-[#3E3E3E]">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#1E1E1E] flex items-center justify-center border border-[#E9E9E7] dark:border-[#3E3E3E] shrink-0 overflow-hidden">
                    {post.images && post.images[0] ? (
                      <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-[#787774]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold truncate">{post.title}</h4>
                    <p className="text-[10px] text-[#787774] dark:text-[#9B9A97] truncate">{post.caption}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 rounded-full shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="text-[9px] font-bold">Today</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full flex items-center justify-center mb-3">
                <CalendarIcon className="w-6 h-6 text-[#787774]" />
              </div>
              <p className="text-xs font-medium text-[#787774] dark:text-[#9B9A97] mb-4">No posts scheduled for today.</p>
              {isAdmin && (
                <button 
                  onClick={onAddPost}
                  className="px-4 py-2 bg-[#2383E2] text-white rounded-lg text-xs font-bold hover:bg-[#1D6EB8] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Post
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions & Upcoming */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h3 className="text-xs font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest px-1">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setActiveTab('creative')}
              className="p-4 bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl shadow-sm hover:border-[#2383E2] transition-colors flex flex-col gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold">AI Studio</span>
                <span className="text-[10px] text-[#787774] dark:text-[#9B9A97]">Generate new content</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('ideas')}
              className="p-4 bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl shadow-sm hover:border-[#2383E2] transition-colors flex flex-col gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lightbulb className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold">Ideas Bank</span>
                <span className="text-[10px] text-[#787774] dark:text-[#9B9A97]">Browse inspiration</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Upcoming */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <h3 className="text-xs font-bold text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest px-1">Upcoming</h3>
          <div className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl shadow-sm divide-y divide-[#E9E9E7] dark:divide-[#2E2E2E]">
            {upcomingPosts.length > 0 ? (
              upcomingPosts.map(post => (
                <div key={post.id} className="p-3 flex items-center justify-between group cursor-pointer hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#2383E2]">{format(parseISO(post.date), 'MMM d')}</span>
                    <span className="text-xs font-medium truncate max-w-[150px]">{post.title}</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-[#787774]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-[10px] text-[#787774] dark:text-[#9B9A97]">No upcoming posts.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
