import React, { useState } from 'react';
import { X, Cloud, Key, Shield, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface OneDriveSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: { clientId: string; clientSecret: string; tenantId: string }) => void;
  isConnected: boolean;
  onDisconnect: () => void;
}

export const OneDriveSetup: React.FC<OneDriveSetupProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnected,
  onDisconnect
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tenantId, setTenantId] = useState('common');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#191919] w-full max-w-md rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]  overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-[12px] flex items-center justify-center text-blue-500">
              <Cloud className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">OneDrive Setup</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isConnected ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-[12px] border border-green-100 dark:border-green-900/30 flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">OneDrive is currently connected and syncing.</p>
              </div>
              <button
                onClick={onDisconnect}
                className="w-full py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[12px] font-bold transition-all border border-red-100 dark:border-red-900/30"
              >
                Disconnect OneDrive
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-[12px] border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  To connect OneDrive, you need to create an application in the Azure Portal and provide the credentials below.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#9B9A97] uppercase tracking-wider mb-1.5">Client ID</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Enter Azure Client ID"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9B9A97] uppercase tracking-wider mb-1.5">Client Secret</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                    <input
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Enter Azure Client Secret"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9B9A97] uppercase tracking-wider mb-1.5">Tenant ID</label>
                  <div className="relative">
                    <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                    <input
                      type="text"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      placeholder="Enter Tenant ID (default: common)"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => onConnect({ clientId, clientSecret, tenantId })}
                disabled={!clientId || !clientSecret}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[12px] font-bold transition-all   mt-4"
              >
                Connect OneDrive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
