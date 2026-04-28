use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::{Reservation, ReservationWithDetails};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

// ---------- Date helpers ----------

pub fn parse_date(s: &str) -> AppResult<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .map_err(|_| AppError::domain("DATE_FORMAT", format!("Ngày không hợp lệ: {}", s)))
}

pub fn count_nights(check_in: &str, check_out: &str) -> AppResult<i64> {
    let ci = parse_date(check_in)?;
    let co = parse_date(check_out)?;
    Ok((co - ci).num_days())
}

pub fn add_days(date: &str, days: i64) -> AppResult<String> {
    let d = parse_date(date)?;
    let new = d + chrono::Duration::days(days);
    Ok(new.format("%Y-%m-%d").to_string())
}

// ---------- Conflict detection (app-level) ----------

#[derive(Debug, Serialize)]
pub struct ConflictInfo {
    pub reservation_id: i64,
    pub guest_name: String,
    pub check_in: String,
    pub check_out: String,
}

fn check_overlap(
    tx: &rusqlite::Transaction,
    room_id: i64,
    check_in: &str,
    check_out: &str,
    ignore_id: Option<i64>,
) -> AppResult<Option<ConflictInfo>> {
    let ignore = ignore_id.unwrap_or(0);
    let row: Option<ConflictInfo> = tx
        .query_row(
            "SELECT r.id, g.name, r.check_in, r.check_out
             FROM reservations r
             JOIN guests g ON g.id = r.guest_id
             WHERE r.room_id = ?1
               AND r.status NOT IN ('cancelled','no_show')
               AND r.id != ?2
               AND NOT (r.check_out <= ?3 OR r.check_in >= ?4)
             ORDER BY r.check_in LIMIT 1",
            rusqlite::params![room_id, ignore, check_in, check_out],
            |r| {
                Ok(ConflictInfo {
                    reservation_id: r.get(0)?,
                    guest_name: r.get(1)?,
                    check_in: r.get(2)?,
                    check_out: r.get(3)?,
                })
            },
        )
        .ok();
    Ok(row)
}

// ---------- Mapping ----------

fn map_reservation(r: &rusqlite::Row<'_>) -> rusqlite::Result<Reservation> {
    Ok(Reservation {
        id: r.get(0)?,
        hotel_id: r.get(1)?,
        room_id: r.get(2)?,
        guest_id: r.get(3)?,
        check_in: r.get(4)?,
        check_out: r.get(5)?,
        status: r.get(6)?,
        payment_status: r.get(7)?,
        rate: r.get(8)?,
        total: r.get(9)?,
        deposit: r.get(10)?,
        notes: r.get(11)?,
        created_at: r.get(12)?,
        updated_at: r.get(13)?,
    })
}

fn map_reservation_with_details(
    r: &rusqlite::Row<'_>,
) -> rusqlite::Result<ReservationWithDetails> {
    let reservation = Reservation {
        id: r.get(0)?,
        hotel_id: r.get(1)?,
        room_id: r.get(2)?,
        guest_id: r.get(3)?,
        check_in: r.get(4)?,
        check_out: r.get(5)?,
        status: r.get(6)?,
        payment_status: r.get(7)?,
        rate: r.get(8)?,
        total: r.get(9)?,
        deposit: r.get(10)?,
        notes: r.get(11)?,
        created_at: r.get(12)?,
        updated_at: r.get(13)?,
    };
    let check_in = reservation.check_in.clone();
    let check_out = reservation.check_out.clone();
    Ok(ReservationWithDetails {
        reservation,
        guest_name: r.get(14)?,
        guest_phone: r.get(15)?,
        room_number: r.get(16)?,
        room_type: r.get(17)?,
        paid_amount: r.get::<_, Option<i64>>(18)?.unwrap_or(0),
        nights: count_nights(&check_in, &check_out).unwrap_or(0),
    })
}

const SELECT_WITH_DETAILS: &str = "
    SELECT r.id, r.hotel_id, r.room_id, r.guest_id, r.check_in, r.check_out,
           r.status, r.payment_status, r.rate, r.total, r.deposit, r.notes,
           r.created_at, r.updated_at,
           g.name, g.phone,
           rm.room_number, rm.room_type,
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE reservation_id = r.id)
    FROM reservations r
    JOIN guests g ON g.id = r.guest_id
    JOIN rooms rm ON rm.id = r.room_id
";

// ---------- Inputs ----------

