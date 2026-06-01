# Queer Camp Scheduler — Standard Operating Procedure

This document is for admins and future developers of the Queer Camp Scheduler. It covers how the system works, how to operate it, and how to make changes safely.

---

## 1. System Overview

The Queer Camp Scheduler lives at **https://scheduler.queer.camp**. It is a private, invite-only tool that lets camp leaders set up the schedule and campers pick their activities.

Camper registration and payment happen separately on **RegFox** (queercamp.regfox.com). After a camper registers on RegFox, an admin imports them into the scheduler and sends them a magic link to select their activities.

### What this app does
- Lets admins create camps, tracks, activities, and standing events
- Lets campers pick their activities and view their personalized schedule
- Gives admins a real-time "Now" dashboard and printable rosters for day-of operations
- Sends emails via Google Workspace SMTP (magic links, invites, broadcasts)

### What this app does NOT do
- Handle payment
- Store medical, guardian, or emergency contact information (RegFox owns that)
- Replace RegFox — the two systems are independent

---

## 2. Infrastructure

All three services are connected to the **Queer-camp GitHub organization**, which is owned by **hello@queer.camp**. Access to any service starts with that account.

### GitHub
- **Org:** https://github.com/Queer-camp
- **Repo:** `queer-camp-scheduler`
- The `main` branch is the production branch. Push to `main` = deploy to production.
- No pull request workflow — solo project, commit directly to `main`.

### Vercel (hosting)
- **Login:** Go to https://vercel.com → "Continue with GitHub" → use the Queer-camp org account.
- **Project:** `queer-camp-scheduler`
- Vercel watches the `main` branch. Every push triggers a new deployment automatically (takes ~60 seconds).
- Environment variables are set in Vercel under **Settings → Environment Variables**. They apply to Production and Preview environments.
- The custom domain `scheduler.queer.camp` is configured under **Settings → Domains**.
- If a deployment fails, check the **Deployments** tab in Vercel for build logs.

### Supabase (database)
- **Login:** Go to https://supabase.com → sign in with hello@queer.camp (uses GitHub OAuth).
- **Project:** "Queer Camp Scheduler" (East US region)
- The database is Postgres. All schema changes are made by running SQL in the **SQL Editor** (left sidebar in the Supabase dashboard).
- The **Table Editor** gives a spreadsheet-style view of data — useful for quick lookups but not for schema changes.
- Row Level Security (RLS) is enabled on all tables. The app uses a **service role key** (bypasses RLS) in server-side API routes, never in the browser.

### Google Workspace SMTP (email)
- Emails are sent from **hello@queer.camp** via Google Workspace.
- The SMTP credentials (host, port, user, app-specific password) are in the Vercel environment variables.
- Sending limit: 2,000 emails/day on standard Workspace (more than enough for camp scale).

### DNS
- The `queer.camp` domain DNS is managed separately (not in Vercel or Supabase).
- One CNAME record points `scheduler.queer.camp` → `cname.vercel-dns.com`.
- If the domain ever changes or the CNAME needs updating, change it in the DNS provider and update `NEXT_PUBLIC_APP_URL` in Vercel environment variables.

---

## 3. Environment Variables

These must be set in Vercel (and in `.env.local` for local development). See `.env.local.example` in the repo for the full template.

| Variable | What it is |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe in browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **never expose to browser** |
| `SMTP_HOST` | Google SMTP host (smtp.gmail.com) |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | hello@queer.camp |
| `SMTP_PASS` | App-specific password from Google Workspace |
| `NEXT_PUBLIC_APP_URL` | `https://scheduler.queer.camp` — used in magic link URLs |
| `ADMIN_JWT_SECRET` | Secret used to sign admin session cookies — keep this safe |

**If you change any of these in Vercel**, you must trigger a new deployment for the change to take effect (push any commit, or use the "Redeploy" button in the Vercel dashboard).

---

## 4. Making Code Changes

### Prerequisites
- Node.js 18+
- Access to the GitHub repo
- A `.env.local` file with real credentials (get from another admin)

### Local development
```bash
git clone https://github.com/Queer-camp/queer-camp-scheduler.git
cd queer-camp-scheduler
npm install
cp .env.local.example .env.local  # fill in real values
npm run dev
```

The app runs at http://localhost:3000. The local dev server uses Turbopack for fast reloads.

### Deploying a change
```bash
git add <files>
git commit -m "Description of what changed and why"
git push
```

Vercel picks up the push and deploys automatically. Watch the **Deployments** tab in Vercel to confirm it succeeds.

### Making database schema changes

**Never edit the database schema through the Table Editor UI.** Always write a SQL migration and run it in the SQL Editor. This keeps a record of what changed and in what order.

1. Write the SQL (e.g., `ALTER TABLE campers ADD COLUMN ...`)
2. Add it to `migrations/` as the next numbered file (e.g., `012_your_change.sql`)
3. Run it in the Supabase SQL Editor
4. Push the migration file to GitHub so it's documented in the repo

**Important:** Deploy the code change first, then run the migration — or make sure the code handles both old and new schema gracefully during the transition.

---

## 5. Roles and Permissions

There are two admin roles:

