use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OverlayConfigItem {
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<OverlayPosition>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub opacity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component_settings: Option<BTreeMap<String, Value>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OverlayConfig {
    #[serde(default = "default_overlays_enabled", skip_serializing)]
    pub overlays_enabled: bool,
    pub overlays: BTreeMap<String, OverlayConfigItem>,
}

fn default_overlays_enabled() -> bool {
    false
}

impl Default for OverlayConfig {
    fn default() -> Self {
        Self {
            overlays_enabled: false,
            overlays: BTreeMap::new(),
        }
    }
}

fn overlay_config_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app_data_dir: {e}"))?;
    let dir = base.join("ACC").join("config").join("overlay");
    fs::create_dir_all(&dir).map_err(|e| format!("failed to create data dir: {e}"))?;

    let filename = if name.trim().is_empty() || name == "default" {
        "default.json".to_string()
    } else {
        // Sanitize filename
        let sanitized = name
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
            .collect::<String>();
        format!("{}.json", sanitized)
    };

    let p = dir.join(filename);
    log::info!("[overlay-config] overlay_config_path = {}", p.display());
    Ok(p)
}

#[tauri::command]
pub async fn load_overlay_config(
    app: AppHandle,
    name: Option<String>,
) -> Result<OverlayConfig, String> {
    let config_name = name.unwrap_or_else(|| "default".to_string());
    let path = overlay_config_path(&app, &config_name)?;

    if !path.exists() {
        log::info!(
            "[overlay-config] load_overlay_config: {} missing; returning defaults (no write)",
            path.display()
        );
        return Ok(OverlayConfig::default());
    }

    log::info!(
        "[overlay-config] load_overlay_config: reading {}",
        path.display()
    );
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    match serde_json::from_str::<OverlayConfig>(&contents) {
        Ok(config) => {
            log::info!("[overlay-config] load_overlay_config: parsed OK");
            Ok(config)
        }
        Err(_) => {
            log::warn!(
                "[overlay-config] load_overlay_config: parse failed; returning defaults (no write)"
            );
            Ok(OverlayConfig::default())
        }
    }
}

#[tauri::command]
pub async fn save_overlay_config(
    app: AppHandle,
    name: String,
    config: OverlayConfig,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("config name cannot be empty".into());
    }

    let path = overlay_config_path(&app, &name)?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;

    log::info!(
        "[overlay-config] save_overlay_config: writing {} ({} bytes)",
        path.display(),
        json.len()
    );

    fs::write(&path, json).map_err(|e| e.to_string())?;
    log::info!(
        "[overlay-config] save_overlay_config: wrote {}",
        path.display()
    );

    Ok(())
}

#[tauri::command]
pub async fn list_overlay_configs(app: AppHandle) -> Result<Vec<String>, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app_data_dir: {e}"))?;
    let dir = base.join("ACC").join("config").join("overlay");

    let mut configs = Vec::new();
    if !dir.exists() {
        return Ok(configs);
    }

    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_file() {
            if let Some(file_stem) = path.file_stem() {
                if let Some(name) = file_stem.to_str() {
                    if path.extension().and_then(|e| e.to_str()) == Some("json") {
                        configs.push(name.to_string());
                    }
                }
            }
        }
    }

    configs.sort();
    Ok(configs)
}

#[tauri::command]
pub async fn delete_overlay_config(app: AppHandle, name: String) -> Result<(), String> {
    if name.trim().is_empty() || name == "default" {
        return Err("cannot delete default config".into());
    }

    let path = overlay_config_path(&app, &name)?;

    if !path.exists() {
        return Ok(());
    }

    log::info!(
        "[overlay-config] delete_overlay_config: removing {}",
        path.display()
    );
    fs::remove_file(&path).map_err(|e| e.to_string())?;
    log::info!(
        "[overlay-config] delete_overlay_config: removed {}",
        path.display()
    );

    Ok(())
}
