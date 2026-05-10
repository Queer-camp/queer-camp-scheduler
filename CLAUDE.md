@AGENTS.md

# Queer Camp Scheduler

Activity scheduling tool for Queer Camp (queer-affirming day camp, Fayetteville AR). Campers register and pay via RegFox separately; this tool is for selecting activities. RegFox owns all personal/guardian/emergency data — this app stores only what's needed for scheduling.

Live at **https://scheduler.queer.camp** (Vercel, deployed from `main`).

## Stack
- **Next.js 16** — App Router, TypeScript, Tailwind v4, Turbopack dev server
- **Supabase** — Postgres with RLS, magic-link auth via tokens stored on rows
- **Nodemailer** — Google Workspace SMTP (hello@queer.camp, port 587 STARTTLS)
- **Vercel** — hosting (custom domain `scheduler.queer.camp` via CNAME)

## Key Architecture Rules
- Frontend NEVER calls Supabase directly — always through Next.js API routes
- Magic link auth only, no passwords — token stored on camper row (and on admin_users for one-time login), sent via email
- Capacity enforced at DB level (insert trigger on `registrations`), not application level
- Standing events block all campers (no per-camper sign-up); other items have capacities
- No medical/health/guardian/emergency data stored here (RegFox handles that)
- Display name is always `chosen_first_name + chosen_last_name`; legal name is DB-only for RegFox cross-referencing
- All write API routes use `requireAdminRole` (rejects staff). Read routes use `requireAdmin` (allows staff)

## Camper Identity Fields
- `chosen_first_name`, `chosen_last_name` — required, primary identity used everywhere in UI
- `legal_first_name`, `legal_last_name` — required, never displayed, exists for RegFox lookup only
- `pronouns` — optional
- `email` — required, used for magic link delivery

## Scheduled Item Types
Three kinds of things appear on the calendar grid and on camper schedules:
- **Track** — morning-session group (one per camper, capacity, runs every camp day)
- **Activity** — sign-up offering with day(s), capacity, optional series link
- **Standing event** — camp-wide block (lunch, ceremonies); no sign-up, applies to all campers
All three have: name, emoji, location, organizer, start/end time. Tracks have no `day` field; activities and standing events use comma-separated day names.

## Pages
### Camper-facing
- `/` — redirects to `/register`
- `/register` — registration form
- `/get-link` — request magic link by email
- `/schedule?token=` — personalized schedule view + edit mode

### Admin (`/admin`, requires admin or staff session)
- `/admin` — dashboard
- `/admin/now` — real-time "happening now / up next" view with rosters
- `/admin/camps` — list, create, archive, clone
- `/admin/camps/[id]` — tracks/activities/series/grid/standing tabs, roster panel, CSV export, import campers
- `/admin/campers` — searchable camper list
- `/admin/campers/[id]` — individual camper details + schedule edits
- `/admin/broadcast` — send a personalized email to a filtered group
- `/admin/admins` — invite/remove admins and staff
- `/admin/profile` — edit your own name

### Print (admin-authed, no admin chrome)
- `/print/track/[id]` — printable roster with checkbox column per day
- `/print/activity/[id]` — same for activities

## Key Files
- `src/lib/constants.ts` — CAMP_ID legacy export
- `src/lib/supabase.ts` — public client + `createAdminClient()` (service role, server-only)
- `src/lib/admin-auth.ts` — `requireAdmin`, `requireAdminRole`, `requireAdminFromCookies`
- `src/lib/admin-session.ts` — JWT helpers (30-day expiry)
- `src/lib/email.ts` — `sendScheduleLink`, `sendAdminInvite`, `sendAdminRemoved`, `sendBroadcast`
- `src/lib/format.ts` — `formatTime`, `formatDay`
- `src/lib/conflicts.ts` — `findStandingEventConflicts` for soft-warning UI
- `src/lib/broadcast.ts` — `resolveRecipients` for the broadcast page
- `src/components/ActivitySlots.tsx` — shared activity picker UI (registration + edit)
- `src/components/RegistrationForm.tsx` — full registration form
- `src/components/ScheduleView.tsx` — camper schedule view + edit mode
- `src/components/admin/CampGrid.tsx` — calendar grid with create/edit popovers
- `src/components/admin/NowDashboard.tsx` — real-time dashboard
- `src/components/admin/ConflictWarning.tsx` — small warning banner used in forms
- `src/components/admin/RosterPrint.tsx` — printable roster layout
- `src/app/icon.svg` — rainbow Q favicon
- `migrations/` — SQL migrations to run in Supabase SQL Editor (numbered, run in order)

## Env Vars
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `NEXT_PUBLIC_APP_URL` — base URL for magic links in emails (must be `https://scheduler.queer.camp` in prod)
- `ADMIN_JWT_SECRET` — signs admin session cookies
See `.env.local.example` for the template.

## DNS / Email Deliverability
- `scheduler.queer.camp` → CNAME `cname.vercel-dns.com`
- SPF TXT record on `queer.camp`: `v=spf1 include:_spf.google.com ~all` (required to avoid spam folders)
- DKIM and DMARC are NOT yet configured

## Workflow
- Solo project — commit and push directly to `main`. No PRs. Vercel auto-deploys.
- Run new SQL migrations manually in the Supabase SQL Editor after deploying related code.

## Project Status
See `queer-camp-scheduler-status.md` for full phase breakdown.
