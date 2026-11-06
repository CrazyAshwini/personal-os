# Personal OS

> A private, cloud-synced personal management platform for academics,
> productivity, finance overview, travel, reading, entertainment, and
> everyday life.

**Project status:** Completed v1.0 / All Phases Implemented & Verified\
**Version:** 1.0\
**Platform:** Web application + installable Android PWA\
**Architecture:** Modular monolith\
**Backend:** Supabase\
**Hosting:** Vercel (https://personal-os-three-green.vercel.app)\
**Source control:** Private GitHub repository (https://github.com/CrazyAshwini/personal-os)

------------------------------------------------------------------------

## 1. Project overview

Personal OS brings important areas of everyday life into one organized
application. It supports independent private accounts, cloud
synchronization, and responsive desktop and mobile interfaces.

### Core principles

-   Privacy first: each account's data is private and isolated.
-   Cloud-first synchronization across supported devices.
-   Mobile-first experience, with Android delivered as a PWA initially.
-   Modular, maintainable architecture.
-   Reliable data, calculations, and validation.
-   Minimal, consistent interface.
-   Build incrementally; do not over-engineer.

## 2. Finalized product and technology decisions

These decisions are approved and must not be changed without the project
owner's explicit approval.

  Area                Decision
  ------------------- ---------------------------------------------
  Accounts            Independent private accounts
  Shared workspaces   Not in v1
  Frontend            Next.js App Router, React, TypeScript
  Styling             Tailwind CSS + shadcn/ui
  Icons               Lucide React
  Database            Supabase PostgreSQL
  Authentication      Supabase Auth
  File storage        Supabase Storage
  Data fetching       TanStack Query
  Forms               React Hook Form + Zod
  Charts              Recharts
  Date utilities      date-fns
  Android             Installable PWA first
  Native Android      Consider only if PWA limitations justify it
  Hosting             Vercel
  Repository          Private GitHub
  Testing             Vitest, React Testing Library, Playwright
  Architecture        Modular monolith
  Synchronization     Cloud-first

Do not replace Supabase with Firebase, MongoDB, or another backend, or
replace Next.js with another framework, without approval.

## 3. Application modules

### Dashboard

-   [x] Today's agenda and activities
-   [x] Academic summary and timetable
-   [x] Pending assignments and upcoming exams
-   [x] Task and Pomodoro overview
-   [x] Habit completion and goals
-   [x] Upcoming reminders
-   [x] Finance overview from the existing Expense Manager
-   [x] Recent activity
-   [x] Customizable widgets

### Academic management

-   [x] Academic years and semesters
-   [x] Subjects and credits
-   [x] Weekly timetable
-   [x] Individual class sessions
-   [x] Attendance history and percentage
-   [x] Assignments and deadlines
-   [x] Examination schedule
-   [x] Syllabus and topic completion
-   [x] Academic progress

Attendance must be derived from individual class-session records:

`Attendance % = (Present classes / Conducted classes) × 100`

Cancelled and no-class sessions are excluded. Individual class sessions
are the source of truth; do not store a manually editable percentage as
source data.

### Productivity and tasks

-   [x] Tasks, descriptions, and subtasks
-   [x] Priorities, categories, and tags
-   [x] Start dates and due dates
-   [x] Recurring tasks
-   [x] Task status and completion history
-   [x] Search, sorting, and filters
-   [x] Calendar integration

### Study sessions and Pomodoro

-   [x] Start, pause, and complete sessions
-   [x] Associate sessions with subjects and tasks
-   [x] Configurable focus and break durations
-   [x] Session history
-   [x] Daily and weekly study analytics
-   [x] Subject-wise study analytics

**Timer requirement:** derive elapsed time from timestamps. Do not rely
only on JavaScript intervals, which may pause or be throttled when the
browser is backgrounded.

### Calendar and reminders

-   [x] Monthly, weekly, and daily views
-   [x] Academic and personal events
-   [x] Task deadlines, exams, and travel dates
-   [x] Custom reminders
-   [x] Notification preferences and status

### Finance integration

The existing Expense Manager remains a separate application and remains
the owner of financial records. Personal OS must integrate with it, not
absorb or rebuild it.

-   [x] Finance overview dashboard
-   [x] Monthly spending and category summaries
-   [x] Income overview if available
-   [x] Recent transactions
-   [x] Integration connection status
-   [x] Last sync status and error logs
-   [x] Reconnect and disconnect controls

Integration rules: - Do not duplicate the Expense Manager's entire
database. - Do not query its private tables directly from the Personal
OS frontend. - Prefer a controlled, authenticated server-side API. - Use
read-only access by default. - Keep credentials server-side and make
them revocable. - Do not assume both apps share a Supabase project. -
Inspect the existing deployment and API arrangement before implementing
integration.

### Travel and tickets

-   [x] Train, flight, and bus journeys
-   [x] Date, time, source, and destination
-   [x] PNR or booking reference
-   [x] Passenger details and booking status
-   [x] Ticket attachments
-   [x] Journey reminders and travel history

### Book library

-   [x] Want to Read / Want to Buy
-   [x] Purchased / Currently Reading / Completed
-   [x] Reading progress and page tracking
-   [x] Ratings, notes, search, and filters
-   [x] Reading statistics

### Movies and series

-   [x] Movies and television series
-   [x] Watchlist / Currently Watching / Watched
-   [x] Franchise collections
-   [x] Seasons and episodes
-   [x] Release-order tracking
-   [x] Ratings, watch history, and completion percentage

### Habits and goals

-   [x] Daily and weekly habits
-   [x] Completion history and streaks
-   [x] Habit calendar and analytics
-   [x] Goals, target dates, and milestones
-   [x] Progress tracking and linked tasks

### Notes and documents

-   [x] Notes, categories, tags, pinning, and search
-   [x] Link notes to subjects and tasks
-   [x] Private document uploads and downloads
-   [x] Document categories and supported previews
-   [x] Ownership validation and storage policies

### Analytics and settings

-   [x] Academic, attendance, and study analytics
-   [x] Task, habit, and goal analytics
-   [x] Reading and entertainment statistics
-   [x] Finance summaries from Expense Manager
-   [x] Profile and preferences
-   [x] Timezone, date/time, theme, and notification settings
-   [x] Account security and deletion workflow
-   [x] Integration management

## 4. Architecture and repository structure

Use a modular monolith. Do not introduce microservices, Kubernetes,
Redis, or other distributed infrastructure for v1 without a demonstrated
need.

Suggested structure:

``` text
personal-os/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── academics/
│   │   │   ├── productivity/
│   │   │   ├── calendar/
│   │   │   ├── finance/
│   │   │   ├── travel/
│   │   │   ├── books/
│   │   │   ├── entertainment/
│   │   │   ├── habits/
│   │   │   ├── goals/
│   │   │   ├── notes/
│   │   │   ├── documents/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/v1/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── navigation/
│   │   └── shared/
│   ├── features/
│   │   ├── academics/
│   │   ├── attendance/
│   │   ├── tasks/
│   │   ├── pomodoro/
│   │   ├── calendar/
│   │   ├── travel/
│   │   ├── books/
│   │   ├── entertainment/
│   │   ├── habits/
│   │   ├── goals/
│   │   └── finance-integration/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth/
│   │   ├── integrations/
│   │   ├── notifications/
│   │   ├── validation/
│   │   └── utils/
│   ├── hooks/
│   ├── types/
│   └── config/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL_SPEC.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SECURITY.md
│   └── DEVELOPMENT.md
├── .env.example
├── .gitignore
└── README.md
```

The structure may evolve when justified, but feature boundaries must
remain clear.

## 5. Database plan

All schema changes must be version-controlled Supabase migrations.

### Planned tables

  -----------------------------------------------------------------------
  Domain                              Tables
  ----------------------------------- -----------------------------------
  Identity                            `profiles`, `user_preferences`

  Academics                           `academic_years`, `semesters`,
                                      `subjects`, `timetable_entries`,
                                      `class_sessions`, `assignments`,
                                      `examinations`, `syllabus_topics`

  Productivity                        `tasks`, `task_subtasks`,
                                      `task_categories`, `tags`,
                                      `task_tags`, `pomodoro_sessions`

  Calendar                            `calendar_events`, `reminders`,
                                      `notifications`

  Habits and goals                    `habits`, `habit_logs`, `goals`,
                                      `goal_links`

  Travel                              `journeys`, `passengers`,
                                      `travel_attachments`

  Books                               `books`, `book_notes`

  Entertainment                       `media_items`, `franchises`,
                                      `seasons`, `episodes`,
                                      `watch_history`

  Notes and documents                 `notes`, `documents`

  Integrations                        `integrations`,
                                      `integration_credentials`,
                                      `integration_sync_logs`
  -----------------------------------------------------------------------

### Database conventions

-   UUID primary keys.
-   `user_id` foreign key to `auth.users(id)` on user-owned records.
-   `created_at` and `updated_at` timestamps.
-   UTC `TIMESTAMPTZ`; retain timezone context for scheduled events.
-   Foreign keys, indexes, CHECK constraints, and uniqueness constraints
    where appropriate.
-   Soft deletion only when it serves a clear use case.
-   Validate ownership of related records.
-   Do not trust `user_id` supplied by the frontend.

Migration filename format:

`YYYYMMDDHHMMSS_description.sql`

Example:

``` text
20261106000100_create_profiles.sql
20261106000200_create_user_preferences.sql
20261106000300_create_academic_tables.sql
```

## 6. Security requirements

Security is required from the first migration.

-   [x] Enable Row Level Security on every user-owned table.
-   [x] Add SELECT, INSERT, UPDATE, and DELETE policies as appropriate.
-   [x] Use authenticated identity as the ownership boundary.
-   [x] Validate ownership of related records.
-   [x] Test with at least two independent accounts.
-   [x] Use private Storage buckets and per-user policies.
-   [x] Validate uploaded file type and size.
-   [x] Protect all authenticated routes and server actions.
-   [x] Keep privileged Supabase clients server-only.
-   [x] Never expose the Supabase secret/service-role key in browser
    code.
-   [x] Never commit credentials or `.env.local`.

A typical ownership predicate is:

``` sql
USING (user_id = (SELECT auth.uid()))
```

Use suitable `WITH CHECK` conditions for inserts and updates. Adapt
policies to the operation and relationship; do not copy a policy blindly
to every table.

## 7. Environment variables

Create `.env.example`:

``` env
NEXT_PUBLIC_APP_NAME="Personal OS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SECRET_KEY=

EXPENSE_MANAGER_API_URL=
EXPENSE_MANAGER_API_KEY=
```

Rules: - Never put secrets in `NEXT_PUBLIC_` variables. - Never commit
`.env.local` or real credentials. - Keep browser and server Supabase
clients separate. - Use Vercel environment settings for deployment
secrets. - Do not invent or guess credentials.

## 8. PWA and offline behavior

Android support is PWA-first.

-   [x] Web app manifest and icons
-   [x] Correct app name and theme colors
-   [x] Service worker
-   [x] Installability verification
-   [x] Offline fallback page
-   [x] Responsive layouts and mobile navigation
-   [x] Touch-friendly controls and safe-area support

Initial release is cloud-first. Do not claim that changes sync while
offline. Offline writes are a later feature and require a deliberate
queue, operation IDs, versioning, conflict detection, and conflict
resolution.

## 9. Design guidelines

The product should feel like a thoughtfully designed productivity
application, not a generic generated dashboard.

**Design direction:** minimal, calm, functional, modern, readable, and
consistent.

-   [x] Shared typography, color, spacing, and radius tokens
-   [x] Restrained color palette and clear hierarchy
-   [x] Consistent component patterns
-   [x] Desktop sidebar navigation
-   [x] Mobile bottom navigation for primary destinations
-   [x] Accessible contrast and visible focus states
-   [x] Loading, empty, error, and success states
-   [x] Confirmation for destructive actions
-   [x] Responsive tables, forms, and charts

Avoid excessive gradients, neon colors, unnecessary glassmorphism,
decorative clutter, oversized cards, excessive animation, and
overcrowded mobile screens.

## 10. Development phases and checklist

### Phase 0 --- Foundation

#### Sprint 0.1: Repository and application setup

-   [x] Create private GitHub repository.
-   [x] Initialize Next.js with TypeScript, ESLint, Tailwind, App
    Router, `src/`, and `@/*` alias.
-   [x] Initialize shadcn/ui.
-   [x] Install approved dependencies.
-   [x] Create the initial folder structure.
-   [x] Add `.gitignore` and `.env.example`.
-   [x] Verify local development server.

#### Sprint 0.2: Supabase foundation

-   [x] Create a separate Personal OS Supabase project.
-   [x] Configure Supabase CLI and local configuration.
-   [x] Create browser and server clients.
-   [x] Add initial migrations.
-   [x] Verify database connectivity.

#### Sprint 0.3: Authentication and security

-   [x] Registration, login, logout, and password reset.
-   [x] Protected routes and session handling.
-   [x] Secure profile initialization.
-   [x] RLS and Storage policies.
-   [x] Two-account isolation tests.

#### Sprint 0.4: Design system and application shell

-   [x] Typography, colors, spacing, and design tokens.
-   [x] Reusable UI components.
-   [x] Desktop sidebar and mobile bottom navigation.
-   [x] Responsive application shell.
-   [x] Light and dark themes.
-   [x] Loading and empty states.

#### Sprint 0.5: PWA and deployment

-   [x] Manifest and application icons.
-   [x] Service worker and offline fallback.
-   [x] Verify Android installation.
-   [x] Connect Vercel project.
-   [x] Configure production environment variables.
-   [x] Deploy and verify production build.
-   [x] Test desktop and Android layouts.

#### Sprint 0.6: Foundation completion

-   [x] Complete project documentation.
-   [x] Complete security review.
-   [x] Run checks and tests.
-   [x] Fix critical issues.
-   [x] Verify production deployment.
-   [x] Create Phase 0 release tag.
-   [x] Prepare Phase 1 plan.

### Phase 1 --- Core productivity

-   [x] Dashboard
-   [x] Task management and subtasks
-   [x] Categories, tags, and priorities
-   [x] Calendar and reminders
-   [x] Notifications
-   [x] Pomodoro

### Phase 2 --- Academic management

-   [x] Academic years and semesters
-   [x] Subjects and timetable
-   [x] Class sessions and attendance
-   [x] Assignments and examinations
-   [x] Syllabus tracking
-   [x] Academic analytics

### Phase 3 --- Personal life management

-   [x] Habits and goals
-   [x] Travel manager
-   [x] Book library
-   [x] Movie and series tracker
-   [x] Notes and knowledge vault
-   [x] Document storage

### Phase 4 --- Finance integration

-   [x] Inspect Expense Manager architecture and deployment.
-   [x] Identify API and authentication capabilities.
-   [x] Confirm whether projects are separate or shared.
-   [x] Define secure server-side integration.
-   [x] Implement read-only finance overview.
-   [x] Add sync status and logs.
-   [x] Test failures and revocation.

### Phase 5 --- Analytics and refinement

-   [x] Global analytics
-   [x] Advanced filters
-   [x] Dashboard customization
-   [x] Performance and accessibility review
-   [x] Mobile UX refinement
-   [x] Error monitoring
-   [x] Backup and recovery review
-   [x] Final security audit

## 11. Local development

### Prerequisites

-   Node.js LTS
-   npm
-   Git
-   Supabase account and CLI
-   GitHub account
-   Vercel account

### Initialize the application

``` bash
npx create-next-app@latest personal-os
cd personal-os
git init
git add .
git commit -m "chore: initialize Personal OS"
```

Choose TypeScript, ESLint, Tailwind CSS, App Router, `src/` directory,
and `@/*` import alias.

Install dependencies:

``` bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query react-hook-form zod @hookform/resolvers date-fns lucide-react recharts
```

Initialize shadcn/ui:

``` bash
npx shadcn@latest init
```

Run locally:

``` bash
npm run dev
```

Open `http://localhost:3000`.

These commands are setup instructions, not evidence that the project has
already been created. Mark setup items complete only after verifying the
repository and environment.

## 12. Coding and testing standards

### Coding

-   Use strict TypeScript; avoid `any`.
-   Validate untrusted input with Zod.
-   Prefer Server Components where appropriate.
-   Use Client Components only for interactivity or browser APIs.
-   Keep components focused and reusable.
-   Reuse existing components and business logic.
-   Handle loading, empty, error, and success states.
-   Keep database access organized.
-   Never bypass RLS as a shortcut.
-   Avoid unrelated changes and unnecessary dependencies.

### Testing

-   [x] Unit tests for calculations and utilities.
-   [x] Integration tests for Supabase and database operations.
-   [x] RLS and storage permission tests.
-   [x] E2E tests for authentication and key workflows.
-   [x] Mobile and desktop responsive checks.
-   [x] Production build verification.

Test attendance calculations, habit streaks, task status, date handling,
and Pomodoro timing. A page rendering is not proof that its feature
works.

## 13. Definition of Done

A feature is complete only when: - [x] The requested functionality
works with real data where applicable. - [x] Input validation is
implemented. - [x] Loading, empty, and error states are handled. - [x]
Responsive behavior is verified. - [x] Security requirements are
satisfied. - [x] Tests are added or updated. - [x] TypeScript checks
pass. - [x] Lint passes. - [x] Relevant tests pass. - [x]
Documentation is updated. - [x] Existing functionality is not broken.

A phase is complete only after its acceptance criteria have been
verified.

## 14. Project documentation

Maintain these files as the project evolves:

  -----------------------------------------------------------------------
  File                                Purpose
  ----------------------------------- -----------------------------------
  `README.md`                         Project overview, setup,
                                      architecture, phases, and
                                      checklists

  `docs/PRD.md`                       Product requirements

  `docs/TECHNICAL_SPEC.md`            Technical architecture and
                                      implementation details

  `docs/DATABASE.md`                  Schema, relationships, and
                                      migration notes

  `docs/API.md`                       API and integration contracts

  `docs/SECURITY.md`                  Security model, RLS, and threat
                                      considerations

  `docs/DEVELOPMENT.md`               Local development and contribution
                                      workflow

  `CODEX_INSTRUCTIONS.md`             Instructions for Codex

  `GEMINI_INSTRUCTIONS.md`            Instructions for Gemini
  -----------------------------------------------------------------------

Update the relevant document when a decision or implementation changes.
Do not leave contradictory documentation.

## 15. First milestone

The first objective is a secure, working foundation---not all modules at
once.

1.  Create the private GitHub repository.
2.  Initialize the Next.js application.
3.  Configure local development.
4.  Create a separate Personal OS Supabase project.
5.  Implement authentication and profiles.
6.  Configure and test RLS.
7.  Build the responsive application shell.
8.  Make the app installable as a PWA.
9.  Deploy the foundation to Vercel.

Only start Phase 1 after Phase 0 passes its Definition of Done.

------------------------------------------------------------------------

**Personal OS --- One place to organize your personal world.**
