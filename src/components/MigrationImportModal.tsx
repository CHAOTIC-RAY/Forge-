import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RefreshCw, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { scanFirestoreExportFile, type MigrationScanBundle } from '../lib/migrationScan';
import {
  countSelectedItems,
  type MigrationSelection,
} from '../lib/migrationTypes';
import { MigrationImportReview } from './MigrationImportReview';

type Step = 'pick' | 'review';

interface MigrationImportModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  initialBundle?: MigrationScanBundle | null;
  onImport: (
    bundle: MigrationScanBundle,
    selection: MigrationSelection,
    onProgress: (stage: string) => void
  ) => Promise<void>;
  /** Reload page after successful import (onboarding). */
  reloadOnSuccess?: boolean;
}

export function MigrationImportModal({
  open,
  onClose,
  title = 'Import JSON backup',
  description = 'Select your forge-firestore-export-*.json file. We will scan it quickly and show what can be copied into your account.',
  initialBundle = null,
  onImport,
  reloadOnSuccess = false,
}: MigrationImportModalProps) {
  const [step, setStep] = useState<Step>('pick');
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [bundle, setBundle] = useState<MigrationScanBundle | null>(null);
  const [selection, setSelection] = useState<MigrationSelection | null>(null);
  const [importProgress, setImportProgress] = useState('');

  const reset = () => {
    setStep('pick');
    setScanning(false);
    setImporting(false);
    setImportFile(null);
    setBundle(null);
    setSelection(null);
    setImportProgress('');
  };

  React.useEffect(() => {
    if (!open) return;
    if (initialBundle?.scan.valid) {
      setBundle(initialBundle);
      setSelection(initialBundle.scan.defaultSelection);
      setStep('review');
      return;
    }
    reset();
  }, [open, initialBundle]);

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const handleScanFile = async (file: File | null) => {
    setImportFile(file);
    setBundle(null);
    setSelection(null);
    setStep('pick');
    if (!file) return;

    setScanning(true);
    try {
      const result = await scanFirestoreExportFile(file);
      if (!result.scan.valid) {
        toast.error(result.scan.error || 'Could not read export file');
        return;
      }
      setBundle(result);
      setSelection(result.scan.defaultSelection);
      setStep('review');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scan file');
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    if (!bundle || !selection) {
      toast.error('Scan your export file and choose what to import.');
      return;
    }
    if (countSelectedItems(bundle.scan.units, selection) === 0) {
      toast.error('Select at least one item to import.');
      return;
    }

    setImporting(true);
    setImportProgress('Starting import…');
    try {
      await onImport(bundle, selection, setImportProgress);
      toast.success('Import complete!');
      sessionStorage.removeItem('forge_supabase_session_ready');
      handleClose();
      if (reloadOnSuccess) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Import failed', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
      setImportProgress('');
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#191919] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-[#2E2E2E]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-[#2E2E2E] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="interactive focus-ring p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2E2E2E] text-slate-500 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'pick' && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 dark:border-[#3E3E3E] rounded-2xl cursor-pointer hover:border-brand transition-colors">
                  {scanning ? (
                    <RefreshCw className="w-10 h-10 text-brand animate-spin" />
                  ) : (
                    <Upload className="w-10 h-10 text-slate-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
                    {scanning
                      ? 'Scanning export…'
                      : importFile
                        ? importFile.name
                        : 'Choose JSON file'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Fast scan — no data is uploaded until you confirm import
                  </span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    disabled={scanning || importing}
                    onChange={(e) => void handleScanFile(e.target.files?.[0] || null)}
                  />
                </label>
              </motion.div>
            )}

            {step === 'review' && bundle && selection && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <MigrationImportReview
                  scan={bundle.scan}
                  selection={selection}
                  onSelectionChange={setSelection}
                />
                {importProgress && (
                  <p className="text-sm text-brand font-medium text-center">{importProgress}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStep('pick');
                    setBundle(null);
                    setSelection(null);
                  }}
                  disabled={importing}
                  className="text-xs text-slate-500 hover:text-brand"
                >
                  Choose a different file
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-[#2E2E2E] flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          {step === 'review' ? (
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={
                !bundle ||
                !selection ||
                importing ||
                countSelectedItems(bundle.scan.units, selection) === 0
              }
              className={cn(
                'px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors disabled:opacity-50',
                'bg-brand text-white hover:bg-brand-hover'
              )}
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  Import {bundle && selection ? countSelectedItems(bundle.scan.units, selection) : 0} items
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-6 py-2.5 rounded-xl font-bold text-sm opacity-40 bg-slate-200 dark:bg-[#2E2E2E] text-slate-500"
            >
              Scan a file first
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
