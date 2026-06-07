import React from 'react';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  Database, 
  Briefcase, 
  FileText,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight
} from 'lucide-react';

export function HomeTab({ 
  posts = [], 
  activeBusiness, 
  setActiveTab, 
  onAddPost, 
  isAdmin, 
  isViewer,
  onHandleRequestAccess,
  user 
}: any) {
  
  const businessName = activeBusiness?.name || 'My Workspace';
  const industry = activeBusiness?.industry || 'General';
  
  const drafts = posts.filter((p: any) => p.publishStatus === 'draft' || !p.publishStatus);
  const scheduled = posts.filter((p: any) => p.publishStatus === 'scheduled');
  const published = posts.filter((p: any) => p.publishStatus === 'published');
  
  const upcomingPosts = posts
    .filter((p: any) => p.publishStatus === 'scheduled')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 px-2.5 bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 rounded-full font-bold text-[10px] tracking-wider uppercase">
              {industry} Workspace
            </span>
          </div>
          <h1 className="text-2xl font-bold font-sans text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#2665fd]" />
            <span>{businessName}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 dark:text-zinc-400">
            Welcome back, <strong className="text-gray-700 dark:text-zinc-200">{user?.displayName || user?.email || 'Workspace Member'}</strong>
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => onAddPost?.()}
            className="flex items-center gap-1.5 bg-[#2665fd] hover:bg-[#2665fd]/95 text-white font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer transition shadow-sm animate-fade-in"
            type="button"
          >
            <Plus size={14} />
            <span>Schedule Post</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Scheduled Posts</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-gray-800 dark:text-white">{scheduled.length}</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Drafts</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-gray-800 dark:text-white">{drafts.length}</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Published</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-black text-gray-800 dark:text-white">{published.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-sm tracking-wide text-gray-700 dark:text-zinc-300 uppercase">Upcoming Schedule Feed</h2>
          
          {upcomingPosts.length === 0 ? (
            <div className="p-8 bg-gray-50/50 dark:bg-zinc-900/40 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl text-center">
              <Calendar className="w-8 h-8 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="font-semibold text-xs text-gray-700 dark:text-zinc-300 mb-1">No scheduled posts yet</h3>
              <p className="text-[11px] text-gray-400 mb-4">Plan and schedule marketing posts to automate your brand voice.</p>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                <span>Navigate to Calendar</span>
                <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post: any) => (
                <div key={post.id} className="p-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-4 shadow-sm hover:border-gray-200 dark:hover:border-zinc-750 transition">
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 truncate">{post.title || 'Untitled Post'}</h4>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
                      Scheduled for: <strong className="text-gray-500 dark:text-zinc-400">{typeof post.date === 'string' ? post.date : (post.date as any)?.toISOString?.().split('T')[0] || ''}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 font-bold text-[9px] rounded-full uppercase tracking-wider">
                      Scheduled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-bold text-sm tracking-wide text-gray-700 dark:text-zinc-300 uppercase">Interactive Workspace Hub</h2>
          
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 divide-y divide-gray-100 dark:divide-zinc-800 shadow-sm">
            <button 
              onClick={() => setActiveTab('schedule')}
              className="w-full py-3 flex items-center justify-between hover:text-[#2665fd] dark:hover:text-blue-400 transition text-left cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-zinc-800 text-[#2665fd] rounded-xl">
                  <Calendar size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-gray-800 dark:text-zinc-200">Marketing Calendar</h3>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500">View and organize draft calendar pipelines</p>
                </div>
              </div>
              <ArrowRight size={12} className="text-gray-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button 
              onClick={() => setActiveTab('brandkit')}
              className="w-full py-3 flex items-center justify-between hover:text-[#2665fd] dark:hover:text-blue-400 transition text-left cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-zinc-800 text-purple-600 rounded-xl">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-gray-800 dark:text-zinc-200">Brand Kit & Voice</h3>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500">Configure logo, voice style, and assets</p>
                </div>
              </div>
              <ArrowRight size={12} className="text-gray-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button 
              onClick={() => setActiveTab('localdb')}
              className="w-full py-3 flex items-center justify-between hover:text-[#2665fd] dark:hover:text-blue-400 transition text-left cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-zinc-800 text-emerald-600 rounded-xl">
                  <Database size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-gray-800 dark:text-zinc-200">Product Catalogue</h3>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500">Import and sync web products database</p>
                </div>
              </div>
              <ArrowRight size={12} className="text-gray-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button 
              onClick={() => setActiveTab('creativeStudio')}
              className="w-full py-3 flex items-center justify-between hover:text-[#2665fd] dark:hover:text-blue-400 transition text-left cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-zinc-800 text-indigo-600 rounded-xl">
                  <Briefcase size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-gray-800 dark:text-zinc-200">Creative Studio</h3>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500">Work on marketing widget generators</p>
                </div>
              </div>
              <ArrowRight size={12} className="text-gray-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default HomeTab;
