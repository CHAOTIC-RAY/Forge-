import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { addMonths, subMonths } from 'date-fns';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Post, Business } from '../data';
import { Calendar } from './Calendar';
import { PostModal } from './modals/PostModal';
import { ImageViewer } from './ImageViewer';
import { ForgeLogo } from './ForgeLogo';
import { cn } from '../lib/utils';

export function PublicCalendarView() {
  const { businessId, shareToken } = useParams<{ businessId: string, shareToken: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user] = useAuthState(auth);

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

  useEffect(() => {
    if (!businessId || !shareToken) return;

    const fetchData = async () => {
      try {
        const bizDoc = await getDoc(doc(db, 'businesses', businessId));
        if (!bizDoc.exists() || bizDoc.data().shareToken !== shareToken) {
          setError("Invalid or expired share link.");
          setLoading(false);
          return;
        }
        
        const bizData = bizDoc.data();
        
        // Check restriction
        if (bizData.shareRestriction === 'authenticated' && !user) {
          setError("You must be logged in to view this calendar.");
          setLoading(false);
          return;
        }

        setBusiness({ id: bizDoc.id, ...bizData } as Business);

        const q = query(collection(db, 'posts'), where('businessId', '==', businessId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const postsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
          setPosts(postsList);
          setLoading(false);
        });
        return unsubscribe;
      } catch (e) {
        console.error("Error fetching shared calendar", e);
        setError("Failed to load shared calendar.");
        setLoading(false);
      }
    };
    fetchData();
  }, [businessId, shareToken, user]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED]">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen bg-[#F7F7F5] dark:bg-[#202020] text-red-500">{error}</div>;

  return (
    <div className="flex h-screen bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] overflow-hidden font-sans selection:bg-[#2383E2] selection:text-white">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] flex items-center justify-between px-4 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-4">
            <ForgeLogo size={28} className="p-1" />
            <div className="h-4 w-px bg-[#E9E9E7] dark:bg-[#2E2E2E]"></div>
            <h1 className="font-bold text-sm truncate">{business?.name} - Shared Calendar</h1>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#2383E2] text-white flex items-center justify-center text-xs font-bold">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium hidden sm:block">{user.displayName || user.email}</span>
              </div>
            ) : (
              <button 
                onClick={() => window.location.href = '/'}
                className="px-3 py-1.5 bg-[#2383E2] hover:bg-[#1D6EB8] text-white rounded-[6px] text-xs font-medium transition-colors"
              >
                Sign Up
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto flex flex-col relative">
          <div className="flex-1 flex flex-col">
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
          </div>
        </main>
      </div>

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
        <ImageViewer
          isOpen={!!enlargedImage}
          imageUrl={enlargedImage}
          onClose={() => setEnlargedImage(null)}
        />
      )}
    </div>
  );
}
