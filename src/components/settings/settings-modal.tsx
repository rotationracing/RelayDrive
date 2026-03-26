"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HotkeyInput, HotkeyValue, formatHotkey, parseHotkey } from "@/components/ui/hotkey-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MeasurementUnitsModal } from "@/components/settings/MeasurementUnitsModal"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { useSettingsModal } from "@/contexts/SettingsModalContext"
import { setLocale, useI18n } from "@/i18n"
import { LANGUAGE_OPTIONS } from "@/lib/language"
import type { LanguageCode } from "@/lib/language"
import { CHOICE_IMPERIAL, CHOICE_METRIC, type UnitsMode, inferUnitsModeFromChoice } from "@/lib/units"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import type { ConnectionDetails, GameConnectionSettings } from "@/app/tauri-bridge"

type GameConnectionKey = keyof GameConnectionSettings

const CONNECTION_GAME_KEYS: GameConnectionKey[] = ["acc", "iracing", "lmu"]

const DEFAULT_CONNECTION_SETTINGS: GameConnectionSettings = {
  acc: {
    host: "127.0.0.1",
    port: 9000,
    connectionPassword: "asd",
    commandPassword: "",
  },
  iracing: {
    host: "",
    port: 0,
    connectionPassword: "",
    commandPassword: "",
  },
  lmu: {
    host: "",
    port: 0,
    connectionPassword: "",
    commandPassword: "",
  },
}

