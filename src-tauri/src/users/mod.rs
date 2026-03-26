use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Emitter, Manager};

use crate::app_state::AppState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserData {
    pub account: bool,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(rename = "fullName", skip_serializing_if = "Option::is_none")]
    pub full_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(rename = "imageUrl", skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked: Option<bool>,
}

fn user_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app_data_dir: {e}"))?;
    fs::create_dir_all(&base).map_err(|e| format!("failed to create data dir: {e}"))?;
    let p = base.join("user.json");
    log::info!("[user] user_file_path = {}", p.display());
    Ok(p)
}

#[tauri::command]
pub async fn user_exists(app: AppHandle) -> Result<bool, String> {
    let path = user_file_path(&app)?;
    log::info!("user_exists: checking {}", path.display());
    Ok(path.exists())
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub async fn create_user(
    app: AppHandle,
    account: bool,
    name: String,
    user_id: Option<String>,
    full_name: Option<String>,
    username: Option<String>,
    role: Option<String>,
    email: Option<String>,
    image_url: Option<String>,
    locked: Option<bool>,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("name cannot be empty".into());
    }
    let path = user_file_path(&app)?;
    log::info!(
        "create_user: writing user.json at {} (account={}, name=\"{}\", user_id={:?}, fullName={:?}, username={:?}, role={:?}, email={:?}, imageUrl={:?}, locked={:?})",
        path.display(),
        account,
        name,
        user_id,
        full_name,
        username,
        role,
        email,
        image_url,
        locked
    );
    let data = UserData {
        account,
        name,
        user_id,
        full_name,
        username,
        role,
        email,
        image_url,
        locked,
    };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    let state = app.state::<AppState>();
    if let Ok(mut cache) = state.user_cache.lock() {
        *cache = Some(data);
    }

    let _ = app.emit("user-updated", "ok");
    Ok(())
}

#[tauri::command]
pub async fn get_user(app: AppHandle) -> Result<Option<UserData>, String> {
    let path = user_file_path(&app)?;

    if !path.exists() {
        if let Ok(mut cache) = app.state::<AppState>().user_cache.lock() {
            *cache = None;
        }
        log::info!("get_user: {} does not exist", path.display());
        return Ok(None);
    }

    let state = app.state::<AppState>();
    if let Ok(cache) = state.user_cache.lock() {
        if let Some(user) = cache.clone() {
            log::info!("get_user: cache hit");
            return Ok(Some(user));
        }
    }

    log::info!("get_user: reading {}", path.display());
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: UserData = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    if let Ok(mut cache) = state.user_cache.lock() {
        *cache = Some(data.clone());
    }
    Ok(Some(data))
}
