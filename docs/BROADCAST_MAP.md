# Broadcast Map - Complete Field Reference

This document provides a comprehensive reference of all message types and fields available in the ACC Broadcasting API data stream.

## Overview

The broadcast map provides real-time multiplayer session data from Assetto Corsa Competizione via the Broadcasting API. It includes:
- Session information (weather, track conditions, time)
- Real-time car positions and telemetry
- Entry list (cars, teams, drivers)
- Track data and camera information
- Race events and notifications

The broadcast stream operates at approximately 10 Hz (100ms update interval) and is separate from the physics/graphics shared memory streams.

## Message Types

### RegistrationResult

Received after connecting to the broadcast server. Confirms successful registration.

| Field | Type | Description |
|-------|------|-------------|
| `connection_id` | `number` | Unique identifier for this connection |
| `success` | `boolean` | Whether registration was successful |
| `is_readonly` | `boolean` | Whether this connection has read-only access |
| `error_msg` | `string?` | Error message if registration failed |

---

### RealtimeUpdate

The primary message containing session-wide information. Emitted regularly during a session.

#### Session Information

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `event_index` | `number` | - | Current event index |
| `session_index` | `number` | - | Current session index (0=Practice, etc.) |
| `session_type` | `string` | - | Session type name (e.g., "Practice", "Qualifying", "Race") |
| `phase` | `string` | - | Current session phase (e.g., "PreSession", "Session", "SessionOver") |
| `session_time` | `number` | ms | Current session time in milliseconds |
| `session_end_time` | `number` | ms | Session end time in milliseconds |
| `time_of_day` | `number` | ms | Time of day in milliseconds since midnight |

#### Camera & HUD

| Field | Type | Description |
|-------|------|-------------|
| `focused_car_index` | `number` | Index of currently focused car |
| `active_camera_set` | `string` | Active camera set name |
| `active_camera` | `string` | Active camera name |
| `current_hud_page` | `string` | Current HUD page identifier |

#### Replay State

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `is_replay_playing` | `boolean` | - | Whether replay is currently playing |
| `replay_session_time` | `number?` | ms | Current time in replay (if playing) |
| `replay_remaining_time` | `number?` | ms | Remaining time in replay (if playing) |

#### Weather & Track Conditions

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `ambient_temp` | `number` | °C | Ambient air temperature |
| `track_temp` | `number` | °C | Track surface temperature |
| `clouds` | `number` | 0.0-1.0 | Cloud coverage (0=clear, 1=overcast) |
| `rain_level` | `number` | 0.0-1.0 | Current rain intensity |
| `wetness` | `number` | 0.0-1.0 | Track wetness level |

#### Best Session Lap

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `best_session_lap.lap_time_ms` | `number` | ms | Best lap time in milliseconds |
| `best_session_lap.car_index` | `number` | - | Car index that set the best lap |
| `best_session_lap.driver_index` | `number` | - | Driver index that set the best lap |
| `best_session_lap.splits` | `number[]?` | ms | Sector split times |
| `best_session_lap.is_invalid` | `boolean` | - | Whether the lap was invalid |
| `best_session_lap.is_valid_for_best` | `boolean` | - | Whether valid for best lap time |
| `best_session_lap.is_out_lap` | `boolean` | - | Whether this was an out lap |
| `best_session_lap.is_in_lap` | `boolean` | - | Whether this was an in lap |

---

### RealtimeCarUpdate

Real-time telemetry for an individual car. Received frequently for each car in the session.

#### Car Identification

| Field | Type | Description |
|-------|------|-------------|
| `car_index` | `number` | Unique car index in the session |
| `driver_index` | `number` | Current driver index |
| `driver_count` | `number` | Total number of drivers for this car |

#### Position & Motion

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `world_pos_x` | `number` | m | World X position |
| `world_pos_y` | `number` | m | World Y position |
| `yaw` | `number` | radians | Car yaw angle |
| `spline_position` | `number` | 0.0-1.0 | Normalized position on track (0=start, 1=finish) |
| `track_position` | `number` | - | Track position identifier |
| `kmh` | `number` | km/h | Current speed |

#### Race Position

