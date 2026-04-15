import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { Post, PRODUCT_CATEGORIES } from '../data';
import { cn } from '../lib/utils';
import { DraggableProduct } from './DraggableProduct';
import { HighStockProduct } from '../lib/gemini';
import { CalendarSharing } from './CalendarSharing';
import { ForgeLoader } from './ForgeLoader';
import { 
  Image as ImageIcon, RefreshCw, Wand2, LayoutList, Grid, 
  List as ListIcon, ChevronLeft, ChevronRight, Search, 
  X as CloseIcon, Plus, Calendar as CalendarIcon, Share2,
  Edit2, Trash2, Copy, ExternalLink
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  project?: string;
}

type ViewMode = 'grid' | 'timeline';

interface CalendarProps {
  currentDate: Date;
  posts: Post[];
  onEditPost: (post: Post) => void;
  onAddPost: (date?: string) => void;
  onDeletePost?: (postId: string) => void;
  onCopyPost?: (post: Post, date: string) => void;
  onImageClick: (images: string[] | string, index?: number, aiProvider?: string) => void;
  onRegeneratePost?: (post: Post) => void;
  onGenerateMockup?: (post: Post) => void;
  onUpdatePost?: (post: Post) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onFileDrop?: (date: string, files: File[]) => void;
  onGenerateWithAi?: (date?: string) => void;
  isAdmin?: boolean;
  isGuest?: boolean;
  activeBusiness?: any;
  onUpdateBusiness?: (business: any) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  calendarMode?: 'work' | 'personal';
  onCalendarModeChange?: (mode: 'work' | 'personal') => void;
}

