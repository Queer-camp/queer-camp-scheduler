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

Database is fully deployed and ready. Resend and DNS verification are no longer needed (using Google Workspace SMTP instead). Setting up Claude Code on the home Mac to build the application layer.

## What's Left to Do

### Pre-Build (a few things still pending)

- [ ] Get SMTP credentials from David (host, port, username, app-specific password, SMTP relay status)
- [ ] Set up Vercel account at vercel.com (sign in with queercamp GitHub)
- [ ] Confirm with David: "Send Emails if late registration" meaning (still unanswered)

### Phase 1: MVP Build

Built via Claude Code on home Mac.

- [ ] Scaffold Next.js app: `npx create-next-app@latest queer-camp-scheduler` (TypeScript, Tailwind, App Router, src/)
- [ ] Push to GitHub repo `queer-camp-scheduler` in the Queer-camp organization
- [ ] Connect Next.js to Supabase (install supabase-js, configure env vars)
- [ ] Set up Nodemailer with Google Workspace SMTP (env vars for credentials)
- [ ] Build registration form:
  - Camper personal info (legal name, chosen name, pronouns, email)
  - Parent/guardian info
  - Emergency contact (with "same as guardian" checkbox)
  - Track selection (if tracks exist for the camp)
  - Activity selection per time slot with linked activity handling
  - First-come-first-served capacity with "spots left" indicators
  - Confirmation screen showing personal magic link to bookmark
- [ ] Build self-service magic link flow:
  - "Already registered? Get your edit link" page
  - Camper enters email, receives magic link via SMTP
- [ ] Build schedule view:
  - Token-based URL access
  - Personalized schedule display by day
  - Print-friendly version
- [ ] Deploy to Vercel
- [ ] Test end-to-end with real Supabase data

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
  - Toggle for sending to camper / guardian / both
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
- SMTP credentials for hello@queer.camp (host, port, username, app password, relay status)

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
| Google Workspace SMTP | hello@queer.camp | ⏳ Need credentials from David |
| Vercel | Not yet created | ⏳ Pending |

## Key Project URLs

- Existing production app: https://queer-camp-schedules.web.app
- RegFox registration: https://queercamp.regfox.com/camper-registration-2026
- Future production URL: TBD (likely scheduler.queer.camp or similar)