| Field | Type | Description |
|-------|------|-------------|
| `position` | `number` | Overall race position (1-based) |
| `cup_position` | `number` | Position within cup category |
| `lap_count` | `number` | Number of completed laps |
| `delta` | `number` | Time delta to leader/reference (milliseconds) |

#### Car Status

| Field | Type | Description |
|-------|------|-------------|
| `gear` | `number` | Current gear (0=neutral, -1=reverse) |
| `car_location` | `string` | Current location (e.g., "Track", "Pitlane", "PitEntry", "PitExit") |

#### Lap Timing

Each lap object contains:

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `lap_time_ms` | `number` | ms | Lap time in milliseconds |
| `splits` | `number[]?` | ms | Array of sector split times |
| `is_invalid` | `boolean` | - | Whether the lap is invalid (cut track) |
| `is_valid_for_best` | `boolean` | - | Whether valid for best lap consideration |
| `is_out_lap` | `boolean` | - | Whether this is an out lap from pits |
| `is_in_lap` | `boolean` | - | Whether this is an in lap to pits |

##### best_session_lap
The car's personal best lap in this session.

##### last_lap
The most recently completed lap.

##### current_lap
The lap currently in progress.

---

### EntryList

Complete list of all cars entered in the session. Usually received once at session start.

| Field | Type | Description |
|-------|------|-------------|
| `connection_id` | `number` | Connection identifier |
| `entries` | `Array` | Array of car entries (see below) |

#### Entry Object

| Field | Type | Description |
|-------|------|-------------|
| `car_index` | `number` | Unique car index |
| `car_model_type` | `number` | Car model type ID |
| `team_name` | `string` | Team/car name |
| `race_number` | `number` | Car racing number |
| `cup_category` | `number` | Cup category (0=Overall, 1=ProAm, 2=Am, 3=Silver, 4=National) |
| `current_driver_index` | `number` | Index of current driver |
| `nationality` | `number` | Team/car nationality code |
| `drivers` | `Array` | Array of driver objects (see below) |

#### Driver Object

| Field | Type | Description |
|-------|------|-------------|
| `first_name` | `string` | Driver's first name |
| `last_name` | `string` | Driver's last name |
| `short_name` | `string` | Driver's short name (3 letters) |
| `category` | `number` | Driver category (0=Bronze, 1=Silver, 2=Gold, 3=Platinum) |
| `nationality` | `number` | Driver nationality code |

---

### EntryListCar

Single car entry update. Received when a car joins or its entry data changes.

Contains the same fields as an entry object in `EntryList` (see above).

---

### TrackData

Information about the current track. Received once after registration.

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `connection_id` | `number` | - | Connection identifier |
| `track_name` | `string` | - | Track name |
| `track_id` | `number` | - | Track ID |
| `track_meters` | `number` | m | Track length in meters |
| `camera_sets` | `Record<string, string[]>` | - | Available camera sets and cameras |
| `hud_pages` | `string[]` | - | Available HUD pages |

---

### BroadcastingEvent

Real-time event notifications (e.g., accidents, penalties, pit stops).

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `event_type` | `string` | - | Type of event (e.g., "Accident", "LapCompleted", "PenaltyServed") |
| `msg` | `string` | - | Human-readable event message |
| `time_ms` | `number` | ms | Session time when event occurred |
| `car_index` | `number` | - | Car index involved in the event |

---

## Usage Examples

### Basic Connection Status

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function BroadcastStatus() {
  const { status, message } = useAccBroadcast()
  
  return (
    <div>
      <span>Broadcast: {status}</span>
      {message && <p>{message}</p>}
    </div>
  )
}
```

### Session Information

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function SessionInfo() {
  const { frame } = useAccBroadcast()
  
  const realtimeUpdate = frame?.data?.RealtimeUpdate
  
  if (!realtimeUpdate) return null
  
  const sessionTimeSeconds = realtimeUpdate.session_time / 1000
  const sessionEndSeconds = realtimeUpdate.session_end_time / 1000
  const timeRemaining = sessionEndSeconds - sessionTimeSeconds
  
  return (
    <div>
      <h3>{realtimeUpdate.session_type}</h3>
      <p>Phase: {realtimeUpdate.phase}</p>
      <p>Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toFixed(0).padStart(2, '0')}</p>
      <p>Track Temp: {realtimeUpdate.track_temp}°C</p>
      <p>Ambient Temp: {realtimeUpdate.ambient_temp}°C</p>
    </div>
  )
}
```

