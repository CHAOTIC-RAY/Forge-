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
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isAfter } from 'date-fns';
import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { Menu, Plus, Download, Calendar as CalendarIcon, Database, Notebook, LayoutGrid, Trash2, RefreshCw, Save, Upload, Smartphone, X, Info, Globe, Printer, CircleAlert as AlertCircle, Cloud, User, CircleCheck as CheckCircle2, FileSpreadsheet, MessageSquare, Sparkles, Newspaper, Lightbulb, Palette, ChartBar as BarChart3, Maximize, Share2, Terminal, Wand as Wand2, Settings, ListTodo, LogOut, Bell, Building2, Search as SearchIcon, Moon, Sun, Lock, Box, Boxes } from 'lucide-react';

import { useParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { Post, initialPosts, Business, OUTLETS } from './data';
import { WorkspaceProvider as AppWorkspaceProvider } from './contexts/WorkspaceContext';
import { WorkspaceProvider as ConfigWorkspaceProvider } from './lib/workspaceConfig';
import { getIndustryConfig, getDbMode } from './lib/industryConfig';
import { loadThemeConfig, applyThemeConfig, resetThemeConfig } from './lib/themeEngine';
import type { ExportSettings } from './components/modals/ExportModal';
import { getAiSettings, setAiSettings } from './lib/aiSettings';
import type { HighStockProduct } from './types/catalogue';
import { auth, storage, googleProvider } from './lib/firebase';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import {
  subscribeToPosts,
  subscribeToPostsForProfile,
  subscribeToBusinesses,
  createPost,
  updatePost,
  deletePost,
  getPosts,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  getBusiness,
  getBusinessByShareToken,
  updateProfileAiSettings,
  updateProfile,
  upsertCategoriesDoc,
  getCategoriesDoc,
  getShortLink,
  incrementShortLinkClicks,
  subscribeToBrandKit,
  getNotebook,
  upsertNotebook,
  addBusinessMember,
  createAccessRequest,
  upsertBrandKit,
} from './lib/supabase';
import { syncCatalogueProducts, saveCategoryCounts } from './lib/catalogueSupabase';
import { uploadBase64Image, deleteAppStorageFile } from './lib/storage';
import { useAppStore } from './store';
import { signInWithPopup, getRedirectResult, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ref, deleteObject, getBlob } from 'firebase/storage';
import { cn, readFileAsDataURL, createImageCollage, getAnalyticsSettings, setAnalyticsSettings } from './lib/utils';
import { WorkspacesSettings } from './components/WorkspacesSettings';
import { ForgeLoader } from './components/ForgeLoader';
import { ForgeLogo } from './components/ForgeLogo';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LandingView } from './components/LandingView';
import { LocalAiTabLoader } from './components/LocalAiTabLoader';
import { CorsImage } from './components/CorsImage';
import { NetworkStatus } from './components/NetworkStatus';
import { SkipLink } from './components/SkipLink';

const getGemini = () => import('./lib/gemini');

