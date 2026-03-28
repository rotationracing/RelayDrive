"use client";

import { convertHotkeyToTauriFormat } from "@/lib/hotkeys";
import { matchesHotkey } from "@/lib/hotkeys";
import { broadcastMoveMode } from "@/app/acc/overlay/overlay-window-manager";
import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
  unregisterAllGlobalShortcuts,
} from "@/app/tauri-bridge";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useOverlaySessionStore } from "@/stores/overlay-session-store";
import { useHotkeyStore } from "@/stores/hotkey-store";
import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

export function GlobalHotkeyListener() {
  const { settings } = useSettingsContext();
  const { editMode } = useOverlaySessionStore();
  const { triggerAction } = useHotkeyStore();
  const registeredShortcutsRef = useRef<Set<string>>(new Set());
  const unlistenRef = useRef<(() => void) | null>(null);
  const isTauriRef = useRef<boolean | null>(null);
  const lastToggleTimeRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") {
      console.log("[GlobalHotkeyListener] SSR environment detected, skipping setup");
      return;
    }

    const isTauri = "__TAURI__" in window || "__TAURI_IPC__" in window;
    isTauriRef.current = isTauri;
    console.log("[GlobalHotkeyListener] Initialize hotkey listener. isTauri=", isTauri);

    const editModeHotkey = settings?.hotkeys?.toggle_overlay_edit_mode || "Alt + E";
    const overlaysEnabledHotkey = settings?.hotkeys?.toggle_overlays_enabled || "Alt + W";
    console.log(
      "[GlobalHotkeyListener] Using hotkeys - edit mode:",
      editModeHotkey,
      "overlays enabled:",
      overlaysEnabledHotkey,
    );

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const now = Date.now();

      // Check for edit mode hotkey
      if (matchesHotkey(event, editModeHotkey)) {
        const lastTime = lastToggleTimeRef.current.get("toggle_overlay_edit_mode") || 0;
        // Debounce: prevent toggling if less than 200ms since last toggle
        if (now - lastTime < 200) {
          console.log(
            "[GlobalHotkeyListener] Ignoring rapid toggle from document listener (debounced)",
          );
          return;
        }
        lastToggleTimeRef.current.set("toggle_overlay_edit_mode", now);
        console.log(
          "[GlobalHotkeyListener] Hotkey matched (document listener). Triggering edit mode action",
        );
        event.preventDefault();
        event.stopPropagation();
        triggerAction("toggle_overlay_edit_mode");
        return;
      }

      // Check for overlays enabled hotkey
      if (matchesHotkey(event, overlaysEnabledHotkey)) {
        const lastTime = lastToggleTimeRef.current.get("toggle_overlays_enabled") || 0;
        // Debounce: prevent toggling if less than 200ms since last toggle
        if (now - lastTime < 200) {
          console.log(
            "[GlobalHotkeyListener] Ignoring rapid overlays toggle from document listener (debounced)",
          );
          return;
        }
        lastToggleTimeRef.current.set("toggle_overlays_enabled", now);
        console.log(
          "[GlobalHotkeyListener] Hotkey matched (document listener). Triggering overlays enabled action",
        );
        event.preventDefault();
        event.stopPropagation();
        triggerAction("toggle_overlays_enabled");
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    if (!isTauri) {
      console.warn(
        "[GlobalHotkeyListener] Tauri API unavailable; global shortcut disabled. Run via 'bun run tauri:dev'.",
      );
      return () => {
        document.removeEventListener("keydown", onKeyDown, true);
      };
    }

    const editModeTauriShortcut = convertHotkeyToTauriFormat(editModeHotkey);
    const overlaysEnabledTauriShortcut = convertHotkeyToTauriFormat(overlaysEnabledHotkey);
    console.log(
      "[GlobalHotkeyListener] Tauri shortcuts - edit mode:",
      editModeTauriShortcut,
      "overlays enabled:",
      overlaysEnabledTauriShortcut,
    );

    const setupGlobalShortcuts = async () => {
      // Unregister all previous shortcuts
      for (const shortcut of registeredShortcutsRef.current) {
        try {
          await unregisterGlobalShortcut(shortcut);
        } catch (err) {
          console.warn("[GlobalHotkeyListener] Failed to unregister previous shortcut:", err);
        }
      }
      registeredShortcutsRef.current.clear();

      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }

      const attachGlobalShortcutListener = async () => {
        try {
          const unlisten = await listen<string>("global-shortcut://triggered", (event) => {
            console.log("[GlobalHotkeyListener] Global shortcut event received:", event.payload);
            const now = Date.now();

            if (event.payload === editModeTauriShortcut) {
              const lastTime = lastToggleTimeRef.current.get("toggle_overlay_edit_mode") || 0;
              // Debounce: prevent toggling if less than 200ms since last toggle
              if (now - lastTime < 200) {
                console.log("[GlobalHotkeyListener] Ignoring rapid toggle (debounced)");
                return;
              }
              lastToggleTimeRef.current.set("toggle_overlay_edit_mode", now);
              console.log(
                "[GlobalHotkeyListener] Global shortcut matched. Triggering edit mode action",
              );
              triggerAction("toggle_overlay_edit_mode");
            } else if (event.payload === overlaysEnabledTauriShortcut) {
              const lastTime = lastToggleTimeRef.current.get("toggle_overlays_enabled") || 0;
              // Debounce: prevent toggling if less than 200ms since last toggle
              if (now - lastTime < 200) {
                console.log("[GlobalHotkeyListener] Ignoring rapid overlays toggle (debounced)");
                return;
              }
              lastToggleTimeRef.current.set("toggle_overlays_enabled", now);
              console.log(
                "[GlobalHotkeyListener] Global shortcut matched. Triggering overlays enabled action",
              );
              triggerAction("toggle_overlays_enabled");
            }
          });

          unlistenRef.current = unlisten;
          console.log("[GlobalHotkeyListener] Global shortcut listener active");
        } catch (listenErr) {
          console.error(
            "[GlobalHotkeyListener] Failed to set up global shortcut listener:",
            listenErr,
          );
        }
      };

      const registerShortcut = async (
        shortcut: string | null,
        name: string,
        attempt = 0,
      ): Promise<void> => {
        if (!shortcut) {
          console.warn(
            `[GlobalHotkeyListener] Unable to convert ${name} hotkey for Tauri global shortcut`,
          );
          return;
        }

        try {
          console.log(
            `[GlobalHotkeyListener] Registering global shortcut (attempt ${attempt + 1}):`,
            shortcut,
            `(${name})`,
          );
          await registerGlobalShortcut(shortcut);
          registeredShortcutsRef.current.add(shortcut);
          console.log(`[GlobalHotkeyListener] Successfully registered ${name} shortcut`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);

          // Check if the error is about the shortcut being already registered
          const isAlreadyRegistered =
            message.includes("already registered") || message.includes("HotKey already registered");

          if (attempt === 0 && isAlreadyRegistered) {
            console.warn(
              `[GlobalHotkeyListener] ${name} shortcut already registered. Retrying after clearing.`,
            );
            try {
              await unregisterGlobalShortcut(shortcut).catch(() => {
                // Ignore errors - shortcut might not be registered with this exact format
              });
              await unregisterAllGlobalShortcuts();
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (clearErr) {
              console.warn(
                `[GlobalHotkeyListener] Failed to clear shortcuts before retry:`,
                clearErr,
              );
            }
            // Retry once
            await registerShortcut(shortcut, name, attempt + 1);
          } else {
            console.error(`[GlobalHotkeyListener] Failed to register ${name} shortcut:`, err);
          }
        }
      };

      // Clear all shortcuts first
      try {
        await unregisterAllGlobalShortcuts();
        console.log("[GlobalHotkeyListener] Cleared all existing global shortcuts");
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (err) {
        console.warn("[GlobalHotkeyListener] Failed to clear existing global shortcuts:", err);
      }

      // Register both shortcuts
      await registerShortcut(editModeTauriShortcut, "edit mode");
      await registerShortcut(overlaysEnabledTauriShortcut, "overlays enabled");

      // Attach listener after registering shortcuts
      await attachGlobalShortcutListener();
    };

    void setupGlobalShortcuts();

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);

      // Unregister all shortcuts
      for (const shortcut of registeredShortcutsRef.current) {
        unregisterGlobalShortcut(shortcut).catch((err) => {
          console.warn("[GlobalHotkeyListener] Failed to unregister shortcut during cleanup:", err);
        });
      }
      registeredShortcutsRef.current.clear();

      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, [
    settings?.hotkeys?.toggle_overlay_edit_mode,
    settings?.hotkeys?.toggle_overlays_enabled,
    triggerAction,
  ]);

  // Broadcast move mode changes to overlay windows
  useEffect(() => {
    void broadcastMoveMode(editMode);
  }, [editMode]);

  // This component doesn't render anything
  return null;
}
