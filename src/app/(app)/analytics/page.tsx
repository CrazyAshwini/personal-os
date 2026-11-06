import React from 'react';
import { format, subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { AnalyticsView } from '@/features/analytics/analytics-view';
import {
  calculateAttendance,
  type ClassSessionRecord,
} from '@/features/attendance/attendance-calculator';

export const instant = false;

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // 1. Academic attendance stats
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('user_id', userId);

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('id, subject_id, status')
    .eq('user_id', userId);

  const attendanceData = (subjects || []).map((sub) => {
    const subSessions = (sessions || []).filter((s) => s.subject_id === sub.id);
    const stats = calculateAttendance(
      subSessions.map((s) => ({
        id: s.id,
        status: s.status as ClassSessionRecord['status'],
      }))
    );
    return {
      name: sub.name,
      percentage: stats.percentage,
      present: stats.presentSessions,
      conducted: stats.conductedSessions,
    };
  });

  // 2. 7-day focus trend
  const today = new Date();
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    return {
      dateStr: format(d, 'yyyy-MM-dd'),
      label: format(d, 'EEE'),
    };
  });

  const { data: pomodoros } = await supabase
    .from('pomodoro_sessions')
    .select('duration_minutes, started_at')
    .eq('user_id', userId)
    .eq('type', 'focus')
    .gte('started_at', subDays(today, 7).toISOString());

  const focusTrend = past7Days.map((d) => {
    const daySessions = (pomodoros || []).filter((p) =>
      p.started_at.startsWith(d.dateStr)
    );
    const minutes = daySessions.reduce((acc, s) => acc + s.duration_minutes, 0);
    return {
      day: d.label,
      minutes,
    };
  });

  // 3. Task status distribution
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('user_id', userId);

  const pendingCount = (allTasks || []).filter((t) => t.status === 'pending').length;
  const inProgressCount = (allTasks || []).filter((t) => t.status === 'in_progress').length;
  const completedCount = (allTasks || []).filter((t) => t.status === 'completed').length;

  const taskStatusData = [
    { name: 'Completed', value: completedCount, color: '#10b981' },
    { name: 'Pending', value: pendingCount, color: '#f59e0b' },
    { name: 'In Progress', value: inProgressCount, color: '#3b82f6' },
  ];

  // 4. Habit stats (7-day rate)
  const { data: habits } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', userId);

  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('habit_id, completed_date')
    .eq('user_id', userId);

  const habitStats = (habits || []).map((h) => {
    const logsCount = past7Days.filter((d) =>
      (habitLogs || []).some(
        (l) => l.habit_id === h.id && l.completed_date === d.dateStr
      )
    ).length;
    const rate = Math.round((logsCount / 7) * 100);
    return {
      name: h.name,
      rate,
      completions: logsCount,
    };
  });

  // 5. Books count
  const { data: books } = await supabase
    .from('books')
    .select('status, current_page, total_pages')
    .eq('user_id', userId);

  const readingBooks = (books || []).filter((b) => b.status === 'reading').length;
  const completedBooks = (books || []).filter((b) => b.status === 'completed').length;
  const totalPagesRead = (books || []).reduce(
    (acc, b) => acc + (b.current_page || 0),
    0
  );

  // 6. Finance cache
  const { data: financeConn } = await supabase
    .from('integration_connections')
    .select('cached_monthly_spend, cached_currency, cached_category_breakdown')
    .eq('user_id', userId)
    .eq('provider', 'expense_manager')
    .maybeSingle();

  const financeData = {
    monthlySpend: Number(financeConn?.cached_monthly_spend || 0),
    currency: financeConn?.cached_currency || 'INR',
    categories: (financeConn?.cached_category_breakdown || {}) as Record<string, number>,
  };

  return (
    <div className="space-y-6">
      <AnalyticsView
        attendanceData={attendanceData}
        focusTrend={focusTrend}
        taskStatusData={taskStatusData}
        habitStats={habitStats}
        booksCount={{
          reading: readingBooks,
          completed: completedBooks,
          totalPages: totalPagesRead,
        }}
        financeData={financeData}
      />
    </div>
  );
}
