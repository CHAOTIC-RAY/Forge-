import React, { useState } from 'react';
import { Business } from '../data';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Trash2, Edit2, Save, Shield, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface WorkspacesSettingsProps {
  businesses: Business[];
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
  setActiveTab?: (tab: string) => void;
  setActiveBusiness?: (biz: Business) => void;
}

interface WorkspacesSettingsProps {
  businesses: Business[];
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
}

export function WorkspacesSettings({ businesses, activeBusiness, onUpdateBusiness, setActiveTab, setActiveBusiness }: WorkspacesSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('');
  const [editSecondaryColor, setEditSecondaryColor] = useState('');
  const [editAccentColor, setEditAccentColor] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editTargetUrl, setEditTargetUrl] = useState('');

  const handleEdit = (biz: Business) => {
    setEditingId(biz.id);
    setEditName(biz.name);
    setEditIndustry(biz.industry || '');
    setEditPrimaryColor(biz.brandColors?.primary || '#000000');
    setEditSecondaryColor(biz.brandColors?.secondary || '#000000');
    setEditAccentColor(biz.brandColors?.accent || '#000000');
    setEditLogoUrl(biz.logoUrl || '');
    setEditTargetUrl(biz.targetUrl || '');
  };

  const handleSave = async (id: string) => {
    try {
      await updateDoc(doc(db, 'businesses', id), {
        name: editName,
        industry: editIndustry,
        brandColors: {
          primary: editPrimaryColor,
          secondary: editSecondaryColor,
          accent: editAccentColor
        },
        logoUrl: editLogoUrl,
        targetUrl: editTargetUrl,
        updatedAt: new Date().toISOString()
      });
      onUpdateBusiness({ 
        ...businesses.find(b => b.id === id)!, 
        name: editName, 
        industry: editIndustry,
        brandColors: { primary: editPrimaryColor, secondary: editSecondaryColor, accent: editAccentColor },
        logoUrl: editLogoUrl,
        targetUrl: editTargetUrl
      });
      setEditingId(null);
      toast.success("Workspace updated!");
    } catch (e) {
      console.error("Error updating business", e);
      toast.error("Failed to update workspace.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'businesses', id));
      toast.success("Workspace deleted!");
    } catch (e) {
      console.error("Error deleting business", e);
      toast.error("Failed to delete workspace.");
    }
  };

  const handleManageTeam = (biz: Business) => {
    if (setActiveBusiness && setActiveTab) {
      setActiveBusiness(biz);
      setTimeout(() => setActiveTab('workspace_management'), 50);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* Workspace Details */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-brand" />
          <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Workspace Details</h2>
        </div>
        <div className="grid gap-4">
          {businesses.map(biz => (
            <div key={biz.id} className="group relative p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] transition-all hover:shadow-md">
              {editingId === biz.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#757681] uppercase ml-1">Workspace Name</label>
                      <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="w-full p-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-sm focus:ring-2 focus:ring-brand/20 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#757681] uppercase ml-1">Industry</label>
                      <input value={editIndustry} onChange={e => setEditIndustry(e.target.value)} placeholder="Industry" className="w-full p-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-sm focus:ring-2 focus:ring-brand/20 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#757681] uppercase ml-1">Target Website URL</label>
                    <input value={editTargetUrl} onChange={e => setEditTargetUrl(e.target.value)} placeholder="https://example.com" className="w-full p-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-sm focus:ring-2 focus:ring-brand/20 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#757681] uppercase ml-1">Logo URL</label>
                    <input value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} placeholder="https://..." className="w-full p-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-sm focus:ring-2 focus:ring-brand/20 outline-none" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <input type="color" value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded-full cursor-pointer overflow-hidden" />
                        <span className="text-[9px] font-bold text-[#757681]">Primary</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <input type="color" value={editSecondaryColor} onChange={e => setEditSecondaryColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded-full cursor-pointer overflow-hidden" />
                        <span className="text-[9px] font-bold text-[#757681]">Secondary</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <input type="color" value={editAccentColor} onChange={e => setEditAccentColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded-full cursor-pointer overflow-hidden" />
                        <span className="text-[9px] font-bold text-[#757681]">Accent</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold text-[#757681] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[8px] transition-all">Cancel</button>
                      <button onClick={() => handleSave(biz.id)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-xs font-bold rounded-[8px] hover:bg-brand-hover transition-all shadow-lg shadow-brand/20">
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {biz.logoUrl ? (
                      <img src={biz.logoUrl} alt={biz.name} className="w-12 h-12 rounded-[12px] object-contain bg-[#F7F7F5] dark:bg-[#202020] p-2 border border-[#E9E9E7] dark:border-[#2E2E2E]" />
                    ) : (
                      <div className="w-12 h-12 rounded-[12px] bg-brand/10 flex items-center justify-center text-brand font-bold text-xl">
                        {biz.name[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED]">{biz.name}</h3>
                      <p className="text-xs text-[#757681] dark:text-[#9B9A97]">{biz.industry || 'No industry set'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleManageTeam(biz)} className="p-2 text-brand hover:bg-brand/10 rounded-[8px] transition-all" title="Manage Team & Permissions"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(biz)} className="p-2 text-[#757681] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[8px] transition-all" title="Edit Workspace"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(biz.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[8px] transition-all" title="Delete Workspace"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

