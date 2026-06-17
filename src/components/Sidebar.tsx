import React from 'react';
import { X, Copy, Check, Download, MessageSquare, Search, Calendar, FileSpreadsheet, Sparkles, ArrowRight, Hop as Home, Settings, Bell, User, LayoutDashboard, FolderOpen, ChartBar as BarChart3, Zap, Menu, Rss, Circle as HelpCircle, Bookmark, FileText, Command } from 'lucide-react';
import { strategyNotes, hashtagBank } from '../data';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onOpenCaptionMaker: () => void;
  onOpenExcelImport: () => void;
  onOpenBulkGenerator: () => void;
  activeTab: 'schedule' | 'search';
  onTabChange: (tab: 'schedule' | 'search') => void;
  isAdmin?: boolean;
}

type SidebarStyle = 'classic' | 'expanded' | 'island' | 'dock';

function getSidebarStyle(): SidebarStyle {
  if (typeof document === 'undefined') return 'classic';
  return (document.documentElement.getAttribute('data-sidebar-style') as SidebarStyle) || 'classic';
}

const navItems = [
  { id: 'home', label: 'Home', desc: 'Dashboard overview', icon: Home, active: false },
  { id: 'schedule', label: 'Schedule', desc: 'Content calendar', icon: Calendar, active: false },
  { id: 'search', label: 'Search', desc: 'Find products', icon: Search, active: false },
  { id: 'caption', label: 'Caption Maker', desc: 'AI-powered tool', icon: MessageSquare, active: false },
  { id: 'bulk', label: 'Bulk Generator', desc: 'Create in batch', icon: Sparkles, active: false },
  { id: 'excel', label: 'Excel Import', desc: 'Data migration', icon: FileSpreadsheet, active: false },
  { id: 'settings', label: 'Settings', desc: 'Preferences', icon: Settings, active: false },
];

