use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::{Role, User};
use crate::state::AppState;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts, State},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use chrono::{Duration, Utc};
use rand::RngCore;

const SESSION_COOKIE: &str = "nexthotel_session";
const SESSION_DAYS: i64 = 30;

// ---------- Password (PIN) hashing ----------

pub fn hash_pin(pin: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    Ok(Argon2::default()
        .hash_password(pin.as_bytes(), &salt)
        .map_err(|e| AppError::Other(format!("hash failed: {e}")))?
        .to_string())
}

pub fn verify_pin(pin: &str, hash: &str) -> bool {
    match PasswordHash::new(hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(pin.as_bytes(), &parsed)
            .is_ok(),
        Err(_) => false,
    }
}

// ---------- User CRUD ----------

fn map_user(r: &rusqlite::Row<'_>) -> rusqlite::Result<User> {
    let role_str: String = r.get(2)?;
    Ok(User {
        id: r.get(0)?,
        name: r.get(1)?,
        role: Role::parse(&role_str).unwrap_or(Role::Staff),
        active: r.get::<_, i64>(3)? != 0,
        created_at: r.get(4)?,
    })
}

pub fn list_users(db: &Db) -> AppResult<Vec<User>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, role, active, created_at
             FROM users WHERE hotel_id = 1 ORDER BY name",
        )?;
        let rows = stmt
            .query_map([], map_user)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn create_user(db: &Db, name: String, pin: String, role: Role) -> AppResult<User> {
    if name.trim().is_empty() {
        return Err(AppError::domain("USER_NAME_REQUIRED", "Tên đăng nhập là bắt buộc."));
    }
    if pin.len() < 4 {
        return Err(AppError::domain("PIN_TOO_SHORT", "PIN phải có ít nhất 4 chữ số."));
    }
    let hash = hash_pin(&pin)?;
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO users (hotel_id, name, pin_hash, role, active)
             VALUES (1, ?1, ?2, ?3, 1)",
            rusqlite::params![name, hash, role.as_str()],
        )
        .map_err(|e| match e {
            rusqlite::Error::SqliteFailure(_, Some(ref s))
                if s.contains("UNIQUE") || s.contains("unique") =>
            {
                AppError::domain("USER_EXISTS", "Tên đăng nhập đã tồn tại.")
            }
            other => AppError::Db(other),
        })?;
        let id = tx.last_insert_rowid();
        let u = tx.query_row(
            "SELECT id, name, role, active, created_at FROM users WHERE id = ?1",
            [id],
            map_user,
        )?;
        Ok(u)
    })
}

pub fn update_user(
    db: &Db,
    id: i64,
    name: String,
    role: Role,
    active: bool,
    new_pin: Option<String>,
) -> AppResult<User> {
    db.with_tx(|tx| {
        if let Some(pin) = new_pin {
            if pin.len() < 4 {
                return Err(AppError::domain("PIN_TOO_SHORT", "PIN phải có ít nhất 4 chữ số."));
            }
            let hash = hash_pin(&pin)?;
            tx.execute(
                "UPDATE users SET name=?1, role=?2, active=?3, pin_hash=?4 WHERE id=?5",
                rusqlite::params![name, role.as_str(), active as i64, hash, id],
            )?;
        } else {
            tx.execute(
                "UPDATE users SET name=?1, role=?2, active=?3 WHERE id=?4",
                rusqlite::params![name, role.as_str(), active as i64, id],
            )?;
        }
        let u = tx.query_row(
            "SELECT id, name, role, active, created_at FROM users WHERE id = ?1",
            [id],
            map_user,
        )?;
        Ok(u)
    })
}

// ---------- Sessions ----------

pub fn new_session_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex_encode(&bytes)
}

fn hex_encode(bytes: &[u8]) -> String {
    const HEX: &[u8] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0f) as usize] as char);
    }
    out
}

