import { MinecraftVersionItem, ServerProfile, VersionCategory, LauncherSettings } from '../types';

// Fallback list of popular versions in case offline or before initial fetch
export const DEFAULT_VERSIONS: MinecraftVersionItem[] = [
  { id: 'neoforge-1.21.5', name: 'NeoForge 1.21.5', type: 'neoforge', mcVersion: '1.21.5', loaderVersion: '21.5.98' },
  { id: 'fabric-1.21.5', name: 'Fabric 1.21.5', type: 'fabric', mcVersion: '1.21.5', loaderVersion: '0.16.10' },
  { id: 'quilt-1.21.5', name: 'Quilt 1.21.5', type: 'quilt', mcVersion: '1.21.5', loaderVersion: '0.27.1-beta.1' },
  { id: 'release-1.21.5', name: 'Release 1.21.5', type: 'release', mcVersion: '1.21.5' },
  { id: 'release-1.21.4', name: 'Release 1.21.4', type: 'release', mcVersion: '1.21.4' },
  { id: 'fabric-1.21.4', name: 'Fabric 1.21.4', type: 'fabric', mcVersion: '1.21.4', loaderVersion: '0.16.10' },
  { id: 'neoforge-1.21.4', name: 'NeoForge 1.21.4', type: 'neoforge', mcVersion: '1.21.4', loaderVersion: '21.4.113' },
  { id: 'release-1.20.4', name: 'Release 1.20.4', type: 'release', mcVersion: '1.20.4' },
  { id: 'forge-1.20.1', name: 'Forge 1.20.1', type: 'forge', mcVersion: '1.20.1' },
  { id: 'fabric-1.20.1', name: 'Fabric 1.20.1', type: 'fabric', mcVersion: '1.20.1', loaderVersion: '0.16.10' },
  { id: 'release-1.20.1', name: 'Release 1.20.1', type: 'release', mcVersion: '1.20.1' },
  { id: 'release-1.19.4', name: 'Release 1.19.4', type: 'release', mcVersion: '1.19.4' },
  { id: 'release-1.18.2', name: 'Release 1.18.2', type: 'release', mcVersion: '1.18.2' },
  { id: 'forge-1.16.5', name: 'Forge 1.16.5', type: 'forge', mcVersion: '1.16.5' },
  { id: 'fabric-1.16.5', name: 'Fabric 1.16.5', type: 'fabric', mcVersion: '1.16.5', loaderVersion: '0.16.10' },
  { id: 'release-1.16.5', name: 'Release 1.16.5', type: 'release', mcVersion: '1.16.5' },
  { id: 'forge-1.12.2', name: 'Forge 1.12.2', type: 'forge', mcVersion: '1.12.2' },
  { id: 'release-1.12.2', name: 'Release 1.12.2', type: 'release', mcVersion: '1.12.2' },
  { id: 'forge-1.7.10', name: 'Forge 1.7.10', type: 'forge', mcVersion: '1.7.10' },
  { id: 'release-1.7.10', name: 'Release 1.7.10', type: 'release', mcVersion: '1.7.10' },
  { id: 'release-1.5.2', name: 'Release 1.5.2', type: 'release', mcVersion: '1.5.2' },
  { id: 'release-1.2.5', name: 'Release 1.2.5', type: 'release', mcVersion: '1.2.5' },
  { id: 'release-1.0', name: 'Release 1.0', type: 'release', mcVersion: '1.0' },
  { id: 'beta-b1.8.1', name: 'Beta 1.8.1', type: 'old_beta', mcVersion: 'b1.8.1' },
  { id: 'beta-b1.7.3', name: 'Beta 1.7.3', type: 'old_beta', mcVersion: 'b1.7.3' },
  { id: 'alpha-a1.2.6', name: 'Alpha 1.2.6', type: 'old_alpha', mcVersion: 'a1.2.6' },
  { id: 'alpha-rd-132211', name: 'Classic rd-132211', type: 'old_alpha', mcVersion: 'rd-132211' }
];

const MOJANG_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const CACHE_KEY = 'discolauncher_mojang_manifest';
const CACHE_TIME_KEY = 'discolauncher_mojang_manifest_time';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface RawMojangVersion {
  id: string;
  type: string;
  url: string;
  time: string;
  releaseTime: string;
}

