# Queer Camp Scheduler - Project Status

**Last Updated:** May 31, 2026 (end of session)

## Project Overview

An activity scheduling tool for Queer Camp, a queer-affirming day camp at a church in Fayetteville, Arkansas. Designed for multi-year use across multiple camps with admin-driven flexibility.

**Important context:** Camper registration and payment are handled separately by RegFox at queercamp.regfox.com/camper-registration-2026. This scheduler is a private, link-based tool. After signing up through RegFox, campers receive a link from the camp admin and self-register in the scheduler to select their activities.

**Terminology:**
- Activities, tracks, and standing events are the three event types.
- "Activity" is the canonical term for optional sign-up offerings (formerly "workshop").
- Staff roles: **Admin** (full access) and **Leader** (read-only).

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router, TypeScript) | Built-in API routes, no separate server, integrates with Vercel |
| Database | Supabase (Postgres) | Portable, built-in RLS, free tier covers our scale |
| Auth | Magic-link only | No passwords; token on camper and admin_user rows, sent via email |
| Email | Google Workspace SMTP via Nodemailer | Org already uses Google Workspace |
| Hosting | Vercel | Auto-deploy from GitHub main, free tier |
| Version Control | GitHub (Queer-camp org) | Standard, tied to hello@queer.camp |

**Estimated monthly cost:** $0. Everything runs on free tiers.

## Architectural Decisions

- **Multi-camp from day one** — Schema supports multiple camps; one can be active at a time.
- **First-come-first-served capacity** — Enforced at DB level via insert trigger (no lottery).
- **Tracks are optional per camp** — Some camps have morning tracks + afternoon activities, others just activities.
- **Frontend never calls Supabase directly** — Always goes through Next.js API routes.
- **No medical/PII duplication with RegFox** — Scheduler is strictly for scheduling.
- **Magic link auth** — No passwords for campers or admins.
- **RBAC** — `requireAdmin` (allows leader read), `requireAdminRole` (rejects leaders, writes only).

## Schema Reference

### `camps`
- id, name, start_date, end_date, registration_open, is_active, archived, timestamps
- Trigger: only one camp can have `is_active = true` at a time

### `tracks` (morning groups, optional)
- id, camp_id, name, description, capacity, start_time, end_time
- emoji, location, organizer (stored as name string), timestamps

### `activity_series`
- id, camp_id, name, description, created_at

### `activities` (per day-slot, optional sign-up)
- id, camp_id, name, description, capacity
- day (comma-separated day names), start_time, end_time
- emoji, location, organizer, series_id → activity_series, timestamps

### `standing_events` (camp-wide blocks — meals, ceremonies)
- id, camp_id, name, day (comma-separated), start_time, end_time
- emoji, location, organizer, timestamps
- No capacity, no per-camper sign-up — applies to all campers

### `campers`
- id, camp_id
- chosen_first_name, chosen_last_name (display identity, required)
- legal_first_name, legal_last_name (DB-only for RegFox cross-reference, required)
- pronouns (optional), email (required)
- track_id (nullable), token (auto-generated, unique, magic link key), timestamps

### `registrations`
- id, camper_id, activity_id, created_at
- Unique constraint on (camper_id, activity_id)
- Insert trigger enforces capacity (over-registration returns DB error)

### `admin_users`
- id, name (nullable), email (**nullable** — leaders can be created without email), role ('admin' or 'leader')
- login_token, login_token_expires_at (48h magic link tokens, used for invites and login)
- timestamps
- Constraint: role IN ('admin', 'leader')

### `staff_notes`
- id, admin_user_id → admin_users (CASCADE DELETE), body, created_by_name, created_at
- Admin-only; never exposed to leader-role users

### Security Policies (RLS)
- Camps, tracks, activities, activity_series, standing_events: publicly readable; only service role can modify (enforced in API routes)
- Campers: can read/edit their own record (token-authenticated); anyone can create (self-registration)
- Admins and leaders can read all campers and registrations via API
- Only admins can write via API (`requireAdminRole` rejects leaders)

## Email Deliverability

- SPF record on `queer.camp`: `v=spf1 include:_spf.google.com ~all` ✓
- DKIM and DMARC: **not yet configured** — would further improve inboxing if issues arise
- SMTP: hello@queer.camp, port 587, STARTTLS

## What's Complete

### Phase 0: Infrastructure ✓
- GitHub org "Queer-camp" under hello@queer.camp
- Supabase project provisioned (East US), schema deployed
- Vercel project connected to GitHub, auto-deploy configured
- Custom domain `scheduler.queer.camp` via CNAME → Vercel

