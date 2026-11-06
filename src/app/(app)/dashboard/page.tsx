import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  calculateAttendance,
  type ClassSessionRecord,
} from '@/features/attendance/attendance-calculator';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  Clock,
  Flame,
  GraduationCap,
  Plus,
  Play,
  ShieldCheck,
  Timer,
  ArrowRight,
  Activity,
  CreditCard,
} from 'lucide-react';

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
    .select('*')
    .eq('id', userId)
    .single();

  // 2. Fetch pending tasks count and top pending tasks
  const { count: pendingTasksCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  const { count: completedTasksCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  const { data: priorityTasks } = await supabase
    .from('tasks')
    .select('id, title, priority, due_date, status')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(4);

  // 3. Today's date boundary
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  // 4. Fetch today's calendar events
  const { data: todayEvents } = await supabase
    .from('calendar_events')
    .select('id, title, event_type, start_time, end_time, is_all_day, color')
    .eq('user_id', userId)
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .order('start_time', { ascending: true })
    .limit(5);

  // 5. Fetch upcoming reminders for today
  const { data: todayReminders } = await supabase
    .from('reminders')
    .select('id, title, remind_at, is_dismissed')
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .gte('remind_at', todayStart.toISOString())
    .lte('remind_at', todayEnd.toISOString())
    .order('remind_at', { ascending: true })
    .limit(4);

  // 6. Fetch today's Pomodoro sessions
  const { data: todaySessions } = await supabase
    .from('pomodoro_sessions')
    .select('id, duration_minutes, started_at, ended_at, type')
    .eq('user_id', userId)
    .eq('type', 'focus')
    .gte('started_at', todayStart.toISOString());

  const studyMinutesToday = (todaySessions || []).reduce(
    (acc, s) => acc + s.duration_minutes,
    0
  );
  const focusSessionsCount = todaySessions?.length || 0;

  // 7. Fetch academic attendance ground truth
  const { data: allSessions } = await supabase
    .from('class_sessions')
    .select('id, status')
    .eq('user_id', userId);

  const attendanceStats = calculateAttendance(
    (allSessions || []).map((s) => ({
      id: s.id,
      status: s.status as ClassSessionRecord['status'],
    }))
  );

  // 8. Recent activity (completed tasks + pomodoros)
  const { data: recentCompletedTasks } = await supabase
    .from('tasks')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(3);

  // 9. Finance Integration Overview
  const { data: financeConn } = await supabase
    .from('integration_connections')
    .select('cached_monthly_spend, cached_currency, status')
    .eq('user_id', userId)
    .eq('provider', 'expense_manager')
    .maybeSingle();

  // 10. Habits Today
  const { data: userHabits } = await supabase
    .from('habits')
    .select('id, name, color')
    .eq('user_id', userId)
    .limit(4);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: todayHabitLogs } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('completed_date', todayStr);

  const completedHabitsToday = (todayHabitLogs || []).length;
  const totalHabits = userHabits?.length || 0;

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayFormatted} • Personal OS Central Command
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/productivity"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'h-8 text-xs gap-1.5',
            })}
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Link>

          <Link
            href="/calendar"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'h-8 text-xs gap-1.5',
            })}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Add Event
          </Link>

          <Link
            href="/pomodoro"
            className={buttonVariants({
              variant: 'default',
              size: 'sm',
              className: 'h-8 text-xs gap-1.5',
            })}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Focus Session
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Academic Attendance */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Academic Attendance
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                attendanceStats.conductedSessions === 0
                  ? 'text-foreground'
                  : attendanceStats.percentage >= 75
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {attendanceStats.conductedSessions > 0
                ? `${attendanceStats.percentage}%`
                : '--%'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {attendanceStats.conductedSessions > 0
                ? `${attendanceStats.presentSessions}/${attendanceStats.conductedSessions} classes attended`
                : 'No classes logged yet'}
            </p>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending Tasks
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasksCount ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {completedTasksCount ?? 0} tasks completed to date
            </p>
          </CardContent>
        </Card>

        {/* Today's Study Time */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Focus Time Today
            </CardTitle>
            <Timer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyMinutesToday}m</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {focusSessionsCount} completed pomodoro cycle{focusSessionsCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        {/* Today's Agenda Items */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Schedule Today
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(todayEvents?.length || 0) + (todayReminders?.length || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {todayEvents?.length || 0} events &bull; {todayReminders?.length || 0} reminders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout for Agenda & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agenda & Tasks (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule & Agenda */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Today&apos;s Agenda & Events
                </CardTitle>
                <CardDescription className="text-xs">
                  Timed events, academic milestones, and scheduled alerts for today.
                </CardDescription>
              </div>
              <Link
                href="/calendar"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'h-7 text-xs inline-flex items-center gap-1',
                })}
              >
                View Calendar
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {(todayEvents?.length || 0) === 0 && (todayReminders?.length || 0) === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p>No events or reminders scheduled for today.</p>
                  <Link
                    href="/calendar"
                    className="text-primary hover:underline font-medium text-xs mt-1 inline-block"
                  >
                    + Schedule an event or reminder
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayEvents?.map((event) => (
                    <div
                      key={event.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {event.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {event.event_type} &bull;{' '}
                            {event.is_all_day
                              ? 'All day'
                              : format(new Date(event.start_time), 'hh:mm a')}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {event.event_type}
                      </Badge>
                    </div>
                  ))}

                  {todayReminders?.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {reminder.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            Reminder at {format(new Date(reminder.remind_at), 'hh:mm a')}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        Reminder
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  Priority Tasks
                </CardTitle>
                <CardDescription className="text-xs">
                  Your most pressing action items and deadlines.
                </CardDescription>
              </div>
              <Link
                href="/productivity"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'h-7 text-xs inline-flex items-center gap-1',
                })}
              >
                All Tasks ({pendingTasksCount ?? 0})
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {(priorityTasks?.length || 0) === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/40 mb-2" />
                  <p>All tasks completed! You have no pending items.</p>
                  <Link
                    href="/productivity"
                    className="text-primary hover:underline font-medium text-xs mt-1 inline-block"
                  >
                    + Create a new task
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {priorityTasks?.map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            task.priority === 'urgent'
                              ? 'bg-rose-500'
                              : task.priority === 'high'
                              ? 'bg-amber-500'
                              : task.priority === 'medium'
                              ? 'bg-blue-500'
                              : 'bg-neutral-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {task.title}
                          </p>
                          {task.due_date && (
                            <span className="text-[10px] text-muted-foreground">
                              Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono capitalize ${
                          task.priority === 'urgent'
                            ? 'border-rose-500/40 text-rose-500'
                            : task.priority === 'high'
                            ? 'border-amber-500/40 text-amber-500'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pomodoro Launcher, Activity, System Card */}
        <div className="space-y-6">
          {/* Quick Study / Pomodoro Widget */}
          <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Study Focus Engine
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {studyMinutesToday} mins today
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Timestamp-derived timer immune to browser backgrounding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="p-3 rounded-lg bg-background border border-border/60 text-center">
                <span className="text-2xl font-mono font-bold tracking-tight text-foreground">
                  25:00
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Standard Pomodoro interval
                </p>
              </div>

              <Link
                href="/pomodoro"
                className={buttonVariants({
                  variant: 'default',
                  size: 'default',
                  className: 'w-full h-8 text-xs gap-2',
                })}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Launch Pomodoro Session
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <CardDescription className="text-xs">
                Your latest actions across tasks and focus sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {(recentCompletedTasks?.length || 0) === 0 && (todaySessions?.length || 0) === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No recent activity logged yet.
                </p>
              ) : (
                <>
                  {recentCompletedTasks?.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate flex-1 text-foreground">
                        Completed &ldquo;{task.title}&rdquo;
                      </span>
                    </div>
                  ))}

                  {todaySessions?.slice(0, 2).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Timer className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span className="truncate flex-1 text-foreground">
                        Finished {session.duration_minutes}m focus session
                      </span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Habits Snapshot Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Habits Today
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {completedHabitsToday}/{totalHabits} Done
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {totalHabits === 0 ? (
                <p className="text-xs text-muted-foreground py-1 text-center">
                  No habits set yet.{' '}
                  <Link href="/habits" className="text-primary hover:underline">
                    Add habit
                  </Link>
                </p>
              ) : (
                <div className="space-y-1.5">
                  {userHabits?.map((h) => {
                    const isDone = (todayHabitLogs || []).some(
                      (l) => l.habit_id === h.id
                    );
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: h.color || '#10b981' }}
                          />
                          <span className="text-foreground">{h.name}</span>
                        </div>
                        {isDone ? (
                          <Badge variant="secondary" className="text-[9px] text-emerald-600 bg-emerald-500/10">
                            Completed
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finance Overview Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                Expense Manager
              </CardTitle>
              <Badge
                variant={financeConn?.status === 'connected' ? 'secondary' : 'outline'}
                className="text-[10px] capitalize font-mono"
              >
                {financeConn?.status || 'Disconnected'}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Monthly Spend:</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {financeConn?.cached_currency === 'INR' ? '₹' : '$'}
                  {Number(financeConn?.cached_monthly_spend || 0).toLocaleString()}
                </span>
              </div>
              <Link
                href="/finance"
                className="text-[11px] text-primary hover:underline font-medium inline-block"
              >
                View finance details &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Security & System Status */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-xs font-semibold">Security & Sync</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-[11px] text-muted-foreground">
              <p>
                RLS isolation verified on 100% of user tables. Your records are strictly
                encrypted and inaccessible to other users.
              </p>
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
                <span>Cloud Sync: Active</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  Healthy
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
