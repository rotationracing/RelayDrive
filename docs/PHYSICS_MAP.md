# Physics Map - Complete Field Reference

This document provides a comprehensive reference of all fields available in the ACC physics data stream.

## Overview

The physics map is emitted at 60 FPS and contains real-time telemetry from Assetto Corsa Competizione. All fields are optional (`Option<T>`) and may be `null` if not available.

## Field Categories

### Metadata

| Field       | Type  | Unit | Description                                                      |
| ----------- | ----- | ---- | ---------------------------------------------------------------- |
| `packet_id` | `i32` | -    | Unique identifier for telemetry packet (increments every update) |

### Driver Inputs

| Field               | Type   | Range   | Description                                            |
| ------------------- | ------ | ------- | ------------------------------------------------------ |
| `gas`               | `f32`  | 0.0-1.0 | Throttle pedal position                                |
| `brake`             | `f32`  | 0.0-1.0 | Brake pedal position                                   |
| `clutch`            | `f32`  | 0.0-1.0 | Clutch pedal position                                  |
| `steer_angle`       | `f32`  | degrees | Steering wheel angle                                   |
| `gear`              | `i32`  | 0+      | Current gear (0=neutral, 1+=forward gears, -1=reverse) |
| `rpm`               | `i32`  | -       | Engine revolutions per minute                          |
| `autoshifter_on`    | `bool` | -       | Automatic shifter enabled                              |
| `ignition_on`       | `bool` | -       | Ignition is on                                         |
| `starter_engine_on` | `bool` | -       | Starter engine engaged                                 |
| `is_engine_running` | `bool` | -       | Engine is currently running                            |

### Car Dynamics & Motion

| Field               | Type       | Unit    | Description                            |
| ------------------- | ---------- | ------- | -------------------------------------- |
| `speed_kmh`         | `f32`      | km/h    | Current car speed                      |
| `velocity`          | `Vector3f` | m/s     | World-space velocity (x, y, z)         |
| `local_velocity`    | `Vector3f` | m/s     | Local-space velocity (x, y, z)         |
| `local_angular_vel` | `Vector3f` | rad/s   | Local-space angular velocity (x, y, z) |
| `g_force`           | `Vector3f` | g       | G-force vector (x, y, z)               |
| `heading`           | `f32`      | radians | Car heading angle (yaw)                |
| `pitch`             | `f32`      | radians | Car pitch angle                        |
| `roll`              | `f32`      | radians | Car roll angle                         |
| `final_ff`          | `f32`      | -       | Final force feedback value             |

### Wheels & Tyres

#### Per-Wheel Arrays (4 elements: FL, FR, RL, RR)

| Field                 | Type       | Unit    | Description                             |
| --------------------- | ---------- | ------- | --------------------------------------- |
| `wheel_slip`          | `[f32; 4]` | -       | Wheel slip values                       |
| `wheel_pressure`      | `[f32; 4]` | psi     | Tyre pressure                           |
| `wheel_angular_speed` | `[f32; 4]` | rad/s   | Wheel angular speed                     |
| `tyre_core_temp`      | `[f32; 4]` | °C      | Tyre core temperature                   |
| `suspension_travel`   | `[f32; 4]` | mm      | Suspension travel distance              |
| `brake_temp`          | `[f32; 4]` | °C      | Brake temperature                       |
| `brake_pressure`      | `[f32; 4]` | bar     | Brake pressure                          |
| `suspension_damage`   | `[f32; 4]` | 0.0-1.0 | Suspension damage (0=none, 1=destroyed) |
| `slip_ratio`          | `[f32; 4]` | -       | Tyre slip ratio                         |
| `slip_angle`          | `[f32; 4]` | degrees | Tyre slip angle                         |
| `pad_life`            | `[f32; 4]` | %       | Brake pad life remaining                |
| `disc_life`           | `[f32; 4]` | %       | Brake disc life remaining               |

#### Brake Compounds

| Field                  | Type  | Description                |
| ---------------------- | ----- | -------------------------- |
| `front_brake_compound` | `i32` | Front brake compound index |
| `rear_brake_compound`  | `i32` | Rear brake compound index  |

#### Tyre Contact (3D Position Data)

| Field                  | Type            | Unit   | Description                          |
| ---------------------- | --------------- | ------ | ------------------------------------ |
| `tyre_contact_point`   | `[Vector3f; 4]` | meters | Contact point position for each tyre |
| `tyre_contact_normal`  | `[Vector3f; 4]` | -      | Contact normal vector for each tyre  |
| `tyre_contact_heading` | `[Vector3f; 4]` | -      | Contact heading vector for each tyre |

### Car Status

