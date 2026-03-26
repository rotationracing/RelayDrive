"use client"

import { Switch } from "@/components/ui/switch"
import { Monitor } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OverlayInstance } from "@/app/acc/overlay/types"

interface OverlayCardItemProps {
  overlay: OverlayInstance
  editMode: boolean
  onToggle: (id: string) => void
  onOpenSettings: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (targetId: string) => void
}

export function OverlayCardItem({
  overlay,
  editMode,
  onToggle,
  onOpenSettings,
  onDragStart,
  onDrop,
}: OverlayCardItemProps) {
  const Icon = (overlay.icon ?? Monitor) as LucideIcon

  return (
    <div
      role="button"
      tabIndex={0}
      className="group rounded-[var(--radius-lg)] border p-4 transition-colors hover:bg-muted/40 min-h-[96px] text-left"
      onClick={() => onOpenSettings(overlay.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpenSettings(overlay.id)
        }
      }}
      draggable={editMode}
      onDragStart={() => onDragStart(overlay.id)}
      onDragOver={(event) => editMode && event.preventDefault()}
      onDrop={() => editMode && onDrop(overlay.id)}
    >
      <div className="flex items-start gap-3 h-full">
        <Icon className="mt-0.5 h-4 w-4" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate font-medium text-slate-100">{overlay.title}</div>
            <div
              className="flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              role="presentation"
            >
              <Switch checked={overlay.enabled} onCheckedChange={() => onToggle(overlay.id)} />
            </div>
          </div>
          {overlay.description ? (
            <p className="mt-1 text-sm text-muted-foreground truncate">{overlay.description}</p>
          ) : (
            <div className="mt-1 h-[1.25rem]" />
          )}
        </div>
      </div>
    </div>
  )
}

