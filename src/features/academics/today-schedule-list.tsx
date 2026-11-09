'use client';

import React, { useState, useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Clock,
  MapPin,
  CalendarDays,
  ArrowRight,
  Check,
  X,
  MinusCircle,
  Sun,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { toggleSlotAttendanceAction } from '@/features/academics/actions';

export interface TodayTimetableSlot {
  id: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
  subject_id: string;
  subject: {
    name?: string;
    code?: string | null;
    color?: string | null;
    instructor?: string | null;
  } | null;
}

interface TodayScheduleListProps {
  slots: TodayTimetableSlot[];
  initialStatuses: Record<string, 'present' | 'absent' | 'cancelled' | 'no_class'>;
  holidayNotes?: Record<string, string>;
  isFullDayHoliday?: boolean;
  holidayTitle?: string | null;
  sessionDate: string;
}

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

export function TodayScheduleList({
  slots,
  initialStatuses,
  holidayNotes = {},
  isFullDayHoliday = false,
  holidayTitle = null,
  sessionDate,
}: TodayScheduleListProps) {
  const [isPending, startTransition] = useTransition();
  const [showSuspended, setShowSuspended] = useState(false);

  const [optimisticStatuses, setOptimisticStatuses] = useOptimistic(
    initialStatuses,
    (
      state,
      {
        slotId,
        status,
      }: {
        slotId: string;
        status: 'present' | 'absent' | 'cancelled' | 'no_class' | null;
      }
    ) => {
      const next = { ...state };
      if (!status) {
        delete next[slotId];
      } else {
        next[slotId] = status;
      }
      return next;
    }
  );

  const handleToggle = (
    slot: TodayTimetableSlot,
    statusToToggle: 'present' | 'absent' | 'cancelled'
  ) => {
    const current = optimisticStatuses[slot.id];
    const nextStatus = current === statusToToggle ? null : statusToToggle;

    startTransition(async () => {
      setOptimisticStatuses({ slotId: slot.id, status: nextStatus });
      await toggleSlotAttendanceAction({
        timetableEntryId: slot.id,
        subjectId: slot.subject_id,
        sessionDate,
        status: statusToToggle,
      });
    });
  };

  const classCount = slots.length;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground tracking-tight">Today&apos;s Class Schedule</h2>
          {isFullDayHoliday ? (
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1 border border-amber-300/50 dark:border-amber-800/40">
              <Sun className="h-3 w-3 text-amber-500" />
              Holiday Active
            </span>
          ) : (
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {classCount} {classCount === 1 ? 'class' : 'classes'}
            </span>
          )}
        </div>
        <Link
          href="/academics"
          className="text-xs sm:text-sm text-primary hover:underline font-semibold inline-flex items-center gap-1 shrink-0"
        >
          Full Timetable
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Case 1: Full Day Academic Holiday */}
      {isFullDayHoliday ? (
        <Card className="border-border bg-card rounded-2xl shadow-xs p-6 sm:p-7 text-center relative overflow-hidden">
          <div className="inline-flex p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-3 shadow-xs">
            <Sun className="h-7 w-7" />
          </div>

          <div className="block">
            <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50 font-bold text-xs mb-2">
              Academic Holiday Active
            </span>
          </div>

          <h3 className="font-bold text-lg sm:text-xl text-foreground tracking-tight">
            {holidayTitle ? `${holidayTitle} — No Classes Today` : 'College Holiday / No Classes Today'}
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            All classes for today are suspended. Academic holidays are excluded from conducted lecture counts, keeping your 75% attendance criteria intact.
          </p>

          {slots.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/70 max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => setShowSuspended(!showSuspended)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>{showSuspended ? 'Hide suspended timetable' : `View suspended classes (${slots.length})`}</span>
                {showSuspended ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showSuspended && (
                <div className="mt-3.5 space-y-2.5 text-left">
                  {slots.map((slot) => {
                    const sub = slot.subject;
                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: sub?.color || '#526653' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground truncate">
                                {sub?.name || 'Class Session'}
                              </span>
                              {sub?.code && (
                                <Badge variant="outline" className="text-[11px] font-mono py-0 px-1.5 border-border">
                                  {sub.code}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatTimeSlot(slot.start_time)} – {formatTimeSlot(slot.end_time)}
                              {slot.classroom ? ` • Room ${slot.classroom}` : ''}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-xs font-mono border-amber-300 dark:border-amber-800 bg-amber-100/60 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 shrink-0 font-semibold"
                        >
                          Suspended
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              href="/academics"
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'text-xs h-8 rounded-xl border-border font-medium',
              })}
            >
              Manage Holidays & Timetable
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </Card>
      ) : classCount === 0 ? (
        /* Case 2: No Classes Scheduled on this weekday */
        <Card className="border-border bg-card rounded-2xl shadow-xs p-8 text-center text-sm text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto text-primary/40 mb-2" />
          <p className="font-bold text-foreground text-sm sm:text-base">No classes scheduled for today.</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enjoy your free time, catch up on reading, or prepare ahead.
          </p>
          <Link
            href="/academics"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'mt-3 text-xs sm:text-sm h-8 rounded-xl border-border font-medium',
            })}
          >
            View Weekly Schedule
          </Link>
        </Card>
      ) : (
        /* Case 3: Regular Day with scheduled slots (may include partial holiday slots) */
        <div className="space-y-3.5">
          {slots.map((slot) => {
            const sub = slot.subject;
            const currentStatus = optimisticStatuses[slot.id];
            const isSlotHoliday = currentStatus === 'no_class';

            return (
              <div
                key={slot.id}
                className={`p-4 rounded-2xl border transition-all ${
                  currentStatus === 'present'
                    ? 'border-emerald-500/30 bg-card shadow-xs'
                    : currentStatus === 'absent'
                    ? 'border-rose-500/30 bg-card shadow-xs'
                    : currentStatus === 'cancelled'
                    ? 'border-amber-500/30 bg-muted/20 opacity-80'
                    : isSlotHoliday
                    ? 'border-amber-300/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20'
                    : 'border-border bg-card shadow-xs hover:border-primary/40'
                }`}
              >
                {/* Class Details Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span
                      className="h-3.5 w-3.5 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: sub?.color || '#526653' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                          {sub?.name || 'Class Session'}
                        </h3>
                        {sub?.code && (
                          <Badge variant="outline" className="text-xs font-mono font-semibold py-0.5 px-2 border-border">
                            {sub.code}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3.5 text-xs sm:text-sm text-muted-foreground mt-1.5">
                        <div className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {formatTimeSlot(slot.start_time)} – {formatTimeSlot(slot.end_time)}
                          </span>
                        </div>

                        {slot.classroom && (
                          <div className="flex items-center gap-1 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span>{slot.classroom}</span>
                          </div>
                        )}

                        {sub?.instructor && (
                          <span className="text-xs sm:text-sm text-muted-foreground italic truncate">
                            Prof. {sub.instructor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 text-right">
                    {currentStatus === 'present' ? (
                      <Badge className="text-xs font-mono font-semibold bg-emerald-600 text-white hover:bg-emerald-600 px-2 py-0.5">
                        Attended
                      </Badge>
                    ) : currentStatus === 'absent' ? (
                      <Badge className="text-xs font-mono font-semibold bg-rose-600 text-white hover:bg-rose-600 px-2 py-0.5">
                        Missed
                      </Badge>
                    ) : currentStatus === 'cancelled' ? (
                      <Badge className="text-xs font-mono font-semibold bg-amber-600 text-white hover:bg-amber-600 px-2 py-0.5">
                        Cancelled
                      </Badge>
                    ) : isSlotHoliday ? (
                      <Badge className="text-xs font-mono font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 flex items-center gap-1">
                        <Sun className="h-3 w-3 text-amber-500" />
                        Holiday
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-mono border-border text-muted-foreground px-2 py-0.5">
                        Scheduled
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bottom Action Area */}
                {isSlotHoliday ? (
                  <div className="pt-3 mt-3 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      {holidayNotes[slot.id] || 'Holiday / No class today'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggle(slot, 'present')}
                      disabled={isPending}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Mark Attended instead
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 pt-3.5 mt-3.5 border-t border-border">
                    {/* 1. Attended Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(slot, 'present')}
                      disabled={isPending}
                      className={`h-9 rounded-xl text-xs font-semibold transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'border border-border bg-background text-muted-foreground hover:text-emerald-700 hover:border-emerald-300 dark:hover:text-emerald-300 dark:hover:border-emerald-800'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      <span>Attended</span>
                    </button>

                    {/* 2. Missed Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(slot, 'absent')}
                      disabled={isPending}
                      className={`h-9 rounded-xl text-xs font-semibold transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentStatus === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'border border-border bg-background text-muted-foreground hover:text-rose-700 hover:border-rose-300 dark:hover:text-rose-300 dark:hover:border-rose-800'
                      }`}
                    >
                      <X className="h-4 w-4" />
                      <span>Missed</span>
                    </button>

                    {/* 3. Cancelled Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(slot, 'cancelled')}
                      disabled={isPending}
                      className={`h-9 rounded-xl text-xs font-semibold transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentStatus === 'cancelled'
                          ? 'bg-amber-600 text-white shadow-xs font-bold'
                          : 'border border-border bg-background text-muted-foreground hover:text-amber-700 hover:border-amber-300 dark:hover:text-amber-300 dark:hover:border-amber-800'
                      }`}
                    >
                      <MinusCircle className="h-4 w-4" />
                      <span>Cancelled</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
