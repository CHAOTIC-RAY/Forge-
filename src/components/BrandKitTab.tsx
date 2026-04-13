import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { 
  Palette, Type, Image as ImageIcon, Upload, Save, Trash2, 
  Plus, Download, LayoutTemplate, Tag, Globe, Settings2,
  ChevronDown, ChevronUp, X, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Search as SearchIcon,
  PenTool, Copy, Layers, Target
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { scrapeWooCommerce, HighStockProduct } from '../lib/gemini';
import { 
  doc, 
  setDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  writeBatch, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { Post, Business, OUTLETS, PRODUCT_CATEGORIES } from '../data';

interface BrandKit {
  colors: { name: string; hex: string }[];
  fonts: { heading: string; body: string };
  logos: string[];
  designs: string[];
  customFonts?: { name: string; url: string; format: string }[];
  designGuide?: string; // Markdown content
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
  customFonts: [],
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
      const { products, logs } = await scrapeWooCommerce("All Products", undefined, undefined, activeBusiness || undefined);
      
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
  const [activeSection, setActiveSection] = useState<'identity' | 'workspace' | 'designs'>('identity');
  const [uploadedPostImages, setUploadedPostImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPostImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedImage = (index: number) => {
    setUploadedPostImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSyncDesignGuide = async () => {
    if (!activeBusiness?.id) return;
    setIsSaving(true);
    try {
      const { generateTextWithCascade, isGeminiKeyAvailable, fetchServerConfig, analyzeDesignImages } = await import('../lib/gemini');
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }

      let imageAnalysis = '';
      if (uploadedPostImages.length > 0) {
        toast.info(`Analyzing ${uploadedPostImages.length} uploaded images...`);
        imageAnalysis = await analyzeDesignImages(uploadedPostImages, activeBusiness);
      }

      // Get recent high-quality posts
      const recentPosts = [...posts]
        .filter(p => (p.caption && p.caption.length > 20) || p.postcardData)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10);

      const postContext = recentPosts.map(post => `
        Title: ${post.title}
        Type: ${post.type} | Outlet: ${post.outlet}
        Caption: ${post.caption}
        ${post.postcardData ? `Postcard Front: ${post.postcardData.frontText}\nPostcard Back: ${post.postcardData.backText}` : ''}
      `).join('\n\n');

      const brandContext = `
        Brand Colors: ${brandKit.colors.map(c => `${c.name}: ${c.hex}`).join(', ')}
        Typography: Heading ${brandKit.fonts.heading}, Body ${brandKit.fonts.body}
      `;

      const prompt = `You are an expert Brand Strategist and Design Director. 
      Analyze the following recent successful posts, brand identity, and visual analysis for a business in the ${activeBusiness.industry} industry.
      
      Brand Identity:
      ${brandContext}
      
      ${imageAnalysis ? `Visual Analysis of Uploaded Examples:\n${imageAnalysis}\n` : ''}
      
      Recent Posts:
      ${postContext || 'No recent posts available. Base the guide purely on industry best practices and the brand identity.'}
      
      Create a comprehensive, highly actionable "AI Design Guide" (in Markdown format) that will be used to instruct other AI agents and human designers on how to create content for this brand.
      
      Include sections for:
      1. Brand Voice & Tone (derived from the captions)
      2. Visual Aesthetic & Color Usage (how to apply the brand colors)
      3. Typography Guidelines
      4. Content Themes & Pillars (based on the successful posts)
      5. Do's and Don'ts for this brand's content
      
      Make it professional, concise, and directly applicable.`;

      const markdown = await generateTextWithCascade(prompt, true, activeBusiness.id);

      const updatedBrandKit = { ...brandKit, designGuide: markdown };
      setBrandKit(updatedBrandKit);
      await setDoc(doc(db, 'brand_kits', activeBusiness.id), updatedBrandKit);
      
      setUploadedPostImages([]); // Clear after sync
      toast.success('AI Design Guide (design.md) generated and synced successfully!');
    } catch (error) {
      console.error("Sync design guide failed:", error);
      toast.error("Failed to sync design guide.");
    } finally {
      setIsSaving(false);
    }
  };
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
        const data = docSnap.data();
        setBrandKit({
          ...defaultBrandKit,
          ...data,
          colors: data.colors || defaultBrandKit.colors,
          logos: data.logos || [],
          designs: data.designs || [],
          customFonts: data.customFonts || [],
          fonts: data.fonts || defaultBrandKit.fonts
        } as BrandKit);
      } else {
        setBrandKit(defaultBrandKit);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `brand_kits/${activeBusiness.id}`);
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
      handleFirestoreError(error, OperationType.GET, `categories/${activeBusiness.id}`);
    });

    return () => {
      unsubBrandKit();
      unsubCategories();
    };
  }, [activeBusiness]);

  // Inject custom fonts
  useEffect(() => {
    if (brandKit.customFonts && brandKit.customFonts.length > 0) {
      const styleId = 'forge-custom-fonts';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      
      const fontFaces = brandKit.customFonts.map(font => `
        @font-face {
          font-family: '${font.name}';
          src: url('${font.url}') format('${font.format}');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `).join('\n');
      
      styleEl.innerHTML = fontFaces;
    }
  }, [brandKit.customFonts]);

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

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        const fontName = file.name.split('.')[0];
        const format = file.name.endsWith('.woff2') ? 'woff2' : file.name.endsWith('.woff') ? 'woff' : 'truetype';
        setBrandKit(prev => ({
          ...prev,
          customFonts: [...(prev.customFonts || []), { name: fontName, url: reader.result as string, format }]
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
            <div className="w-12 h-12 bg-\[#2665fd\]/10 rounded-[16px] flex items-center justify-center">
              <Palette className="w-6 h-6 text-\[#2665fd\]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                Brand Kit & Workspace Settings
              </h2>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mt-1">
                Manage your brand identity and workspace configuration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeSection === 'identity' && (
              <button
                onClick={handleSaveBrandKit}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[#2665fd] text-white rounded-[12px] text-sm font-bold hover:bg-\[#1e52d0\] transition-all active:scale-95 disabled:opacity-50  "
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Identity
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Desktop) */}
        <div className="flex items-center gap-1 p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] w-fit border border-[#E9E9E7] dark:border-[#2E2E2E]">
          <button
            onClick={() => setActiveSection('identity')}
            className={cn(
              "px-4 py-2 rounded-[8px] text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'identity' 
                ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]  border border-[#E9E9E7] dark:border-[#3E3E3E]" 
                : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            Brand Identity
          </button>
          <button
            onClick={() => setActiveSection('workspace')}
            className={cn(
              "px-4 py-2 rounded-[8px] text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'workspace' 
                ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]  border border-[#E9E9E7] dark:border-[#3E3E3E]" 
                : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Workspace Config
          </button>
          <button
            onClick={() => setActiveSection('designs')}
            className={cn(
              "px-4 py-2 rounded-[8px] text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'designs' 
                ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]  border border-[#E9E9E7] dark:border-[#3E3E3E]" 
                : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Design Intelligence
          </button>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="md:hidden flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
            <button
              onClick={() => setActiveSection('identity')}
              className={cn(
                "px-3 py-1.5 rounded-[8px] text-[10px] font-bold transition-all",
                activeSection === 'identity' 
                  ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] " 
                  : "text-[#757681]"
              )}
            >
              Identity
            </button>
            <button
              onClick={() => setActiveSection('workspace')}
              className={cn(
                "px-3 py-1.5 rounded-[8px] text-[10px] font-bold transition-all",
                activeSection === 'workspace' 
                  ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] " 
                  : "text-[#757681]"
              )}
            >
              Workspace
            </button>
            <button
              onClick={() => setActiveSection('designs')}
              className={cn(
                "px-3 py-1.5 rounded-[8px] text-[10px] font-bold transition-all",
                activeSection === 'designs' 
                  ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] " 
                  : "text-[#757681]"
              )}
            >
              Designs
            </button>
          </div>
          {activeSection === 'identity' && (
            <button
              onClick={handleSaveBrandKit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2665fd] text-white rounded-[12px] text-[10px] font-bold   active:scale-95 disabled:opacity-50"
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
          {activeSection === 'identity' && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full"
            >
              {/* Colors Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Palette className="w-5 h-5 text-[#2665fd]" />
                  <h3 className="text-base font-bold">Brand Colors</h3>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {brandKit.colors.map((color, idx) => (
                      <div key={idx} className="group relative bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] p-3 flex flex-col items-center gap-2 transition-all hover:border-\[#2665fd\]">
                        <div 
                          className="w-12 h-12 rounded-full border border-white dark:border-[#3E3E3E] "
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="text-center">
                          <p className="text-xs font-bold truncate max-w-[80px]">{color.name}</p>
                          <p className="text-[10px] text-[#757681] font-mono">{color.hex.toUpperCase()}</p>
                        </div>
                        <button
                          onClick={() => removeColor(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 "
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
                        className="flex-1 px-4 py-2 text-sm font-medium bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] outline-none focus:border-[#2665fd] transition-all"
                      />
                      <div className="relative w-10 h-10 shrink-0">
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div 
                          className="w-full h-full rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]"
                          style={{ backgroundColor: newColorHex }}
                        />
                      </div>
                      <button
                        onClick={addColor}
                        disabled={!newColorName}
                        className="p-2.5 bg-[#2665fd] text-white rounded-[12px] hover:bg-[#2665fd]-hover transition-all disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Type className="w-5 h-5 text-[#2665fd]" />
                    <h3 className="text-base font-bold">Typography</h3>
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#2665fd]/10 text-[#2665fd] rounded-[8px] text-xs font-bold hover:bg-[#2665fd]/20 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Font
                    <input type="file" multiple accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontUpload} />
                  </label>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#757681] dark:text-[#9B9A97] mb-2 uppercase tracking-wider">Heading Font</label>
                    <select
                      value={brandKit.fonts.heading}
                      onChange={(e) => setBrandKit({ ...brandKit, fonts: { ...brandKit.fonts, heading: e.target.value } })}
                      className="w-full px-4 py-2.5 text-sm font-bold bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] outline-none focus:border-[#2665fd] transition-all"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Outfit">Outfit</option>
                      {brandKit.customFonts?.map(font => (
                        <option key={font.name} value={font.name}>{font.name} (Custom)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#757681] dark:text-[#9B9A97] mb-2 uppercase tracking-wider">Body Font</label>
                    <select
                      value={brandKit.fonts.body}
                      onChange={(e) => setBrandKit({ ...brandKit, fonts: { ...brandKit.fonts, body: e.target.value } })}
                      className="w-full px-4 py-2.5 text-sm font-bold bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] outline-none focus:border-[#2665fd] transition-all"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                      {brandKit.customFonts?.map(font => (
                        <option key={font.name} value={font.name}>{font.name} (Custom)</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-6 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <p className="text-xs font-bold text-[#757681] mb-2">Preview</p>
                    <h4 style={{ fontFamily: brandKit.fonts.heading }} className="text-lg font-bold mb-1">The quick brown fox</h4>
                    <p style={{ fontFamily: brandKit.fonts.body }} className="text-sm">Jumps over the lazy dog.</p>
                  </div>
                </div>
              </div>

              {/* Logos Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#2665fd]" />
                    <h3 className="text-base font-bold">Logos</h3>
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#2665fd]/10 text-[#2665fd] rounded-[8px] text-xs font-bold hover:bg-[#2665fd]/20 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logos')} />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {brandKit.logos.map((logo, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden bg-[#F7F7F5] dark:bg-[#202020] flex items-center justify-center p-4 hover:border-[#2665fd] transition-all">
                      <img src={logo} alt={`Logo ${idx}`} className="max-w-full max-h-full object-contain" />
                      <button
                        onClick={() => removeImage(idx, 'logos')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 "
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {brandKit.logos.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                      <ImageIcon className="w-8 h-8 text-[#9B9A97] mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold text-[#757681]">No logos uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assets Card */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-[#2665fd]" />
                    <h3 className="text-base font-bold">Brand Assets</h3>
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#2665fd]/10 text-[#2665fd] rounded-[8px] text-xs font-bold hover:bg-[#2665fd]/20 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'designs')} />
                  </label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {brandKit.designs.map((design, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden bg-[#F7F7F5] dark:bg-[#202020] hover:border-[#2665fd] transition-all">
                      <img src={design} alt={`Asset ${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx, 'designs')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 "
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {brandKit.designs.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                      <LayoutTemplate className="w-8 h-8 text-[#9B9A97] mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold text-[#757681]">No assets uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'workspace' && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 w-full"
            >
              {/* Platforms Section */}
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#2665fd]" />
                    <h3 className="text-base font-bold">Target Platforms</h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#757681] uppercase tracking-widest bg-[#F7F7F5] dark:bg-[#202020] px-2 py-1 rounded border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    {targetPlatforms.length} / 5
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {targetPlatforms.map((platform, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] group hover:border-[#2665fd] transition-all">
                      <span className="text-sm font-bold capitalize">{platform}</span>
                      <button 
                        onClick={() => removeTargetPlatform(platform)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-[8px] transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {targetPlatforms.length < 5 && (
                    <input 
                      type="text"
                      placeholder="Add platform... (Enter)"
                      className="px-4 py-2 text-sm font-bold bg-white dark:bg-[#1A1A1A] border border-dashed border-[#D9D9D7] dark:border-[#3E3E3E] rounded-[12px] outline-none focus:border-[#2665fd] transition-all w-48"
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
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden ">
                <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-white dark:bg-[#1A1A1A]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2665fd]/10 rounded-[12px] flex items-center justify-center">
                      <Tag className="w-5 h-5 text-[#2665fd]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">Category Editor</h3>
                      <p className="text-[10px] text-[#757681] font-medium">Manage your workspace metadata</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={syncFromCalendar}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2665fd]/10 text-[#2665fd] rounded-[12px] text-xs font-bold hover:bg-[#2665fd]/20 transition-all active:scale-95 disabled:opacity-50 border border-[#2665fd]/20"
                      title="Sync categories from existing calendar posts"
                    >
                      {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Sync Calendar
                    </button>
                    <button
                      onClick={scrapFromWeb}
                      disabled={isScraping}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2665fd] text-white rounded-[12px] text-xs font-bold hover:bg-[#2665fd]-hover transition-all active:scale-95 disabled:opacity-50  "
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
                      className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-[12px] text-xs font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/20"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row min-h-[500px] md:h-[600px]">
                  {/* Sidebar Navigation */}
                  <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#1A1A1A] p-4 space-y-2 shrink-0">
                    <p className="hidden md:block text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4 px-2">Data Types</p>
                    <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 no-scrollbar -mx-2 px-2">
                      {[
                        { id: 'category', label: dataTitles.category, icon: Tag },
                        { id: 'outlet', label: dataTitles.outlet, icon: Globe },
                        { id: 'campaign', label: dataTitles.campaign, icon: Sparkles },
                        { id: 'type', label: dataTitles.type, icon: LayoutTemplate },
                      ].map(type => (
                        <div key={type.id} className="group/item relative shrink-0 md:shrink">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedCategoryType(type.id as any)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedCategoryType(type.id as any);
                              }
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] text-xs md:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
                              selectedCategoryType === type.id
                                ? "bg-white dark:bg-[#2E2E2E] text-[#2665fd]  border border-[#E9E9E7] dark:border-[#3E3E3E]"
                                : "text-[#757681] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                            )}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <type.icon className={cn("w-4 h-4 shrink-0", selectedCategoryType === type.id ? "text-[#2665fd]" : "text-[#757681]")} />
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
                            <div className="flex items-center gap-2 ml-2">
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
                                  className="p-1 opacity-0 md:group-hover/item:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-all"
                                >
                                  <PenTool className="w-3 h-3 text-[#757681]" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <div className="p-4 bg-[#2665fd]/5 dark:bg-[#2665fd]/10 rounded-[16px] border border-[#2665fd]/10 dark:border-[#2665fd]/20">
                        <p className="text-[10px] font-bold text-[#2665fd] uppercase tracking-wider mb-2">Quick Tip</p>
                        <p className="text-[11px] text-[#2665fd]/80 dark:text-[#2665fd]/60 leading-relaxed">
                          Categories help the AI generate more relevant posts for your business.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col bg-white dark:bg-[#1A1A1A]">
                    {/* Search and Add Bar */}
                    <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] space-y-4">
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#757681]" />
                          <input
                            type="text"
                            placeholder="Search items..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm font-medium outline-none focus:border-[#2665fd] transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="Add new..."
                            value={newCategoryName}
                            onChange={(e) => {
                              setNewCategoryName(e.target.value);
                              setNewCategoryType(selectedCategoryType);
                            }}
                            className="flex-1 sm:w-48 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm font-bold outline-none focus:border-[#2665fd] transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                          />
                          <button
                            onClick={addCategory}
                            disabled={!newCategoryName}
                            className="p-2 bg-[#2665fd] text-white rounded-[12px] hover:bg-[#2665fd]-hover transition-all disabled:opacity-50"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-4 min-h-[300px] md:min-h-0">
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
                                <div className="bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] p-3 hover:border-[#2665fd] transition-all group  hover:">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="relative flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          id={`cat-${cat.id}`}
                                          checked={cat.enabled}
                                          onChange={() => toggleCategory(cat.id)}
                                          className="peer appearance-none w-4 h-4 rounded-[6px] border-2 border-[#E9E9E7] dark:border-[#2E2E2E] checked:bg-[#2665fd] checked:border-[#2665fd] transition-all cursor-pointer"
                                        />
                                        <CheckCircle2 className="w-2.5 h-2.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                      </div>
                                      <input
                                        type="text"
                                        value={cat.name}
                                        onChange={(e) => updateCategory(cat.id, e.target.value)}
                                        className={cn(
                                          "flex-1 bg-transparent text-xs font-bold outline-none focus:text-[#2665fd] transition-colors",
                                          !cat.enabled && "text-[#757681] opacity-50"
                                        )}
                                      />
                                    </div>
                                    <button 
                                      onClick={() => deleteCategory(cat.id)}
                                      className="p-1 text-[#757681] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[8px] transition-all opacity-0 group-hover:opacity-100"
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
                            <Tag className="w-8 h-8 text-[#757681]/20 mx-auto mb-2" />
                            <p className="text-xs font-bold text-[#757681]">No items in this category</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'designs' && (
            <motion.div
              key="designs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 w-full max-w-4xl mx-auto"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#2665fd]" />
                    AI Design Guide (design.md)
                  </h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97] mt-1">
                    Upload post images or analyze existing content to train the AI on your unique brand style.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm font-bold hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Examples
                  </button>
                  <button
                    onClick={handleSyncDesignGuide}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#2665fd] text-white rounded-[12px] text-sm font-bold hover:bg-[#2665fd]-hover transition-all active:scale-95 disabled:opacity-50  "
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Design Guide
                  </button>
                </div>
              </div>

              {uploadedPostImages.length > 0 && (
                <div className="bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[20px] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#757681]">Uploaded Examples ({uploadedPostImages.length})</h4>
                    <button 
                      onClick={() => setUploadedPostImages([])}
                      className="text-[10px] font-bold text-red-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {uploadedPostImages.map((img, idx) => (
                      <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E]">
                        <img src={img} alt="Upload" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeUploadedImage(idx)}
                          className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[20px] overflow-hidden">
                <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                    </div>
                    <span className="text-[10px] font-mono text-[#757681] ml-2">design.md — Read Only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[#2665fd] bg-[#2665fd]/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      AI Active context
                    </span>
                  </div>
                </div>
                
                <div className="p-0 h-[600px] overflow-y-auto">
                  {brandKit.designGuide ? (
                    <pre className="p-8 text-xs font-mono text-[#37352F] dark:text-[#EBE9ED] whitespace-pre-wrap leading-relaxed">
                      {brandKit.designGuide}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-12">
                      <div className="w-16 h-16 bg-[#2665fd]/5 rounded-[24px] flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-[#2665fd] opacity-20" />
                      </div>
                      <h4 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED] mb-2">No Design Guide Existing</h4>
                      <p className="text-sm text-[#757681] dark:text-[#9B9A97] max-w-sm">
                        Click "Sync Design Guide" above to analyze your recent posts and create a persistent design intelligence for your AI.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#2665fd]/5 dark:bg-[#2665fd]/10 p-5 rounded-[20px] border border-[#2665fd]/10 dark:border-[#2665fd]/20">
                  <h4 className="text-xs font-bold text-[#2665fd] mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    How it works
                  </h4>
                  <p className="text-[11px] text-[#2665fd]/80 dark:text-[#2665fd]/60 leading-relaxed">
                    The system analyzes captions and visual data from your most recent high-quality posts to build a style profile.
                  </p>
                </div>
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-5 rounded-[20px] border border-emerald-500/10 dark:border-emerald-500/20">
                  <h4 className="text-xs font-bold text-emerald-500 mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5" />
                    AI Memory
                  </h4>
                  <p className="text-[11px] text-emerald-500/80 dark:text-emerald-500/60 leading-relaxed">
                    Once synced, this guide is automatically injected into all future AI prompts to ensure visual and textual alignment.
                  </p>
                </div>
                <div className="bg-purple-500/5 dark:bg-purple-500/10 p-5 rounded-[20px] border border-purple-500/10 dark:border-purple-500/20">
                  <h4 className="text-xs font-bold text-purple-500 mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5" />
                    Consistency
                  </h4>
                  <p className="text-[11px] text-purple-500/80 dark:text-purple-500/60 leading-relaxed">
                    Use postcards frequently? Syncing will help the AI learn the specific layout and tone of your favorite postcards.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-[#191919] rounded-[16px]  border border-[#E9E9E7] dark:border-[#2E2E2E] w-full max-w-md p-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-[12px] flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mb-6">
                Are you sure you want to {confirmAction.type.toLowerCase()}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[12px] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await confirmAction.onConfirm();
                    setConfirmAction(null);
                  }}
                  className="px-6 py-2 text-sm font-bold bg-red-600 text-white rounded-[12px] hover:bg-red-700 transition-all  "
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
