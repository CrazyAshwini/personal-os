# Personal OS — Data Architecture & Security Specification

**Version:** 1.0.0  
**Status:** Active  
**Principle:** Treat all personal, academic, financial, and document data as private. Multi-tenant isolation at the database level.

---

## 1. Multi-Tenant Authorization Model

### Authentication & Sessions
- Supabase Auth manages user identities with Email + Password and 6-digit OTP verification.
- Sessions are maintained securely via HTTP-only SSR cookies handled by `@supabase/ssr`.
- Authentication middleware validates session tokens on all `/(app)/*` routes and redirects unauthorized requests to `/login`.

### Row Level Security (RLS)
100% of tables in the `public` schema have Row Level Security enabled.
Every table enforces tenancy isolation:
```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own <table_name>"
  ON public.<table_name>
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```
This guarantees that queries issued by user A can never read, modify, or delete records belonging to user B, even in the event of an application-layer logic defect.

---

## 2. Table Schemas & Relational Integrity

### 1. Identity & Preferences
- `profiles`: Extends `auth.users` with display name, avatar URL, created_at, updated_at.
- `user_preferences`: Stores user configurations (theme, default workspace, notification toggles).

### 2. Core Productivity & Focus
- `tasks`: Title, description, status (`pending`, `completed`), priority (`low`, `medium`, `high`, `urgent`), due date, user_id.
- `task_tags`: Tag definitions linked to users.
- `task_subtasks`: Nested task checklists.
- `pomodoro_sessions`: Session duration, type (`focus`, `short_break`, `long_break`), start/end timestamps.
- `pomodoro_settings`: Focus duration, short break duration, long break duration, auto-start preferences.

### 3. Academics & Timetable
- `academic_terms`: Semesters / academic years.
- `subjects`: Course names, codes, credits, target attendance percentage (default 75%).
- `class_sessions`: Attendance logs (`present`, `absent`, `cancelled`, `no_class`).
- `assignments`: Deadlines, submission status, weightage.
- `exams`: Dates, venues, syllabus notes.

### 4. Native Finance (Money Nest Integration)
- `finance_accounts`: Bank accounts, credit cards, digital wallets, BNPL (with masked suffix, credit limit, billing/due days).
- `finance_transactions`: Expense, income, transfer, bill payment, refund with high-precision Decimal.js calculation.
- `finance_bills`: Recurring utilities and subscriptions with due date and frequency (`weekly`, `monthly`, `quarterly`, `yearly`).
- `finance_fixed_deposits`: Principal, rate, maturity date, maturity amount.
- `finance_loans`: Consumer loans, principal, outstanding, monthly EMI, total and remaining installments.

### 5. Personal Life
- `travel_trips`: Destination, departure date, return date, status, itinerary.
- `books`: Reading list, author, current page, total pages, rating, status (`to_read`, `reading`, `completed`).
- `entertainment_items`: Movies, TV shows, games with status and reviews.
- `habits` & `habit_logs`: Daily habit streaks and completions.
- `goals`: Long-term milestones with progress tracking.
- `notes`: Markdown personal documents.
- `documents`: Document file attachments and category metadata.

---

## 3. Storage Security
- Supabase Storage buckets `avatars` and `documents` have strict folder-level isolation:
  `user_id = (SELECT auth.uid())`.
- Zero public read access on private documents.

---

## 4. Key Security & Secret Protection
- The Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) is strictly confined to server-side scripts or administrative migrations and is never injected into Next.js client bundles or client components.
- Client bundles only access `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
