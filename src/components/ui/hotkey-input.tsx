"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export interface HotkeyValue {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  key: string;
}

export function formatHotkey(value: HotkeyValue | null): string {
  if (!value || !value.key) return "Not set";

  const parts: string[] = [];
  if (value.ctrl) parts.push("Ctrl");
  if (value.alt) parts.push("Alt");
  if (value.shift) parts.push("Shift");
  if (value.meta) parts.push("Meta");
  parts.push(value.key.toUpperCase());

  return parts.join(" + ");
}

export function parseHotkey(hotkey: string): HotkeyValue | null {
  if (!hotkey || hotkey.trim() === "") return null;

  const parts = hotkey.split("+").map((p) => p.trim());
  const value: HotkeyValue = {
    key: "",
  };

  // Reverse mapping for special keys
  const specialKeyMap: Record<string, string> = {
    "↑": "ArrowUp",
    "↓": "ArrowDown",
    "←": "ArrowLeft",
    "→": "ArrowRight",
  };

  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    if (lowerPart === "ctrl" || lowerPart === "control") {
      value.ctrl = true;
    } else if (lowerPart === "alt") {
      value.alt = true;
    } else if (lowerPart === "shift") {
      value.shift = true;
    } else if (lowerPart === "meta" || lowerPart === "cmd" || lowerPart === "command") {
      value.meta = true;
    } else {
      // Check if it's a special key
      value.key = specialKeyMap[part] || part.toUpperCase();
    }
  }

  if (!value.key) return null;
  return value;
}

interface HotkeyInputProps {
  value: HotkeyValue | null;
  onChange: (value: HotkeyValue | null) => void;
  className?: string;
  placeholder?: string;
}

export function HotkeyInput({
  value,
  onChange,
  className,
  placeholder = "Press a key combination...",
}: HotkeyInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(formatHotkey(value));
  }, [value]);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only keys
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        return;
      }

      // Map special keys to readable names
      const keyMap: Record<string, string> = {
        " ": "Space",
        ArrowUp: "↑",
        ArrowDown: "↓",
        ArrowLeft: "←",
        ArrowRight: "→",
        Enter: "Enter",
        Escape: "Esc",
        Tab: "Tab",
        Backspace: "Backspace",
        Delete: "Delete",
        Home: "Home",
        End: "End",
        PageUp: "PageUp",
        PageDown: "PageDown",
      };

      const key = keyMap[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);

      const newValue: HotkeyValue = {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        key,
      };

      onChange(newValue);
      setIsRecording(false);
    };

    const handleKeyUp = () => {
      // Don't stop recording on key up, wait for a non-modifier key
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRecording, onChange]);

  const handleFocus = () => {
    setIsRecording(true);
    setDisplayValue("Recording...");
  };

  const handleBlur = () => {
    setIsRecording(false);
    setDisplayValue(formatHotkey(value));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-lg)] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isRecording && "ring-2 ring-ring ring-offset-2",
          className,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
}
