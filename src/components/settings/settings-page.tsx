"use client"

import type { ConnectionDetails, GameConnectionSettings } from "@/app/tauri-bridge"
import { MeasurementUnitsModal } from "@/components/settings/MeasurementUnitsModal"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HotkeyInput, type HotkeyValue, formatHotkey, parseHotkey } from "@/components/ui/hotkey-input"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { setLocale, useI18n } from "@/i18n"
import type { LanguageCode } from "@/lib/language"
import { LANGUAGE_OPTIONS } from "@/lib/language"
import { CHOICE_IMPERIAL, CHOICE_METRIC, type UnitsMode, inferUnitsModeFromChoice } from "@/lib/units"
import type React from "react"
import { useEffect, useState } from "react"

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

type EditableSettings = {
  checkForUpdates: boolean
  language: string
  measurement_units: typeof CHOICE_METRIC
  hotkeys: Record<string, string | null>
  connectionSettings: GameConnectionSettings
  setupPaths: { acc: string | null; iracing: string | null; lmu: string | null }
}

const GAME_OPTIONS = [
  { value: "acc", label: "ACC" },
  { value: "iracing", label: "iRacing" },
  { value: "lmu", label: "LMU" },
] as const satisfies readonly { value: GameConnectionKey; label: string }[]

