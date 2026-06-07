import { create } from 'zustand';

export interface AppState {
  aiSettings: any;
  setAiSettings: (settings: any) => void;
  analyticsSettings: any;
  setAnalyticsSettings: (settings: any) => void;
  businesses: any[];
  setBusinesses: (businesses: any[]) => void;
  activeBusiness: any;
  setActiveBusiness: (business: any) => void;
  brandKit: any;
  setBrandKit: (brandKit: any) => void;
  products: any[];
  setProducts: (products: any[] | ((prev: any[]) => any[])) => void;
  posts: any[];
  setPosts: (posts: any[] | ((prev: any[]) => any[])) => void;
  isSyncing: boolean;
  setIsSyncing: (isSyncing: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  aiSettings: null,
  setAiSettings: (aiSettings) => set({ aiSettings }),
  analyticsSettings: null,
  setAnalyticsSettings: (analyticsSettings) => set({ analyticsSettings }),
  businesses: [],
  setBusinesses: (businesses) => set({ businesses }),
  activeBusiness: null,
  setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
  brandKit: null,
  setBrandKit: (brandKit) => set({ brandKit }),
  products: [],
  setProducts: (products) => set((state) => ({ 
    products: typeof products === 'function' ? (products as any)(state.products) : products 
  })),
  posts: [],
  setPosts: (posts) => set((state) => ({ 
    posts: typeof posts === 'function' ? (posts as any)(state.posts) : posts 
  })),
  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
