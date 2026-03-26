"use client"

import { MapPin } from "lucide-react"
import type { OverlayModule } from "../types"

const MapOverlay: OverlayModule = {
  id: "map",
  title: "Track Map",
  description: "Track layout and car position",
  icon: MapPin,
  defaultEnabled: false,
  defaultPosition: { x: 720, y: 60 },
  defaultSize: 120,
  defaultOpacity: 80,
  baseDimensions: { width: 280, height: 280 },
  Component: ({ opacity, moveMode }) => (
    <div
      className="flex h-full w-full items-center justify-center rounded-3xl border border-white/10 bg-black/70 p-6 text-white shadow-[0_24px_56px_-18px_rgba(15,15,15,0.7)] backdrop-blur"
      style={{ opacity: opacity / 100, cursor: moveMode ? "move" : "default" }}
    >
      <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-white/25">
        <div className="absolute h-2/3 w-1 rounded-full bg-white/30" />
        <div className="absolute h-1 w-2/3 rounded-full bg-white/30" />
        <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
          <div className="h-3/5 w-3/5 rounded-full bg-white" />
        </div>
      </div>
    </div>
  ),
}

export default MapOverlay

