import React, { useState, useEffect, useRef } from 'react';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { 
  Palette, Type, Image as ImageIcon, Upload, Save, Trash2, 
  Plus, Download, LayoutTemplate, Tag, Globe, Settings2,
  ChevronDown, ChevronUp, X, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Search as SearchIcon,
  PenTool, Copy, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Business, Post, PRODUCT_CATEGORIES, OUTLETS } from '../data';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  query,
  collection,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { scrapeBuyRainbow, HighStockProduct } from '../lib/gemini';

interface BrandKit {
  colors: { name: string; hex: string }[];
  fonts: { heading: string; body: string };
  logos: string[];
  designs: string[];
}

const defaultBrandKit: BrandKit = {
  colors: [
    { name: 'Primary', hex: '#2665fd' },
    { name: 'Secondary', hex: '#6074b9' },
    { name: 'Accent', hex: '#bd3800' },
  ],
  fonts: { heading: 'Inter', body: 'Inter' },
  logos: [],
  designs: [],
};

interface Category {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

interface BrandKitTabProps {
  activeBusiness: Business | null;
  posts: Post[];
  aiSettings: any;
}

export function BrandKitTab({ activeBusiness, posts, aiSettings }: BrandKitTabProps) {
  const [brandKit, setBrandKit] = useState<BrandKit>(defaultBrandKit);
  const [categories, setCategories] = useState<Category[]>([]);
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; onConfirm: () => Promise<void> | void } | null>(null);
  const autoSynced = useRef<string | null>(null);
  
  const scrapFromWeb = async () => {
    if (!activeBusiness?.id) return;
    if (!aiSettings?.targetUrl) {
      toast.error("Please set a Target Website URL in Settings first.");
      return;
    }

    setIsScraping(true);
    try {
      toast.info(`Scraping categories from ${aiSettings.targetUrl}...`);
      
      // Scrape "All Products" to get a broad range of categories
      const { products, logs } = await scrapeBuyRainbow("All Products");
      
      if (products.length === 0) {
        toast.error("No products or categories found on the target website.");
        return;
      }

      const foundCategories = new Set<string>();
      products.forEach(p => {
        if (p.type) foundCategories.add(p.type.trim());
      });

      const existingNames = new Set(categories.map(c => `${c.type}:${c.name}`));
      const newCats: Category[] = [];

      foundCategories.forEach(name => {
        if (!existingNames.has(`category:${name}`)) {
          newCats.push({ id: uuidv4(), name, type: 'category', enabled: true });
        }
      });

      if (newCats.length === 0) {
        toast.info("No new categories found on the website.");
        return;
      }

      const updatedCategories = [...categories, ...newCats];
      setCategories(updatedCategories);

      await setDoc(doc(db, 'categories', activeBusiness.id), { 
        categories: updatedCategories
      }, { merge: true });

      toast.success(`Successfully scraped ${newCats.length} new categories!`);
    } catch (error) {
      console.error("Scraping failed:", error);
      toast.error("Failed to scrape from web.");
    } finally {
      setIsScraping(false);
    }
  };
  
