import React from 'react';
import {
  Building2,
  Calendar,
  Database,
  Sparkles,
  Palette,
  Lightbulb,
  Link2,
  Boxes,
  User,
  AlertCircle,
  Check,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  type MigrationScanResult,
  type MigrationSelection,
  type MigrationUnitId,
  MIGRATION_UNITS,
  countSelectedItems,
  normalizeMigrationSelection,
} from '../lib/migrationTypes';

const UNIT_ICONS: Record<MigrationUnitId, React.ComponentType<{ className?: string; size?: number }>> = {
  profiles: User,
  businesses: Building2,
  posts: Calendar,
  inventory_products: Database,
  inventory_category_counts: Boxes,
  notebooks: Lightbulb,
  brand_kits: Palette,
  brand_overviews: Sparkles,
  categories: Boxes,
  inventory_maps: Link2,
  short_links: Link2,
  access_requests: User,
};

interface MigrationImportReviewProps {
  scan: MigrationScanResult;
  selection: MigrationSelection;
  onSelectionChange: (next: MigrationSelection) => void;
}

export function MigrationImportReview({
  scan,
  selection,
  onSelectionChange,
}: MigrationImportReviewProps) {
  const selectedCount = countSelectedItems(scan.units, selection);

  const toggle = (id: MigrationUnitId) => {
    const meta = MIGRATION_UNITS.find((m) => m.id === id);
    const unit = scan.units.find((u) => u.id === id);
    if (!unit?.available) return;

    const next = { ...selection, [id]: !selection[id] };
    onSelectionChange(normalizeMigrationSelection(next));
  };

  const selectAll = () => {
    const next = { ...selection };
    for (const u of scan.units) {
      if (u.available) next[u.id] = true;
    }
    onSelectionChange(normalizeMigrationSelection(next));
  };

  const selectNone = () => {
    onSelectionChange(
      Object.fromEntries(MIGRATION_UNITS.map((m) => [m.id, false])) as MigrationSelection
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E2E] bg-slate-50/80 dark:bg-[#202020]/60 p-4 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
          {scan.exportedAt && (
            <span>
              Exported{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {new Date(scan.exportedAt).toLocaleString()}
              </strong>
            </span>
          )}
          {scan.firebaseProjectId && (
            <span>
              Project <code className="text-xs">{scan.firebaseProjectId}</code>
            </span>
          )}
        </div>
        {scan.workspaces.length > 0 && (
          <p className="mt-2 text-slate-700 dark:text-slate-300">
            <strong>{scan.workspaces.length}</strong> workspace
            {scan.workspaces.length !== 1 ? 's' : ''}:{' '}
            {scan.workspaces.map((w) => w.name).join(', ')}
          </p>
        )}
        {scan.aiSettingsSummary?.hasSystemInstructions && (
          <p className="mt-2 flex items-center gap-2 text-brand">
            <Sparkles className="w-4 h-4 shrink-0" />
            Includes custom AI system instructions and brand rules
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Choose what to copy ({selectedCount} records selected)
        </p>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={selectAll} className="text-brand hover:underline">
            Select all
          </button>
          <span className="text-slate-300">|</span>
          <button type="button" onClick={selectNone} className="text-slate-500 hover:underline">
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[min(42vh,360px)] overflow-y-auto pr-1">
        {MIGRATION_UNITS.map((meta) => {
          const unit = scan.units.find((u) => u.id === meta.id);
          if (!unit) return null;
          const Icon = UNIT_ICONS[meta.id];
          const checked = selection[meta.id];
          const disabled = !unit.available;

          return (
            <label
              key={meta.id}
              className={cn(
                'flex gap-3 p-3 rounded-xl border transition-colors cursor-pointer',
                disabled && 'opacity-45 cursor-not-allowed',
                checked && !disabled
                  ? 'border-brand/40 bg-brand/5 dark:bg-brand/10'
                  : 'border-slate-200 dark:border-[#2E2E2E] hover:border-slate-300 dark:hover:border-[#3E3E3E]'
              )}
            >
              <input
                type="checkbox"
                className="mt-1 rounded border-slate-300 text-brand focus:ring-brand"
                checked={!!checked}
                disabled={disabled}
                onChange={() => toggle(meta.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icon className="w-4 h-4 text-brand shrink-0" />
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {meta.label}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      unit.count > 0
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-[#2E2E2E] text-slate-500'
                    )}
                  >
                    {unit.count} {unit.count === 1 ? 'item' : 'items'}
                  </span>
                  {meta.requires?.includes('profiles') && meta.id !== 'profiles' && (
                    <span className="text-[10px] text-slate-400">needs profile</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.description}</p>
                {unit.samples.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    e.g. {unit.samples.slice(0, 2).join(' · ')}
                  </p>
                )}
                {unit.details.map((d) => (
                  <p key={d} className="text-[11px] text-slate-500 mt-0.5">
                    {d}
                  </p>
                ))}
              </div>
              {checked && !disabled && (
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              )}
            </label>
          );
        })}
      </div>

      {selectedCount === 0 && (
        <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Select at least one category to import.
        </p>
      )}
    </div>
  );
}
