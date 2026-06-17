import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, CheckCircle2, Lightbulb, Lock, Mail, Sparkles } from 'lucide-react';
import { ForgeLogo, ScribbleFlame } from './ForgeLogo';
import { auth, googleProvider } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { exchangeSupabaseAccessToken } from '../lib/supabaseSession';

type AuthMode = 'signIn' | 'signUp';

interface LoginProps {
  /** Navigate to dashboard only after an explicit sign-in action on this page */
  redirectOnSignIn?: boolean;
}

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

export function Login({ redirectOnSignIn = false }: LoginProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const goToAppAfterSignIn = () => {
    if (redirectOnSignIn) {
      navigate('/', { replace: true });
    }
  };

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
      goToAppAfterSignIn();
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

    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[Login] Success! User:', result.user.email);
      await exchangeSupabaseAccessToken(true);
      goToAppAfterSignIn();
    } catch (err: unknown) {
      console.error('[Login] Google sign-in error:', err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        setError('Google sign-in was blocked. Allow popups for this site and try again.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Sign-in cancelled. Please try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] font-sans relative overflow-hidden">
      <div className="fixed top-1/2 right-[-10%] -translate-y-1/2 w-[620px] max-w-[90vw] aspect-[210/339] opacity-10 dark:opacity-15 pointer-events-none">
        <ScribbleFlame />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(35,131,226,0.12),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.1),transparent_28%)] pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] glass-panel">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-center">
              <ForgeLogo size={24} className="text-[#37352F] dark:text-[#EBE9ED]" />
            </div>
            <div>
              <p className="font-display font-bold text-lg tracking-tight">Forge</p>
              <p className="text-xs text-[#787774] dark:text-[#9B9A97]">Content calendar and idea workspace</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#787774] dark:text-[#9B9A97]">
            <Sparkles className="w-4 h-4 text-brand" />
            Plan. Create. Publish.
          </div>
        </header>

        <main className="flex-1 grid lg:grid-cols-[1.05fr_0.95fr] gap-8 px-5 md:px-10 py-8 md:py-12 items-center max-w-7xl w-full mx-auto">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="hidden lg:block"
          >
            <div className="max-w-xl space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] shadow-sm text-sm font-medium text-[#787774] dark:text-[#9B9A97]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Your publishing command center
              </div>

              <div className="space-y-5">
                <h1 className="font-display text-5xl xl:text-6xl font-bold tracking-[-0.06em] leading-[0.95]">
                  Turn ideas into scheduled content.
                </h1>
                <p className="text-lg text-[#787774] dark:text-[#9B9A97] leading-relaxed max-w-lg">
                  Sign in to manage campaigns, capture ideas, draft posts with AI, and keep every workspace calendar moving.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px] p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-brand-bg border border-brand-border text-brand flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold">This week's schedule</p>
                        <p className="text-xs text-[#787774] dark:text-[#9B9A97]">Campaign-ready slots</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">On track</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
                      <div key={day} className="rounded-[14px] bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] p-3 min-h-24">
                        <p className="text-[11px] font-bold text-[#787774] dark:text-[#9B9A97] mb-3">{day}</p>
                        <div className={`h-2 rounded-full mb-2 ${index % 2 === 0 ? 'bg-brand' : 'bg-amber-400'}`} />
                        {index !== 1 && <div className="h-2 w-2/3 rounded-full bg-[#D9D9D6] dark:bg-[#3E3E3E]" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px] p-5 shadow-sm">
                  <div className="w-10 h-10 rounded-[12px] bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-4">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <p className="font-bold mb-2">Idea bank</p>
                  <p className="text-sm text-[#787774] dark:text-[#9B9A97] leading-relaxed">Capture hooks, product angles, and campaign sparks before they disappear.</p>
                </div>

                <div className="bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[24px] p-5 shadow-sm">
                  <div className="w-10 h-10 rounded-[12px] bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="font-bold mb-2">AI drafting</p>
                  <p className="text-sm text-[#787774] dark:text-[#9B9A97] leading-relaxed">Generate captions, hashtags, visuals, and briefs from your workspace context.</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="glass-card rounded-[28px] p-6 md:p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-[18px] bg-brand-bg border border-brand-border flex items-center justify-center mx-auto mb-5 text-brand">
                  <ForgeLogo size={38} />
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight">
                  {authMode === 'signUp' ? 'Create your Forge account' : 'Welcome back'}
                </h2>
                <p className="mt-2 text-sm text-[#787774] dark:text-[#9B9A97]">
                  {authMode === 'signUp'
                    ? 'Start planning campaigns and content calendars in one workspace.'
                    : 'Sign in to your content calendar and idea workspace.'}
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-[16px] text-red-600 dark:text-red-400 text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}

              {notice && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[16px] text-emerald-700 dark:text-emerald-300 text-sm font-medium"
                >
                  {notice}
                </motion.div>
              )}

              <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-black text-[#787774] dark:text-[#9B9A97] mb-2 uppercase tracking-[0.16em]">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B9A97]" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                      placeholder="you@company.com"
                      className="w-full pl-12 pr-4 py-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[14px] text-[#37352F] dark:text-[#EBE9ED] placeholder:text-[#9B9A97] focus:outline-none focus:ring-4 focus:ring-brand-ring focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-black text-[#787774] dark:text-[#9B9A97] mb-2 uppercase tracking-[0.16em]">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B9A97]" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={authMode === 'signUp' ? 'new-password' : 'current-password'}
                      required
                      minLength={6}
                      placeholder={authMode === 'signUp' ? 'Create a password' : 'Enter your password'}
                      className="w-full pl-12 pr-4 py-4 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[14px] text-[#37352F] dark:text-[#EBE9ED] placeholder:text-[#9B9A97] focus:outline-none focus:ring-4 focus:ring-brand-ring focus:border-brand"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isEmailSubmitting}
                  className="w-full py-4 px-6 bg-brand hover:bg-brand-hover text-white rounded-[14px] font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_16px_40px_-18px_var(--brand-color)]"
                >
                  {isEmailSubmitting
                    ? (authMode === 'signUp' ? 'Creating account...' : 'Signing in...')
                    : (authMode === 'signUp' ? 'Create account' : 'Sign in with email')}
                </button>
              </form>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
                    setError(null);
                    setNotice(null);
                  }}
                  className="text-brand hover:text-brand-hover transition-colors"
                >
                  {authMode === 'signIn' ? 'Create a new account' : 'Already have an account? Sign in'}
                </button>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isEmailSubmitting}
                  className="text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] transition-colors disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#E9E9E7] dark:bg-[#2E2E2E]" />
                <span className="text-[10px] font-black text-[#9B9A97] uppercase tracking-[0.24em]">or</span>
                <div className="h-px flex-1 bg-[#E9E9E7] dark:bg-[#2E2E2E]" />
              </div>

              <button
                onClick={() => handleGoogleLogin()}
                disabled={isGoogleSigningIn}
                className="w-full py-4 px-6 bg-white dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[14px] font-bold flex items-center justify-center gap-3 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-all active:scale-[0.98] disabled:opacity-50 border border-[#E9E9E7] dark:border-[#2E2E2E]"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                {isGoogleSigningIn ? 'Signing in...' : 'Continue with Google'}
              </button>

              <div className="mt-7 pt-5 border-t border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-center">
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="text-xs font-bold text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] transition-colors"
                >
                  Reset app cache
                </button>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] font-bold text-[#9B9A97] uppercase tracking-[0.2em]">
              Powered by Firebase Auth
            </p>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
