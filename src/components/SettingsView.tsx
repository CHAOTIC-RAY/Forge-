import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Building2, Sparkles, BarChart3, Database, 
  Download, Save, Upload, RefreshCw, FileSpreadsheet, 
  Globe, LogOut, Smartphone, Bell, Printer, X, Settings,
  Trash2, ChevronDown, Activity, Tags, Link2, Home, Palette, Lightbulb, ListTodo, Search, Moon, CheckCircle2,
  FileText, MessageSquareText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkspacesSettings } from './WorkspacesSettings';
import { ForgeLoader } from './ForgeLoader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { OneDriveSetup } from './OneDriveSetup';

const GEMINI_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Default)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
];

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Default)' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
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
          <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", iconBg, iconColor)}>
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
  db,
  setPosts,
  query,
  collection,
  where,
  getDocs,
  writeBatch,
  industryConfig,
  setActiveTab,
  onThemePresetChange
}: any) {
  const [expandedId, setExpandedId] = useState<string | null>(() => typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'account' : null);
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem('forge_theme_preset') || 'default');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('category');

  const [isOneDriveOpen, setIsOneDriveOpen] = useState(false);
  const [dataAction, setDataAction] = useState<{ type: 'restore' | 'export' | 'backup' | null }>({ type: null });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [restoreTarget, setRestoreTarget] = useState<'schedule' | 'product' | null>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isPuterSignedIn, setIsPuterSignedIn] = useState(false);

  useEffect(() => {
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
    return () => clearInterval(interval);
  }, []);

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

  const handleDataActionSelect = (target: 'schedule' | 'product' | 'extension') => {
    if (dataAction.type === 'export') {
      if (target === 'schedule') setIsExportModalOpen(true);
      else if (target === 'product') exportProductExcel();
      else if (target === 'extension') exportExtensionZip();
    } else if (dataAction.type === 'backup') {
      if (target === 'schedule') exportScheduleJson();
      else exportProductJson();
    } else if (dataAction.type === 'restore') {
      setRestoreTarget(target as 'schedule' | 'product');
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
    setDataAction({ type: null });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (restoreTarget === 'schedule') {
      importScheduleJson(e);
    } else if (restoreTarget === 'product') {
      importProductJson(e);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setRestoreTarget(null);
  };

  useEffect(() => {
    if (user && activeBusiness?.id) {
      const docRef = doc(db, 'categories', activeBusiness.id);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setCategories(docSnap.data().categories || []);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `categories/${activeBusiness.id}`);
      });
      return () => unsubscribe();
    } else {
      const saved = localStorage.getItem(`rainbowCategories_${activeBusiness?.id || 'default'}`);
      if (saved) {
        setCategories(JSON.parse(saved));
      }
    }
  }, [user, activeBusiness?.id, db]);

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = { id: crypto.randomUUID(), name: newCategoryName.trim(), type: newCategoryType, enabled: true };
    const updated = [...categories, newCat];
    setCategories(updated);
    setNewCategoryName('');
    
    if (user && activeBusiness?.id) {
      await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });
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
      await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });
      
      // Update posts that use this category
      setIsSyncing(true);
      addSyncLog(`Updating category name from "${oldName}" to "${newName}"...`, 'info');
      try {
        const q = query(collection(db, 'posts'), where('businessId', '==', activeBusiness.id));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        let count = 0;
        snapshot.docs.forEach((docSnap: any) => {
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
        if (count > 0) {
          await batch.commit();
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
      await setDoc(doc(db, 'categories', activeBusiness.id), { categories: updated }, { merge: true });
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
      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        oneDriveCredentials,
        updatedAt: new Date().toISOString()
      });
      
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
      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        oneDriveCredentials: null,
        updatedAt: new Date().toISOString()
      });
      
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

  const THEME_PRESETS = [
    { id: 'default', name: 'Notion Minimal', colors: ['#FFFFFF', '#37352F'], description: 'Clean, focused, and professional.' },
    { id: 'midnight', name: 'Midnight Forge', colors: ['#0F172A', '#38BDF8'], description: 'Deep blues and vibrant highlights.' },
    { id: 'forest', name: 'Forest Growth', colors: ['#064E3B', '#10B981'], description: 'Natural greens for a calm workspace.' },
    { id: 'sunset', name: 'Golden Hour', colors: ['#7C2D12', '#F97316'], description: 'Warm oranges and deep browns.' },
    { id: 'cyberpunk', name: 'Neon Pulse', colors: ['#1A1A1A', '#FF00FF'], description: 'High contrast neon aesthetics.' },
    { id: 'nord', name: 'Nordic Frost', colors: ['#2E3440', '#88C0D0'], description: 'Cool, arctic-inspired palette.' }
  ];

  const [isAiInstructionModalOpen, setIsAiInstructionModalOpen] = useState(false);
  const [instructionText, setInstructionText] = useState(aiSettings.systemInstructions || '');

  useEffect(() => {
    setInstructionText(aiSettings.systemInstructions || '');
  }, [aiSettings.systemInstructions]);

  const handleSaveInstructions = () => {
    handleAiSettingChange('systemInstructions', instructionText);
    setIsAiInstructionModalOpen(false);
    toast.success("AI System Instructions updated!");
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
    <div className="flex flex-col bg-transparent relative">
      <div className="hidden md:block p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-bg rounded-[16px] flex items-center justify-center">
              <Settings className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] tracking-tight">Settings</h1>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mt-1">Manage your workspace, integrations, and preferences.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#757681] dark:text-[#9B9A97] mr-2">Data Actions:</span>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-xs font-bold transition-colors">
              <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Print PDF
            </button>
            <button onClick={() => setDataAction({ type: 'restore' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-xs font-bold transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#757681] dark:text-[#9B9A97]" /> Restore JSON
            </button>
            <button onClick={() => setDataAction({ type: 'export' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-xs font-bold transition-colors">
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Export Excel
            </button>
            <button onClick={() => setDataAction({ type: 'backup' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-xs font-bold transition-colors">
              <Save className="w-3.5 h-3.5 text-[#757681] dark:text-[#9B9A97]" /> Backup JSON
            </button>
            <input type="file" accept=".json" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
          </div>
        </div>
      </div>

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
                    <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED]">AI System Instructions</h3>
                    <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Define how the AI should behave across the entire app.</p>
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Instructions (Markdown)</label>
                    <span className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider">Saved to Cloud</span>
                  </div>
                  <textarea 
                    value={instructionText}
                    onChange={(e) => setInstructionText(e.target.value)}
                    placeholder="# Your Custom AI Instructions&#10;Define tone, style, and specific business rules here...&#10;&#10;Example:&#10;- Always use a professional yet friendly tone.&#10;- Focus on sustainable materials.&#10;- Never mention competitors."
                    className="w-full h-[300px] p-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] text-sm font-mono outline-none focus:border-brand transition-colors resize-none"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={handleSaveInstructions}
                    className="flex-1 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-[12px] transition-all shadow-lg shadow-[#2665fd]/20 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Instructions
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
          onClick={() => setActiveTab?.('home')}
          className="col-span-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-[16px] flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
            <Home className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">Home</span>
        </button>
        
        <button 
          onClick={() => setActiveTab?.('brandkit')}
          className="col-span-3 flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-[16px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
            <Palette className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED] text-center line-clamp-1">{industryConfig?.terminology?.assets || 'Brand Kit'}</span>
        </button>

        <button 
          onClick={() => setActiveTab?.('creative')}
          className="col-span-2 flex flex-col items-center justify-center p-3 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-[12px] flex items-center justify-center text-purple-600 dark:text-purple-400 mb-1.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED]">AI Studio</span>
        </button>

        <button 
          onClick={() => setActiveTab?.('analytics')}
          className="col-span-2 flex flex-col items-center justify-center p-3 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-[12px] flex items-center justify-center text-pink-600 dark:text-pink-400 mb-1.5">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED]">Insights</span>
        </button>

        <button 
          onClick={() => setActiveTab?.('ideas')}
          className="col-span-2 flex flex-col items-center justify-center p-3 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-[12px] flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-[#37352F] dark:text-[#EBE9ED]">Ideas</span>
        </button>

        <button 
          onClick={() => setActiveTab?.('search')}
          className="col-span-6 flex items-center gap-4 p-4 bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px]  active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-[16px] flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Workspace Inventory</span>
            <span className="text-[10px] text-[#757681] dark:text-[#9B9A97]">Manage your product database</span>
          </div>
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest px-1">Global Configuration</h2>
      </div>

      <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start pb-24">
        
        {/* Account & App Card */}
        <BentoCard
          id="account"
          title="Account & App"
          subtitle="Profile, Theme"
          icon={User}
          customIcon={user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-[16px]" /> : null}
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

        {/* Appearance & Theme Card */}
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

            <div className="p-4 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-[12px] flex items-center justify-center text-pink-600 dark:text-pink-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Advanced Theme Settings</h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Choose a visual preset for your workspace</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleThemePresetChange(preset.id)}
                    className={cn(
                      "p-3 rounded-[12px] border text-left transition-all group relative overflow-hidden",
                      themePreset === preset.id 
                        ? "border-brand bg-brand-bg ring-2 ring-brand/20" 
                        : "border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand/50 bg-white dark:bg-[#191919]"
                    )}
                  >
                    <div className="flex gap-1 mb-2">
                      {preset.colors.map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-black/5" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <h4 className="text-xs font-bold truncate">{preset.name}</h4>
                    {themePreset === preset.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-3 h-3 text-brand" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Workspaces Card */}
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
            />
          </div>
        </BentoCard>

        {/* Integrations Card */}
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

        {/* AI Engine Card */}
        <BentoCard
          id="ai"
          title="Global AI Engine"
          subtitle={`Provider: ${aiSettings.preferredProvider === 'gemini' ? 'Gemini' : aiSettings.preferredProvider === 'groq' ? 'Groq' : 'Auto'}`}
          icon={Sparkles}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="relative space-y-6 pt-4">
            <div className="absolute -top-12 right-0">
              <button 
                onClick={() => setIsAiInstructionModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-xs font-bold transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
              >
                <MessageSquareText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                AI Instructions
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Preferred AI Provider</label>
              <div className="flex p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                {['auto', 'gemini', 'groq', 'puter'].map((provider) => (
                  <button
                    key={provider}
                    onClick={() => handleAiSettingChange('preferredProvider', provider)}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-[8px] transition-all capitalize",
                      aiSettings.preferredProvider === provider 
                        ? "bg-white dark:bg-[#2E2E2E]  text-[#2383E2]" 
                        : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                    )}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-[#F7F7F5] dark:bg-[#202020] rounded-[16px]">
              {aiSettings.preferredProvider === 'gemini' ? (
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
              ) : aiSettings.preferredProvider === 'groq' ? (
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
              ) : aiSettings.preferredProvider === 'puter' ? (
                <div className="space-y-4">
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
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">
                    Auto mode will automatically select the best provider (Groq for fast text, Gemini for complex reasoning and vision).
                  </p>
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
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <label className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Image Generation API</label>
              <div className="flex p-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                {['gemini', 'pollination', 'puter'].map((provider) => (
                  <button
                    key={provider}
                    onClick={() => handleAiSettingChange('imageProvider', provider)}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-[8px] transition-all capitalize",
                      aiSettings.imageProvider === provider 
                        ? "bg-white dark:bg-[#2E2E2E]  text-[#2383E2]" 
                        : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                    )}
                  >
                    {provider === 'pollination' ? 'Pollination.ai' : provider === 'puter' ? 'Puter.js' : 'Gemini'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#757681] dark:text-[#9B9A97] mt-2">
                {aiSettings.imageProvider === 'pollination' 
                  ? 'Using Pollination.ai for fast, free image generation.' 
                  : aiSettings.imageProvider === 'puter' ? 'Using Puter.js for image generation.' : 'Using Gemini Flash Image for high-quality, prompt-aligned images.'}
              </p>

              {aiSettings.imageProvider === 'pollination' && (
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

              {aiSettings.imageProvider === 'puter' && (
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
                const defaults = { 
                  geminiModel: 'gemini-3.1-pro-preview', 
                  groqModel: 'llama-3.3-70b-versatile', 
                  groqVisionModel: 'llama-3.2-11b-vision-preview',
                  firecrawlApiKey: '',
                  targetUrl: ''
                };
                setAiSettingsState(defaults);
                setAiSettings(defaults);
                toast.success('AI settings reset to defaults');
              }}
              className="w-full py-3 px-4 border border-[#6074b9] text-[#6074b9] hover:bg-[#6074b9]/10 rounded-[12px] text-sm font-bold transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </BentoCard>

        {/* Crawl Options Card */}
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
                <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">Used for extracting products and content from websites.</p>
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

        <BentoCard
          id="analytics"
          title="Analytics"
          subtitle={`${analyticsSettings.targetPlatforms?.length || 0} platforms tracked`}
          icon={BarChart3}
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          iconColor="text-pink-600 dark:text-pink-400"
          expandedId={expandedId}
          onToggle={toggleExpand}
        >
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Instagram Account</label>
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
                <label className="block text-xs font-bold text-[#757681] dark:text-[#9B9A97]">Facebook Account</label>
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
                  <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300">AI Analysis</h3>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">Enable automatic daily insights</p>
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

        {/* Data & Maintenance Card */}
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
                          const q = query(collection(db, 'posts'), where('businessId', '==', activeBusiness?.id || ''));
                          const snapshot = await getDocs(q);
                          if (!snapshot.empty) {
                            const batchSize = 450;
                            const docs = snapshot.docs;
                            for (let i = 0; i < docs.length; i += batchSize) {
                              const batch = writeBatch(db);
                              docs.slice(i, i + batchSize).forEach((d: any) => batch.delete(d.ref));
                              await batch.commit();
                            }
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

        {/* Chrome Extension Card */}
        <BentoCard
          id="extension"
          title="Forge Web Clipper"
          subtitle="Clip websites and add notes to your notebook"
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

        {/* System Logs Card */}
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

      </motion.div>
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
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mb-6">Select which data you want to {dataAction.type}.</p>
              <div className="space-y-3">
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
    </div>
  );
}
