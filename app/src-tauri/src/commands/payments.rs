use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::Payment;

fn map_payment(r: &rusqlite::Row<'_>) -> rusqlite::Result<Payment> {
    Ok(Payment {
        id: r.get(0)?,
        hotel_id: r.get(1)?,
        reservation_id: r.get(2)?,
        amount: r.get(3)?,
        method: r.get(4)?,
        paid_at: r.get(5)?,
        notes: r.get(6)?,
    })
}

pub fn list_payments_for_reservation(
    db: &Db,
    reservation_id: i64,
) -> AppResult<Vec<Payment>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, hotel_id, reservation_id, amount, method, paid_at, notes
             FROM payments WHERE reservation_id = ?1 ORDER BY paid_at",
        )?;
        let rows = stmt
            .query_map([reservation_id], map_payment)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn record_payment(
    db: &Db,
    reservation_id: i64,
    amount: i64,
    method: String,
    notes: Option<String>,
) -> AppResult<Payment> {
    if amount <= 0 {
        return Err(AppError::domain("AMOUNT_POSITIVE", "Số tiền phải lớn hơn 0."));
    }
    if !matches!(method.as_str(), "cash" | "bank" | "card" | "other") {
        return Err(AppError::domain(
            "METHOD_INVALID",
            "Phương thức thanh toán không hợp lệ.",
        ));
    }

    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO payments (hotel_id, reservation_id, amount, method, notes)
             VALUES (1, ?1, ?2, ?3, ?4)",
            rusqlite::params![reservation_id, amount, method, notes.unwrap_or_default()],
        )?;
        let id = tx.last_insert_rowid();

        // Recompute payment_status from sum(payments) vs total.
        let (total, paid): (i64, i64) = tx.query_row(
            "SELECT r.total, COALESCE(SUM(p.amount), 0)
             FROM reservations r LEFT JOIN payments p ON p.reservation_id = r.id
             WHERE r.id = ?1",
            [reservation_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        let new_status = if paid == 0 {
            "unpaid"
        } else if paid >= total {
            "paid"
        } else {
            "deposit_paid"
        };
        tx.execute(
            "UPDATE reservations SET payment_status=?1, updated_at=datetime('now') WHERE id=?2",
            rusqlite::params![new_status, reservation_id],
        )?;

        let p = tx.query_row(
            "SELECT id, hotel_id, reservation_id, amount, method, paid_at, notes
             FROM payments WHERE id = ?1",
            [id],
            map_payment,
        )?;
        Ok(p)
    })
}

pub fn delete_payment(db: &Db, id: i64) -> AppResult<()> {
    db.with_tx(|tx| {
        let reservation_id: i64 = tx.query_row(
            "SELECT reservation_id FROM payments WHERE id = ?1",
            [id],
            |r| r.get(0),
        )?;
        tx.execute("DELETE FROM payments WHERE id = ?1", [id])?;
        let (total, paid): (i64, i64) = tx.query_row(
            "SELECT r.total, COALESCE(SUM(p.amount), 0)
             FROM reservations r LEFT JOIN payments p ON p.reservation_id = r.id
             WHERE r.id = ?1",
            [reservation_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        let new_status = if paid == 0 {
            "unpaid"
        } else if paid >= total {
            "paid"
        } else {
            "deposit_paid"
        };
        tx.execute(
            "UPDATE reservations SET payment_status=?1, updated_at=datetime('now') WHERE id=?2",
            rusqlite::params![new_status, reservation_id],
        )?;
        Ok(())
    })
}
