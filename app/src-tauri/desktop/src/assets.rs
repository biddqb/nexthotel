use axum::{
    body::Body,
    extract::Path,
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Response},
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../../dist/"]
#[exclude = "*.map"]
struct Assets;

pub async fn serve_root() -> Response {
    serve_file("index.html")
}

pub async fn serve_path(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    if path.is_empty() {
        return serve_file("index.html");
    }
    serve_file(path)
}

pub async fn serve_asset(Path(file): Path<String>) -> Response {
    serve_file(&format!("assets/{}", file))
}

fn serve_file(path: &str) -> Response {
    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            (
                [(header::CONTENT_TYPE, mime.as_ref())],
                Body::from(content.data.into_owned()),
            )
                .into_response()
        }
        None => {
            // SPA fallback: serve index.html for unknown routes that don't look like assets.
            if !path.contains('.') {
                match Assets::get("index.html") {
                    Some(c) => (
                        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
                        Body::from(c.data.into_owned()),
                    )
                        .into_response(),
                    None => (StatusCode::NOT_FOUND, "index.html not embedded").into_response(),
                }
            } else {
                (StatusCode::NOT_FOUND, "not found").into_response()
            }
        }
    }
}