// Format readable version label
function formatVersionLabel(id: string, type: string): string {
  if (type === 'release') return `Release ${id}`;
  if (type === 'snapshot') return `Snapshot ${id}`;
  if (type === 'old_beta') {
    return id.startsWith('b') ? `Beta ${id.substring(1)}` : `Beta ${id}`;
  }
  if (type === 'old_alpha') {
    if (id.startsWith('a')) return `Alpha ${id.substring(1)}`;
    if (id.startsWith('c')) return `Classic ${id}`;
    if (id.startsWith('rd-')) return `Pre-Classic ${id}`;
    if (id.startsWith('inf-')) return `Infdev ${id}`;
    return `Alpha ${id}`;
  }
  return id;
}

// Convert Mojang manifest to list with modloaders
export function buildVersionListFromManifest(rawVersions: RawMojangVersion[]): MinecraftVersionItem[] {
  const result: MinecraftVersionItem[] = [];

  for (const v of rawVersions) {
    const vType = v.type as VersionCategory;
    const isRelease = vType === 'release';
    const isSnapshot = vType === 'snapshot';
    const isBeta = vType === 'old_beta';
    const isAlpha = vType === 'old_alpha';

    // 1. Modloader variants for notable releases
    if (isRelease) {
      // NeoForge for modern versions (1.20.4+)
      const parts = v.id.split('.').map(Number);
      const is120orAbove = parts[0] === 1 && (parts[1] >= 21 || (parts[1] === 20 && (parts[2] || 0) >= 4));
      if (is120orAbove) {
        result.push({
          id: `neoforge-${v.id}`,
          name: `NeoForge ${v.id}`,
          type: 'neoforge',
          mcVersion: v.id,
          releaseTime: v.releaseTime
        });
      }

      // Fabric for 1.14+
      const is114orAbove = parts[0] === 1 && parts[1] >= 14;
      if (is114orAbove) {
        result.push({
          id: `fabric-${v.id}`,
          name: `Fabric ${v.id}`,
          type: 'fabric',
          mcVersion: v.id,
          loaderVersion: '0.16.10',
          releaseTime: v.releaseTime
        });
      }

      // Forge for supported major releases
      const forgeSupported = ['1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.7.10'];
      if (forgeSupported.includes(v.id)) {
        result.push({
          id: `forge-${v.id}`,
          name: `Forge ${v.id}`,
          type: 'forge',
          mcVersion: v.id,
          releaseTime: v.releaseTime
        });
      }

      // Quilt for 1.18+
      const is118orAbove = parts[0] === 1 && parts[1] >= 18;
      if (is118orAbove) {
        result.push({
          id: `quilt-${v.id}`,
          name: `Quilt ${v.id}`,
          type: 'quilt',
          mcVersion: v.id,
          releaseTime: v.releaseTime
        });
      }
    }

    // 2. Vanilla Minecraft Version item
    result.push({
      id: `${vType}-${v.id}`,
      name: formatVersionLabel(v.id, v.type),
      type: (isRelease ? 'release' : isSnapshot ? 'snapshot' : isBeta ? 'old_beta' : isAlpha ? 'old_alpha' : 'release') as VersionCategory,
      mcVersion: v.id,
      releaseTime: v.releaseTime
    });
  }

  return result;
}

// Fetch all 600+ versions from Mojang with local cache
export async function fetchAllMinecraftVersions(): Promise<MinecraftVersionItem[]> {
  try {
    // 1. Check local cache
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTime = Number(localStorage.getItem(CACHE_TIME_KEY) || '0');
    const isCacheFresh = Date.now() - cachedTime < CACHE_TTL_MS;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If cache is fresh, return immediately
          if (isCacheFresh) {
            return buildVersionListFromManifest(parsed);
          }
          // If stale, refresh in background but return cached first
          refreshManifestInBackground();
          return buildVersionListFromManifest(parsed);
        }
      } catch (e) {}
    }

    // 2. Fetch fresh manifest from Mojang
    const res = await fetch(MOJANG_MANIFEST_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data?.versions && Array.isArray(data.versions)) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.versions));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      return buildVersionListFromManifest(data.versions);
    }
  } catch (err) {
    console.warn('[VersionHelper] Failed to fetch Mojang manifest, using fallback:', err);
  }

  return DEFAULT_VERSIONS;
}

