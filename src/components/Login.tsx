import React, { useState } from 'react';
import { Calendar as CalendarIcon, Wrench } from 'lucide-react';
import { ForgeLogo } from './ForgeLogo';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { MigrationTool } from './MigrationTool';

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled. Please keep the popup open to sign in.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your connection and try again.");
      } else if (err.message?.includes('INTERNAL ASSERTION FAILED')) {
        setError("A temporary authentication error occurred. Please try again.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1C1E] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#25282C] rounded-2xl p-8 border border-[#3F474F] shadow-2xl text-center">
        <div className="w-20 h-20 bg-transparent rounded-2xl flex items-center justify-center mx-auto mb-6 overflow-hidden">
          <ForgeLogo size={56} className="text-gray-300 p-2" />
        </div>
        <h1 className="text-3xl font-bold text-[#E3E2E6] mb-2">Forge</h1>
        <p className="text-[#909094] mb-8">Content Planner & Strategy Tool</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isSigningIn}
          className="w-full py-4 px-6 bg-[#E3E2E6] text-[#1A1C1E] rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-white transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          {isSigningIn ? 'Signing in...' : 'Continue with Google'}
        </button>
        
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="text-xs text-[#909094] hover:text-[#E3E2E6] transition-colors"
          >
            Reset App (Clear Cache)
          </button>
          
          <button
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="text-xs text-[#909094] hover:text-[#E3E2E6] transition-colors flex items-center justify-center gap-1"
          >
            <Wrench className="w-3 h-3" />
            Troubleshooting & Data Migration
          </button>
        </div>

        {showTroubleshooting && (
          <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5 text-left">
            <h3 className="text-xs font-bold text-[#E3E2E6] mb-3 uppercase tracking-wider">Migration Tool</h3>
            <p className="text-[10px] text-[#909094] mb-4">If your data is missing after a system update, use this tool to restore it from the legacy database.</p>
            <MigrationTool />
          </div>
        )}
        
        <p className="mt-8 text-xs text-[#909094]">
          Secure cloud storage powered by Firebase
        </p>
      </div>
    </div>
  );
}
