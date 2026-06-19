import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Palette,
  RefreshCw,
  ArrowRight,
  Check,
  Sparkles,
  Globe,
  Layout,
  Cpu,
  Eye,
  Store,
  Upload,
  PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Business } from '../data';
import { builtInAi, type BuiltInAiStatus } from '../lib/builtinAi';
import { ensureLocalAiEnginesReady } from '../lib/localAiBootstrap';
import { canUseBuiltinWebGpuVision } from '../lib/webGpu';
import type { MigrationSelection } from '../lib/migrationTypes';
import type { MigrationScanBundle } from '../lib/migrationScan';
import { MigrationImportModal } from './MigrationImportModal';

interface OnboardingWizardProps {
  onComplete: (data: Partial<Business> & {
    targetUrl?: string;
    theme?: string;
    geminiApiKey?: string;
    outletNames?: string;
  }) => Promise<void>;
  onImportJson: (
    bundle: MigrationScanBundle,
    selection: MigrationSelection,
    onProgress: (stage: string) => void
  ) => Promise<void>;
  userEmail: string;
}

type OnboardingPath = 'choose' | 'create';

export function OnboardingWizard({ onComplete, onImportJson, userEmail }: OnboardingWizardProps) {
  const [path, setPath] = useState<OnboardingPath>('choose');
  const [showImportModal, setShowImportModal] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiStatus, setAiStatus] = useState<BuiltInAiStatus | null>(null);
  const [aiBootstrapStarted, setAiBootstrapStarted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: 'Retail',
    description: '',
    outletNames: '',
    brandColors: {
      primary: '#3b82f6',
      secondary: '#1e293b',
      accent: '#f59e0b',
    },
    targetUrl: '',
    theme: 'system',
    geminiApiKey: '',
  });

  const industries = [
    'Retail',
    'E-commerce',
    'Real Estate',
    'Hospitality',
    'Technology',
    'Healthcare',
    'Education',
    'Construction',
    'Other',
  ];

  useEffect(() => {
    const unsub = builtInAi.onStatusChange(setAiStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (step !== 3 || aiBootstrapStarted) return;
    setAiBootstrapStarted(true);
    ensureLocalAiEnginesReady().catch((err) => {
      console.warn('[Onboarding] Local AI bootstrap', err);
      toast.error('Local AI download had an issue — you can retry in Settings.');
    });
  }, [step, aiBootstrapStarted]);

  const textReady = aiStatus?.isLoaded;
  const visionReady = aiStatus?.visionIsLoaded;
  const aiLoading = aiStatus?.isLoading || aiStatus?.visionIsLoading;
  const visionSupported = canUseBuiltinWebGpuVision();

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const outlets =
        formData.outletNames.trim() || formData.name.trim() || 'Main Store';
      await onComplete({
        ...formData,
        outletNames: outlets,
        name: formData.name,
        industry: formData.industry,
        description: formData.description,
      });
    } catch (error) {
      console.error('Onboarding failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Workspace', icon: Building2 },
    { id: 2, title: 'Brand', icon: Palette },
    { id: 3, title: 'Local AI', icon: Cpu },
    { id: 4, title: 'Launch', icon: RefreshCw },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#191919] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-[#2E2E2E]"
      >
        <div className="p-8 border-b border-slate-100 dark:border-[#2E2E2E] bg-slate-50/50 dark:bg-[#202020]/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to Forge</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Signed in as {userEmail}
                </p>
              </div>
            </div>
            <div className="text-xs font-medium px-3 py-1 rounded-full bg-brand/10 text-brand">
              {path === 'choose'
                ? 'Get started'
                : `Step ${step} of 4`}
            </div>
          </div>

          {path === 'create' && (
          <div className="flex items-center gap-4">
            {steps.map((s) => (
              <div key={s.id} className="flex-1 flex flex-col gap-2">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    step >= s.id ? 'bg-brand' : 'bg-slate-200 dark:bg-[#2E2E2E]'
                  )}
                />
                <div className="flex items-center gap-2">
                  <s.icon
                    size={14}
                    className={cn(step >= s.id ? 'text-brand' : 'text-slate-400')}
                  />
                  <span
                    className={cn(
                      'text-[10px] uppercase tracking-wider font-bold',
                      step >= s.id ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                    )}
                  >
                    {s.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {path === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Welcome to Forge. Create a fresh workspace or restore data from a JSON export file.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPath('create');
                      setStep(1);
                    }}
                    className="text-left p-6 rounded-2xl border-2 border-slate-200 dark:border-[#2E2E2E] hover:border-brand dark:hover:border-brand transition-colors bg-white dark:bg-[#202020]"
                  >
                    <PlusCircle className="w-8 h-8 text-brand mb-4" />
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Start fresh</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Set up a new business workspace, brand kit, and calendar from scratch.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="text-left p-6 rounded-2xl border-2 border-slate-200 dark:border-[#2E2E2E] hover:border-brand dark:hover:border-brand transition-colors bg-white dark:bg-[#202020]"
                  >
                    <Upload className="w-8 h-8 text-brand mb-4" />
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Import JSON backup</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Restore workspaces, calendar posts, AI settings, and inventory from an export file.
                    </p>
                  </button>
                </div>
              </motion.div>
            )}

            {path === 'create' && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Set up your business workspace. Vision AI will match posts to your outlet names and
                  any phone numbers visible in images.
                </p>
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Business name
                  </label>
                  <div className="relative">
                    <Building2
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="e.g. Rainbow Enterprises"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                          outletNames: formData.outletNames || e.target.value,
                        })
                      }
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Outlet / branch names
                  </label>
                  <div className="relative">
                    <Store
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="e.g. Rainbow Living Mall, Rainbow Office System"
                      value={formData.outletNames}
                      onChange={(e) =>
                        setFormData({ ...formData, outletNames: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Comma-separated. Used when AI reads logos and signage in your post images.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand outline-none text-slate-900 dark:text-white"
                    >
                      {industries.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Your role
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Marketing Manager"
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Short description
                  </label>
                  <textarea
                    placeholder="What does your business do?"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand outline-none text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </motion.div>
            )}

            {path === 'create' && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Website (for catalogue sync)
                    </label>
                    <div className="relative">
                      <Globe
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="url"
                        placeholder="https://your-store.com"
                        value={formData.targetUrl}
                        onChange={(e) =>
                          setFormData({ ...formData, targetUrl: e.target.value })
                        }
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Theme
                    </label>
                    <select
                      value={formData.theme}
                      onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand outline-none text-slate-900 dark:text-white"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Brand colors
                  </label>
                  <div className="grid grid-cols-3 gap-6">
                    {Object.entries(formData.brandColors).map(([key, value]) => (
                      <div key={key} className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {key}
                        </label>
                        <input
                          type="color"
                          value={value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              brandColors: {
                                ...formData.brandColors,
                                [key]: e.target.value,
                              },
                            })
                          }
                          className="w-full h-14 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] cursor-pointer p-0 bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Gemini API key (optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Skip to use free local AI only"
                    value={formData.geminiApiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, geminiApiKey: e.target.value })
                    }
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-brand outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </motion.div>
            )}

            {path === 'create' && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-6 rounded-2xl bg-brand/5 border border-brand/20">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-brand" />
                    Downloading local AI (automatic)
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Forge runs caption and image analysis in your browser—no API key required.
                    Models download once and stay ready for posts, catalogue, and widgets.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#2E2E2E]">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-brand" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Text model
                        </p>
                        <p className="text-[10px] text-slate-500">Captions, briefs, hashtags</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase px-2 py-1 rounded-full',
                        textReady
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : aiLoading
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-slate-200 text-slate-500'
                      )}
                    >
                      {textReady ? 'Ready' : aiLoading ? 'Loading…' : 'Queued'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#2E2E2E]">
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Vision model
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Outlet logos, names & phone numbers in images
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase px-2 py-1 rounded-full',
                        !visionSupported
                          ? 'bg-slate-200 text-slate-500'
                          : visionReady
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : aiLoading
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-slate-200 text-slate-500'
                      )}
                    >
                      {!visionSupported
                        ? 'No WebGPU'
                        : visionReady
                          ? 'Ready'
                          : aiLoading
                            ? 'Loading…'
                            : 'Queued'}
                    </span>
                  </div>
                </div>

                {aiStatus?.message && (
                  <p className="text-xs text-slate-500 font-mono">{aiStatus.message}</p>
                )}
                {aiStatus?.progress > 0 && aiStatus.progress < 100 && (
                  <div className="h-2 bg-slate-200 dark:bg-[#2E2E2E] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${aiStatus.progress}%` }}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {path === 'create' && step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 py-4"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto">
                    <Layout size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    You&apos;re set
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto text-sm">
                    Calendar, ideas, catalogue import, and AI tools are ready. Drop an image on a
                    post to test outlet-aware vision.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Workspace & outlets saved',
                    'Brand kit initialized',
                    textReady ? 'Local text AI ready' : 'Local text AI will finish in background',
                    visionSupported && visionReady
                      ? 'Local vision AI ready'
                      : visionSupported
                        ? 'Vision model finishing download'
                        : 'Vision needs WebGPU (Chrome/Edge)',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#202020]/50 border border-slate-100 dark:border-[#2E2E2E]"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-[#2E2E2E] flex items-center justify-between bg-slate-50/50 dark:bg-[#202020]/50">
          {path === 'choose' ? (
            <div className="w-full text-center text-xs text-slate-500 dark:text-slate-400">
              You can change this later from Settings.
            </div>
          ) : (
            <>
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                setPath('choose');
                return;
              }
              setStep(Math.max(1, step - 1));
            }}
            disabled={isSubmitting}
            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={(step === 1 && !formData.name.trim()) || isSubmitting}
            className={cn(
              'px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-50',
              step === 4
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-brand text-white shadow-brand/20'
            )}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Setting up…</span>
              </>
            ) : (
              <>
                <span>{step === 4 ? 'Enter Forge' : 'Continue'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
            </>
          )}
        </div>
      </motion.div>

      <MigrationImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import JSON backup"
        description="We will fast-scan your export file locally, then let you choose what to copy into your account."
        onImport={onImportJson}
        reloadOnSuccess={false}
      />
    </div>
  );
}