export function Sidebar({
  isOpen,
  onClose,
  onExport,
  onOpenCaptionMaker,
  onOpenExcelImport,
  onOpenBulkGenerator,
  activeTab,
  onTabChange,
  isAdmin
}: SidebarProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [sidebarStyle, setSidebarStyle] = React.useState<SidebarStyle>('classic');

  React.useEffect(() => {
    const updateStyle = () => setSidebarStyle(getSidebarStyle());
    updateStyle();
    const observer = new MutationObserver(updateStyle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sidebar-style'] });
    return () => observer.disconnect();
  }, []);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNavClick = (id: string) => {
    switch (id) {
      case 'schedule':
        onTabChange('schedule');
        break;
      case 'search':
        onTabChange('search');
        break;
      case 'caption':
        onOpenCaptionMaker();
        break;
      case 'bulk':
        onOpenBulkGenerator();
        break;
      case 'excel':
        onOpenExcelImport();
        break;
    }
    onClose();
  };

  if (sidebarStyle === 'dock') {
    return <DockSidebar sidebarStyle={sidebarStyle} onNavClick={handleNavClick} activeTab={activeTab} isOpen={isOpen} isAdmin={isAdmin} />;
  }

  if (sidebarStyle === 'island') {
    return <IslandSidebar sidebarStyle={sidebarStyle} onNavClick={handleNavClick} activeTab={activeTab} isOpen={isOpen} isAdmin={isAdmin} onClose={onClose} />;
  }

  if (sidebarStyle === 'expanded') {
    return <ExpandedSidebar sidebarStyle={sidebarStyle} onNavClick={handleNavClick} activeTab={activeTab} isOpen={isOpen} isAdmin={isAdmin} onClose={onClose} onExport={onExport} copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />;
  }

  return (
    <ClassicSidebar
      sidebarStyle={sidebarStyle}
      onNavClick={handleNavClick}
      activeTab={activeTab}
      isOpen={isOpen}
      onClose={onClose}
      onExport={onExport}
      isAdmin={isAdmin}
      copyToClipboard={copyToClipboard}
      copiedIndex={copiedIndex}
    />
  );
}

function ClassicSidebar({ sidebarStyle, onNavClick, activeTab, isOpen, onClose, onExport, isAdmin, copyToClipboard, copiedIndex }: {
  sidebarStyle: SidebarStyle;
  onNavClick: (id: string) => void;
  activeTab: 'schedule' | 'search';
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  isAdmin?: boolean;
  copyToClipboard: (text: string, index: number) => void;
  copiedIndex: number | null;
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed top-0 right-0 h-full w-80 bg-white dark:bg-[#1A1A1A] z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col border-l border-[#E9E9E7] dark:border-[#2E2E2E]",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:static lg:block lg:w-80 lg:flex-shrink-0"
      )}>
        <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-between items-center sticky top-0 bg-white dark:bg-[#1A1A1A] z-10">
          <h2 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">Strategy & Resources</h2>
          <button onClick={onClose} aria-label="Close Sidebar" className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] rounded-lg lg:hidden">
            <X className="w-5 h-5 text-[#757681]" />
          </button>
        </div>

        <div className="p-4 space-y-6 flex-1">
          <section>
            <h3 className="text-xs font-medium text-[#757681] uppercase tracking-wider mb-3">Navigation</h3>
            <div className="flex flex-col gap-1">
              {navItems.filter(item => isAdmin || !['bulk', 'excel'].includes(item.id)).map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavClick(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                    (activeTab === item.id || (item.id === 'schedule' && activeTab === 'schedule'))
                      ? "nav-pill-active"
                      : "hover:bg-[#F7F7F5] dark:hover:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED]"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-[#757681] uppercase tracking-wider mb-3">Strategy Notes</h3>
            <ul className="space-y-3">
              {strategyNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-[#37352F] dark:text-[#EBE9ED]">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-medium text-[#757681] uppercase tracking-wider mb-3">Hashtag Bank</h3>
            <div className="flex flex-wrap gap-2">
              {hashtagBank.map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => copyToClipboard(tag, idx)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#E9E9E7] dark:hover:bg-[#2E2E2E] text-xs text-[#37352F] dark:text-[#EBE9ED] rounded-md transition-colors"
                >
                  {copiedIndex === idx ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  {tag}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#1A1A1A] sm:hidden">
          <button
            onClick={() => { onExport(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white hover:bg-brand-hover rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Schedule
          </button>
        </div>
      </div>
    </>
  );
}

function ExpandedSidebar({ sidebarStyle, onNavClick, activeTab, isOpen, onClose, onExport, isAdmin, copyToClipboard, copiedIndex }: {
  sidebarStyle: SidebarStyle;
  onNavClick: (id: string) => void;
  activeTab: 'schedule' | 'search';
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  isAdmin?: boolean;
  copyToClipboard: (text: string, index: number) => void;
  copiedIndex: number | null;
}) {
  const [activeSection, setActiveSection] = React.useState('home');

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#1A1A1A] z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col border-r border-[#E9E9E7] dark:border-[#2E2E2E]",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:static lg:block"
      )}>
        <div className="p-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[#37352F] dark:text-[#EBE9ED]">Forge</h1>
              <p className="text-[10px] text-[#757681]">Content Manager</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {navItems.filter(item => isAdmin || !['bulk', 'excel'].includes(item.id)).map(item => {
            const isActive = activeTab === item.id || (item.id === 'schedule' && activeTab === 'schedule');
            return (
              <button
                key={item.id}
                onClick={() => { onNavClick(item.id); setActiveSection(item.id); }}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all",
                  isActive
                    ? "bg-brand text-white shadow-lg shadow-brand/25"
                    : "hover:bg-[#F7F7F5] dark:hover:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED]"
                )}
              >
                <item.icon
                  className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-brand")}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? "currentColor" : "none"}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold text-sm", isActive && "text-white")}>{item.label}</p>
                  <p className={cn("text-[11px] leading-tight", isActive ? "text-white/70" : "text-[#757681]")}>{item.desc}</p>
                </div>
              </button>
            );
          })}

        </nav>

        <div className="p-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-[#757681] uppercase tracking-wider mb-2">Hashtags</p>
            <div className="flex flex-wrap gap-1.5">
              {hashtagBank.slice(0, 5).map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => copyToClipboard(tag, idx)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 hover:bg-brand/20 text-brand text-[10px] font-medium rounded-md transition-colors"
                >
                  {copiedIndex === idx ? <Check className="w-2.5 h-2.5" /> : null}
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { onExport(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-hover transition-colors shadow-lg shadow-brand/20"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </aside>
    </>
  );
}

function IslandSidebar({ sidebarStyle, onNavClick, activeTab, isOpen, onClose, isAdmin }: {
  sidebarStyle: SidebarStyle;
  onNavClick: (id: string) => void;
  activeTab: 'schedule' | 'search';
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed top-4 left-4 bottom-4 w-20 glass-panel rounded-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0 lg:static"
      )}>
        <div className="p-4 flex justify-center border-b border-[#E9E9E7]/50 dark:border-[#2E2E2E]/50">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-brand" />
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-2">
          {navItems.filter(item => isAdmin || !['bulk', 'excel'].includes(item.id)).map(item => {
            const isActive = activeTab === item.id || (item.id === 'schedule' && activeTab === 'schedule');
            return (
              <button
                key={item.id}
                onClick={() => onNavClick(item.id)}
                className={cn(
                  "w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                  isActive
                    ? "bg-brand text-white shadow-lg shadow-brand/30"
                    : "hover:bg-[#F7F7F5]/80 dark:hover:bg-[#202020]/80 text-[#757681] dark:text-[#9B9A97]"
                )}
                title={item.label}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-white" : "bg-brand/40")} />
                <span className="text-[9px] font-medium leading-none">{item.label.slice(0, 4)}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E9E9E7]/50 dark:border-[#2E2E2E]/50">
          <button
            className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-[#F7F7F5]/80 dark:hover:bg-[#202020]/80 text-[#757681] transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="text-[9px] font-medium leading-none">Sett</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function DockSidebar({ sidebarStyle, onNavClick, activeTab, isOpen, isAdmin }: {
  sidebarStyle: SidebarStyle;
  onNavClick: (id: string) => void;
  activeTab: 'schedule' | 'search';
  isOpen: boolean;
  isAdmin?: boolean;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 glass-panel rounded-2xl shadow-xl shadow-black/10 border border-white/20 dark:border-[#2E2E2E]/50">
      <nav className="flex items-center gap-1">
        {navItems.filter(item => isAdmin || !['bulk', 'excel'].includes(item.id)).map((item, idx) => {
          const isActive = activeTab === item.id || (item.id === 'schedule' && activeTab === 'schedule');
          const colors = [
            'bg-rose-500 text-white',
            'bg-amber-500 text-white',
            'bg-emerald-500 text-white',
            'bg-sky-500 text-white',
            'bg-violet-500 text-white',
            'bg-brand text-white',
            'bg-[#6074b9] text-white',
          ];
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group",
                isActive
                  ? `${colors[idx % colors.length]} shadow-lg scale-110`
                  : "hover:bg-[#F7F7F5] dark:hover:bg-[#202020] text-[#757681]"
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-current shadow-lg" />
              )}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#37352F] text-white text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {item.label}
              </div>
            </button>
          );
        })}

        <div className="w-px h-8 bg-[#E9E9E7] dark:bg-[#2E2E2E] mx-1" />

        <button
          onClick={() => onNavClick('settings')}
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand/10 hover:bg-brand/20 text-brand transition-all group relative"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#37352F] text-white text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Settings
          </div>
        </button>
      </nav>
    </div>
  );
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const [sidebarStyle, setSidebarStyle] = React.useState<SidebarStyle>('classic');

  React.useEffect(() => {
    const updateStyle = () => setSidebarStyle(getSidebarStyle());
    updateStyle();
    const observer = new MutationObserver(updateStyle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sidebar-style'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn(
      "flex h-full",
      sidebarStyle === 'dock' && "pb-24"
    )}>
      {children}
    </div>
  );
}
