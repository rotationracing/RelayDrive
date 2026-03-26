# ACC Broadcast API - Complete Implementation

## Status: ✅ RESOLVED

All ACC Broadcasting API message types are now fully supported through our vendored and extended `broadcast_protocol` module.

## Supported Message Types

All ACC Broadcasting API message types are now fully supported:

| Type | Message | Supported | Description |
|------|---------|-----------|-------------|
| 1 | `RegistrationResult` | ✅ Yes | Connection registration response |
| 2 | `RealtimeUpdate` | ✅ Yes | Session-wide data (weather, timing, etc.) |
| 3 | `RealtimeCarUpdate` | ✅ Yes | Real-time car telemetry and position |
| 4 | `EntrylistUpdate` | ✅ Yes | List of car IDs in the session |
| 4 | `BroadcastingEvent` | ✅ Yes | Live race events (accidents, penalties, pit stops) |
| 5 | `TrackData` | ✅ Yes | Track info (name, length, camera sets, HUD pages) |
| 6 | `EntrylistCar` | ✅ Yes | Complete car entry with drivers and team info |

## Implementation

We've vendored the complete `acbc` fork into `src-tauri/src/broadcast_protocol/` which includes full support for all message types. This provides:

1. ✅ Complete driver and team data
2. ✅ Track information and camera sets
3. ✅ Live event notifications
4. ✅ No more decode failures
5. ✅ Full control over the protocol implementation

### Code Structure

```
src-tauri/src/
└── broadcast_protocol/          # Vendored acbc with full support
    ├── mod.rs                   # Module exports
    ├── client.rs                # Broadcast client implementation
    ├── session.rs               # Session context management
    └── protocol/
        ├── mod.rs               # Protocol module
        ├── acc_enum.rs          # ACC enums (SessionType, CarModel, etc.)
        ├── inbound.rs           # All inbound message types
        ├── outbound.rs          # Outbound message builders
        └── parser.rs            # nom-based message parsers
```

## Available Features

### ✅ All Features Working

With complete protocol support, you now have access to:

**Driver & Team Data:**
- Driver names (first name, last name, short name)
- Team names
- Car numbers
- Car models
- Cup categories
- Driver categories (Bronze, Silver, Gold, Platinum)
- Nationality information

**Session Data:**
- Real-time car positions and speeds
- Session timing and weather
- Lap times and sector splits
- Car locations (track, pits, etc.)
- Race positions

**Track Information:**
- Track name and ID
- Track length in meters
- Available camera sets and cameras
- HUD pages

**Live Events:**
- Accidents and incidents
- Penalties
- Lap completions
- Best lap notifications
- Session phase changes

## Implementation Details

### Solution: Vendored Protocol Module

We implemented **Option 2** from the original plan by:

1. **Vendoring the complete acbc fork** into `src-tauri/src/broadcast_protocol/`
   - This fork already had full support for all message types
   - We maintain full control over the implementation
   - Easy to extend or modify as needed

2. **Updated all imports** in `broadcast.rs` to use the vendored module
   - Changed from `acbc::IncomingMessage` to `crate::broadcast_protocol::protocol::InboundMessage`
   - Updated all message type references

3. **Added JSON serialization** for all message types
   - `EntrylistUpdate` → Car IDs list
   - `EntrylistCar` → Complete car/driver details
   - `TrackData` → Track info and camera sets
   - `BroadcastingEvent` → Event notifications

4. **Removed workarounds** that were skipping unsupported message types

## Dependencies

The vendored protocol module requires the following Rust crates:

```toml
nom = "6"                    # Parser combinator framework
nom-supreme = "0.4.2"        # Enhanced nom error handling
thiserror = "1"              # Error type derivation
tinyvec = "1"                # Small vector optimization
byteorder = "1.4.3"          # Byte order conversions
fnv = "1.0.7"                # Fast hash map for session context
```

## References

- [ACC Broadcasting API Documentation](./BROADCAST_MAP.md)
- [Original acbc crate](https://docs.rs/acbc/latest/acbc/)
- [ACC SDK (unofficial)](https://www.assettocorsa.net/forum/index.php?forums/acc-general-discussions.52/)

## Testing

To verify the implementation is working:

1. Start ACC with broadcasting enabled
2. Connect with RelayDrive
3. Check the broadcast log (`app_data/log/broadcast.log`)
4. You should see:
   - ✅ `Received broadcast message: RegistrationResult`
   - ✅ `Received broadcast message: EntrylistUpdate`
   - ✅ `Received broadcast message: EntrylistCar` (multiple times, one per car)
   - ✅ `Received broadcast message: TrackData`
   - ✅ `Received broadcast message: RealtimeUpdate` (continuous)
   - ✅ `Received broadcast message: RealtimeCarUpdate` (continuous, per car)
   - ✅ `Received broadcast message: BroadcastingEvent` (as events occur)
   - ❌ NO "Failed to decode" errors for any message type

## See Also

- [ACC Telemetry Guide](./ACC_TELEMETRY.md)
- [Broadcast Map Reference](./BROADCAST_MAP.md)

