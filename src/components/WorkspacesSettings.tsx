import React, { useState } from 'react';
import { Business } from '../data';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Trash2, Edit2, Save, X } from 'lucide-react';

interface WorkspacesSettingsProps {
  businesses: Business[];
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
}

export function WorkspacesSettings({ businesses, activeBusiness, onUpdateBusiness }: WorkspacesSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOneDriveOpen, setIsOneDriveOpen] = useState(false);
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

  const handleConnectOneDrive = async (credentials: { clientId: string; clientSecret: string; tenantId: string }) => {
    if (!activeBusiness) return;
    try {
      const oneDriveCredentials = {
        ...credentials,
        connectedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        oneDriveCredentials,
        updatedAt: new Date().toISOString()
      });
      onUpdateBusiness({ ...activeBusiness, oneDriveCredentials });
      setIsOneDriveOpen(false);
      toast.success("OneDrive connected successfully!");
    } catch (e) {
      console.error("Error connecting OneDrive", e);
      toast.error("Failed to connect OneDrive.");
    }
  };

  const handleDisconnectOneDrive = async () => {
    if (!activeBusiness) return;
    try {
      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        oneDriveCredentials: null,
        updatedAt: new Date().toISOString()
      });
      onUpdateBusiness({ ...activeBusiness, oneDriveCredentials: undefined });
      toast.success("OneDrive disconnected.");
    } catch (e) {
      console.error("Error disconnecting OneDrive", e);
      toast.error("Failed to disconnect OneDrive.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest px-1">Workspace Management</h2>
        {businesses.map(biz => (
          <div key={biz.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px]">
            {editingId === biz.id ? (
              <div className="flex-1 flex flex-col gap-2">
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="p-2 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]" />
                <input value={editIndustry} onChange={e => setEditIndustry(e.target.value)} placeholder="Industry" className="p-2 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]" />
                <input value={editTargetUrl} onChange={e => setEditTargetUrl(e.target.value)} placeholder="Target Website URL (e.g., https://example.com)" className="p-2 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]" />
                <input value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} placeholder="Logo URL" className="p-2 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]" />
                <div className="flex gap-2">
                  <input type="color" value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="w-10 h-10 p-1 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]" />
                  <input type="color" value={editSecondaryColor} onChange={e => setEditSecondaryColor(e.target.value)} className="w-10 h-10 p-1 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]" />
                  <input type="color" value={editAccentColor} onChange={e => setEditAccentColor(e.target.value)} className="w-10 h-10 p-1 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(biz.id)} className="p-2 text-green-600"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setEditingId(null)} className="p-2 text-red-600"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{biz.name}</h3>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97]">{biz.industry}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(biz)} className="p-2 text-[#757681] dark:text-[#9B9A97]"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(biz.id)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
