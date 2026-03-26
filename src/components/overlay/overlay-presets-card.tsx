"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HotkeyDisplay } from "@/components/ui/hotkey-display"
import { cn } from "@/lib/utils"
import { Download, Power, Upload, Move, PenSquare, RotateCcw, Trash2 } from "lucide-react"
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
  highlightPower?: boolean
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
  highlightPower,
}: OverlayPresetsCardProps) {
  const importInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex gap-4 items-center justify-between w-full">
      <div className="flex items-center gap-2">
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
              buttonVariants({ variant: "outline" }),
              "!h-9 w-[10rem] sm:w-[13rem] justify-between gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium bg-card",
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

        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-[var(--radius-md)] bg-card"
                onClick={onResetDefault}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset to Default</TooltipContent>
          </Tooltip>

          {selectedPreset !== "default" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-[var(--radius-md)] bg-card"
                  onClick={onDeletePreset}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Preset</TooltipContent>
            </Tooltip>
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-[var(--radius-md)] bg-card"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import preset</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-[var(--radius-md)] bg-card"
                onClick={() => {
                  void onExportConfig()
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export preset</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editMode ? "default" : "outline"}
                onClick={onToggleEditMode}
                className={cn(
                  "flex h-9 w-9 p-0 items-center justify-center rounded-[var(--radius-md)] transition-colors bg-card",
                  editMode
                    ? "bg-red-accent text-white hover:bg-red-accent/90 border-transparent"
                    : "border border-border/60 text-foreground hover:bg-muted/40"
                )}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="flex items-center gap-2 text-xs">
              <span className="font-medium">Toggle edit mode</span>
              <HotkeyDisplay hotkey={editModeHotkey} fallback="Alt + E" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={overlaysEnabled ? "default" : "outline"}
                onClick={onToggleOverlaysEnabled}
                className={cn(
                  "flex h-9 w-9 p-0 items-center justify-center rounded-[var(--radius-md)] transition-all duration-300 bg-card",
                  overlaysEnabled
                    ? "bg-red-accent text-white hover:bg-red-accent/90 border-transparent"
                    : "border border-border/60 text-foreground hover:bg-muted/40",
                  highlightPower && "border-red-accent bg-red-accent/10 text-red-accent shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                )}
              >
                <Power className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="flex items-center gap-2 text-xs">
              <span className="font-medium">Toggle all overlays</span>
              <HotkeyDisplay hotkey={overlaysEnabledHotkey} fallback="Alt + W" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
