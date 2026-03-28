"use client";

import { Thermometer } from "lucide-react";
import type { OverlayModule } from "../types";

const TempsOverlay: OverlayModule = {
  id: "temps",
  title: "Tire Temps",
  description: "Tire core and surface temperatures",
  icon: Thermometer,
  defaultEnabled: false,
  defaultPosition: { x: 720, y: 380 },
  defaultSize: 105,
  defaultOpacity: 75,
  baseDimensions: { width: 320, height: 180 },
  Component: ({ opacity, moveMode }) => (
    <div
      className="flex h-full w-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 px-6 py-5 text-white shadow-[0_22px_48px_-18px_rgba(15,15,15,0.68)] backdrop-blur"
      style={{ opacity: opacity / 100, cursor: moveMode ? "move" : "default" }}
    >
      <div className="text-xs uppercase tracking-[0.25em] text-white/55">Tire Temps</div>
      <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
        {[
          { label: "FL", core: "80°C", surface: "90°C" },
          { label: "FR", core: "80°C", surface: "89°C" },
          { label: "RL", core: "78°C", surface: "85°C" },
          { label: "RR", core: "77°C", surface: "84°C" },
        ].map((tire) => (
          <div key={tire.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/50">
              <span>{tire.label}</span>
              <span>Core</span>
            </div>
            <div className="mt-1 flex items-end justify-between text-base font-semibold tabular-nums">
              <span>{tire.core}</span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
                Surf {tire.surface}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export default TempsOverlay;
