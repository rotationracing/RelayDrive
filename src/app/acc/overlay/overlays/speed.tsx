"use client";

import { listen } from "@tauri-apps/api/event";
import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import type { OverlayModule } from "../types";

interface PhysicsEventPayload {
  timestamp?: number | string;
  status?: string;
  data?: {
    speed_kmh?: number;
    rpm?: number;
    gear?: number;
    [key: string]: unknown;
  } | null;
  message?: string | null;
}

const SpeedOverlay: OverlayModule = {
  id: "speed",
  title: "Speed",
  description: "Speed, RPM, and gear",
  icon: Gauge,
  defaultPosition: { x: 60, y: 60 },
  defaultSize: 100,
  defaultOpacity: 92,
  baseDimensions: { width: 420, height: 100 },
  Component: ({ opacity, moveMode }) => {
    const [speed, setSpeed] = useState<number | null>(null);
    const [rpm, setRpm] = useState<number | null>(null);
    const [gear, setGear] = useState<number | null>(null);

    useEffect(() => {
      let unlisten: (() => void) | null = null;
      let mounted = true;

      const setupListener = async () => {
        try {
          unlisten = await listen<PhysicsEventPayload>("acc://physics", (event) => {
            if (!mounted) return;
            const data = event.payload?.data;
            if (data) {
              if (data.speed_kmh !== undefined && data.speed_kmh !== null) {
                setSpeed(data.speed_kmh);
              }
              if (data.rpm !== undefined && data.rpm !== null) {
                setRpm(data.rpm);
              }
              if (data.gear !== undefined && data.gear !== null) {
                setGear(data.gear);
              }
            }
          });
        } catch (error) {
          console.error("Failed to listen to ACC physics events in speed overlay:", error);
        }
      };

      void setupListener();

      return () => {
        mounted = false;
        unlisten?.();
      };
    }, []);

    const displaySpeed = speed !== null ? Math.round(speed).toString().padStart(3, "0") : "000";
    const displayRpm = rpm !== null ? Math.round(rpm).toString() : "0";
    const rpmPercentage = rpm !== null && rpm > 0 ? Math.min((rpm / 8000) * 100, 100) : 0;

    // Gear mapping: 0 = Reverse, 1 = Neutral, 2+ = Forward gears (display as gear-1)
    const displayGear = (() => {
      if (gear === null) return "N";
      if (gear === 0) return "R";
      if (gear === 1) return "N";
      return (gear - 1).toString();
    })();

    return (
      <div
        className="flex h-full w-full flex-col justify-between rounded-2xl border border-white/10 bg-black/75 px-6 py-3 text-white shadow-[0_18px_36px_-12px_rgba(15,15,15,0.65)] backdrop-blur"
        style={{ opacity: opacity / 100, cursor: moveMode ? "move" : "default" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/55 mb-1">
          <span>Speed</span>
          <span>RPM</span>
          <span>Gear</span>
        </div>

        {/* Main content */}
        <div className="flex items-end justify-between gap-4">
          {/* Speed section */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold leading-none tabular-nums">
                {displaySpeed}
              </span>
              <span className="text-base text-white/55">km/h</span>
            </div>
          </div>

          {/* RPM section */}
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-semibold leading-none tabular-nums">{displayRpm}</span>
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-emerald-400/90 transition-all duration-150"
                    style={{ width: `${rpmPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Gear section */}
          <div className="flex flex-col items-center">
            <div className="text-5xl font-semibold leading-none tabular-nums">{displayGear}</div>
          </div>
        </div>
      </div>
    );
  },
};

export default SpeedOverlay;
