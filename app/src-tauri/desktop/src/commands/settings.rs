use crate::db::{config_path, default_data_dir};
use crate::error::{AppError, AppResult};
use crate::models::AppConfig;
use crate::state::AppState;
use std::path::PathBuf;

pub fn load_config_from(data_dir: &std::path::Path) -> AppConfig {
    let path = config_path(data_dir);
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str::<AppConfig>(&s).ok())
        .unwrap_or_else(|| {
            let mut cfg = AppConfig::default();
            cfg.data_dir = data_dir.to_string_lossy().to_string();
            cfg
        })
}

pub fn save_config_to(data_dir: &std::path::Path, cfg: &AppConfig) -> AppResult<()> {
    std::fs::create_dir_all(data_dir)?;
    let path = config_path(data_dir);
    let content = serde_json::to_string_pretty(cfg)?;
    std::fs::write(&path, content)?;
    Ok(())
}

pub fn get_config(state: &AppState) -> AppResult<AppConfig> {
    let cfg = state
        .config
        .lock()
        .map_err(|_| AppError::Other("state lock".into()))?;
    Ok(cfg.clone())
}

pub fn complete_first_run(state: &AppState) -> AppResult<AppConfig> {
    let mut cfg = state
        .config
        .lock()
        .map_err(|_| AppError::Other("state lock".into()))?;
    cfg.first_run_complete = true;
    save_config_to(std::path::Path::new(&cfg.data_dir), &cfg)?;
    let default_dir = default_data_dir();
    let pointer = cfg.clone();
    save_config_to(&default_dir, &pointer)?;
    Ok(cfg.clone())
}

#[derive(Debug, serde::Serialize)]
pub struct DetectedCloudFolders {
    pub onedrive: Option<String>,
    pub google_drive: Option<String>,
    pub dropbox: Option<String>,
}

pub fn detect_cloud_folders() -> AppResult<DetectedCloudFolders> {
    let home = directories::UserDirs::new().map(|d| d.home_dir().to_path_buf());
    let check = |path: &PathBuf| -> Option<String> {
        if path.exists() {
            Some(path.to_string_lossy().to_string())
        } else {
            None
        }
    };

    let mut out = DetectedCloudFolders {
        onedrive: None,
        google_drive: None,
        dropbox: None,
    };

    if let Ok(od) = std::env::var("OneDrive") {
        out.onedrive = check(&PathBuf::from(od));
    }
    if let Some(home) = &home {
        if out.onedrive.is_none() {
            out.onedrive = check(&home.join("OneDrive"));
        }
        if out.google_drive.is_none() {
            out.google_drive = check(&home.join("Google Drive"));
        }
        if out.dropbox.is_none() {
            out.dropbox = check(&home.join("Dropbox"));
        }
    }
    Ok(out)
}

pub fn bootstrap_config() -> AppConfig {
    let default_dir = default_data_dir();
    let pointer = load_config_from(&default_dir);
    if !pointer.data_dir.is_empty()
        && pointer.data_dir != default_dir.to_string_lossy()
        && std::path::Path::new(&pointer.data_dir).exists()
    {
        return load_config_from(std::path::Path::new(&pointer.data_dir));
    }
    pointer
}
