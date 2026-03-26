# ACC Telemetry & Data Integration Guide

This guide explains how to access ACC physics, graphics, and static data in RelayDrive components.

## Overview

RelayDrive provides four complementary data streams from Assetto Corsa Competizione:

- **Physics Data** (`acc://physics`): High-frequency telemetry at 60 FPS (sampled at 333 Hz)
- **Graphics Data** (`acc://graphics`): Session state and timing data at 60 Hz
- **Broadcast Data** (`acc://broadcast`): Multiplayer session data and live standings at 10 Hz
- **Static Data** (`get_acc_statics`): Session metadata fetched once per connection

## Physics Data (60 FPS)

### Quick Start

```tsx
import { useAccPhysics } from "@/contexts/AccPhysicsContext"

export function SpeedGauge() {
  const { frame } = useAccPhysics()
  
  return (
    <div>
      Speed: {frame?.data?.speed_kmh?.toFixed(1)} km/h
    </div>
  )
}
```

### useAccPhysics Hook

Returns the current physics frame and status:

```tsx
interface PhysicsContextValue {
  frame: PhysicsFrame | null          // Current frame (updated at 60 FPS)
  lastOkFrame: PhysicsFrame | null    // Last successful frame (fallback)
  status: PhysicsStatus               // "ok" | "waiting" | "error"
}

interface PhysicsFrame {
  timestamp: number                   // Unix milliseconds
  status: PhysicsStatus
  data: PhysicsMap | null             // Full physics object
  message: string | null              // Error/status message
}
```

### Available Physics Fields

The `frame.data` object contains all ACC physics fields. Common fields:

```tsx
// Driver Inputs
speed_kmh: number              // Current speed in km/h
rpm: number                    // Engine RPM
gear: number                   // Current gear (0=neutral, 1+=gears)
steer_angle: number            // Steering angle in degrees
brake: number                  // Brake pedal (0.0-1.0)
gas: number                    // Throttle pedal (0.0-1.0)
clutch: number                 // Clutch pedal (0.0-1.0)

// Car Dynamics
velocity: { x: number, y: number, z: number }
g_force: { x: number, y: number, z: number }
heading: number                // Yaw angle in radians
pitch: number                  // Pitch angle in radians
roll: number                   // Roll angle in radians

// Wheels (per-wheel data)
wheel_slip: [number, number, number, number]
wheel_pressure: [number, number, number, number]
tyre_core_temp: [number, number, number, number]
brake_temp: [number, number, number, number]
suspension_travel: [number, number, number, number]

// Status
fuel: number                   // Fuel remaining (liters)
water_temp: number             // Water temperature (°C)
air_temp: number               // Ambient air temperature (°C)
road_temp: number              // Track surface temperature (°C)
tc: number                     // Traction control setting
abs: number                    // ABS setting
turbo_boost: number            // Turbo boost pressure (bar)
```

For complete field list, see the [PhysicsMap documentation](./PHYSICS_MAP.md).

### Performance Considerations

✅ **Optimized for multiple consumers:**
- Physics data is serialized once per 60 FPS frame
- Shared via `Arc<Value>` (cheap pointer copies, not clones)
- 10+ components can access without performance loss
- Uses `requestAnimationFrame` to throttle React updates to screen refresh

⚠️ **Best practices:**
- Access `frame.data` directly for single fields
- Avoid destructuring entire frame in render (creates new object refs)
- Use `lastOkFrame` as fallback when `frame` is null

### Example: Multi-Field Component

```tsx
import { useAccPhysics } from "@/contexts/AccPhysicsContext"

export function TelemetryDisplay() {
  const { frame, status } = useAccPhysics()
  
  if (status === "waiting") return <div>Awaiting ACC...</div>
  if (status === "error") return <div>Connection lost</div>
  if (!frame?.data) return null
  
  const { speed_kmh, rpm, gear, fuel } = frame.data
  
  return (
    <div>
      <div>Speed: {speed_kmh?.toFixed(1)} km/h</div>
      <div>RPM: {rpm?.toLocaleString()}</div>
      <div>Gear: {gear}</div>
      <div>Fuel: {fuel?.toFixed(1)}L</div>
    </div>
  )
}
```

