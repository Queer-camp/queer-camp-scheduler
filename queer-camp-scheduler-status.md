# Queer Camp Scheduler - Project Status

**Last Updated:** May 10, 2026 (end of day)

## Project Overview

An activity scheduling tool for Queer Camp, a queer-affirming day camp at a church in Fayetteville, Arkansas. Designed for multi-year use across multiple camps with admin-driven flexibility.

**Important context:** Camper registration and payment are handled separately by RegFox at queercamp.regfox.com/camper-registration-2026. This scheduler is a private, link-based tool. After signing up through RegFox, campers receive a link from the camp admin and self-register in the scheduler to select their activities.

**Terminology:** Throughout the UI, the user-facing label for the optional sign-up offerings is **Activity**. Internally and in some older docs they may also be called workshops; the canonical term is "activity."

## Tech Stack Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js (App Router, TypeScript) | Built-in API routes, no separate Express server needed, integrates with Vercel |
| Database | Supabase (Postgres) | Modern Firebase alternative, portable, built-in auth, free tier covers our scale |
| Auth | Supabase Auth (magic links) | Email-only, no passwords, built-in to Supabase |
| Email | Google Workspace SMTP via Nodemailer | Org already uses Google Workspace, no new service needed, no DNS work |
| Hosting | Vercel | One-click deploys from GitHub, free tier handles our scale |
| Version Control | GitHub | Standard, free, easy team handoff |

**Estimated monthly cost:** $0. Everything runs on free tiers.

## Architectural Decisions

- **Multi-camp from day one** - Schema supports multiple camps (one-off events, annual camps, etc.)
- **First-come-first-served capacity** (no lottery, ever)
- **Tracks are optional per camp** - Some camps have morning tracks plus afternoon activities, others just have activities
- **Admin sets up everything per camp** - Tracks, capacities, names, descriptions, time slots, all admin-editable. Nothing hardcoded.
- **Self-service registration** - Admin sends link to RegFox-registered campers, campers add themselves to the scheduler. No RegFox integration.
- **Health/medical info NOT stored here** - RegFox handles that, this is strictly for scheduling
- **Linked activities via flexible series table** - Supports 2-part, 3-part, or longer workshop series
- **Backend-mediated everything** - Frontend never talks directly to database, always goes through Next.js API routes
- **Magic link authentication** - No passwords, email-based access for both campers and admins
- **No automatic emails on registration** - Admin manually triggers schedule send when ready
- **Single admin-triggered schedule email** - One button, sends each camper their personalized schedule with magic link

## Email Strategy

The org has a Google Workspace account at hello@queer.camp. We'll use SMTP through Nodemailer rather than Gmail API (simpler, less code).

**SMTP credentials needed from David:**
- Host (likely smtp.gmail.com)
- Port (likely 587)
- Username (hello@queer.camp)
- App-specific password
- Whether SMTP relay is configured (affects sending limits)

**Sending limits:** Regular Workspace sends 2,000/day. SMTP relay sends 10,000/day. Either way, plenty for camp scale.

**Emails the system will send:**
- Magic link for camper to edit registration (self-service request)
- Schedule email (admin-triggered when creating a camper or via "resend link")
- Admin invite emails (with role-aware copy — admin vs staff member)
- Admin removed notification
- **Broadcast messages** (admin-triggered, see `/admin/broadcast`)

**Email deliverability:** SPF record added to `queer.camp` DNS (`v=spf1 include:_spf.google.com ~all`). Without it, outgoing mail from hello@queer.camp lands in spam. DKIM and DMARC are not yet set up — would further improve inboxing if rejection rate becomes an issue.

## What's Complete

### Phase 0: Setup ✓

#### GitHub
- [x] Created GitHub organization "Queer-camp" under hello@queer.camp account
- [x] Personal account added as collaborator/owner

#### Supabase
- [x] Account created under hello@queer.camp
- [x] Project "Queer Camp Scheduler" provisioned (East US region)
- [x] Free tier confirmed
- [x] Security settings configured (Data API enabled, Auto RLS enabled)
- [x] Database password saved

#### Database Schema (All deployed via SQL Editor)
- [x] `camps` table with auto-updating timestamps
- [x] `tracks` table (optional morning sessions)
- [x] `activity_series` table (groups multi-part workshops)
- [x] `activities` table (afternoon sessions per day/time)
- [x] `campers` table with auto-generated 12-character access tokens
- [x] `registrations` table (camper-activity assignments)
- [x] `admin_users` table with admin/staff role distinction
- [x] Database-level capacity enforcement (triggers prevent over-registration)
- [x] Row Level Security policies for all tables
- [x] First admin user added (you)

## Schema Reference

### `camps`
- id, name, start_date, end_date, registration_open, is_active, archived, timestamps
- Trigger enforces only one camp can have `is_active = true` at a time

### `tracks` (optional, morning)
- id, camp_id, name, description, capacity, start_time, end_time
- emoji, location, organizer, timestamps

