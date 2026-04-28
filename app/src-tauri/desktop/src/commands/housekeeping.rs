use crate::db::Db;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomState {
    pub room_id: i64,
    pub room_number: String,
    pub room_type: String,
    pub state: String, // clean | dirty | inspected | out_of_service | maintenance
    pub notes: String,
    pub updated_at: String,
    pub updated_by: Option<i64>,
    pub updated_by_name: Option<String>,
    pub occupant_guest_name: Option<String>,
    pub reservation_id: Option<i64>,
    pub check_out: Option<String>,
}

pub fn list_room_states(db: &Db) -> AppResult<Vec<RoomState>> {
    db.with(|conn| {
        // Ensure every room has a row in room_states.
        conn.execute(
            "INSERT OR IGNORE INTO room_states (room_id, state)
             SELECT id, 'clean' FROM rooms WHERE active = 1",
            [],
        )?;

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        let mut stmt = conn.prepare(
            "SELECT r.id, r.room_number, r.room_type,
                    COALESCE(rs.state, 'clean') AS state,
                    COALESCE(rs.notes, '') AS notes,
                    COALESCE(rs.updated_at, r.room_number) AS updated_at,
                    rs.updated_by,
                    u.name AS updated_by_name,
                    (SELECT g.name FROM reservations res
                        JOIN guests g ON g.id = res.guest_id
                        WHERE res.room_id = r.id
                          AND res.status = 'checked_in'
                        LIMIT 1) AS occupant_guest_name,
                    (SELECT res.id FROM reservations res
                        WHERE res.room_id = r.id
                          AND res.status = 'checked_in'
                        LIMIT 1) AS reservation_id,
                    (SELECT res.check_out FROM reservations res
                        WHERE res.room_id = r.id
                          AND res.status = 'checked_in'
                        LIMIT 1) AS check_out
             FROM rooms r
             LEFT JOIN room_states rs ON rs.room_id = r.id
             LEFT JOIN users u ON u.id = rs.updated_by
             WHERE r.active = 1
             ORDER BY r.room_number",
        )?;
        let _ = today;
        let rows = stmt
            .query_map([], |r| {
                Ok(RoomState {
                    room_id: r.get(0)?,
                    room_number: r.get(1)?,
                    room_type: r.get(2)?,
                    state: r.get(3)?,
                    notes: r.get(4)?,
                    updated_at: r.get(5)?,
                    updated_by: r.get(6)?,
                    updated_by_name: r.get(7)?,
                    occupant_guest_name: r.get(8)?,
                    reservation_id: r.get(9)?,
                    check_out: r.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn set_room_state(
    db: &Db,
    room_id: i64,
    state: String,
    notes: String,
    user_id: i64,
) -> AppResult<RoomState> {
    if !matches!(
        state.as_str(),
        "clean" | "dirty" | "inspected" | "out_of_service" | "maintenance"
    ) {
        return Err(AppError::domain("STATE_INVALID", "Trạng thái phòng không hợp lệ."));
    }
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO room_states (room_id, state, notes, updated_at, updated_by)
             VALUES (?1, ?2, ?3, datetime('now'), ?4)
             ON CONFLICT(room_id) DO UPDATE SET
                state = excluded.state,
                notes = excluded.notes,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by",
            rusqlite::params![room_id, state, notes, user_id],
        )?;
        tx.execute(
            "INSERT INTO housekeeping_events (room_id, state, user_id, notes)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![room_id, state, user_id, notes],
        )?;
        Ok(())
    })?;

    // Re-list to return the joined row with display fields.
    let all = list_room_states(db)?;
    all.into_iter()
        .find(|r| r.room_id == room_id)
        .ok_or_else(|| AppError::NotFound(format!("room {}", room_id)))
}

#[derive(Debug, Serialize)]
pub struct HousekeepingEvent {
    pub id: i64,
    pub room_id: i64,
    pub room_number: String,
    pub state: String,
    pub user_name: Option<String>,
    pub notes: String,
    pub created_at: String,
}

pub fn list_events(db: &Db, limit: i64) -> AppResult<Vec<HousekeepingEvent>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT e.id, e.room_id, r.room_number, e.state, u.name, e.notes, e.created_at
             FROM housekeeping_events e
             JOIN rooms r ON r.id = e.room_id
             LEFT JOIN users u ON u.id = e.user_id
             ORDER BY e.created_at DESC LIMIT ?1",
        )?;
        let rows = stmt
            .query_map([limit], |r| {
                Ok(HousekeepingEvent {
                    id: r.get(0)?,
                    room_id: r.get(1)?,
                    room_number: r.get(2)?,
                    state: r.get(3)?,
                    user_name: r.get(4)?,
                    notes: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

/// On check-out, auto-mark room dirty. Called from reservations::check_out.
pub fn auto_mark_dirty_on_checkout(tx: &rusqlite::Transaction, room_id: i64) -> AppResult<()> {
    tx.execute(
        "INSERT INTO room_states (room_id, state, notes, updated_at)
         VALUES (?1, 'dirty', 'Khách trả phòng', datetime('now'))
         ON CONFLICT(room_id) DO UPDATE SET
            state = 'dirty', notes = 'Khách trả phòng', updated_at = datetime('now')",
        [room_id],
    )?;
    tx.execute(
        "INSERT INTO housekeeping_events (room_id, state, notes)
         VALUES (?1, 'dirty', 'Tự động: khách trả phòng')",
        [room_id],
    )?;
    Ok(())
}
