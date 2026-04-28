use crate::auth::{
    clear_session_cookie, login, logout, session_cookie, AuthUser, RequireDirector, RequireManager,
};
use crate::commands;
use crate::error::{AppError, AppResult};
use crate::models::{AppConfig, Guest, Hotel, Payment, RatePlan, Reservation, ReservationWithDetails, Role, Room, User};
use crate::state::AppState;
use axum::{
    extract::{Path, Query, State},
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_extra::extract::cookie::CookieJar;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

// ---------- Blocking helper ----------

async fn blocking<F, T>(f: F) -> AppResult<T>
where
    F: FnOnce() -> AppResult<T> + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(f)
        .await
        .map_err(|_| AppError::Other("task join failed".into()))?
}

// ---------- Router ----------

pub fn assets_router() -> Router<AppState> {
    Router::new()
        .route("/", get(crate::assets::serve_root))
        .fallback(crate::assets::serve_path)
}

pub fn api_router() -> Router<AppState> {
    Router::new()
        // Auth (public)
        .route("/api/auth/login", post(auth_login))
        .route("/api/auth/logout", post(auth_logout))
        .route("/api/auth/me", get(auth_me))
        // Bootstrap (public — needed before any user exists)
        .route("/api/bootstrap/status", get(bootstrap_status))
        .route("/api/bootstrap/setup", post(bootstrap_setup))
        // Hotel
        .route("/api/hotel", get(h_get_hotel).put(h_upsert_hotel))
        // Rooms
        .route("/api/rooms", get(h_list_rooms).post(h_create_room))
        .route("/api/rooms/:id", put(h_update_room))
        .route("/api/rooms/bulk", post(h_bulk_create_rooms))
        .route("/api/room-types", get(h_list_room_types))
        // Guests
        .route("/api/guests", get(h_list_guests).post(h_create_guest))
        .route("/api/guests/:id", get(h_get_guest).put(h_update_guest))
        .route("/api/guests/:id/blacklist", put(h_set_blacklist))
        // Rate plans
        .route("/api/rate-plans", get(h_list_rate_plans).post(h_create_rate_plan))
        .route("/api/rate-plans/:id", delete(h_delete_rate_plan))
        .route("/api/rate-plans/quote", post(h_quote_rate))
        // Reservations
        .route("/api/reservations", post(h_create_reservation))
        .route("/api/reservations/range", get(h_list_range))
        .route("/api/reservations/arrivals", get(h_list_arrivals))
        .route("/api/reservations/departures", get(h_list_departures))
        .route("/api/reservations/:id", get(h_get_reservation).put(h_update_reservation))
        .route("/api/reservations/:id/cancel", post(h_cancel_reservation))
        .route("/api/reservations/:id/check-in", post(h_check_in))
        .route("/api/reservations/:id/check-out", post(h_check_out))
        // Payments
        .route("/api/reservations/:id/payments", get(h_list_payments).post(h_record_payment))
        .route("/api/payments/:id", delete(h_delete_payment))
        // Reports
        .route("/api/reports/occupancy", get(h_occupancy))
        .route("/api/reports/daily-revenue", get(h_daily_revenue))
        // Backup
        .route("/api/backup", post(h_create_backup).get(h_list_backups))
        .route("/api/backup/prune", post(h_prune_backups))
        // Settings
        .route("/api/config", get(h_get_config))
        .route("/api/detect-cloud-folders", get(h_detect_cloud_folders))
        .route("/api/config/complete-first-run", post(h_complete_first_run))
        // Users
        .route("/api/users", get(h_list_users).post(h_create_user))
        .route("/api/users/:id", put(h_update_user))
        // Housekeeping
        .route("/api/housekeeping/rooms", get(h_list_room_states))
        .route("/api/housekeeping/rooms/:id/state", put(h_set_room_state))
        .route("/api/housekeeping/events", get(h_list_hk_events))
        // Charges
        .route(
            "/api/reservations/:id/charges",
            get(h_list_charges).post(h_create_charge),
        )
        .route("/api/charges/:id", delete(h_delete_charge))
        // Expenses
        .route("/api/expenses", get(h_list_expenses).post(h_create_expense))
        .route("/api/expenses/:id", delete(h_delete_expense))
        .route("/api/expenses/summary", get(h_expense_summary))
        // Shifts
        .route("/api/shifts/active", get(h_active_shift))
        .route("/api/shifts/clock-in", post(h_clock_in))
        .route("/api/shifts/clock-out", post(h_clock_out))
        .route("/api/shifts", get(h_list_shifts))
        // Night audit
        .route("/api/night-audit/preview", get(h_preview_audit))
        .route("/api/night-audit", get(h_list_audits).post(h_run_audit))
        // Audit log
        .route("/api/audit-log", get(h_audit_log))
        // Updater (public)
        .route("/api/version", get(h_version))
        .route("/api/update/check", get(h_check_update))
        .route("/api/update/apply", post(h_apply_update))
}

