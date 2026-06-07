import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Copy, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Wand2, 
  Eye, 
  Layers,
  Laptop
} from 'lucide-react';
import { Post, Business } from '../data';
import { cn } from '../lib/utils';
import { ForgeLoader } from './ForgeLoader';

interface CalendarProps {
  currentDate: Date;
  posts: Post[];
  onEditPost: (post: Post) => void;
  onDeletePost?: (id: string) => void;
  onCopyPost?: (post: Post) => void;
  onAddPost?: (date: Date) => void;
  onGenerateWithAi?: () => void;
  onImageClick?: (url: string) => void;
  onRegeneratePost?: (post: Post) => void;
  onGenerateMockup?: (post: Post) => void;
  onUpdatePost?: (post: Post) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onFileDrop?: (file: File, dateStr: string) => void;
  isAdmin: boolean;
  isGuest: boolean;
  activeBusiness?: Business | null;
  onUpdateBusiness?: (biz: Business) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  calendarMode?: 'work' | 'personal';
  onCalendarModeChange?: (mode: 'work' | 'personal') => void;
  isSyncing?: boolean;
}

export function Calendar({
  currentDate,
  posts,
  onEditPost,
  onDeletePost,
  onCopyPost,
  onAddPost,
  onGenerateWithAi,
  onImageClick,
  onRegeneratePost,
  onGenerateMockup,
  onPrevMonth,
  onNextMonth,
  onFileDrop,
  isAdmin,
  isGuest,
  activeBusiness,
  calendarMode = 'work',
  onCalendarModeChange,
  isSyncing = false
}: CalendarProps) {
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArr: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    daysArr.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArr.push(new Date(year, month, d));
  }

  // Ensure 42 cell grid
  while (daysArr.length < 42) {
    daysArr.push(null);
  }

  const isSameDay = (postDate: any, cellDate: Date) => {
    if (!postDate) return false;
    const d = postDate instanceof Date ? postDate : new Date(postDate);
    return d.getFullYear() === cellDate.getFullYear() &&
           d.getMonth() === cellDate.getMonth() &&
           d.getDate() === cellDate.getDate();
  };

  const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-heading">
            {monthNames[month]} {year}
          </h2>
          {isSyncing && <ForgeLoader size={16} />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNextMonth}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>

          {isAdmin && onGenerateWithAi && (
            <button
              onClick={onGenerateWithAi}
              className="ml-2 flex items-center gap-1.5 bg-[#2665fd] hover:bg-[#2665fd]/95 text-white py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition"
            >
              <Sparkles size={12} className="shrink-0" />
              <span>Fill Month with AI</span>
            </button>
          )}

          {onCalendarModeChange && (
            <div className="flex items-center border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => onCalendarModeChange('work')}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition cursor-pointer",
                  calendarMode === 'work' 
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" 
                    : "bg-white dark:bg-zinc-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
                )}
              >
                Work
              </button>
              <button
                onClick={() => onCalendarModeChange('personal')}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition cursor-pointer",
                  calendarMode === 'personal' 
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" 
                    : "bg-white dark:bg-zinc-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
                )}
              >
                Personal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/20 dark:bg-zinc-900/30">
        {dayOfWeekNames.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-zinc-400 font-sans uppercase tracking-wider border-r last:border-r-0 border-gray-100 dark:border-zinc-800">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-gray-100 dark:divide-zinc-800">
        {daysArr.map((cellDate, index) => {
          const cellPosts = cellDate ? posts.filter(post => isSameDay(post.date, cellDate)) : [];
          const isToday = cellDate && new Date().toDateString() === cellDate.toDateString();

          return (
            <div
              key={index}
              className={cn(
                "min-h-[110px] p-2 flex flex-col group relative border-gray-100 dark:border-zinc-800",
                !cellDate && "bg-gray-50/30 dark:bg-zinc-950/20"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                {cellDate ? (
                  <span className={cn(
                    "text-xs font-bold leading-none px-1.5 py-1 rounded-md",
                    isToday 
                      ? "bg-[#2665fd] text-white" 
                      : "text-gray-800 dark:text-zinc-300"
                  )}>
                    {cellDate.getDate()}
                  </span>
                ) : <span />}

                {cellDate && isAdmin && onAddPost && (
                  <button
                    onClick={() => onAddPost(cellDate)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-md cursor-pointer transition shrink-0"
                    title="Add content"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>

              {/* Cell Posts */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar max-h-[90px]">
                {cellPosts.map(post => {
                  const hasImage = post.images && post.images.length > 0;
                  return (
                    <div
                      key={post.id}
                      className={cn(
                        "rounded-lg p-1.5 text-[11px] border leading-tight transition cursor-pointer select-none flex flex-col justify-between hover:shadow-sm",
                        post.status === 'published'
                          ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                          : post.status === 'scheduled'
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                          : "bg-gray-100 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300"
                      )}
                      onClick={() => onEditPost(post)}
                    >
                      <div className="font-semibold truncate mb-1">
                        {post.title}
                      </div>

                      {hasImage && post.images && onImageClick && (
                        <div 
                          className="w-full h-8 rounded-md mb-1.5 overflow-hidden border border-black/10 shrink-0 select-none group/img relative"
                          onClick={(e) => {
                            e.stopPropagation();
                            onImageClick(post.images![0]);
                          }}
                        >
                          <img 
                            src={post.images[0]} 
                            alt="post preview" 
                            className="w-full h-full object-cover transition duration-150 transform hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                            <Eye size={10} className="text-white" />
                          </div>
                        </div>
                      )}

                      {/* Action buttons on hover */}
                      <div className="flex items-center gap-1.5 mt-1 shrink-0">
                        {isAdmin && onCopyPost && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyPost(post);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-0.5"
                            title="Duplicate"
                          >
                            <Copy size={9} />
                          </button>
                        )}
                        {isAdmin && onDeletePost && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePost(post.id);
                            }}
                            className="text-gray-400 hover:text-red-500 p-0.5 ml-auto"
                            title="Delete"
                          >
                            <Trash2 size={9} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default Calendar;
