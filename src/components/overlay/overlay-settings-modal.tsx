"use client"

import { Button } from "@/components/ui/button"
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OverlayInstance, OverlayModule } from "@/app/acc/overlay/types"

interface OverlaySettingsModalProps {
  activeOverlay: OverlayInstance | null
  moduleMap: Map<string, OverlayModule>
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  updateOverlay: (id: string, updates: Partial<OverlayInstance>) => void
}

export function OverlaySettingsModal({
  activeOverlay,
  moduleMap,
  settingsOpen,
  setSettingsOpen,
  updateOverlay,
}: OverlaySettingsModalProps) {
  if (!activeOverlay) return null

  const module = moduleMap.get(activeOverlay.id)
  const componentSettingsSchema = module?.componentSettings
  const currentComponentSettings = activeOverlay.componentSettings ?? {}

  const resetComponentSettings = () => {
    if (!componentSettingsSchema) return
    const defaultSettings: Record<string, number | string | boolean | [number, number, number, number]> = {}
    Object.entries(componentSettingsSchema).forEach(([key, setting]) => {
      defaultSettings[key] = setting.defaultValue
    })
    updateOverlay(activeOverlay.id, { componentSettings: defaultSettings })
  }

  // Color change handler (not using useCallback to avoid hook order issues)
  const handleColorChange = (key: string, rgba: [number, number, number, number]) => {
    // Ensure all values are valid numbers
    const validRgba: [number, number, number, number] = [
      Math.max(0, Math.min(255, Math.round(rgba[0] || 0))),
      Math.max(0, Math.min(255, Math.round(rgba[1] || 0))),
      Math.max(0, Math.min(255, Math.round(rgba[2] || 0))),
      Math.max(0, Math.min(1, rgba[3] ?? 1))
    ]

    // Only update if the value actually changed
    const current = currentComponentSettings[key]
    if (Array.isArray(current) && current.length === 4) {
      const currentRgba = current as [number, number, number, number]
      if (Math.abs(currentRgba[0] - validRgba[0]) < 0.5 &&
        Math.abs(currentRgba[1] - validRgba[1]) < 0.5 &&
        Math.abs(currentRgba[2] - validRgba[2]) < 0.5 &&
        Math.abs(currentRgba[3] - validRgba[3]) < 0.01) {
        return // No significant change
      }
    }

    const updated = {
      ...currentComponentSettings,
      [key]: validRgba,
    }
    // Component settings changes are debounced automatically
    updateOverlay(activeOverlay.id, { componentSettings: updated })
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{activeOverlay.title}</DialogTitle>
          {activeOverlay.description ? (
            <DialogDescription>{activeOverlay.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="px-6 mt-4 space-y-6 pb-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Enabled</div>
              <p className="text-[11px] text-muted-foreground">Show this overlay in-game</p>
            </div>
            <Switch checked={activeOverlay.enabled} onCheckedChange={(value) => updateOverlay(activeOverlay.id, { enabled: value })} />
          </div>

          {componentSettingsSchema && Object.keys(componentSettingsSchema).length > 0 ? (
            <>
              {Object.entries(componentSettingsSchema).map(([key, setting]) => {
                const currentValue = currentComponentSettings[key] ?? setting.defaultValue
                const isColor = setting.type === "color"
                const isSlider = setting.type === "slider" && typeof setting.defaultValue === "number"
                const isSwitch = setting.type === "switch" && typeof setting.defaultValue === "boolean"
                const isSelect = setting.type === "select" && typeof setting.defaultValue === "string" && setting.options

                // For color, get the rgba array or default, ensuring all values are valid numbers
                const colorValue = isColor
                  ? (() => {
                    let val: [number, number, number, number] = [0, 0, 0, 1]
                    if (Array.isArray(currentValue) && currentValue.length === 4) {
                      val = [
                        Number(currentValue[0]) || 0,
                        Number(currentValue[1]) || 0,
                        Number(currentValue[2]) || 0,
                        Number(currentValue[3]) ?? 1
                      ] as [number, number, number, number]
                    } else if (Array.isArray(setting.defaultValue) && setting.defaultValue.length === 4) {
                      val = [
                        Number(setting.defaultValue[0]) || 0,
                        Number(setting.defaultValue[1]) || 0,
                        Number(setting.defaultValue[2]) || 0,
                        Number(setting.defaultValue[3]) ?? 1
                      ] as [number, number, number, number]
                    }
                    // Ensure alpha is between 0 and 1
                    val[3] = Math.max(0, Math.min(1, val[3]))
                    return val
                  })()
                  : null

                // For non-color, get display value
                const displayValue = !isColor
                  ? (typeof currentValue === "number" ? currentValue : currentValue)
                  : null
                const unit = setting.unit || ""

                return (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label className="text-sm font-medium">{setting.label}</Label>
                        {setting.description ? (
                          <p className="text-[11px] text-muted-foreground">{setting.description}</p>
                        ) : null}
                      </div>
                      {isSwitch ? (
                        <Switch
                          checked={currentValue as boolean}
                          onCheckedChange={(value) => {
                            const updated = {
                              ...currentComponentSettings,
                              [key]: value,
                            }
                            // Component settings changes are debounced automatically
                            updateOverlay(activeOverlay.id, { componentSettings: updated })
                          }}
                        />
                      ) : isSelect ? (
                        <Select
                          value={currentValue as string}
                          onValueChange={(value) => {
                            const updated = {
                              ...currentComponentSettings,
                              [key]: value,
                            }
                            // Component settings changes are debounced automatically
                            updateOverlay(activeOverlay.id, { componentSettings: updated })
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {setting.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : !isColor && (
                        <span className="text-xs text-muted-foreground ml-4 shrink-0">
                          {displayValue}{unit}
                        </span>
                      )}
                    </div>
                    {isSlider ? (
                      <Slider
                        value={[currentValue as number]}
                        onValueChange={([value]) => {
                          const updated = {
                            ...currentComponentSettings,
                            [key]: value,
                          }
                          // Component settings changes are debounced automatically
                          updateOverlay(activeOverlay.id, { componentSettings: updated })
                        }}
                        min={setting.min ?? 0}
                        max={setting.max ?? 100}
                        step={setting.step ?? 1}
                        className="mt-2"
                      />
                    ) : isColor && colorValue ? (
                      <div className="mt-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full h-10 justify-start text-left font-normal"
                            >
                              <div
                                className="w-4 h-4 rounded border mr-2 shrink-0"
                                style={{
                                  backgroundColor: `rgba(${Math.round(colorValue[0])}, ${Math.round(colorValue[1])}, ${Math.round(colorValue[2])}, ${colorValue[3]})`,
                                }}
                              />
                              <span className="text-xs text-muted-foreground">
                                rgba({Math.round(colorValue[0])}, {Math.round(colorValue[1])}, {Math.round(colorValue[2])}, {Math.round(colorValue[3] * 100) / 100})
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4 bg-card" align="start">
                            <ColorPicker
                              key={`${activeOverlay.id}-${key}`}
                              value={`rgba(${Math.round(colorValue[0])}, ${Math.round(colorValue[1])}, ${Math.round(colorValue[2])}, ${colorValue[3]})`}
                              defaultValue={`rgba(${Math.round(colorValue[0])}, ${Math.round(colorValue[1])}, ${Math.round(colorValue[2])}, ${colorValue[3]})`}
                              onChange={(rgba: [number, number, number, number]) => handleColorChange(key, rgba)}
                              className="w-full"
                            >
                              <div className="space-y-3">
                                <ColorPickerSelection className="h-32 w-full" />
                                <div className="space-y-2">
                                  <ColorPickerHue />
                                  <ColorPickerAlpha />
                                </div>
                                <ColorPickerFormat />
                              </div>
                            </ColorPicker>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </>
          ) : null}
        </div>
        <DialogFooter className="flex gap-2 pt-4 border-t border-border/50 px-6 pb-6 mt-auto">
          {componentSettingsSchema && Object.keys(componentSettingsSchema).length > 0 ? (
            <Button
              variant="outline"
              onClick={resetComponentSettings}
              className="flex-1 rounded-[var(--radius-lg)]"
            >
              Reset to Defaults
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => setSettingsOpen(false)}
            className={componentSettingsSchema && Object.keys(componentSettingsSchema).length > 0 ? "flex-1 rounded-[var(--radius-lg)]" : "rounded-[var(--radius-lg)]"}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