// ---------- Auth ----------

#[derive(Deserialize)]
struct LoginInput {
    name: String,
    pin: String,
}

async fn auth_login(
    State(s): State<AppState>,
    jar: CookieJar,
    Json(input): Json<LoginInput>,
) -> Result<Response, AppError> {
    let db = s.db.clone();
    let (user, token) =
        blocking(move || login(&db, &input.name, &input.pin)).await?;
    let cookie = session_cookie(token);
    let jar = jar.add(cookie);
    Ok((jar, Json(user)).into_response())
}

async fn auth_logout(State(s): State<AppState>, jar: CookieJar) -> Result<Response, AppError> {
    if let Some(token) = jar.get("nexthotel_session").map(|c| c.value().to_string()) {
        let db = s.db.clone();
        let _ = blocking(move || logout(&db, &token)).await;
    }
    let jar = jar.add(clear_session_cookie());
    Ok((jar, Json(serde_json::json!({"ok": true}))).into_response())
}

async fn auth_me(AuthUser(u): AuthUser) -> Json<User> {
    Json(u)
}

// ---------- Bootstrap (no auth required) ----------

#[derive(Serialize)]
struct BootstrapStatus {
    needs_bootstrap: bool,
    has_hotel: bool,
    has_users: bool,
    first_run_complete: bool,
}

async fn bootstrap_status(State(s): State<AppState>) -> Result<Json<BootstrapStatus>, AppError> {
    let db = s.db.clone();
    let cfg = s.config.lock().map_err(|_| AppError::Other("lock".into()))?.clone();
    let (has_hotel, has_users) = blocking(move || {
        db.with(|conn| {
            let hh: i64 = conn.query_row("SELECT COUNT(*) FROM hotels", [], |r| r.get(0))?;
            let hu: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
            Ok((hh > 0, hu > 0))
        })
    })
    .await?;
    Ok(Json(BootstrapStatus {
        needs_bootstrap: !has_hotel || !has_users || !cfg.first_run_complete,
        has_hotel,
        has_users,
        first_run_complete: cfg.first_run_complete,
    }))
}

#[derive(Deserialize)]
struct BootstrapInput {
    hotel: BootstrapHotel,
    rooms: BootstrapRooms,
    admin: BootstrapAdmin,
}

#[derive(Deserialize)]
struct BootstrapHotel {
    name: String,
    address: String,
    tax_id: String,
    phone: String,
}

#[derive(Deserialize)]
struct BootstrapRooms {
    prefix: String,
    count: i64,
    starting_number: i64,
    base_rate: i64,
    single_count: Option<i64>, // if set, first N are single, rest are double
}

#[derive(Deserialize)]
struct BootstrapAdmin {
    name: String,
    pin: String,
}

