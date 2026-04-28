use crate::db::Db;
use crate::error::{AppError, AppResult};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Shift {
    pub id: i64,
    pub user_id: i64,
    pub user_name: String,
    pub clock_in: String,
    pub clock_out: Option<String>,
    pub handover_notes: String,
}

fn map_shift(r: &rusqlite::Row<'_>) -> rusqlite::Result<Shift> {
    Ok(Shift {
        id: r.get(0)?,
        user_id: r.get(1)?,
        user_name: r.get(2)?,
        clock_in: r.get(3)?,
        clock_out: r.get(4)?,
        handover_notes: r.get(5)?,
    })
}

pub fn active_shift_for_user(db: &Db, user_id: i64) -> AppResult<Option<Shift>> {
    db.with(|conn| {
        let row = conn
            .query_row(
                "SELECT s.id, s.user_id, u.name, s.clock_in, s.clock_out, s.handover_notes
                 FROM shifts s JOIN users u ON u.id = s.user_id
                 WHERE s.user_id = ?1 AND s.clock_out IS NULL
                 ORDER BY s.clock_in DESC LIMIT 1",
                [user_id],
                map_shift,
            )
            .ok();
        Ok(row)
    })
}

pub fn clock_in(db: &Db, user_id: i64) -> AppResult<Shift> {
    db.with_tx(|tx| {
        let has_open: i64 = tx.query_row(
            "SELECT COUNT(*) FROM shifts WHERE user_id = ?1 AND clock_out IS NULL",
            [user_id],
            |r| r.get(0),
        )?;
        if has_open > 0 {
            return Err(AppError::domain(
                "SHIFT_OPEN",
                "Bạn đang có ca đang mở. Hãy kết thúc ca trước.",
            ));
        }
        tx.execute("INSERT INTO shifts (user_id) VALUES (?1)", [user_id])?;
        let id = tx.last_insert_rowid();
        let s = tx.query_row(
            "SELECT s.id, s.user_id, u.name, s.clock_in, s.clock_out, s.handover_notes
             FROM shifts s JOIN users u ON u.id = s.user_id WHERE s.id = ?1",
            [id],
            map_shift,
        )?;
        Ok(s)
    })
}

pub fn clock_out(db: &Db, user_id: i64, handover_notes: String) -> AppResult<Shift> {
    db.with_tx(|tx| {
        let shift_id: i64 = tx
            .query_row(
                "SELECT id FROM shifts WHERE user_id = ?1 AND clock_out IS NULL
                 ORDER BY clock_in DESC LIMIT 1",
                [user_id],
                |r| r.get(0),
            )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    AppError::domain("SHIFT_NONE", "Bạn không có ca đang mở.")
                }
                other => AppError::Db(other),
            })?;
        tx.execute(
            "UPDATE shifts SET clock_out = datetime('now'), handover_notes = ?1 WHERE id = ?2",
            rusqlite::params![handover_notes, shift_id],
        )?;
        let s = tx.query_row(
            "SELECT s.id, s.user_id, u.name, s.clock_in, s.clock_out, s.handover_notes
             FROM shifts s JOIN users u ON u.id = s.user_id WHERE s.id = ?1",
            [shift_id],
            map_shift,
        )?;
        Ok(s)
    })
}

pub fn list_shifts(db: &Db, from: Option<String>, to: Option<String>) -> AppResult<Vec<Shift>> {
    db.with(|conn| {
        let (sql, params): (String, Vec<String>) = match (from, to) {
            (Some(f), Some(t)) => (
                "SELECT s.id, s.user_id, u.name, s.clock_in, s.clock_out, s.handover_notes
                 FROM shifts s JOIN users u ON u.id = s.user_id
                 WHERE s.clock_in >= ?1 AND s.clock_in < ?2
                 ORDER BY s.clock_in DESC"
                    .to_string(),
                vec![f, t],
            ),
            _ => (
                "SELECT s.id, s.user_id, u.name, s.clock_in, s.clock_out, s.handover_notes
                 FROM shifts s JOIN users u ON u.id = s.user_id
                 ORDER BY s.clock_in DESC LIMIT 100"
                    .to_string(),
                vec![],
            ),
        };
        let mut stmt = conn.prepare(&sql)?;
        let rows = if params.is_empty() {
            stmt.query_map([], map_shift)?.collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map(rusqlite::params_from_iter(params), map_shift)?
                .collect::<Result<Vec<_>, _>>()?
        };
        Ok(rows)
    })
}
