import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { spawn, spawnSync, execSync } from 'child_process';
const { Client: MCLCClient, Authenticator: MCLCAuthenticator } = require('minecraft-launcher-core');

// =========================================================================
// AUTO-UPDATER (GitHub Releases — portable exe self-replace)
// =========================================================================
const GITHUB_OWNER = 'Varringard';
const GITHUB_REPO = 'DiscoLauncher';
const CURRENT_VERSION = app.getVersion();

async function checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string; downloadUrl?: string; releaseUrl?: string; isAsar?: boolean }> {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': 'DiscoLauncher-Updater', 'Accept': 'application/vnd.github.v3+json' }
    };
    const req = https.get(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = (release.tag_name || '').replace(/^v/, '');
          if (!latestVersion) return resolve({ hasUpdate: false });
          const hasUpdate = latestVersion !== CURRENT_VERSION && isNewerVersion(latestVersion, CURRENT_VERSION);

          // Find exe asset for release
          const exeAsset = (release.assets || []).find((a: any) => a.name.endsWith('.exe'));

          resolve({
            hasUpdate,
            version: latestVersion,
            downloadUrl: exeAsset?.browser_download_url,
            releaseUrl: release.html_url
          });
        } catch (e) {
          resolve({ hasUpdate: false });
        }
      });
    });
    req.on('error', () => resolve({ hasUpdate: false }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ hasUpdate: false }); });
  });
}

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

async function downloadUpdate(url: string, destPath: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmpPath = destPath + '.tmp';
    const file = fs.createWriteStream(tmpPath);
    const doGet = (u: string) => {
      https.get(u, { headers: { 'User-Agent': 'DiscoLauncher-Updater' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          doGet(res.headers.location!);
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        res.on('data', (chunk) => {
          received += chunk.length;
          if (total > 0) onProgress(Math.round((received / total) * 100));
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          fs.renameSync(tmpPath, destPath);
          resolve();
        });
      }).on('error', (e) => { fs.unlink(tmpPath, () => {}); reject(e); });
    };
    doGet(url);
  });
}

let mainWindow: BrowserWindow | null = null;

// Paths - unified under AppData\.DiscoLauncher
const appDataRoot = app.getPath('appData');
const discoRoot = path.join(appDataRoot, '.DiscoLauncher');
const launcherDir = path.join(discoRoot, 'Launcher');
const appBinDir = path.join(launcherDir, 'app');
const defaultMinecraftDir = path.join(launcherDir, 'Minecraft', 'game');
const logsDir = path.join(launcherDir, 'logs');
const configFilePath = path.join(discoRoot, 'config.json');

// Ensure base directories exist
for (const dir of [discoRoot, launcherDir, appBinDir, defaultMinecraftDir, logsDir]) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
}

// Redirect Electron's internal storage (cache, cookies, IndexedDB) to .DiscoLauncher/data
try {
  app.setPath('userData', path.join(discoRoot, 'data'));
} catch (e) {
  console.warn('Could not set custom userData path:', e);
}

// File Logging: logs/launcher.log and logs/latest.log
const launcherLogPath = path.join(logsDir, 'launcher.log');
const latestLogPath = path.join(logsDir, 'latest.log');

try {
  fs.writeFileSync(latestLogPath, `--- DiscoLauncher Log Started at ${new Date().toISOString()} ---\n`, 'utf-8');
} catch {}

function writeLogToFile(line: string) {
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const entry = `[${timestamp}] ${line}\n`;
    fs.appendFileSync(launcherLogPath, entry, 'utf-8');
    fs.appendFileSync(latestLogPath, entry, 'utf-8');
  } catch {}
}

// Hook console.log/warn/error to file logging
const origConsoleLog = console.log;
const origConsoleWarn = console.warn;
const origConsoleError = console.error;

