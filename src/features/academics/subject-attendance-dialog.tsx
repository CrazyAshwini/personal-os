'use client';

import React, { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  CalendarDays,
  Check,
  X,
  MinusCircle,
  Sun,
  Trash2,
  Calendar,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  logClassSessionAction,
  updateClassSessionStatusAction,
  deleteClassSessionAction,
  logHolidayAction,
} from '@/features/academics/actions';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];
type ClassSessionRow = Database['public']['Tables']['class_sessions']['Row'];

interface SubjectAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectRow | null;
  sessions: ClassSessionRow[];
}

function formatSessionDate(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return format(d, 'EEE, dd MMM yyyy');
}

export function SubjectAttendanceDialog({
  open,
  onOpenChange,
  subject,
  sessions,
}: SubjectAttendanceDialogProps) {
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionEndDate, setSessionEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [topicCovered, setTopicCovered] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!subject) return null;

  // Filter sessions for this subject, sorted newest first
  const subjectSessions = sessions
    .filter((s) => s.subject_id === subject.id)
    .sort((a, b) => b.session_date.localeCompare(a.session_date));

  // Compute stats
  let presentCount = 0;
  let absentCount = 0;
  let cancelledCount = 0;
  let holidayCount = 0;

  for (const s of subjectSessions) {
    if (s.status === 'present') presentCount++;
    else if (s.status === 'absent') absentCount++;
    else if (s.status === 'cancelled') cancelledCount++;
    else if (s.status === 'no_class') holidayCount++;
  }

  const conductedSessions = presentCount + absentCount;
  const percentage =
    conductedSessions > 0
      ? Math.round((presentCount / conductedSessions) * 10000) / 100
      : 0;

  let marginText = 'No conducted classes';
  if (conductedSessions > 0) {
    if (percentage >= 75) {
      const canMiss = Math.floor((presentCount - 0.75 * conductedSessions) / 0.75);
      marginText = canMiss > 0 ? `Can miss ${canMiss} class${canMiss === 1 ? '' : 'es'}` : 'On 75% threshold';
    } else {
      const needToAttend = Math.ceil((0.75 * conductedSessions - presentCount) / 0.25);
      marginText = `Need ${needToAttend} class${needToAttend === 1 ? '' : 'es'} for 75% target`;
    }
  }

  const handleLogForDate = (status: 'present' | 'absent' | 'cancelled' | 'no_class') => {
    if (!sessionDate) return;
    startTransition(async () => {
      if (status === 'no_class') {
        await logHolidayAction({
          startDate: sessionDate,
          endDate: sessionEndDate || sessionDate,
          subjectId: subject.id,
          title: topicCovered || undefined,
        });
      } else {
        const fromStr = sessionDate;
        const toStr = sessionEndDate || sessionDate;
        if (fromStr === toStr) {
          await logClassSessionAction({
            subjectId: subject.id,
            sessionDate: fromStr,
            status,
            topicCovered: topicCovered || null,
          });
        } else {
          // Log each day in range
          const [sY, sM, sD] = fromStr.split('-').map(Number);
          const [eY, eM, eD] = toStr.split('-').map(Number);
          const start = new Date(sY, sM - 1, sD);
          const end = new Date(eY, eM - 1, eD);
          const effStart = start <= end ? start : end;
          const effEnd = start <= end ? end : start;
          const cur = new Date(effStart);
          while (cur <= effEnd) {
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            const d = String(cur.getDate()).padStart(2, '0');
            await logClassSessionAction({
              subjectId: subject.id,
              sessionDate: `${y}-${m}-${d}`,
              status,
              topicCovered: topicCovered || null,
            });
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
      setTopicCovered('');
    });
  };

  const handleUpdateStatus = (
    sessionId: string,
    newStatus: 'present' | 'absent' | 'cancelled' | 'no_class'
  ) => {
    startTransition(async () => {
      await updateClassSessionStatusAction(sessionId, newStatus);
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    startTransition(async () => {
      await deleteClassSessionAction(sessionId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-background"
                style={{ backgroundColor: subject.color || '#526653' }}
              />
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                  {subject.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  {subject.code && (
                    <Badge variant="outline" className="text-[10px] font-mono py-0 border-border">
                      {subject.code}
                    </Badge>
                  )}
                  {subject.instructor && (
                    <span className="text-[11px] text-muted-foreground italic">
                      Prof. {subject.instructor}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                  conductedSessions === 0
                    ? 'text-foreground'
                    : percentage >= 75
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {conductedSessions > 0 ? `${percentage}%` : '—'}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {marginText}
              </span>
            </div>
          </div>

          <DialogDescription className="sr-only">
            Subject-wise attendance date logs, holiday tracking, and attendance management.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Total Breakdown Bar */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 block font-mono">
                {presentCount}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Attended</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">
              <span className="text-base sm:text-lg font-bold text-rose-700 dark:text-rose-300 block font-mono">
                {absentCount}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Missed</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
              <span className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300 block font-mono">
                {cancelledCount}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Cancelled</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/40">
              <span className="text-base sm:text-lg font-bold text-sky-700 dark:text-sky-300 block font-mono">
                {holidayCount}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Holidays</span>
            </div>
          </div>

          {/* Quick Log for Date Form */}
          <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" />
                Log Attendance for a Date
              </h4>
              <span className="text-[10px] text-muted-foreground font-mono">
                Pick date & choose status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="date-input" className="text-[10px] text-muted-foreground font-medium">
                  From Date *
                </Label>
                <div className="relative">
                  <Input
                    id="date-input"
                    type="date"
                    value={sessionDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSessionDate(val);
                      if (!sessionEndDate || sessionEndDate < val) {
                        setSessionEndDate(val);
                      }
                    }}
                    className="text-xs h-8 rounded-lg pr-8"
                  />
                  <Calendar className="h-3 w-3 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="date-end-input" className="text-[10px] text-muted-foreground font-medium">
                  To Date (for range / holidays)
                </Label>
                <div className="relative">
                  <Input
                    id="date-end-input"
                    type="date"
                    value={sessionEndDate}
                    min={sessionDate}
                    onChange={(e) => setSessionEndDate(e.target.value)}
                    className="text-xs h-8 rounded-lg pr-8"
                  />
                  <Calendar className="h-3 w-3 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="topic-input" className="text-[10px] text-muted-foreground font-medium">
                Topic Covered / Reason (Optional)
              </Label>
              <Input
                id="topic-input"
                type="text"
                placeholder="e.g. Unit 2 MOSFET Scaling or Diwali Break"
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                className="text-xs h-8 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleLogForDate('present')}
                disabled={isPending}
                className="h-7 text-xs rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 font-medium cursor-pointer"
              >
                <Check className="h-3 w-3" />
                <span>+ Attended</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleLogForDate('absent')}
                disabled={isPending}
                className="h-7 text-xs rounded-lg border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 font-medium cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>+ Missed</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleLogForDate('cancelled')}
                disabled={isPending}
                className="h-7 text-xs rounded-lg border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 font-medium cursor-pointer"
              >
                <MinusCircle className="h-3 w-3" />
                <span>+ Cancelled</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleLogForDate('no_class')}
                disabled={isPending}
                className="h-7 text-xs rounded-lg border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 gap-1 font-medium cursor-pointer"
              >
                <Sun className="h-3 w-3" />
                <span>+ Holiday</span>
              </Button>
            </div>
          </div>

          {/* Date-wise Attendance History */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Logged Dates & History ({subjectSessions.length})
              </h4>
              <span className="text-[10px] text-muted-foreground">
                Tap status to change or delete
              </span>
            </div>

            {subjectSessions.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                <CalendarDays className="h-7 w-7 mx-auto text-primary/40 mb-1.5" />
                <p className="font-medium text-foreground">No attendance records logged for this course yet.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Use the quick log buttons above to record dates you attended or missed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {subjectSessions.map((session) => {
                  const isPresent = session.status === 'present';
                  const isAbsent = session.status === 'absent';
                  const isCancelled = session.status === 'cancelled';
                  const isHoliday = session.status === 'no_class';

                  return (
                    <div
                      key={session.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground font-mono">
                            {formatSessionDate(session.session_date)}
                          </span>

                          {/* Current Status Pill */}
                          {isPresent && (
                            <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 font-medium">
                              Attended
                            </Badge>
                          )}
                          {isAbsent && (
                            <Badge className="bg-rose-600 text-white text-[10px] py-0 px-1.5 font-medium">
                              Missed
                            </Badge>
                          )}
                          {isCancelled && (
                            <Badge className="bg-amber-600 text-white text-[10px] py-0 px-1.5 font-medium">
                              Cancelled
                            </Badge>
                          )}
                          {isHoliday && (
                            <Badge className="bg-sky-600 text-white text-[10px] py-0 px-1.5 font-medium">
                              Holiday
                            </Badge>
                          )}
                        </div>

                        {(session.topic_covered || session.notes) && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {session.topic_covered || session.notes}
                          </p>
                        )}
                      </div>

                      {/* Status quick switcher and delete */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(session.id, 'present')}
                            disabled={isPending}
                            title="Mark Attended"
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(session.id, 'absent')}
                            disabled={isPending}
                            title="Mark Missed"
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-600 text-white font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(session.id, 'cancelled')}
                            disabled={isPending}
                            title="Mark Cancelled"
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              isCancelled
                                ? 'bg-amber-600 text-white font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            C
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(session.id, 'no_class')}
                            disabled={isPending}
                            title="Mark Holiday"
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              isHoliday
                                ? 'bg-sky-600 text-white font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            H
                          </button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={isPending}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          title="Delete session"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
