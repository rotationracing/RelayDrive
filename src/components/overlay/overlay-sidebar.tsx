"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Search, Settings2, GripVertical } from "lucide-react"
import type { OverlayInstance } from "@/app/acc/overlay/types"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

interface OverlaySidebarProps {
    overlays: OverlayInstance[]
    activeId: string | null
    onSelect: (id: string) => void
    query: string
    onQueryChange: (query: string) => void
    editMode: boolean
    onToggleOverlay: (id: string) => void
    onDragStart: (id: string) => void
    onDrop: (targetId: string) => void
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
}: OverlaySidebarProps) {
    const filtered = overlays.filter((overlay) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        return [overlay.title, overlay.description]
            .filter(Boolean)
            .some((text) => (text as string).toLowerCase().includes(q))
    })

    return (
        <div className="flex flex-col h-full w-72 shrink-0 border-r border-border bg-transparent">
            <div className="px-3 border-b border-border md:px-4 h-[61px] flex items-center shrink-0">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="Search overlays..."
                        className="pl-9 h-9 text-sm bg-muted/60 border-transparent hover:bg-muted/80 focus-visible:bg-muted focus-visible:border-border transition-colors rounded-[var(--radius-md)]"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-1.5 space-y-0.5">
                    {filtered.map((overlay) => (
                        <div
                            key={overlay.id}
                            draggable={editMode}
                            onDragStart={(e) => {
                                if (editMode) {
                                    e.dataTransfer.setData("text/plain", overlay.id)
                                    onDragStart(overlay.id)
                                }
                            }}
                            onDragOver={(e) => {
                                if (editMode) {
                                    e.preventDefault()
                                }
                            }}
                            onDrop={(e) => {
                                if (editMode) {
                                    e.preventDefault()
                                    onDrop(overlay.id)
                                }
                            }}
                            onClick={() => onSelect(overlay.id)}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] cursor-pointer transition-colors border border-transparent",
                                activeId === overlay.id
                                    ? "bg-accent/60 text-accent-foreground border-border/60"
                                    : "hover:bg-muted/50 hover:border-border/50",
                                !overlay.enabled && "opacity-60 grayscale-[0.5]"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center h-8 w-8 rounded-[var(--radius-md)] shrink-0 transition-colors",
                                activeId === overlay.id
                                    ? "bg-background text-foreground"
                                    : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground"
                            )}>
                                {overlay.icon ? (
                                    <overlay.icon className="h-4 w-4" />
                                ) : (
                                    <Settings2 className="h-4 w-4" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-sm truncate leading-none">
                                        {overlay.title}
                                    </span>
                                </div>
                                {overlay.description && (
                                    <p className="text-[11px] text-muted-foreground truncate mt-1">
                                        {overlay.description}
                                    </p>
                                )}
                            </div>

                            <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center justify-center h-full">
                                <Switch
                                    checked={overlay.enabled}
                                    onCheckedChange={() => onToggleOverlay(overlay.id)}
                                    className="scale-75 data-[state=checked]:bg-red-accent"
                                />
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No overlays found
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
