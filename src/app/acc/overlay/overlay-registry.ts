import type { OverlayModule } from "./types";

import overlayModules from "./overlays";

let overlayCache: OverlayModule[] | null = null;

function loadModules(): OverlayModule[] {
  const modules = [...overlayModules];
  modules.sort((a, b) => a.title.localeCompare(b.title));
  return modules;
}

export function getOverlayModules(): OverlayModule[] {
  if (!overlayCache) {
    overlayCache = loadModules();
  }
  return overlayCache;
}

export function getOverlayModule(id: string): OverlayModule | undefined {
  return getOverlayModules().find((overlay) => overlay.id === id);
}
