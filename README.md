# Queer Camp Scheduler

Activity scheduling tool for Queer Camp (queer-affirming day camp, Fayetteville AR). Live at **https://scheduler.queer.camp**.

Campers register and pay via RegFox; this app handles activity selection, personalized schedule delivery, and day-of admin operations.

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (Postgres + magic-link auth) · Nodemailer (Google Workspace SMTP) · Vercel (auto-deploy from `main`)

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in real values
npm run dev
```

Open http://localhost:3000.

## Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — create/edit/delete everything, manage staff, send broadcasts |
| **Leader** | Read-only — sees Grid tab only on camps, no Campers or Broadcast nav items |

## Project docs

- **`CLAUDE.md`** — architecture, key files, env vars, API conventions (primary reference for AI-assisted development)
- **`queer-camp-scheduler-status.md`** — full phase history, schema reference, what's shipped
- **`SOP.md`** — standard operating procedure for admins and future developers
- **`migrations/`** — numbered SQL migrations, run in order in Supabase SQL Editor

## Recent changes

- **Responsive nav** — hamburger menu on mobile; desktop nav unchanged; menu closes on navigation
- **Activity day ordering** — camper activity selection now always shows days Monday → Sunday
- **Grid day view** — click any day header in the admin grid to drill into a single-day full-width view with ← → pagination and "All days" to return
- **Leader UX** — leaders default to Grid tab, see only assigned events highlighted with a rainbow outline, can click events for read-only details
- **Staff drawer** — click any staff row to view/edit info, add timestamped admin-only notes, and see assigned events
- **Optional email for leaders** — leaders can be created with name only; email and invite sent separately
- **Multi-organizer** — tracks, activities, and standing events now support multiple organizers via a chip picker; migration 009 converted the `organizer` text column to a `text[]` array on all three tables
- **Staff page search + sort** — Staff/Admins page now has a search bar (filters by name or email) and lists members sorted alphabetically by last name
- **Organizer picker search + sort** — organizer dropdown on all event forms is sorted by last name and has an inline search field
- **"Sign Up for Activities" rename** — registration-facing UI updated from "Register" to "Sign Up for Activities" throughout
- **Resources tab** — admins can add up to 4 resource links per camp (title, URL, opens in same/new tab); leaders see them read-only; campers see them as pill buttons on their schedule page below their pronouns
- **Organizer conflict hard-block** — saving any track, activity, or standing event now checks all other events for organizer time+day overlap and blocks the save with a descriptive error if a conflict is found (tracks conflict on any day; activities/standing events only when days intersect)

## Workflow

Solo project. Commit and push directly to `main`. Vercel auto-deploys within ~60 seconds. Run any new SQL migration in the Supabase SQL Editor after the related code lands.

**There is no dev server workflow.** We work directly on prod. Don't start `npm run dev` — just edit, commit, and push.

## Key URLs

| | URL |
|-|-----|
| Production app | https://scheduler.queer.camp |
| Vercel dashboard | https://vercel.com (login with Queer-camp GitHub org) |
| Supabase dashboard | https://supabase.com (login with hello@queer.camp) |
| GitHub repo | https://github.com/Queer-camp/queer-camp-scheduler |
