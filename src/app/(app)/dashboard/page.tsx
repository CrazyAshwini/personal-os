import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { TodayTaskList, type TodayTaskItem } from '@/features/tasks/today-task-list';
import { TodayScheduleList, type TodayTimetableSlot } from '@/features/academics/today-schedule-list';
import { Timer, Play, Sun } from 'lucide-react';

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Student';

  // 2. Date computations
  const now = new Date();
  const todayDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const todayDateStr = format(now, 'yyyy-MM-dd');
  const todayFormattedDate = format(now, 'EEEE, MMMM d, yyyy');

  // Greeting based on hour
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // 3. Fetch Today's Classes from Timetable
  const { data: todayTimetable } = await supabase
    .from('timetable_entries')
    .select('id, subject_id, day_of_week, start_time, end_time, classroom, subject:subjects(name, code, color, instructor)')
    .eq('user_id', userId)
    .eq('day_of_week', todayDayOfWeek)
    .order('start_time', { ascending: true });

  // Auto-correct Faculty 'MMM (G4)' -> 'mmm'
  if (todayTimetable) {
    todayTimetable.forEach((slot) => {
      if (
        slot.subject?.instructor &&
        (slot.subject.instructor.trim() === 'MMM (G4)' ||
          slot.subject.instructor.trim() === 'MMM(G4)' ||
          slot.subject.instructor.toLowerCase() === 'mmm (g4)')
      ) {
        slot.subject.instructor = 'mmm';
      }
    });
  }

  // 4. Fetch any class sessions logged for today (to display attendance ground truth and holidays)
  const { data: todaySessions } = await supabase
    .from('class_sessions')
    .select('id, timetable_entry_id, subject_id, status, notes')
    .eq('user_id', userId)
    .eq('session_date', todayDateStr);

  const initialStatuses: Record<string, 'present' | 'absent' | 'cancelled' | 'no_class'> = {};
  const holidayNotes: Record<string, string> = {};

  (todayTimetable || []).forEach((slot) => {
    const matchedSession =
      (todaySessions || []).find((s) => s.timetable_entry_id === slot.id) ||
      (todaySessions || []).find((s) => s.subject_id === slot.subject_id);

    if (matchedSession) {
      initialStatuses[slot.id] = matchedSession.status;
      if (matchedSession.notes) {
        holidayNotes[slot.id] = matchedSession.notes;
      }
    }
  });

  const totalSlotsCount = todayTimetable?.length || 0;
  const noClassCount = Object.values(initialStatuses).filter((st) => st === 'no_class').length;
  const todayHolidaySession = (todaySessions || []).find((s) => s.status === 'no_class');
  const holidaySessionsCount = (todaySessions || []).filter((s) => s.status === 'no_class').length;
  const hasCollegeHoliday = (todaySessions || []).some(
    (s) => s.status === 'no_class' && s.notes?.toLowerCase().includes('holiday')
  );

  const isFullDayHoliday =
    totalSlotsCount > 0
      ? (noClassCount === totalSlotsCount || hasCollegeHoliday || holidaySessionsCount >= totalSlotsCount)
      : Boolean(todayHolidaySession);

  if (isFullDayHoliday && todayTimetable) {
    todayTimetable.forEach((slot) => {
      initialStatuses[slot.id] = 'no_class';
    });
  }

  let holidayTitle: string | null = null;
  if (todayHolidaySession?.notes) {
    holidayTitle = todayHolidaySession.notes.startsWith('Holiday: ')
      ? todayHolidaySession.notes.replace('Holiday: ', '')
      : todayHolidaySession.notes;
  }

  const activeClassCount = totalSlotsCount - (isFullDayHoliday ? totalSlotsCount : noClassCount);

  const timetableSlots: TodayTimetableSlot[] = (todayTimetable || []).map((t) => ({
    id: t.id,
    start_time: t.start_time,
    end_time: t.end_time,
    classroom: t.classroom,
    subject_id: t.subject_id,
    subject: t.subject,
  }));

  // 5. Fetch Today's To-Do List (Pending tasks first, then tasks due today)
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, title, priority, status, due_date')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .order('status', { ascending: false }) // pending before completed
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(8);

  const tasks: TodayTaskItem[] = (tasksData || []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority as TodayTaskItem['priority'],
    status: t.status as TodayTaskItem['status'],
    due_date: t.due_date,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header: Greeting on Left & Aligned Pomodoro Clock on Right */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider block">
            {todayFormattedDate}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {greeting}, {displayName}
          </h1>
          {isFullDayHoliday ? (
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5 flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Academic Holiday today &bull; {holidayTitle || 'No classes scheduled'}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              Your daily cockpit &bull; {activeClassCount} class{activeClassCount === 1 ? '' : 'es'} scheduled today
              {noClassCount > 0 && ` (${noClassCount} on holiday)`}
            </p>
          )}
        </div>

        {/* Mobile: Square Pomodoro Launcher Button aligned with greeting */}
        <Link
          href="/pomodoro"
          className="sm:hidden shrink-0 flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all active:scale-95 text-center group"
          aria-label="Start Pomodoro Focus"
        >
          <div className="flex items-center gap-1 text-primary">
            <Timer className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            <Play className="h-2.5 w-2.5 fill-current" />
          </div>
          <span className="text-xs font-bold font-mono text-foreground mt-0.5 leading-none">
            25:00
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-tight scale-90">
            Focus
          </span>
        </Link>

        {/* PC: Horizontal Button */}
        <Link
          href="/pomodoro"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs shadow-xs hover:bg-primary/90 transition-colors"
        >
          <Timer className="h-4 w-4" />
          <span>Start 25m Focus Session</span>
          <Play className="h-3 w-3 fill-current ml-0.5" />
        </Link>
      </div>

      {/* Main Grid: Mobile Single Column -> PC Two Column Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Present Day Class Schedule with 3 Attendance Buttons */}
        <div>
          <TodayScheduleList
            slots={timetableSlots}
            initialStatuses={initialStatuses}
            holidayNotes={holidayNotes}
            isFullDayHoliday={isFullDayHoliday}
            holidayTitle={holidayTitle}
            sessionDate={todayDateStr}
          />
        </div>

        {/* Column 2: Today's Actionable Tasks */}
        <div>
          <TodayTaskList tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