async function refreshManifestInBackground() {
  try {
    const res = await fetch(MOJANG_MANIFEST_URL);
    if (res.ok) {
      const data = await res.json();
      if (data?.versions) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.versions));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      }
    }
  } catch (e) {}
}

// Filter versions according to user preferences and search input
export function filterVersionList(
  versions: MinecraftVersionItem[],
  settings?: Partial<LauncherSettings>,
  searchQuery: string = '',
  activeTabFilter: 'all' | 'releases' | 'modded' | 'snapshots' | 'historical' = 'all'
): MinecraftVersionItem[] {
  const showSnapshots = settings?.showSnapshots ?? true;
  const showHistorical = settings?.showHistorical ?? true;
  const showModded = settings?.showModded ?? true;

  const query = searchQuery.trim().toLowerCase();

  return versions.filter((v) => {
    // 1. Settings toggles
    if (v.type === 'snapshot' && !showSnapshots) return false;
    if ((v.type === 'old_beta' || v.type === 'old_alpha') && !showHistorical) return false;
    if (['fabric', 'forge', 'neoforge', 'quilt'].includes(v.type) && !showModded) return false;

    // 2. Category tab filter inside dropdown
    if (activeTabFilter === 'releases' && v.type !== 'release') return false;
    if (activeTabFilter === 'modded' && !['fabric', 'forge', 'neoforge', 'quilt'].includes(v.type)) return false;
    if (activeTabFilter === 'snapshots' && v.type !== 'snapshot') return false;
    if (activeTabFilter === 'historical' && v.type !== 'old_beta' && v.type !== 'old_alpha') return false;

    // 3. Search query filter
    if (query) {
      const matchName = v.name.toLowerCase().includes(query);
      const matchId = v.mcVersion.toLowerCase().includes(query);
      const matchType = v.type.toLowerCase().includes(query);
      return matchName || matchId || matchType;
    }

    return true;
  });
}

export function mapDiscoPanelModLoader(raw: string): { type: 'neoforge' | 'fabric' | 'forge' | 'quilt' | 'vanilla'; label: string } {
  const norm = (raw || '').toUpperCase().replace(/^MOD_LOADER_/, '');
  switch (norm) {
    case 'NEOFORGE':
      return { type: 'neoforge', label: 'NeoForge' };
    case 'FABRIC':
      return { type: 'fabric', label: 'Fabric' };
    case 'FORGE':
    case 'SPONGE_FORGE':
    case 'MOHIST':
    case 'CATSERVER':
    case 'ARCLIGHT':
      return { type: 'forge', label: 'Forge' };
    case 'QUILT':
      return { type: 'quilt', label: 'Quilt' };
    case 'VANILLA':
    case 'PAPER':
    case 'SPIGOT':
    case 'BUKKIT':
    case 'PURPUR':
    case 'SPONGE_VANILLA':
    case 'FOLIA':
    case 'UNSPECIFIED':
    default:
      return { type: 'vanilla', label: 'Release' };
  }
}

export function getVersionForServer(server: ServerProfile): MinecraftVersionItem {
  const mapped = mapDiscoPanelModLoader(server.modloader);
  const mcVer = server.version || '1.21.5';

  if (mapped.type === 'neoforge') {
    return {
      id: `neoforge-${mcVer}`,
      name: `NeoForge ${mcVer}`,
      type: 'neoforge',
      mcVersion: mcVer,
      loaderVersion: server.modloaderVersion || (mcVer === '1.21.5' ? '21.5.98' : undefined)
    };
  }
  if (mapped.type === 'fabric') {
    return {
      id: `fabric-${mcVer}`,
      name: `Fabric ${mcVer}`,
      type: 'fabric',
      mcVersion: mcVer,
      loaderVersion: server.modloaderVersion || '0.16.10'
    };
  }
  if (mapped.type === 'forge') {
    return {
      id: `forge-${mcVer}`,
      name: `Forge ${mcVer}`,
      type: 'forge',
      mcVersion: mcVer,
      loaderVersion: server.modloaderVersion
    };
  }
  if (mapped.type === 'quilt') {
    return {
      id: `quilt-${mcVer}`,
      name: `Quilt ${mcVer}`,
      type: 'quilt',
      mcVersion: mcVer,
      loaderVersion: server.modloaderVersion
    };
  }
  return {
    id: `release-${mcVer}`,
    name: `Release ${mcVer}`,
    type: 'release',
    mcVersion: mcVer
  };
}
