import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Wrench } from 'lucide-react';
import { ForgeLogo, ScribbleFlame } from './ForgeLogo';
import { auth, googleProvider } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { MigrationTool } from './MigrationTool';

type AuthMode = 'signIn' | 'signUp';

function getAuthErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };

  switch (err?.code) {
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Sign in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this Firebase project.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      if (err?.message?.includes('INTERNAL ASSERTION FAILED')) {
        return 'A temporary authentication error occurred. Please try again.';
      }
      return err?.message || 'Failed to sign in. Please try again.';
  }
}

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [authStrategy, setAuthStrategy] = useState<'popup' | 'redirect'>('popup');
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${window.location.origin}/`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const coep = r.headers.get('Cross-Origin-Embedder-Policy') || '';
        const isolated =
          typeof (globalThis as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === 'boolean'
            ? (globalThis as unknown as { crossOriginIsolated: boolean }).crossOriginIsolated
            : undefined;
        const badCoep = coep.includes('require-corp') || coep.includes('credentialless');
        if (isolated === true || badCoep) {
          setAuthStrategy('redirect');
        }
      } catch {
        /* probe optional */
      }
    })();
  }, []);

  const handleEmailPasswordAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmailSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      setNotice(null);
      return;
    }

    setIsEmailSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (authMode === 'signUp') {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err) {
      console.error("[Login] email/password error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email first, then request a reset link.');
      setNotice(null);
      return;
    }

    setIsEmailSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setNotice('Password reset email sent. Check your inbox.');
    } catch (err) {
      console.error("[Login] password reset error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleSigningIn) return;
    setIsGoogleSigningIn(true);
    setError(null);
    setNotice(null);
    if (authStrategy === 'redirect') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirErr: any) {
        setError(redirErr?.message || 'Redirect sign-in failed. Add this host in Firebase Console → Authentication → Settings → Authorized domains.');
        return;
      } finally {
        setIsGoogleSigningIn(false);
      }
    }
    try {
      console.log("[Login] Starting signInWithPopup...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[Login] Success! User:", result.user.email);
      // We don't need to do anything here as App.tsx will see the state change
    } catch (err: any) {
      console.error("[Login] error:", err);
      const tryRedirectCodes = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
      if (tryRedirectCodes.includes(err?.code)) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirErr: any) {
          setError(redirErr?.message || 'Redirect sign-in failed. Check Firebase authorized domains for this host.');
          setIsGoogleSigningIn(false);
          return;
        }
      }
      if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your connection and try again.");
      } else if (err.message?.includes('INTERNAL ASSERTION FAILED')) {
        setError("A temporary authentication error occurred. Please try again.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsGoogleSigningIn(false);
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

        {notice && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[16px] text-emerald-300 text-sm font-medium"
          >
            {notice}
          </motion.div>
        )}

        <form onSubmit={handleEmailPasswordAuth} className="space-y-4 text-left">
          <div>
            <label htmlFor="email" className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="you@company.com"
                className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-[16px] text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={authMode === 'signUp' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                placeholder={authMode === 'signUp' ? 'Create a password' : 'Enter your password'}
                className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-[16px] text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isEmailSubmitting}
            className="w-full py-5 px-8 bg-white text-black rounded-[16px] font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)]"
          >
            {isEmailSubmitting
              ? (authMode === 'signUp' ? 'Creating account...' : 'Signing in...')
              : (authMode === 'signUp' ? 'Create account' : 'Sign in with email')}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
              setNotice(null);
            }}
            className="text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            {authMode === 'signIn' ? 'Create account' : 'Have an account? Sign in'}
          </button>
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isEmailSubmitting}
            className="text-gray-500 hover:text-white transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            Forgot password?
          </button>
        </div>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleSigningIn}
          className="w-full py-4 px-8 bg-black/30 text-white rounded-[16px] font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 border border-white/10"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          {isGoogleSigningIn ? 'Signing in...' : 'Continue with Google'}
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