export function SettingsModal() {
  const { open, setOpen } = useSettingsModal()
  const { t } = useI18n()
  const { settings: globalSettings, persist } = useSettingsContext()
  
  const [settings, setSettings] = useState<{
    checkForUpdates: boolean
    language: string
    measurement_units: typeof CHOICE_METRIC
    hotkeys: Record<string, string | null>
    connectionSettings: GameConnectionSettings
  } | null>(null)
  const [unitsMode, setUnitsMode] = useState<UnitsMode>("metric")
  const [unitsModalOpen, setUnitsModalOpen] = useState(false)
  const [activeConnectionTab, setActiveConnectionTab] = useState<GameConnectionKey>("acc")

  // Sync local editable state from global when modal opens or settings change
  useEffect(() => {
    if (!open || !globalSettings) return
    
    const loaded = {
      checkForUpdates: globalSettings.checkForUpdates ?? true,
      language: globalSettings.language || "en",
      measurement_units: globalSettings.measurement_units || CHOICE_METRIC,
      hotkeys: {
        toggle_overlay_edit_mode: globalSettings.hotkeys?.toggle_overlay_edit_mode ?? "Alt + E",
        toggle_overlays_enabled: globalSettings.hotkeys?.toggle_overlays_enabled ?? "Alt + W",
        ...(globalSettings.hotkeys || {}),
      },
      connectionSettings: globalSettings.connectionSettings ?? DEFAULT_CONNECTION_SETTINGS,
    }
    setSettings(loaded)
    setUnitsMode(inferUnitsModeFromChoice(loaded.measurement_units))
  }, [open, globalSettings])

  const handleLanguageChange = async (value: string) => {
    if (!settings) return
    // Update state immediately
    const updated = { ...settings, language: value }
    setSettings(updated)
    // Switch i18n locale instantly
    await setLocale(value as LanguageCode)
    // Persist to backend
    try {
      await persist({
        ...globalSettings!,
        language: value,
      })
    } catch (error) {
      console.error("Failed to save language setting:", error)
    }
  }

  const handleUnitsModeChange = async (mode: UnitsMode) => {
    if (!settings) return
    
    let newChoice: typeof CHOICE_METRIC
    if (mode === "custom") {
      setUnitsModalOpen(true)
      return
    } else if (mode === "imperial") {
      newChoice = CHOICE_IMPERIAL
    } else {
      newChoice = CHOICE_METRIC
    }
    
    const updated = { ...settings, measurement_units: newChoice }
    setSettings(updated)
    setUnitsMode(mode)
    
    // Persist to backend
    try {
      await persist({
        ...globalSettings!,
        measurement_units: newChoice,
      })
    } catch (error) {
      console.error("Failed to save units setting:", error)
    }
  }

  const handleCustomUnitsSave = async (choice: typeof CHOICE_METRIC) => {
    if (!settings) return
    
    const updated = { ...settings, measurement_units: choice }
    setSettings(updated)
    setUnitsMode("custom")
    
    // Persist to backend
    try {
      await persist({
        ...globalSettings!,
        measurement_units: choice,
      })
    } catch (error) {
      console.error("Failed to save custom units setting:", error)
    }
  }

  const handleCheckForUpdatesChange = async (checked: boolean) => {
    if (!settings) return
    
    const updated = { ...settings, checkForUpdates: checked }
    setSettings(updated)
    
    // Persist to backend
    try {
      await persist({
        ...globalSettings!,
        checkForUpdates: checked,
      })
    } catch (error) {
      console.error("Failed to save check for updates setting:", error)
    }
  }

  const handleHotkeyChange = async (hotkeyId: string, value: HotkeyValue | null) => {
    if (!settings) return
    
    const hotkeyString = value ? formatHotkey(value) : null
    const updated = {
      ...settings,
      hotkeys: {
        ...settings.hotkeys,
        [hotkeyId]: hotkeyString,
      },
    }
    setSettings(updated)
    
    // Persist to backend
    try {
      await persist({
        ...globalSettings!,
        hotkeys: updated.hotkeys,
      })
    } catch (error) {
      console.error("Failed to save hotkey setting:", error)
    }
  }

  const handleConnectionSettingChange = async (
    game: GameConnectionKey,
    field: keyof ConnectionDetails,
    value: string
  ) => {
    if (!settings || !globalSettings) return

    const currentGameSettings = settings.connectionSettings[game]
    let updatedGameSettings: ConnectionDetails

    if (field === "port") {
      const portValue = Math.min(65535, Math.max(0, Number(value) || 0))
      updatedGameSettings = { ...currentGameSettings, port: portValue }
    } else if (field === "host") {
      updatedGameSettings = { ...currentGameSettings, host: value }
    } else if (field === "connectionPassword") {
      updatedGameSettings = { ...currentGameSettings, connectionPassword: value }
    } else {
      updatedGameSettings = { ...currentGameSettings, commandPassword: value }
    }

    const updatedConnectionSettings = {
      ...settings.connectionSettings,
      [game]: updatedGameSettings,
    }
    const updated = { ...settings, connectionSettings: updatedConnectionSettings }
    setSettings(updated)

    try {
      await persist({
        ...globalSettings,
        connectionSettings: updatedConnectionSettings,
      })
    } catch (error) {
      console.error("Failed to save connection setting:", error)
    }
  }

  if (!settings) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
            <DialogDescription>Manage your application preferences</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <Card className="rounded-[var(--radius-xl)]">
              <CardHeader className="pb-2">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    General
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/80">
                    Configure general application settings
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-sm font-medium">{t("common.language")}</Label>
                    <p className="text-xs text-muted-foreground">{t("common.choose_language")}</p>
                  </div>
                  <div className="shrink-0 ml-4">
                    <Select value={settings.language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-56 h-10 rounded-[var(--radius-lg)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map(opt => (
                          <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Measurement Units */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-sm font-medium">{t("common.measurement_units")}</Label>
                    <p className="text-xs text-muted-foreground">{t("common.choose_units")}</p>
                  </div>
                  <div className="flex rounded-md overflow-hidden border border-border shrink-0 ml-4">
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-xs transition-colors ${
                        unitsMode === "custom" 
                          ? "bg-accent text-accent-foreground" 
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => handleUnitsModeChange("custom")}
                    >
                      {t("common.custom")}
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-xs transition-colors ${
                        unitsMode === "imperial" 
                          ? "bg-accent text-accent-foreground" 
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => handleUnitsModeChange("imperial")}
                    >
                      {t("common.imperial")}
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-xs transition-colors ${
                        unitsMode === "metric" 
                          ? "bg-accent text-accent-foreground" 
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => handleUnitsModeChange("metric")}
                    >
                      {t("common.metric")}
                    </button>
                  </div>
                </div>

                {/* Check for updates */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-sm font-medium">{t("common.check_for_updates")}</Label>
                    <p className="text-xs text-muted-foreground">{t("common.check_for_updates_desc")}</p>
                  </div>
                  <div className="shrink-0 ml-4">
                    <Switch
                      checked={settings.checkForUpdates}
                      onCheckedChange={handleCheckForUpdatesChange}
                      aria-label={t("common.check_for_updates")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[var(--radius-xl)]">
              <CardHeader className="pb-2">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Hotkeys
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/80">
                    Configure keyboard shortcuts for quick actions
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle Overlay Edit Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-sm font-medium">Toggle Overlay Edit Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable overlay edit mode</p>
                  </div>
                  <div className="shrink-0 ml-4 w-64">
                    <HotkeyInput
                      value={settings.hotkeys.toggle_overlay_edit_mode ? parseHotkey(settings.hotkeys.toggle_overlay_edit_mode) : null}
                      onChange={(value) => handleHotkeyChange("toggle_overlay_edit_mode", value)}
                    />
                  </div>
                </div>

                {/* Toggle Overlays Enabled */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-sm font-medium">Toggle Overlays Enabled</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable all overlays</p>
                  </div>
                  <div className="shrink-0 ml-4 w-64">
                    <HotkeyInput
                      value={settings.hotkeys.toggle_overlays_enabled ? parseHotkey(settings.hotkeys.toggle_overlays_enabled) : null}
                      onChange={(value) => handleHotkeyChange("toggle_overlays_enabled", value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[var(--radius-xl)]">
              <CardHeader className="pb-2">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("common.connection_settings")}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/80">
                    {t("common.connection_settings_desc")}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={activeConnectionTab}
                  onValueChange={(value) => setActiveConnectionTab(value as GameConnectionKey)}
                  className="space-y-4"
                >
                  <TabsList className="grid grid-cols-3 gap-2">
                    {CONNECTION_GAME_KEYS.map((game) => (
                      <TabsTrigger key={game} value={game}>
                        {t(`common.${game}`)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {CONNECTION_GAME_KEYS.map((game) => {
                    const current = settings.connectionSettings[game]
                    return (
                      <TabsContent
                        key={game}
                        value={game}
                        className="space-y-4 rounded-lg border border-border bg-background p-4"
                      >
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">{t("common.host")}</Label>
                          <Input
                            value={current.host}
                            onChange={(event) =>
                              handleConnectionSettingChange(game, "host", event.target.value)
                            }
                            placeholder="127.0.0.1"
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">{t("common.port")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={65535}
                            inputMode="numeric"
                            value={current.port > 0 ? String(current.port) : ""}
                            onChange={(event) =>
                              handleConnectionSettingChange(game, "port", event.target.value)
                            }
                            placeholder="9000"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">
                            {t("common.connection_password")}
                          </Label>
                          <Input
                            value={current.connectionPassword}
                            onChange={(event) =>
                              handleConnectionSettingChange(game, "connectionPassword", event.target.value)
                            }
                            placeholder="asd"
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">
                            {t("common.command_password")}
                          </Label>
                          <Input
                            value={current.commandPassword}
                            onChange={(event) =>
                              handleConnectionSettingChange(game, "commandPassword", event.target.value)
                            }
                            autoComplete="off"
                          />
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <MeasurementUnitsModal
        open={unitsModalOpen}
        onOpenChange={setUnitsModalOpen}
        valueChoice={settings.measurement_units}
        onSave={handleCustomUnitsSave}
      />
    </>
  )
}