console.log = (...args: any[]) => {
  origConsoleLog(...args);
  writeLogToFile(`[INFO] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
};
console.warn = (...args: any[]) => {
  origConsoleWarn(...args);
  writeLogToFile(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
};
console.error = (...args: any[]) => {
  origConsoleError(...args);
  writeLogToFile(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
};

// Global process error logging
process.on('uncaughtException', (err) => {
  writeLogToFile(`[CRITICAL UNCAUGHT EXCEPTION] ${err?.stack || err}`);
});
process.on('unhandledRejection', (reason) => {
  writeLogToFile(`[UNHANDLED REJECTION] ${reason}`);
});

// Helper to read/write JSON config
function readConfig(): Record<string, any> {
  try {
    if (fs.existsSync(configFilePath)) {
      return JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read config:', e);
  }
  return {};
}

function writeConfig(data: Record<string, any>) {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write config:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0b0f17',
    icon: fs.existsSync(path.join(__dirname, '../dist/icon.png'))
      ? path.join(__dirname, '../dist/icon.png')
      : path.join(__dirname, '../public/icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // allow loading local skin files & local network API
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function runSilentAutoUpdate() {
  if (!app.isPackaged) return; // Don't replace electron.exe during local development
  try {
    const update = await checkForUpdates();
    if (!update.hasUpdate || !update.downloadUrl) return;

    writeLogToFile(`[AutoUpdate] Found update v${update.version} from ${update.downloadUrl}`);

    mainWindow?.webContents.send('update:status', {
      stage: 'downloading',
      percent: 0,
      version: update.version
    });

    const targetFile = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    const tmpFile = path.join(os.tmpdir(), `DiscoLauncher_v${update.version}.exe`);

    await downloadUpdate(update.downloadUrl, tmpFile, (pct) => {
      mainWindow?.webContents.send('update:status', {
        stage: 'downloading',
        percent: pct,
        version: update.version
      });
    });

    writeLogToFile(`[AutoUpdate] Download complete. Preparing replacement of: ${targetFile}`);

    mainWindow?.webContents.send('update:status', {
      stage: 'installing',
      percent: 100,
      version: update.version
    });

    const oldPid = process.pid;
    // Bulletproof hidden updater using PowerShell Base64 EncodedCommand
    const psScript = `
param()
$oldPid = ${oldPid}
if ($oldPid -gt 0) {
  try {
    $proc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($proc) { $proc.WaitForExit(15000) }
  } catch {}
}

Start-Sleep -Milliseconds 1000

$target = "${targetFile.replace(/\\/g, '\\\\')}"
$source = "${tmpFile.replace(/\\/g, '\\\\')}"

for ($i = 0; $i -lt 50; $i++) {
  try {
    Copy-Item -LiteralPath $source -Destination $target -Force -ErrorAction Stop
    break
  } catch {
    Start-Sleep -Milliseconds 300
  }
}

Remove-Item -LiteralPath $source -Force -ErrorAction SilentlyContinue

Start-Process -FilePath $target
`;

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    spawn('powershell.exe', ['-WindowStyle', 'Hidden', '-NoProfile', '-EncodedCommand', encoded], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }).unref();

    app.quit();
  } catch (err: any) {
    writeLogToFile(`[AutoUpdate ERROR] ${err?.message || err}`);
    console.warn('Auto-update notice:', err?.message);
    mainWindow?.webContents.send('update:status', {
      stage: 'error',
      percent: 0,
      version: '',
      error: err?.message
    });
  }
}

app.whenReady().then(() => {
  writeLogToFile(`[LIFECYCLE] App ready. DiscoLauncher v${CURRENT_VERSION}`);
  writeLogToFile(`[PATHS] AppData: ${appDataRoot}`);
  writeLogToFile(`[PATHS] DiscoRoot: ${discoRoot}`);
  writeLogToFile(`[PATHS] Launcher: ${launcherDir}`);
  writeLogToFile(`[PATHS] Minecraft: ${defaultMinecraftDir}`);
  writeLogToFile(`[PATHS] Logs: ${logsDir}`);
  writeLogToFile(`[PATHS] Config: ${configFilePath}`);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Check and apply updates automatically 2.5 seconds after launch
  setTimeout(() => {
    runSilentAutoUpdate();
  }, 2500);

  // Re-check every 30 minutes
  setInterval(() => {
    runSilentAutoUpdate();
  }, 30 * 60 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// =========================================================================
// AUTO-UPDATER IPC HANDLERS
// =========================================================================
ipcMain.handle('update:check', async () => {
  return await checkForUpdates();
});

ipcMain.handle('update:trigger', async () => {
  runSilentAutoUpdate();
  return { success: true };
});

// Window controls IPC
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

let logWindow: BrowserWindow | null = null;
const cachedLogs: string[] = [];

function sendLog(line: string) {
  writeLogToFile(line);
  cachedLogs.push(line);
  if (cachedLogs.length > 5000) cachedLogs.shift();
  mainWindow?.webContents.send('game:log', line);
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.webContents.send('game:log', line);
  }
}

function openOrFocusLogWindow() {
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.focus();
    return logWindow;
  }

  logWindow = new BrowserWindow({
    width: 850,
    height: 550,
    title: 'DiscoLauncher — Консоль клиента',
    backgroundColor: '#070a12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DiscoLauncher — Консоль клиента</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 14px; background: #070a12; color: #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; display: flex; flex-direction: column; height: 100vh; }
    #toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-shrink: 0; }
    button { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 600; }
    button:hover { background: #334155; }
    #status { margin-left: auto; color: #64748b; font-size: 11px; }
    #logs { flex: 1; overflow-y: auto; background: #03060a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px; white-space: pre-wrap; word-break: break-all; line-height: 1.4; }
    .line { margin-bottom: 2px; }
    .prefix { color: #818cf8; user-select: none; }
    .error { color: #f87171; }
    .warn { color: #fbbf24; }
  </style>
</head>
<body>
  <div id="toolbar">
    <button onclick="copyLogs()">📋 Скопировать всё</button>
    <button onclick="clearLogs()">🗑️ Очистить</button>
    <span id="status">0 строк</span>
  </div>
  <div id="logs"></div>
  <script>
    const logsDiv = document.getElementById('logs');
    const statusSpan = document.getElementById('status');
    let allLines = [];
    window.electronAPI?.onGameLog((line) => {
      allLines.push(line);
      const el = document.createElement('div');
      el.className = 'line' + (line.includes('[ОШИБКА') || line.includes('Exception') || line.includes('Error') ? ' error' : line.includes('WARN') ? ' warn' : '');
      el.innerHTML = '<span class="prefix">&gt; </span>' + line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      logsDiv.appendChild(el);
      logsDiv.scrollTop = logsDiv.scrollHeight;
      statusSpan.innerText = allLines.length + ' строк';
    });
    function copyLogs() {
      navigator.clipboard.writeText(allLines.join('\\n'));
      alert('Логи скопированы в буфер обмена!');
    }
    function clearLogs() {
      allLines = [];
      logsDiv.innerHTML = '';
      statusSpan.innerText = '0 строк';
    }
  </script>
</body>
</html>`;

  logWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

  logWindow.on('closed', () => {
    logWindow = null;
  });

  logWindow.webContents.once('did-finish-load', () => {
    for (const line of cachedLogs) {
      logWindow?.webContents.send('game:log', line);
    }
  });

  return logWindow;
}

ipcMain.handle('window:openLogWindow', () => {
  openOrFocusLogWindow();
});

// Exchange Microsoft OAuth code for real Minecraft Java Edition profile
async function exchangeMicrosoftCodeForMinecraftProfile(code: string, redirectUri: string, clientId: string) {
  // 1. Live token exchange
  const tokenRes = await fetch('https://login.live.com/oauth20_token.srf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }).toString()
  });

  const tokenData: any = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Не удалось получить токен Microsoft');
  }

  const msAccessToken = tokenData.access_token;
  const msRefreshToken = tokenData.refresh_token;

  // 2. Xbox Live authentication
  const xblRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: msAccessToken
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    })
  });

  const xblData: any = await xblRes.json();
  if (!xblData.Token) {
    throw new Error('Ошибка аутентификации Xbox Live');
  }

  const xblToken = xblData.Token;
  const uhs = xblData.DisplayClaims?.xui?.[0]?.uhs;
  if (!uhs) {
    throw new Error('Не удалось получить идентификатор пользователя Xbox (uhs)');
  }

  // 3. XSTS authorization
  const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xblToken]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    })
  });

  const xstsData: any = await xstsRes.json();
  if (!xstsData.Token) {
    if (xstsData.XErr === 2148916238) {
      throw new Error('Учетная запись несовершеннолетнего (необходимо настроить семейный доступ Xbox)');
    }
    if (xstsData.XErr === 2148916233) {
      throw new Error('У вас нет профиля Xbox Live. Создайте его на сайте xbox.com');
    }
    throw new Error(xstsData.Message || 'Ошибка авторизации службы XSTS');
  }

  const xstsToken = xstsData.Token;

  // 4. Minecraft Services login
  const mcLoginRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${uhs};${xstsToken}`
    })
  });

  const mcLoginData: any = await mcLoginRes.json();
  if (!mcLoginData.access_token) {
    throw new Error(mcLoginData.errorMessage || 'Не удалось получить токен Minecraft');
  }

  const mcToken = mcLoginData.access_token;

  // 5. Get Minecraft Profile
  const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${mcToken}` }
  });

  if (profileRes.status === 404) {
    throw new Error('На этом Microsoft аккаунте нет купленной лицензии Minecraft Java Edition!');
  }

  const profile: any = await profileRes.json();
  if (!profile.id || !profile.name) {
    throw new Error('Не удалось загрузить профиль Minecraft: ' + (profile.errorMessage || 'неизвестная ошибка'));
  }

  const activeSkin = profile.skins?.find((s: any) => s.state === 'ACTIVE') || profile.skins?.[0];
  const activeCape = profile.capes?.find((c: any) => c.state === 'ACTIVE') || profile.capes?.[0];

  return {
    id: `ms_${profile.id}`,
    username: profile.name,
    uuid: profile.id,
    type: 'microsoft',
    token: mcToken,
    refreshToken: msRefreshToken,
    skinUrl: activeSkin?.url || `https://minotar.net/skin/${profile.name}`,
    capeUrl: activeCape?.url,
    model: activeSkin?.variant === 'SLIM' ? 'slim' : 'classic',
    lastUsed: Date.now()
  };
}

