"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HotkeyDisplay } from "@/components/ui/hotkey-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  Settings2,
  Power,
  Move,
  RotateCcw,
  Trash2,
  Upload,
  Download,
  Plus,
  Layers,
} from "lucide-react";
import type { OverlayInstance } from "@/app/acc/overlay/types";
import { useRef } from "react";

interface OverlaySidebarProps {
  overlays: OverlayInstance[];
  activeId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  editMode: boolean;
  onToggleOverlay: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string) => void;
  // Management controls
  overlaysEnabled: boolean;
  onToggleOverlaysEnabled: () => Promise<void>;
  overlaysEnabledHotkey?: string;
  onToggleEditMode: () => void;
  editModeHotkey?: string;
  highlightPower?: boolean;
  // Preset controls
  selectedPreset: string;
  availableConfigs: string[];
  onSelectPreset: (preset: string) => void;
  onCreatePreset: () => void;
  onResetDefault: () => Promise<void>;
  onDeletePreset: () => Promise<void>;
  onExportConfig: () => Promise<void>;
  onImportConfig: (file: File) => Promise<void>;
}

export function OverlaySidebar({
  overlays,
  activeId,
  onSelect,
  query,
  onQueryChange,
  editMode,
  onToggleOverlay,
  onDragStart,
  onDrop,
  overlaysEnabled,
  onToggleOverlaysEnabled,
  overlaysEnabledHotkey,
  onToggleEditMode,
  editModeHotkey,
  highlightPower,
  selectedPreset,
  availableConfigs,
  onSelectPreset,
  onCreatePreset,
  onResetDefault,
  onDeletePreset,
  onExportConfig,
  onImportConfig,
}: OverlaySidebarProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const filtered = overlays.filter((overlay) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [overlay.title, overlay.description]
      .filter(Boolean)
      .some((text) => (text as string).toLowerCase().includes(q));
  });

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Search + controls */}
      <div className="px-3 pt-9 pb-3 border-b border-border">
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="h-8 w-full pl-8 text-xs bg-input border-border focus-visible:border-border focus-visible:ring-border/30"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editMode ? "default" : "ghost"}
                size="icon-sm"
                onClick={onToggleEditMode}
                className={cn(
                  editMode && "bg-red-accent text-white hover:bg-red-accent/90",
                )}
              >
                <Move className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2 text-xs">
              <span className="font-medium">Edit mode</span>
              <HotkeyDisplay hotkey={editModeHotkey} fallback="Alt + E" />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={overlaysEnabled ? "default" : "ghost"}
                size="icon-sm"
                onClick={onToggleOverlaysEnabled}
                className={cn(
                  overlaysEnabled && "bg-red-accent text-white hover:bg-red-accent/90",
                  highlightPower &&
                    "border-red-accent bg-red-accent/10 text-red-accent shadow-[0_0_12px_rgba(220,38,38,0.4)]",
                )}
              >
                <Power className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2 text-xs">
              <span className="font-medium">Toggle overlays</span>
              <HotkeyDisplay hotkey={overlaysEnabledHotkey} fallback="Alt + W" />
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Overlay list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
            <Layers className="w-8 h-8 mb-2 opacity-40" />
            <span>No overlays found</span>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((overlay) => {
              const isSelected = activeId === overlay.id;
              return (
                <div
                  key={overlay.id}
                  draggable={editMode}
                  onDragStart={(e) => {
                    if (editMode) {
                      e.dataTransfer.setData("text/plain", overlay.id);
                      onDragStart(overlay.id);
                    }
                  }}
                  onDragOver={(e) => {
                    if (editMode) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={(e) => {
                    if (editMode) {
                      e.preventDefault();
                      onDrop(overlay.id);
                    }
                  }}
                  onClick={() => onSelect(overlay.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                    isSelected
                      ? "bg-red-accent/10 text-red-accent"
                      : "hover:bg-accent/50 text-foreground",
                    !overlay.enabled && !isSelected && "opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center h-6 w-6 rounded-md shrink-0",
                      isSelected
                        ? "bg-red-accent/20 text-red-accent"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {overlay.icon ? (
                      <overlay.icon className="h-3.5 w-3.5" />
                    ) : (
                      <Settings2 className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block leading-tight">
                      {overlay.title}
                    </span>
                    {overlay.description && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
                        {overlay.description}
                      </p>
                    )}
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  >
                    <Switch
                      checked={overlay.enabled}
                      onCheckedChange={() => onToggleOverlay(overlay.id)}
                      className="scale-75 data-[state=checked]:bg-red-accent"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Preset management — pinned to bottom */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onImportConfig(file);
            }
            if (importInputRef.current) importInputRef.current.value = "";
          }}
        />
        <div className="flex items-center gap-1">
          <Select
            value={selectedPreset}
            onValueChange={(value) => {
              if (value === "__create__") {
                onCreatePreset();
                return;
              }
              if (value) onSelectPreset(value);
            }}
          >
            <SelectTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "!h-7 flex-1 min-w-0 justify-between gap-1 rounded-md px-2.5 text-xs font-medium bg-input border-border",
              )}
            >
              <SelectValue placeholder="Preset" />
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onResetDefault}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset to Default</TooltipContent>
          </Tooltip>
          {selectedPreset !== "default" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={onDeletePreset}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Preset</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import preset</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  void onExportConfig();
                }}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export preset</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
