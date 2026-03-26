use std::{fs, path::Path};

use tauri::{AppHandle, Manager};

use crate::games;

pub fn create_game_dirs(base: &Path) -> std::io::Result<()> {
    fs::create_dir_all(base)?;
    for runtime in games::all_runtimes() {
        let dir = base.join(runtime.id());
        fs::create_dir_all(&dir)?;

        // Create overlay config directory for ACC
        if runtime.id() == "ACC" {
            let overlay_dir = dir.join("config").join("overlay");
            if let Err(e) = fs::create_dir_all(&overlay_dir) {
                log::warn!(
                    "[fs] Failed to create overlay config dir {}: {}",
                    overlay_dir.display(),
                    e
                );
            } else {
                log::info!("[fs] Created overlay config dir: {}", overlay_dir.display());
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn ensure_data_dir(app: AppHandle) -> Result<bool, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app_data_dir: {e}"))?;
    log::info!("[fs] ensure_data_dir: {}", base.display());
    create_game_dirs(&base).map_err(|e| format!("failed to create data dirs: {e}"))?;
    Ok(true)
}