// Microsoft Login IPC
ipcMain.handle('auth:loginMicrosoft', async () => {
  return new Promise((resolve) => {
    let resolved = false;
    const authWin = new BrowserWindow({
      width: 520,
      height: 680,
      title: 'Вход в аккаунт Microsoft',
      parent: mainWindow || undefined,
      modal: true,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const clientId = '00000000402b5328';
    const redirectUri = 'https://login.live.com/oauth20_desktop.srf';
    const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${clientId}&response_type=code&scope=service::user.auth.xboxlive.com::MBI_SSL&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const checkUrl = async (urlStr: string) => {
      if (urlStr.startsWith(redirectUri)) {
        try {
          const parsed = new URL(urlStr);
          const code = parsed.searchParams.get('code');
          const error = parsed.searchParams.get('error');
          const errorDesc = parsed.searchParams.get('error_description');

          if (!resolved) {
            resolved = true;
            try { authWin.close(); } catch (_) {}
            if (code) {
              try {
                sendLog('[Auth] Обмен кода авторизации Microsoft на лицензионный профиль...');
                const account = await exchangeMicrosoftCodeForMinecraftProfile(code, redirectUri, clientId);
                sendLog(`[Auth] Успешно подключен лицензионный игрок: ${account.username} (${account.uuid})`);
                resolve({ success: true, account });
              } catch (err: any) {
                sendLog(`[Auth ОШИБКА] ${err.message}`);
                resolve({ success: false, error: err.message });
              }
            } else {
              resolve({ success: false, error: errorDesc || error || 'Авторизация была отменена' });
            }
          }
        } catch (e: any) {
          if (!resolved) {
            resolved = true;
            try { authWin.close(); } catch (_) {}
            resolve({ success: false, error: e.message });
          }
        }
      }
    };

    authWin.webContents.on('will-redirect', (_event, url) => checkUrl(url));
    authWin.webContents.on('did-navigate', (_event, url) => checkUrl(url));
    authWin.on('closed', () => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: 'Окно авторизации было закрыто' });
      }
    });

    authWin.loadURL(authUrl);
  });
});

// Mojang Skin Upload IPC (directly uploads skin to official Minecraft profile via Microsoft token)
ipcMain.handle('skin:uploadMojang', async (_, { token, model, bufferBase64 }: { token: string; model: string; bufferBase64: string }) => {
  try {
    const buf = Buffer.from(bufferBase64, 'base64');
    const blob = new Blob([buf], { type: 'image/png' });
    const formData = new FormData();
    formData.append('variant', model === 'slim' ? 'slim' : 'classic');
    formData.append('file', blob, 'skin.png');

    const res = await fetch('https://api.minecraftservices.com/minecraft/profile/skins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.errorMessage || errJson.error || `Ошибка сервера Mojang: ${res.statusText}`);
    }

    const data = await res.json().catch(() => ({}));
    sendLog('[Mojang Skin] Скин успешно загружен на официальные серверы Minecraft!');
    return { success: true, profile: data };
  } catch (err: any) {
    sendLog(`[Mojang Skin ОШИБКА] ${err.message}`);
    return { success: false, error: err.message };
  }
});


// Config Store IPC
ipcMain.handle('store:get', (_, key: string) => {
  const cfg = readConfig();
  return cfg[key];
});

