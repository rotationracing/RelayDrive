use tauri::{Emitter, Manager, WindowEvent};

mod app_state;
mod auth;
mod broadcast_protocol;
mod filesystem;
mod games;
mod hotkeys;
mod overlays;
mod settings;
mod users;

use app_state::AppState;
use filesystem::create_game_dirs;
#[cfg(target_os = "windows")]
use games::acc::broadcast::reset_broadcast_log;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    builder = builder.plugin(tauri_plugin_deep_link::init());
    builder = builder.plugin(tauri_plugin_opener::init());
    builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.show();
            let _ = win.set_focus();
        }

        log::info!("single-instance: args={args:?}, cwd={cwd}");

        let urls: Vec<String> = args
            .iter()
            .filter(|a| a.starts_with("relaydrive://") || a.starts_with("relaydrive-dev://"))
            .cloned()
            .collect();
        if !urls.is_empty() {
            let _ = app.emit("deep-link://open-url", urls);
        }
    }));

    builder
        .manage(AppState::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            #[cfg(desktop)]
            {
                app.manage(app_updates::PendingUpdate(std::sync::Mutex::new(None)));
            }

            if let Some(main) = app.get_webview_window("main") {
                let _ = main.hide();
            }

            if let Ok(base) = app.path().app_data_dir() {
                let _ = create_game_dirs(&base);
                #[cfg(target_os = "windows")]
                {
                    if let Err(err) = reset_broadcast_log(&base) {
                        log::warn!(
                            "[acc:broadcast] Failed to reset broadcast log file: {}",
                            err
                        );
                    }
                }
            }

            // Set up window event handler to close all overlay windows when main window closes
            if let Some(main_window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                main_window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { .. } = event {
                        log::info!(
                            "[main] Main window close requested, closing all overlay windows"
                        );
                        overlays::close_all_overlay_windows(&app_handle);
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            games::commands::set_active_game,
            games::commands::is_game_process_running,
            games::commands::get_active_game,
            games::commands::launch_game,
            games::acc::statics::get_acc_statics,
            filesystem::ensure_data_dir,
            overlays::create_overlay_window,
            overlays::update_overlay_window,
            overlays::close_overlay_window,
            overlays::config::load_overlay_config,
            overlays::config::save_overlay_config,
            overlays::config::list_overlay_configs,
            overlays::config::delete_overlay_config,
            users::user_exists,
            users::create_user,
            users::get_user,
            auth::save_auth,
            auth::get_auth,
            auth::clear_auth,
            open_url_cmd,
            auth::exchange_token,
            auth::fetch_me,
            finish_startup,
            settings::get_settings,
            settings::save_settings,
            settings::import_settings,
            settings::import_settings_json,
            hotkeys::register_global_shortcut,
            hotkeys::unregister_global_shortcut,
            hotkeys::unregister_all_global_shortcuts,
            #[cfg(desktop)]
            app_updates::fetch_update,
            #[cfg(desktop)]
            app_updates::install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(desktop)]
mod app_updates {
    use super::*;
    use serde::Serialize;
    use std::sync::Mutex;
    use tauri::{ipc::Channel, AppHandle, State};
    use tauri_plugin_updater::{Update, UpdaterExt};

    type Result<T> = std::result::Result<T, String>;

    #[derive(Clone, Serialize)]
    #[serde(tag = "event", content = "data")]
    pub enum DownloadEvent {
        #[serde(rename_all = "camelCase")]
        Started {
            content_length: Option<u64>,
        },
        #[serde(rename_all = "camelCase")]
        Progress {
            chunk_length: usize,
        },
        Finished,
    }

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateMetadata {
        version: String,
        current_version: String,
    }

    pub struct PendingUpdate(pub Mutex<Option<Update>>);

    #[tauri::command]
    pub async fn fetch_update(
        app: AppHandle,
        pending_update: State<'_, PendingUpdate>,
    ) -> Result<Option<UpdateMetadata>> {
        log::info!("[updater] checking for updates…");
        let update = app
            .updater()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?;

        let metadata = update.as_ref().map(|u| UpdateMetadata {
            version: u.version.clone(),
            current_version: u.current_version.clone(),
        });

        if let Some(ref u) = update {
            log::info!(
                "[updater] update available: version={} (current {})",
                u.version,
                u.current_version
            );
        } else {
            log::info!("[updater] up to date");
        }

        *pending_update.0.lock().unwrap() = update;
        Ok(metadata)
    }

    #[tauri::command]
    pub async fn install_update(
        pending_update: State<'_, PendingUpdate>,
        on_event: Channel<DownloadEvent>,
    ) -> Result<()> {
        let Some(update) = pending_update.0.lock().unwrap().take() else {
            return Err("there is no pending update".into());
        };

        log::info!("[updater] starting download+install…");
        let mut started = false;
        update
            .download_and_install(
                |chunk_length, content_length| {
                    if !started {
                        let _ = on_event.send(DownloadEvent::Started { content_length });
                        started = true;
                        log::info!("[updater] download started content_length={content_length:?}");
                    }
                    let _ = on_event.send(DownloadEvent::Progress { chunk_length });
                    log::info!("[updater] progress chunk={chunk_length} bytes");
                },
                || {
                    let _ = on_event.send(DownloadEvent::Finished);
                    log::info!("[updater] download finished; installing…");
                },
            )
            .await
            .map_err(|e| e.to_string())?;
        log::info!("[updater] update installed");
        Ok(())
    }
}

#[tauri::command]
async fn open_url_cmd(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let safe_url = url.replace('&', "^&");
        let status = Command::new("cmd")
            .args(["/C", "start", "", &safe_url])
            .status()
            .map_err(|e| format!("failed to spawn cmd: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("cmd exited with status {status}"))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("open_url_cmd is only implemented on Windows".into())
    }
}

#[tauri::command]
async fn finish_startup(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(splash) = app.get_webview_window("splash") {
        let _ = splash.close();
    }

    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
    }

    Ok(())
}
