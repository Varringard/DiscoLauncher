import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, RefreshCw, ChevronDown, Server as ServerIcon, Check, Layers, Search, X, Star } from 'lucide-react';
import { ServerProfile, UserAccount, LaunchProgress, MinecraftVersionItem, LauncherSettings } from '../types';
import { DEFAULT_VERSIONS, getVersionForServer, fetchAllMinecraftVersions, filterVersionList } from '../utils/versionHelper';

interface PlayBarProps {
  servers: ServerProfile[];
  selectedServer: ServerProfile | null;
  onSelectServer: (server: ServerProfile) => void;
  selectedVersion: MinecraftVersionItem | null;
  onSelectVersion: (version: MinecraftVersionItem) => void;
  activeAccount: UserAccount | null;
  settings?: LauncherSettings;
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
  settings,
  ramMb,
  onSetRamMb,
  onLaunch,
  progress,
  logs
}) => {
  const [showServerSelect, setShowServerSelect] = useState(false);
  const [showVersionSelect, setShowVersionSelect] = useState(false);

  // Full versions state loaded from Mojang API
  const [allVersions, setAllVersions] = useState<MinecraftVersionItem[]>(DEFAULT_VERSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'releases' | 'modded' | 'snapshots' | 'historical'>('all');

  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all 900+ versions from Mojang manifest on mount
  useEffect(() => {
    fetchAllMinecraftVersions().then((versions) => {
      if (versions && versions.length > 0) {
        setAllVersions(versions);
      }
    });
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showVersionSelect) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [showVersionSelect]);

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

  // Compute filtered versions
  const filteredList = useMemo(() => {
    const list = filterVersionList(allVersions, settings, searchQuery, categoryFilter);

    // If a server is selected, ensure server's version is pinned at the top
    if (selectedServer) {
      const srvVer = getVersionForServer(selectedServer);
      const existsInList = list.some((v) => v.id === srvVer.id || v.name === srvVer.name);
      if (!existsInList) {
        return [srvVer, ...list];
      }
    }
    return list;
  }, [allVersions, settings, searchQuery, categoryFilter, selectedServer]);

  // Current display version
  const currentVersion = selectedVersion || (selectedServer ? getVersionForServer(selectedServer) : allVersions[0] || DEFAULT_VERSIONS[0]);
  const isBusy = progress.stage === 'checking' || progress.stage === 'downloading' || progress.stage === 'verifying' || progress.stage === 'launching';

  // Badge styling helper
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'release':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'fabric':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'neoforge':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'forge':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'quilt':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'snapshot':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'old_beta':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'old_alpha':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'release': return 'Vanilla';
      case 'fabric': return 'Fabric';
      case 'neoforge': return 'NeoForge';
      case 'forge': return 'Forge';
      case 'quilt': return 'Quilt';
      case 'snapshot': return 'Snapshot';
      case 'old_beta': return 'Beta';
      case 'old_alpha': return 'Alpha';
      default: return type;
    }
  };

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
                    <ServerIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
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

          {/* 2. Version Selector with Search & Full Mojang Manifest (900+ versions) */}
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

            {/* Version Dropdown Menu with Search, Category Filters, and 900+ Versions */}
            {showVersionSelect && (
              <div className="absolute bottom-full mb-2 left-0 w-84 sm:w-96 bg-[#0f1422] border border-indigo-950/90 rounded-2xl shadow-2xl p-2 z-50 flex flex-col max-h-[440px]">
                {/* Search Bar */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск версии (1.12.2, 1.7.10, b1.8, fabric)..."
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-1 scrollbar-none text-[10px] font-medium">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'releases', label: 'Релизы' },
                    { id: 'modded', label: 'Моды' },
                    { id: 'snapshots', label: 'Снапшоты' },
                    { id: 'historical', label: 'Beta/Alpha' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCategoryFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                        categoryFilter === tab.id
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <span className="ml-auto text-[10px] text-slate-500 font-mono pl-1">
                    {filteredList.length}
                  </span>
                </div>

                {/* Versions Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 max-h-72 scrollbar-thin scrollbar-thumb-slate-700">
                  {filteredList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Версии не найдены. Проверьте запрос или настройки фильтрации.
                    </div>
                  ) : (
                    filteredList.map((ver) => {
                      const isCur = currentVersion.id === ver.id;
                      const isServerVer = selectedServer && (ver.id.includes(selectedServer.version) && ver.type.toLowerCase().includes(selectedServer.modloader.toLowerCase()));

                      return (
                        <button
                          key={ver.id}
                          type="button"
                          onClick={() => {
                            onSelectVersion(ver);
                            setShowVersionSelect(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-mono flex items-center justify-between transition-all group ${
                            isCur
                              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isServerVer && (
                              <span title="Версия выбранного сервера" className="flex items-center">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                              </span>
                            )}
                            <span className="truncate">{ver.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-sans font-semibold ${isCur ? 'bg-white/20 text-white border-white/30' : getBadgeStyle(ver.type)}`}>
                              {getBadgeLabel(ver.type)}
                            </span>
                            {isCur && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })
                  )}
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
