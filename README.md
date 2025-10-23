<p align="center">
  <img src="https://github.com/user-attachments/assets/2e6e23e9-d5f8-4db3-89ce-8231d7fd9f2c" alt="relaydrive-banner-github-top-2" width="100%" />
</p>

[![Status](https://img.shields.io/badge/status-alpha-orange?style=for-the-badge)](https://github.com/rotationracing/relaydrive/releases/latest)
[![Stars](https://img.shields.io/github/stars/rotationracing/relaydrive?style=for-the-badge)](https://github.com/rotationracing/relaydrive/stargazers)
[![Forks](https://img.shields.io/github/forks/rotationracing/relaydrive?style=for-the-badge)](https://github.com/rotationracing/relaydrive/network/members)
[![Pull Requests](https://img.shields.io/github/issues-pr/rotationracing/relaydrive?style=for-the-badge)](https://github.com/rotationracing/relaydrive/pulls)
[![Issues](https://img.shields.io/github/issues/rotationracing/relaydrive?style=for-the-badge)](https://github.com/rotationracing/relaydrive/issues)
[![License](https://img.shields.io/github/license/rotationracing/relaydrive?style=for-the-badge)](./LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/rotationracing/relaydrive?style=for-the-badge)](https://github.com/rotationracing/relaydrive/releases/latest)

**Connect with us:**

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge\&logo=discord\&logoColor=white)](https://discord.gg/tXMAbRChWn)
[![X](https://img.shields.io/badge/X\(twitter\)-@rotationracing-1DA1F2?style=for-the-badge\&logo=x\&logoColor=white)](https://x.com/rotationracing)
[![Email](https://img.shields.io/badge/Email-support@rotationracing.eu-D14836?style=for-the-badge\&logo=gmail\&logoColor=white)](mailto:support@rotationracing.eu)

<p align="center">
  <strong>Current Server Status</strong><br>
  <a href="https://uptime.betterstack.com/?utm_source=status_badge">
    <img src="https://uptime.betterstack.com/status-badges/v2/monitor/268rs.svg" alt="API status" />
  </a>
</p>

## Introduction

**RelayDrive** is an Overlay and Telemetry application for:

* Assetto Corsa Competizione
* iRacing
* Le Mans Ultimate

The app delivers real-time telemetry and overlay features directly to your game. This repository contains the **source code of the app only**. Server-side code, including cloud processing, public leaderboards, and shared telemetry, is a premium feature and is **not open source**.

The compiled `app.exe` from the installer is identical to building from source. Premium features are unlocked by logging in with an active **Pro subscription**.

**Download the latest version:** [RelayDrive Download](https://relaydrive.rotationracing.eu/download)

**Support & troubleshooting:**

* [Documentation](https://relaydrive.rotationracing.eu/docs/)
* [Discord community](https://discord.gg/tXMAbRChWn)
* For account/payment issues: [support@rotationracing.eu](mailto:support@rotationracing.eu)

---

## ⚠️ Current Status

RelayDrive is in **Alpha Stage**. Features are rapidly evolving, and commits are large and frequent. During Alpha, **we do not accept pull requests**. Contributions will be welcomed during **Beta stage**.

---

## Built With

* [Tauri](https://tauri.app/) – Lightweight desktop app framework
* [Next.js](https://nextjs.org/) – Frontend framework
* [TailwindCSS](https://tailwindcss.com/) – Styling
* [ShadCN Components](https://shadcn.dev/) – UI components
* [Bun](https://bun.sh/) – Runtime for faster builds and scripts
* [Rust](https://www.rust-lang.org/) – Backend language

---

## Development Setup

**Requirements:**

* Bun ([installation guide](https://bun.sh))
* Rust ([installation guide](https://www.rust-lang.org/tools/install))

**Install dependencies:**

```
bun install
```

**Run in development mode:**

```
bun run tauri dev
```

**Build the app:**

```
bun run tauri build
```

> ⚠️ Please use Bun exclusively for development. Do **not** use npm, pnpm, or other package managers when contributing.

**API Documentation:**

* [Public & Local API docs](https://relaydrive.rotationracing.eu/docs/api)

---

## Acknowledgements

Special thanks to **Naresh Kumar** for creating [`acc_shared_memory_rs`](https://crates.io/crates/acc_shared_memory_rs) used in RelayDrive.

RelayDrive is a product by **Rotation Racing**. All rights reserved. For additional tools, libraries, and credits, see [CREDITS.md](CREDITS.md).

---

## Contributors

<a href="https://github.com/rotationracing/relaydrive/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=rotationracing/relaydrive" />
</a>
