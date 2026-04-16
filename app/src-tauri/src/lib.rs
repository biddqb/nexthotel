pub mod assets;
pub mod auth;
pub mod commands;
pub mod db;
pub mod error;
pub mod handlers;
pub mod models;
pub mod state;
pub mod tray;

use crate::db::{db_path, Db};
use crate::state::AppState;
use axum::Router;
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::trace::TraceLayer;

pub async fn run() -> anyhow::Result<()> {
    let config = crate::commands::settings::bootstrap_config();
    let data_dir = if config.data_dir.is_empty() {
        crate::db::default_data_dir()
    } else {
        PathBuf::from(&config.data_dir)
    };

    let mut effective_config = config.clone();
    effective_config.data_dir = data_dir.to_string_lossy().to_string();

    let db = Db::open(&db_path(&data_dir))?;
    let state = AppState {
        db: Arc::new(db),
        config: Arc::new(std::sync::Mutex::new(effective_config)),
    };

    let port: u16 = std::env::var("NEXTHOTEL_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8080);

    let app = Router::new()
        .merge(handlers::api_router())
        .merge(handlers::assets_router())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    let local_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".into());

    println!("\n╔════════════════════════════════════════════════╗");
    println!("║  nextHotel server running                      ║");
    println!("║                                                ║");
    println!("║  Local:    http://127.0.0.1:{:<19}║", port);
    println!("║  Network:  http://{}:{:<14}   ║", local_ip, port);
    println!("║                                                ║");
    println!("║  Share the Network URL with staff devices.     ║");
    println!("╚════════════════════════════════════════════════╝\n");

    axum::serve(listener, app).await?;
    Ok(())
}