| Role | What they can do |
|------|-----------------|
| **Admin** | Full access — create/edit/delete camps, events, campers; manage staff; send broadcasts; view all data |
| **Leader** | Read-only — can see the schedule grid and staff list; cannot edit anything |

Leaders see a simplified UI: only the Grid tab on camp pages, and no Campers or Broadcast links in the nav.

### Adding a new admin or leader
1. Go to **Staff** in the admin nav.
2. Click **Invite member**.
3. Enter their name. Email is optional — you can add it later.
4. Select their role (Admin or Leader).
5. Click **Save** (creates the record) or **Save & send invite** (creates and emails them a login link).
6. If you saved without email, find their row, click **Add email**, enter it, and click **Save & send invite**.

### Sending a login link to an existing user
- Find the person on the Staff page, click their row to open the drawer.
- Or on the Staff list, click **Send invite** next to their name.

### Removing a staff member
- Click their row → overflow menu → **Remove**. They'll be notified by email if they have one on file.

---

## 6. Annual Camp Setup (New Season)

Each year follow this sequence:

1. **Clone last year's camp** — Go to Camps, find the previous camp, click ⋯ → Clone. This copies all tracks, activities, and series (not campers).
2. **Update dates and names** — Edit the cloned camp's name and dates.
3. **Review events** — Check tracks, activities, and standing events. Edit times, capacities, organizers as needed.
4. **Open registration** — When ready, set the camp to Active and open registration (⋯ menu on the camp).
5. **Import returning campers** — On the camp detail page, use "Import from another camp" to pull in identity records from the previous year. This creates new tokens for each camper; it does not copy their activity selections.
6. **Add new campers** — On the Campers page, use "New camper" or import a CSV.
7. **Send schedule links** — On each camper's detail page, click "Send schedule link." Or use Broadcast to email everyone at once.

---

## 7. Day-of Operations

### Now dashboard
- Go to `/admin/now` to see what's happening right now and what's up next across all active-camp events.
- Rosters are shown per event — useful for checking who should be where.
- Auto-refreshes every 30 seconds.

### Printable rosters
- `/print/track/[id]` — roster for a track with a checkbox column per camp day.
- `/print/activity/[id]` — same for activities.
- Print from the browser (Cmd+P / Ctrl+P). The admin chrome hides itself in print mode.

### Making schedule changes for a camper
- Go to **Campers**, find the camper, click their name.
- From their detail page: change their track, add/remove activities, or move them to a different camp.

---

## 8. Broadcasts

The Broadcast page (`/admin/broadcast`) sends a personalized email to a filtered group of campers.

1. Write a subject and body. Use `{{first_name}}` to personalize.
2. Filter by camp, track, activity, or "all campers + leaders."
3. Click **Preview recipients** to confirm who will receive it.
4. Click **Send** — emails go out immediately via SMTP.

Leaders have read-only access and cannot send broadcasts.

---

## 9. Troubleshooting

### A deployment failed
- Check the **Deployments** tab in Vercel for the error log.
- Common cause: TypeScript type error or missing environment variable.
- Fix the code, push again — Vercel retries automatically.

### Emails aren't being delivered
- Check the Vercel function logs for SMTP errors (Functions tab → filter by the relevant API route).
- Verify the SMTP credentials in Vercel environment variables are still valid.
- Google app-specific passwords can expire or be revoked — generate a new one in Google Workspace.
- Check the SPF record on `queer.camp` is still: `v=spf1 include:_spf.google.com ~all`.

### A camper can't find their schedule link
- Go to their detail page in Campers and click **Send schedule link** to resend it.
- Or they can go to `/get-link` and enter their email to request a new link.

### The database is behaving unexpectedly
- Open the Supabase SQL Editor and query the relevant table directly.
- Check the **Logs** section in Supabase for recent errors.
- RLS policies can cause "permission denied" errors if the wrong client key is used — the app always uses the service role key on the server, so this usually indicates a code bug rather than a config issue.

### A camper gets a capacity error when registering
- This is expected behavior — the database trigger blocks over-registration.
- If a spot needs to be freed up, remove another camper from that activity in the admin portal.

---

## 10. Security Notes

- **`SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_JWT_SECRET`** must never appear in client-side code or be committed to the repo. They live only in `.env.local` (gitignored) and Vercel environment variables.
- Admin sessions are JWT cookies with a 30-day expiry, signed with `ADMIN_JWT_SECRET`. If you suspect a session is compromised, rotate the secret in Vercel — this invalidates all existing admin sessions.
- Magic links expire after 48 hours (admin invites) or are single-use (camper schedule links are persistent tokens, not one-time).
- RLS is enabled on all Supabase tables as a defense-in-depth measure, even though the app already enforces access control at the API route level.

---

## 11. Handoff Checklist

If transferring ownership of this project to a new person:

- [ ] Add them as owner of the **Queer-camp GitHub org**
- [ ] Transfer or share access to **hello@queer.camp** Google Workspace (or invite their email as a Supabase/Vercel collaborator)
- [ ] Share the **SMTP app-specific password** or generate a new one for them
- [ ] Share the **ADMIN_JWT_SECRET** and **SUPABASE_SERVICE_ROLE_KEY** securely (not via email — use a password manager)
- [ ] Add them as an Admin in the app itself (`/admin/admins`)
- [ ] Walk them through this SOP
- [ ] Remove your own access if appropriate
