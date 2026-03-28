"use client";

import { emit, emitTo } from "@tauri-apps/api/event";
import { Window as TauriWindow, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import {
  closeOverlayWindow as invokeCloseOverlayWindow,
  createOverlayWindow as invokeCreateOverlayWindow,
  updateOverlayWindowState as invokeUpdateOverlayWindowState,
} from "@/app/tauri-bridge";

import type { OverlayInstance, OverlayModule } from "./types";

const overlayWindows = new Map<string, WebviewWindow>();
const windowReady = new Map<string, Promise<void>>();
const creatingWindows = new Set<string>(); // Track windows currently being created
let cachedMainWindow: TauriWindow | null = null;
let currentMoveMode = false;

const isTauri = () =>
  typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_IPC__" in window);

const getOverlayLabel = (id: string) => `overlay-${id}`;

const getWindowSize = (overlay: OverlayInstance, module: OverlayModule) => {
  // Check if componentSettings has width/height overrides
  const componentSettings = overlay.componentSettings ?? {};
  const hasWidthOverride = typeof componentSettings.width === "number";
  const hasHeightOverride = typeof componentSettings.height === "number";

  let height = 0;
  let width = 0;

  if (hasWidthOverride && hasHeightOverride) {
    // Use componentSettings directly (already in pixels)
    width = Math.max(80, Math.round(componentSettings.width as number));
    height = Math.max(32, Math.round(componentSettings.height as number));
  } else {
    // Fall back to baseDimensions with size scaling
    if (!module.baseDimensions) return null;
    const factor = overlay.size / 100;
    width = Math.max(
      80,
      Math.round(
        hasWidthOverride
          ? (componentSettings.width as number)
          : module.baseDimensions.width * factor,
      ),
    );
    height = Math.max(
      32,
      Math.round(
        hasHeightOverride
          ? (componentSettings.height as number)
          : module.baseDimensions.height * factor,
      ),
    );
  }

  // Special handling for delta overlay: add extra height if text is above/below
  if (overlay.id === "delta") {
    const textPosition = componentSettings.textPosition as string | undefined;
    const fontSize = (componentSettings.fontSize as number) ?? 24;
    if (textPosition === "above" || textPosition === "under") {
      // Match component calculation: fontSize * 1.2 (line-height) + 4px (mb-1/mt-1) + 8px (padding)
      const textLineHeight = fontSize * 1.2;
      const textHeight = textLineHeight + 4 + 8; // line-height + spacing + padding
      height += textHeight;
      console.log(
        `[getWindowSize] Delta overlay: textPosition=${textPosition}, fontSize=${fontSize}, textLineHeight=${textLineHeight}, adding ${textHeight}px height, total=${height}`,
      );
    }
  }

  return { width, height };
};

const getMainWindow = () => {
  if (!isTauri()) return null;
  if (!cachedMainWindow) {
    try {
      cachedMainWindow = getCurrentWindow();
    } catch (error) {
      console.warn("Failed to resolve current window", error);
      return null;
    }
  }
  return cachedMainWindow;
};

const ensureReady = (win: WebviewWindow, id: string) => {
  if (!windowReady.has(id)) {
    // Just resolve immediately since we don't need to wait for page-load
    windowReady.set(id, Promise.resolve());
  }
  return windowReady.get(id) as Promise<void>;
};

const ensureOverlayWindowHandle = async (overlay: OverlayInstance, module: OverlayModule) => {
  console.log(`[ensureOverlayWindowHandle] Creating overlay window for ${overlay.id}`);

  // First check if we already have it tracked
  let win = overlayWindows.get(overlay.id);
  if (win) {
    console.log(`[ensureOverlayWindowHandle] Window already tracked for ${overlay.id}`);
    return win;
  }
  const label = getOverlayLabel(overlay.id);

  // Prevent concurrent creation attempts
  if (creatingWindows.has(overlay.id)) {
    console.log(
      `[ensureOverlayWindowHandle] Window creation already in progress for ${overlay.id}, waiting...`,
    );
    // Wait for the other creation to complete
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      win = overlayWindows.get(overlay.id) ?? (await WebviewWindow.getByLabel(label)) ?? undefined;
      if (win) {
        console.log(
          `[ensureOverlayWindowHandle] Found window after waiting for concurrent creation`,
        );
        overlayWindows.set(overlay.id, win);
        ensureReady(win, overlay.id);
        return win;
      }
      if (!creatingWindows.has(overlay.id)) {
        // Creation finished but window not found, break and try again
        break;
      }
    }
  }

  // Check if window already exists by label (could exist from previous session or page reload)
  win = (await WebviewWindow.getByLabel(label)) ?? undefined;
  if (win) {
    console.log(`[ensureOverlayWindowHandle] Window already exists by label ${label}, tracking it`);
    overlayWindows.set(overlay.id, win);
    ensureReady(win, overlay.id);
    return win;
  }

  // Mark as creating to prevent concurrent attempts
  creatingWindows.add(overlay.id);

  try {
    // Window doesn't exist, create it via backend
    const size = getWindowSize(overlay, module);
    console.log(`[ensureOverlayWindowHandle] Size for ${overlay.id}:`, size);

    const options = {
      id: overlay.id,
      url: `/overlay/window?overlayId=${overlay.id}`,
      position: overlay.position,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      decorations: false,
    } as Parameters<typeof invokeCreateOverlayWindow>[0];

    if (size) {
      options.size = size;
    }

    console.log(`[ensureOverlayWindowHandle] Invoking createOverlayWindow with:`, options);

    try {
      await invokeCreateOverlayWindow(options);
      console.log(`[ensureOverlayWindowHandle] Backend createOverlayWindow completed`);
    } catch (error) {
      // If backend creation fails (e.g., window already exists), try to get it
      console.warn(
        `[ensureOverlayWindowHandle] Backend creation failed, checking if window exists:`,
        error,
      );
      // Wait a bit and check if window was created despite the error
      await new Promise((resolve) => setTimeout(resolve, 100));
      win = (await WebviewWindow.getByLabel(label)) ?? undefined;
      if (win) {
        overlayWindows.set(overlay.id, win);
        ensureReady(win, overlay.id);
        return win;
      }
      // If we still don't have a window, return undefined
      return undefined;
    }

    // Wait for the window to be created, retry multiple times
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      win = (await WebviewWindow.getByLabel(label)) ?? undefined;
      if (win) {
        console.log(
          `[ensureOverlayWindowHandle] Got window from label ${label} after ${attempt + 1} attempts`,
        );
        break;
      }
    }

    if (!win) {
      // If backend said it succeeded but we can't find the window, something is wrong
      console.warn(
        `[ensureOverlayWindowHandle] Backend created window but we can't find it by label ${label}`,
      );
      // Try one more time after a longer wait
      await new Promise((resolve) => setTimeout(resolve, 200));
      win = (await WebviewWindow.getByLabel(label)) ?? undefined;
    }

    if (!win) {
      console.error(
        `[ensureOverlayWindowHandle] Failed to create or find window for ${overlay.id}`,
      );
      return undefined;
    }

    console.log(`[ensureOverlayWindowHandle] Successfully got window ${label}`);

    // Always track the window, even if it was created by backend
    overlayWindows.set(overlay.id, win);
    console.log(
      `[ensureOverlayWindowHandle] Tracking window ${overlay.id}, total tracked: ${overlayWindows.size}`,
    );
    ensureReady(win, overlay.id);

    return win;
  } finally {
    // Always remove from creating set, even if there was an error
    creatingWindows.delete(overlay.id);
  }
};

