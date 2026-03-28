"use client";

import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OverlayInstance, OverlayModule, ComponentSetting } from "@/app/acc/overlay/types";
import { RotateCcw, MousePointer2 } from "lucide-react";
import { useState } from "react";

interface OverlaySettingsPanelProps {
  activeOverlay: OverlayInstance | null;
  moduleMap: Map<string, OverlayModule>;
  updateOverlay: (id: string, updates: Partial<OverlayInstance>) => void;
}

export function OverlaySettingsPanel({
  activeOverlay,
  moduleMap,
  updateOverlay,
}: OverlaySettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("Basic");

  if (!activeOverlay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <MousePointer2 className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Select an overlay to configure</p>
      </div>
    );
  }

  const module = moduleMap.get(activeOverlay.id);
  const componentSettingsSchema = module?.componentSettings;
  const currentComponentSettings = activeOverlay.componentSettings ?? {};

  // Group settings by category
  const settingsByCategory: Record<string, Array<[string, ComponentSetting]>> = {};

  if (componentSettingsSchema) {
    Object.entries(componentSettingsSchema).forEach(([key, setting]) => {
      const category = setting.category || "General";
      if (!settingsByCategory[category]) {
        settingsByCategory[category] = [];
      }
      settingsByCategory[category].push([key, setting]);
    });
  }

  // Filter out empty categories
  const categories = Object.entries(settingsByCategory).filter(
    ([_, settings]) => settings.length > 0,
  );

  // Sort categories: Basic first, then others alphabetically
  categories.sort((a, b) => {
    if (a[0] === "Basic") return -1;
    if (b[0] === "Basic") return 1;
    return a[0].localeCompare(b[0]);
  });

  // Ensure active tab exists
  const currentTab = categories.find((c) => c[0] === activeTab)
    ? activeTab
    : categories[0]?.[0] || "Basic";

  const resetComponentSettings = () => {
    if (!componentSettingsSchema) return;
    const defaultSettings: Record<
      string,
      number | string | boolean | [number, number, number, number]
    > = {};
    Object.entries(componentSettingsSchema).forEach(([key, setting]) => {
      defaultSettings[key] = setting.defaultValue;
    });
    updateOverlay(activeOverlay.id, { componentSettings: defaultSettings });
  };

  const handleColorChange = (key: string, rgba: [number, number, number, number]) => {
    const validRgba: [number, number, number, number] = [
      Math.max(0, Math.min(255, Math.round(rgba[0] || 0))),
      Math.max(0, Math.min(255, Math.round(rgba[1] || 0))),
      Math.max(0, Math.min(255, Math.round(rgba[2] || 0))),
      Math.max(0, Math.min(1, rgba[3] ?? 1)),
    ];

    const current = currentComponentSettings[key];
    if (Array.isArray(current) && current.length === 4) {
      const currentRgba = current as [number, number, number, number];
      if (
        Math.abs(currentRgba[0] - validRgba[0]) < 0.5 &&
        Math.abs(currentRgba[1] - validRgba[1]) < 0.5 &&
        Math.abs(currentRgba[2] - validRgba[2]) < 0.5 &&
        Math.abs(currentRgba[3] - validRgba[3]) < 0.01
      ) {
        return;
      }
    }

    const updated = {
      ...currentComponentSettings,
      [key]: validRgba,
    };
    updateOverlay(activeOverlay.id, { componentSettings: updated });
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-4 pt-9 pb-3 border-b border-border md:px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold">{activeOverlay.title}</h2>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-2">
            <Switch
              id="overlay-enabled"
              checked={activeOverlay.enabled}
              onCheckedChange={(value) => updateOverlay(activeOverlay.id, { enabled: value })}
              className="scale-75"
            />
            <Label
              htmlFor="overlay-enabled"
              className="text-xs font-medium cursor-pointer text-muted-foreground"
            >
              {activeOverlay.enabled ? "Enabled" : "Disabled"}
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetComponentSettings}
            className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            disabled={!componentSettingsSchema || Object.keys(componentSettingsSchema).length === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
        </div>
      </div>

      <div className="px-4 pt-3 flex gap-5 border-b border-border md:px-5">
        {categories.map(([category]) => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            className={cn(
              "pb-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              currentTab === category
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground/80",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 pb-12">
          {categories.map(([category, settings]) => {
            if (category !== currentTab) return null;

            return (
              <section
                key={category}
                className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card">
                  <div className="divide-y divide-border">
                    {settings.map(([key, setting]) => {
                      const currentValue = currentComponentSettings[key] ?? setting.defaultValue;
                      const isColor = setting.type === "color";
                      const isSlider =
                        setting.type === "slider" && typeof setting.defaultValue === "number";
                      const isSwitch =
                        setting.type === "switch" && typeof setting.defaultValue === "boolean";
                      const isSelect =
                        setting.type === "select" &&
                        typeof setting.defaultValue === "string" &&
                        setting.options;

                      const colorValue = isColor
                        ? (() => {
                            let val: [number, number, number, number] = [0, 0, 0, 1];
                            if (Array.isArray(currentValue) && currentValue.length === 4) {
                              val = [
                                Number(currentValue[0]) || 0,
                                Number(currentValue[1]) || 0,
                                Number(currentValue[2]) || 0,
                                Number(currentValue[3]) ?? 1,
                              ] as [number, number, number, number];
                            } else if (
                              Array.isArray(setting.defaultValue) &&
                              setting.defaultValue.length === 4
                            ) {
                              val = [
                                Number(setting.defaultValue[0]) || 0,
                                Number(setting.defaultValue[1]) || 0,
                                Number(setting.defaultValue[2]) || 0,
                                Number(setting.defaultValue[3]) ?? 1,
                              ] as [number, number, number, number];
                            }
                            val[3] = Math.max(0, Math.min(1, val[3]));
                            return val;
                          })()
                        : null;

                      const displayValue = !isColor
                        ? typeof currentValue === "number"
                          ? currentValue
                          : currentValue
                        : null;
                      const unit = setting.unit || "";

                      return (
                        <div
                          key={key}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 py-5 md:px-6 hover:bg-muted/20 transition-colors"
                        >
                          <div className="space-y-1 flex-1 min-w-0 pr-6">
                            <div className="text-sm font-semibold text-foreground">
                              {setting.label}
                            </div>
                            {setting.description && (
                              <p className="text-sm leading-6 text-muted-foreground">
                                {setting.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center shrink-0 justify-end">
                            {isSwitch && (
                              <Switch
                                checked={currentValue as boolean}
                                onCheckedChange={(value) => {
                                  const updated = { ...currentComponentSettings, [key]: value };
                                  updateOverlay(activeOverlay.id, { componentSettings: updated });
                                }}
                              />
                            )}

                            {isSelect && (
                              <Select
                                value={currentValue as string}
                                onValueChange={(value) => {
                                  const updated = { ...currentComponentSettings, [key]: value };
                                  updateOverlay(activeOverlay.id, { componentSettings: updated });
                                }}
                              >
                                <SelectTrigger className="w-[160px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {setting.options?.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                      className="text-xs"
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {isSlider && (
                              <div className="flex items-center gap-3 w-[280px]">
                                <Slider
                                  value={[currentValue as number]}
                                  onValueChange={([value]) => {
                                    const updated = { ...currentComponentSettings, [key]: value };
                                    updateOverlay(activeOverlay.id, { componentSettings: updated });
                                  }}
                                  min={setting.min ?? 0}
                                  max={setting.max ?? 100}
                                  step={setting.step ?? 1}
                                  className="flex-1 cursor-pointer"
                                />
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] h-5 w-14 justify-center"
                                >
                                  {displayValue}
                                  {unit}
                                </Badge>
                              </div>
                            )}

                            {isColor && colorValue && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-[110px] h-8 justify-start text-left font-normal px-2"
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full border mr-2 shrink-0 shadow-sm"
                                      style={{
                                        backgroundColor: `rgba(${Math.round(colorValue[0])}, ${Math.round(colorValue[1])}, ${Math.round(colorValue[2])}, ${colorValue[3]})`,
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground font-mono truncate">
                                      #{Math.round(colorValue[0]).toString(16).padStart(2, "0")}
                                      {Math.round(colorValue[1]).toString(16).padStart(2, "0")}
                                      {Math.round(colorValue[2]).toString(16).padStart(2, "0")}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 bg-card" align="end">
                                  <ColorPicker
                                    key={`${activeOverlay.id}-${key}`}
                                    value={`rgba(${Math.round(colorValue[0])}, ${Math.round(colorValue[1])}, ${Math.round(colorValue[2])}, ${colorValue[3]})`}
                                    defaultValue={`rgba(${Math.round(colorValue[0])}, ${Math.round(colorValue[1])}, ${Math.round(colorValue[2])}, ${colorValue[3]})`}
                                    onChange={(rgba: [number, number, number, number]) =>
                                      handleColorChange(key, rgba)
                                    }
                                    className="w-full"
                                  >
                                    <div className="space-y-3">
                                      <ColorPickerSelection className="h-32 w-full rounded-md border" />
                                      <div className="space-y-2">
                                        <ColorPickerHue />
                                        <ColorPickerAlpha />
                                      </div>
                                      <ColorPickerFormat />
                                    </div>
                                  </ColorPicker>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