export function Calendar({ currentDate, posts, onEditPost, onAddPost, onDeletePost, onCopyPost, onImageClick, onRegeneratePost, onGenerateMockup, onUpdatePost, onPrevMonth, onNextMonth, onFileDrop, onGenerateWithAi, isAdmin, isGuest, activeBusiness, onUpdateBusiness, isDarkMode, toggleDarkMode, calendarMode = 'work', onCalendarModeChange }: CalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; dateStr: string } | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'todos'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
      setTodos(todosData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'todos');
    });

    return () => unsubscribe();
  }, []);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // For timeline view, only show days with posts
  const daysWithPosts = days.filter(day => isSameMonth(day, monthStart) && posts.some(p => p.date === format(day, dateFormat)));

  return (
    <div className="flex-1 flex flex-col">
      {contextMenu && (
        <ContextMenu
          isOpen={true}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Add Post', icon: <Plus className="w-4 h-4" />, onClick: () => onAddPost(contextMenu.dateStr) },
          ]}
        />
      )}
      {!isGuest && (
        <div className="hidden md:block p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-bg rounded-[16px] flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                  Content Calendar
                </h2>
                <p className="text-sm text-[#757681] dark:text-[#9B9A97] mt-1">
                  Plan and schedule your social media content.
                </p>
              </div>
            </div>

            {isAdmin && !isGuest && (
              <div className="flex items-center bg-[#F7F7F5] dark:bg-[#202020] p-1 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                <button
                  onClick={() => onCalendarModeChange?.('work')}
                  className={cn(
                    "px-4 py-2 rounded-[8px] text-sm font-bold transition-all",
                    calendarMode === 'work' 
                      ? "bg-white dark:bg-[#2E2E2E] text-brand " 
                      : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                  )}
                >
                  Work
                </button>
                <button
                  onClick={() => onCalendarModeChange?.('personal')}
                  className={cn(
                    "px-4 py-2 rounded-[8px] text-sm font-bold transition-all",
                    calendarMode === 'personal' 
                      ? "bg-white dark:bg-[#2E2E2E] text-brand " 
                      : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
                  )}
                >
                  Personal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-[#191919] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] print:border-none print:h-auto print:block">
        <div className="flex-1 flex flex-col min-w-0">
        {/* Header & View Switcher */}
        <div className="flex items-center justify-between p-1 md:p-1.5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] shrink-0 print:border-none print:p-0 print:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden print:bg-transparent print:border-none">
            <button 
              onClick={onPrevMonth}
              aria-label="Previous Month"
              className="p-1 md:p-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#757681] transition-colors border-r border-[#E9E9E7] dark:border-[#2E2E2E] print:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="px-1.5 md:px-3 py-1 md:py-1.5 text-[11px] md:text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] min-w-[100px] md:min-w-[140px] text-center print:text-2xl print:text-black print:p-0 print:text-left uppercase tracking-tight">
              {format(currentDate, 'MMM yyyy')}
            </h2>
            <button 
              onClick={onNextMonth}
              aria-label="Next Month"
              className="p-1 md:p-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#757681] transition-colors border-l border-[#E9E9E7] dark:border-[#2E2E2E] print:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            </div>
          </div>

        
        <div className="flex items-center gap-2 print:hidden">
          {isGuest && toggleDarkMode && (
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className="flex items-center justify-center p-1.5 md:p-2 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] transition-colors text-[#757681] min-h-[44px] min-w-[44px]"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>}
            </button>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2 mr-2">
              <div className="hidden md:block">
                <CalendarSharing activeBusiness={activeBusiness} onUpdateBusiness={onUpdateBusiness} />
              </div>
              <button
                onClick={() => onGenerateWithAi?.()}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#202020] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] text-brand rounded-[8px] text-sm font-medium transition-colors border border-brand-border min-h-[44px]"
              >
                <Wand2 className="w-4 h-4" />
                AI Generate
              </button>
              <button
                onClick={() => onAddPost()}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-[8px] text-sm font-medium transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                New Post
              </button>
            </div>
          )}
          <div className="flex bg-[#F7F7F5] dark:bg-[#202020] p-0.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
          <button 
            onClick={() => setViewMode('grid')} 
            aria-label="Grid View"
            className={cn("p-1.5 rounded-[6px] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center", viewMode === 'grid' ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] border border-[#E9E9E7] dark:border-[#3E3E3E]" : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]")}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('timeline')} 
            aria-label="Timeline View"
            className={cn("p-1.5 rounded-[6px] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center", viewMode === 'timeline' ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] border border-[#E9E9E7] dark:border-[#3E3E3E]" : "text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED]")}
            title="Timeline View"
          >
            <ListIcon className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>

      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        viewMode !== 'timeline' ? "overflow-x-auto" : ""
      )}>
        <div className={cn(
          "flex-1 flex flex-col",
          viewMode === 'grid' ? "min-w-0" : ""
        )}>
          {/* Weekday Headers (only for grid view) */}
          {viewMode !== 'timeline' && (
            <div className={cn(
              "border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] shrink-0 print:bg-white print:border-gray-300",
              "grid grid-cols-7"
            )}>
              {weekDays.map((day) => (
                <div key={day} className="py-1.5 md:py-3 text-center text-[9px] md:text-xs font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider print:text-black">
                  <span className="md:hidden print:hidden">{day.substring(0, 1)}</span>
                  <span className="hidden md:inline print:inline">{day}</span>
                </div>
              ))}
            </div>
          )}

          {/* Main Content Area */}
          {viewMode === 'timeline' ? (
            <div className="flex-1 bg-white dark:bg-[#191919] p-4 md:p-6 print:p-0 print:block">
              {daysWithPosts.length === 0 ? (
                <div className="text-center py-12 text-[#757681] dark:text-[#9B9A97]">
                  No posts scheduled for this month.
                </div>
              ) : (
                daysWithPosts.map(day => {
                  const dateStr = format(day, dateFormat);
                  const dayPosts = posts.filter(p => p.date === dateStr);
                  return (
                    <div key={dateStr} className="flex flex-col gap-4 mb-8 last:mb-0 print:break-inside-avoid print:mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ",
                          isToday(day) ? "bg-[#2383E2] text-white print:bg-gray-200 print:text-black" : "bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] print:bg-white print:border print:border-gray-300"
                        )}>
                          {format(day, 'd')}
                        </div>
                        <h3 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED] print:text-black">
                          {format(day, 'EEEE, MMMM d')}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-3 pl-5 border-l-2 border-[#E9E9E7] dark:border-[#2E2E2E] ml-5 print:border-gray-300 print:pl-4">
                        {dayPosts.map(post => (
                          <DraggablePost 
                            key={post.id} 
                            post={post} 
                            onEdit={() => onEditPost(post)} 
                            onImageClick={onImageClick}
                            onRegenerate={() => onRegeneratePost?.(post)}
                            onGenerateMockup={() => onGenerateMockup?.(post)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 bg-[#E9E9E7] dark:bg-[#2E2E2E]">
              <div 
                className={cn(
                  "grid gap-1 md:gap-2 p-1 md:p-2 print:relative print:bg-gray-300 print:border-t print:border-l print:border-gray-300 print:grid",
                  "grid-cols-7"
                )}
              >
                {days.map((day) => {
                  const dateStr = format(day, dateFormat);
                  const dayPosts = posts.filter(p => p.date === dateStr);
                  const dayTodos = todos.filter(t => t.dueDate === dateStr);
                  
                  return (
                    <DroppableDay 
                      key={day.toString()} 
                      day={day} 
                      dateStr={dateStr} 
                      posts={dayPosts}
                      todos={dayTodos}
                      isCurrentMonth={isSameMonth(day, monthStart)}
                      viewMode={viewMode}
                      isSelected={isSameDay(day, selectedDate)}
                      onSelect={() => setSelectedDate(day)}
                      onEditPost={onEditPost}
                      onAddPost={onAddPost}
                      onImageClick={onImageClick}
                      onRegeneratePost={onRegeneratePost}
                      onGenerateMockup={onGenerateMockup}
                      onUpdatePost={onUpdatePost}
                      onDeletePost={onDeletePost}
                      onFileDrop={onFileDrop}
                      isAdmin={isAdmin}
                      setContextMenu={setContextMenu}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Date Posts (Mobile Grid View Only) */}
      {viewMode === 'grid' && (
        <div className="md:hidden border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#121212] p-4 pb-32 print:hidden">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Selected Date</span>
              <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED] text-xl">
                {format(selectedDate, 'EEEE, MMM d')}
              </h3>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onGenerateWithAi?.(format(selectedDate, dateFormat))}
                  className="w-12 h-12 bg-white dark:bg-[#1E1E1E] text-brand rounded-[16px]  border border-brand-border flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Wand2 className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => onAddPost(format(selectedDate, dateFormat))}
                  className="w-12 h-12 bg-blue-500 text-white rounded-[16px]   flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-4">
            {posts.filter(p => p.date === format(selectedDate, dateFormat)).length === 0 && todos.filter(t => t.dueDate === format(selectedDate, dateFormat)).length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-12 text-center bg-white dark:bg-[#1E1E1E] rounded-[24px] border border-[#E9E9E7] dark:border-[#2E2E2E] "
              >
                <div className="w-12 h-12 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-3">
                  <CalendarIcon className="w-6 h-6 text-[#9B9A97]" />
                </div>
                <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">No scheduled items</p>
                {isAdmin && (
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97] mt-1">Tap the + button to add a post for this day.</p>
                )}
              </motion.div>
            ) : (
              <div className="space-y-4">
                {posts.filter(p => p.date === format(selectedDate, dateFormat)).map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <DraggablePost 
                      post={post} 
                      onEdit={() => onEditPost(post)} 
                      onImageClick={onImageClick}
                      onRegenerate={() => onRegeneratePost?.(post)}
                      onGenerateMockup={() => onGenerateMockup?.(post)}
                      isAdmin={isAdmin}
                    />
                  </motion.div>
                ))}
                {todos.filter(t => t.dueDate === format(selectedDate, dateFormat)).map((todo, idx) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "p-4 rounded-[12px] border flex flex-col gap-2 relative group overflow-hidden transition-all",
                      todo.completed ? "bg-gray-50 border-gray-200 text-gray-500 line-through" : "bg-yellow-50 border-yellow-200 text-yellow-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ListIcon className="w-4 h-4 shrink-0" />
                      <span className="font-bold">{todo.text}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  </div>
  );
}

function DraggableImage({ imageUrl, post }: { imageUrl: string, post: Post, key?: React.Key }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `image:${post.id}-${imageUrl}`,
    data: { type: 'image', imageUrl, sourcePost: post }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div className="relative w-full h-full">
      <img 
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        src={imageUrl} 
        alt="" 
        className={cn("w-full h-full object-cover", isDragging && "opacity-50")} 
      />
      {auth.currentUser && post.aiProvider && imageUrl.startsWith('data:') && (
        <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-purple-500/80 text-white text-[6px] font-bold rounded uppercase tracking-widest z-10 pointer-events-none">
          AI: {post.aiProvider}
        </div>
      )}
    </div>
  );
}



interface DroppableDayProps {
  key?: React.Key;
  day: Date;
  dateStr: string;
  posts: Post[];
  todos?: Todo[];
  isCurrentMonth: boolean;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: () => void;
  onEditPost: (post: Post) => void;
  onAddPost: (date?: string) => void;
  onImageClick: (images: string[] | string, index?: number, aiProvider?: string) => void;
  onRegeneratePost?: (post: Post) => void;
  onGenerateMockup?: (post: Post) => void;
  onUpdatePost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  onFileDrop?: (date: string, files: File[]) => void;
  isAdmin?: boolean;
  setContextMenu: (menu: { x: number; y: number; dateStr: string } | null) => void;
}

function DroppableDay({ day, dateStr, posts, todos = [], isCurrentMonth, viewMode, isSelected, onSelect, onEditPost, onAddPost, onImageClick, onRegeneratePost, onGenerateMockup, onUpdatePost, onDeletePost, onFileDrop, isAdmin, setContextMenu }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
  });

  const [isNativeDragOver, setIsNativeDragOver] = useState(false);

  // Find the first post with an image to use as background
  const postWithImage = posts.find(p => p.images && p.images.length > 0);
  const backgroundImage = postWithImage?.images?.[0];

  const handleDragOver = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setIsNativeDragOver(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setIsNativeDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsNativeDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setIsNativeDragOver(false);
      const files = Array.from(e.dataTransfer.files) as File[];
      const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
      if (mediaFiles.length > 0 && onFileDrop) {
        onFileDrop(dateStr, mediaFiles);
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, dateStr });
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        if (viewMode === 'grid' && window.innerWidth < 768) {
          onSelect();
        } else if (e.target === e.currentTarget && isAdmin) {
          onAddPost(dateStr);
        }
      }}
      className={cn(
        "transition-all cursor-pointer flex flex-col relative group min-h-0 overflow-hidden rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand/50",
        "aspect-square p-1.5 md:p-2.5 bg-white dark:bg-[#191919] gap-1 md:gap-1.5",
        !isCurrentMonth && "flex bg-[#F7F7F5] dark:bg-[#202020] text-[#757681] opacity-40 print:opacity-100 print:bg-gray-50",
        (isOver || isNativeDragOver) && "bg-[#EFEFED] dark:bg-[#2E2E2E] ring-2 ring-inset ring-brand",
        viewMode === 'grid' && isSelected && "ring-2 ring-inset ring-brand bg-[#EFEFED]/50 dark:bg-[#2E2E2E]/50",
        "print:bg-white print:min-h-[120px] print:border-r print:border-b print:border-gray-300 print:p-1"
      )}
      style={backgroundImage ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.85)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      <div className="flex justify-between items-center mb-1.5 md:mb-2 shrink-0 z-10 relative">
        <div className="flex items-center gap-1.5 flex-row">
          <span className={cn(
            "text-xs md:text-sm font-bold flex items-center justify-center rounded-[8px] transition-all",
            "w-6 h-6 md:w-8 md:h-8",
            isToday(day) 
              ? "bg-brand text-white ring-2 ring-blue-200 dark:ring-blue-900/30" 
              : isSelected 
                ? "bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#191919]"
                : backgroundImage 
                  ? "text-white bg-black/40 backdrop-blur-sm"
                  : "text-[#37352F] dark:text-[#EBE9ED] bg-[#F7F7F5] dark:bg-[#202020] md:bg-transparent md:dark:bg-transparent"
          )}>
            {format(day, 'd')}
          </span>
        </div>
        
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Universal Post Indicator (Dot) - Hidden if background image is present to keep it clean */}
          {posts.length > 0 && !backgroundImage && (
            <div className="w-1.5 h-1.5 rounded-full bg-brand" />
          )}
          
          {/* Quick add button visible on hover on desktop */}
          {isAdmin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAddPost(dateStr); }}
              aria-label="Add Post"
              className={cn(
                "hidden sm:flex w-8 h-8 items-center justify-center rounded-[8px] transition-all print:hidden",
                backgroundImage 
                  ? "bg-black/40 backdrop-blur-sm text-white hover:bg-black/60" 
                  : "bg-[#EFEFED] dark:bg-[#2E2E2E] hover:bg-[#E9E9E7] dark:hover:bg-[#3E3E3E] text-[#757681]"
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Grid View Dots (Secondary detailed indicator) */}
      {viewMode === 'grid' && (
        <div className="md:hidden flex flex-wrap justify-center gap-0.5 mt-0.5 print:hidden">
          {posts.slice(0, 4).map(post => (
            <div key={post.id} className="w-1 h-1 rounded-full bg-brand/60" />
          ))}
        </div>
      )}

      {/* Desktop View Posts */}
      <div className={cn(
        "flex-1 min-h-0 flex flex-col gap-1.5 print:overflow-visible overflow-y-auto no-scrollbar",
        viewMode === 'grid' ? "hidden md:flex print:flex" : "flex"
      )}>
        <SortableContext items={posts.map(p => p.id)} strategy={rectSortingStrategy}>
          {posts.map(post => (
            <DraggablePost 
              key={post.id} 
              post={post} 
              viewMode={viewMode}
              onEdit={() => onEditPost(post)} 
              onImageClick={onImageClick}
              onRegenerate={() => onRegeneratePost?.(post)}
              onGenerateMockup={() => onGenerateMockup?.(post)}
              onUpdate={(updatedPost) => onUpdatePost?.(updatedPost)}
              onDelete={() => onDeletePost?.(post.id)}
              isAdmin={isAdmin}
            />
          ))}
        </SortableContext>
        {todos.map(todo => (
          <div key={todo.id} className={cn(
            "text-[10px] p-1.5 rounded border flex flex-col gap-0.5 relative group overflow-hidden transition-all",
            todo.completed ? "bg-gray-50 border-gray-200 text-gray-500 line-through" : "bg-yellow-50 border-yellow-200 text-yellow-800"
          )}>
            <div className="flex items-center gap-1">
              <ListIcon className="w-3 h-3 shrink-0" />
              <span className="font-bold truncate">{todo.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DraggablePostProps {
  key?: React.Key;
  post: Post;
  viewMode?: ViewMode;
  onEdit: () => void;
  onImageClick: (images: string[] | string, index?: number, aiProvider?: string) => void;
  onRegenerate?: () => void;
  onGenerateMockup?: () => void;
  onUpdate?: (post: Post) => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

function DraggablePost({ post, viewMode, onEdit, onImageClick, onRegenerate, onGenerateMockup, onUpdate, onDelete, isAdmin }: DraggablePostProps) {
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [isGeneratingMockup, setIsGeneratingMockup] = React.useState(false);

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRegenerate) {
      setIsRegenerating(true);
      await onRegenerate();
      setIsRegenerating(false);
    }
  };

  const handleGenerateMockup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGenerateMockup) {
      setIsGeneratingMockup(true);
      await onGenerateMockup();
      setIsGeneratingMockup(false);
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id, data: { type: 'post', post } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  // Extract emoji from type
  const emojiMatch = (post.type || '').match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
  const emoji = emojiMatch ? emojiMatch[0] : '📝';

  const contextMenuItems: ContextMenuItem[] = [
    { label: 'Edit Post', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: onEdit },
    { label: 'Regenerate AI', icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => onRegenerate?.() },
    { label: 'Generate Mockup', icon: <Wand2 className="w-3.5 h-3.5" />, onClick: () => onGenerateMockup?.() },
    { label: 'Copy Title', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {
      navigator.clipboard.writeText(post.title);
      toast.success("Title copied!");
    }},
    { label: 'Copy Caption', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {
      navigator.clipboard.writeText(post.caption || '');
      toast.success("Caption copied!");
    }},
    { 
      label: 'Open Link', 
      icon: <ExternalLink className="w-3.5 h-3.5" />, 
      disabled: !post.link,
      onClick: () => post.link && window.open(post.link, '_blank') 
    },
    ...(isAdmin ? [{ 
      label: post.isHiddenForOthers ? 'Show for others' : 'Hide for others', 
      icon: post.isHiddenForOthers ? <ExternalLink className="w-3.5 h-3.5" /> : <CloseIcon className="w-3.5 h-3.5" />, 
      onClick: () => {
        onUpdate?.({ ...post, isHiddenForOthers: !post.isHiddenForOthers });
        toast.success(post.isHiddenForOthers ? "Post is now visible to others" : "Post is now hidden from others");
      }
    }] : []),
    ...(isAdmin ? [{ 
      label: 'Delete Post', 
      icon: <Trash2 className="w-3.5 h-3.5" />, 
      variant: 'danger' as const,
      onClick: () => {
        if (window.confirm("Are you sure you want to delete this post?")) {
          onDelete?.();
        }
      }
    }] : []),
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          // Prevent drag click from triggering edit immediately if dragging
          if (!isDragging) {
            e.stopPropagation();
            onEdit();
          }
        }}
        className={cn(
          "text-left bg-white dark:bg-[#1E1E1E] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] hover:border-brand transition-all cursor-grab active:cursor-grabbing active:scale-95 flex flex-col",
          viewMode === 'grid' ? "p-3 md:p-1.5 gap-2 md:gap-1" : "p-4 gap-3",
          isDragging && "border-brand scale-105 active:scale-105",
          "print:border-none print:shadow-none print:p-1 print:bg-transparent print:gap-1 print:break-inside-avoid"
        )}
      >
      <div className={cn("flex items-center gap-2 text-[#757681] print:text-sm print:text-black", viewMode === 'grid' ? "text-[11px] mb-1" : "text-xs mb-1")}>
        <span className={cn(viewMode === 'grid' ? "text-sm" : "text-sm")}>{emoji}</span>
        <span className="truncate font-bold text-[#37352F] dark:text-[#EBE9ED] print:whitespace-normal">{post.outlet}</span>
        {post.productCategory && <span className="hidden print:inline"> • {post.productCategory}</span>}
        
        {/* Status Indicators */}
        <div className="ml-auto flex gap-0.5 items-center">
          {post.isHiddenForOthers && (
            <span className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-[4px] font-bold uppercase text-[7px] px-1 flex items-center gap-0.5" title="Hidden from other viewers">
              <CloseIcon className="w-2 h-2" />
              Private
            </span>
          )}
          {post.approvalStatus && (
            <span className={cn(
              "rounded-[4px] font-bold uppercase",
              viewMode === 'grid' ? "text-[7px] px-0.5" : "text-[9px] px-1",
              post.approvalStatus === 'approved' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
              post.approvalStatus === 'rejected' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            )}>
              {viewMode === 'grid' ? post.approvalStatus.charAt(0) : post.approvalStatus}
            </span>
          )}
          {post.publishStatus && (
            <span className={cn(
              "rounded-[4px] font-bold uppercase",
              viewMode === 'grid' ? "text-[7px] px-0.5" : "text-[9px] px-1",
              post.publishStatus === 'published' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : 
              post.publishStatus === 'failed' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            )}>
              {viewMode === 'grid' ? post.publishStatus.charAt(0) : post.publishStatus}
            </span>
          )}
        </div>
      </div>
      
      <h4 className={cn("font-bold text-[#37352F] dark:text-[#EBE9ED] leading-tight print:line-clamp-none print:text-lg print:text-black print:mb-2", viewMode === 'grid' ? "text-[10px] md:text-xs line-clamp-2" : "text-sm md:text-xs md:line-clamp-2")}>
        {post.title}
      </h4>

      {post.link && viewMode !== 'grid' && (
        <div className="text-[10px] text-[#2383E2] truncate hover:underline print:hidden">
          <a href={post.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            {post.link}
          </a>
        </div>
      )}

      <div className="hidden print:block text-sm text-black mb-2">
        {post.brief && <p className="mb-1"><strong>Brief:</strong> {post.brief}</p>}
        {post.caption && <p className="mb-1"><strong>Caption:</strong> {post.caption}</p>}
        {post.hashtags && <p className="mb-1 text-blue-600">{post.hashtags}</p>}
        {post.link && <p className="mb-1 text-blue-600 underline">{post.link}</p>}
      </div>

      {post.images && post.images.length > 0 && (
        <div className={cn(
          "flex gap-1 mt-1 overflow-x-auto pointer-events-auto print:flex-wrap print:overflow-visible print:gap-4 print:mt-2",
          viewMode === 'grid' ? "mt-0.5" : "mt-1"
        )}>
          {post.images.map((img, idx) => (
            <div 
              key={idx} 
              className={cn(
                "relative rounded overflow-hidden flex-shrink-0 border border-[#E9E9E7] dark:border-[#2E2E2E] cursor-pointer hover:opacity-80 transition-opacity print:w-48 print:h-48 print:border-gray-300 print:rounded-[8px] print:",
                viewMode === 'grid' ? "w-10 h-10 md:w-14 lg:w-16 md:h-14 lg:h-16" : "w-6 h-6 sm:w-8 sm:h-8"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(post.images!, idx, post.aiProvider);
              }}
            >
              <DraggableImage imageUrl={img} post={post} />
            </div>
          ))}
        </div>
      )}

      {/* AI Actions */}
      {isAdmin && viewMode !== 'grid' && (
        <div className={cn("flex items-center mt-2 pt-2 border-t border-[#E9E9E7] dark:border-[#2E2E2E] pointer-events-auto print:hidden", "gap-3 md:gap-2")}>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] disabled:opacity-50 transition-colors"
            title="Regenerate with AI"
          >
            {isRegenerating ? <ForgeLoader size={14} /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium">Regenerate</span>
          </button>
          <button
            onClick={handleGenerateMockup}
            disabled={isGeneratingMockup || !post.title || !post.brief || !post.caption}
            className="flex items-center gap-1.5 text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] disabled:opacity-50 transition-colors"
            title={(!post.title || !post.brief || !post.caption) ? "Fill title, brief, and caption to generate mockup" : "Generate Mockup"}
          >
            {isGeneratingMockup ? <ForgeLoader size={14} /> : <Wand2 className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium">Mockup</span>
          </button>
        </div>
      )}
      </div>
    </ContextMenu>
  );
}
