import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { TodayTaskList, type TodayTaskItem } from '@/features/tasks/today-task-list';
import {
  GraduationCap,
  Clock,
  MapPin,
  CalendarDays,
  Timer,
  Play,
  ArrowRight,
} from 'lucide-react';

export const instant = false;

function formatTimeSlot(timeStr: string) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

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
    .select('id, day_of_week, start_time, end_time, classroom, subject:subjects(name, code, color, instructor)')
    .eq('user_id', userId)
    .eq('day_of_week', todayDayOfWeek)
    .order('start_time', { ascending: true });

  // 4. Fetch any class sessions logged for today (to display attendance ground truth)
  const { data: todaySessions } = await supabase
    .from('class_sessions')
    .select('id, timetable_entry_id, status')
    .eq('user_id', userId)
    .eq('session_date', todayDateStr);

  const sessionStatusMap = new Map<string, string>();
  (todaySessions || []).forEach((s) => {
    if (s.timetable_entry_id) {
      sessionStatusMap.set(s.timetable_entry_id, s.status);
    }
  });

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

  const classCount = todayTimetable?.length || 0;

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
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Your daily cockpit &bull; {classCount} class{classCount === 1 ? '' : 'es'} scheduled today
          </p>
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
        {/* Column 1: Present Day Class Schedule */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Today&apos;s Class Schedule</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {classCount} {classCount === 1 ? 'class' : 'classes'}
              </span>
            </div>
            <Link
              href="/academics"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Full Timetable
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {classCount === 0 ? (
            <Card className="border-border bg-card rounded-xl shadow-xs p-6 text-center text-xs text-muted-foreground">
              <CalendarDays className="h-7 w-7 mx-auto text-primary/40 mb-2" />
              <p className="font-medium text-foreground">No classes scheduled for today.</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Enjoy your free time, catch up on reading, or prepare ahead.
              </p>
              <Link
                href="/academics"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'mt-3 text-xs h-7 rounded-lg border-border',
                })}
              >
                View Weekly Schedule
              </Link>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {todayTimetable?.map((slot) => {
                const sub = slot.subject as {
                  name?: string;
                  code?: string;
                  color?: string;
                  instructor?: string;
                } | null;

                const sessionStatus = sessionStatusMap.get(slot.id);

                return (
                  <div
                    key={slot.id}
                    className="p-3.5 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: sub?.color || '#526653' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-foreground truncate">
                            {sub?.name || 'Class Session'}
                          </h3>
                          {sub?.code && (
                            <Badge variant="outline" className="text-[10px] font-mono py-0 border-border">
                              {sub.code}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-1">
                          <div className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>
                              {formatTimeSlot(slot.start_time)} – {formatTimeSlot(slot.end_time)}
                            </span>
                          </div>

                          {slot.classroom && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary" />
                              <span>{slot.classroom}</span>
                            </div>
                          )}

                          {sub?.instructor && (
                            <span className="text-[10px] text-muted-foreground italic truncate">
                              Prof. {sub.instructor}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {sessionStatus ? (
                        <Badge
                          variant={sessionStatus === 'present' ? 'default' : 'secondary'}
                          className="text-[10px] font-mono capitalize"
                        >
                          {sessionStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                          Scheduled
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Present Day To-Do List */}
        <div>
          <TodayTaskList tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
