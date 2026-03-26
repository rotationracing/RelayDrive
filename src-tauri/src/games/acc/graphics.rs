pub const GRAPHICS_EVENT: &str = "acc://graphics";

#[cfg(target_os = "windows")]
mod platform {
    use std::sync::{Mutex, OnceLock};
    use std::thread;
    use std::time::{Duration, Instant};

    use acc_shared_memory_rs::{ACCError, ACCSharedMemory};
    use serde::Serialize;
    use serde_json::Value;
    use std::sync::Arc;
    use tauri::{AppHandle, Emitter};

    static GRAPHICS_RUNNING: OnceLock<Mutex<bool>> = OnceLock::new();

    const READ_INTERVAL: Duration = Duration::from_millis(16); // ~60 Hz
    const EMIT_INTERVAL: Duration = Duration::from_millis(16); // ~60 FPS
    const MAX_IDLE_TICKS: u32 = 750;

    #[derive(Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    struct GraphicsPayload {
        timestamp: u128,
        status: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        data: Option<Arc<Value>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
    }

    pub fn start_stream(app: AppHandle) -> Result<(), String> {
        let flag = GRAPHICS_RUNNING.get_or_init(|| Mutex::new(false));
        let mut guard = flag
            .lock()
            .map_err(|_| "Failed to lock graphics stream mutex".to_string())?;
        if *guard {
            return Ok(());
        }
        *guard = true;

        let app_handle = app.clone();
        thread::spawn(move || {
            if let Err(err) = stream_loop(app_handle.clone()) {
                let _ = app_handle.emit(
                    super::GRAPHICS_EVENT,
                    GraphicsPayload {
                        timestamp: current_millis(),
                        status: "error",
                        data: None,
                        message: Some(err.clone()),
                    },
                );
                log::warn!("ACC graphics stream stopped: {}", err);
            }

            if let Some(flag) = GRAPHICS_RUNNING.get() {
                if let Ok(mut running) = flag.lock() {
                    *running = false;
                }
            }
        });

        Ok(())
    }

    fn stream_loop(app: AppHandle) -> Result<(), String> {
        let mut acc = ACCSharedMemory::new().map_err(|err| {
            let message = acc_error_to_string(err);
            let _ = app.emit(
                super::GRAPHICS_EVENT,
                GraphicsPayload {
                    timestamp: current_millis(),
                    status: "error",
                    data: None,
                    message: Some(message.clone()),
                },
            );
            message
        })?;

        let mut idle_ticks = 0u32;
        let mut last_emit = Instant::now();
        let mut latest_data: Option<Arc<Value>> = None;

        loop {
            match acc.read_shared_memory().map_err(acc_error_to_string)? {
                Some(data) => {
                    idle_ticks = 0;
                    if let Ok(value) = serde_json::to_value(&data.graphics) {
                        latest_data = Some(Arc::new(value));
                    }

                    if last_emit.elapsed() >= EMIT_INTERVAL {
                        if let Some(ref data) = latest_data {
                            let payload = GraphicsPayload {
                                timestamp: current_millis(),
                                status: "ok",
                                data: Some(data.clone()),
                                message: None,
                            };
                            app.emit(super::GRAPHICS_EVENT, payload)
                                .map_err(|e| format!("Failed to emit graphics payload: {e}"))?;
                        }
                        last_emit = Instant::now();
                    }
                }
                None => {
                    idle_ticks = idle_ticks.saturating_add(1);
                    latest_data = None;

                    if idle_ticks % 200 == 0 {
                        let _ = app.emit(
                            super::GRAPHICS_EVENT,
                            GraphicsPayload {
                                timestamp: current_millis(),
                                status: "waiting",
                                data: None,
                                message: Some("Awaiting graphics data from ACC".into()),
                            },
                        );
                    }

                    if idle_ticks >= MAX_IDLE_TICKS {
                        idle_ticks = MAX_IDLE_TICKS;
                    }
                }
            }

            thread::sleep(READ_INTERVAL);
        }
    }

    fn current_millis() -> u128 {
        use std::time::SystemTime;

        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    }

    fn acc_error_to_string(err: ACCError) -> String {
        err.to_string()
    }
}

#[cfg(target_os = "windows")]
pub use platform::start_stream;

#[cfg(not(target_os = "windows"))]
pub fn start_stream(_: tauri::AppHandle) -> Result<(), String> {
    Err("ACC graphics streaming is only available on Windows".into())
}
