use crate::db::Db;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: i64,
    pub category: String,
    pub description: String,
    pub amount: i64,
    pub vendor: String,
    pub expense_date: String,
    pub created_by: Option<i64>,
    pub created_by_name: Option<String>,
    pub created_at: String,
}

fn map_expense(r: &rusqlite::Row<'_>) -> rusqlite::Result<Expense> {
    Ok(Expense {
        id: r.get(0)?,
        category: r.get(1)?,
        description: r.get(2)?,
        amount: r.get(3)?,
        vendor: r.get(4)?,
        expense_date: r.get(5)?,
        created_by: r.get(6)?,
        created_by_name: r.get(7)?,
        created_at: r.get(8)?,
    })
}

const COLS: &str =
    "e.id, e.category, e.description, e.amount, e.vendor, e.expense_date, e.created_by, u.name, e.created_at";

pub fn list_expenses(db: &Db, from: Option<String>, to: Option<String>) -> AppResult<Vec<Expense>> {
    db.with(|conn| {
        let (sql, params): (String, Vec<String>) = match (from, to) {
            (Some(f), Some(t)) => (
                format!(
                    "SELECT {COLS} FROM expenses e LEFT JOIN users u ON u.id = e.created_by
                     WHERE expense_date >= ?1 AND expense_date < ?2
                     ORDER BY expense_date DESC, e.id DESC"
                ),
                vec![f, t],
            ),
            _ => (
                format!(
                    "SELECT {COLS} FROM expenses e LEFT JOIN users u ON u.id = e.created_by
                     ORDER BY expense_date DESC, e.id DESC LIMIT 500"
                ),
                vec![],
            ),
        };
        let mut stmt = conn.prepare(&sql)?;
        let rows = if params.is_empty() {
            stmt.query_map([], map_expense)?.collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map(rusqlite::params_from_iter(params), map_expense)?
                .collect::<Result<Vec<_>, _>>()?
        };
        Ok(rows)
    })
}

pub fn create_expense(
    db: &Db,
    category: String,
    description: String,
    amount: i64,
    vendor: String,
    expense_date: String,
    user_id: i64,
) -> AppResult<Expense> {
    if amount <= 0 {
        return Err(AppError::domain("AMOUNT_POSITIVE", "Số tiền phải lớn hơn 0."));
    }
    if category.trim().is_empty() {
        return Err(AppError::domain("CATEGORY_REQUIRED", "Danh mục là bắt buộc."));
    }
    db.with_tx(|tx| {
        tx.execute(
            "INSERT INTO expenses (hotel_id, category, description, amount, vendor, expense_date, created_by)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![category, description, amount, vendor, expense_date, user_id],
        )?;
        let id = tx.last_insert_rowid();
        let sql = format!(
            "SELECT {COLS} FROM expenses e LEFT JOIN users u ON u.id = e.created_by WHERE e.id = ?1"
        );
        let e = tx.query_row(&sql, [id], map_expense)?;
        Ok(e)
    })
}

pub fn delete_expense(db: &Db, id: i64) -> AppResult<()> {
    db.with_tx(|tx| {
        tx.execute("DELETE FROM expenses WHERE id = ?1", [id])?;
        Ok(())
    })
}

#[derive(Debug, Serialize)]
pub struct ExpenseSummary {
    pub from: String,
    pub to: String,
    pub total: i64,
    pub by_category: Vec<(String, i64)>,
}

pub fn expense_summary(db: &Db, from: String, to: String) -> AppResult<ExpenseSummary> {
    db.with(|conn| {
        let total: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM expenses
                 WHERE expense_date >= ?1 AND expense_date < ?2",
                [&from, &to],
                |r| r.get(0),
            )
            .unwrap_or(0);
        let mut stmt = conn.prepare(
            "SELECT category, SUM(amount) FROM expenses
             WHERE expense_date >= ?1 AND expense_date < ?2
             GROUP BY category ORDER BY SUM(amount) DESC",
        )?;
        let by_category = stmt
            .query_map([&from, &to], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(ExpenseSummary {
            from,
            to,
            total,
            by_category,
        })
    })
}