### Phase 1: Camper-facing MVP ✓
- Registration form (chosen name, legal name, pronouns, email, track selection, activity selection)
- Magic link delivery and schedule view (`/schedule?token=`)
- Edit mode on schedule page
- Self-service magic link request (`/get-link`)
- Activity series auto-fill on registration

### Phase 2: Admin Portal ✓
- Admin authentication (magic link invite flow, 30-day session cookies)
- Camp management (create, edit, toggle registration open, set active, archive, clone)
- Track management (create, edit, delete)
- Activity management (create, edit, delete, series linking)
- Standing events (camp-wide time blocks)
- Calendar grid view — color-coded blocks, click-to-create, click-to-edit popovers
- Conflict warnings for standing event overlaps
- Camper management (list, individual view, manual schedule edits, move between camps)
- Roster panel (per track/activity, move/add/remove campers)
- Broadcast messaging (`/admin/broadcast`) — filter by camp/track/activity, preview, send
- CSV export of campers
- Import campers from another camp
- Now dashboard (`/admin/now`) — real-time view of current/upcoming events with rosters
- Printable rosters (`/print/track/[id]`, `/print/activity/[id]`)

### Phase 3: Polish & Role System ✓
- **Leader role** (renamed from "staff") — read-only, enforced in UI and API
- **Leader-specific UI**: Grid-only tab on camp detail, no Campers/Broadcast nav links
- **Organizer dropdown** — populated from admin_users (admins + leaders), stored as name string
- **Staff drawer** on Staff page — click any row to open slide-over with:
  - Editable name, email, role (admin-only)
  - Admin-only timestamped notes (for internal context like event preferences)
  - Assigned events list grouped by camp (active camps first)
- **Leader creation without email** — email optional, can be added later; separate "Save" and "Save & send invite" buttons
- **Per-row invite flow** — "Send invite" button on rows with email; "Add email" inline for rows without
- **Grid day view** — click any day header to drill into single-day full-width view; ← → pagination; "All days" to return
- **Assigned event highlighting** — rainbow box-shadow ring + "You" badge on events where organizer = current user's name
- **Read-only event popovers for leaders** — leaders can click blocks to see details; edit inputs and Save/Delete hidden
- Dark mode throughout

### Migrations Applied (in order)
1. `001_simplify_campers.sql` — drop guardian/emergency fields, split chosen_name
2. `002_admin_login_tokens.sql` — magic-link tokens on admin_users
3. `003_active_camp.sql` — `is_active` flag with single-active trigger
4. `004_archived_camps.sql` — `archived` boolean on camps
5. `005_admin_name.sql` — `name` column on admin_users
6. `006_add_location.sql` — `location` on tracks and activities
7. `007_standing_events.sql` — `standing_events` table
8. `008_organizer_and_standing_location.sql` — `organizer` on all three; `location` on standing_events
9. *(manual)* Rename role 'staff' → 'leader', update check constraint on admin_users
10. *(manual)* `ALTER TABLE admin_users ALTER COLUMN email DROP NOT NULL;`
11. *(manual)* Create `staff_notes` table

## What's Left To Do

### Near-term
- [ ] Late registration handling (clarify with David)
- [ ] Joyful Brutalism visual design (matching queer.camp branding)
- [ ] DKIM + DMARC DNS records

### Future
- [ ] Activity waitlists
- [ ] Analytics dashboard (fill rates, popular activities)
- [ ] Camper self-edit of chosen name / pronouns from schedule page
- [ ] Camper notification when their schedule is affected by an admin change
- [ ] Digital attendance / check-in
- [ ] Sensitive data cleanup reminders for past camps
- [ ] Mobile PWA improvements
- [ ] Audit log of admin actions

## Account Summary

| Service | Account | Notes |
|---------|---------|-------|
| GitHub Org | Queer-camp (hello@queer.camp) | Repo: queer-camp-scheduler |
| Supabase | hello@queer.camp via GitHub OAuth | Project: Queer Camp Scheduler, East US |
| Vercel | Queer-camp GitHub org | Project: queer-camp-scheduler |
| Google Workspace SMTP | hello@queer.camp | Port 587, app-specific password in env vars |
| DNS | queer.camp (managed separately) | CNAME: scheduler → cname.vercel-dns.com |

## Key URLs

- **Production:** https://scheduler.queer.camp
- **GitHub:** https://github.com/Queer-camp/queer-camp-scheduler
- **Vercel:** https://vercel.com (login with GitHub)
- **Supabase:** https://supabase.com (login with hello@queer.camp)
