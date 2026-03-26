import type { HotkeyValue } from "@/components/ui/hotkey-input"
import { parseHotkey } from "@/components/ui/hotkey-input"

export function matchesHotkey(event: KeyboardEvent, hotkeyString: string | null | undefined): boolean {
  if (!hotkeyString) return false
  
  const hotkey = parseHotkey(hotkeyString)
  if (!hotkey) return false
  
  // Check modifiers
  if (hotkey.ctrl && !event.ctrlKey) return false
  if (hotkey.alt && !event.altKey) return false
  if (hotkey.shift && !event.shiftKey) return false
  if (hotkey.meta && !event.metaKey) return false
  
  // Check if any unrequired modifiers are pressed
  if (!hotkey.ctrl && event.ctrlKey) return false
  if (!hotkey.alt && event.altKey) return false
  if (!hotkey.shift && event.shiftKey) return false
  if (!hotkey.meta && event.metaKey) return false
  
  // Check the key - normalize both to uppercase for comparison
  let eventKey = event.key
  // Handle single character keys
  if (eventKey.length === 1) {
    eventKey = eventKey.toUpperCase()
  }
  
  // Normalize hotkey key
  const hotkeyKey = hotkey.key.toUpperCase()
  
  // Handle arrow keys and other special keys
  const keyMap: Record<string, string> = {
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "ArrowLeft": "←",
    "ArrowRight": "→",
  }
  
  const normalizedEventKey = keyMap[eventKey] || eventKey.toUpperCase()
  const normalizedHotkeyKey = keyMap[hotkeyKey] || hotkeyKey.toUpperCase()
  
  return normalizedEventKey === normalizedHotkeyKey
}

/**
 * Convert hotkey string (e.g., "Alt+E" or "Alt + E") to Tauri global shortcut format
 * Tauri expects format like "Alt+E" (no spaces, with +)
 */
export function convertHotkeyToTauriFormat(hotkeyString: string | null | undefined): string | null {
  if (!hotkeyString) return null
  
  const hotkey = parseHotkey(hotkeyString)
  if (!hotkey) return null
  
  const parts: string[] = []
  if (hotkey.ctrl) parts.push("Control")
  if (hotkey.alt) parts.push("Alt")
  if (hotkey.shift) parts.push("Shift")
  if (hotkey.meta) parts.push("Meta")
  
  // Convert special keys back to standard names for Tauri
  const tauriKeyMap: Record<string, string> = {
    "↑": "Up",
    "↓": "Down",
    "←": "Left",
    "→": "Right",
    "ArrowUp": "Up",
    "ArrowDown": "Down",
    "ArrowLeft": "Left",
    "ArrowRight": "Right",
  }
  
  const key = tauriKeyMap[hotkey.key] || hotkey.key
  parts.push(key)
  
  return parts.join("+")
}

