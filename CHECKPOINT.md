# Checkpoint — nextHotel + qarbi-website-v3

Session state as of 2026-04-28. Read this first when resuming work.

## TL;DR

Two products in flight:

1. **nextHotel desktop** — shipped to GitHub as v0.2.0. Live, working, has system tray icon and self-updater.
2. **nextHotel cloud** — planned end-to-end (architecture + tests + design). Lane A step 1 implemented on `cloud-lane-a` branch. Lanes B/C/D not started.

Plus: **Vietnamese user docs** are deployed live at https://qarbi.com/docs/nexthotel/ on the qarbi-website-v3 Astro Starlight site.

---

## Project 1: nextHotel (`F:/Project/nextHotel`)

**Repo:** `git@github.com:biddqb/nexthotel.git`
**Default branch:** `main`
**Working branch right now:** `cloud-lane-a` (see Cloud Planning below)

### What it is
Desktop PMS for Vietnamese hotels (unlimited rooms). Single Rust/Axum binary, embedded React frontend, SQLite database. Runs as a Windows .exe with system tray icon. LAN-accessible from staff devices via browser.

### Tech stack
- **Backend:** Rust 2021, Axum 0.7, rusqlite 0.32 (bundled SQLite), Argon2 PIN auth, session cookies
- **Frontend:** React 19, TypeScript, Tailwind, React Query, embedded via `rust-embed`
- **Tray:** `tray-icon = 0.19` with Windows message pump (required for context menu to work)
- **Self-updater:** `reqwest` + `semver`, swap via `.cmd` script in `%TEMP%`
- **Build:** `bun install && bun run build && cd src-tauri && cargo build --release`
- **Output:** `app/src-tauri/target/release/nexthotel-server.exe` (~7 MB)

### Releases on GitHub
- **v0.1.0** — initial release (no tray, no auto-update, console-based)
- **v0.2.0** ← latest — tray icon + self-updater, console hidden

