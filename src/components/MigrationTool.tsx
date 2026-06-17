import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { migrateFirestoreToSupabase, type MigrationProgress } from '../lib/firestoreToSupabase';
import { exchangeSupabaseAccessToken } from '../lib/supabaseSession';
import { ForgeLoader } from './ForgeLoader';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MIGRATION_STAGES = [
  'profiles',
  'businesses',
  'business members',
  'posts',
  'inventory',
  'category counts',
  'notebooks',
  'brand kits',
  'brand overviews',
  'categories',
  'inventory maps',
  'short links',
  'access requests',
];

export function MigrationTool() {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [stage, setStage] = useState<string>('Preparing…');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const startMigration = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error('You must be logged in to migrate data.');
      return;
    }

    setStatus('migrating');
    setError(null);
    setCounts({});
    setStage('Connecting to Supabase…');

    try {
      await exchangeSupabaseAccessToken(true);

      const result = await migrateFirestoreToSupabase(
        db,
        () => user.getIdToken(true),
        (progress: MigrationProgress) => {
          setStage(progress.stage);
        },
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }
      );

      setCounts(result.counts);
      setStatus('success');
      toast.success('Firestore data migrated to Supabase.');
    } catch (err: unknown) {
      console.error('Migration failed:', err);
      setStatus('error');
      const message = err instanceof Error ? err.message : 'An unknown error occurred during migration.';
      setError(message);
      toast.error('Migration failed. See details below.');
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2F2F2F] ">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-[8px] text-blue-600 dark:text-blue-400">
          <ArrowRight className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#37352F] dark:text-[#FFFFFF]">Firestore → Supabase Migration</h2>
          <p className="text-sm text-[#757681] dark:text-[#9B9A97]">
            Copy your existing Forge data from Firestore into Supabase so workspaces, posts, and short links work again.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-[#F7F6F3] dark:bg-[#252525] rounded-[8px] border border-[#E9E9E7] dark:border-[#2F2F2F]">
          <h3 className="text-sm font-medium mb-2">Migration Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#757681] dark:text-[#9B9A97]">Source:</span>
              <p className="font-mono mt-1 truncate">Firestore ({firebaseConfig.firestoreDatabaseId})</p>
            </div>
            <div>
              <span className="text-[#757681] dark:text-[#9B9A97]">Destination:</span>
              <p className="font-mono mt-1">Supabase (forge)</p>
            </div>
          </div>
          <p className="text-xs text-[#757681] dark:text-[#9B9A97] mt-3">
            Migrates users, businesses, posts, inventory, notebooks, brand kits, short links, and access requests.
            Existing Supabase rows with the same IDs are updated, not duplicated.
          </p>
        </div>

        {status === 'idle' && (
          <button
            onClick={startMigration}
            className="w-full py-2.5 bg-[#37352F] dark:bg-[#FFFFFF] text-white dark:text-[#191919] rounded-[8px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Migrate Firestore to Supabase
          </button>
        )}

        {status === 'migrating' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-4">
              <ForgeLoader size={20} />
              <span className="text-sm font-medium">{stage}</span>
            </div>
            <div className="space-y-1">
              {MIGRATION_STAGES.map((label) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-[#757681] dark:text-[#9B9A97] capitalize">{label}</span>
                  <span className="font-medium">{counts[label.replace(/ /g, '_')] ?? '…'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-[8px] flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Migration Successful</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                Your Firestore data is now in Supabase. Reload the app to load your workspaces.
              </p>
              <ul className="mt-2 text-xs text-green-700 dark:text-green-400 space-y-0.5">
                {Object.entries(counts)
                  .filter(([key]) => !key.startsWith('read:'))
                  .map(([key, value]) => (
                    <li key={key}>
                      {key.replace(/_/g, ' ')}: {value}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[8px] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Migration Failed</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
              {error?.toLowerCase().includes('service') && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                  Ask the project admin to set <code>SUPABASE_SERVICE_KEY</code> (service_role secret,
                  not the anon key) and <code>SUPABASE_JWT_SECRET</code> on the Cloudflare Worker.
                </p>
              )}
              <button
                onClick={startMigration}
                className="mt-2 text-xs font-semibold text-red-800 dark:text-red-300 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
