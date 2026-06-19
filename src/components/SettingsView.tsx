import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Building2, Sparkles, ChartBar as BarChart3, Database, Download, Save, Upload, RefreshCw, FileSpreadsheet, Globe, LogOut, Smartphone, Bell, Printer, X, Settings, Trash2, ChevronDown, Activity, Tags, Link2, Palette, Lightbulb, ListTodo, Search, Moon, CircleCheck as CheckCircle2, FileText, MessageSquareText, Box, Wand as Wand2, ExternalLink, Boxes, Type, FileSliders as Sliders, RotateCcw } from 'lucide-react';
import {
  type ThemeConfig,
  PALETTE_PRESETS as ENGINE_PALETTE_PRESETS,
  FONT_OPTIONS,
  DEFAULT_THEME_CONFIG,
  applyThemeConfig,
  loadThemeConfig,
  saveThemeConfig,
  resetThemeConfig,
} from '../lib/themeEngine';
import { cn } from '../lib/utils';
import { WorkspacesSettings } from './WorkspacesSettings';
import { ChaoticStudioCredits } from './ChaoticStudioCredits';
import { ForgeLoader } from './ForgeLoader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  subscribeToCategories,
  upsertCategoriesDoc,
  updateBusiness,
  getPosts,
  updatePost,
  deleteAllPosts,
} from '../lib/supabase';
import { OneDriveSetup } from './OneDriveSetup';
import { BuiltInAiStatus, BUILTIN_MODELS, BUILTIN_VISION_MODELS } from '../lib/builtinAi';
import { getContextBudget, LOCAL_KNOWLEDGE_MAX_CHARS } from '../lib/localAiContext';
import { Cpu, Info } from 'lucide-react';
import { testLocalServerConnection, getDefaultAiSettings } from '../lib/gemini';
import { TabPageContent, TabPageHeader, TabPageShell } from './ui/TabPageHeader';
import { persistBrandKnowledgeToAiSettings } from '../lib/brandKnowledge';
import { detectJsonImportKind } from '../lib/jsonImportDetect';

type UnifiedPreset = {
  id: string;
  name: string;
  colors: string[];
  sidebarStyle?: ThemeConfig['sidebarStyle'];
  kind: 'palette' | 'custom';
  mode?: 'light' | 'dark';
  config: Partial<ThemeConfig>;
};

// Mini layout sketch used in the Sidebar Style picker so each option is visual.
function SidebarStylePreview({ style, active }: { style: 'classic' | 'expanded' | 'island' | 'dock'; active: boolean }) {
  const railBg = active ? 'bg-brand' : 'bg-[#C7C6C3] dark:bg-[#5A5A5A]';
  const dotBg = active ? 'bg-brand/60' : 'bg-[#C7C6C3] dark:bg-[#5A5A5A]';
  return (
    <div className="w-9 h-8 rounded-md border border-[#E9E9E7] dark:border-[#3A3A3A] bg-[#F7F7F5] dark:bg-[#262626] p-0.5 flex shrink-0 overflow-hidden">
      {style === 'classic' && (
        <>
          <div className={cn('w-1.5 h-full rounded-sm', railBg)} />
          <div className="flex-1" />
        </>
      )}
      {style === 'expanded' && (
        <>
          <div className={cn('w-3 h-full rounded-sm flex flex-col gap-0.5 p-0.5', active ? 'bg-brand/20' : 'bg-[#E0DFDC] dark:bg-[#3A3A3A]')}>
            <div className={cn('h-0.5 rounded-full', railBg)} />
            <div className={cn('h-0.5 rounded-full', railBg)} />
            <div className={cn('h-0.5 rounded-full', railBg)} />
          </div>
          <div className="flex-1" />
        </>
      )}
      {style === 'island' && (
        <>
          <div className={cn('w-1.5 h-[85%] my-auto ml-0.5 rounded-[3px]', railBg)} />
          <div className="flex-1" />
        </>
      )}
      {style === 'dock' && (
        <div className="flex flex-col w-full">
          <div className="flex-1" />
          <div className={cn('h-1.5 w-[70%] mx-auto rounded-full', dotBg)} />
        </div>
      )}
    </div>
  );
}

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
];

const GROQ_MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fastest)' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' }
];

const PUTER_TEXT_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Default)' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus' }
];

const PUTER_IMAGE_MODELS = [
  { id: 'dall-e-3', name: 'DALL-E 3 (Default)' }
];

const POLLINATION_MODELS = [
  { id: 'flux', name: 'Flux (Default)' },
  { id: 'turbo', name: 'Turbo' },
  { id: 'stable-diffusion-3', name: 'Stable Diffusion 3' },
  { id: 'playground-v2.5', name: 'Playground v2.5' }
];

