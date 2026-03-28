"use client";

import { listen } from "@tauri-apps/api/event";
import { Bug } from "lucide-react";
import { useEffect, useState } from "react";
import type { OverlayModule } from "../types";

interface Vector3f {
  x?: number;
  y?: number;
  z?: number;
}

interface PhysicsEventPayload {
  timestamp?: number | string;
  status?: string;
  data?: {
    packet_id?: number;
    // Driver Inputs
    gas?: number;
    brake?: number;
    clutch?: number;
    steer_angle?: number;
    gear?: number;
    rpm?: number;
    autoshifter_on?: boolean;
    ignition_on?: boolean;
    starter_engine_on?: boolean;
    is_engine_running?: boolean;
    // Car Dynamics & Motion
    speed_kmh?: number;
    velocity?: Vector3f;
    local_velocity?: Vector3f;
    local_angular_vel?: Vector3f;
    g_force?: Vector3f;
    heading?: number;
    pitch?: number;
    roll?: number;
    final_ff?: number;
    // Wheels & Tyres
    wheel_slip?: [number, number, number, number];
    wheel_pressure?: [number, number, number, number];
    wheel_angular_speed?: [number, number, number, number];
    tyre_core_temp?: [number, number, number, number];
    suspension_travel?: [number, number, number, number];
    brake_temp?: [number, number, number, number];
    brake_pressure?: [number, number, number, number];
    suspension_damage?: [number, number, number, number];
    slip_ratio?: [number, number, number, number];
    slip_angle?: [number, number, number, number];
    pad_life?: [number, number, number, number];
    disc_life?: [number, number, number, number];
    front_brake_compound?: number;
    rear_brake_compound?: number;
    tyre_contact_point?: [Vector3f, Vector3f, Vector3f, Vector3f];
    tyre_contact_normal?: [Vector3f, Vector3f, Vector3f, Vector3f];
    tyre_contact_heading?: [Vector3f, Vector3f, Vector3f, Vector3f];
    // Car Status
    fuel?: number;
    tc?: number;
    abs?: number;
    pit_limiter_on?: boolean;
    turbo_boost?: number;
    air_temp?: number;
    road_temp?: number;
    water_temp?: number;
    is_ai_controlled?: boolean;
    brake_bias?: number;
    // Car Damage
    damage_front?: number;
    damage_rear?: number;
    damage_left?: number;
    damage_right?: number;
    damage_centre?: number;
    // Vibration Feedback
    kerb_vibration?: number;
    slip_vibration?: number;
    g_vibration?: number;
    abs_vibration?: number;
    [key: string]: unknown;
  } | null;
  message?: string | null;
}