  const syncFromCalendar = async () => {
    if (!activeBusiness?.id) return;
    setIsSyncing(true);
    try {
      // Use the posts prop instead of querying Firestore
      const businessPosts = posts.filter(p => p.businessId === activeBusiness.id);
      
      const foundCategories = new Set<string>();
      const foundOutlets = new Set<string>();
      const foundCampaigns = new Set<string>();
      const foundFormats = new Set<string>();
      const foundPlatforms = new Set<string>();

      businessPosts.forEach(post => {
        if (post.productCategory) foundCategories.add(post.productCategory.trim());
        if (post.outlet) foundOutlets.add(post.outlet.trim());
        if (post.campaignType) {
          // Normalize campaign types to match display names if they are the standard ones
          const ct = post.campaignType.toLowerCase();
          if (ct === 'non-boosted') foundCampaigns.add('Non-Boosted');
          else if (ct === 'boosted') foundCampaigns.add('Boosted');
          else if (ct === 'campaign') foundCampaigns.add('Campaign');
          else foundCampaigns.add(post.campaignType.trim());
        }
        if (post.type) foundFormats.add(post.type.trim());
        if (post.platforms && Array.isArray(post.platforms)) {
          post.platforms.forEach((p: string) => foundPlatforms.add(p.toLowerCase().trim()));
        }
      });

      const existingNames = new Set(categories.map(c => `${c.type}:${c.name}`));
      const newCats: Category[] = [];

      foundCategories.forEach(name => {
        if (!existingNames.has(`category:${name}`)) {
          newCats.push({ id: uuidv4(), name, type: 'category', enabled: true });
        }
      });
      foundOutlets.forEach(name => {
        if (!existingNames.has(`outlet:${name}`)) {
          newCats.push({ id: uuidv4(), name, type: 'outlet', enabled: true });
        }
      });
      foundCampaigns.forEach(name => {
        if (!existingNames.has(`campaign:${name}`)) {
          newCats.push({ id: uuidv4(), name, type: 'campaign', enabled: true });
        }
      });
      foundFormats.forEach(name => {
        if (!existingNames.has(`type:${name}`)) {
          newCats.push({ id: uuidv4(), name, type: 'type', enabled: true });
        }
      });

      const updatedPlatforms = [...targetPlatforms];
      let platformsChanged = false;
      foundPlatforms.forEach(p => {
        if (!updatedPlatforms.includes(p)) {
          updatedPlatforms.push(p);
          platformsChanged = true;
        }
      });

      if (newCats.length === 0 && !platformsChanged) {
        toast.info("No new categories or platforms found in calendar.");
        return;
      }

      const updatedCategories = [...categories, ...newCats];
      setCategories(updatedCategories);
      if (platformsChanged) setTargetPlatforms(updatedPlatforms);

      await setDoc(doc(db, 'categories', activeBusiness.id), { 
        categories: updatedCategories,
        targetPlatforms: updatedPlatforms
      }, { merge: true });

      toast.success(`Synced ${newCats.length} new items and ${foundPlatforms.size} platforms from calendar.`);
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Failed to sync from calendar.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (activeBusiness && categories.length === 0 && !isSyncing && autoSynced.current !== activeBusiness.id) {
      const timer = setTimeout(() => {
        if (categories.length === 0) {
          syncFromCalendar();
          autoSynced.current = activeBusiness.id;
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeBusiness, categories.length]);

  // UI State
  const [activeSection, setActiveSection] = useState<'identity' | 'workspace'>('identity');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#2665fd');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('category');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryType, setSelectedCategoryType] = useState<'category' | 'outlet' | 'campaign' | 'type'>('category');
  const [dataTitles, setDataTitles] = useState<Record<string, string>>({
    category: 'Product Categories',
    outlet: 'Outlets / Locations',
    campaign: 'Campaign Types',
    type: 'Content Formats'
  });
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  // Load Brand Kit & Categories
  useEffect(() => {
    if (!activeBusiness) return;

    // Load Brand Kit
    const brandKitRef = doc(db, 'brand_kits', activeBusiness.id);
    const unsubBrandKit = onSnapshot(brandKitRef, (docSnap) => {
      if (docSnap.exists()) {
        setBrandKit(docSnap.data() as BrandKit);
      } else {
        setBrandKit(defaultBrandKit);
      }
    }, (error) => {
      console.error("[BrandKit] onSnapshot error:", error);
    });

    // Load Categories & Platforms
    const categoriesRef = doc(db, 'categories', activeBusiness.id);
    const unsubCategories = onSnapshot(categoriesRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCategories(data.categories || []);
        setTargetPlatforms(data.targetPlatforms || ['instagram', 'facebook', 'viber', 'tiktok']);
        if (data.titles) {
          setDataTitles(prev => ({ ...prev, ...data.titles }));
        }
      } else {
        setCategories([]);
        setTargetPlatforms(['instagram', 'facebook', 'viber', 'tiktok']);
      }
    }, (error) => {
      console.error("[Categories] onSnapshot error:", error);
    });

    return () => {
      unsubBrandKit();
      unsubCategories();
    };
  }, [activeBusiness]);

  const saveTitles = async (newTitles: Record<string, string>) => {
    if (!activeBusiness?.id) return;
    try {
      await setDoc(doc(db, 'categories', activeBusiness.id), { 
        titles: newTitles
      }, { merge: true });
      toast.success('Data type labels updated');
    } catch (e) {
      console.error("Error saving titles", e);
      toast.error('Failed to save labels');
    }
  };

  const handleSaveBrandKit = async () => {
    if (!activeBusiness) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'brand_kits', activeBusiness.id), brandKit);
      toast.success('Brand Identity saved!');
    } catch (error) {
      toast.error('Failed to save Brand Identity');
    } finally {
      setIsSaving(false);
    }
  };

  const addColor = () => {
    if (!newColorName || !newColorHex) return;
    setBrandKit({
      ...brandKit,
      colors: [...brandKit.colors, { name: newColorName, hex: newColorHex }]
    });
    setNewColorName('');
    setNewColorHex('#2665fd');
  };

  const removeColor = (index: number) => {
    const newColors = [...brandKit.colors];
    newColors.splice(index, 1);
    setBrandKit({ ...brandKit, colors: newColors });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logos' | 'designs') => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandKit(prev => ({
          ...prev,
          [type]: [...prev[type], reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number, type: 'logos' | 'designs') => {
    const newImages = [...brandKit[type]];
    newImages.splice(index, 1);
    setBrandKit({ ...brandKit, [type]: newImages });
  };

  // Category Management
  const addCategory = async () => {
    if (!newCategoryName.trim() || !activeBusiness?.id) return;
    const newCat: Category = { 
      id: uuidv4(), 
      name: newCategoryName.trim(), 
      type: newCategoryType, 
      enabled: true
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    setNewCategoryName('');
    await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });
    toast.success(`Added ${newCategoryName}`);
  };

  const updateCategory = async (id: string, newName: string) => {
    if (!activeBusiness?.id) return;
    const oldCat = categories.find(c => c.id === id);
    if (!oldCat) return;
    const oldName = oldCat.name;

    const updated = categories.map(c => c.id === id ? { ...c, name: newName } : c);
    setCategories(updated);
    await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });

    if (oldName !== newName) {
      try {
        const q = query(collection(db, 'posts'), where('businessId', '==', activeBusiness.id));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        let count = 0;
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          let changed = false;
          const updates: any = {};
          if (oldCat.type === 'category' && data.productCategory === oldName) {
            updates.productCategory = newName;
            changed = true;
          }
          if (oldCat.type === 'outlet' && data.outlet === oldName) {
            updates.outlet = newName;
            changed = true;
          }
          if (oldCat.type === 'campaign' && data.campaignType === oldName) {
            updates.campaignType = newName;
            changed = true;
          }
          if (oldCat.type === 'type' && data.type === oldName) {
            updates.type = newName;
            changed = true;
          }
          if (changed) {
            batch.update(docSnap.ref, updates);
            count++;
          }
        });
        if (count > 0) await batch.commit();
      } catch (error) {
        console.error("Failed to update posts:", error);
      }
    }
  };

  const deleteCategory = async (id: string) => {
    if (!activeBusiness?.id) return;
    const catToDelete = categories.find(c => c.id === id);
    if (!catToDelete) return;
    const oldName = catToDelete.name;

    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });

    try {
      const q = query(collection(db, 'posts'), where('businessId', '==', activeBusiness.id));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        let changed = false;
        const updates: any = {};
        if (catToDelete.type === 'category' && data.productCategory === oldName) {
          updates.productCategory = '';
          changed = true;
        }
        if (catToDelete.type === 'outlet' && data.outlet === oldName) {
          updates.outlet = '';
          changed = true;
        }
        if (catToDelete.type === 'campaign' && data.campaignType === oldName) {
          updates.campaignType = '';
          changed = true;
        }
        if (catToDelete.type === 'type' && data.type === oldName) {
          updates.type = '';
          changed = true;
        }
        if (changed) {
          batch.update(docSnap.ref, updates);
          count++;
        }
      });
      if (count > 0) await batch.commit();
    } catch (error) {
      console.error("Failed to clear post fields:", error);
    }

    toast.success('Category removed');
  };

  const toggleCategory = async (id: string) => {
    if (!activeBusiness?.id) return;
    const updated = categories.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c);
    setCategories(updated);
    await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });
  };

  // Platform Management
  const addTargetPlatform = async (platform: string) => {
    if (!platform.trim() || !activeBusiness?.id || targetPlatforms.includes(platform.trim().toLowerCase())) return;
    const updated = [...targetPlatforms, platform.trim().toLowerCase()];
    setTargetPlatforms(updated);
    await setDoc(doc(db, 'categories', activeBusiness.id), { targetPlatforms: updated }, { merge: true });
  };

  const removeTargetPlatform = async (platform: string) => {
    if (!activeBusiness?.id) return;
    const updated = targetPlatforms.filter(p => p !== platform);
    setTargetPlatforms(updated);
    await setDoc(doc(db, 'categories', activeBusiness.id), { targetPlatforms: updated }, { merge: true });
  };

  const populateDefaultCategories = async (isReset = false) => {
    if (!activeBusiness?.id) return;
    
    // If it's a reset, we clear everything first
    let currentCategories = isReset ? [] : [...categories];
    
    const isRainbow = activeBusiness.name.toLowerCase().includes('rainbow');
    const defaultOutlets = isRainbow 
      ? ['Rainbow Enterprises', 'Rainbow Living Mall', 'Rainbow Office System', 'Rainbow Buildware', 'Rainbow Thinadhoo', 'Rainbow Addu', 'Rainbow Online']
      : OUTLETS; // Use the new OUTLETS from data.ts

    const additionalCategories = PRODUCT_CATEGORIES.filter(cat => cat !== "All Products");

    const defaultCategories = [
      ...additionalCategories.map(name => ({ id: uuidv4(), name, type: 'category', enabled: true })),
      ...defaultOutlets.map(name => ({ id: uuidv4(), name, type: 'outlet', enabled: true })),
      { id: uuidv4(), name: 'Non-Boosted', type: 'campaign', enabled: true },
      { id: uuidv4(), name: 'Boosted', type: 'campaign', enabled: true },
      { id: uuidv4(), name: 'Campaign', type: 'campaign', enabled: true },
      { id: uuidv4(), name: 'Post', type: 'type', enabled: true },
      { id: uuidv4(), name: 'Reel', type: 'type', enabled: true },
      { id: uuidv4(), name: 'Story', type: 'type', enabled: true }
    ];

    const existingNames = new Set(currentCategories.map(c => `${c.type}:${c.name}`));
    const newCategories = defaultCategories.filter(c => !existingNames.has(`${c.type}:${c.name}`));
    
    if (newCategories.length === 0 && !isReset) {
      toast.info("All default categories already exist.");
      return;
    }

    const updated = [...currentCategories, ...newCategories];
    setCategories(updated);
    await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });
    
    if (isReset) {
      toast.success("Categories reset to Rainbow defaults.");
    } else {
      toast.success(`Added ${newCategories.length} default categories.`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F7F5] dark:bg-[#191919]">
      {/* Header */}
      <div className="hidden md:block p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#2665fd]/10 rounded-2xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-[#2665fd]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                Brand Kit & Workspace Settings
              </h2>
              <p className="text-sm text-[#787774] dark:text-[#9B9A97] mt-1">
                Manage your brand identity and workspace configuration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeSection === 'identity' && (
              <button
                onClick={handleSaveBrandKit}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[#2665fd] text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Identity
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Desktop) */}
        <div className="flex items-center gap-1 p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-xl w-fit border border-[#E9E9E7] dark:border-[#2E2E2E]">
          <button
            onClick={() => setActiveSection('identity')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'identity' 
                ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] shadow-sm border border-[#E9E9E7] dark:border-[#3E3E3E]" 
                : "text-[#787774] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            Brand Identity
          </button>
          <button
            onClick={() => setActiveSection('workspace')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'workspace' 
                ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] shadow-sm border border-[#E9E9E7] dark:border-[#3E3E3E]" 
                : "text-[#787774] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Workspace Config
          </button>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="md:hidden flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
            <button
              onClick={() => setActiveSection('identity')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                activeSection === 'identity' 
                  ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] shadow-sm" 
                  : "text-[#787774]"
              )}
            >
              Identity
            </button>
            <button
              onClick={() => setActiveSection('workspace')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                activeSection === 'workspace' 
                  ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] shadow-sm" 
                  : "text-[#787774]"
              )}
            >
              Workspace
            </button>
          </div>
          {activeSection === 'identity' && (
            <button
              onClick={handleSaveBrandKit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2665fd] text-white rounded-xl text-[10px] font-bold shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeSection === 'identity' ? (
            <motion.div
              key="identity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full"
            >
              {/* Colors Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Palette className="w-5 h-5 text-[#2665fd]" />
                  <h3 className="text-base font-bold">Brand Colors</h3>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {brandKit.colors.map((color, idx) => (
                      <div key={idx} className="group relative bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:border-[#2665fd]">
                        <div 
                          className="w-12 h-12 rounded-full border border-white dark:border-[#3E3E3E] shadow-sm"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="text-center">
                          <p className="text-xs font-bold truncate max-w-[80px]">{color.name}</p>
                          <p className="text-[10px] text-[#787774] font-mono">{color.hex.toUpperCase()}</p>
                        </div>
                        <button
                          onClick={() => removeColor(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Color Name"
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        className="flex-1 px-4 py-2 text-sm font-medium bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl outline-none focus:border-[#2665fd] transition-all"
                      />
                      <div className="relative w-10 h-10 shrink-0">
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div 
                          className="w-full h-full rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]"
                          style={{ backgroundColor: newColorHex }}
                        />
                      </div>
                      <button
                        onClick={addColor}
                        disabled={!newColorName}
                        className="p-2.5 bg-[#2665fd] text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Type className="w-5 h-5 text-[#2665fd]" />
                  <h3 className="text-base font-bold">Typography</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#787774] dark:text-[#9B9A97] mb-2 uppercase tracking-wider">Heading Font</label>
                    <select
                      value={brandKit.fonts.heading}
                      onChange={(e) => setBrandKit({ ...brandKit, fonts: { ...brandKit.fonts, heading: e.target.value } })}
                      className="w-full px-4 py-2.5 text-sm font-bold bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl outline-none focus:border-[#2665fd] transition-all"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Outfit">Outfit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#787774] dark:text-[#9B9A97] mb-2 uppercase tracking-wider">Body Font</label>
                    <select
                      value={brandKit.fonts.body}
                      onChange={(e) => setBrandKit({ ...brandKit, fonts: { ...brandKit.fonts, body: e.target.value } })}
                      className="w-full px-4 py-2.5 text-sm font-bold bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl outline-none focus:border-[#2665fd] transition-all"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                    </select>
                  </div>
                  <div className="mt-6 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <p className="text-xs font-bold text-[#787774] mb-2">Preview</p>
                    <h4 style={{ fontFamily: brandKit.fonts.heading }} className="text-lg font-bold mb-1">The quick brown fox</h4>
                    <p style={{ fontFamily: brandKit.fonts.body }} className="text-sm">Jumps over the lazy dog.</p>
                  </div>
                </div>
              </div>

              {/* Logos Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#2665fd]" />
                    <h3 className="text-base font-bold">Logos</h3>
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#2665fd]/10 text-[#2665fd] rounded-lg text-xs font-bold hover:bg-[#2665fd]/20 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logos')} />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {brandKit.logos.map((logo, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden bg-[#F7F7F5] dark:bg-[#202020] flex items-center justify-center p-4 hover:border-[#2665fd] transition-all">
                      <img src={logo} alt={`Logo ${idx}`} className="max-w-full max-h-full object-contain" />
                      <button
                        onClick={() => removeImage(idx, 'logos')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {brandKit.logos.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                      <ImageIcon className="w-8 h-8 text-[#9B9A97] mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold text-[#787774]">No logos uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assets Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-[#2665fd]" />
                    <h3 className="text-base font-bold">Brand Assets</h3>
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#2665fd]/10 text-[#2665fd] rounded-lg text-xs font-bold hover:bg-[#2665fd]/20 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'designs')} />
                  </label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {brandKit.designs.map((design, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden bg-[#F7F7F5] dark:bg-[#202020] hover:border-[#2665fd] transition-all">
                      <img src={design} alt={`Asset ${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx, 'designs')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {brandKit.designs.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                      <LayoutTemplate className="w-8 h-8 text-[#9B9A97] mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold text-[#787774]">No assets uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 w-full"
            >
              {/* Platforms Section */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#2665fd]" />
                    <h3 className="text-base font-bold">Target Platforms</h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#787774] uppercase tracking-widest bg-[#F7F7F5] dark:bg-[#202020] px-2 py-1 rounded border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    {targetPlatforms.length} / 5
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {targetPlatforms.map((platform, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl group hover:border-[#2665fd] transition-all">
                      <span className="text-sm font-bold capitalize">{platform}</span>
                      <button 
                        onClick={() => removeTargetPlatform(platform)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {targetPlatforms.length < 5 && (
                    <input 
                      type="text"
                      placeholder="Add platform... (Enter)"
                      className="px-4 py-2 text-sm font-bold bg-white dark:bg-[#1A1A1A] border border-dashed border-[#D9D9D7] dark:border-[#3E3E3E] rounded-xl outline-none focus:border-[#2665fd] transition-all w-48"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTargetPlatform((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Categories Section */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-white dark:bg-[#1A1A1A]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2665fd]/10 rounded-xl flex items-center justify-center">
                      <Tag className="w-5 h-5 text-[#2665fd]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">Category Editor</h3>
                      <p className="text-[10px] text-[#787774] font-medium">Manage your workspace metadata</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={scrapFromWeb}
                      disabled={isScraping}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2665fd] text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                      {isScraping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                      Scrap from Web
                    </button>
                    <button
                      onClick={() => {
                        setConfirmAction({
                          type: 'Clear all categories',
                          onConfirm: async () => {
                            setCategories([]);
                            await setDoc(doc(db, 'categories', activeBusiness!.id), { categories: [] }, { merge: true });
                            toast.success('All categories cleared');
                          }
                        });
                      }}
                      className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/20"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="flex h-[600px]">
                  {/* Sidebar Navigation */}
                  <div className="w-64 border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#1A1A1A] p-4 space-y-2">
                    <p className="text-[10px] font-black text-[#787774] dark:text-[#9B9A97] uppercase tracking-widest mb-4 px-2">Data Types</p>
                    {[
                      { id: 'category', label: dataTitles.category, icon: Tag },
                      { id: 'outlet', label: dataTitles.outlet, icon: Globe },
                      { id: 'campaign', label: dataTitles.campaign, icon: Sparkles },
                      { id: 'type', label: dataTitles.type, icon: LayoutTemplate },
                    ].map(type => (
                      <div key={type.id} className="group/item relative">
                        <button
                          onClick={() => setSelectedCategoryType(type.id as any)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                            selectedCategoryType === type.id
                              ? "bg-white dark:bg-[#2E2E2E] text-[#2665fd] shadow-sm border border-[#E9E9E7] dark:border-[#3E3E3E]"
                              : "text-[#787774] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                          )}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <type.icon className={cn("w-4 h-4 shrink-0", selectedCategoryType === type.id ? "text-[#2665fd]" : "text-[#787774]")} />
                            {editingTitle === type.id ? (
                              <input
                                autoFocus
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onBlur={() => {
                                  if (tempTitle && tempTitle !== type.label) {
                                    const newTitles = { ...dataTitles, [type.id]: tempTitle };
                                    setDataTitles(newTitles);
                                    saveTitles(newTitles);
                                  }
                                  setEditingTitle(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (tempTitle && tempTitle !== type.label) {
                                      const newTitles = { ...dataTitles, [type.id]: tempTitle };
                                      setDataTitles(newTitles);
                                      saveTitles(newTitles);
                                    }
                                    setEditingTitle(null);
                                  }
                                  if (e.key === 'Escape') setEditingTitle(null);
                                }}
                                className="bg-transparent border-none outline-none text-[#2665fd] w-full p-0"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="truncate">{type.label}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold opacity-50">
                              {categories.filter(c => c.type === type.id).length}
                            </span>
                            {!editingTitle && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTitle(type.id);
                                  setTempTitle(type.label);
                                }}
                                className="p-1 opacity-0 group-hover/item:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-all"
                              >
                                <PenTool className="w-3 h-3 text-[#787774]" />
                              </button>
                            )}
                          </div>
                        </button>
                      </div>
                    ))}

                    <div className="mt-8 pt-8 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Quick Tip</p>
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                          Categories help the AI generate more relevant posts for your business.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col bg-white dark:bg-[#1A1A1A]">
                    {/* Search and Add Bar */}
                    <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787774]" />
                          <input
                            type="text"
                            placeholder="Search items..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl text-sm font-medium outline-none focus:border-[#2665fd] transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Add new..."
                            value={newCategoryName}
                            onChange={(e) => {
                              setNewCategoryName(e.target.value);
                              setNewCategoryType(selectedCategoryType);
                            }}
                            className="w-48 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl text-sm font-bold outline-none focus:border-[#2665fd] transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                          />
                          <button
                            onClick={addCategory}
                            disabled={!newCategoryName}
                            className="p-2 bg-[#2665fd] text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {categories
                          .filter(c => c.type === selectedCategoryType)
                          .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map(cat => {
                            const contextMenuItems: ContextMenuItem[] = [
                              { 
                                label: cat.enabled ? 'Disable' : 'Enable', 
                                icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
                                onClick: () => toggleCategory(cat.id) 
                              },
                              { 
                                label: 'Duplicate', 
                                icon: <Layers className="w-3.5 h-3.5" />, 
                                onClick: () => {
                                  const newCat = { ...cat, id: uuidv4(), name: `${cat.name} (Copy)` };
                                  const newCats = [...categories, newCat];
                                  setCategories(newCats);
                                  setDoc(doc(db, 'categories', activeBusiness!.id), { categories: newCats }, { merge: true });
                                  toast.success("Duplicated successfully");
                                }
                              },
                              { 
                                label: 'Copy Name', 
                                icon: <Copy className="w-3.5 h-3.5" />, 
                                onClick: () => {
                                  navigator.clipboard.writeText(cat.name);
                                  toast.success("Name copied!");
                                }
                              },
                              { 
                                label: 'Delete', 
                                icon: <Trash2 className="w-3.5 h-3.5" />, 
                                variant: 'danger', 
                                onClick: () => deleteCategory(cat.id) 
                              },
                            ];

                            return (
                              <ContextMenu key={cat.id} items={contextMenuItems}>
                                <div className="bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl p-3 hover:border-[#2665fd] transition-all group shadow-sm hover:shadow-md">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="relative flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          id={`cat-${cat.id}`}
                                          checked={cat.enabled}
                                          onChange={() => toggleCategory(cat.id)}
                                          className="peer appearance-none w-4 h-4 rounded-md border-2 border-[#E9E9E7] dark:border-[#2E2E2E] checked:bg-[#2665fd] checked:border-[#2665fd] transition-all cursor-pointer"
                                        />
                                        <CheckCircle2 className="w-2.5 h-2.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                      </div>
                                      <input
                                        type="text"
                                        value={cat.name}
                                        onChange={(e) => updateCategory(cat.id, e.target.value)}
                                        className={cn(
                                          "flex-1 bg-transparent text-xs font-bold outline-none focus:text-[#2665fd] transition-colors",
                                          !cat.enabled && "text-[#787774] opacity-50"
                                        )}
                                      />
                                    </div>
                                    <button 
                                      onClick={() => deleteCategory(cat.id)}
                                      className="p-1 text-[#787774] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </ContextMenu>
                            );
                          })}
                        
                        {categories.filter(c => c.type === selectedCategoryType).length === 0 && (
                          <div className="col-span-full py-12 text-center">
                            <Tag className="w-8 h-8 text-[#787774]/20 mx-auto mb-2" />
                            <p className="text-xs font-bold text-[#787774]">No items in this category</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-[#191919] rounded-2xl shadow-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] w-full max-w-md p-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
              <p className="text-sm text-[#787774] dark:text-[#9B9A97] mb-6">
                Are you sure you want to {confirmAction.type.toLowerCase()}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await confirmAction.onConfirm();
                    setConfirmAction(null);
                  }}
                  className="px-6 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
