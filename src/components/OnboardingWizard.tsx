import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Palette, RefreshCw, ArrowRight, Check, Sparkles, Briefcase, Globe, Layout } from 'lucide-react';
import { cn } from '../lib/utils';
import { Business } from '../data';

interface OnboardingWizardProps {
  onComplete: (data: Partial<Business>) => Promise<void>;
  userEmail: string;
}

export function OnboardingWizard({ onComplete, userEmail }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: 'Retail',
    description: '',
    brandColors: {
      primary: '#3b82f6',
      secondary: '#1e293b',
      accent: '#f59e0b'
    },
    position: 'Owner',
    targetUrl: '',
    theme: 'system',
    geminiApiKey: ''
  });

  const industries = [
    'Retail', 'E-commerce', 'Real Estate', 'Hospitality', 
    'Technology', 'Healthcare', 'Education', 'Construction', 'Other'
  ];

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(formData);
    } catch (error) {
      console.error("Onboarding failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Profile', icon: Building2 },
    { id: 2, title: 'Brand', icon: Palette },
    { id: 3, title: 'AI Config', icon: Sparkles },
    { id: 4, title: 'Sync', icon: RefreshCw },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#191919] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-[#2E2E2E]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-[#2E2E2E] bg-slate-50/50 dark:bg-[#202020]/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to Forge</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Let's set up your workspace</p>
              </div>
            </div>
            <div className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              Step {step} of 4
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4">
            {steps.map((s) => (
              <div key={s.id} className="flex-1 flex flex-col gap-2">
                <div className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  step >= s.id ? "bg-blue-600" : "bg-slate-200 dark:bg-[#2E2E2E]"
                )} />
                <div className="flex items-center gap-2">
                  <s.icon size={14} className={cn(
                    step >= s.id ? "text-blue-600" : "text-slate-400"
                  )} />
                  <span className={cn(
                    "text-[10px] uppercase tracking-wider font-bold",
                    step >= s.id ? "text-slate-900 dark:text-white" : "text-slate-400"
                  )}>
                    {s.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Industry
                    </label>
                    <select 
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white appearance-none"
                    >
                      {industries.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Your Role
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Marketing Manager"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Business Description
                  </label>
                  <textarea 
                    placeholder="Tell us about your business..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Target Website URL
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="url"
                        placeholder="https://your-store.com"
                        value={formData.targetUrl}
                        onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      App Theme
                    </label>
                    <select 
                      value={formData.theme}
                      onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Brand Colors
                  </label>
                  <div className="grid grid-cols-3 gap-6">
                    {Object.entries(formData.brandColors).map(([key, value]) => (
                      <div key={key} className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {key}
                        </label>
                        <div className="relative group">
                          <input 
                            type="color"
                            value={value}
                            onChange={(e) => setFormData({
                              ...formData,
                              brandColors: { ...formData.brandColors, [key]: e.target.value }
                            })}
                            className="w-full h-14 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] cursor-pointer overflow-hidden p-0 bg-transparent"
                          />
                        </div>
                        <div className="text-[10px] font-mono text-center text-slate-400">{(value as string).toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#2E2E2E] flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: formData.brandColors.primary }} />
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: formData.brandColors.secondary }} />
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: formData.brandColors.accent }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Visual Preview</h4>
                    <p className="text-[10px] text-slate-500">Brand consistency across generated content</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">AI Configuration (Optional)</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Add your Gemini API key to enable advanced AI features. You can skip this and use the default settings.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password"
                      placeholder="Enter your API key..."
                      value={formData.geminiApiKey}
                      onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Don't have a key? Get one for free at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 py-4"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto shadow-xl shadow-green-500/10">
                    <RefreshCw size={40} className="animate-spin-slow" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ready to Sync?</h2>
                  <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                    We'll prepare your workspace and set up your initial product list. You can import your data later.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Create business profile',
                    'Initialize brand guidelines',
                    'Set up collaborative workspace',
                    'Prepare AI content engine'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#202020]/50 border border-slate-100 dark:border-[#2E2E2E]">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 dark:border-[#2E2E2E] flex items-center justify-between bg-slate-50/50 dark:bg-[#202020]/50">
          <button 
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || isSubmitting}
            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-0 transition-all"
          >
            Back
          </button>
          <button 
            onClick={handleNext}
            disabled={step === 1 && !formData.name || isSubmitting}
            className={cn(
              "px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
              step === 4 ? "bg-green-600 text-white shadow-green-500/20" : "bg-blue-600 text-white shadow-blue-500/20"
            )}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <span>{step === 4 ? 'Complete Setup' : 'Continue'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
