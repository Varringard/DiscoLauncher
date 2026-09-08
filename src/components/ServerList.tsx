import React from 'react';
import { ServerProfile } from '../types';
import { Wifi, Users, Layers, Sparkles, Flame, Check } from 'lucide-react';

interface ServerListProps {
  servers: ServerProfile[];
  selectedServer: ServerProfile | null;
  onSelectServer: (server: ServerProfile) => void;
}

export const ServerList: React.FC<ServerListProps> = ({
  servers,
  selectedServer,
  onSelectServer
}) => {
  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Игровые серверы
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Выберите сервер для автоматической загрузки модов и запуска игры
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>Общий онлайн: <b className="text-white">{servers.reduce((acc, s) => acc + s.online, 0)}</b> игроков</span>
        </div>
      </div>

      {/* Grid of Servers or Empty State */}
      {servers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Серверы не найдены</h2>
          <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
            В настройках лаунчера не указан адрес сервера или бекенд недоступен. Перейдите во вкладку <b>«Настройки»</b> и укажите адрес сервера (например, <code>http://192.168.10.123:6500</code>).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            const isSelected = selectedServer?.id === server.id;
            return (
              <div
                key={server.id}
                onClick={() => onSelectServer(server)}
                className={`group relative rounded-3xl overflow-hidden cursor-pointer border transition-all duration-300 flex flex-col ${
                  isSelected
                    ? 'bg-[#111728] border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-600/20 -translate-y-1'
                    : 'bg-[#0d121c]/90 border-indigo-950/60 hover:border-slate-700 hover:bg-[#111624] hover:-translate-y-0.5'
                }`}
              >
                {/* Server Card Banner */}
                <div className="h-32 relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d121c] via-transparent to-black/30" />
                  
                  {/* Status badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono">
                    <span className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-slate-200">{server.status === 'online' ? `${server.online} / ${server.maxOnline || (server as any).max_online || 50}` : 'Оффлайн'}</span>
                  </div>

                  {/* Modloader badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-500/40 text-[11px] font-semibold text-indigo-300">
                    <Layers className="w-3 h-3" />
                    <span className="capitalize">{server.modloader} {server.version}</span>
                  </div>

                  {/* Name over banner */}
                  <div className="absolute bottom-3 left-4">
                    <h3 className="text-lg font-black text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                      {server.name}
                    </h3>
                    <p className="text-xs text-indigo-200 font-medium">{server.subtitle}</p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {server.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        {server.totalMods || (server as any).total_mods || 8} модов
                      </span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        15ms
                      </span>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                    }`}>
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Выбран
                        </>
                      ) : (
                        'Выбрать'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
