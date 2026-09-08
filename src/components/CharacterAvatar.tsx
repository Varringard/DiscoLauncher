import React, { useEffect, useRef, useState } from 'react';
import { UserAccount } from '../types';

interface CharacterAvatarProps {
  account: UserAccount;
  size?: number;
  className?: string;
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  account,
  size = 28,
  className = ''
}) => {
  const [headUrl, setHeadUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Try native Electron IPC head extractor (Jimp in main process, zero CORS)
    const api = (window as any).electronAPI;
    if (api?.getAvatarHead) {
      api.getAvatarHead({
        username: account.username,
        type: account.type,
        skinUrl: account.skinUrl
      }).then((b64: string | null) => {
        if (isMounted && b64) {
          setHeadUrl(b64);
        }
      }).catch(() => {});
    }

    // 2. Client-side canvas head extractor (no crossOrigin = anonymous to avoid CORS failures)
    const img = new Image();
    const timestamp = account.lastUsed || Date.now();
    const username = encodeURIComponent(account.username);
    const skinSrc = account.type === 'elyby'
      ? `https://skinsystem.ely.by/skins/${username}.png?_t=${timestamp}`
      : (account.skinUrl && !account.skinUrl.includes('skinsystem.ely.by/textures/')
          ? account.skinUrl
          : `https://minotar.net/skin/${username}?_t=${timestamp}`);

    img.onload = () => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;

      // Base head: x=8, y=8, w=8, h=8
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);

      // Hat / hair outer layer: x=40, y=8, w=8, h=8
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);

      setCanvasReady(true);
    };

    img.src = skinSrc;

    return () => {
      isMounted = false;
    };
  }, [account.username, account.type, account.skinUrl, account.lastUsed, size]);

  // If we have the IPC pre-rendered head base64, render it immediately
  if (headUrl) {
    return (
      <img
        src={headUrl}
        alt={account.username}
        width={size}
        height={size}
        className={className}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }

  // If client canvas drew the head, show canvas
  if (canvasReady) {
    return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={className}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }

  // Hidden canvas for rendering in progress
  return (
    <>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="hidden"
      />
      {account.type === 'elyby' ? (
        <div
          className={`${className} bg-slate-800 flex items-center justify-center font-bold text-white uppercase text-[10px]`}
          style={{ width: size, height: size }}
        >
          {account.username.slice(0, 2)}
        </div>
      ) : (
        <img
          src={`https://mc-heads.net/avatar/${encodeURIComponent(account.username)}/${size}?_t=${account.lastUsed || ''}`}
          alt={account.username}
          width={size}
          height={size}
          className={className}
          onError={(e) => {
            e.currentTarget.src = `https://minotar.net/helm/${encodeURIComponent(account.username)}/${size}.png`;
          }}
        />
      )}
    </>
  );
};