### `activity_series`
- id, camp_id, name, description, created_at

### `activities` (per day-slot)
- id, camp_id, name, description, capacity
- day (comma-separated day names), start_time, end_time
- emoji, location, organizer, series_id (links to activity_series), timestamps

### `standing_events` (camp-wide blocks: meals, ceremonies, etc.)
- id, camp_id, name, day (comma-separated), start_time, end_time
- emoji, location, organizer, timestamps
- No capacity, no per-camper sign-up — applies to everyone

### `campers`
- id, camp_id
- chosen_first_name, chosen_last_name (display identity, required)
- legal_first_name, legal_last_name (DB-only for RegFox cross-reference, required)
- pronouns, email
- track_id (nullable), token (auto-generated, unique, used in magic links), timestamps

### `registrations`
- id, camper_id, activity_id, created_at
- Unique constraint on (camper_id, activity_id)
- Insert trigger enforces capacity (over-registration returns DB error)

### `admin_users`
- id, name (nullable, set via /admin/profile), email, role ('admin' or 'staff')
- login_token, login_token_expires_at (one-time magic link tokens, also used for invites)
- timestamps

### Security Policies (RLS)
- Camps, tracks, activities, activity_series, standing_events: publicly readable, only admins can modify
- Campers: can view/edit their own record (token-authenticated)
- Anyone can create a camper record (for self-registration)
- Admins and staff can view all campers and registrations
- Only admins (not staff) can mutate via the admin API — enforced in app code via `requireAdminRole`
- Staff role is read-only — UI is currently visible to staff but API rejects writes

## Where We Are Now

**Phase 1 MVP is complete and deployed.** Live at https://scheduler.queer.camp.
**Phase 2 (Admin Portal) is essentially complete** — see the checklist below.
**Phase 3 has started**: clone-camp templates, "Now" dashboard, printable rosters, broadcast messaging, CSV export, and returning-camper import all shipped.

### Schema Note
The campers table was simplified after Phase 0: guardian and emergency contact fields were removed (RegFox owns that data). `chosen_name` was replaced with `chosen_first_name` + `chosen_last_name` (both required). Migration is at `migrations/001_simplify_campers.sql`.

### Migrations applied (in order)
1. `001_simplify_campers.sql` — drop guardian/emergency fields, split chosen_name
2. `002_admin_login_tokens.sql` — magic-link tokens on admin_users
3. `003_active_camp.sql` — `is_active` flag with single-active trigger
4. `004_archived_camps.sql` — `archived` boolean on camps
5. `005_admin_name.sql` — `name` column on admin_users
6. `006_add_location.sql` — `location` on tracks and activities
7. `007_standing_events.sql` — new `standing_events` table
8. `008_organizer_and_standing_location.sql` — `organizer` on all three; `location` on standing_events

## What's Left to Do

### Immediate Next Session

- [ ] Remaining QA (lower priority now that prod is live):
  - Test edit mode on schedule page
  - Test "legal name same as chosen" checkbox behavior
  - Test workshop series auto-fill logic
  - Test capacity enforcement (fill a slot, verify others blocked)

### Phase 1: MVP Build ✓

- [x] Scaffold Next.js app (Next.js 16, TypeScript, Tailwind v4, Turbopack, App Router, src/)
- [x] Push to GitHub repo `queer-camp-scheduler` in the Queer-camp organization
- [x] Connect Next.js to Supabase (supabase-js, env vars, admin + public clients)
- [x] Set up Nodemailer with Google Workspace SMTP
- [x] Build registration form:
  - Chosen name (first + last, required, primary identity)
  - "Legal name same as chosen" checkbox — collapses legal fields, copies on submit
  - Legal name (first + last, required, DB-only for RegFox cross-reference)
  - Pronouns (optional), email (required)
  - Track selection (if tracks exist for the camp)
  - Activity selection per time slot with linked series auto-fill
  - First-come-first-served capacity with "spots left" indicators
  - Confirmation screen showing personal magic link to bookmark
