import React, { useState, useEffect } from 'react';
import { ForgeLoader } from './ForgeLoader';
import { BarChart3, TrendingUp, Clock, Hash, Link as LinkIcon, Sparkles, Settings, Code, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { generateAnalyticsReport } from '../lib/gemini';
import { getAnalyticsSettings, setAnalyticsSettings, cn } from '../lib/utils';

interface AnalyticsData {
  bestTime: string;
  formatSuggestions: string[];
  hashtagPerformance: { tag: string; score: number }[];
  summary: string;
  engagementRate: string;
  audienceDemographics: { segment: string; percentage: number }[];
  competitorInsights: string[];
  growthTrend: { period: string; value: number }[];
  followerGrowth: { period: string; count: number }[];
  topPosts: { title: string; engagement: string; type: string }[];
  engagementOverTime: { date: string; rate: number }[];
  contentPillars: { pillar: string; performance: number }[];
}

export function AnalyticsTab({ setActiveTab }: { setActiveTab?: (tab: 'home' | 'schedule' | 'calendar' | 'search' | 'brandkit' | 'more' | 'chat' | 'creative' | 'analytics' | 'ideas' | 'notebook') => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'timeline' | 'json'>('summary');

  useEffect(() => {
    const settings = getAnalyticsSettings();
    if (settings.autoRunAnalytics) {
      const today = new Date().toISOString().split('T')[0];
      if (settings.lastRunDate !== today && (settings.instagramUrl || settings.facebookUrl)) {
        handleAnalyze(settings.instagramUrl, settings.facebookUrl, true);
      }
    }
  }, []);

  const handleAnalyze = async (instagramUrl?: string, facebookUrl?: string, isAutoRun = false) => {
    const settings = getAnalyticsSettings();
    const insta = instagramUrl ?? settings.instagramUrl;
    const fb = facebookUrl ?? settings.facebookUrl;

    if (!insta && !fb) {
      if (!isAutoRun) toast.error('Please connect at least one social media account in Settings.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = `Analyze the social media presence for these accounts:
Instagram: ${insta || 'N/A'}
Facebook: ${fb || 'N/A'}

Generate a highly detailed analysis with the following metrics:
- Best time to post
- Content format suggestions
- Hashtag performance scores
- Overall summary
- Engagement rate
- Audience demographics
- Competitor insights
- Growth trends
- Follower growth
- Top performing posts
- Engagement over time
- Content pillars performance

Ensure the response is a valid JSON object.`;

      const data = await generateAnalyticsReport(prompt);
      setAnalytics(data);
      if (!isAutoRun) toast.success('Analysis complete!');
      
      // Update last run date
      const today = new Date().toISOString().split('T')[0];
      setAnalyticsSettings({ ...settings, lastRunDate: today });
    } catch (error) {
      console.error('Analysis failed:', error);
      if (!isAutoRun) toast.error('Failed to analyze accounts. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const settings = getAnalyticsSettings();
  const hasAccounts = settings.instagramUrl || settings.facebookUrl;

  return (
    <div className="flex flex-col bg-transparent relative">
      <div className="hidden md:block p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-bg rounded-[16px] flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                Insights & Analytics
              </h2>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mt-1">
                Deep dive into your social media performance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-[#F7F7F5] dark:bg-[#202020] p-1 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-x-auto no-scrollbar max-w-full">
          <button 
            onClick={() => setViewMode('summary')}
            className={cn(
              "px-4 md:px-6 py-2 text-xs font-bold rounded-[8px] transition-all flex items-center gap-2 whitespace-nowrap",
              viewMode === 'summary' ? "bg-white dark:bg-[#191919]  text-[#2383E2]" : "text-[#757681]"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Summary Report
          </button>
          <button 
            onClick={() => setViewMode('timeline')}
            className={cn(
              "px-4 md:px-6 py-2 text-xs font-bold rounded-[8px] transition-all flex items-center gap-2 whitespace-nowrap",
              viewMode === 'timeline' ? "bg-white dark:bg-[#191919]  text-[#2383E2]" : "text-[#757681]"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Timeline View
          </button>
          <button 
            onClick={() => setViewMode('json')}
            className={cn(
              "px-4 md:px-6 py-2 text-xs font-bold rounded-[8px] transition-all flex items-center gap-2 whitespace-nowrap",
              viewMode === 'json' ? "bg-white dark:bg-[#191919]  text-[#2383E2]" : "text-[#757681]"
            )}
          >
            <Code className="w-3.5 h-3.5" />
            JSON View
          </button>
        </div>

        {!hasAccounts && (
          <button 
            onClick={() => setActiveTab?.('more')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-[12px] text-xs font-bold border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Connect Accounts
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#191919] rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
        <div className="p-4 md:p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI Performance Analysis
          </h3>
          <p className="text-xs text-[#757681] mt-1">
            {hasAccounts 
              ? `Analyzing: ${[settings.instagramUrl, settings.facebookUrl].filter(Boolean).join(', ')}`
              : 'Connect your accounts in Settings to enable deep AI analysis.'
            }
          </p>
        </div>
        <div className="p-6">
          <button
            onClick={() => handleAnalyze()}
            disabled={isAnalyzing || !hasAccounts}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#2383E2] hover:bg-blue-600 text-white rounded-[16px] text-sm font-bold transition-all disabled:opacity-50   active:scale-[0.98]"
          >
            {isAnalyzing ? <ForgeLoader size={20} /> : <Sparkles className="w-5 h-5" />}
            {isAnalyzing ? 'Analyzing Profiles...' : 'Run AI Analysis Now'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {analytics && viewMode === 'summary' && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6"
          >
            {/* Summary */}
            <div className="md:col-span-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-[16px] border border-blue-100 dark:border-blue-900/30  relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <TrendingUp className="w-24 h-24 text-blue-600" />
              </div>
              <div className="relative z-10">
                <h3 className="text-base font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5" />
                  Performance Summary
                </h3>
                <p className="text-sm leading-relaxed text-blue-900/80 dark:text-blue-100/80 font-medium">{analytics.summary}</p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="md:col-span-4 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Peak Engagement
                </h3>
              </div>
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{analytics.bestTime}</div>
                <p className="text-xs text-[#757681] font-medium uppercase tracking-wider">Best time to post</p>
              </div>
            </div>

            <div className="md:col-span-4 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Engagement Rate
                </h3>
              </div>
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-3xl font-black text-green-600 dark:text-green-400 tracking-tight">{analytics.engagementRate}</div>
                <p className="text-xs text-[#757681] font-medium uppercase tracking-wider">Avg. Interaction Rate</p>
              </div>
            </div>

            <div className="md:col-span-4 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  Follower Growth
                </h3>
              </div>
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                  +{analytics.followerGrowth[analytics.followerGrowth.length - 1].count - analytics.followerGrowth[0].count}
                </div>
                <p className="text-xs text-[#757681] font-medium uppercase tracking-wider">Total Growth Period</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="md:col-span-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Engagement Over Time
                </h3>
              </div>
              <div className="p-6 flex items-end justify-between gap-2 h-[150px]">
                {analytics.engagementOverTime.map((t, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.rate}%
                    </div>
                    <div 
                      className="w-full bg-blue-500/20 group-hover:bg-blue-500/40 rounded-t-[8px] transition-all" 
                      style={{ height: `${(t.rate / Math.max(...analytics.engagementOverTime.map(v => v.rate))) * 100}px` }}
                    >
                      <div 
                        className="w-full bg-blue-500 rounded-t-[8px]" 
                        style={{ height: '4px' }}
                      />
                    </div>
                    <span className="text-[8px] text-[#757681] truncate w-full text-center">{t.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  Content Pillar Performance
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {analytics.contentPillars.map((pillar, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{pillar.pillar}</span>
                      <span className="text-purple-600">{pillar.performance}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#F7F7F5] dark:bg-[#202020] rounded-full overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pillar.performance}%` }}
                        className="h-full bg-purple-500" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Posts */}
            <div className="md:col-span-12 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Top Performing Posts
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {analytics.topPosts.map((post, idx) => (
                    <div key={idx} className="p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] hover: transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{post.type}</span>
                        <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">{post.engagement}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] line-clamp-1">{post.title}</h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategy & Insights */}
            <div className="md:col-span-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Content Strategy Suggestions
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {analytics.formatSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <span className="flex-shrink-0 w-6 h-6 rounded-[8px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-[#37352F] dark:text-[#EBE9ED] font-medium">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-orange-500" />
                  Competitor Insights
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {analytics.competitorInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <p className="text-sm text-[#37352F] dark:text-[#EBE9ED] font-medium">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Demographics & Hashtags */}
            <div className="md:col-span-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  Audience Demographics
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {analytics.audienceDemographics.map((demo, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{demo.segment}</span>
                      <span>{demo.percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#F7F7F5] dark:bg-[#202020] rounded-full overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${demo.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  Top Hashtags
                </h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3">
                {analytics.hashtagPerformance.map((tag, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">{tag.tag}</span>
                    <span className="text-[10px] font-bold text-blue-600">{tag.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {analytics && viewMode === 'timeline' && (
          <motion.div 
            key="timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden ">
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Campaign Roadmap
                </h3>
              </div>
              <div className="p-8">
                <div className="relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E9E9E7] dark:before:bg-[#2E2E2E]">
                  {analytics.engagementOverTime.map((item, idx) => (
                    <div key={idx} className="relative pl-10 pb-10 last:pb-0">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-blue-500 border-4 border-white dark:border-[#191919]  z-10" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{item.date}</span>
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-[10px] font-bold rounded-full">
                            {item.rate}% Engagement
                          </span>
                        </div>
                        <div className="p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                          <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] mb-1">
                            {analytics.topPosts[idx % analytics.topPosts.length].title}
                          </h4>
                          <p className="text-xs text-[#757681] dark:text-[#9B9A97]">
                            Strategic milestone reached. Content performance aligned with content pillar: {analytics.contentPillars[idx % analytics.contentPillars.length].pillar}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {analytics && viewMode === 'json' && (
          <motion.div 
            key="json"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#1E1E1E] rounded-[16px] border border-[#2E2E2E] overflow-hidden "
          >
            <div className="p-4 border-b border-[#2E2E2E] bg-[#252525] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-gray-300">Raw Analysis Data (JSON)</span>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(analytics, null, 2));
                  toast.success('JSON copied to clipboard');
                }}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-[11px] font-mono text-blue-300 leading-relaxed">
                {JSON.stringify(analytics, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
