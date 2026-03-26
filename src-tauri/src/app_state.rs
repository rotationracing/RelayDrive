use std::sync::Mutex;

use crate::users::UserData;

pub struct AppState {
    pub active_game: Mutex<Option<String>>,
    pub user_cache: Mutex<Option<UserData>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            active_game: Mutex::new(None),
            user_cache: Mutex::new(None),
        }
    }
}
