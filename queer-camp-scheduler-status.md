# Queer Camp Scheduler - Project Status

**Last Updated:** May 7, 2026

## Project Overview

A workshop scheduling tool for Queer Camp, a queer-affirming day camp at a church in Fayetteville, Arkansas. Designed for multi-year use across multiple camps with admin-driven flexibility.

**Important context:** Camper registration and payment are handled separately by RegFox at queercamp.regfox.com/camper-registration-2026. This scheduler is a private, link-based tool. After signing up through RegFox, campers receive a link from the camp admin and self-register in the scheduler to select their workshops.

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
- Schedule email (admin-triggered, one button, sends to all campers in a camp)
- Admin "message all campers" broadcasts (Phase 2)

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
- id, name, start_date, end_date, registration_open, timestamps

### `tracks` (optional, morning)
- id, camp_id, name, description, capacity, start_time, end_time, emoji, timestamps

### `activity_series`
- id, camp_id, name, description, created_at

### `activities` (afternoon, per day-slot)
- id, camp_id, name, description, capacity
- day, start_time, end_time
- emoji, series_id (links to activity_series), timestamps

### `campers`
- id, camp_id
- legal_first_name, legal_last_name, chosen_name, pronouns, email
- guardian_first_name, guardian_last_name, guardian_email, guardian_phone, guardian_relationship
- emergency_same_as_guardian (bool), emergency_first_name, emergency_last_name, emergency_phone, emergency_relationship
- track_id (nullable), token (auto-generated, unique), timestamps

### `registrations`
- id, camper_id, activity_id, created_at
- Unique constraint on (camper_id, activity_id)

### `admin_users`
- id, email, role ('admin' or 'staff'), timestamps

### Security Policies (RLS)
- Camps, tracks, activities, activity_series: publicly readable, only admins can modify
- Campers: can view/edit their own record (when authenticated by email)
- Anyone can create a camper record (for self-registration)
- Admins and staff can view all campers and registrations
- Only admins can modify camper records and admin_users
- Staff role is read-only

## Where We Are Now

**Phase 1 MVP is built and running locally.** All core flows are implemented and pushed to GitHub. End-to-end QA and Vercel deployment are next.

### Schema Note
The campers table was simplified after Phase 0: guardian and emergency contact fields were removed (RegFox owns that data). `chosen_name` was replaced with `chosen_first_name` + `chosen_last_name` (both required). Migration is at `migrations/001_simplify_campers.sql`.

## What's Left to Do

### Immediate Next Session

- [ ] Thorough end-to-end QA:
  - Register a test camper at `/register`
  - Confirm token link works at `/schedule?token=`
  - Test `/get-link` email delivery (SMTP is wired, credentials in .env.local)
  - Test edit mode on schedule page
  - Test "legal name same as chosen" checkbox behavior
  - Test workshop series auto-fill logic
  - Test capacity enforcement (fill a slot, verify others blocked)
- [ ] Deploy to Vercel:
  - Create Vercel account (sign in with Queer-camp GitHub org)
  - Connect repo, set env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NEXT_PUBLIC_APP_URL)
  - Set NEXT_PUBLIC_APP_URL to production domain
  - Verify email links point to production URL

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
- [ ] Deploy to Vercel ← next
- [ ] End-to-end QA ← next

### Phase 2: Admin Portal

- [ ] Admin authentication (magic link with admin_users check)
- [ ] Admin dashboard layout
- [ ] Camp management:
  - Create new camps
  - Edit camp details
  - Toggle registration open/closed
  - Archive past camps
- [ ] Activity management:
  - Create/edit/delete activities
  - Set capacities, days, times, descriptions
  - Link activities into series (multi-part workshops)
- [ ] Track management:
  - Create/edit/delete tracks per camp
- [ ] Camper management:
  - Searchable list of all campers
  - View individual camper details and schedule
  - Manual schedule edits
  - Export camper lists
- [ ] **Send schedules button** - One-click send to all campers in a camp via SMTP
- [ ] **Message all campers** broadcast tool:
  - Compose subject and body (plain text or basic HTML)
  - Filter recipients (all campers, by track, by activity, individuals)
  - Preview before send
  - Confirmation step ("Send to N recipients?")
  - Log of what was sent and to whom
- [ ] RBAC: Admin (full access) vs Staff (read-only) enforcement
- [ ] Manage admin_users (add/remove admins and staff)

### Phase 3: Polish & Advanced Features

- [ ] Late registration handling (clarify meaning with David first)
- [ ] Joyful Brutalism visual design (matching queer.camp branding)
- [ ] Activity waitlists
- [ ] Camp templates ("duplicate from previous camp")
- [ ] Sensitive data cleanup reminders for past camps
- [ ] Analytics dashboard (popular activities, fill rates, etc.)

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
| Vercel | Not yet created | ⏳ Next session |

## Key Project URLs

- Existing production app: https://queer-camp-schedules.web.app
- RegFox registration: https://queercamp.regfox.com/camper-registration-2026
- Future production URL: TBD (likely scheduler.queer.camp or similar)
