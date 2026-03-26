"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { HotkeyDisplay } from "@/components/ui/hotkey-display"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Move, PenSquare, Search } from "lucide-react"
import type { OverlayInstance } from "@/app/acc/overlay/types"
import { OverlayCardItem } from "./overlay-card-item"

interface OverlayListCardProps {
  overlays: OverlayInstance[]
  query: string
  onQueryChange: (query: string) => void
  editMode: boolean
  onToggleEditMode: () => void
  editModeHotkey?: string
  onToggleOverlay: (id: string) => void
  onOpenSettings: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (targetId: string) => void
}

export function OverlayListCard({
  overlays,
  query,
  onQueryChange,
  editMode,
  onToggleEditMode,
  editModeHotkey,
  onToggleOverlay,
  onOpenSettings,
  onDragStart,
  onDrop,
}: OverlayListCardProps) {
  const filtered = overlays.filter((overlay) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [overlay.title, overlay.description]
      .filter(Boolean)
      .some((text) => (text as string).toLowerCase().includes(q))
  })

  return (
    <Card className="rounded-[var(--radius-xl)]">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Overlays
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Toggle overlays and configure settings.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search overlays..."
                className="pl-9 h-10 rounded-[var(--radius-lg)]"
              />
            </div>
            <TooltipProvider delayDuration={1500} skipDelayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    aria-pressed={editMode}
                    onClick={onToggleEditMode}
                    variant={editMode ? "default" : "outline"}
                    className={cn(
                      "flex h-10 w-[8rem] flex-shrink-0 items-center justify-center gap-2 rounded-[var(--radius-lg)] px-3 text-sm font-medium transition-colors",
                      editMode
                        ? "bg-red-accent text-white hover:bg-red-accent/90"
                        : "border border-border/60 text-foreground hover:bg-muted/40",
                    )}
                  >
                    {editMode ? (
                      <Move className="h-4 w-4" aria-hidden />
                    ) : (
                      <PenSquare className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                    <span className={cn(!editMode && "text-foreground")}>
                      {editMode ? "Move Mode" : "Edit Mode"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">Toggle overlay move mode</span>
                  <span className="text-foreground/70">
                    <HotkeyDisplay hotkey={editModeHotkey} fallback="Alt + E" />
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((overlay) => (
            <OverlayCardItem
              key={overlay.id}
              overlay={overlay}
              editMode={editMode}
              onToggle={onToggleOverlay}
              onOpenSettings={onOpenSettings}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

