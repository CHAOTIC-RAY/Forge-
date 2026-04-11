import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Wrench } from 'lucide-react';
import { ForgeLogo, ScribbleFlame } from './ForgeLogo';
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
    <div className="min-h-screen bg-[#1A1C1E] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ScribbleFlame />
      </div>
      
      {/* Fluted Glass Overlay - Improved with multiple layers for depth */}
      <div className="fixed inset-0 z-10">
        {/* Base blur layer */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[25px]" />
        
        {/* Vertical fluted lines layer */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_0%,transparent_45%,rgba(255,255,255,0.1)_50%,transparent_55%,transparent_100%)] bg-[length:20px_100%]" />
        
        {/* Subtle noise/texture layer */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
        
        {/* Vignette for focus */}
        <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)" />
      </div>

      <div className="max-w-md w-full bg-[#25282C]/40 backdrop-blur-2xl rounded-[32px] p-12 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] text-center relative z-20 overflow-hidden">
        {/* Inner glow for the card */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="w-24 h-24 bg-white/5 backdrop-blur-sm rounded-[24px] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner">
          <ForgeLogo size={64} className="text-white p-2" />
        </div>
        <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Forge</h1>
        <p className="text-gray-400 mb-10 text-lg font-medium">Content Planner & Strategy Tool</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-[16px] text-red-400 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <button
          onClick={handleLogin}
          disabled={isSigningIn}
          className="w-full py-5 px-8 bg-white text-black rounded-[16px] font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)]"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          {isSigningIn ? 'Signing in...' : 'Continue with Google'}
        </button>
        
        <div className="mt-10 flex flex-col gap-4">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Reset App (Clear Cache)
          </button>
          
          <button
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <Wrench className="w-3.5 h-3.5" />
            Troubleshooting
          </button>
        </div>

        {showTroubleshooting && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-8 p-6 bg-black/40 rounded-[20px] border border-white/5 text-left backdrop-blur-md"
          >
            <h3 className="text-xs font-black text-white mb-3 uppercase tracking-[0.2em]">Migration Tool</h3>
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">If your data is missing after a system update, use this tool to restore it from the legacy database.</p>
            <MigrationTool />
          </motion.div>
        )}
        
        <p className="mt-12 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
          Powered by Firebase Cloud
        </p>
      </div>
    </div>
  );
}