async fn bootstrap_setup(
    State(s): State<AppState>,
    Json(input): Json<BootstrapInput>,
) -> Result<Json<User>, AppError> {
    let db = s.db.clone();
    let state = s.clone();
    let user = blocking(move || {
        // Check: only allow bootstrap if no users exist yet.
        let existing: i64 = db.with(|conn| {
            conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
                .map_err(AppError::Db)
        })?;
        if existing > 0 {
            return Err(AppError::Forbidden);
        }

        commands::hotel::upsert_hotel(
            &db,
            input.hotel.name,
            input.hotel.address,
            input.hotel.tax_id,
            input.hotel.phone,
        )?;

        let single_count = input.rooms.single_count.unwrap_or(input.rooms.count);
        let double_count = (input.rooms.count - single_count).max(0);
        if single_count > 0 {
            commands::rooms::bulk_create_rooms(
                &db,
                input.rooms.prefix.clone(),
                single_count,
                input.rooms.starting_number,
                "single".into(),
                input.rooms.base_rate,
            )?;
        }
        if double_count > 0 {
            commands::rooms::bulk_create_rooms(
                &db,
                input.rooms.prefix.clone(),
                double_count,
                input.rooms.starting_number + single_count,
                "double".into(),
                input.rooms.base_rate,
            )?;
        }

        let admin = crate::auth::create_user(
            &db,
            input.admin.name,
            input.admin.pin,
            Role::Director,
        )?;

        commands::settings::complete_first_run(&state)?;
        Ok(admin)
    })
    .await?;
    Ok(Json(user))
}

// ---------- Hotel ----------

async fn h_get_hotel(
    State(s): State<AppState>,
    _u: AuthUser,
) -> Result<Json<Option<Hotel>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::hotel::get_hotel(&db)).await.map(Json)
}

#[derive(Deserialize)]
struct UpsertHotelInput {
    name: String,
    address: String,
    tax_id: String,
    phone: String,
}

async fn h_upsert_hotel(
    State(s): State<AppState>,
    _u: RequireDirector,
    Json(i): Json<UpsertHotelInput>,
) -> Result<Json<Hotel>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::hotel::upsert_hotel(&db, i.name, i.address, i.tax_id, i.phone))
        .await
        .map(Json)
}

// ---------- Rooms ----------

async fn h_list_rooms(State(s): State<AppState>, _u: AuthUser) -> Result<Json<Vec<Room>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::rooms::list_rooms(&db)).await.map(Json)
}

async fn h_list_room_types(
    State(s): State<AppState>,
    _u: AuthUser,
) -> Result<Json<Vec<String>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::rooms::list_room_types(&db)).await.map(Json)
}

#[derive(Deserialize)]
struct CreateRoomInput {
    room_number: String,
    room_type: String,
    base_rate: i64,
}

async fn h_create_room(
    State(s): State<AppState>,
    _u: RequireManager,
    Json(i): Json<CreateRoomInput>,
) -> Result<Json<Room>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::rooms::create_room(&db, i.room_number, i.room_type, i.base_rate))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct UpdateRoomInput {
    room_number: String,
    room_type: String,
    base_rate: i64,
    active: bool,
}

async fn h_update_room(
    State(s): State<AppState>,
    _u: RequireManager,
    Path(id): Path<i64>,
    Json(i): Json<UpdateRoomInput>,
) -> Result<Json<Room>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::rooms::update_room(&db, id, i.room_number, i.room_type, i.base_rate, i.active)
    })
    .await
    .map(Json)
}

#[derive(Deserialize)]
struct BulkRoomsInput {
    prefix: String,
    count: i64,
    starting_number: i64,
    room_type: String,
    base_rate: i64,
}

async fn h_bulk_create_rooms(
    State(s): State<AppState>,
    _u: RequireManager,
    Json(i): Json<BulkRoomsInput>,
) -> Result<Json<Vec<Room>>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::rooms::bulk_create_rooms(
            &db,
            i.prefix,
            i.count,
            i.starting_number,
            i.room_type,
            i.base_rate,
        )
    })
    .await
    .map(Json)
}

// ---------- Guests ----------

#[derive(Deserialize)]
struct ListGuestsQuery {
    q: Option<String>,
}

async fn h_list_guests(
    State(s): State<AppState>,
    _u: AuthUser,
    Query(q): Query<ListGuestsQuery>,
) -> Result<Json<Vec<Guest>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::guests::list_guests(&db, q.q)).await.map(Json)
}

