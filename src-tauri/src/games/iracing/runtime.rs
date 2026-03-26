use tauri::AppHandle;

use super::super::GameRuntime;

pub struct IRacingRuntime;

pub static IRACING_RUNTIME: IRacingRuntime = IRacingRuntime;

impl GameRuntime for IRacingRuntime {
    fn id(&self) -> &'static str {
        "iRacing"
    }

    fn label(&self) -> &'static str {
        "iRacing"
    }

    fn process_names(&self) -> &'static [&'static str] {
        &["iRacingSim64DX11.exe", "iRacingSim64DX12.exe"]
    }

    fn launch(&self, _app: &AppHandle) -> Result<(), String> {
        Err("Launching iRacing is not yet implemented".into())
    }
}
