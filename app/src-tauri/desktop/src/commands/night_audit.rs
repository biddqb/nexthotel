use crate::db::Db;
use crate::error::{AppError, AppResult};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct NightAudit {
    pub audit_date: String,
    pub locked_at: String,
    pub locked_by: Option<i64>,
    pub locked_by_name: Option<String>,
    pub revenue: i64,
    pub occupancy_pct: f64,
    pub adr: i64,
    pub notes: String,
}

fn map_audit(r: &rusqlite::Row<'_>) -> rusqlite::Result<NightAudit> {
    Ok(NightAudit {
        audit_date: r.get(0)?,
        locked_at: r.get(1)?,
        locked_by: r.get(2)?,
        locked_by_name: r.get(3)?,
        revenue: r.get(4)?,
        occupancy_pct: r.get(5)?,
        adr: r.get(6)?,
        notes: r.get(7)?,
    })
}

#[derive(Debug, Serialize)]
pub struct PreviewResult {
    pub date: String,
    pub already_locked: bool,
    pub revenue: i64,
    pub occupancy_pct: f64,
    pub adr: i64,
    pub unpaid_reservations: i64,
    pub dirty_rooms: i64,
    pub open_shifts: i64,
}

/// Preview what the night audit would lock in for the given date (does not write).
pub fn preview_audit(db: &Db, audit_date: &str) -> AppResult<PreviewResult> {
    let next_day = next_date(audit_date)?;
    db.with(|conn| {
        let already_locked: bool = conn
            .query_row(
                "SELECT 1 FROM night_audit WHERE audit_date = ?1",
                [audit_date],
                |_| Ok(true),
            )
            .unwrap_or(false);

        let revenue: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM payments
                 WHERE paid_at >= ?1 AND paid_at < ?2",
                [audit_date, &next_day],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let sold: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(
                    julianday(MIN(check_out, ?2)) - julianday(MAX(check_in, ?1))
                 ), 0)
                 FROM reservations
                 WHERE status NOT IN ('cancelled','no_show')
                   AND NOT (check_out <= ?1 OR check_in >= ?2)",
                [audit_date, &next_day],
                |r| r.get::<_, f64>(0).map(|x| x.round() as i64),
            )
            .unwrap_or(0);

        let rooms: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM rooms WHERE active = 1",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let occupancy_pct = if rooms > 0 {
            (sold as f64 / rooms as f64) * 100.0
        } else {
            0.0
        };
        let adr = if sold > 0 { revenue / sold } else { 0 };

        let unpaid: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM reservations
                 WHERE status = 'checked_out'
                   AND payment_status IN ('unpaid','deposit_paid')
                   AND substr(updated_at, 1, 10) = ?1",
                [audit_date],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let dirty: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM room_states WHERE state IN ('dirty','maintenance')",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let open_shifts: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM shifts WHERE clock_out IS NULL",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);

        Ok(PreviewResult {
            date: audit_date.to_string(),
            already_locked,
            revenue,
            occupancy_pct,
            adr,
            unpaid_reservations: unpaid,
            dirty_rooms: dirty,
            open_shifts,
        })
    })
}

pub fn run_audit(
    db: &Db,
    audit_date: String,
    user_id: i64,
    notes: String,
) -> AppResult<NightAudit> {
    let preview = preview_audit(db, &audit_date)?;
    if preview.already_locked {
        return Err(AppError::domain(
            "AUDIT_LOCKED",
            format!("Ngày {} đã được kết sổ.", audit_date),
        ));
    }
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO night_audit
                (audit_date, locked_by, revenue, occupancy_pct, adr, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                audit_date,
                user_id,
                preview.revenue,
                preview.occupancy_pct,
                preview.adr,
                notes
            ],
        )?;
        let a = tx.query_row(
            "SELECT a.audit_date, a.locked_at, a.locked_by, u.name,
                    a.revenue, a.occupancy_pct, a.adr, a.notes
             FROM night_audit a LEFT JOIN users u ON u.id = a.locked_by
             WHERE a.audit_date = ?1",
            [audit_date],
            map_audit,
        )?;
        Ok(a)
    })
}

pub fn list_audits(db: &Db, limit: i64) -> AppResult<Vec<NightAudit>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT a.audit_date, a.locked_at, a.locked_by, u.name,
                    a.revenue, a.occupancy_pct, a.adr, a.notes
             FROM night_audit a LEFT JOIN users u ON u.id = a.locked_by
             ORDER BY a.audit_date DESC LIMIT ?1",
        )?;
        let rows = stmt
            .query_map([limit], map_audit)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}

fn next_date(s: &str) -> AppResult<String> {
    let d = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .map_err(|_| AppError::domain("DATE_FORMAT", format!("Ngày không hợp lệ: {}", s)))?;
    Ok((d + chrono::Duration::days(1)).format("%Y-%m-%d").to_string())
}
