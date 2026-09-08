export type AccountType = 'offline' | 'microsoft' | 'elyby';

export interface UserAccount {
  id: string;
  username: string;
  uuid: string;
  type: AccountType;
  token?: string;
  refreshToken?: string;
  skinUrl?: string;
  capeUrl?: string;
  model?: 'classic' | 'slim';
  lastUsed?: number;
}

export interface ServerProfile {
  id: string;
  name: string;
  subtitle: string;
  version: string;
  modloader: 'forge' | 'fabric' | 'neoforge' | 'vanilla';
  modloaderVersion?: string;
  ip: string;
  port: number;
  online: number;
  maxOnline: number;
  status: 'online' | 'offline';
  bannerUrl?: string;
  description: string;
  totalMods?: number;
  manifestUrl: string;
}

export interface SyncFile {
  path: string; // e.g. "mods/jei.jar"
  sha1: string;
  size: number;
  url: string;
}

export interface SyncManifest {
  version: string;
  gameVersion: string;
  modloader: string;
  files: SyncFile[];
}

export interface LocalModItem {
  filename: string;
  name: string;
  size: number;
  enabled: boolean;
  updatedAt?: number;
  isServerMod?: boolean;
}

export interface LauncherSettings {
  javaPath: string;
  allocatedRamMb: number;
  windowWidth: number;
  windowHeight: number;
  fullscreen: boolean;
  gameDir: string;
  serverApiUrl: string;
  autoCloseOnLaunch: boolean;
  showConsoleOnLaunch?: boolean;
}

export interface LaunchProgress {
  stage: 'idle' | 'checking' | 'downloading' | 'verifying' | 'launching' | 'running' | 'error';
  percent: number;
  detail: string;
  currentFile?: string;
}

export interface MinecraftVersionItem {
  id: string;
  name: string;
  type: 'release' | 'snapshot' | 'neoforge' | 'fabric' | 'forge' | 'quilt';
  mcVersion: string;
  loaderVersion?: string;
}

