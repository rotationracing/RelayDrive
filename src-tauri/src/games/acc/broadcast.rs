pub const BROADCAST_EVENT: &str = "acc://broadcast";

#[cfg(target_os = "windows")]
mod platform {
    use std::convert::TryFrom;
    use std::fs::{self, File, OpenOptions};
    use std::io::Write;
    use std::net::UdpSocket;
    use std::path::{Path, PathBuf};
    use std::sync::{Arc, Mutex, OnceLock};
    use std::thread;
    use std::time::{Duration, Instant};

    use crate::broadcast_protocol::protocol::InboundMessage;
    use serde::Serialize;
    use serde_json::Value;
    use std::collections::HashMap;
    use tauri::{AppHandle, Emitter, Manager};

    use crate::settings::{load_connection_settings, ConnectionDetails, GameConnectionSettings};

    static BROADCAST_RUNNING: OnceLock<Mutex<bool>> = OnceLock::new();
    static LOG_FILE_PATH: OnceLock<Mutex<Option<PathBuf>>> = OnceLock::new();

    macro_rules! broadcast_log {
        ($level:expr, $($arg:tt)*) => {{
            let message = format!($($arg)*);
            log::log!($level, "[acc:broadcast] {}", message);
            crate::games::acc::broadcast::platform::log_to_file($level, &message);
        }};
    }

    macro_rules! broadcast_info {
        ($($arg:tt)*) => {
            broadcast_log!(log::Level::Info, $($arg)*);
        };
    }

    macro_rules! broadcast_warn {
        ($($arg:tt)*) => {
            broadcast_log!(log::Level::Warn, $($arg)*);
        };
    }

    macro_rules! broadcast_error {
        ($($arg:tt)*) => {
            broadcast_log!(log::Level::Error, $($arg)*);
        };
    }

    macro_rules! broadcast_debug {
        ($($arg:tt)*) => {
            broadcast_log!(log::Level::Debug, $($arg)*);
        };
    }

    pub fn reset_broadcast_log(base: &Path) -> Result<(), String> {
        let log_dir = base.join("log");
        fs::create_dir_all(&log_dir).map_err(|e| {
            format!(
                "Failed to create broadcast log directory {}: {}",
                log_dir.display(),
                e
            )
        })?;
        let log_path = log_dir.join("broadcast.log");
        File::create(&log_path).map_err(|e| {
            format!(
                "Failed to reset broadcast log file {}: {}",
                log_path.display(),
                e
            )
        })?;

        let lock = LOG_FILE_PATH.get_or_init(|| Mutex::new(None));
        let mut guard = lock
            .lock()
            .map_err(|_| "Failed to lock broadcast log path".to_string())?;
        *guard = Some(log_path.clone());

        // Write a header entry so we can tell when the file was cleared
        let _ = writeln!(
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_path)
                .map_err(|e| format!(
                    "Failed to open broadcast log file {}: {}",
                    log_path.display(),
                    e
                ))?,
            "{} [INFO] broadcast log reset",
            current_millis()
        );

