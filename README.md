# DiscoLauncher

<div align="center">

**Open source Minecraft launcher with multi-server management, 3D skin preview, and mod auto-sync**

[![Release](https://img.shields.io/github/v/release/Varringard/DiscoLauncher?style=flat-square&label=Latest)](https://github.com/Varringard/DiscoLauncher/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/Varringard/DiscoLauncher/release.yml?style=flat-square)](https://github.com/Varringard/DiscoLauncher/actions)

</div>

---

## Features

- 🎮 **Multi-server management** — connect to multiple Minecraft servers, each with its own mod pack
- 🔄 **Automatic mod sync** — mods downloaded and updated automatically from your server backend ([DiscoLauncher-backend](https://github.com/Varringard/DiscoLauncher-backend))
- 🧍 **3D skin preview** — interactive 3D character viewer with auto-detect classic/slim model
- 👤 **Multiple account types** — Offline (nickname), Ely.by, and Microsoft (Mojang) accounts
- 🖼️ **Skin upload** — upload skins to Mojang API (Microsoft) or manage via Ely.by catalog
- 🔔 **Auto-update** — notified of new versions, one-click update and restart
- ⚙️ **Full settings** — Java path, RAM allocation, game directory, window size, and more

---

## Download

**[⬇️ Download latest DiscoLauncher.exe](https://github.com/Varringard/DiscoLauncher/releases/latest)**

No installation needed — just download and run the portable `.exe`.

> **Requirements:** Windows 10/11 x64, Java 17+ (auto-detected)

---

## Quick Start (Users)

1. Download `DiscoLauncher.exe` from [Releases](https://github.com/Varringard/DiscoLauncher/releases)
2. Run it — no installation needed
3. In **Settings**, enter your server backend URL (e.g. `http://your-server:6500`)
4. Your servers will appear automatically — select one and click **Launch**

---

## Backend Setup

DiscoLauncher requires the **[DiscoLauncher-backend](https://github.com/Varringard/DiscoLauncher-backend)** to manage servers and mods.

Install in a Proxmox LXC container with **one command**:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Varringard/DiscoLauncher-backend/main/install.sh)"
```

After installation, open the Admin Panel at `http://<container-ip>:5000` and configure your servers.

---

## Development

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/Varringard/DiscoLauncher.git
cd DiscoLauncher
npm install
```

### Run in development mode

```bash
npm run dev
```

### Build portable `.exe`

```bash
npm run build:exe
```

Output: `release/DiscoLauncher.exe`

---

## Auto-Update

DiscoLauncher checks for new releases on startup via the GitHub Releases API.

When a new version is available, a banner appears at the top of the launcher:
- **"Обновить и перезапустить"** — downloads the new `.exe`, replaces the current one, and restarts automatically
- **"Подробнее"** — opens the release page in your browser

To release a new version:
1. Update `version` in `package.json`
2. Push a git tag: `git tag v1.0.1 && git push --tags`
3. GitHub Actions automatically builds and publishes `DiscoLauncher.exe` to Releases

---

## Project Structure

```
DiscoLauncher/
├── electron/          # Electron main process (main.ts, preload.ts)
├── src/               # React frontend
│   ├── components/    # UI components
│   ├── utils/         # Helpers
│   └── types.ts       # TypeScript types
├── build/             # App icons
├── public/            # Static assets
└── .github/workflows/ # GitHub Actions CI/CD
```

---

## Contributing

Pull requests are welcome! Please open an issue first to discuss major changes.

---

## License

MIT © [DiscoLauncher Contributors](https://github.com/Varringard/DiscoLauncher/graphs/contributors)
