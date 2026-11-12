'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { CreateEventDialog } from '@/features/calendar/create-event-dialog';
import { deleteEventAction } from '@/features/calendar/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Trash2,
  CalendarDays,
  CheckSquare,
  Calendar as CalendarIcon,
} from 'lucide-react';

export interface CalendarEventItem {
  id: string;
  title: string;
  description: string | null;
  event_type: 'academic' | 'exam' | 'personal' | 'travel' | 'holiday' | 'other';
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string | null;
  color: string | null;
}

export interface TaskDeadlineItem {
  id: string;
  title: string;
  due_date: string;
  priority: string;
}

interface CalendarViewProps {
  initialEvents: CalendarEventItem[];
  taskDeadlines: TaskDeadlineItem[];
}

export function CalendarView({
  initialEvents,
  taskDeadlines,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return initialEvents;
    return initialEvents.filter((e) => e.event_type === typeFilter);
  }, [initialEvents, typeFilter]);

  // Selected date's events
  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter((e) =>
      isSameDay(new Date(e.start_time), selectedDate)
    );
  }, [filteredEvents, selectedDate]);

  // Selected date's task deadlines
  const selectedDayTasks = useMemo(() => {
    return taskDeadlines.filter((t) =>
      isSameDay(new Date(t.due_date), selectedDate)
    );
  }, [taskDeadlines, selectedDate]);

  const handleDeleteEvent = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      startTransition(async () => {
        await deleteEventAction(id);
      });
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          Calendar & Schedule
        </h1>

        <div className="flex items-center gap-2">
          <CreateEventDialog defaultDate={format(selectedDate, 'yyyy-MM-dd')} />
        </div>
      </div>

      {/* Calendar Controls & Month Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground min-w-[140px]">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="h-8 w-8 rounded-lg cursor-pointer"
            aria-label="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="h-8 w-8 rounded-lg cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs h-8 rounded-lg border-border cursor-pointer"
          >
            Today
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-8 rounded-lg border border-border bg-card px-2.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="academic">Academic Classes</option>
            <option value="exam">Examinations</option>
            <option value="personal">Personal</option>
            <option value="travel">Travel</option>
            <option value="holiday">Holidays</option>
          </select>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <Card className="border-border bg-card rounded-xl shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted text-center">
            {weekDayNames.map((d) => (
              <div key={d} className="py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
            {days.map((day) => {
              const dayEvents = filteredEvents.filter((e) =>
                isSameDay(new Date(e.start_time), day)
              );
              const dayTasks = taskDeadlines.filter((t) =>
                isSameDay(new Date(t.due_date), day)
              );

              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[75px] sm:min-h-[95px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${
                    !isCurrentMonth ? 'opacity-35 bg-muted/20' : 'bg-card'
                  } ${isSelected ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold flex items-center justify-center h-6 w-6 rounded-full ${
                        isCurrentDay
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : 'text-foreground'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {(dayEvents.length > 0 || dayTasks.length > 0) && (
                      <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">
                        {dayEvents.length + dayTasks.length} items
                      </span>
                    )}
                  </div>

                  {/* Day Pills */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white shadow-xs"
                        style={{ backgroundColor: e.color || '#526653' }}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayTasks.slice(0, 1).map((t) => (
                      <div
                        key={t.id}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                      >
                        Due: {t.title}
                      </div>
                    ))}
                    {dayEvents.length + dayTasks.length > 3 && (
                      <span className="text-[9px] text-muted-foreground pl-1">
                        +{dayEvents.length + dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Agenda Detail */}
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">
              Agenda for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </div>
          <CreateEventDialog defaultDate={format(selectedDate, 'yyyy-MM-dd')} />
        </CardHeader>
        <CardContent className="pt-4">
          {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No events or deadlines scheduled for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Events */}
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="h-3 w-3 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: event.color || '#526653' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground">
                          {event.title}
                        </h4>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-border">
                          {event.event_type}
                        </Badge>
                      </div>

                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>
                            {event.is_all_day
                              ? 'All Day'
                              : `${format(new Date(event.start_time), 'h:mm a')} - ${format(
                                  new Date(event.end_time),
                                  'h:mm a'
                                )}`}
                          </span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEvent(event.id)}
                    disabled={isPending}
                    className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    aria-label="Delete Event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              ))}

              {/* Task Deadlines on this day */}
              {selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="text-xs font-medium text-foreground">
                        Assignment Deadline: {task.title}
                      </span>
                      <Badge variant="outline" className="ml-2 text-[10px] uppercase font-mono border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                        {task.priority} Priority
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
