# Graphics Map - Complete Field Reference

This document provides a comprehensive reference of all fields available in the ACC graphics data stream.

## Overview

The graphics map is emitted at 60 Hz and contains medium-frequency simulation state information from Assetto Corsa Competizione, including session data, timing, positioning, and race control information.

## Field Categories

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `packet_id` | `i32` | Unique identifier for graphics packet (increments every update) |
| `status` | `i32` | Current game status (enum: AccStatus) |
| `session_type` | `i32` | Type of session (enum: AccSessionType) |
| `session_index` | `i32` | Index of the current session |

### Lap Timing & Positioning

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `current_time_str` | `String` | - | Current lap time as a formatted string |
| `last_time_str` | `String` | - | Last lap time as a formatted string |
| `best_time_str` | `String` | - | Best lap time as a formatted string |
| `last_sector_time_str` | `String` | - | Last sector time as a formatted string |
| `delta_lap_time_str` | `String` | - | Delta lap time as a formatted string |
| `estimated_lap_time_str` | `String` | - | Estimated lap time as a formatted string |
| `current_time` | `i32` | ms | Current lap time in milliseconds |
| `last_time` | `i32` | ms | Last lap time in milliseconds |
| `best_time` | `i32` | ms | Best lap time in milliseconds |
| `last_sector_time` | `i32` | ms | Last sector time in milliseconds |
| `delta_lap_time` | `i32` | ms | Delta lap time in milliseconds |
| `estimated_lap_time` | `i32` | ms | Estimated lap time in milliseconds |
| `completed_lap` | `i32` | - | Number of completed laps |
| `position` | `i32` | - | Current car position in the session |
| `number_of_laps` | `i32` | - | Total number of laps in the session |
| `is_delta_positive` | `bool` | - | Whether the delta lap time is positive (slower) |
| `is_valid_lap` | `bool` | - | Whether the current lap is valid |
| `current_sector_index` | `i32` | - | Current sector index (0, 1, 2) |
| `normalized_car_position` | `f32` | 0.0-1.0 | Normalized position on the track (0.0 = start/finish) |
| `distance_traveled` | `f32` | m | Total distance traveled in the session (meters) |
| `fuel_estimated_laps` | `f32` | - | Estimated laps remaining with current fuel |
| `session_time_left` | `f32` | s | Time remaining in the session (seconds) |

### Car & Pit Status

| Field | Type | Description |
|-------|------|-------------|
| `is_in_pit` | `bool` | Whether the car is in the pit area |
| `is_in_pit_lane` | `bool` | Whether the car is in the pit lane |
| `ideal_line_on` | `bool` | Whether the ideal racing line is enabled |
| `mandatory_pit_done` | `bool` | Whether the mandatory pit stop is complete |
| `missing_mandatory_pits` | `i32` | Number of mandatory pit stops not yet completed |
| `penalty_time` | `f32` | Current penalty time in seconds |
| `penalty` | `i32` | Type of penalty applied (enum: AccPenaltyType) |

### Flag Status

| Field | Type | Description |
|-------|------|-------------|
| `flag` | `i32` | Current flag status (enum: AccFlagType) |
| `global_yellow` | `bool` | Global yellow flag active |
| `global_yellow_s1` | `bool` | Sector 1 yellow flag active |
| `global_yellow_s2` | `bool` | Sector 2 yellow flag active |
| `global_yellow_s3` | `bool` | Sector 3 yellow flag active |
| `global_white` | `bool` | Global white flag active (final lap) |
| `global_green` | `bool` | Global green flag active |
| `global_chequered` | `bool` | Global chequered flag active |
| `global_red` | `bool` | Global red flag active |

### Player/Car Identifiers

| Field | Type | Description |
|-------|------|-------------|
| `player_car_id` | `i32` | Car ID of the player |
| `car_id` | `Vec<i32>` | Car IDs for all cars in the session |
| `active_cars` | `i32` | Number of active cars in the session |
| `car_coordinates` | `Vec<Vector3f>` | World coordinates for all cars |

### Environment & Conditions

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `wind_speed` | `f32` | m/s | Wind speed |
| `wind_direction` | `f32` | degrees | Wind direction (0-360°) |
| `rain_intensity` | `i32` | - | Current rain intensity (enum: AccRainIntensity) |
| `rain_intensity_in_10min` | `i32` | - | Rain intensity forecast in 10 minutes |
| `rain_intensity_in_30min` | `i32` | - | Rain intensity forecast in 30 minutes |
| `track_grip_status` | `i32` | - | Current track grip status (enum: AccTrackGripStatus) |
| `track_status` | `String` | - | Track status description |
| `clock` | `f32` | s | In-game clock time (seconds) |

### Driver & Controls

| Field | Type | Description |
|-------|------|-------------|
| `tc_level` | `i32` | Traction control level (0-12) |
| `tc_cut_level` | `i32` | Traction control cut level |
| `engine_map` | `i32` | Engine map setting |
| `abs_level` | `i32` | ABS level |
| `wiper_stage` | `i32` | Wiper stage (0-4) |
| `rain_tyres` | `bool` | Whether rain tyres are equipped |
| `driver_stint_total_time_left` | `i32` | Total time left in driver stint (seconds) |
| `driver_stint_time_left` | `i32` | Time left in current driver stint (seconds) |