        Ok(())
    }

    fn ensure_log_path(app: &AppHandle) -> Result<(), String> {
        let lock = LOG_FILE_PATH.get_or_init(|| Mutex::new(None));
        let mut guard = lock
            .lock()
            .map_err(|_| "Failed to lock broadcast log path".to_string())?;

        if guard.is_some() {
            return Ok(());
        }

        let base = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
        let log_dir = base.join("log");
        fs::create_dir_all(&log_dir).map_err(|e| {
            format!(
                "Failed to create broadcast log directory {}: {}",
                log_dir.display(),
                e
            )
        })?;
        let log_path = log_dir.join("broadcast.log");
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .map_err(|e| {
                format!(
                    "Failed to open broadcast log file {}: {}",
                    log_path.display(),
                    e
                )
            })?;
        *guard = Some(log_path);
        Ok(())
    }

    fn log_to_file(level: log::Level, message: &str) {
        if let Err(err) = write_log_line(level, message) {
            log::warn!(
                "[acc:broadcast] failed to write broadcast log entry: {}",
                err
            );
        }
    }

    fn write_log_line(level: log::Level, line: &str) -> Result<(), String> {
        let path = {
            let lock = LOG_FILE_PATH.get_or_init(|| Mutex::new(None));
            let guard = lock
                .lock()
                .map_err(|_| "Failed to lock broadcast log path".to_string())?;
            guard.clone()
        };

        let Some(path) = path else {
            return Err("broadcast log path has not been initialized".into());
        };

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .map_err(|e| {
                format!(
                    "Failed to open broadcast log file {}: {}",
                    path.display(),
                    e
                )
            })?;
        writeln!(file, "{} [{}] {}", current_millis(), level.as_str(), line)
            .map_err(|e| format!("Failed to write broadcast log entry: {}", e))
    }

    const EMIT_INTERVAL: Duration = Duration::from_millis(100); // 10 Hz for broadcast updates
    const MAX_IDLE_TICKS: u32 = 600; // 60 seconds at 100ms interval
    const DISPLAY_NAME: &str = "RelayDrive";
    const UPDATE_INTERVAL: i32 = 1000; // Request updates every 1000ms (1 second)
    const BROADCAST_PROTOCOL_VERSION: u8 = 4;

    const MSG_REGISTER_APPLICATION: u8 = 1;
    const MSG_REQUEST_ENTRY_LIST: u8 = 10;
    const MSG_REQUEST_TRACK_DATA: u8 = 11;

    #[derive(Clone, Default)]
    struct CarState {
        entry: Option<Value>,
        realtime: Option<Value>,
    }

    #[derive(Default)]
    struct BroadcastState {
        track_data: Option<Value>,
        session: Option<Value>,
        cars: HashMap<u16, CarState>,
    }

    impl BroadcastState {
        fn new() -> Self {
            Self::default()
        }

        fn update_track_data(&mut self, track_data: Value) {
            self.track_data = Some(track_data);
        }

        fn update_session(&mut self, session: Value) {
            self.session = Some(session);
        }

        fn seed_entrylist(&mut self, car_ids: &[u16]) {
            // Remove cars that are no longer in the entrylist
            self.cars.retain(|&k, _| car_ids.contains(&k));
            // Ensure all cars in the entrylist have a slot
            for &car_id in car_ids {
                self.cars.entry(car_id).or_insert_with(CarState::default);
            }
        }

        fn update_car_entry(&mut self, car_id: u16, entry: Value) {
            let car_state = self.cars.entry(car_id).or_insert_with(CarState::default);
            car_state.entry = Some(entry);
        }

        fn update_car_realtime(&mut self, car_id: u16, realtime: Value) {
            let car_state = self.cars.entry(car_id).or_insert_with(CarState::default);
            car_state.realtime = Some(realtime);
        }

        fn to_json(&self) -> Value {
            use serde_json::json;
            let mut cars_json = serde_json::Map::new();
            for (car_id, car_state) in &self.cars {
                let mut car_json = serde_json::Map::new();
                
                // Always include entry data if available
                if let Some(ref entry) = car_state.entry {
                    car_json.insert("entry".to_string(), entry.clone());
                    
                    // If we have realtime data, merge driver info into it
                    if let Some(ref realtime) = car_state.realtime {
                        // Create a new merged object instead of trying to mutate
                        let mut merged_realtime = if let Some(realtime_obj) = realtime.as_object() {
                            realtime_obj.clone()
                        } else {
                            serde_json::Map::new()
                        };
                        
                        // Extract driver_index from realtime data
                        if let Some(driver_idx) = realtime.get("driver_index").and_then(|v| v.as_u64()) {
                            // Try to get driver name from entry data
                            if let Some(entry_obj) = entry.as_object() {
                                if let Some(drivers_array) = entry_obj.get("drivers").and_then(|v| v.as_array()) {
                                    let driver_idx_usize = driver_idx as usize;
                                    if driver_idx_usize < drivers_array.len() {
                                        if let Some(driver_obj) = drivers_array[driver_idx_usize].as_object() {
                                            // Add current driver info to realtime data
                                            if let Some(first_name) = driver_obj.get("first_name") {
                                                merged_realtime.insert("driver_first_name".to_string(), first_name.clone());
                                            }
                                            if let Some(last_name) = driver_obj.get("last_name") {
                                                merged_realtime.insert("driver_last_name".to_string(), last_name.clone());
                                            }
                                            if let Some(short_name) = driver_obj.get("short_name") {
                                                merged_realtime.insert("driver_short_name".to_string(), short_name.clone());
                                            }
                                            if let Some(category) = driver_obj.get("category") {
                                                merged_realtime.insert("driver_category".to_string(), category.clone());
                                            }
                                            if let Some(nationality) = driver_obj.get("nationality") {
                                                merged_realtime.insert("driver_nationality".to_string(), nationality.clone());
                                            }
                                        }
                                    }
                                }
                                
                                // Also add car info from entry to realtime
                                if let Some(team_name) = entry_obj.get("team_name") {
                                    merged_realtime.insert("team_name".to_string(), team_name.clone());
                                }
                                if let Some(race_number) = entry_obj.get("race_number") {
                                    merged_realtime.insert("race_number".to_string(), race_number.clone());
                                }
                                if let Some(car_model) = entry_obj.get("car_model") {
                                    merged_realtime.insert("car_model".to_string(), car_model.clone());
                                }
                                if let Some(cup_category) = entry_obj.get("cup_category") {
                                    merged_realtime.insert("cup_category".to_string(), cup_category.clone());
                                }
                                // Include all drivers array for reference
                                if let Some(drivers) = entry_obj.get("drivers") {
                                    merged_realtime.insert("drivers".to_string(), drivers.clone());
                                }
                            }
                        }
                        
                        car_json.insert("realtime".to_string(), Value::Object(merged_realtime));
                    }
                } else if let Some(ref realtime) = car_state.realtime {
                    // Only realtime data, no entry yet
                    car_json.insert("realtime".to_string(), realtime.clone());
                }
                
                cars_json.insert(car_id.to_string(), Value::Object(car_json));
            }
            json!({
                "track": self.track_data,
                "session": self.session,
                "cars": Value::Object(cars_json),
            })
        }
    }

    #[derive(Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    struct BroadcastPayload {
        timestamp: u128,
        status: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        data: Option<Arc<Value>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
    }

    pub fn start_stream(app: AppHandle) -> Result<(), String> {
        let flag = BROADCAST_RUNNING.get_or_init(|| Mutex::new(false));
        let mut guard = flag
            .lock()
            .map_err(|_| "Failed to lock broadcast stream mutex".to_string())?;
        if *guard {
            return Ok(());
        }
        *guard = true;

        if let Err(err) = ensure_log_path(&app) {
            log::warn!(
                "[acc:broadcast] Failed to ensure broadcast log file is available: {}",
                err
            );
        }

        let app_handle = app.clone();
        thread::spawn(move || {
            if let Err(err) = stream_loop(app_handle.clone()) {
                let _ = app_handle.emit(
                    super::BROADCAST_EVENT,
                    BroadcastPayload {
                        timestamp: current_millis(),
                        status: "error",
                        data: None,
                        message: Some(err.clone()),
                    },
                );
                broadcast_warn!("ACC broadcast stream stopped: {}", err);
            }

            if let Some(flag) = BROADCAST_RUNNING.get() {
                if let Ok(mut running) = flag.lock() {
                    *running = false;
                }
            }
        });

        Ok(())
    }

    fn try_parse_message_type(buffer: &[u8]) -> Option<String> {
        if buffer.is_empty() {
            return None;
        }

        match buffer[0] {
            1 => Some("RegistrationResult".to_string()),
            2 => Some("RealtimeUpdate".to_string()),
            3 => Some("RealtimeCarUpdate".to_string()),
            4 => Some("BroadcastingEvent".to_string()),
            5 => Some("TrackData".to_string()),
            6 => Some("EntryList".to_string()),
            7 => Some("EntryListCar".to_string()),
            _ => Some(format!("Unknown (type: {})", buffer[0])),
        }
    }

    fn stream_loop(app: AppHandle) -> Result<(), String> {
        // Bind to any available local port for receiving
        let socket = UdpSocket::bind("0.0.0.0:0")
            .map_err(|e| format!("Failed to bind UDP socket: {}", e))?;

        socket
            .set_read_timeout(Some(Duration::from_millis(200)))
            .map_err(|e| format!("Failed to set socket timeout: {}", e))?;

        let connection_settings = match load_connection_settings(&app) {
            Ok(settings) => settings,
            Err(err) => {
                broadcast_warn!(
                    "Failed to load ACC connection settings (using defaults): {}",
                    err
                );
                GameConnectionSettings::default()
            }
        };
        let acc_connection = connection_settings.acc;

        // Connect to ACC broadcast server
        let server_addr = format!("{}:{}", acc_connection.host, acc_connection.port);
        socket.connect(&server_addr).map_err(|e| {
            format!(
                "Failed to connect to ACC broadcast server at {}: {}",
                server_addr, e
            )
        })?;

        send_registration(&socket, &acc_connection)
            .map_err(|e| format!("Failed to send registration: {}", e))?;

        broadcast_info!("Sent ACC broadcast registration request to {}", server_addr);

        let mut idle_ticks = 0u32;
        let mut last_emit = Instant::now();
        let mut buffer = [0u8; 131072]; // 128KB buffer for UDP packets (increased from 64KB)
        let mut is_registered = false;
        let mut consecutive_decode_failures = 0u32;
        const MAX_CONSECUTIVE_DECODE_FAILURES: u32 = 10;
        let mut broadcast_state = BroadcastState::new();

        // Emit initial waiting state
        let _ = app.emit(
            super::BROADCAST_EVENT,
            BroadcastPayload {
                timestamp: current_millis(),
                status: "waiting",
                data: None,
                message: Some(format!(
                    "Connecting to ACC broadcast server at {}...",
                    server_addr
                )),
            },
        );

        loop {
            match socket.recv(&mut buffer) {
                Ok(size) => {
                    idle_ticks = 0;
                    broadcast_debug!("Received {} bytes from ACC broadcast server", size);

                    match InboundMessage::decode(&buffer[..size]) {
                        Ok(message) => {
                            // Reset consecutive failure counter on successful decode
                            consecutive_decode_failures = 0;

                            let msg_type = match &message {
                                InboundMessage::RegistrationResult(_) => "RegistrationResult",
                                InboundMessage::RealtimeUpdate(_) => "RealtimeUpdate",
                                InboundMessage::RealtimeCarUpdate(_) => "RealtimeCarUpdate",
                                InboundMessage::EntrylistUpdate(_) => "EntrylistUpdate",
                                InboundMessage::EntrylistCar(_) => "EntrylistCar",
                                InboundMessage::TrackData(_) => "TrackData",
                                InboundMessage::BroadcastingEvent(_) => "BroadcastingEvent",
                            };
                            broadcast_debug!("Received broadcast message: {}", msg_type);

                            if !is_registered {
                                if let InboundMessage::RegistrationResult(ref reg) = message {
                                    is_registered = true;
                                    broadcast_info!(
                                        "Registration result -> success: {}, connection_id: {}, read_only: {}, error: {:?}",
                                        reg.connection_success,
                                        reg.connection_id,
                                        reg.read_only,
                                        reg.error_message
                                    );
                                    if !reg.connection_success {
                                        broadcast_error!("ACC broadcast registration failed. Check broadcasting.json passwords and restart ACC.");
                                    } else {
                                        broadcast_info!(
                                            "Successfully registered with ACC broadcast server."
                                        );
                                        let connection_id = reg.connection_id as i32;
                                        if let Err(e) = send_simple_request(
                                            &socket,
                                            MSG_REQUEST_ENTRY_LIST,
                                            connection_id,
                                        ) {
                                            broadcast_warn!(
                                                "Failed to send entry list request: {}",
                                                e
                                            );
                                        } else {
                                            broadcast_info!("Sent entry list request");
                                        }

                                        if let Err(e) = send_simple_request(
                                            &socket,
                                            MSG_REQUEST_TRACK_DATA,
                                            connection_id,
                                        ) {
                                            broadcast_warn!(
                                                "Failed to send track data request: {}",
                                                e
                                            );
                                        } else {
                                            broadcast_info!("Sent track data request");
                                        }
                                    }

                                    let message_text = if reg.connection_success {
                                        Some("Connected to ACC broadcast server".to_string())
                                    } else if !reg.error_message.is_empty() {
                                        Some(reg.error_message.to_string())
                                    } else {
                                        Some("ACC broadcast registration failed".to_string())
                                    };

                                    let _ = app.emit(
                                        super::BROADCAST_EVENT,
                                        BroadcastPayload {
                                            timestamp: current_millis(),
                                            status: if reg.connection_success {
                                                "ok"
                                            } else {
                                                "error"
                                            },
                                            data: None,
                                            message: message_text,
                                        },
                                    );
                                }
                            } else {
                                // Process message and update state
                                match &message {
                                    InboundMessage::EntrylistUpdate(update) => {
                                        broadcast_debug!("EntrylistUpdate: {} cars", update.car_ids.len());
                                        broadcast_state.seed_entrylist(&update.car_ids);
                                    }
                                    InboundMessage::EntrylistCar(car) => {
                                        broadcast_debug!("EntrylistCar: car_index={}", car.id);
                                        let entry_json = entrylist_car_to_json(car);
                                        broadcast_state.update_car_entry(car.id, entry_json);
                                    }
                                    InboundMessage::RealtimeUpdate(update) => {
                                        broadcast_debug!("RealtimeUpdate");
                                        let session_json = realtime_update_to_json(update);
                                        broadcast_state.update_session(session_json);
                                    }
                                    InboundMessage::RealtimeCarUpdate(car) => {
                                        broadcast_debug!("RealtimeCarUpdate: car_index={}", car.id);
                                        let realtime_json = realtime_car_update_to_json(car);
                                        broadcast_state.update_car_realtime(car.id, realtime_json);
                                    }
                                    InboundMessage::TrackData(track) => {
                                        broadcast_debug!("TrackData: {}", track.name);
                                        let track_json = track_data_to_json(track);
                                        broadcast_state.update_track_data(track_json);
                                    }
                                    InboundMessage::BroadcastingEvent(_) => {
                                        // Broadcasting events are logged but not stored in state
                                        // They're typically transient notifications
                                    }
                                    InboundMessage::RegistrationResult(_) => {
                                        // Already handled above
                                    }
                                }

                                // Emit complete state at controlled interval
                                if last_emit.elapsed() >= EMIT_INTERVAL {
                                    let complete_state = broadcast_state.to_json();
                                    let payload = BroadcastPayload {
                                        timestamp: current_millis(),
                                        status: "ok",
                                        data: Some(Arc::new(complete_state)),
                                        message: None,
                                    };
                                    app.emit(super::BROADCAST_EVENT, payload).map_err(|e| {
                                        format!("Failed to emit broadcast payload: {e}")
                                    })?;
                                    last_emit = Instant::now();
                                }
                            }
                        }
                        Err(e) => {
                            // Log the message type if we can detect it
                            let message_type = if size > 0 {
                                try_parse_message_type(&buffer[..size.min(1)])
                            } else {
                                None
                            };

                            // Check if this is an enum-related error (unknown car model, cup category, etc.)
                            // These are expected with modded content and shouldn't trigger recovery
                            let error_str = format!("{:?}", e);
                            let is_enum_error = error_str.contains("UnknownCupCategory")
                                || error_str.contains("UnknownCarModel")
                                || error_str.contains("UnknownNationality")
                                || error_str.contains("UnknownDriverCategory");
                            
                            // Try to manually decode EntrylistCar messages even if enum conversion fails
                            if is_enum_error && message_type.as_deref() == Some("EntryList") {
                                if let Ok(entry_json) = manually_decode_entrylist_car(&buffer[..size]) {
                                    broadcast_debug!(
                                        "Manually decoded EntrylistCar (enum-related decode failure): car_index={}",
                                        entry_json.get("car_index").and_then(|v| v.as_u64()).unwrap_or(0)
                                    );
                                    if let Some(car_id) = entry_json.get("car_index").and_then(|v| v.as_u64()) {
                                        broadcast_state.update_car_entry(car_id as u16, entry_json);
                                        
                                        // Emit complete state at controlled interval
                                        if last_emit.elapsed() >= EMIT_INTERVAL {
                                            let complete_state = broadcast_state.to_json();
                                            let payload = BroadcastPayload {
                                                timestamp: current_millis(),
                                                status: "ok",
                                                data: Some(Arc::new(complete_state)),
                                                message: None,
                                            };
                                            if let Err(emit_err) = app.emit(super::BROADCAST_EVENT, payload) {
                                                broadcast_warn!("Failed to emit broadcast payload: {}", emit_err);
                                            }
                                            last_emit = Instant::now();
                                        }
                                    }
                                    continue; // Successfully handled, continue loop
                                }
                            }
                            
                            // Only count as a failure if it's not an enum error
                            // Enum errors are common with modded cars/content and are not critical
                            if !is_enum_error {
                                consecutive_decode_failures += 1;
                            }

                            if is_enum_error {
                                // Log enum errors as debug level since they're expected
                                broadcast_debug!(
                                    "Failed to manually decode EntrylistCar for {} bytes (type: {:?}): {:?}",
                                    size,
                                    message_type,
                                    e
                                );
                            } else {
                                broadcast_warn!(
                                    "Failed to decode broadcast message of {} bytes (type: {:?}): {:?} (failure #{})",
                                    size,
                                    message_type,
                                    e,
                                    consecutive_decode_failures
                                );
                                broadcast_debug!("First 16 bytes: {:?}", &buffer[..size.min(16)]);

                                // Log additional debug information for the first few failures
                                if consecutive_decode_failures <= 3 {
                                    broadcast_debug!("Full message dump (first 128 bytes): {:?}", &buffer[..size.min(128)]);
                                }
                            }

                            // If we have too many consecutive failures (excluding enum errors), try to recover
                            if consecutive_decode_failures >= MAX_CONSECUTIVE_DECODE_FAILURES {
                                broadcast_error!(
                                    "Too many consecutive decode failures ({}), attempting recovery...",
                                    consecutive_decode_failures
                                );

                                // Try to re-register with the broadcast server
                                if let Err(e) = send_registration(&socket, &acc_connection) {
                                    broadcast_error!("Failed to re-send registration during recovery: {}", e);
                                } else {
                                    broadcast_info!("Re-sent registration request as part of recovery");
                                    is_registered = false;
                                    consecutive_decode_failures = 0;

                                    // Emit a recovery status to the frontend
                                    let _ = app.emit(
                                        super::BROADCAST_EVENT,
                                        BroadcastPayload {
                                            timestamp: current_millis(),
                                            status: "recovering",
                                            data: None,
                                            message: Some("Attempting to recover from decode failures".to_string()),
                                        },
                                    );
                                }
                            }
                        }
                    }
                }
                Err(e)
                    if e.kind() == std::io::ErrorKind::WouldBlock
                        || e.kind() == std::io::ErrorKind::TimedOut =>
                {
                    // Timeout - no data received, this is normal
                    idle_ticks = idle_ticks.saturating_add(1);

                    if idle_ticks % 50 == 0 {
                        let message = if is_registered {
                            "Waiting for broadcast data from ACC".to_string()
                        } else {
                            format!(
                                "Waiting for registration response from ACC at {}",
                                server_addr
                            )
                        };

                        let _ = app.emit(
                            super::BROADCAST_EVENT,
                            BroadcastPayload {
                                timestamp: current_millis(),
                                status: "waiting",
                                data: None,
                                message: Some(message),
                            },
                        );
                    }

                    if idle_ticks >= MAX_IDLE_TICKS {
                        broadcast_warn!(
                            "No broadcast data received for {} seconds, but keeping connection alive",
                            MAX_IDLE_TICKS as f32 * 0.1
                        );
                        // Reset idle ticks instead of disconnecting - ACC might just not be sending data yet
                        idle_ticks = 0;
                    }
                }
                Err(e) => {
                    // Only disconnect on actual connection errors, not timeouts
                    broadcast_error!(
                        "Socket error in broadcast stream: {} (kind: {:?})",
                        e,
                        e.kind()
                    );
                    return Err(format!("Socket error: {}", e));
                }
            }

            thread::sleep(Duration::from_millis(10));
        }
    }

    fn current_millis() -> u128 {
        use std::time::SystemTime;

        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    }

    fn realtime_update_to_json(update: &crate::broadcast_protocol::protocol::RealtimeUpdate) -> Value {
        use serde_json::json;

        json!({
            "event_index": update.event_index,
            "session_index": update.session_index,
            "session_type": format!("{:?}", update.session_type),
            "phase": format!("{:?}", update.session_phase),
            "session_time": update.session_time,
            "session_end_time": update.session_end_time,
            "focused_car_index": update.focused_car_index,
            "active_camera_set": update.active_camera_set.as_ref(),
            "active_camera": update.active_camera.as_ref(),
            "current_hud_page": update.current_hud_page.as_ref(),
            "is_replay_playing": update.replay_info.is_some(),
            "replay_session_time": update.replay_info.as_ref().map(|r| r.session_time),
            "replay_remaining_time": update.replay_info.as_ref().map(|r| r.remaining_time),
            "time_of_day": update.time_of_day,
            "ambient_temp": update.ambient_temp,
            "track_temp": update.track_temp,
            "clouds": update.clouds as f32 / 100.0,
            "rain_level": update.rain_level as f32 / 100.0,
            "wetness": update.wetness as f32 / 100.0,
            "best_session_lap": lap_to_json(&update.best_session_lap),
        })
    }

    fn realtime_car_update_to_json(car: &crate::broadcast_protocol::protocol::RealtimeCarUpdate) -> Value {
        use serde_json::json;

        json!({
            "car_index": car.id,
            "driver_index": car.driver_index,
            "driver_count": car.driver_count,
            "gear": car.gear,
            "world_pos_x": car.world_pos_x,
            "world_pos_y": car.world_pos_y,
            "yaw": car.yaw,
            "car_location": format!("{:?}", car.car_location),
            "kmh": car.speed_kph,
            "position": car.position,
            "cup_position": car.cup_position,
            "track_position": car.track_position,
            "spline_position": car.spline_position,
            "lap_count": car.laps,
            "delta": car.delta,
            "best_session_lap": lap_to_json(&car.best_session_lap),
            "last_lap": lap_to_json(&car.last_lap),
            "current_lap": lap_to_json(&car.current_lap),
        })
    }

    fn entrylist_car_to_json(car: &crate::broadcast_protocol::protocol::EntrylistCar) -> Value {
        use serde_json::json;

        json!({
            "car_index": car.id,
            "car_model": format!("{:?}", car.model),
            "team_name": car.team_name.as_ref(),
            "race_number": car.race_number,
            "cup_category": format!("{:?}", car.cup_category),
            "current_driver_index": car.current_driver_index,
            "nationality": format!("{:?}", car.nationality),
            "drivers": car.drivers.iter().map(|d| json!({
                "first_name": d.first_name.as_ref(),
                "last_name": d.last_name.as_ref(),
                "short_name": d.short_name.as_ref(),
                "category": format!("{:?}", d.category),
                "nationality": format!("{:?}", d.nationality),
            })).collect::<Vec<_>>(),
        })
    }

    fn track_data_to_json(track: &crate::broadcast_protocol::protocol::TrackData) -> Value {
        use serde_json::json;

        json!({
            "track_name": track.name.as_ref(),
            "track_id": track.id,
            "track_meters": track.distance,
            "camera_sets": track.camera_sets.iter().map(|(set_name, cameras)| {
                (set_name.as_ref(), cameras.iter().map(|c| c.as_ref()).collect::<Vec<_>>())
            }).collect::<std::collections::HashMap<_, _>>(),
            "hud_pages": track.hud_pages.iter().map(|h| h.as_ref()).collect::<Vec<_>>(),
        })
    }

    fn lap_to_json(lap: &crate::broadcast_protocol::protocol::Lap) -> Value {
        use serde_json::json;

        json!({
            "lap_time_ms": lap.lap_time_ms,
            "car_index": lap.car_id,
            "driver_index": lap.driver_index,
            "splits": lap.splits.as_slice(),
            "is_invalid": lap.is_invalid,
            "is_valid_for_best": lap.is_valid_for_best,
            "is_out_lap": lap.is_out_lap,
            "is_in_lap": lap.is_in_lap,
        })
    }

    fn send_registration(
        socket: &UdpSocket,
        connection: &ConnectionDetails,
    ) -> std::io::Result<()> {
        let mut buffer = Vec::new();
        buffer.push(MSG_REGISTER_APPLICATION);
        buffer.push(BROADCAST_PROTOCOL_VERSION);
        write_string(&mut buffer, DISPLAY_NAME);
        write_string(&mut buffer, &connection.connection_password);
        buffer.extend_from_slice(&UPDATE_INTERVAL.to_le_bytes());
        write_string(&mut buffer, &connection.command_password);

        socket.send(&buffer).map(|_| ())
    }

    fn send_simple_request(
        socket: &UdpSocket,
        message_type: u8,
        connection_id: i32,
    ) -> std::io::Result<()> {
        let mut buffer = Vec::with_capacity(5);
        buffer.push(message_type);
        buffer.extend_from_slice(&connection_id.to_le_bytes());
        socket.send(&buffer).map(|_| ())
    }

    fn write_string(buffer: &mut Vec<u8>, value: &str) {
        let bytes = value.as_bytes();
        let len = u16::try_from(bytes.len()).unwrap_or(u16::MAX);
        buffer.extend_from_slice(&len.to_le_bytes());
        buffer.extend_from_slice(bytes);
    }

    /// Manually decode an EntrylistCar message, extracting all available data even when enum conversions fail
    fn manually_decode_entrylist_car(buffer: &[u8]) -> Result<Value, String> {
        use serde_json::json;
        
        if buffer.is_empty() || buffer[0] != 6 {
            return Err("Not an EntrylistCar message".to_string());
        }

        let mut pos = 1; // Skip message type byte

        // Read car_id (u16)
        if pos + 2 > buffer.len() {
            return Err("Buffer too short for car_id".to_string());
        }
        let car_id = u16::from_le_bytes([buffer[pos], buffer[pos + 1]]);
        pos += 2;

        // Read car_model (u8) - use raw value, don't convert enum
        if pos >= buffer.len() {
            return Err("Buffer too short for car_model".to_string());
        }
        let car_model_raw = buffer[pos];
        pos += 1;

        // Read team_name (kstring: u16 length + bytes)
        let (team_name, new_pos) = read_kstring(&buffer[pos..])?;
        pos += new_pos;

        // Read race_number (i32)
        if pos + 4 > buffer.len() {
            return Err("Buffer too short for race_number".to_string());
        }
        let race_number = i32::from_le_bytes([
            buffer[pos],
            buffer[pos + 1],
            buffer[pos + 2],
            buffer[pos + 3],
        ]);
        pos += 4;

        // Read team_car_name (kstring) - always present in protocol
        let (_team_car_name, new_pos) = read_kstring(&buffer[pos..])
            .map_err(|_| "Failed to read team_car_name".to_string())?;
        pos += new_pos;

        // Read display_name (kstring) - always present in protocol
        let (_display_name, new_pos) = read_kstring(&buffer[pos..])
            .map_err(|_| "Failed to read display_name".to_string())?;
        pos += new_pos;

        // Read cup_category (u8) - use raw value
        if pos >= buffer.len() {
            return Err("Buffer too short for cup_category".to_string());
        }
        let cup_category_raw = buffer[pos];
        pos += 1;

        // Read current_driver_index (u8)
        if pos >= buffer.len() {
            return Err("Buffer too short for current_driver_index".to_string());
        }
        let current_driver_index = buffer[pos];
        pos += 1;

        // Read nationality (u16) - use raw value
        if pos + 2 > buffer.len() {
            return Err("Buffer too short for nationality".to_string());
        }
        let nationality_raw = u16::from_le_bytes([buffer[pos], buffer[pos + 1]]);
        pos += 2;

        // Read driver_count (u8)
        if pos >= buffer.len() {
            return Err("Buffer too short for driver_count".to_string());
        }
        let driver_count = buffer[pos];
        pos += 1;

        // Read drivers
        let mut drivers = Vec::new();
        for _ in 0..driver_count {
            if pos + 3 > buffer.len() {
                break; // Not enough data for driver
            }
            
            // Read driver_index (u16)
            let _driver_index = u16::from_le_bytes([buffer[pos], buffer[pos + 1]]);
            pos += 2;
            
            // Read has_driver_info (u8 boolean)
            let has_driver_info = buffer[pos] != 0;
            pos += 1;

            if has_driver_info && pos < buffer.len() {
                // Try to read driver info, but don't fail if buffer is incomplete
                let first_name = match read_kstring(&buffer[pos..]) {
                    Ok((s, n)) => {
                        pos += n;
                        s
                    }
                    Err(_) => {
                        break; // Incomplete buffer
                    }
                };

                let last_name = match read_kstring(&buffer[pos..]) {
                    Ok((s, n)) => {
                        pos += n;
                        s
                    }
                    Err(_) => {
                        break; // Incomplete buffer
                    }
                };

                // Read nickname (skip but must read)
                match read_kstring(&buffer[pos..]) {
                    Ok((_, n)) => {
                        pos += n;
                    }
                    Err(_) => {
                        break; // Incomplete buffer
                    }
                };

                let short_name = match read_kstring(&buffer[pos..]) {
                    Ok((s, n)) => {
                        pos += n;
                        s
                    }
                    Err(_) => {
                        break; // Incomplete buffer
                    }
                };

                // Read category (u8) - use raw value
                if pos >= buffer.len() {
                    break; // Not enough data
                }
                let category_raw = buffer[pos];
                pos += 1;

                drivers.push(json!({
                    "first_name": first_name,
                    "last_name": last_name,
                    "short_name": short_name,
                    "category": format!("Unknown({})", category_raw),
                    "nationality": format!("Unknown({})", nationality_raw),
                }));
            } else {
                drivers.push(json!({
                    "first_name": "",
                    "last_name": "",
                    "short_name": "",
                    "category": "Unknown(0)",
                    "nationality": "Unknown(0)",
                }));
            }
        }

        Ok(json!({
            "car_index": car_id,
            "car_model": format!("Unknown({})", car_model_raw),
            "team_name": team_name,
            "race_number": race_number,
            "cup_category": format!("Unknown({})", cup_category_raw),
            "current_driver_index": current_driver_index,
            "nationality": format!("Unknown({})", nationality_raw),
            "drivers": drivers,
        }))
    }

    /// Read a Kunos string (u16 length + UTF-8 bytes)
    fn read_kstring(buffer: &[u8]) -> Result<(String, usize), String> {
        if buffer.len() < 2 {
            return Err("Buffer too short for string length".to_string());
        }
        
        let len = u16::from_le_bytes([buffer[0], buffer[1]]) as usize;
        let start = 2;
        let end = start + len;
        
        if end > buffer.len() {
            return Err("String length exceeds buffer".to_string());
        }
        
        let bytes = &buffer[start..end];
        let string = String::from_utf8(bytes.to_vec())
            .map_err(|e| format!("Invalid UTF-8 in string: {}", e))?;
        
        Ok((string, end))
    }
}

#[cfg(target_os = "windows")]
pub use platform::{reset_broadcast_log, start_stream};

#[cfg(not(target_os = "windows"))]
pub fn start_stream(_: tauri::AppHandle) -> Result<(), String> {
    Err("ACC broadcast streaming is only available on Windows".into())
}
