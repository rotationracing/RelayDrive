"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOverlaySessionStore } from "@/stores/overlay-session-store";
import type { OverlayInstance, OverlayModule } from "@/app/acc/overlay/types";
import {
  getOverlayWindow,
  hideOverlayWindow,
  registerOverlayClosedListener,
  registerOverlayPositionListener,
  showOverlayWindow,
  updateOverlayWindow,
} from "@/app/acc/overlay/overlay-window-manager";

interface UseOverlayManagementOptions {
  overlayModules: OverlayModule[];
  saveDefaultConfig?: (overlays: OverlayInstance[]) => Promise<void>;
}

export function useOverlayManagement({
  overlayModules,
  saveDefaultConfig,
}: UseOverlayManagementOptions) {
  const moduleMap = useMemo(() => {
    const entries = overlayModules.map((module) => [module.id, module] as const);
    return new Map(entries);
  }, [overlayModules]);

  const {
    overlaysEnabled,
    setOverlaysEnabled,
    overlayEnabledStates,
    setOverlayEnabled,
    initializeOverlayStates,
    editMode,
    toggleEditMode,
  } = useOverlaySessionStore();

  const [overlays, setOverlays] = useState<OverlayInstance[]>(() => {
    const storeState = useOverlaySessionStore.getState();
    const hasStoreState = Object.keys(storeState.overlayEnabledStates).length > 0;

    return overlayModules.map((module, index) => {
      const fallbackPosition = { x: 80 + index * 80, y: 80 + index * 60 };
      const storeEnabled = hasStoreState
        ? (storeState.overlayEnabledStates[module.id] ?? Boolean(module.defaultEnabled))
        : Boolean(module.defaultEnabled);

      const componentSettings: Record<
        string,
        number | string | boolean | [number, number, number, number]
      > = {};
      if (module.componentSettings) {
        Object.entries(module.componentSettings).forEach(([key, setting]) => {
          componentSettings[key] = setting.defaultValue;
        });
      }

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        icon: module.icon,
        defaultEnabled: module.defaultEnabled,
        defaultPosition: module.defaultPosition,
        defaultSize: module.defaultSize,
        defaultOpacity: module.defaultOpacity,
        baseDimensions: module.baseDimensions,
        enabled: storeEnabled,
        position: module.defaultPosition ?? fallbackPosition,
        size: module.defaultSize ?? 100,
        opacity: module.defaultOpacity ?? 100,
        componentSettings,
      };
    });
  });

  const storeInitializedRef = useRef(false);
  const prevOverlaysEnabledRef = useRef<boolean | null>(null);
  const isTogglingFromHookRef = useRef(false);

  // Sync window management when overlaysEnabled changes from store (e.g., via hotkey)
  useEffect(() => {
    // Skip on initial mount
    if (prevOverlaysEnabledRef.current === null) {
      prevOverlaysEnabledRef.current = overlaysEnabled;
      return;
    }

    // Skip if the change came from the hook itself
    if (isTogglingFromHookRef.current) {
      isTogglingFromHookRef.current = false;
      prevOverlaysEnabledRef.current = overlaysEnabled;
      return;
    }

    // Only proceed if the store value changed externally (e.g., from hotkey)
    if (prevOverlaysEnabledRef.current !== overlaysEnabled) {
      console.log(
        `[useOverlayManagement] Store overlaysEnabled changed externally from ${prevOverlaysEnabledRef.current} to ${overlaysEnabled}. Syncing windows.`,
      );

      // Capture positions and show/hide windows
      Promise.all(
        overlays.map(async (overlay) => {
          try {
            const win = getOverlayWindow(overlay.id);
            if (win) {
              const pos = await win.outerPosition();
              if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                return { ...overlay, position: { x: Number(pos.x), y: Number(pos.y) } };
              }
            }
          } catch (error) {
            console.warn(
              `[useOverlayManagement] Failed to capture position for ${overlay.id}:`,
              error,
            );
          }
          return overlay;
        }),
      )
        .then((capturedPositions) => {
          // Update overlays with captured positions
          const updatedOverlays = overlays.map((overlay) => {
            const captured = capturedPositions.find((o) => o.id === overlay.id);
            if (!captured) return overlay;
            return {
              ...overlay,
              position: captured.position,
              size: captured.size,
              opacity: captured.opacity,
              componentSettings: overlay.componentSettings,
            };
          });

          setOverlays(updatedOverlays);

          // Show/hide windows based on new state
          updatedOverlays.forEach((overlay) => {
            const module = moduleMap.get(overlay.id);
            if (!module) return;

            if (overlaysEnabled && overlay.enabled) {
              console.log(
                `[useOverlayManagement] Showing overlay ${overlay.id} (synced from store)`,
              );
              void showOverlayWindow(overlay, module);
            } else if (!overlaysEnabled && overlay.enabled) {
              console.log(
                `[useOverlayManagement] Hiding overlay ${overlay.id} (synced from store)`,
              );
              void hideOverlayWindow(overlay.id);
            }
          });

          // Save config if needed
          if (saveDefaultConfig) {
            void saveDefaultConfig(updatedOverlays);
          }
        })
        .catch((error) => {
          console.error("[useOverlayManagement] Failed to sync windows after store change:", error);
        });

      prevOverlaysEnabledRef.current = overlaysEnabled;
    }
  }, [overlaysEnabled, overlays, moduleMap, setOverlays, saveDefaultConfig]);

  // Sync overlay enabled states from store
  useEffect(() => {
    const storeState = useOverlaySessionStore.getState();
    if (Object.keys(storeState.overlayEnabledStates).length === 0) return;
    if (!storeInitializedRef.current) return;

    setOverlays((prev) => {
      let hasChanges = false;
      const updated = prev.map((overlay) => {
        const storeEnabled = storeState.overlayEnabledStates[overlay.id];
        if (storeEnabled === undefined) return overlay;
        if (overlay.enabled === storeEnabled) return overlay;

        hasChanges = true;
        return {
          ...overlay,
          enabled: storeEnabled,
        };
      });

      return hasChanges ? updated : prev;
    });
  }, [overlayEnabledStates]);

  // Register window position and closed listeners
  useEffect(() => {
    let unlistenPosition: (() => void) | undefined;
    let unlistenClosed: (() => void) | undefined;

    void registerOverlayPositionListener(({ id, position }) => {
      setOverlays((prev) => {
        const updated = prev.map((overlay) =>
          overlay.id === id ? { ...overlay, position } : overlay,
        );
        if (saveDefaultConfig) {
          void saveDefaultConfig(updated);
        }
        return updated;
      });
    }).then((fn) => {
      unlistenPosition = fn;
    });

    void registerOverlayClosedListener(({ id }) => {
      setOverlays((prev) => {
        const updated = prev.map((overlay) =>
          overlay.id === id ? { ...overlay, enabled: false } : overlay,
        );
        if (saveDefaultConfig) {
          void saveDefaultConfig(updated);
        }
        return updated;
      });
    }).then((fn) => {
      unlistenClosed = fn;
    });

    return () => {
      unlistenPosition?.();
      unlistenClosed?.();
    };
  }, [saveDefaultConfig]);

  const toggleOverlay = useCallback(
    async (id: string) => {
      console.log(`[toggleOverlay] Toggling overlay ${id}`);
      const module = moduleMap.get(id);
      if (!module) {
        console.warn(`[toggleOverlay] Module not found for ${id}`);
        return;
      }

      setOverlays((prev) => {
        const currentOverlay = prev.find((o) => o.id === id);
        if (!currentOverlay) return prev;

        let latestPosition: { x: number; y: number } | undefined;
        // Capture position before disabling
        if (currentOverlay.enabled) {
          try {
            const win = getOverlayWindow(id);
            if (win) {
              // Note: This is async but we're in a sync callback, so we'll capture position after
              win
                .outerPosition()
                .then((pos) => {
                  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                    setOverlays((p) =>
                      p.map((o) =>
                        o.id === id
                          ? { ...o, position: { x: Number(pos.x), y: Number(pos.y) } }
                          : o,
                      ),
                    );
                  }
                })
                .catch(() => {});
            }
          } catch (err) {
            console.warn(`[toggleOverlay] Failed to capture latest position for ${id}:`, err);
          }
        }

        const nextEnabled = !currentOverlay.enabled;
        // Defer store update to avoid updating Zustand store during render phase
        queueMicrotask(() => {
          setOverlayEnabled(id, nextEnabled);
        });

        const updated = prev.map((overlay) => {
          if (overlay.id !== id) return overlay;
          const updatedOverlay = {
            ...overlay,
            enabled: nextEnabled,
            // Explicitly preserve ALL properties including componentSettings
            componentSettings: overlay.componentSettings,
          };
          console.log(`[toggleOverlay] Updated overlay ${id}, enabled=${updatedOverlay.enabled}`, {
            componentSettings: updatedOverlay.componentSettings,
            hasComponentSettings:
              !!updatedOverlay.componentSettings &&
              Object.keys(updatedOverlay.componentSettings).length > 0,
          });

          try {
            if (updatedOverlay.enabled && overlaysEnabled) {
              console.log(`[toggleOverlay] Calling showOverlayWindow for ${id}`, {
                componentSettings: updatedOverlay.componentSettings,
                fullOverlay: updatedOverlay,
              });
              setTimeout(() => {
                void showOverlayWindow(updatedOverlay, module);
              }, 50);
            } else {
              console.log(`[toggleOverlay] Calling hideOverlayWindow for ${id}`);
              void hideOverlayWindow(id);
            }
          } catch (error) {
            console.error(`[toggleOverlay] Window toggle failed for ${id}:`, error);
          }
          return updatedOverlay;
        });

        if (saveDefaultConfig) {
          saveDefaultConfig(updated)
            .then(() => {
              console.log(`[toggleOverlay] ✓ Saved default.json after toggling ${id}`);
            })
            .catch((err) => {
              console.error(`[toggleOverlay] ✗ Failed to save default.json:`, err);
            });
        }

        return updated;
      });
    },
    [moduleMap, overlaysEnabled, setOverlayEnabled, saveDefaultConfig],
  );

  // Debounced save function
  const saveTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const debouncedSave = useCallback(
    (overlays: OverlayInstance[], delay: number = 1000) => {
      // Clear any existing timeout
      const existingTimeout = saveTimeoutRef.current.get("default");
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        if (saveDefaultConfig) {
          void saveDefaultConfig(overlays);
        }
        saveTimeoutRef.current.delete("default");
      }, delay);

      saveTimeoutRef.current.set("default", timeout);
    },
    [saveDefaultConfig],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      saveTimeoutRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      saveTimeoutRef.current.clear();
    };
  }, []);

  const updateOverlay = useCallback(
    (id: string, updates: Partial<OverlayInstance>, options?: { skipSave?: boolean }) => {
      const module = moduleMap.get(id);
      if (!module) return;

      if (typeof updates.enabled === "boolean") {
        const currentOverlay = overlays.find((o) => o.id === id);
        if (currentOverlay && updates.enabled !== currentOverlay.enabled) {
          // Defer store update to avoid updating Zustand store during render phase
          queueMicrotask(() => {
            setOverlayEnabled(id, updates.enabled as boolean);
          });
        }
      }

      setOverlays((prev) => {
        const updated = prev.map((overlay) => {
          if (overlay.id !== id) return overlay;
          const updatedOverlay = { ...overlay, ...updates };

          try {
            if (typeof updates.enabled === "boolean" && updates.enabled !== overlay.enabled) {
              if (updates.enabled && overlaysEnabled) {
                void showOverlayWindow(updatedOverlay, module);
              } else {
                void hideOverlayWindow(id);
              }
            } else if (updatedOverlay.enabled && overlaysEnabled) {
              // Only update position if it's explicitly in the updates
              const updatePosition = "position" in updates;
              void updateOverlayWindow(updatedOverlay, module, { updatePosition });
            }
          } catch (error) {
            console.error(`[updateOverlay] Failed to apply window update for ${id}:`, error);
          }
          return updatedOverlay;
        });

        // Debounce saves for component settings changes, but save immediately for other changes
        if (!options?.skipSave && saveDefaultConfig) {
          const isComponentSettingsChange = "componentSettings" in updates;
          if (isComponentSettingsChange) {
            // Debounce saves for component settings (sliders, colors, etc.)
            debouncedSave(updated);
          } else {
            // Save immediately for other changes (enabled, position, etc.)
            void saveDefaultConfig(updated);
          }
        }
        return updated;
      });
    },
    [overlays, moduleMap, overlaysEnabled, setOverlayEnabled, saveDefaultConfig, debouncedSave],
  );

  const toggleOverlaysEnabled = useCallback(async () => {
    const newValue = !overlaysEnabled;
    isTogglingFromHookRef.current = true;
    setOverlaysEnabled(newValue);

    // Get current overlays from state using a promise-based approach
    return new Promise<void>((resolve) => {
      setOverlays((prev) => {
        const currentOverlays = prev;

        // Capture positions asynchronously
        Promise.all(
          currentOverlays.map(async (overlay) => {
            try {
              const win = getOverlayWindow(overlay.id);
              if (win) {
                const pos = await win.outerPosition();
                if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                  return { ...overlay, position: { x: Number(pos.x), y: Number(pos.y) } };
                }
              }
            } catch (error) {
              console.warn(
                `[toggleOverlaysEnabled] Failed to capture position for ${overlay.id}:`,
                error,
              );
            }
            return overlay;
          }),
        )
          .then((capturedPositions) => {
            // Build updated overlays with captured positions, preserving componentSettings
            const updatedOverlaysAfterCapture = currentOverlays.map((overlay) => {
              const captured = capturedPositions.find((o) => o.id === overlay.id);
              if (!captured) return overlay;
              return {
                ...overlay,
                position: captured.position,
                size: captured.size,
                opacity: captured.opacity,
                // Preserve componentSettings from the original overlay - CRITICAL for custom settings
                componentSettings: overlay.componentSettings,
              };
            });

            setOverlays(updatedOverlaysAfterCapture);

            console.log(
              `[toggleOverlaysEnabled] Showing/hiding overlays with componentSettings:`,
              updatedOverlaysAfterCapture.map((o) => ({
                id: o.id,
                hasSettings: !!o.componentSettings && Object.keys(o.componentSettings).length > 0,
              })),
            );

            updatedOverlaysAfterCapture.forEach((overlay) => {
              const module = moduleMap.get(overlay.id);
              if (!module) return;

              if (newValue && overlay.enabled) {
                console.log(`[toggleOverlaysEnabled] Showing overlay ${overlay.id}`, {
                  componentSettings: overlay.componentSettings,
                });
                void showOverlayWindow(overlay, module);
              } else if (!newValue && overlay.enabled) {
                void hideOverlayWindow(overlay.id);
              }
            });

            resolve();
          })
          .catch((error) => {
            if (
              error instanceof Error &&
              (error.message.includes("invoke") || error.message.includes("Tauri"))
            ) {
              console.log("[toggleOverlaysEnabled] Tauri not available, skipping save");
            } else {
              console.error("Failed to toggle overlays:", error);
            }
            resolve();
          });

        return prev;
      });
    });
  }, [moduleMap, overlaysEnabled, setOverlaysEnabled]);

  const startDrag = useCallback((id: string) => {
    // Drag state handled by parent component
  }, []);

  const onDropOn = useCallback((targetId: string, dragId: string | null) => {
    if (!dragId || dragId === targetId) return;
    setOverlays((prev) => {
      const curr = [...prev];
      const from = curr.findIndex((overlay) => overlay.id === dragId);
      const to = curr.findIndex((overlay) => overlay.id === targetId);
      if (from === -1 || to === -1) return curr;
      const [moved] = curr.splice(from, 1);
      curr.splice(to, 0, moved);
      return curr;
    });
  }, []);

  return {
    overlays,
    setOverlays,
    moduleMap,
    overlaysEnabled,
    editMode,
    toggleEditMode,
    toggleOverlay,
    updateOverlay,
    toggleOverlaysEnabled,
    startDrag,
    onDropOn,
    storeInitializedRef,
  };
}
