#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn main() {
    // Init tracing (writes to file in release, stdout in debug)
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,tower_http=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let port: u16 = std::env::var("NEXTHOTEL_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8080);

    let local_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".into());

    // Spawn the Axum HTTP server on a background thread with its own tokio runtime
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime");
        if let Err(e) = rt.block_on(nexthotel_server::run()) {
            tracing::error!("Server error: {e}");
            std::process::exit(1);
        }
    });

    // Main thread: system tray event loop (blocks until "Thoát" is clicked)
    let tray = nexthotel_server::tray::TrayApp::new(port, &local_ip);
    tray.run_event_loop();
}
