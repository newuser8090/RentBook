import React from 'react';
import { Home, History, Settings } from 'lucide-react';
import { AppTheme } from '../App';

export type NavTab = 'home' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingCount?: number;
  theme?: AppTheme;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const tabs = [
    {
      id: 'home' as NavTab,
      label: 'Units & Bills',
      icon: Home,
      badge: null,
      testId: 'nav-btn-home',
    },
    {
      id: 'history' as NavTab,
      label: 'History',
      icon: History,
      badge: pendingCount > 0 ? pendingCount : null,
      testId: 'nav-btn-history',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
      testId: 'nav-btn-settings',
    },
  ];

  return (
    <nav
      id="bottom-navigation"
      aria-label="Main Navigation"
      className={`fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl transition-colors duration-200 print:hidden ${
        isDark 
          ? 'bg-zinc-950/95 border-zinc-800/90 text-zinc-300' 
          : 'bg-white/95 border-slate-200 text-slate-700'
      }`}
    >
      <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-around gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={tab.testId}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 py-1.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer select-none ${
                isActive
                  ? isDark 
                    ? 'text-emerald-400 font-bold' 
                    : 'text-emerald-700 font-bold'
                  : isDark 
                    ? 'text-zinc-400 hover:text-zinc-200' 
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <div className={`p-1 rounded-lg transition-colors ${
                  isActive
                    ? isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'
                    : ''
                }`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-zinc-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
