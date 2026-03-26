"use client"

import { parseHotkey } from "./hotkey-input"
import { Kbd } from "./kbd"

interface HotkeyDisplayProps {
  hotkey: string | null | undefined
  fallback?: string
}

export function HotkeyDisplay({ hotkey, fallback = "Not set" }: HotkeyDisplayProps) {
  // Try to parse the hotkey, or fall back to parsing the fallback string
  const hotkeyToParse = hotkey || fallback
  const parsed = parseHotkey(hotkeyToParse)
  
  if (!parsed) {
    return <span className="text-muted-foreground">{fallback}</span>
  }

  const parts: React.ReactNode[] = []
  if (parsed.ctrl) {
    parts.push(<Kbd key="ctrl">Ctrl</Kbd>)
  }
  if (parsed.alt) {
    parts.push(<Kbd key="alt">Alt</Kbd>)
  }
  if (parsed.shift) {
    parts.push(<Kbd key="shift">Shift</Kbd>)
  }
  if (parsed.meta) {
    parts.push(<Kbd key="meta">Meta</Kbd>)
  }
  parts.push(<Kbd key="key">{parsed.key}</Kbd>)

  return (
    <span className="flex items-center gap-1">
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && <span className="mx-1">+</span>}
        </span>
      ))}
    </span>
  )
}