### Lighting & Signals

| Field | Type | Description |
|-------|------|-------------|
| `rain_light` | `bool` | Rain light is on |
| `flashing_light` | `bool` | Flashing light is on |
| `light_stage` | `i32` | Light stage (0=off, 1-4=stages) |
| `direction_light_left` | `bool` | Left turn signal is on |
| `direction_light_right` | `bool` | Right turn signal is on |

### Setup/Interface State

| Field | Type | Description |
|-------|------|-------------|
| `tyre_compound` | `String` | Current tyre compound name |
| `is_setup_menu_visible` | `bool` | Setup menu is visible |
| `main_display_index` | `i32` | Main display page index |
| `secondary_display_index` | `i32` | Secondary display page index |

### Telemetry Extras

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `fuel_per_lap` | `f32` | L | Average fuel used per lap |
| `used_fuel` | `f32` | L | Total fuel used in session |
| `exhaust_temp` | `f32` | °C | Exhaust temperature |
| `gap_ahead` | `i32` | ms | Gap to car ahead in milliseconds |
| `gap_behind` | `i32` | ms | Gap to car behind in milliseconds |

### MFD (Multifunction Display) Inputs

| Field | Type | Description |
|-------|------|-------------|
| `mfd_tyre_set` | `i32` | Selected tyre set on MFD |
| `mfd_fuel_to_add` | `f32` | Fuel to add setting on MFD (liters) |
| `mfd_tyre_pressure` | `Wheels` | Tyre pressure settings on MFD |

### Tyre Strategy

| Field | Type | Description |
|-------|------|-------------|
| `current_tyre_set` | `i32` | Current tyre set index |
| `strategy_tyre_set` | `i32` | Strategy tyre set index |

---

## Usage Examples

### Accessing Timing Data

```tsx
import { useAccGraphics } from "@/contexts/AccGraphicsContext"

export function LapTimer() {
  const { frame } = useAccGraphics()
  
  // Get formatted lap time strings
  const currentTime = frame?.data?.current_time_str
  const bestTime = frame?.data?.best_time_str
  const lastTime = frame?.data?.last_time_str
  
  // Get delta timing
  const deltaStr = frame?.data?.delta_lap_time_str
  const isPositive = frame?.data?.is_delta_positive
  
  return (
    <div>
      <div>Current: {currentTime}</div>
      <div>Best: {bestTime}</div>
      <div>Last: {lastTime}</div>
      <div className={isPositive ? "red" : "green"}>
        Δ {deltaStr}
      </div>
    </div>
  )
}
```

### Accessing Session Status

```tsx
import { useAccGraphics } from "@/contexts/AccGraphicsContext"

export function SessionInfo() {
  const { frame } = useAccGraphics()
  
  const position = frame?.data?.position
  const completedLaps = frame?.data?.completed_lap
  const sessionTimeLeft = frame?.data?.session_time_left
  
  // Check flags
  const isYellow = frame?.data?.global_yellow
  const isRed = frame?.data?.global_red
  const isChequered = frame?.data?.global_chequered
  
  return (
    <div>
      <div>Position: P{position}</div>
      <div>Laps: {completedLaps}</div>
      <div>Time left: {sessionTimeLeft}s</div>
      {isRed && <div>🔴 RED FLAG</div>}
      {isYellow && <div>🟡 YELLOW FLAG</div>}
      {isChequered && <div>🏁 CHEQUERED FLAG</div>}
    </div>
  )
}
```

### Accessing Environmental Data

```tsx
import { useAccGraphics } from "@/contexts/AccGraphicsContext"

export function WeatherWidget() {
  const { frame } = useAccGraphics()
  
  const rainIntensity = frame?.data?.rain_intensity
  const rainIn10 = frame?.data?.rain_intensity_in_10min
  const rainIn30 = frame?.data?.rain_intensity_in_30min
  const windSpeed = frame?.data?.wind_speed
  const windDir = frame?.data?.wind_direction
  const hasRainTyres = frame?.data?.rain_tyres
  
  return (
    <div>
      <div>Rain: Intensity {rainIntensity}</div>
      <div>Rain in 10min: {rainIn10}</div>
      <div>Rain in 30min: {rainIn30}</div>
      <div>Wind: {windSpeed}m/s @ {windDir}°</div>
      {hasRainTyres && <div>🌧️ Rain Tyres</div>}
    </div>
  )
}
```

### Accessing Driver Controls

```tsx
import { useAccGraphics } from "@/contexts/AccGraphicsContext"

export function DriverAssists() {
  const { frame } = useAccGraphics()
  
  const tcLevel = frame?.data?.tc_level
  const absLevel = frame?.data?.abs_level
  const engineMap = frame?.data?.engine_map
  const brakeBias = frame?.data?.brake_bias // Note: this is from physics, but useful here
  
  return (
    <div>
      <div>TC: {tcLevel}/12</div>
      <div>ABS: {absLevel}</div>
      <div>Engine: Map {engineMap}</div>
      <div>Brake Bias: {brakeBias}%</div>
    </div>
  )
}
```

