"use client"

import { listen } from "@tauri-apps/api/event"
import { Bug, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import type { OverlayModule } from "../types"

interface BroadcastEventPayload {
  timestamp?: number | string
  status?: string
  data?: {
    track?: unknown
    session?: unknown
    cars?: Record<string, { entry?: unknown; realtime?: unknown }>
  } | null
  message?: string | null
}

const BroadcastDebugOverlay: OverlayModule = {
  id: "broadcast-debug",
  title: "Broadcast Debug",
  description: "Complete ACC broadcast API state debug overlay",
  icon: Bug,
  defaultPosition: { x: 100, y: 100 },
  defaultSize: 100,
  defaultOpacity: 90,
  baseDimensions: { width: 800, height: 900 },
  Component: ({ opacity, moveMode }) => {
    const [broadcastData, setBroadcastData] = useState<BroadcastEventPayload["data"] | null>(null)
    const [status, setStatus] = useState<string>("waiting")
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
      let unlisten: (() => void) | null = null
      let mounted = true

      const setupListener = async () => {
        try {
          unlisten = await listen<BroadcastEventPayload>("acc://broadcast", (event) => {
            if (!mounted) return
            setBroadcastData(event.payload?.data ?? null)
            setStatus(event.payload?.status ?? "waiting")
            setMessage(event.payload?.message ?? null)
          })
        } catch (error) {
          console.error("Failed to listen to ACC broadcast events in broadcast debug overlay:", error)
        }
      }

      void setupListener()

      return () => {
        mounted = false
        unlisten?.()
      }
    }, [])

    const getStatusColor = () => {
      switch (status) {
        case "ok":
          return "text-green-400"
        case "error":
          return "text-red-400"
        case "recovering":
          return "text-yellow-400"
        default:
          return "text-yellow-400"
      }
    }

    const handleCopy = async () => {
      if (!broadcastData) return
      try {
        const jsonString = JSON.stringify(broadcastData, null, 2)
        await navigator.clipboard.writeText(jsonString)
      } catch (error) {
        console.error("Failed to copy to clipboard:", error)
      }
    }

    return (
      <div
        className="h-full w-full overflow-y-auto rounded-lg border border-white/10 bg-black/85 p-3 text-[10px] font-mono text-white shadow-lg backdrop-blur"
        style={{ opacity: opacity / 100, cursor: moveMode ? "move" : "default" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Broadcast Debug
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-xs font-semibold ${getStatusColor()}`}>
              {status.toUpperCase()}
            </div>
            {broadcastData && (
              <button
                onClick={handleCopy}
                className="flex items-center justify-center rounded bg-white/10 p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                title="Copy JSON to clipboard"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {message && (
          <div className="mb-2 rounded bg-white/5 px-2 py-1 text-[9px] text-white/70">{message}</div>
        )}
        <div className="space-y-1.5">
          {broadcastData ? (
            <pre className="whitespace-pre-wrap break-words text-[9px] text-white/90">
              {JSON.stringify(broadcastData, null, 2)}
            </pre>
          ) : (
            <div className="text-white/50">Waiting for broadcast data...</div>
          )}
        </div>
      </div>
    )
  },
}

export default BroadcastDebugOverlay

