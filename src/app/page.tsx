import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  GraduationCap,
  ShieldCheck,
  Timer,
  Wallet,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
              OS
            </span>
            <span className="font-semibold text-lg tracking-tight">Personal OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 mb-6">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Private, Cloud-Synced & Installable PWA</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl">
          One place to organize your personal world.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
          A calm, focused system for academics, daily productivity, Pomodoro study sessions, habit tracking, and personal management.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="px-8">
              Create Free Account
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="px-8">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 text-left w-full">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <GraduationCap className="h-6 w-6 text-neutral-800 dark:text-neutral-200 mb-3" />
            <h3 className="font-semibold text-base">Academic Management</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Timetables, class sessions, attendance percentage calculation, and assignment deadlines.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <Timer className="h-6 w-6 text-neutral-800 dark:text-neutral-200 mb-3" />
            <h3 className="font-semibold text-base">Study & Pomodoro</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Timestamp-derived focus sessions that never lose track of time when backgrounded.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <CheckCircle className="h-6 w-6 text-neutral-800 dark:text-neutral-200 mb-3" />
            <h3 className="font-semibold text-base">Tasks & Habits</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Organize priorities, recurring duties, and daily consistency streaks.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <Calendar className="h-6 w-6 text-neutral-800 dark:text-neutral-200 mb-3" />
            <h3 className="font-semibold text-base">Calendar & Reminders</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Unified day, week, and month views for events, exams, and milestones.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <Wallet className="h-6 w-6 text-neutral-800 dark:text-neutral-200 mb-3" />
            <h3 className="font-semibold text-base">Personal Finance</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Accounts, credit cards, transactions, bills, EMIs, fixed deposits, and budgets.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <BookOpen className="h-6 w-6 text-neutral-800 dark:text-neutral-200 mb-3" />
            <h3 className="font-semibold text-base">Media, Books & Travel</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Track your reading list, entertainment watchlists, tickets, and journeys.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500">
        Personal OS &bull; Built with privacy, reliability, and precision
      </footer>
    </div>
  );
}