pub fn login(db: &Db, name: &str, pin: &str) -> AppResult<(User, String)> {
    db.with_tx(|tx| {
        let row: Option<(i64, String, String, bool)> = tx
            .query_row(
                "SELECT id, pin_hash, role, active FROM users WHERE name = ?1",
                [name],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get::<_, i64>(3)? != 0)),
            )
            .ok();
        let Some((user_id, hash, role_str, active)) = row else {
            return Err(AppError::domain("LOGIN_INVALID", "Sai tên đăng nhập hoặc PIN."));
        };
        if !active {
            return Err(AppError::domain("USER_INACTIVE", "Tài khoản đã bị khoá."));
        }
        if !verify_pin(pin, &hash) {
            return Err(AppError::domain("LOGIN_INVALID", "Sai tên đăng nhập hoặc PIN."));
        }
        let token = new_session_token();
        let expires = (Utc::now() + Duration::days(SESSION_DAYS))
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();
        tx.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![token, user_id, expires],
        )?;
        let u = tx.query_row(
            "SELECT id, name, role, active, created_at FROM users WHERE id = ?1",
            [user_id],
            map_user,
        )?;
        // Keep role_str to silence warning; used above indirectly.
        let _ = role_str;
        Ok((u, token))
    })
}

pub fn logout(db: &Db, token: &str) -> AppResult<()> {
    db.with(|conn| {
        conn.execute("DELETE FROM sessions WHERE token = ?1", [token])?;
        Ok(())
    })
}

pub fn user_for_token(db: &Db, token: &str) -> AppResult<User> {
    db.with(|conn| {
        // Purge expired sessions lazily.
        let _ = conn.execute(
            "DELETE FROM sessions WHERE expires_at < datetime('now')",
            [],
        );
        conn.query_row(
            "SELECT u.id, u.name, u.role, u.active, u.created_at
             FROM sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token = ?1 AND u.active = 1",
            [token],
            map_user,
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::Unauthorized,
            other => AppError::Db(other),
        })
    })
}

// ---------- Axum extractors & cookie helpers ----------

pub fn session_cookie(token: String) -> Cookie<'static> {
    let mut c = Cookie::new(SESSION_COOKIE, token);
    c.set_http_only(true);
    c.set_same_site(SameSite::Lax);
    c.set_path("/");
    c.set_max_age(time::Duration::days(SESSION_DAYS));
    c
}

pub fn clear_session_cookie() -> Cookie<'static> {
    let mut c = Cookie::new(SESSION_COOKIE, "");
    c.set_path("/");
    c.set_max_age(time::Duration::ZERO);
    c
}

/// Axum extractor: require a logged-in user.
pub struct AuthUser(pub User);

#[async_trait]
impl<S: Send + Sync> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        let jar = CookieJar::from_headers(&parts.headers);
        let token = jar
            .get(SESSION_COOKIE)
            .map(|c| c.value().to_string())
            .ok_or_else(|| AppError::Unauthorized.into_response())?;

        let db = app_state.db.clone();
        let user = tokio::task::spawn_blocking(move || user_for_token(&db, &token))
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "task").into_response())?
            .map_err(IntoResponse::into_response)?;
        Ok(AuthUser(user))
    }
}

/// Extractor requiring Manager role or higher.
pub struct RequireManager(pub User);
#[async_trait]
impl<S: Send + Sync> FromRequestParts<S> for RequireManager
where
    AppState: FromRef<S>,
{
    type Rejection = Response;
    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let AuthUser(u) = AuthUser::from_request_parts(parts, state).await?;
        if u.role.rank() < Role::Manager.rank() {
            return Err(AppError::Forbidden.into_response());
        }
        Ok(RequireManager(u))
    }
}

/// Extractor requiring Director role.
pub struct RequireDirector(pub User);
#[async_trait]
impl<S: Send + Sync> FromRequestParts<S> for RequireDirector
where
    AppState: FromRef<S>,
{
    type Rejection = Response;
    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let AuthUser(u) = AuthUser::from_request_parts(parts, state).await?;
        if u.role.rank() < Role::Director.rank() {
            return Err(AppError::Forbidden.into_response());
        }
        Ok(RequireDirector(u))
    }
}

// Used by handlers that need the AppState indirect.
pub fn _use_state(_: State<AppState>) {}
