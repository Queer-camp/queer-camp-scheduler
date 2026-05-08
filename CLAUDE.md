@AGENTS.md

# Queer Camp Scheduler

Workshop scheduling tool for Queer Camp (queer-affirming day camp, Fayetteville AR). Campers register and pay via RegFox separately; this tool is for selecting workshops. RegFox owns all personal/guardian/emergency data — this app stores only what's needed for scheduling.

## Stack
- **Next.js 16** — App Router, TypeScript, Tailwind v4, Turbopack dev server
- **Supabase** — Postgres with RLS, Auth (magic links)
- **Nodemailer** — Google Workspace SMTP (hello@queer.camp, port 587 STARTTLS)
- **Vercel** — hosting (not yet deployed)

## Key Architecture Rules
- Frontend NEVER calls Supabase directly — always through Next.js API routes
- Magic link auth only, no passwords — token stored on camper row, sent via email
- Capacity enforced at DB level (triggers), not application level
- No medical/health/guardian/emergency data stored here (RegFox handles that)
- Display name is always chosen_first_name + chosen_last_name; legal name is DB-only for RegFox cross-referencing

## Camper Identity Fields
- `chosen_first_name`, `chosen_last_name` — required, primary identity used everywhere in UI
- `legal_first_name`, `legal_last_name` — required, never displayed, exists for RegFox lookup only
- `pronouns` — optional
- `email` — required, used for magic link delivery

## Pages
- `/register` — registration form (new campers)
- `/get-link` — request magic link by email (already-registered campers)
- `/schedule?token=` — personalized schedule view + edit mode

## Key Files
- `src/lib/constants.ts` — CAMP_ID (hardcoded for testing, swap for real value)
- `src/lib/supabase.ts` — public client + `createAdminClient()` (service role, server-only)
- `src/lib/email.ts` — `sendScheduleLink()` via Nodemailer
- `src/lib/format.ts` — `formatTime()`, `formatDay()`
- `src/components/WorkshopSlots.tsx` — shared workshop picker UI (used in registration + edit)
- `src/components/RegistrationForm.tsx` — full registration form (client component)
- `src/components/ScheduleView.tsx` — schedule view + edit mode (client component)
- `migrations/` — SQL migrations to run in Supabase SQL Editor

## Env Vars
See `.env.local` (not committed). Template in `.env.local.example`.

## Project Status
See `queer-camp-scheduler-status.md` for full phase breakdown.
