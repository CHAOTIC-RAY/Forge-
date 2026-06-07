import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export function WorkspaceManagementTab({ activeBusiness, onUpdateBusiness, setActiveTab }: any) {
  const [workspaceName, setWorkspaceName] = useState(activeBusiness?.name || '');
  const [industry, setIndustry] = useState(activeBusiness?.industry || '');

  const handleSave = () => {
    if (!activeBusiness) return;
    onUpdateBusiness({
      ...activeBusiness,
      name: workspaceName,
      industry,
    });
    toast.success('Workspace updated successfully!');
  };

  return (
    <div className="p-6 space-y-6 text-left max-w-2xl">
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-[#2665fd]" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Workspace Settings</h2>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company / Workspace Name</label>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Industry Sector</label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="bg-[#2665fd] hover:bg-[#2665fd]/95 text-white font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition shadow-sm"
          type="button"
        >
          Save Details
        </button>
      </div>
    </div>
  );
}
export default WorkspaceManagementTab;
