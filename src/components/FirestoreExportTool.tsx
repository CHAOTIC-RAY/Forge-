import React, { useState } from 'react';
import { db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { downloadFirestoreExport } from '../lib/firestoreExport';
import { ForgeLoader } from './ForgeLoader';
import { Download, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

export function FirestoreExportTool() {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [stage, setStage] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const startExport = async () => {
    setStatus('exporting');
    setError(null);
    setCounts({});
    setStage('Reading Firestore collections…');

    try {
      const payload = await downloadFirestoreExport(db, (progress) => setStage(progress));
      setCounts(payload.counts);
      setStatus('success');
      toast.success('Firestore export downloaded.');
    } catch (err: unknown) {
      console.error('Export failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Export failed');
      toast.error('Export failed.');
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-[#191919] rounded-[12px] border border-[#E9E9E7] dark:border-[#2F2F2F]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-[8px] text-amber-700 dark:text-amber-300">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#37352F] dark:text-[#FFFFFF]">Export Legacy Firestore Data</h2>
          <p className="text-sm text-[#757681] dark:text-[#9B9A97]">
            Download a JSON backup of everything in your old database before migrating.
          </p>
        </div>
      </div>

      <div className="p-4 bg-[#F7F6F3] dark:bg-[#252525] rounded-[8px] border border-[#E9E9E7] dark:border-[#2F2F2F] mb-4 text-xs">
        <span className="text-[#757681] dark:text-[#9B9A97]">Source:</span>
        <p className="font-mono mt-1 truncate">Firestore ({firebaseConfig.firestoreDatabaseId})</p>
      </div>

      {status === 'idle' && (
        <button
          type="button"
          onClick={startExport}
          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-[8px] font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export all Firestore data (JSON)
        </button>
      )}

      {status === 'exporting' && (
        <div className="flex items-center justify-center gap-2 py-4">
          <ForgeLoader size={20} />
          <span className="text-sm font-medium">{stage}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-[8px] flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Export complete</p>
            <ul className="mt-2 text-xs text-green-700 dark:text-green-400 space-y-0.5">
              {Object.entries(counts).map(([key, value]) => (
                <li key={key}>
                  {key.replace(/_/g, ' ')}: {value}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={startExport}
              className="mt-3 text-xs font-semibold text-green-800 dark:text-green-300 underline"
            >
              Export again
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[8px] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Export failed</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
            <button
              type="button"
              onClick={startExport}
              className="mt-2 text-xs font-semibold text-red-800 dark:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