export function SettingsPage() {
  const { t } = useI18n()
  const { settings: globalSettings, persist } = useSettingsContext()
  const [settings, setSettings] = useState<EditableSettings | null>(null)
  const [unitsMode, setUnitsMode] = useState<UnitsMode>("metric")
  const [unitsModalOpen, setUnitsModalOpen] = useState(false)
  const [activeConnectionGame, setActiveConnectionGame] = useState<GameConnectionKey | null>(null)

  useEffect(() => {
    if (!globalSettings) return

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
      setupPaths: globalSettings.setupPaths ?? { acc: null, iracing: null, lmu: null },
    }

    setSettings(loaded)
    setUnitsMode(inferUnitsModeFromChoice(loaded.measurement_units))
  }, [globalSettings])

  const handleLanguageChange = async (value: string) => {
    if (!settings || !globalSettings) return

    setSettings({ ...settings, language: value })
    await setLocale(value as LanguageCode)

    try {
      await persist({
        ...globalSettings,
        language: value,
      })
    } catch (error) {
      console.error("Failed to save language setting:", error)
    }
  }

  const handleUnitsModeChange = async (mode: UnitsMode) => {
    if (!settings || !globalSettings) return

    let newChoice: typeof CHOICE_METRIC
    if (mode === "custom") {
      setUnitsModalOpen(true)
      return
    }

    if (mode === "imperial") {
      newChoice = CHOICE_IMPERIAL
    } else {
      newChoice = CHOICE_METRIC
    }

    setSettings({ ...settings, measurement_units: newChoice })
    setUnitsMode(mode)

    try {
      await persist({
        ...globalSettings,
        measurement_units: newChoice,
      })
    } catch (error) {
      console.error("Failed to save units setting:", error)
    }
  }

  const handleCustomUnitsSave = async (choice: typeof CHOICE_METRIC) => {
    if (!settings || !globalSettings) return

    setSettings({ ...settings, measurement_units: choice })
    setUnitsMode("custom")

    try {
      await persist({
        ...globalSettings,
        measurement_units: choice,
      })
    } catch (error) {
      console.error("Failed to save custom units setting:", error)
    }
  }

  const handleCheckForUpdatesChange = async (checked: boolean) => {
    if (!settings || !globalSettings) return

    setSettings({ ...settings, checkForUpdates: checked })

    try {
      await persist({
        ...globalSettings,
        checkForUpdates: checked,
      })
    } catch (error) {
      console.error("Failed to save check for updates setting:", error)
    }
  }

  const handleHotkeyChange = async (hotkeyId: string, value: HotkeyValue | null) => {
    if (!settings || !globalSettings) return

    const hotkeyString = value ? formatHotkey(value) : null
    const updatedHotkeys = {
      ...settings.hotkeys,
      [hotkeyId]: hotkeyString,
    }

    setSettings({
      ...settings,
      hotkeys: updatedHotkeys,
    })

    try {
      await persist({
        ...globalSettings,
        hotkeys: updatedHotkeys,
      })
    } catch (error) {
      console.error("Failed to save hotkey setting:", error)
    }
  }

  const handleSetupPathChange = async (
    game: "acc" | "iracing" | "lmu",
    value: string
  ) => {
    if (!settings || !globalSettings) return

    const updatedPaths = {
      ...settings.setupPaths,
      [game]: value.trim() || null,
    }

    setSettings({ ...settings, setupPaths: updatedPaths })

    try {
      await persist({
        ...globalSettings,
        setupPaths: updatedPaths,
      })
    } catch (error) {
      console.error("Failed to save setup path:", error)
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

    setSettings({
      ...settings,
      connectionSettings: updatedConnectionSettings,
    })

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
      <div className="min-h-full bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-6 md:px-8 md:py-8">
          <header className="pb-2">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                System behavior, controls, and telemetry connection details for the current game
                workspace.
              </p>
            </div>
          </header>

          <SettingsSection eyebrow="General">
            <SettingsRow
              title={t("common.language")}
              description={t("common.choose_language")}
              control={
                <Select value={settings.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className={controlClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SettingsRow
              title={t("common.measurement_units")}
              description={t("common.choose_units")}
              control={
                <Select
                  value={unitsMode}
                  onValueChange={(value) => handleUnitsModeChange(value as UnitsMode)}
                >
                  <SelectTrigger className={controlClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="imperial">Imperial</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <SettingsRow
              title={t("common.check_for_updates")}
              description={t("common.check_for_updates_desc")}
              control={
                <div className="flex w-full justify-end">
                  <Switch
                    checked={settings.checkForUpdates}
                    onCheckedChange={handleCheckForUpdatesChange}
                    aria-label={t("common.check_for_updates")}
                  />
                </div>
              }
            />
          </SettingsSection>

          <SettingsSection eyebrow="Controls">
            <SettingsRow
              title="Toggle overlay edit mode"
              description="Enable or disable overlay edit mode without leaving the race view."
              control={
                <HotkeyInput
                  value={
                    settings.hotkeys.toggle_overlay_edit_mode
                      ? parseHotkey(settings.hotkeys.toggle_overlay_edit_mode)
                      : null
                  }
                  onChange={(value) => handleHotkeyChange("toggle_overlay_edit_mode", value)}
                  className={controlClassName}
                />
              }
            />
            <SettingsRow
              title="Toggle overlays"
              description="Quickly enable or disable all overlays from a single shortcut."
              control={
                <HotkeyInput
                  value={
                    settings.hotkeys.toggle_overlays_enabled
                      ? parseHotkey(settings.hotkeys.toggle_overlays_enabled)
                      : null
                  }
                  onChange={(value) => handleHotkeyChange("toggle_overlays_enabled", value)}
                  className={controlClassName}
                />
              }
            />
          </SettingsSection>

          <SettingsSection eyebrow="Telemetry">
            <div className="divide-y divide-border">
              {GAME_OPTIONS.map((game) => {
                const config = settings.connectionSettings[game.value]
                return (
                  <TelemetryAppRow
                    key={game.value}
                    label={game.label}
                    host={config.host}
                    port={config.port}
                    onConfigure={() => setActiveConnectionGame(game.value)}
                  />
                )
              })}
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Setups">
            {GAME_OPTIONS.map((game) => (
              <SettingsRow
                key={game.value}
                title={`${game.label} setups path`}
                description="Leave empty to use the default location."
                control={
                  <Input
                    value={settings.setupPaths[game.value] ?? ""}
                    onChange={(e) => handleSetupPathChange(game.value, e.target.value)}
                    placeholder="Default"
                    className={controlClassName}
                  />
                }
              />
            ))}
          </SettingsSection>
        </div>
      </div>

      <MeasurementUnitsModal
        open={unitsModalOpen}
        onOpenChange={setUnitsModalOpen}
        valueChoice={settings.measurement_units}
        onSave={handleCustomUnitsSave}
      />
      <TelemetryConfigDialog
        game={activeConnectionGame}
        settings={settings.connectionSettings}
        onOpenChange={(open) => {
          if (!open) setActiveConnectionGame(null)
        }}
        onFieldChange={handleConnectionSettingChange}
        t={t}
      />
    </>
  )
}

const controlClassName =
  "h-11 w-full rounded-[var(--radius-lg)] border-border bg-input text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-ring/30"

function SettingsSection({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1 px-1">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </div>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="grid gap-4 border-b border-border px-4 py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] md:items-center md:px-6">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="md:justify-self-end md:w-full md:max-w-[280px]">{control}</div>
    </div>
  )
}

function TelemetryAppRow({
  label,
  host,
  port,
  onConfigure,
}: {
  label: string
  host: string
  port: number
  onConfigure: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-5 md:px-6">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <p className="text-sm text-muted-foreground">
          {host?.trim() ? host : "No host configured"}
          {port > 0 ? `:${port}` : ""}
        </p>
      </div>
      <Button variant="outline" className="h-10 rounded-[var(--radius-lg)]" onClick={onConfigure}>
        Configure
      </Button>
    </div>
  )
}

function TelemetryConfigDialog({
  game,
  settings,
  onOpenChange,
  onFieldChange,
  t,
}: {
  game: GameConnectionKey | null
  settings: GameConnectionSettings
  onOpenChange: (open: boolean) => void
  onFieldChange: (game: GameConnectionKey, field: keyof ConnectionDetails, value: string) => void
  t: (key: string) => string
}) {
  const current = game ? settings[game] : null
  const label = GAME_OPTIONS.find((option) => option.value === game)?.label ?? ""

  return (
    <Dialog open={game !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 rounded-[var(--radius-2xl)] border-border bg-card p-0 shadow-2xl">
        <DialogHeader>
          <div className="border-b border-border px-6 py-5">
            <DialogTitle>{label ? `${label} telemetry` : "Telemetry"}</DialogTitle>
            <DialogDescription className="mt-2">
              Configure host, port, and passwords for this integration.
            </DialogDescription>
          </div>
        </DialogHeader>
        {game && current ? (
          <div className="space-y-4 px-6 py-3">
            <DialogField label={t("common.host")}>
              <Input
                value={current.host}
                onChange={(event) => onFieldChange(game, "host", event.target.value)}
                placeholder="127.0.0.1"
                autoComplete="off"
                className="h-11 rounded-[var(--radius-lg)] border-border bg-input"
              />
            </DialogField>
            <DialogField label={t("common.port")}>
              <Input
                type="number"
                min={0}
                max={65535}
                inputMode="numeric"
                value={current.port > 0 ? String(current.port) : ""}
                onChange={(event) => onFieldChange(game, "port", event.target.value)}
                placeholder="9000"
                className="h-11 rounded-[var(--radius-lg)] border-border bg-input"
              />
            </DialogField>
            <DialogField label={t("common.connection_password")}>
              <Input
                value={current.connectionPassword}
                onChange={(event) => onFieldChange(game, "connectionPassword", event.target.value)}
                placeholder="asd"
                autoComplete="off"
                className="h-11 rounded-[var(--radius-lg)] border-border bg-input"
              />
            </DialogField>
            <DialogField label={t("common.command_password")}>
              <Input
                value={current.commandPassword}
                onChange={(event) => onFieldChange(game, "commandPassword", event.target.value)}
                autoComplete="off"
                className="h-11 rounded-[var(--radius-lg)] border-border bg-input"
              />
            </DialogField>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DialogField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {children}
    </div>
  )
}
