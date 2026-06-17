import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { Login } from '../components/Login';
import { MigrationTool } from '../components/MigrationTool';
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

      {user && !loading && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <div className="mb-6 p-4 rounded-[12px] border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Signed in as <strong>{user.email}</strong>. If your workspaces look empty, run the Firestore →
              Supabase migration below, then reload the dashboard.
            </p>
          </div>
          <div className="mb-8">
            <MigrationTool />
          </div>
        </div>
      )}

      <Login />
    </div>
  );
}