### Weather Conditions

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function WeatherDisplay() {
  const { frame } = useAccBroadcast()
  
  const weather = frame?.data?.RealtimeUpdate
  
  if (!weather) return null
  
  const rainIntensity = weather.rain_level
  const wetness = weather.wetness
  const clouds = weather.clouds
  
  const getRainStatus = () => {
    if (rainIntensity === 0) return "☀️ Dry"
    if (rainIntensity < 0.3) return "🌦️ Light Rain"
    if (rainIntensity < 0.6) return "🌧️ Moderate Rain"
    return "⛈️ Heavy Rain"
  }
  
  return (
    <div>
      <div>{getRainStatus()}</div>
      <div>Track Wetness: {(wetness * 100).toFixed(0)}%</div>
      <div>Cloud Cover: {(clouds * 100).toFixed(0)}%</div>
    </div>
  )
}
```

### Live Standings

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"
import { useMemo } from "react"

export function LiveStandings() {
  const { frame } = useAccBroadcast()
  
  const entryList = frame?.data?.EntryList
  const carUpdates = useMemo(() => {
    // Collect all RealtimeCarUpdate messages
    const updates: any[] = []
    if (frame?.data?.RealtimeCarUpdate) {
      updates.push(frame.data.RealtimeCarUpdate)
    }
    return updates
  }, [frame])
  
  const standings = useMemo(() => {
    return carUpdates
      .sort((a, b) => a.position - b.position)
      .map(car => {
        const entry = entryList?.entries.find(e => e.car_index === car.car_index)
        return {
          position: car.position,
          carNumber: entry?.race_number || car.car_index,
          teamName: entry?.team_name || "Unknown",
          driver: entry?.drivers[car.driver_index],
          lapCount: car.lap_count,
          delta: car.delta,
          lastLapTime: car.last_lap?.lap_time_ms,
          bestLapTime: car.best_session_lap?.lap_time_ms,
        }
      })
  }, [carUpdates, entryList])
  
  return (
    <div>
      <h2>Live Standings</h2>
      <table>
        <thead>
          <tr>
            <th>Pos</th>
            <th>#</th>
            <th>Driver</th>
            <th>Team</th>
            <th>Laps</th>
            <th>Last Lap</th>
            <th>Best Lap</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(car => (
            <tr key={car.carNumber}>
              <td>{car.position}</td>
              <td>{car.carNumber}</td>
              <td>{car.driver?.short_name}</td>
              <td>{car.teamName}</td>
              <td>{car.lapCount}</td>
              <td>{formatLapTime(car.lastLapTime)}</td>
              <td>{formatLapTime(car.bestLapTime)}</td>
              <td>{formatDelta(car.delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatLapTime(ms?: number) {
  if (!ms) return "-"
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(3)
  return `${minutes}:${seconds.padStart(6, '0')}`
}

function formatDelta(ms: number) {
  if (ms === 0) return "Leader"
  const sign = ms > 0 ? "+" : ""
  return `${sign}${(ms / 1000).toFixed(3)}s`
}
```

