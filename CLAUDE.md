# nextHotel — dev notes

Desktop PMS for Vietnamese hotels (unlimited rooms). Rust/Axum + React + SQLite.
See `DESIGN.md` for the full spec. App code is under `app/`.

## Run

```
cd app
bun install
bun tauri dev
```

First Rust compile takes 5-15 minutes. After that, hot reload works on both sides.

## Where things live

- **Domain logic:** `app/src-tauri/src/commands/*.rs` — all business rules live in Rust
  transactions. Double-booking prevention is in both `reservations.rs::check_overlap`
  and SQLite triggers (`db.rs`). Never add domain logic to the React side.
- **Schema:** `app/src-tauri/src/db.rs::MIGRATIONS`. Append new migrations, never edit
  existing ones in place.
- **UI strings:** `app/src/i18n/vi.json`. Vietnamese is v1, English deferred to v2.
  All user-facing strings go through `t()` — no hardcoded literals.
- **Typed API:** `app/src/lib/api.ts` — thin typed wrappers around `invoke`. When you
  add a Rust command, add a wrapper here.
- **Design tokens:** `app/tailwind.config.js`. Status colors are the calm traffic light
  (`confirmed: slate, checked_in: emerald, cancelled: red outline + strikethrough`).
  Accent is teal `#0d9488`.

## Money & dates

- All money = INTEGER VND. Use `formatVND` / `parseVND` from `lib/money.ts`. Never
  `REAL`, never floats.
- All dates = `YYYY-MM-DD` strings. Use `lib/date.ts` helpers. No timestamps for
  check-in/check-out.

## Backup

Runs automatically on app close via `VACUUM INTO` (safe during open transactions).
Keep rolling 30-day retention. Never fs-copy the SQLite file while the app is running.
