import React, { useState, useEffect } from 'react';
import { Settings, Cpu, HardDrive, Monitor, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, Terminal, Layers, FileText } from 'lucide-react';
import { LauncherSettings } from '../types';

interface SettingsTabProps {
  settings: LauncherSettings;
  onUpdateSettings: (newSettings: LauncherSettings) => void;
  serversCount?: number;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onUpdateSettings, serversCount = 0 }) => {
  const [javaStatus, setJavaStatus] = useState<string>('Проверка...');
  const [systemInfo, setSystemInfo] = useState<{ totalRamMb: number; freeRamMb: number; cpus: number } | null>(null);

  useEffect(() => {
    // Check Java on mount
    (window as any).electronAPI?.checkJava().then((res: any) => {
      if (res.found) {
        setJavaStatus(res.version);
      } else {
        setJavaStatus('Не обнаружена в PATH (будет использован авто-загрузчик)');
      }
    }).catch(() => {
      setJavaStatus('Авто-определение');
    });

    // Check System Info
    (window as any).electronAPI?.getSystemInfo().then((info: any) => {
      setSystemInfo(info);
    }).catch(() => {});
  }, []);

  const handleSelectGameDir = async () => {
    const dir = await (window as any).electronAPI?.selectDirectory();
    if (dir) {
      onUpdateSettings({ ...settings, gameDir: dir });
    }
  };

  const handleOpenGameDir = () => {
    (window as any).electronAPI?.openFolder(settings.gameDir);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Настройки лаунчера
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Конфигурация выделения памяти, версии Java и подключения к серверной части
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RAM Allocation */}
        <div className="bg-[#111724]/70 border border-indigo-950/40 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Выделение оперативной памяти (RAM)
            </h3>
            <span className="font-bold text-sm text-indigo-300 font-mono">
              {(settings.allocatedRamMb / 1024).toFixed(1)} GB
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Рекомендуется от 4 GB до 8 GB для сборок с модами.
            {systemInfo && ` Всего в системе: ${(systemInfo.totalRamMb / 1024).toFixed(1)} GB.`}
          </p>

          <input
            type="range"
            min="2048"
            max={systemInfo ? Math.min(16384, systemInfo.totalRamMb) : 12288}
            step="512"
            value={settings.allocatedRamMb}
            onChange={(e) => onUpdateSettings({ ...settings, allocatedRamMb: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2">
            <span>2 GB</span>
            <span>4 GB</span>
            <span>8 GB</span>
            <span>12 GB</span>
            <span>16 GB</span>
          </div>
        </div>

        {/* Java Configuration */}
        <div className="bg-[#111724]/70 border border-indigo-950/40 rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            Исполняемый файл Java
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Текущая обнаруженная версия: <b className="text-slate-200">{javaStatus}</b>
          </p>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Кастомный путь к java.exe (опционально)</label>
            <input
              type="text"
              value={settings.javaPath}
              onChange={(e) => onUpdateSettings({ ...settings, javaPath: e.target.value })}
              placeholder="java (по умолчанию из PATH)"
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Game Directory */}
        <div className="bg-[#111724]/70 border border-indigo-950/40 rounded-2xl p-5 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            Директория установки игры
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Место сохранения модов, конфигураций и миров
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={settings.gameDir}
              className="flex-1 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate"
            />
            <button
              onClick={handleSelectGameDir}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
            >
              Обзор
            </button>
            <button
              onClick={handleOpenGameDir}
              className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300"
              title="Открыть папку игры Minecraft"
            >
              Открыть
            </button>
            <button
              onClick={() => (window as any).electronAPI?.openLogsFolder?.()}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center gap-1.5"
              title="Открыть папку с логами лаунчера и игры"
            >
              <FileText className="w-3.5 h-3.5" />
              Логи
            </button>
          </div>
        </div>

        {/* Backend API Server URL */}
        <div className="bg-[#111724]/70 border border-indigo-950/40 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              Адрес бекенда лаунчера
            </h3>
            {serversCount > 0 ? (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Подключено (серверов: {serversCount})
              </span>
            ) : settings.serverApiUrl ? (
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Не удалось подключиться
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Сервер авторизации игроков, скинов и синхронизации с DiscoPanel (например, <code className="text-indigo-300 font-mono">http://192.168.10.123:6500</code>)
          </p>

          <input
            type="text"
            value={settings.serverApiUrl}
            onChange={(e) => onUpdateSettings({ ...settings, serverApiUrl: e.target.value })}
            placeholder="http://192.168.10.123:6500"
            className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Обратите внимание: адрес веб-админки (<code className="text-slate-400">http://192.168.10.123:5000</code>), а в лаунчере указывается адрес API лаунчера (<code className="text-indigo-400">http://192.168.10.123:6500</code>).
          </p>
        </div>

        {/* Minecraft Versions Display Settings */}
        <div className="bg-[#111724]/70 border border-indigo-950/40 rounded-2xl p-5 backdrop-blur-sm md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Отображение версий Minecraft
            </h3>
            <span className="text-xs text-indigo-400 font-mono">Mojang Official Manifest</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Выберите, какие категории версий отображать в списке выбора (поддерживаются все 900+ версий от 2009 года до сегодняшнего дня)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={settings.showSnapshots ?? true}
                onChange={(e) => onUpdateSettings({ ...settings, showSnapshots: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">Снапшоты (Snapshots)</span>
                <span className="text-slate-400 text-[11px]">Тестовые сборки и RC/Pre-релизы</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={settings.showHistorical ?? true}
                onChange={(e) => onUpdateSettings({ ...settings, showHistorical: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">Старые Alpha и Beta</span>
                <span className="text-slate-400 text-[11px]">Исторические версии 2009-2011 гг.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={settings.showModded ?? true}
                onChange={(e) => onUpdateSettings({ ...settings, showModded: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">Загрузчики модов</span>
                <span className="text-slate-400 text-[11px]">Fabric, Forge, NeoForge, Quilt</span>
              </div>
            </label>
          </div>
        </div>

        {/* Console & Logs Configuration */}
        <div className="bg-[#111724]/70 border border-indigo-950/40 rounded-2xl p-5 backdrop-blur-sm md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              Консоль и логи клиента
            </h3>
            <button
              onClick={() => (window as any).electronAPI?.openLogWindow?.()}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold text-purple-300 transition-colors flex items-center gap-2"
              title="Открыть отдельное окно консоли"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Открыть окно консоли логов</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Параметры отображения вывода игры Minecraft и процесса загрузки
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={settings.showConsoleOnLaunch ?? false}
                onChange={(e) => onUpdateSettings({ ...settings, showConsoleOnLaunch: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">Открывать консоль при запуске</span>
                <span className="text-slate-400 text-[11px]">Автоматически показывать отдельное окно с логами</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={settings.autoCloseOnLaunch ?? false}
                onChange={(e) => onUpdateSettings({ ...settings, autoCloseOnLaunch: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block">Скрывать лаунчер при запуске</span>
                <span className="text-slate-400 text-[11px]">Сворачивать главное окно после старта Minecraft</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
