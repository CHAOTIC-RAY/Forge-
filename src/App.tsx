import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  DragOverlay,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  useDroppable
} from '@dnd-kit/core';
import { 
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isAfter } from 'date-fns';
import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { 
  Menu, Plus, Download, Calendar as CalendarIcon, Database, Notebook, LayoutGrid, Trash2, RefreshCw, Save, Upload, Smartphone, X, Info, Globe, Printer, AlertCircle, Cloud, User, CheckCircle2, FileSpreadsheet, MessageSquare, Sparkles, Newspaper, Lightbulb, Palette, BarChart3, Maximize, Share2,
  Settings, ListTodo, LogOut, Bell, Building2, Search as SearchIcon, Moon, Sun, Lock
} from 'lucide-react';
import { Type } from "@google/genai";

import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { Post, initialPosts, Business } from './data';
import { WorkspaceProvider as AppWorkspaceProvider } from './contexts/WorkspaceContext';
import { WorkspaceProvider as ConfigWorkspaceProvider } from './lib/workspaceConfig';
import { getIndustryConfig, getDbMode } from './lib/industryConfig';
import { HighStockProduct, getAi, isGeminiKeyAvailable } from './lib/gemini';
import { Calendar } from './components/Calendar';
import { HomeTab } from './components/HomeTab';
import { CalendarSharing } from './components/CalendarSharing';
import { PostModal } from './components/modals/PostModal';
import { ImageViewer } from './components/ImageViewer';
import { LocalDb } from './components/LocalDb';
import { DirectSearch } from './components/DirectSearch';
import { ExportModal, ExportSettings } from './components/modals/ExportModal';
import { ExcelImportModal } from './components/modals/ExcelImportModal';
import { BusinessModal } from './components/modals/BusinessModal';
import { CreativeStudioTab } from './components/CreativeStudioTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsView } from './components/SettingsView';
import { BrandKitTab } from './components/BrandKitTab';
import { NotebookTab } from './components/NotebookTab';
import { FloatingChat } from './components/FloatingChat';
import { WorkspaceManagementTab } from './components/WorkspaceManagementTab';
import { 
  generatePostContent, 
  generateMockupImage, 
  generatePostFromImage,
  GEMINI_MODELS,
  GROQ_MODELS,
  getAiSettings,
  setAiSettings,
  getExcelMappingWithAi,
  generateBulkPosts,
  fetchServerConfig
} from './lib/gemini';
import { db, auth, storage, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { uploadBase64Image } from './lib/storage';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  getDocs,
  writeBatch,
  serverTimestamp,
  limit,
  updateDoc,
  or
} from 'firebase/firestore';
import { ref, deleteObject, getBlob } from 'firebase/storage';
import { cn, readFileAsDataURL, createImageCollage, getAnalyticsSettings, setAnalyticsSettings } from './lib/utils';

import { WorkspacesSettings } from './components/WorkspacesSettings';
import { ForgeLoader } from './components/ForgeLoader';
import { ForgeLogo } from './components/ForgeLogo';
import { Login } from './components/Login';
import { LandingView } from './components/LandingView';
import { OnboardingWizard } from './components/OnboardingWizard';

type SyncLog = {
  id: string;
  time: Date;
  message: string;
  type: 'info' | 'success' | 'error';
};

function DroppableTab({ id, children, className, onClick, title }: { id: string, children: React.ReactNode, className?: string, onClick?: () => void, title?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      title={title}
      className={cn(className, isOver && "ring-2 ring-blue-500 bg-blue-500/10")}
    >
      {children}
    </button>
  );
}

function DroppableZone({ id, label, icon, color }: { id: string, label: string, icon: React.ReactNode, color: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "px-10 py-6 rounded-[32px] flex flex-col items-center justify-center gap-3 transition-all border-4 shadow-2xl min-w-[160px]",
        isOver 
          ? `${color} border-white scale-125 z-[110] ring-8 ring-white/20` 
          : "bg-white/10 backdrop-blur-xl border-white/30 text-white scale-100",
        "pointer-events-auto cursor-pointer"
      )}
    >
      <div className={cn("p-3 rounded-full", isOver ? "bg-white/20" : "bg-white/10")}>
        {icon}
      </div>
      <span className="font-black uppercase tracking-[0.2em] text-xs">{label}</span>
    </div>
  );
}

