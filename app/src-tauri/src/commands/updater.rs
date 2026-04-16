use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateManifest {
    pub version: String,
    pub url: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Serialize)]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub update_available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manifest: Option<UpdateManifest>,
}

fn update_url() -> Option<String> {
    std::env::var("NEXTHOTEL_UPDATE_URL").ok().filter(|s| !s.is_empty())
}

pub async fn check_update() -> AppResult<UpdateCheckResult> {
    let url = match update_url() {
        Some(u) => u,
        None => {
            return Ok(UpdateCheckResult {
                current_version: VERSION.into(),
                update_available: false,
                manifest: None,
            })
        }
    };

    let manifest: UpdateManifest = reqwest::get(&url)
        .await
        .map_err(|e| AppError::Other(format!("Không thể kiểm tra bản cập nhật: {e}")))?
        .json()
        .await
        .map_err(|e| AppError::Other(format!("Dữ liệu cập nhật không hợp lệ: {e}")))?;

    let current = semver::Version::parse(VERSION)
        .map_err(|e| AppError::Other(format!("Phiên bản hiện tại không hợp lệ: {e}")))?;
    let remote = semver::Version::parse(&manifest.version)
        .map_err(|e| AppError::Other(format!("Phiên bản mới không hợp lệ: {e}")))?;

    Ok(UpdateCheckResult {
        current_version: VERSION.into(),
        update_available: remote > current,
        manifest: if remote > current {
            Some(manifest)
        } else {
            None
        },
    })
}

pub async fn apply_update(manifest: UpdateManifest) -> AppResult<()> {
    let current_exe =
        std::env::current_exe().map_err(|e| AppError::Other(format!("Không tìm thấy exe: {e}")))?;

    let temp_dir = std::env::temp_dir();
    let new_exe = temp_dir.join("nexthotel-server-new.exe");

    tracing::info!("Downloading update v{} from {}", manifest.version, manifest.url);

    let bytes = reqwest::get(&manifest.url)
        .await
        .map_err(|e| AppError::Other(format!("Tải cập nhật thất bại: {e}")))?
        .bytes()
        .await
        .map_err(|e| AppError::Other(format!("Đọc dữ liệu thất bại: {e}")))?;

    std::fs::write(&new_exe, &bytes)
        .map_err(|e| AppError::Other(format!("Ghi file thất bại: {e}")))?;

    tracing::info!(
        "Downloaded {} bytes to {}",
        bytes.len(),
        new_exe.display()
    );

    write_swap_script(&current_exe, &new_exe)?;

    tokio::spawn(async {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        tracing::info!("Shutting down for update...");
        std::process::exit(0);
    });

    Ok(())
}

fn write_swap_script(current_exe: &PathBuf, new_exe: &PathBuf) -> AppResult<()> {
    let script_path = std::env::temp_dir().join("nexthotel-update.cmd");
    let current = current_exe.to_string_lossy();
    let new = new_exe.to_string_lossy();

    let script = format!(
        r#"@echo off
echo nextHotel: applying update...
timeout /t 3 /nobreak >nul
copy /y "{new}" "{current}"
if errorlevel 1 (
    echo UPDATE FAILED: could not replace exe.
    pause
    exit /b 1
)
del /q "{new}"
start "" "{current}"
del /q "%~f0"
"#
    );

    std::fs::write(&script_path, &script)
        .map_err(|e| AppError::Other(format!("Ghi script cập nhật thất bại: {e}")))?;

    std::process::Command::new("cmd")
        .args(["/C", "start", "/min", "", &script_path.to_string_lossy()])
        .spawn()
        .map_err(|e| AppError::Other(format!("Chạy script cập nhật thất bại: {e}")))?;

    Ok(())
}