// Track active show operations to prevent duplicates
const showingWindows = new Set<string>();

export const showOverlayWindow = async (overlay: OverlayInstance, module: OverlayModule) => {
  console.log(`[showOverlayWindow] Showing overlay ${overlay.id}`);

  // Prevent concurrent show operations
  if (showingWindows.has(overlay.id)) {
    console.log(`[showOverlayWindow] Already showing ${overlay.id}, skipping`);
    return;
  }

  showingWindows.add(overlay.id);

  try {
    const win = await ensureOverlayWindowHandle(overlay, module);
    if (!win) {
      console.error(`[showOverlayWindow] Failed to get/create window for ${overlay.id}`);
      return;
    }

    const size = getWindowSize(overlay, module);

    try {
      const updates = {
        position: overlay.position,
        alwaysOnTop: true,
        visible: true,
      } as Parameters<typeof invokeUpdateOverlayWindowState>[1];

      if (size) {
        updates.size = size;
      }

      console.log(`[showOverlayWindow] Updating overlay window state for ${overlay.id}:`, updates);
      await invokeUpdateOverlayWindowState(overlay.id, updates);
      console.log(`[showOverlayWindow] Backend update completed`);
    } catch (error) {
      console.error(`[showOverlayWindow] Failed to update/show overlay window:`, error);
    }

    await ensureReady(win, overlay.id);

    // Wait for overlay window to report ready (listener hooked) or timeout
    const mainWindow = getMainWindow();
    const waitForReady = () =>
      new Promise<void>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            console.log(`[showOverlayWindow] Ready wait timeout for ${overlay.id}, proceeding`);
            resolved = true;
            resolve();
          }
        }, 300);

        if (mainWindow) {
          mainWindow
            .listen("overlay://ready", (event) => {
              try {
                const payload = event.payload as { id?: string };
                if (payload?.id === overlay.id && !resolved) {
                  console.log(`[showOverlayWindow] Received ready from ${overlay.id}`);
                  resolved = true;
                  clearTimeout(timeout);
                  resolve();
                }
              } catch {}
            })
            .then((unlisten) => {
              // In case of early resolve, clean up listener
              setTimeout(() => unlisten(), 1000);
            })
            .catch(() => {
              // If listen fails, rely on timeout
            });
        } else {
          // No main window, rely on timeout
        }
      });

    await waitForReady();

    console.log(`[showOverlayWindow] Emitting state to ${getOverlayLabel(overlay.id)}`, {
      overlayId: overlay.id,
      componentSettings: overlay.componentSettings,
      componentSettingsType: typeof overlay.componentSettings,
      componentSettingsKeys: overlay.componentSettings
        ? Object.keys(overlay.componentSettings)
        : "none",
      size: overlay.size,
      opacity: overlay.opacity,
    });
    // Send state - this ensures custom settings are applied right away
    await emitTo(getOverlayLabel(overlay.id), "overlay://state", { overlay, module });
    // Send current move mode state to the new window
    await emitTo(getOverlayLabel(overlay.id), "overlay://move-mode", { enabled: currentMoveMode });
  } finally {
    showingWindows.delete(overlay.id);
  }
};

