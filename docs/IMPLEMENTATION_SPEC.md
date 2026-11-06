# Personal OS — Technical Implementation Specification

**Version:** 1.0.0  
**Status:** Active Execution  
**Goal:** Deliver the complete Personal OS redesign while preserving all functionality and data integrity.

---

## 1. Architectural Strategy

Personal OS uses Next.js 16 (App Router) with React 19, Tailwind CSS v4, Base UI, and Supabase SSR:

```
                    ┌────────────────────────────┐
                    │      Next.js 16 App        │
                    │   (App Router + Turbopack) │
                    └──────────────┬─────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
┌─────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│   Public / Auth  │      │ Authenticated   │      │ Progressive Web │
│   - /login       │      │   Workspace     │      │   App Layer     │
│   - /register    │      │ - /dashboard    │      │ - manifest.json │
│   - /verify-otp  │      │ - /academics    │      │ - sw.js         │
│   - /reset-pass  │      │ - /productivity │      │ - offline.html  │
└─────────┬────────┘      │ - /finance      │      └─────────────────┘
          │               │ - /calendar ... │
          │               └────────┬────────┘
          │                        │
          └────────────────────────┼────────────────────────┐
                                   │                        │
                          ┌────────▼────────┐      ┌────────▼────────┐
                          │  Supabase Auth  │      │ Supabase RLS DB │
                          │  (SSR Cookies)  │      │  (11 Tablesets) │
                          └─────────────────┘      └─────────────────┘
```

---

## 2. Phased Roadmap & Status

### Phase 0: Audit & Protection (COMPLETED)
- [x] Read root `README.md` and master instructions completely.
- [x] Comprehensive repository audit (`docs/REPOSITORY_AUDIT.md`).
- [x] Baseline execution of tests, typecheck, lint, and production build (100% pass).
- [x] Multi-tenant RLS and database integrity contract established.

### Phase 1: Design System Foundation (IN PROGRESS)
- [x] Design system specification documented (`docs/DESIGN_SYSTEM.md`).
- [ ] Implement warm neutral color tokens (`#F5F4EF` light, `#171A18` dark, `#788D79` sage accents) in `src/app/globals.css`.
- [ ] Align typography and component elevation.
- [ ] Verify light, dark, and system theme transitions with zero initial flash.

### Phase 2: Application Shell & Navigation
- [ ] Refine desktop sidebar with warm neutral styling and active states.
- [ ] Optimize mobile navigation drawer and bottom nav touch targets.
- [ ] Validate responsive layouts across 360px to 1920px viewports.

### Phase 3: Dashboard Command Center
- [ ] Refine greeting, attendance badge, and date banner.
- [ ] Information-dense overview widgets: attendance %, focus minutes today, pending tasks, cashflow summary.
- [ ] Priority tasks, calendar agenda, Pomodoro focus widget.
- [ ] Meaningful empty states with contextual actions.

### Phase 4: Module-by-Module Polish
- [ ] Academics (Attendance derivation, timetable, exams).
- [ ] Productivity (Tasks, subtasks, priorities).
- [ ] Pomodoro (Custom timer, sound/visual cues, session logging).
- [ ] Calendar (Events, reminders, day/week views).
- [ ] Finance (Money Nest native integration, accounts, transactions, bills, EMIs).
- [ ] Travel, Books, Entertainment, Habits & Goals, Notes, Documents.
- [ ] Analytics & Settings.

### Phase 5: PWA & Android Experience
- [ ] Android theme color synchronization (`#F5F4EF` / `#171A18`).
- [ ] Touch targets >= 44px on mobile viewports.
- [ ] Service worker offline caching and fallback validation.

### Phase 6: Final QA & Verification
- [ ] Zero lint warnings, zero type errors.
- [ ] Full regression suite execution.
- [ ] Production build and deployment verification.
