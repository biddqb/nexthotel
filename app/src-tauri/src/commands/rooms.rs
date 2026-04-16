use crate::db::Db;
use crate::error::AppResult;
use crate::models::Room;

pub fn list_room_types(db: &Db) -> AppResult<Vec<String>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT room_type FROM rooms WHERE hotel_id = 1 ORDER BY room_type",
        )?;
        let rows = stmt
            .query_map([], |r| r.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn list_rooms(db: &Db) -> AppResult<Vec<Room>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, hotel_id, room_number, room_type, base_rate, active
             FROM rooms WHERE hotel_id = 1 ORDER BY room_number",
        )?;
        let rows = stmt
            .query_map([], |r| {
                Ok(Room {
                    id: r.get(0)?,
                    hotel_id: r.get(1)?,
                    room_number: r.get(2)?,
                    room_type: r.get(3)?,
                    base_rate: r.get(4)?,
                    active: r.get::<_, i64>(5)? != 0,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

pub fn create_room(
    db: &Db,
    room_number: String,
    room_type: String,
    base_rate: i64,
) -> AppResult<Room> {
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO rooms (hotel_id, room_number, room_type, base_rate, active)
             VALUES (1, ?1, ?2, ?3, 1)",
            rusqlite::params![room_number, room_type, base_rate],
        )?;
        let id = tx.last_insert_rowid();
        let room = tx.query_row(
            "SELECT id, hotel_id, room_number, room_type, base_rate, active
             FROM rooms WHERE id = ?1",
            [id],
            |r| {
                Ok(Room {
                    id: r.get(0)?,
                    hotel_id: r.get(1)?,
                    room_number: r.get(2)?,
                    room_type: r.get(3)?,
                    base_rate: r.get(4)?,
                    active: r.get::<_, i64>(5)? != 0,
                })
            },
        )?;
        Ok(room)
    })
}

pub fn update_room(
    db: &Db,
    id: i64,
    room_number: String,
    room_type: String,
    base_rate: i64,
    active: bool,
) -> AppResult<Room> {
    db.with_tx(|tx| {
        tx.execute(
            "UPDATE rooms SET room_number=?1, room_type=?2, base_rate=?3, active=?4
             WHERE id=?5 AND hotel_id=1",
            rusqlite::params![room_number, room_type, base_rate, active as i64, id],
        )?;
        let room = tx.query_row(
            "SELECT id, hotel_id, room_number, room_type, base_rate, active
             FROM rooms WHERE id = ?1",
            [id],
            |r| {
                Ok(Room {
                    id: r.get(0)?,
                    hotel_id: r.get(1)?,
                    room_number: r.get(2)?,
                    room_type: r.get(3)?,
                    base_rate: r.get(4)?,
                    active: r.get::<_, i64>(5)? != 0,
                })
            },
        )?;
        Ok(room)
    })
}

pub fn bulk_create_rooms(
    db: &Db,
    prefix: String,
    count: i64,
    starting_number: i64,
    room_type: String,
    base_rate: i64,
) -> AppResult<Vec<Room>> {
    db.with_tx(|tx| {
        let mut out = Vec::new();
        for i in 0..count {
            let num = starting_number + i;
            let room_number = format!("{}{}", prefix, num);
            tx.execute(
                "INSERT OR IGNORE INTO rooms (hotel_id, room_number, room_type, base_rate, active)
                 VALUES (1, ?1, ?2, ?3, 1)",
                rusqlite::params![room_number, room_type, base_rate],
            )?;
        }
        let mut stmt = tx.prepare(
            "SELECT id, hotel_id, room_number, room_type, base_rate, active
             FROM rooms WHERE hotel_id = 1 ORDER BY room_number",
        )?;
        let rows = stmt
            .query_map([], |r| {
                Ok(Room {
                    id: r.get(0)?,
                    hotel_id: r.get(1)?,
                    room_number: r.get(2)?,
                    room_type: r.get(3)?,
                    base_rate: r.get(4)?,
                    active: r.get::<_, i64>(5)? != 0,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        out.extend(rows);
        Ok(out)
    })
}
