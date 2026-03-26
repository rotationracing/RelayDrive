"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { prettifyCarName } from "@/shared/naming"
import { invoke } from "@tauri-apps/api/core"
import { type UnlistenFn, listen } from "@tauri-apps/api/event"
import {
  Activity,
  Car,
  Clock,
  Cpu,
  Gauge,
  Layers,
  ListTree,
  MapPin,
  Pause,
  Play,
  Power,
  RotateCcw,
  Terminal,
  Timer,
  Users,
  Wifi,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

type TelemetryStatus = "ok" | "waiting" | "error"

interface TelemetryEventPayload {
  timestamp: number | string
  status?: TelemetryStatus | string
  data?: {
    speed_kmh?: number
    rpm?: number
    [key: string]: unknown
  } | null
  message?: string | null
}

interface NormalizedTelemetry {
  timestamp: number
  status: TelemetryStatus
  speed_kmh: number
  rpm: number
  message: string | null
  data?: {
    gas?: number
    brake?: number
    steer_angle?: number
    [key: string]: unknown
  } | null
}

interface ConsoleLine {
  id: string
  timestamp: number
  status: TelemetryStatus
  message: string
}

interface SessionInfo {
  track: string
  car_model: string
  is_online: boolean
  num_cars: string
  sm_version: string
  ac_version: string
}

const TELEMETRY_EVENT = "acc://physics"
const MAX_LINES = 400
const HIDDEN_MESSAGES = ["Shared memory not available or game not running", "Awaiting physics data from ACC"]

export default function ConsolePage() {
  const [latest, setLatest] = useState<NormalizedTelemetry | null>(null)
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    track: "--",
    car_model: "--",
    is_online: false,
    num_cars: "--",
    sm_version: "--",
    ac_version: "--",
  })
  const staticsFetchedRef = useRef(false)
  
  // Hook into broadcast context
  const { frame: broadcastFrame } = useAccBroadcast()

  const fetchStatics = useCallback(async () => {
    try {
      const res: any = await invoke("get_acc_statics")
      if (!res) return
      setSessionInfo({
        track: res.track ?? "--",
        car_model: res.carModel ?? "--",
        is_online: !!res.isOnline,
        num_cars: Number.isFinite(res.numCars) ? String(res.numCars) : "--",
        sm_version: res.smVersion ?? "--",
        ac_version: res.acVersion ?? "--",
      })
      staticsFetchedRef.current = true
    } catch (e) {
      console.debug("get_acc_statics failed", e)
    }
  }, [])

  useEffect(() => {
    staticsFetchedRef.current = false
    if (isStreaming) {
      fetchStatics()
    } else {
      setSessionInfo({
        track: "--",
        car_model: "--",
        is_online: false,
        num_cars: "--",
        sm_version: "--",
        ac_version: "--",
      })
    }
  }, [isStreaming, fetchStatics])

  useEffect(() => {
    let unlisten: UnlistenFn | null = null
    let mounted = true

    if (!isStreaming) {
      return () => {
        mounted = false
        if (unlisten) {
          unlisten()
        }
      }
    }

    ;(async () => {
      try {
        unlisten = await listen<TelemetryEventPayload>(TELEMETRY_EVENT, (event) => {
          if (!mounted) return
          const normalized = normalizeTelemetry(event.payload)
          const line = createConsoleLine(normalized)

          setLatest(normalized)
          if (!staticsFetchedRef.current && normalized.status === "ok") {
            fetchStatics()
          }
          if (normalized.status === "error") {
            staticsFetchedRef.current = false
            setSessionInfo({
              track: "--",
              car_model: "--",
              is_online: false,
              num_cars: "--",
              sm_version: "--",
              ac_version: "--",
            })
          }

          if (line) {
            setLines((prev) => appendLine(prev, line))
          }
        })
      } catch (error) {
        console.error("Failed to subscribe to ACC telemetry", error)
      }
    })()

    return () => {
      mounted = false
      if (unlisten) {
        unlisten()
      }
    }
  }, [isStreaming])

  // Listen to broadcast frames and add them to console
  useEffect(() => {
    if (!isStreaming || !broadcastFrame) {
      return
    }

    // Create console line from broadcast data (handle all statuses)
    const line = createBroadcastConsoleLine(broadcastFrame)
    if (line) {
      setLines((prev) => appendLine(prev, line))
    }
  }, [broadcastFrame, isStreaming])

  useEffect(() => {
    if (!outputRef.current) return
    outputRef.current.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" })
  }, [lines])

  useEffect(() => {
    const message = isStreaming ? "Telemetry stream resumed" : "Telemetry stream paused"
    const status: TelemetryStatus = isStreaming ? "waiting" : "waiting"
    const line: ConsoleLine = {
      id: `system-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      status,
      message,
    }
    setLines((prev) => appendLine(prev, line))
  }, [isStreaming])

  const speedLabel = useMemo(() => {
    if (!latest) return "--"
    return `${latest.speed_kmh.toFixed(1)} km/h`
  }, [latest])

  const rpmLabel = useMemo(() => {
    if (!latest) return "--"
    return latest.rpm.toLocaleString()
  }, [latest])

  const lastUpdated = useMemo(() => (latest ? formatTimestamp(latest.timestamp) : "--:--:--"), [latest])

  const carLabel = useMemo(() => prettifyCarName(sessionInfo.car_model), [sessionInfo.car_model])

  const metrics = useMemo(
    () => [
      {
        key: "speed",
        label: "Speed",
        value: speedLabel,
        helper: "Vehicle velocity",
        icon: Gauge,
      },
      {
        key: "rpm",
        label: "RPM",
        value: rpmLabel,
        helper: "Engine speed",
        icon: Activity,
      },
      {
        key: "gear",
        label: "Gear",
        value:
          latest?.data?.gear !== undefined
            ? (() => {
                const gear = Number(latest.data?.gear)

                // ACC shared memory gear mapping (observed):
                // 0 = Reverse, 1 = Neutral, 2+ = Forward gears
                if (gear === 0) return "R"
                if (gear === 1) return "N"
                return (gear - 1).toString()  // Forward gears: display as gear-1
              })()
            : "--",
        helper: "Current gear",
        icon: ListTree,
      },
      {
        key: "gas",
        label: "Gas",
        value: latest?.data?.gas !== undefined ? `${(latest.data.gas * 100).toFixed(1)}%` : "--",
        helper: "Throttle pedal",
        icon: Zap,
      },
      {
        key: "brake",
        label: "Brake",
        value: latest?.data?.brake !== undefined ? `${(latest.data.brake * 100).toFixed(1)}%` : "--",
        helper: "Brake pedal",
        icon: Power,
      },
      {
        key: "steering",
        label: "Steering",
        value: latest?.data?.steer_angle !== undefined ? `${latest.data.steer_angle.toFixed(1)}°` : "--",
        helper: "Steering angle",
        icon: RotateCcw,
      },
    ],
    [lastUpdated, rpmLabel, speedLabel, latest?.data],
  )

  const statusInfo = useMemo(() => {
    if (!isStreaming) {
      return {
        label: "Paused",
        variant: "secondary" as const,
        helper: "",
      }
    }

    return getStatusInfo(latest?.status)
  }, [isStreaming, latest?.status])

  const sessionTiles = useMemo(
    () => [
      {
        key: "track",
        label: "Track",
        value: sessionInfo.track,
        icon: MapPin,
      },
      {
        key: "car",
        label: "Car",
        value: carLabel,
        icon: Car,
      },
      {
        key: "online",
        label: "Online",
        value: (latest?.status === "ok" ? true : sessionInfo.is_online) ? "Yes" : "No",
        icon: Wifi,
      },
      {
        key: "cars",
        label: "Cars",
        value: sessionInfo.num_cars,
        icon: Users,
      },
      {
        key: "smv",
        label: "SM Version",
        value: sessionInfo.sm_version,
        icon: Cpu,
      },
      {
        key: "accv",
        label: "ACC Version",
        value: sessionInfo.ac_version,
        icon: Layers,
      },
    ],
    [latest?.status, sessionInfo]
  )
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Console</h1>
        <p className="text-muted-foreground">Live ACC telemetry and broadcast data streamed directly into RelayDrive.</p>
      </div>

      {/* Stream Control */}
      <Card className="rounded-[var(--radius-xl)]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Stream Control
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Manage ACC shared memory streaming.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsStreaming((prev) => !prev)}
            className="h-10 w-10 rounded-[var(--radius-lg)]"
          >
            {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant={statusInfo.variant} className="rounded-[var(--radius-md)] px-3 py-1 text-[11px] font-semibold">
              {statusInfo.label}
            </Badge>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {isStreaming ? `Last Frame ${lastUpdated}` : "Stream Idle"}
            </span>
          </div>

          {/* Session Summary */}
          <TooltipProvider>
            <div className="grid gap-3 sm:grid-cols-4">
              {/* Track (2 cols) */}
              <div className="rounded-[var(--radius-lg)] border px-4 py-3 flex items-center justify-between min-w-0 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground flex-shrink-0">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Track</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-sm font-medium text-slate-100 truncate whitespace-nowrap max-w-[75%] text-right">
                      {sessionInfo.track}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end">
                    <span className="text-xs">{sessionInfo.track}</span>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Online (1 col) */}
              <div className="rounded-[var(--radius-lg)] border px-4 py-3 flex items-center justify-between min-w-0">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground flex-shrink-0">
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Online</span>
                </div>
                <div className="text-sm font-medium text-slate-100 text-right">
                  {(latest?.status === "ok" ? true : sessionInfo.is_online) ? "Yes" : "No"}
                </div>
              </div>

              {/* ACC Version (1 col) */}
              <div className="rounded-[var(--radius-lg)] border px-4 py-3 flex items-center justify-between min-w-0">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground flex-shrink-0">
                  <Layers className="h-3.5 w-3.5" />
                  <span>ACC Version</span>
                </div>
                <div className="text-sm font-medium text-slate-100 text-right">
                  {sessionInfo.ac_version}
                </div>
              </div>

              {/* Car (2 cols, second row) */}
              <div className="rounded-[var(--radius-lg)] border px-4 py-3 flex items-center justify-between min-w-0 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground flex-shrink-0">
                  <Car className="h-3.5 w-3.5" />
                  <span>Car</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-sm font-medium text-slate-100 truncate whitespace-nowrap max-w-[75%] text-right">
                      {carLabel}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end">
                    <span className="text-xs">{carLabel}</span>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Cars (1 col) */}
              <div className="rounded-[var(--radius-lg)] border px-4 py-3 flex items-center justify-between min-w-0">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground flex-shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  <span>Cars</span>
                </div>
                <div className="text-sm font-medium text-slate-100 text-right">
                  {sessionInfo.num_cars}
                </div>
              </div>

              {/* SM Version (1 col) */}
              <div className="rounded-[var(--radius-lg)] border px-4 py-3 flex items-center justify-between min-w-0">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground flex-shrink-0">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>SM Version</span>
                </div>
                <div className="text-sm font-medium text-slate-100 text-right">
                  {sessionInfo.sm_version}
                </div>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Telemetry Metrics */}
      <Card className="rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Telemetry Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {metrics.map(({ key, label, value, helper, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-slate-50">{value}</div>
                  <p className="text-[11px] text-muted-foreground/80">{helper}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Stream Console */}
      <Card className="rounded-[var(--radius-xl)]">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Live Stream</CardTitle>
            <CardDescription>Translated ACC shared memory events (~60 FPS) and broadcast data (~10 Hz).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLines([])}
              className="h-9 w-9 rounded-[var(--radius-lg)]"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={outputRef}
            className="border rounded-[var(--radius-xl)] p-6 h-[30rem] overflow-y-auto"
          >
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-3 text-muted-foreground/70">
                <Terminal className="h-10 w-10 opacity-40" />
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs text-slate-100">
                {lines.map((line) => (
                  <div key={line.id} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                    <span className="text-[11px] text-slate-500">{formatTimestamp(line.timestamp)}</span>
                    <span className={`font-semibold ${lineToneClass(line.status)}`}>{statusLabel(line.status)}</span>
                    <span className="sm:flex-1 text-slate-200">{line.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function createBroadcastConsoleLine(frame: any): ConsoleLine | null {
  const timestamp = frame.timestamp || Date.now()
  const status = frame.status || "waiting"
  
  // Handle status messages (waiting, error, etc)
  if (frame.message && !frame.data) {
    return {
      id: `broadcast-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      status: status as TelemetryStatus,
      message: `[BROADCAST] ${frame.message}`,
    }
  }
  
  if (!frame.data) return null

  const data = frame.data
  
  // Format different message types
  let message = ""
  
  if (data.RegistrationResult) {
    const reg = data.RegistrationResult
    message = `[BROADCAST] Registration ${reg.success ? "SUCCESS" : "FAILED"} - Connection ID: ${reg.connection_id}, ReadOnly: ${reg.is_readonly}`
    if (reg.error_msg) {
      message += ` | Error: ${reg.error_msg}`
    }
  } else if (data.RealtimeUpdate) {
    const update = data.RealtimeUpdate
    message = `[SESSION] ${update.session_type} | Phase: ${update.phase} | Time: ${Math.floor(update.session_time / 1000)}s | Track: ${update.track_temp}°C | Rain: ${(update.rain_level * 100).toFixed(0)}%`
  } else if (data.RealtimeCarUpdate) {
    const car = data.RealtimeCarUpdate
    const lapTime = car.current_lap?.lap_time_ms ? (car.current_lap.lap_time_ms / 1000).toFixed(3) : "N/A"
    message = `[CAR ${car.car_index}] P${car.position} | Lap ${car.lap_count} | ${car.kmh.toFixed(0)} km/h | Gear: ${car.gear} | Delta: ${car.delta > 0 ? "+" : ""}${car.delta.toFixed(3)}s | Current Lap: ${lapTime}s`
  } else if (data.EntryList) {
    const entries = data.EntryList.entries || []
    message = `[BROADCAST] Entry List Received - ${entries.length} cars`
  } else if (data.EntryListCar) {
    const entry = data.EntryListCar
    message = `[BROADCAST] Car Entry - #${entry.race_number} ${entry.team_name} (Car ${entry.car_index})`
  } else if (data.TrackData) {
    const track = data.TrackData
    message = `[BROADCAST] Track Data - ${track.track_name} (${track.track_meters}m)`
  } else if (data.BroadcastingEvent) {
    const event = data.BroadcastingEvent
    message = `[EVENT] ${event.event_type} - Car ${event.car_index}: ${event.msg}`
  } else {
    // Generic fallback - log any unknown message types
    const messageType = Object.keys(data)[0] || "Unknown"
    message = `[BROADCAST] ${messageType}`
  }

  if (!message) return null

  return {
    id: `broadcast-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    status: status as TelemetryStatus,
    message,
  }
}

function appendLine(lines: ConsoleLine[], line: ConsoleLine): ConsoleLine[] {
  const next = [...lines, line]
  if (next.length > MAX_LINES) {
    next.splice(0, next.length - MAX_LINES)
  }
  return next
}

function normalizeTelemetry(payload: TelemetryEventPayload): NormalizedTelemetry {
  const timestampValue = typeof payload.timestamp === "string" ? Number(payload.timestamp) : payload.timestamp
  const timestamp = Number.isFinite(timestampValue) ? timestampValue : Date.now()
  const status = isTelemetryStatus(payload.status) ? payload.status : "waiting"
  const speedValue = payload.data?.speed_kmh ?? 0
  const rpmValue = payload.data?.rpm ?? 0
  const speed = Number.isFinite(speedValue) ? speedValue : 0
  const rpm = Number.isFinite(rpmValue) ? Math.round(rpmValue) : 0
  const message = payload.message ?? null

  return {
    timestamp,
    status,
    speed_kmh: speed,
    rpm,
    message,
    data: payload.data,
  }
}

function createConsoleLine(telemetry: NormalizedTelemetry): ConsoleLine | null {
  const timestamp = telemetry.timestamp
  const status = telemetry.status
  const message = buildLineMessage(telemetry)

  if (!message) {
    return null
  }

  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    status,
    message,
  }
}

function buildLineMessage(telemetry: NormalizedTelemetry): string | null {
  if (telemetry.message && HIDDEN_MESSAGES.includes(telemetry.message)) {
    return null
  }

  if (telemetry.status === "ok") {
    return null // Don't log continuous speed/RPM data
  }

  if (telemetry.status === "waiting") {
    return telemetry.message ?? null
  }

  return telemetry.message ?? null
}

function getStatusInfo(status?: TelemetryStatus) {
  switch (status) {
    case "ok":
      return {
        label: "Live",
        variant: "default" as const,
        helper: "",
      }
    case "error":
      return {
        label: "Error",
        variant: "destructive" as const,
        helper: "",
      }
    default:
      return {
        label: "Waiting",
        variant: "secondary" as const,
        helper: "",
      }
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return "--:--:--"
  }

  return date.toLocaleTimeString([], { hour12: false })
}

function lineToneClass(status: TelemetryStatus): string {
  switch (status) {
    case "ok":
      return "text-emerald-300"
    case "waiting":
      return "text-amber-300"
    case "error":
      return "text-red-400"
    default:
      return "text-slate-200"
  }
}

function statusLabel(status: TelemetryStatus): string {
  switch (status) {
    case "ok":
      return "OK"
    case "waiting":
      return "WAIT"
    case "error":
      return "ERROR"
    default:
      return "INFO"
  }
}

function isTelemetryStatus(value: unknown): value is TelemetryStatus {
  return value === "ok" || value === "waiting" || value === "error"
}

