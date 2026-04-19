import React, { useState, useEffect } from 'react';
import { Business } from '../data';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayRemove, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Users, Shield, UserPlus, Check, XCircle, Clock, Trash2, ArrowLeft } from 'lucide-react';
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

interface WorkspaceManagementTabProps {
  activeBusiness: Business | null;
  onUpdateBusiness: (business: Business) => void;
  setActiveTab: (tab: any) => void;
}

export function WorkspaceManagementTab({ activeBusiness, onUpdateBusiness, setActiveTab }: WorkspaceManagementTabProps) {
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
      
      const updatedMembers = activeBusiness.members?.filter((m: string) => m !== userId) || [];
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

  if (!activeBusiness) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#757681]">
        <p>No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-transparent relative">
      <div className="p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('settings')}
            className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-[8px] transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-[#757681]" />
          </button>
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-[16px] flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] tracking-tight hover:underline cursor-pointer" onClick={() => setActiveTab('settings')}>{activeBusiness.name}</h1>
            <p className="text-sm text-[#757681] dark:text-[#9B9A97] mt-1">Manage team members, roles, and access requests.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8 max-w-4xl mx-auto pb-20 w-full">
        {/* Access Requests */}
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
              <div className="p-8 border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] text-center bg-white dark:bg-[#191919]">
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

        {/* Member Management */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-widest">Team Members</h2>
          </div>
          <div className="bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden">
            <div className="divide-y divide-[#E9E9E7] dark:divide-[#2E2E2E]">
              {activeBusiness.members?.map((memberId: string) => {
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
                          className="text-xs font-bold bg-transparent border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[6px] px-2 py-1 outline-none focus:ring-2 focus:ring-brand/20 dark:text-[#EBE9ED]"
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
      </div>
    </div>
  );
}
