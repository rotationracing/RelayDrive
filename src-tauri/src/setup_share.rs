use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ShareSetupRequest {
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "setupJson")]
    pub setup_json: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ShareSetupResponse {
    pub code: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LookupShareRequest {
    pub code: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LookupShareResponse {
    pub username: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "setupJson")]
    pub setup_json: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
}

const SHARE_SETUP_ENDPOINT: &str = "https://api.rotationracing.eu/api/v1/setup/share";
const LOOKUP_SETUP_ENDPOINT: &str = "https://api.rotationracing.eu/api/v1/setup/share/lookup";

#[tauri::command]
pub async fn share_setup(
    bearer_token: String,
    file_name: String,
    setup_json: String,
) -> Result<ShareSetupResponse, String> {
    let client = reqwest::Client::new();
    
    log::info!(
        "[setup_share] POST {} with Authorization=Bearer {}...",
        SHARE_SETUP_ENDPOINT,
        bearer_token.chars().take(10).collect::<String>()
    );

    // Validate JSON format
    serde_json::from_str::<serde_json::Value>(&setup_json)
        .map_err(|e| format!("invalid JSON in setupJson: {}", e))?;

    let request = ShareSetupRequest {
        file_name: file_name.clone(),
        setup_json: setup_json.clone(),
    };

    let res = client
        .post(SHARE_SETUP_ENDPOINT)
        .header(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", bearer_token),
        )
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("request failed: {}", e))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    
    log::info!(
        "[setup_share] POST {} status={} body={}",
        SHARE_SETUP_ENDPOINT,
        status,
        text
    );

    if !status.is_success() {
        return Err(format!(
            "setup share failed: {} ({})",
            status, text
        ));
    }

    let body: ShareSetupResponse =
        serde_json::from_str(&text).map_err(|e| format!("failed to parse response: {}", e))?;

    log::info!(
        "[setup_share] setup shared: code={} expiresAt={}",
        body.code,
        body.expires_at
    );

    Ok(body)
}

#[tauri::command]
pub async fn lookup_setup(
    bearer_token: String,
    code: String,
) -> Result<LookupShareResponse, String> {
    let client = reqwest::Client::new();
    
    log::info!(
        "[setup_share] POST {} with code={} Authorization=Bearer {}...",
        LOOKUP_SETUP_ENDPOINT,
        code,
        bearer_token.chars().take(10).collect::<String>()
    );

    let request = LookupShareRequest { code: code.clone() };

    let res = client
        .post(LOOKUP_SETUP_ENDPOINT)
        .header(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", bearer_token),
        )
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("request failed: {}", e))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    
    log::info!(
        "[setup_share] POST {} status={} body={}",
        LOOKUP_SETUP_ENDPOINT,
        status,
        text
    );

    if !status.is_success() {
        return Err(format!(
            "setup lookup failed: {} ({})",
            status, text
        ));
    }

    let body: LookupShareResponse =
        serde_json::from_str(&text).map_err(|e| format!("failed to parse response: {}", e))?;

    log::info!(
        "[setup_share] setup found: username={} displayName={} fileName={}",
        body.username,
        body.display_name,
        body.file_name
    );

    Ok(body)
}
