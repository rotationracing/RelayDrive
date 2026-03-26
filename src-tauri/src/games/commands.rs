use tauri::{AppHandle, State};

use crate::app_state::AppState;

use super::{
    acc::{broadcast, graphics, physics},
    get_runtime, process,
};

fn canonicalize_game_id(input: &str) -> Result<String, String> {
    get_runtime(input)
        .map(|runtime| runtime.id().to_string())
        .ok_or_else(|| format!("unknown game \"{}\"", input))
}

fn resolve_active_game(state: &State<'_, AppState>) -> Result<String, String> {
    let guard = state.active_game.lock().map_err(|e| e.to_string())?;
    guard
        .clone()
        .ok_or_else(|| "no active game selected".into())
}

#[tauri::command]
pub async fn set_active_game(state: State<'_, AppState>, game: String) -> Result<(), String> {
    let canonical = canonicalize_game_id(&game)?;
    let mut guard = state.active_game.lock().map_err(|e| e.to_string())?;
    *guard = Some(canonical);
    Ok(())
}

#[tauri::command]
pub async fn get_active_game(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let guard = state.active_game.lock().map_err(|e| e.to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
pub async fn is_game_process_running(
    app: AppHandle,
    state: State<'_, AppState>,
    game_id: Option<String>,
) -> Result<bool, String> {
    let target_id = if let Some(game) = game_id {
        canonicalize_game_id(&game)?
    } else {
        resolve_active_game(&state)?
    };

    let runtime =
        get_runtime(&target_id).ok_or_else(|| format!("unknown game \"{}\"", target_id))?;

    let running = process::is_process_running_for_runtime(runtime)?;

    if running && target_id.eq_ignore_ascii_case("ACC") {
        if let Err(err) = physics::start_stream(app.clone()) {
            log::warn!("Failed to start ACC physics stream: {}", err);
        }
        if let Err(err) = graphics::start_stream(app.clone()) {
            log::warn!("Failed to start ACC graphics stream: {}", err);
        }
        if let Err(err) = broadcast::start_stream(app) {
            log::warn!("Failed to start ACC broadcast stream: {}", err);
        }
    }

    Ok(running)
}

#[tauri::command]
pub async fn launch_game(
    app: AppHandle,
    state: State<'_, AppState>,
    game: Option<String>,
) -> Result<(), String> {
    let target_id = if let Some(game) = game {
        canonicalize_game_id(&game)?
    } else {
        resolve_active_game(&state)?
    };

    let runtime =
        get_runtime(&target_id).ok_or_else(|| format!("unknown game \"{}\"", target_id))?;

    runtime.launch(&app)
}
