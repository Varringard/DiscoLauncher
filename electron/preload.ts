import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Storage / Settings
  getStoreValue: (key: string) => ipcRenderer.invoke('store:get', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),

  // File dialogs
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  selectFile: (filters?: any) => ipcRenderer.invoke('dialog:selectFile', filters),

  // Launcher actions
  launchGame: (params: any) => ipcRenderer.invoke('launcher:launchGame', params),
  syncServerFiles: (params: any) => ipcRenderer.invoke('launcher:syncServerFiles', params),
  checkJava: () => ipcRenderer.invoke('launcher:checkJava'),
  getSystemInfo: () => ipcRenderer.invoke('launcher:getSystemInfo'),
  getDefaultGameDir: () => ipcRenderer.invoke('launcher:getDefaultGameDir'),
  openFolder: (pathStr: string) => ipcRenderer.invoke('launcher:openFolder', pathStr),
  openLogsFolder: () => ipcRenderer.invoke('launcher:openLogsFolder'),
  getLauncherPaths: () => ipcRenderer.invoke('launcher:getPaths'),
  openExternal: (url: string) => ipcRenderer.invoke('launcher:openExternal', url),
  openLogWindow: () => ipcRenderer.invoke('window:openLogWindow'),
  loginMicrosoft: () => ipcRenderer.invoke('auth:loginMicrosoft'),
  uploadMojangSkin: (params: { token: string; model: string; bufferBase64: string }) => ipcRenderer.invoke('skin:uploadMojang', params),
  getAvatarHead: (params: { username: string; type: string; skinUrl?: string }) => ipcRenderer.invoke('avatar:getHead', params),

  // Mods Management
  getMods: (gameDir?: string) => ipcRenderer.invoke('mods:getMods', gameDir),
  addMod: (gameDir?: string) => ipcRenderer.invoke('mods:addMod', gameDir),
  toggleMod: (params: { gameDir?: string; filename: string; enabled: boolean }) => ipcRenderer.invoke('mods:toggleMod', params),
  deleteMod: (params: { gameDir?: string; filename: string }) => ipcRenderer.invoke('mods:deleteMod', params),
  openModsFolder: (gameDir?: string) => ipcRenderer.invoke('mods:openFolder', gameDir),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  triggerUpdate: () => ipcRenderer.invoke('update:trigger'),

  // Events listener for download progress / logs
  onLaunchProgress: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('launch:progress', handler);
    return () => ipcRenderer.removeListener('launch:progress', handler);
  },
  onGameLog: (callback: (line: string) => void) => {
    const handler = (_: any, line: string) => callback(line);
    ipcRenderer.on('game:log', handler);
    return () => ipcRenderer.removeListener('game:log', handler);
  },
  onUpdateStatus: (callback: (status: { stage: 'downloading' | 'installing' | 'error'; percent: number; version: string; error?: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  }
});
