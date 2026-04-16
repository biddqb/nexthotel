use crate::db::Db;
use crate::models::AppConfig;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Db>,
    pub config: Arc<Mutex<AppConfig>>,
}
