use crate::commands::reservations::count_nights;
use crate::db::Db;
use crate::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct OccupancyReport {
    pub from: String,
    pub to: String,
    pub room_count: i64,
    pub total_room_nights: i64,
    pub sold_room_nights: i64,
    pub occupancy_pct: f64,
    pub revenue: i64,
    pub adr: i64,
    pub revpar: i64, // revenue / available room-nights
    pub bookings: i64,
}

pub fn occupancy_report(
    db: &Db,
    from: String,
    to: String,
) -> AppResult<OccupancyReport> {
    let days = count_nights(&from, &to)?;
    db.with(|conn| {
        let room_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM rooms WHERE hotel_id = 1 AND active = 1",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);
        let total_room_nights = room_count * days;

        // Nights within [from, to) across all non-cancelled reservations.
        let sold_room_nights: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(
                    julianday(MIN(check_out, ?2)) - julianday(MAX(check_in, ?1))
                 ), 0)
                 FROM reservations
                 WHERE status NOT IN ('cancelled','no_show')
                   AND NOT (check_out <= ?1 OR check_in >= ?2)",
                [&from, &to],
                |r| r.get::<_, f64>(0).map(|x| x.round() as i64),
            )
            .unwrap_or(0);

        let bookings: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM reservations
                 WHERE status NOT IN ('cancelled','no_show')
                   AND NOT (check_out <= ?1 OR check_in >= ?2)",
                [&from, &to],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let revenue: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0)
                 FROM payments
                 WHERE paid_at >= ?1 AND paid_at < ?2",
                [&from, &to],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let adr = if sold_room_nights > 0 {
            revenue / sold_room_nights
        } else {
            0
        };
        let revpar = if total_room_nights > 0 {
            revenue / total_room_nights
        } else {
            0
        };
        let occupancy_pct = if total_room_nights > 0 {
            (sold_room_nights as f64 / total_room_nights as f64) * 100.0
        } else {
            0.0
        };

        Ok(OccupancyReport {
            from,
            to,
            room_count,
            total_room_nights,
            sold_room_nights,
            occupancy_pct,
            revenue,
            adr,
            revpar,
            bookings,
        })
    })
}

#[derive(Debug, Serialize)]
pub struct DailyRevenue {
    pub date: String,
    pub revenue: i64,
    pub bookings: i64,
}

pub fn daily_revenue(
    db: &Db,
    from: String,
    to: String,
) -> AppResult<Vec<DailyRevenue>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT substr(paid_at, 1, 10) AS d,
                    SUM(amount) AS rev,
                    COUNT(DISTINCT reservation_id) AS n
             FROM payments
             WHERE paid_at >= ?1 AND paid_at < ?2
             GROUP BY d ORDER BY d",
        )?;
        let rows = stmt
            .query_map([from, to], |r| {
                Ok(DailyRevenue {
                    date: r.get(0)?,
                    revenue: r.get(1)?,
                    bookings: r.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}
