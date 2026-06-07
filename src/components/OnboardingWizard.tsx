import React, { useState } from 'react';
import { Sparkles, Calendar, ArrowRight } from 'lucide-react';

interface OnboardingWizardProps {
  userEmail: string;
  onComplete: (data: {
    name: string;
    industry: string;
    description: string;
    targetUrl: string;
  }) => void;
}

export function OnboardingWizard({ userEmail, onComplete }: OnboardingWizardProps) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('General');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onComplete({
      name,
      industry,
      description,
      targetUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md px-4">
      <div className="glass-panel max-w-lg w-full p-8 rounded-2xl shadow-2xl bg-white dark:bg-zinc-900/90 text-left border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <Calendar className="w-6 h-6 text-[#2665fd]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Complete Setup</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{userEmail}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 font-sans">
              Workspace / Business Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Retail"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#2665fd]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 font-sans">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="General">General Marketing</option>
              <option value="Retail">Retail & E-commerce</option>
              <option value="Wellness">Health & Wellness</option>
              <option value="Tech">Technology & SaaS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 font-sans">
              Website / Target URL (for products import mapping)
            </label>
            <input
              type="url"
              placeholder="https://acme.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#2665fd]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 font-sans">
              Brand / Workspace Description
            </label>
            <textarea
              placeholder="Tell us about your brand..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#2665fd] resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 flex items-center justify-center gap-2 bg-[#2665fd] hover:bg-[#2665fd]/95 text-white font-medium py-3 px-4 rounded-xl shadow-md transition duration-200 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Workspace</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
export default OnboardingWizard;
