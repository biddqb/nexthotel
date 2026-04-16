# nextHotel

Desktop PMS (Property Management System) for Vietnamese hotels. Runs as a single Windows executable serving a web UI over the local network. Supports unlimited rooms.

## Features

- **Reservation calendar** — weekly/monthly grid, drag-free workflow, double-booking prevention (SQLite triggers + Rust validation)
- **Guest management** — search, quick-add, blacklist with warnings
- **Housekeeping** — tablet-friendly room status grid (clean / dirty / inspected / maintenance / out-of-service)
- **Rate plans** — seasonal pricing by room type with priority-based conflict resolution
- **Night audit** — daily close with warnings for unpaid bookings, dirty rooms, open shifts
- **Expenses & reports** — occupancy, ADR, RevPAR, daily revenue chart, expense tracking by category
- **Shift management** — clock in/out, handover notes, history
- **Invoice printing** — A5 portrait, hotel branding, auto-calculated totals
- **Backup** — automatic on shutdown (`VACUUM INTO`), manual on-demand, 30-day rolling retention
- **Role-based access** — Staff / Manager / Director with escalating permissions
- **Self-update** — checks a remote manifest, downloads + swaps the binary in-place
- **Vietnamese-first UI** — all strings via i18n (`vi.json`), English deferred to v2

## Architecture

```
┌──────────────────────────────────┐
│  nexthotel-server.exe            │
│  Rust (Axum) HTTP server         │
│  SQLite database                 │
│  React frontend (embedded)       │
└───────┬──────────────────────────┘
        │ LAN (wifi)
┌───────┴───────┬──────────┬─────────┐
│ PC lễ tân     │ Tablet   │ Laptop  │
│ (Chrome)      │ (Safari) │ (Edge)  │
└───────────────┴──────────┴─────────┘
```

Single binary. No Docker, no cloud, no internet required. Staff devices access via `http://<server-ip>:8080` on any browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust, Axum 0.7, rusqlite 0.32 (bundled SQLite) |
| Frontend | React 19, TypeScript, Tailwind CSS, React Query |
| Auth | Argon2 PIN hashing, session cookies (30-day TTL) |
| Build | Vite (frontend), Cargo (backend), rust-embed (bundling) |
| Update | reqwest + semver, self-replacing exe via batch script |

## Development

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 20+)
- [Rust](https://rustup.rs/) (stable)

### Run

```bash
cd app
bun install
bun tauri dev
```

This starts the Vite dev server on `:5173` and the Rust server on `:8080`. First Rust compile takes 5–15 minutes.

### Project Structure

```
app/
├── src/                    # React frontend
│   ├── components/         # Shared UI components
│   ├── pages/              # Page-level components
│   ├── lib/                # API wrappers, auth, date/money helpers
│   └── i18n/               # Vietnamese translations (vi.json)
├── src-tauri/
│   └── src/
│       ├── main.rs         # Entry point
│       ├── lib.rs          # Axum router setup
│       ├── handlers.rs     # HTTP route handlers
│       ├── commands/       # Business logic modules
│       │   ├── reservations.rs
│       │   ├── guests.rs
│       │   ├── housekeeping.rs
│       │   ├── reports.rs
│       │   ├── updater.rs  # Self-update logic
│       │   └── ...
│       ├── db.rs           # SQLite schema + migrations
│       ├── auth.rs         # PIN auth + session management
│       ├── models.rs       # Data models
│       └── error.rs        # Error types
├── build-release.cmd       # Windows release build script
├── install-autostart.cmd   # Add to Windows Startup
└── package.json
```

### Build Release

```bash
cd app
build-release.cmd
```

Output: `app/src-tauri/target/release/nexthotel-server.exe` (~30–40 MB)

## Self-Update

The app can check for updates and replace itself in-place.

### Setup

1. Set the `NEXTHOTEL_UPDATE_URL` environment variable to a URL serving `update.json`:
   ```
   NEXTHOTEL_UPDATE_URL=https://raw.githubusercontent.com/biddqb/nexthotel/main/update.json
   ```

2. Host `update.json` with this format:
   ```json
   {
     "version": "1.1.0",
     "url": "https://github.com/biddqb/nexthotel/releases/download/v1.1.0/nexthotel-server.exe",
     "notes": "Bug fixes and new features."
   }
   ```

3. When a newer version is detected, a banner appears in the bottom-right corner. One click downloads the new binary, swaps it via a temp script, and restarts.

### How It Works

1. `GET /api/update/check` — fetches the manifest, compares semver
2. Frontend shows "Phiên bản mới X.Y.Z — Cập nhật ngay"
3. `POST /api/update/apply` — downloads the exe to `%TEMP%`, writes a `.cmd` swap script
4. Script waits 3s → copies new exe over old → restarts → deletes itself

## Deployment (Hotel Installation)

See [docs/director.md](docs/director.md) for the full step-by-step guide in Vietnamese.

Quick version:
1. Install Bun + Rust on the hotel's server PC
2. Clone this repo, run `build-release.cmd`
3. Run `nexthotel-server.exe` — opens on port 8080
4. Share `http://<lan-ip>:8080` with staff devices
5. Complete the 3-step setup wizard (hotel info → rooms → admin account)
6. Optional: `install-autostart.cmd` to auto-start on Windows login

## User Documentation

Full Vietnamese user guides live in [`/docs`](docs/):

| Guide | Audience |
|-------|----------|
| [Hướng dẫn Lễ tân](docs/staff.md) | Front desk / housekeeping staff |
| [Hướng dẫn Quản lý](docs/manager.md) | Hotel managers |
| [Hướng dẫn Giám đốc](docs/director.md) | Hotel owners / IT |
| [Bảng tra cứu nhanh](docs/cheat-sheets.md) | Quick reference (print & post) |
| [Xử lý sự cố](docs/troubleshooting.md) | Troubleshooting |
| [Thuật ngữ](docs/glossary.md) | Glossary of hotel + system terms |

## Money & Dates

- All money stored as **integer VND** (no floats, no decimals)
- All dates stored as `YYYY-MM-DD` strings (no timestamps for check-in/check-out)
- Display: `formatVND()` / `parseVND()` from `lib/money.ts`

## License

Proprietary. All rights reserved.
