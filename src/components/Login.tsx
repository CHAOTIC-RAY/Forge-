import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Successfully signed in!');
    } catch (error: any) {
      toast.error(error.message || 'Google Sign-In failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-zinc-900/50 px-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2 font-heading">Welcome to Forge</h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-8 font-sans">
          Your AI-powered multi-tenant content planning & calendar workspace.
        </p>
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2 bg-[#2665fd] hover:bg-[#2665fd]/90 text-white font-medium py-3 px-4 rounded-xl transition duration-200 cursor-pointer shadow-md"
        >
          <LogIn size={18} />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}
export default Login;
