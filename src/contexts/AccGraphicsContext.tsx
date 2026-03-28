"use client";

import { type UnlistenFn, listen } from "@tauri-apps/api/event";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useProcess } from "./ProcessContext";

const GRAPHICS_EVENT = "acc://graphics";

export type GraphicsStatus = "ok" | "waiting" | "error";

export interface GraphicsMap {
  packet_id?: number;
  status?: number;
  session_type?: number;
  current_time?: number;
  last_time?: number;
  best_time?: number;
  position?: number;
  completed_lap?: number;
  [key: string]: unknown;
}

interface GraphicsEventPayload {
  timestamp?: number | string;
  status?: GraphicsStatus | string;
  data?: GraphicsMap | null;
  message?: string | null;
}

export interface GraphicsFrame {
  timestamp: number;
  status: GraphicsStatus;
  data: GraphicsMap | null;
  message: string | null;
}

interface GraphicsContextValue {
  frame: GraphicsFrame | null;
  lastOkFrame: GraphicsFrame | null;
  status: GraphicsStatus;
}

const AccGraphicsContext = createContext<GraphicsContextValue | undefined>(undefined);

export function AccGraphicsProvider({ children }: { children: ReactNode }) {
  const { isRunning } = useProcess();

  const [frame, setFrame] = useState<GraphicsFrame | null>(null);
  const [lastOkFrame, setLastOkFrame] = useState<GraphicsFrame | null>(null);
  const [status, setStatus] = useState<GraphicsStatus>("waiting");

  const latestRef = useRef<GraphicsFrame | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const runningRef = useRef(isRunning);

  useEffect(() => {
    runningRef.current = isRunning;
    if (!isRunning) {
      latestRef.current = null;
      setFrame(null);
      setLastOkFrame(null);
      setStatus("waiting");
    }
  }, [isRunning]);

  useEffect(() => {
    mountedRef.current = true;
    let unlisten: UnlistenFn | null = null;

    const commitLatest = () => {
      const next = latestRef.current;
      setFrame(next);
      setStatus(next?.status ?? "waiting");
      if (next?.status === "ok") {
        setLastOkFrame(next);
      }
    };

    const scheduleCommit = () => {
      if (!mountedRef.current) {
        return;
      }

      if (typeof window === "undefined") {
        commitLatest();
        return;
      }

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        if (!mountedRef.current) {
          return;
        }
        commitLatest();
      });
    };

    const setup = async () => {
      try {
        unlisten = await listen<GraphicsEventPayload>(GRAPHICS_EVENT, (event) => {
          if (!mountedRef.current) {
            return;
          }

          const normalized = normalizeGraphicsPayload(event.payload);

          if (!normalized) {
            latestRef.current = null;
            scheduleCommit();
            return;
          }

          if (!runningRef.current && normalized.status === "ok") {
            return;
          }

          latestRef.current = normalized;
          scheduleCommit();
        });
      } catch (error) {
        console.warn("Failed to subscribe to ACC graphics events", error);
      }
    };

    void setup();

    return () => {
      mountedRef.current = false;
      if (unlisten) {
        unlisten();
      }
      if (typeof window !== "undefined" && rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      frame,
      lastOkFrame,
      status,
    }),
    [frame, lastOkFrame, status],
  );

  return <AccGraphicsContext.Provider value={value}>{children}</AccGraphicsContext.Provider>;
}

export function useAccGraphics(): GraphicsContextValue {
  const context = useContext(AccGraphicsContext);
  if (!context) {
    throw new Error("useAccGraphics must be used within an AccGraphicsProvider");
  }
  return context;
}

function normalizeGraphicsPayload(
  payload: GraphicsEventPayload | null | undefined,
): GraphicsFrame | null {
  if (!payload) {
    return null;
  }

  const timestampValue =
    typeof payload.timestamp === "string" ? Number(payload.timestamp) : payload.timestamp;
  const timestamp =
    Number.isFinite(timestampValue) && timestampValue !== null
      ? Number(timestampValue)
      : Date.now();

  const status: GraphicsStatus = isGraphicsStatus(payload.status) ? payload.status : "waiting";
  const data = payload.data && typeof payload.data === "object" ? payload.data : null;
  const message = payload.message ?? null;

  return {
    timestamp,
    status,
    data,
    message,
  };
}

function isGraphicsStatus(value: unknown): value is GraphicsStatus {
  return value === "ok" || value === "waiting" || value === "error";
}
