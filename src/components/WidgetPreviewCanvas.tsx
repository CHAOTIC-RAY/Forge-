import React, { useState, useEffect } from 'react';
import { 
  Instagram, 
  Linkedin, 
  Facebook, 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  Share2, 
  Repeat2, 
  User, 
  Sparkles, 
  Check, 
  Eye, 
  Edit3, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface WidgetPreviewCanvasProps {
  text: string;
  onChangeText?: (newText: string) => void;
  businessName?: string;
  businessLogo?: string;
}

type PlatformType = 'instagram' | 'twitter' | 'linkedin' | 'facebook';

export function WidgetPreviewCanvas({
  text,
  onChangeText,
  businessName = 'My Business',
  businessLogo,
}: WidgetPreviewCanvasProps) {
  const [platform, setPlatform] = useState<PlatformType>('instagram');
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState(text);

  // Sync state if external text changes and we are not in edit mode
  useEffect(() => {
    if (!isEditing) {
      setEditableText(text);
    }
  }, [text, isEditing]);

  const handleTextUpdate = (val: string) => {
    setEditableText(val);
    if (onChangeText) {
      onChangeText(val);
    }
  };

  // Helper to extract hashtags or body text
  const getCleanTextAndHashtags = () => {
    const lines = editableText.split('\n');
    const hashtags: string[] = [];
    const bodyLines: string[] = [];

    lines.forEach(line => {
      if (line.trim().startsWith('#') || (line.trim() && line.split(' ').every(word => word.startsWith('#')))) {
        hashtags.push(...line.split(' ').filter(w => w.startsWith('#')));
      } else {
        bodyLines.push(line);
      }
    });

    return {
      body: bodyLines.join('\n').trim(),
      hashtags: hashtags.join(' ')
    };
  };

  const { body, hashtags } = getCleanTextAndHashtags();
  const textLength = editableText.length;
  const isOverTwitterLimit = platform === 'twitter' && textLength > 280;

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    toast.success("Mockup content copied to clipboard!");
  };

  return (
    <div className="w-full bg-[#F7F7F5] dark:bg-[#1C1C1E] border border-[#E9E9E7] dark:border-[#2E2E3E] rounded-[24px] overflow-hidden flex flex-col shadow-sm">
      {/* Platform selector header */}
      <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E3E] bg-[#FFFFFF] dark:bg-[#202024] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand" />
          <span className="text-xs font-bold text-[#37352F] dark:text-[#EBEBEB] uppercase tracking-wider">Live Preview Stream</span>
        </div>
        
        <div className="flex bg-[#F0F0EE] dark:bg-[#2E2E3E] p-1 rounded-[12px] gap-1">
          <button
            onClick={() => setPlatform('instagram')}
            className={cn(
              "p-2 rounded-[8px] transition-all flex items-center gap-1.5 text-xs font-black",
              platform === 'instagram'
                ? "bg-white dark:bg-[#202024] text-pink-600 shadow-sm"
                : "text-[#757681] hover:text-[#37352F] dark:hover:text-white"
            )}
            title="Instagram Card Preview"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Instagram</span>
          </button>
          
          <button
            onClick={() => setPlatform('twitter')}
            className={cn(
              "p-2 rounded-[8px] transition-all flex items-center gap-1.5 text-xs font-black",
              platform === 'twitter'
                ? "bg-white dark:bg-[#202024] text-neutral-900 dark:text-white shadow-sm"
                : "text-[#757681] hover:text-[#37352F] dark:hover:text-white"
            )}
            title="Twitter / X Card Preview"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
            <span className="hidden md:inline">X/Twitter</span>
          </button>

          <button
            onClick={() => setPlatform('linkedin')}
            className={cn(
              "p-2 rounded-[8px] transition-all flex items-center gap-1.5 text-xs font-black",
              platform === 'linkedin'
                ? "bg-white dark:bg-[#202024] text-blue-600 shadow-sm"
                : "text-[#757681] hover:text-[#37352F] dark:hover:text-white"
            )}
            title="LinkedIn Post Preview"
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span className="hidden md:inline">LinkedIn</span>
          </button>

          <button
            onClick={() => setPlatform('facebook')}
            className={cn(
              "p-2 rounded-[8px] transition-all flex items-center gap-1.5 text-xs font-black",
              platform === 'facebook'
                ? "bg-white dark:bg-[#202024] text-blue-800 shadow-sm"
                : "text-[#757681] hover:text-[#37352F] dark:hover:text-white"
            )}
            title="Facebook Feed Preview"
          >
            <Facebook className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Facebook</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "px-3 py-1.5 rounded-[8px] text-xs font-bold border transition-all flex items-center gap-1.5",
              isEditing 
                ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" 
                : "bg-white dark:bg-[#202024] text-[#757681] dark:text-[#EBEBEB] border-[#E9E9E7] dark:border-[#3E3E3E] hover:border-brand"
            )}
          >
            {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            {isEditing ? 'Done Editing' : 'Fine-Tune'}
          </button>
        </div>
      </div>

      {/* Editor & Preview Split Container */}
      <div className="flex flex-col lg:flex-row min-h-[460px] relative">
        
        {/* Editor (Visual side panel when editing is open) */}
        {isEditing && (
          <div className="w-full lg:w-1/3 p-5 border-b lg:border-b-0 lg:border-r border-[#E9E9E7] dark:border-[#2E2E3E] bg-white dark:bg-[#202024] flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#757681] uppercase tracking-widest">In-Place Editor</span>
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded",
                isOverTwitterLimit ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-gray-100 dark:bg-[#2E2E3E] text-[#757681]"
              )}>
                {textLength} chars
              </span>
            </div>
            <textarea
              value={editableText}
              onChange={(e) => handleTextUpdate(e.target.value)}
              placeholder="Refine copy directly in real-time..."
              className="flex-1 min-h-[250px] lg:min-h-0 bg-[#F7F7F5] dark:bg-[#1A1A1E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[16px] p-4 text-sm focus:border-brand outline-none transition-all text-[#37352F] dark:text-white resize-y"
            />
            {isOverTwitterLimit && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-[12px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  <strong>Twitter Character Limit Exceeded:</strong> X/Twitter limit is 280 characters. Standard accounts will fail to publish. Consider trimming or publishing as an image card.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Display Canvas */}
        <div className="flex-1 p-6 md:p-10 flex items-center justify-center relative">
          
          {/* Subtle decoration to look like mobile dashboard */}
          <div className="absolute top-2 left-6 text-[10px] font-mono text-[#757681]/40 select-none">
            MOCK_PLATFORM_STAGE // {platform.toUpperCase()}
          </div>

          <div className="w-full max-w-[440px] animate-in zoom-in-95 duration-500">
            
            {/* Instagram Mockup */}
            {platform === 'instagram' && (
              <div className="bg-white dark:bg-[#121214] border border-[#E9E9E7] dark:border-[#2D2D3E] rounded-[16px] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-[#222]">
                  <div className="flex items-center gap-2.5">
                    {businessLogo ? (
                      <img src={businessLogo} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-100 object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                        {businessName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-[#262626] dark:text-[#F5F5F5]">{businessName.toLowerCase().replace(/ /g, '_')}</h4>
                      <p className="text-[9px] text-[#8e8e8e] dark:text-[#a1a1a1]">Sponsored</p>
                    </div>
                  </div>
                  <button className="text-[#262626] dark:text-white font-bold tracking-widest text-xs pr-1">•••</button>
                </div>

                {/* Body Visual Placeholder */}
                <div className="aspect-square w-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 relative flex flex-col items-center justify-center border-b border-gray-50 dark:border-[#222]">
                  <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#2d2d3e_1px,transparent_1px)] [background-size:16px_16px] opacity-65" />
                  <div className="w-16 h-16 rounded-[20px] bg-white dark:bg-[#202024] shadow-md flex items-center justify-center shrink-0 border border-brand/10 z-10 animate-pulse">
                    <Instagram className="w-8 h-8 text-pink-500" />
                  </div>
                  <span className="text-[10px] font-bold text-brand mt-4 tracking-widest uppercase bg-white dark:bg-[#202024] px-3 py-1 rounded-full shadow-sm z-10 border border-[#E9E9E7] dark:border-[#2E2E3E]">
                    Preview Stage
                  </span>
                </div>

                {/* Actions */}
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[#262626] dark:text-[#EBEBEB]">
                      <Heart className="w-5 h-5 cursor-pointer hover:text-red-500 transition-colors" />
                      <MessageCircle className="w-5 h-5 cursor-pointer hover:text-brand transition-colors" />
                      <Send className="w-5 h-5 cursor-pointer hover:text-brand transition-colors" />
                    </div>
                    <Bookmark className="w-5 h-5 text-[#262626] dark:text-[#EBEBEB] cursor-pointer hover:text-brand transition-colors" />
                  </div>

                  {/* Likes count */}
                  <p className="text-xs font-bold text-[#262626] dark:text-[#F5F5F5]">1,248 likes</p>

                  {/* Post caption text container */}
                  <div className="text-xs text-[#262626] dark:text-[#E2E2E2] leading-relaxed">
                    <span className="font-bold mr-2 text-[#262626] dark:text-white">{businessName.toLowerCase().replace(/ /g, '_')}</span>
                    {isEditing ? (
                      <textarea
                        value={editableText}
                        onChange={(e) => handleTextUpdate(e.target.value)}
                        className="w-full mt-2 bg-[#F0F0EE]/45 dark:bg-[#202024] border border-brand/30 rounded-[8px] p-2 resize-none outline-none text-xs focus:ring-1 focus:ring-brand"
                        rows={4}
                      />
                    ) : (
                      <>
                        <span className="whitespace-pre-line">{body}</span>
                        {hashtags && (
                          <div className="text-blue-600 dark:text-blue-400 font-medium mt-2 cursor-pointer whitespace-nowrap overflow-x-auto no-scrollbar">
                            {hashtags}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Twitter/X Mockup */}
            {platform === 'twitter' && (
              <div className="bg-white dark:bg-[#15202B] border border-[#E9E9E7] dark:border-[#2E3C4E] rounded-[16px] p-5 shadow-xl">
                {/* Header info */}
                <div className="flex items-start gap-3">
                  {businessLogo ? (
                    <img src={businessLogo} alt="Avatar" className="w-10 h-10 rounded-full border object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white font-bold text-sm">
                      {businessName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-black dark:text-white truncate">{businessName}</h4>
                        <p className="text-xs text-gray-500 dark:text-[#8899A6] truncate">@{businessName.toLowerCase().replace(/ /g, '')} • 2m</p>
                      </div>
                      <span className="text-gray-400 dark:text-gray-500 cursor-pointer">•••</span>
                    </div>

                    {/* Content area */}
                    <div className="mt-3 text-sm text-[15px] text-gray-900 dark:text-[#E1E8ED] leading-relaxed whitespace-pre-line">
                      {isEditing ? (
                        <textarea
                          value={editableText}
                          onChange={(e) => handleTextUpdate(e.target.value)}
                          className="w-full bg-[#F0F0EE]/45 dark:bg-[#202024] border border-brand/30 rounded-[8px] p-2 resize-none outline-none text-sm focus:ring-1 focus:ring-brand text-black dark:text-white"
                          rows={4}
                        />
                      ) : (
                        editableText
                      )}
                    </div>

                    {/* Actions ribbon */}
                    <div className="flex items-center justify-between mt-4 text-gray-500 dark:text-[#8899A6] max-w-[320px]">
                      <div className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer text-xs">
                        <MessageCircle className="w-4 h-4" />
                        <span>4</span>
                      </div>
                      <div className="flex items-center gap-1.5 hover:text-green-500 cursor-pointer text-xs">
                        <Repeat2 className="w-4 h-4" />
                        <span>12</span>
                      </div>
                      <div className="flex items-center gap-1.5 hover:text-red-500 cursor-pointer text-xs">
                        <Heart className="w-4 h-4" />
                        <span>108</span>
                      </div>
                      <div className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer text-xs">
                        <Bookmark className="w-4 h-4" />
                        <span>24</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LinkedIn Mockup */}
            {platform === 'linkedin' && (
              <div className="bg-white dark:bg-[#1B2937] border border-[#E9E9E7] dark:border-[#2E3C4E] rounded-[16px] p-4 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {businessLogo ? (
                      <img src={businessLogo} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-[4px] bg-blue-700 flex items-center justify-center text-white font-bold text-base">
                        {businessName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-1">{businessName}</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">12,504 followers</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500">2h • Edited • 🌐</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-black dark:hover:text-white font-bold">•••</button>
                </div>

                {/* Content */}
                <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line mb-4">
                  {isEditing ? (
                    <textarea
                      value={editableText}
                      onChange={(e) => handleTextUpdate(e.target.value)}
                      className="w-full bg-[#F0F0EE]/45 dark:bg-[#202024] border border-brand/30 rounded-[8px] p-2 resize-none outline-none text-sm focus:ring-1 focus:ring-brand text-black dark:text-white"
                      rows={4}
                    />
                  ) : (
                    editableText
                  )}
                </div>

                {/* Reactions count */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 border-b border-gray-150 dark:border-gray-800 pb-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="flex -space-x-1">
                      <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold border border-white">👍</span>
                      <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold border border-white">👏</span>
                      <span className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center text-[8px] text-white font-bold border border-white">❤️</span>
                    </span>
                    <span>324</span>
                  </div>
                  <span>14 comments • 3 shares</span>
                </div>

                {/* Liked actions ribbon */}
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300 font-bold text-xs pt-1 px-1">
                  <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#2A3B4C] p-2 rounded transition-colors">
                    <span>👍</span> <span>Like</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#2A3B4C] p-2 rounded transition-colors">
                    <span>💬</span> <span>Comment</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#2A3B4C] p-2 rounded transition-colors">
                    <span>🔄</span> <span>Share</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#2A3B4C] p-2 rounded transition-colors">
                    <span>✉️</span> <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* Facebook Mockup */}
            {platform === 'facebook' && (
              <div className="bg-white dark:bg-[#242526] border border-[#E9E9E7] dark:border-[#3A3B3C] rounded-[16px] p-4 shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  {businessLogo ? (
                    <img src={businessLogo} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow border">
                      {businessName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-1">{businessName}</h4>
                    <p className="text-[11px] text-gray-500 dark:text-[#B0B3B8] flex items-center gap-1">
                      <span>Just now</span> • <span>👥</span>
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm text-[#050505] dark:text-[#E4E6EB] leading-relaxed whitespace-pre-line mb-4">
                  {isEditing ? (
                    <textarea
                      value={editableText}
                      onChange={(e) => handleTextUpdate(e.target.value)}
                      className="w-full bg-[#F0F0EE]/45 dark:bg-[#3A3B3C] border border-brand/30 rounded-[8px] p-2 resize-none outline-none text-sm focus:ring-1 focus:ring-brand text-black dark:text-white"
                      rows={4}
                    />
                  ) : (
                    editableText
                  )}
                </div>

                {/* Image Placeholder */}
                <div className="aspect-[16/9] w-full bg-gray-100 dark:bg-[#3A3B3C] rounded-[8px] overflow-hidden relative flex flex-col items-center justify-center mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#757681] dark:text-[#B0B3B8]">Image Stage</span>
                </div>

                {/* Reactions ribbon */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-[#B0B3B8] border-b border-gray-200 dark:border-[#3A3B3C] pb-2.5 mb-2.5">
                  <div className="flex items-center gap-1">
                    <span>❤️👍😮</span>
                    <span>186</span>
                  </div>
                  <span>42 Comments</span>
                </div>

                {/* Actions banner */}
                <div className="flex items-center justify-between font-semibold text-xs text-gray-600 dark:text-[#B0B3B8] px-2">
                  <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] p-2 rounded flex-1 justify-center transition-colors">
                    ▲ Like
                  </button>
                  <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] p-2 rounded flex-1 justify-center transition-colors">
                    💬 Comment
                  </button>
                  <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] p-2 rounded flex-1 justify-center transition-colors">
                    ↗ Share
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mockup actions footer */}
      <div className="px-5 py-3.5 bg-white dark:bg-[#202024] border-t border-[#E9E9E7] dark:border-[#2E2E3E] flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">
          *This preview uses smart styling rules to match actual mobile app layout streams closely.
        </p>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-none px-4 py-2 border border-[#E9E9E7] dark:border-[#3E3E3E] hover:border-brand rounded-[12px] bg-white dark:bg-[#1A1A1E] text-[#37352F] dark:text-[#EBEBEB] text-xs font-bold transition-all active:scale-95"
          >
            Copy Text
          </button>
        </div>
      </div>
    </div>
  );
}