async fn h_get_guest(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Guest>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::guests::get_guest(&db, id)).await.map(Json)
}

#[derive(Deserialize)]
struct CreateGuestInput {
    name: String,
    phone: String,
    id_number: String,
    nationality: Option<String>,
    notes: Option<String>,
}

async fn h_create_guest(
    State(s): State<AppState>,
    _u: AuthUser,
    Json(i): Json<CreateGuestInput>,
) -> Result<Json<Guest>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::guests::create_guest(&db, i.name, i.phone, i.id_number, i.nationality, i.notes)
    })
    .await
    .map(Json)
}

#[derive(Deserialize)]
struct UpdateGuestInput {
    name: String,
    phone: String,
    id_number: String,
    nationality: String,
    notes: String,
}

async fn h_update_guest(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(id): Path<i64>,
    Json(i): Json<UpdateGuestInput>,
) -> Result<Json<Guest>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::guests::update_guest(&db, id, i.name, i.phone, i.id_number, i.nationality, i.notes)
    })
    .await
    .map(Json)
}

#[derive(Deserialize)]
struct BlacklistInput {
    is_blacklisted: bool,
    reason: String,
}

async fn h_set_blacklist(
    State(s): State<AppState>,
    _u: RequireManager,
    Path(id): Path<i64>,
    Json(i): Json<BlacklistInput>,
) -> Result<Json<Guest>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::guests::set_blacklist(&db, id, i.is_blacklisted, i.reason))
        .await
        .map(Json)
}

// ---------- Rate plans ----------

async fn h_list_rate_plans(
    State(s): State<AppState>,
    _u: AuthUser,
) -> Result<Json<Vec<RatePlan>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::rate_plans::list_rate_plans(&db)).await.map(Json)
}

#[derive(Deserialize)]
struct CreateRatePlanInput {
    name: String,
    starts_on: String,
    ends_on: String,
    applies_to_room_type: Option<String>,
    rate: i64,
    priority: Option<i64>,
}

async fn h_create_rate_plan(
    State(s): State<AppState>,
    _u: RequireManager,
    Json(i): Json<CreateRatePlanInput>,
) -> Result<Json<RatePlan>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::rate_plans::create_rate_plan(
            &db,
            i.name,
            i.starts_on,
            i.ends_on,
            i.applies_to_room_type,
            i.rate,
            i.priority,
        )
    })
    .await
    .map(Json)
}

async fn h_delete_rate_plan(
    State(s): State<AppState>,
    _u: RequireManager,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::rate_plans::delete_rate_plan(&db, id)).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

#[derive(Deserialize)]
struct QuoteRateInput {
    room_id: i64,
    check_in: String,
    check_out: String,
}

async fn h_quote_rate(
    State(s): State<AppState>,
    _u: AuthUser,
    Json(i): Json<QuoteRateInput>,
) -> Result<Json<i64>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::rate_plans::quote_rate(&db, i.room_id, i.check_in, i.check_out))
        .await
        .map(Json)
}

// ---------- Reservations ----------

async fn h_create_reservation(
    State(s): State<AppState>,
    _u: AuthUser,
    Json(i): Json<commands::reservations::CreateReservationInput>,
) -> Result<Json<ReservationWithDetails>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::create_reservation(&db, i))
        .await
        .map(Json)
}

async fn h_update_reservation(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(id): Path<i64>,
    Json(mut i): Json<commands::reservations::UpdateReservationInput>,
) -> Result<Json<ReservationWithDetails>, AppError> {
    i.id = id;
    let db = s.db.clone();
    blocking(move || commands::reservations::update_reservation(&db, i))
        .await
        .map(Json)
}

async fn h_cancel_reservation(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Reservation>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::cancel_reservation(&db, id))
        .await
        .map(Json)
}

async fn h_check_in(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Reservation>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::check_in_reservation(&db, id))
        .await
        .map(Json)
}

async fn h_check_out(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<Reservation>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::check_out_reservation(&db, id))
        .await
        .map(Json)
}

