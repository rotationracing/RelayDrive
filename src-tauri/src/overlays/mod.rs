pub mod config;

use serde::Deserialize;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Position, Size};

#[derive(Deserialize)]
pub struct OverlayWindowOptions {
    id: String,
    url: String,
    position: Option<OverlayPoint>,
    size: Option<OverlaySize>,
    #[serde(default)]
    always_on_top: Option<bool>,
    #[serde(default)]
    skip_taskbar: Option<bool>,
    #[serde(default)]
    transparent: Option<bool>,
    #[serde(default)]
    decorations: Option<bool>,
}

#[derive(Deserialize)]
pub struct OverlayWindowUpdate {
    position: Option<OverlayPoint>,
    size: Option<OverlaySize>,
    #[serde(default)]
    always_on_top: Option<bool>,
    #[serde(default)]
    visible: Option<bool>,
}

#[derive(Deserialize, Clone, Copy)]
pub struct OverlayPoint {
    x: f64,
    y: f64,
}

#[derive(Deserialize, Clone, Copy)]
pub struct OverlaySize {
    width: f64,
    height: f64,
}

#[tauri::command]
pub async fn create_overlay_window(
    app: AppHandle,
    options: OverlayWindowOptions,
) -> Result<(), String> {
    let label = format!("overlay-{}", options.id);

    if let Some(existing) = app.get_webview_window(&label) {
        log::info!(
            "[overlay] Window {} already exists, skipping creation",
            label
        );
        // Ensure it's shown even if it exists
        if let Err(e) = existing.show() {
            log::warn!("[overlay] Failed to show existing window {}: {}", label, e);
        }
        return Ok(());
    }

    log::info!("[overlay] Creating new window {}", label);

    let url = tauri::WebviewUrl::App(options.url.into());
    let mut builder = tauri::WebviewWindowBuilder::new(&app, label.clone(), url)
        .resizable(false)
        .focused(false)
        .visible(false)
        .decorations(options.decorations.unwrap_or(false))
        .transparent(options.transparent.unwrap_or(true))
        .skip_taskbar(options.skip_taskbar.unwrap_or(true))
        .shadow(false);

    if let Some(always_on_top) = options.always_on_top {
        builder = builder.always_on_top(always_on_top);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    if let Some(size) = options.size {
        let logical = LogicalSize::new(size.width, size.height);
        window
            .set_size(Size::Logical(logical))
            .map_err(|e| format!("failed to set overlay size: {e}"))?;
    }

    if let Some(position) = options.position {
        let logical = LogicalPosition::new(position.x, position.y);
        window
            .set_position(Position::Logical(logical))
            .map_err(|e| format!("failed to set overlay position: {e}"))?;
    }

    if let Some(always_on_top) = options.always_on_top {
        window
            .set_always_on_top(always_on_top)
            .map_err(|e| format!("failed to set overlay always-on-top: {e}"))?;
    } else {
        window
            .set_always_on_top(true)
            .map_err(|e| format!("failed to set overlay always-on-top: {e}"))?;
    }

    window
        .show()
        .map_err(|e| format!("failed to show overlay window: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn update_overlay_window(
    app: AppHandle,
    id: String,
    updates: OverlayWindowUpdate,
) -> Result<(), String> {
    let label = format!("overlay-{}", id);
    let Some(window) = app.get_webview_window(&label) else {
        return Err(format!("overlay window {label} not found"));
    };

    if let Some(size) = updates.size {
        let logical = LogicalSize::new(size.width, size.height);
        window
            .set_size(Size::Logical(logical))
            .map_err(|e| format!("failed to update overlay size: {e}"))?;
    }

    if let Some(position) = updates.position {
        let logical = LogicalPosition::new(position.x, position.y);
        window
            .set_position(Position::Logical(logical))
            .map_err(|e| format!("failed to update overlay position: {e}"))?;
    }

    if let Some(always_on_top) = updates.always_on_top {
        window
            .set_always_on_top(always_on_top)
            .map_err(|e| format!("failed to update overlay always-on-top: {e}"))?;
    }

    if let Some(visible) = updates.visible {
        if visible {
            window
                .show()
                .map_err(|e| format!("failed to show overlay window: {e}"))?;
        } else {
            window
                .hide()
                .map_err(|e| format!("failed to hide overlay window: {e}"))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn close_overlay_window(app: AppHandle, id: String) -> Result<(), String> {
    let label = format!("overlay-{}", id);
    let Some(window) = app.get_webview_window(&label) else {
        return Ok(());
    };

    window
        .close()
        .map_err(|e| format!("failed to close overlay window: {e}"))?;

    Ok(())
}

/// Close all overlay windows. This is called when the main window closes.
pub fn close_all_overlay_windows(app: &AppHandle) {
    log::info!("[overlay] Closing all overlay windows");

    let mut closed_count = 0;
    let windows = app.webview_windows();

    for (label, window) in windows.iter() {
        if label.starts_with("overlay-") {
            log::info!("[overlay] Closing overlay window: {}", label);
            if let Err(e) = window.close() {
                log::warn!("[overlay] Failed to close overlay window {}: {}", label, e);
            } else {
                closed_count += 1;
            }
        }
    }

    log::info!("[overlay] Closed {} overlay window(s)", closed_count);
}