| Field              | Type   | Unit   | Description                   |
| ------------------ | ------ | ------ | ----------------------------- |
| `fuel`             | `f32`  | liters | Current fuel level            |
| `tc`               | `f32`  | %      | Traction control setting      |
| `abs`              | `f32`  | %      | ABS setting                   |
| `pit_limiter_on`   | `bool` | -      | Pit limiter active            |
| `turbo_boost`      | `f32`  | bar    | Turbo boost pressure          |
| `air_temp`         | `f32`  | °C     | Ambient air temperature       |
| `road_temp`        | `f32`  | °C     | Track surface temperature     |
| `water_temp`       | `f32`  | °C     | Engine water temperature      |
| `is_ai_controlled` | `bool` | -      | Car controlled by AI          |
| `brake_bias`       | `f32`  | %      | Brake bias (front percentage) |

#### Car Damage

| Field           | Type  | Range   | Description       |
| --------------- | ----- | ------- | ----------------- |
| `damage_front`  | `f32` | 0.0-1.0 | Front damage      |
| `damage_rear`   | `f32` | 0.0-1.0 | Rear damage       |
| `damage_left`   | `f32` | 0.0-1.0 | Left side damage  |
| `damage_right`  | `f32` | 0.0-1.0 | Right side damage |
| `damage_centre` | `f32` | 0.0-1.0 | Centre damage     |

### Vibration Feedback

| Field            | Type  | Range   | Description                   |
| ---------------- | ----- | ------- | ----------------------------- |
| `kerb_vibration` | `f32` | 0.0-1.0 | Kerb vibration intensity      |
| `slip_vibration` | `f32` | 0.0-1.0 | Tyre slip vibration intensity |
| `g_vibration`    | `f32` | 0.0-1.0 | G-force vibration intensity   |
| `abs_vibration`  | `f32` | 0.0-1.0 | ABS vibration intensity       |

---

## Usage Examples

### Accessing Wheel Data

```tsx
const { frame } = useAccPhysics();

// Get front-left tyre temperature
const flTyreTemp = frame?.data?.tyre_core_temp?.[0];

// Get all tyre temperatures
const tyrTemps = frame?.data?.tyre_core_temp;
// tyrTemps = [FL, FR, RL, RR]

// Get rear-right brake temperature
const rrBrakeTemp = frame?.data?.brake_temp?.[3];
```

### Accessing 3D Vectors

```tsx
const { frame } = useAccPhysics();

// Get G-force components
const gForce = frame?.data?.g_force;
const lateralG = gForce?.x;
const longitudinalG = gForce?.y;
const verticalG = gForce?.z;

// Get velocity
const velocity = frame?.data?.velocity;
const speedMs = Math.sqrt(velocity?.x ** 2 + velocity?.y ** 2 + velocity?.z ** 2);
```

### Calculating Derived Values

```tsx
// Tyre slip ratio (0 = perfect grip, >1 = sliding)
const slipRatio = frame?.data?.slip_ratio?.[0];
if (slipRatio > 0.1) {
  console.log("Front-left tyre is slipping");
}

// Brake pressure (0 = no braking, 1 = max)
const brakePressure = frame?.data?.brake_pressure?.[0];
const brakeIntensity = brakePressure / maxBrakePressure;

// Suspension damage
const suspensionHealth = 1 - (frame?.data?.suspension_damage?.[0] ?? 0);
```

---

## Data Types

### Vector3f

Three-dimensional floating-point vector:

```tsx
interface Vector3f {
  x: number;
  y: number;
  z: number;
}
```

### Wheels Array

Four-element array for per-wheel data (Front-Left, Front-Right, Rear-Left, Rear-Right):

```tsx
type WheelData = [number, number, number, number];
// Index: [0=FL, 1=FR, 2=RL, 3=RR]
```

---

## Coordinate Systems

### World Space

- X: Right
- Y: Up
- Z: Forward

### Local Space (Car-Relative)

- X: Right (car's right)
- Y: Up (car's up)
- Z: Forward (car's forward)

### Angles (Radians)

- Heading (Yaw): 0 = facing +Z, π/2 = facing +X
- Pitch: Positive = nose up
- Roll: Positive = right side up

Convert to degrees: `degrees = radians * (180 / Math.PI)`

---

## Performance Notes

- Physics data is emitted at 60 FPS (every ~16ms)
- All fields are optional and may be `null`
- Use optional chaining (`?.`) to safely access nested fields
- Avoid destructuring entire objects in render functions
- Memoize expensive calculations with `useMemo`

---

## See Also

- [ACC Telemetry Guide](./ACC_TELEMETRY.md) - How to access physics data
- [Static Data Reference](./STATICS.md) - Session metadata fields
