use crate::games::{launch_game, GameRuntime};
use tauri::AppHandle;

pub struct AccRuntime;

pub static ACC_RUNTIME: AccRuntime = AccRuntime;

impl GameRuntime for AccRuntime {
    fn id(&self) -> &'static str {
        "ACC"
    }

    fn label(&self) -> &'static str {
        "Assetto Corsa Competizione"
    }

    fn process_names(&self) -> &'static [&'static str] {
        &["acc.exe"]
    }

    fn launch(&self, app: &AppHandle) -> Result<(), String> {
        const APP_ID: u32 = 805_550;
        launch_game::launch_steam_game(app, APP_ID)
    }
}