### Status Handling

```tsx
const { frame, status } = useAccPhysics()

switch (status) {
  case "ok":
    // ACC is running and sending data
    break
  case "waiting":
    // ACC not running or shared memory not available
    break
  case "error":
    // Connection error occurred
    break
}
```

---

## Graphics Data (60 Hz)

### Quick Start

```tsx
import { useAccGraphics } from "@/contexts/AccGraphicsContext"

export function LapTimer() {
  const { frame } = useAccGraphics()
  
  return (
    <div>
      Current: {frame?.data?.current_time_str}
      Best: {frame?.data?.best_time_str}
    </div>
  )
}
```

### useAccGraphics Hook

Returns the current graphics frame and status:

```tsx
interface GraphicsContextValue {
  frame: GraphicsFrame | null          // Current frame (updated at 60 Hz)
  lastOkFrame: GraphicsFrame | null    // Last successful frame (fallback)
  status: GraphicsStatus               // "ok" | "waiting" | "error"
}

interface GraphicsFrame {
  timestamp: number                   // Unix milliseconds
  status: GraphicsStatus
  data: GraphicsMap | null             // Full graphics object
  message: string | null              // Error/status message
}
```

### Available Graphics Fields

The `frame.data` object contains all ACC graphics fields including:

```tsx
// Lap Timing
current_time_str: string           // Current lap time string
best_time_str: string             // Best lap time string
last_time_str: string             // Last lap time string
current_time: number              // Current lap time (ms)
delta_lap_time_str: string        // Delta lap time string

// Session & Positioning
position: number                  // Current car position
completed_lap: number             // Number of completed laps
is_in_pit: boolean                // Car is in pit area
is_in_pit_lane: boolean           // Car is in pit lane

// Flags
global_yellow: boolean            // Yellow flag active
global_red: boolean               // Red flag active
global_chequered: boolean         // Chequered flag active

// Environment
rain_intensity: number            // Current rain intensity
wind_speed: number                // Wind speed (m/s)
wind_direction: number            // Wind direction (degrees)

// Driver Controls
tc_level: number                  // Traction control level
abs_level: number                 // ABS level
engine_map: number                // Engine map setting

// Penalties & Pit
penalty_time: number              // Current penalty time (s)
mandatory_pit_done: boolean       // Mandatory pit complete
missing_mandatory_pits: number    // Mandatory pits remaining
```

For complete field list, see the [GraphicsMap documentation](./GRAPHICS_MAP.md).

### Performance Considerations

✅ **Optimized for multiple consumers:**
- Graphics data is serialized once per 60 Hz frame
- Shared via `Arc<Value>` (cheap pointer copies, not clones)
- Uses `requestAnimationFrame` to throttle React updates to screen refresh

⚠️ **Best practices:**
- Access `frame.data` directly for single fields
- Avoid destructuring entire frame in render (creates new object refs)
- Use `lastOkFrame` as fallback when `frame` is null

---

## Broadcast Data (10 Hz)

### Overview

The broadcast data stream connects to ACC's Broadcasting API, providing real-time information about multiplayer sessions including live standings, entry lists, session state, and race events. This is separate from the physics/graphics shared memory streams.

**Note:** ACC must be running as a server with broadcasting enabled for this stream to work.

