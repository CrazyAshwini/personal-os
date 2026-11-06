# Product Requirements Document (PRD) --- Personal OS

**Version:** 1.0  
**Status:** Approved Foundation (Phase 0)  
**Target Platform:** Responsive Web + Android PWA  

---

## 1. Executive Summary

Personal OS is a private, cloud-synchronized personal operating system designed to unify academics, daily productivity, study sessions, reading, media tracking, travel, and financial summaries into a single cohesive interface.

Unlike fragmented single-purpose tools, Personal OS treats personal life as an interconnected system with privacy-first data isolation, dependable offline fallbacks, and a calm, modern user experience.

---

## 2. Core Principles

1. **Privacy First:** Every user account is completely isolated via PostgreSQL Row Level Security (RLS). Shared workspaces and public sharing are out of scope for v1.
2. **Cloud-First Synchronization:** Changes persist immediately to Supabase Cloud, ensuring multi-device parity across mobile and desktop.
3. **PWA First:** Android support is delivered via a high-performance Progressive Web App (PWA) with standalone display mode and offline fallback.
4. **Domain Correctness:** Business rules (e.g., attendance calculation, Pomodoro timing) must be mathematically sound and derived from ground truth records rather than arbitrary editable states.
5. **Calm, Functional Design:** Avoid flashy visual noise, excessive animations, or cluttered dashboards.

---

## 3. User Personas

- **The University Student / Academic:** Balances lectures, lab sessions, dynamic semester timetables, assignment deadlines, and needs strict percentage tracking for attendance requirements.
- **The Focused Lifelong Learner:** Employs the Pomodoro technique to study, tracks reading progress across books, and logs habit consistency.
- **The Everyday Organizer:** Keeps track of upcoming travel tickets, entertainment watchlists, personal notes, and high-level expense trends.

---

## 4. Module Specifications

### 4.1 Dashboard
- **Purpose:** Daily command center presenting today's agenda and high-level health metrics.
- **Key Elements:**
  - Today's class timetable and upcoming assignments.
  - Overall academic attendance percentage.
  - Pending tasks and priority actions.
  - Quick Pomodoro launcher.
  - Daily habit streak tracker.
  - Monthly spending overview from Expense Manager.

### 4.2 Academic Management
- **Semesters & Years:** Configurable start/end dates and credit allocations.
- **Subjects & Timetable:** Weekly recurring slots with classroom and faculty details.
- **Class Sessions & Attendance:**
  - Ground truth: Individual class sessions recorded as `present`, `absent`, `cancelled`, or `no_class`.
  - Formula: $\text{Attendance } \% = \frac{\text{Present Classes}}{\text{Conducted Classes}} \times 100$
  - Cancelled and no-class sessions are mathematically excluded from conducted totals.
- **Assignments & Exams:** Deadlines, priorities, reminders, and syllabus milestones.

### 4.3 Productivity & Tasks
- **Tasks & Subtasks:** Hierarchical tasks with descriptions, priority levels (Low, Medium, High, Urgent), categories, and tags.
- **Due Dates & Status:** Pending, In Progress, Completed, Archived.
- **Recurring Tasks:** Daily, weekly, monthly cycles.

### 4.4 Study Sessions & Pomodoro
- **Timer Engine:** Derives elapsed time using system timestamps ($\text{Target} - (\text{Now} - \text{Start} - \text{Paused})$).
- **Resilience:** Backgrounding the browser or mobile screen shutoff never drifts or corrupts timer state.
- **Linkage:** Associate focus sessions with subjects or tasks for longitudinal study analytics.

### 4.5 Calendar & Reminders
- **Views:** Day, Week, and Month grids.
- **Aggregated Events:** Combines timetable slots, exam dates, task deadlines, and travel dates.

### 4.6 Finance Overview Integration
- **Separation of Concerns:** Integrates with existing Expense Manager via server-side read-only APIs.
- **Metrics:** Monthly expenditure, category breakdown, recent transactions, sync health status.

### 4.7 Travel & Tickets
- **Journeys:** Train, flight, and bus itineraries with source, destination, dates, and PNR references.
- **Attachments:** Secure, private ticket PDFs and passes stored in Supabase Storage.

### 4.8 Book Library & Entertainment
- **Books:** Want to read, Currently reading, Completed; page tracking and star ratings.
- **Entertainment:** Movies, series, seasons, and episodes with watch history.

### 4.9 Habits & Goals
- **Habits:** Daily and weekly consistency checklists with streak calculations.
- **Goals:** High-level milestones with target completion dates and linked tasks.

### 4.10 Notes & Documents
- **Knowledge Vault:** Markdown notes categorized by subject and tags.
- **Document Storage:** Private uploads with user-folder isolation in Supabase Storage.

---

## 5. Non-Functional Requirements

- **Performance:** Sub-second page loads; Turbopack builds; static pre-rendering where appropriate.
- **Accessibility:** WCAG 2.1 AA compliance; full keyboard navigation; high contrast support.
- **Security:** RLS on all user data; private Storage buckets; encrypted sessions; CSP-compliant proxy.
- **Offline Fallback:** Clear offline status page with automatic retry capability.