`update.json` at repo root points the auto-updater to the v0.2.0 release. Existing v0.1.0 installs are stuck (the updater feature didn't exist yet). v0.2.0+ instances will see future updates automatically when `NEXTHOTEL_UPDATE_URL=https://raw.githubusercontent.com/biddqb/nexthotel/main/update.json`.

### Where things live (desktop, current state on `main`)

```
nextHotel/
├── README.md               (public-facing GitHub README)
├── CLAUDE.md               (dev notes — short)
├── DESIGN.md               (original product design from /office-hours)
├── update.json             (auto-update manifest — points to v0.2.0)
├── docs/                   (Vietnamese user guides — synced to qarbi.com)
│   ├── README.md
│   ├── staff.md            (Lễ tân — front desk staff)
│   ├── manager.md          (Quản lý)
│   ├── director.md         (Giám đốc / owner — describes the tray + auto-update)
│   ├── cheat-sheets.md
│   ├── troubleshooting.md
│   └── glossary.md
└── app/
    ├── package.json        (frontend deps)
    ├── build-release.cmd   (full release build)
    ├── install-autostart.cmd
    ├── public/
    ├── src/                (React frontend)
    │   ├── App.tsx
    │   ├── components/     (AppShell, ConnectionStatus, UpdateBanner, ...)
    │   ├── pages/          (CalendarPage, GuestsPage, ReservationDrawer, ...)
    │   ├── lib/            (api.ts, http.ts, auth.tsx, money.ts, date.ts)
    │   └── i18n/vi.json    (Vietnamese strings, single source of truth)
    └── src-tauri/          (Rust backend, will become workspace on cloud-lane-a)
        ├── Cargo.toml
        └── src/
            ├── main.rs     (#[windows_subsystem = "windows"] in release)
            ├── lib.rs      (Axum router, banner, port 8080)
            ├── handlers.rs (~1100 lines, all HTTP routes)
            ├── auth.rs
            ├── db.rs       (SQLite, MIGRATIONS, db_path)
            ├── error.rs    (AppError enum, IntoResponse)
            ├── models.rs   (data structs)
            ├── state.rs
            ├── tray.rs     (system tray icon, Windows message pump)
            ├── assets.rs   (rust-embed of ../dist/)
            └── commands/   (all domain logic — reservations, rates, guests, ...)
```

### Data dir (where customer data lives in production)
- Default: Tauri's app-local-data dir, but config redirects to OneDrive on this machine
- Actual: `C:\Users\OS\OneDrive - BIDTECH\nextHotel\nexthotel.db`
- `LOCALAPPDATA\nextHotel\nextHotel\data\config.json` is a pointer that redirects to the OneDrive path
- WAL files (`-shm`, `-wal`) live alongside the DB

### Project-specific gotchas
- `bun tauri dev` is NOT a real command — there's no `tauri.conf.json`. Frontend dev = `bun run dev` (vite on :5173); backend = run the compiled exe (which serves :8080).
- Both ports (5173 and 8080) serve the SAME app, but 5173 is live source and 8080 is the last-built release. **Always test against 5173 if you've changed source code.** I burned hours capturing screenshots against 8080 not realizing it was stale.
- Real data lives in OneDrive, NOT the default LOCALAPPDATA. Always check `config.json` before assuming a path.
- Be Vietnam Pro is the font. Teal `#0d9488` is the accent. Status colors are slate/emerald/red — calm traffic light.

### Recent commits on `main` (most recent first)
```
d91664d  chore: bump update.json to v0.2.0
560c694  feat: system tray icon + self-updater + docs refresh
3149ffa  Initial commit — nextHotel PMS v0.1.0
```

---

## Project 2: qarbi-website-v3 (`F:/qarbi-website-v3`)

**Repo:** Bitbucket — `git@bitbucket.org:qarbi-team/qarbi-website-v3.git`
**Default branch:** `master`
**VPS:** `root@72.62.241.248` (Hostinger), runs Caddy + Astro SSR + Fastify API + Postgres
**Live URL:** https://qarbi.com

### What we did here
Published Vietnamese user docs for nextHotel as a new product section on the Qarbi docs site at https://qarbi.com/docs/nexthotel/. Built on Astro Starlight (per [DOCS-IMPLEMENTATION.md](F:/qarbi-website-v3/DOCS-IMPLEMENTATION.md)).

### Pages live
- `/docs/nexthotel/getting-started/` — overview + download CTA
- `/docs/nexthotel/director-guide/` — owner/admin docs (with download link in :::tip callout)
- `/docs/nexthotel/manager-guide/`
- `/docs/nexthotel/staff-guide/`
- `/docs/nexthotel/cheat-sheets/`
- `/docs/nexthotel/troubleshooting/`
- `/docs/nexthotel/glossary/`

Sidebar order: Tổng quan → Giám đốc → Quản lý → Lễ tân → Tham khảo (top-down by authority).

### Screenshots state
- 25 .webp screenshots in [public/docs/nexthotel/](F:/qarbi-website-v3/public/docs/nexthotel/) captured against the **live :5173 app** with admin/123456 (admin user is real, real password)
- Captured via Playwright scripts at the qarbi repo root: `screenshot-nexthotel*.mjs` (4 phases, only phase 5+7 worked correctly)
- Earlier captures against :8080 produced login-page duds and were thrown out
- Still-missing shots (drawer flow, blacklist banner, audit warning, print preview, OS-level director shots) require manual capture

### Deploy command
From the qarbi repo (after committing + pushing to bitbucket master):
```bash
ssh root@72.62.241.248 "/opt/qarbi-web/deploy.sh"
```
Pulls, npm installs, `npm run build`, restarts qarbi-web + qarbi-web-api services. Health checks both.

### Recent commits on `master`
```
49eab87  docs(nexthotel): add Assets instruction + auto-update to Bảo trì section
3fa6e5e  docs(nexthotel): reorder guides, add download link, remove 12-room limit
ff8b963  (something between)
795f71f  docs(nexthotel): replace screenshots with live-UI captures
d385e11  docs(nexthotel): add nextHotel product section
```

---

## Cloud planning (the big work)

User wants a cloud version of nextHotel: hospitality framework with booking engine storefront + CMS for static pages, packaged so it can be customized per customer. Per-customer deployments (each chain gets own DB + Docker stack), multi-branch within a customer, generalizable beyond hotels long-term.

### Review chain done
1. `/office-hours` — mode: Startup. Decided to go with **Approach A** (Cloud nextHotel + bolt-ons, full integrated build, ~3-4 months) instead of B (booking widget first). User chose to skip user-validation phase.
2. `/plan-eng-review` — 8 architecture issues + 6 code-quality + 4 perf, all resolved
3. `/plan-design-review` — design score 3/10 → 9/10, 8 design decisions resolved
4. `/design-shotgun` — 4 visual directions written as text briefs (OpenAI key wasn't set up). **Direction A "Calm and Trustworthy"** chosen for booking widget.

### Locked architectural decisions (eng review)

| ID | Decision | Choice |
|---|---|---|
| 1A | Multi-branch data model | `branch_id` column on every row |
| 1B | Booking widget API | Same Axum binary, public route group `/book/*` |
| 1C | CMS rendering | Astro SSR (means 2-process per customer: Axum + Node) |
| 1D | Topology | Single VPS, **shared Postgres** (one process, N databases inside it), per-customer Docker stack |
| 1E | Auth | PIN for staff + email/password for managers (cohabit) |
| 1F | Payment | VNPay v1 (trait so MoMo/OnePay plug in later) |
| 1G | Ops | Manual onboarding + manual updates (`onboard.sh`, SSH+`docker-compose pull` per customer) |
| 1H | Backups | WAL-G continuous archiving to S3-compatible storage |
| 2A | Code share desktop↔cloud | **Workspace crate** with shared `core/` |
| 2B | Branch isolation | Middleware sets `app.branch_id` + Postgres RLS policies (defense in depth) |
| 2F | Crate boundaries | **Pure core + Repository trait** (hexagonal architecture) |

### Locked design decisions (design review)

| Decision | Resolution |
|---|---|
| Booking flow shape | Single-page progressive disclosure |
| Payment timing | Per-hotel setting, default 30% deposit |
| Account requirement | Anonymous booking; offer optional account at end |
| Email field | Required |
| Visual direction | Direction A "Calm and Trustworthy" — slate + teal #0d9488, Be Vietnam Pro, calm traffic-light status colors |

### Hard preconditions before first paying customer
1. **WAL-G archive-failure alerting** — Slack/email when archive stops (silent failure = catastrophic)
2. **Concurrent booking race** — Postgres `EXCLUDE USING gist (room_id WITH =, daterange WITH &&)` constraint
3. **Payment-DB atomicity** — idempotency key per booking attempt + nightly reconciliation worker
4. **VNPay HMAC signature validation** on every webhook
5. **Postgres RLS policies** for branch isolation (catches Rust query mistakes)
6. **Mobile-first responsive specs** implemented (most bookings happen on phones)
7. **All 9 interaction states** wired (loading/empty/error/success/partial across 9 surfaces)

### Planning artifacts (committed on `cloud-lane-a` branch)
All under [docs/](F:/Project/nextHotel/docs/):
- [CLOUD-DESIGN.md](F:/Project/nextHotel/docs/CLOUD-DESIGN.md) — architecture, eng-locked
- [CLOUD-TEST-PLAN.md](F:/Project/nextHotel/docs/CLOUD-TEST-PLAN.md) — test coverage targets, critical gaps
- [CLOUD-DESIGN-DECISIONS.md](F:/Project/nextHotel/docs/CLOUD-DESIGN-DECISIONS.md) — IA, states, journey, brand, a11y
- [CLOUD-BOOKING-WIDGET-DIRECTIONS.md](F:/Project/nextHotel/docs/CLOUD-BOOKING-WIDGET-DIRECTIONS.md) — visual brief, Direction A locked
- [TODOS.md](F:/Project/nextHotel/TODOS.md) — 8 deferred items with full context

### Implementation lanes (parallelizable after Lane A)

| Lane | Steps | Status |
|---|---|---|
| **A — Foundation** | 1. Workspace + extract core/ ✅ done<br>2. Cloud binary skeleton<br>3. Postgres repo impl<br>4. Multi-branch + RLS | Step 1 done, 2-4 pending |
| **B — Auth** | Email/password + MFA-ready | Pending (waits for Lane A step 4) |
| **C — Booking** | Public widget + VNPay | Pending (waits for Lane A step 4) |
| **D — CMS** | CMS module + Astro SSR | Pending (waits for Lane A step 4) |
| **E — Deploy** | Docker images, Caddy, WAL-G, onboard.sh | Pending (waits for B/C/D) |
| **F — Tests + CI** | sqlx::test, Playwright, GitHub Actions | Continuous (alongside features) |

---

## Current branch: `cloud-lane-a` (NOT pushed yet)

### Lane A step 1 — DONE ✅ on this branch

**Commits on `cloud-lane-a` ahead of `main`:**
```
xxxxxxx  refactor: convert src-tauri to Cargo workspace + extract core crate
xxxxxxx  docs: add cloud planning artifacts
```

**What changed in step 1:**
- `app/src-tauri/` is now a Cargo workspace
- New `app/src-tauri/core/` crate (`nexthotel-core`) — only contains `models.rs` so far. Will grow to hold `Repository` trait + pure domain logic in step 1.5.
- New `app/src-tauri/desktop/` crate (`nexthotel-server` binary) — all existing backend code moved here unchanged
- `desktop/src/lib.rs` re-exports `pub use nexthotel_core::models;` so existing `crate::models::*` paths in commands and handlers still resolve
- `desktop/src/assets.rs` RustEmbed path: `../dist/` → `../../dist/`
- Workspace version: 0.2.0
- `cargo build --release` from `src-tauri/` produces same 7.0 MB exe at same path. `build-release.cmd` works without changes.

**What's NOT done in Lane A yet (the next steps):**
- Step 1.5: move `error.rs` semantics to core (split AppError enum from IntoResponse impl)
- Step 1.6: extract pure domain logic to core (overlap detection, rate resolution, night-audit math)
- Step 1.7: define `Repository` trait in core
- Step 2: create `app/src-tauri/cloud/` binary skeleton
- Step 3: implement `Repository` for Postgres in cloud
- Step 4: multi-branch model + RLS policies + middleware

### Untracked / unstaged on cloud-lane-a
None — everything committed.

---

## Quick-resume commands

### Run desktop locally (current state)
```bash
cd f:/Project/nextHotel/app
bun install
bun run dev          # vite on :5173
# in another terminal:
cd src-tauri
cargo run --release  # Rust on :8080 with tray icon
```

### Build a release exe
```bash
cd f:/Project/nextHotel/app
cmd //C build-release.cmd
# output: app/src-tauri/target/release/nexthotel-server.exe
```

### Smoke-test the existing exe (admin/123456)
```bash
curl -s http://127.0.0.1:8080/api/version    # → {"version":"0.2.0"}
curl -s http://127.0.0.1:8080/api/bootstrap/status
```

### Pick up where Lane A left off (next session)
```bash
cd f:/Project/nextHotel
git checkout cloud-lane-a
# Then either:
# - continue with Lane A step 1.5 (extract more pure logic to core)
# - or start Lane A step 2 (cloud/ binary skeleton)
```

### Push the branch when ready
```bash
git push -u origin cloud-lane-a
# then optionally open a PR
```

### Restore your real DB if a screenshot session destroys it
The OneDrive copy is the real one:
```
C:\Users\OS\OneDrive - BIDTECH\nextHotel\nexthotel.db
```
Backups should be created with `nexthotel.db.bak-...` filenames before any destructive work.

---

## Key user preferences observed (carry forward)

1. **Prefers complete options over shortcuts** — picked Postgres over SQLite, full integrated build over wedge-first, all 7 design passes at depth, monorepo+workspace over fork
2. **Pushed back on user-validation step** — said "just build the product, no need to ask someone first" — committed without external demand evidence (this is the biggest risk in the cloud plan)
3. **Wants clarifying questions** when something is ambiguous, not assumptions
4. **Direct, fast, decisive** — picks one option, moves on, doesn't re-litigate
5. **Vietnamese-first product** — UI, docs, and all customer-facing copy in Vietnamese; English deferred
6. **Already comfortable with Astro** (qarbi.com runs on it) — that's why CMS rendering went Astro SSR even though it adds a Node process
7. **Ships things** — desktop is real, deployed, has GitHub releases, has live docs on qarbi.com. Foundation is solid.

## Things to NOT do without asking

- Don't push `cloud-lane-a` to GitHub (wait for explicit yes)
- Don't merge `cloud-lane-a` into `main` (wait for explicit yes)
- Don't create new GitHub releases (user runs that workflow)
- Don't deploy to qarbi.com VPS (user runs `/deploy.sh` themselves typically, or asks)
- Don't touch the OneDrive nexthotel.db without backing it up first
- Don't restart the desktop server (user controls it via the tray icon)

---

## When you (next session) read this

1. `git log --oneline -5` on both projects to verify state matches this doc
2. Read [docs/CLOUD-DESIGN.md](docs/CLOUD-DESIGN.md) for the full architecture
3. Read [docs/CLOUD-DESIGN-DECISIONS.md](docs/CLOUD-DESIGN-DECISIONS.md) for the UX
4. Skim [TODOS.md](TODOS.md) to know what's deferred
5. Ask the user: "Continue with Lane A step 1.5 (extract more to core), Lane A step 2 (cloud binary skeleton), or jump elsewhere?"
