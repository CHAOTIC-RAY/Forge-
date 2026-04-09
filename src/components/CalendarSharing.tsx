import React, { useState } from 'react';
import { Business } from '../data';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Share2, Copy, RefreshCw, Settings, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CalendarSharingProps {
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
}

export function CalendarSharing({ activeBusiness, onUpdateBusiness }: CalendarSharingProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!activeBusiness) return null;

  const handleGenerateShareLink = async () => {
    const token = uuidv4();
    try {
      await updateDoc(doc(db, 'businesses', activeBusiness.id), { shareToken: token, shareRestriction: 'guest' });
      onUpdateBusiness({ ...activeBusiness, shareToken: token, shareRestriction: 'guest' });
      toast.success("Share link generated!");
    } catch (e) {
      console.error("Error generating share link", e);
      toast.error("Failed to generate share link.");
    }
  };

  const handleUpdateRestriction = async (restriction: 'guest' | 'authenticated') => {
    try {
      await updateDoc(doc(db, 'businesses', activeBusiness.id), { shareRestriction: restriction });
      onUpdateBusiness({ ...activeBusiness, shareRestriction: restriction });
      toast.success(`Restriction updated to ${restriction}!`);
    } catch (e) {
      console.error("Error updating restriction", e);
      toast.error("Failed to update restriction.");
    }
  };

  const handleCopyLink = () => {
    if (!activeBusiness.shareToken) return;
    const shareUrl = `${window.location.origin}/share/${activeBusiness.id}/${activeBusiness.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 md:px-1.5 py-1.5 hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] transition-colors rounded-md"
        title="Share Calendar"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-xs font-medium md:hidden">Share Schedule</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[60] md:hidden" 
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed md:absolute bottom-0 md:bottom-auto left-0 md:left-auto right-0 md:right-0 md:top-full mt-0 md:mt-2 w-full md:w-80 bg-white dark:bg-[#191919] border-t md:border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-t-2xl md:rounded-xl shadow-2xl md:shadow-xl z-[70] md:z-50 p-6 md:p-4 space-y-4 animate-in slide-in-from-bottom md:slide-in-from-top duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-500" /> Calendar Sharing
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-full transition-colors">
                <X className="w-5 h-5 md:w-4 md:h-4" />
              </button>
            </div>
            
            {activeBusiness.shareToken ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Share Link</label>
                  <div className="flex items-center gap-2 text-xs text-[#787774] dark:text-[#9B9A97] bg-[#F7F7F5] dark:bg-[#202020] p-3 md:p-2 rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <span className="truncate flex-1">{`${window.location.origin}/share/${activeBusiness.id}/${activeBusiness.shareToken}`}</span>
                    <button onClick={handleCopyLink} className="p-2 md:p-1 hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] rounded transition-colors" title="Copy Link">
                      <Copy className="w-4 h-4 md:w-3 md:h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Access Restriction</label>
                  <select 
                    value={activeBusiness.shareRestriction || 'guest'}
                    onChange={(e) => handleUpdateRestriction(e.target.value as 'guest' | 'authenticated')}
                    className="w-full p-3 md:p-2 text-sm rounded-lg border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="guest">Guest (No Login Required)</option>
                    <option value="authenticated">Guest + Logged In Only</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleGenerateShareLink} 
                    className="w-full flex items-center justify-center gap-2 py-3 md:py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Regenerate Share Link
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={handleGenerateShareLink} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
              >
                Generate Share Link
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
