use crate::db::Db;
use crate::error::AppResult;
use crate::models::Hotel;

pub fn get_hotel(db: &Db) -> AppResult<Option<Hotel>> {
    db.with(|conn| {
        let result = conn
            .query_row(
                "SELECT id, name, address, tax_id, phone FROM hotels WHERE id = 1",
                [],
                |r| {
                    Ok(Hotel {
                        id: r.get(0)?,
                        name: r.get(1)?,
                        address: r.get(2)?,
                        tax_id: r.get(3)?,
                        phone: r.get(4)?,
                    })
                },
            )
            .ok();
        Ok(result)
    })
}

pub fn upsert_hotel(
    db: &Db,
    name: String,
    address: String,
    tax_id: String,
    phone: String,
) -> AppResult<Hotel> {
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO hotels (id, name, address, tax_id, phone) VALUES (1, ?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, address=excluded.address,
                 tax_id=excluded.tax_id, phone=excluded.phone",
            rusqlite::params![name, address, tax_id, phone],
        )?;
        let hotel = tx.query_row(
            "SELECT id, name, address, tax_id, phone FROM hotels WHERE id = 1",
            [],
            |r| {
                Ok(Hotel {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    address: r.get(2)?,
                    tax_id: r.get(3)?,
                    phone: r.get(4)?,
                })
            },
        )?;
        Ok(hotel)
    })
}
