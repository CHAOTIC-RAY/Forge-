import { create } from 'zustand';
import { Post, Business } from './data';
import { HighStockProduct } from './lib/gemini';

export interface AppState {
  aiSettings: any;
  setAiSettings: (settings: any) => void;
  
  analyticsSettings: any;
  setAnalyticsSettings: (settings: any) => void;

  businesses: Business[];
  setBusinesses: (businesses: Business[]) => void;
  
  activeBusiness: Business | null;
  setActiveBusiness: (biz: Business | null) => void;

  posts: Post[];
  setPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => void;
  
  brandKit: any;
  setBrandKit: (bk: any) => void;
  
  products: HighStockProduct[];
  setProducts: (products: HighStockProduct[]) => void;
  
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  aiSettings: null,
  setAiSettings: (settings) => set({ aiSettings: settings }),

  analyticsSettings: null,
  setAnalyticsSettings: (settings) => set({ analyticsSettings: settings }),

  businesses: [],
  setBusinesses: (businesses) => set({ businesses }),

  activeBusiness: null,
  setActiveBusiness: (biz) => set({ activeBusiness: biz }),

  posts: [],
  setPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => set((state) => ({ 
    posts: typeof posts === 'function' ? posts(state.posts) : posts 
  })),

  brandKit: null,
  setBrandKit: (brandKit) => set({ brandKit }),

  products: [],
  setProducts: (products) => set({ products }),

  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
