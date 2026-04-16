use crate::db::Db;
use crate::error::AppResult;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AuditEntry {
    pub id: i64,
    pub entity: String,
    pub entity_id: Option<i64>,
    pub action: String,
    pub diff: String,
    pub created_at: String,
}

pub fn list_audit_log(db: &Db, limit: i64) -> AppResult<Vec<AuditEntry>> {
    db.with(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, entity, entity_id, action, diff, created_at
             FROM audit_log ORDER BY id DESC LIMIT ?1",
        )?;
        let rows = stmt
            .query_map([limit], |r| {
                Ok(AuditEntry {
                    id: r.get(0)?,
                    entity: r.get(1)?,
                    entity_id: r.get(2)?,
                    action: r.get(3)?,
                    diff: r.get(4)?,
                    created_at: r.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    })
}
