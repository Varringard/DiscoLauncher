import React from 'react';
import { Minus, Square, X, User, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';
import { CharacterAvatar } from './CharacterAvatar';

interface HeaderProps {
  activeAccount: UserAccount | null;
  onOpenAccounts: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeAccount, onOpenAccounts }) => {
  const handleMinimize = () => {
    (window as any).electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    (window as any).electronAPI?.closeWindow();
  };

  return (
    <header className="custom-titlebar h-12 bg-[#090d14]/90 border-b border-indigo-950/40 flex items-center justify-between px-4 z-50 select-none backdrop-blur-md">
      {/* Left empty spacer for draggable titlebar */}
      <div />

      {/* Account pill & Window controls */}
      <div className="flex items-center gap-3">
        {/* Active Account Pill */}
        <button
          onClick={onOpenAccounts}
          className="no-drag flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 transition-all text-xs font-medium text-slate-200 group"
          title="Сменить аккаунт или войти"
        >
          {activeAccount ? (
            <>
              <div className="relative">
                <CharacterAvatar
                  account={activeAccount}
                  size={20}
                  className="w-5 h-5 rounded-md object-cover ring-1 ring-indigo-500/50 bg-slate-900"
                />
                <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0d111a]" />
              </div>
              <span className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                {activeAccount.username}
              </span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                {activeAccount.type}
              </span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-indigo-400" />
              <span>Войти в аккаунт</span>
            </>
          )}
        </button>

        {/* Window action buttons */}
        <div className="flex items-center gap-1 text-slate-400 no-drag ml-2">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
            title="Свернуть"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
            title="Развернуть"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-red-500/80 hover:text-white transition-colors"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