### Track Position Visual

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function TrackMap() {
  const { frame } = useAccBroadcast()
  
  const cars = frame?.data?.RealtimeCarUpdate
  const trackData = frame?.data?.TrackData
  
  if (!cars || !trackData) return null
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '400px' }}>
      <svg viewBox="0 0 1000 400">
        {/* Simple track oval representation */}
        <ellipse cx="500" cy="200" rx="450" ry="150" 
          fill="none" stroke="#333" strokeWidth="40" />
        
        {/* Plot car positions */}
        {Array.isArray(cars) && cars.map(car => {
          // Convert spline position (0-1) to angle around oval
          const angle = car.spline_position * Math.PI * 2
          const x = 500 + Math.cos(angle) * 450
          const y = 200 + Math.sin(angle) * 150
          
          return (
            <circle
              key={car.car_index}
              cx={x}
              cy={y}
              r="8"
              fill={car.position === 1 ? "gold" : "white"}
            />
          )
        })}
      </svg>
    </div>
  )
}
```

### Best Lap Tracker

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"

export function BestLapInfo() {
  const { frame } = useAccBroadcast()
  
  const bestLap = frame?.data?.RealtimeUpdate?.best_session_lap
  const entryList = frame?.data?.EntryList
  
  if (!bestLap) return <div>No best lap yet</div>
  
  const car = entryList?.entries.find(e => e.car_index === bestLap.car_index)
  const driver = car?.drivers[bestLap.driver_index]
  
  return (
    <div>
      <h3>Best Lap</h3>
      <p>Time: {formatLapTime(bestLap.lap_time_ms)}</p>
      <p>Driver: {driver?.first_name} {driver?.last_name}</p>
      <p>Team: {car?.team_name}</p>
      <p>Car #{car?.race_number}</p>
      {bestLap.splits && (
        <div>
          <h4>Sector Times</h4>
          {bestLap.splits.map((time, i) => (
            <p key={i}>S{i + 1}: {(time / 1000).toFixed(3)}s</p>
          ))}
        </div>
      )}
    </div>
  )
}

function formatLapTime(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(3)
  return `${minutes}:${seconds.padStart(6, '0')}`
}
```

### Broadcasting Events Feed

```tsx
import { useAccBroadcast } from "@/contexts/AccBroadcastContext"
import { useEffect, useState } from "react"

export function EventsFeed() {
  const { frame } = useAccBroadcast()
  const [events, setEvents] = useState<any[]>([])
  
  useEffect(() => {
    const event = frame?.data?.BroadcastingEvent
    if (event) {
      setEvents(prev => [event, ...prev].slice(0, 10)) // Keep last 10 events
    }
  }, [frame?.data?.BroadcastingEvent])
  
  return (
    <div>
      <h3>Live Events</h3>
      {events.map((event, i) => (
        <div key={i} style={{ padding: '8px', borderBottom: '1px solid #333' }}>
          <strong>{event.event_type}</strong>
          <p>{event.msg}</p>
          <small>Car #{event.car_index} @ {(event.time_ms / 1000).toFixed(1)}s</small>
        </div>
      ))}
    </div>
  )
}
```

---

## Data Types

### Enums

#### Session Type
- `"Practice"`
- `"Qualifying"`
- `"Superpole"`
- `"Race"`
- `"Hotlap"`
- `"Hotstint"`
- `"HotlapSuperpole"`
- `"Replay"`

#### Session Phase
- `"None"`
- `"Starting"`
- `"PreFormation"`
- `"FormationLap"`
- `"PreSession"`
- `"Session"`
- `"SessionOver"`
- `"PostSession"`
- `"ResultUI"`

#### Car Location
- `"None"`
- `"Track"`
- `"Pitlane"`
- `"PitEntry"`
- `"PitExit"`

#### Cup Category
- `0` - Overall
- `1` - ProAm
- `2` - Am
- `3` - Silver
- `4` - National

#### Driver Category
- `0` - Bronze
- `1` - Silver
- `2` - Gold
- `3` - Platinum

---

## Performance Notes

- Broadcast data updates at approximately 10 Hz (every 100ms)
- Much lower frequency than physics (333 Hz) and graphics (60 Hz)
- Ideal for spectator features, standings, and session information
- Not suitable for real-time driver telemetry (use physics/graphics for that)
- Each message type is independent - check which message is present
- Connection requires ACC to have broadcast API enabled in server settings

---

## Enabling ACC Broadcast API

For the broadcast stream to work, ACC must be configured as a server with broadcasting enabled:

1. Start ACC in Server Mode or enable broadcasting in configuration
2. Set broadcast port (default: 9000) in `server_cfg.json`
3. Optionally set connection password
4. RelayDrive will automatically attempt to connect when ACC is detected

---

## See Also

- [ACC Telemetry Guide](./ACC_TELEMETRY.md) - Overview of all data sources
- [Physics Map Reference](./PHYSICS_MAP.md) - Real-time physics telemetry
- [Graphics Map Reference](./GRAPHICS_MAP.md) - Session and timing data
- [Static Data Reference](./STATICS.md) - Session metadata

