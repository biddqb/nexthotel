use crate::db::{backups_dir, Db};
use crate::error::{AppError, AppResult};
use chrono::Local;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
pub struct BackupFile {
    pub path: String,
    pub filename: String,
    pub size_bytes: u64,
    pub created_at: String,
}

pub fn create_backup(db: &Db, data_dir: &std::path::Path) -> AppResult<BackupFile> {
    let dir = backups_dir(data_dir);
    let ts = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let filename = format!("nexthotel-{}.sqlite", ts);
    let dest = dir.join(&filename);
    db.vacuum_into(&dest)?;
    let meta = std::fs::metadata(&dest)?;
    Ok(BackupFile {
        path: dest.to_string_lossy().to_string(),
        filename,
        size_bytes: meta.len(),
        created_at: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

pub fn list_backups(data_dir: &std::path::Path) -> AppResult<Vec<BackupFile>> {
    let dir = backups_dir(data_dir);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("sqlite") {
            continue;
        }
        let meta = entry.metadata()?;
        let filename = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        let created_at = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| {
                let secs = d.as_secs();
                chrono::DateTime::<Local>::from(
                    std::time::UNIX_EPOCH + std::time::Duration::from_secs(secs),
                )
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
            })
            .unwrap_or_default();
        out.push(BackupFile {
            path: path.to_string_lossy().to_string(),
            filename,
            size_bytes: meta.len(),
            created_at,
        });
    }
    out.sort_by(|a, b| b.filename.cmp(&a.filename));
    Ok(out)
}

pub fn prune_backups(data_dir: &std::path::Path, keep_days: i64) -> AppResult<i64> {
    let dir = backups_dir(data_dir);
    if !dir.exists() {
        return Ok(0);
    }
    let cutoff = std::time::SystemTime::now()
        - std::time::Duration::from_secs((keep_days * 24 * 60 * 60) as u64);
    let mut deleted = 0;
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("sqlite") {
            continue;
        }
        if let Ok(meta) = entry.metadata() {
            if let Ok(modified) = meta.modified() {
                if modified < cutoff && std::fs::remove_file(&path).is_ok() {
                    deleted += 1;
                }
            }
        }
    }
    Ok(deleted)
}

pub fn data_dir_from_state(state: &crate::state::AppState) -> AppResult<PathBuf> {
    let cfg = state
        .config
        .lock()
        .map_err(|_| AppError::Other("state lock".into()))?;
    Ok(PathBuf::from(&cfg.data_dir))
}