- [x] Build self-service magic link flow (`/get-link`):
  - Camper enters email, API looks up token, sends magic link via SMTP
  - Always returns 200 (doesn't leak whether email is registered)
- [x] Build schedule view (`/schedule?token=`):
  - Token-based URL access, invalid token shows clear error
  - Personalized schedule display by day (track + activities)
  - Edit mode: same workshop picker pre-populated with current selections, delta-based save
  - Print-friendly (action buttons hidden via `print:hidden`)
- [x] Deploy to Vercel — live at https://queer-camp-scheduler.vercel.app
- [x] End-to-end QA (registration, magic link, email delivery confirmed in prod)

### Phase 2: Admin Portal ✓

- [x] Admin authentication (magic link via admin_users + invite emails)
- [x] Admin dashboard layout (top nav: Now, Camps, Campers, Broadcast, Admins)
- [x] Camp management: create, edit, toggle registration, archive, **clone**, set active
- [x] Activity management: create/edit/delete, capacities, days, times, descriptions, location, organizer, series linking
- [x] Track management: create/edit/delete per camp, location, organizer
- [x] Standing events: create/edit/delete camp-wide time blocks (meals, ceremonies)
- [x] Calendar grid view with click-to-create, click-to-edit popovers, color-coded blocks
- [x] Conflict warnings when creating/editing things that overlap a standing event
- [x] Camper management: list, individual edit, manual schedule edits, move between tracks
- [x] Send/resend schedule link (per camper)
- [x] **Broadcast messaging** (`/admin/broadcast`): subject + body, filter by camp/track/activity/team, preview recipients, confirm + send
- [x] RBAC: Admin (full access) vs Staff (read-only) enforced via `requireAdminRole`
- [x] Manage admin_users (invite, remove, role-aware copy)
- [x] Admin profile (`/admin/profile`) — admins edit their own name
- [x] 30-day session cookies (admins stay logged in)

### Phase 3: Polish & Advanced Features

- [x] Camp templates / clone existing camp (copies tracks, activities, series; not campers)
- [x] **Returning campers**: import camper identity rows from a previous camp (new tokens, dedupes by email)
- [x] **CSV export** of all campers in a camp (with track + registered activities)
- [x] **Now dashboard** (`/admin/now`): real-time view of what's happening + up next, with rosters per item
- [x] **Printable rosters** (`/print/track/[id]` and `/print/activity/[id]`) with checkbox column per day for paper attendance
- [x] Schedule view styling overhaul (color-coded item types, location, organizer)
- [x] Rainbow Q favicon
- [ ] Late registration handling (clarify meaning with David first)
- [ ] Joyful Brutalism visual design (matching queer.camp branding)
- [ ] Activity waitlists
- [ ] Sensitive data cleanup reminders for past camps
- [ ] Analytics dashboard (popular activities, fill rates, etc.)
- [ ] Camper notification when their schedule is affected by an admin change
- [ ] Camper self-edit of chosen name / pronouns from schedule page
- [ ] Digital attendance / check-in (tap a camper on Now to mark present)
- [ ] DKIM + DMARC DNS records (further email deliverability)

### Phase 4: Future Considerations

- [ ] Mobile app (PWA likely sufficient)
- [ ] Multi-language support
- [ ] Audit log of admin actions

## Pending Questions for David

- What does "Send Emails if late registration" mean operationally?

## Known Constraints & Notes

- **Multi-camp design from day one** - Slight extra complexity now saves a painful refactor later.
- **No medical/PII duplication with RegFox** - Scheduler stays focused on workshop selection only.
- **Free tier sufficient for years** - Realistic monthly cost is $0.
- **Handoff-ready** - Everything tied to hello@queer.camp account so when you leave, transfer is easy.

## Lessons From AI Studio Attempt

(For context - this project was attempted first in Google AI Studio, then we pivoted to a proper stack. Key lessons:)

- Sandbox dev environments are fundamentally limited for production apps
- Owning the codebase via GitHub from day one is essential for long-term maintainability
- Backend-mediated database access is more secure than direct frontend access
- Database-level security (RLS) is more robust than application-level security
- Multi-camp design from day one is worth the small upfront complexity

## Current Account Setup Summary

| Service | Account | Status |
|---------|---------|--------|
| GitHub Org | Queer-camp (under hello@queer.camp) | ✓ Created |
| Supabase | hello@queer.camp via GitHub | ✓ Project provisioned, schema deployed |
| Google Workspace SMTP | hello@queer.camp | ✓ Credentials in .env.local, wired to Nodemailer |
| Vercel | Queer-camp GitHub org | ✓ Deployed at scheduler.queer.camp |
| DNS (queer.camp) | Managed separately | ✓ CNAME record added for scheduler subdomain |

## Key Project URLs

- **Production app:** https://scheduler.queer.camp
- **Vercel alias:** https://queer-camp-scheduler.vercel.app (still works, but scheduler.queer.camp is canonical)
- RegFox registration: https://queercamp.regfox.com/camper-registration-2026

## DNS Configuration

Domain: `queer.camp` (DNS managed separately from Vercel)

### Custom subdomain for this app

| Type | Name | Value | Notes |
|------|------|-------|-------|
| CNAME | `scheduler` | `cname.vercel-dns.com` | Points scheduler.queer.camp → Vercel |

Vercel also recommends a newer CNAME target (`1f837a1b8db509e3.vercel-dns-017.com`) but the current one works and both are valid per Vercel. Do not add both — CNAME records for the same name must be unique.

The domain is verified in Vercel under the `queer-camp-scheduler` project (Settings → Domains).

### Env var tied to domain

`NEXT_PUBLIC_APP_URL=https://scheduler.queer.camp` — set in Vercel environment variables. This is what builds magic link URLs in all outgoing emails. If the domain ever changes, update this var and redeploy.
