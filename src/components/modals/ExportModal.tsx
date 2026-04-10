import React, { useState } from 'react';
import { X, Download, Check, LayoutGrid, List, BarChart3, Calendar, Clock } from 'lucide-react';
import { format, startOfMonth, addMonths, subMonths, isBefore, isAfter, differenceInMonths, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';

export type ExportViewVariation = 'calendar' | 'list' | 'summary' | 'timeline';

export interface ExportSettings {
  visibleFields: string[];
  viewVariation: ExportViewVariation;
  startMonth: Date;
  endMonth: Date;
  showBanner: boolean;
  layoutStyle: 'Light' | 'Dark';
  accentColor: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
}

const ALL_FIELDS = [
  { id: 'title', label: 'Post Title' },
  { id: 'brief', label: 'Design Brief' },
  { id: 'caption', label: 'Caption' },
  { id: 'hashtags', label: 'Hashtags' },
  { id: 'type', label: 'Post Type' },
  { id: 'outlet', label: 'Outlet' },
  { id: 'images', label: 'Images' },
  { id: 'contentFormats', label: 'Content Formats' },
  { id: 'link', label: 'Product Link' },
  { id: 'campaignType', label: 'Campaign Type' },
  { id: 'campaignName', label: 'Campaign Name' },
  { id: 'platforms', label: 'Target Platforms' },
];

const VARIATIONS = [
  { id: 'calendar', label: 'Calendar Grid', icon: LayoutGrid, desc: 'Visual monthly calendar view' },
  { id: 'list', label: 'Detailed List', icon: List, desc: 'Row-by-row list of all posts' },
  { id: 'summary', label: 'Summary Report', icon: BarChart3, desc: 'Counts and distribution by type/outlet' },
  { id: 'timeline', label: 'Timeline View', icon: Clock, desc: 'Chronological roadmap of posts' },
];

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [visibleFields, setVisibleFields] = useState<string[]>(['title', 'caption', 'type', 'outlet', 'images', 'campaignType', 'campaignName', 'platforms', 'contentFormats']);
  const [viewVariation, setViewVariation] = useState<ExportViewVariation>('calendar');
  const [startMonth, setStartMonth] = useState<Date>(startOfMonth(new Date()));
  const [endMonth, setEndMonth] = useState<Date>(startOfMonth(new Date()));
  const [showBanner, setShowBanner] = useState(true);
  const [layoutStyle, setLayoutStyle] = useState<'Light' | 'Dark'>('Dark');
  const [accentColor, setAccentColor] = useState('#2383E2');

  if (!isOpen) return null;

  const toggleField = (id: string) => {
    setVisibleFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // Generate month options (6 months back, 18 months forward)
  const monthOptions = Array.from({ length: 24 }).map((_, i) => {
    const date = addMonths(subMonths(startOfMonth(new Date()), 6), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
      date
    };
  });

  const handleExport = () => {
    onExport({ 
      visibleFields, 
      viewVariation,
      startMonth,
      endMonth,
      showBanner,
      layoutStyle,
      accentColor
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1C1C1C] w-full max-w-2xl rounded-[16px]  overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E]">
        <div className="flex items-center justify-between p-6 border-bottom border-[#F1F1F0] dark:border-[#2E2E2E]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-[8px]">
              <Download className="w-5 h-5 text-[#37352F] dark:text-[#D4D4D8]" />
            </div>
            <h2 className="text-xl font-bold text-[#37352F] dark:text-[#D4D4D8]">Export to Excel</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F1F1F0] dark:hover:bg-[#2E2E2E] rounded-full transition-colors">
            <X className="w-5 h-5 text-[#757681]" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
          {/* Month Range Selection */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Export Range (Max 1 Year)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#757681] uppercase tracking-widest">Start Month</span>
                <select 
                  value={format(startMonth, 'yyyy-MM')}
                  onChange={(e) => {
                    const newStart = parseISO(e.target.value + '-01');
                    setStartMonth(newStart);
                    if (isBefore(endMonth, newStart)) {
                      setEndMonth(newStart);
                    } else if (differenceInMonths(endMonth, newStart) >= 12) {
                      setEndMonth(addMonths(newStart, 11));
                    }
                  }}
                  className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-[#2383E2] outline-none transition-all"
                >
                  {monthOptions.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#757681] uppercase tracking-widest">End Month</span>
                <select 
                  value={format(endMonth, 'yyyy-MM')}
                  onChange={(e) => setEndMonth(parseISO(e.target.value + '-01'))}
                  className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-[#2383E2] outline-none transition-all"
                >
                  {monthOptions.map(m => {
                    const mDate = parseISO(m.value + '-01');
                    const diff = differenceInMonths(mDate, startMonth);
                    const isDisabled = isBefore(mDate, startMonth) || diff >= 12;
                    return (
                      <option key={m.value} value={m.value} disabled={isDisabled}>
                        {m.label} {diff >= 12 ? '(Max 1 Year)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-[#757681] italic">
              * Each month will be exported as a separate tab in the Excel file.
            </p>
          </div>

          {/* View Variation */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider">Select View Variation</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {VARIATIONS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setViewVariation(v.id as ExportViewVariation)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-[12px] border-2 transition-all text-center",
                    viewVariation === v.id
                      ? "border-[#37352F] dark:border-[#D4D4D8] bg-[#F7F7F5] dark:bg-[#2E2E2E]"
                      : "border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-[#D4D4D8] dark:hover:border-[#404040]"
                  )}
                >
                  <v.icon className={cn("w-6 h-6", viewVariation === v.id ? "text-[#37352F] dark:text-[#D4D4D8]" : "text-[#757681]")} />
                  <div>
                    <div className="font-bold text-sm text-[#37352F] dark:text-[#D4D4D8]">{v.label}</div>
                    <div className="text-[10px] text-[#757681] mt-1">{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Visible Fields */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-wider">Visible Information</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_FIELDS.map((field) => (
                <button
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-[8px] border transition-all text-left",
                    visibleFields.includes(field.id)
                      ? "bg-[#37352F] text-white border-[#37352F]"
                      : "bg-white dark:bg-[#1C1C1C] text-[#37352F] dark:text-[#D4D4D8] border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-[#D4D4D8]"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-[4px] border flex items-center justify-center",
                    visibleFields.includes(field.id) ? "bg-white border-white" : "border-[#D4D4D8]"
                  )}>
                    {visibleFields.includes(field.id) && <Check className="w-3 h-3 text-[#37352F]" />}
                  </div>
                  <span className="text-xs font-medium">{field.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="pt-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#37352F] dark:text-[#D4D4D8]">Export Banner</h4>
                <p className="text-[10px] text-[#757681]">Add a branding banner at the end of the file</p>
              </div>
              <button 
                onClick={() => setShowBanner(!showBanner)}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  showBanner ? "bg-[#2383E2]" : "bg-[#E9E9E7] dark:bg-[#2E2E2E]"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                  showBanner ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#37352F] dark:text-[#D4D4D8]">Layout Style</h4>
                <div className="flex gap-3">
                  {['Light', 'Dark'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setLayoutStyle(style as 'Light' | 'Dark')}
                      className={cn(
                        "flex-1 py-2 px-4 rounded-[8px] border text-xs font-bold capitalize transition-all",
                        layoutStyle === style
                          ? "bg-[#37352F] text-white border-[#37352F]"
                          : "bg-white dark:bg-[#1C1C1C] text-[#37352F] dark:text-[#D4D4D8] border-[#E9E9E7] dark:border-[#2E2E2E]"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#37352F] dark:text-[#D4D4D8]">Accent Color</h4>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-[8px] cursor-pointer border-none bg-transparent"
                  />
                  <div className="flex gap-2">
                    {['#2383E2', '#E11D48', '#10B981', '#F59E0B', '#8B5CF6'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all",
                          accentColor === color ? "border-[#37352F] scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#F7F7F5] dark:bg-[#252525] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-[#757681] hover:bg-[#E9E9E7] dark:hover:bg-[#333] rounded-[8px] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-8 py-2.5 bg-[#37352F] dark:bg-[#D4D4D8] text-white dark:text-[#1C1C1C] rounded-[8px] text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Generate Excel
          </button>
        </div>
      </div>
    </div>
  );
}