#[derive(Debug, Deserialize)]
pub struct CreateReservationInput {
    pub room_id: i64,
    pub guest_id: i64,
    pub check_in: String,
    pub check_out: String,
    pub rate: Option<i64>,   // if None, auto-resolve from rate_plans
    pub deposit: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReservationInput {
    pub id: i64,
    pub room_id: i64,
    pub guest_id: i64,
    pub check_in: String,
    pub check_out: String,
    pub rate: i64,
    pub deposit: Option<i64>,
    pub notes: Option<String>,
}

// ---------- Commands ----------

pub fn create_reservation(
    db: &Db,
    input: CreateReservationInput,
) -> AppResult<ReservationWithDetails> {
    let nights = count_nights(&input.check_in, &input.check_out)?;
    if nights <= 0 {
        return Err(AppError::domain(
            "DATES_INVALID",
            "Ngày trả phòng phải sau ngày nhận phòng.",
        ));
    }

    db.with_tx(|tx| {
        // Overlap check (returns a rich conflict error to the UI).
        if let Some(conflict) =
            check_overlap(tx, input.room_id, &input.check_in, &input.check_out, None)?
        {
            return Err(AppError::domain(
                "ROOM_OVERLAP",
                format!(
                    "Phòng đã được đặt từ {} đến {} (khách: {}).",
                    conflict.check_in, conflict.check_out, conflict.guest_name
                ),
            ));
        }

        // Resolve rate if not provided.
        let room_type: String = tx.query_row(
            "SELECT room_type FROM rooms WHERE id = ?1",
            [input.room_id],
            |r| r.get(0),
        )?;

        let rate = if let Some(r) = input.rate {
            r
        } else {
            let mut total: i64 = 0;
            for i in 0..nights {
                let date = add_days(&input.check_in, i)?;
                total += crate::commands::rate_plans::resolve_rate(tx, &room_type, &date)?;
            }
            total / nights
        };

        let total = rate * nights;
        let deposit = input.deposit.unwrap_or(0);
        let notes = input.notes.unwrap_or_default();

        tx.execute(
            "INSERT INTO reservations
             (hotel_id, room_id, guest_id, check_in, check_out, status, payment_status,
              rate, total, deposit, notes)
             VALUES (1, ?1, ?2, ?3, ?4, 'confirmed',
                     CASE WHEN ?5 > 0 THEN 'deposit_paid' ELSE 'unpaid' END,
                     ?6, ?7, ?5, ?8)",
            rusqlite::params![
                input.room_id,
                input.guest_id,
                input.check_in,
                input.check_out,
                deposit,
                rate,
                total,
                notes
            ],
        )?;
        let id = tx.last_insert_rowid();

        // If deposit > 0, record a payment row too.
        if deposit > 0 {
            tx.execute(
                "INSERT INTO payments (hotel_id, reservation_id, amount, method, notes)
                 VALUES (1, ?1, ?2, 'cash', 'Đặt cọc')",
                rusqlite::params![id, deposit],
            )?;
        }

        tx.execute(
            "INSERT INTO audit_log (entity, entity_id, action, diff)
             VALUES ('reservation', ?1, 'create', '')",
            [id],
        )?;

        let r = tx.query_row(
            &format!("{} WHERE r.id = ?1", SELECT_WITH_DETAILS),
            [id],
            map_reservation_with_details,
        )?;
        Ok(r)
    })
}

pub fn update_reservation(
    db: &Db,
    input: UpdateReservationInput,
) -> AppResult<ReservationWithDetails> {
    let nights = count_nights(&input.check_in, &input.check_out)?;
    if nights <= 0 {
        return Err(AppError::domain(
            "DATES_INVALID",
            "Ngày trả phòng phải sau ngày nhận phòng.",
        ));
    }
    db.with_tx(|tx| {
        let current_status: String = tx.query_row(
            "SELECT status FROM reservations WHERE id = ?1",
            [input.id],
            |r| r.get(0),
        )?;
        if current_status == "checked_out" || current_status == "cancelled" {
            return Err(AppError::domain(
                "STATE_INVALID",
                "Không thể sửa đặt phòng đã trả/hủy.",
            ));
        }
        if let Some(conflict) = check_overlap(
            tx,
            input.room_id,
            &input.check_in,
            &input.check_out,
            Some(input.id),
        )? {
            return Err(AppError::domain(
                "ROOM_OVERLAP",
                format!(
                    "Phòng đã được đặt từ {} đến {} (khách: {}).",
                    conflict.check_in, conflict.check_out, conflict.guest_name
                ),
            ));
        }
        let total = input.rate * nights;
        let deposit = input.deposit.unwrap_or(0);
        let notes = input.notes.unwrap_or_default();
        tx.execute(
            "UPDATE reservations SET
                room_id=?1, guest_id=?2, check_in=?3, check_out=?4,
                rate=?5, total=?6, deposit=?7, notes=?8,
                updated_at=datetime('now')
             WHERE id=?9",
            rusqlite::params![
                input.room_id,
                input.guest_id,
                input.check_in,
                input.check_out,
                input.rate,
                total,
                deposit,
                notes,
                input.id
            ],
        )?;
        let r = tx.query_row(
            &format!("{} WHERE r.id = ?1", SELECT_WITH_DETAILS),
            [input.id],
            map_reservation_with_details,
        )?;
        Ok(r)
    })
}

pub fn cancel_reservation(db: &Db, id: i64) -> AppResult<Reservation> {
    db.with_tx(|tx| {
        let status: String = tx.query_row(
            "SELECT status FROM reservations WHERE id = ?1",
            [id],
            |r| r.get(0),
        )?;
        match status.as_str() {
            "confirmed" => {}
            "checked_in" => {
                return Err(AppError::domain(
                    "STATE_INVALID",
                    "Phải trả phòng trước khi huỷ.",
                ));
            }
            _ => {
                return Err(AppError::domain(
                    "STATE_INVALID",
                    format!("Không thể huỷ đặt phòng ở trạng thái: {}", status),
                ));
            }
        }
        tx.execute(
            "UPDATE reservations SET status='cancelled', updated_at=datetime('now') WHERE id=?1",
            [id],
        )?;
        tx.execute(
            "INSERT INTO audit_log (entity, entity_id, action) VALUES ('reservation', ?1, 'cancel')",
            [id],
        )?;
        let r = tx.query_row(
            "SELECT id, hotel_id, room_id, guest_id, check_in, check_out, status,
                    payment_status, rate, total, deposit, notes, created_at, updated_at
             FROM reservations WHERE id = ?1",
            [id],
            map_reservation,
        )?;
        Ok(r)
    })
}

pub fn check_in_reservation(db: &Db, id: i64) -> AppResult<Reservation> {
    db.with_tx(|tx| {
        let status: String = tx.query_row(
            "SELECT status FROM reservations WHERE id = ?1",
            [id],
            |r| r.get(0),
        )?;
        if status != "confirmed" {
            return Err(AppError::domain(
                "STATE_INVALID",
                "Chỉ có thể nhận phòng đã xác nhận.",
            ));
        }
        tx.execute(
            "UPDATE reservations SET status='checked_in', updated_at=datetime('now') WHERE id=?1",
            [id],
        )?;
        tx.execute(
            "INSERT INTO audit_log (entity, entity_id, action) VALUES ('reservation', ?1, 'check_in')",
            [id],
        )?;
        tx.query_row(
            "SELECT id, hotel_id, room_id, guest_id, check_in, check_out, status,
                    payment_status, rate, total, deposit, notes, created_at, updated_at
             FROM reservations WHERE id = ?1",
            [id],
            map_reservation,
        )
        .map_err(AppError::Db)
    })
}

pub fn check_out_reservation(db: &Db, id: i64) -> AppResult<Reservation> {
    db.with_tx(|tx| {
        let (status, room_id): (String, i64) = tx.query_row(
            "SELECT status, room_id FROM reservations WHERE id = ?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        if status != "checked_in" {
            return Err(AppError::domain(
                "STATE_INVALID",
                "Chỉ có thể trả phòng đã nhận.",
            ));
        }
        tx.execute(
            "UPDATE reservations SET status='checked_out', updated_at=datetime('now') WHERE id=?1",
            [id],
        )?;
        tx.execute(
            "INSERT INTO audit_log (entity, entity_id, action) VALUES ('reservation', ?1, 'check_out')",
            [id],
        )?;
        // Auto-mark room dirty for housekeeping.
        crate::commands::housekeeping::auto_mark_dirty_on_checkout(tx, room_id)?;
        tx.query_row(
            "SELECT id, hotel_id, room_id, guest_id, check_in, check_out, status,
                    payment_status, rate, total, deposit, notes, created_at, updated_at
             FROM reservations WHERE id = ?1",
            [id],
            map_reservation,
        )
        .map_err(AppError::Db)
    })
}

pub fn get_reservation(db: &Db, id: i64) -> AppResult<ReservationWithDetails> {
    db.with(|conn| {
        let sql = format!("{} WHERE r.id = ?1", SELECT_WITH_DETAILS);
        conn.query_row(&sql, [id], map_reservation_with_details)
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    AppError::NotFound(format!("reservation {}", id))
                }
                other => AppError::Db(other),
            })
    })
}

