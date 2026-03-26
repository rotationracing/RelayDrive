"use client"

import { type UnlistenFn, listen } from "@tauri-apps/api/event"
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useProcess } from "./ProcessContext"

const BROADCAST_EVENT = "acc://broadcast"

export type BroadcastStatus = "ok" | "waiting" | "error"

// Based on acbc crate message types
export interface BroadcastMap {
  // Registration result
  RegistrationResult?: {
    connection_id: number
    success: boolean
    is_readonly: boolean
    error_msg?: string
  }

  // Realtime Update - contains session and car data
  RealtimeUpdate?: {
    event_index: number
    session_index: number
    session_type: string
    phase: string
    session_time: number
    session_end_time: number
    focused_car_index: number
    active_camera_set: string
    active_camera: string
    current_hud_page: string
    is_replay_playing: boolean
    replay_session_time?: number
    replay_remaining_time?: number
    time_of_day: number
    ambient_temp: number
    track_temp: number
    clouds: number
    rain_level: number
    wetness: number
    best_session_lap?: {
      lap_time_ms: number
      car_index: number
      driver_index: number
      splits?: number[]
      is_invalid: boolean
      is_valid_for_best: boolean
      is_out_lap: boolean
      is_in_lap: boolean
    }
  }

  // Realtime Car Update - individual car data
  RealtimeCarUpdate?: {
    car_index: number
    driver_index: number
    driver_count: number
    gear: number
    world_pos_x: number
    world_pos_y: number
    yaw: number
    car_location: string
    kmh: number
    position: number
    cup_position: number
    track_position: number
    spline_position: number
    lap_count: number
    delta: number
    best_session_lap?: {
      lap_time_ms: number
      splits?: number[]
      is_invalid: boolean
      is_valid_for_best: boolean
      is_out_lap: boolean
      is_in_lap: boolean
    }
    last_lap?: {
      lap_time_ms: number
      splits?: number[]
      is_invalid: boolean
      is_valid_for_best: boolean
      is_out_lap: boolean
      is_in_lap: boolean
    }
    current_lap?: {
      lap_time_ms: number
      splits?: number[]
      is_invalid: boolean
      is_valid_for_best: boolean
      is_out_lap: boolean
      is_in_lap: boolean
    }
  }

  // Entry List - information about cars in the session
  EntryList?: {
    connection_id: number
    entries: Array<{
      car_index: number
      car_model_type: number
      team_name: string
      race_number: number
      cup_category: number
      current_driver_index: number
      nationality: number
      drivers: Array<{
        first_name: string
        last_name: string
        short_name: string
        category: number
        nationality: number
      }>
    }>
  }

  // Entry List Car - single car entry update
  EntryListCar?: {
    car_index: number
    car_model_type: number
    team_name: string
    race_number: number
    cup_category: number
    current_driver_index: number
    nationality: number
    drivers: Array<{
      first_name: string
      last_name: string
      short_name: string
      category: number
      nationality: number
    }>
  }

  // Track Data
  TrackData?: {
    connection_id: number
    track_name: string
    track_id: number
    track_meters: number
    camera_sets: Record<string, string[]>
    hud_pages: string[]
  }

  // Broadcasting Event
  BroadcastingEvent?: {
    event_type: string
    msg: string
    time_ms: number
    car_index: number
  }

  [key: string]: unknown
}

interface BroadcastEventPayload {
  timestamp?: number | string
  status?: BroadcastStatus | string
  data?: BroadcastMap | null
  message?: string | null
}

export interface BroadcastFrame {
  timestamp: number
  status: BroadcastStatus
  data: BroadcastMap | null
  message: string | null
}

interface BroadcastContextValue {
  frame: BroadcastFrame | null
  lastOkFrame: BroadcastFrame | null
  status: BroadcastStatus
}

const AccBroadcastContext = createContext<BroadcastContextValue | undefined>(undefined)

export function AccBroadcastProvider({ children }: { children: ReactNode }) {
  const { isRunning } = useProcess()

  const [frame, setFrame] = useState<BroadcastFrame | null>(null)
  const [lastOkFrame, setLastOkFrame] = useState<BroadcastFrame | null>(null)
  const [status, setStatus] = useState<BroadcastStatus>("waiting")

  const latestRef = useRef<BroadcastFrame | null>(null)
  const rafRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const runningRef = useRef(isRunning)

  useEffect(() => {
    runningRef.current = isRunning
    if (!isRunning) {
      latestRef.current = null
      setFrame(null)
      setLastOkFrame(null)
      setStatus("waiting")
    }
  }, [isRunning])

  useEffect(() => {
    mountedRef.current = true
    let unlisten: UnlistenFn | null = null

    const commitLatest = () => {
      const next = latestRef.current
      setFrame(next)
      setStatus(next?.status ?? "waiting")
      if (next?.status === "ok") {
        setLastOkFrame(next)
      }
    }

    const scheduleCommit = () => {
      if (!mountedRef.current) {
        return
      }

      if (typeof window === "undefined") {
        commitLatest()
        return
      }

      if (rafRef.current !== null) {
        return
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        if (!mountedRef.current) {
          return
        }
        commitLatest()
      })
    }

    const setup = async () => {
      try {
        unlisten = await listen<BroadcastEventPayload>(BROADCAST_EVENT, (event) => {
          if (!mountedRef.current) {
            return
          }

          const normalized = normalizeBroadcastPayload(event.payload)

          if (!normalized) {
            latestRef.current = null
            scheduleCommit()
            return
          }

          if (!runningRef.current && normalized.status === "ok") {
            return
          }

          latestRef.current = normalized
          scheduleCommit()
        })
      } catch (error) {
        console.warn("Failed to subscribe to ACC broadcast events", error)
      }
    }

    void setup()

    return () => {
      mountedRef.current = false
      if (unlisten) {
        unlisten()
      }
      if (typeof window !== "undefined" && rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      frame,
      lastOkFrame,
      status,
    }),
    [frame, lastOkFrame, status],
  )

  return <AccBroadcastContext.Provider value={value}>{children}</AccBroadcastContext.Provider>
}

export function useAccBroadcast(): BroadcastContextValue {
  const context = useContext(AccBroadcastContext)
  if (!context) {
    throw new Error("useAccBroadcast must be used within an AccBroadcastProvider")
  }
  return context
}

function normalizeBroadcastPayload(payload: BroadcastEventPayload | null | undefined): BroadcastFrame | null {
  if (!payload) {
    return null
  }

  const timestampValue =
    typeof payload.timestamp === "string" ? Number(payload.timestamp) : payload.timestamp
  const timestamp = Number.isFinite(timestampValue) && timestampValue !== null
    ? Number(timestampValue)
    : Date.now()

  const status: BroadcastStatus = isBroadcastStatus(payload.status) ? payload.status : "waiting"
  const data = payload.data && typeof payload.data === "object" ? payload.data : null
  const message = payload.message ?? null

  return {
    timestamp,
    status,
    data,
    message,
  }
}

function isBroadcastStatus(value: unknown): value is BroadcastStatus {
  return value === "ok" || value === "waiting" || value === "error"
}

