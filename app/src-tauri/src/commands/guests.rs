use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::Guest;

const SELECT_COLS: &str =
    "id, hotel_id, name, phone, id_number, nationality, notes, is_blacklisted, blacklist_reason, created_at";

fn map_guest(r: &rusqlite::Row<'_>) -> rusqlite::Result<Guest> {
    Ok(Guest {
        id: r.get(0)?,
        hotel_id: r.get(1)?,
        name: r.get(2)?,
        phone: r.get(3)?,
        id_number: r.get(4)?,
        nationality: r.get(5)?,
        notes: r.get(6)?,
        is_blacklisted: r.get::<_, i64>(7)? != 0,
        blacklist_reason: r.get(8)?,
        created_at: r.get(9)?,
    })
}

pub fn list_guests(db: &Db, q: Option<String>) -> AppResult<Vec<Guest>> {
    db.with(|conn| {
        let query = q.unwrap_or_default();
        if query.trim().is_empty() {
            let sql = format!(
                "SELECT {} FROM guests WHERE hotel_id = 1 ORDER BY name LIMIT 200",
                SELECT_COLS
            );
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map([], map_guest)?.collect::<Result<Vec<_>, _>>()?;
            Ok(rows)
        } else {
            let like = format!("%{}%", query);
            let sql = format!(
                "SELECT {} FROM guests WHERE hotel_id = 1
                   AND (name LIKE ?1 OR phone LIKE ?1 OR id_number LIKE ?1)
                 ORDER BY name LIMIT 200",
                SELECT_COLS
            );
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map([like], map_guest)?.collect::<Result<Vec<_>, _>>()?;
            Ok(rows)
        }
    })
}

pub fn get_guest(db: &Db, id: i64) -> AppResult<Guest> {
    db.with(|conn| {
        let sql = format!("SELECT {} FROM guests WHERE id = ?1", SELECT_COLS);
        conn.query_row(&sql, [id], map_guest).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("guest {}", id)),
            other => AppError::Db(other),
        })
    })
}

pub fn create_guest(
    db: &Db,
    name: String,
    phone: String,
    id_number: String,
    nationality: Option<String>,
    notes: Option<String>,
) -> AppResult<Guest> {
    if name.trim().is_empty() {
        return Err(AppError::domain("GUEST_NAME_REQUIRED", "Tên khách là bắt buộc."));
    }
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO guests (hotel_id, name, phone, id_number, nationality, notes)
             VALUES (1, ?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                name,
                phone,
                id_number,
                nationality.unwrap_or_else(|| "VN".into()),
                notes.unwrap_or_default()
            ],
        )?;
        let id = tx.last_insert_rowid();
        let sql = format!("SELECT {} FROM guests WHERE id = ?1", SELECT_COLS);
        let g = tx.query_row(&sql, [id], map_guest)?;
        Ok(g)
    })
}

pub fn update_guest(
    db: &Db,
    id: i64,
    name: String,
    phone: String,
    id_number: String,
    nationality: String,
    notes: String,
) -> AppResult<Guest> {
    db.with_tx(|tx| {
        tx.execute(
            "UPDATE guests SET name=?1, phone=?2, id_number=?3, nationality=?4, notes=?5
             WHERE id=?6",
            rusqlite::params![name, phone, id_number, nationality, notes, id],
        )?;
        let sql = format!("SELECT {} FROM guests WHERE id = ?1", SELECT_COLS);
        let g = tx.query_row(&sql, [id], map_guest)?;
        Ok(g)
    })
}

pub fn set_blacklist(
    db: &Db,
    id: i64,
    is_blacklisted: bool,
    reason: String,
) -> AppResult<Guest> {
    db.with_tx(|tx| {
        tx.execute(
            "UPDATE guests SET is_blacklisted=?1, blacklist_reason=?2 WHERE id=?3",
            rusqlite::params![is_blacklisted as i64, reason, id],
        )?;
        let sql = format!("SELECT {} FROM guests WHERE id = ?1", SELECT_COLS);
        let g = tx.query_row(&sql, [id], map_guest)?;
        Ok(g)
    })
}
