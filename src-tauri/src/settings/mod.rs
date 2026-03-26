use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn settings_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app_data_dir: {e}"))?;
    fs::create_dir_all(&base).map_err(|e| format!("failed to create data dir: {e}"))?;
    let p = base.join("settings.json");
    log::info!("[settings] settings_file_path = {}", p.display());
    Ok(p)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct MeasurementUnitsChoice {
    pub distance: String,
    pub speed: String,
    pub acceleration: String,
    pub temperature: String,
    pub pressure: String,
    pub torque: String,
    pub power: String,
    pub fuel_volume: String,
    pub suspension_travel: String,
    pub tire_pressure: String,
    pub fuel_consumption: String,
}

impl Default for MeasurementUnitsChoice {
    fn default() -> Self {
        Self {
            distance: "metric".into(),
            speed: "metric".into(),
            acceleration: "metric".into(),
            temperature: "celsius".into(),
            pressure: "bar".into(),
            torque: "nm".into(),
            power: "hp".into(),
            fuel_volume: "metric".into(),
            suspension_travel: "mm".into(),
            tire_pressure: "bar".into(),
            fuel_consumption: "metric".into(),
        }
    }
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MeasurementUnitsExplicit {
    pub distance: String,
    pub speed: String,
    pub acceleration: String,
    pub g_force: String,
    pub temperature: String,
    pub pressure: String,
    pub torque: String,
    pub power: String,
    pub fuel_volume: String,
    pub fuel_mass: String,
    pub angle: String,
    pub rotation_rpm: String,
    pub suspension_travel: String,
    pub tire_pressure: String,
    pub input_percent: String,
    pub fuel_consumption: String,
    pub time: String,
}

#[allow(dead_code)]
pub fn expand_units(choice: &MeasurementUnitsChoice) -> MeasurementUnitsExplicit {
    let (distance, speed, acceleration, fuel_volume, fuel_consumption) =
        if choice.distance == "imperial" {
            ("mi", "mph", "ft/s²", "gal", "gal/h")
        } else {
            ("m", "km/h", "m/s²", "L", "L/h")
        };
    let temperature = if choice.temperature == "fahrenheit" {
        "Fahrenheit"
    } else {
        "Celsius"
    };
    let pressure = if choice.pressure == "psi" {
        "psi"
    } else {
        "bar"
    };
    let torque = if choice.torque == "lb-ft" {
        "lb-ft"
    } else {
        "Nm"
    };
    let power = if choice.power == "kw" { "kW" } else { "HP" };
    let tire_pressure = if choice.tire_pressure == "psi" {
        "psi"
    } else {
        "bar"
    };
    let suspension_travel = if choice.suspension_travel == "in" {
        "in"
    } else {
        "mm"
    };

    MeasurementUnitsExplicit {
        distance: distance.into(),
        speed: speed.into(),
        acceleration: acceleration.into(),
        g_force: "g".into(),
        temperature: temperature.into(),
        pressure: pressure.into(),
        torque: torque.into(),
        power: power.into(),
        fuel_volume: fuel_volume.into(),
        fuel_mass: if choice.fuel_volume == "imperial" {
            "lb".into()
        } else {
            "kg".into()
        },
        angle: "°".into(),
        rotation_rpm: "RPM".into(),
        suspension_travel: suspension_travel.into(),
        tire_pressure: tire_pressure.into(),
        input_percent: "%".into(),
        fuel_consumption: fuel_consumption.into(),
        time: "s".into(),
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDetails {
    pub host: String,
    pub port: u16,
    pub connection_password: String,
    pub command_password: String,
}

impl Default for ConnectionDetails {
    fn default() -> Self {
        Self {
            host: String::new(),
            port: 0,
            connection_password: String::new(),
            command_password: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameConnectionSettings {
    pub acc: ConnectionDetails,
    pub iracing: ConnectionDetails,
    pub lmu: ConnectionDetails,
}

impl Default for GameConnectionSettings {
    fn default() -> Self {
        Self {
            acc: ConnectionDetails {
                host: "127.0.0.1".into(),
                port: 9000,
                connection_password: "asd".into(),
                command_password: String::new(),
            },
            iracing: ConnectionDetails::default(),
            lmu: ConnectionDetails::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SettingsData {
    pub check_for_updates: bool,
    pub language: String,
    #[serde(rename = "measurement_units")]
    pub measurement_units: MeasurementUnitsChoice,
    #[serde(default)]
    pub hotkeys: std::collections::HashMap<String, Option<String>>,
    #[serde(default)]
    pub connection_settings: GameConnectionSettings,
    #[serde(default)]
    pub data_share_consent: bool,
    #[serde(default)]
    pub pro_subscription_plan: Option<String>,
}

impl Default for SettingsData {
    fn default() -> Self {
        let mut hotkeys = std::collections::HashMap::new();
        hotkeys.insert("toggle_overlay_edit_mode".into(), Some("Alt + E".into()));
        hotkeys.insert("toggle_overlays_enabled".into(), Some("Alt + W".into()));

        Self {
            check_for_updates: true,
            language: "en".into(),
            measurement_units: MeasurementUnitsChoice::default(),
            hotkeys,
            connection_settings: GameConnectionSettings::default(),
            data_share_consent: false,
            pro_subscription_plan: None,
        }
    }
}

fn read_settings_sync(app: &AppHandle) -> Result<SettingsData, String> {
    let path = settings_file_path(app)?;
    if !path.exists() {
        log::info!(
            "[settings] get_settings: {} missing; returning defaults (no write)",
            path.display()
        );
        return Ok(SettingsData::default());
    }
    log::info!("[settings] get_settings: reading {}", path.display());
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    match serde_json::from_str::<SettingsData>(&contents) {
        Ok(data) => {
            log::info!("[settings] get_settings: parsed compact schema OK");
            Ok(data)
        }
        Err(_) => {
            log::warn!("[settings] get_settings: parse failed; returning defaults (no write)");
            Ok(SettingsData::default())
        }
    }
}

pub fn load_settings_sync(app: &AppHandle) -> Result<SettingsData, String> {
    read_settings_sync(app)
}

pub fn load_connection_settings(app: &AppHandle) -> Result<GameConnectionSettings, String> {
    read_settings_sync(app).map(|settings| settings.connection_settings)
}

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<SettingsData, String> {
    load_settings_sync(&app)
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: SettingsData) -> Result<(), String> {
    let path = settings_file_path(&app)?;
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    log::info!(
        "[settings] save_settings: writing {} ({} bytes)",
        path.display(),
        json.len()
    );
    fs::write(&path, json).map_err(|e| e.to_string())?;
    log::info!("[settings] save_settings: wrote {}", path.display());
    Ok(())
}

#[tauri::command]
pub async fn import_settings(app: AppHandle, file_path: String) -> Result<(), String> {
    if file_path.trim().is_empty() {
        return Err("file_path cannot be empty".into());
    }
    log::info!("[settings] import_settings: reading from {}", file_path);
    let contents =
        fs::read_to_string(&file_path).map_err(|e| format!("failed to read file: {e}"))?;
    let imported: SettingsData =
        serde_json::from_str(&contents).map_err(|e| format!("invalid settings file: {e}"))?;
    if imported.language.trim().is_empty() {
        return Err("missing language".into());
    }
    let dest = settings_file_path(&app)?;
    let json = serde_json::to_string_pretty(&imported).map_err(|e| e.to_string())?;
    log::info!(
        "[settings] import_settings: writing {} ({} bytes)",
        dest.display(),
        json.len()
    );
    fs::write(&dest, json).map_err(|e| e.to_string())?;
    log::info!("[settings] import_settings: wrote {}", dest.display());
    Ok(())
}

#[tauri::command]
pub async fn import_settings_json(app: AppHandle, contents: String) -> Result<(), String> {
    if contents.trim().is_empty() {
        return Err("contents cannot be empty".into());
    }
    let imported: SettingsData =
        serde_json::from_str(&contents).map_err(|e| format!("invalid settings file: {e}"))?;
    if imported.language.trim().is_empty() {
        return Err("missing language".into());
    }
    let dest = settings_file_path(&app)?;
    let json = serde_json::to_string_pretty(&imported).map_err(|e| e.to_string())?;
    log::info!(
        "[settings] import_settings_json: writing {} ({} bytes)",
        dest.display(),
        json.len()
    );
    fs::write(&dest, json).map_err(|e| e.to_string())?;
    log::info!("[settings] import_settings_json: wrote {}", dest.display());
    Ok(())
}
