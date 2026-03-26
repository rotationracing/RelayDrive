"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  deleteOverlayConfig,
  loadOverlayConfig,
  listOverlayConfigs,
  saveOverlayConfig,
  type OverlayConfigItem,
} from "@/app/tauri-bridge"
import type { OverlayInstance } from "@/app/acc/overlay/types"
import type { OverlayModule } from "@/app/acc/overlay/types"
import { getOverlayWindow } from "@/app/acc/overlay/overlay-window-manager"
import { useOverlaySessionStore } from "@/stores/overlay-session-store"

interface UseOverlayConfigOptions {
  overlayModules: OverlayModule[]
  onLoadOverlays: (overlays: OverlayInstance[]) => void
  initializeOverlayStates: (ids: string[], enabledStates: Record<string, boolean>) => void
  setOverlaysEnabled: (enabled: boolean) => void
  setOverlayEnabled: (id: string, enabled: boolean) => void
  hideOverlayWindow: (id: string) => void
  showOverlayWindow: (overlay: OverlayInstance, module: OverlayModule) => Promise<void>
  updateOverlayWindow: (overlay: OverlayInstance, module: OverlayModule) => Promise<void>
}

export function useOverlayConfig({
  overlayModules,
  onLoadOverlays,
  initializeOverlayStates,
  setOverlaysEnabled,
  setOverlayEnabled,
  hideOverlayWindow,
  showOverlayWindow,
  updateOverlayWindow,
}: UseOverlayConfigOptions) {
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const lastPreset = localStorage.getItem("relaydrive:last-overlay-preset")
      return lastPreset || "default"
    }
    return "default"
  })
  const [availableConfigs, setAvailableConfigs] = useState<string[]>([])
  const loadingFromFileRef = useRef(false)
  const loadingDefaultRef = useRef(false)
  const storeInitializedRef = useRef(false)

  const captureOverlayPositions = useCallback(async (snapshot: OverlayInstance[]) => {
    const enriched = await Promise.all(
      snapshot.map(async (overlay) => {
        const win = getOverlayWindow(overlay.id)
        if (!win) return overlay

        try {
          const position = await win.outerPosition()
          if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
            return {
              ...overlay,
              position: {
                x: Number(position.x),
                y: Number(position.y),
              },
            }
          }
        } catch (error) {
          console.warn(`[captureOverlayPositions] Failed to capture position for ${overlay.id}:`, error)
        }

        return overlay
      }),
    )

    return enriched
  }, [])

  const saveDefaultConfig = useCallback(
    async (updatedOverlays: OverlayInstance[]) => {
      try {
        const overlaysWithWindowPositions = await captureOverlayPositions(updatedOverlays)
        const overlayMap = new Map(overlaysWithWindowPositions.map((o) => [o.id, o]))

        const overlayStates: Record<string, OverlayConfigItem> = {}
        overlayModules.forEach((module) => {
          const overlay = overlayMap.get(module.id)
          if (overlay) {
            overlayStates[module.id] = {
              enabled: overlay.enabled,
              position: overlay.position,
              size: overlay.size,
              opacity: overlay.opacity,
              componentSettings: overlay.componentSettings,
            }
          }
        })

        console.log(`[saveDefaultConfig] Saving ${Object.keys(overlayStates).length} overlays to default.json`)
        await saveOverlayConfig("default", { overlays: overlayStates })
        console.log(`[saveDefaultConfig] Successfully saved ${Object.keys(overlayStates).length} overlays to default.json`)
      } catch (error) {
        if (error instanceof Error && (error.message.includes("invoke") || error.message.includes("Tauri"))) {
          console.log("[saveDefaultConfig] Tauri not available, skipping save")
          return
        }
        console.error("[saveDefaultConfig] Failed to save default overlay config:", error)
      }
    },
    [captureOverlayPositions, overlayModules],
  )

  // Load available config files
  useEffect(() => {
    void loadOverlayConfig().then((config) => {
      console.log("[overlay] Initial loadOverlayConfig returned:", config)
      void listOverlayConfigs()
        .then((configs) => {
          console.log("[overlay] Available configs:", configs)
          const updated = configs.includes("default") ? configs : [...configs, "default"]
          const sorted = updated.sort()
          setAvailableConfigs(sorted)

          if (typeof window !== "undefined") {
            const lastPreset = localStorage.getItem("relaydrive:last-overlay-preset")
            if (lastPreset && !sorted.includes(lastPreset)) {
              console.log("[overlay] Last used preset no longer exists, resetting to default")
              localStorage.setItem("relaydrive:last-overlay-preset", "default")
              if (selectedPreset === lastPreset) {
                setSelectedPreset("default")
              }
            }
          }
        })
        .catch((err) => {
          if (err instanceof Error && (err.message.includes("invoke") || err.message.includes("Tauri"))) {
            return
          }
          console.error("Failed to list overlay configs:", err)
        })
    }).catch((err) => {
      if (err instanceof Error && (err.message.includes("invoke") || err.message.includes("Tauri"))) {
        return
      }
      console.error("Failed to ensure default config exists:", err)
    })
  }, [selectedPreset])

  // Load default config on mount
  useEffect(() => {
    const storeState = useOverlaySessionStore.getState()
    const isStoreInitialized = Object.keys(storeState.overlayEnabledStates).length > 0

    if (isStoreInitialized) {
      loadingDefaultRef.current = false
      storeInitializedRef.current = true

      if (typeof window !== "undefined") {
        const lastPreset = localStorage.getItem("relaydrive:last-overlay-preset")
        if (lastPreset && lastPreset !== "default" && lastPreset !== selectedPreset) {
          console.log("[overlay] Restoring last used preset:", lastPreset)
          setSelectedPreset(lastPreset)
        }
      }
      return
    }

    const loadDefault = async () => {
      if (loadingDefaultRef.current) return
      loadingDefaultRef.current = true

      console.log("[overlay] First load - loading default config from JSON...")

      let presetToLoad = "default"
      if (typeof window !== "undefined") {
        const lastPreset = localStorage.getItem("relaydrive:last-overlay-preset")
        if (lastPreset) {
          presetToLoad = lastPreset
          console.log("[overlay] Loading last used preset:", lastPreset)
          setSelectedPreset(lastPreset)
        }
      }

      try {
        const config = await loadOverlayConfig(presetToLoad === "default" ? undefined : presetToLoad)
        console.log("[overlay] Loaded config:", config)

        setOverlaysEnabled(false)
        console.log("[overlay] Set overlaysEnabled to: false (always defaults to false)")

        let hasSavedOverlays = config.overlays && Object.keys(config.overlays).length > 0

        if (!hasSavedOverlays && presetToLoad !== "default") {
          console.log("[overlay] Preset has no overlays, falling back to default")
          const defaultConfig = await loadOverlayConfig()
          if (defaultConfig && defaultConfig.overlays && Object.keys(defaultConfig.overlays).length > 0) {
            presetToLoad = "default"
            setSelectedPreset("default")
            if (typeof window !== "undefined") {
              localStorage.setItem("relaydrive:last-overlay-preset", "default")
            }
            Object.assign(config, defaultConfig)
            hasSavedOverlays = true
          }
        }

        if (hasSavedOverlays) {
          console.log("[overlay] Loading saved overlay states from JSON:", Object.keys(config.overlays))

          const enabledStatesMap: Record<string, boolean> = {}
          overlayModules.forEach((module) => {
            const saved = config.overlays[module.id]
            enabledStatesMap[module.id] = saved?.enabled ?? false
          })

          initializeOverlayStates(
            overlayModules.map((m) => m.id),
            enabledStatesMap,
          )
          storeInitializedRef.current = true

          onLoadOverlays(
            overlayModules.map((module) => {
              const saved = config.overlays[module.id]
              const fallbackPosition = { x: 80, y: 80 }

              const componentSettings: Record<string, number | string | boolean | [number, number, number, number]> = {}
              if (module.componentSettings) {
                Object.entries(module.componentSettings).forEach(([key, setting]) => {
                  componentSettings[key] = saved?.componentSettings?.[key] ?? setting.defaultValue
                })
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
                enabled: saved?.enabled ?? false,
                position: saved?.position ?? module.defaultPosition ?? fallbackPosition,
                size: saved?.size ?? module.defaultSize ?? 100,
                opacity: saved?.opacity ?? module.defaultOpacity ?? 100,
                componentSettings,
              }
            }),
          )
          loadingDefaultRef.current = false
        } else {
          console.log("[overlay] No saved overlays, initializing with defaults")

          const defaultEnabledStates: Record<string, boolean> = {}
          overlayModules.forEach((module) => {
            defaultEnabledStates[module.id] = Boolean(module.defaultEnabled)
          })
          initializeOverlayStates(
            overlayModules.map((m) => m.id),
            defaultEnabledStates,
          )
          storeInitializedRef.current = true

          const initialOverlays = overlayModules.map((module, index) => {
            const fallbackPosition = { x: 80 + index * 80, y: 80 + index * 60 }

            const componentSettings: Record<string, number | string | boolean | [number, number, number, number]> = {}
            if (module.componentSettings) {
              Object.entries(module.componentSettings).forEach(([key, setting]) => {
                componentSettings[key] = setting.defaultValue
              })
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
              enabled: Boolean(module.defaultEnabled),
              position: module.defaultPosition ?? fallbackPosition,
              size: module.defaultSize ?? 100,
              opacity: module.defaultOpacity ?? 100,
              componentSettings,
            }
          })

          onLoadOverlays(initialOverlays)

          const overlayStates: Record<string, OverlayConfigItem> = {}
          overlayModules.forEach((module) => {
            const overlay = initialOverlays.find((o) => o.id === module.id)
            if (overlay) {
              overlayStates[module.id] = {
                enabled: overlay.enabled,
                position: overlay.position,
                size: overlay.size,
                opacity: overlay.opacity,
              }
            }
          })

          console.log("[overlay] Attempting to save default.json with", Object.keys(overlayStates).length, "overlays")
          saveOverlayConfig("default", { overlays: overlayStates })
            .then(() => {
              console.log("[overlay] ✓ Created and populated default.json with", Object.keys(overlayStates).length, "overlays")
              loadingDefaultRef.current = false
            })
            .catch((err) => {
              console.error("[overlay] ✗ Failed to create default.json:", err)
              loadingDefaultRef.current = false
            })
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("invoke")) {
          console.log("[overlay] Tauri not available, skipping config load")
          loadingDefaultRef.current = false
          return
        }
        console.error("[overlay] Failed to load default overlay config:", err)
        loadingDefaultRef.current = false
      }
    }

    void loadDefault()

    return () => {
      loadingDefaultRef.current = false
    }
  }, [overlayModules, initializeOverlayStates, setOverlaysEnabled, onLoadOverlays])

  // Load selected preset config
  useEffect(() => {
    if (loadingFromFileRef.current || selectedPreset === "default" || loadingDefaultRef.current) return

    loadingFromFileRef.current = true

    void loadOverlayConfig(selectedPreset).then((config) => {
      if (!config || !config.overlays) {
        loadingFromFileRef.current = false
        return
      }

      overlayModules.forEach((module) => {
        const saved = config.overlays[module.id]
        const enabled = saved?.enabled ?? false
        setOverlayEnabled(module.id, enabled)
      })

      onLoadOverlays(
        overlayModules.map((module) => {
          const saved = config.overlays[module.id]
          const fallbackPosition = { x: 80, y: 80 }

          let componentSettings: Record<string, number | string | boolean | [number, number, number, number]> = {}
          if (module.componentSettings) {
            Object.entries(module.componentSettings).forEach(([key, setting]) => {
              componentSettings[key] = setting.defaultValue
            })
            if (saved?.componentSettings) {
              Object.entries(saved.componentSettings).forEach(([key, value]) => {
                if (key in componentSettings) {
                  componentSettings[key] = value as number | string | boolean | [number, number, number, number]
                }
              })
            }
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
            enabled: saved?.enabled ?? false,
            position: saved?.position ?? module.defaultPosition ?? fallbackPosition,
            size: saved?.size ?? module.defaultSize ?? 100,
            opacity: saved?.opacity ?? module.defaultOpacity ?? 100,
            componentSettings,
          }
        }),
      )

      loadingFromFileRef.current = false
    }).catch((err) => {
      console.error("Failed to load overlay config:", err)
      loadingFromFileRef.current = false
    })
  }, [selectedPreset, overlayModules, setOverlayEnabled, onLoadOverlays])

  const savePresetConfig = useCallback(
    async (configName: string, updatedOverlays: OverlayInstance[]) => {
      if (configName === "default") return

      try {
        const overlaysWithWindowPositions = await captureOverlayPositions(updatedOverlays)
        const overlayMap = new Map(overlaysWithWindowPositions.map((o) => [o.id, o]))

        const overlayStates: Record<string, OverlayConfigItem> = {}
        overlayModules.forEach((module) => {
          const overlay = overlayMap.get(module.id)
          if (overlay) {
            overlayStates[module.id] = {
              enabled: overlay.enabled,
              position: overlay.position,
              size: overlay.size,
              opacity: overlay.opacity,
              componentSettings: overlay.componentSettings,
            }
          }
        })

        await saveOverlayConfig(configName, { overlays: overlayStates })

        if (typeof window !== "undefined") {
          localStorage.setItem("relaydrive:last-overlay-preset", configName)
        }

        if (!availableConfigs.includes(configName)) {
          setAvailableConfigs([...availableConfigs, configName].sort())
        }
      } catch (error) {
        console.error("Failed to save overlay config:", error)
      }
    },
    [availableConfigs, captureOverlayPositions, overlayModules],
  )

  const loadPreset = useCallback(async (name: string) => {
    loadingFromFileRef.current = false
    setSelectedPreset(name)
    if (typeof window !== "undefined") {
      localStorage.setItem("relaydrive:last-overlay-preset", name)
    }
  }, [])

  const deletePreset = useCallback(async () => {
    if (!selectedPreset || selectedPreset === "default") return

    try {
      await deleteOverlayConfig(selectedPreset)
      const updated = availableConfigs.filter((c) => c !== selectedPreset)
      setAvailableConfigs(updated)
      setSelectedPreset(updated.length > 0 ? updated[0] : "default")
      loadingFromFileRef.current = false
      await loadPreset("default")
    } catch (error) {
      console.error("Failed to delete preset:", error)
    }
  }, [selectedPreset, availableConfigs, loadPreset])

  const exportConfig = useCallback(
    async (overlays: OverlayInstance[]) => {
      const overlaysWithWindowPositions = await captureOverlayPositions(overlays)
      const overlayMap = new Map(overlaysWithWindowPositions.map((o) => [o.id, o]))

      const overlayStates: Record<string, OverlayConfigItem> = {}
      overlayModules.forEach((module) => {
        const overlay = overlayMap.get(module.id)
        if (overlay) {
          overlayStates[module.id] = {
            enabled: overlay.enabled,
            position: overlay.position,
            size: overlay.size,
            opacity: overlay.opacity,
          }
        }
      })

      const data = {
        name: selectedPreset,
        overlays: overlayStates,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${selectedPreset}-overlay-config.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
    [selectedPreset, captureOverlayPositions, overlayModules],
  )

  const importConfig = useCallback(
    async (file: File) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(String(reader.result))
          if (!parsed || typeof parsed !== "object" || !parsed.overlays) {
            console.error("Invalid config file: missing overlays")
            return
          }

          const importName = parsed.name || prompt("Enter a name for this config:", "imported")
          if (!importName || !importName.trim()) {
            console.log("Import cancelled: no name provided")
            return
          }

          const sanitizedName = importName.trim()

          const overlayMap = new Map(
            Object.entries(parsed.overlays).map(([id, item]) => [id, item as OverlayConfigItem]),
          )

          const overlayStates: Record<string, OverlayConfigItem> = {}
          overlayModules.forEach((module) => {
            const item = overlayMap.get(module.id)
            if (item) {
              overlayStates[module.id] = item
            }
          })

          await saveOverlayConfig(sanitizedName, { overlays: overlayStates })

          if (typeof window !== "undefined") {
            localStorage.setItem("relaydrive:last-overlay-preset", sanitizedName)
          }

          if (!availableConfigs.includes(sanitizedName)) {
            const updated = [...availableConfigs, sanitizedName].sort()
            setAvailableConfigs(updated)
          }
          setSelectedPreset(sanitizedName)
          loadingFromFileRef.current = false
          await loadPreset(sanitizedName)
        } catch (error) {
          console.error("Failed to import config:", error)
        }
      }
      reader.readAsText(file)
    },
    [availableConfigs, overlayModules, loadPreset],
  )

  const resetDefaultConfig = useCallback(
    async (overlays: OverlayInstance[], overlaysEnabled: boolean) => {
      try {
        const resetOverlays = overlayModules.map((module, index) => {
          const fallbackPosition = { x: 80 + index * 80, y: 80 + index * 60 }

          const componentSettings: Record<string, number | string | boolean | [number, number, number, number]> = {}
          if (module.componentSettings) {
            Object.entries(module.componentSettings).forEach(([key, setting]) => {
              componentSettings[key] = setting.defaultValue
            })
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
            enabled: Boolean(module.defaultEnabled),
            position: module.defaultPosition ?? fallbackPosition,
            size: module.defaultSize ?? 100,
            opacity: module.defaultOpacity ?? 100,
            componentSettings,
          }
        })

        onLoadOverlays(resetOverlays)

        overlays.forEach((overlay) => {
          if (overlay.enabled) {
            hideOverlayWindow(overlay.id)
          }
        })

        if (overlaysEnabled) {
          resetOverlays.forEach((overlay) => {
            if (overlay.enabled) {
              const module = overlayModules.find((m) => m.id === overlay.id)
              if (module) {
                void showOverlayWindow(overlay, module)
              }
            }
          })
        }

        const overlayStates: Record<string, OverlayConfigItem> = {}
        overlayModules.forEach((module) => {
          const overlay = resetOverlays.find((o) => o.id === module.id)
          if (overlay) {
            overlayStates[module.id] = {
              enabled: overlay.enabled,
              position: overlay.position,
              size: overlay.size,
              opacity: overlay.opacity,
              componentSettings: overlay.componentSettings,
            }
          }
        })

        await saveOverlayConfig("default", {
          overlaysEnabled,
          overlays: overlayStates,
        })
      } catch (error) {
        console.error("Failed to reset default config:", error)
      }
    },
    [overlayModules, onLoadOverlays, hideOverlayWindow, showOverlayWindow],
  )

  return {
    selectedPreset,
    availableConfigs,
    saveDefaultConfig,
    savePresetConfig,
    loadPreset,
    deletePreset,
    exportConfig,
    importConfig,
    resetDefaultConfig,
  }
}

