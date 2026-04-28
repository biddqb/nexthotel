# TODOs

Tracked deferred work for nextHotel. Items here have been considered and explicitly deferred — they are NOT in active scope but should be revisited at the trigger condition.

Each item: what + why + when to revisit + dependencies.

---

## Cloud (deferred from /plan-eng-review on 2026-04-27)

### 1. Self-service customer onboarding
**What:** Public signup form → automated provisioning (DB creation, Docker stack, Caddy config) → customer ready in 5 minutes.
**Why:** Manual onboarding caps at ~20 customers before founder time becomes the bottleneck. Self-service is the unlock for scale.
**Pros:** Removes founder from every deal. Marketing → conversion → revenue without manual touch.
**Cons:** ~3 weeks of work. Premature at 0 customers. Risk of bad signups (spam, abuse).
**Revisit when:** ~15 paying customers AND >5 inbound leads/week AND founder is the bottleneck.
**Depends on:** Stripe-or-equivalent for billing automation, abuse-prevention layer (rate limit, captcha), provisioning script tested across 10+ scenarios.

### 2. WAL-G archive failure alerting
**What:** Slack/email alert immediately when WAL-G archiving stops. Currently a silent failure mode = catastrophic data loss risk.
**Why:** WAL-G chosen for continuous archiving (Issue 1H). If it stops working and no one notices, the next disaster has 0 RPO instead of minutes.
**Pros:** Prevents the worst-case scenario. ~half-day to set up Prometheus + Alertmanager OR a tiny cron script that checks archive recency.
**Cons:** Half-day of work, requires Slack/email integration.
**Revisit when:** BEFORE first paying customer goes live. This is the highest-priority TODO in the list.
**Depends on:** WAL-G implementation, Slack workspace or transactional email service.

### 3. OTA channel manager (push availability to Booking.com / Agoda)
**What:** Push room availability + rates to OTA APIs whenever inventory changes. Pull bookings from OTAs into the cloud DB.
**Why:** Hotels still use OTAs for visibility even if direct booking is preferred. Without channel manager, hotels manually update OTA availability after each direct booking — error-prone.
**Pros:** Removes the biggest workflow pain after direct booking is solved. Significant value-add. Justifies higher pricing tier.
**Cons:** ~2-3 months of work. Each OTA has different APIs, certifications, contract requirements (some require approved channel manager status). Booking.com API is notoriously complex.
**Revisit when:** 3+ customers explicitly request, OR 1 customer pays a 2x premium for it.
**Depends on:** Direct booking volume to justify the integration cost, channel manager partnerships or approved status.

### 4. MFA for owner/manager email-password auth
**What:** TOTP-based MFA (Google Authenticator) for users with `manager` or `director` role. Optional for staff.
**Why:** Cloud login from anywhere = much higher attack surface than desktop PINs in a hotel LAN. A leaked manager password lets attacker access guest data, financial reports.
**Pros:** Real security improvement. Reasonably cheap (~3 days work with `otpauth-rs` crate).
**Cons:** UX friction (managers carry the burden). Lockout recovery flow needs to be designed.
**Revisit when:** Before second paying customer (any chain with multiple branches and managers should have it).
**Depends on:** Email/password auth (Issue 1E), recovery flow (admin can reset MFA for locked-out user).

### 5. Multi-currency + multi-language UI
**What:** Display prices in customer's currency (USD, EUR, AUD) for international tourists. UI translations beyond Vietnamese (English first).
**Why:** International tourists are the high-margin segment for many Vietnamese hotels. They book direct on the widget if comfortable.
**Pros:** Bigger TAM. Justifies higher widget conversion. Foreign-friendly hotels (Da Nang, Hoi An, Phu Quoc) need this.
**Cons:** Currency requires FX rate source (live or daily). Translation requires native speakers or expensive service.
**Revisit when:** First customer reports significant foreign tourist demand AND existing widget conversion is good for VN customers.
**Depends on:** Stable widget UX in Vietnamese first, currency provider chosen (CurrencyAPI, Fixer.io).

### 6. Public API for third-party integrations
**What:** Documented REST API + API keys for hotels to integrate with their accounting software, CRMs, smart locks, etc.
**Why:** Many hotels have existing tools (Misa accounting, Zalo CRM, smart locks). API enables them to keep using those tools without manual data entry.
**Pros:** Stickier customers. Marketing angle ("works with everything"). Revenue from API tier.
**Cons:** API design has high one-way-door cost (breaking changes hurt). Documentation work. Support burden.
**Revisit when:** A customer specifically asks AND offers to pay for a higher tier.
**Depends on:** Stable cloud product (>3 months in production), at least one customer integration to design against.

### 7. Mobile native apps (iOS / Android)
**What:** Native apps for housekeeping (tablet) and front desk (phone for owner-on-the-go).
**Why:** Mobile web is responsive but native gives push notifications, offline mode, better tablet UX.
**Pros:** Push notifications for new bookings. Offline mode for housekeeping in dead-zones. Premium feel.
**Cons:** ~2-3 months per platform. App Store / Play Store review process. Maintenance burden.
**Revisit when:** Year 2. Mobile web should be polished first. Push notifications via web push as interim.
**Depends on:** Mobile-friendly cloud UI shipped, push notification provider (FCM, OneSignal).

### 8. Per-customer monitoring + slow-query alerts
**What:** Per-customer dashboards showing API latency, DB query times, error rates. Alert on slow queries from any single customer (avoids "noisy neighbor" problem on shared Postgres).
**Why:** Shared Postgres (Issue 1D) means one customer's bad query can affect others. Without monitoring, this is a silent service degradation.
**Pros:** Catches issues before customers complain. Useful diagnostic for support.
**Cons:** ~1 week to set up Prometheus + Grafana + per-customer labels. Ongoing monitoring of monitoring.
**Revisit when:** ~5 paying customers, or first noisy-neighbor incident.
**Depends on:** Postgres `pg_stat_statements` enabled, Prometheus scrape config, Grafana dashboard templates.
