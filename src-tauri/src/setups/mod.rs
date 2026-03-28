use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupEntry {
    pub car_id: String,
    pub track_id: String,
    pub filename: String,
    pub full_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CarInfo {
    pub id: String,
    pub pretty_name: String,
    pub full_name: String,
    pub brand_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackInfo {
    pub id: String,
    pub pretty_name: String,
    pub full_name: String,
    pub country: String,
}

fn resolve_acc_setups_path(app: &AppHandle) -> Result<String, String> {
    let settings = crate::settings::load_settings_sync(app).unwrap_or_default();
    if let Some(custom_path) = &settings.setup_paths.acc {
        if !custom_path.trim().is_empty() {
            return Ok(custom_path.clone());
        }
    }
    let docs = dirs::document_dir().ok_or("Could not find Documents directory")?;
    let path = docs
        .join("Assetto Corsa Competizione")
        .join("Setups");
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_acc_setups_path(app: AppHandle) -> Result<String, String> {
    resolve_acc_setups_path(&app)
}

fn resolve_iracing_setups_path(app: &AppHandle) -> Result<String, String> {
    let settings = crate::settings::load_settings_sync(app).unwrap_or_default();
    if let Some(custom_path) = &settings.setup_paths.iracing {
        if !custom_path.trim().is_empty() {
            return Ok(custom_path.clone());
        }
    }
    let docs = dirs::document_dir().ok_or("Could not find Documents directory")?;
    let path = docs
        .join("iRacing")
        .join("setups");
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_iracing_setups_path(app: AppHandle) -> Result<String, String> {
    resolve_iracing_setups_path(&app)
}

fn resolve_lmu_setups_path(app: &AppHandle) -> Result<String, String> {
    let settings = crate::settings::load_settings_sync(app).unwrap_or_default();
    if let Some(custom_path) = &settings.setup_paths.lmu {
        if !custom_path.trim().is_empty() {
            return Ok(custom_path.clone());
        }
    }
    let docs = dirs::document_dir().ok_or("Could not find Documents directory")?;
    let path = docs
        .join("Le Mans Ultimate")
        .join("UserData")
        .join("player")
        .join("Settings");
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_lmu_setups_path(app: AppHandle) -> Result<String, String> {
    resolve_lmu_setups_path(&app)
}

#[tauri::command]
pub async fn list_acc_setups(app: AppHandle) -> Result<Vec<SetupEntry>, String> {
    let base = resolve_acc_setups_path(&app)?;
    let base_path = PathBuf::from(&base);

    if !base_path.exists() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();

    let car_dirs = fs::read_dir(&base_path).map_err(|e| format!("Failed to read setups directory: {e}"))?;
    for car_entry in car_dirs {
        let car_entry = car_entry.map_err(|e| format!("Failed to read car entry: {e}"))?;
        if !car_entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            continue;
        }
        let car_id = car_entry.file_name().to_string_lossy().to_string();

        let track_dirs = fs::read_dir(car_entry.path()).map_err(|e| format!("Failed to read car directory: {e}"))?;
        for track_entry in track_dirs {
            let track_entry = track_entry.map_err(|e| format!("Failed to read track entry: {e}"))?;
            if !track_entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                continue;
            }
            let track_id = track_entry.file_name().to_string_lossy().to_string();

            let setup_files = fs::read_dir(track_entry.path()).map_err(|e| format!("Failed to read track directory: {e}"))?;
            for file_entry in setup_files {
                let file_entry = file_entry.map_err(|e| format!("Failed to read setup file entry: {e}"))?;
                let path = file_entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("json") {
                    let filename = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    entries.push(SetupEntry {
                        car_id: car_id.clone(),
                        track_id: track_id.clone(),
                        filename,
                        full_path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    Ok(entries)
}

#[tauri::command]
pub async fn read_setup_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read setup file: {e}"))
}

#[tauri::command]
pub async fn rename_setup_file(path: String, new_name: String) -> Result<String, String> {
    let src = PathBuf::from(&path);
    if !src.exists() {
        return Err("Setup file does not exist".into());
    }
    let parent = src.parent().ok_or("Could not determine parent directory")?;
    let new_filename = format!("{}.json", new_name);
    let dest = parent.join(&new_filename);
    fs::rename(&src, &dest).map_err(|e| format!("Failed to rename setup file: {e}"))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_setup_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to delete setup file: {e}"))
}

#[tauri::command]
pub async fn get_acc_cars() -> Result<Vec<CarInfo>, String> {
    let cars = crate::models::get_cars();
    let result: Vec<CarInfo> = cars
        .into_values()
        .map(|car| CarInfo {
            id: car.id,
            pretty_name: car.pretty_name,
            full_name: car.full_name,
            brand_name: car.brand_name,
        })
        .collect();
    Ok(result)
}

#[tauri::command]
pub async fn get_acc_tracks() -> Result<Vec<TrackInfo>, String> {
    let tracks = crate::models::get_tracks();
    let result: Vec<TrackInfo> = tracks
        .into_values()
        .map(|track| TrackInfo {
            id: track.id,
            pretty_name: track.pretty_name,
            full_name: track.full_name,
            country: track.country,
        })
        .collect();
    Ok(result)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupImportData {
    pub car_id: String,
    pub car_name: String,
    pub car_info: Option<CarInfo>,
    pub file_name: String,
    pub file_content: String,
}

fn find_car_info(folder_name: &str) -> Option<CarInfo> {
    crate::models::get_cars()
        .into_values()
        .find(|car| car.id.eq_ignore_ascii_case(folder_name))
        .map(|car| CarInfo {
            id: car.id,
            pretty_name: car.pretty_name,
            full_name: car.full_name,
            brand_name: car.brand_name,
        })
}

fn sanitize_setup_name(file_name: &str) -> String {
    let without_extension = file_name.trim().trim_end_matches(".json");
    let sanitized: String = without_extension
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            _ => ch,
        })
        .collect();

    let sanitized = sanitized.trim().trim_matches('.').trim();
    if sanitized.is_empty() {
        "Imported Setup".to_string()
    } else {
        sanitized.to_string()
    }
}

fn extract_import_data(file_name: String, file_content: String) -> Result<SetupImportData, String> {
    let setup: serde_json::Value = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse setup JSON: {e}"))?;

    let car_name = setup
        .get("carName")
        .and_then(|v| v.as_str())
        .ok_or("Setup file missing 'carName' field")?
        .to_string();

    let car_info = find_car_info(&car_name);
    let resolved_car_id = car_info
        .as_ref()
        .map(|car| car.id.clone())
        .unwrap_or_else(|| car_name.clone());

    Ok(SetupImportData {
        car_id: resolved_car_id,
        car_name,
        car_info,
        file_name,
        file_content,
    })
}

#[tauri::command]
pub async fn prepare_setup_import(
    file_name: String,
    file_content: String,
) -> Result<SetupImportData, String> {
    extract_import_data(file_name, file_content)
}

#[tauri::command]
pub async fn complete_setup_import(
    app: AppHandle,
    car_id: String,
    track_id: String,
    file_name: String,
    file_content: String,
) -> Result<String, String> {
    let base = resolve_acc_setups_path(&app)?;
    let base_path = PathBuf::from(&base);
    fs::create_dir_all(&base_path)
        .map_err(|e| format!("Failed to create setups directory: {e}"))?;

    let car_path = base_path.join(&car_id);
    fs::create_dir_all(&car_path)
        .map_err(|e| format!("Failed to create car directory: {e}"))?;

    let track_path = car_path.join(&track_id);
    fs::create_dir_all(&track_path)
        .map_err(|e| format!("Failed to create track directory: {e}"))?;

    let base_name = sanitize_setup_name(&file_name);
    let mut destination = track_path.join(format!("{base_name}.json"));
    let mut duplicate_index = 2;
    while destination.exists() {
        destination = track_path.join(format!("{base_name} ({duplicate_index}).json"));
        duplicate_index += 1;
    }

    fs::write(&destination, file_content)
        .map_err(|e| format!("Failed to write setup file: {e}"))?;

    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_setup_file_dialog(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::{Arc, Mutex};
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel::<Option<String>>();
    let sender = Arc::new(Mutex::new(Some(tx)));
    let sender_clone = Arc::clone(&sender);

    app.dialog()
        .file()
        .add_filter("JSON files", &["json"])
        .pick_file(move |file_path| {
            if let Some(tx) = sender_clone.lock().unwrap().take() {
                let selected = file_path
                    .and_then(|path| path.into_path().ok())
                    .map(|path| path.to_string_lossy().to_string());
                let _ = tx.send(selected);
            }
        });

    rx.recv()
        .map_err(|_| "Failed to receive selected setup file".to_string())
}
