"use client";

import { type UnlistenFn, listen } from "@tauri-apps/api/event";
import { Timer } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { OverlayModule } from "../types";

interface GraphicsEventPayload {
  data?: {
    delta_lap_time_str?: string;
    delta_lap_time?: number;
    is_delta_positive?: boolean;
    last_time_str?: string;
    completed_lap?: number;
  } | null;
}

const DeltaBarOverlay: OverlayModule = {
  id: "delta",
  title: "Delta Bar",
  description: "Live delta time visualization",
  icon: Timer,
  defaultPosition: { x: 360, y: 240 },
  defaultSize: 100,
  defaultOpacity: 100,
  baseDimensions: { width: 520, height: 32 }, // component height matches bar height
  componentSettings: {
    width: {
      id: "width",
      label: "Width",
      description: "Component width in pixels",
      type: "slider",
      min: 200,
      max: 1000,
      step: 10,
      defaultValue: 520,
      unit: "px",
      category: "Basic",
    },
    height: {
      id: "height",
      label: "Height",
      description: "Component height in pixels",
      type: "slider",
      min: 20,
      max: 200,
      step: 2,
      defaultValue: 32,
      unit: "px",
      category: "Basic",
    },
    fontSize: {
      id: "fontSize",
      label: "Font Size",
      description: "Text font size",
      type: "slider",
      min: 10,
      max: 48,
      step: 1,
      defaultValue: 24,
      unit: "px",
      category: "Basic",
    },
    leftAligned: {
      id: "leftAligned",
      label: "Left Aligned",
      description: "Align delta bar from left edge instead of center",
      type: "switch",
      defaultValue: false,
      category: "Behavior",
    },
    textAlignment: {
      id: "textAlignment",
      label: "Text Alignment",
      description: "Horizontal alignment of the delta text",
      type: "select",
      defaultValue: "middle",
      options: [
        { label: "Left", value: "left" },
        { label: "Middle", value: "middle" },
        { label: "Right", value: "right" },
      ],
      category: "Behavior",
    },
    textPosition: {
      id: "textPosition",
      label: "Text Position",
      description: "Vertical position of the delta text relative to the bar",
      type: "select",
      defaultValue: "inside",
      options: [
        { label: "Above", value: "above" },
        { label: "Inside", value: "inside" },
        { label: "Under", value: "under" },
      ],
      category: "Behavior",
    },
    positiveBarColor: {
      id: "positiveBarColor",
      label: "Positive Bar Color",
      description: "Color for the bar when faster (negative delta)",
      type: "color",
      defaultValue: [16, 185, 129, 0.9] as [number, number, number, number],
      category: "Appearance",
    },
    negativeBarColor: {
      id: "negativeBarColor",
      label: "Negative Bar Color",
      description: "Color for the bar when slower (positive delta)",
      type: "color",
      defaultValue: [239, 68, 68, 0.9] as [number, number, number, number],
      category: "Appearance",
    },
    positiveTextColor: {
      id: "positiveTextColor",
      label: "Positive Text Color",
      description: "Text color when faster (negative delta)",
      type: "color",
      defaultValue: [52, 211, 153, 1] as [number, number, number, number], // emerald-400
      category: "Appearance",
    },
    negativeTextColor: {
      id: "negativeTextColor",
      label: "Negative Text Color",
      description: "Text color when slower (positive delta)",
      type: "color",
      defaultValue: [248, 113, 113, 1] as [number, number, number, number], // red-400
      category: "Appearance",
    },
    backgroundColor: {
      id: "backgroundColor",
      label: "Background Color",
      description: "Background color of the delta bar",
      type: "color",
      defaultValue: [0, 0, 0, 0.8] as [number, number, number, number],
      category: "Appearance",
    },
    showLapTimeOnFinish: {
      id: "showLapTimeOnFinish",
      label: "Show Lap Time on Finish",
      description: "Display the last lap time when crossing the finish line",
      type: "switch",
      defaultValue: true,
      category: "Behavior",
    },
    lapTimeDisplayDuration: {
      id: "lapTimeDisplayDuration",
      label: "Lap Time Display Duration",
      description: "How long to show the lap time after crossing the finish line",
      type: "slider",
      min: 500,
      max: 10000,
      step: 100,
      defaultValue: 2000,
      unit: "ms",
      category: "Behavior",
    },
  },
  Component: ({ opacity, moveMode, componentSettings }) => {
    const [deltaTime, setDeltaTime] = useState<number | null>(null);
    const [deltaString, setDeltaString] = useState<string>("+0.000");
    const [isPositiveFlag, setIsPositiveFlag] = useState<boolean | null>(null);
    const [showLapTime, setShowLapTime] = useState(false);
    const [lapTimeString, setLapTimeString] = useState<string>("");
    const completedLapsRef = useRef<number>(0);

    useEffect(() => {
      let unlisten: UnlistenFn | null = null;
      let mounted = true;
      let lapTimeTimeout: ReturnType<typeof setTimeout> | null = null;

      // Read settings inside useEffect to access latest values
      const showLapTimeOnFinish = (componentSettings?.showLapTimeOnFinish as boolean) ?? true;
      const lapTimeDisplayDuration = (componentSettings?.lapTimeDisplayDuration as number) ?? 2000;

      const setupListener = async () => {
        try {
          unlisten = await listen<GraphicsEventPayload>("acc://graphics", (event) => {
            if (!mounted) return;
            const data = event.payload?.data;
            if (data) {
              // Detect lap completion
              if (data.completed_lap !== undefined && data.completed_lap !== null) {
                if (data.completed_lap > completedLapsRef.current) {
                  // Lap just completed
                  completedLapsRef.current = data.completed_lap;
                  if (data.last_time_str && showLapTimeOnFinish) {
                    setLapTimeString(data.last_time_str);
                    setShowLapTime(true);
                    // Clear any existing timeout
                    if (lapTimeTimeout) {
                      clearTimeout(lapTimeTimeout);
                    }
                    // Hide lap time after configured duration
                    lapTimeTimeout = setTimeout(() => {
                      if (mounted) {
                        setShowLapTime(false);
                      }
                    }, lapTimeDisplayDuration);
                  }
                }
              }

              if (data.delta_lap_time !== undefined && data.delta_lap_time !== null) {
                const deltaSeconds = data.delta_lap_time / 1000;
                setDeltaTime(deltaSeconds);
              }
              if (data.delta_lap_time_str) setDeltaString(data.delta_lap_time_str);
              if (data.is_delta_positive !== undefined) setIsPositiveFlag(data.is_delta_positive);
            }
          });
        } catch (error) {
          console.error("Failed to listen to ACC graphics events in delta bar:", error);
        }
      };

      void setupListener();
      return () => {
        mounted = false;
        if (lapTimeTimeout) {
          clearTimeout(lapTimeTimeout);
        }
        unlisten?.();
      };
    }, [componentSettings?.showLapTimeOnFinish, componentSettings?.lapTimeDisplayDuration]);

    const dt = deltaTime ?? 0;
    const isSlower = dt > 0; // slower = red (positive), faster = green (negative)

    // smoother scaling (no hard max)
    const sensitivity = 1.0;
    const scaled = Math.atan(Math.abs(dt) * sensitivity) / (Math.PI / 2);

    const leftAligned = (componentSettings?.leftAligned as boolean) ?? false;
    const textAlignment = (componentSettings?.textAlignment as string) ?? "middle";
    const textPosition = (componentSettings?.textPosition as string) ?? "inside";
    const centerGapPx = 10;
    const barHeight = (componentSettings?.height as number) ?? 32;
    const barWidth = (componentSettings?.width as number) ?? 520;
    const fontSize = (componentSettings?.fontSize as number) ?? 24;
    const radius = 6;

    // Calculate fill percentage based on alignment
    const fillPct = leftAligned ? scaled * 100 : scaled * 50; // max full width for left-aligned, half width each side for center

    // Get colors from settings with defaults
    const positiveBarColor = (componentSettings?.positiveBarColor as [
      number,
      number,
      number,
      number,
    ]) ?? [16, 185, 129, 0.9];
    const negativeBarColor = (componentSettings?.negativeBarColor as [
      number,
      number,
      number,
      number,
    ]) ?? [239, 68, 68, 0.9];
    const positiveTextColor = (componentSettings?.positiveTextColor as [
      number,
      number,
      number,
      number,
    ]) ?? [52, 211, 153, 1];
    const negativeTextColor = (componentSettings?.negativeTextColor as [
      number,
      number,
      number,
      number,
    ]) ?? [248, 113, 113, 1];
    const backgroundColor = (componentSettings?.backgroundColor as [
      number,
      number,
      number,
      number,
    ]) ?? [0, 0, 0, 0.8];

    // Convert color arrays to rgba strings
    const rgba = (color: [number, number, number, number]) =>
      `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
    const rgb = (color: [number, number, number, number]) =>
      `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

    // Create gradient colors with fade
    const positiveBarColorFaded = [
      positiveBarColor[0],
      positiveBarColor[1],
      positiveBarColor[2],
      positiveBarColor[3] * 0.78,
    ] as [number, number, number, number];
    const negativeBarColorFaded = [
      negativeBarColor[0],
      negativeBarColor[1],
      negativeBarColor[2],
      negativeBarColor[3] * 0.78,
    ] as [number, number, number, number];

    const displayNumeric =
      deltaTime !== null ? `${dt < 0 ? "-" : "+"}${Math.abs(dt).toFixed(3)}` : deltaString;

    const textColor = isSlower ? rgb(negativeTextColor) : rgb(positiveTextColor);

    // Render text component
    const renderText = () => (
      <div
        className={`flex w-full items-center px-2 ${
          textAlignment === "left"
            ? "justify-start"
            : textAlignment === "right"
              ? "justify-end"
              : "justify-center"
        }`}
        style={{ height: textPosition === "inside" ? barHeight : "auto" }}
      >
        {showLapTime ? (
          <span
            className="text-white font-bold tabular-nums drop-shadow-[0_1px_5px_rgba(0,0,0,0.85)]"
            style={{ fontSize: `${fontSize}px` }}
          >
            {lapTimeString}
          </span>
        ) : (
          <span
            className="font-bold tabular-nums drop-shadow-[0_1px_5px_rgba(0,0,0,0.85)]"
            style={{ fontSize: `${fontSize}px`, color: textColor }}
          >
            {displayNumeric}
          </span>
        )}
      </div>
    );

    // Calculate total height including text when above/below
    // mb-1/mt-1 adds 4px, text needs fontSize * 1.2 for line-height, plus some padding
    const textSpacing = textPosition !== "inside" ? 4 : 0; // mb-1 or mt-1 = 4px
    const textLineHeight = textPosition !== "inside" ? fontSize * 1.2 : 0; // Account for line-height
    const textHeight = textPosition !== "inside" ? textLineHeight + textSpacing + 8 : 0; // line-height + spacing + extra padding
    const totalHeight = textPosition === "inside" ? barHeight : barHeight + textHeight;

    return (
      <div
        className="flex flex-col items-start overflow-visible"
        style={{ width: barWidth, minHeight: totalHeight }}
      >
        {/* Text above bar */}
        {textPosition === "above" && (
          <div className="w-full mb-1 flex-shrink-0">{renderText()}</div>
        )}

        {/* Bar container */}
        <div
          className="relative flex w-full items-center justify-center overflow-hidden flex-shrink-0"
          style={{
            width: barWidth,
            height: barHeight,
            minHeight: barHeight,
            maxHeight: barHeight,
            cursor: moveMode ? "move" : "default",
            borderRadius: radius,
          }}
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background: rgba(backgroundColor),
              borderRadius: radius,
            }}
          />

          {/* Center line - only show when not showing lap time and center-aligned */}
          {!showLapTime && !leftAligned && (
            <div
              className="absolute"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                top: 0,
                bottom: 0,
                width: 2,
                background: "rgba(0,0,0,0.6)",
              }}
            />
          )}

          {/* Left-aligned layout */}
          {!showLapTime && leftAligned && (
            <>
              {/* Green (faster) bar - extends right from left edge */}
              {dt < 0 && (
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${fillPct}%`,
                    borderTopRightRadius: radius,
                    borderBottomRightRadius: radius,
                    background: `linear-gradient(270deg, ${rgba(positiveBarColor)} 0%, ${rgba(positiveBarColorFaded)} 35%, rgba(0,0,0,0.0) 100%)`,
                    transition: "width 160ms ease-out",
                  }}
                />
              )}
              {/* Red (slower) bar - extends right from left edge */}
              {dt > 0 && (
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${fillPct}%`,
                    borderTopRightRadius: radius,
                    borderBottomRightRadius: radius,
                    background: `linear-gradient(270deg, ${rgba(negativeBarColor)} 0%, ${rgba(negativeBarColorFaded)} 35%, rgba(0,0,0,0.0) 100%)`,
                    transition: "width 160ms ease-out",
                  }}
                />
              )}
            </>
          )}

          {/* Center-aligned layout */}
          {!showLapTime && !leftAligned && (
            <>
              {/* Green (faster) bar - only show when not showing lap time */}
              {dt < 0 && (
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: `calc(50% + ${centerGapPx}px)`,
                    width: `${fillPct}%`,
                    borderTopRightRadius: radius,
                    borderBottomRightRadius: radius,
                    background: `linear-gradient(270deg, ${rgba(positiveBarColor)} 0%, ${rgba(positiveBarColorFaded)} 35%, rgba(0,0,0,0.0) 100%)`,
                    transition: "width 160ms ease-out",
                  }}
                />
              )}

              {/* Red (slower) bar - only show when not showing lap time */}
              {dt > 0 && (
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    bottom: 0,
                    right: `calc(50% + ${centerGapPx}px)`,
                    width: `${fillPct}%`,
                    borderTopLeftRadius: radius,
                    borderBottomLeftRadius: radius,
                    background: `linear-gradient(90deg, ${rgba(negativeBarColor)} 0%, ${rgba(negativeBarColorFaded)} 35%, rgba(0,0,0,0.0) 100%)`,
                    transition: "width 160ms ease-out",
                  }}
                />
              )}
            </>
          )}

          {/* Text inside bar */}
          {textPosition === "inside" && (
            <div className="absolute inset-0 z-10 w-full flex items-center">{renderText()}</div>
          )}
        </div>

        {/* Text under bar */}
        {textPosition === "under" && (
          <div className="w-full mt-1 flex-shrink-0">{renderText()}</div>
        )}
      </div>
    );
  },
};

export default DeltaBarOverlay;
