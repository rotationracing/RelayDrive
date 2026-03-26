use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

const STEAM_PROTOCOL: &str = "steam://run/";

pub fn launch_steam_game(app: &AppHandle, app_id: u32) -> Result<(), String> {
    let url = format!("{}{}", STEAM_PROTOCOL, app_id);
    app.shell().open(url, None).map_err(|e| e.to_string())
}
