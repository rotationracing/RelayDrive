use once_cell::sync::Lazy;
use tauri::AppHandle;

pub mod acc;
pub mod commands;
pub mod iracing;
pub mod launch_game;
pub mod lmu;
pub mod process;

pub trait GameRuntime: Sync + Send {
    fn id(&self) -> &'static str;
    fn label(&self) -> &'static str;
    /// One or more executable names to detect for this game (lower/upper case insensitive).
    fn process_names(&self) -> &'static [&'static str];
    fn launch(&self, app: &AppHandle) -> Result<(), String>;
}

static RUNTIMES: Lazy<Vec<&'static dyn GameRuntime>> = Lazy::new(|| {
    vec![
        &acc::ACC_RUNTIME,
        &iracing::IRACING_RUNTIME,
        &lmu::LMU_RUNTIME,
    ]
});

pub fn get_runtime(id: &str) -> Option<&'static dyn GameRuntime> {
    let needle = id.trim();
    RUNTIMES
        .iter()
        .copied()
        .find(|runtime| runtime.id().eq_ignore_ascii_case(needle))
}

pub fn all_ids() -> Vec<&'static str> {
    RUNTIMES.iter().map(|runtime| runtime.id()).collect()
}

pub fn all_runtimes() -> Vec<&'static dyn GameRuntime> {
    RUNTIMES.iter().copied().collect()
}
