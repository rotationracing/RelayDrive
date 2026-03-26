use sysinfo::System;

use super::GameRuntime;

/// Checks whether any of the provided executable names is currently running.
pub fn is_process_running_for_runtime(runtime: &dyn GameRuntime) -> Result<bool, String> {
    is_process_running(runtime.process_names())
}

pub fn is_process_running(candidates: &[&str]) -> Result<bool, String> {
    if candidates.is_empty() {
        return Err("game runtime did not declare any process names".into());
    }

    let wanted: Vec<String> = candidates
        .iter()
        .map(|name| name.trim().to_ascii_lowercase())
        .collect();

    let mut system = System::new_all();
    system.refresh_processes();

    let found = system.processes().values().any(|process| {
        let exe_name = process
            .exe()
            .and_then(|path| path.file_name())
            .and_then(|name| name.to_str())
            .map(|name| name.to_ascii_lowercase());
        let process_name = process.name().to_ascii_lowercase();

        wanted.iter().any(|target| {
            exe_name.as_ref().is_some_and(|exe| exe == target) || process_name == *target
        })
    });

    Ok(found)
}
