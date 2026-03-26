use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyRegistration {
    pub shortcut: String,
}

/// Parse shortcut string to Tauri format
fn parse_shortcut(shortcut: &str) -> Result<(Modifiers, Code), String> {
    let parts: Vec<&str> = shortcut.split('+').map(|s| s.trim()).collect();
    let mut modifiers = Modifiers::empty();
    let mut code = None;

    for part in parts {
        match part {
            "Control" | "Ctrl" => modifiers |= Modifiers::CONTROL,
            "Alt" => modifiers |= Modifiers::ALT,
            "Shift" => modifiers |= Modifiers::SHIFT,
            "Meta" | "Super" | "Cmd" => modifiers |= Modifiers::SUPER,
            key => {
                let key_code = match key {
                    "E" => Code::KeyE,
                    "F" => Code::KeyF,
                    "Up" => Code::ArrowUp,
                    "Down" => Code::ArrowDown,
                    "Left" => Code::ArrowLeft,
                    "Right" => Code::ArrowRight,
                    "Space" => Code::Space,
                    "Enter" => Code::Enter,
                    "Tab" => Code::Tab,
                    "Esc" | "Escape" => Code::Escape,
                    "Backspace" => Code::Backspace,
                    "Delete" => Code::Delete,
                    "Home" => Code::Home,
                    "End" => Code::End,
                    "PageUp" => Code::PageUp,
                    "PageDown" => Code::PageDown,
                    k if k.len() == 1 => {
                        // Single character key
                        match k.to_uppercase().as_str() {
                            "A" => Code::KeyA,
                            "B" => Code::KeyB,
                            "C" => Code::KeyC,
                            "D" => Code::KeyD,
                            "E" => Code::KeyE,
                            "F" => Code::KeyF,
                            "G" => Code::KeyG,
                            "H" => Code::KeyH,
                            "I" => Code::KeyI,
                            "J" => Code::KeyJ,
                            "K" => Code::KeyK,
                            "L" => Code::KeyL,
                            "M" => Code::KeyM,
                            "N" => Code::KeyN,
                            "O" => Code::KeyO,
                            "P" => Code::KeyP,
                            "Q" => Code::KeyQ,
                            "R" => Code::KeyR,
                            "S" => Code::KeyS,
                            "T" => Code::KeyT,
                            "U" => Code::KeyU,
                            "V" => Code::KeyV,
                            "W" => Code::KeyW,
                            "X" => Code::KeyX,
                            "Y" => Code::KeyY,
                            "Z" => Code::KeyZ,
                            _ => return Err(format!("Unsupported key: {}", k)),
                        }
                    }
                    _ => return Err(format!("Unsupported key: {}", key)),
                };
                code = Some(key_code);
            }
        }
    }

    match code {
        Some(c) => Ok((modifiers, c)),
        None => Err("No key specified in shortcut".to_string()),
    }
}

/// Register a global shortcut
#[tauri::command]
pub async fn register_global_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    log::info!(
        "[hotkeys] ✓ register_global_shortcut CALLED with shortcut: '{}'",
        shortcut
    );

    let (modifiers, code) = parse_shortcut(&shortcut)?;
    let shortcut_clone = shortcut.clone();
    let shortcut_obj = Shortcut::new(Some(modifiers), code);

    log::info!(
        "[hotkeys] Registering global shortcut: {} (modifiers={:?}, code={:?})",
        shortcut,
        modifiers,
        code
    );

    app.global_shortcut()
        .on_shortcut(shortcut_obj, move |_app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            log::info!(
                "[hotkeys] ✓ Global shortcut triggered: {} (Pressed)",
                shortcut_clone
            );

            // Emit to all windows (including minimized/background windows)
            let emit_result = _app.emit("global-shortcut://triggered", &shortcut_clone);
            if let Err(e) = emit_result {
                log::error!("[hotkeys] ✗ Failed to emit global shortcut event: {}", e);
            } else {
                log::info!("[hotkeys] ✓ Successfully emitted global shortcut event to all windows");
            }
        })
        .map_err(|e| format!("Failed to register global shortcut: {}", e))?;

    log::info!(
        "[hotkeys] ✓ Successfully registered global shortcut callback for: {}",
        shortcut
    );

    Ok(())
}

/// Unregister a global shortcut
#[tauri::command]
pub async fn unregister_global_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let (modifiers, code) = parse_shortcut(&shortcut)?;
    let shortcut_obj = Shortcut::new(Some(modifiers), code);

    log::info!("[hotkeys] Unregistering global shortcut: {}", shortcut);

    app.global_shortcut()
        .unregister(shortcut_obj)
        .map_err(|e| format!("Failed to unregister global shortcut: {}", e))?;

    Ok(())
}

/// Unregister all global shortcuts
#[tauri::command]
pub async fn unregister_all_global_shortcuts(app: AppHandle) -> Result<(), String> {
    log::info!("[hotkeys] Unregistering all global shortcuts");

    app.global_shortcut()
        .unregister_all()
        .map_err(|e| format!("Failed to unregister all global shortcuts: {}", e))?;

    Ok(())
}
