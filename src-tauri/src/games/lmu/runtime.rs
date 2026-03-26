use crate::games::{launch_game, GameRuntime};
use tauri::AppHandle;

pub struct LmuRuntime;

pub static LMU_RUNTIME: LmuRuntime = LmuRuntime;

impl GameRuntime for LmuRuntime {
    fn id(&self) -> &'static str {
        "LMU"
    }

    fn label(&self) -> &'static str {
        "Le Mans Ultimate"
    }

    fn process_names(&self) -> &'static [&'static str] {
        &["LeMansUltimate.exe"]
    }

    fn launch(&self, app: &AppHandle) -> Result<(), String> {
        const APP_ID: u32 = 2_399_420;
        launch_game::launch_steam_game(app, APP_ID)
    }
}
