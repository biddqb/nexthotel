use crate::error::{AppError, AppResult};
use rusqlite::{Connection, OpenFlags};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE,
        )?;
        Self::apply_pragmas(&conn)?;
        migrate(&conn)?;
        Ok(Db(Mutex::new(conn)))
    }

    fn apply_pragmas(conn: &Connection) -> AppResult<()> {
        // Critical: SQLite defaults will bite us without these.
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
            PRAGMA temp_store = MEMORY;
            "#,
        )?;
        Ok(())
    }

    pub fn with<F, R>(&self, f: F) -> AppResult<R>
    where
        F: FnOnce(&Connection) -> AppResult<R>,
    {
        let conn = self.0.lock().map_err(|_| AppError::Other("db lock poisoned".into()))?;
        f(&conn)
    }

    pub fn with_tx<F, R>(&self, f: F) -> AppResult<R>
    where
        F: FnOnce(&rusqlite::Transaction) -> AppResult<R>,
    {
        let mut conn = self.0.lock().map_err(|_| AppError::Other("db lock poisoned".into()))?;
        let tx = conn.transaction()?;
        let result = f(&tx)?;
        tx.commit()?;
        Ok(result)
    }

    pub fn vacuum_into(&self, dest: &Path) -> AppResult<()> {
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = self.0.lock().map_err(|_| AppError::Other("db lock poisoned".into()))?;
        let dest_str = dest.to_string_lossy().replace('\'', "''");
        conn.execute(&format!("VACUUM INTO '{}'", dest_str), [])?;
        Ok(())
    }
}

// ---------- Migrations ----------

const MIGRATIONS: &[&str] = &[
    // 001 — core schema
    r#"
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hotels (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        tax_id TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        room_number TEXT NOT NULL,
        room_type TEXT NOT NULL DEFAULT 'standard',
        base_rate INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(hotel_id, room_number)
    );

    CREATE TABLE IF NOT EXISTS rate_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        starts_on TEXT NOT NULL,
        ends_on TEXT NOT NULL,
        applies_to_room_type TEXT,
        rate INTEGER NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rate_plans_dates ON rate_plans(starts_on, ends_on);

    CREATE TABLE IF NOT EXISTS guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        id_number TEXT NOT NULL DEFAULT '',
        nationality TEXT NOT NULL DEFAULT 'VN',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(name);
    CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);

    CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
        check_in TEXT NOT NULL,    -- YYYY-MM-DD
        check_out TEXT NOT NULL,   -- YYYY-MM-DD (exclusive, the day of departure)
        status TEXT NOT NULL
            CHECK(status IN ('confirmed','checked_in','checked_out','cancelled','no_show'))
            DEFAULT 'confirmed',
        payment_status TEXT NOT NULL
            CHECK(payment_status IN ('unpaid','deposit_paid','paid','refunded'))
            DEFAULT 'unpaid',
        rate INTEGER NOT NULL,     -- snapshot, per-night VND
        total INTEGER NOT NULL,    -- rate * nights, snapshot
        deposit INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK(check_out > check_in)
    );
    CREATE INDEX IF NOT EXISTS idx_reservations_room_dates
        ON reservations(room_id, check_in, check_out);
    CREATE INDEX IF NOT EXISTS idx_reservations_status_active
        ON reservations(status) WHERE status NOT IN ('cancelled','no_show');
    CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in, check_out);

    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        method TEXT NOT NULL CHECK(method IN ('cash','bank','card','other')),
        paid_at TEXT NOT NULL DEFAULT (datetime('now')),
        notes TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1,
        entity TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        diff TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Safety net: DB-level trigger to reject overlapping active reservations.
    -- App-level check in the command also enforces this; this is defense-in-depth.
    CREATE TRIGGER IF NOT EXISTS trg_reservations_no_overlap_insert
    BEFORE INSERT ON reservations
    WHEN NEW.status NOT IN ('cancelled','no_show')
    BEGIN
        SELECT CASE
            WHEN EXISTS (
                SELECT 1 FROM reservations
                WHERE room_id = NEW.room_id
                  AND status NOT IN ('cancelled','no_show')
                  AND NOT (check_out <= NEW.check_in OR check_in >= NEW.check_out)
            )
            THEN RAISE(ABORT, 'OVERLAP')
        END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_reservations_no_overlap_update
    BEFORE UPDATE ON reservations
    WHEN NEW.status NOT IN ('cancelled','no_show')
    BEGIN
        SELECT CASE
            WHEN EXISTS (
                SELECT 1 FROM reservations
                WHERE room_id = NEW.room_id
                  AND id != NEW.id
                  AND status NOT IN ('cancelled','no_show')
                  AND NOT (check_out <= NEW.check_in OR check_in >= NEW.check_out)
            )
            THEN RAISE(ABORT, 'OVERLAP')
        END;
    END;
    "#,
    // 002 — auth, blacklist, housekeeping, ancillary charges, expenses, shifts
    r#"
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        name TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('staff','manager','director')),
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    ALTER TABLE guests ADD COLUMN is_blacklisted INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE guests ADD COLUMN blacklist_reason TEXT NOT NULL DEFAULT '';

    -- Housekeeping state per room. Current state lives here; history via events.
    CREATE TABLE IF NOT EXISTS room_states (
        room_id INTEGER PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
        state TEXT NOT NULL
            CHECK(state IN ('clean','dirty','inspected','out_of_service','maintenance'))
            DEFAULT 'clean',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS housekeeping_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        state TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_hk_events_room ON housekeeping_events(room_id, created_at);

    -- Ancillary charges posted to a reservation folio.
    CREATE TABLE IF NOT EXISTS reservation_charges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        category TEXT NOT NULL CHECK(category IN ('minibar','laundry','food','service','other')),
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_charges_reservation ON reservation_charges(reservation_id);

    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1 REFERENCES hotels(id) ON DELETE RESTRICT,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        vendor TEXT NOT NULL DEFAULT '',
        expense_date TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

    CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        clock_in TEXT NOT NULL DEFAULT (datetime('now')),
        clock_out TEXT,
        handover_notes TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id, clock_in);

    -- Night audit — day lock table. One row per locked day.
    CREATE TABLE IF NOT EXISTS night_audit (
        audit_date TEXT PRIMARY KEY,
        locked_at TEXT NOT NULL DEFAULT (datetime('now')),
        locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        revenue INTEGER NOT NULL DEFAULT 0,
        occupancy_pct REAL NOT NULL DEFAULT 0,
        adr INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT ''
    );
    "#,
];

fn migrate(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));",
    )?;
    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    for (i, sql) in MIGRATIONS.iter().enumerate() {
        let version = (i as i64) + 1;
        if version > current {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                [version],
            )?;
        }
    }
    Ok(())
}

// ---------- Paths ----------

/// Resolve the data directory. In order of preference:
/// 1) `NEXTHOTEL_DATA_DIR` env var (for tests / dev)
/// 2) The path saved in the app config
/// 3) Tauri's default app data dir
pub fn default_data_dir() -> PathBuf {
    if let Ok(p) = std::env::var("NEXTHOTEL_DATA_DIR") {
        return PathBuf::from(p);
    }
    if let Some(dirs) = directories::ProjectDirs::from("com", "nextHotel", "nextHotel") {
        return dirs.data_local_dir().to_path_buf();
    }
    PathBuf::from(".nexthotel-data")
}

pub fn db_path(data_dir: &Path) -> PathBuf {
    data_dir.join("nexthotel.db")
}

pub fn backups_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("backups")
}

pub fn config_path(data_dir: &Path) -> PathBuf {
    data_dir.join("config.json")
}
