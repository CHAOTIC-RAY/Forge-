import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { addMonths, subMonths } from 'date-fns';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Post, Business } from '../data';
import { Calendar } from './Calendar';
import { PostModal } from './modals/PostModal';
import { ImageViewer } from './ImageViewer';
import { ForgeLogo } from './ForgeLogo';
import { ForgeLoader } from './ForgeLoader';
import { ChaoticStudioCredits } from './ChaoticStudioCredits';
import { Plus, Layout, Lock, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { applyShareFilters, isShareExpired } from '../lib/shareUtils';
import {
  getBusinessByIdAndShareToken,
  subscribeToPosts,
  addBusinessMember,
  getProfile,
  updateBusiness,
} from '../lib/supabase';

type AccessState = 'loading' | 'password' | 'error' | 'ready';

export function PublicCalendarView() {
  const { businessId, shareToken } = useParams<{ businessId: string; shareToken: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [accessState, setAccessState] = useState<AccessState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user] = useAuthState(auth);
  const [isAdding, setIsAdding] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [pendingBusiness, setPendingBusiness] = useState<Business | null>(null);
  const [analyticsRecorded, setAnalyticsRecorded] = useState(false);

  const isMember = user && business?.members?.includes(user.uid);

  const recordShareView = useCallback(
    async (biz: Business) => {
      if (analyticsRecorded || !businessId) return;
      try {
        await updateBusiness(businessId, {
          shareAnalytics: {
            views: (biz.shareAnalytics?.views || 0) + 1,
            lastViewedAt: new Date().toISOString(),
          },
        });
        setAnalyticsRecorded(true);
      } catch (e) {
        console.error('[PublicView] Failed to record share analytics', e);
      }
    },
    [analyticsRecorded, businessId]
  );

  const handleAddWorkspace = async () => {
    if (!user || !businessId || isAdding) return;
    setIsAdding(true);
    try {
      const profile = await getProfile(user.uid);
      if (!profile) throw new Error('Profile not found');
      await addBusinessMember(businessId, profile.id, 'viewer');
      toast.success('Workspace added to your list! You now have viewer access.');
      setBusiness((prev) =>
        prev
          ? ({
              ...prev,
              members: [...(prev.members || []), user.uid],
              memberRoles: { ...(prev.memberRoles || {}), [user.uid]: 'viewer' },
            } as Business)
          : null
      );
    } catch (e) {
      console.error('Error adding workspace:', e);
      toast.error('Failed to add workspace. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleEditPost = (post: Post) => {
    setSelectedPost(post);
    setSelectedDate(post.date);
    setIsPostModalOpen(true);
  };

  const handleImageClick = (url: string) => {
    setEnlargedImage(url);
  };

  const handlePasswordSubmit = () => {
    if (!pendingBusiness) return;
    if (sharePassword !== pendingBusiness.sharePassword) {
      toast.error('Incorrect password.');
      return;
    }
    setBusiness(pendingBusiness);
    setPendingBusiness(null);
    setSharePassword('');
    setAccessState('ready');
    void recordShareView(pendingBusiness);
  };

  useEffect(() => {
    if (!businessId || !shareToken) return;

    const validateShare = async () => {
      try {
        const biz = await getBusinessByIdAndShareToken(businessId, shareToken);
        if (!biz) {
          setError('Invalid or expired share link.');
          setAccessState('error');
          return;
        }

        if (isShareExpired(biz.shareExpiresAt)) {
          setError('This share link has expired.');
          setAccessState('error');
          return;
        }

        if (biz.shareRestriction === 'authenticated' && !user) {
          setError('You must be logged in to view this calendar.');
          setAccessState('error');
          return;
        }

        if (biz.sharePassword) {
          setPendingBusiness(biz);
          setAccessState('password');
          return;
        }

        setBusiness(biz);
        setAccessState('ready');
        void recordShareView(biz);
      } catch (e) {
        console.error('[PublicView] Error validating share link:', e);
        setError('Failed to load shared calendar.');
        setAccessState('error');
      }
    };

    void validateShare();
  }, [businessId, shareToken, user, recordShareView]);

  useEffect(() => {
    if (accessState !== 'ready' || !businessId || !business) return;

    const unsubscribe = subscribeToPosts(businessId, (postsList) => {
      setPosts(applyShareFilters(postsList, business.shareFilters));
    });

    return () => unsubscribe();
  }, [accessState, businessId, business]);

  if (accessState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F7F7F5] dark:bg-[#151515] text-[#37352F] dark:text-[#EBE9ED] gap-6">
        <ForgeLoader size={60} />
        <div className="flex flex-col items-center gap-2">
          <p className="text-secondary-safe font-medium animate-pulse">Syncing shared calendar…</p>
          <p className="text-[10px] font-bold text-secondary-safe/60 uppercase tracking-widest">Forge secure share</p>
        </div>
      </div>
    );
  }

  if (accessState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F7F5] dark:bg-[#151515] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
          <ForgeLogo size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Access denied</h2>
        <p className="text-secondary-safe max-w-sm mb-8">{error}</p>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/';
          }}
          className="interactive focus-ring px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition-colors"
        >
          Go to homepage
        </button>
        <div className="mt-12 pt-8 border-t border-[#E9E9E7] dark:border-[#2E2E2E] w-full max-w-md">
          <ChaoticStudioCredits />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] overflow-hidden font-sans selection:bg-brand selection:text-white">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-[#E9E9E7] dark:border-[#2E2E2E] glass-card flex items-center justify-between px-4 shrink-0 z-10 print:hidden rounded-none border-x-0 border-t-0">
          <div className="flex items-center gap-3 min-w-0">
            <ForgeLogo size={28} className="p-1 shrink-0" />
            <div className="h-4 w-px bg-[#E9E9E7] dark:bg-[#2E2E2E] shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold text-sm truncate">{business?.name}</h1>
              <p className="text-[10px] text-secondary-safe flex items-center gap-1">
                <Share2 className="w-3 h-3" /> Shared calendar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user && !isMember && (
              <button
                type="button"
                onClick={handleAddWorkspace}
                disabled={isAdding}
                className="interactive focus-ring flex items-center gap-2 px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {isAdding ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add workspace
              </button>
            )}
            {isMember && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="interactive focus-ring flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-lg text-xs font-bold text-brand hover:bg-brand/5 transition-colors"
              >
                <Layout className="w-3.5 h-3.5" />
                Open in app
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-2 ml-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium hidden sm:block">{user.displayName || user.email}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="interactive focus-ring px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-medium transition-colors"
              >
                Sign up
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto flex flex-col relative">
          <div className="flex-1 flex flex-col">
            {accessState === 'ready' && (
              <Calendar
                posts={posts}
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onEditPost={handleEditPost}
                onAddPost={() => {}}
                onImageClick={handleImageClick}
                isAdmin={false}
                isGuest={true}
              />
            )}
          </div>
          <footer className="shrink-0 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-white/80 dark:bg-[#191919]/80 backdrop-blur-sm px-4 py-6 print:hidden">
            <ChaoticStudioCredits className="mx-auto" />
          </footer>
        </main>
      </div>

      {accessState === 'password' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-8 rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] max-w-md w-full space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto text-brand">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold">Protected calendar</h2>
              <p className="text-sm text-secondary-safe">
                This calendar is password protected. Enter the password to continue.
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                className="focus-ring w-full p-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl outline-none text-center text-lg font-bold tracking-widest"
                autoFocus
              />
              <button
                type="button"
                onClick={handlePasswordSubmit}
                className="interactive focus-ring w-full py-3.5 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition-colors"
              >
                Access calendar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isPostModalOpen && (
        <PostModal
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
            setSelectedDate(null);
          }}
          post={selectedPost}
          selectedDate={selectedDate}
          readOnly={true}
          user={user}
          posts={posts}
        />
      )}

      {enlargedImage && (
        <ImageViewer isOpen={!!enlargedImage} images={[enlargedImage]} onClose={() => setEnlargedImage(null)} />
      )}
    </div>
  );
}