async fn h_get_reservation(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<ReservationWithDetails>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::get_reservation(&db, id))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct RangeQuery {
    from: String,
    to: String,
}

async fn h_list_range(
    State(s): State<AppState>,
    _u: AuthUser,
    Query(q): Query<RangeQuery>,
) -> Result<Json<Vec<ReservationWithDetails>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::list_reservations_in_range(&db, q.from, q.to))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct DateQuery {
    date: String,
}

async fn h_list_arrivals(
    State(s): State<AppState>,
    _u: AuthUser,
    Query(q): Query<DateQuery>,
) -> Result<Json<Vec<ReservationWithDetails>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::list_arrivals_for_date(&db, q.date))
        .await
        .map(Json)
}

async fn h_list_departures(
    State(s): State<AppState>,
    _u: AuthUser,
    Query(q): Query<DateQuery>,
) -> Result<Json<Vec<ReservationWithDetails>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reservations::list_departures_for_date(&db, q.date))
        .await
        .map(Json)
}

// ---------- Payments ----------

async fn h_list_payments(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(reservation_id): Path<i64>,
) -> Result<Json<Vec<Payment>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::payments::list_payments_for_reservation(&db, reservation_id))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct RecordPaymentInput {
    amount: i64,
    method: String,
    notes: Option<String>,
}

async fn h_record_payment(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(reservation_id): Path<i64>,
    Json(i): Json<RecordPaymentInput>,
) -> Result<Json<Payment>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::payments::record_payment(&db, reservation_id, i.amount, i.method, i.notes)
    })
    .await
    .map(Json)
}

async fn h_delete_payment(
    State(s): State<AppState>,
    _u: RequireManager,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::payments::delete_payment(&db, id)).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

// ---------- Reports ----------

async fn h_occupancy(
    State(s): State<AppState>,
    _u: AuthUser,
    Query(q): Query<RangeQuery>,
) -> Result<Json<commands::reports::OccupancyReport>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reports::occupancy_report(&db, q.from, q.to))
        .await
        .map(Json)
}

async fn h_daily_revenue(
    State(s): State<AppState>,
    _u: AuthUser,
    Query(q): Query<RangeQuery>,
) -> Result<Json<Vec<commands::reports::DailyRevenue>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::reports::daily_revenue(&db, q.from, q.to))
        .await
        .map(Json)
}

// ---------- Backup ----------

async fn h_create_backup(
    State(s): State<AppState>,
    _u: RequireManager,
) -> Result<Json<commands::backup::BackupFile>, AppError> {
    let db = s.db.clone();
    let data_dir = commands::backup::data_dir_from_state(&s)?;
    blocking(move || commands::backup::create_backup(&db, &data_dir))
        .await
        .map(Json)
}

