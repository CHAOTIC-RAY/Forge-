import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Copy, Check, ExternalLink, Trash2, Plus, RefreshCw, BarChart3, Globe, Edit2, X, Save } from 'lucide-react';
import {
  subscribeToShortLinks,
  createShortLinkWithTitle,
  deleteShortLink,
  updateShortLink,
  getShortLinkByCode,
  type ShortLink as SupabaseShortLink,
} from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface ShortLink {
  id: string;
  title: string;
  originalUrl: string;
  shortCode: string;
  businessId: string;
  clicks: number;
  createdAt: string;
}

function mapShortLink(link: SupabaseShortLink): ShortLink {
  return {
    id: link.id,
    title: (link as SupabaseShortLink & { title?: string }).title || link.original_url,
    originalUrl: link.original_url,
    shortCode: link.short_code,
    businessId: link.business_id || '',
    clicks: link.clicks,
    createdAt: link.created_at,
  };
}

interface LinkShortenerProps {
  businessId: string;
}

export function LinkShortener({ businessId }: LinkShortenerProps) {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (!businessId) return;

    const unsubscribe = subscribeToShortLinks(businessId, (rows) => {
      const linksList = rows.map(mapShortLink);
      setLinks(linksList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [businessId]);

  const generateShortCode = () => {
    return Math.random().toString(36).substring(2, 6);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    let url = newUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setIsCreating(true);
    try {
      const id = uuidv4();
      const shortCode = customSlug.trim() || generateShortCode();
      
      const existing = await getShortLinkByCode(shortCode);
      if (existing) {
        toast.error('This custom slug is already taken');
        setIsCreating(false);
        return;
      }

      let fallbackTitle = url;
      try {
        fallbackTitle = new URL(url).hostname;
      } catch (e) {
        fallbackTitle = url.split('://')[1]?.split('/')[0] || url;
      }

      await createShortLinkWithTitle(
        shortCode,
        url,
        businessId,
        undefined,
        newTitle.trim() || fallbackTitle,
        id
      );
      setNewUrl('');
      setNewTitle('');
      setCustomSlug('');
      toast.success('Short link created!');
    } catch (error) {
      console.error("Failed to create short link", error);
      toast.error('Failed to create short link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShortLink(id);
      toast.success('Link deleted');
    } catch (error) {
      toast.error('Failed to delete link');
    }
  };

  const startEditing = (link: ShortLink) => {
    setEditingId(link.id);
    setEditUrl(link.originalUrl);
    setEditTitle(link.title || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateShortLink(editingId, {
        original_url: editUrl,
        title: editTitle,
      });
      setEditingId(null);
      toast.success('Link updated');
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const shortUrl = (code: string) => `${window.location.origin}/s/${code}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <form onSubmit={handleCreate} className="p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" /> Create Short Link
        </h3>
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://example.com/long-url"
          className="w-full p-3 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-sm"
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full p-3 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-sm"
          />
          <input
            type="text"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
            placeholder="Custom slug (optional)"
            className="w-full p-3 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="w-full py-3 bg-brand text-white rounded-[12px] text-sm font-bold disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : 'Create Link'}
        </button>
      </form>

      <div className="space-y-3">
        {links.length === 0 ? (
          <div className="text-center p-8 text-[#757681] text-sm">No short links yet</div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px]"
            >
              {editingId === link.id ? (
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-2 rounded-[8px] border text-sm"
                    placeholder="Title"
                  />
                  <input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full p-2 rounded-[8px] border text-sm"
                    placeholder="URL"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="px-3 py-1.5 bg-brand text-white rounded-[8px] text-xs font-bold">
                      <Save className="w-3.5 h-3.5 inline mr-1" /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-bold">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link2 className="w-4 h-4 text-brand shrink-0" />
                      <h4 className="font-bold text-sm truncate">{link.title}</h4>
                    </div>
                    <p className="text-xs text-brand font-mono truncate">{shortUrl(link.shortCode)}</p>
                    <p className="text-[10px] text-[#757681] truncate mt-1">{link.originalUrl}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#757681]">
                      <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {link.clicks} clicks</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => copyToClipboard(shortUrl(link.shortCode), link.id)}
                      className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[8px]"
                      title="Copy"
                    >
                      {copiedId === link.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={shortUrl(link.shortCode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[8px]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={() => startEditing(link)} className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[8px]">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(link.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-[8px]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
