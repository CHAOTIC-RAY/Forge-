import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { Login } from '../components/Login';
import { MigrationTool } from '../components/MigrationTool';
import { FirestoreExportTool } from '../components/FirestoreExportTool';
import { getDataBackend, isLegacyBackend, setDataBackend } from '../lib/dataBackend';
import { exchangeSupabaseAccessToken } from '../lib/supabaseSession';
import { ArrowLeft, Database, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function AuthPage() {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const backend = getDataBackend();
  const legacyMode = isLegacyBackend();

  const switchToSupabase = async () => {
    if (!user) return;
    setDataBackend('supabase');
    try {
      await exchangeSupabaseAccessToken(true);
      toast.success('Switched to the new Supabase database.');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to switch to Supabase:', error);
      toast.error('Could not connect to Supabase. Try signing in with the new database button.');
    }
  };

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
          {user && !loading && !legacyMode && (
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div
            className={`p-4 rounded-[12px] border ${
              legacyMode
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {legacyMode ? (
                <Database className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold text-[#37352F] dark:text-[#EBE9ED]">
                  Signed in as {user.email}
                </p>
                <p className="text-sm mt-1 text-[#57534E] dark:text-[#CFCBC4]">
                  {legacyMode
                    ? 'You are connected to the legacy Firestore database. Export a backup below, then migrate into Supabase when ready.'
                    : 'You are connected to the new Supabase database. Open the dashboard to use your workspaces.'}
                </p>
                <p className="text-xs mt-2 text-[#787774] dark:text-[#9B9A97]">
                  Active mode: <strong>{backend === 'legacy' ? 'Old DB (Firestore)' : 'New DB (Supabase)'}</strong>
                </p>
              </div>
            </div>
          </div>

          {legacyMode ? (
            <>
              <FirestoreExportTool />
              <MigrationTool />
              <div className="pb-8">
                <button
                  type="button"
                  onClick={switchToSupabase}
                  className="w-full sm:w-auto px-5 py-3 rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
                >
                  Done migrating — switch to new database
                </button>
              </div>
            </>
          ) : (
            <div className="pb-8 p-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2F2F2F]">
              <p className="text-sm text-[#57534E] dark:text-[#CFCBC4] mb-4">
                Need to pull data from Firestore again? Sign out and use the{' '}
                <strong>Google — Old database (Firestore)</strong> button.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-5 py-3 rounded-[10px] bg-brand text-white font-semibold hover:bg-brand-hover transition-colors"
              >
                Open dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {!user && !loading && <Login showDualDatabase />}
      {user && loading && (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
