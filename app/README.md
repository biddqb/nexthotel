# nextHotel — v0.1

Offline-capable desktop PMS for Vietnamese hotels (unlimited rooms).
Rust/Axum + React + TypeScript + SQLite. Vietnamese UI.

## First-time setup

```bash
cd app
bun install
bun tauri dev
```

**First compile is slow** — Tauri pulls and compiles ~500 Rust crates (5-15 min on first
run). Subsequent runs cache everything and start in under 10 seconds.

## Features

- Calendar grid with month navigation, rooms × days, drag-to-create reservations
- Reservation detail drawer with one-click check-in / check-out / payment
- Guest CRUD with search (name, phone, ID number)
- Reports: occupancy %, revenue, ADR, daily revenue chart
- Invoice preview + print (A5 portrait, Vietnamese)
- First-run wizard: hotel info, bulk-add rooms, data folder picker with cloud detection
- Seasonal rate plans with room-type targeting
- Auto-backup on app close (rolling 30-day retention via `VACUUM INTO`)
- Double-booking prevention at both app layer (transaction) and DB layer (triggers)

## Production build

```bash
bun tauri build
```

Produces a .msi / .exe in `src-tauri/target/release/bundle/`.

## Data location

By default, stored in OS app-data dir. First-run wizard offers to relocate to a
cloud-synced folder (OneDrive, Google Drive, Dropbox) for free off-site backup.

## Architecture

- `src-tauri/src/` — Rust backend, all domain logic
  - `db.rs` — SQLite connection, PRAGMAs, migrations, VACUUM INTO
  - `commands/` — typed Tauri commands exposed to JS
  - `models.rs` — shared serializable structs
- `src/` — React frontend
  - `pages/` — route screens
  - `components/` — shared UI
  - `lib/` — API wrappers, date/money helpers, types
  - `i18n/vi.json` — all Vietnamese strings

## Known gaps (v2)

- OTA sync (Booking.com / Airbnb / Agoda)
- Multi-user / staff accounts
- Multi-room / group bookings
- English UI translation
- PDF report export
- Dark mode
