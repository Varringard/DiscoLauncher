import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { ServerList } from './components/ServerList';
import { AccountsModal } from './components/AccountsModal';
import { SettingsTab } from './components/SettingsTab';
import { PlayBar } from './components/PlayBar';
import { UserAccount, ServerProfile, LauncherSettings, LaunchProgress, MinecraftVersionItem } from './types';
import { getVersionForServer } from './utils/versionHelper';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('servers');
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);

  // Auto-updating State (seamless without prompts)
  const [updatingState, setUpdatingState] = useState<{
    stage: 'downloading' | 'installing' | 'error';
    percent: number;
    version: string;
    error?: string;
  } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<LauncherSettings>({
    javaPath: '',
    allocatedRamMb: 4096,
    windowWidth: 1140,
    windowHeight: 720,
    fullscreen: false,
    gameDir: '',
    serverApiUrl: '',
    autoCloseOnLaunch: false,
    showConsoleOnLaunch: false
  });

  // Accounts State
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null);

  // Servers State
  const [servers, setServers] = useState<ServerProfile[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerProfile | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<MinecraftVersionItem | null>(null);

  // Launch & Progress State
  const [launchProgress, setLaunchProgress] = useState<LaunchProgress>({
    stage: 'idle',
    percent: 0,
    detail: ''
  });
  const [logs, setLogs] = useState<string[]>([]);

  // Load saved accounts and settings on mount
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.getDefaultGameDir?.().then((defaultDir: string) => {
      api.getStoreValue('settings').then((storedSettings: any) => {
        let finalDir = storedSettings?.gameDir || defaultDir || '';
        if (finalDir.includes('.minecraft-launcher') || finalDir.endsWith('\\.minecraft') || finalDir.endsWith('/.minecraft')) {
          finalDir = defaultDir || '';
        }
        let serverUrl = storedSettings?.serverApiUrl || 'http://192.168.10.123:6500';
        if (serverUrl.includes(':3000')) {
          serverUrl = serverUrl.replace(':3000', ':6500');
        }
        const merged = {
          ...(storedSettings || {}),
          gameDir: finalDir,
          serverApiUrl: serverUrl
        };
        setSettings((prev) => ({ ...prev, ...merged }));
        if (storedSettings && (storedSettings.gameDir !== finalDir || storedSettings.serverApiUrl !== serverUrl)) {
          api.setStoreValue('settings', merged);
        }
      });
    });

    Promise.all([
      api.getStoreValue('accounts'),
      api.getStoreValue('activeAccountId')
    ]).then(([storedAccounts, savedActiveId]: [any, any]) => {
      if (storedAccounts && Array.isArray(storedAccounts) && storedAccounts.length > 0) {
        const healed = storedAccounts.map((a: UserAccount) => {
          if (a.type === 'elyby' && (!a.skinUrl || a.skinUrl.includes('skinsystem.ely.by/textures/'))) {
            return {
              ...a,
              skinUrl: `https://skinsystem.ely.by/skins/${encodeURIComponent(a.username)}.png`,
              capeUrl: `https://skinsystem.ely.by/cloaks/${encodeURIComponent(a.username)}.png`
            };
          }
          return a;
        });
        setAccounts(healed);
        api.setStoreValue('accounts', healed);
        const found = healed.find((a: UserAccount) => a.id === savedActiveId) || healed[0];
        setActiveAccount(found);
      } else {
        // Default guest account if none yet
        const defaultUser: UserAccount = {
          id: 'offline_player',
          username: 'Player',
          uuid: '00000000-0000-0000-0000-000000000001',
          type: 'offline',
          skinUrl: 'https://minotar.net/skin/Player',
          lastUsed: Date.now()
        };
        setAccounts([defaultUser]);
        setActiveAccount(defaultUser);
        api.setStoreValue('accounts', [defaultUser]);
        api.setStoreValue('activeAccountId', defaultUser.id);
      }
    });

    // Listen to progress & logs
    const unsubProgress = api.onLaunchProgress((data: LaunchProgress) => {
      setLaunchProgress(data);
    });

    const unsubLogs = api.onGameLog((line: string) => {
      setLogs((prev) => [...prev, line]);
    });

    // Auto-updater status (seamless silent update)
    const unsubUpdateStatus = api.onUpdateStatus?.((data: any) => {
      setUpdatingState(data);
    });

    return () => {
      unsubProgress?.();
      unsubLogs?.();
      unsubUpdateStatus?.();
    };
  }, []);

  // Real-time server polling from backend
  useEffect(() => {
    if (!settings.serverApiUrl || !settings.serverApiUrl.trim()) {
      setServers([]);
      setSelectedServer(null);
      return;
    }

    const cleanUrl = settings.serverApiUrl.trim().replace(/\/$/, '');

    const fetchServers = () => {
      fetch(`${cleanUrl}/api/servers?_t=${Date.now()}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setServers(data);
            if (data.length > 0) {
              setSelectedServer((prev) => {
                const found = data.find((s) => s.id === prev?.id) || data[0];
                setSelectedVersion((prevV) => prevV || getVersionForServer(found));
                return found;
              });
            } else {
              setSelectedServer(null);
              setSelectedVersion(null);
            }
          }
        })
        .catch((err) => {
          console.warn('Backend server list fetch error:', err);
        });
    };

    // Initial fetch
    fetchServers();

    // Auto-refresh servers every 6 seconds in background
    const interval = setInterval(fetchServers, 6000);

    // Refresh immediately when window regains focus
    const onFocus = () => fetchServers();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [settings.serverApiUrl]);

  // Auto-sync active account skin with cache-buster when opening skin tab or switching account
  useEffect(() => {
    if (!activeAccount) return;
    const currentUrl = activeAccount.skinUrl || '';
    if (currentUrl.startsWith('data:') || currentUrl.startsWith('file:')) return;

    let targetBase = currentUrl;
    if (!targetBase || targetBase.includes('skinsystem.ely.by/textures/')) {
      targetBase = activeAccount.type === 'elyby'
        ? `https://skinsystem.ely.by/skins/${activeAccount.username}.png`
        : `https://minotar.net/skin/${activeAccount.username}`;
    }

    const clean = targetBase.replace(/([?&])_t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
    const sep = clean.includes('?') ? '&' : '?';
    const freshUrl = `${clean}${sep}_t=${Date.now()}`;

    if (freshUrl !== activeAccount.skinUrl) {
      setActiveAccount((prev) => prev ? { ...prev, skinUrl: freshUrl, lastUsed: Date.now() } : null);
    }
  }, [currentTab, activeAccount?.id, activeAccount?.username]);

  // Account actions
  const handleSaveAndSelectAccount = (account: UserAccount) => {
    setActiveAccount(account);
    (window as any).electronAPI?.setStoreValue('activeAccountId', account.id);
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      const updated = exists
        ? prev.map((a) => (a.id === account.id ? { ...account, lastUsed: Date.now() } : a))
        : [{ ...account, lastUsed: Date.now() }, ...prev];
      (window as any).electronAPI?.setStoreValue('accounts', updated);
      return updated;
    });
  };

  const handleSelectAccount = (account: UserAccount) => {
    setActiveAccount(account);
    (window as any).electronAPI?.setStoreValue('activeAccountId', account.id);
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === account.id ? { ...a, lastUsed: Date.now() } : a));
      (window as any).electronAPI?.setStoreValue('accounts', updated);
      return updated;
    });
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      (window as any).electronAPI?.setStoreValue('accounts', updated);
      if (activeAccount?.id === id) {
        const next = updated[0] || null;
        setActiveAccount(next);
        if (next) {
          (window as any).electronAPI?.setStoreValue('activeAccountId', next.id);
        }
      }
      return updated;
    });
  };

  // Launch Game Action
  const handleLaunch = async () => {
    if (!selectedServer || !activeAccount) return;

    const api = (window as any).electronAPI;
    if (!api) {
      alert('Запуск игры доступен в настольном приложении Electron.');
      return;
    }

    setLogs([]);
    setLogs((prev) => [...prev, `[Launcher] Проверка и синхронизация сервера ${selectedServer.name}...`]);

    try {
      // 1. Sync files with server
      const targetBaseUrl = (settings.serverApiUrl || 'http://192.168.10.123:6500').replace(/\/$/, '');
      const rawManifest = selectedServer.manifestUrl || (selectedServer as any).manifest_url || `/api/servers/${selectedServer.id}/manifest`;
      const manifestUrl = (rawManifest && typeof rawManifest === 'string' && rawManifest.startsWith('http'))
        ? rawManifest
        : `${targetBaseUrl}${rawManifest && rawManifest.startsWith('/') ? '' : '/'}${rawManifest || ''}`;

      const syncResult = await api.syncServerFiles({
        serverId: selectedServer.id,
        manifestUrl,
        gameDir: settings.gameDir,
        baseUrl: targetBaseUrl
      });

      if (!syncResult.success) {
        console.warn('Sync notice:', syncResult.error);
        setLogs((prev) => [...prev, `[Launcher] Синхронизация: ${syncResult.error}`]);
      } else {
        setLogs((prev) => [...prev, `[Launcher] Проверено файлов: обновлено ${syncResult.updatedCount}`]);
      }

      // 2. Launch Minecraft
      const versionToLaunch = selectedVersion || getVersionForServer(selectedServer);
      await api.launchGame({
        account: activeAccount,
        server: selectedServer,
        selectedVersion: versionToLaunch,
        settings,
        authlibServerUrl: settings.serverApiUrl
      });
    } catch (err: any) {
      setLaunchProgress({
        stage: 'error',
        percent: 0,
        detail: `Ошибка запуска: ${err.message}`
      });
      setLogs((prev) => [...prev, `[Launcher ERROR] ${err.message}`]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100">
      {/* Top draggable header */}
      <Header
        activeAccount={activeAccount}
        onOpenAccounts={() => setIsAccountsOpen(true)}
      />

      {/* Auto-update Progress Overlay (Seamless, zero clicks required) */}
      {updatingState && updatingState.stage !== 'error' && (
        <div className="fixed inset-0 z-[100] bg-[#070a10]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
          <div className="p-8 rounded-3xl bg-[#0e1320] border border-indigo-500/30 shadow-2xl max-w-sm w-full flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mb-5 text-cyan-400">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight mb-1">
              Обновление DiscoLauncher
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {updatingState.stage === 'downloading'
                ? `Загрузка новой версии v${updatingState.version}...`
                : 'Установка и перезапуск лаунчера...'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/60 mb-3">
              <div
                className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${updatingState.percent}%` }}
              />
            </div>

            <div className="flex justify-between w-full text-[11px] font-mono text-slate-400">
              <span className="text-indigo-300">v1.0.0 → v{updatingState.version}</span>
              <span className="text-cyan-400 font-bold">{updatingState.percent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation tabs */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative">
        {currentTab === 'servers' && (
          <ServerList
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={(srv) => setSelectedServer(srv)}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab
            settings={settings}
            serversCount={servers.length}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              (window as any).electronAPI?.setStoreValue('settings', newSettings);
            }}
          />
        )}
      </main>

      {/* Bottom Play Action Bar (Only on servers tab) */}
      {currentTab === 'servers' && (
        <PlayBar
          servers={servers}
          selectedServer={selectedServer}
          onSelectServer={(srv) => {
            setSelectedServer(srv);
            setSelectedVersion(getVersionForServer(srv));
          }}
          selectedVersion={selectedVersion}
          onSelectVersion={(ver) => setSelectedVersion(ver)}
          activeAccount={activeAccount}
          ramMb={settings.allocatedRamMb}
          onSetRamMb={(ram) => setSettings({ ...settings, allocatedRamMb: ram })}
          onLaunch={handleLaunch}
          progress={launchProgress}
          logs={logs}
        />
      )}

      {/* Accounts Modal */}
      <AccountsModal
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        accounts={accounts}
        activeAccount={activeAccount}
        onSelectAccount={handleSelectAccount}
        onSaveAndSelectAccount={handleSaveAndSelectAccount}
        onRemoveAccount={handleRemoveAccount}
      />
    </div>
  );
};

export default App;