### Checking Pit Status

```tsx
import { useAccGraphics } from "@/contexts/AccGraphicsContext"

export function PitInfo() {
  const { frame } = useAccGraphics()
  
  const isInPit = frame?.data?.is_in_pit
  const isInPitLane = frame?.data?.is_in_pit_lane
  const mandatoryPitsDone = frame?.data?.mandatory_pit_done
  const missingMandatoryPits = frame?.data?.missing_mandatory_pits
  const penaltyTime = frame?.data?.penalty_time
  
  return (
    <div>
      {isInPit && <div>🏁 IN PIT</div>}
      {isInPitLane && <div>🏁 PIT LANE</div>}
      <div>Mandatory Pits: {mandatoryPitsDone ? "✓ Done" : `${missingMandatoryPits} remaining`}</div>
      {penaltyTime > 0 && <div>⚠️ Penalty: {penaltyTime}s</div>}
    </div>
  )
}
```

### Calculating Derived Values

```tsx
import { useAccGraphics } from "@/contexts/AccGraphicsContext"

export function RaceStrategy() {
  const { frame } = useAccGraphics()
  
  // Calculate fuel remaining in laps
  const fuelEstimatedLaps = frame?.data?.fuel_estimated_laps
  const completedLaps = frame?.data?.completed_lap
  const lapsRemaining = frame?.data?.number_of_laps - completedLaps
  
  // Check if we need to pit for fuel
  const needsPitForFuel = fuelEstimatedLaps < lapsRemaining
  
  // Calculate session progress
  const totalLaps = frame?.data?.number_of_laps
  const progressPercent = (completedLaps / totalLaps) * 100
  
  return (
    <div>
      <div>Progress: {progressPercent.toFixed(1)}%</div>
      <div>Laps remaining: {lapsRemaining}</div>
      <div>Fuel left: {fuelEstimatedLaps.toFixed(1)} laps</div>
      {needsPitForFuel && <div>⚠️ PIT FOR FUEL</div>}
    </div>
  )
}
```

---

## Data Types

### Vector3f

Three-dimensional floating-point vector:

```tsx
interface Vector3f {
  x: number
  y: number
  z: number
}
```

### Wheels Array

Four-element array for per-wheel data (Front-Left, Front-Right, Rear-Left, Rear-Right):

```tsx
type WheelData = [number, number, number, number]
// Index: [0=FL, 1=FR, 2=RL, 3=RR]
```

### Enums

Common enum values used in graphics data:

```tsx
// AccStatus
const AccStatus = {
  OFF: 0,
  REPLAY: 1,
  LIVE: 2,
  PAUSE: 3,
}

// AccSessionType
const AccSessionType = {
  PRACTICE: 0,
  QUALIFY: 1,
  RACE: 2,
  HOTLAP: 3,
  TIME_ATTACK: 4,
  DRIFT: 5,
  DRAG: 6,
}

// AccPenaltyType
const AccPenaltyType = {
  NONE: 0,
  DRIVE_THROUGH_CUTTING: 1,
  STOP_AND_GO_10_CUTTING: 2,
  STOP_AND_GO_20_CUTTING: 3,
  STOP_AND_GO_30_CUTTING: 4,
  DISQUALIFIED_CUTTING: 5,
  REMOVE_BEST_LAP_TIME_CUTTING: 6,
  DRIVE_THROUGH_PITSPEED: 7,
  DISQUALIFIED_PITSPEED: 8,
  DRIVE_THROUGH_IGNORED_MANDATORY_PIT: 9,
  DISQUALIFIED_IGNORED_MANDATORY_PIT: 10,
}

// AccFlagType
const AccFlagType = {
  NONE: 0,
  BLUE: 1,
  YELLOW: 2,
  BLACK: 3,
  WHITE: 4,
  CHEQUERED: 5,
  BLACK_WHITE: 6,
}

// AccRainIntensity
const AccRainIntensity = {
  CLEAR: 0,
  LIGHT: 1,
  MEDIUM: 2,
  HEAVY: 3,
}

// AccTrackGripStatus
const AccTrackGripStatus = {
  GREEN: 0,
  FAST: 1,
  OPTIMUM: 2,
  GREASY: 3,
  DAMP: 4,
  WET: 5,
  FLOODED: 6,
}
```

---

## Performance Notes

- Graphics data is emitted at 60 Hz (every ~16ms)
- All fields are optional and may be `null` if not available
- Use optional chaining (`?.`) to safely access nested fields
- Avoid destructuring entire objects in render functions
- Memoize expensive calculations with `useMemo`
- Graphics data complements physics data - use together for complete telemetry

---

## See Also

- [ACC Telemetry Guide](./ACC_TELEMETRY.md) - How to access graphics data
- [Physics Map Reference](./PHYSICS_MAP.md) - Real-time physics telemetry
- [Static Data Reference](./STATICS.md) - Session metadata fields
