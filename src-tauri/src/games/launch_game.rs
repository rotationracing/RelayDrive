use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const STEAM_PROTOCOL: &str = "steam://run/";

pub fn launch_steam_game(app: &AppHandle, app_id: u32) -> Result<(), String> {
    let url = format!("{}{}", STEAM_PROTOCOL, app_id);
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}
