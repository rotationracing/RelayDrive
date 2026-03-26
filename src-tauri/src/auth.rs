use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const AUTH_FILE: &str = "auth.json";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TokenExchangeRes {
    pub token: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuthData {
    pub token: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
    pub saved_at_ms: u64,
}

fn auth_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app_data_dir: {e}"))?;
    fs::create_dir_all(&base).map_err(|e| format!("failed to create data dir: {e}"))?;
    let p = base.join(AUTH_FILE);
    log::info!("[auth] auth_file_path = {}", p.display());
    Ok(p)
}

#[tauri::command]
pub async fn exchange_token(token: String) -> Result<TokenExchangeRes, String> {
    let client = reqwest::Client::new();
    log::info!(
        "[auth] POST https://api.rotationracing.eu/api/v1/auth/token with Authorization=Bearer {}",
        token
    );
    let res = client
        .post("https://api.rotationracing.eu/api/v1/auth/token")
        .header(reqwest::header::AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    log::info!("[auth] POST /auth/token status={} body={}", status, text);
    if !status.is_success() {
        return Err(format!("token exchange failed: {} body={}", status, text));
    }
    let body: TokenExchangeRes = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    log::info!(
        "[auth] POST /auth/token response token={} expiresAt={}",
        body.token,
        body.expires_at
    );
    Ok(body)
}

#[tauri::command]
pub async fn fetch_me(bearer_token: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    log::info!(
        "[auth] GET https://api.rotationracing.eu/api/v1/user/me with Authorization=Bearer {}",
        bearer_token
    );
    let res = client
        .get("https://api.rotationracing.eu/api/v1/user/me")
        .header(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", bearer_token),
        )
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    log::info!("[auth] GET /user/me status={} body={}", status, text);
    if !status.is_success() {
        return Err(format!("fetch /user/me failed: {} body={}", status, text));
    }
    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    log::info!("[auth] GET /user/me response: {}", json);
    Ok(json)
}

#[tauri::command]
pub async fn save_auth(app: AppHandle, token: String, expires_at: String) -> Result<(), String> {
    if token.trim().is_empty() {
        return Err("token cannot be empty".into());
    }
    if expires_at.trim().is_empty() {
        return Err("expiresAt cannot be empty".into());
    }
    let path = auth_file_path(&app)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as u64;
    let data = AuthData {
        token,
        expires_at,
        saved_at_ms: now,
    };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    log::info!(
        "[auth] save_auth: writing {} ({} bytes)",
        path.display(),
        json.len()
    );
    fs::write(&path, json).map_err(|e| e.to_string())?;
    log::info!("[auth] save_auth: wrote {}", path.display());
    Ok(())
}

#[tauri::command]
pub async fn get_auth(app: AppHandle) -> Result<Option<AuthData>, String> {
    let path = auth_file_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    log::info!("[auth] get_auth: reading {}", path.display());
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: AuthData = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    log::info!("[auth] get_auth: parsed OK");
    Ok(Some(data))
}

#[tauri::command]
pub async fn clear_auth(app: AppHandle) -> Result<(), String> {
    let path = auth_file_path(&app)?;
    if path.exists() {
        log::info!("[auth] clear_auth: removing {}", path.display());
        fs::remove_file(&path).map_err(|e| e.to_string())?;
        log::info!("[auth] clear_auth: removed {}", path.display());
    }
    Ok(())
}
