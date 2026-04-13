import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Copy, Check, ExternalLink, Trash2, Plus, RefreshCw, BarChart3, Globe, Edit2, X, Save } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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

    const q = query(collection(db, 'short_links'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const linksList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShortLink));
      setLinks(linksList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [businessId]);

  const generateShortCode = () => {
    return Math.random().toString(36).substring(2, 6); // Shorter slug (4 chars)
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
      
      // Check if slug exists
      const q = query(collection(db, 'short_links'), where('shortCode', '==', shortCode));
      const existing = await getDocs(q);
      if (!existing.empty) {
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

      const newLink = {
        id,
        title: newTitle.trim() || fallbackTitle,
        originalUrl: url,
        shortCode,
        businessId,
        clicks: 0,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'short_links', id), newLink);
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
      await deleteDoc(doc(db, 'short_links', id));
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editUrl) return;

    let url = editUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      let fallbackTitle = url;
      try {
        fallbackTitle = new URL(url).hostname;
      } catch (e) {
        fallbackTitle = url.split('://')[1]?.split('/')[0] || url;
      }

      await updateDoc(doc(db, 'short_links', editingId), {
        originalUrl: url,
        title: editTitle.trim() || fallbackTitle
      });
      setEditingId(null);
      toast.success('Link updated!');
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    const shortUrl = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-[#191919] rounded-3xl border border-slate-200 dark:border-[#2E2E2E] overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 dark:border-[#2E2E2E] flex items-center justify-between bg-slate-50/50 dark:bg-[#202020]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Link2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Link Shortener</h3>
            <p className="text-xs text-slate-500">Trackable campaign links</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Link Title (Optional)</label>
              <input 
                type="text"
                placeholder="e.g. Summer Campaign"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-[#2E2E2E] bg-slate-50 dark:bg-[#202020]/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Custom Slug (Optional)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">/s/</span>
                <input 
                  type="text"
                  placeholder="my-link"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-[#2E2E2E] bg-slate-50 dark:bg-[#202020]/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Paste long URL here..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-[#2E2E2E] bg-slate-50 dark:bg-[#202020]/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={!newUrl || isCreating}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isCreating ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={32} className="animate-spin" />
              <p className="text-sm font-medium">Loading links...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-[#202020] flex items-center justify-center text-slate-300">
                <Link2 size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">No short links yet</p>
                <p className="text-xs text-slate-500 max-w-[200px] mx-auto mt-1">Create your first trackable link to start measuring campaign performance.</p>
              </div>
            </div>
          ) : (
            links.map((link) => (
              <motion.div 
                key={link.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group p-4 rounded-2xl border border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
              >
                {editingId === link.id ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Title</label>
                        <input 
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2E2E2E] bg-slate-50 dark:bg-[#202020]/50 focus:border-indigo-500 outline-none transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Original URL</label>
                        <input 
                          type="text"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2E2E2E] bg-slate-50 dark:bg-[#202020]/50 focus:border-indigo-500 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2E2E2E] rounded-xl transition-all flex items-center gap-2"
                      >
                        <X size={14} /> Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{link.title || 'Untitled Link'}</p>
                        <p className="text-[10px] text-slate-400 truncate font-medium">{link.originalUrl}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#202020] text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <BarChart3 size={12} />
                          {link.clicks} clicks
                        </div>
                        <button 
                          onClick={() => startEditing(link)}
                          className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                          title="Edit Link"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(link.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="Delete Link"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#2E2E2E] font-mono text-xs text-slate-600 dark:text-slate-300 truncate">
                        {window.location.origin}/s/{link.shortCode}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(link.shortCode, link.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-xs",
                          copiedId === link.id 
                            ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                        )}
                      >
                        {copiedId === link.id ? <Check size={16} /> : <Copy size={16} />}
                        {copiedId === link.id ? 'Copied' : 'Copy Link'}
                      </button>
                      <a 
                        href={link.originalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-[#3E3E3E]"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
