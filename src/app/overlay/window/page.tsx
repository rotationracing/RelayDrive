"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import { getOverlayModule } from "@/app/acc/overlay/overlay-registry";
import type { OverlayInstance } from "@/app/acc/overlay/types";

const isTauri = () =>
  typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_IPC__" in window);

type OverlayState = Pick<OverlayInstance, "size" | "opacity" | "componentSettings"> & {
  moveMode: boolean;
};

function OverlayWindowContent() {
  const searchParams = useSearchParams();
  const overlayId = searchParams.get("overlayId") ?? undefined;
  const overlayModule = useMemo(
    () => (overlayId ? getOverlayModule(overlayId) : undefined),
    [overlayId],
  );

  const [state, setState] = useState<OverlayState>(() => {
    const componentSettings: Record<
      string,
      number | string | boolean | [number, number, number, number]
    > = {};
    if (overlayModule?.componentSettings) {
      Object.entries(overlayModule.componentSettings).forEach(([key, setting]) => {
        componentSettings[key] = setting.defaultValue;
      });
    }
    return {
      size: overlayModule?.defaultSize ?? 100,
      opacity: overlayModule?.defaultOpacity ?? 100,
      componentSettings,
      moveMode: false,
    };
  });

  const [currentWindow, setCurrentWindow] = useState<WebviewWindow | null>(null);

  useEffect(() => {
    const tryGetWindow = () => {
      try {
        const win = getCurrentWebviewWindow();
        console.log(`[overlay-${overlayId}] Got current window:`, win?.label, win);
        setCurrentWindow(win);
      } catch (error) {
        console.warn(`[overlay-${overlayId}] Failed to get current window, retrying...`, error);
        // Retry after a short delay
        setTimeout(tryGetWindow, 100);
      }
    };

    // Try immediately
    tryGetWindow();
  }, [overlayId]);

  useEffect(() => {
    // Make body and html transparent for overlay windows
    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.backgroundColor = "transparent";

    // Hide Next.js logo, remove all shadows, and disable text selection
    const style = document.createElement("style");
    style.textContent = `
      body, html {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
      body * {
        text-shadow: none !important;
        box-shadow: none !important;
        filter: drop-shadow(none) !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      ::selection {
        background: transparent !important;
      }
      ::-moz-selection {
        background: transparent !important;
      }
      [data-nextjs-cookie-consent],
      [data-nextjs-toast],
      [id*="__next"],
      [class*="nextjs"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Restore default on unmount (though this shouldn't matter for overlay windows)
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!overlayId) return;

    console.log(
      `[overlay-${overlayId}] Setting up event listeners, isTauri=${isTauri()}, window.__TAURI__=${(window as any).__TAURI__}, window.__TAURI_IPC__=${(window as any).__TAURI_IPC__}`,
    );

    let unlistenState: (() => void) | undefined;
    let unlistenMove: (() => void) | undefined;

    // Try to set up listeners even if isTauri() returns false - the APIs might still work
    listen("overlay://state", (event) => {
      const payload = event.payload as { overlay: OverlayInstance };
      if (!payload?.overlay || payload.overlay.id !== overlayId) {
        console.log(`[overlay-${overlayId}] State event ignored:`, {
          hasPayload: !!payload,
          hasOverlay: !!payload?.overlay,
          overlayId: payload?.overlay?.id,
          expectedId: overlayId,
        });
        return;
      }

      const receivedSettings = payload.overlay.componentSettings;
      // Use received settings if it's an object (even if empty), only fall back if undefined/null
      const hasSettings =
        receivedSettings !== undefined &&
        receivedSettings !== null &&
        typeof receivedSettings === "object";

      console.log(`[overlay-${overlayId}] Received state update:`, {
        componentSettings: receivedSettings,
        hasSettings,
        isObject: typeof receivedSettings === "object",
        settingsKeys: receivedSettings ? Object.keys(receivedSettings) : [],
        size: payload.overlay.size,
        opacity: payload.overlay.opacity,
      });

      setState((prev) => {
        // Always use overlay's componentSettings if it's provided (even if empty object),
        // only keep previous if componentSettings is undefined/null
        const newComponentSettings = hasSettings ? receivedSettings : prev.componentSettings;

        console.log(`[overlay-${overlayId}] Updating state:`, {
          prevComponentSettings: prev.componentSettings,
          prevSettingsKeys: prev.componentSettings ? Object.keys(prev.componentSettings) : [],
          newComponentSettings,
          newSettingsKeys: newComponentSettings ? Object.keys(newComponentSettings) : [],
          willUseNew: hasSettings,
        });

        return {
          ...prev,
          size: payload.overlay.size,
          opacity: payload.overlay.opacity,
          componentSettings: newComponentSettings,
        };
      });
    })
      .then((unlisten) => {
        unlistenState = unlisten;
        console.log(`[overlay-${overlayId}] State listener set up`);
      })
      .catch((err) => {
        console.error(`[overlay-${overlayId}] Failed to listen to state:`, err);
      });

    listen("overlay://move-mode", (event) => {
      const payload = event.payload as { enabled: boolean };
      console.log(`[overlay-${overlayId}] Received move-mode event:`, payload);
      setState((prev) => {
        const newMoveMode = Boolean(payload?.enabled);
        console.log(`[overlay-${overlayId}] Setting moveMode to:`, newMoveMode);
        return { ...prev, moveMode: newMoveMode };
      });
    })
      .then((unlisten) => {
        unlistenMove = unlisten;
        console.log(`[overlay-${overlayId}] Move-mode listener set up`);
      })
      .catch((err) => {
        console.error(`[overlay-${overlayId}] Failed to listen to move-mode:`, err);
      });

    // Notify main that this overlay window is ready to receive state
    try {
      console.log(`[overlay-${overlayId}] Emitting ready event`);
      void emitTo("main", "overlay://ready", { id: overlayId });
    } catch (err) {
      console.warn(`[overlay-${overlayId}] Failed to emit ready:`, err);
    }

    const handleBeforeUnload = () => {
      try {
        void emitTo("main", "overlay://window-closed", { id: overlayId });
      } catch (err) {
        console.error(`[overlay-${overlayId}] Failed to emit close event:`, err);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unlistenState?.();
      unlistenMove?.();
    };
  }, [overlayId]);

  const syncPosition = async () => {
    if (!overlayId || !currentWindow) return;
    try {
      const { x, y } = await currentWindow.outerPosition();
      await emitTo("main", "overlay://position", { id: overlayId, position: { x, y } });
    } catch (error) {
      console.warn("Failed to sync overlay position", error);
    }
  };

  if (!overlayId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent text-white/80">
        Missing overlay id
      </div>
    );
  }

  if (!overlayModule) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black/70 text-white">
        Overlay not found: {overlayId}
      </div>
    );
  }

  const OverlayComponent = overlayModule.Component;

  const handleMouseDown = (event: React.MouseEvent) => {
    console.log(
      `[overlay-${overlayId}] Mouse down, moveMode=${state.moveMode}, button=${event.button}, currentWindow=${!!currentWindow}`,
    );
    if (!state.moveMode) {
      console.log(`[overlay-${overlayId}] Move mode disabled, skipping drag`);
      return;
    }
    if (event.button !== 0) {
      console.log(`[overlay-${overlayId}] Not left mouse button, skipping`);
      return;
    }
    if (!currentWindow) {
      console.log(`[overlay-${overlayId}] No current window, skipping`);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    console.log(`[overlay-${overlayId}] Starting drag on window ${currentWindow.label}`);
    // startDragging() must be called synchronously on mousedown
    try {
      currentWindow.startDragging().catch((error) => {
        console.error(`[overlay-${overlayId}] Failed to start dragging:`, error);
      });
      console.log(`[overlay-${overlayId}] Drag started`);
    } catch (error) {
      console.error(`[overlay-${overlayId}] Failed to start dragging (sync):`, error);
    }
  };

  const handleMouseUp = () => {
    if (!state.moveMode) return;
    console.log(`[overlay-${overlayId}] Mouse up, syncing position`);
    void syncPosition();
  };

  console.log(
    `[overlay-${overlayId}] Rendering, moveMode=${state.moveMode}, will show border: ${state.moveMode}`,
  );

  return (
    <div
      className="fixed inset-0 bg-transparent"
      style={{
        pointerEvents: "auto",
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {state.moveMode && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: "4px solid #e63946",
            boxSizing: "border-box",
            zIndex: 2147483647,
          }}
        />
      )}
      <div
        className="h-full w-full"
        style={{
          pointerEvents: "auto",
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <div
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{
            height: "100%",
            width: "100%",
            pointerEvents: "auto",
          }}
        >
          <OverlayComponent
            size={state.size}
            opacity={state.opacity}
            moveMode={state.moveMode}
            componentSettings={state.componentSettings}
          />
        </div>
      </div>
    </div>
  );
}

export default function OverlayWindowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-transparent text-white/80">
          Loading overlay...
        </div>
      }
    >
      <OverlayWindowContent />
    </Suspense>
  );
}
