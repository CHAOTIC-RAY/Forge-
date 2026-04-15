import React, { useState, useEffect } from 'react';
import { Business } from '../data';
import { doc, updateDoc, deleteDoc, collection, query, where, onSnapshot, arrayRemove, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Trash2, Edit2, Save, X, Users, Shield, UserPlus, Check, XCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface AccessRequest {
  id: string;
  businessId: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface WorkspacesSettingsProps {
  businesses: Business[];
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
}

export function WorkspacesSettings({ businesses, activeBusiness, onUpdateBusiness }: WorkspacesSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('');
  const [editSecondaryColor, setEditSecondaryColor] = useState('');
  const [editAccentColor, setEditAccentColor] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editTargetUrl, setEditTargetUrl] = useState('');
  
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (!activeBusiness) return;
    setLoadingRequests(true);
    const q = query(collection(db, 'access_requests'), where('businessId', '==', activeBusiness.id), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccessRequest));
      setRequests(reqs);
      setLoadingRequests(false);
    });
    return () => unsubscribe();
  }, [activeBusiness?.id]);

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

  const handleUpdateRole = async (userId: string, role: 'admin' | 'editor' | 'viewer') => {
    if (!activeBusiness) return;
    try {
      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        [`memberRoles.${userId}`]: role
      });
      onUpdateBusiness({
        ...activeBusiness,
        memberRoles: { ...(activeBusiness.memberRoles || {}), [userId]: role }
      });
      toast.success(`Role updated to ${role}`);
    } catch (e) {
      console.error("Error updating role", e);
      toast.error("Failed to update role.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeBusiness) return;
    if (!window.confirm("Remove this member from the workspace?")) return;
    try {
      await updateDoc(doc(db, 'businesses', activeBusiness.id), {
        members: arrayRemove(userId),
        [`memberRoles.${userId}`]: deleteField()
      });
      
      const updatedMembers = activeBusiness.members?.filter(m => m !== userId) || [];
      const updatedRoles = { ...activeBusiness.memberRoles };
      delete updatedRoles[userId];
      
      onUpdateBusiness({
        ...activeBusiness,
        members: updatedMembers,
        memberRoles: updatedRoles
      });
      
      toast.success("Member removed");
    } catch (e) {
      console.error("Error removing member", e);
      toast.error("Failed to remove member.");
    }
  };

  const handleHandleRequest = async (requestId: string, userId: string, status: 'approved' | 'rejected') => {
    if (!activeBusiness) return;
    try {
      await updateDoc(doc(db, 'access_requests', requestId), { status });
      if (status === 'approved') {
        await updateDoc(doc(db, 'businesses', activeBusiness.id), {
          [`memberRoles.${userId}`]: 'editor' // Upgrade to editor on approval
        });
        toast.success("Access request approved!");
      } else {
        toast.info("Access request rejected.");
      }
    } catch (e) {
      console.error("Error handling request", e);
      toast.error("Failed to process request.");
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
                    <button onClick={() => handleEdit(biz)} className="p-2 text-[#757681] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-[8px] transition-all" title="Edit Workspace"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(biz.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[8px] transition-all" title="Delete Workspace"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Access Requests */}
      {activeBusiness && (
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Pending Access Requests</h2>
            </div>
            {requests.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded-full">
                {requests.length} New
              </span>
            )}
          </div>
          <div className="grid gap-3">
            {requests.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] text-center">
                <Clock className="w-8 h-8 text-[#757681]/20 mx-auto mb-2" />
                <p className="text-xs text-[#757681] dark:text-[#9B9A97]">No pending requests</p>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                      {req.userName[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{req.userName}</h4>
                      <p className="text-xs text-[#757681]">{req.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleHandleRequest(req.id, req.userId, 'rejected')}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[10px] transition-all"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleHandleRequest(req.id, req.userId, 'approved')}
                      className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-[10px] transition-all"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Member Management */}
      {activeBusiness && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Team Members</h2>
          </div>
          <div className="bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden">
            <div className="divide-y divide-[#E9E9E7] dark:divide-[#2E2E2E]">
              {activeBusiness.members?.map(memberId => {
                const role = activeBusiness.memberRoles?.[memberId] || (activeBusiness.ownerId === memberId ? 'admin' : 'viewer');
                const isOwner = activeBusiness.ownerId === memberId;
                
                return (
                  <div key={memberId} className="flex items-center justify-between p-4 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E9E9E7] dark:bg-[#2E2E2E] flex items-center justify-center text-[10px] font-bold">
                        UID
                      </div>
                      <div>
                        <p className="text-sm font-medium">{memberId === activeBusiness.ownerId ? 'Workspace Owner' : `Member (${memberId.substring(0, 6)}...)`}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                            role === 'admin' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" :
                            role === 'editor' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                            "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}>
                            {role}
                          </span>
                          {isOwner && <span className="text-[10px] text-brand font-bold uppercase tracking-wider">• Owner</span>}
                        </div>
                      </div>
                    </div>
                    
                    {!isOwner && (
                      <div className="flex items-center gap-2">
                        <select 
                          value={role}
                          onChange={(e) => handleUpdateRole(memberId, e.target.value as any)}
                          className="text-xs font-bold bg-transparent border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[6px] px-2 py-1 outline-none focus:ring-2 focus:ring-brand/20"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button 
                          onClick={() => handleRemoveMember(memberId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[6px] transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 bg-[#F7F7F5] dark:bg-[#202020] border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <button className="flex items-center gap-2 text-xs font-bold text-brand hover:text-brand-hover transition-colors">
                <UserPlus className="w-4 h-4" />
                Invite via Email (Coming Soon)
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

