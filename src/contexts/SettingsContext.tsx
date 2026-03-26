"use client"

import { type SettingsData, getSettings, saveSettings } from "@/app/tauri-bridge"
import React, { createContext, useContext, useEffect, useState, useCallback } from "react"

interface SettingsContextValue {
  settings: SettingsData | null
  setSettings: React.Dispatch<React.SetStateAction<SettingsData | null>>
  reload: () => Promise<void>
  persist: (next: SettingsData) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsData | null>(null)

  const reload = useCallback(async () => {
    try {
      const s = await getSettings()
      setSettings(s)
    } catch {
      // keep null; callers can handle defaults
      setSettings(null)
    }
  }, [])

  useEffect(() => {
    // Load once for the whole app
    reload()
  }, [reload])

  const persist = useCallback(async (next: SettingsData) => {
    await saveSettings(next)
    setSettings(next)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, setSettings, reload, persist }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    // Return a safe fallback for overlay windows and other contexts without SettingsProvider
    return {
      settings: null,
      setSettings: () => {},
      reload: async () => {},
      persist: async () => {},
    }
  }
  return ctx
}