const DebugOverlay: OverlayModule = {
  id: "debug",
  title: "Debug",
  description: "Complete physics telemetry debug overlay",
  icon: Bug,
  defaultPosition: { x: 100, y: 100 },
  defaultSize: 100,
  defaultOpacity: 90,
  baseDimensions: { width: 600, height: 800 },
  Component: ({ opacity, moveMode }) => {
    const [physicsData, setPhysicsData] = useState<PhysicsEventPayload["data"] | null>(null);

    useEffect(() => {
      let unlisten: (() => void) | null = null;
      let mounted = true;

      const setupListener = async () => {
        try {
          unlisten = await listen<PhysicsEventPayload>("acc://physics", (event) => {
            if (!mounted) return;
            setPhysicsData(event.payload?.data ?? null);
          });
        } catch (error) {
          console.error("Failed to listen to ACC physics events in debug overlay:", error);
        }
      };

      void setupListener();

      return () => {
        mounted = false;
        unlisten?.();
      };
    }, []);

    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) return "null";
      if (typeof value === "boolean") return value ? "true" : "false";
      if (typeof value === "number") {
        if (Number.isInteger(value)) return value.toString();
        return value.toFixed(2);
      }
      if (Array.isArray(value)) {
        return `[${value.map(formatValue).join(", ")}]`;
      }
      if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        return `{${Object.entries(obj)
          .map(([k, v]) => `${k}:${formatValue(v)}`)
          .join(", ")}}`;
      }
      return String(value);
    };

    const formatWheelArray = (
      arr: [number, number, number, number] | undefined,
      unit = "",
    ): string => {
      if (!arr || !Array.isArray(arr)) return "null";
      return `FL:${formatValue(arr[0])}${unit} FR:${formatValue(arr[1])}${unit} RL:${formatValue(arr[2])}${unit} RR:${formatValue(arr[3])}${unit}`;
    };

    const formatVector3f = (vec: Vector3f | undefined): string => {
      if (!vec) return "null";
      return `x:${formatValue(vec.x)} y:${formatValue(vec.y)} z:${formatValue(vec.z)}`;
    };

    return (
      <div
        className="h-full w-full overflow-y-auto rounded-lg border border-white/10 bg-black/85 p-3 text-[10px] font-mono text-white shadow-lg backdrop-blur"
        style={{ opacity: opacity / 100, cursor: moveMode ? "move" : "default" }}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">
          Physics Debug
        </div>
        <div className="space-y-1.5">
          {physicsData ? (
            <>
              {/* Metadata */}
              <div className="text-white/90">
                <span className="text-white/50">packet_id:</span>{" "}
                {formatValue(physicsData.packet_id)}
              </div>

              {/* Driver Inputs */}
              <div className="mt-2 border-t border-white/10 pt-1.5">
                <div className="mb-1 text-[9px] font-semibold uppercase text-white/60">
                  Driver Inputs
                </div>
                <div className="space-y-0.5 text-white/80">
                  <div>
                    <span className="text-white/50">gas:</span> {formatValue(physicsData.gas)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">brake:</span> {formatValue(physicsData.brake)}{" "}
                    (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">clutch:</span> {formatValue(physicsData.clutch)}{" "}
                    (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">steer_angle:</span>{" "}
                    {formatValue(physicsData.steer_angle)}°
                  </div>
                  <div>
                    <span className="text-white/50">gear:</span> {formatValue(physicsData.gear)}
                  </div>
                  <div>
                    <span className="text-white/50">rpm:</span> {formatValue(physicsData.rpm)}
                  </div>
                  <div>
                    <span className="text-white/50">autoshifter_on:</span>{" "}
                    {formatValue(physicsData.autoshifter_on)}
                  </div>
                  <div>
                    <span className="text-white/50">ignition_on:</span>{" "}
                    {formatValue(physicsData.ignition_on)}
                  </div>
                  <div>
                    <span className="text-white/50">starter_engine_on:</span>{" "}
                    {formatValue(physicsData.starter_engine_on)}
                  </div>
                  <div>
                    <span className="text-white/50">is_engine_running:</span>{" "}
                    {formatValue(physicsData.is_engine_running)}
                  </div>
                </div>
              </div>

              {/* Car Dynamics & Motion */}
              <div className="mt-2 border-t border-white/10 pt-1.5">
                <div className="mb-1 text-[9px] font-semibold uppercase text-white/60">
                  Car Dynamics
                </div>
                <div className="space-y-0.5 text-white/80">
                  <div>
                    <span className="text-white/50">speed_kmh:</span>{" "}
                    {formatValue(physicsData.speed_kmh)} km/h
                  </div>
                  <div>
                    <span className="text-white/50">velocity:</span>{" "}
                    {formatVector3f(physicsData.velocity)} m/s
                  </div>
                  <div>
                    <span className="text-white/50">local_velocity:</span>{" "}
                    {formatVector3f(physicsData.local_velocity)} m/s
                  </div>
                  <div>
                    <span className="text-white/50">local_angular_vel:</span>{" "}
                    {formatVector3f(physicsData.local_angular_vel)} rad/s
                  </div>
                  <div>
                    <span className="text-white/50">g_force:</span>{" "}
                    {formatVector3f(physicsData.g_force)} g
                  </div>
                  <div>
                    <span className="text-white/50">heading:</span>{" "}
                    {formatValue(physicsData.heading)} rad
                  </div>
                  <div>
                    <span className="text-white/50">pitch:</span> {formatValue(physicsData.pitch)}{" "}
                    rad
                  </div>
                  <div>
                    <span className="text-white/50">roll:</span> {formatValue(physicsData.roll)} rad
                  </div>
                  <div>
                    <span className="text-white/50">final_ff:</span>{" "}
                    {formatValue(physicsData.final_ff)}
                  </div>
                </div>
              </div>

              {/* Wheels & Tyres */}
              <div className="mt-2 border-t border-white/10 pt-1.5">
                <div className="mb-1 text-[9px] font-semibold uppercase text-white/60">
                  Wheels & Tyres
                </div>
                <div className="space-y-0.5 text-white/80">
                  <div>
                    <span className="text-white/50">wheel_slip:</span>{" "}
                    {formatWheelArray(physicsData.wheel_slip)}
                  </div>
                  <div>
                    <span className="text-white/50">wheel_pressure:</span>{" "}
                    {formatWheelArray(physicsData.wheel_pressure, "psi")}
                  </div>
                  <div>
                    <span className="text-white/50">wheel_angular_speed:</span>{" "}
                    {formatWheelArray(physicsData.wheel_angular_speed, "rad/s")}
                  </div>
                  <div>
                    <span className="text-white/50">tyre_core_temp:</span>{" "}
                    {formatWheelArray(physicsData.tyre_core_temp, "°C")}
                  </div>
                  <div>
                    <span className="text-white/50">suspension_travel:</span>{" "}
                    {formatWheelArray(physicsData.suspension_travel, "mm")}
                  </div>
                  <div>
                    <span className="text-white/50">brake_temp:</span>{" "}
                    {formatWheelArray(physicsData.brake_temp, "°C")}
                  </div>
                  <div>
                    <span className="text-white/50">brake_pressure:</span>{" "}
                    {formatWheelArray(physicsData.brake_pressure, "bar")}
                  </div>
                  <div>
                    <span className="text-white/50">suspension_damage:</span>{" "}
                    {formatWheelArray(physicsData.suspension_damage)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">slip_ratio:</span>{" "}
                    {formatWheelArray(physicsData.slip_ratio)}
                  </div>
                  <div>
                    <span className="text-white/50">slip_angle:</span>{" "}
                    {formatWheelArray(physicsData.slip_angle, "°")}
                  </div>
                  <div>
                    <span className="text-white/50">pad_life:</span>{" "}
                    {formatWheelArray(physicsData.pad_life, "%")}
                  </div>
                  <div>
                    <span className="text-white/50">disc_life:</span>{" "}
                    {formatWheelArray(physicsData.disc_life, "%")}
                  </div>
                  <div>
                    <span className="text-white/50">front_brake_compound:</span>{" "}
                    {formatValue(physicsData.front_brake_compound)}
                  </div>
                  <div>
                    <span className="text-white/50">rear_brake_compound:</span>{" "}
                    {formatValue(physicsData.rear_brake_compound)}
                  </div>
                  {Array.isArray(physicsData.tyre_contact_point) && (
                    <div>
                      <span className="text-white/50">tyre_contact_point:</span>{" "}
                      {physicsData.tyre_contact_point.map((vec, i) => (
                        <span key={i} className="ml-2">
                          {["FL", "FR", "RL", "RR"][i]}:{formatVector3f(vec)}
                        </span>
                      ))}
                    </div>
                  )}
                  {Array.isArray(physicsData.tyre_contact_normal) && (
                    <div>
                      <span className="text-white/50">tyre_contact_normal:</span>{" "}
                      {physicsData.tyre_contact_normal.map((vec, i) => (
                        <span key={i} className="ml-2">
                          {["FL", "FR", "RL", "RR"][i]}:{formatVector3f(vec)}
                        </span>
                      ))}
                    </div>
                  )}
                  {Array.isArray(physicsData.tyre_contact_heading) && (
                    <div>
                      <span className="text-white/50">tyre_contact_heading:</span>{" "}
                      {physicsData.tyre_contact_heading.map((vec, i) => (
                        <span key={i} className="ml-2">
                          {["FL", "FR", "RL", "RR"][i]}:{formatVector3f(vec)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Car Status */}
              <div className="mt-2 border-t border-white/10 pt-1.5">
                <div className="mb-1 text-[9px] font-semibold uppercase text-white/60">
                  Car Status
                </div>
                <div className="space-y-0.5 text-white/80">
                  <div>
                    <span className="text-white/50">fuel:</span> {formatValue(physicsData.fuel)} L
                  </div>
                  <div>
                    <span className="text-white/50">tc:</span> {formatValue(physicsData.tc)}%
                  </div>
                  <div>
                    <span className="text-white/50">abs:</span> {formatValue(physicsData.abs)}%
                  </div>
                  <div>
                    <span className="text-white/50">pit_limiter_on:</span>{" "}
                    {formatValue(physicsData.pit_limiter_on)}
                  </div>
                  <div>
                    <span className="text-white/50">turbo_boost:</span>{" "}
                    {formatValue(physicsData.turbo_boost)} bar
                  </div>
                  <div>
                    <span className="text-white/50">air_temp:</span>{" "}
                    {formatValue(physicsData.air_temp)}°C
                  </div>
                  <div>
                    <span className="text-white/50">road_temp:</span>{" "}
                    {formatValue(physicsData.road_temp)}°C
                  </div>
                  <div>
                    <span className="text-white/50">water_temp:</span>{" "}
                    {formatValue(physicsData.water_temp)}°C
                  </div>
                  <div>
                    <span className="text-white/50">is_ai_controlled:</span>{" "}
                    {formatValue(physicsData.is_ai_controlled)}
                  </div>
                  <div>
                    <span className="text-white/50">brake_bias:</span>{" "}
                    {formatValue(physicsData.brake_bias)}%
                  </div>
                </div>
              </div>

              {/* Car Damage */}
              <div className="mt-2 border-t border-white/10 pt-1.5">
                <div className="mb-1 text-[9px] font-semibold uppercase text-white/60">
                  Car Damage
                </div>
                <div className="space-y-0.5 text-white/80">
                  <div>
                    <span className="text-white/50">damage_front:</span>{" "}
                    {formatValue(physicsData.damage_front)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">damage_rear:</span>{" "}
                    {formatValue(physicsData.damage_rear)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">damage_left:</span>{" "}
                    {formatValue(physicsData.damage_left)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">damage_right:</span>{" "}
                    {formatValue(physicsData.damage_right)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">damage_centre:</span>{" "}
                    {formatValue(physicsData.damage_centre)} (0-1)
                  </div>
                </div>
              </div>

              {/* Vibration Feedback */}
              <div className="mt-2 border-t border-white/10 pt-1.5">
                <div className="mb-1 text-[9px] font-semibold uppercase text-white/60">
                  Vibration
                </div>
                <div className="space-y-0.5 text-white/80">
                  <div>
                    <span className="text-white/50">kerb_vibration:</span>{" "}
                    {formatValue(physicsData.kerb_vibration)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">slip_vibration:</span>{" "}
                    {formatValue(physicsData.slip_vibration)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">g_vibration:</span>{" "}
                    {formatValue(physicsData.g_vibration)} (0-1)
                  </div>
                  <div>
                    <span className="text-white/50">abs_vibration:</span>{" "}
                    {formatValue(physicsData.abs_vibration)} (0-1)
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-white/50">Waiting for physics data...</div>
          )}
        </div>
      </div>
    );
  },
};

export default DebugOverlay;