export default function App() {
  // Clean redeploy after restoring Electron, PWA, and simplifying build scripts
  const [user, loading, authError] = useAuthState(auth);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const isCtrlPressed = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlPressed.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlPressed.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Also track mouse blurs which can mess up key states
    const handleBlur = () => { isCtrlPressed.current = false; };
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setAuthTimeout(true);
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setAuthTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      if (isTouch) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  const [aiSettings, setAiSettingsState] = useState(getAiSettings());
  
  useEffect(() => {
    fetchServerConfig().catch(console.error);
  }, []);

  const [analyticsSettings, setAnalyticsSettingsState] = useState(getAnalyticsSettings());
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Sign-in cancelled. Please keep the popup open to sign in.");
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Network error. Please check your connection and try again.");
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        toast.error("A temporary authentication error occurred. Please try again.");
      } else {
        toast.error(error.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Business multi-tenancy state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  
  const isAdmin = useMemo(() => !!(user && activeBusiness && (
    activeBusiness.ownerId === user.uid || 
    activeBusiness.memberRoles?.[user.uid] === 'admin' ||
    activeBusiness.memberRoles?.[user.uid] === 'editor'
  )), [user, activeBusiness]);
  
  const isViewer = useMemo(() => !!(user && activeBusiness && activeBusiness.memberRoles?.[user.uid] === 'viewer'), [user, activeBusiness]);
  const isGuest = !user;
  const [calendarMode, setCalendarMode] = useState<'work' | 'personal'>('work');
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [sharedBusiness, setSharedBusiness] = useState<Business | null>(null);
  const [isCheckingShare, setIsCheckingShare] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const industryConfig = useMemo(() => getIndustryConfig(activeBusiness?.industry), [activeBusiness?.industry]);
  const [brandKit, setBrandKit] = useState<any>(null);

  useEffect(() => {
    if (!activeBusiness || isViewOnly) {
      setBrandKit(null);
      return;
    }
    const brandKitRef = doc(db, 'brand_kits', activeBusiness.id);
    const unsubscribe = onSnapshot(brandKitRef, (docSnap) => {
      if (docSnap.exists()) {
        setBrandKit(docSnap.data());
      } else {
        setBrandKit(null);
      }
    });
    return () => unsubscribe();
  }, [activeBusiness, isViewOnly]);

  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    const syncProducts = () => {
      if (!activeBusiness) {
        setProducts([]);
        return;
      }
      const storageKey = `rainbowStockCheck_${activeBusiness.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setProducts(JSON.parse(saved));
        } catch (e) {
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
    };

    syncProducts();
    window.addEventListener('storage', syncProducts);
    return () => window.removeEventListener('storage', syncProducts);
  }, [activeBusiness]);

  const handleAiSettingChange = (key: string, value: string | boolean) => {
    const newSettings = { ...aiSettings, [key]: value };
    setAiSettingsState(newSettings);
    setAiSettings(newSettings);
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { aiSettings: newSettings }, { merge: true }).catch(err => {
        console.error("Failed to sync AI settings to Firebase", err);
      });
    }
  };

  const handleAnalyticsSettingChange = (key: string, value: any) => {
    const newSettings = { ...analyticsSettings, [key]: value };
    setAnalyticsSettingsState(newSettings);
    setAnalyticsSettings(newSettings);
  };

  const [posts, setPosts] = useState<Post[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'account' | 'workspaces' | 'ai' | 'analytics' | 'maintenance'>('account');
  const [googleTokens, setGoogleTokens] = useState<{access_token: string, refresh_token?: string, expires_in: number} | null>(() => {
    const saved = localStorage.getItem('google_drive_tokens');
    return saved ? JSON.parse(saved) : null;
  });
  const [confirmAction, setConfirmAction] = useState<{ type: string; onConfirm: () => Promise<void> | void } | null>(null);

  // Listen for Chrome Extension messages
  useEffect(() => {
    const handleExtensionMessage = async (event: MessageEvent) => {
      // 1. Return User State for Login
      if (event.data?.type === 'FORGE_GET_USER_STATE' && user) {
        window.postMessage({ 
          type: 'FORGE_USER_STATE_DATA', 
          data: {
            email: user.email,
            workspaces: businesses.map(b => ({ id: b.id, name: b.name })),
            activeWorkspaceId: activeBusiness?.id
          }
        }, '*');
        return;
      }

      // 2. Add Notes / Quick Notes
      if ((event.data?.type === 'FORGE_ADD_NOTE' || event.data?.type === 'FORGE_QUICK_NOTE') && user) {
        try {
          // Fallback to activeBusiness if workspaceId wasn't passed by the extension
          const targetWorkspaceId = event.data.workspaceId || activeBusiness?.id;
          
          if(!targetWorkspaceId) throw new Error("No active workspace to route into.");
          // Find the notebook for this business
          const q = query(
            collection(db, 'notebooks'),
            where('businessId', '==', targetWorkspaceId),
            where('userId', '==', user.uid)
          );
          const snapshot = await getDocs(q);
          
          let notebookId: string;
          let currentBlocks: any[] = [];
          
          if (!snapshot.empty) {
            notebookId = snapshot.docs[0].id;
            currentBlocks = snapshot.docs[0].data().blocks || [];
          } else {
            notebookId = uuidv4();
            await setDoc(doc(db, 'notebooks', notebookId), {
              id: notebookId,
              businessId: targetWorkspaceId,
              userId: user.uid,
              title: 'Creative Strategy',
              blocks: [],
              links: [],
              folders: [],
              updatedAt: serverTimestamp()
            });
          }

          let newBlock: any;
          if (event.data.type === 'FORGE_ADD_NOTE') {
            const { title, url, content } = event.data.data;
            newBlock = {
              id: uuidv4(),
              type: 'text',
              title: `Clipped: ${title}`,
              content: `Source: ${url}\n\n${content}`,
              status: 'inbox',
              createdAt: Date.now()
            };
          } else {
            // FORGE_QUICK_NOTE
            newBlock = {
              id: uuidv4(),
              type: 'text',
              title: `Quick Note`,
              content: event.data.data,
              status: 'inbox',
              createdAt: Date.now()
            };
          }

          await updateDoc(doc(db, 'notebooks', notebookId), {
            blocks: [newBlock, ...currentBlocks],
            updatedAt: serverTimestamp()
          });

          toast.success(event.data.type === 'FORGE_ADD_NOTE' ? "Note clipped to notebook!" : "Quick note added!");
        } catch (error) {
          console.error("Failed to add note from extension:", error);
          toast.error("Failed to add note from extension.");
        }
      }
      
      // 3. Calendar fetch
      if (event.data?.type === 'FORGE_GET_CALENDAR' && user) {
        try {
          const targetWorkspaceId = event.data.workspaceId || activeBusiness?.id;
          if (!targetWorkspaceId) return;

          const q = query(collection(db, 'posts'), where('businessId', '==', targetWorkspaceId));
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
          window.postMessage({ type: 'FORGE_CALENDAR_DATA', data }, '*');
        } catch (error) {
          console.error("Error fetching calendar for extension:", error);
        }
        return;
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, [activeBusiness, user, businesses]);

  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'calendar' | 'search' | 'brandkit' | 'more' | 'chat' | 'creative' | 'analytics' | 'ideas' | 'notebook' | 'workspace_management'>('home');
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const addSyncLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setSyncLogs(prev => [{ id: uuidv4(), time: new Date(), message, type }, ...prev].slice(0, 100));
  };

  // Modal states
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [initialProductsForModal, setInitialProductsForModal] = useState<HighStockProduct[]>([]);
  const [isDirectSearchOpen, setIsDirectSearchOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isAddToHomeModalOpen, setIsAddToHomeModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [droppedToChat, setDroppedToChat] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Image Viewer state
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentAiProvider, setCurrentAiProvider] = useState<string | null>(null);
  
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forge_theme_mode');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [themePreset, setThemePreset] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('forge_theme_preset') || 'default';
    }
    return 'default';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('forge_theme_mode', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('forge_theme_mode', 'light');
    }
    
    // Apply theme preset
    root.setAttribute('data-theme', themePreset);
    localStorage.setItem('forge_theme_preset', themePreset);
  }, [isDarkMode, themePreset]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const userProfileSynced = useRef<string | null>(null);

  // Sync AI settings from Firestore
  useEffect(() => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.aiSettings) {
          setAiSettingsState(data.aiSettings);
          setAiSettings(data.aiSettings); // Sync to localStorage for lib/gemini.ts
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Migration logic for 2003ray.dark@gmail.com
  // Migration completed. Legacy code removed.

  const [sharePassword, setSharePassword] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingShareData, setPendingShareData] = useState<Business | null>(null);

  const completeShareAccess = async (bizData: Business) => {
    setSharedBusiness(bizData);
    setActiveBusiness(bizData);
    setIsViewOnly(true);
    
    // Update analytics
    try {
      const newViews = (bizData.shareAnalytics?.views || 0) + 1;
      await updateDoc(doc(db, 'businesses', bizData.id), {
        'shareAnalytics.views': newViews,
        'shareAnalytics.lastViewedAt': new Date().toISOString()
      });
    } catch (e) {
      console.error("Error updating share analytics", e);
    }

    // Fetch posts
    const q = query(collection(db, 'posts'), where('businessId', '==', bizData.id));
    const snapshot = await getDocs(q);
    const sharedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
    
    // Apply filters
    let filteredPosts = sharedPosts;
    if (bizData.shareFilters) {
      if (bizData.shareFilters.tags?.length) {
        filteredPosts = filteredPosts.filter(p => bizData.shareFilters?.tags?.includes(p.outlet || ''));
      }
      if (bizData.shareFilters.dateRange?.start) {
        filteredPosts = filteredPosts.filter(p => p.date >= bizData.shareFilters!.dateRange!.start);
      }
      if (bizData.shareFilters.dateRange?.end) {
        filteredPosts = filteredPosts.filter(p => p.date <= bizData.shareFilters!.dateRange!.end);
      }
    }
    
    setPosts(filteredPosts);
    setActiveTab('calendar');
    addSyncLog(`Viewing shared calendar for ${bizData.name}`, 'success');
  };

  const handlePasswordSubmit = () => {
    if (pendingShareData && sharePassword === pendingShareData.sharePassword) {
      completeShareAccess(pendingShareData);
      setIsPasswordModalOpen(false);
      setSharePassword('');
    } else {
      toast.error("Incorrect password.");
    }
  };

  // Handle Share Link / View Only Mode / Short Links / Auto-Join
  useEffect(() => {
    const handleUrlActions = async () => {
      const pathParts = window.location.pathname.split('/');
      const params = new URLSearchParams(window.location.search);
      
      // 1. Handle Short Link Redirection
      if (pathParts[1] === 's' && pathParts[2]) {
        const shortCode = pathParts[2];
        try {
          const q = query(collection(db, 'short_links'), where('shortCode', '==', shortCode));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const linkDoc = snapshot.docs[0];
            const linkData = linkDoc.data();
            await updateDoc(doc(db, 'short_links', linkDoc.id), {
              clicks: (linkData.clicks || 0) + 1
            });
            window.location.href = linkData.originalUrl;
            return;
          }
        } catch (e) {
          console.error("Short link error", e);
        }
      }

      // 2. Handle Workspace Auto-Join
      const joinId = params.get('join');
      if (joinId && user) {
        try {
          const bizRef = doc(db, 'businesses', joinId);
          const bizSnap = await getDoc(bizRef);
          if (bizSnap.exists()) {
            const bizData = bizSnap.data();
            const members = bizData.members || [];
            if (!members.includes(user.uid) && bizData.ownerId !== user.uid) {
              await updateDoc(bizRef, {
                members: [...members, user.uid]
              });
              toast.success(`Joined workspace: ${bizData.name}`);
              // Remove join param from URL
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
            }
          }
        } catch (e) {
          console.error("Auto-join error", e);
        }
      }

      // 3. Handle Share Link
      let bizId: string | null = null;
      let shareToken: string | null = null;

      if (pathParts[1] === 'share' && pathParts[2] && pathParts[3]) {
        bizId = pathParts[2];
        shareToken = pathParts[3];
      } else {
        shareToken = params.get('share');
        bizId = params.get('biz');
      }

      if (shareToken && bizId) {
        try {
          const bizDoc = await getDoc(doc(db, 'businesses', bizId!));
          if (bizDoc.exists()) {
            const bizData = { id: bizDoc.id, ...bizDoc.data() } as Business;
            if (bizData.shareToken === shareToken) {
              if (bizData.shareExpiresAt && isAfter(new Date(), parseISO(bizData.shareExpiresAt))) {
                toast.error("This share link has expired.");
                setIsCheckingShare(false);
                return;
              }
              if (bizData.sharePassword) {
                setPendingShareData(bizData);
                setIsPasswordModalOpen(true);
                setIsCheckingShare(false);
                return;
              }
              await completeShareAccess(bizData);
            }
          }
        } catch (e) {
          console.error("Error fetching shared business", e);
        } finally {
          setIsCheckingShare(false);
        }
      } else {
        setIsCheckingShare(false);
      }
    };

    handleUrlActions();
  }, [user]);

  // Fetch User's Businesses (Owned or Member)
  useEffect(() => {
    if (!user || isViewOnly) return;

    const q = query(
      collection(db, 'businesses'), 
      or(where('ownerId', '==', user.uid), where('members', 'array-contains', user.uid))
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bizList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
      setBusinesses(bizList);
      setLoadingBusinesses(false);
      
      // If user has no businesses and we're not in view-only mode, show onboarding
      if (bizList.length === 0 && !isViewOnly && !loadingBusinesses) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }

      // Auto-select business
      if (bizList.length > 0) {
        const lastBizId = localStorage.getItem('last_active_business_id');
        const lastBiz = bizList.find(b => b.id === lastBizId);
        if (!activeBusiness || !bizList.find(b => b.id === activeBusiness.id)) {
          setActiveBusiness(lastBiz || bizList[0]);
        }
      } else if (!loading) {
        // If user has no businesses, show onboarding wizard
        setShowOnboarding(true);
      }
    }, (error) => {
      console.error("[Businesses] onSnapshot error:", error);
      setLoadingBusinesses(false);
      handleFirestoreError(error, OperationType.GET, 'businesses');
    });

    return () => unsubscribe();
  }, [user, isViewOnly, loading]);

  // Persist active business ID
  useEffect(() => {
    if (activeBusiness && !isViewOnly) {
      localStorage.setItem('last_active_business_id', activeBusiness.id);
    }
  }, [activeBusiness, isViewOnly]);

  const handleCreateBusiness = async (name: string, industry: string, position: string) => {
    if (!user) return;
    try {
      const newBiz: Business = {
        id: uuidv4(),
        name,
        ownerId: user.uid,
        industry,
        position,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareToken: uuidv4() + '-' + uuidv4()
      };
      await setDoc(doc(db, 'businesses', newBiz.id), newBiz);
      setActiveBusiness(newBiz);
      setIsBusinessModalOpen(false);
      toast.success(`Business "${name}" created!`);
    } catch (e) {
      console.error("Error creating business", e);
      toast.error("Failed to create business profile.");
    }
  };

  const handleDeleteBusiness = async (bizId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'businesses', bizId));
      if (activeBusiness?.id === bizId) {
        setActiveBusiness(businesses.find(b => b.id !== bizId) || null);
      }
      toast.success("Workspace deleted.");
    } catch (e) {
      console.error("Error deleting business", e);
      toast.error("Failed to delete workspace.");
    }
  };

  const handleRequestAccess = async () => {
    if (!user || !activeBusiness) return;
    try {
      const requestId = uuidv4();
      await setDoc(doc(db, 'access_requests', requestId), {
        id: requestId,
        businessId: activeBusiness.id,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'User',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success("Access request sent to admin!");
    } catch (e) {
      console.error("Error requesting access:", e);
      toast.error("Failed to send access request.");
    }
  };

  const handleAutoCategorizeAll = async () => {
    const storageKey = `rainbowStockCheck_${activeBusiness?.id || 'default'}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      toast.error("No products found to categorize.");
      return;
    }

    try {
      setIsAutoCategorizing(true);
      const products = JSON.parse(saved) as HighStockProduct[];
      const uncategorized = products.filter(p => !p.type || p.type === 'Uncategorized');

      if (uncategorized.length === 0) {
        toast.info("All products are already categorized.");
        return;
      }

      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }

      const ai = getAi();
      const updatedProducts = [...products];
      const batchSize = 15;

      for (let i = 0; i < uncategorized.length; i += batchSize) {
        const batch = uncategorized.slice(i, i + batchSize);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Categorize the following products into one of these categories: Furniture, Building Materials, Home Appliances, Kitchenware, Electronics, Lighting, Bathroom Fittings, Hardware.
          
          Products:
          ${batch.map(p => p.title).join(', ')}
          
          Return a JSON object where keys are product names and values are the categories.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              additionalProperties: { type: Type.STRING }
            }
          }
        });

        const categoriesMap = JSON.parse(response.text || "{}");
        
        batch.forEach(p => {
          const index = updatedProducts.findIndex(up => up.title === p.title);
          if (index !== -1 && categoriesMap[p.title]) {
            updatedProducts[index] = { ...updatedProducts[index], type: categoriesMap[p.title] };
          }
        });
      }

      localStorage.setItem(storageKey, JSON.stringify(updatedProducts));
      window.dispatchEvent(new Event('storage')); // Notify other components
      toast.success(`Successfully categorized ${uncategorized.length} products!`);
    } catch (error) {
      console.error("Auto-categorization failed:", error);
      toast.error("Failed to auto-categorize products.");
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Start at current month

  const [isMobile, setIsMobile] = useState(window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const media = window.matchMedia('(pointer: coarse)');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Increased slightly to prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 800, // Increased to 800ms for a very intentional long press
        tolerance: 5, // Reduced tolerance to require keeping the finger very still
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [dropActionPrompt, setDropActionPrompt] = useState<{dateStr: string, files: File[]} | null>(null);

  const handleSavePost = async (post: Post) => {
    if (!user) return;
    try {
      setIsSyncing(true);
      addSyncLog(`Saving post: ${post.title || 'Untitled'}`, 'info');
      
      const imageUrls: string[] = [];

      if (post.images && post.images.length > 0) {
        for (let i = 0; i < post.images.length; i++) {
          const img = post.images[i];

          if (!img) {
            console.warn(`[handleSavePost] Skipping null/undefined image at index ${i}`);
            continue;
          }

          const trimmed = img.trim();

          // Case 1: Already a valid hosted URL — keep as-is
          if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
            imageUrls.push(trimmed);
            continue;
          }

          // Case 2: base64 data URL
          // Case 3: raw base64 without data: prefix (large string)
          let dataUrl: string;
          if (trimmed.startsWith('data:')) {
            dataUrl = trimmed;
          } else if (trimmed.length > 10000) {
            dataUrl = `data:image/jpeg;base64,${trimmed}`;
          } else {
            console.warn(`[handleSavePost] Skipping unrecognized image format at index ${i}:`, trimmed.substring(0, 50));
            continue;
          }

          // Upload to Firebase Storage with extended timeout
          try {
            const storagePath = `posts/${user.uid}/${post.id}/image_${i}`;
            const uploadPromise = uploadBase64Image(dataUrl, storagePath);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Upload timeout after 120s')), 120000)
            );
            const url = await Promise.race([uploadPromise, timeoutPromise]);
            imageUrls.push(url);
            addSyncLog(`Image ${i + 1} uploaded successfully`, 'info');
          } catch (uploadErr) {
            console.error(`[handleSavePost] Failed to upload image at index ${i}:`, uploadErr);
            addSyncLog(`Warning: Image ${i + 1} could not be uploaded and was skipped`, 'error');
            // Do NOT push the base64 to Firestore — it will exceed document size limits
            // Skip this image silently
          }
        }
      }

      const postWithUser = {
        ...post,
        userId: user.uid,
        businessId: post.businessId || (calendarMode === 'personal' ? 'personal' : (activeBusiness?.id || '')),
        images: imageUrls,
      };

      await setDoc(doc(db, 'posts', post.id), postWithUser);
      addSyncLog(`Successfully saved post: ${post.title || 'Untitled'}`, 'success');

      // Auto-sync categories to Brand Kit
      if (activeBusiness?.id) {
        try {
          const catRef = doc(db, 'categories', activeBusiness.id);
          const catSnap = await getDoc(catRef);
          let currentCats: any[] = [];
          if (catSnap.exists()) {
            currentCats = catSnap.data().categories || [];
          }
          
          const existingNames = new Set(currentCats.map(c => `${c.type}:${c.name}`));
          const newCats: any[] = [];
          
          if (post.productCategory && !existingNames.has(`category:${post.productCategory}`)) {
            newCats.push({ id: uuidv4(), name: post.productCategory, type: 'category', enabled: true });
          }
          if (post.outlet && !existingNames.has(`outlet:${post.outlet}`)) {
            newCats.push({ id: uuidv4(), name: post.outlet, type: 'outlet', enabled: true });
          }
          if (post.campaignType) {
            const ct = post.campaignType;
            let normalized = ct;
            if (ct.toLowerCase() === 'non-boosted') normalized = 'Non-Boosted';
            else if (ct.toLowerCase() === 'boosted') normalized = 'Boosted';
            else if (ct.toLowerCase() === 'campaign') normalized = 'Campaign';
            
            if (!existingNames.has(`campaign:${normalized}`)) {
              newCats.push({ id: uuidv4(), name: normalized, type: 'campaign', enabled: true });
            }
          }
          if (post.type && !existingNames.has(`type:${post.type}`)) {
            newCats.push({ id: uuidv4(), name: post.type, type: 'type', enabled: true });
          }
          
          if (newCats.length > 0) {
            await setDoc(catRef, { categories: [...currentCats, ...newCats] }, { merge: true });
            addSyncLog(`Auto-synced ${newCats.length} new categories to Brand Kit`, 'info');
          }
        } catch (e) {
          console.error("Auto-sync categories failed:", e);
        }
      }
    } catch (error) {
      console.error('Failed to save post:', error);
      addSyncLog(`Failed to save post: ${post.title || 'Untitled'}`, 'error');
      toast.error('Failed to save post to cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePublishPost = async (post: Post) => {
    if (!user) return;

    // Get the first valid image URL
    const imageUrl = post.images?.find(img => img.startsWith('https://'));
    if (!imageUrl) {
      alert('This post has no uploaded image. Please add an image before publishing.');
      return;
    }

    const platforms = post.platforms || ['instagram', 'facebook'];

    try {
      setIsSyncing(true);
      addSyncLog(`Publishing post: ${post.title}`, 'info');

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          caption: post.caption,
          hashtags: post.hashtags,
          imageUrl,
          platforms,
        }),
      });

      const data = await response.json();

      // Build update patch for Firestore
      const update: Partial<Post> = {
        publishedAt: new Date().toISOString(),
      };

      if (data.errors?.length > 0 && !data.instagramPostId && !data.facebookPostId) {
        // All platforms failed
        update.publishStatus = 'failed';
        update.publishError = data.errors.join('; ');
        addSyncLog(`Publish failed: ${update.publishError}`, 'error');
        alert(`Failed to publish:\n${update.publishError}`);
      } else {
        // At least one succeeded
        update.publishStatus = 'published';
        if (data.instagramPostId) update.instagramPostId = data.instagramPostId;
        if (data.facebookPostId) update.facebookPostId = data.facebookPostId;
        if (data.errors?.length > 0) {
          update.publishError = `Partial failure: ${data.errors.join('; ')}`;
          addSyncLog(`Partial publish: ${update.publishError}`, 'error');
        } else {
          addSyncLog(`Successfully published: ${post.title}`, 'success');
        }
      }

      // Save updated status to Firestore
      await setDoc(doc(db, 'posts', post.id), { ...post, ...update });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, ...update } : p));

    } catch (error: any) {
      console.error('Publish error:', error);
      addSyncLog(`Publish error: ${error.message}`, 'error');
      alert('Publish failed. Check console for details.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePublishPostRef = useRef(handlePublishPost);
  useEffect(() => {
    handlePublishPostRef.current = handlePublishPost;
  }, [handlePublishPost]);

  useEffect(() => {
    if (!user) return;
    
    let isChecking = false;
    
    const checkScheduledPosts = async () => {
      if (isChecking) return;
      isChecking = true;
      
      try {
        const now = new Date();
        const due = posts.filter(p =>
          p.publishStatus === 'scheduled' &&
          p.scheduledTime &&
          new Date(p.scheduledTime) <= now
        );
        
        if (due.length > 0) {
          for (const post of due) {
            console.log(`[Scheduler] Auto-publishing: ${post.title}`);
            await handlePublishPostRef.current(post);
          }
        }
        
        // Handle evergreen/repeat posts
        const repeatPosts = posts.filter(p =>
          p.repeatEnabled &&
          p.publishStatus === 'published' &&
          p.repeatInterval &&
          p.publishedAt
        );

        if (repeatPosts.length > 0) {
          let batch = writeBatch(db);
          let batchCount = 0;
          
          for (const post of repeatPosts) {
            const lastDate = new Date(post.lastRepeatDate || post.publishedAt!);
            const intervalDays = post.repeatInterval === 'weekly' ? 7 : post.repeatInterval === 'biweekly' ? 14 : 30;
            const nextDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

            if (nextDate <= now) {
              const nowIso = now.toISOString();
              // Create a fresh copy of this post for the new date
              const newPostId = uuidv4();
              const newPost: Post = {
                ...post,
                id: newPostId,
                date: nowIso.split('T')[0],
                publishStatus: 'scheduled',
                scheduledTime: nowIso,
                publishedAt: undefined,
                instagramPostId: undefined,
                facebookPostId: undefined,
                lastRepeatDate: nowIso,
              };
              
              batch.set(doc(db, 'posts', newPostId), { ...newPost, userId: user.uid });
              // Update the original post's lastRepeatDate
              batch.update(doc(db, 'posts', post.id), { lastRepeatDate: nowIso });
              batchCount += 2;
              
              if (batchCount >= 40) { // Firestore batch limit is 500, but we stay safe
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
              }
            }
          }
          
          if (batchCount > 0) {
            await batch.commit();
          }
        }
      } catch (err) {
        console.error("[Scheduler] Error:", err);
      } finally {
        isChecking = false;
      }
    };
    
    const interval = setInterval(checkScheduledPosts, 60000);
    return () => clearInterval(interval);
  }, [posts.length, user?.uid]); // Only re-run if count changes or user changes

  const handleBulkImport = async (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const imported: Post[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });

      if (!row.date || !row.caption) continue;

      imported.push({
        id: uuidv4(),
        date: row.date,
        outlet: row.outlet || 'Forge Buildware',
        type: row.type || '🔴 General',
        title: row.title || 'Imported Post',
        brief: row.brief || '',
        caption: row.caption,
        hashtags: row.hashtags || '',
        images: row.image ? [row.image] : [],
        scheduledTime: row.scheduledTime || undefined,
        publishStatus: row.scheduledTime ? 'scheduled' : 'draft',
        platforms: ['instagram', 'facebook'],
        userId: user?.uid,
      });
    }

    if (imported.length === 0) {
      toast.error('No valid posts found in CSV. Required columns: date, caption. Optional: outlet, type, title, brief, hashtags, image, scheduledTime');
      return;
    }

    if (!confirm(`Import ${imported.length} posts?`)) return;

    setIsSyncing(true);
    for (const post of imported) {
      await handleSavePost(post);
    }
    setIsSyncing(false);
    toast.success(`Successfully imported ${imported.length} posts!`);
  };

  const handleSubmitForApproval = async (post: Post) => {
    const updated = { ...post, approvalStatus: 'pending' as const, submittedAt: new Date().toISOString() };
    await handleSavePost(updated);
  };

  const handleApprovePost = async (post: Post) => {
    const updated = { ...post, approvalStatus: 'approved' as const, reviewedAt: new Date().toISOString() };
    await handleSavePost(updated);
  };

  const handleRejectPost = async (post: Post, note: string) => {
    const updated = { ...post, approvalStatus: 'rejected' as const, approvalNote: note, reviewedAt: new Date().toISOString() };
    await handleSavePost(updated);
  };

  const handleDeletePost = async (id: string) => {
    if (!user) return;
    try {
      setIsSyncing(true);
      
      // Find the post to get image URLs
      const postToDelete = posts.find(p => p.id === id);
      addSyncLog(`Deleting post: ${postToDelete?.title || id}`, 'info');
      
      // Delete images from storage if they are storage URLs
      if (postToDelete?.images) {
        for (const url of postToDelete.images) {
          if (url.includes('firebasestorage.googleapis.com')) {
            try {
              const imageRef = ref(storage, url);
              await deleteObject(imageRef);
            } catch (e) {
              console.error("Failed to delete image from Firebase storage:", e);
            }
          } else if (url.includes('res.cloudinary.com')) {
            try {
              // Extract public_id from Cloudinary URL
              // Format: https://res.cloudinary.com/[cloud_name]/image/upload/v[version]/[folder]/[public_id].[ext]
              const parts = url.split('/');
              const lastPart = parts[parts.length - 1];
              const publicIdWithExt = parts.slice(parts.indexOf('upload') + 2).join('/');
              const publicId = publicIdWithExt.split('.')[0];
              
              await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  publicId,
                  cloudName: aiSettings.cloudinaryCloudName,
                  apiKey: aiSettings.cloudinaryApiKey,
                  apiSecret: aiSettings.cloudinaryApiSecret
                })
              });
            } catch (e) {
              console.error("Failed to delete image from Cloudinary:", e);
            }
          }
        }
      }

      await deleteDoc(doc(db, 'posts', id));
      addSyncLog(`Successfully deleted post: ${postToDelete?.title || id}`, 'success');
    } catch (error) {
      console.error("Failed to delete post:", error);
      addSyncLog(`Failed to delete post: ${id}`, 'error');
      toast.error("Failed to delete post from cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const prevDeps = useRef<any>({});
  useEffect(() => {
    if (loading) return; // Wait for auth to finish loading
    
    const currentDeps = { user: user?.uid, activeBusiness: activeBusiness?.id, sharedBusiness: sharedBusiness?.id, isViewOnly, calendarMode };
    const changedDeps = Object.keys(currentDeps).filter(k => (currentDeps as any)[k] !== prevDeps.current[k]);
    
    if (changedDeps.length > 0) {
      console.log(`[Sync] Dependencies changed: ${changedDeps.join(', ')}`);
    }
    prevDeps.current = currentDeps;

    setIsSyncing(true);
    const context = calendarMode === 'personal' ? 'personal (all workspaces)' : (activeBusiness ? `business ${activeBusiness.id}` : (isViewOnly && sharedBusiness ? `shared business ${sharedBusiness.id}` : 'no context'));
    addSyncLog(`Connecting to cloud (${context})...`, 'info');
    console.log(`[Sync] Starting sync for ${context}. User: ${user?.uid}`);
    
    let q;
    if (isViewOnly && sharedBusiness && sharedBusiness.id) {
      // Shared view: ONLY show posts for that business, NEVER personal
      q = query(collection(db, 'posts'), where('businessId', '==', sharedBusiness.id));
    } else if (calendarMode === 'personal' && user) {
      // Personal view: show EVERYTHING for this user
      q = query(collection(db, 'posts'), where('userId', '==', user.uid));
    } else if (activeBusiness && activeBusiness.id) {
      // Work view: show ONLY active business
      q = query(collection(db, 'posts'), where('businessId', '==', activeBusiness.id));
    } else {
      // No business context, clear posts
      console.log(`[Sync] No business context, clearing posts`);
      setPosts([]);
      setIsSyncing(false);
      return;
    }
    
    console.log(`[Sync] Attaching onSnapshot listener for ${context}`);
    
    // Test with getDocs first to see if it's an onSnapshot specific issue
    getDocs(query(q, limit(1))).then(() => {
      console.log(`[Sync] getDocs test successful for ${context}`);
    }).catch(err => {
      console.error(`[Sync] getDocs test failed for ${context}:`, err);
    });

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log(`[Sync] Snapshot received for ${context}, metadata.fromCache: ${snapshot.metadata.fromCache}`);
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
      addSyncLog(`Received update from cloud: ${fetchedPosts.length} posts`, 'info');
      console.log(`[Sync] Received ${fetchedPosts.length} posts from Firestore`);
      
      setPosts(fetchedPosts);
      console.log(`[Sync] Setting setIsSyncing(false)`);
      setIsSyncing(false);
    }, (error) => {
      console.error("[Sync] onSnapshot error:", error);
      addSyncLog(`Cloud sync error: ${error.message}`, 'error');
      setIsSyncing(false);
      handleFirestoreError(error, OperationType.GET, 'posts');
    });

    // Add a timeout to prevent infinite "Connecting to cloud..." state
    const timeoutId = setTimeout(() => {
      console.log(`[Sync] Sync timeout reached for ${context}`);
      addSyncLog(`Sync taking longer than expected...`, 'info');
      setIsSyncing(false); // Force it to false so user can at least use the app
    }, 15000);

    return () => {
      console.log(`[Sync] Cleaning up sync for ${context}`);
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [user, activeBusiness, sharedBusiness, isViewOnly, calendarMode]);

  useEffect(() => {
    if (user && userProfileSynced.current !== user.uid) {
      const userRef = doc(db, 'users', user.uid);
      
      // Load AI Settings
      getDoc(userRef).then(docSnap => {
        if (docSnap.exists() && docSnap.data().aiSettings) {
          const syncedSettings = docSnap.data().aiSettings;
          setAiSettingsState(syncedSettings);
          setAiSettings(syncedSettings);
        }
      }).catch(err => console.error("Failed to load AI settings", err));

      setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp()
      }, { merge: true }).then(() => {
        userProfileSynced.current = user.uid;
      }).catch(err => {
        console.error("Failed to sync user profile", err);
      });
    }
  }, [user]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'google') {
        const tokens = event.data.tokens;
        setGoogleTokens(tokens);
        localStorage.setItem('google_drive_tokens', JSON.stringify(tokens));
        toast.success("Successfully connected to Google Drive!");
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        toast.error(`Authentication failed: ${event.data.error}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogleDrive = async () => {
    try {
      const clientId = aiSettings.googleClientId || '';
      const clientSecret = aiSettings.googleClientSecret || '';
      const redirectUri = aiSettings.googleRedirectUri || '';

      const queryParams = new URLSearchParams();
      if (clientId) queryParams.append('clientId', clientId);
      if (clientSecret) queryParams.append('clientSecret', clientSecret);
      if (redirectUri) queryParams.append('redirectUri', redirectUri);

      const response = await fetch(`/api/auth/google/url?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Google Drive OAuth error:', error);
      toast.error('Failed to initiate Google Drive connection.');
    }
  };

  const handleDisconnectGoogleDrive = () => {
    setGoogleTokens(null);
    localStorage.removeItem('google_drive_tokens');
    toast.success("Disconnected from Google Drive.");
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Notification logic
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch((e: any) => console.warn(e));
      }
    } catch (e) {
      console.warn('Notifications request permission failed', e);
    }
  }, []);

  // Background check for scheduled posts
  useEffect(() => {
    const checkScheduledPosts = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      // Find posts for today that haven't been notified yet
      // We'll use a simple session-based tracking for notifications to avoid spamming
      const todayPosts = posts.filter(p => p.date === todayStr);
      
      if (todayPosts.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const lastNotified = sessionStorage.getItem('last_notified_date');
        if (lastNotified !== todayStr) {
          try {
            new Notification('Forge Content Reminder', {
              body: `You have ${todayPosts.length} posts scheduled for today!`,
              icon: 'https://picsum.photos/seed/rainbow/192/192'
            });
          } catch (e) {
            console.warn('Notifications constructor not supported in this browser', e);
          }
          sessionStorage.setItem('last_notified_date', todayStr);
        }
      }
    };

    // Check every hour
    const interval = setInterval(checkScheduledPosts, 1000 * 60 * 60);
    checkScheduledPosts(); // Initial check

    return () => clearInterval(interval);
  }, [posts]);

  // Toggle no-scrollbar class on body based on activeTab
  useEffect(() => {
    if (activeTab !== 'search') {
      document.body.classList.add('no-scrollbar');
    } else {
      document.body.classList.remove('no-scrollbar');
    }
    return () => document.body.classList.remove('no-scrollbar');
  }, [activeTab]);


  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleDragStart = (event: any) => {
    // Allow drag start for everyone so UI feedback (overlays) works
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeData = active.data.current;

    // Handle Cancel/Delete zones
    if (overId === 'cancel-zone') {
      return;
    }

    if (overId === 'delete-zone') {
      if (!isAdmin) {
        toast.error("Only admins can delete posts.");
        return;
      }
      if (activeData?.type === 'post') {
        handleDeletePost(activeId);
      }
      return;
    }

    // Determine target date
    const overPost = posts.find(p => p.id === overId);
    const targetDate = overPost ? overPost.date : overId;

    // Case 0: Drop onto Floating Chat
    if (overId === 'floating-chat-button' || overId === 'floating-chat-container') {
      if (activeData?.type === 'product') {
        setDroppedToChat({ type: 'product', product: activeData.product });
      } else if (activeData?.type === 'idea') {
        setDroppedToChat({ type: 'idea', idea: activeData.idea });
      } else if (activeData?.type === 'image') {
        setDroppedToChat({ type: 'post', post: activeData.sourcePost }); // Use source post for context
      } else {
        const activePost = posts.find(p => p.id === activeId);
        if (activePost) {
          setDroppedToChat({ type: 'post', post: activePost });
        }
      }
      return;
    }

    // All other actions (rescheduling, creating from product/idea) require isAdmin
    if (!isAdmin) {
      toast.error("Please sign in to modify the calendar.");
      return;
    }

    // Validate targetDate format
    if (!targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;

    // Case 1: Dragging a product from the library to create a new post
    if (activeData?.type === 'product') {
      const product = activeData.product;
      const newPost: Post = {
        id: uuidv4(),
        date: targetDate,
        outlet: product.type.includes('Living') ? 'Forge Living Mall' : 
                product.type.includes('Office') ? 'Forge Office System' : 'Forge Buildware',
        type: `🔴 ${product.type}`,
        title: product.title,
        brief: `Feature ${product.title}. Price: ${product.price || 'N/A'}. Stock: ${product.stock || 'In Stock'}.`,
        caption: `Check out our ${product.title}! ${product.price ? `Available now for ${product.price}.` : ''} Visit us today.`,
        hashtags: `#ForgeEnterprises #${product.type.replace(/\s+/g, '')} #Maldives`,
        images: product.link ? [product.link] : [],
        userId: user.uid
      };
      handleSavePost(newPost);
      return;
    }

    // Case 2: Dragging an image from an existing post to create a new post
    if (activeData?.type === 'image') {
      const { imageUrl, sourcePost } = activeData;
      const newPost: Post = {
        id: uuidv4(),
        date: targetDate,
        outlet: sourcePost.outlet,
        type: sourcePost.type,
        title: `New Post: ${sourcePost.title}`,
        brief: `New task using image from ${sourcePost.title}`,
        caption: sourcePost.caption,
        hashtags: sourcePost.hashtags,
        images: [imageUrl],
        userId: user.uid
      };
      handleSavePost(newPost);
      return;
    }

    // Case 3: Dragging an idea from the Ideas tab to create a new post
    if (activeData?.type === 'idea') {
      const idea = activeData.idea;
      const newPost: Post = {
        id: uuidv4(),
        date: targetDate,
        outlet: idea.outlet || 'Forge Enterprises',
        type: idea.type || '🔴 General',
        title: idea.title,
        brief: idea.brief,
        caption: idea.caption,
        hashtags: idea.hashtags,
        images: [],
        userId: user.uid
      };
      handleSavePost(newPost);
      return;
    }

    // Case 3.5: Dragging a block from the Notebook to create a new post
    if (activeData?.type === 'notebook-block') {
      const block = activeData.block;
      const newPost: Post = {
        id: uuidv4(),
        date: targetDate,
        outlet: activeBusiness?.name || 'Forge Enterprises',
        type: block.type === 'postcard' ? '🎨 Postcard' : '📝 Note',
        title: block.title || 'New Post from Notebook',
        brief: block.content || '',
        caption: block.postcardData?.backText || block.content || '',
        hashtags: activeBusiness?.industry ? `#${activeBusiness.industry.replace(/\s+/g, '')}` : '',
        images: block.postcardData?.imageUrl ? [block.postcardData.imageUrl] : [],
        userId: user.uid,
        businessId: activeBusiness?.id
      };
      
      // If it's a postcard, we might want to use the frontText as the title
      if (block.type === 'postcard' && block.postcardData) {
        newPost.title = block.postcardData.frontText;
      }

      handleSavePost(newPost);
      toast.success(`Created post from ${block.type === 'postcard' ? 'postcard' : 'notebook block'}`);
      return;
    }

    // Case 4: Rescheduling or Duplicating an existing post
    const activePost = posts.find(p => p.id === activeId);
    if (!activePost) return;

    // If moving to a different date
    if (activePost.date !== targetDate) {
      if (isCtrlPressed.current) {
        // Duplicate the post
        const duplicatedPost = { ...activePost, id: uuidv4(), date: targetDate };
        handleSavePost(duplicatedPost);
        toast.success(`Duplicated post to ${targetDate}`);
      } else {
        // Move the post
        const updatedPost = { ...activePost, date: targetDate };
        handleSavePost(updatedPost);
      }
    } else if (isCtrlPressed.current) {
        // Duplicate within the same date
        const duplicatedPost = { ...activePost, id: uuidv4() };
        handleSavePost(duplicatedPost);
        toast.success(`Duplicated post`);
    }

    // If reordering within the same date (and not duplicating)
    if (overPost && activePost.date === overPost.date && !isCtrlPressed.current) {
      const activeIndex = posts.findIndex((p) => p.id === activeId);
      const overIndex = posts.findIndex((p) => p.id === overId);
      const newPosts = arrayMove(posts, activeIndex, overIndex);
      setPosts(newPosts);
      // Note: Reordering is not persisted to Firestore yet as there's no position field.
      // But we update the local state for immediate feedback.
    }
  };

  const [droppedImagesForModal, setDroppedImagesForModal] = useState<string[]>([]);

  const processDroppedFiles = async (dateStr: string, files: File[], mode: 'single' | 'separate') => {
    setDropActionPrompt(null);
    
    // If a post modal is open, add images to it instead of creating new posts
    if (isPostModalOpen) {
      const base64Images = await Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      setDroppedImagesForModal(base64Images);
      return;
    }

    if (mode === 'single') {
      const base64Images: string[] = [];
      for (const file of files) {
        try {
          const { dataUrl } = await readFileAsDataURL(file);
          base64Images.push(dataUrl);
        } catch (e) {
          console.error("Failed to read file", e);
        }
      }
      
      const newPostId = uuidv4();
      const placeholderPost: Post = {
        id: newPostId,
        date: dateStr,
        outlet: 'Forge Enterprises',
        type: '✨ Generating...',
        title: 'Analyzing images...',
        brief: 'Please wait while AI generates content...',
        caption: '',
        hashtags: '',
        images: base64Images,
        userId: user.uid
      };
      
      handleSavePost(placeholderPost);

      try {
        const collageBase64 = await createImageCollage(base64Images);
        const match = collageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const generatedData = await generatePostFromImage(base64Data, mimeType);
          
          handleSavePost({
            ...placeholderPost,
            title: generatedData.title || 'New Post',
            brief: generatedData.brief || '',
            caption: generatedData.caption || '',
            hashtags: generatedData.hashtags || '',
            type: generatedData.type || '🔴 General',
            outlet: generatedData.outlet || 'Forge Enterprises'
          });
        }
      } catch (error) {
        console.error("Failed to generate post from image:", error);
        handleSavePost({
          ...placeholderPost,
          title: 'New Image Post',
          brief: 'Failed to auto-generate content.',
          type: '🔴 General'
        });
      }
    } else {
        for (const file of files) {
          const { dataUrl, isVideo } = await readFileAsDataURL(file);
          if (!dataUrl) continue;

          const newPostId = uuidv4();
          const placeholderPost: Post = {
            id: newPostId,
            date: dateStr,
            outlet: 'Forge Enterprises',
            type: '✨ Generating...',
            title: isVideo ? 'Analyzing video...' : 'Analyzing image...',
            brief: 'Please wait while AI generates content...',
            caption: '',
            hashtags: '',
            images: [dataUrl],
            userId: user.uid
          };

          handleSavePost(placeholderPost);

          try {
            const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (match) {
              const mimeType = match[1];
              const base64Data = match[2];
              const generatedData = await generatePostFromImage(base64Data, mimeType, undefined, isVideo);
              
              handleSavePost({
                ...placeholderPost,
                title: generatedData.title || 'New Post',
                brief: generatedData.brief || '',
                caption: generatedData.caption || '',
                hashtags: generatedData.hashtags || '',
                type: generatedData.type || '🔴 General',
                outlet: generatedData.outlet || 'Forge Enterprises'
              });
            }
          } catch (error) {
            console.error("Failed to generate post from image:", error);
            handleSavePost({
              ...placeholderPost,
              title: 'New Post',
              brief: 'Failed to auto-generate content.',
              type: '🔴 General'
            });
          }
        }
    }
  };

  const handleFileDrop = async (dateStr: string, files: File[]) => {
    if (files.length > 1) {
      setDropActionPrompt({ dateStr, files });
    } else if (files.length === 1) {
      processDroppedFiles(dateStr, files, 'separate');
    }
  };

  const handleRegeneratePost = async (post: Post) => {
    try {
      const content = await generatePostContent(post.outlet, post.productCategory, post.title, activeBusiness || undefined);
      const updatedPost: Post = {
        ...post,
        title: content.title || post.title,
        brief: content.brief || post.brief,
        caption: content.caption || post.caption,
        hashtags: content.hashtags || post.hashtags,
      };
      handleSavePost(updatedPost);
    } catch (error) {
      console.error("Failed to regenerate post:", error);
      toast.error("Failed to regenerate post. Please check your API key.");
    }
  };

  const handleCopyPost = async (post: Post, date: string) => {
    const newPost: Post = {
      ...post,
      id: uuidv4(),
      date,
    };
    try {
      await setDoc(doc(db, 'posts', newPost.id), newPost);
      toast.success('Post copied');
    } catch (error) {
      console.error('Error copying post:', error);
      toast.error('Failed to copy post');
    }
  };

  const handleGenerateShareLink = async () => {
    if (!activeBusiness) return;
    const token = activeBusiness.shareToken || crypto.randomUUID();
    if (!activeBusiness.shareToken) {
      await updateDoc(doc(db, 'businesses', activeBusiness.id), { shareToken: token });
    }
    const shareUrl = `${window.location.origin}/share/${activeBusiness.id}/${token}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  const openNewPostModal = (date?: string) => {
    setSelectedPost(null);
    setSelectedDate(date || format(currentMonth, 'yyyy-MM-dd'));
    setIsPostModalOpen(true);
  };

  const handleGenerateWithAi = async (date?: string) => {
    if (!activeBusiness) {
      toast.error("Please select a workspace first.");
      return;
    }

    const targetDate = date || format(currentMonth, 'yyyy-MM-dd');
    const loadingToast = toast.loading("AI is brainstorming a post for you...");

    try {
      const generatedPosts = await generateBulkPosts("General", 1, activeBusiness);
      if (generatedPosts && generatedPosts.length > 0) {
        const newPost: Post = {
          id: uuidv4(),
          date: targetDate,
          title: generatedPosts[0].title || "AI Generated Post",
          brief: generatedPosts[0].brief || "",
          caption: generatedPosts[0].caption || "",
          hashtags: generatedPosts[0].hashtags || "",
          type: generatedPosts[0].type || "🔴 General",
          outlet: generatedPosts[0].outlet || "Buildware",
          status: 'draft',
          images: [],
          isAiGenerated: true,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'posts', newPost.id), newPost);
        toast.dismiss(loadingToast);
        toast.success("AI generated a new post for " + format(parseISO(targetDate), 'MMM d') + "!");
        
        // Optionally open the modal to edit it
        setSelectedPost(newPost);
        setSelectedDate(targetDate);
        setIsPostModalOpen(true);
      } else {
        toast.dismiss(loadingToast);
        toast.error("AI couldn't generate a post right now. Try again.");
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to generate post with AI.");
    }
  };

  const openEditPostModal = (post: Post) => {
    setSelectedPost(post);
    setSelectedDate(post.date);
    setIsPostModalOpen(true);
  };

  const handleImageClick = (images: string[] | string, index: number = 0, aiProvider?: string) => {
    if (Array.isArray(images)) {
      setCurrentImages(images);
      setCurrentImageIndex(index);
    } else {
      setCurrentImages([images]);
      setCurrentImageIndex(0);
    }
    setCurrentAiProvider(aiProvider || null);
    setIsImageViewerOpen(true);
  };

  const handleGenerateMockup = async (post: Post) => {
    if (!post.title || !post.brief || !post.caption) {
      toast.warning("Post needs a title, brief, and caption to generate a mockup.");
      return;
    }
    try {
      const result = await generateMockupImage(post.title, post.brief, post.caption, post.images?.[0], activeBusiness);
      const updatedPost = { 
        ...post, 
        images: [...(post.images || []), result.url],
        aiProvider: result.provider
      };
      // Save to Firestore immediately to persist the generated mockup
      await handleSavePost(updatedPost);
      // Local state will be updated by the onSnapshot listener
      toast.success('Mockup generated and added to post.');
    } catch (error) {
      console.error("Failed to generate mockup:", error);
      toast.error("Failed to generate mockup. Please check your API key.");
    }
  };

  const exportToExcel = async (settings: ExportSettings) => {
    const fetchImageAsBase64 = async (url: string): Promise<{ base64: string, extension: string, width: number, height: number } | null> => {
      if (!url || typeof url !== 'string') return null;
      
      try {
        let fetchUrl = url;
        if (url.startsWith('/')) {
          fetchUrl = window.location.origin + url;
        } else if (!url.startsWith('data:') && !url.startsWith(window.location.origin)) {
          fetchUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        }

        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, extension: 'jpeg', width: img.width, height: img.height });
          };
          img.onerror = () => {
            console.warn("Failed to load image for Excel export:", url);
            resolve(null);
          };
          img.src = fetchUrl;
        });
      } catch (e) {
        console.error("Failed to fetch image for Excel export:", e);
        return null;
      }
    };

    try {
      toast.loading("Generating Excel file... Please wait.", { id: 'excel-export' });
      
      const workbook = new Workbook();
      const { visibleFields, viewVariation, startMonth, endMonth, showBanner, layoutStyle, accentColor } = settings;
      const imagePromises: Promise<void>[] = [];

      // Theme Colors
      const colors = layoutStyle === 'Dark' ? {
        bg: 'FF1A1C1E',
        cellBg: 'FF25282C',
        cellBgAlt: 'FF1E2023',
        headerBg: accentColor.replace('#', 'FF'),
        border: 'FF3F474F',
        text: 'FFE3E2E6',
        textMuted: 'FF909094',
        accent: accentColor.replace('#', 'FF')
      } : {
        bg: 'FFFFFFFF',
        cellBg: 'FFF9FAFB',
        cellBgAlt: 'FFF3F4F6',
        headerBg: accentColor.replace('#', 'FF'),
        border: 'FFD1D5DB',
        text: 'FF111827',
        textMuted: 'FF6B7280',
        accent: accentColor.replace('#', 'FF')
      };

      // Generate list of months to export
      const monthsToExport: Date[] = [];
      let currentIter = startOfMonth(startMonth);
      const lastMonth = startOfMonth(endMonth);
      while (currentIter <= lastMonth) {
        monthsToExport.push(new Date(currentIter));
        currentIter = addMonths(currentIter, 1);
      }

      // Group posts by date for efficient lookup
      const postsByDate: { [key: string]: Post[] } = {};
      posts.forEach(p => {
        if (!postsByDate[p.date]) postsByDate[p.date] = [];
        postsByDate[p.date].push(p);
      });

      for (const monthDate of monthsToExport) {
        const monthLabel = format(monthDate, 'MMM yyyy');
        const sheetName = `${monthLabel} (${viewVariation})`;
        const sheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Excel limit 31 chars

        if (viewVariation === 'calendar') {
          // Setup columns for a 7-day grid
          sheet.columns = [
            { header: 'Monday', key: 'mon', width: 25 },
            { header: 'Tuesday', key: 'tue', width: 25 },
            { header: 'Wednesday', key: 'wed', width: 25 },
            { header: 'Thursday', key: 'thu', width: 25 },
            { header: 'Friday', key: 'fri', width: 25 },
            { header: 'Saturday', key: 'sat', width: 25 },
            { header: 'Sunday', key: 'sun', width: 25 },
          ];

          // Styling headers
          sheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          });

          // Get month range
          const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
          const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start, end });

          // Create grid rows
          for (let i = 0; i < days.length; i += 7) {
            const weekDays = days.slice(i, i + 7);
            const rowData: any = {};
            const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            
            const hasImagesInWeek = weekDays.some(d => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const dayPosts = postsByDate[dateStr] || [];
              return dayPosts.some(p => p.images?.length);
            });

            weekDays.forEach((d, idx) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const dayPosts = postsByDate[dateStr] || [];
              const postContents = dayPosts.map(p => {
                const parts = [];
                if (visibleFields.includes('title')) parts.push(p.title);
                if (visibleFields.includes('type')) parts.push(`[${p.type}]`);
                if (visibleFields.includes('outlet')) parts.push(`@${p.outlet}`);
                if (visibleFields.includes('campaignName') && p.campaignName) parts.push(`(${p.campaignName})`);
                if (visibleFields.includes('contentFormats') && p.contentFormats?.length) parts.push(`{${p.contentFormats.join(', ')}}`);
                if (visibleFields.includes('images') && p.images?.length) parts.push(`(📸 ${p.images.length})`);
                return `• ${parts.join(' ')}`;
              }).join('\n');
              rowData[keys[idx]] = `${format(d, 'MMM d')}\n${postContents}`;
            });

            const row = sheet.addRow(rowData);
            // Increase row height significantly if images are present to accommodate text + image
            row.height = (hasImagesInWeek && visibleFields.includes('images')) ? 250 : 80;
            
            row.eachCell((cell, colNumber) => {
              const d = weekDays[colNumber - 1];
              const isCurrentMonth = isSameMonth(d, monthDate);
              const dateStr = format(d, 'yyyy-MM-dd');
              const dayPosts = postsByDate[dateStr] || [];
              
              cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
              cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: isCurrentMonth ? colors.cellBg : colors.bg } 
              };
              cell.font = { color: { argb: isCurrentMonth ? colors.text : colors.textMuted }, size: 10 };
              cell.border = {
                top: { style: 'thin', color: { argb: colors.border } },
                left: { style: 'thin', color: { argb: colors.border } },
                bottom: { style: 'thin', color: { argb: colors.border } },
                right: { style: 'thin', color: { argb: colors.border } },
              };

              // Handle Image Embedding for Calendar Grid
              if (visibleFields.includes('images') && dayPosts.some(p => p.images?.length)) {
                const embedImage = async () => {
                  try {
                    // Find first post with an image
                    const postWithImage = dayPosts.find(p => p.images?.length);
                    if (!postWithImage) return;

                    const firstImage = postWithImage.images![0];
                    let imageData = await fetchImageAsBase64(firstImage);

                    if (imageData) {
                      const imageId = workbook.addImage({
                        base64: imageData.base64,
                        extension: imageData.extension as any,
                      });
                      
                      // Estimate text height: ~22 pixels per line
                      // Day label + each post line
                      const lineCount = 1 + dayPosts.length;
                      let rowOffPixels = lineCount * 22; 
                      if (rowOffPixels > 180) rowOffPixels = 180;

                      // Calculate available space in pixels
                      // Column width 25 is approx 180 pixels
                      // Row height 250 points is approx 333 pixels
                      const colWidthPx = 180;
                      const rowHeightPx = 333;
                      const availableHeightPx = rowHeightPx - rowOffPixels - 10; // 10px padding
                      const availableWidthPx = colWidthPx - 20; // 20px padding

                      // Calculate best fit maintaining aspect ratio
                      const imgRatio = imageData.width / imageData.height;
                      const containerRatio = availableWidthPx / availableHeightPx;

                      let finalWidth, finalHeight;
                      if (imgRatio > containerRatio) {
                        // Image is wider than container
                        finalWidth = availableWidthPx;
                        finalHeight = availableWidthPx / imgRatio;
                      } else {
                        // Image is taller than container
                        finalHeight = availableHeightPx;
                        finalWidth = availableHeightPx * imgRatio;
                      }

                      // Convert back to Excel coordinates for br
                      const colSpan = (finalWidth / colWidthPx) * 0.9;
                      const rowSpan = (finalHeight / rowHeightPx) * 0.9;
                      
                      sheet.addImage(imageId, {
                        tl: { 
                          col: colNumber - 1 + (0.5 - colSpan / 2), // Center horizontally
                          row: row.number - 1 + (rowOffPixels / rowHeightPx) + 0.02
                        } as any,
                        br: {
                          col: colNumber - 1 + (0.5 + colSpan / 2),
                          row: row.number - 1 + (rowOffPixels / rowHeightPx) + 0.02 + rowSpan
                        } as any,
                        editAs: 'oneCell'
                      });
                    }
                  } catch (e) {
                    console.warn("Failed to embed calendar image:", e);
                  }
                };
                imagePromises.push(embedImage());
              }
            });
          }
        } else if (viewVariation === 'list' || viewVariation === 'timeline') {
          const columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Outlet', key: 'outlet', width: 20 },
            { header: 'Type', key: 'type', width: 20 },
            { header: 'Title', key: 'title', width: 40 },
            { header: 'Brief', key: 'brief', width: 40 },
            { header: 'Caption', key: 'caption', width: 60 },
            { header: 'Hashtags', key: 'hashtags', width: 30 },
            { header: 'Images', key: 'images', width: 50 },
            { header: 'Content Formats', key: 'contentFormats', width: 20 },
            { header: 'Product Link', key: 'link', width: 30 },
            { header: 'Campaign Type', key: 'campaignType', width: 20 },
            { header: 'Campaign Name', key: 'campaignName', width: 30 },
            { header: 'Platforms', key: 'platforms', width: 30 },
          ].filter(col => visibleFields.includes(col.key) || col.key === 'date');

          sheet.columns = columns;

          sheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          });

          const monthPosts = posts.filter(p => isSameMonth(parseISO(p.date), monthDate));
          const sortedPosts = [...monthPosts].sort((a, b) => a.date.localeCompare(b.date));
          
          for (let idx = 0; idx < sortedPosts.length; idx++) {
            const post = sortedPosts[idx];
            const rowData = {
              ...post,
              images: post.images?.join(', ') || '',
              contentFormats: post.contentFormats?.join(', ') || '',
              platforms: Array.isArray(post.platforms) ? post.platforms.join(', ') : post.platforms || '',
            };
            const row = sheet.addRow(rowData);
            row.height = visibleFields.includes('images') && post.images?.length ? 120 : 30;

            row.eachCell((cell, colNumber) => {
              cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: idx % 2 === 0 ? colors.cellBg : colors.cellBgAlt } 
              };
              cell.font = { color: { argb: colors.text } };
              cell.alignment = { wrapText: true, vertical: 'top' };
              cell.border = {
                top: { style: 'thin', color: { argb: colors.border } },
                left: { style: 'thin', color: { argb: colors.border } },
                bottom: { style: 'thin', color: { argb: colors.border } },
                right: { style: 'thin', color: { argb: colors.border } },
              };

              // Handle Image Embedding
              const colKey = columns[colNumber - 1]?.key;
              if (colKey === 'images' && post.images?.length) {
                const embedImage = async () => {
                  try {
                    const firstImage = post.images![0];
                    let imageData = await fetchImageAsBase64(firstImage);

                    if (imageData) {
                      const imageId = workbook.addImage({
                        base64: imageData.base64,
                        extension: imageData.extension as any,
                      });
                      
                      // Calculate available space in pixels
                      // Column width 50 is approx 350 pixels
                      // Row height 120 points is approx 160 pixels
                      const colWidthPx = 350;
                      const rowHeightPx = 160;
                      const availableHeightPx = rowHeightPx - 10; // 10px padding
                      const availableWidthPx = colWidthPx - 20; // 20px padding

                      // Calculate best fit maintaining aspect ratio
                      const imgRatio = imageData.width / imageData.height;
                      const containerRatio = availableWidthPx / availableHeightPx;

                      let finalWidth, finalHeight;
                      if (imgRatio > containerRatio) {
                        finalWidth = availableWidthPx;
                        finalHeight = availableWidthPx / imgRatio;
                      } else {
                        finalHeight = availableHeightPx;
                        finalWidth = availableHeightPx * imgRatio;
                      }

                      // Convert back to Excel coordinates
                      const colSpan = (finalWidth / colWidthPx) * 0.9;
                      const rowSpan = (finalHeight / rowHeightPx) * 0.9;

                      sheet.addImage(imageId, {
                        tl: { 
                          col: colNumber - 1 + (0.5 - colSpan / 2), 
                          row: row.number - 1 + (0.5 - rowSpan / 2) 
                        } as any,
                        br: { 
                          col: colNumber - 1 + (0.5 + colSpan / 2), 
                          row: row.number - 1 + (0.5 + rowSpan / 2) 
                        } as any,
                        editAs: 'oneCell'
                      });
                      cell.value = ''; // Clear text if image is added
                    }
                  } catch (e) {
                    console.warn("Failed to embed image in Excel:", e);
                  }
                };
                // We push to a queue or just run it. Since we're in a loop, we can't easily await here without refactoring the loop.
                // But we can collect promises and await them at the end.
                imagePromises.push(embedImage());
              }
            });
          }

          if (viewVariation === 'timeline') {
            // Add a timeline marker column style if needed, but for now just a clean list is fine
          }
        } else if (viewVariation === 'summary') {
          sheet.addRow([`Forge Social Media Summary - ${monthLabel}`]).font = { bold: true, size: 16 };
          sheet.addRow([`Generated on: ${format(new Date(), 'PPP')}`]);
          sheet.addRow([]);

          const monthPosts = posts.filter(p => isSameMonth(parseISO(p.date), monthDate));

          // Counts by Type
          sheet.addRow(['Posts by Type']).font = { bold: true };
          const typeCounts: { [key: string]: number } = {};
          monthPosts.forEach(p => typeCounts[p.type] = (typeCounts[p.type] || 0) + 1);
          Object.entries(typeCounts).forEach(([type, count]) => {
            sheet.addRow([type, count]);
          });
          sheet.addRow([]);

          // Counts by Outlet
          sheet.addRow(['Posts by Outlet']).font = { bold: true };
          const outletCounts: { [key: string]: number } = {};
          monthPosts.forEach(p => outletCounts[p.outlet] = (outletCounts[p.outlet] || 0) + 1);
          Object.entries(outletCounts).forEach(([outlet, count]) => {
            sheet.addRow([outlet, count]);
          });
        }

        // Add Banner if requested
        if (showBanner) {
          sheet.addRow([]);
          sheet.addRow([]);
          const lastRow = sheet.lastRow!.number;
          
          try {
            const logoData = await fetchImageAsBase64('/logo512x512.png');
            if (logoData) {
              const logoId = workbook.addImage({
                base64: logoData.base64,
                extension: 'png',
              });
              sheet.addImage(logoId, {
                tl: { col: 0, row: lastRow },
                ext: { width: 60, height: 60 },
                editAs: 'oneCell'
              });
            }
          } catch (e) {
            console.warn("Failed to add logo to banner:", e);
          }

          const bannerRow = sheet.addRow(['FORGE SOCIAL MEDIA MANAGER - POWERED BY AI']);
          bannerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
          bannerRow.height = 40;
          bannerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.accent } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          });
          sheet.mergeCells(bannerRow.number, 1, bannerRow.number, sheet.columns.length);
        }
      }

      // Await all image embedding promises
      if (imagePromises.length > 0) {
        toast.loading(`Processing ${imagePromises.length} images...`, { id: 'excel-export' });
        await Promise.allSettled(imagePromises);
      }

      toast.loading("Finalizing Excel file...", { id: 'excel-export' });
      // ALWAYS add a hidden raw data sheet for machine-readable re-import
      const dataSheet = workbook.addWorksheet('_DATA_');
      dataSheet.state = 'hidden';
      
      dataSheet.columns = [
        { header: 'ID', key: 'id', width: 20 },
        { header: 'DATE', key: 'date', width: 15 },
        { header: 'OUTLET', key: 'outlet', width: 20 },
        { header: 'TYPE', key: 'type', width: 20 },
        { header: 'TITLE', key: 'title', width: 40 },
        { header: 'BRIEF', key: 'brief', width: 40 },
        { header: 'CAPTION', key: 'caption', width: 60 },
        { header: 'HASHTAGS', key: 'hashtags', width: 30 },
        { header: 'LINK', key: 'link', width: 30 },
        { header: 'IMAGES', key: 'images', width: 50 },
        { header: 'PRODUCT_CATEGORY', key: 'productCategory', width: 20 },
        { header: 'CAMPAIGN_TYPE', key: 'campaignType', width: 20 },
        { header: 'CAMPAIGN_NAME', key: 'campaignName', width: 30 },
        { header: 'CONTENT_FORMATS', key: 'contentFormats', width: 30 },
        { header: 'PLATFORMS', key: 'platforms', width: 30 },
      ];

      posts.forEach(post => {
        dataSheet.addRow({
          ...post,
          images: post.images?.join(', ') || '',
          contentFormats: post.contentFormats?.join(', ') || '',
          platforms: Array.isArray(post.platforms) ? post.platforms.join(', ') : post.platforms || '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Forge_Social_Media_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      setIsExportModalOpen(false);
      toast.success("Excel file generated and downloaded successfully!", { id: 'excel-export' });
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error("Failed to generate Excel file. Please try again.", { id: 'excel-export' });
    }
  };

  const exportScheduleJson = () => {
    const data = {
      posts,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rainbow-schedule-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importScheduleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        addSyncLog('Parsing Excel file...', 'info');
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Priority 1: Look for hidden _DATA_ sheet
        // Priority 2: Look for 'Post List' sheet
        // Priority 3: Use first sheet
        let worksheet = workbook.Sheets['_DATA_'];
        if (!worksheet) worksheet = workbook.Sheets['Post List'];
        if (!worksheet) worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('No valid data found in Excel file. If you exported a Calendar view, please ensure the file contains the hidden _DATA_ sheet.');
          return;
        }

        // Map Excel columns to Post fields
        let importedPosts: Post[];
        
        // Try AI mapping if preferred
        const { preferredProvider } = getAiSettings();
        if (preferredProvider === 'groq' || preferredProvider === 'gemini') {
          addSyncLog('Using AI to map Excel columns properly...', 'info');
          const mapping = await getExcelMappingWithAi(jsonData);
          
          if (mapping && Object.keys(mapping).length > 0) {
            importedPosts = jsonData.map((row: any) => {
              const post: any = {
                id: uuidv4(),
                date: format(new Date(), 'yyyy-MM-dd'),
                outlet: 'Buildware',
                productCategory: '',
                type: '🔴 Tiles & Flooring',
                title: 'Untitled Post',
                brief: '',
                caption: '',
                hashtags: '',
                link: '',
                images: [],
              };

              Object.entries(mapping).forEach(([excelCol, postField]) => {
                if (postField && postField !== 'none' && row[excelCol]) {
                  post[postField] = row[excelCol];
                }
              });

              return post as Post;
            });
          } else {
            addSyncLog('AI mapping failed or returned no data, falling back to manual mapping...', 'info');
            importedPosts = jsonData.map((row: any) => manualMapRow(row));
          }
        } else {
          importedPosts = jsonData.map((row: any) => manualMapRow(row));
        }

        // Helper function for manual mapping to avoid duplication
        function manualMapRow(row: any) {
          const findVal = (keys: string[]) => {
            const key = Object.keys(row).find(k => keys.includes(k.toUpperCase().replace(/\s/g, '_')));
            return key ? row[key] : '';
          };

          const imagesRaw = findVal(['IMAGES', 'IMAGE', 'PICTURES', 'PICTURE']);
          const images = imagesRaw ? String(imagesRaw).split(',').map(s => s.trim()).filter(Boolean) : [];

          return {
            id: findVal(['ID', 'POST_ID']) || uuidv4(),
            date: findVal(['DATE', 'POST_DATE']) || format(new Date(), 'yyyy-MM-dd'),
            outlet: findVal(['OUTLET', 'PLATFORM', 'POST_OUTLET']) || 'Buildware',
            productCategory: findVal(['CATEGORY', 'PRODUCT_CATEGORY', 'PRODUCT_TYPE']),
            type: findVal(['TYPE', 'POST_TYPE']) || '🔴 Tiles & Flooring',
            title: findVal(['TITLE', 'HEADLINE', 'POST_TITLE']) || 'Untitled Post',
            brief: findVal(['BRIEF', 'DESCRIPTION', 'POST_BRIEF']) || '',
            caption: findVal(['CAPTION', 'POST_CAPTION']) || '',
            hashtags: findVal(['HASHTAGS', 'TAGS', 'POST_HASHTAGS']) || '',
            link: findVal(['LINK', 'URL', 'POST_LINK']) || '',
            images: images,
          } as Post;
        }

        // Merge with existing posts to avoid duplicates if ID matches
        const mergedPosts = [...posts];
        importedPosts.forEach(imported => {
          const index = mergedPosts.findIndex(p => p.id === imported.id);
          if (index !== -1) {
            mergedPosts[index] = { ...mergedPosts[index], ...imported };
          } else {
            mergedPosts.push(imported);
          }
        });

        setPosts(mergedPosts);

        if (user) {
          setIsSyncing(true);
          addSyncLog(`Starting import of ${importedPosts.length} posts from Excel...`, 'info');
          
          try {
            const processedPosts: Post[] = [];
            for (let index = 0; index < importedPosts.length; index++) {
              const post = importedPosts[index];
              const postId = post.id;
              addSyncLog(`Processing Excel post ${index + 1}/${importedPosts.length}: ${post.title}`, 'info');

              const finalImageUrls: string[] = [];
              if (post.images && post.images.length > 0) {
                for (let i = 0; i < post.images.length; i++) {
                  const img = post.images[i];
                  if (!img) continue;

                  const trimmed = img.trim();

                  // Case 1: Valid URL
                  if (trimmed.startsWith('http')) {
                    finalImageUrls.push(trimmed);
                    continue;
                  }

                  // Case 2: Base64
                  if (trimmed.startsWith('data:') || trimmed.length > 10000) {
                    let dataUrl = trimmed.startsWith('data:') ? trimmed : `data:image/jpeg;base64,${trimmed}`;
                    const storagePath = `posts/${user.uid}/${postId}/image_${i}`;
                    
                    try {
                      addSyncLog(`  Uploading image ${i + 1} from Excel...`, 'info');
                      const uploadPromise = uploadBase64Image(dataUrl, storagePath);
                      const timeoutPromise = new Promise<never>((_, reject) => 
                        setTimeout(() => reject(new Error('Upload timeout after 120s')), 120000)
                      );
                      const url = await Promise.race([uploadPromise, timeoutPromise]);
                      finalImageUrls.push(url);
                    } catch (err) {
                      console.error("Excel image upload failed:", err);
                      addSyncLog(`  Failed to upload image ${i + 1} for post ${postId}`, 'error');
                    }
                  } else {
                    // Unrecognized, skip
                    console.warn(`[importScheduleExcel] Skipping unrecognized image format:`, trimmed.substring(0, 50));
                  }
                }
              }

              processedPosts.push({ ...post, userId: user.uid, businessId: activeBusiness?.id || post.businessId, images: finalImageUrls });
            }

            addSyncLog(`Saving ${processedPosts.length} posts to cloud...`, 'info');
            const BATCH_SIZE = 400;
            for (let i = 0; i < processedPosts.length; i += BATCH_SIZE) {
              const batch = writeBatch(db);
              const chunk = processedPosts.slice(i, i + BATCH_SIZE);
              chunk.forEach((post) => {
                const postRef = doc(db, 'posts', post.id);
                batch.set(postRef, post);
              });
              await batch.commit();
          }
          addSyncLog(`Successfully imported ${processedPosts.length} posts from Excel`, 'success');
          toast.success('Excel schedule imported and synced successfully!');
        } catch (err) {
          console.error('Failed to sync Excel posts:', err);
          addSyncLog('Failed to sync Excel posts to cloud', 'error');
          toast.error('Failed to sync Excel posts to cloud.');
        } finally {
          setIsSyncing(false);
        }
      } else {
        toast.info('Excel schedule imported locally. Log in to sync.');
      }
    } catch (error) {
      console.error('Failed to parse Excel file:', error);
      toast.error('Failed to parse Excel file. Make sure it is a valid .xlsx or .xls file.');
    } finally {
      setIsSyncing(false);
    }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const importScheduleJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        addSyncLog('Parsing backup file...', 'info');
        const data = JSON.parse(event.target?.result as string);
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
          if (user) {
            setIsSyncing(true);
            addSyncLog(`Starting import of ${data.posts.length} posts...`, 'info');
            try {
              // Process posts sequentially to avoid overwhelming the browser or network
              const processedPosts: Post[] = [];
              for (let index = 0; index < data.posts.length; index++) {
                const post = data.posts[index];
                const postId = post.id || uuidv4();
                addSyncLog(`Processing post ${index + 1}/${data.posts.length}: ${post.title || 'Untitled'}`, 'info');
                
                const imageUrls: string[] = [];
                if (post.images && post.images.length > 0) {
                  for (let i = 0; i < post.images.length; i++) {
                    const img = post.images[i];
                    if (!img) {
                      console.warn(`[importScheduleJson] Skipping null/undefined image at index ${i}`);
                      continue;
                    }

                    const trimmed = img.trim();

                    // Case 1: Already a valid hosted URL — keep as-is
                    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
                      imageUrls.push(trimmed);
                      continue;
                    }

                    // Case 2: base64 data URL
                    // Case 3: raw base64 without data: prefix (large string)
                    let dataUrl: string;
                    if (trimmed.startsWith('data:')) {
                      dataUrl = trimmed;
                    } else if (trimmed.length > 10000) {
                      dataUrl = `data:image/jpeg;base64,${trimmed}`;
                    } else {
                      console.warn(`[importScheduleJson] Skipping unrecognized image format at index ${i}:`, trimmed.substring(0, 50));
                      continue;
                    }

                    const storagePath = `posts/${user.uid}/${postId}/image_${i}`;
                    try {
                      const sizeInMB = (dataUrl.length * 0.75) / (1024 * 1024);
                      addSyncLog(`  Uploading image ${i + 1}/${post.images.length} (${sizeInMB.toFixed(2)} MB)...`, 'info');
                      
                      // Retry mechanism for image uploads with 60s timeout
                      let url = '';
                      let retries = 2;
                      while (retries >= 0) {
                        try {
                          const uploadPromise = uploadBase64Image(dataUrl, storagePath);
                          const timeoutPromise = new Promise<never>((_, reject) => 
                            setTimeout(() => reject(new Error('Upload timeout after 60s')), 60000)
                          );
                          url = await Promise.race([uploadPromise, timeoutPromise]);
                          break; // Success
                        } catch (e) {
                          if (retries === 0) throw e;
                          retries--;
                          addSyncLog(`  Retrying upload for image ${i + 1}... (${2 - retries}/2)`, 'info');
                          await new Promise(r => setTimeout(r, 1000)); // Wait before retry
                        }
                      }
                      imageUrls.push(url);
                    } catch (e) {
                      console.error("Failed to upload image", e);
                      const errorMsg = e instanceof Error ? e.message : String(e);
                      addSyncLog(`  Failed to upload image ${i + 1} for post ${postId}: ${errorMsg}`, 'error');
                      // Skip this image, don't store base64
                    }
                  }
                }
                processedPosts.push({ ...post, id: postId, userId: user.uid, businessId: activeBusiness?.id || post.businessId, images: imageUrls });
              }

              addSyncLog(`All images processed. Saving ${processedPosts.length} posts to cloud...`, 'info');
              // Firestore batches have a limit of 500 writes
              const BATCH_SIZE = 400;
              for (let i = 0; i < processedPosts.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = processedPosts.slice(i, i + BATCH_SIZE);
                chunk.forEach((post) => {
                  if (post.id) {
                    const postRef = doc(db, 'posts', post.id);
                    batch.set(postRef, post);
                  }
                });
                await batch.commit();
                addSyncLog(`Saved batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(processedPosts.length/BATCH_SIZE)}`, 'info');
              }
              addSyncLog(`Successfully imported and synced ${processedPosts.length} posts`, 'success');
              toast.success('Schedule imported and synced successfully!');
            } catch (err) {
              console.error('Failed to sync imported posts:', err);
              addSyncLog('Failed to sync imported posts to cloud', 'error');
              toast.error('Failed to sync imported posts to cloud.');
            }
          } else {
            toast.info('Schedule imported locally. Log in to sync to cloud.');
          }
        } else {
          toast.error('Invalid backup file format.');
        }
      } catch (err) {
        console.error('Failed to import schedule:', err);
        addSyncLog('Failed to parse backup file', 'error');
        toast.error('Invalid backup file.');
      } finally {
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if ((loading || (user && loadingBusinesses)) && !authTimeout) {
    return (
      <div className="min-h-screen bg-[#1A1C1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <ForgeLoader size={60} />
          <p className="text-[#909094] animate-pulse font-medium tracking-wide">
            {loading ? 'Syncing with cloud...' : 'Loading workspaces...'}
          </p>
        </div>
      </div>
    );
  }

  if (loading && authTimeout) {
    return (
      <div className="min-h-screen bg-[#1A1C1E] flex items-center justify-center p-4">
        <div className="bg-[#24262B] border border-[#33353B] p-8 rounded-[24px] text-center max-w-md ">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connection is slow</h2>
          <p className="text-[#909094] mb-6">We're having trouble connecting to the cloud. This might be due to a slow network or a temporary service issue.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-[#2383E2] text-white rounded-[12px] font-medium hover:bg-[#1C6AB8] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-white/5 text-white rounded-[12px] font-medium hover:bg-white/10 transition-colors"
            >
              Clear Cache & Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#1A1C1E] flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[16px] text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Authentication Error</h2>
          <p className="text-red-300/70 mb-6">{authError.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white rounded-[12px] font-medium hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user && !isCheckingShare && !isViewOnly) {
    if (showLogin) return <Login />;
    return <LandingView onLogin={() => setShowLogin(true)} />;
  }
  
  if (isGuest && (loading || isCheckingShare) && !isViewOnly) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#191919] flex items-center justify-center">
        <ForgeLoader size={48} />
      </div>
    );
  }

  const exportProductExcel = () => {
    const savedProducts = localStorage.getItem('rainbowStockCheck');
    if (!savedProducts) {
      toast.warning("No product data to export.");
      return;
    }
    
    try {
      const products = JSON.parse(savedProducts);
      if (!Array.isArray(products) || products.length === 0) {
        toast.warning("No product data to export.");
        return;
      }

      const exportData = products.map(p => ({
        'Product Name': p.title,
        'Category': p.type,
        'Stock Info': p.stockInfo,
        'Outlet': p.outlet || 'Forge Enterprises',
        'Link': p.link
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Check");
      XLSX.writeFile(wb, `Forge_Stock_Check_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error("Failed to export products:", e);
    }
  };

  const exportProductJson = () => {
    const savedProducts = localStorage.getItem('rainbowStockCheck');
    const savedCounts = localStorage.getItem('rainbowCategoryCounts');
    
    const data = {
      products: savedProducts ? JSON.parse(savedProducts) : [],
      categoryCounts: savedCounts ? JSON.parse(savedCounts) : [],
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rainbow-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExtensionZip = async () => {
    try {
      setIsSyncing(true);
      addSyncLog('Preparing extension source files...', 'info');
      
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();
      
      // Fetch and add extension files
      const extensionFiles = ['manifest.json', 'content.js', 'popup.html', 'popup.js'];
      for (const file of extensionFiles) {
        try {
          const res = await fetch(`/Forge_Companion_Extension/${file}`);
          if (res.ok) {
            const text = await res.text();

            // Guard against SPA router answering with index.html for 404s
            if (file !== 'popup.html' && text.trim().toLowerCase().startsWith('<!doctype html>')) {
              console.warn(`Failed to fetch true ${file} (received SPA fallback).`);
              continue;
            }

            zip.file(file, text);
          } else {
            console.warn(`Failed to fetch ${file}`);
          }
        } catch (e) {
          console.error(`Error fetching ${file}:`, e);
        }
      }
      
      // Add project metadata
      zip.file('metadata.json', JSON.stringify({
        name: activeBusiness?.name || 'Forge Extension',
        version: '1.0.0',
        description: activeBusiness?.description || 'Exported from Forge AI',
        exportedAt: new Date().toISOString()
      }, null, 2));

      // Add data files
      zip.file('data/posts.json', JSON.stringify(posts, null, 2));
      zip.file('data/products.json', JSON.stringify(localStorage.getItem(`rainbowStockCheck_${activeBusiness?.id || 'default'}`) ? JSON.parse(localStorage.getItem(`rainbowStockCheck_${activeBusiness?.id || 'default'}`)!) : [], null, 2));
      zip.file('data/business.json', JSON.stringify(activeBusiness, null, 2));

      // Add a README
      zip.file('README.md', `# ${activeBusiness?.name || 'Forge Extension'}\n\nThis is an exported extension package from Forge AI.\n\n## Contents\n- \`manifest.json\`, \`content.js\`, \`popup.html\`, \`popup.js\`: Chrome Extension source files\n- \`metadata.json\`: Extension metadata\n- \`data/\`: Exported workspace data\n\n## Installation\n1. Open Chrome and go to \`chrome://extensions\`\n2. Enable "Developer mode"\n3. Click "Load unpacked" and select this extracted folder.`);

      addSyncLog('Generating ZIP archive...', 'info');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Forge_Companion_Extension_${format(new Date(), 'yyyy-MM-dd')}.zip`);
      
      addSyncLog('Extension ZIP exported successfully', 'success');
      toast.success('Extension package downloaded!');
    } catch (error) {
      console.error('Failed to export extension ZIP:', error);
      addSyncLog('Failed to export extension ZIP', 'error');
      toast.error('Failed to generate extension ZIP.');
    } finally {
      setIsSyncing(false);
    }
  };

  const importProductJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.products && Array.isArray(data.products)) {
          localStorage.setItem(`rainbowStockCheck_${activeBusiness?.id || 'default'}`, JSON.stringify(data.products));
          
          if (user && activeBusiness?.id) {
            const syncToFirestore = async () => {
              try {
                const CHUNK_SIZE = 100;
                for (let i = 0; i < data.products.length; i += CHUNK_SIZE) {
                  const batch = writeBatch(db);
                  const chunk = data.products.slice(i, i + CHUNK_SIZE);
                  chunk.forEach((p: any) => {
                    const docId = p.title.replace(/[^a-zA-Z0-9]/g, '_');
                    const docRef = doc(db, 'inventory_products', `${activeBusiness.id}_${docId}`);
                    batch.set(docRef, { ...p, userId: user.uid, businessId: activeBusiness.id, updatedAt: new Date().toISOString() });
                  });
                  await batch.commit();
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              } catch (e) {
                console.error("Failed to sync products to firestore", e);
              }
            };
            syncToFirestore();
          }
        }
        if (data.categoryCounts && Array.isArray(data.categoryCounts)) {
          localStorage.setItem(`rainbowCategoryCounts_${activeBusiness?.id || 'default'}`, JSON.stringify(data.categoryCounts));
          
          if (user && activeBusiness?.id) {
            const syncCounts = async () => {
              try {
                const batch = writeBatch(db);
                data.categoryCounts.forEach((c: any) => {
                  const docId = c.category.replace(/[^a-zA-Z0-9]/g, '_');
                  const docRef = doc(db, 'inventory_category_counts', `${activeBusiness.id}_${docId}`);
                  batch.set(docRef, { ...c, userId: user.uid, businessId: activeBusiness.id, updatedAt: new Date().toISOString() });
                });
                await batch.commit();
              } catch (e) {
                console.error("Failed to sync category counts to firestore", e);
              }
            };
            syncCounts();
          }
        }
        toast.success('Product data imported successfully! Please refresh or switch tabs to see changes.');
        window.dispatchEvent(new Event('storage')); 
      } catch (err) {
        console.error('Failed to import product data:', err);
        toast.error('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOnboardingComplete = async (data: Partial<Business> & { targetUrl?: string; theme?: string; geminiApiKey?: string }) => {
    if (!user) return;
    try {
      const bizId = uuidv4();
      const newBiz: Business = {
        id: bizId,
        name: data.name || 'My Business',
        industry: data.industry || 'Retail',
        description: data.description || '',
        ownerId: user.uid,
        members: [user.uid],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareToken: uuidv4(),
        status: 'active'
      };

      await setDoc(doc(db, 'businesses', bizId), newBiz);
      
      // Initialize Brand Kit
      await setDoc(doc(db, 'brand_kits', bizId), {
        businessId: bizId,
        colors: [
          { name: 'Primary', hex: (data as any).brandColors?.primary || '#3b82f6' },
          { name: 'Secondary', hex: (data as any).brandColors?.secondary || '#1e293b' },
          { name: 'Accent', hex: (data as any).brandColors?.accent || '#f59e0b' }
        ],
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        },
        designGuide: `Brand Voice: Professional and engaging.\nIndustry: ${data.industry}.\nDescription: ${data.description}.`,
        updatedAt: new Date().toISOString()
      });

      // Update AI Settings & Theme
      if (data.targetUrl || data.geminiApiKey) {
        const newSettings = { 
          ...aiSettings, 
          targetUrl: data.targetUrl || aiSettings.targetUrl,
          geminiApiKey: data.geminiApiKey || aiSettings.geminiApiKey
        };
        setAiSettingsState(newSettings);
        setAiSettings(newSettings); // Sync to localStorage
        await setDoc(doc(db, 'users', user.uid), { aiSettings: newSettings }, { merge: true });
      }

      if (data.theme) {
        if (data.theme === 'dark') setIsDarkMode(true);
        else if (data.theme === 'light') setIsDarkMode(false);
        else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setIsDarkMode(prefersDark);
        }
        localStorage.setItem('forge_theme_mode', data.theme);
      }

      toast.success("Workspace created successfully!");
      setShowOnboarding(false);
    } catch (error) {
      console.error("Failed to complete onboarding", error);
      toast.error("Failed to create workspace.");
    }
  };

  return (
    <ErrorBoundary>
      {showOnboarding && user && (
        <OnboardingWizard 
          userEmail={user.email || ''} 
          onComplete={handleOnboardingComplete} 
        />
      )}
      <AppWorkspaceProvider activeBusiness={activeBusiness}>
        <ConfigWorkspaceProvider activeBusiness={activeBusiness}>
          <DndContext 
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={(event) => {
          const { over } = event;
          if (over && (over.id === 'calendar-tab-droppable' || over.id === 'calendar-tab-droppable-mobile')) {
            setActiveTab('schedule');
          }
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-[100dvh] w-full bg-white dark:bg-[#191919] flex flex-col font-sans text-[#37352F] dark:text-[#EBE9ED] relative print:h-auto print:overflow-visible print:bg-white">
        {/* Drag and Drop Overlays */}
        <AnimatePresence>
          {activeDragItem && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex gap-4 pointer-events-none"
            >
              <DroppableZone id="cancel-zone" label="Cancel" icon={<X className="w-5 h-5" />} color="bg-gray-500" />
              {activeDragItem.type === 'post' && (
                <DroppableZone id="delete-zone" label="Delete" icon={<Trash2 className="w-5 h-5" />} color="bg-red-500" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <ContextMenu items={[
          { 
            label: 'New Post', 
            icon: <Plus className="w-3.5 h-3.5" />, 
            disabled: activeTab === 'notebook' || activeTab === 'brandkit' || activeTab === 'analytics',
            onClick: () => openNewPostModal() 
          },
          { label: 'Refresh Data', icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => window.location.reload() },
          { 
            label: 'Export to Excel', 
            icon: <FileSpreadsheet className="w-3.5 h-3.5" />, 
            disabled: activeTab === 'notebook' || activeTab === 'brandkit',
            onClick: () => setIsExportModalOpen(true) 
          },
          { label: 'Manage Workspaces', icon: <Settings className="w-3.5 h-3.5" />, onClick: () => setIsBusinessModalOpen(true) },
          { label: 'Sign Out', icon: <LogOut className="w-3.5 h-3.5" />, variant: 'danger', onClick: () => signOut(auth) },
        ]}>
          <div className="flex flex-1 w-full relative">
            {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex sticky top-0 h-screen w-20 bg-[#F7F7F5] dark:bg-[#202020] border-r border-[#E9E9E7] dark:border-[#2E2E2E] flex-col shrink-0 z-50 items-center py-4 justify-between print:hidden overflow-y-auto no-scrollbar">
        <div className="flex flex-col gap-2 lg:gap-4 w-full items-center">
          {/* Logo */}
          <div className="w-10 h-10 bg-transparent rounded-[12px] flex items-center justify-center text-gray-400 font-black text-lg shrink-0 overflow-hidden">
            <ForgeLogo size={28} className="p-1" />
          </div>


          {/* Business Selector */}
          {user && !isViewOnly && (
            <div className="flex flex-col gap-3 w-full items-center px-2 py-3 border-y border-[#E9E9E7] dark:border-[#2E2E2E] relative">
              {activeBusiness && (
                <button
                  onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                  title={activeBusiness.name}
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-xs transition-all border-2 shrink-0 bg-brand text-white border-brand-hover  hover:scale-105"
                >
                  {activeBusiness.name.substring(0, 2).toUpperCase()}
                </button>
              )}
              
              {isWorkspaceDropdownOpen && createPortal(
                <>
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={() => setIsWorkspaceDropdownOpen(false)}
                  />
                  <div className="fixed top-20 left-20 ml-2 w-56 bg-white dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px]  z-[101] py-2 overflow-hidden flex flex-col max-h-[60vh]">
                    <div className="px-3 py-2 text-xs font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider">
                      Workspaces
                    </div>
                    <div className="overflow-y-auto no-scrollbar flex-1">
                      {businesses.map(biz => (
                        <button
                          key={biz.id}
                          onClick={() => {
                            setActiveBusiness(biz);
                            setIsWorkspaceDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-[#F7F7F5] dark:hover:bg-[#3E3E3E] transition-colors",
                            activeBusiness?.id === biz.id ? "text-brand font-medium" : "text-[#37352F] dark:text-[#EBE9ED]"
                          )}
                        >
                          <span className="truncate">{biz.name}</span>
                          {activeBusiness?.id === biz.id && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-[#E9E9E7] dark:border-[#3E3E3E] mt-2 pt-2 px-2 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          setIsWorkspaceDropdownOpen(false);
                          setIsBusinessModalOpen(true);
                        }}
                        className="w-full text-left px-2 py-2 text-sm flex items-center gap-2 hover:bg-[#F7F7F5] dark:hover:bg-[#3E3E3E] rounded-[8px] transition-colors text-[#757681] dark:text-[#9B9A97]"
                      >
                        <Settings className="w-4 h-4" />
                        Manage Workspaces
                      </button>
                      <button
                        onClick={() => {
                          setIsWorkspaceDropdownOpen(false);
                          setShowOnboarding(true);
                        }}
                        className="w-full text-left px-2 py-2 text-sm flex items-center gap-2 hover:bg-[#F7F7F5] dark:hover:bg-[#3E3E3E] rounded-[8px] transition-colors text-brand"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Workspace
                      </button>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          )}

          {/* Nav */}
          <nav className="flex flex-col gap-1 lg:gap-2 w-full px-2">
            <button 
              onClick={() => setActiveTab('home')} 
              title="Home"
              className={cn(
                "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors", 
                activeTab === 'home' ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
              )}
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
            </button>
            <DroppableTab 
              id="calendar-tab-droppable"
              onClick={() => setActiveTab('schedule')} 
              title={industryConfig.terminology.calendar}
              className={cn(
                "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors", 
                activeTab === 'schedule' ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
              )}
            >
              <CalendarIcon className="w-5 h-5 shrink-0" />
            </DroppableTab>
            {isAdmin ? (
              <>
                <button 
                  onClick={() => setActiveTab('search')} 
                  title={industryConfig.terminology.products}
                  className={cn(
                    "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors", 
                    activeTab === 'search' ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                  )}
                >
                  <Database className="w-5 h-5 shrink-0" />
                </button>
                <button 
                  onClick={() => setActiveTab('notebook')} 
                  title="Notebook"
                  className={cn(
                    "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors", 
                    activeTab === 'notebook' ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                  )}
                >
                  <Notebook className="w-5 h-5 shrink-0" />
                </button>
                <button 
                  onClick={() => setActiveTab('brandkit')} 
                  title={industryConfig.terminology.assets}
                  className={cn(
                    "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors", 
                    activeTab === 'brandkit' ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                  )}
                >
                  <Palette className="w-5 h-5 shrink-0" />
                </button>
                <button 
                  onClick={() => setActiveTab('creative')} 
                  title="AI Studio"
                  className={cn(
                    "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors", 
                    activeTab === 'creative' ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                  )}
                >
                  <Sparkles className="w-5 h-5 shrink-0" />
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')} 
                  title="Insights & Analytics"
                  className={cn(
                    "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors", 
                    activeTab === 'analytics' ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                  )}
                >
                  <BarChart3 className="w-5 h-5 shrink-0" />
                </button>
              </>
            ) : isViewer ? (
              <>
                <button 
                  onClick={handleRequestAccess}
                  title="Request Access to Products"
                  className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                >
                  <Database className="w-5 h-5 shrink-0" />
                  <Lock className="w-3 h-3 absolute bottom-1.5 right-1.5 text-brand" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    Request Access
                  </div>
                </button>
                <button 
                  onClick={handleRequestAccess}
                  title="Request Access to Notebook"
                  className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                >
                  <Notebook className="w-5 h-5 shrink-0" />
                  <Lock className="w-3 h-3 absolute bottom-1.5 right-1.5 text-brand" />
                </button>
                <button 
                  onClick={handleRequestAccess}
                  title="Request Access to Brand Kit"
                  className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                >
                  <Palette className="w-5 h-5 shrink-0" />
                  <Lock className="w-3 h-3 absolute bottom-1.5 right-1.5 text-brand" />
                </button>
                <button 
                  onClick={handleRequestAccess}
                  title="Request Access to AI Studio"
                  className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                >
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <Lock className="w-3 h-3 absolute bottom-1.5 right-1.5 text-brand" />
                </button>
                <button 
                  onClick={handleRequestAccess}
                  title="Request Access to Analytics"
                  className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                >
                  <BarChart3 className="w-5 h-5 shrink-0" />
                  <Lock className="w-3 h-3 absolute bottom-1.5 right-1.5 text-brand" />
                </button>
              </>
            ) : null}
            {isGuest && (
              <button 
                onClick={handleLogin}
                disabled={isSigningIn}
                title="Sign In (Admin)"
                className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10 text-blue-600 dark:text-blue-400 disabled:opacity-50"
              >
                <Smartphone className="w-5 h-5 shrink-0" />
              </button>
            )}
          </nav>
        </div>

        {/* Bottom section: User & Sync */}
        <div className="flex flex-col gap-2 lg:gap-4 w-full items-center px-2 mt-4 lg:mt-0 pb-4 shrink-0">
          <div className="relative group flex justify-center w-full cursor-help mb-2">
            {isSyncing ? (
              <ForgeLoader size={18} />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
              {isSyncing ? 'Syncing to Cloud...' : 'Synced to Cloud'}
            </div>
          </div>

          {user ? (
            <button 
              onClick={() => setActiveTab('more')}
              className="relative group w-10 h-10 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand"
              title="Settings"
            >
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`} 
                alt="User" 
                className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-30" 
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
                <Settings className="w-5 h-5 text-white drop-" />
              </div>
            </button>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center" title="Guest">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn("flex-1 flex flex-col min-w-0 relative print:h-auto print:overflow-visible", activeTab === 'chat' && "md:flex")}>
          <main className={cn(
            "flex-1 flex flex-col px-4 md:px-8 pt-6 md:pt-8 pb-32 md:pb-28 print:p-0 print:overflow-visible", 
            (activeTab === 'chat' || activeTab === 'home' || activeTab === 'notebook') && "p-0 sm:p-0 md:p-0 pb-0",
            activeTab !== 'search' && "no-scrollbar"
          )}>
          <div className={cn("w-full flex-1 flex flex-col print:max-w-none print:h-auto print:block", (activeTab === 'chat' || activeTab === 'home') && "max-w-none h-full")}>
            {/* Page Title */}
            <div className={cn("mb-2 md:mb-4 flex items-center justify-between shrink-0 print:hidden px-2 md:px-0", (activeTab === 'chat' || activeTab === 'home' || activeTab === 'more') && "hidden", "md:hidden")}>
              <div className="flex items-center gap-3">
                {user && !isViewOnly && (
                  <button
                    onClick={() => setIsBusinessModalOpen(true)}
                    className="w-10 h-10 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] flex items-center justify-center font-bold text-xs text-brand  active:scale-95 transition-transform"
                  >
                    {activeBusiness?.name.substring(0, 2).toUpperCase() || '??'}
                  </button>
                )}
                <div className="flex flex-col">
                  <h1 className="text-xs md:text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">
                    {activeTab === 'home' && 'Home'}
                    {activeTab === 'schedule' && industryConfig.terminology.calendar}
                    {activeTab === 'search' && industryConfig.terminology.products}
                    {activeTab === 'brandkit' && industryConfig.terminology.assets}
                    {activeTab === 'creative' && 'AI Studio'}
                    {activeTab === 'analytics' && 'Insights & Analytics'}
                    {activeTab === 'notebook' && 'Notebook'}
                    {activeTab === 'more' && 'Settings'}
                  </h1>
                  {/* Mobile Sync Indicator */}
                  <div className="md:hidden flex items-center gap-1 mt-0.5">
                    {isSyncing ? (
                      <ForgeLoader size={12} />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    )}
                    <span className="text-[10px] font-medium text-[#757681] dark:text-[#9B9A97]">
                      {isSyncing ? 'Syncing...' : 'Cloud Synced'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                {/* Desktop Sync Indicator (redundant but nice to have in header too) */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                  {isSyncing ? (
                    <ForgeLoader size={14} />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                  <span className="text-xs font-medium text-[#757681] dark:text-[#9B9A97]">
                    {isSyncing ? 'Syncing' : 'Synced'}
                  </span>
                </div>
                {activeTab === 'schedule' && isAdmin && (
                  <div className="flex items-center gap-2">
                    <CalendarSharing activeBusiness={activeBusiness} onUpdateBusiness={setActiveBusiness} />
                  </div>
                )}
              </div>
            </div>

            <div className={cn(
              "flex-1 flex flex-col print:block",
              activeTab !== 'home' && activeTab !== 'schedule' && activeTab !== 'chat' && "hidden print:hidden"
            )}>
              {activeTab === 'home' && (
                <HomeTab 
                  posts={posts}
                  activeBusiness={activeBusiness}
                  setActiveTab={setActiveTab}
                  onAddPost={openNewPostModal}
                  isAdmin={isAdmin}
                  isViewer={isViewer}
                  onHandleRequestAccess={handleRequestAccess}
                  user={user}
                />
              )}
              <div className={cn("flex-1 flex flex-col", activeTab === 'home' && "hidden", activeTab === 'chat' && "hidden md:flex")}>
                <Calendar 
                  currentDate={currentMonth} 
                  posts={isAdmin ? posts : posts.filter(p => !p.isHiddenForOthers)} 
                  onEditPost={openEditPostModal}
                  onDeletePost={isAdmin ? handleDeletePost : undefined}
                  onCopyPost={isAdmin ? handleCopyPost : undefined}
                  onAddPost={isAdmin ? openNewPostModal : undefined}
                  onGenerateWithAi={isAdmin ? handleGenerateWithAi : undefined}
                  onImageClick={handleImageClick}
                  onRegeneratePost={isAdmin ? handleRegeneratePost : undefined}
                  onGenerateMockup={isAdmin ? handleGenerateMockup : undefined}
                  onUpdatePost={isAdmin ? handleSavePost : undefined}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onFileDrop={isAdmin ? handleFileDrop : undefined}
                  isAdmin={isAdmin}
                  isGuest={isGuest}
                  activeBusiness={activeBusiness}
                  onUpdateBusiness={setActiveBusiness}
                  isDarkMode={isDarkMode}
                  toggleDarkMode={toggleDarkMode}
                  calendarMode={calendarMode}
                  onCalendarModeChange={setCalendarMode}
                />
              </div>
            </div>
            
            {isAdmin && (
              <div className={cn("flex-1", activeTab === 'search' ? 'block' : 'hidden')}>
                <LocalDb onAddPost={(products) => {
                  setIsPostModalOpen(true);
                  setSelectedPost(null);
                  setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                  setInitialProductsForModal(products);
                }} activeBusiness={activeBusiness} />
              </div>
            )}
            
            {isAdmin && (
              <div className={cn("flex-1", activeTab === 'brandkit' ? 'block' : 'hidden')}>
                <BrandKitTab activeBusiness={activeBusiness} posts={posts} aiSettings={aiSettings} />
              </div>
            )}

            {isAdmin && (
              <div className={cn("flex-1", activeTab === 'creative' ? 'block' : 'hidden')}>
                <CreativeStudioTab 
                  onSavePost={handleSavePost}
                  userId={user?.uid}
                  activeBusiness={activeBusiness}
                />
              </div>
            )}

            {isAdmin && (
              <div className={cn("flex-1", activeTab === 'analytics' ? 'block' : 'hidden')}>
                <AnalyticsTab setActiveTab={setActiveTab} />
              </div>
            )}


            {isAdmin && (
              <div className={cn("flex-1", activeTab === 'notebook' ? 'block' : 'hidden')}>
                <NotebookTab activeBusiness={activeBusiness} />
              </div>
            )}
            
            {isAdmin && (
              <div className={cn("flex-1", activeTab === 'workspace_management' ? 'block' : 'hidden')}>
                <WorkspaceManagementTab 
                  activeBusiness={activeBusiness} 
                  onUpdateBusiness={setActiveBusiness} 
                  setActiveTab={setActiveTab} 
                />
              </div>
            )}
            
            {isAdmin && (
              <div className={cn("flex-1 pb-32 md:pb-12", activeTab === 'more' || activeTab === 'settings' ? 'block' : 'hidden')}>
                <SettingsView 
                  user={user}
                  settingsTab={settingsTab}
                  setSettingsTab={setSettingsTab}
                  isDarkMode={isDarkMode}
                  toggleDarkMode={toggleDarkMode}
                  isInstallable={isInstallable}
                  handleInstallClick={handleInstallClick}
                  setIsAddToHomeModalOpen={setIsAddToHomeModalOpen}
                  businesses={businesses}
                  activeBusiness={activeBusiness}
                  setBusinesses={setBusinesses}
                  setActiveBusiness={setActiveBusiness}
                  aiSettings={aiSettings}
                  handleAiSettingChange={handleAiSettingChange}
                  setAiSettingsState={setAiSettingsState}
                  setAiSettings={setAiSettings}
                  analyticsSettings={analyticsSettings}
                  handleAnalyticsSettingChange={handleAnalyticsSettingChange}
                  setIsExportModalOpen={setIsExportModalOpen}
                  exportScheduleJson={exportScheduleJson}
                  importScheduleJson={importScheduleJson}
                  importScheduleExcel={importScheduleExcel}
                  initialPosts={initialPosts}
                  handleSavePost={handleSavePost}
                  setIsSyncing={setIsSyncing}
                  addSyncLog={addSyncLog}
                  setIsExcelImportModalOpen={setIsExcelImportModalOpen}
                  exportProductExcel={exportProductExcel}
                  handleAutoCategorizeAll={handleAutoCategorizeAll}
                  isAutoCategorizing={isAutoCategorizing}
                  exportProductJson={exportProductJson}
                  exportExtensionZip={handleExportExtensionZip}
                  importProductJson={importProductJson}
                  onThemePresetChange={setThemePreset}
                  googleTokens={googleTokens}
                  handleDisconnectGoogleDrive={handleDisconnectGoogleDrive}
                  handleConnectGoogleDrive={handleConnectGoogleDrive}
                  setConfirmAction={setConfirmAction}
                  syncLogs={syncLogs}
                  signOut={signOut}
                  auth={auth}
                  db={db}
                  setPosts={setPosts}
                  query={query}
                  collection={collection}
                  where={where}
                  getDocs={getDocs}
                  writeBatch={writeBatch}
                  industryConfig={industryConfig}
                  setActiveTab={setActiveTab}
                />
              </div>
            )}
</div>
</main>
</div>
        
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeDragItem ? (
            <div className="opacity-80 scale-105  pointer-events-none">
              {activeDragItem.type === 'product' && (
                <div className="bg-white dark:bg-[#191919] border border-brand rounded-[6px] p-3 w-64 ">
                  <div className="text-[10px] font-bold text-brand uppercase mb-1">{activeDragItem.product.type}</div>
                  <div className="text-sm font-bold">{activeDragItem.product.title}</div>
                </div>
              )}
              {activeDragItem.type === 'image' && (
                <div className="w-20 h-20 rounded-[6px] overflow-hidden border-2 border-brand">
                  <img src={activeDragItem.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {activeDragItem.type === 'idea' && (
                <div className="bg-white dark:bg-[#1E1E1E] border border-brand rounded-[24px] p-5  w-64">
                  <div className="flex gap-2 mb-2">
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {activeDragItem.idea.type}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight mb-2">
                    {activeDragItem.idea.title}
                  </h4>
                </div>
              )}
              {activeDragItem.type === 'notebook-block' && (
                <div className="bg-white dark:bg-[#1E1E1E] border border-purple-500 rounded-xl p-4 w-64 shadow-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">
                      {activeDragItem.block.type}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">
                    {activeDragItem.block.title || 'Untitled Block'}
                  </h4>
                  <p className="text-[10px] text-[#757681] truncate mt-1">
                    {activeDragItem.block.content}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
        {isAdmin && (
          <FloatingChat 
            posts={posts}
            activeBusiness={activeBusiness}
            brandKit={brandKit}
            products={products}
            onUpdatePost={(updatedPost) => {
              handleSavePost(updatedPost);
            }}
            onCreatePost={(newPost, date) => {
              handleSavePost({ ...newPost, date: date || newPost.date });
            }}
            onDeletePost={handleDeletePost}
            onPreviewPost={(partialPost) => {
              setSelectedPost({
                id: 'preview-' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                images: [],
                outlet: 'Rainbow Enterprises',
                type: '🔴 General',
                title: '',
                brief: '',
                caption: '',
                hashtags: '',
                userId: user?.uid || '',
                businessId: activeBusiness?.id || '',
                ...partialPost
              } as Post);
              setIsPostModalOpen(true);
            }}
            droppedItem={droppedToChat}
            onClearDroppedItem={() => setDroppedToChat(null)}
            isFullPage={activeTab === 'chat'}
            onClose={() => setActiveTab('schedule')}
            onFullScreen={() => setActiveTab('chat')}
          />
        )}
      </div>
    </ContextMenu>

    {/* Mobile Bottom Navigation */}
      <div className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50 transition-all bg-white dark:bg-[#191919] border-t border-[#E9E9E7] dark:border-[#2E2E2E] h-[64px] flex items-center px-2"
      )}>
        {isAdmin ? (
          <nav className="flex-1 flex flex-row justify-between w-full h-full items-center">
            {[
              { id: 'home', icon: LayoutGrid, title: 'Home' },
              { id: 'schedule', icon: CalendarIcon, title: 'Calendar' },
              { id: 'chat', icon: MessageSquare, title: 'Chat' },
              { id: 'notebook', icon: Notebook, title: 'Notebook' },
              { id: 'more', icon: Menu, title: 'More' }
            ].map(tab => {
              const Icon = tab.icon;
              const isSubTabActive = tab.id === 'more' && ['search', 'ai', 'creative', 'analytics', 'more'].includes(activeTab);
              const isActive = activeTab === tab.id || isSubTabActive;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center transition-all duration-200 relative flex-1 h-full",
                    isActive ? "text-brand" : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                  )}
                  title={tab.title}
                >
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTabIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand rounded-b-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1 flex flex-row justify-between w-full h-full items-center px-4">
            <button
              onClick={() => setActiveTab('schedule')}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-200 relative h-full px-4",
                activeTab === 'schedule' ? "text-brand" : "text-[#757681] dark:text-[#9B9A97]"
              )}
            >
              <CalendarIcon className="w-6 h-6" />
              {activeTab === 'schedule' && (
                <motion.div
                  layoutId="mobileActiveTabIndicatorGuest"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand rounded-b-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
            
            {isGuest && (
              <button 
                onClick={handleLogin}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-[12px] font-medium text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                <Smartphone className="w-4 h-4" />
                {isSigningIn ? '...' : 'Sign In'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {dropActionPrompt && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#191919] rounded-[12px]  max-w-md w-full p-6 border border-[#E9E9E7] dark:border-[#2E2E2E]">
            <h2 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED] mb-4">Multiple Images Dropped</h2>
            <p className="text-[#757681] dark:text-[#9B9A97] mb-6">
              You dropped {dropActionPrompt.files.length} images. How would you like to add them?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => processDroppedFiles(dropActionPrompt.dateStr, dropActionPrompt.files, 'single')}
                className="w-full py-2.5 px-4 bg-[#2383E2] hover:bg-[#1D6EB8] text-white rounded-[8px] font-medium transition-colors"
              >
                Create as one single post (Carousel)
              </button>
              <button
                onClick={() => processDroppedFiles(dropActionPrompt.dateStr, dropActionPrompt.files, 'separate')}
                className="w-full py-2.5 px-4 bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] font-medium transition-colors"
              >
                Create as separate tasks
              </button>
              <button
                onClick={() => setDropActionPrompt(null)}
                className="w-full py-2.5 px-4 text-[#757681] dark:text-[#9B9A97] hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-[8px] font-medium transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddToHomeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#191919] w-full max-w-md rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]  overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-[12px] flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Add to Home Screen</h2>
              </div>
              <button onClick={() => setIsAddToHomeModalOpen(false)} className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-[#37352F] dark:text-[#EBE9ED]">Open this site in your mobile browser (Safari for iOS, Chrome for Android).</p>
                </div>
                
                <div className="p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <h3 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest mb-3">On iPhone (Safari)</h3>
                  <ol className="text-sm space-y-2 list-decimal pl-4">
                    <li>Tap the <span className="font-bold">Share</span> button (square with arrow up) at the bottom.</li>
                    <li>Scroll down and tap <span className="font-bold">"Add to Home Screen"</span>.</li>
                    <li>Tap <span className="font-bold">Add</span> in the top right corner.</li>
                  </ol>
                </div>

                <div className="p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <h3 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest mb-3">On Android (Chrome)</h3>
                  <ol className="text-sm space-y-2 list-decimal pl-4">
                    <li>Tap the <span className="font-bold">Menu</span> (three dots) in the top right.</li>
                    <li>Tap <span className="font-bold">"Add to Home screen"</span>.</li>
                    <li>Confirm by tapping <span className="font-bold">Add</span>.</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-[12px] border border-blue-100 dark:border-blue-900/30">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This creates a shortcut on your home screen for instant access. It doesn't use extra storage like a regular app.
                </p>
              </div>
            </div>

            <div className="p-6 bg-[#F7F7F5] dark:bg-[#202020] border-t border-[#E9E9E7] dark:border-[#2E2E2E] space-y-3">
              {isInstallable && (
                <button 
                  onClick={() => {
                    handleInstallClick();
                    setIsAddToHomeModalOpen(false);
                  }}
                  className="w-full py-3 bg-amber-500 text-white rounded-[12px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-5 h-5" />
                  Install Now
                </button>
              )}
              <button 
                onClick={() => setIsAddToHomeModalOpen(false)}
                className="w-full py-3 bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#191919] rounded-[12px] font-bold hover:opacity-90 transition-opacity"
              >
                {isInstallable ? 'Maybe Later' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}



      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setInitialProductsForModal([]);
        }}
        post={selectedPost}
        selectedDate={selectedDate || undefined}
        onSave={isAdmin ? handleSavePost : undefined}
        onDelete={isAdmin ? handleDeletePost : undefined}
        readOnly={!isAdmin}
        user={user}
        googleTokens={googleTokens}
        initialProducts={initialProductsForModal}
        activeBusiness={activeBusiness}
        posts={posts}
        dbMode={getDbMode(activeBusiness?.industry)}
        droppedImages={droppedImagesForModal}
        onImagesConsumed={() => setDroppedImagesForModal([])}
      />

      <DirectSearch
        isOpen={isDirectSearchOpen}
        onClose={() => setIsDirectSearchOpen(false)}
      />

      <Toaster position="top-right" richColors />
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#191919] rounded-[12px]  border border-[#E9E9E7] dark:border-[#2E2E2E] w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
            <p className="text-[#757681] dark:text-[#9B9A97] mb-6">
              Are you sure you want to {confirmAction.type.toLowerCase()}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] rounded-[8px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 text-sm font-medium bg-[#EB5757] text-white rounded-[8px] hover:bg-[#D43D3D] transition-colors "
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#191919] p-8 rounded-[24px]  border border-[#E9E9E7] dark:border-[#2E2E2E] max-w-md w-full space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-[16px] flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">Protected Calendar</h2>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97]">This calendar is password protected. Please enter the password to view.</p>
            </div>
            <div className="space-y-4">
              <input 
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                className="w-full p-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] outline-none focus:ring-2 focus:ring-blue-500/20 text-center text-lg font-bold tracking-widest"
                autoFocus
              />
              <button 
                onClick={handlePasswordSubmit}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-bold transition-all   active:scale-95"
              >
                Access Calendar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ImageViewer
        isOpen={isImageViewerOpen}
        images={currentImages}
        initialIndex={currentImageIndex}
        aiProvider={currentAiProvider}
        onClose={() => setIsImageViewerOpen(false)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={exportToExcel}
      />

      <ExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onImport={async (newPosts) => {
          for (const post of newPosts) {
            await handleSavePost(post);
          }
        }}
        userId={user?.uid}
      />

      <BusinessModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        businesses={businesses}
        activeBusiness={activeBusiness}
        onSelect={setActiveBusiness}
        onCreate={handleCreateBusiness}
        onDelete={handleDeleteBusiness}
        onAddNewWorkspace={() => setShowOnboarding(true)}
      />
    </div>
  </DndContext>
</ConfigWorkspaceProvider>
</AppWorkspaceProvider>
</ErrorBoundary>
  );
}