export const hideOverlayWindow = async (id: string) => {
  console.log(`[hideOverlayWindow] Hiding overlay ${id}`);

  try {
    await invokeCloseOverlayWindow(id);
  } catch (error) {
    console.error(`[hideOverlayWindow] Failed to close overlay window:`, error);
  }

  overlayWindows.delete(id);
  windowReady.delete(id);
};

export const updateOverlayWindow = async (
  overlay: OverlayInstance,
  module: OverlayModule,
  options?: { updatePosition?: boolean },
) => {
  console.log(`[updateOverlayWindow] Updating overlay ${overlay.id}`);
  const win = overlayWindows.get(overlay.id);
  if (!win) {
    console.warn(`[updateOverlayWindow] Window not found for ${overlay.id}`);
    return;
  }

  const size = getWindowSize(overlay, module);

  try {
    const updates: Parameters<typeof invokeUpdateOverlayWindowState>[1] = {};
    if (size) {
      updates.size = size;
    }
    // Only update position if explicitly requested (e.g., when position actually changed)
    if (options?.updatePosition && overlay.position) {
      updates.position = overlay.position;
    }

    console.log(`[updateOverlayWindow] Updating state:`, updates);
    await invokeUpdateOverlayWindowState(overlay.id, updates);
    await emitTo(getOverlayLabel(overlay.id), "overlay://state", { overlay, module });
  } catch (error) {
    console.error(`[updateOverlayWindow] Failed to update overlay window state:`, error);
  }
};

const refreshOverlayWindows = async () => {
  // Try to find any overlay windows that might exist but aren't tracked
  // This happens when backend creates windows
  try {
    // getAll() might not exist or might return a different structure
    // Instead, we'll just use the already tracked windows
    // Windows should be tracked when they're created in ensureOverlayWindowHandle
    console.log(`[refreshOverlayWindows] Currently tracking ${overlayWindows.size} windows`);
  } catch (error) {
    console.warn(`[refreshOverlayWindows] Failed to refresh:`, error);
  }
};

export const broadcastMoveMode = async (enabled: boolean) => {
  currentMoveMode = enabled;

  // Refresh window list before broadcasting
  await refreshOverlayWindows();

  console.log(
    `[broadcastMoveMode] Broadcasting move mode: ${enabled} to ${overlayWindows.size} windows`,
  );

  // Broadcast to all overlay windows individually
  const promises = Array.from(overlayWindows.keys()).map(async (id) => {
    const label = getOverlayLabel(id);
    console.log(`[broadcastMoveMode] Emitting to ${label}`);
    try {
      await emitTo(label, "overlay://move-mode", { enabled });
    } catch (error) {
      console.error(`[broadcastMoveMode] Failed to emit to ${label}:`, error);
    }
  });

  await Promise.all(promises);
  console.log(`[broadcastMoveMode] Finished broadcasting`);
};

export const getOverlayWindow = (id: string) => overlayWindows.get(id);

export const registerOverlayPositionListener = (
  handler: (payload: { id: string; position: { x: number; y: number } }) => void,
) => {
  if (!isTauri()) return Promise.resolve(() => {});
  const mainWindow = getMainWindow();
  if (!mainWindow) return Promise.resolve(() => {});
  return mainWindow.listen("overlay://position", (event) => {
    const payload = event.payload as { id: string; position: { x: number; y: number } };
    handler(payload);
  });
};

export const registerOverlayClosedListener = (handler: (payload: { id: string }) => void) => {
  if (!isTauri()) return Promise.resolve(() => {});
  const mainWindow = getMainWindow();
  if (!mainWindow) return Promise.resolve(() => {});
  return mainWindow.listen("overlay://window-closed", (event) => {
    const payload = event.payload as { id: string };
    handler(payload);
  });
};