const BentoCard = ({ 
  id, 
  icon: Icon, 
  customIcon, 
  title, 
  subtitle, 
  expandedId, 
  onToggle, 
  children, 
  iconBg, 
  iconColor 
}: any) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isExpanded = isDesktop || expandedId === id;
  
  return (
    <motion.div 
      layout="position"
      className={cn(
        "bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] overflow-hidden flex flex-col h-full",
        isExpanded && !isDesktop ? "border-brand dark:border-brand" : "hover:border-[#D9D9D7] dark:hover:border-[#3E3E3E] transition-colors"
      )}
    >
      <div 
        onClick={() => !isDesktop && onToggle(id)}
        className={cn("p-5 sm:p-6 flex items-center justify-between group", !isDesktop && "cursor-pointer select-none")}
      >
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] flex items-center justify-center shrink-0 transition-colors group-hover:opacity-90", iconBg, iconColor)}>
            {customIcon ? customIcon : <Icon className="w-6 h-6 sm:w-7 sm:h-7" />}
          </div>
          <div>
            <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED] text-base sm:text-lg group-hover:text-brand transition-colors">{title}</h3>
            <p className="text-xs sm:text-sm text-[#757681] dark:text-[#9B9A97]">{subtitle}</p>
          </div>
        </div>
        {!isDesktop && (
          <motion.div 
            animate={{ rotate: isExpanded ? 180 : 0 }} 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#F7F7F5] dark:bg-[#202020] flex items-center justify-center text-[#757681] dark:text-[#9B9A97] shrink-0"
          >
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={isDesktop ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-[#E9E9E7] dark:border-[#2E2E2E] flex-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function SettingsView({
  user,
  isDarkMode,
  toggleDarkMode,
  isInstallable,
  handleInstallClick,
  setIsAddToHomeModalOpen,
  businesses,
  activeBusiness,
  setBusinesses,
  setActiveBusiness,
  aiSettings,
  handleAiSettingChange,
  setAiSettingsState,
  setAiSettings,
  analyticsSettings,
  handleAnalyticsSettingChange,
  setIsExportModalOpen,
  exportScheduleJson,
  importScheduleJson,
  importScheduleExcel,
  initialPosts,
  handleSavePost,
  setIsSyncing,
  addSyncLog,
  setIsExcelImportModalOpen,
  exportProductExcel,
  handleAutoCategorizeAll,
  isAutoCategorizing,
  exportProductJson,
  exportExtensionZip,
  importProductJson,
  googleTokens,
  handleDisconnectGoogleDrive,
  setConfirmAction,
  handleConnectGoogleDrive,
  syncLogs,
  signOut,
  auth,
  setPosts,
  industryConfig,
  setActiveTab,
  onThemePresetChange,
  finetuneStatus,
  handleStartFinetune,
  showFinetunePanel,
  setShowFinetunePanel
}: any) {
  const [expandedId, setExpandedId] = useState<string | null>(() => typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'account' : null);
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem('forge_theme_preset') || 'default');
  const [customTheme, setCustomTheme] = useState<ThemeConfig>(() => loadThemeConfig() ?? { ...DEFAULT_THEME_CONFIG });
  const [showAdvancedTheme, setShowAdvancedTheme] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customPresets, setCustomPresets] = useState<Array<{ id: string; name: string; colors: string[]; mode?: 'light' | 'dark'; config: ThemeConfig }>>(() => {
    try { return JSON.parse(localStorage.getItem('forge_custom_presets') || '[]'); } catch { return []; }
  });
  const [savePresetName, setSavePresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>(
    () => localStorage.getItem('forge_active_preset') || localStorage.getItem('forge_theme_preset') || 'default'
  );
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('category');

  const [isOneDriveOpen, setIsOneDriveOpen] = useState(false);
  const [dataAction, setDataAction] = useState<{ type: 'restore' | 'export' | 'backup' | null }>({ type: null });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [restoreTarget, setRestoreTarget] = useState<'schedule' | 'product' | 'auto' | null>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isPuterSignedIn, setIsPuterSignedIn] = useState(false);
  const [builtInStatus, setBuiltInStatus] = useState<BuiltInAiStatus>({
    isLoaded: false,
    isLoading: false,
    isProcessing: false,
    progress: 0,
    message: '',
    error: null,
    modelId: null,
  });
  type BuiltInAiApi = typeof import('../lib/builtinAi')['builtInAi'];
  const builtInAiRef = React.useRef<BuiltInAiApi | null>(null);

  const getBuiltInAi = React.useCallback(async (): Promise<BuiltInAiApi> => {
    if (!builtInAiRef.current) {
      builtInAiRef.current = (await import('../lib/builtinAi')).builtInAi;
    }
    return builtInAiRef.current;
  }, []);

  useEffect(() => {
    let unsubBuiltin: (() => void) | undefined;
    void getBuiltInAi().then((ai) => {
      setBuiltInStatus(ai.getStatus());
      unsubBuiltin = ai.onStatusChange(setBuiltInStatus);
    });

    const checkPuter = async () => {
      if (typeof window !== 'undefined' && (window as any).puter) {
        try {
          const signedIn = await (window as any).puter.auth.isSignedIn();
          setIsPuterSignedIn(signedIn);
        } catch (e) {
          console.error("Error checking Puter auth", e);
        }
      }
    };
    checkPuter();
    const interval = setInterval(checkPuter, 5000);
    
    return () => {
      unsubBuiltin?.();
      clearInterval(interval);
    };
  }, [getBuiltInAi]);

  const handlePuterSignIn = async () => {
    if (typeof window !== 'undefined' && (window as any).puter) {
      try {
        await (window as any).puter.auth.signIn();
        const signedIn = await (window as any).puter.auth.isSignedIn();
        setIsPuterSignedIn(signedIn);
        if (signedIn) toast.success("Signed in to Puter.js!");
      } catch (e) {
        console.error("Puter sign in error", e);
        toast.error("Failed to sign in to Puter.js");
      }
    }
  };

  const handlePuterSignOut = async () => {
    if (typeof window !== 'undefined' && (window as any).puter) {
      try {
        await (window as any).puter.auth.signOut();
        setIsPuterSignedIn(false);
        toast.success("Signed out from Puter.js");
      } catch (e) {
        console.error("Puter sign out error", e);
        toast.error("Failed to sign out from Puter.js");
      }
    }
  };

  const handleUpdateName = async () => {
    if (!auth.currentUser) return;
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsUpdatingName(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: newName.trim()
      });
      toast.success("Profile name updated successfully!");
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error("Failed to update profile name.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleDataActionSelect = (target: 'schedule' | 'product' | 'extension' | 'auto') => {
    if (dataAction.type === 'export') {
      if (target === 'schedule') setIsExportModalOpen(true);
      else if (target === 'product') exportProductExcel();
      else if (target === 'extension') exportExtensionZip();
    } else if (dataAction.type === 'backup') {
      if (target === 'schedule') exportScheduleJson();
      else exportProductJson();
    } else if (dataAction.type === 'restore') {
      if (target === 'schedule' || target === 'product') {
        setRestoreTarget(target);
        setTimeout(() => fileInputRef.current?.click(), 100);
      } else {
        setRestoreTarget('auto');
        setTimeout(() => fileInputRef.current?.click(), 100);
      }
    }
    setDataAction({ type: null });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (restoreTarget === 'schedule') {
      importScheduleJson(e);
    } else if (restoreTarget === 'product') {
      importProductJson(e);
    } else if (restoreTarget === 'auto') {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        const kind = detectJsonImportKind(parsed);

        if (kind === 'schedule-backup') {
          importScheduleJson(e);
        } else if (kind === 'product-backup') {
          importProductJson(e);
        } else if (kind === 'forge-export') {
          toast.error('Full account migration was removed. Export calendar from the legacy database, then use Import calendar on Supabase.');
        } else {
          toast.error('Unrecognized JSON backup format.');
        }
      } catch (error) {
        console.error('Restore failed', error);
        toast.error(error instanceof Error ? error.message : 'Invalid backup file');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setRestoreTarget(null);
  };

  useEffect(() => {
    if (user && activeBusiness?.id) {
      const unsubscribe = subscribeToCategories(activeBusiness.id, (docSnap) => {
        if (docSnap) {
          setCategories((docSnap.categories as any[]) || []);
        }
      });
      return () => unsubscribe();
    } else {
      const saved = localStorage.getItem(`rainbowCategories_${activeBusiness?.id || 'default'}`);
      if (saved) {
        setCategories(JSON.parse(saved));
      }
    }
  }, [user, activeBusiness?.id]);

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = { id: crypto.randomUUID(), name: newCategoryName.trim(), type: newCategoryType, enabled: true };
    const updated = [...categories, newCat];
    setCategories(updated);
    setNewCategoryName('');
    
    if (user && activeBusiness?.id) {
      await upsertCategoriesDoc(activeBusiness.id, { categories: updated });
    } else {
      localStorage.setItem(`rainbowCategories_${activeBusiness?.id || 'default'}`, JSON.stringify(updated));
    }
  };

  const updateCategory = async (id: string, newName: string) => {
    const oldCat = categories.find(c => c.id === id);
    if (!oldCat) return;
    const oldName = oldCat.name;
    
    const updated = categories.map(c => c.id === id ? { ...c, name: newName } : c);
    setCategories(updated);
    
    if (user && activeBusiness?.id) {
      await upsertCategoriesDoc(activeBusiness.id, { categories: updated });
      
      // Update posts that use this category
      setIsSyncing(true);
      addSyncLog(`Updating category name from "${oldName}" to "${newName}"...`, 'info');
      try {
        const allPosts = await getPosts(activeBusiness.id);
        let count = 0;
        for (const post of allPosts) {
          const updates: Partial<typeof post> = {};
          let changed = false;
          if (oldCat.type === 'category' && post.productCategory === oldName) {
            updates.productCategory = newName;
            changed = true;
          }
          if (oldCat.type === 'outlet' && post.outlet === oldName) {
            updates.outlet = newName;
            changed = true;
          }
          if (oldCat.type === 'campaign' && post.campaignType === oldName) {
            updates.campaignType = newName;
            changed = true;
          }
          if (oldCat.type === 'type' && post.type === oldName) {
            updates.type = newName;
            changed = true;
          }
          if (changed && post.id) {
            await updatePost(post.id, updates);
            count++;
          }
        }
        if (count > 0) {
          addSyncLog(`Updated ${count} posts with new category name.`, 'success');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to update posts with new category name');
      } finally {
        setIsSyncing(false);
      }
    } else {
      localStorage.setItem(`rainbowCategories_${activeBusiness?.id || 'default'}`, JSON.stringify(updated));
    }
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    if (user && activeBusiness?.id) {
      await upsertCategoriesDoc(activeBusiness.id, { categories: updated });
    } else {
      localStorage.setItem(`rainbowCategories_${activeBusiness?.id || 'default'}`, JSON.stringify(updated));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleConnectOneDrive = async (credentials: { clientId: string; clientSecret: string; tenantId: string }) => {
    if (!activeBusiness) return;
    try {
      const oneDriveCredentials = {
        ...credentials,
        connectedAt: new Date().toISOString()
      };
      await updateBusiness(activeBusiness.id, { oneDriveCredentials });
      
      const updatedBiz = { ...activeBusiness, oneDriveCredentials };
      setBusinesses((prev: any) => prev.map((b: any) => b.id === updatedBiz.id ? updatedBiz : b));
      setActiveBusiness(updatedBiz);
      
      setIsOneDriveOpen(false);
      toast.success("OneDrive connected successfully!");
    } catch (e) {
      console.error("Error connecting OneDrive", e);
      toast.error("Failed to connect OneDrive.");
    }
  };

  const handleDisconnectOneDrive = async () => {
    if (!activeBusiness) return;
    try {
      await updateBusiness(activeBusiness.id, { oneDriveCredentials: null as any });
      
      const updatedBiz = { ...activeBusiness, oneDriveCredentials: null };
      setBusinesses((prev: any) => prev.map((b: any) => b.id === updatedBiz.id ? updatedBiz : b));
      setActiveBusiness(updatedBiz);
      
      toast.success("OneDrive disconnected.");
    } catch (e) {
      console.error("Error disconnecting OneDrive", e);
      toast.error("Failed to disconnect OneDrive.");
    }
  };

  const handleThemePresetChange = (preset: string) => {
    setThemePreset(preset);
    localStorage.setItem('forge_theme_preset', preset);
    document.documentElement.setAttribute('data-theme', preset);
    if (onThemePresetChange) {
      onThemePresetChange(preset);
    }
    toast.success(`Theme preset updated to ${preset}!`);
  };

  const BASE_THEME_PRESETS = [
    { id: 'default', name: 'Notion Minimal', colors: ['#FFFFFF', '#37352F'], description: 'Clean, focused, and professional.' },
    { id: 'midnight', name: 'Midnight Forge', colors: ['#0F172A', '#38BDF8'], description: 'Deep blues and vibrant highlights.' },
    { id: 'forest', name: 'Forest Growth', colors: ['#064E3B', '#10B981'], description: 'Natural greens for a calm workspace.' },
    { id: 'sunset', name: 'Golden Hour', colors: ['#7C2D12', '#F97316'], description: 'Warm oranges and deep browns.' },
    { id: 'cyberpunk', name: 'Neon Pulse', colors: ['#1A1A1A', '#FF00FF'], description: 'High contrast neon aesthetics.' },
    { id: 'nord', name: 'Nordic Frost', colors: ['#2E3440', '#88C0D0'], description: 'Cool, arctic-inspired palette.' }
  ];

  // Combine built-in + custom saved presets
  const THEME_PRESETS = [
    ...BASE_THEME_PRESETS,
    ...customPresets.map(cp => ({ id: cp.id, name: cp.name, colors: cp.colors, description: 'Custom saved theme' }))
  ];

  const handleSaveAsPreset = () => {
    if (!savePresetName.trim()) { toast.error('Enter a preset name'); return; }
    const id = `custom_${Date.now()}`;
    const newPreset = {
      id,
      name: savePresetName.trim(),
      colors: [customTheme.canvasBackground || '#ffffff', customTheme.accentColor || '#2665fd', customTheme.panelBackground || '#f7f7f5'],
      mode: (isDarkMode ? 'dark' : 'light') as 'light' | 'dark',
      config: { ...customTheme },
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('forge_custom_presets', JSON.stringify(updated));
    setSavePresetName('');
    setShowSavePreset(false);
    toast.success(`Preset "${newPreset.name}" saved to Advanced Themes!`);
  };

  const handleDeleteCustomPreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem('forge_custom_presets', JSON.stringify(updated));
    if (themePreset === id) handleThemePresetChange('default');
    if (activePresetId === id) {
      setActivePresetId('default');
      localStorage.setItem('forge_active_preset', 'default');
    }
    toast.success('Custom preset removed');
  };

  const handleApplyCustomPreset = (presetId: string) => {
    const cp = customPresets.find(p => p.id === presetId);
    if (cp) {
      setCustomTheme(cp.config);
      applyThemeConfig(cp.config);
      saveThemeConfig(cp.config);
      toast.success(`Applied "${cp.name}"`);
    } else {
      handleThemePresetChange(presetId);
    }
  };

  // ── Unified theme preset list (curated palettes + saved customs) ──
  const unifiedPresets: UnifiedPreset[] = [
    ...ENGINE_PALETTE_PRESETS.map(pp => ({
      id: `palette_${pp.name}`,
      name: pp.name,
      colors: pp.colors,
      sidebarStyle: pp.config.sidebarStyle,
      kind: 'palette' as const,
      mode: pp.mode,
      config: pp.config,
    })),
    ...customPresets.map(cp => ({
      id: cp.id,
      name: cp.name,
      colors: cp.colors,
      sidebarStyle: cp.config.sidebarStyle,
      kind: 'custom' as const,
      mode: cp.mode,
      config: cp.config,
    })),
  ];

  // Show the active preset first, then the rest. Collapsed view shows only 3.
  const orderedPresets = [
    ...unifiedPresets.filter(p => p.id === activePresetId),
    ...unifiedPresets.filter(p => p.id !== activePresetId),
  ];
  const visiblePresets = showAllPresets ? orderedPresets : orderedPresets.slice(0, 3);

  const applyUnifiedPreset = (preset: UnifiedPreset) => {
    const next: ThemeConfig = { ...customTheme, ...preset.config };
    // Keep light/dark mode in sync with the preset so a light theme never
    // renders on top of dark mode (and vice-versa).
    if (preset.mode && toggleDarkMode) {
      const currentMode = isDarkMode ? 'dark' : 'light';
      if (preset.mode !== currentMode) toggleDarkMode();
    }
    setCustomTheme(next);
    applyThemeConfig(next);
    saveThemeConfig(next);
    setActivePresetId(preset.id);
    localStorage.setItem('forge_active_preset', preset.id);
    toast.success(`Applied "${preset.name}"`);
  };

  const [isAiInstructionModalOpen, setIsAiInstructionModalOpen] = useState(false);
  const [instructionText, setInstructionText] = useState(aiSettings.systemInstructions || '');
  const [brandVoiceText, setBrandVoiceText] = useState(aiSettings.brandVoice || '');
  const [businessRulesText, setBusinessRulesText] = useState(aiSettings.businessRules || '');
  const [localAiDebug, setLocalAiDebug] = useState(!!aiSettings.localAiDebug);
  const [tunePreset, setTunePreset] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [showAdvancedTune, setShowAdvancedTune] = useState(false);
  const [showCloudAiOptions, setShowCloudAiOptions] = useState(false);

  useEffect(() => {
    setInstructionText(aiSettings.systemInstructions || '');
    setBrandVoiceText(aiSettings.brandVoice || '');
    setBusinessRulesText(aiSettings.businessRules || '');
    setLocalAiDebug(!!aiSettings.localAiDebug);
  }, [aiSettings.systemInstructions, aiSettings.brandVoice, aiSettings.businessRules, aiSettings.localAiDebug]);

  const handleSaveInstructions = () => {
    persistBrandKnowledgeToAiSettings({
      brandVoice: brandVoiceText,
      businessRules: businessRulesText,
      systemInstructions: instructionText,
    });
    handleAiSettingChange('brandVoice', brandVoiceText);
    handleAiSettingChange('businessRules', businessRulesText);
    handleAiSettingChange('systemInstructions', instructionText);
    handleAiSettingChange('localAiDebug', localAiDebug);
    setIsAiInstructionModalOpen(false);
    toast.success('Knowledge saved — open Brand & AI Guide tab for full editing.');
  };

  const downloadExtensionFile = async (filename: string) => {
    try {
      const response = await fetch(`/extension/${filename}`);
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded!`);
    } catch (error) {
      toast.error(`Failed to download ${filename}`);
    }
  };

  return (
    <TabPageShell className="relative">
      <TabPageHeader
        icon={Settings}
        title="Settings"
        subtitle="Manage your workspace, integrations, and preferences."
        actions={
          <>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] text-[#757681] hover:text-brand min-h-[36px]"
            >
              <Printer className="w-3.5 h-3.5" /> Print PDF
            </button>
            <button
              type="button"
              onClick={() => setDataAction({ type: 'restore' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] text-[#757681] hover:text-brand min-h-[36px]"
            >
              <Upload className="w-3.5 h-3.5" /> Restore JSON
            </button>
            <button
              type="button"
              onClick={() => setDataAction({ type: 'export' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] text-[#757681] hover:text-brand min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
            <button
              type="button"
              onClick={() => setDataAction({ type: 'backup' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] text-[#757681] hover:text-brand min-h-[36px]"
            >
              <Save className="w-3.5 h-3.5" /> Backup JSON
            </button>
            <input type="file" accept=".json" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
          </>
        }
      />

      <TabPageContent className="overflow-visible">
      {/* AI Instruction Modal */}
      <AnimatePresence>
        {isAiInstructionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F7F7F5] dark:bg-[#202020]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-[12px] flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <MessageSquareText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED]">Brand + AI Knowledge Center</h3>
                    <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Manage brand voice, business rules, and AI instructions in one place.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiInstructionModalOpen(false)}
                  className="p-2 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[#757681]" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Brand Voice</label>
                  <textarea
                    value={brandVoiceText}
                    onChange={(e) => setBrandVoiceText(e.target.value)}
                    placeholder="Describe tone, audience, and writing style."
                    className="w-full h-[100px] p-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] text-sm outline-none focus:border-brand transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Business Rules</label>
                  <textarea
                    value={businessRulesText}
                    onChange={(e) => setBusinessRulesText(e.target.value)}
                    placeholder="Compliance, banned phrases, mandatory CTA, legal notes."
                    className="w-full h-[100px] p-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] text-sm outline-none focus:border-brand transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">AI System Instructions</label>
                    <span className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider">Saved to Cloud</span>
                  </div>
                  <textarea 
                    value={instructionText}
                    onChange={(e) => setInstructionText(e.target.value)}
                    placeholder="# Your Custom AI Instructions&#10;Define tone, style, and specific business rules here...&#10;&#10;Example:&#10;- Always use a professional yet friendly tone.&#10;- Focus on sustainable materials.&#10;- Never mention competitors."
                    className="w-full h-[300px] p-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] text-sm font-mono outline-none focus:border-brand transition-colors resize-none"
                  />
                  <label className="flex items-center gap-2 text-xs text-[#757681] dark:text-[#9B9A97]">
                    <input type="checkbox" checked={localAiDebug} onChange={(e) => setLocalAiDebug(e.target.checked)} />
                    Enable Local AI context debug hints
                  </label>
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={handleSaveInstructions}
                    className="flex-1 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-[12px] transition-all shadow-lg shadow-[#2665fd]/20 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Knowledge
                  </button>
                  <button 
                    onClick={() => setIsAiInstructionModalOpen(false)}
                    className="px-6 py-3 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] font-bold rounded-[12px] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Hidden Tabs Bento Grid */}
      <div className="md:hidden grid grid-cols-6 gap-2 mb-8">
        <button 
          onClick={() => setActiveTab?.('brandkit')}
          className="col-span-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-[16px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
            <Palette className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] text-center line-clamp-1">{industryConfig?.terminology?.assets || 'Brand & AI Guide'}</span>
        </button>

        <button 
          onClick={() => setActiveTab?.('widgets')}
          className="col-span-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-[16px] flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
            <Boxes className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">Widgets</span>
        </button>

        <button 
          onClick={() => setActiveTab?.('analytics')}
          className="col-span-6 flex flex-col items-center justify-center p-3 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-[12px] flex items-center justify-center text-pink-600 dark:text-pink-400 mb-1.5">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED]">Insights</span>
        </button>

        <button 
          onClick={() => setActiveTab?.('search')}
          className="col-span-6 flex items-center gap-4 p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-[16px] flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Catalogue</span>
            <span className="text-[10px] text-[#757681] dark:text-[#9B9A97]">Manage your product database</span>
          </div>
        </button>

        {activeBusiness?.applets?.map(applet => (
          <button 
            key={applet.id}
            onClick={() => setActiveTab?.(`applet_${applet.id}` as any)}
            className="col-span-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-[16px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
              <Box className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] text-center line-clamp-1">{applet.name}</span>
          </button>
        ))}
      </div>

      <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8 space-y-10 pb-24">
        {/* Profile & workspace */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Profile & workspace</h2>
            <p className="text-sm text-secondary-safe mt-1">Account, theme, and active business</p>
          </div>
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        <div className="min-h-0 h-full">
        <BentoCard
          id="account"
          title="Account & App"
          subtitle="Profile, Theme"
          icon={User}
          customIcon={user?.photoURL ? <img src={user.photoURL} alt="Profile" crossOrigin="anonymous" className="w-full h-full object-cover rounded-[16px]" /> : null}
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          iconColor="text-indigo-600 dark:text-indigo-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-6 pt-4">
            <div className="p-4 sm:p-5 bg-[#F7F7F5] dark:bg-[#202020] rounded-[16px] flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {!user?.photoURL && (
                <div className="w-16 h-16 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-2xl font-bold shrink-0">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 text-center sm:text-left w-full">
                {isEditingName ? (
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] text-sm outline-none focus:border-brand"
                      placeholder="Enter your name"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUpdateName}
                        disabled={isUpdatingName}
                        className="px-3 py-1.5 bg-brand text-white rounded-[8px] text-xs font-bold hover:bg-brand-hover transition-colors disabled:opacity-50"
                      >
                        {isUpdatingName ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false);
                          setNewName(user?.displayName || '');
                        }}
                        className="px-3 py-1.5 bg-[#E9E9E7] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-xs font-bold hover:bg-[#D9D9D7] dark:hover:bg-[#3E3E3E] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">{user?.displayName || 'User'}</h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-brand hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                )}
                <p className="text-sm text-[#757681] dark:text-[#9B9A97]">{user?.email}</p>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="w-full sm:w-auto px-6 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-[12px] text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (isInstallable) handleInstallClick();
                  else setIsAddToHomeModalOpen(true);
                }}
                className="flex items-center gap-3 p-4 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] hover:bg-[#F7F7F5] dark:hover:bg-[#202020] transition-all text-left group"
              >
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-[12px] flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">{isInstallable ? 'Install App' : 'Add to Home Screen'}</h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">{isInstallable ? 'Install on device' : 'Access like an app'}</p>
                </div>
              </button>

              <button
                onClick={() => {
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Forge Workspace', { body: 'Background notifications are active!', icon: 'https://picsum.photos/seed/forge/192/192' });
                  } else if ('Notification' in window) {
                    Notification.requestPermission();
                  }
                }}
                className="flex items-center gap-3 p-4 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] hover:bg-[#F7F7F5] dark:hover:bg-[#202020] transition-all text-left group"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-[12px] flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Notifications</h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Test background alerts</p>
                </div>
              </button>
            </div>
          </div>
        </BentoCard>
        </div>

        <div className="min-h-0 h-full">
        <BentoCard
          id="appearance"
          title="Appearance & Theme"
          subtitle="Customize your workspace"
          icon={Palette}
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          iconColor="text-pink-600 dark:text-pink-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between p-4 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-[12px] flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Dark Mode</h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Toggle dark mode</p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  isDarkMode ? "bg-brand" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                  isDarkMode ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {/* Unified Theme & Customization */}
            <div className="p-4 sm:p-5 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] space-y-6 bg-white dark:bg-[#191919]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-[12px] flex items-center justify-center text-pink-600 dark:text-pink-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Theme &amp; Customization</h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Pick a preset or fine-tune every detail — changes preview live.</p>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider">Presets</p>
                  <span className="text-[10px] font-medium text-[#9B9A97] dark:text-[#7D7C78]">{unifiedPresets.length} themes</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {visiblePresets.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    return (
                      <div key={preset.id} className="relative group">
                        <button
                          onClick={() => applyUnifiedPreset(preset)}
                          className={cn(
                            "w-full p-3 rounded-[12px] border text-left transition-all relative overflow-hidden",
                            isActive
                              ? "border-brand bg-brand-bg ring-2 ring-brand/20"
                              : "border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand/50 hover:-translate-y-0.5 bg-white dark:bg-[#191919]"
                          )}
                        >
                          <div className="flex gap-1 mb-2">
                            {preset.colors.map((c, i) => (
                              <div key={i} className="w-4 h-4 rounded-full border border-black/5 shadow-sm" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <h4 className="text-xs font-bold truncate pr-4 text-[#37352F] dark:text-[#EBE9ED]">{preset.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {preset.sidebarStyle && (
                              <span className="text-[9px] text-brand font-medium capitalize">{preset.sidebarStyle} sidebar</span>
                            )}
                            {preset.kind === 'custom' && <span className="text-[9px] text-[#9B9A97] font-bold uppercase tracking-wide">Custom</span>}
                          </div>
                          {isActive && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                            </div>
                          )}
                        </button>
                        {preset.kind === 'custom' && (
                          <button
                            onClick={() => handleDeleteCustomPreset(preset.id)}
                            className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Delete custom preset"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {orderedPresets.length > 3 && (
                  <button
                    onClick={() => setShowAllPresets(v => !v)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-[#757681] dark:text-[#9B9A97] hover:text-brand border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] hover:border-brand/40 transition-colors"
                  >
                    {showAllPresets ? 'Show less' : `Show all ${orderedPresets.length} themes`}
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAllPresets && 'rotate-180')} />
                  </button>
                )}
              </div>

              {/* Customize (advanced) */}
              <div className="pt-5 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                <button
                  onClick={() => setShowCustomize(v => !v)}
                  className="w-full flex items-center gap-2 group"
                >
                  <Sliders className="w-4 h-4 text-[#757681] dark:text-[#9B9A97]" />
                  <p className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wider">Customize</p>
                  <span className="text-[10px] font-medium text-[#9B9A97] dark:text-[#7D7C78] normal-case">Colors, font, radius, glass &amp; sidebar</span>
                  <ChevronDown className={cn('w-4 h-4 text-[#9B9A97] ml-auto transition-transform', showCustomize && 'rotate-180')} />
                </button>

                <AnimatePresence initial={false}>
                  {showCustomize && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                    <div className="space-y-5 pt-5">

                {/* Color Pickers */}
                <div>
                  <p className="text-[11px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider mb-2">Colors</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([
                      { key: 'accentColor', label: 'Accent' },
                      { key: 'accentHover', label: 'Accent Hover' },
                      { key: 'canvasBackground', label: 'Canvas Bg' },
                      { key: 'panelBackground', label: 'Panel Bg' },
                      { key: 'textPrimary', label: 'Text Primary' },
                      { key: 'textSecondary', label: 'Text Secondary' },
                    ] as { key: keyof ThemeConfig; label: string }[]).map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer px-2.5 py-2 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#FBFAF8] dark:bg-[#202020] hover:border-brand/40 transition-colors">
                        <input
                          type="color"
                          value={(customTheme[key] as string) || '#ffffff'}
                          onChange={e => {
                            const next = { ...customTheme, [key]: e.target.value };
                            setCustomTheme(next);
                            applyThemeConfig(next); // live preview
                          }}
                          className="w-7 h-7 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] cursor-pointer bg-transparent p-0.5 shrink-0"
                        />
                        <span className="text-xs text-[#37352F] dark:text-[#EBE9ED] font-medium truncate">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div>
                  <p className="text-[11px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" /> Font Family
                  </p>
                  <select
                    value={customTheme.fontFamily}
                    onChange={e => {
                      const next = { ...customTheme, fontFamily: e.target.value };
                      setCustomTheme(next);
                      applyThemeConfig(next); // live preview
                    }}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] text-xs text-[#37352F] dark:text-[#EBE9ED] focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Border Radius */}
                <div>
                  <p className="text-[11px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider mb-2">Corner Radius</p>
                  <div className="flex gap-2">
                    {(['sharp', 'balanced', 'rounded', 'capsule'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          const next = { ...customTheme, borderRadius: r };
                          setCustomTheme(next);
                          applyThemeConfig(next); // live preview
                        }}
                        className={cn(
                          'flex-1 py-1.5 text-[10px] font-bold capitalize border transition-all',
                          customTheme.borderRadius === r
                            ? 'bg-brand text-white border-brand'
                            : 'border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] hover:border-brand/40 bg-white dark:bg-[#191919]'
                        )}
                        style={{ borderRadius: r === 'sharp' ? 2 : r === 'balanced' ? 6 : r === 'rounded' ? 10 : 20 }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glass Intensity */}
                <div>
                  <p className="text-[11px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider mb-2">Glass Effect</p>
                  <div className="flex gap-2">
                    {(['off', 'soft', 'glassy', 'frosty'] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => {
                          const next = { ...customTheme, glassIntensity: g };
                          setCustomTheme(next);
                          applyThemeConfig(next); // live preview
                        }}
                        className={cn(
                          'flex-1 py-1.5 text-[10px] font-bold capitalize rounded-lg border transition-all',
                          customTheme.glassIntensity === g
                            ? 'bg-brand text-white border-brand'
                            : 'border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] hover:border-brand/40 bg-white dark:bg-[#191919]'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Style */}
                <div>
                  <p className="text-[11px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider mb-2">Sidebar Style</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([
                      { value: 'classic', label: 'Classic', desc: 'Standard icon rail' },
                      { value: 'expanded', label: 'Expanded', desc: 'Wide rail with labels' },
                      { value: 'island', label: 'Island', desc: 'Floating card rail' },
                      { value: 'dock', label: 'Dock', desc: 'Bottom icon dock' },
                    ] as const).map(opt => {
                      const selected = (customTheme.sidebarStyle ?? 'classic') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            const next = { ...customTheme, sidebarStyle: opt.value };
                            setCustomTheme(next);
                            applyThemeConfig(next);
                          }}
                          className={cn(
                            'p-2.5 rounded-[12px] border text-left transition-all flex items-center gap-2.5',
                            selected
                              ? 'border-brand bg-brand-bg ring-2 ring-brand/20'
                              : 'border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand/40 bg-white dark:bg-[#191919]'
                          )}
                        >
                          <SidebarStylePreview style={opt.value} active={selected} />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight">{opt.label}</p>
                            <p className="text-[9px] text-[#757681] dark:text-[#9B9A97] leading-tight">{opt.desc}</p>
                          </div>
                          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-brand ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save as Named Preset */}
                <AnimatePresence initial={false}>
                  {showSavePreset && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={savePresetName}
                          onChange={e => setSavePresetName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveAsPreset(); if (e.key === 'Escape') setShowSavePreset(false); }}
                          placeholder="Preset name…"
                          autoFocus
                          className="flex-1 px-3 py-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-xs outline-none focus:border-brand"
                        />
                        <button
                          onClick={handleSaveAsPreset}
                          className="px-3 py-2 bg-brand text-white text-xs font-bold rounded-[10px] hover:bg-brand-hover transition-colors"
                        >Save</button>
                        <button
                          onClick={() => setShowSavePreset(false)}
                          className="px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] text-xs font-bold rounded-[10px] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors"
                        >Cancel</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => {
                      applyThemeConfig(customTheme);
                      saveThemeConfig(customTheme);
                      toast.success('Custom theme applied & saved!');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand text-white text-xs font-bold rounded-[10px] hover:bg-brand-hover transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Apply &amp; Save
                  </button>
                  <button
                    onClick={() => setShowSavePreset(v => !v)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-brand/40 text-brand text-xs font-bold rounded-[10px] hover:bg-brand-bg transition-colors"
                    title="Save current settings as a named preset"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Save as Preset
                  </button>
                  <button
                    onClick={() => {
                      resetThemeConfig();
                      setCustomTheme({ ...DEFAULT_THEME_CONFIG });
                      setActivePresetId('default');
                      localStorage.setItem('forge_active_preset', 'default');
                      toast.success('Theme reset to defaults');
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] text-xs font-bold rounded-[10px] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </BentoCard>
        </div>

        <div className="md:col-span-2 xl:col-span-1 min-h-0 h-full">
        <BentoCard
          id="workspaces"
          title="Workspaces"
          subtitle={activeBusiness ? `Active: ${activeBusiness.name}` : "Manage your businesses"}
          icon={Building2}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="pt-4">
            <WorkspacesSettings 
              businesses={businesses} 
              activeBusiness={activeBusiness} 
              onUpdateBusiness={(updatedBiz: any) => {
                setBusinesses((prev: any) => prev.map((b: any) => b.id === updatedBiz.id ? updatedBiz : b));
                if (activeBusiness?.id === updatedBiz.id) setActiveBusiness(updatedBiz);
              }}
              setActiveTab={setActiveTab}
              setActiveBusiness={setActiveBusiness}
            />
          </div>
        </BentoCard>
        </div>
          </motion.div>
        </section>

        {/* Integrations */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Integrations</h2>
            <p className="text-sm text-secondary-safe mt-1">Cloud storage, media, and connected services</p>
          </div>
          <motion.div layout className="grid grid-cols-1 gap-4 sm:gap-6 items-stretch">
        <div className="min-h-0 h-full">
        <BentoCard
          id="integrations"
          title="Integrations"
          subtitle="Connect third-party services"
          icon={Link2}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-4 pt-4">
            <div className="p-4 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] bg-white dark:bg-[#191919] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-[12px] flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Google Drive</h3>
                    <p className="text-xs text-[#757681] dark:text-[#9B9A97]">{googleTokens ? 'Connected' : 'Not connected'}</p>
                  </div>
                </div>
                {googleTokens ? (
                  <button onClick={handleDisconnectGoogleDrive} className="text-xs font-bold text-red-500 hover:text-red-600 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-[8px] transition-colors border border-red-100 dark:border-red-900/30">Disconnect</button>
                ) : (
                  <button onClick={handleConnectGoogleDrive} className="text-xs font-bold text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-[8px] transition-colors">Connect</button>
                )}
              </div>
              
              {!googleTokens && (
                <div className="pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] space-y-3">
                  <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">Optional: Provide your own Google OAuth credentials. If left empty, the server defaults will be used.</p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Client ID</label>
                    <input 
                      type="text"
                      value={aiSettings.googleClientId || ''}
                      onChange={(e) => handleAiSettingChange('googleClientId', e.target.value)}
                      placeholder="Your Google Client ID"
                      className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Client Secret</label>
                    <input 
                      type="password"
                      value={aiSettings.googleClientSecret || ''}
                      onChange={(e) => handleAiSettingChange('googleClientSecret', e.target.value)}
                      placeholder="Your Google Client Secret"
                      className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Redirect URI</label>
                    <input 
                      type="text"
                      value={aiSettings.googleRedirectUri || ''}
                      onChange={(e) => handleAiSettingChange('googleRedirectUri', e.target.value)}
                      placeholder="e.g., https://your-app.com/auth/google/callback"
                      className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-[12px] flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.5 19.125h-11c-2.48 0-4.5-2.02-4.5-4.5 0-2.28 1.7-4.18 3.92-4.46.68-2.61 3.06-4.54 5.83-4.54 2.22 0 4.15 1.22 5.18 3.02 2.11.23 3.82 2.04 3.82 4.23 0 2.35-1.9 4.25-4.25 4.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Microsoft OneDrive</h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">
                    {activeBusiness?.oneDriveCredentials ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOneDriveOpen(true)}
                className="px-4 py-2 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-xs font-bold rounded-[8px] transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
              >
                {activeBusiness?.oneDriveCredentials ? 'Manage' : 'Connect'}
              </button>
            </div>
            
            <div className="p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-[12px] flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.5 19.125h-11c-2.48 0-4.5-2.02-4.5-4.5 0-2.28 1.7-4.18 3.92-4.46.68-2.61 3.06-4.54 5.83-4.54 2.22 0 4.15 1.22 5.18 3.02 2.11.23 3.82 2.04 3.82 4.23 0 2.35-1.9 4.25-4.25 4.25z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Cloudinary</h3>
                    <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Image Hosting</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] space-y-3">
                <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">Optional: Provide your own Cloudinary credentials. If left empty, the server defaults will be used.</p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Cloud Name</label>
                  <input 
                    type="text"
                    value={aiSettings.cloudinaryCloudName || ''}
                    onChange={(e) => handleAiSettingChange('cloudinaryCloudName', e.target.value)}
                    placeholder="e.g., dxxxxxxxxx"
                    className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">API Key</label>
                  <input 
                    type="text"
                    value={aiSettings.cloudinaryApiKey || ''}
                    onChange={(e) => handleAiSettingChange('cloudinaryApiKey', e.target.value)}
                    placeholder="Your Cloudinary API Key"
                    className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">API Secret</label>
                  <input 
                    type="password"
                    value={aiSettings.cloudinaryApiSecret || ''}
                    onChange={(e) => handleAiSettingChange('cloudinaryApiSecret', e.target.value)}
                    placeholder="Your Cloudinary API Secret"
                    className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>
            
            <OneDriveSetup 
              isOpen={isOneDriveOpen}
              onClose={() => setIsOneDriveOpen(false)}
              onConnect={handleConnectOneDrive}
              isConnected={!!activeBusiness?.oneDriveCredentials}
              onDisconnect={handleDisconnectOneDrive}
            />
          </div>
        </BentoCard>
        </div>
          </motion.div>
        </section>

        {/* Local AI */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Local AI</h2>
            <p className="text-sm text-secondary-safe mt-1">On-device models for widgets and creative tools</p>
          </div>
          <motion.div layout className="grid grid-cols-1 gap-4 sm:gap-6 items-stretch">
        <div className="min-h-0 h-full">
        <BentoCard
          id="ai"
          title="Local AI"
          subtitle="Widgets and creative tools run on-device by default"
          icon={Sparkles}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="relative space-y-6 pt-4">
            <div className="absolute -top-12 right-0">
              <button 
                onClick={() => {
                  sessionStorage.setItem('forge_brand_open_section', 'knowledge');
                  setActiveTab?.('brandkit');
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-xs font-bold transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
              >
                <MessageSquareText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Brand & AI Guide
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
              <div>
                <p className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">Fallback to cloud AI services</p>
                <p className="text-[10px] text-secondary-safe mt-0.5">
                  When local WebLLM fails, try Gemini, Groq, and other cloud providers (off by default)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAiSettingChange('fallbackToCloudAi', !aiSettings.fallbackToCloudAi)}
                className={cn(
                  'w-10 h-6 rounded-full relative transition-colors shrink-0',
                  aiSettings.fallbackToCloudAi === true ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
                )}
                aria-pressed={aiSettings.fallbackToCloudAi === true}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                    aiSettings.fallbackToCloudAi === true ? 'left-5' : 'left-1'
                  )}
                />
              </button>
            </div>

            <div className="p-4 rounded-[16px] bg-indigo-50/80 dark:bg-indigo-900/15 border border-indigo-100 dark:border-indigo-900/30 space-y-2">
              <p className="text-xs text-[#37352F] dark:text-[#EBE9ED] leading-relaxed">
                Text runs in your browser via WebLLM. Images use your local model to refine prompts, then render through a free Flux endpoint—no Puter or Gemini sign-in required for widgets.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!showCloudAiOptions) {
                    handleAiSettingChange('preferredProvider', 'builtin');
                    handleAiSettingChange('imageProvider', 'builtin');
                  }
                  setShowCloudAiOptions(!showCloudAiOptions);
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showCloudAiOptions ? 'Hide cloud providers' : 'Optional: use Gemini, Groq, Puter, or Ollama'}
              </button>
            </div>

            {showCloudAiOptions && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Cloud & hybrid providers</label>
                <div className="flex p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-x-auto scrollbar-hide">
                  {['builtin', 'gemini', 'groq', 'puter', 'local_proxy', 'auto'].map((provider) => (
                    <button
                      key={provider}
                      onClick={() => handleAiSettingChange('preferredProvider', provider)}
                      className={cn(
                        "flex-1 min-w-[70px] py-2 text-sm font-bold rounded-[8px] transition-all capitalize whitespace-nowrap",
                        aiSettings.preferredProvider === provider 
                          ? "bg-white dark:bg-[#2E2E2E]  text-[#2383E2]" 
                          : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                      )}
                    >
                      {provider === 'local_proxy' ? 'Ollama' : provider}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 sm:p-5 bg-[#F7F7F5] dark:bg-[#202020] rounded-[16px]">
              {showCloudAiOptions && aiSettings.preferredProvider === 'gemini' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Custom Gemini API Key</label>
                    <input 
                      type="password"
                      value={aiSettings.geminiApiKey || ''}
                      onChange={(e) => handleAiSettingChange('geminiApiKey', e.target.value)}
                      placeholder="Leave empty to use default"
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Gemini Model</label>
                    <select 
                      value={aiSettings.geminiModel}
                      onChange={(e) => handleAiSettingChange('geminiModel', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    >
                      {GEMINI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : showCloudAiOptions && aiSettings.preferredProvider === 'groq' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Custom Groq API Key</label>
                    <input 
                      type="password"
                      value={aiSettings.groqApiKey || ''}
                      onChange={(e) => handleAiSettingChange('groqApiKey', e.target.value)}
                      placeholder="Leave empty to use default"
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Groq Model</label>
                    </div>
                    <select 
                      value={aiSettings.groqModel}
                      onChange={(e) => handleAiSettingChange('groqModel', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    >
                      {GROQ_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (!showCloudAiOptions || aiSettings.preferredProvider === 'builtin') ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded-[16px] space-y-4">
                    {(() => {
                      const selectedModelId = aiSettings.builtinModelId || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
                      const selectedModel = BUILTIN_MODELS.find(m => m.id === selectedModelId) || BUILTIN_MODELS[0];
                      const stageLabel = builtInStatus.isLoading ? 'INITIALIZING' : builtInStatus.isLoaded ? 'READY' : builtInStatus.error ? 'ACTION REQUIRED' : 'NOT INITIALIZED';
                      return (
                        <div className="p-3 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px]">
                          <p className="text-[11px] font-bold text-[#37352F] dark:text-[#EBE9ED]">Setup flow: Select model {'>'} Initialize {'>'} Ready</p>
                          <p className="text-[10px] text-[#757681] dark:text-[#9B9A97] mt-1">
                            Status: {stageLabel}. Recommended: {selectedModel.recommendedRamGb}GB RAM, {selectedModel.estimatedVramGb}GB VRAM, dataset {selectedModel.recommendedDatasetMin}-{selectedModel.recommendedDatasetMax} examples.
                          </p>
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Local AI Engine</h4>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        builtInStatus.isLoaded ? "bg-green-100 text-green-700" : builtInStatus.isLoading ? "bg-blue-100 text-blue-700" : "bg-brand/10 text-brand"
                      )}>
                        {builtInStatus.isLoading ? 'INITIALIZING' : builtInStatus.isLoaded ? 'READY' : 'SETUP REQUIRED'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Select Local Model</label>
                        <select 
                          value={aiSettings.builtinModelId || 'Llama-3.2-1B-Instruct-q4f16_1-MLC'}
                          onChange={(e) => handleAiSettingChange('builtinModelId', e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-xs outline-none focus:border-brand"
                        >
                          {BUILTIN_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.size})</option>
                          ))}
                          <option value="custom">Custom / Local Upload</option>
                        </select>
                        <div className="flex items-start gap-1 pb-1">
                          <Info className="w-3 h-3 text-[#757681] mt-0.5 shrink-0" />
                          <p className="text-[10px] text-[#757681] leading-tight">
                            {aiSettings.builtinModelId === 'custom' 
                              ? 'Configure a custom model from a URL or local directory.' 
                              : BUILTIN_MODELS.find(m => m.id === (aiSettings.builtinModelId || 'Llama-3.2-1B-Instruct-q4f16_1-MLC'))?.description}
                          </p>
                        </div>
                        {(() => {
                          const modelId =
                            aiSettings.builtinModelId === 'custom'
                              ? null
                              : aiSettings.builtinModelId || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
                          const budget = getContextBudget(modelId);
                          const inputK = Math.round(budget.maxInputChars / 1000);
                          const loadedBudget =
                            builtInStatus.isLoaded && builtInStatus.maxInputChars
                              ? builtInStatus.maxInputChars
                              : budget.maxInputChars;
                          return (
                            <div className="p-3 rounded-[10px] bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] space-y-1">
                              <p className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wide">
                                Context budget
                              </p>
                              <p className="text-[10px] text-[#757681] dark:text-[#9B9A97] leading-relaxed">
                                ~{inputK}k input chars ({budget.contextWindow.toLocaleString()} token window).
                                Brand knowledge capped at {LOCAL_KNOWLEDGE_MAX_CHARS.toLocaleString()} chars for local AI.
                              </p>
                              {builtInStatus.isLoaded && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  Engine ready — up to ~{Math.round(loadedBudget / 1000)}k chars per request.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                        <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">
                          Local vision model (image analysis)
                        </label>
                        <select
                          value={aiSettings.builtinVisionModelId || 'Phi-3.5-vision-instruct-q4f16_1-MLC'}
                          onChange={(e) => handleAiSettingChange('builtinVisionModelId', e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-xs outline-none focus:border-brand"
                        >
                          {BUILTIN_VISION_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.size})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-[#757681] dark:text-[#9B9A97] leading-relaxed">
                          {BUILTIN_VISION_MODELS.find(
                            (m) => m.id === (aiSettings.builtinVisionModelId || 'Phi-3.5-vision-instruct-q4f16_1-MLC')
                          )?.description}{' '}
                          Used when you drop images on the calendar, analyse posts, or brainstorm from photos—runs in-browser via WebGPU (Phi-3.5 Vision).
                        </p>
                        {builtInStatus.visionIsLoaded && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Vision engine ready ({builtInStatus.visionModelId})
                          </p>
                        )}
                      </div>

                      {aiSettings.builtinModelId === 'custom' && (
                        <div className="space-y-3 p-3 bg-white dark:bg-[#1A1A1A] border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] animate-in zoom-in-95 duration-200">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase">Custom Model Config URL (WebLLM)</label>
                            <input 
                              type="text"
                              value={aiSettings.customModelUrl || ''}
                              onChange={(e) => handleAiSettingChange('customModelUrl', e.target.value)}
                              placeholder="https://example.com/model/mlc-chat-config.json"
                              className="w-full p-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] text-[11px] outline-none focus:border-brand"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase">Local Server Proxy (Ollama / LM Studio)</label>
                            <input 
                              type="text"
                              value={aiSettings.localProxyUrl || ''}
                              onChange={(e) => handleAiSettingChange('localProxyUrl', e.target.value)}
                              placeholder="http://localhost:11434/v1"
                              className="w-full p-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] text-[11px] outline-none focus:border-brand"
                            />
                            <p className="text-[9px] text-[#757681]">Enable "Local Server" in chat provider options to use this. Works on Cloudflare/Hosted sites if CORS is enabled on your local server.</p>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      // @ts-ignore
                                      const dirHandle = await window.showDirectoryPicker();
                                      toast.success(`Selected local model directory: ${dirHandle.name}`);
                                      // In a real app we'd need a worker or service worker to serve these files
                                      // For now we'll save the handle or just notify user it's for localhost dev
                                      handleAiSettingChange('localModelDir', dirHandle.name);
                                      toast.info("Local directory loading usually requires localhost or a custom Service Worker. Attempting to use path as base...");
                                    } catch (e: any) {
                                      if (e.name !== 'AbortError') {
                                        toast.error("File System Access API not supported or failed.");
                                      }
                                    }
                                  }}
                                  className="flex-1 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] text-[10px] font-bold hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-all flex items-center justify-center gap-2"
                                >
                                  <Database className="w-3 h-3" />
                                  Select Local Folder
                                </button>
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.json,.gguf';
                                    input.onchange = (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        toast.success(`Selected model file: ${file.name}`);
                                        if (file.name.endsWith('.json')) {
                                          const reader = new FileReader();
                                          reader.onload = (re) => {
                                            try {
                                              const config = JSON.parse(re.target?.result as string);
                                              handleAiSettingChange('customModelConfig', config);
                                              toast.success("Loaded custom WebLLM config!");
                                            } catch (err) {
                                              toast.error("Invalid JSON config file.");
                                            }
                                          };
                                          reader.readAsText(file);
                                        } else {
                                          toast.info("GGUF support follows Windex/WASM standards. Forge expects MLC-compliant JSON for high-performance WebGPU.");
                                        }
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="flex-1 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] text-[10px] font-bold hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-all flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-3 h-3" />
                                  Upload Config
                                </button>
                             </div>
                             <p className="text-[9px] text-[#757681] dark:text-[#9B9A97] italic">
                               WebLLM models are compiled specifically for WebGPU. Upload a "mlc-chat-config.json" or select a compiled folder.
                             </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {showAdvancedTune && (
                    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-[12px] flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Wand2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">AI Fine-tuning</h4>
                            <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Optimize local models for your business.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            toast.info(`Fine-tune preset: ${tunePreset.toUpperCase()}`);
                            handleStartFinetune();
                          }}
                          disabled={finetuneStatus.isRunning || !builtInStatus.isLoaded}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2",
                            finetuneStatus.isRunning 
                              ? "bg-indigo-500/10 text-indigo-500 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-95"
                          )}
                        >
                          {finetuneStatus.isRunning ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Tuning...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Start Fine-tune
                            </>
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['fast', 'balanced', 'quality'] as const).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setTunePreset(preset)}
                            className={cn(
                              "px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-colors",
                              tunePreset === preset ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-[#202020] text-[#757681] border-[#E9E9E7] dark:border-[#2E2E2E]"
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowAdvancedTune(prev => !prev)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline w-fit"
                      >
                        {showAdvancedTune ? 'Hide advanced tuning' : 'Show advanced tuning'}
                      </button>
                      {showAdvancedTune && (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-[#F7F7F5] dark:bg-[#202020]">Epochs: {tunePreset === 'fast' ? '1' : tunePreset === 'balanced' ? '2' : '3'}</div>
                          <div className="p-2 rounded-lg bg-[#F7F7F5] dark:bg-[#202020]">LR: {tunePreset === 'quality' ? '0.00008' : '0.00015'}</div>
                          <div className="p-2 rounded-lg bg-[#F7F7F5] dark:bg-[#202020]">Context: {tunePreset === 'fast' ? '2k' : '4k'}</div>
                          <div className="p-2 rounded-lg bg-[#F7F7F5] dark:bg-[#202020]">Run mode: {tunePreset}</div>
                        </div>
                      )}

                      {!builtInStatus.isLoaded && (
                        <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-amber-500" />
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Please wait for Local AI to load before fine-tuning.</p>
                        </div>
                      )}

                      {(finetuneStatus.isRunning || finetuneStatus.progress > 0) && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wider flex items-center gap-2">
                              {finetuneStatus.isRunning ? <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                              {finetuneStatus.isRunning ? 'Training Process' : 'Fine-tune Complete'}
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400">{finetuneStatus.progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-indigo-500/5 rounded-full overflow-hidden border border-indigo-500/10">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${finetuneStatus.progress}%` }}
                              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                            />
                          </div>
                          
                          <div className="p-3 bg-[#1A1A1A] border border-[#2E2E2E] rounded-[12px] max-h-[200px] overflow-y-auto scrollbar-hide">
                            <div className="font-mono text-[10px] text-indigo-400/90 leading-relaxed space-y-1">
                              {finetuneStatus.logs.map((log: string, i: number) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  key={i} 
                                  className="flex gap-2"
                                >
                                  <span className="text-gray-600 shrink-0 select-none">{i + 1}</span>
                                  <span>{log}</span>
                                </motion.div>
                              ))}
                              {finetuneStatus.isRunning && (
                                <motion.div 
                                  animate={{ opacity: [0, 1] }} 
                                  transition={{ repeat: Infinity, duration: 0.8 }}
                                  className="w-1.5 h-3 bg-indigo-500 inline-block align-middle ml-1"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowAdvancedTune((v) => !v)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline w-fit"
                    >
                      {showAdvancedTune ? 'Hide fine-tuning' : 'Advanced: model fine-tuning'}
                    </button>
                    
                    {(() => {
                      const selectedModelId = aiSettings.builtinModelId || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
                      const isModelSelectedLoaded = builtInStatus.isLoaded && (builtInStatus.modelId === selectedModelId || (selectedModelId === 'custom' && !!builtInStatus.modelId));
                      const getModelName = () => {
                        if (selectedModelId === 'custom') return 'Custom Model';
                        return BUILTIN_MODELS.find(m => m.id === selectedModelId)?.name || 'Selected Model';
                      };

                      return !isModelSelectedLoaded && !builtInStatus.isLoading && (
                        <button 
                          onClick={() => {
                            void (async () => {
                              const ai = await getBuiltInAi();
                              if (selectedModelId === 'custom') {
                                if (!aiSettings.customModelUrl && !aiSettings.customModelConfig) {
                                  toast.error("Please provide a Custom Model URL or Config first.");
                                  return;
                                }
                                const customConfig = aiSettings.customModelConfig || {
                                  model_list: [
                                    {
                                      model: aiSettings.customModelUrl,
                                      model_id: "custom-local-model",
                                      model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Phi3-mini-4k-instruct/Phi3-mini-4k-instruct-q4f16_1-ctx4k-webgpu.wasm",
                                      vram_required_MB: 3000,
                                      low_resource_required: true,
                                    }
                                  ]
                                };
                                await ai.init(selectedModelId === 'custom' ? (customConfig.model_list?.[0]?.model_id || 'custom-model') : selectedModelId, customConfig);
                              } else {
                                await ai.init(selectedModelId);
                              }
                            })();
                          }}
                          className="w-full py-2.5 bg-brand text-white text-xs font-bold rounded-[8px] hover:bg-brand-hover transition-colors shadow-sm"
                        >
                          Initialize {getModelName()} 
                        </button>
                      );
                    })()}
                    
                    {builtInStatus.isLoading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#757681] animate-pulse font-medium max-w-[80%] truncate">
                            {builtInStatus.message || 'Downloading Engine & Model...'}
                          </span>
                          <span className="font-bold text-brand">{builtInStatus.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${builtInStatus.progress}%` }} />
                        </div>
                        <p className="text-[9px] text-center text-[#9B9A97]">This may take a few minutes. Weights are saved to browser cache.</p>
                        <button 
                          onClick={() => void getBuiltInAi().then((ai) => ai.reset())}
                          className="w-full py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-[6px] hover:bg-brand/10 hover:text-brand transition-colors"
                        >
                          Restart Initialization
                        </button>
                        <button 
                          onClick={() => void getBuiltInAi().then((ai) => ai.clearCache())}
                          className="w-full py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-[6px] hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          Clear Local AI Cache
                        </button>
                      </div>
                    )}

                    {builtInStatus.error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg space-y-3">
                        <p className="text-[10px] text-red-500 font-medium">{builtInStatus.error}</p>
                        
                        {(window.self !== window.top) && (
                          <a 
                            href={window.location.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-brand text-white text-[11px] font-bold rounded-[8px] hover:bg-brand/90 transition-all shadow-sm"
                          >
                            <ExternalLink size={14} />
                            Open in New Tab to Fix Local AI
                          </a>
                        )}

                        <div className="flex gap-2">
                           <button 
                            onClick={() => void getBuiltInAi().then((ai) => ai.clearCache())}
                            className="flex-1 py-1.5 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/40 text-red-600 text-[10px] font-bold rounded-[6px] hover:bg-red-50 transition-all"
                          >
                            Wipe Cache
                          </button>
                          <button 
                            onClick={() => void getBuiltInAi().then((ai) => ai.reset())}
                            className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 text-[10px] font-bold rounded-[6px] hover:bg-gray-200 transition-all"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : showCloudAiOptions && aiSettings.preferredProvider === 'puter' ? (
                <div className="space-y-4">
                  <div className={cn(
                    "p-4 rounded-[16px] border transition-all",
                    isPuterSignedIn 
                      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30" 
                      : "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          isPuterSignedIn ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-wider",
                          isPuterSignedIn ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                        )}>
                          {isPuterSignedIn ? "Authenticated" : "Sign In Required"}
                        </span>
                      </div>
                      {isPuterSignedIn && (
                        <button 
                          onClick={handlePuterSignOut}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-tight"
                        >
                          Sign Out
                        </button>
                      )}
                    </div>
                    
                    {!isPuterSignedIn ? (
                      <div className="space-y-3">
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                          Puter.js uses a popup-based auth. Once signed in, you won't need to do it again unless you clear your cookies.
                        </p>
                        <button 
                          onClick={handlePuterSignIn}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-[12px] text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95"
                        >
                          Continue with Puter.js
                        </button>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 bg-white/50 dark:bg-black/20 p-2 rounded-[8px] italic">
                          Tip: Ensure third-party cookies are enabled in your browser settings to keep your session alive.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <p className="text-xs font-medium">Your Puter.js session is active.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Puter Text Model</label>
                    <select 
                      value={aiSettings.puterTextModel || 'gpt-4o-mini'}
                      onChange={(e) => handleAiSettingChange('puterTextModel', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    >
                      {PUTER_TEXT_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : showCloudAiOptions && aiSettings.preferredProvider === 'local_proxy' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-[16px] space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-800 rounded-[12px] flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Ollama / Local Server</h4>
                        <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Connect to your local AI engine.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase">Local Proxy URL</label>
                        <input 
                          type="text"
                          value={aiSettings.localProxyUrl || ''}
                          onChange={(e) => handleAiSettingChange('localProxyUrl', e.target.value)}
                          placeholder="http://localhost:11434/v1"
                          className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                        />
                        <p className="text-[10px] text-[#757681]">Default for Ollama is http://localhost:11434/v1</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase">Model Name</label>
                        <input 
                          type="text"
                          value={aiSettings.localProxyModel || 'llama3'}
                          onChange={(e) => handleAiSettingChange('localProxyModel', e.target.value)}
                          placeholder="llama3, mistral, etc."
                          className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase">Ollama API Key (Optional)</label>
                        <input 
                          type="password"
                          value={aiSettings.localProxyApiKey || ''}
                          onChange={(e) => handleAiSettingChange('localProxyApiKey', e.target.value)}
                          placeholder="Your Ollama API Key"
                          className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                        />
                        <p className="text-[10px] text-[#757681]">Required for Ollama Cloud or password-protected remote servers.</p>
                      </div>

                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-[12px] space-y-2">
                         <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <p className="text-[11px] font-bold">Important: Local Setup</p>
                         </div>
                         <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed">
                           1. <strong>Pull the model</strong>: Ensure you have run <code>ollama pull {aiSettings.localProxyModel || 'llama3'}</code>.<br/>
                           2. <strong>CORS Setup</strong>: Set the <strong>OLLAMA_ORIGINS</strong> environment variable to allow requests from this domain.
                         </p>
                         <div className="space-y-1">
                            <p className="text-[9px] font-bold text-amber-700 uppercase">Windows Command Prompt (CMD):</p>
                            <code className="block p-2 bg-[#202020] text-gray-300 rounded text-[9px] font-mono whitespace-pre-wrap">
                              set OLLAMA_ORIGINS={window.location.origin} && ollama serve
                            </code>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[9px] font-bold text-amber-700 uppercase">PowerShell / Mac / Linux:</p>
                            <code className="block p-2 bg-[#202020] text-gray-300 rounded text-[9px] font-mono whitespace-pre-wrap">
                              OLLAMA_ORIGINS="{window.location.origin}" ollama serve
                            </code>
                         </div>
                         
                         <button
                           onClick={async () => {
                             const toastId = toast.loading("Testing connection to local server...");
                             try {
                               const result = await testLocalServerConnection();
                               toast.success(`Connected to ${result.type}! Found models: ${result.data.models?.map((m: any) => m.name).join(', ') || 'None found'}`, { id: toastId });
                             } catch (e: any) {
                               toast.error(`Connection failed: ${e.message}`, { id: toastId });
                             }
                           }}
                           className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                         >
                           <Activity className="w-3 h-3" />
                           Test Connection
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : showCloudAiOptions && aiSettings.preferredProvider === 'auto' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-[16px] space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wider">Auto Mode Logic</h4>
                    </div>
                    <p className="text-[11px] text-[#757681] dark:text-[#9B9A97] leading-relaxed">
                      Forge intelligently routes tasks. Local AI handles smaller queries (captions, tags) to save quota, while Cloud models take on complex reasoning and vision.
                    </p>
                    
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase">Allowed Auto-Providers</label>
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">Enabled</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'builtin', name: 'Built-in AI (Phi-3)', icon: Cpu },
                          { id: 'local_proxy', name: 'Ollama (Local Server)', icon: Activity },
                          { id: 'puter', name: 'Puter.js (Cloud Proxy)', icon: Globe },
                          { id: 'groq', name: 'Groq (Llama 3.3)', icon: Activity },
                          { id: 'gemini', name: 'Gemini (Google AI)', icon: Sparkles }
                        ].map(prov => (
                          <div 
                            key={prov.id}
                            onClick={() => {
                              const current = aiSettings.allowedAutoProviders || ['builtin', 'puter', 'groq', 'gemini'];
                              const next = current.includes(prov.id)
                                ? current.filter(id => id !== prov.id)
                                : [...current, prov.id];
                              handleAiSettingChange('allowedAutoProviders', next);
                            }}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                              (aiSettings.allowedAutoProviders || ['builtin', 'puter', 'groq', 'gemini']).includes(prov.id)
                                ? "bg-white dark:bg-[#252525] border-blue-200 dark:border-blue-900/50 shadow-sm"
                                : "bg-transparent border-[#E9E9E7] dark:border-[#2E2E2E] opacity-60 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <prov.icon className="w-4 h-4 text-blue-500" />
                              <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">{prov.name}</span>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                              (aiSettings.allowedAutoProviders || ['builtin', 'puter', 'groq', 'gemini']).includes(prov.id)
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300 dark:border-gray-600"
                            )}>
                              {(aiSettings.allowedAutoProviders || ['builtin', 'puter', 'groq', 'gemini']).includes(prov.id) && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Custom Gemini API Key</label>
                        <input 
                          type="password"
                          value={aiSettings.geminiApiKey || ''}
                          onChange={(e) => handleAiSettingChange('geminiApiKey', e.target.value)}
                          placeholder="Leave empty to use default"
                          className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                        />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Custom Groq API Key</label>
                      <input 
                        type="password"
                        value={aiSettings.groqApiKey || ''}
                        onChange={(e) => handleAiSettingChange('groqApiKey', e.target.value)}
                        placeholder="Leave empty to use default"
                        className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Local image generation</label>
              {!showCloudAiOptions ? (
                <div className="space-y-3 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px]">
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97] leading-relaxed">
                    Your on-device model improves each prompt; images render with Flux (Pollinations). No cloud image API required for widgets.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Image model (Flux backend)</label>
                    <select 
                      value={aiSettings.pollinationModel || 'flux'}
                      onChange={(e) => {
                        handleAiSettingChange('pollinationModel', e.target.value);
                        handleAiSettingChange('imageProvider', 'builtin');
                      }}
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    >
                      {POLLINATION_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <>
              <div className="flex p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                {['builtin', 'pollination', 'auto', 'gemini', 'puter'].map((provider) => (
                  <button
                    key={provider}
                    onClick={() => handleAiSettingChange('imageProvider', provider)}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-tighter rounded-[8px] transition-all",
                      aiSettings.imageProvider === provider 
                        ? "bg-white dark:bg-[#2E2E2E] text-[#2383E2] shadow-sm" 
                        : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                    )}
                  >
                    {provider === 'pollination' ? 'Pollination' : provider === 'puter' ? 'Puter' : provider === 'builtin' ? 'Local' : provider === 'auto' ? 'Auto' : 'Gemini'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#757681] dark:text-[#9B9A97] mt-2 leading-relaxed">
                {aiSettings.imageProvider === 'pollination' 
                  ? 'Pollination.ai renders images from your prompt (no local orchestration).' 
                  : aiSettings.imageProvider === 'puter' 
                    ? 'Using Puter.js for image generation.' 
                    : aiSettings.imageProvider === 'builtin'
                      ? 'Phi-3.5 Vision (WebLLM) understands images locally; generation still uses your image provider below when creating assets.'
                      : aiSettings.imageProvider === 'auto'
                        ? 'Tries local orchestration first, then Pollination, then cloud.'
                        : 'Using Gemini Flash Image for high-quality, prompt-aligned images.'}
              </p>
                </>
              )}

              {showCloudAiOptions && aiSettings.imageProvider === 'pollination' && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Pollination.ai API Key (Optional)</label>
                    <input 
                      type="password"
                      value={aiSettings.pollinationApiKey || ''}
                      onChange={(e) => handleAiSettingChange('pollinationApiKey', e.target.value)}
                      placeholder="Leave empty to use free tier"
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Pollination Model</label>
                    <select 
                      value={aiSettings.pollinationModel || 'flux'}
                      onChange={(e) => handleAiSettingChange('pollinationModel', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    >
                      {POLLINATION_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {showCloudAiOptions && aiSettings.imageProvider === 'puter' && (
                <div className="mt-4 space-y-4">
                  {!isPuterSignedIn && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-[12px]">
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-2 font-medium">Puter.js requires authentication for AI services.</p>
                      <button 
                        onClick={handlePuterSignIn}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-[8px] text-xs font-bold transition-colors"
                      >
                        Sign in to Puter.js
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Puter Image Model</label>
                    <select 
                      value={aiSettings.puterImageModel || 'dall-e-3'}
                      onChange={(e) => handleAiSettingChange('puterImageModel', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                    >
                      {PUTER_IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const defaults = getDefaultAiSettings();
                setAiSettingsState(defaults);
                setAiSettings(defaults);
                setShowCloudAiOptions(false);
                toast.success('Reset to local-first AI defaults');
              }}
              className="w-full py-3 px-4 border border-[#6074b9] text-[#6074b9] hover:bg-[#6074b9]/10 rounded-[12px] text-sm font-bold transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </BentoCard>
        </div>
          </motion.div>
        </section>

        {/* Automation & data */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Automation & data</h2>
            <p className="text-sm text-secondary-safe mt-1">Crawl, analytics, backups, and exports</p>
          </div>
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        <div className="min-h-0 h-full">
        <BentoCard
          id="crawl"
          title="Crawl Options"
          subtitle="Configure web scraping and Firecrawl API"
          icon={Search}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Firecrawl API Key</label>
                <input 
                  type="password"
                  value={aiSettings.firecrawlApiKey || ''}
                  onChange={(e) => handleAiSettingChange('firecrawlApiKey', e.target.value)}
                  placeholder="Leave empty to use server default"
                  className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                />
                <p className="text-[10px] text-secondary-safe">
                  Fetches page markdown from websites (map, crawl, scrape). Catalogue conversion uses your local AI model separately.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                <div>
                  <p className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">Catalogue import: local AI only</p>
                  <p className="text-[10px] text-secondary-safe mt-0.5">Markdown → catalogue uses browser AI first</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAiSettingChange('catalogueImportLocalOnly', !(aiSettings.catalogueImportLocalOnly !== false))}
                  className={cn(
                    'w-10 h-6 rounded-full relative transition-colors shrink-0',
                    aiSettings.catalogueImportLocalOnly !== false ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                      aiSettings.catalogueImportLocalOnly !== false ? 'left-5' : 'left-1'
                    )}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                <div>
                  <p className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">Allow cloud fallback</p>
                  <p className="text-[10px] text-secondary-safe mt-0.5">If local extraction fails, try cloud providers</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAiSettingChange('catalogueImportCloudFallback', aiSettings.catalogueImportCloudFallback === false)}
                  className={cn(
                    'w-10 h-6 rounded-full relative transition-colors shrink-0',
                    aiSettings.catalogueImportCloudFallback !== false ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                      aiSettings.catalogueImportCloudFallback !== false ? 'left-5' : 'left-1'
                    )}
                  />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Crawl page limit</label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={aiSettings.catalogueCrawlLimit || 100}
                  onChange={(e) => handleAiSettingChange('catalogueCrawlLimit', Number(e.target.value) || 100)}
                  className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Global Target URL</label>
                <input 
                  type="url"
                  value={aiSettings.targetUrl || ''}
                  onChange={(e) => handleAiSettingChange('targetUrl', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-brand"
                />
                <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">The default URL used by the whole app for crawling and AI analysis.</p>
              </div>
            </div>
          </div>
        </BentoCard>
        </div>

        <div className="min-h-0 h-full">
        <BentoCard
          id="analytics"
          title="Analytics"
          subtitle="Optional profile links · insights use your calendar"
          icon={BarChart3}
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          iconColor="text-pink-600 dark:text-pink-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Instagram profile (optional)</label>
                <div className="relative group">
                  <input
                    type="url"
                    value={analyticsSettings.instagramUrl}
                    onChange={(e) => handleAnalyticsSettingChange('instagramUrl', e.target.value)}
                    placeholder="https://instagram.com/yourbrand"
                    className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] focus:border-brand rounded-[12px] outline-none dark:text-[#EBE9ED] transition-colors text-sm"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className={cn("w-2 h-2 rounded-full", analyticsSettings.instagramUrl ? "bg-green-500" : "bg-gray-300")} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Facebook profile (optional)</label>
                <div className="relative group">
                  <input
                    type="url"
                    value={analyticsSettings.facebookUrl}
                    onChange={(e) => handleAnalyticsSettingChange('facebookUrl', e.target.value)}
                    placeholder="https://facebook.com/yourbrand"
                    className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] focus:border-brand rounded-[12px] outline-none dark:text-[#EBE9ED] transition-colors text-sm"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className={cn("w-2 h-2 rounded-full", analyticsSettings.facebookUrl ? "bg-green-500" : "bg-gray-300")} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[16px] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-[12px] flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300">AI coach</h3>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">Optional daily summary from calendar stats (Insights tab)</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={analyticsSettings.autoRunAnalytics}
                  onChange={(e) => handleAnalyticsSettingChange('autoRunAnalytics', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-brand"></div>
              </label>
            </div>
          </div>
        </BentoCard>
        </div>

        <div className="md:col-span-2 xl:col-span-1 min-h-0 h-full">
        <BentoCard
          id="maintenance"
          title="Data & Maintenance"
          subtitle="Backups, Imports, Danger Zone"
          icon={Database}
          iconBg="bg-cyan-100 dark:bg-cyan-900/30"
          iconColor="text-cyan-600 dark:text-cyan-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-8 pt-4">
            {/* Product Data */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] border-b border-[#E9E9E7] dark:border-[#2E2E2E] pb-2">Product Data</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => setIsExcelImportModalOpen(true)} className="flex flex-col items-center justify-center p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-all text-center group">
                  <FileSpreadsheet className="w-4 h-4 mb-1.5 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] font-bold">AI Excel Import</span>
                </button>
                <button onClick={handleAutoCategorizeAll} disabled={isAutoCategorizing} className="flex flex-col items-center justify-center p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-all text-center group disabled:opacity-50">
                  {isAutoCategorizing ? <ForgeLoader size={16} className="mb-1.5" /> : <Sparkles className="w-4 h-4 mb-1.5 text-purple-600 dark:text-purple-400" />}
                  <span className="text-[10px] font-bold">Categorize</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <h3 className="text-sm font-bold text-red-500">Danger Zone</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setConfirmAction({
                    type: 'Clear all calendar data',
                    onConfirm: async () => {
                      if (user) {
                        setIsSyncing(true);
                        addSyncLog('Clearing all posts from cloud...', 'info');
                        try {
                          if (activeBusiness?.id) {
                            await deleteAllPosts(activeBusiness.id);
                          }
                          localStorage.setItem('rainbow_initialized', 'true');
                        } catch (err) {
                          toast.error('Failed to clear posts from cloud.');
                        } finally {
                          setIsSyncing(false);
                        }
                      }
                      setPosts([]);
                      localStorage.removeItem('rainbow_posts');
                      toast.success('Schedule reset successfully');
                    }
                  })}
                  className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-[12px] hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4" /> Reset Schedule
                </button>
                <button
                  onClick={() => setConfirmAction({
                    type: 'Clear all product tracker data',
                    onConfirm: () => {
                      localStorage.removeItem('rainbowStockCheck');
                      localStorage.removeItem('rainbowCategoryCounts');
                      localStorage.removeItem('rainbow_products');
                      window.dispatchEvent(new Event('storage'));
                      setTimeout(() => window.location.reload(), 1000);
                    }
                  })}
                  className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-[12px] hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-xs font-bold"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Tracker
                </button>
                <button
                  onClick={() => setConfirmAction({
                    type: 'Clear all products from database',
                    onConfirm: () => {
                      localStorage.removeItem('rainbowStockCheck');
                      window.dispatchEvent(new Event('storage'));
                      toast.success('All products cleared.');
                    }
                  })}
                  className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-[12px] hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4" /> Clear Products
                </button>
              </div>
            </div>
          </div>
        </BentoCard>
        </div>

        <div className="min-h-0 h-full">
        <BentoCard
          id="extension"
          title="Forge Web Clipper"
          subtitle="Clip websites and add notes to your Ideas inbox"
          icon={Smartphone}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-6 pt-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[16px] space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-[12px] flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300">Install Extension</h3>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">Easily scrape websites and add them to your Creative Notebook.</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">Installation Instructions:</h4>
                <ol className="text-[11px] text-[#757681] dark:text-[#9B9A97] space-y-2 list-decimal pl-4">
                  <li>Download the extension ZIP file below and extract it.</li>
                  <li>Open Chrome and go to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">chrome://extensions</code>.</li>
                  <li>Enable <strong>Developer mode</strong> (top right).</li>
                  <li>Click <strong>Load unpacked</strong> and select the extracted folder.</li>
                </ol>
              </div>

              <div className="mt-4">
                <button 
                  onClick={() => exportExtensionZip()}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white rounded-[8px] text-xs font-bold hover:bg-brand/90 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Extension (ZIP)
                </button>
              </div>
            </div>
          </div>
        </BentoCard>
        </div>
          </motion.div>
        </section>

        {/* System */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">System</h2>
            <p className="text-sm text-secondary-safe mt-1">Sync activity and diagnostics</p>
          </div>
          <motion.div layout className="grid grid-cols-1 gap-4 sm:gap-6 items-stretch">
        <div className="min-h-0 h-full">
        <BentoCard
          id="logs"
          title="System Logs"
          subtitle="Live sync activity"
          icon={Activity}
          iconBg="bg-gray-100 dark:bg-gray-800"
          iconColor="text-gray-600 dark:text-gray-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="pt-4">
            <div className="bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] overflow-hidden flex flex-col h-64 border border-[#E9E9E7] dark:border-[#2E2E2E]">
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] sm:text-xs">
                {syncLogs.length === 0 ? (
                  <div className="text-[#9B9A97] italic">No sync activity yet...</div>
                ) : (
                  syncLogs.map((log: any) => (
                    <div key={log.id} className="flex gap-3">
                      <span className="text-[#9B9A97] shrink-0">
                        [{format(log.time, 'HH:mm:ss')}]
                      </span>
                      <span className={cn(
                        log.type === 'error' ? 'text-red-500' :
                        log.type === 'success' ? 'text-green-500' :
                        'text-[#37352F] dark:text-[#EBE9ED]'
                      )}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </BentoCard>
        </div>
          </motion.div>
        </section>

        <section className="pt-4 pb-2">
          <div className="rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5]/60 dark:bg-[#202020]/60 px-6 py-8">
            <ChaoticStudioCredits className="mx-auto" />
          </div>
        </section>
      </div>
      <AnimatePresence>
        {dataAction.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#191919] rounded-[16px] p-6 w-full max-w-sm border border-[#E9E9E7] dark:border-[#2E2E2E] "
            >
              <h3 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED] mb-2">
                {dataAction.type === 'restore' ? 'Restore JSON' : dataAction.type === 'export' ? 'Export Excel' : 'Backup JSON'}
              </h3>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mb-6">
                {dataAction.type === 'restore'
                  ? 'Pick a backup type, or auto-detect from any JSON file.'
                  : `Select which data you want to ${dataAction.type}.`}
              </p>
              <div className="space-y-3">
                {dataAction.type === 'restore' && (
                  <button
                    onClick={() => handleDataActionSelect('auto')}
                    className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] font-bold text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-colors text-left"
                  >
                    Auto-detect from file
                    <span className="block text-[10px] font-normal text-[#757681] dark:text-[#9B9A97] mt-0.5">
                      Calendar or product JSON backup
                    </span>
                  </button>
                )}
                <button onClick={() => handleDataActionSelect('schedule')} className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] font-bold text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-colors">
                  Calendar Schedule
                </button>
                <button onClick={() => handleDataActionSelect('product')} className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] font-bold text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-colors">
                  Product Database
                </button>
                {dataAction.type === 'export' && (
                  <button onClick={() => handleDataActionSelect('extension')} className="w-full p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] font-bold text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] transition-colors">
                    Extension Source Code (ZIP)
                  </button>
                )}
              </div>
              <button onClick={() => setDataAction({ type: null })} className="mt-6 w-full p-3 text-[#757681] dark:text-[#9B9A97] font-bold hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-[12px] transition-colors">
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </TabPageContent>
    </TabPageShell>
  );
}