### Quick Start

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function LiveStandings() {
  const { frame } = useAccBroadcast()
  
  const realtimeUpdate = frame?.data?.RealtimeUpdate
  const carUpdate = frame?.data?.RealtimeCarUpdate
  
  return (
    <div>
      <div>Session: {realtimeUpdate?.session_type}</div>
      <div>Position: {carUpdate?.position}</div>
      <div>Lap: {carUpdate?.lap_count}</div>
    </div>
  )
}
```

### useAccBroadcast Hook

Returns the current broadcast frame and status:

```tsx
interface BroadcastContextValue {
  frame: BroadcastFrame | null          // Current frame (updated at 10 Hz)
  lastOkFrame: BroadcastFrame | null    // Last successful frame (fallback)
  status: BroadcastStatus               // "ok" | "waiting" | "error"
}

interface BroadcastFrame {
  timestamp: number                     // Unix milliseconds
  status: BroadcastStatus
  data: BroadcastMap | null             // Full broadcast message
  message: string | null                // Error/status message
}
```

### Available Broadcast Message Types

The `frame.data` object contains ACC broadcast messages. Each message is a different type:

```tsx
// Registration confirmation
RegistrationResult: {
  connection_id: number
  success: boolean
  is_readonly: boolean
  error_msg?: string
}

// Session-wide information
RealtimeUpdate: {
  session_type: string               // "Practice", "Qualifying", "Race"
  phase: string                      // "PreSession", "Session", "SessionOver"
  session_time: number               // Current session time (ms)
  session_end_time: number           // Session end time (ms)
  ambient_temp: number               // Ambient temperature (°C)
  track_temp: number                 // Track temperature (°C)
  rain_level: number                 // Rain intensity (0.0-1.0)
  wetness: number                    // Track wetness (0.0-1.0)
  best_session_lap: {                // Best lap in session
    lap_time_ms: number
    car_index: number
    driver_index: number
    splits: number[]
  }
}

// Individual car updates
RealtimeCarUpdate: {
  car_index: number                  // Unique car identifier
  position: number                   // Overall position
  lap_count: number                  // Completed laps
  kmh: number                        // Current speed
  spline_position: number            // Track position (0.0-1.0)
  delta: number                      // Time delta to leader (ms)
  best_session_lap: { ... }          // Car's best lap
  last_lap: { ... }                  // Last completed lap
  current_lap: { ... }               // Current lap in progress
}

// Complete entry list
EntryList: {
  entries: Array<{
    car_index: number
    race_number: number
    team_name: string
    car_model_type: number
    drivers: Array<{
      first_name: string
      last_name: string
      short_name: string
      category: number
    }>
  }>
}

// Track information
TrackData: {
  track_name: string
  track_id: number
  track_meters: number
  camera_sets: Record<string, string[]>
}

// Race events
BroadcastingEvent: {
  event_type: string                 // "Accident", "LapCompleted", etc.
  msg: string                        // Human-readable message
  time_ms: number                    // Session time when occurred
  car_index: number                  // Car involved
}
```

For complete field list and detailed usage examples, see the [BroadcastMap documentation](./BROADCAST_MAP.md).

### Performance Considerations

✅ **Optimized for broadcast data:**
- Broadcast data updates at 10 Hz (every 100ms)
- Much lower frequency than physics (60 FPS) and graphics (60 Hz)
- Ideal for spectator features, standings, and session information
- Uses `requestAnimationFrame` to throttle React updates

⚠️ **Best practices:**
- Each message type is independent - check which message is present
- Not suitable for real-time driver telemetry (use physics/graphics for that)
- Connection requires ACC to be running as a server with broadcasting enabled
- Access `frame.data` directly for single message types

### Example: Session Weather

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function WeatherDisplay() {
  const { frame } = useAccBroadcast()
  
  const update = frame?.data?.RealtimeUpdate
  if (!update) return null
  
  return (
    <div>
      <div>Track Temp: {update.track_temp}°C</div>
      <div>Rain: {(update.rain_level * 100).toFixed(0)}%</div>
      <div>Wetness: {(update.wetness * 100).toFixed(0)}%</div>
    </div>
  )
}
```

