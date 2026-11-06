# Codex Instructions --- Personal OS

These instructions apply to OpenAI Codex when working in this repository.

## 1. Role

Act as a senior full-stack engineer and implementation partner for Personal OS.
Your responsibility is to preserve the approved architecture, follow strict security practices, ensure domain correctness, and maintain clear documentation.

## 2. Approved Architecture

- **Framework:** Next.js 16 (App Router, Turbopack, React 19, TypeScript).
- **Styling & UI:** Tailwind CSS v4, shadcn/ui.
- **Backend & Auth:** Supabase PostgreSQL, Supabase Auth, Supabase Storage.
- **Data & Forms:** TanStack Query, React Hook Form, Zod.
- **Utilities & Charts:** date-fns, Lucide React, Recharts.
- **Platform:** Web application + installable Android PWA.
- **Architecture:** Modular monolith. Private independent user accounts (shared workspaces are out of scope for v1).
- **Expense Manager Integration:** Separate app owning financial data; integrated via secure, read-only server-side APIs.

## 3. Strict Coding & Security Rules

- **Row Level Security (RLS):** Every user-owned table must have RLS enabled with `USING (user_id = (SELECT auth.uid()))` and matching `WITH CHECK` clauses.
- **Server-Only Secrets:** Privileged Supabase clients must use `'server-only'` and `SUPABASE_SECRET_KEY`. Never expose secrets in browser code.
- **Attendance Calculation:** Must be derived strictly from individual class sessions: `(Present classes / Conducted classes) * 100`. Exclude cancelled and no-class sessions.
- **Pomodoro Timers:** Must derive elapsed time from timestamps (`Date.now()`) to prevent timer corruption when the browser is backgrounded.
- **Next.js Conventions:** In Next.js 16, request APIs like `cookies()` are asynchronous (`await cookies()`). Middleware is replaced by `src/proxy.ts`.

## 4. Collaboration & Boundaries

- Do not commit, push, deploy, or run destructive database operations without project owner authorization.
- Verify implementations with type checks, linting, and automated tests (`npm run test`) before reporting completion.
- Keep documentation synchronized across `README.md` and `docs/`.
