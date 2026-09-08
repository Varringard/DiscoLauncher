import React from 'react';
import { Gamepad2, Settings } from 'lucide-react';

export type TabType = 'servers' | 'settings';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'servers' as TabType, label: 'Серверы', icon: Gamepad2 },
    { id: 'settings' as TabType, label: 'Настройки', icon: Settings },
  ];

  return (
    <nav className="flex items-center gap-2 border-b border-indigo-950/40 bg-[#0c1018]/60 px-6 py-2.5 backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600/90 to-cyan-600/90 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

