import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, ChevronDown, Server as ServerIcon, Check, Layers } from 'lucide-react';
import { ServerProfile, UserAccount, LaunchProgress, MinecraftVersionItem } from '../types';
import { DEFAULT_VERSIONS, getVersionForServer } from '../utils/versionHelper';

interface PlayBarProps {
  servers: ServerProfile[];
  selectedServer: ServerProfile | null;
  onSelectServer: (server: ServerProfile) => void;
  selectedVersion: MinecraftVersionItem | null;
  onSelectVersion: (version: MinecraftVersionItem) => void;
  activeAccount: UserAccount | null;
  ramMb: number;
  onSetRamMb: (ram: number) => void;
  onLaunch: () => void;
  progress: LaunchProgress;
  logs: string[];
}

export const PlayBar: React.FC<PlayBarProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  selectedVersion,
  onSelectVersion,
  activeAccount,
  ramMb,
  onSetRamMb,
  onLaunch,
  progress,
  logs
}) => {
  const [showServerSelect, setShowServerSelect] = useState(false);
  const [showVersionSelect, setShowVersionSelect] = useState(false);

  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const versionDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(e.target as Node)) {
        setShowServerSelect(false);
      }
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target as Node)) {
        setShowVersionSelect(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute version list: ensure server's version is included at the top
  const versionList = React.useMemo(() => {
    const list = [...DEFAULT_VERSIONS];
    if (selectedServer) {
      const srvVer = getVersionForServer(selectedServer);
      const exists = list.some((v) => v.id === srvVer.id || v.name === srvVer.name);
      if (!exists) {
        list.unshift(srvVer);
      }
    }
    return list;
  }, [selectedServer]);

  // Current display version
  const currentVersion = selectedVersion || (selectedServer ? getVersionForServer(selectedServer) : DEFAULT_VERSIONS[0]);
  const isBusy = progress.stage === 'checking' || progress.stage === 'downloading' || progress.stage === 'verifying' || progress.stage === 'launching';

  return (
    <div className="relative border-t border-indigo-950/60 bg-[#090d16]/95 backdrop-blur-xl">
      {/* Progress Bar (Visible during sync / download) */}
      {progress.stage !== 'idle' && (
        <div className="w-full bg-slate-900 h-1.5 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}

      {/* Main Bar Contents */}
      <div className="px-6 py-4 flex items-center justify-between gap-6">
        {/* Left: Server and User info */}
        <div className="flex items-center gap-4 min-w-0">

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white truncate">
                {selectedServer ? selectedServer.name : 'Сервер не выбран'}
              </span>
              {selectedServer && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedServer.version}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {progress.stage !== 'idle' ? (
                <span className="text-cyan-300 flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {progress.detail}
                </span>
              ) : activeAccount ? (
                <span>Играть как <b className="text-slate-200">{activeAccount.username}</b></span>
              ) : (
                <span className="text-amber-400">Не выбран аккаунт (войдите сверху)</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Server Selector & Version Selector Dropdowns */}
        <div className="flex-1 max-w-xl mx-auto flex items-center gap-3">
          {/* 1. Server Selector */}
          <div className="flex-1 relative" ref={serverDropdownRef}>
            {selectedServer ? (
              <div>
                <button
                  type="button"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-indigo-950/80 hover:border-indigo-500/50 flex items-center justify-between text-left transition-all shadow-md group"
                  onClick={() => {
                    setShowServerSelect(!showServerSelect);
                    setShowVersionSelect(false);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${selectedServer.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{selectedServer.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {selectedServer.ip}:{selectedServer.port}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 flex-shrink-0 ml-1 ${showServerSelect ? 'rotate-180' : ''}`} />
                </button>

                {/* Server Dropdown menu */}
                {showServerSelect && (
                  <div className="absolute bottom-full mb-2 left-0 w-full bg-[#0e1422] border border-indigo-950 rounded-2xl shadow-2xl p-1.5 z-50 max-h-64 overflow-y-auto">
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between">
                      <span>Серверы ({servers.length})</span>
                      <ServerIcon className="w-3 h-3 text-indigo-400" />
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {servers.map((s) => {
                        const isCur = s.id === selectedServer.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              onSelectServer(s);
                              onSelectVersion(getVersionForServer(s));
                              setShowServerSelect(false);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-all ${
                              isCur
                                ? 'bg-indigo-600/30 border border-indigo-500/50 text-white'
                                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className={`w-2 h-2 rounded-full ${s.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              <div className="truncate">
                                <div className="text-xs font-bold truncate">{s.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{s.version} • {s.modloader}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{s.online}/{s.maxOnline}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Сервер не выбран
              </div>
            )}
          </div>

          {/* 2. Version Selector (Matching TLauncher / Prism style) */}
          <div className="flex-1 relative" ref={versionDropdownRef}>
            <button
              type="button"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-indigo-950/80 hover:border-indigo-500/50 flex items-center justify-between text-left transition-all shadow-md group"
              onClick={() => {
                setShowVersionSelect(!showVersionSelect);
                setShowServerSelect(false);
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">
                    {currentVersion.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate uppercase">
                    {currentVersion.type === 'release' ? 'Vanilla Release' : currentVersion.type}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 flex-shrink-0 ml-1 ${showVersionSelect ? 'rotate-180' : ''}`} />
            </button>

            {/* Version Dropdown Menu (Matching User Screenshot) */}
            {showVersionSelect && (
              <div className="absolute bottom-full mb-2 left-0 w-72 bg-[#141a29] border border-indigo-950/90 rounded-xl shadow-2xl p-1 z-50 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span>Выбор версии</span>
                  <span className="text-[9px] text-indigo-400 font-normal">Снапшоты и лоадеры</span>
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {versionList.map((ver) => {
                    const isCur = currentVersion.id === ver.id;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => {
                          onSelectVersion(ver);
                          setShowVersionSelect(false);
                        }}
                        className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between transition-colors ${
                          isCur
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{ver.name}</span>
                        {isCur && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Big Play Button */}
        <div className="flex items-center gap-3">

          <button
            onClick={onLaunch}
            disabled={!selectedServer || !activeAccount || isBusy}
            className="group relative px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-xl shadow-indigo-600/30 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isBusy ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>ИГРАТЬ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