ipcMain.handle('store:set', (_, key: string, val: any) => {
  const cfg = readConfig();
  cfg[key] = val;
  writeConfig(cfg);
  return true;
});

// Avatar Head generator IPC (pixel-perfect Jimp head extraction with zero CORS)
const avatarHeadCache = new Map<string, string>();
ipcMain.handle('avatar:getHead', async (_, { username, type, skinUrl }) => {
  const cacheKey = `${type}_${username}_${skinUrl || ''}`;
  if (avatarHeadCache.has(cacheKey)) {
    return avatarHeadCache.get(cacheKey);
  }

  try {
    let targetUrl = skinUrl;
    if (!targetUrl || targetUrl.includes('skinsystem.ely.by/textures/')) {
      targetUrl = type === 'elyby'
        ? `https://skinsystem.ely.by/skins/${encodeURIComponent(username)}.png`
        : `https://minotar.net/skin/${encodeURIComponent(username)}`;
    }

    const { Jimp } = require('jimp');
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const skin = await Jimp.read(buf);
    const head = skin.clone().crop({ x: 8, y: 8, w: 8, h: 8 });
    const hat = skin.clone().crop({ x: 40, y: 8, w: 8, h: 8 });
    head.composite(hat, 0, 0);
    head.resize({ w: 64, h: 64 });
    const b64 = await head.getBase64('image/png');
    avatarHeadCache.set(cacheKey, b64);
    return b64;
  } catch (err: any) {
    console.warn('Failed to extract avatar head:', err.message);
    return null;
  }
});

// Dialogs IPC
ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:selectFile', async (_, filters) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'PNG Image', extensions: ['png'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('launcher:openFolder', (_, folderPath: string) => {
  if (fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
  } else {
    fs.mkdirSync(folderPath, { recursive: true });
    shell.openPath(folderPath);
  }
});

