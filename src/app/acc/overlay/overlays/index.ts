import type { OverlayModule } from "../types"

import BroadcastDebugOverlay from "./broadcast-debug"
import DebugOverlay from "./test"
import DeltaBarOverlay from "./delta"
import MapOverlay from "./map"
import SpeedOverlay from "./speed"
import TempsOverlay from "./temps"

const overlays: OverlayModule[] = [
  DeltaBarOverlay,
  MapOverlay,
  SpeedOverlay,
  TempsOverlay,
  DebugOverlay,
  BroadcastDebugOverlay,
]

export default overlays

