import React, { useState, useEffect } from 'react';
import { Business } from '../data';
import { doc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Share2, Copy, RefreshCw, Settings, X, Lock, Calendar, Tags, Eye, QrCode, ChevronDown, ChevronUp, Clock, Trash2, Link2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, isAfter, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CalendarSharingProps {
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
}

export function CalendarSharing({ activeBusiness, onUpdateBusiness }: CalendarSharingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isGeneratingShort, setIsGeneratingShort] = useState(false);

  if (!activeBusiness) return null;

  const generateShortLink = async (longUrl: string) => {
    setIsGeneratingShort(true);
    try {
      let shortCode = '';
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 5) {
        shortCode = Math.random().toString(36).substring(2, 8);
        const q = query(collection(db, 'short_links'), where('shortCode', '==', shortCode));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error("Failed to generate a unique short code.");
      }

      const id = uuidv4();
      
      await setDoc(doc(db, 'short_links', id), {
        id,
        title: `Calendar Share: ${activeBusiness.name}`,
        originalUrl: longUrl,
        shortCode,
        businessId: activeBusiness.id,
        clicks: 0,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        shareShortCode: shortCode
      });

      onUpdateBusiness({ ...activeBusiness, shareShortCode: shortCode });
      return shortCode;
    } catch (e) {
      console.error("Error generating short link", e);
      return null;
    } finally {
      setIsGeneratingShort(false);
    }
  };

  const handleGenerateShareLink = async () => {
    const token = uuidv4();
    try {
      const longUrl = `${window.location.origin}/share/${activeBusiness.id}/${token}`;
      const updates: any = { 
        shareToken: token, 
        shareRestriction: activeBusiness.shareRestriction || 'guest',
        shareAnalytics: { views: 0, lastViewedAt: null }
      };
      
      await updateDoc(doc(db, 'businesses', activeBusiness.id), updates);
      
      // Generate short link
      const shortCode = await generateShortLink(longUrl);
      if (shortCode) {
        updates.shareShortCode = shortCode;
      }

      onUpdateBusiness({ ...activeBusiness, ...updates });
      toast.success("Share link generated!");
    } catch (e) {
      console.error("Error generating share link", e);
      toast.error("Failed to generate share link.");
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'businesses', activeBusiness.id), { [field]: value });
      onUpdateBusiness({ ...activeBusiness, [field]: value });
      toast.success("Settings updated!");
    } catch (e) {
      console.error(`Error updating ${field}`, e);
      toast.error("Failed to update settings.");
    }
  };

  const handleRevoke = async () => {
    try {
      const updates = {
        shareToken: null,
        shareShortCode: null
      };
      await updateDoc(doc(db, 'businesses', activeBusiness.id), updates);
      onUpdateBusiness({ ...activeBusiness, ...updates });
      toast.success("Access revoked");
    } catch (e) {
      console.error("Error revoking access", e);
      toast.error("Failed to revoke access");
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const shareUrl = activeBusiness.shareToken 
    ? `${window.location.origin}/share/${activeBusiness.id}/${activeBusiness.shareToken}`
    : '';

  const shortShareUrl = activeBusiness.shareShortCode
    ? `${window.location.origin}/s/${activeBusiness.shareShortCode}`
    : '';

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortShareUrl || shareUrl)}`;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 md:px-1.5 py-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#757681] dark:text-[#9B9A97] transition-colors rounded-[6px]"
        title="Share Calendar"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-xs font-medium md:hidden">Share Schedule</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[60] md:hidden" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed md:absolute bottom-0 md:bottom-auto left-0 md:left-auto right-0 md:right-0 md:top-full mt-0 md:mt-2 w-full md:w-[400px] bg-white dark:bg-[#191919] border-t md:border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-t-3xl md:rounded-[16px]  md: z-[70] md:z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F7F7F5] dark:bg-[#202020]">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-500" /> Calendar Sharing
                </h3>
                <div className="flex items-center gap-1">
                  {activeBusiness.shareToken && (
                    <button 
                      onClick={() => setShowQr(!showQr)}
                      className={cn(
                        "p-1.5 rounded-[8px] transition-colors",
                        showQr ? "bg-blue-100 text-blue-600" : "hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#757681]"
                      )}
                      title="Show QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-[8px] transition-colors">
                    <X className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
                {activeBusiness.shareToken ? (
                  <>
                    {/* QR Code View */}
                    <AnimatePresence>
                      {showQr && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-col items-center gap-4 py-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-[16px] border border-blue-100 dark:border-blue-900/20"
                        >
                          <div className="p-3 bg-white rounded-[12px] ">
                            <img src={qrUrl} alt="QR Code" className="w-32 h-32" />
                          </div>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Scan to view calendar</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Link Section */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest">Shortened Link</label>
                          {activeBusiness.shareAnalytics && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600">
                              <Eye className="w-3 h-3" />
                              {activeBusiness.shareAnalytics.views} views
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#37352F] dark:text-[#EBE9ED] bg-blue-50/30 dark:bg-blue-900/10 p-3 rounded-[12px] border border-blue-100 dark:border-blue-900/20 group">
                          <Link2 className="w-4 h-4 text-blue-500" />
                          <span className="truncate flex-1 font-bold text-blue-600 dark:text-blue-400">
                            {isGeneratingShort ? 'Generating...' : shortShareUrl || 'No short link'}
                          </span>
                          <button 
                            onClick={() => handleCopyLink(shortShareUrl)} 
                            disabled={!shortShareUrl}
                            className="p-2 hover:bg-white dark:hover:bg-[#2E2E2E] rounded-[8px] transition-all active:scale-90 disabled:opacity-50" 
                            title="Copy Short Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest px-1">Full Share URL</label>
                        <div className="flex items-center gap-2 text-[10px] text-[#757681] dark:text-[#9B9A97] bg-[#F7F7F5] dark:bg-[#202020] p-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] group">
                          <span className="truncate flex-1 font-medium">{shareUrl}</span>
                          <button onClick={() => handleCopyLink(shareUrl)} className="p-1.5 hover:bg-white dark:hover:bg-[#2E2E2E] rounded-[6px] transition-all active:scale-90" title="Copy Full Link">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Basic Settings */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest px-1">Access Type</label>
                        <select 
                          value={activeBusiness.shareRestriction || 'guest'}
                          onChange={(e) => handleUpdateField('shareRestriction', e.target.value)}
                          className="w-full p-3 text-sm rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                        >
                          <option value="guest">Public (No Login)</option>
                          <option value="authenticated">Private (Login Required)</option>
                        </select>
                      </div>
                    </div>

                    {/* Advanced Toggle */}
                    <button 
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between py-2 px-1 text-xs font-bold text-[#757681] hover:text-[#2383E2] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5" /> Link Security & Control
                      </span>
                      {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-5 pt-2"
                        >
                          {/* Password Protection */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest px-1 flex items-center gap-1.5">
                              <Lock className="w-3 h-3" /> Password Protection
                            </label>
                            <input 
                              type="password"
                              value={activeBusiness.sharePassword || ''}
                              onChange={(e) => handleUpdateField('sharePassword', e.target.value)}
                              placeholder="Set a password (optional)"
                              className="w-full p-3 text-sm rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>

                          {/* Expiration */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest px-1 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> Link Expiration
                            </label>
                            <div className="flex gap-2">
                              <select 
                                value={activeBusiness.shareExpiresAt ? 'custom' : 'never'}
                                onChange={(e) => {
                                  if (e.target.value === 'never') handleUpdateField('shareExpiresAt', null);
                                  else handleUpdateField('shareExpiresAt', addDays(new Date(), 7).toISOString());
                                }}
                                className="flex-1 p-3 text-sm rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="never">Never Expires</option>
                                <option value="custom">Expires on Date</option>
                              </select>
                              {activeBusiness.shareExpiresAt && (
                                <input 
                                  type="date"
                                  value={format(parseISO(activeBusiness.shareExpiresAt), 'yyyy-MM-dd')}
                                  onChange={(e) => handleUpdateField('shareExpiresAt', new Date(e.target.value).toISOString())}
                                  className="flex-1 p-3 text-sm rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                              )}
                            </div>
                          </div>

                          {/* Advanced Filtering */}
                          <div className="space-y-3 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                            <h4 className="text-[10px] font-black text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest flex items-center gap-1.5">
                              <Tags className="w-3 h-3" /> Advanced Filtering
                            </h4>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97]">Visible Outlets</label>
                              <div className="flex flex-wrap gap-2">
                                {['Rainbow Buildware', 'Rainbow Living Mall', 'Rainbow Office System'].map(outlet => {
                                  const isSelected = activeBusiness.shareFilters?.tags?.includes(outlet);
                                  return (
                                    <button
                                      key={outlet}
                                      onClick={() => {
                                        const currentTags = activeBusiness.shareFilters?.tags || [];
                                        const newTags = isSelected 
                                          ? currentTags.filter(t => t !== outlet)
                                          : [...currentTags, outlet];
                                        handleUpdateField('shareFilters', { ...activeBusiness.shareFilters, tags: newTags });
                                      }}
                                      className={cn(
                                        "px-2 py-1 rounded-[8px] text-[10px] font-bold transition-all border",
                                        isSelected 
                                          ? "bg-blue-500 border-blue-500 text-white" 
                                          : "bg-white dark:bg-[#191919] border-[#E9E9E7] dark:border-[#2E2E2E] text-[#757681]"
                                      )}
                                    >
                                      {outlet}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97]">Date Range (Optional)</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="date"
                                  value={activeBusiness.shareFilters?.dateRange?.start || ''}
                                  onChange={(e) => handleUpdateField('shareFilters', { 
                                    ...activeBusiness.shareFilters, 
                                    dateRange: { ...activeBusiness.shareFilters?.dateRange, start: e.target.value } 
                                  })}
                                  className="p-2 text-[10px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]"
                                />
                                <input 
                                  type="date"
                                  value={activeBusiness.shareFilters?.dateRange?.end || ''}
                                  onChange={(e) => handleUpdateField('shareFilters', { 
                                    ...activeBusiness.shareFilters, 
                                    dateRange: { ...activeBusiness.shareFilters?.dateRange, end: e.target.value } 
                                  })}
                                  className="p-2 text-[10px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-4 flex flex-col gap-3">
                      <button 
                        onClick={handleGenerateShareLink} 
                        className="w-full flex items-center justify-center gap-2 py-3 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-[12px] font-bold transition-all border border-blue-100 dark:border-blue-900/20"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate Link
                      </button>
                      <button 
                        onClick={handleRevoke} 
                        className="w-full flex items-center justify-center gap-2 py-3 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[12px] font-bold transition-all border border-red-100 dark:border-red-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke Access
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center mx-auto">
                      <Share2 className="w-10 h-10 text-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-lg">Share your schedule</h4>
                      <p className="text-sm text-[#757681] dark:text-[#9B9A97] max-w-[240px] mx-auto">Generate a secure link to share your content calendar with clients or team members.</p>
                    </div>
                    <button 
                      onClick={handleGenerateShareLink} 
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] text-sm font-bold transition-all   active:scale-95"
                    >
                      Generate Secure Link
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
