# Static Data Reference

Static data contains session metadata that doesn't change during a session. It's fetched once when ACC connects.

## Overview

Static data is retrieved via the `get_acc_statics` command and includes:

- Track and car information
- Driver details
- Session configuration
- Assist settings
- Version information

## Complete Field Reference

### Session Information

| Field              | Type      | Description                                                   |
| ------------------ | --------- | ------------------------------------------------------------- |
| `track`            | `string`  | Track name (e.g., "Monza", "Spa-Francorchamps")               |
| `carModel`         | `string`  | Car model name (e.g., "Ferrari 488 GT3", "Porsche 911 GT3 R") |
| `isOnline`         | `boolean` | Whether this is an online session                             |
| `numCars`          | `i32`     | Number of cars in the session                                 |
| `numberOfSessions` | `i32`     | Total number of sessions in the event                         |
| `sectorCount`      | `i32`     | Number of track sectors                                       |

### Driver Information

| Field           | Type     | Description              |
| --------------- | -------- | ------------------------ |
| `playerName`    | `string` | Driver's first name      |
| `playerSurname` | `string` | Driver's last name       |
| `playerNick`    | `string` | Driver's nickname/handle |

### Car Configuration

| Field          | Type     | Unit   | Description                     |
| -------------- | -------- | ------ | ------------------------------- |
| `maxRpm`       | `i32`    | RPM    | Maximum engine RPM for this car |
| `maxFuel`      | `f32`    | liters | Maximum fuel tank capacity      |
| `dryTyresName` | `string` | -      | Dry tyre compound name          |
| `wetTyresName` | `string` | -      | Wet tyre compound name          |

### Assists & Penalties

| Field                 | Type      | Description                          |
| --------------------- | --------- | ------------------------------------ |
| `penaltyEnabled`      | `boolean` | Penalties are active in this session |
| `aidFuelRate`         | `f32`     | Fuel consumption aid (0.0-1.0)       |
| `aidTyreRate`         | `f32`     | Tyre wear aid (0.0-1.0)              |
| `aidMechanicalDamage` | `f32`     | Mechanical damage aid (0.0-1.0)      |
| `aidStability`        | `f32`     | Stability control aid (0.0-1.0)      |
| `aidAutoClutch`       | `boolean` | Auto-clutch is enabled               |

### Pit Window

| Field            | Type  | Description                   |
| ---------------- | ----- | ----------------------------- |
| `pitWindowStart` | `i32` | Pit window opens at this lap  |
| `pitWindowEnd`   | `i32` | Pit window closes at this lap |

### Version Information

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `smVersion` | `string` | Shared memory version (e.g., "1.16") |
| `acVersion` | `string` | ACC version (e.g., "1.8.14")         |

---

## Usage Examples

### Basic Fetch

```tsx
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function SessionHeader() {
  const [statics, setStatics] = useState(null);

  useEffect(() => {
    invoke("get_acc_statics")
      .then(setStatics)
      .catch((err) => console.error("Failed to fetch statics", err));
  }, []);

  if (!statics) return <div>Loading session info...</div>;

  return (
    <div>
      <h1>{statics.track}</h1>
      <p>
        {statics.playerName} {statics.playerSurname}
      </p>
      <p>Car: {statics.carModel}</p>
    </div>
  );
}
```

### Reusable Hook

```tsx
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useRef, useState } from "react";

export function useAccStatics() {
  const [statics, setStatics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  const fetch = useCallback(async () => {
    if (fetchedRef.current) return;

    setLoading(true);
    try {
      const res = await invoke("get_acc_statics");
      setStatics(res);
      setError(null);
      fetchedRef.current = true;
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch statics", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { statics, loading, error, fetch, isFetched: fetchedRef.current };
}

// Usage
export function MyComponent() {
  const { statics, fetch } = useAccStatics();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return <div>{statics?.track}</div>;
}
```

### Pit Strategy

```tsx
const { statics } = useAccStatics();
const { frame } = useAccPhysics();

function getPitStrategy() {
  const currentLap = frame?.data?.lap_count ?? 0;
  const pitStart = statics?.pitWindowStart;
  const pitEnd = statics?.pitWindowEnd;

  if (currentLap < pitStart) {
    return `Pit window opens in ${pitStart - currentLap} laps`;
  } else if (currentLap <= pitEnd) {
    return "Pit window is OPEN";
  } else {
    return "Pit window has closed";
  }
}
```

### Fuel Strategy

```tsx
const { statics } = useAccStatics();
const { frame } = useAccPhysics();

function calculateFuelNeeded(lapsRemaining) {
  const maxFuel = statics?.maxFuel ?? 0;
  const currentFuel = frame?.data?.fuel ?? 0;
  const fuelPerLap = maxFuel / 30; // Estimate: 30 laps per tank

  const fuelNeeded = lapsRemaining * fuelPerLap;
  const fuelShortfall = Math.max(0, fuelNeeded - currentFuel);

  return {
    fuelNeeded,
    currentFuel,
    shortfall: fuelShortfall,
    needsPit: fuelShortfall > 0,
  };
}
```

### Tyre Strategy

```tsx
const { statics } = useAccStatics();

function getTyreInfo() {
  return {
    dryCompound: statics?.dryTyresName,
    wetCompound: statics?.wetTyresName,
    maxRpm: statics?.maxRpm,
    maxFuel: statics?.maxFuel,
  };
}
```

---

## Timing of Fetches

### When to Fetch

✅ **After ACC connects** (when `isRunning` becomes true)
✅ **Once per session** (cache the result)
✅ **When session changes** (detect via `playerName` change)

### When NOT to Fetch

❌ **Every frame** (it's static data, doesn't change)
❌ **Before ACC is running** (will fail)
❌ **In render functions** (use `useEffect`)

---

## Combining with Physics Data

```tsx
import { useAccPhysics } from "@/contexts/AccPhysicsContext";
import { useAccStatics } from "@/hooks/useAccStatics";

export function RaceEngineer() {
  const { frame } = useAccPhysics();
  const { statics } = useAccStatics();

  if (!statics || !frame?.data) return <div>Loading...</div>;

  const speed = frame.data.speed_kmh;
  const maxRpm = statics.maxRpm;
  const rpm = frame.data.rpm;
  const rpmPercent = (rpm / maxRpm) * 100;

  return (
    <div>
      <h2>
        {statics.playerName} at {statics.track}
      </h2>
      <p>Speed: {speed?.toFixed(1)} km/h</p>
      <p>
        RPM: {rpm} / {maxRpm} ({rpmPercent.toFixed(0)}%)
      </p>
      <p>
        Fuel: {frame.data.fuel?.toFixed(1)}L / {statics.maxFuel}L
      </p>
    </div>
  );
}
```

---

## Error Handling

```tsx
const { statics, error } = useAccStatics();

if (error) {
  return (
    <div className="error">
      <p>Failed to load session info: {error}</p>
      <p>Make sure ACC is running and shared memory is available.</p>
    </div>
  );
}
```

---

## See Also

- [ACC Telemetry Guide](./ACC_TELEMETRY.md) - How to access physics data
- [Physics Map Reference](./PHYSICS_MAP.md) - All physics fields
