import React, { useState } from 'react';
import { Business } from '../data';
import { updateBusiness, createShortLinkWithTitle, getShortLinkByCode } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Share2,
  Copy,
  RefreshCw,
  Settings,
  X,
  Lock,
  Tags,
  Eye,
  QrCode,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  Link2,
  Shield,
  Globe,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';
import { getShareOutletOptions } from '../lib/shareUtils';

interface CalendarSharingProps {
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
}

export function CalendarSharing({ activeBusiness, onUpdateBusiness }: CalendarSharingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isGeneratingShort, setIsGeneratingShort] = useState(false);
  const brandKit = useAppStore((state) => state.brandKit);
  const outletOptions = getShareOutletOptions(brandKit);

  if (!activeBusiness) return null;

  const generateShortLink = async (longUrl: string) => {
    setIsGeneratingShort(true);
    try {
      let shortCode = '';
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        shortCode = Math.random().toString(36).substring(2, 8);
        const existing = await getShortLinkByCode(shortCode);
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate a unique short code.');
      }

      const id = uuidv4();
      await createShortLinkWithTitle(
        shortCode,
        longUrl,
        activeBusiness.id,
        undefined,
        `Calendar Share: ${activeBusiness.name}`,
        id
      );

      await updateBusiness(activeBusiness.id, { shareShortCode: shortCode });

      onUpdateBusiness({ ...activeBusiness, shareShortCode: shortCode });
      return shortCode;
    } catch (e) {
      console.error('Error generating short link', e);
      return null;
    } finally {
      setIsGeneratingShort(false);
    }
  };

  const handleGenerateShareLink = async () => {
    const token = uuidv4();
    try {
      const longUrl = `${window.location.origin}/share/${activeBusiness.id}/${token}`;
      const updates: Partial<Business> = {
        shareToken: token,
        shareRestriction: activeBusiness.shareRestriction || 'guest',
        shareAnalytics: { views: 0, lastViewedAt: undefined },
      };
      await updateBusiness(activeBusiness.id, updates);

      const shortCode = await generateShortLink(longUrl);
      if (shortCode) {
        updates.shareShortCode = shortCode;
      }

      onUpdateBusiness({ ...activeBusiness, ...updates });
      toast.success('Share link generated!');
    } catch (e) {
      console.error('Error generating share link', e);
      toast.error('Failed to generate share link.');
    }
  };

  const handleUpdateField = async (field: string, value: unknown) => {
    try {
      await updateBusiness(activeBusiness.id, { [field]: value } as Partial<Business>);
      onUpdateBusiness({ ...activeBusiness, [field]: value } as Business);
      toast.success('Settings updated!');
    } catch (e) {
      console.error(`Error updating ${field}`, e);
      toast.error('Failed to update settings.');
    }
  };

  const handleRevoke = async () => {
    try {
      const updates = {
        shareToken: null,
        shareShortCode: null,
      };
      await updateBusiness(activeBusiness.id, updates);
      onUpdateBusiness({ ...activeBusiness, ...updates });
      toast.success('Access revoked');
    } catch (e) {
      console.error('Error revoking access', e);
      toast.error('Failed to revoke access');
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const shareUrl = activeBusiness.shareToken
    ? `${window.location.origin}/share/${activeBusiness.id}/${activeBusiness.shareToken}`
    : '';

  const shortShareUrl = activeBusiness.shareShortCode
    ? `${window.location.origin}/s/${activeBusiness.shareShortCode}`
    : '';

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortShareUrl || shareUrl)}`;

  const isPrivate = activeBusiness.shareRestriction === 'authenticated';
  const hasPassword = Boolean(activeBusiness.sharePassword);
  const hasExpiry = Boolean(activeBusiness.shareExpiresAt);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'interactive focus-ring flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors min-h-[36px]',
          isOpen
            ? 'bg-brand text-white'
            : 'bg-brand/10 text-brand hover:bg-brand/15 border border-brand-border'
        )}
        title="Share Calendar"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Share</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] z-[60]"
              onClick={() => setIsOpen(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Calendar sharing"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'fixed md:absolute z-[70] md:z-50 overflow-hidden',
                'bottom-0 md:bottom-auto left-0 md:left-auto right-0 md:right-0 md:top-full md:mt-2',
                'w-full md:w-[420px]',
                'rounded-t-3xl md:rounded-2xl',
                'border border-[#E9E9E7] dark:border-[#2E2E2E]',
                'glass-card shadow-2xl'
              )}
            >
              <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#E9E9E7] dark:bg-[#3E3E3E]" aria-hidden />
              </div>

              <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F7F7F5]/80 dark:bg-[#202020]/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">Share calendar</h3>
                    <p className="text-[10px] text-secondary-safe truncate">{activeBusiness.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {activeBusiness.shareToken && (
                    <button
                      type="button"
                      onClick={() => setShowQr(!showQr)}
                      className={cn(
                        'interactive focus-ring p-2 rounded-lg transition-colors',
                        showQr
                          ? 'bg-brand/15 text-brand'
                          : 'hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#757681]'
                      )}
                      title="Show QR Code"
                      aria-pressed={showQr}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="interactive focus-ring p-2 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {activeBusiness.shareToken ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border',
                          isPrivate
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        )}
                      >
                        {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {isPrivate ? 'Login required' : 'Public link'}
                      </span>
                      {hasPassword && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-brand/10 text-brand border border-brand-border">
                          <Shield className="w-3 h-3" /> Password
                        </span>
                      )}
                      {hasExpiry && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#F7F7F5] dark:bg-[#202020] text-[#757681] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                          <Clock className="w-3 h-3" /> Expires {format(parseISO(activeBusiness.shareExpiresAt!), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    <AnimatePresence>
                      {showQr && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-col items-center gap-3 py-4 bg-brand/5 rounded-2xl border border-brand-border"
                        >
                          <div className="p-3 bg-white dark:bg-[#191919] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
                            <img src={qrUrl} alt="QR code for shared calendar link" className="w-32 h-32" />
                          </div>
                          <p className="text-[10px] font-bold text-brand uppercase tracking-widest">Scan to view calendar</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold text-secondary-safe uppercase tracking-widest">
                            Short link
                          </label>
                          {activeBusiness.shareAnalytics && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <Eye className="w-3 h-3" />
                              {activeBusiness.shareAnalytics.views} views
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-brand/5 p-3 rounded-xl border border-brand-border">
                          <Link2 className="w-4 h-4 text-brand shrink-0" />
                          <span className="truncate flex-1 font-semibold text-brand">
                            {isGeneratingShort ? 'Generating…' : shortShareUrl || 'No short link'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(shortShareUrl)}
                            disabled={!shortShareUrl}
                            className="interactive focus-ring p-2 hover:bg-white dark:hover:bg-[#2E2E2E] rounded-lg transition-colors disabled:opacity-50"
                            title="Copy short link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary-safe uppercase tracking-widest px-1">
                          Full URL
                        </label>
                        <div className="flex items-center gap-2 text-[10px] text-secondary-safe bg-[#F7F7F5] dark:bg-[#202020] p-2.5 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
                          <span className="truncate flex-1 font-medium">{shareUrl}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(shareUrl)}
                            className="interactive focus-ring p-1.5 hover:bg-white dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
                            title="Copy full link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary-safe uppercase tracking-widest px-1">
                        Access type
                      </label>
                      <select
                        value={activeBusiness.shareRestriction || 'guest'}
                        onChange={(e) => handleUpdateField('shareRestriction', e.target.value)}
                        className="focus-ring w-full p-3 text-sm rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] font-medium"
                      >
                        <option value="guest">Public (no login)</option>
                        <option value="authenticated">Private (login required)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="interactive focus-ring w-full flex items-center justify-between py-2 px-1 text-xs font-bold text-secondary-safe hover:text-brand transition-colors"
                      aria-expanded={showAdvanced}
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5" /> Security & filters
                      </span>
                      {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-5 pt-1"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-secondary-safe uppercase tracking-widest px-1 flex items-center gap-1.5">
                              <Lock className="w-3 h-3" /> Password protection
                            </label>
                            <input
                              type="password"
                              value={activeBusiness.sharePassword || ''}
                              onChange={(e) => handleUpdateField('sharePassword', e.target.value)}
                              placeholder="Optional password"
                              className="focus-ring w-full p-3 text-sm rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-secondary-safe uppercase tracking-widest px-1 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> Link expiration
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={activeBusiness.shareExpiresAt ? 'custom' : 'never'}
                                onChange={(e) => {
                                  if (e.target.value === 'never') handleUpdateField('shareExpiresAt', null);
                                  else handleUpdateField('shareExpiresAt', addDays(new Date(), 7).toISOString());
                                }}
                                className="focus-ring flex-1 p-3 text-sm rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]"
                              >
                                <option value="never">Never expires</option>
                                <option value="custom">Expires on date</option>
                              </select>
                              {activeBusiness.shareExpiresAt && (
                                <input
                                  type="date"
                                  value={format(parseISO(activeBusiness.shareExpiresAt), 'yyyy-MM-dd')}
                                  onChange={(e) =>
                                    handleUpdateField('shareExpiresAt', new Date(e.target.value).toISOString())
                                  }
                                  className="focus-ring flex-1 p-3 text-sm rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]"
                                />
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-2xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
                            <h4 className="text-[10px] font-bold text-secondary-safe uppercase tracking-widest flex items-center gap-1.5">
                              <Tags className="w-3 h-3" /> Visible outlets
                            </h4>

                            <div className="flex flex-wrap gap-2">
                              {outletOptions.map((outlet) => {
                                const isSelected = activeBusiness.shareFilters?.tags?.includes(outlet);
                                return (
                                  <button
                                    key={outlet}
                                    type="button"
                                    onClick={() => {
                                      const currentTags = activeBusiness.shareFilters?.tags || [];
                                      const newTags = isSelected
                                        ? currentTags.filter((t) => t !== outlet)
                                        : [...currentTags, outlet];
                                      handleUpdateField('shareFilters', {
                                        ...activeBusiness.shareFilters,
                                        tags: newTags,
                                      });
                                    }}
                                    className={cn(
                                      'interactive focus-ring px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors border',
                                      isSelected
                                        ? 'bg-brand border-brand text-white'
                                        : 'bg-white dark:bg-[#191919] border-[#E9E9E7] dark:border-[#2E2E2E] text-secondary-safe hover:border-brand-border'
                                    )}
                                  >
                                    {outlet}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-secondary-safe">Date range (optional)</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="date"
                                  value={activeBusiness.shareFilters?.dateRange?.start || ''}
                                  onChange={(e) =>
                                    handleUpdateField('shareFilters', {
                                      ...activeBusiness.shareFilters,
                                      dateRange: {
                                        ...activeBusiness.shareFilters?.dateRange,
                                        start: e.target.value,
                                      },
                                    })
                                  }
                                  className="focus-ring p-2 text-[10px] rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]"
                                />
                                <input
                                  type="date"
                                  value={activeBusiness.shareFilters?.dateRange?.end || ''}
                                  onChange={(e) =>
                                    handleUpdateField('shareFilters', {
                                      ...activeBusiness.shareFilters,
                                      dateRange: {
                                        ...activeBusiness.shareFilters?.dateRange,
                                        end: e.target.value,
                                      },
                                    })
                                  }
                                  className="focus-ring p-2 text-[10px] rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateShareLink}
                        className="interactive focus-ring w-full flex items-center justify-center gap-2 py-3 text-xs text-brand hover:bg-brand/5 rounded-xl font-bold transition-colors border border-brand-border"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate link
                      </button>
                      <button
                        type="button"
                        onClick={handleRevoke}
                        className="interactive focus-ring w-full flex items-center justify-center gap-2 py-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl font-bold transition-colors border border-red-100 dark:border-red-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke access
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center space-y-5">
                    <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto">
                      <Share2 className="w-8 h-8 text-brand" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-lg text-[#37352F] dark:text-[#EBE9ED]">Share your schedule</h4>
                      <p className="text-sm text-secondary-safe max-w-[260px] mx-auto leading-relaxed">
                        Generate a secure link to share your content calendar with clients or team members.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateShareLink}
                      className="interactive focus-ring w-full py-3.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      Generate secure link
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
