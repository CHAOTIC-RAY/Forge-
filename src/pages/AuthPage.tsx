import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { Login } from '../components/Login';
import { ArrowLeft } from 'lucide-react';

export function AuthPage() {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#202020]">
      <header className="sticky top-0 z-20 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5]/90 dark:bg-[#202020]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
          {user && !loading && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              Open dashboard
            </button>
          )}
        </div>
      </header>

      {user && !loading ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="p-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2F2F2F]">
            <p className="text-sm text-[#57534E] dark:text-[#CFCBC4] mb-1">
              Signed in as <strong>{user.email}</strong>
            </p>
            <p className="text-sm text-[#787774] dark:text-[#9B9A97] mb-4">
              Your workspaces and calendar load from Supabase after you open the dashboard.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-3 rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
            >
              Open dashboard
            </button>
          </div>
        </div>
      ) : null}

      {!user && !loading && <Login redirectOnSignIn />}
      {user && loading && (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