/// Reservations overlapping a date range [from, to).
/// Used by the calendar grid — fetches the whole month in one query.
pub fn list_reservations_in_range(
    db: &Db,
    from: String,
    to: String,
) -> AppResult<Vec<ReservationWithDetails>> {
    db.with(|conn| {
        let sql = format!(
            "{} WHERE NOT (r.check_out <= ?1 OR r.check_in >= ?2) ORDER BY r.check_in",
            SELECT_WITH_DETAILS
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt
            .query_map([from, to], map_reservation_with_details)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn list_arrivals_for_date(
    db: &Db,
    date: String,
) -> AppResult<Vec<ReservationWithDetails>> {
    db.with(|conn| {
        let sql = format!(
            "{} WHERE r.check_in = ?1 AND r.status IN ('confirmed','checked_in')
             ORDER BY rm.room_number",
            SELECT_WITH_DETAILS
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt
            .query_map([date], map_reservation_with_details)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn list_departures_for_date(
    db: &Db,
    date: String,
) -> AppResult<Vec<ReservationWithDetails>> {
    db.with(|conn| {
        let sql = format!(
            "{} WHERE r.check_out = ?1 AND r.status = 'checked_in' ORDER BY rm.room_number",
            SELECT_WITH_DETAILS
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt
            .query_map([date], map_reservation_with_details)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}
