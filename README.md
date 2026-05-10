# Queer Camp Scheduler

Activity scheduling tool for Queer Camp (queer-affirming day camp, Fayetteville AR). Live at **https://scheduler.queer.camp**.

Campers register and pay via RegFox; this app is for selecting workshops/activities, viewing personalized schedules, and giving admins day-of operational tools.

## Stack
Next.js 16 (App Router) · Supabase (Postgres + magic-link auth) · Nodemailer (Google Workspace SMTP) · Vercel (deploy from `main`)

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.

## Project docs
- **`CLAUDE.md`** — architecture, key files, env vars, conventions
- **`queer-camp-scheduler-status.md`** — phase tracking + everything that's shipped
- **`migrations/`** — SQL migrations (numbered, run in order in Supabase SQL Editor)

## Workflow
Solo project. Commit and push directly to `main`. Vercel auto-deploys. Run any new SQL migration in the Supabase SQL Editor after the related code lands.
