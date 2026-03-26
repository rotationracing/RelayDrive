use serde::Serialize;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AccStaticsPayload {
    pub sm_version: String,
    pub ac_version: String,
    pub number_of_sessions: i32,
    pub num_cars: i32,
    pub track: String,
    pub sector_count: i32,
    pub player_name: String,
    pub player_surname: String,
    pub player_nick: String,
    pub car_model: String,
    pub max_rpm: i32,
    pub max_fuel: f32,
    pub penalty_enabled: bool,
    pub aid_fuel_rate: f32,
    pub aid_tyre_rate: f32,
    pub aid_mechanical_damage: f32,
    pub aid_stability: f32,
    pub aid_auto_clutch: bool,
    pub pit_window_start: i32,
    pub pit_window_end: i32,
    pub is_online: bool,
    pub dry_tyres_name: String,
    pub wet_tyres_name: String,
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn get_acc_statics() -> Result<AccStaticsPayload, String> {
    use acc_shared_memory_rs::{ACCError, ACCSharedMemory};

    fn err(e: ACCError) -> String {
        e.to_string()
    }

    let mut acc = ACCSharedMemory::new().map_err(err)?;
    let data = acc
        .read_shared_memory()
        .map_err(err)?
        .ok_or_else(|| "ACC shared memory not available".to_string())?;

    let s = data.statics;

    let payload = AccStaticsPayload {
        sm_version: s.sm_version,
        ac_version: s.ac_version,
        number_of_sessions: s.number_of_sessions,
        num_cars: s.num_cars,
        track: s.track,
        sector_count: s.sector_count,
        player_name: s.player_name,
        player_surname: s.player_surname,
        player_nick: s.player_nick,
        car_model: s.car_model,
        max_rpm: s.max_rpm,
        max_fuel: s.max_fuel,
        penalty_enabled: s.penalty_enabled,
        aid_fuel_rate: s.aid_fuel_rate,
        aid_tyre_rate: s.aid_tyre_rate,
        aid_mechanical_damage: s.aid_mechanical_damage,
        aid_stability: s.aid_stability,
        aid_auto_clutch: s.aid_auto_clutch,
        pit_window_start: s.pit_window_start,
        pit_window_end: s.pit_window_end,
        is_online: s.is_online,
        dry_tyres_name: s.dry_tyres_name,
        wet_tyres_name: s.wet_tyres_name,
    };

    Ok(payload)
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn get_acc_statics() -> Result<AccStaticsPayload, String> {
    Err("ACC statics are only available on Windows".into())
}
