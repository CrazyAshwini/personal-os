'use client';

import React, { useOptimistic, useTransition } from 'react';
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
  initialStatuses: Record<string, 'present' | 'absent' | 'cancelled'>;
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
  sessionDate,
}: TodayScheduleListProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticStatuses, setOptimisticStatuses] = useOptimistic(
    initialStatuses,
    (
      state,
      { slotId, status }: { slotId: string; status: 'present' | 'absent' | 'cancelled' | null }
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
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground tracking-tight">Today&apos;s Class Schedule</h2>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {classCount} {classCount === 1 ? 'class' : 'classes'}
          </span>
        </div>
        <Link
          href="/academics"
          className="text-xs sm:text-sm text-primary hover:underline font-semibold inline-flex items-center gap-1"
        >
          Full Timetable
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {classCount === 0 ? (
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
        <div className="space-y-3.5">
          {slots.map((slot) => {
            const sub = slot.subject;
            const currentStatus = optimisticStatuses[slot.id];

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
                    ) : (
                      <Badge variant="outline" className="text-xs font-mono border-border text-muted-foreground px-2 py-0.5">
                        Scheduled
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 3 Attendance Quick-Action Buttons */}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