const Calendar = React.lazy(() => import('./components/Calendar').then(m => ({ default: m.Calendar })));
const HomeTab = React.lazy(() => import('./components/HomeTab').then(m => ({ default: m.HomeTab })));
const LocalDb = React.lazy(() => import('./components/LocalDb').then(m => ({ default: m.LocalDb })));
const FloatingChat = React.lazy(() => import('./components/FloatingChat').then(m => ({ default: m.FloatingChat })));
const OnboardingWizard = React.lazy(() => import('./components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));

// React lazy imports for heavy components
const PostModal = React.lazy(() => import('./components/modals/PostModal').then(m => ({ default: m.PostModal })));
const ImageViewer = React.lazy(() => import('./components/ImageViewer').then(m => ({ default: m.ImageViewer })));
const CalendarSharing = React.lazy(() => import('./components/CalendarSharing').then(m => ({ default: m.CalendarSharing })));
const DirectSearch = React.lazy(() => import('./components/DirectSearch').then(m => ({ default: m.DirectSearch })));
const ExportModal = React.lazy(() => import('./components/modals/ExportModal').then(m => ({ default: m.ExportModal })));
const ExcelImportModal = React.lazy(() => import('./components/modals/ExcelImportModal').then(m => ({ default: m.ExcelImportModal })));
const BusinessModal = React.lazy(() => import('./components/modals/BusinessModal').then(m => ({ default: m.BusinessModal })));
const AutoFillModal = React.lazy(() => import('./components/modals/AutoFillModal').then(m => ({ default: m.AutoFillModal })));
const WidgetsTab = React.lazy(() => import('./components/CreativeStudioTab').then(m => ({ default: m.WidgetsTab })));
const AnalyticsTab = React.lazy(() => import('./components/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const BrandKitTab = React.lazy(() => import('./components/BrandKitTab').then(m => ({ default: m.BrandKitTab })));
const IdeasTab = React.lazy(() => import('./components/IdeasTab').then(m => ({ default: m.IdeasTab })));
const WorkspaceManagementTab = React.lazy(() => import('./components/WorkspaceManagementTab').then(m => ({ default: m.WorkspaceManagementTab })));
function LazyModal({ isOpen, children }: { isOpen: boolean, children: () => React.ReactNode }) {
  const [hasRendered, setHasRendered] = React.useState(isOpen);
  React.useEffect(() => {
    if (isOpen) setHasRendered(true);
  }, [isOpen]);
  
  if (!hasRendered) return null;
  return <React.Suspense fallback={null}>{children()}</React.Suspense>;
}

function LazyTab({ active, children, className }: { active: boolean, children: () => React.ReactNode, className?: string }) {
  const [hasRendered, setHasRendered] = React.useState(active);
  React.useEffect(() => {
    if (active) setHasRendered(true);
  }, [active]);
  
  if (!hasRendered) return null;
  return (
    <div className={className || `flex-1 ${active ? 'block' : 'hidden'}`}>
      <React.Suspense fallback={<div className="flex items-center justify-center p-8 h-full"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div></div>}>
        {children()}
      </React.Suspense>
    </div>
  );
}

type SyncLog = {
  id: string;
  time: Date;
  message: string;
  type: 'info' | 'success' | 'error';
};

function DroppableTab({ id, children, className, onClick, title, 'data-label': dataLabel }: { id: string, children: React.ReactNode, className?: string, onClick?: () => void, title?: string, 'data-label'?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      title={title}
      data-label={dataLabel}
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
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle Short Link Resolution
  useEffect(() => {
    if (shortCode) {
      console.log("[App] Resolving short link code:", shortCode);
      const resolveShortCode = async () => {
        try {
          const link = await getShortLink(shortCode);
          
          if (link) {
            console.log("[App] Short link found. Original URL:", link.original_url);
            
            if (link.original_url) {
              void incrementShortLinkClicks(link.id).catch((err) => console.error("Error updating click count", err));

              try {
                const url = new URL(link.original_url);
                // If it's a share URL, we can navigate internally or just use href
                if (url.origin === window.location.origin) {
                  const internalPath = url.pathname + url.search;
                  console.log("[App] Redirecting to internal path:", internalPath);
                  navigate(internalPath, { replace: true });
                } else {
                  console.log("[App] Redirecting to external URL:", link.original_url);
                  window.location.href = link.original_url;
                }
              } catch (urlErr) {
                console.error("Invalid original URL in short link", urlErr);
                toast.error("Invalid short link destination");
              }
            }
          } else {
            console.warn("[App] Short link not found for code:", shortCode);
            toast.error("Short link not found or expired");
          }
        } catch (e) {
          console.error("[App] Error resolving short code", e);
          toast.error("Failed to resolve short link");
        }
      };
      
      resolveShortCode();
    }
  }, [shortCode, navigate]);

  const [user, loading, authError] = useAuthState(auth);
  const { profile, loading: profileLoading, error: profileSyncError, refreshProfile } = useSupabaseAuth();
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    // Explicitly log auth state changes for debugging
    console.log("[Auth] Current state:", { user: !!user, loading, authError });
    
    // Check for redirect results on mount to clear any pending redirect states
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        console.log("[Auth] Redirect result found user:", result.user.email);
      }
    }).catch(err => {
      console.error("[Auth] Redirect result error:", err);
    });

    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) {
        console.log("[Auth] onAuthStateChanged: Logged in as", u.email);
      } else {
        console.log("[Auth] onAuthStateChanged: Not logged in");
      }
    });

    return () => unsubscribe();
  }, [user, loading, authError]);

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
      }, 30000); // Increase timeout to 30s
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

  const defaultAiSettings = useMemo(() => getAiSettings(), []);
  const defaultAnalyticsSettings = useMemo(() => getAnalyticsSettings(), []);
  const aiSettings = useAppStore(state => state.aiSettings) || defaultAiSettings;
  const setAiSettingsState = useAppStore(state => state.setAiSettings);

  // Skip server AI config + WebLLM preload on public landing (not signed in)
  useEffect(() => {
    if (!user) return;
    void import('./lib/gemini').then(({ fetchServerConfig }) => {
      fetchServerConfig().catch(console.error);
    });
  }, [user]);

  const analyticsSettings = useAppStore(state => state.analyticsSettings) || defaultAnalyticsSettings;
  const setAnalyticsSettingsState = useAppStore(state => state.setAnalyticsSettings);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
        toast.error("Popup blocked/closed. Please open the app in a new tab (button top right) to sign in securely.");
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
  const businesses = useAppStore(state => state.businesses);
  const setBusinesses = useAppStore(state => state.setBusinesses);
  const activeBusiness = useAppStore(state => state.activeBusiness);
  const setActiveBusiness = useAppStore(state => state.setActiveBusiness);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [sharedBusiness, setSharedBusiness] = useState<Business | null>(null);
  const [isCheckingShare, setIsCheckingShare] = useState(true);

  const isAdmin = useMemo(() => !!(user && !isViewOnly), [user, isViewOnly]);

  const isViewer = useMemo(() => !!(user && activeBusiness && activeBusiness.memberRoles?.[user.uid] === 'viewer'), [user, activeBusiness]);
  const isGuest = !user;
  const [calendarMode, setCalendarMode] = useState<'work' | 'personal'>('work');

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userOnboardingComplete, setUserOnboardingComplete] = useState<boolean | null>(null);

  const industryConfig = useMemo(() => getIndustryConfig(activeBusiness?.industry), [activeBusiness?.industry]);
  const brandKit = useAppStore(state => state.brandKit);
  const setBrandKit = useAppStore(state => state.setBrandKit);

  useEffect(() => {
    if (!activeBusiness || isViewOnly) {
      setBrandKit(null);
      return;
    }
    return subscribeToBrandKit(activeBusiness.id, (data) => {
      setBrandKit(data);
    });
  }, [activeBusiness, isViewOnly]);

  const products = useAppStore(state => state.products);
  const setProducts = useAppStore(state => state.setProducts);
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
    if (user && profile) {
      void updateProfileAiSettings(profile.id, newSettings as Record<string, unknown>).catch((err) => {
        console.error('Failed to sync AI settings to Supabase', err);
      });
    }
  };

  const handleAnalyticsSettingChange = (key: string, value: any) => {
    const newSettings = { ...analyticsSettings, [key]: value };
    setAnalyticsSettingsState(newSettings);
    setAnalyticsSettings(newSettings);
  };

  const posts = useAppStore(state => state.posts);
  const setPosts = useAppStore(state => state.setPosts);
  
  // --- HYBRID INTELLIGENCE: Data Sync (Phase 4) ---
  useEffect(() => {
    if (activeBusiness) {
      import('./lib/rag').then(({ syncDatabase }) => {
         syncDatabase(activeBusiness, products, posts, brandKit);
      });
    }
  }, [activeBusiness, products, posts, brandKit]);

  const isSyncing = useAppStore(state => state.isSyncing);
  const setIsSyncing = useAppStore(state => state.setIsSyncing);
  const [settingsTab, setSettingsTab] = useState<'account' | 'workspaces' | 'ai' | 'analytics' | 'maintenance'>('account');
  const [googleTokens, setGoogleTokens] = useState<{ access_token: string, refresh_token?: string, expires_in: number } | null>(() => {
    const saved = localStorage.getItem('google_drive_tokens');
    return saved ? JSON.parse(saved) : null;
  });
  const [confirmAction, setConfirmAction] = useState<{ type: string; onConfirm: () => Promise<void> | void } | null>(null);

  // Listen for Chrome Extension messages
  useEffect(() => {
    const handleExtensionMessage = async (event: MessageEvent) => {
      // 1. Return User State for Login
      if (event.data?.type === 'FORGE_GET_USER_STATE') {
        if (!user) {
          console.warn("[Forge Companion] Extension requested state but user is not logged in.");
          return;
        }
        console.log("[Forge Companion] Extension requested state. Sending:", user.email);
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
      if ((event.data?.type === 'FORGE_ADD_NOTE' || event.data?.type === 'FORGE_QUICK_NOTE') && user && profile) {
        try {
          const targetWorkspaceId = event.data.workspaceId || activeBusiness?.id;
          if (!targetWorkspaceId) throw new Error("No active workspace to route into.");

          const existing = await getNotebook(targetWorkspaceId, profile.id);
          const currentBlocks = existing?.blocks || [];

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
            newBlock = {
              id: uuidv4(),
              type: 'text',
              title: `Quick Note`,
              content: event.data.data,
              status: 'inbox',
              createdAt: Date.now()
            };
          }

          await upsertNotebook(targetWorkspaceId, profile.id, {
            title: existing?.title || 'Creative Strategy',
            blocks: [newBlock, ...currentBlocks],
            links: existing?.links || [],
            folders: existing?.folders || [],
          });

          toast.success(event.data.type === 'FORGE_ADD_NOTE' ? "Note clipped to Ideas!" : "Quick idea added!");
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
          const data = await getPosts(targetWorkspaceId);
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


  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'calendar' | 'search' | 'brandkit' | 'more' | 'chat' | 'widgets' | 'creative' | 'analytics' | 'ideas' | 'notebook' | 'workspace_management' | 'aistudio'>('home');
  const isIdeasTabActive = activeTab === 'ideas' || activeTab === 'notebook';
  const isWidgetsTabActive = activeTab === 'widgets' || activeTab === 'creative';
  const usesTabPageLayout =
    isIdeasTabActive ||
    isWidgetsTabActive ||
    activeTab === 'analytics' ||
    activeTab === 'brandkit' ||
    activeTab === 'search' ||
    activeTab === 'schedule' ||
    activeTab === 'more' ||
    activeTab === 'workspace_management';
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

  // Fine-tuning state
  const [finetuneStatus, setFinetuneStatus] = useState<{ isRunning: boolean; progress: number; logs: string[] }>({
    isRunning: false,
    progress: 0,
    logs: []
  });
  const [showFinetunePanel, setShowFinetunePanel] = useState(false);

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

  // Apply saved custom theme when user is logged in; strip it on landing/login
  useEffect(() => {
    if (user) {
      const saved = loadThemeConfig();
      if (saved) applyThemeConfig(saved);
    } else {
      resetThemeConfig();
    }
  }, [user?.uid]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const userProfileSynced = useRef<string | null>(null);

  // Sync AI settings from Supabase profile
  useEffect(() => {
    if (!profile?.ai_settings) return;
    setAiSettingsState(profile.ai_settings as typeof aiSettings);
    setAiSettings(profile.ai_settings as typeof aiSettings);
  }, [profile?.id, profile?.ai_settings]);

  // Preload local text + vision models after sign-in (default provider is built-in)
  useEffect(() => {
    if (!user) return;
    void import('./lib/localAiBootstrap').then(({ ensureLocalAiEnginesReady }) =>
      ensureLocalAiEnginesReady().catch((err) => {
        console.warn('[App] Local AI preload failed:', err);
      })
    );
  }, [user, aiSettings.builtinModelId, aiSettings.builtinVisionModelId]);

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
      await updateBusiness(bizData.id, {
        shareAnalytics: { ...bizData.shareAnalytics, views: newViews, lastViewedAt: new Date().toISOString() },
      } as Partial<Business>);
    } catch (e) {
      console.error("Error updating share analytics", e);
    }

    const sharedPosts = await getPosts(bizData.id);

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
          const link = await getShortLink(shortCode);
          if (link?.original_url) {
            void incrementShortLinkClicks(link.id);
            window.location.href = link.original_url;
            return;
          }
        } catch (e) {
          console.error("Short link error", e);
        }
      }

      const joinId = params.get('join');
      if (joinId && user && profile) {
        try {
          const bizData = await getBusiness(joinId);
          if (bizData && bizData.ownerId !== profile.id) {
            await addBusinessMember(joinId, profile.id, 'viewer');
            toast.success(`Joined workspace: ${bizData.name}`);
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
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
          const bizData = await getBusiness(bizId!);
          if (bizData && bizData.shareToken === shareToken) {
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

  // Fetch user's workspaces from Supabase
  useEffect(() => {
    if (isViewOnly) return;

    if (!user) {
      setLoadingBusinesses(false);
      return;
    }

    if (!profile) {
      if (!profileLoading) {
        setLoadingBusinesses(false);
        setShowOnboarding(true);
      }
      return;
    }

    const applyBusinessList = (bizList: Business[]) => {
      setBusinesses(bizList);
      setLoadingBusinesses(false);
      setShowOnboarding(bizList.length === 0);

      if (bizList.length > 0) {
        const lastBizId = localStorage.getItem('last_active_business_id');
        const lastBiz = bizList.find((b) => b.id === lastBizId);
        if (!activeBusiness || !bizList.find((b) => b.id === activeBusiness.id)) {
          setActiveBusiness(lastBiz || bizList[0]);
        }
      }
    };

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void import('./lib/profileApi')
      .then(({ fetchBusinessesViaApi }) => fetchBusinessesViaApi())
      .then((bizList) => {
        if (!cancelled) applyBusinessList(bizList);
      })
      .catch((err) => {
        console.warn('[businesses] API load failed, using client subscription', err);
        if (!cancelled) {
          unsubscribe = subscribeToBusinesses(profile.id, applyBusinessList);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [profile, profileLoading, user, isViewOnly]);

  useEffect(() => {
    if (!user || !profile || isViewOnly) return;

    const sessionKey = 'forge_supabase_session_ready';
    void (async () => {
      try {
        const { ensureSupabaseAccessToken } = await import('./lib/supabaseSession');
        await ensureSupabaseAccessToken(false);

        if (sessionStorage.getItem(sessionKey)) return;

        const { repairWorkspaceOwnership } = await import('./lib/workspaceRepair');
        await repairWorkspaceOwnership();
        sessionStorage.setItem(sessionKey, '1');
      } catch (error) {
        console.warn('[auth] Supabase session setup failed:', error);
      }
    })();
  }, [user?.uid, profile?.id, isViewOnly]);

  useEffect(() => {
    if (activeBusiness && !isViewOnly) {
      localStorage.setItem('last_active_business_id', activeBusiness.id);
    }
  }, [activeBusiness, isViewOnly]);

  useEffect(() => {
    if (finetuneStatus.isRunning) {
      const interval = setInterval(async () => {
        try {
          const res = await axios.get('/api/ai/finetune/status');
          setFinetuneStatus(res.data);
          if (!res.data.isRunning && res.data.progress === 100) {
            clearInterval(interval);
            toast.success("Fine-tuning completed!");
          }
        } catch (error) {
          console.error("Failed to fetch finetune status", error);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [finetuneStatus.isRunning]);

  const handleStartFinetune = async () => {
    try {
      await axios.post('/api/ai/finetune', { modelId: aiSettings.builtinModelId || 'LLaMA-7B' });
      setFinetuneStatus(prev => ({ ...prev, isRunning: true }));
      setShowFinetunePanel(true);
      toast.info("Fine-tuning started on server...");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to start fine-tuning.");
    }
  };

  const handleCreateBusiness = async (name: string, industry: string, position: string) => {
    if (!user || !profile) return;
    try {
      const newBiz = await createBusiness({ name, industry, position }, profile.id);
      setBusinesses([...businesses, newBiz]);
      setActiveBusiness(newBiz);
      setShowOnboarding(false);
      toast.success(`Workspace "${name}" created!`);
    } catch (e) {
      console.error('Failed to create business', e);
      toast.error('Failed to create workspace.');
    }
  };
  const handleDeleteBusiness = async (bizId: string) => {
    if (!user) return;
    try {
      await deleteBusiness(bizId);
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
    if (!user || !activeBusiness || !profile) return;
    try {
      await createAccessRequest(activeBusiness.id, profile.id, 'viewer', 'Requesting access to workspace');
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

      const updatedProducts = [...products];
      const batchSize = 15;

      for (let i = 0; i < uncategorized.length; i += batchSize) {
        const batch = uncategorized.slice(i, i + batchSize);
        const { generateAppJson } = await getGemini();
        const categoriesMap = await generateAppJson(`Categorize the following products into one of these categories: Furniture, Building Materials, Home Appliances, Kitchenware, Electronics, Lighting, Bathroom Fittings, Hardware.
          
          Products:
          ${batch.map(p => p.title).join(', ')}
          
          Return a JSON object where keys are product names and values are the categories.`);

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
  const [dropActionPrompt, setDropActionPrompt] = useState<{ dateStr: string, files: File[] } | null>(null);

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

      const businessIdForPost =
        calendarMode === 'personal'
          ? undefined
          : post.businessId || activeBusiness?.id;

      const postPayload: Post = {
        ...post,
        userId: profile?.id || user.uid,
        businessId: businessIdForPost,
        images: imageUrls,
      };

      const existingPost = posts.find((p) => p.id === post.id);
      if (existingPost) {
        await updatePost(post.id, postPayload);
      } else if (businessIdForPost) {
        await createPost(postPayload, businessIdForPost, profile?.id);
      } else {
        await createPost(postPayload, activeBusiness?.id || '', profile?.id);
      }
      addSyncLog(`Successfully saved post: ${post.title || 'Untitled'}`, 'success');

      if (activeBusiness?.id) {
        try {
          const catDoc = await getCategoriesDoc(activeBusiness.id);
          const currentCats: any[] = (catDoc?.categories as any[]) || [];

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
            await upsertCategoriesDoc(activeBusiness.id, { categories: [...currentCats, ...newCats] });
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
      await updatePost(post.id, { ...post, ...update });
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
          for (const post of repeatPosts) {
            const lastDate = new Date(post.lastRepeatDate || post.publishedAt!);
            const intervalDays = post.repeatInterval === 'weekly' ? 7 : post.repeatInterval === 'biweekly' ? 14 : 30;
            const nextDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

            if (nextDate <= now) {
              const nowIso = now.toISOString();
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

              await createPost(
                { ...newPost, userId: profile?.id || user.uid },
                post.businessId || activeBusiness?.id || '',
                profile?.id
              );
              await updatePost(post.id, { lastRepeatDate: nowIso });
            }
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
    const updated = { ...post, approvalStatus: 'awaiting_approval' as const, submittedAt: new Date().toISOString() };
    await handleSavePost(updated);
  };

  const handleApprovePost = async (post: Post) => {
    const updated = { ...post, approvalStatus: 'approved' as const, reviewedAt: new Date().toISOString() };
    await handleSavePost(updated);
  };

  const handleRejectPost = async (post: Post, note: string) => {
    const updated = { ...post, approvalStatus: 'needs_revision' as const, approvalNote: note, reviewedAt: new Date().toISOString() };
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

      await deletePost(id);
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
    if (loading || !profile) return;

    const currentDeps = { profileId: profile.id, activeBusiness: activeBusiness?.id, sharedBusiness: sharedBusiness?.id, isViewOnly, calendarMode };
    const changedDeps = Object.keys(currentDeps).filter(k => (currentDeps as any)[k] !== prevDeps.current[k]);
    if (changedDeps.length > 0) {
      console.log(`[Sync] Dependencies changed: ${changedDeps.join(', ')}`);
    }
    prevDeps.current = currentDeps;

    setIsSyncing(true);
    const context = calendarMode === 'personal' ? 'personal' : (activeBusiness ? `business ${activeBusiness.id}` : 'shared/none');
    addSyncLog(`Connecting to Supabase (${context})...`, 'info');

    let unsubscribe: () => void;
    const onPosts = (fetchedPosts: Post[]) => {
      addSyncLog(`Received ${fetchedPosts.length} posts`, 'info');
      setPosts(fetchedPosts);
      setIsSyncing(false);
    };

    if (isViewOnly && sharedBusiness?.id) {
      unsubscribe = subscribeToPosts(sharedBusiness.id, onPosts);
    } else if (calendarMode === 'personal') {
      unsubscribe = subscribeToPostsForProfile(profile.id, onPosts);
    } else if (activeBusiness?.id) {
      unsubscribe = subscribeToPosts(activeBusiness.id, onPosts);
    } else {
      setPosts([]);
      setIsSyncing(false);
      return;
    }

    const timeoutId = setTimeout(() => setIsSyncing(false), 15000);
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [profile, activeBusiness, sharedBusiness, isViewOnly, calendarMode, loading]);

  useEffect(() => {
    if (profile) {
      const settings = profile.settings as { onboardingComplete?: boolean } | undefined;
      setUserOnboardingComplete(settings?.onboardingComplete === true);
      userProfileSynced.current = profile.firebase_uid;
    }
  }, [profile]);

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

  const getDefaultPostOutlet = () =>
    activeBusiness?.name?.trim() || OUTLETS[0] || 'Main Store';

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
      const defaultOutlet = getDefaultPostOutlet();
      const placeholderPost: Post = {
        id: newPostId,
        date: dateStr,
        outlet: defaultOutlet,
        type: '✨ Generating...',
        title: 'Analyzing images...',
        brief: 'Please wait while AI generates content...',
        caption: '',
        hashtags: '',
        images: base64Images,
        userId: user.uid,
        businessId: activeBusiness?.id,
      };

      await handleSavePost(placeholderPost);

      try {
        const collageBase64 = await createImageCollage(base64Images);
        const match = collageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!match) {
          throw new Error('Could not read image data for AI analysis.');
        }
        const mimeType = match[1];
        const base64Data = match[2];
        const { generatePostFromImage } = await getGemini();
        const generatedData = await generatePostFromImage(
          base64Data,
          mimeType,
          defaultOutlet,
          false,
          activeBusiness || undefined
        );

        await handleSavePost({
          ...placeholderPost,
          title: generatedData.title || 'New Post',
          brief: generatedData.brief || '',
          caption: generatedData.caption || '',
          hashtags: generatedData.hashtags || '',
          type: generatedData.type || '🔴 General',
          outlet: generatedData.outlet || defaultOutlet,
        });
      } catch (error) {
        console.error('Failed to generate post from image:', error);
        const errMsg = error instanceof Error ? error.message : 'Failed to auto-generate content.';
        toast.error(errMsg);
        await handleSavePost({
          ...placeholderPost,
          title: 'New Image Post',
          brief: errMsg,
          type: '🔴 General',
        });
      }
    } else {
      for (const file of files) {
        const { dataUrl, isVideo } = await readFileAsDataURL(file);
        if (!dataUrl) continue;

        const newPostId = uuidv4();
        const defaultOutlet = getDefaultPostOutlet();
        const placeholderPost: Post = {
          id: newPostId,
          date: dateStr,
          outlet: defaultOutlet,
          type: '✨ Generating...',
          title: isVideo ? 'Analyzing video...' : 'Analyzing image...',
          brief: 'Please wait while AI generates content...',
          caption: '',
          hashtags: '',
          images: [dataUrl],
          userId: user.uid,
          businessId: activeBusiness?.id,
        };

        await handleSavePost(placeholderPost);

        try {
          const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (!match) {
            throw new Error('Could not read image data for AI analysis.');
          }
          const mimeType = match[1];
          const base64Data = match[2];
          const { generatePostFromImage } = await getGemini();
          const generatedData = await generatePostFromImage(
            base64Data,
            mimeType,
            defaultOutlet,
            isVideo,
            activeBusiness || undefined
          );

          await handleSavePost({
            ...placeholderPost,
            title: generatedData.title || 'New Post',
            brief: generatedData.brief || '',
            caption: generatedData.caption || '',
            hashtags: generatedData.hashtags || '',
            type: generatedData.type || '🔴 General',
            outlet: generatedData.outlet || defaultOutlet,
          });
        } catch (error) {
          console.error('Failed to generate post from image:', error);
          const errMsg = error instanceof Error ? error.message : 'Failed to auto-generate content.';
          toast.error(errMsg);
          await handleSavePost({
            ...placeholderPost,
            title: 'New Post',
            brief: errMsg,
            type: '🔴 General',
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
      const { generatePostContent } = await getGemini();
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
      await createPost(newPost, newPost.businessId || activeBusiness?.id || '', profile?.id);
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
      await updateBusiness(activeBusiness.id, { shareToken: token } as Partial<Business>);
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

  const openDraftPostFromWidget = (partial: Partial<Post>) => {
    const draft: Post = {
      id: uuidv4(),
      date: format(new Date(), 'yyyy-MM-dd'),
      title: partial.title || 'Widget draft',
      brief: partial.brief || '',
      caption: partial.caption || '',
      hashtags: partial.hashtags || '',
      type: partial.type || '🔴 General',
      outlet: partial.outlet || activeBusiness?.name || 'All Outlets',
      status: 'draft',
      approvalStatus: 'draft',
      images: partial.images || [],
      isAiGenerated: true,
      createdAt: new Date().toISOString(),
    };
    setSelectedPost(draft);
    setSelectedDate(draft.date);
    setIsPostModalOpen(true);
  };

  const openDraftPostFromNotebookBlock = (block: {
    type: string;
    title?: string;
    content?: string;
    postcardData?: { frontText: string; backText: string; imageUrl: string };
  }) => {
    let title = block.title || 'New Post from Notebook';
    if (block.type === 'postcard' && block.postcardData) {
      title = block.postcardData.frontText;
    }
    openDraftPostFromWidget({
      title,
      brief: block.content || '',
      caption: block.postcardData?.backText || block.content || '',
      hashtags: activeBusiness?.industry ? `#${activeBusiness.industry.replace(/\s+/g, '')}` : '',
      type: block.type === 'postcard' ? '🎨 Postcard' : '📝 Note',
      outlet: activeBusiness?.name || 'Forge Enterprises',
      images: block.postcardData?.imageUrl ? [block.postcardData.imageUrl] : [],
    });
    setActiveTab('schedule');
    toast.success('Idea added to calendar — pick a date and finish the post.');
  };

  const handleAutoFillSubmit = async (prompt: string, count: number) => {
    if (!activeBusiness) {
      toast.error("Please select a workspace first.");
      return;
    }
    
    setIsAutoFilling(true);
    const loadingToast = toast.loading(`AI is brainstorming ${count} posts for the month... This might take a minute or two.`);
    
    try {
      // First generate the ideas
      addSyncLog(`Requesting ${count} posts from AI for campaign: ${prompt}`, 'info');
      // Re-use smart post generation logic or similar
      const promptText = `Generate ${count} different social media posts based on this campaign prompt: "${prompt}". Make sure they are varied (promotional, educational, engaging). 
      Return them as JSON array of objects with keys: title, brief, type (e.g. 🔴 Promotional, 🟢 Educational).`;
      
      const { generateAppJson } = await getGemini();
      const generatedPostsRaw = await generateAppJson(
        `${promptText}\n\nYou are a social media manager for ${activeBusiness.name}. Follow their brand voice if provided.`,
        { expectArray: true }
      );
      const generatedPosts: any[] = Array.isArray(generatedPostsRaw)
        ? generatedPostsRaw
        : generatedPostsRaw?.posts && Array.isArray(generatedPostsRaw.posts)
          ? generatedPostsRaw.posts
          : [];
      
      if (generatedPosts.length > 0) {
        const currentDate = new Date(); // start today
        
        for (let i = 0; i < Math.min(generatedPosts.length, count); i++) {
          const gp = generatedPosts[i];
          const newPost: Post = {
            id: uuidv4(),
            date: format(currentDate, 'yyyy-MM-dd'),
            title: gp.title || `Post ${i+1}`,
            brief: gp.brief || "",
            caption: "",
            hashtags: "",
            type: gp.type || "🔴 General",
            outlet: activeBusiness.name,
            status: 'draft',
            approvalStatus: 'draft',
            images: [],
            isAiGenerated: true,
            createdAt: new Date().toISOString()
          };
          
          await createPost(newPost, newPost.businessId || activeBusiness?.id || '', profile?.id);
          
          // Increment date for the next post
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        toast.dismiss(loadingToast);
        toast.success(`Successfully auto-filled ${Math.min(generatedPosts.length, count)} posts!`);
        setIsAutoFillModalOpen(false);
      } else {
        toast.dismiss(loadingToast);
        toast.error("AI returned an empty list of posts.");
      }
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Failed to auto-fill month.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleGenerateWithAi = async (date?: string) => {
    if (!activeBusiness) {
      toast.error("Please select a workspace first.");
      return;
    }

    const targetDate = date || format(currentMonth, 'yyyy-MM-dd');
    const loadingToast = toast.loading("AI is brainstorming a post for you...");

    try {
      const { generateBulkPosts } = await getGemini();
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

        await createPost(newPost, newPost.businessId || activeBusiness?.id || '', profile?.id);
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
      const { generateMockupImage } = await getGemini();
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
    const { startMonth, endMonth, visibleFields, layoutStyle, accentColor } = settings;

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
            if (!ctx) { resolve(null); return; }
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, extension: 'jpeg', width: img.width, height: img.height });
          };
          img.onerror = () => { resolve(null); };
          img.src = fetchUrl;
        });
      } catch (e) {
        return null;
      }
    };

    try {
      toast.loading("Analyzing workspace data for export...", { id: 'excel-export' });

      let titles = { type: 'FORMAT', platforms: 'PLATFORM', campaign: 'CAMPAIGN', outlet: 'OUTLET' };
      if (activeBusiness?.id) {
        const catDoc = await getCategoriesDoc(activeBusiness.id);
        if (catDoc?.titles) {
          titles = { ...titles, ...(catDoc.titles as typeof titles) };
        }
      }

      const response = await fetch('/templates/content_calendar_template.xlsx');
      if (!response.ok) throw new Error("Template fetch failed.");
      const templateBuffer = await response.arrayBuffer();

      const workbook = new Workbook();
      await workbook.xlsx.load(templateBuffer);

      const intervalMonths = eachDayOfInterval({
        start: startOfMonth(startMonth),
        end: endOfMonth(endMonth)
      }).filter(d => d.getDate() === 1);

      const requestedMonthKeys = intervalMonths.map(m => format(m, 'yyyy-MM'));
      const requestedMonthLabelsOriginal = intervalMonths.map(m => format(m, 'MMM yyyy'));
      const requestedMonthLabelsLower = requestedMonthLabelsOriginal.map(l => l.toLowerCase().trim());

      const postsByMonth: { [key: string]: Post[] } = {};
      posts.forEach(post => {
        if (!post.date) return;
        const key = format(parseISO(post.date), 'yyyy-MM');
        if (requestedMonthKeys.includes(key)) {
          if (!postsByMonth[key]) postsByMonth[key] = [];
          postsByMonth[key].push(post);
        }
      });

      const themeColors = {
        darkBg: 'FF1A1C1E',
        darkText: 'FFEBE9ED',
        accent: (accentColor || '#2383e2').replace('#', 'FF').toUpperCase()
      };

      // 1. Purge non-requested months
      const allSheetNames = workbook.worksheets.map(s => s.name);
      for (const name of allSheetNames) {
        if (!requestedMonthLabelsLower.includes(name.toLowerCase().trim())) {
          workbook.removeWorksheet(name);
        }
      }

      if (workbook.worksheets.length === 0) {
        throw new Error(`The requested months (${requestedMonthLabelsOriginal.join(', ')}) are not available.`);
      }

      for (const monthDate of intervalMonths) {
        const monthKey = format(monthDate, 'yyyy-MM');
        const searchLabel = format(monthDate, 'MMM yyyy').toLowerCase().trim();

        const sheet = workbook.worksheets.find(s => s.name.toLowerCase().trim() === searchLabel);
        if (!sheet) continue;

        // Banner Branding
        if (monthKey === requestedMonthKeys[0]) {
          workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: sheet.id as any, visibility: 'visible' }];
        }

        const bannerCell = sheet.getCell('A1');
        bannerCell.value = `${format(monthDate, 'MMMM yyyy').toUpperCase()}   ·   ${activeBusiness?.name?.toUpperCase() || 'FORGE'} — CONTENT CALENDAR`;
        bannerCell.style = {
          ...bannerCell.style,
          font: { ...bannerCell.font, color: { argb: 'FFFFFFFF' }, bold: true, size: 14, italic: false },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColors.accent } },
          alignment: { vertical: 'middle', horizontal: 'center' }
        };

        const monthPosts = postsByMonth[monthKey] || [];
        const monthStartDay = startOfMonth(monthDate).getDay();

        // 3. COMPLETE GRID RESET (Including Row 7 Image placeholders)
        for (let week = 0; week < 6; week++) {
          const rBase = 4 + week * 8;
          // Row A Labels - Force non-italic
          ['type', 'platforms', 'campaign', 'outlet'].forEach((key, i) => {
            const cell = sheet.getCell(rBase + i + 1, 1);
            cell.value = (titles as any)[key]?.toUpperCase();
            cell.font = { ...cell.font, italic: false, bold: true };
          });

          // Data Clearing (B-H) - Including Row 7 for placeholders
          for (let col = 2; col <= 8; col++) {
            for (let rowInWeek = 1; rowInWeek <= 7; rowInWeek++) {
              sheet.getCell(rBase + rowInWeek, col).value = "";
            }
          }
        }

        // 4. Data Extraction & Injection
        const imagePromises: Promise<any>[] = [];
        monthPosts.forEach(post => {
          const dateObj = parseISO(post.date);
          const col = 2 + dateObj.getDay();
          const weekIndex = Math.floor((dateObj.getDate() + monthStartDay - 1) / 7);
          const rBase = 4 + weekIndex * 8;
          if (rBase > 50) return;

          const injectCell = (offset: number, val: string) => {
            const cell = sheet.getCell(rBase + offset, col);
            cell.value = `  ${val || ''}`;
            cell.font = { ...cell.font, italic: false, size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          };

          sheet.getCell(rBase, col).value = `  ${format(dateObj, 'EEE').toUpperCase()}  ${format(dateObj, 'dd')}`;
          injectCell(1, post.type || '');
          injectCell(2, Array.isArray(post.platforms) ? post.platforms.join(' + ') : (post.platforms || ''));
          injectCell(3, post.campaignType || '');
          injectCell(4, post.outlet || '');
          injectCell(5, post.title || '');

          const captionCell = sheet.getCell(rBase + 6, col);
          captionCell.value = `  ✍️ ${post.caption || ''}`;
          captionCell.font = { ...captionCell.font, italic: false, size: 8 };
          captionCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

          if (post.images?.length && visibleFields.includes('images')) {
            const embed = async () => {
              const imgData = await fetchImageAsBase64(post.images![0]);
              if (imgData) {
                const id = workbook.addImage({ base64: imgData.base64, extension: imgData.extension as any });
                sheet.addImage(id, {
                  tl: { col: col - 1.02, row: rBase + 7 - 0.98 },
                  ext: { width: 135, height: 155 },
                  editAs: 'oneCell'
                });
              }
            };
            imagePromises.push(embed());
          }
        });

        // 5. Theme Overlay - Strip Italic
        if (layoutStyle === 'Dark') {
          sheet.eachRow((row) => {
            if (row.number > 1) {
              row.eachCell((cell) => {
                cell.style = {
                  ...cell.style,
                  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColors.darkBg } },
                  font: { ...cell.font, color: { argb: themeColors.darkText }, italic: false }
                };
              });
            }
          });
        }

        if (activeBusiness?.logoUrl) {
          imagePromises.push((async () => {
            const logo = await fetchImageAsBase64(activeBusiness.logoUrl!);
            if (logo) {
              const id = workbook.addImage({ base64: logo.base64, extension: logo.extension as any });
              sheet.addImage(id, { tl: { col: 0.1, row: 0.1 }, ext: { width: 85, height: 85 } });
            }
          })());
        }

        await Promise.allSettled(imagePromises);
      }

      toast.loading("Packaging finalized workbook...", { id: 'excel-export' });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Forge_Export_${activeBusiness?.name?.replace(/\s+/g, '_') || 'Calendar'}.xlsx`);

      setIsExportModalOpen(false);
      toast.success("Branded export complete!", { id: 'excel-export' });
    } catch (e) {
      console.error(e);
      toast.error(`Export error: ${e instanceof Error ? e.message : 'Unknown error'}`, { id: 'excel-export' });
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
          const { getExcelMappingWithAi } = await getGemini();
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
                    const dataUrl = trimmed.startsWith('data:') ? trimmed : `data:image/jpeg;base64,${trimmed}`;
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
            for (const post of processedPosts) {
              await createPost(post, post.businessId || activeBusiness?.id || '', profile?.id);
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
              const { importPostsViaApi } = await import('./lib/dataAccessApi');
              const result = await importPostsViaApi(
                processedPosts,
                activeBusiness?.id || processedPosts[0]?.businessId || '',
                profile?.id
              );
              addSyncLog(`Successfully imported and synced ${result.imported} posts`, 'success');
              toast.success('Schedule imported and synced successfully!');
              void getPosts(activeBusiness?.id || '').then(setPosts).catch(() => undefined);
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

  if ((loading || (user && profileLoading) || (user && profile && loadingBusinesses)) && !authTimeout) {
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
    return <LandingView />;
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
            void syncCatalogueProducts(activeBusiness.id, data.products).catch((e) =>
              console.error('Failed to sync products to Supabase', e)
            );
          }
        }
        if (data.categoryCounts && Array.isArray(data.categoryCounts)) {
          localStorage.setItem(`rainbowCategoryCounts_${activeBusiness?.id || 'default'}`, JSON.stringify(data.categoryCounts));

          if (user && activeBusiness?.id) {
            void saveCategoryCounts(activeBusiness.id, data.categoryCounts).catch((e) =>
              console.error('Failed to sync category counts', e)
            );
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

  const handleOnboardingComplete = async (
    data: Partial<Business> & {
      targetUrl?: string;
      theme?: string;
      geminiApiKey?: string;
      outletNames?: string;
    }
  ) => {
    if (!user || !profile) return;
    try {
      const { completeOnboardingSetupViaApi } = await import('./lib/profileApi');
      const newBiz = await completeOnboardingSetupViaApi({
        name: data.name || 'My Business',
        industry: data.industry || 'Retail',
        description: data.description || '',
        targetUrl: data.targetUrl,
        brandColors: (data as { brandColors?: { primary?: string; secondary?: string; accent?: string } })
          .brandColors,
        outletNames: data.outletNames,
        geminiApiKey: data.geminiApiKey,
        aiSettings:
          data.targetUrl || data.geminiApiKey
            ? {
                ...aiSettings,
                targetUrl: data.targetUrl || aiSettings.targetUrl,
                geminiApiKey: data.geminiApiKey || aiSettings.geminiApiKey,
              }
            : undefined,
      });

      if (data.targetUrl || data.geminiApiKey) {
        const newSettings = {
          ...aiSettings,
          targetUrl: data.targetUrl || aiSettings.targetUrl,
          geminiApiKey: data.geminiApiKey || aiSettings.geminiApiKey,
        };
        setAiSettingsState(newSettings);
        setAiSettings(newSettings);
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

      setUserOnboardingComplete(true);
      setActiveBusiness(newBiz);
      setBusinesses([...businesses, newBiz]);
      setShowOnboarding(false);

      void import('./lib/localAiBootstrap').then(({ ensureLocalAiEnginesReady }) =>
        ensureLocalAiEnginesReady()
          .then(() => toast.success('Workspace ready — local AI models loaded.'))
          .catch(() => toast.success('Workspace created — open Settings to finish loading local AI.'))
      );

      toast.success('Welcome to Forge!');
    } catch (error) {
      console.error("Failed to complete onboarding", error);
      toast.error("Failed to create workspace.");
    }
  };


  return (
    <ErrorBoundary>
      <SkipLink />
      {showOnboarding && user && (
        <React.Suspense fallback={null}>
          <OnboardingWizard
            userEmail={user.email || ''}
            onComplete={handleOnboardingComplete}
          />
        </React.Suspense>
      )}
      <AppWorkspaceProvider activeBusiness={activeBusiness}>
        <ConfigWorkspaceProvider activeBusiness={activeBusiness}>
          <NetworkStatus />
          {profileSyncError && user && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-sm text-amber-900 dark:text-amber-100 flex flex-wrap items-center justify-between gap-2 z-50 relative">
              <span>
                Cloud sync failed. Workspace data loads through the server API — if tabs stay empty, confirm{' '}
                <code className="text-xs bg-black/10 px-1 rounded">SUPABASE_SERVICE_KEY</code> is set on Cloudflare.
              </span>
              <button
                type="button"
                onClick={() => void refreshProfile()}
                className="shrink-0 px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600"
              >
                Retry sync
              </button>
            </div>
          )}
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
                  disabled: isIdeasTabActive || activeTab === 'brandkit' || activeTab === 'analytics',
                  onClick: () => openNewPostModal()
                },
                { label: 'Refresh Data', icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => window.location.reload() },
                {
                  label: 'Export to Excel',
                  icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
                  disabled: isIdeasTabActive || activeTab === 'brandkit',
                  onClick: () => setIsExportModalOpen(true)
                },
                { label: 'Manage Workspaces', icon: <Settings className="w-3.5 h-3.5" />, onClick: () => setIsBusinessModalOpen(true) },
                { label: 'Import / Account', icon: <Database className="w-3.5 h-3.5" />, onClick: () => navigate('/auth') },
                { label: 'Sign Out', icon: <LogOut className="w-3.5 h-3.5" />, variant: 'danger', onClick: () => signOut(auth) },
              ]}>
                <div className="flex flex-1 w-full relative">
                  {/* Sidebar (Desktop Only) — Notion Minimal Rail */}
                  <aside className="forge-sidebar-rail hidden md:flex sticky top-0 h-screen w-16 bg-[#FBFAF8] dark:bg-[#191919] border-r border-[#E9E9E7] dark:border-[#2E2E2E] flex-col shrink-0 z-50 items-center py-4 justify-between print:hidden overflow-y-auto no-scrollbar transition-all duration-300">
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
                              className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-xs transition-colors border-2 shrink-0 bg-brand text-white border-brand-hover interactive focus-ring"
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
                              <div className="fixed top-16 left-16 ml-2 w-56 bg-white dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] shadow-lg z-[101] py-2 overflow-hidden flex flex-col max-h-[60vh]">
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
                          data-label="Home"
                          className={cn(
                            "interactive focus-ring w-full flex items-center justify-center p-2.5 rounded-[12px]",
                            activeTab === 'home' ? "nav-pill-active" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                          )}
                        >
                          <LayoutGrid className="w-5 h-5 shrink-0" />
                        </button>
                        <DroppableTab
                          id="calendar-tab-droppable"
                          onClick={() => setActiveTab('schedule')}
                          title={industryConfig.terminology.calendar}
                          data-label={industryConfig.terminology.calendar}
                          className={cn(
                            "interactive focus-ring w-full flex items-center justify-center p-2.5 rounded-[12px]",
                            activeTab === 'schedule' ? "nav-pill-active" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                          )}
                        >
                          <CalendarIcon className="w-5 h-5 shrink-0" />
                        </DroppableTab>
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => setActiveTab('search')}
                              title={industryConfig.terminology.products}
                              data-label="Products"
                              className={cn(
                                "interactive focus-ring w-full flex items-center justify-center p-2.5 rounded-[12px]",
                                activeTab === 'search' ? "nav-pill-active" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                              )}
                            >
                              <Database className="w-5 h-5 shrink-0" />
                            </button>
                            <button
                              onClick={() => setActiveTab('ideas')}
                              title="Ideas"
                              data-label="Ideas"
                              className={cn(
                                "interactive focus-ring w-full flex items-center justify-center p-2.5 rounded-[12px]",
                                isIdeasTabActive ? "nav-pill-active" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                              )}
                            >
                              <Lightbulb className="w-5 h-5 shrink-0" />
                            </button>
                            <button
                              onClick={() => setActiveTab('brandkit')}
                              title={industryConfig.terminology.assets}
                              data-label="Assets"
                              className={cn(
                                "interactive focus-ring w-full flex items-center justify-center p-2.5 rounded-[12px]",
                                activeTab === 'brandkit' ? "nav-pill-active" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                              )}
                            >
                              <Palette className="w-5 h-5 shrink-0" />
                            </button>
                            <button
                              onClick={() => setActiveTab('widgets')}
                              title="Widgets"
                              data-label="Widgets"
                              className={cn(
                                "interactive focus-ring w-full flex items-center justify-center p-2.5 rounded-[12px]",
                                isWidgetsTabActive ? "nav-pill-active" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                              )}
                            >
                              <Boxes className="w-5 h-5 shrink-0" />
                            </button>
                            <button
                              onClick={() => setActiveTab('analytics')}
                              title="Insights & Analytics"
                              data-label="Analytics"
                              className={cn(
                                "interactive focus-ring w-full flex items-center justify-center p-2.5 rounded-[12px]",
                                activeTab === 'analytics' ? "nav-pill-active" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                              )}
                            >
                              <BarChart3 className="w-5 h-5 shrink-0" />
                            </button>
                            {activeBusiness?.applets?.map(applet => (
                              <button
                                key={applet.id}
                                onClick={() => setActiveTab(`applet_${applet.id}` as any)}
                                title={applet.name}
                                className={cn(
                                  "w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors relative group",
                                  activeTab === `applet_${applet.id}` ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-indigo-600 dark:text-indigo-400" : "hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 text-[#757681] dark:text-[#9B9A97]"
                                )}
                              >
                                <Box className="w-5 h-5 shrink-0" />
                                <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                  {applet.name}
                                </div>
                              </button>
                            ))}
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
                              title="Request Access to Ideas"
                              className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                            >
                              <Lightbulb className="w-5 h-5 shrink-0" />
                              <Lock className="w-3 h-3 absolute bottom-1.5 right-1.5 text-brand" />
                            </button>
                            <button
                              onClick={handleRequestAccess}
                              title="Request Access to Brand & AI Guide"
                              className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                            >
                              <Palette className="w-5 h-5 shrink-0" />
                              <Lock className="w-3 h-3 absolute bottom-1.5 right-1.5 text-brand" />
                            </button>
                            <button
                              onClick={handleRequestAccess}
                              title="Request Access to Widgets"
                              className="w-full flex items-center justify-center p-2.5 rounded-[12px] transition-colors text-[#757681]/40 dark:text-[#9B9A97]/40 hover:bg-[#EFEFED]/50 dark:hover:bg-[#2E2E2E]/50 relative group"
                            >
                              <Boxes className="w-5 h-5 shrink-0" />
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
                            onClick={() => navigate('/auth')}
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
                      <LocalAiTabLoader className="mb-1" />

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
                          <CorsImage
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`}
                            alt="User"
                            fallbackProxy
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
                    <main
                      id="main-content"
                      className={cn(
                      "flex-1 flex flex-col px-4 md:px-8 pt-6 md:pt-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-28 print:p-0 print:overflow-visible",
                      (activeTab === 'chat' || activeTab === 'home' || usesTabPageLayout) &&
                        'p-0 sm:p-0 md:p-0 pb-0',
                      activeTab !== 'search' && "no-scrollbar"
                    )}>
                      <div className={cn("w-full flex-1 flex flex-col print:max-w-none print:h-auto print:block", (activeTab === 'chat' || activeTab === 'home') && "max-w-none h-full")}>
                        {/* Page Title */}
                        <div
                          className={cn(
                            'mb-2 md:mb-4 flex items-center justify-between shrink-0 print:hidden px-2 md:px-0',
                            (activeTab === 'chat' || activeTab === 'home' || usesTabPageLayout) && 'hidden',
                            'md:hidden'
                          )}
                        >
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
                                {isWidgetsTabActive && 'Widgets'}
                                {activeTab === 'analytics' && 'Insights & Analytics'}
                                {isIdeasTabActive && 'Ideas'}
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
                              isSyncing={isSyncing}
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
                              onGenerateWithAi={isAdmin ? () => setIsAutoFillModalOpen(true) : undefined}
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
                              isSyncing={isSyncing}
                              showCalendarImport={isAdmin}
                              onImportCalendar={importScheduleJson}
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
                          <LazyTab active={activeTab === 'brandkit'}>
                            {() => (
                              <BrandKitTab
                                activeBusiness={activeBusiness}
                                posts={posts}
                                aiSettings={aiSettings}
                                onAiSettingsChange={handleAiSettingChange}
                              />
                            )}
                          </LazyTab>
                        )}

                        {isAdmin && (
                          <LazyTab active={isWidgetsTabActive}>
                            {() => (
                              <WidgetsTab
                                userId={user?.uid}
                                activeBusiness={activeBusiness}
                                onSavePost={handleSavePost}
                                onDraftPost={openDraftPostFromWidget}
                              />
                            )}
                          </LazyTab>
                        )}

                        {isAdmin && (
                          <LazyTab active={activeTab === 'analytics'}>
                            {() => (
                              <AnalyticsTab
                                posts={posts}
                                activeBusiness={activeBusiness}
                                setActiveTab={setActiveTab}
                              />
                            )}
                          </LazyTab>
                        )}


                        {isAdmin && (
                          <LazyTab active={isIdeasTabActive}>
                            {() => (
                              <IdeasTab
                                activeBusiness={activeBusiness}
                                onAddToCalendar={openDraftPostFromNotebookBlock}
                              />
                            )}
                          </LazyTab>
                        )}

                        {isAdmin && (
                          <LazyTab active={activeTab === 'workspace_management'}>
                            {() => (
                              <WorkspaceManagementTab
                                activeBusiness={activeBusiness}
                                onUpdateBusiness={setActiveBusiness}
                                setActiveTab={setActiveTab}
                              />
                            )}
                          </LazyTab>
                        )}

                        {isAdmin && (
                          <LazyTab active={activeTab === 'more'} className={cn("flex-1 pb-32 md:pb-12", activeTab === 'more' ? 'block' : 'hidden')}>
                            {() => (
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
                              finetuneStatus={finetuneStatus}
                              handleStartFinetune={handleStartFinetune}
                              showFinetunePanel={showFinetunePanel}
                              setShowFinetunePanel={setShowFinetunePanel}
                              googleTokens={googleTokens}
                              handleDisconnectGoogleDrive={handleDisconnectGoogleDrive}
                              handleConnectGoogleDrive={handleConnectGoogleDrive}
                              setConfirmAction={setConfirmAction}
                              syncLogs={syncLogs}
                              signOut={signOut}
                              auth={auth}
                              setPosts={setPosts}
                              industryConfig={industryConfig}
                              setActiveTab={setActiveTab}
                            />
                            )}
                          </LazyTab>
                        )}
                        {isAdmin && activeBusiness?.applets?.map(applet => (
                          <div key={applet.id} className={cn("flex-1 h-[calc(100vh-120px)]", activeTab === `applet_${applet.id}` ? 'block' : 'hidden')}>
                            <div className="w-full h-full bg-white dark:bg-[#111111] rounded-xl overflow-hidden shadow-sm border border-[#E9E9E7] dark:border-[#2E2E2E] flex flex-col">
                              <div className="flex items-center justify-between p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
                                <h2 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2 relative z-10">
                                  <Box className="w-4 h-4 text-indigo-500" />
                                  {applet.name}
                                </h2>
                                <button
                                  onClick={async () => {
                                    if(confirm(`Delete the applet ${applet.name}?`)) {
                                      await updateBusiness(activeBusiness.id, {
                                        applets: activeBusiness.applets?.filter((a) => a.id !== applet.id),
                                      } as Partial<Business>);
                                      if(activeTab === `applet_${applet.id}`) setActiveTab('home');
                                    }
                                  }}
                                  className="text-[#757681] hover:text-red-500 transition-colors pointer-events-auto relative z-10 p-2"
                                  title="Delete Applet"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <iframe
                                title={applet.name}
                                className="w-full flex-1 border-none bg-white"
                                sandbox="allow-scripts allow-forms allow-popups allow-modals"
                                 srcDoc={
                                   applet.code.includes('<head>')
                                     ? applet.code.replace('<head>', `<head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><script>window.FORGE_CONTEXT = ${JSON.stringify(activeBusiness || {})};</script>`)
                                     : `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><script>window.FORGE_CONTEXT = ${JSON.stringify(activeBusiness || {})};</script></head><body>${applet.code.replace(/```[a-z]*|```/g, '')}</body></html>`
                                 }
                              />
                            </div>
                          </div>
                        ))}
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
                            <CorsImage src={activeDragItem.imageUrl} alt="" fallbackProxy className="w-full h-full object-cover" />
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
                    <React.Suspense fallback={null}>
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
                    </React.Suspense>
                  )}
                </div>
              </ContextMenu>

              {/* Mobile Bottom Navigation */}
              <div className={cn(
                "md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-[#E9E9E7] dark:border-[#2E2E2E] min-h-[72px] pb-[env(safe-area-inset-bottom)] flex items-center px-2"
              )}>
                {isAdmin ? (
                  <nav className="flex-1 flex flex-row justify-between w-full h-[72px] items-stretch" aria-label="Primary mobile navigation">
                    {[
                      { id: 'schedule', icon: CalendarIcon, title: 'Calendar' },
                      { id: 'chat', icon: MessageSquare, title: 'Chat' },
                      { id: 'ideas', icon: Lightbulb, title: 'Ideas' },
                      { id: 'more', icon: Menu, title: 'More' }
                    ].map(tab => {
                      const Icon = tab.icon;
                      const isSubTabActive = tab.id === 'more' && (['search', 'workspace_management', 'brandkit', 'widgets', 'creative', 'analytics', 'more'].includes(activeTab) || activeTab.startsWith('applet_'));
                      const isActive = activeTab === tab.id || isSubTabActive;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            "interactive focus-ring flex flex-col items-center justify-center gap-1 relative flex-1 h-full rounded-[14px]",
                            isActive ? "text-brand bg-brand-bg" : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                          )}
                          title={tab.title}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] font-bold leading-none tracking-tight">{tab.title}</span>
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
                  <div className="flex-1 flex flex-row justify-between w-full h-[72px] items-center px-4">
                    <button
                      onClick={() => setActiveTab('schedule')}
                      aria-current={activeTab === 'schedule' ? 'page' : undefined}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative h-full px-4 rounded-[14px]",
                        activeTab === 'schedule' ? "text-brand bg-brand-bg" : "text-[#757681] dark:text-[#9B9A97]"
                      )}
                    >
                      <CalendarIcon className="w-5 h-5" />
                      <span className="text-[10px] font-bold leading-none">Calendar</span>
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
                        onClick={() => navigate('/auth')}
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-[12px] font-medium text-sm active:scale-95 transition-transform"
                      >
                        <Smartphone className="w-4 h-4" />
                        {isSigningIn ? '...' : 'Sign In'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Desktop Dock Navigation (for dock sidebar style) */}
              <div className="forge-dock-nav hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 glass-panel rounded-2xl shadow-xl shadow-black/10 border border-white/20 dark:border-[#2E2E2E]/50">
                <nav className="flex items-center gap-1">
                  {[
                    { id: 'home', icon: LayoutGrid, title: 'Home', color: 'bg-rose-500' },
                    { id: 'schedule', icon: CalendarIcon, title: industryConfig.terminology.calendar, color: 'bg-amber-500' },
                    { id: 'search', icon: Database, title: industryConfig.terminology.products, color: 'bg-emerald-500' },
                    { id: 'ideas', icon: Lightbulb, title: 'Ideas', color: 'bg-sky-500' },
                    { id: 'brandkit', icon: Palette, title: 'Assets', color: 'bg-violet-500' },
                    { id: 'widgets', icon: Boxes, title: 'Widgets', color: 'bg-fuchsia-500' },
                    { id: 'analytics', icon: BarChart3, title: 'Analytics', color: 'bg-brand' },
                    { id: 'more', icon: Settings, title: 'Settings', color: 'bg-[#6074b9]' },
                  ].map((tab, idx) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id ||
                      (tab.id === 'ideas' && isIdeasTabActive) ||
                      (tab.id === 'widgets' && isWidgetsTabActive) ||
                      (tab.id === 'analytics' && activeTab === 'analytics');
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group",
                          isActive
                            ? `${tab.color} text-white shadow-lg scale-110`
                            : "hover:bg-[#F7F7F5] dark:hover:bg-[#202020] text-[#757681]"
                        )}
                        title={tab.title}
                      >
                        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                        {isActive && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-current shadow-lg" />
                        )}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#37352F] text-white text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {tab.title}
                        </div>
                      </button>
                    );
                  })}
                </nav>
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



              <LazyModal isOpen={isPostModalOpen}>
                {() => (
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
                )}
              </LazyModal>

              <LazyModal isOpen={isDirectSearchOpen}>
                {() => (
                  <DirectSearch
                    isOpen={isDirectSearchOpen}
                    onClose={() => setIsDirectSearchOpen(false)}
                  />
                )}
              </LazyModal>

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

              <LazyModal isOpen={isImageViewerOpen}>
                {() => (
                  <ImageViewer
                    isOpen={isImageViewerOpen}
                    images={currentImages}
                    initialIndex={currentImageIndex}
                    aiProvider={currentAiProvider}
                    onClose={() => setIsImageViewerOpen(false)}
                  />
                )}
              </LazyModal>

              <LazyModal isOpen={isExportModalOpen}>
                {() => (
                  <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onExport={exportToExcel}
                  />
                )}
              </LazyModal>

              <LazyModal isOpen={isAutoFillModalOpen}>
                {() => (
                  <AutoFillModal
                    isOpen={isAutoFillModalOpen}
                    onClose={() => setIsAutoFillModalOpen(false)}
                    onGenerate={handleAutoFillSubmit}
                    isLoading={isAutoFilling}
                  />
                )}
              </LazyModal>

              <LazyModal isOpen={isExcelImportModalOpen}>
                {() => (
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
                )}
              </LazyModal>

              <LazyModal isOpen={isBusinessModalOpen}>
                {() => (
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
                )}
              </LazyModal>
            </div>
          </DndContext>
        </ConfigWorkspaceProvider>
      </AppWorkspaceProvider>
    </ErrorBoundary>
  );
}
