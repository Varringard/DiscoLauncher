import React, { useEffect, useRef, useState } from 'react';
import * as skinview3d from 'skinview3d';
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { UserAccount } from '../types';

interface SkinViewerProps {
  activeAccount: UserAccount | null;
  onSkinUpdated: (newSkinUrl: string) => void;
  width?: number;
  height?: number;
}

const getInitialSkinUrl = (acc: UserAccount | null) => {
  if (!acc) return 'https://minotar.net/skin/Steve';
  const timestamp = Date.now();
  if (acc.skinUrl) {
    const url = acc.skinUrl.includes('skinsystem.ely.by/textures/')
      ? `https://skinsystem.ely.by/skins/${encodeURIComponent(acc.username)}.png`
      : acc.skinUrl;
    const clean = url.replace(/([?&])_t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
    const sep = clean.includes('?') ? '&' : '?';
    return clean.startsWith('data:') || clean.startsWith('file:') ? clean : `${clean}${sep}_t=${timestamp}`;
  }
  if (acc.type === 'elyby') {
    return `https://skinsystem.ely.by/skins/${encodeURIComponent(acc.username)}.png?_t=${timestamp}`;
  }
  return `https://minotar.net/skin/${encodeURIComponent(acc.username)}?_t=${timestamp}`;
};

const getInitialCapeUrl = (acc: UserAccount | null) => {
  if (!acc) return null;
  const timestamp = Date.now();
  if (acc.capeUrl) {
    const clean = acc.capeUrl.replace(/([?&])_t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
    const sep = clean.includes('?') ? '&' : '?';
    return clean.startsWith('data:') || clean.startsWith('file:') ? clean : `${clean}${sep}_t=${timestamp}`;
  }
  if (acc.type === 'elyby') {
    return `https://skinsystem.ely.by/cloaks/${encodeURIComponent(acc.username)}.png?_t=${timestamp}`;
  }
  return null;
};

export const SkinViewer3D: React.FC<SkinViewerProps> = ({
  activeAccount,
  onSkinUpdated,
  width = 280,
  height = 360
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);

  // States initialized synchronously - ZERO Steve flicker!
  const [animationType, setAnimationType] = useState<'idle' | 'walk' | 'run'>('idle');
  const [currentSkinUrl, setCurrentSkinUrl] = useState<string>(() => getInitialSkinUrl(activeAccount));
  const [currentCapeUrl, setCurrentCapeUrl] = useState<string | null>(() => getInitialCapeUrl(activeAccount));
  const [hasValidCape, setHasValidCape] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Setup viewer on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const initialSkin = getInitialSkinUrl(activeAccount);
    const initialCape = getInitialCapeUrl(activeAccount);

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: initialSkin
    });

    viewer.camera.position.z = 70;
    viewer.camera.position.y = -10;
    viewer.zoom = 0.9;
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;

    // Default animation
    const anim = new skinview3d.IdleAnimation();
    anim.speed = 0.8;
    viewer.animation = anim;

    // Load cape if available
    if (initialCape) {
      viewer.loadCape(initialCape, { backEquipment: 'cape' })
        .then(() => setHasValidCape(true))
        .catch(() => {
          viewer.resetCape();
          setHasValidCape(false);
        });
    }

    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  // Update skin texture when activeAccount changes
  useEffect(() => {
    if (!viewerRef.current) return;
    const freshSkin = getInitialSkinUrl(activeAccount);
    setCurrentSkinUrl(freshSkin);
    viewerRef.current.loadSkin(freshSkin, {
      model: 'auto-detect'
    }).catch(err => {
      console.warn('Failed to load skin into 3D viewer:', err);
    });

    // Cape check
    const freshCape = getInitialCapeUrl(activeAccount);
    setCurrentCapeUrl(freshCape);
    if (freshCape) {
      fetch(freshCape, { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            viewerRef.current?.loadCape(freshCape, { backEquipment: 'cape' });
            setHasValidCape(true);
          } else {
            viewerRef.current?.resetCape();
            setHasValidCape(false);
          }
        })
        .catch(() => {
          viewerRef.current?.resetCape();
          setHasValidCape(false);
        });
    } else {
      viewerRef.current?.resetCape();
      setHasValidCape(false);
    }
  }, [activeAccount?.id, activeAccount?.username, activeAccount?.skinUrl, activeAccount?.capeUrl]);

  // Update animation when animationType changes
  useEffect(() => {
    if (!viewerRef.current) return;

    if (animationType === 'idle') {
      const anim = new skinview3d.IdleAnimation();
      anim.speed = 0.8;
      viewerRef.current.animation = anim;
    } else if (animationType === 'walk') {
      const anim = new skinview3d.WalkingAnimation();
      anim.speed = 0.9;
      viewerRef.current.animation = anim;
    } else if (animationType === 'run') {
      const anim = new skinview3d.RunningAnimation();
      anim.speed = 1.1;
      viewerRef.current.animation = anim;
    }
  }, [animationType]);

  // Auto-rotate toggle
  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.autoRotate = autoRotate;
    viewerRef.current.autoRotateSpeed = 1.2;
  }, [autoRotate]);

  // Set camera angle helper
  const setViewAngle = (angleRad: number) => {
    if (!viewerRef.current) return;
    setAutoRotate(false);
    viewerRef.current.autoRotate = false;
    viewerRef.current.playerWrapper.rotation.y = angleRad;
  };

  // Select local skin file
  const handleSelectLocalSkin = async () => {
    try {
      const filePath = await (window as any).electronAPI?.selectFile([
        { name: 'Minecraft Skins', extensions: ['png'] }
      ]);
      if (filePath) {
        const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
        setCurrentSkinUrl(fileUrl);
        viewerRef.current?.loadSkin(fileUrl, { model: 'auto-detect' });
        setStatusMessage({
          type: 'info',
          text: activeAccount?.type === 'microsoft'
            ? 'Скин загружен в просмотрщик. Нажмите «Загрузить скин в Mojang», чтобы сохранить в профиле.'
            : 'Скин загружен в просмотрщик.'
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Ошибка выбора файла: ' + err.message });
    }
  };

  // Upload skin directly to official Mojang profile (for Microsoft accounts)
  const handleUploadToMojang = async () => {
    if (!activeAccount || activeAccount.type !== 'microsoft') {
      setStatusMessage({ type: 'error', text: 'Прямая загрузка в Mojang доступна только для лицензионных аккаунтов Microsoft!' });
      return;
    }

    if (!activeAccount.token) {
      setStatusMessage({ type: 'error', text: 'Токен авторизации Microsoft истек. Перезайдите в аккаунт.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(currentSkinUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const mojangRes = await (window as any).electronAPI?.uploadMojangSkin({
        token: activeAccount.token,
        model: 'auto-detect',
        bufferBase64: base64
      });

      if (mojangRes?.success) {
        onSkinUpdated(currentSkinUrl);
        setStatusMessage({
          type: 'success',
          text: 'Скин успешно обновлен в вашем официальном профиле Mojang (minecraft.net)!'
        });
      } else {
        throw new Error(mojangRes?.error || 'Не удалось обновить скин в Mojang');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Ошибка загрузки скина в Mojang: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* 3D Canvas Box */}
      <div className="bg-[#090d16] border border-indigo-950/60 rounded-2xl p-3 shadow-xl relative overflow-hidden flex flex-col items-center w-full max-w-[300px]">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Canvas */}
        <div className="relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border border-slate-800/60 bg-gradient-to-b from-slate-900/40 to-[#0b0f19]">
          <canvas ref={canvasRef} className="block" />
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-slate-400 font-mono">
            Вращайте
          </div>

          {/* Quick Angles overlay */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 bg-slate-950/70 backdrop-blur-md p-1 rounded-lg border border-slate-800/80">
            <button
              onClick={() => setViewAngle(0)}
              title="Вид спереди"
              className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Спереди
            </button>
            <button
              onClick={() => setViewAngle(Math.PI)}
              title="Вид со спины"
              className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-300 hover:text-white hover:bg-indigo-600/40 transition-colors"
            >
              Спина
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title="Вращение 360°"
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                autoRotate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <RotateCw className={`w-2.5 h-2.5 ${autoRotate ? 'animate-spin' : ''}`} />
              360°
            </button>
          </div>
        </div>

        {/* Animation bar */}
        <div className="mt-2.5 flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] w-full justify-center">
          {(['idle', 'walk', 'run'] as const).map((anim) => (
            <button
              key={anim}
              onClick={() => setAnimationType(anim)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                animationType === anim
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {anim === 'idle' ? 'Покой' : anim === 'walk' ? 'Ходьба' : 'Бег'}
            </button>
          ))}
        </div>
      </div>

      {/* Account & Cape Status badge */}
      {activeAccount && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="font-bold text-white">{activeAccount.username}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/30 text-indigo-300 uppercase font-mono border border-indigo-500/20">
            {activeAccount.type}
          </span>
          {hasValidCape && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Плащ
            </span>
          )}
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`mt-3 p-2.5 rounded-xl flex items-center gap-2 text-xs border w-full max-w-[300px] ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/40 border-red-500/30 text-red-300'
              : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="leading-tight">{statusMessage.text}</span>
        </div>
      )}

      {/* Skin Actions */}
      <div className="mt-3 flex flex-col gap-2 w-full max-w-[300px]">
        {activeAccount?.type === 'microsoft' ? (
          <>
            <button
              onClick={handleSelectLocalSkin}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-950/20 hover:bg-indigo-950/40 transition-all flex items-center justify-center gap-2 text-xs text-indigo-300 font-medium"
            >
              <Upload className="w-3.5 h-3.5" />
              Выбрать PNG с компьютера
            </button>

            <button
              onClick={handleUploadToMojang}
              disabled={isUploading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Загрузка в Mojang...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Загрузить скин в Mojang
                </>
              )}
            </button>
          </>
        ) : activeAccount?.type === 'elyby' ? (
          <button
            onClick={() => (window as any).electronAPI?.openExternal('https://ely.by/skin-system')}
            className="w-full py-2.5 px-3 rounded-xl border border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/50 text-xs font-semibold text-cyan-200 flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            Каталог скинов Ely.by
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 text-center">
            Скин отображается по никнейму игрока
          </div>
        )}
      </div>
    </div>
  );
};
