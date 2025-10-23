<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/rotationracing/relaydrive?style=for-the-badge" alt="License" /></a>
  <a href="https://github.com/rotationracing/relaydrive/stargazers"><img src="https://img.shields.io/github/stars/rotationracing/relaydrive?style=for-the-badge" alt="Stars" /></a>
  <a href="https://github.com/rotationracing/relaydrive/network/members"><img src="https://img.shields.io/github/forks/rotationracing/relaydrive?style=for-the-badge" alt="Forks" /></a>
  <a href="https://github.com/rotationracing/relaydrive/pulls"><img src="https://img.shields.io/github/issues-pr/rotationracing/relaydrive?style=for-the-badge" alt="Pull Requests" /></a>
  <a href="https://github.com/rotationracing/relaydrive/issues"><img src="https://img.shields.io/github/issues/rotationracing/relaydrive?style=for-the-badge" alt="Issues" /></a>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/2e6e23e9-d5f8-4db3-89ce-8231d7fd9f2c" alt="RelayDrive Banner" width="100%" />
</p>

<p align="center">
  <strong>Server Status</strong><br>
  <a href="https://uptime.betterstack.com/?utm_source=status_badge">
    <img src="https://uptime.betterstack.com/status-badges/v2/monitor/268rs.svg" alt="API status" />
  </a>
</p>

## Overview

**RelayDrive** is an overlay and telemetry application for:

* Assetto Corsa Competizione
* iRacing
* Le Mans Ultimate

The app delivers real-time telemetry and overlay features directly to your game. This repository contains the source code of the app only. Server-side code, including cloud processing, public leaderboards, and shared telemetry, is a premium feature and is not open source.

The compiled app.exe from the installer is identical to building from source. Premium features are unlocked by logging in with an active Pro subscription.

**Download the latest release:**
[RelayDrive Download](https://relaydrive.rotationracing.eu/download)

<p>
  <a href="https://github.com/rotationracing/relaydrive/releases/latest"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status" /></a>
  <a href="https://github.com/rotationracing/relaydrive/releases/latest"><img src="https://img.shields.io/github/v/release/rotationracing/relaydrive?style=for-the-badge" alt="Release" /></a>
</p>

---

> [!WARNING]
> RelayDrive is currently in **Alpha**. Development is active and iterative, with frequent large updates.
During this stage, **pull requests are not accepted**. Contributions will open in the **Beta** phase.

---

## Development

<p align="center">
  <a href="https://skillicons.dev"><img src="https://skillicons.dev/icons?i=tauri,rust,bun,ts,nextjs,tailwind,windows&theme=dark" alt="Tech Stack" /></a>
</p>

### Requirements

* [Bun](https://bun.sh)
* [Rust](https://www.rust-lang.org/tools/install)

### Installation

```bash
bun install
```

### Run in Development

```bash
bun run tauri dev
```

### Build the App

```bash
bun run tauri build
```

> [!IMPORTANT]
> This project uses **Bun** exclusively. Do not use npm, pnpm, or yarn.

---

## Connect with us!

<p align="center">
  <a href="https://discord.gg/tXMAbRChWn"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
  <a href="https://x.com/rotationracing"><img src="https://img.shields.io/badge/X%20(Twitter)-@rotationracing-1DA1F2?style=for-the-badge&logo=x&logoColor=white" alt="Twitter" /></a>
  <a href="mailto:support@rotationracing.eu"><img src="https://img.shields.io/badge/Email-support@rotationracing.eu-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" /></a>
</p>

## Support

* [Documentation](https://relaydrive.rotationracing.eu/docs/)
* [Join Discord](https://discord.gg/tXMAbRChWn) for community help
* For **account or payment** issues: [support@rotationracing.eu](mailto:support@rotationracing.eu)

---

## Star History

<a href="https://www.star-history.com/#rotationracing/RelayDrive&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=rotationracing/RelayDrive&type=date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=rotationracing/RelayDrive&type=date&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=rotationracing/RelayDrive&type=date&legend=top-left" />
  </picture>
</a>

---

## Contributors

<a href="https://github.com/rotationracing/relaydrive/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=rotationracing/relaydrive" alt="Contributors" />
</a>

---

## Acknowledgements

Special thanks to **Naresh Kumar** for [`acc_shared_memory_rs`](https://crates.io/crates/acc_shared_memory_rs), used in RelayDrive.
RelayDrive is a product by **Rotation Racing**. For further credits, see [CREDITS.md](CREDITS.md).
