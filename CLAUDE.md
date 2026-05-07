@AGENTS.md

# Queer Camp Scheduler

Workshop scheduling tool for Queer Camp (queer-affirming day camp, Fayetteville AR). Campers register and pay via RegFox separately; this tool is for selecting workshops.

## Stack
- **Next.js 16** — App Router, TypeScript, Tailwind v4, Turbopack dev server
- **Supabase** — Postgres with RLS, Auth (magic links)
- **Nodemailer** — Google Workspace SMTP (hello@queer.camp)
- **Vercel** — hosting

## Key Architecture Rules
- Frontend NEVER calls Supabase directly — always through Next.js API routes
- Magic link auth only, no passwords
- Capacity enforced at DB level (triggers), not application level
- No medical/health data stored here (RegFox handles that)

## Project Status
See `queer-camp-scheduler-status.md` for full phase breakdown and pending tasks.

## Env Vars
See `.env.local` (not committed). Template in `.env.local.example`.
