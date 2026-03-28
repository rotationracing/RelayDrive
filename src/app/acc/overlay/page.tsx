"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useOverlaySessionStore } from "@/stores/overlay-session-store";
import { getOverlayModules } from "./overlay-registry";
import { OverlayPageHeader } from "@/components/overlay/overlay-page-header";
import { OverlayPresetsCard } from "@/components/overlay/overlay-presets-card";
import { OverlaySidebar } from "@/components/overlay/overlay-sidebar";
import { OverlaySettingsPanel } from "@/components/overlay/overlay-settings-panel";
import { CreatePresetDialog } from "@/components/overlay/create-preset-dialog";
import { useOverlayConfig } from "@/hooks/use-overlay-config";
import { useOverlayManagement } from "@/hooks/use-overlay-management";
import type { OverlayInstance } from "./types";
import {
  hideOverlayWindow,
  showOverlayWindow,
  updateOverlayWindow,
  getOverlayWindow,
} from "./overlay-window-manager";
import type { OverlayModule } from "./types";

export const dynamic = "force-dynamic";

export default function Page() {
  const { settings } = useSettingsContext();
  const overlayModules = useMemo(() => getOverlayModules(), []);
  const {
    initializeOverlayStates,
    setOverlaysEnabled,
    setOverlayEnabled,
    overlaysEnabled: storeOverlaysEnabled,
  } = useOverlaySessionStore();

  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [createPresetOpen, setCreatePresetOpen] = useState(false);
  const [highlightPower, setHighlightPower] = useState(false);

  // Create a ref to hold the save function
  const saveDefaultConfigRef = useRef<((overlays: OverlayInstance[]) => Promise<void>) | null>(
    null,
  );

  // Management hook - owns overlay state (initialized first)
  const managementHook = useOverlayManagement({
    overlayModules,
    saveDefaultConfig: async (overlays) => {
      if (saveDefaultConfigRef.current) {
        await saveDefaultConfigRef.current(overlays);
      }
    },
  });

  const {
    overlays,
    setOverlays,
    moduleMap,
    overlaysEnabled,
    editMode,
    toggleEditMode,
    toggleOverlay,
    updateOverlay,
    toggleOverlaysEnabled,
  } = managementHook;

  // Config hook - handles loading/saving configs
  const configHook = useOverlayConfig({
    overlayModules,
    onLoadOverlays: (loadedOverlays) => {
      setOverlays(loadedOverlays);
    },
    initializeOverlayStates,
    setOverlaysEnabled,
    setOverlayEnabled,
    hideOverlayWindow,
    showOverlayWindow,
    updateOverlayWindow,
  });

  // Wire up the save function
  useEffect(() => {
    saveDefaultConfigRef.current = configHook.saveDefaultConfig;
  }, [configHook.saveDefaultConfig]);

  // Save preset when exiting edit mode
  const prevEditModeRef = useRef(editMode);
  useEffect(() => {
    if (prevEditModeRef.current === true && editMode === false) {
      void configHook.saveDefaultConfig(overlays);
      if (configHook.selectedPreset && configHook.selectedPreset !== "default") {
        void configHook.savePresetConfig(configHook.selectedPreset, overlays);
      }
    }
    prevEditModeRef.current = editMode;
  }, [
    editMode,
    overlays,
    configHook.selectedPreset,
    configHook.saveDefaultConfig,
    configHook.savePresetConfig,
  ]);

  // Sync window management when overlaysEnabled changes from store (e.g., via hotkey)
  const prevStoreOverlaysEnabledRef = useRef<boolean | null>(null);
  const isTogglingFromHookRef = useRef(false);

  useEffect(() => {
    // Skip on initial mount
    if (prevStoreOverlaysEnabledRef.current === null) {
      prevStoreOverlaysEnabledRef.current = storeOverlaysEnabled;
      return;
    }

    // Skip if the change came from the hook itself
    if (isTogglingFromHookRef.current) {
      isTogglingFromHookRef.current = false;
      prevStoreOverlaysEnabledRef.current = storeOverlaysEnabled;
      return;
    }

    // Only proceed if the store value changed externally (e.g., from hotkey)
    if (prevStoreOverlaysEnabledRef.current !== storeOverlaysEnabled) {
      console.log(
        `[Page] Store overlaysEnabled changed externally from ${prevStoreOverlaysEnabledRef.current} to ${storeOverlaysEnabled}. Syncing windows.`,
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
            console.warn(`[Page] Failed to capture position for ${overlay.id}:`, error);
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

            if (storeOverlaysEnabled && overlay.enabled) {
              console.log(`[Page] Showing overlay ${overlay.id} (synced from store)`);
              void showOverlayWindow(overlay, module);
            } else if (!storeOverlaysEnabled && overlay.enabled) {
              console.log(`[Page] Hiding overlay ${overlay.id} (synced from store)`);
              void hideOverlayWindow(overlay.id);
            }
          });

          // Save config if needed
          if (saveDefaultConfigRef.current) {
            void saveDefaultConfigRef.current(updatedOverlays);
          }
        })
        .catch((error) => {
          console.error("[Page] Failed to sync windows after store change:", error);
        });

      prevStoreOverlaysEnabledRef.current = storeOverlaysEnabled;
    }
  }, [storeOverlaysEnabled, overlays, moduleMap, setOverlays]);

  // Save current preset when toggling overlays enabled
  const handleToggleOverlaysEnabled = async () => {
    isTogglingFromHookRef.current = true;
    await toggleOverlaysEnabled();
    if (configHook.selectedPreset && configHook.selectedPreset !== "default") {
      try {
        const capturedPositions = await Promise.all(
          overlays.map(async (overlay) => {
            try {
              const win = await import("./overlay-window-manager").then((m) =>
                m.getOverlayWindow(overlay.id),
              );
              if (win) {
                const pos = await win.outerPosition();
                if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                  return { ...overlay, position: { x: Number(pos.x), y: Number(pos.y) } };
                }
              }
            } catch (error) {
              console.warn(`Failed to capture position for ${overlay.id}:`, error);
            }
            return overlay;
          }),
        );
        await configHook.savePresetConfig(configHook.selectedPreset, capturedPositions);
      } catch (error) {
        console.error("Failed to save current preset after toggling overlays:", error);
      }
    }
  };

  const activeOverlay = useMemo(
    () => overlays.find((o) => o.id === activeId) ?? null,
    [activeId, overlays],
  );

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) return;

    try {
      const capturedPositions = await Promise.all(
        overlays.map(async (overlay) => {
          try {
            const win = await import("./overlay-window-manager").then((m) =>
              m.getOverlayWindow(overlay.id),
            );
            if (win) {
              const pos = await win.outerPosition();
              if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                return { ...overlay, position: { x: Number(pos.x), y: Number(pos.y) } };
              }
            }
          } catch (error) {
            console.warn(`Failed to capture position for ${overlay.id}:`, error);
          }
          return overlay;
        }),
      );

      const overlayMap = new Map(capturedPositions.map((o) => [o.id, o]));
      const overlayStates: Record<string, any> = {};
      overlayModules.forEach((module) => {
        const overlay = overlayMap.get(module.id);
        if (overlay) {
          overlayStates[module.id] = {
            enabled: overlay.enabled,
            position: overlay.position,
            size: overlay.size,
            opacity: overlay.opacity,
            componentSettings: overlay.componentSettings,
          };
        }
      });

      await configHook.savePresetConfig(name, capturedPositions);

      if (typeof window !== "undefined") {
        localStorage.setItem("relaydrive:last-overlay-preset", name);
      }

      if (!configHook.availableConfigs.includes(name)) {
        // Available configs will be updated by the hook
      }
      await configHook.loadPreset(name);
      setPresetName("");
    } catch (error) {
      console.error("Failed to save preset:", error);
    }
  };

  const handleResetDefault = async () => {
    await configHook.resetDefaultConfig(overlays, overlaysEnabled);
  };

  const handleDeletePreset = async () => {
    await configHook.deletePreset();
  };

  const handleExportConfig = async () => {
    await configHook.exportConfig(overlays);
  };

  const handleImportConfig = async (file: File) => {
    await configHook.importConfig(file);
  };

  const startDrag = (id: string) => {
    setDragId(id);
  };

  const onDrop = (targetId: string) => {
    managementHook.onDropOn(targetId, dragId);
    setDragId(null);
  };

  const handleToggleOverlayWithHighlight = (id: string) => {
    toggleOverlay(id);
    if (!overlaysEnabled) {
      setHighlightPower(true);
      setTimeout(() => setHighlightPower(false), 600);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 overflow-hidden px-6 py-6 md:px-8 md:py-8">
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <OverlayPageHeader />
        <div className="w-full md:w-auto pb-1 md:pb-0">
          <OverlayPresetsCard
            overlaysEnabled={overlaysEnabled}
            onToggleOverlaysEnabled={handleToggleOverlaysEnabled}
            selectedPreset={configHook.selectedPreset}
            availableConfigs={configHook.availableConfigs}
            onSelectPreset={configHook.loadPreset}
            onCreatePreset={() => setCreatePresetOpen(true)}
            onResetDefault={handleResetDefault}
            onDeletePreset={handleDeletePreset}
            onExportConfig={handleExportConfig}
            onImportConfig={handleImportConfig}
            overlaysEnabledHotkey={settings?.hotkeys?.toggle_overlays_enabled ?? undefined}
            editMode={editMode}
            onToggleEditMode={toggleEditMode}
            editModeHotkey={settings?.hotkeys?.toggle_overlay_edit_mode ?? undefined}
            highlightPower={highlightPower}
          />
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card shadow-sm">
        <OverlaySidebar
          overlays={overlays}
          activeId={activeId}
          onSelect={setActiveId}
          query={query}
          onQueryChange={setQuery}
          editMode={editMode}
          onToggleOverlay={handleToggleOverlayWithHighlight}
          onDragStart={startDrag}
          onDrop={onDrop}
        />

        <div className="flex-1 h-full min-w-0 bg-background/30">
          <OverlaySettingsPanel
            activeOverlay={activeOverlay}
            moduleMap={moduleMap}
            updateOverlay={updateOverlay}
          />
        </div>
      </div>

      <CreatePresetDialog
        open={createPresetOpen}
        onOpenChange={setCreatePresetOpen}
        presetName={presetName}
        onPresetNameChange={setPresetName}
        onSave={handleSavePreset}
      />
    </div>
  );
}
