# Deep Links Protocol Reference

RelayDrive supports custom protocol handlers for launching specific game modes and overlays.

## Protocol Schemes

- **Production:** `relaydrive://`
- **Development:** `relaydrive-dev://`

## Available Deep Links

### Game Launcher

Launch specific game modes:

```
relaydrive://launcher
relaydrive://launcher/acc
relaydrive://launcher/iracing
relaydrive://launcher/lmu
```

### ACC Console

Open the ACC console view:

```
relaydrive://acc/console
```

### ACC Engineer

Open the ACC race engineer view:

```
relaydrive://acc/engineer
```

### ACC Overlay

Open ACC overlay configuration:

```
relaydrive://acc/overlay
```

### Onboarding

Show the onboarding flow:

```
relaydrive://onboarding
```

## Usage in External Applications

### From Web Browser

Simply navigate to a deep link URL:

```html
<a href="relaydrive://acc/console">Open ACC Console</a>
```

### From JavaScript

```javascript
window.location.href = 'relaydrive://acc/engineer';
```

### From Command Line (Windows)

```powershell
start relaydrive://launcher/acc
```

### From Command Line (macOS/Linux)

```bash
open relaydrive://launcher/acc
```

## Registering the Protocol

The protocol is automatically registered during app installation. For development:

### Windows (PowerShell as Administrator)

```powershell
.\scripts\register-dev-protocol.ps1
```

## Implementation Details

Deep links are handled by the `deep-link-listener` component, which listens for `deep-link://open-url` events from the Tauri backend and routes to appropriate pages using Next.js router.

See `src/components/deep-link-listener.tsx` for implementation details.
