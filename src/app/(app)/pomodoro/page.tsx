import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PomodoroTimer } from '@/features/pomodoro/pomodoro-timer';
import { PomodoroAnalytics, type PomodoroSessionRecord } from '@/features/pomodoro/pomodoro-analytics';
import { Timer } from 'lucide-react';

export const instant = false;

export default async function PomodoroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user preferences for timer durations
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('pomodoro_work_duration, pomodoro_short_break, pomodoro_long_break')
    .eq('user_id', user?.id || '')
    .single();

  // Fetch pending tasks to allow associating sessions with real tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('user_id', user?.id || '')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Fetch recent pomodoro sessions with joined task title
  const { data: sessions } = await supabase
    .from('pomodoro_sessions')
    .select(`
      id,
      duration_minutes,
      type,
      started_at,
      task:tasks (
        id,
        title
      )
    `)
    .eq('user_id', user?.id || '')
    .order('started_at', { ascending: false })
    .limit(30);

  const formattedSessions: PomodoroSessionRecord[] = (sessions || []).map((s) => ({
    id: s.id,
    duration_minutes: s.duration_minutes,
    type: s.type,
    started_at: s.started_at,
    task: Array.isArray(s.task) ? s.task[0] : s.task,
  }));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Timer className="h-6 w-6 text-primary" />
          Study Sessions & Focus Timer
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Timestamp-derived focus timer with background drift resistance
        </p>
      </div>

      <PomodoroTimer
        tasks={tasks || []}
        focusDurationMinutes={preferences?.pomodoro_work_duration ?? 25}
        shortBreakMinutes={preferences?.pomodoro_short_break ?? 5}
        longBreakMinutes={preferences?.pomodoro_long_break ?? 15}
      />

      <PomodoroAnalytics sessions={formattedSessions} />
    </div>
  );
}
