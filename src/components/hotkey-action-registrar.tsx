"use client";

import { useEffect } from "react";
import { useHotkeyStore } from "@/stores/hotkey-store";
import { useOverlaySessionStore } from "@/stores/overlay-session-store";
import { useOverlayManagement } from "@/hooks/use-overlay-management";
import { getOverlayModules } from "@/app/acc/overlay/overlay-registry";

/**
 * Component that registers hotkey actions with the hotkey store.
 * This allows hotkeys to trigger actions even when the overlay page isn't mounted.
 */
export function HotkeyActionRegistrar() {
  const { toggleEditMode } = useOverlaySessionStore();
  const { triggerAction } = useHotkeyStore();

  // Register edit mode action
  useEffect(() => {
    const unregister = useHotkeyStore.getState().registerAction("toggle_overlay_edit_mode", () => {
      console.log("[HotkeyActionRegistrar] Toggling edit mode via hotkey");
      toggleEditMode();
    });

    return unregister;
  }, [toggleEditMode]);

  // Register overlays enabled action
  // This needs to actually manage windows, so we'll use a more complex registration
  useEffect(() => {
    const overlayModules = getOverlayModules();

    // We need to create a minimal overlay management instance to handle window toggling
    // But we can't use the hook here. Instead, we'll trigger the store change and
    // let OverlayWindowSync handle it
    const unregister = useHotkeyStore.getState().registerAction("toggle_overlays_enabled", () => {
      console.log("[HotkeyActionRegistrar] Toggling overlays enabled via hotkey");
      const { toggleOverlaysEnabled } = useOverlaySessionStore.getState();
      toggleOverlaysEnabled();
    });

    return unregister;
  }, []);

  return null;
}