### Example: Live Positions

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function PositionDisplay() {
  const { frame } = useAccBroadcast()
  
  const carUpdate = frame?.data?.RealtimeCarUpdate
  const entryList = frame?.data?.EntryList
  
  if (!carUpdate || !entryList) return null
  
  const entry = entryList.entries.find(e => e.car_index === carUpdate.car_index)
  
  return (
    <div>
      <div>P{carUpdate.position} - #{entry?.race_number}</div>
      <div>{entry?.team_name}</div>
      <div>Lap {carUpdate.lap_count}</div>
    </div>
  )
}
```

### Enabling Broadcast API

For the broadcast stream to work, ACC must be configured as a server:

1. Start ACC in Server Mode or enable broadcasting in configuration
2. Set broadcast port (default: 9000) in `server_cfg.json`
3. RelayDrive will automatically attempt to connect when ACC is detected

---

## Static Data (One-Time Fetch)

### Quick Start

```tsx
import { invoke } from "@tauri-apps/api/core"

export function SessionInfo() {
  const [statics, setStatics] = useState(null)
  
  useEffect(() => {
    invoke("get_acc_statics").then(setStatics)
  }, [])
  
  return (
    <div>
      Track: {statics?.track}
      Car: {statics?.carModel}
    </div>
  )
}
```

### Available Static Fields

```tsx
interface AccStaticsPayload {
  // Session Info
  track: string                  // Track name
  carModel: string               // Car model name
  
  // Driver Info
  playerName: string             // Driver first name
  playerSurname: string          // Driver last name
  playerNick: string             // Driver nickname
  
  // Session Settings
  numberOf Sessions: number      // Total sessions in event
  numCars: number                // Number of cars in session
  sectorCount: number            // Number of track sectors
  isOnline: boolean              // Online session flag
  
  // Car Limits
  maxRpm: number                 // Maximum engine RPM
  maxFuel: number                // Maximum fuel capacity (liters)
  
  // Assists & Penalties
  penaltyEnabled: boolean
  aidFuelRate: number            // Fuel consumption aid
  aidTyreRate: number            // Tyre wear aid
  aidMechanicalDamage: number    // Mechanical damage aid
  aidStability: number           // Stability control aid
  aidAutoClutch: boolean         // Auto-clutch enabled
  
  // Pit Window
  pitWindowStart: number         // Pit window start lap
  pitWindowEnd: number           // Pit window end lap
  
  // Tyre Info
  dryTyresName: string           // Dry tyre compound name
  wetTyresName: string           // Wet tyre compound name
  
