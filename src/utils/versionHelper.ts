import { MinecraftVersionItem, ServerProfile } from '../types';

export const DEFAULT_VERSIONS: MinecraftVersionItem[] = [
  { id: 'neoforge-1.21.5', name: 'NeoForge 1.21.5', type: 'neoforge', mcVersion: '1.21.5', loaderVersion: '21.5.98' },
  { id: 'fabric-1.21.5', name: 'Fabric 1.21.5', type: 'fabric', mcVersion: '1.21.5', loaderVersion: '0.16.10' },
  { id: 'quilt-1.21.5', name: 'Quilt 1.21.5', type: 'quilt', mcVersion: '1.21.5', loaderVersion: '0.27.1-beta.1' },
  { id: 'forge-1.21.5', name: 'Forge 1.21.5', type: 'forge', mcVersion: '1.21.5' },
  { id: 'release-1.21.5', name: 'Release 1.21.5', type: 'release', mcVersion: '1.21.5' },
  { id: 'release-26.2', name: 'Release 26.2', type: 'release', mcVersion: '26.2' },
  { id: 'snapshot-25w18a', name: 'Snapshot 25w18a', type: 'snapshot', mcVersion: '25w18a' },
  { id: 'snapshot-25w17a', name: 'Snapshot 25w17a', type: 'snapshot', mcVersion: '25w17a' },
  { id: 'snapshot-25w16a', name: 'Snapshot 25w16a', type: 'snapshot', mcVersion: '25w16a' },
  { id: 'snapshot-25w15a', name: 'Snapshot 25w15a', type: 'snapshot', mcVersion: '25w15a' },
  { id: 'snapshot-25w14craftmine', name: 'Snapshot 25w14craftmine', type: 'snapshot', mcVersion: '25w14craftmine' },
  { id: 'snapshot-1.21.5-rc2', name: 'Snapshot 1.21.5-rc2', type: 'snapshot', mcVersion: '1.21.5-rc2' },
  { id: 'snapshot-1.21.5-rc1', name: 'Snapshot 1.21.5-rc1', type: 'snapshot', mcVersion: '1.21.5-rc1' },
  { id: 'snapshot-1.21.5-pre3', name: 'Snapshot 1.21.5-pre3', type: 'snapshot', mcVersion: '1.21.5-pre3' },
  { id: 'snapshot-1.21.5-pre2', name: 'Snapshot 1.21.5-pre2', type: 'snapshot', mcVersion: '1.21.5-pre2' },
  { id: 'snapshot-1.21.5-pre1', name: 'Snapshot 1.21.5-pre1', type: 'snapshot', mcVersion: '1.21.5-pre1' },
  { id: 'release-1.21.4', name: 'Release 1.21.4', type: 'release', mcVersion: '1.21.4' },
  { id: 'neoforge-1.21.4', name: 'NeoForge 1.21.4', type: 'neoforge', mcVersion: '1.21.4', loaderVersion: '21.4.113' },
  { id: 'fabric-1.21.4', name: 'Fabric 1.21.4', type: 'fabric', mcVersion: '1.21.4', loaderVersion: '0.16.10' },
  { id: 'release-1.20.4', name: 'Release 1.20.4', type: 'release', mcVersion: '1.20.4' },
  { id: 'forge-1.20.1', name: 'Forge 1.20.1', type: 'forge', mcVersion: '1.20.1' },
  { id: 'release-1.20.1', name: 'Release 1.20.1', type: 'release', mcVersion: '1.20.1' },
  { id: 'release-1.19.4', name: 'Release 1.19.4', type: 'release', mcVersion: '1.19.4' },
  { id: 'release-1.18.2', name: 'Release 1.18.2', type: 'release', mcVersion: '1.18.2' },
  { id: 'release-1.16.5', name: 'Release 1.16.5', type: 'release', mcVersion: '1.16.5' },
  { id: 'forge-1.16.5', name: 'Forge 1.16.5', type: 'forge', mcVersion: '1.16.5' },
  { id: 'release-1.12.2', name: 'Release 1.12.2', type: 'release', mcVersion: '1.12.2' },
  { id: 'forge-1.12.2', name: 'Forge 1.12.2', type: 'forge', mcVersion: '1.12.2' },
  { id: 'release-1.7.10', name: 'Release 1.7.10', type: 'release', mcVersion: '1.7.10' }
];

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
