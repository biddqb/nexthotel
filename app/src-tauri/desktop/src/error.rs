use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Config error: {0}")]
    Config(String),

    #[error("{code}: {message}")]
    Domain { code: String, message: String },

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("{0}")]
    Other(String),
}

impl AppError {
    pub fn domain(code: impl Into<String>, message: impl Into<String>) -> Self {
        AppError::Domain {
            code: code.into(),
            message: message.into(),
        }
    }

    fn status(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::Domain { .. } => StatusCode::BAD_REQUEST,
            AppError::Db(_) | AppError::Io(_) | AppError::Json(_) | AppError::Config(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            AppError::Other(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        #[derive(Serialize)]
        struct Err<'a> {
            code: &'a str,
            message: String,
        }

        let (code, message) = match self {
            AppError::Domain { code, message } => (code.as_str(), message.clone()),
            AppError::NotFound(m) => ("NOT_FOUND", m.clone()),
            AppError::Unauthorized => ("UNAUTHORIZED", "Chưa đăng nhập.".into()),
            AppError::Forbidden => ("FORBIDDEN", "Không có quyền.".into()),
            AppError::Db(e) => ("DB_ERROR", e.to_string()),
            AppError::Io(e) => ("IO_ERROR", e.to_string()),
            AppError::Json(e) => ("JSON_ERROR", e.to_string()),
            AppError::Config(m) => ("CONFIG_ERROR", m.clone()),
            AppError::Other(m) => ("ERROR", m.clone()),
        };
        Err { code, message }.serialize(serializer)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        tracing::warn!(error = %self, "request failed");
        let status = self.status();
        let body = Json(&self);
        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
