"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HotkeyDisplay } from "@/components/ui/hotkey-display"
import { cn } from "@/lib/utils"
import { Download, Power, Upload, Move, PenSquare } from "lucide-react"
import { useRef } from "react"

interface OverlayPresetsCardProps {
  overlaysEnabled: boolean
  onToggleOverlaysEnabled: () => Promise<void>
  selectedPreset: string
  availableConfigs: string[]
  onSelectPreset: (preset: string) => void
  onCreatePreset: () => void
  onResetDefault: () => Promise<void>
  onDeletePreset: () => Promise<void>
  onExportConfig: () => Promise<void>
  onImportConfig: (file: File) => Promise<void>
  overlaysEnabledHotkey?: string
  editMode: boolean
  onToggleEditMode: () => void
  editModeHotkey?: string
}

export function OverlayPresetsCard({
  overlaysEnabled,
  onToggleOverlaysEnabled,
  selectedPreset,
  availableConfigs,
  onSelectPreset,
  onCreatePreset,
  onResetDefault,
  onDeletePreset,
  onExportConfig,
  onImportConfig,
  overlaysEnabledHotkey,
  editMode,
  onToggleEditMode,
  editModeHotkey,
}: OverlayPresetsCardProps) {
  const importInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card className="rounded-[var(--radius-xl)]">
      <CardHeader className="pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Presets
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground/80">
            Save, load, import or export overlay layouts. Changes are automatically saved to default.json.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <TooltipProvider delayDuration={1500} skipDelayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={overlaysEnabled ? "default" : "outline"}
                    onClick={onToggleOverlaysEnabled}
                    className={cn(
                      "flex h-10 w-[12rem] flex-shrink-0 items-center justify-center gap-2 rounded-[var(--radius-lg)] px-3 text-sm font-medium transition-colors",
                      overlaysEnabled
                        ? "bg-red-accent text-white hover:bg-red-accent/90"
                        : "border border-border/60 text-foreground hover:bg-muted/40"
                    )}
                  >
                    <Power className="h-4 w-4" />
                    {overlaysEnabled ? "Overlays: On" : "Overlays: Off"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">Toggle all overlays</span>
                  <HotkeyDisplay hotkey={overlaysEnabledHotkey} fallback="Alt + W" />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={1500} skipDelayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editMode ? "default" : "outline"}
                    onClick={onToggleEditMode}
                    className={cn(
                      "flex h-10 w-[9rem] flex-shrink-0 items-center justify-center gap-2 rounded-[var(--radius-lg)] px-3 text-sm font-medium transition-colors",
                      editMode
                        ? "bg-red-accent text-white hover:bg-red-accent/90"
                        : "border border-border/60 text-foreground hover:bg-muted/40"
                    )}
                  >
                    {editMode ? (
                      <Move className="h-4 w-4" />
                    ) : (
                      <PenSquare className="h-4 w-4" />
                    )}
                    {editMode ? "Move" : "Edit"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">Toggle edit mode</span>
                  <HotkeyDisplay hotkey={editModeHotkey} fallback="Alt + E" />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Select
              value={selectedPreset}
              onValueChange={(value) => {
                if (value === "__create__") {
                  onCreatePreset()
                  return
                }
                if (value) onSelectPreset(value)
              }}
            >
              <SelectTrigger
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "!h-10 w-[16rem] justify-between gap-2 rounded-[var(--radius-lg)] px-4 text-sm font-medium",
                )}
              >
                <SelectValue placeholder="Choose preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__create__">Save new preset…</SelectItem>
                <div className="my-1 h-px bg-border" />
                {availableConfigs.length === 0 ? (
                  <SelectItem value="default" disabled>
                    No presets yet
                  </SelectItem>
                ) : (
                  availableConfigs.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="h-10 rounded-[var(--radius-lg)]"
              onClick={onResetDefault}
            >
              Reset Default
            </Button>

            {selectedPreset !== "default" && (
              <Button
                variant="outline"
                className="h-10 rounded-[var(--radius-lg)]"
                onClick={onDeletePreset}
              >
                Delete Preset
              </Button>
            )}

            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void onImportConfig(file)
                }
                if (importInputRef.current) importInputRef.current.value = ""
              }}
            />

            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-[var(--radius-lg)]"
                      onClick={() => importInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Import preset</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-[var(--radius-lg)]"
                      onClick={() => {
                        void onExportConfig()
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Export preset</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