async fn h_list_backups(
    State(s): State<AppState>,
    _u: RequireManager,
) -> Result<Json<Vec<commands::backup::BackupFile>>, AppError> {
    let data_dir = commands::backup::data_dir_from_state(&s)?;
    blocking(move || commands::backup::list_backups(&data_dir))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct PruneInput {
    keep_days: Option<i64>,
}

async fn h_prune_backups(
    State(s): State<AppState>,
    _u: RequireManager,
    Json(i): Json<PruneInput>,
) -> Result<Json<i64>, AppError> {
    let data_dir = commands::backup::data_dir_from_state(&s)?;
    let keep = i.keep_days.unwrap_or(30);
    blocking(move || commands::backup::prune_backups(&data_dir, keep))
        .await
        .map(Json)
}

// ---------- Settings ----------

async fn h_get_config(
    State(s): State<AppState>,
) -> Result<Json<AppConfig>, AppError> {
    // No auth on this so the login page can check config. Returns only safe fields.
    let cfg = commands::settings::get_config(&s)?;
    Ok(Json(cfg))
}

async fn h_detect_cloud_folders(
    _u: RequireDirector,
) -> Result<Json<commands::settings::DetectedCloudFolders>, AppError> {
    commands::settings::detect_cloud_folders().map(Json)
}

async fn h_complete_first_run(
    State(s): State<AppState>,
    _u: RequireDirector,
) -> Result<Json<AppConfig>, AppError> {
    commands::settings::complete_first_run(&s).map(Json)
}

// ---------- Users ----------

async fn h_list_users(
    State(s): State<AppState>,
    _u: RequireDirector,
) -> Result<Json<Vec<User>>, AppError> {
    let db = s.db.clone();
    blocking(move || crate::auth::list_users(&db)).await.map(Json)
}

#[derive(Deserialize)]
struct CreateUserInput {
    name: String,
    pin: String,
    role: Role,
}

async fn h_create_user(
    State(s): State<AppState>,
    _u: RequireDirector,
    Json(i): Json<CreateUserInput>,
) -> Result<Json<User>, AppError> {
    let db = s.db.clone();
    blocking(move || crate::auth::create_user(&db, i.name, i.pin, i.role))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct UpdateUserInput {
    name: String,
    role: Role,
    active: bool,
    new_pin: Option<String>,
}

async fn h_update_user(
    State(s): State<AppState>,
    _u: RequireDirector,
    Path(id): Path<i64>,
    Json(i): Json<UpdateUserInput>,
) -> Result<Json<User>, AppError> {
    let db = s.db.clone();
    blocking(move || crate::auth::update_user(&db, id, i.name, i.role, i.active, i.new_pin))
        .await
        .map(Json)
}

// ---------- Housekeeping ----------

async fn h_list_room_states(
    State(s): State<AppState>,
    _u: AuthUser,
) -> Result<Json<Vec<commands::housekeeping::RoomState>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::housekeeping::list_room_states(&db))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct SetRoomStateInput {
    state: String,
    notes: Option<String>,
}

async fn h_set_room_state(
    State(s): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<i64>,
    Json(i): Json<SetRoomStateInput>,
) -> Result<Json<commands::housekeeping::RoomState>, AppError> {
    let db = s.db.clone();
    let notes = i.notes.unwrap_or_default();
    blocking(move || commands::housekeeping::set_room_state(&db, id, i.state, notes, user.id))
        .await
        .map(Json)
}

async fn h_list_hk_events(
    State(s): State<AppState>,
    _u: AuthUser,
) -> Result<Json<Vec<commands::housekeeping::HousekeepingEvent>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::housekeeping::list_events(&db, 200))
        .await
        .map(Json)
}

// ---------- Charges ----------

async fn h_list_charges(
    State(s): State<AppState>,
    _u: AuthUser,
    Path(reservation_id): Path<i64>,
) -> Result<Json<Vec<commands::charges::ReservationCharge>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::charges::list_charges_for_reservation(&db, reservation_id))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct CreateChargeInput {
    category: String,
    description: String,
    amount: i64,
}

async fn h_create_charge(
    State(s): State<AppState>,
    AuthUser(user): AuthUser,
    Path(reservation_id): Path<i64>,
    Json(i): Json<CreateChargeInput>,
) -> Result<Json<commands::charges::ReservationCharge>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::charges::create_charge(
            &db,
            reservation_id,
            i.category,
            i.description,
            i.amount,
            user.id,
        )
    })
    .await
    .map(Json)
}

async fn h_delete_charge(
    State(s): State<AppState>,
    _u: RequireManager,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::charges::delete_charge(&db, id)).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

// ---------- Expenses ----------

async fn h_list_expenses(
    State(s): State<AppState>,
    _u: RequireManager,
    Query(q): Query<ExpensesQuery>,
) -> Result<Json<Vec<commands::expenses::Expense>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::expenses::list_expenses(&db, q.from, q.to))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct ExpensesQuery {
    from: Option<String>,
    to: Option<String>,
}

#[derive(Deserialize)]
struct CreateExpenseInput {
    category: String,
    description: String,
    amount: i64,
    vendor: Option<String>,
    expense_date: String,
}

