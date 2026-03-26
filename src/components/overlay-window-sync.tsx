"use client"

import { useEffect, useRef } from "react"
import { useOverlaySessionStore } from "@/stores/overlay-session-store"
import { getOverlayModules } from "@/app/acc/overlay/overlay-registry"
import { getOverlayWindow, hideOverlayWindow, showOverlayWindow } from "@/app/acc/overlay/overlay-window-manager"
import { loadOverlayConfig } from "@/app/tauri-bridge"
import type { OverlayInstance } from "@/app/acc/overlay/types"

/**
 * Global component that syncs overlay windows when overlaysEnabled changes
 * from the store (e.g., via hotkey when overlay page is not open).
 * This component is always mounted to handle window management globally.
 */
export function OverlayWindowSync() {
  const overlaysEnabled = useOverlaySessionStore((state) => state.overlaysEnabled)
  const overlayEnabledStates = useOverlaySessionStore((state) => state.overlayEnabledStates)
  const prevOverlaysEnabledRef = useRef<boolean | null>(null)
  const overlaysRef = useRef<OverlayInstance[]>([])
  const overlayModulesRef = useRef(getOverlayModules())
  const moduleMapRef = useRef(new Map(overlayModulesRef.current.map((m) => [m.id, m])))
  const isInitializedRef = useRef(false)

  // Load overlay config on mount to get current overlay states
  useEffect(() => {
    if (isInitializedRef.current) return

    const loadConfig = async () => {
      try {
        const config = await loadOverlayConfig()
        const moduleMap = moduleMapRef.current

        // Convert config items to overlay instances
        // config.overlays is a Record<string, OverlayConfigItem>, not an array
        const loadedOverlays: OverlayInstance[] = overlayModulesRef.current.map((module, index) => {
          const configItem = config.overlays?.[module.id]
          const fallbackPosition = { x: 80 + index * 80, y: 80 + index * 60 }

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
            enabled: overlayEnabledStates[module.id] ?? configItem?.enabled ?? module.defaultEnabled ?? false,
            position: configItem?.position ? { x: configItem.position.x, y: configItem.position.y } : (module.defaultPosition ?? fallbackPosition),
            size: configItem?.size ?? module.defaultSize ?? 100,
            opacity: configItem?.opacity ?? module.defaultOpacity ?? 100,
            componentSettings: configItem?.componentSettings ?? (() => {
              const settings: Record<string, number | string | boolean | [number, number, number, number]> = {}
              if (module.componentSettings) {
                Object.entries(module.componentSettings).forEach(([key, setting]) => {
                  settings[key] = setting.defaultValue
                })
              }
              return settings
            })(),
          }
        })

        overlaysRef.current = loadedOverlays
        isInitializedRef.current = true
        console.log("[OverlayWindowSync] Loaded overlay config:", loadedOverlays.length, "overlays")
      } catch (error) {
        console.error("[OverlayWindowSync] Failed to load overlay config:", error)
      }
    }

    void loadConfig()
  }, [])

  // Watch for overlaysEnabled changes and sync windows
  useEffect(() => {
    // Skip on initial mount
    if (prevOverlaysEnabledRef.current === null) {
      prevOverlaysEnabledRef.current = overlaysEnabled
      // Initialize config on mount
      if (!isInitializedRef.current) {
        const loadConfig = async () => {
          try {
            const config = await loadOverlayConfig()
            const moduleMap = moduleMapRef.current

            // Convert config items to overlay instances
            // config.overlays is a Record<string, OverlayConfigItem>, not an array
            const loadedOverlays: OverlayInstance[] = overlayModulesRef.current.map((module, index) => {
              const configItem = config.overlays?.[module.id]
              const fallbackPosition = { x: 80 + index * 80, y: 80 + index * 60 }

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
            enabled: overlayEnabledStates[module.id] ?? configItem?.enabled ?? module.defaultEnabled ?? false,
            position: configItem?.position ? { x: configItem.position.x, y: configItem.position.y } : (module.defaultPosition ?? fallbackPosition),
            size: configItem?.size ?? module.defaultSize ?? 100,
            opacity: configItem?.opacity ?? module.defaultOpacity ?? 100,
            componentSettings: configItem?.componentSettings ?? (() => {
              const settings: Record<string, number | string | boolean | [number, number, number, number]> = {}
              if (module.componentSettings) {
                Object.entries(module.componentSettings).forEach(([key, setting]) => {
                  settings[key] = setting.defaultValue
                })
              }
              return settings
            })(),
              }
            })

            overlaysRef.current = loadedOverlays
            isInitializedRef.current = true
            console.log("[OverlayWindowSync] Loaded overlay config on mount:", loadedOverlays.length, "overlays")
          } catch (error) {
            console.error("[OverlayWindowSync] Failed to load overlay config on mount:", error)
          }
        }
        void loadConfig()
      }
      return
    }

    // Only proceed if the store value changed
    if (prevOverlaysEnabledRef.current !== overlaysEnabled) {
      console.log(`[OverlayWindowSync] overlaysEnabled changed from ${prevOverlaysEnabledRef.current} to ${overlaysEnabled}. Syncing windows.`)
      
      const syncWindows = async () => {
        // If config is loaded, use it; otherwise load it
        let currentOverlays = overlaysRef.current
        if (currentOverlays.length === 0 || !isInitializedRef.current) {
          try {
            const config = await loadOverlayConfig()
            const moduleMap = moduleMapRef.current

            // Convert config items to overlay instances
            // config.overlays is a Record<string, OverlayConfigItem>, not an array
            currentOverlays = overlayModulesRef.current.map((module, index) => {
              const configItem = config.overlays?.[module.id]
              const fallbackPosition = { x: 80 + index * 80, y: 80 + index * 60 }

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
                enabled: overlayEnabledStates[module.id] ?? configItem?.enabled ?? module.defaultEnabled ?? false,
                position: configItem?.position ? { x: configItem.position.x, y: configItem.position.y } : (module.defaultPosition ?? fallbackPosition),
                size: configItem?.size ?? module.defaultSize ?? 100,
                opacity: configItem?.opacity ?? module.defaultOpacity ?? 100,
                componentSettings: configItem?.componentSettings ?? (() => {
                  const settings: Record<string, number | string | boolean | [number, number, number, number]> = {}
                  if (module.componentSettings) {
                    Object.entries(module.componentSettings).forEach(([key, setting]) => {
                      settings[key] = setting.defaultValue
                    })
                  }
                  return settings
                })(),
              }
            })

            overlaysRef.current = currentOverlays
            isInitializedRef.current = true
            console.log("[OverlayWindowSync] Loaded overlay config:", currentOverlays.length, "overlays")
          } catch (error) {
            console.error("[OverlayWindowSync] Failed to load overlay config:", error)
            // Fall back to module defaults
            currentOverlays = overlayModulesRef.current.map((module, index) => {
              const fallbackPosition = { x: 80 + index * 80, y: 80 + index * 60 }
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
                enabled: module.defaultEnabled ?? false,
                position: module.defaultPosition ?? fallbackPosition,
                size: module.defaultSize ?? 100,
                opacity: module.defaultOpacity ?? 100,
                componentSettings: (() => {
                  const settings: Record<string, number | string | boolean | [number, number, number, number]> = {}
                  if (module.componentSettings) {
                    Object.entries(module.componentSettings).forEach(([key, setting]) => {
                      settings[key] = setting.defaultValue
                    })
                  }
                  return settings
                })(),
              }
            })
          }
        }

        const moduleMap = moduleMapRef.current

        // Capture current window positions for overlays that exist
        const overlaysWithPositions = await Promise.all(
          currentOverlays.map(async (overlay) => {
            try {
              const win = getOverlayWindow(overlay.id)
              if (win) {
                const pos = await win.outerPosition()
                if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                  return { ...overlay, position: { x: Number(pos.x), y: Number(pos.y) } }
                }
              }
            } catch (error) {
              // Window doesn't exist yet, that's ok
            }
            return overlay
          }),
        )

        // Update overlays ref with current enabled states from store
        const overlaysWithCurrentStates = overlaysWithPositions.map((overlay) => {
          const storeEnabled = overlayEnabledStates[overlay.id]
          const finalEnabled = storeEnabled !== undefined ? storeEnabled : overlay.enabled
          return { ...overlay, enabled: finalEnabled }
        })
        
        overlaysRef.current = overlaysWithCurrentStates

        // Show/hide windows based on new state
        for (const overlay of overlaysWithCurrentStates) {
          const module = moduleMap.get(overlay.id)
          if (!module) continue

          if (overlaysEnabled && overlay.enabled) {
            console.log(`[OverlayWindowSync] Showing overlay ${overlay.id}`)
            try {
              await showOverlayWindow(overlay, module)
            } catch (error) {
              console.error(`[OverlayWindowSync] Failed to show overlay ${overlay.id}:`, error)
            }
          } else if (!overlaysEnabled && overlay.enabled) {
            console.log(`[OverlayWindowSync] Hiding overlay ${overlay.id}`)
            try {
              await hideOverlayWindow(overlay.id)
            } catch (error) {
              console.error(`[OverlayWindowSync] Failed to hide overlay ${overlay.id}:`, error)
            }
          }
        }
      }

      void syncWindows()
      prevOverlaysEnabledRef.current = overlaysEnabled
    }
  }, [overlaysEnabled, overlayEnabledStates])

  // This component doesn't render anything
  return null
}

