import React, { useState } from 'react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, setDoc, query, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { ForgeLoader } from './ForgeLoader';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const COLLECTIONS = [
  'businesses',
  'posts',
  'users',
  'priority_products',
  'inventory_products',
  'inventory_category_counts',
  'todos'
];

const OLD_DATABASE_ID = 'ai-studio-13c56c0d-2443-4ce5-8f01-68a0684e05e5';

export function MigrationTool() {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);

  const startMigration = async () => {
    if (!auth.currentUser) {
      toast.error("You must be logged in to migrate data.");
      return;
    }

    setStatus('migrating');
    setError(null);
    const newProgress: { [key: string]: number } = {};
    COLLECTIONS.forEach(c => newProgress[c] = 0);
    setProgress(newProgress);

    try {
      // Initialize source app
      const sourceConfig = { ...firebaseConfig, firestoreDatabaseId: OLD_DATABASE_ID };
      const sourceApp = getApps().find(app => app.name === 'source') || initializeApp(sourceConfig, 'source');
      const sourceDb = initializeFirestore(sourceApp, { experimentalForceLongPolling: true }, OLD_DATABASE_ID);

      // Destination app is the default one - use the existing db instance
      const destDb = db;

      for (const collectionName of COLLECTIONS) {
        console.log(`Migrating collection: ${collectionName}`);
        const sourceCol = collection(sourceDb, collectionName);
        const snapshot = await getDocs(sourceCol);
        
        let count = 0;
        for (const document of snapshot.docs) {
          const data = document.data();
          await setDoc(doc(destDb, collectionName, document.id), data);
          count++;
          setProgress(prev => ({ ...prev, [collectionName]: count }));
        }
      }

      setStatus('success');
      toast.success("Migration completed successfully!");
    } catch (err: any) {
      console.error("Migration failed:", err);
      setStatus('error');
      setError(err.message || "An unknown error occurred during migration.");
      toast.error("Migration failed. See details below.");
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2F2F2F] ">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-[8px] text-blue-600 dark:text-blue-400">
          <ArrowRight className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#37352F] dark:text-[#FFFFFF]">Data Migration</h2>
          <p className="text-sm text-[#757681] dark:text-[#9B9A97]">
            Move your data from the old Rainbow database to the new Forge project.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-[#F7F6F3] dark:bg-[#252525] rounded-[8px] border border-[#E9E9E7] dark:border-[#2F2F2F]">
          <h3 className="text-sm font-medium mb-2">Migration Details</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#757681] dark:text-[#9B9A97]">Source Database:</span>
              <p className="font-mono mt-1 truncate">{OLD_DATABASE_ID}</p>
            </div>
            <div>
              <span className="text-[#757681] dark:text-[#9B9A97]">Destination Database:</span>
              <p className="font-mono mt-1">(default)</p>
            </div>
          </div>
        </div>

        {status === 'idle' && (
          <button
            onClick={startMigration}
            className="w-full py-2.5 bg-[#37352F] dark:bg-[#FFFFFF] text-white dark:text-[#191919] rounded-[8px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Start Migration
          </button>
        )}

        {status === 'migrating' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-4">
              <ForgeLoader size={20} />
              <span className="text-sm font-medium">Migrating data...</span>
            </div>
            <div className="space-y-1">
              {COLLECTIONS.map(col => (
                <div key={col} className="flex justify-between text-xs">
                  <span className="text-[#757681] dark:text-[#9B9A97] capitalize">{col.replace(/_/g, ' ')}</span>
                  <span className="font-medium">{progress[col] || 0} items</span>
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
                All data has been moved to the new project. You can now use the app normally.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[8px] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Migration Failed</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {error}
              </p>
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