ipcMain.handle('launcher:openExternal', (_, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle('launcher:getSystemInfo', () => {
  const totalMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  return {
    totalRamMb: totalMem,
    freeRamMb: freeMem,
    cpus: os.cpus().length,
    platform: process.platform,
    arch: process.arch
  };
});

function getEffectiveGameDir(customDir?: string): string {
  if (customDir && customDir.trim().length > 0) return customDir;
  return defaultMinecraftDir;
}

ipcMain.handle('launcher:getDefaultGameDir', () => {
  return getEffectiveGameDir();
});

ipcMain.handle('launcher:openLogsFolder', () => {
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  shell.openPath(logsDir);
});

ipcMain.handle('launcher:getPaths', () => {
  return {
    discoRoot,
    launcherDir,
    appBinDir,
    minecraftDir: defaultMinecraftDir,
    logsDir,
    configFilePath
  };
});

// Mods Management IPC
ipcMain.handle('mods:getMods', async (_, gameDir?: string) => {
  try {
    const root = getEffectiveGameDir(gameDir);
    const modsDir = path.join(root, 'mods');
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
      return [];
    }
    const files = fs.readdirSync(modsDir);
    const result = [];
    for (const file of files) {
      if (file.endsWith('.jar') || file.endsWith('.jar.disabled')) {
        const fullPath = path.join(modsDir, file);
        const stat = fs.statSync(fullPath);
        const isEnabled = file.endsWith('.jar');
        const cleanName = file.replace(/\.disabled$/, '');
        result.push({
          filename: file,
          name: cleanName,
          size: stat.size,
          enabled: isEnabled,
          updatedAt: stat.mtimeMs
        });
      }
    }
    return result;
  } catch (err: any) {
    console.error('Error getting mods:', err);
    return [];
  }
});

ipcMain.handle('mods:addMod', async (_, gameDir?: string) => {
  if (!mainWindow) return { success: false, error: 'Окно недоступно' };
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите файлы модов Minecraft (.jar)',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Minecraft Mod (.jar)', extensions: ['jar'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const root = getEffectiveGameDir(gameDir);
    const modsDir = path.join(root, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    const added = [];
    for (const src of result.filePaths) {
      const fileName = path.basename(src);
      const dest = path.join(modsDir, fileName);
      fs.copyFileSync(src, dest);
      added.push(fileName);
    }

    return { success: true, count: added.length, added };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:toggleMod', async (_, { gameDir, filename, enabled }: { gameDir?: string; filename: string; enabled: boolean }) => {
  try {
    const root = getEffectiveGameDir(gameDir);
    const modsDir = path.join(root, 'mods');
    const currentPath = path.join(modsDir, filename);
    if (!fs.existsSync(currentPath)) return { success: false, error: 'Файл мода не найден' };

    let newFilename = filename;
    if (enabled) {
      if (filename.endsWith('.disabled')) {
        newFilename = filename.replace(/\.disabled$/, '');
      }
    } else {
      if (!filename.endsWith('.disabled')) {
        newFilename = `${filename}.disabled`;
      }
    }

    if (newFilename !== filename) {
      const newPath = path.join(modsDir, newFilename);
      fs.renameSync(currentPath, newPath);
    }

    return { success: true, newFilename };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:deleteMod', async (_, { gameDir, filename }: { gameDir?: string; filename: string }) => {
  try {
    const root = getEffectiveGameDir(gameDir);
    const modsDir = path.join(root, 'mods');
    const targetPath = path.join(modsDir, filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:openFolder', async (_, gameDir?: string) => {
  const root = getEffectiveGameDir(gameDir);
  const modsDir = path.join(root, 'mods');
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
  shell.openPath(modsDir);
  return { success: true };
});

// Java detection
ipcMain.handle('launcher:checkJava', async () => {
  return new Promise((resolve) => {
    const javaProcess = spawn('java', ['-version']);
    let output = '';
    javaProcess.stderr.on('data', (d) => { output += d.toString(); });
    javaProcess.stdout.on('data', (d) => { output += d.toString(); });
    javaProcess.on('error', () => {
      resolve({ found: false, version: 'Не найдена' });
    });
    javaProcess.on('close', (code) => {
      if (code === 0 || output.includes('version')) {
        const match = output.match(/version "(.*?)"/);
        const ver = match ? match[1] : 'Java (установлена)';
        resolve({ found: true, version: ver, raw: output });
      } else {
        resolve({ found: false, version: 'Не найдена' });
      }
    });
  });
});

// File sha1 helper
function calculateFileSha1(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) return resolve('');
    const hash = crypto.createHash('sha1');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Download file helper
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// File Sync IPC
ipcMain.handle('launcher:syncServerFiles', async (_, { serverId, manifestUrl, gameDir, baseUrl }) => {
  try {
    mainWindow?.webContents.send('launch:progress', {
      stage: 'checking',
      percent: 5,
      detail: 'Получение списка файлов сборки...'
    });

    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error(`Ошибка загрузки манифеста: ${res.statusText}`);
    const manifest = await res.json();
    const files: Array<{ path: string; sha1: string; size: number; url: string }> = manifest.files || [];

    const total = files.length;
    let checked = 0;
    const toDownload: typeof files = [];

    mainWindow?.webContents.send('launch:progress', {
      stage: 'verifying',
      percent: 15,
      detail: `Проверка ${total} файлов игры...`
    });

    for (const f of files) {
      const localPath = path.join(gameDir, f.path);
      const localHash = await calculateFileSha1(localPath);
      if (localHash.toLowerCase() !== f.sha1.toLowerCase()) {
        toDownload.push(f);
      }
      checked++;
      if (checked % 5 === 0 || checked === total) {
        const pct = Math.round(15 + (checked / (total || 1)) * 25);
        mainWindow?.webContents.send('launch:progress', {
          stage: 'verifying',
          percent: pct,
          detail: `Проверено ${checked} / ${total} файлов...`
        });
      }
    }

    if (toDownload.length > 0) {
      let downloaded = 0;
      for (const f of toDownload) {
        const fileUrl = (f.url && f.url.startsWith('http'))
          ? f.url
          : `${baseUrl}${f.url && f.url.startsWith('/') ? '' : '/'}${f.url || ''}`;
        const localPath = path.join(gameDir, f.path);
        mainWindow?.webContents.send('launch:progress', {
          stage: 'downloading',
          percent: Math.round(40 + (downloaded / toDownload.length) * 50),
          detail: `Загрузка: ${f.path} (${downloaded + 1}/${toDownload.length})`,
          currentFile: f.path
        });
        await downloadFile(fileUrl, localPath);
        downloaded++;
      }
    }

    mainWindow?.webContents.send('launch:progress', {
      stage: 'idle',
      percent: 100,
      detail: 'Синхронизация завершена успешно!'
    });

    return { success: true, updatedCount: toDownload.length };
  } catch (err: any) {
    mainWindow?.webContents.send('launch:progress', {
      stage: 'error',
      percent: 0,
      detail: `Ошибка синхронизации: ${err.message}`
    });
    return { success: false, error: err.message };
  }
});

// Java resolution & auto-installation (Adoptium Temurin 21)
async function resolveJavaExecutable(
  settingsJavaPath: string,
  gameDir: string,
  onProgress?: (pct: number, detail: string) => void
): Promise<string> {
  const runtimeDir = path.join(gameDir, '..', 'runtime');
  const embeddedJava = path.join(runtimeDir, 'jre-21', 'bin', process.platform === 'win32' ? 'java.exe' : 'java');

  if (fs.existsSync(embeddedJava)) {
    return embeddedJava;
  }

  // Check if user-specified or system java is Java 21
  const candidate = settingsJavaPath || 'java';
  try {
    const res = spawnSync(candidate, ['-version'], { encoding: 'utf8' });
    const out = (res.stderr || '') + (res.stdout || '');
    if (out.includes('version "21.') && !out.includes('version "26.')) {
      return candidate;
    }
  } catch (e) {
    // not found
  }

  // Auto-download Adoptium Java 21 JRE for Windows x64
  if (process.platform === 'win32') {
    onProgress?.(10, 'Загрузка среды выполнения Java 21 JRE для Minecraft...');
    fs.mkdirSync(runtimeDir, { recursive: true });
    const zipPath = path.join(runtimeDir, 'jre21.zip');
    await downloadFile('https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse', zipPath);

    onProgress?.(20, 'Распаковка Java 21 JRE...');
    const tempExtract = path.join(runtimeDir, 'temp_jre');
    if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });
    fs.mkdirSync(tempExtract, { recursive: true });
    execSync(`tar -xf "${zipPath}" -C "${tempExtract}"`);

    const subs = fs.readdirSync(tempExtract);
    if (subs.length > 0) {
      const extractedPath = path.join(tempExtract, subs[0]);
      const destJre = path.join(runtimeDir, 'jre-21');
      if (fs.existsSync(destJre)) fs.rmSync(destJre, { recursive: true, force: true });
      fs.renameSync(extractedPath, destJre);
    }
    try { fs.rmSync(tempExtract, { recursive: true, force: true }); } catch (_) {}
    try { fs.unlinkSync(zipPath); } catch (_) {}

    if (fs.existsSync(embeddedJava)) {
      return embeddedJava;
    }
  }

  return candidate;
}

// NeoForge installer and runner
async function prepareNeoForge(
  gameDir: string,
  mcVersion: string,
  neoVer: string,
  javaExe: string,
  onProgress?: (pct: number, detail: string) => void
): Promise<{ custom: string; versionJson: string; jvmArgs: string[] }> {
  const customName = `neoforge-${neoVer}`;
  const versionFolder = path.join(gameDir, 'versions', customName);
  const versionJsonPath = path.join(versionFolder, `${customName}.json`);

  if (!fs.existsSync(versionJsonPath)) {
    onProgress?.(15, `Загрузка установщика NeoForge ${neoVer}...`);
    const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVer}/neoforge-${neoVer}-installer.jar`;
    const installerPath = path.join(gameDir, `neoforge-${neoVer}-installer.jar`);
    await downloadFile(installerUrl, installerPath);

    // Ensure launcher_profiles.json exists for client installer
    const profilesPath = path.join(gameDir, 'launcher_profiles.json');
    if (!fs.existsSync(profilesPath)) {
      fs.writeFileSync(profilesPath, JSON.stringify({ profiles: {} }, null, 2));
    }

    onProgress?.(25, `Установка загрузчика NeoForge ${neoVer}...`);
    spawnSync(javaExe, ['-jar', installerPath, '--installClient', gameDir], { stdio: 'pipe' });
  }

  if (fs.existsSync(versionJsonPath)) {
    try {
      const j = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

      // 1. Remove duplicate/conflicting older ASM library (asm:9.6) so Java 21 module path doesn't throw conflict
      if (Array.isArray(j.libraries)) {
        j.libraries = j.libraries.filter((l: any) => l && l.name && !l.name.includes(':asm:9.6'));
      }

      // 1.1 Fix ignoreList in NeoForge JVM arguments so MCLC's vanilla mcVersion.jar is not loaded as duplicate module _1._21._5
      if (Array.isArray(j.arguments?.jvm)) {
        j.arguments.jvm = j.arguments.jvm.map((arg: any) => {
          if (typeof arg === 'string' && arg.startsWith('-DignoreList=')) {
            return `-DignoreList=client-extra,\${version_name}.jar,${mcVersion}.jar,${mcVersion},\${version_name}`;
          }
          return arg;
        });
      }

      // 2. Ensure vanilla game arguments are merged into neoforge arguments.game
      const vanillaJsonPath = path.join(gameDir, 'versions', mcVersion, `${mcVersion}.json`);
      if (fs.existsSync(vanillaJsonPath)) {
        const vj = JSON.parse(fs.readFileSync(vanillaJsonPath, 'utf8'));
        if (vj?.arguments?.game && Array.isArray(j.arguments?.game)) {
          const baseGameArgs = vj.arguments.game.filter((a: any) => typeof a === 'string');
          const existingArgs = new Set(j.arguments.game);
          for (const arg of baseGameArgs) {
            if (!existingArgs.has(arg)) {
              j.arguments.game.push(arg);
            }
          }
        }
      }

      // 3. Ensure downloads and assetIndex from vanilla are copied into neoforge JSON
      if (fs.existsSync(vanillaJsonPath)) {
        const vj = JSON.parse(fs.readFileSync(vanillaJsonPath, 'utf8'));
        if (vj.downloads && !j.downloads) j.downloads = vj.downloads;
        if (vj.assetIndex && !j.assetIndex) j.assetIndex = vj.assetIndex;
      }

      // 4. Merge vanilla libraries (including LWJGL, Netty, Brigadier) into neoforge libraries
      if (fs.existsSync(vanillaJsonPath)) {
        const vj = JSON.parse(fs.readFileSync(vanillaJsonPath, 'utf8'));
        if (Array.isArray(vj.libraries) && Array.isArray(j.libraries)) {
          const existingNames = new Set(j.libraries.map((l: any) => l.name));
          for (const lib of vj.libraries) {
            if (!lib.name.includes(':asm:9.6') && !existingNames.has(lib.name)) {
              j.libraries.push(lib);
            }
          }
        }
      }

      fs.writeFileSync(versionJsonPath, JSON.stringify(j, null, 2), 'utf8');
    } catch (err) {
      console.warn('NeoForge JSON patch warning:', err);
    }
  }

  // Ensure base jar is copied to custom version jar if missing
  const baseJarPath = path.join(gameDir, 'versions', mcVersion, `${mcVersion}.jar`);
  const customJarPath = path.join(versionFolder, `${customName}.jar`);
  if (fs.existsSync(baseJarPath) && !fs.existsSync(customJarPath)) {
    try {
      fs.copyFileSync(baseJarPath, customJarPath);
    } catch (e) {
      console.warn('Copy base jar warning:', e);
    }
  }

  const libDir = path.join(gameDir, 'libraries').replace(/\\/g, '/');
  const moduleJars = [
    `${libDir}/cpw/mods/bootstraplauncher/2.0.2/bootstraplauncher-2.0.2.jar`,
    `${libDir}/cpw/mods/securejarhandler/3.0.8/securejarhandler-3.0.8.jar`,
    `${libDir}/org/ow2/asm/asm-commons/9.8/asm-commons-9.8.jar`,
    `${libDir}/org/ow2/asm/asm-util/9.8/asm-util-9.8.jar`,
    `${libDir}/org/ow2/asm/asm-analysis/9.8/asm-analysis-9.8.jar`,
    `${libDir}/org/ow2/asm/asm-tree/9.8/asm-tree-9.8.jar`,
    `${libDir}/org/ow2/asm/asm/9.8/asm-9.8.jar`,
    `${libDir}/net/neoforged/JarJarFileSystems/0.4.1/JarJarFileSystems-0.4.1.jar`
  ].filter((p) => fs.existsSync(p)).join(';');

  const jvmArgs = [
    '-Djava.net.preferIPv6Addresses=system',
    `-DignoreList=client-extra,neoforge-${neoVer}.jar,${mcVersion}.jar,${mcVersion},neoforge-${neoVer}`,
    `-DlibraryDirectory=${libDir}`,
    '-p', moduleJars,
    '--add-modules', 'ALL-MODULE-PATH',
    '--add-opens', 'java.base/java.util.jar=cpw.mods.securejarhandler',
    '--add-opens', 'java.base/java.lang.invoke=cpw.mods.securejarhandler',
    '--add-exports', 'java.base/sun.security.util=cpw.mods.securejarhandler',
    '--add-exports', 'jdk.naming.dns/com.sun.jndi.dns=java.naming',
    '--add-opens=java.base/java.lang.invoke=ALL-UNNAMED',
    '--add-opens=java.base/java.lang=ALL-UNNAMED',
    '--add-opens=java.base/java.util=ALL-UNNAMED'
  ];

  return {
    custom: customName,
    versionJson: versionJsonPath,
    jvmArgs
  };
}

// Fabric loader setup
async function prepareFabric(
  gameDir: string,
  mcVersion: string,
  loaderVersion: string = '0.16.10',
  onProgress?: (pct: number, detail: string) => void
): Promise<{ custom: string; versionJson: string }> {
  const customName = `fabric-loader-${loaderVersion}-${mcVersion}`;
  const versionFolder = path.join(gameDir, 'versions', customName);
  const versionJsonPath = path.join(versionFolder, `${customName}.json`);

  if (!fs.existsSync(versionJsonPath)) {
    onProgress?.(20, `Загрузка профиля Fabric ${mcVersion}...`);
    fs.mkdirSync(versionFolder, { recursive: true });
    const url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
    await downloadFile(url, versionJsonPath);
  }

  return { custom: customName, versionJson: versionJsonPath };
}

// Quilt loader setup
async function prepareQuilt(
  gameDir: string,
  mcVersion: string,
  loaderVersion: string = '0.27.1-beta.1',
  onProgress?: (pct: number, detail: string) => void
): Promise<{ custom: string; versionJson: string }> {
  const customName = `quilt-loader-${loaderVersion}-${mcVersion}`;
  const versionFolder = path.join(gameDir, 'versions', customName);
  const versionJsonPath = path.join(versionFolder, `${customName}.json`);

  if (!fs.existsSync(versionJsonPath)) {
    onProgress?.(20, `Загрузка профиля Quilt ${mcVersion}...`);
    fs.mkdirSync(versionFolder, { recursive: true });
    const url = `https://meta.quiltmc.org/v3/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
    await downloadFile(url, versionJsonPath);
  }

  return { custom: customName, versionJson: versionJsonPath };
}

// Launch Minecraft Game IPC
ipcMain.handle('launcher:launchGame', async (_, launchParams) => {
  const {
    account,
    server,
    selectedVersion,
    settings,
    authlibServerUrl
  } = launchParams;

  // Automatically open log console if enabled in settings
  if (settings?.showConsoleOnLaunch) {
    openOrFocusLogWindow();
  }

  const gameDir = settings.gameDir || defaultMinecraftDir;
  if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

  const ramMb = settings.allocatedRamMb || 4096;

  mainWindow?.webContents.send('launch:progress', {
    stage: 'downloading',
    percent: 5,
    detail: 'Подготовка среды Java и клиента...'
  });

  // Determine target Minecraft version and ModLoader type
  const targetMcVersion = selectedVersion?.mcVersion || server.version || '1.21.5';
  const targetLoaderType = selectedVersion?.type || (
    (server.modloader === 'neoforge') ? 'neoforge' :
    (server.modloader === 'fabric') ? 'fabric' :
    (server.modloader === 'quilt') ? 'quilt' :
    (server.modloader === 'forge') ? 'forge' : 'vanilla'
  );

  // For NeoForge / Forge, ASM and Mixin do not yet support Java 26 bytecode (major version 70).
  // Therefore, for NeoForge/Forge we use Java 21.
  // For Vanilla / Snapshots (like 26.2 or clean 1.21.5), the user's system Java (including Java 26) is used directly!
  let javaExe = settings.javaPath || 'java';
  if (targetLoaderType === 'neoforge' || targetLoaderType === 'forge') {
    javaExe = await resolveJavaExecutable(settings.javaPath, gameDir, (pct, detail) => {
      mainWindow?.webContents.send('launch:progress', { stage: 'downloading', percent: pct, detail });
    });
  }

  const mclc = new MCLCClient();

  // Auth preparation
  let authObj: any;
  if (account && account.username) {
    if (account.type === 'microsoft' && account.token) {
      authObj = {
        access_token: account.token,
        client_token: '00000000402b5328',
        uuid: (account.uuid || '').replace(/-/g, ''),
        name: account.username,
        user_properties: '{}'
      };
    } else if (account.type === 'elyby' && account.token) {
      authObj = {
        access_token: account.token,
        client_token: '00000000-0000-0000-0000-000000000001',
        uuid: (account.uuid || '').replace(/-/g, ''),
        name: account.username,
        user_properties: '{}'
      };
    } else {
      try {
        authObj = await MCLCAuthenticator.getAuth(account.username);
        if (account.uuid) {
          authObj.uuid = account.uuid.replace(/-/g, '');
        }
      } catch (e) {
        authObj = {
          access_token: '00000000-0000-0000-0000-000000000001',
          client_token: '00000000-0000-0000-0000-000000000001',
          uuid: (account.uuid || '00000000000000000000000000000001').replace(/-/g, ''),
          name: account.username,
          user_properties: '{}'
        };
      }
    }
  }

  // Authlib injector for custom skins if applicable
  const authlibJarPath = path.join(gameDir, 'authlib-injector.jar');
  const customArgs: string[] = ['-Dfile.encoding=UTF-8'];

  if (account && account.type === 'elyby') {
    // Official Ely.by authlib-injector endpoint
    const authUrl = 'https://authserver.ely.by/api/authlib-injector';
    
    if (!fs.existsSync(authlibJarPath)) {
      try {
        mainWindow?.webContents.send('launch:progress', {
          stage: 'downloading',
          percent: 15,
          detail: 'Загрузка компонента авторизации скинов...'
        });
        await downloadFile('https://authlib-injector.yggdrasil.gservice.top/artifact/latest.json', path.join(gameDir, 'authlib-latest.json'));
        const latestData = JSON.parse(fs.readFileSync(path.join(gameDir, 'authlib-latest.json'), 'utf8'));
        if (latestData?.download_url) {
          await downloadFile(latestData.download_url, authlibJarPath);
        }
      } catch (e) {
        console.warn('Authlib injector download fallback:', e);
      }
    }

    if (fs.existsSync(authlibJarPath)) {
      customArgs.push(`-javaagent:${authlibJarPath}=${authUrl}`);
    }
  }

  let versionNumber = targetMcVersion;
  let customVersionName: string | undefined;
  let versionJsonOverride: string | undefined;

  // Prepare ModLoader
  if (targetLoaderType === 'neoforge') {
    const neoVer = selectedVersion?.loaderVersion || (targetMcVersion === '1.21.5' ? '21.5.98' : '21.5.98');
    const neo = await prepareNeoForge(gameDir, targetMcVersion, neoVer, javaExe, (pct, detail) => {
      mainWindow?.webContents.send('launch:progress', { stage: 'downloading', percent: pct, detail });
    });
    customVersionName = neo.custom;
    versionJsonOverride = neo.versionJson;
    customArgs.push(...neo.jvmArgs);
  } else if (targetLoaderType === 'fabric') {
    const fab = await prepareFabric(gameDir, targetMcVersion, selectedVersion?.loaderVersion, (pct, detail) => {
      mainWindow?.webContents.send('launch:progress', { stage: 'downloading', percent: pct, detail });
    });
    customVersionName = fab.custom;
    versionJsonOverride = fab.versionJson;
  } else if (targetLoaderType === 'quilt') {
    const q = await prepareQuilt(gameDir, targetMcVersion, selectedVersion?.loaderVersion, (pct, detail) => {
      mainWindow?.webContents.send('launch:progress', { stage: 'downloading', percent: pct, detail });
    });
    customVersionName = q.custom;
    versionJsonOverride = q.versionJson;
  }

  // Hook MCLC events to launcher UI
  mclc.on('debug', (msg: string) => {
    sendLog(`[MCLC] ${msg}`);
  });

  mclc.on('data', (data: any) => {
    sendLog(data.toString().trim());
  });

  mclc.on('progress', (e: any) => {
    const pct = Math.round(((e.task || 0) / (e.total || 1)) * 100);
    mainWindow?.webContents.send('launch:progress', {
      stage: 'downloading',
      percent: pct,
      detail: `Загрузка Minecraft: ${e.type || 'компонентов'} (${e.task || 0}/${e.total || 0})`
    });
  });

  mclc.on('download-status', (e: any) => {
    if (e.name) {
      mainWindow?.webContents.send('launch:progress', {
        stage: 'downloading',
        percent: Math.round(((e.current || 0) / (e.total || 1)) * 100),
        detail: `Загрузка: ${path.basename(e.name)}`
      });
    }
  });

  mclc.on('close', (code: number) => {
    sendLog(`[Процесс игры завершился с кодом ${code}]`);
    mainWindow?.webContents.send('launch:progress', {
      stage: 'idle',
      percent: 0,
      detail: ''
    });
  });

  // Ensure asset indexes are synchronized so Minecraft sound engine always finds sound objects
  try {
    const indexesDir = path.join(gameDir, 'assets', 'indexes');
    if (fs.existsSync(indexesDir)) {
      const targetIndex = path.join(indexesDir, `${targetMcVersion}.json`);
      const customIndex = customVersionName ? path.join(indexesDir, `${customVersionName}.json`) : null;
      if (customIndex && fs.existsSync(customIndex) && !fs.existsSync(targetIndex)) {
        fs.copyFileSync(customIndex, targetIndex);
      } else if (customIndex && fs.existsSync(targetIndex) && !fs.existsSync(customIndex)) {
        fs.copyFileSync(targetIndex, customIndex);
      }
    }
  } catch (e) {
    console.warn('Asset index sync warning:', e);
  }

  const mclcOptions: any = {
    clientPackage: null,
    authorization: authObj,
    root: gameDir,
    version: {
      number: versionNumber,
      type: selectedVersion?.type === 'snapshot' ? 'snapshot'
          : selectedVersion?.type === 'old_beta' ? 'old_beta'
          : selectedVersion?.type === 'old_alpha' ? 'old_alpha'
          : 'release',
      custom: customVersionName
    },
    overrides: {
      versionJson: versionJsonOverride,
      minecraftJar: path.join(gameDir, 'versions', targetMcVersion, `${targetMcVersion}.jar`),
      assetIndex: targetMcVersion
    },
    memory: {
      max: `${ramMb}M`,
      min: '1024M'
    },
    customArgs,
    quickPlay: (server?.ip && server?.port) ? {
      type: 'multiplayer',
      identifier: `${server.ip}:${server.port}`
    } : undefined,
    javaPath: javaExe
  };

  sendLog(`[Launcher] Запуск клиента Minecraft ${targetMcVersion} (${targetLoaderType})...`);
  sendLog(`[Launcher] Игрок: ${account.username} (${account.type})`);
  sendLog(`[Launcher] Java: ${javaExe}`);
  sendLog(`[Launcher] Папка игры: ${gameDir}`);
  sendLog(`[Launcher] Выделенная память: ${ramMb} MB`);

  try {
    mainWindow?.webContents.send('launch:progress', {
      stage: 'launching',
      percent: 30,
      detail: 'Скачивание компонентов и запуск Minecraft...'
    });

    await mclc.launch(mclcOptions);

    mainWindow?.webContents.send('launch:progress', {
      stage: 'running',
      percent: 100,
      detail: 'Игра запущена!'
    });

    if (settings.autoCloseOnLaunch) {
      setTimeout(() => mainWindow?.minimize(), 2000);
    }

    return { success: true, gameDir };
  } catch (err: any) {
    mainWindow?.webContents.send('launch:progress', {
      stage: 'error',
      percent: 0,
      detail: `Ошибка запуска: ${err.message}`
    });
    sendLog(`[ОШИБКА ЗАПУСКА] ${err.stack || err.message}`);
    return { success: false, error: err.message };
  }
});
