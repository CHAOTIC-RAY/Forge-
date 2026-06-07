import React from 'react';
import { Settings, Moon, Sun, RefreshCw } from 'lucide-react';

export function SettingsView({
  user,
  settingsTab,
  setSettingsTab,
  isDarkMode,
  toggleDarkMode,
  isSyncing,
  triggerManualSync,
}: any) {
  return (
    <div className="p-6 space-y-6 text-left max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-[#2665fd]" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Workspace Preferences</h2>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">Light / Dark Appearance</h4>
            <p className="text-[11px] text-gray-500">Toggle dark mode styles across the platform.</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 cursor-pointer text-gray-700 dark:text-zinc-300 transition"
            type="button"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">Data Synchronization</h4>
            <p className="text-[11px] text-gray-500">Manually trigger a sync with Firestore servers.</p>
          </div>
          <button
            onClick={triggerManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-[#2665fd]/10 text-[#2665fd] dark:text-blue-400 font-semibold text-xs py-1.5 px-3 rounded-lg hover:bg-[#2665fd]/20 transition cursor-pointer"
            type="button"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default SettingsView;
