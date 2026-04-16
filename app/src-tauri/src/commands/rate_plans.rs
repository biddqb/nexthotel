use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::RatePlan;

fn map_rp(r: &rusqlite::Row<'_>) -> rusqlite::Result<RatePlan> {
    Ok(RatePlan {
        id: r.get(0)?,
        hotel_id: r.get(1)?,
        name: r.get(2)?,
        starts_on: r.get(3)?,
        ends_on: r.get(4)?,
        applies_to_room_type: r.get(5)?,
        rate: r.get(6)?,
        priority: r.get(7)?,
    })
}

pub fn list_rate_plans(db: &Db) -> AppResult<Vec<RatePlan>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, hotel_id, name, starts_on, ends_on, applies_to_room_type, rate, priority
             FROM rate_plans WHERE hotel_id = 1 ORDER BY starts_on DESC",
        )?;
        let rows = stmt.query_map([], map_rp)?.collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn create_rate_plan(
    db: &Db,
    name: String,
    starts_on: String,
    ends_on: String,
    applies_to_room_type: Option<String>,
    rate: i64,
    priority: Option<i64>,
) -> AppResult<RatePlan> {
    if ends_on <= starts_on {
        return Err(AppError::domain(
            "RATE_PLAN_DATES",
            "Ngày kết thúc phải sau ngày bắt đầu.",
        ));
    }
    if rate <= 0 {
        return Err(AppError::domain("RATE_POSITIVE", "Giá phải lớn hơn 0."));
    }
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO rate_plans (hotel_id, name, starts_on, ends_on, applies_to_room_type, rate, priority)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![name, starts_on, ends_on, applies_to_room_type, rate, priority.unwrap_or(0)],
        )?;
        let id = tx.last_insert_rowid();
        let rp = tx.query_row(
            "SELECT id, hotel_id, name, starts_on, ends_on, applies_to_room_type, rate, priority
             FROM rate_plans WHERE id = ?1",
            [id],
            map_rp,
        )?;
        Ok(rp)
    })
}

pub fn delete_rate_plan(db: &Db, id: i64) -> AppResult<()> {
    db.with_tx(|tx| {
        tx.execute("DELETE FROM rate_plans WHERE id=?1", [id])?;
        Ok(())
    })
}

/// Resolve the effective rate for a room on a given date.
/// Priority: rate_plans matching date + room_type (highest priority wins),
/// then rate_plans matching date (no room_type filter), then room.base_rate.
pub fn resolve_rate(
    tx: &rusqlite::Transaction,
    room_type: &str,
    date: &str,
) -> AppResult<i64> {
    // Highest-priority matching plan for the room type on the date.
    // COLLATE NOCASE so 'VIP' and 'vip' match. TRIM guards against stray spaces.
    let plan_rate: Option<i64> = tx
        .query_row(
            "SELECT rate FROM rate_plans
             WHERE hotel_id = 1
               AND ?1 >= starts_on AND ?1 < ends_on
               AND (applies_to_room_type IS NULL
                    OR TRIM(applies_to_room_type) = TRIM(?2) COLLATE NOCASE)
             ORDER BY (applies_to_room_type IS NOT NULL) DESC, priority DESC, id DESC
             LIMIT 1",
            rusqlite::params![date, room_type],
            |r| r.get(0),
        )
        .ok();
    if let Some(r) = plan_rate {
        return Ok(r);
    }
    // Fallback to room base_rate.
    let base: i64 = tx.query_row(
        "SELECT base_rate FROM rooms WHERE room_type = ?1 AND hotel_id = 1 LIMIT 1",
        [room_type],
        |r| r.get(0),
    )?;
    Ok(base)
}

pub fn quote_rate(
    db: &Db,
    room_id: i64,
    check_in: String,
    check_out: String,
) -> AppResult<i64> {
    // Average nightly rate over the stay.
    db.with_tx(|tx| {
        let room_type: String = tx.query_row(
            "SELECT room_type FROM rooms WHERE id = ?1",
            [room_id],
            |r| r.get(0),
        )?;
        let nights = crate::commands::reservations::count_nights(&check_in, &check_out)?;
        if nights <= 0 {
            return Err(AppError::domain(
                "DATES_INVALID",
                "Ngày trả phòng phải sau ngày nhận phòng.",
            ));
        }
        let mut total: i64 = 0;
        for i in 0..nights {
            let date = crate::commands::reservations::add_days(&check_in, i)?;
            total += resolve_rate(tx, &room_type, &date)?;
        }
        Ok(total / nights) // average per-night
    })
}
