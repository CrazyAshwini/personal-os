import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { CalendarView, type CalendarEventItem, type TaskDeadlineItem } from '@/features/calendar/calendar-view';

export const instant = false;

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch calendar events
  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title, description, event_type, start_time, end_time, is_all_day, location, color')
    .eq('user_id', user?.id || '')
    .order('start_time', { ascending: true });

  // Fetch pending task deadlines to display on the calendar
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, priority')
    .eq('user_id', user?.id || '')
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true });

  const formattedEvents: CalendarEventItem[] = (events || []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    event_type: e.event_type,
    start_time: e.start_time,
    end_time: e.end_time,
    is_all_day: e.is_all_day,
    location: e.location,
    color: e.color,
  }));

  const taskDeadlines: TaskDeadlineItem[] = (tasks || [])
    .filter((t) => t.due_date !== null)
    .map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date as string,
      priority: t.priority,
    }));

  return (
    <CalendarView
      initialEvents={formattedEvents}
      taskDeadlines={taskDeadlines}
    />
  );
}
