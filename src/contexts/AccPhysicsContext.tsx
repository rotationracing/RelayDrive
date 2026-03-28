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

const PHYSICS_EVENT = "acc://physics";

export type PhysicsStatus = "ok" | "waiting" | "error";

export interface PhysicsMap {
  packet_id?: number;
  speed_kmh?: number;
  rpm?: number;
  gear?: number;
  [key: string]: unknown;
}

interface PhysicsEventPayload {
  timestamp?: number | string;
  status?: PhysicsStatus | string;
  data?: PhysicsMap | null;
  message?: string | null;
}

export interface PhysicsFrame {
  timestamp: number;
  status: PhysicsStatus;
  data: PhysicsMap | null;
  message: string | null;
}

interface PhysicsContextValue {
  frame: PhysicsFrame | null;
  lastOkFrame: PhysicsFrame | null;
  status: PhysicsStatus;
}

const AccPhysicsContext = createContext<PhysicsContextValue | undefined>(undefined);

export function AccPhysicsProvider({ children }: { children: ReactNode }) {
  const { isRunning } = useProcess();

  const [frame, setFrame] = useState<PhysicsFrame | null>(null);
  const [lastOkFrame, setLastOkFrame] = useState<PhysicsFrame | null>(null);
  const [status, setStatus] = useState<PhysicsStatus>("waiting");

  const latestRef = useRef<PhysicsFrame | null>(null);
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
        unlisten = await listen<PhysicsEventPayload>(PHYSICS_EVENT, (event) => {
          if (!mountedRef.current) {
            return;
          }

          const normalized = normalizePhysicsPayload(event.payload);

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
        console.warn("Failed to subscribe to ACC physics events", error);
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

  return <AccPhysicsContext.Provider value={value}>{children}</AccPhysicsContext.Provider>;
}

export function useAccPhysics(): PhysicsContextValue {
  const context = useContext(AccPhysicsContext);
  if (!context) {
    throw new Error("useAccPhysics must be used within an AccPhysicsProvider");
  }
  return context;
}

function normalizePhysicsPayload(
  payload: PhysicsEventPayload | null | undefined,
): PhysicsFrame | null {
  if (!payload) {
    return null;
  }

  const timestampValue =
    typeof payload.timestamp === "string" ? Number(payload.timestamp) : payload.timestamp;
  const timestamp =
    Number.isFinite(timestampValue) && timestampValue !== null
      ? Number(timestampValue)
      : Date.now();

  const status: PhysicsStatus = isPhysicsStatus(payload.status) ? payload.status : "waiting";
  const data = payload.data && typeof payload.data === "object" ? payload.data : null;
  const message = payload.message ?? null;

  return {
    timestamp,
    status,
    data,
    message,
  };
}

function isPhysicsStatus(value: unknown): value is PhysicsStatus {
  return value === "ok" || value === "waiting" || value === "error";
}