async fn h_create_expense(
    State(s): State<AppState>,
    AuthUser(user): AuthUser,
    Json(i): Json<CreateExpenseInput>,
) -> Result<Json<commands::expenses::Expense>, AppError> {
    let db = s.db.clone();
    blocking(move || {
        commands::expenses::create_expense(
            &db,
            i.category,
            i.description,
            i.amount,
            i.vendor.unwrap_or_default(),
            i.expense_date,
            user.id,
        )
    })
    .await
    .map(Json)
}

async fn h_delete_expense(
    State(s): State<AppState>,
    _u: RequireManager,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::expenses::delete_expense(&db, id)).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

async fn h_expense_summary(
    State(s): State<AppState>,
    _u: RequireManager,
    Query(q): Query<RangeQuery>,
) -> Result<Json<commands::expenses::ExpenseSummary>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::expenses::expense_summary(&db, q.from, q.to))
        .await
        .map(Json)
}

// ---------- Shifts ----------

async fn h_active_shift(
    State(s): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<Option<commands::shifts::Shift>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::shifts::active_shift_for_user(&db, user.id))
        .await
        .map(Json)
}

async fn h_clock_in(
    State(s): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<commands::shifts::Shift>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::shifts::clock_in(&db, user.id))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct ClockOutInput {
    handover_notes: Option<String>,
}

async fn h_clock_out(
    State(s): State<AppState>,
    AuthUser(user): AuthUser,
    Json(i): Json<ClockOutInput>,
) -> Result<Json<commands::shifts::Shift>, AppError> {
    let db = s.db.clone();
    let notes = i.handover_notes.unwrap_or_default();
    blocking(move || commands::shifts::clock_out(&db, user.id, notes))
        .await
        .map(Json)
}

async fn h_list_shifts(
    State(s): State<AppState>,
    _u: RequireManager,
    Query(q): Query<ExpensesQuery>,
) -> Result<Json<Vec<commands::shifts::Shift>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::shifts::list_shifts(&db, q.from, q.to))
        .await
        .map(Json)
}

// ---------- Night audit ----------

#[derive(Deserialize)]
struct PreviewAuditQuery {
    date: String,
}

async fn h_preview_audit(
    State(s): State<AppState>,
    _u: RequireManager,
    Query(q): Query<PreviewAuditQuery>,
) -> Result<Json<commands::night_audit::PreviewResult>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::night_audit::preview_audit(&db, &q.date))
        .await
        .map(Json)
}

#[derive(Deserialize)]
struct RunAuditInput {
    date: String,
    notes: Option<String>,
}

async fn h_run_audit(
    State(s): State<AppState>,
    RequireManager(user): RequireManager,
    Json(i): Json<RunAuditInput>,
) -> Result<Json<commands::night_audit::NightAudit>, AppError> {
    let db = s.db.clone();
    let notes = i.notes.unwrap_or_default();
    blocking(move || commands::night_audit::run_audit(&db, i.date, user.id, notes))
        .await
        .map(Json)
}

async fn h_list_audits(
    State(s): State<AppState>,
    _u: RequireManager,
) -> Result<Json<Vec<commands::night_audit::NightAudit>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::night_audit::list_audits(&db, 90))
        .await
        .map(Json)
}

// ---------- Audit log ----------

async fn h_audit_log(
    State(s): State<AppState>,
    _u: RequireDirector,
) -> Result<Json<Vec<commands::audit::AuditEntry>>, AppError> {
    let db = s.db.clone();
    blocking(move || commands::audit::list_audit_log(&db, 500))
        .await
        .map(Json)
}

// ---------- Updater ----------

async fn h_version() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "version": commands::updater::VERSION }))
}

async fn h_check_update() -> Result<Json<commands::updater::UpdateCheckResult>, AppError> {
    commands::updater::check_update().await.map(Json)
}

async fn h_apply_update(
    Json(manifest): Json<commands::updater::UpdateManifest>,
) -> Result<Json<serde_json::Value>, AppError> {
    commands::updater::apply_update(manifest).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ---------- unused placeholder to silence imports ----------
#[allow(dead_code)]
fn _use_arc(_: Arc<()>) {}