  // Version Info
  smVersion: string              // Shared memory version
  acVersion: string              // ACC version
}
```

### Caching Pattern

```tsx
import { useCallback, useRef, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"

export function useAccStatics() {
  const [statics, setStatics] = useState(null)
  const fetchedRef = useRef(false)
  
  const fetchStatics = useCallback(async () => {
    try {
      const res = await invoke("get_acc_statics")
      setStatics(res)
      fetchedRef.current = true
    } catch (e) {
      console.error("Failed to fetch statics", e)
    }
  }, [])
  
  return { statics, fetchStatics, isFetched: fetchedRef.current }
}
```

---

## Combined Usage: Physics + Statics

```tsx
import { useAccPhysics } from "@/contexts/AccPhysicsContext"
import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"

export function RaceEngineer() {
  const { frame } = useAccPhysics()
  const [statics, setStatics] = useState(null)
  
  useEffect(() => {
    invoke("get_acc_statics").then(setStatics)
  }, [])
  
  if (!frame?.data || !statics) return <div>Loading...</div>
  
  const lapTime = calculateLapTime(frame.data, statics)
  
  return (
    <div>
      <h2>{statics.carModel} at {statics.track}</h2>
      <p>Speed: {frame.data.speed_kmh?.toFixed(1)} km/h</p>
      <p>Estimated Lap: {lapTime}</p>
    </div>
  )
}
```

---

## Event Flow

### Physics Stream Lifecycle

```
ACC Process Running
    ↓
physics::start_stream() called
    ↓
Backend reads shared memory at 333 Hz
    ↓
Every 16ms (60 FPS), emit acc://physics event
    ↓
AccPhysicsProvider receives event
    ↓
requestAnimationFrame schedules React update
    ↓
Components render with latest frame
```

### Graphics Stream Lifecycle

```
ACC Process Running
    ↓
graphics::start_stream() called
    ↓
Backend reads shared memory at 60 Hz
    ↓
Every 16ms (60 Hz), emit acc://graphics event
    ↓
AccGraphicsProvider receives event
    ↓
requestAnimationFrame schedules React update
    ↓
Components render with latest frame
```

### Broadcast Stream Lifecycle

```
ACC Server Running (with broadcasting enabled)
    ↓
broadcast::start_stream() called
    ↓
Backend connects to ACC broadcast server via UDP
    ↓
Sends registration request
    ↓
Receives broadcast messages (10 Hz)
    ↓
Every 100ms, emit acc://broadcast event
    ↓
AccBroadcastProvider receives event
    ↓
requestAnimationFrame schedules React update
    ↓
Components render with latest frame
```

### Statics Fetch Lifecycle

```
ACC Process Running
    ↓
invoke("get_acc_statics") called
    ↓
Backend reads statics from shared memory (one-time)
    ↓
Return serialized AccStaticsPayload
    ↓
Frontend receives and caches in component state
```

---

## Troubleshooting

### Physics Not Updating

1. **Check ACC is running**: `useAccPhysics()` returns `status === "waiting"` if ACC isn't running
2. **Verify provider is mounted**: `AccPhysicsProvider` must wrap your component in the layout
3. **Check browser console** for errors in event listener setup

### Statics Return Null

1. **ACC must be running** before calling `get_acc_statics`
2. **Shared memory must be available** (Windows only, ACC must have initialized)
3. **Call after physics stream starts** for best reliability

### Performance Issues

1. **Avoid destructuring in render**: Use `frame?.data?.speed_kmh` instead of `const { speed_kmh } = frame.data`
2. **Memoize expensive calculations**: Wrap derived values in `useMemo`
3. **Limit re-renders**: Use `lastOkFrame` as fallback to avoid null renders

---

## API Reference

### Backend Events

**Event:** `acc://physics`

Emitted at 60 FPS when ACC is running.

```rust
pub struct PhysicsPayload {
    pub timestamp: u128,                    // Unix milliseconds
    pub status: "ok" | "waiting" | "error",
    pub data: Option<Arc<Value>>,           // Full physics object
    pub message: Option<String>,
}
```

**Event:** `acc://graphics`

Emitted at 60 Hz when ACC is running.

```rust
pub struct GraphicsPayload {
    pub timestamp: u128,                    // Unix milliseconds
    pub status: "ok" | "waiting" | "error",
    pub data: Option<Arc<Value>>,           // Full graphics object
    pub message: Option<String>,
}
```

**Event:** `acc://broadcast`

Emitted at 10 Hz when ACC server is running with broadcasting enabled.

```rust
pub struct BroadcastPayload {
    pub timestamp: u128,                    // Unix milliseconds
    pub status: "ok" | "waiting" | "error",
    pub data: Option<Arc<Value>>,           // Broadcast message
    pub message: Option<String>,
}
```

### Backend Commands

**Command:** `get_acc_statics`

Fetch session metadata. Must be called while ACC is running.

```rust
#[tauri::command]
pub async fn get_acc_statics() -> Result<AccStaticsPayload, String>
```

---

## See Also

- [Physics Map Fields](./PHYSICS_MAP.md) - Complete physics field reference
- [Graphics Map Fields](./GRAPHICS_MAP.md) - Complete graphics field reference
- [Broadcast Map Fields](./BROADCAST_MAP.md) - Complete broadcast message reference
- [Statics Documentation](./STATICS.md) - Detailed statics guide
