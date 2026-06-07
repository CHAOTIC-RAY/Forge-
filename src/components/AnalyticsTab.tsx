import React from 'react';
import { BarChart3, TrendingUp, Users, Percent } from 'lucide-react';

export function AnalyticsTab({ posts = [] }: any) {
  const publishedPosts = posts.filter((p: any) => p.status === 'published' || p.publishStatus === 'published');
  
  const totalImpressions = publishedPosts.reduce((acc: number, p: any) => acc + (p.analytics?.impressions || 0), 0);
  const totalReach = publishedPosts.reduce((acc: number, p: any) => acc + (p.analytics?.reach || 0), 0);
  const totalEngagement = publishedPosts.reduce((acc: number, p: any) => acc + (p.analytics?.engagement || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#2665fd]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Workspace Analytics</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-sm text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">Impressions</span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalImpressions.toLocaleString() || '0'}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-sm text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Reach</span>
            <Users size={16} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalReach.toLocaleString() || '0'}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-sm text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">Engagement</span>
            <Percent size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalEngagement.toLocaleString() || '0'}</div>
        </div>
      </div>
    </div>
  );
}
export default AnalyticsTab;
