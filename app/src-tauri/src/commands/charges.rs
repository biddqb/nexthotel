use crate::db::Db;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReservationCharge {
    pub id: i64,
    pub reservation_id: i64,
    pub category: String,
    pub description: String,
    pub amount: i64,
    pub created_by: Option<i64>,
    pub created_by_name: Option<String>,
    pub created_at: String,
}

fn map_charge(r: &rusqlite::Row<'_>) -> rusqlite::Result<ReservationCharge> {
    Ok(ReservationCharge {
        id: r.get(0)?,
        reservation_id: r.get(1)?,
        category: r.get(2)?,
        description: r.get(3)?,
        amount: r.get(4)?,
        created_by: r.get(5)?,
        created_by_name: r.get(6)?,
        created_at: r.get(7)?,
    })
}

pub fn list_charges_for_reservation(
    db: &Db,
    reservation_id: i64,
) -> AppResult<Vec<ReservationCharge>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT c.id, c.reservation_id, c.category, c.description, c.amount,
                    c.created_by, u.name, c.created_at
             FROM reservation_charges c
             LEFT JOIN users u ON u.id = c.created_by
             WHERE c.reservation_id = ?1
             ORDER BY c.created_at",
        )?;
        let rows = stmt
            .query_map([reservation_id], map_charge)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn create_charge(
    db: &Db,
    reservation_id: i64,
    category: String,
    description: String,
    amount: i64,
    user_id: i64,
) -> AppResult<ReservationCharge> {
    if amount <= 0 {
        return Err(AppError::domain("AMOUNT_POSITIVE", "Số tiền phải lớn hơn 0."));
    }
    if !matches!(
        category.as_str(),
        "minibar" | "laundry" | "food" | "service" | "other"
    ) {
        return Err(AppError::domain("CATEGORY_INVALID", "Loại dịch vụ không hợp lệ."));
    }
    if description.trim().is_empty() {
        return Err(AppError::domain("DESCRIPTION_REQUIRED", "Mô tả là bắt buộc."));
    }
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO reservation_charges
                (hotel_id, reservation_id, category, description, amount, created_by)
             VALUES (1, ?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![reservation_id, category, description, amount, user_id],
        )?;
        let id = tx.last_insert_rowid();

        // Recompute payment_status since total folio (room + charges) changed.
        recompute_payment_status(tx, reservation_id)?;

        let c = tx.query_row(
            "SELECT c.id, c.reservation_id, c.category, c.description, c.amount,
                    c.created_by, u.name, c.created_at
             FROM reservation_charges c
             LEFT JOIN users u ON u.id = c.created_by
             WHERE c.id = ?1",
            [id],
            map_charge,
        )?;
        Ok(c)
    })
}

pub fn delete_charge(db: &Db, id: i64) -> AppResult<()> {
    db.with_tx(|tx| {
        let reservation_id: i64 = tx.query_row(
            "SELECT reservation_id FROM reservation_charges WHERE id = ?1",
            [id],
            |r| r.get(0),
        )?;
        tx.execute("DELETE FROM reservation_charges WHERE id = ?1", [id])?;
        recompute_payment_status(tx, reservation_id)?;
        Ok(())
    })
}

/// Folio total = reservation.total + sum(charges). payment_status derived from payments vs folio.
fn recompute_payment_status(tx: &rusqlite::Transaction, reservation_id: i64) -> AppResult<()> {
    let (base_total, charges, paid): (i64, i64, i64) = tx.query_row(
        "SELECT r.total,
                COALESCE((SELECT SUM(amount) FROM reservation_charges WHERE reservation_id = r.id), 0),
                COALESCE((SELECT SUM(amount) FROM payments WHERE reservation_id = r.id), 0)
         FROM reservations r WHERE r.id = ?1",
        [reservation_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;
    let folio_total = base_total + charges;
    let status = if paid == 0 {
        "unpaid"
    } else if paid >= folio_total {
        "paid"
    } else {
        "deposit_paid"
    };
    tx.execute(
        "UPDATE reservations SET payment_status = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![status, reservation_id],
    )?;
    Ok(())
}
