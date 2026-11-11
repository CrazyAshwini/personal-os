'use client';

import React, { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  BookOpen,
  CalendarDays,
  Trash2,
  Check,
  X,
  MinusCircle,
  Sun,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  calculateAttendance,
  calculateSafeBunkMargin,
  type ClassSessionRecord,
} from '@/features/attendance/attendance-calculator';
import {
  deleteTimetableEntryAction,
  toggleSyllabusTopicAction,
  logClassSessionAction,
} from '@/features/academics/actions';
import { CreateSubjectDialog } from '@/features/academics/create-subject-dialog';
import { LogSessionDialog } from '@/features/academics/log-session-dialog';
import { CreateTimetableEntryDialog } from '@/features/academics/create-timetable-entry-dialog';
import { SubjectAttendanceDialog } from '@/features/academics/subject-attendance-dialog';
import { LogHolidayDialog } from '@/features/academics/log-holiday-dialog';
import { EditSubjectDialog } from '@/features/academics/edit-subject-dialog';
import { SafeBunkCalculatorDialog } from '@/features/academics/safe-bunk-calculator-dialog';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];
type TimetableRow = Database['public']['Tables']['timetable_entries']['Row'] & {
  subject?: SubjectRow | null;
};
type ClassSessionRow = Database['public']['Tables']['class_sessions']['Row'] & {
  subject?: SubjectRow | null;
};
type AssignmentRow = Database['public']['Tables']['assignments']['Row'] & {
  subject?: SubjectRow | null;
};
type ExaminationRow = Database['public']['Tables']['examinations']['Row'] & {
  subject?: SubjectRow | null;
};
type SyllabusTopicRow = Database['public']['Tables']['syllabus_topics']['Row'] & {
  subject?: SubjectRow | null;
};

interface AcademicOverviewProps {
  subjects: SubjectRow[];
  timetable: TimetableRow[];
  sessions: ClassSessionRow[];
  assignments: AssignmentRow[];
  examinations: ExaminationRow[];
  syllabusTopics: SyllabusTopicRow[];
}

const DAY_MOTTO: Record<number, string> = {
  1: 'New week, same goals',
  2: 'Keep going',
  3: 'Halfway there',
  4: 'Consistent today, successful tomorrow',
  5: 'Finish strong',
};

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

function DayTimetableTable({
  dayIdx,
  dayName,
  motto,
  slots,
  isToday,
  isHolidayToday,
  holidayTitle,
  onDelete,
  disabled,
}: {
  dayIdx: number;
  dayName: string;
  motto?: string;
  slots: TimetableRow[];
  isToday: boolean;
  isHolidayToday?: boolean;
  holidayTitle?: string | null;
  onDelete: (id: string) => void;
  disabled?: boolean;
}) {
  const morningSlots = slots.filter((s) => s.start_time < '13:00:00');
  const afternoonSlots = slots.filter((s) => s.start_time >= '13:00:00');

  const THEME_STYLES: Record<
    number,
    { header: string; th: string; border: string; accentText: string }
  > = {
    1: {
      // Monday (Rose)
      header: 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 border-rose-200 dark:border-rose-900/40',
      th: 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-800/80 dark:text-rose-300/80',
      border: 'border-rose-200/80 dark:border-rose-900/40',
      accentText: 'text-rose-700 dark:text-rose-300',
    },
    2: {
      // Tuesday (Amber)
      header: 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 border-amber-200 dark:border-amber-900/40',
      th: 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-800/80 dark:text-amber-300/80',
      border: 'border-amber-200/80 dark:border-amber-900/40',
      accentText: 'text-amber-700 dark:text-amber-300',
    },
    3: {
      // Wednesday (Emerald)
      header: 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 border-emerald-200 dark:border-emerald-900/40',
      th: 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800/80 dark:text-emerald-300/80',
      border: 'border-emerald-200/80 dark:border-emerald-900/40',
      accentText: 'text-emerald-700 dark:text-emerald-300',
    },
    4: {
      // Thursday (Sky)
      header: 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-950 dark:text-sky-100 border-sky-200 dark:border-sky-900/40',
      th: 'bg-sky-50/50 dark:bg-sky-950/20 text-sky-800/80 dark:text-sky-300/80',
      border: 'border-sky-200/80 dark:border-sky-900/40',
      accentText: 'text-sky-700 dark:text-sky-300',
    },
    5: {
      // Friday (Purple)
      header: 'bg-purple-50/80 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100 border-purple-200 dark:border-purple-900/40',
      th: 'bg-purple-50/50 dark:bg-purple-950/20 text-purple-800/80 dark:text-purple-300/80',
      border: 'border-purple-200/80 dark:border-purple-900/40',
      accentText: 'text-purple-700 dark:text-purple-300',
    },
  };

  const theme = THEME_STYLES[dayIdx] || {
    header: 'bg-muted/80 text-foreground border-border',
    th: 'bg-muted/40 text-muted-foreground',
    border: 'border-border',
    accentText: 'text-primary',
  };

  const renderSlotMobileCard = (slot: TimetableRow) => {
    const sub = slot.subject;
    return (
      <div
        key={slot.id}
        className="p-3.5 border-b border-border/50 last:border-b-0 space-y-2 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-3 w-3 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: sub?.color || '#526653' }}
            />
            <div className="min-w-0">
              <span className="font-bold text-sm text-foreground block truncate">
                {sub?.name || 'Class Session'}
              </span>
              {sub?.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground font-semibold inline-block mt-0.5">
                  {sub.code}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDelete(slot.id)}
            disabled={disabled}
            className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg cursor-pointer shrink-0 active:scale-95"
            title="Delete class"
            aria-label="Delete class"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 font-mono font-bold text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              {formatTimeSlot(slot.start_time)} – {formatTimeSlot(slot.end_time)}
            </span>
          </div>

          {slot.classroom && (
            <div className="flex items-center gap-1 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-muted/80 font-bold text-foreground text-[11px]">
                Room {slot.classroom}
              </span>
            </div>
          )}

          {sub?.instructor && (
            <span className="italic text-muted-foreground truncate">
              Prof. {sub.instructor}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderSlotRow = (slot: TimetableRow) => {
    const sub = slot.subject;
    return (
      <tr
        key={slot.id}
        className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-b-0"
      >
        {/* Time */}
        <td className="py-3.5 px-4 font-mono text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
          {formatTimeSlot(slot.start_time)} – {formatTimeSlot(slot.end_time)}
        </td>

        {/* Subject Code */}
        <td className="py-3.5 px-4 font-mono text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
          {sub?.code ? (
            <span className="px-2 py-0.5 rounded border border-border bg-muted/60 font-bold">
              {sub.code}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>

        {/* Subject */}
        <td className="py-3.5 px-4 min-w-[200px]">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: sub?.color || '#526653' }}
            />
            <span className="font-bold text-sm sm:text-base text-foreground">
              {sub?.name || 'Class Session'}
            </span>
          </div>
        </td>

        {/* Room */}
        <td className="py-3.5 px-4 text-center font-mono text-xs whitespace-nowrap">
          {slot.classroom ? (
            <span className="px-2.5 py-1 rounded-lg bg-muted/80 font-bold text-foreground text-xs sm:text-sm">
              {slot.classroom}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>

        {/* Faculty */}
        <td className="py-3.5 px-4 text-right font-medium text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
          {sub?.instructor || '—'}
        </td>

        {/* Delete Action */}
        <td className="py-3.5 pr-4 pl-1 text-center w-10">
          <button
            type="button"
            onClick={() => onDelete(slot.id)}
            disabled={disabled}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg cursor-pointer"
            title="Delete class"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div
      className={`rounded-2xl border ${theme.border} bg-card overflow-hidden shadow-xs transition-all ${
        isToday ? 'ring-2 ring-primary/40 shadow-sm' : ''
      }`}
    >
      {/* Table Day Header */}
      <div className={`py-3 px-4 border-b ${theme.header} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">{dayName}</h3>
          {motto && (
            <span className="text-xs sm:text-sm opacity-85 italic hidden sm:inline">
              • “{motto}”
            </span>
          )}
          {isToday && (
            <Badge className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              Today
            </Badge>
          )}
          {isToday && isHolidayToday && (
            <Badge variant="outline" className="border-amber-300 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <Sun className="h-3 w-3 text-amber-500" />
              {holidayTitle ? `Holiday: ${holidayTitle}` : 'Holiday Active'}
            </Badge>
          )}
        </div>
        <span className="font-mono text-xs sm:text-sm opacity-90 font-medium">
          {slots.length} {slots.length === 1 ? 'class' : 'classes'}
        </span>
      </div>

      {/* Holiday Active Alert inside today's table */}
      {isToday && isHolidayToday && (
        <div className="mx-4 my-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
            <Sun className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              All {slots.length} classes suspended today for <strong>{holidayTitle || 'Academic Holiday'}</strong> (Preserved from 75% attendance criteria).
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-amber-300 dark:border-amber-700 bg-amber-100/60 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold shrink-0"
          >
            Suspended
          </Badge>
        </div>
      )}

      {/* Mobile Card Feed View */}
      <div className="sm:hidden divide-y divide-border/50">
        {morningSlots.map(renderSlotMobileCard)}

        {/* Lunch Break Row */}
        <div className="bg-muted/30 border-y border-dashed border-border/80 py-2.5 px-4 text-center text-xs font-bold tracking-wider uppercase text-muted-foreground">
          ☕ Lunch Break &bull; 1:00 – 2:30 PM
        </div>

        {afternoonSlots.map(renderSlotMobileCard)}
      </div>

      {/* Desktop Spreadsheet Table */}
      <div className="hidden sm:block overflow-x-auto scrollbar-none">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className={`border-b ${theme.th} text-xs uppercase font-mono font-bold tracking-wider`}>
              <th className="py-3 px-4 w-[170px]">Time</th>
              <th className="py-3 px-4 w-[130px]">Code</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4 text-center w-[140px]">Class No. (Room)</th>
              <th className="py-3 px-4 text-right w-[150px]">Faculty</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {morningSlots.map(renderSlotRow)}

            {/* Lunch Break Row */}
            <tr className="bg-muted/25 border-y border-dashed border-border/80 text-muted-foreground">
              <td className="py-2.5 px-4 font-mono text-xs font-semibold whitespace-nowrap text-muted-foreground">
                1:00 – 2:30 PM
              </td>
              <td colSpan={5} className="py-2.5 px-4 text-center text-xs font-bold tracking-wider uppercase opacity-85">
                ☕ L U N C H &nbsp; B R E A K
              </td>
            </tr>

            {afternoonSlots.map(renderSlotRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectsAtAGlance({ subjects }: { subjects: SubjectRow[] }) {
  const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="py-3 px-4 border-b border-border bg-muted/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base text-foreground tracking-tight">
            SUBJECTS AT A GLANCE
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-muted-foreground font-medium">
          <span>{subjects.length} Courses</span>
          {totalCredits > 0 && (
            <>
              <span>•</span>
              <span className="font-semibold text-foreground">{totalCredits} Total Credits</span>
            </>
          )}
        </div>
      </div>

      {/* Subject List Table */}
      <div className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs uppercase font-mono font-bold text-muted-foreground">
              <th className="py-3 px-4 w-[130px]">Code</th>
              <th className="py-3 px-4">Subject Name</th>
              <th className="py-3 px-4 text-center w-[120px]">Credits</th>
              <th className="py-3 px-4 text-right w-[180px]">Faculty</th>
              <th className="py-3 pr-4 pl-2 text-center w-12">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                  No courses added yet.
                </td>
              </tr>
            ) : (
              subjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
                    {sub.code || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color || '#526653' }}
                      />
                      <span className="font-bold text-sm sm:text-base text-foreground">
                        {sub.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs sm:text-sm font-semibold whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {sub.credits ?? 3} {sub.credits === 1 ? 'Credit' : 'Credits'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs sm:text-sm text-muted-foreground font-mono whitespace-nowrap font-medium">
                    {sub.instructor || '—'}
                  </td>
                  <td className="py-3 pr-4 pl-2 text-center">
                    <EditSubjectDialog subject={sub} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3.5 border-t border-border bg-muted/20 text-center text-xs sm:text-sm text-muted-foreground italic">
        “Small steps every day lead to big results.”
      </div>
    </div>
  );
}

export function AcademicOverview({
  subjects,
  timetable,
  sessions,
  syllabusTopics,
}: AcademicOverviewProps) {
  const [selectedSubjectForDialog, setSelectedSubjectForDialog] = useState<SubjectRow | null>(null);
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 1. Calculate overall attendance
  const overallStats = calculateAttendance(
    sessions.map((s) => ({ id: s.id, status: s.status as ClassSessionRecord['status'] }))
  );

  // 2. Subject-wise attendance calculation map
  const subjectStats = subjects.map((sub) => {
    const subSessions = sessions.filter((s) => s.subject_id === sub.id);
    const stats = calculateAttendance(
      subSessions.map((s) => ({ id: s.id, status: s.status as ClassSessionRecord['status'] }))
    );

    let presentCount = 0;
    let absentCount = 0;
    let cancelledCount = 0;
    let holidayCount = 0;

    for (const s of subSessions) {
      if (s.status === 'present') presentCount++;
      else if (s.status === 'absent') absentCount++;
      else if (s.status === 'cancelled') cancelledCount++;
      else if (s.status === 'no_class') holidayCount++;
    }

    // Margin calculation for 75% target using calculateSafeBunkMargin
    const bunkAnalysis = calculateSafeBunkMargin(stats.presentSessions, stats.conductedSessions, 75);
    const marginText = bunkAnalysis.statusMessage;

    return {
      subject: sub,
      stats,
      bunkAnalysis,
      presentCount,
      absentCount,
      cancelledCount,
      holidayCount,
      marginText,
    };
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayHolidaySession = sessions.find(
    (s) => s.session_date === todayStr && s.status === 'no_class'
  );
  const isTodayHoliday = Boolean(todayHolidaySession);
  let todayHolidayTitle: string | null = null;
  if (todayHolidaySession?.notes) {
    todayHolidayTitle = todayHolidaySession.notes.startsWith('Holiday: ')
      ? todayHolidaySession.notes.replace('Holiday: ', '')
      : todayHolidaySession.notes;
  }

  const handleQuickLog = (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled' | 'no_class'
  ) => {
    startTransition(async () => {
      await logClassSessionAction({
        subjectId,
        sessionDate: todayStr,
        status,
        toggleIfSame: true,
      });
    });
  };

  const handleOpenSubjectDialog = (subject: SubjectRow) => {
    setSelectedSubjectForDialog(subject);
    setIsSubjectDialogOpen(true);
  };

  const handleDeleteTimetableEntry = (id: string) => {
    startTransition(async () => {
      await deleteTimetableEntryAction(id);
    });
  };

  const handleToggleTopic = (topicId: string, current: boolean) => {
    startTransition(async () => {
      await toggleSyllabusTopicAction(topicId, !current);
    });
  };

  const currentDayIndex = new Date().getDay();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="h-7 w-7 text-primary" />
            Academic Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your daily class timetable, 75% attendance engine, and curriculum syllabus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <CreateSubjectDialog />
          {subjects.length > 0 && (
            <>
              <CreateTimetableEntryDialog subjects={subjects} />
              <LogSessionDialog subjects={subjects} />
            </>
          )}
        </div>
      </div>

      {/* 3-Pillar Tabbed Interface */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="bg-card border border-border p-1.5 rounded-2xl shadow-xs w-full sm:w-auto grid grid-cols-3 sm:inline-flex gap-1">
          <TabsTrigger value="schedule" className="text-xs sm:text-sm gap-1 sm:gap-2 rounded-xl font-semibold cursor-pointer py-2 px-1.5 sm:px-3.5">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">Class </span>
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs sm:text-sm gap-1 sm:gap-2 rounded-xl font-semibold cursor-pointer py-2 px-1.5 sm:px-3.5">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Attendance</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold">({overallStats.percentage}%)</span>
          </TabsTrigger>
          <TabsTrigger value="syllabus" className="text-xs sm:text-sm gap-1 sm:gap-2 rounded-xl font-semibold cursor-pointer py-2 px-1.5 sm:px-3.5">
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Syllabus</span>
            <span className="hidden sm:inline text-xs font-mono font-bold">({syllabusTopics.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* PILLAR 1: CLASS SCHEDULE & TIMETABLE (Weekly Sheet)     */}
        {/* ======================================================== */}
        <TabsContent value="schedule" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  M.Tech (SO) I Semester Time Table
                </h2>
                <Badge variant="outline" className="text-xs font-mono font-semibold border-primary/30 text-primary bg-primary/10 px-2 py-0.5">
                  {timetable.length} Lectures
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Weekly schedule tables with Time, Subject, Class No. (Room), and Faculty.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {subjects.length > 0 && (
                <>
                  <LogHolidayDialog subjects={subjects} sessions={sessions} />
                  <CreateTimetableEntryDialog subjects={subjects} />
                </>
              )}
            </div>
          </div>

          {/* Academic Holiday Active Alert Banner */}
          {isTodayHoliday && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <Sun className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="font-medium text-amber-900 dark:text-amber-200">
                  <strong className="font-bold">Academic Holiday Active Today:</strong>{' '}
                  {todayHolidayTitle ? `${todayHolidayTitle} (Classes suspended)` : 'All lectures today are suspended and preserved from attendance criteria.'}
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 shrink-0 hidden sm:inline">
                No attendance penalty
              </span>
            </div>
          )}

          {/* Grid of Day Tables - 1 Day Per Row */}
          {timetable.length === 0 ? (
            <Card className="border-border bg-card rounded-2xl shadow-xs p-10 text-center text-sm text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto text-primary/40 mb-3" />
              <p className="font-bold text-base text-foreground">No classes scheduled in your timetable.</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Add lecture timeslots to populate your weekly academic routine.
              </p>
              {subjects.length > 0 && (
                <div className="mt-4">
                  <CreateTimetableEntryDialog subjects={subjects} />
                </div>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* 1. MONDAY */}
              <DayTimetableTable
                dayIdx={1}
                dayName="MONDAY"
                motto={DAY_MOTTO[1]}
                slots={timetable.filter((t) => t.day_of_week === 1)}
                isToday={currentDayIndex === 1}
                isHolidayToday={isTodayHoliday}
                holidayTitle={todayHolidayTitle}
                onDelete={handleDeleteTimetableEntry}
                disabled={isPending}
              />

              {/* 2. TUESDAY */}
              <DayTimetableTable
                dayIdx={2}
                dayName="TUESDAY"
                motto={DAY_MOTTO[2]}
                slots={timetable.filter((t) => t.day_of_week === 2)}
                isToday={currentDayIndex === 2}
                isHolidayToday={isTodayHoliday}
                holidayTitle={todayHolidayTitle}
                onDelete={handleDeleteTimetableEntry}
                disabled={isPending}
              />

              {/* 3. WEDNESDAY */}
              <DayTimetableTable
                dayIdx={3}
                dayName="WEDNESDAY"
                motto={DAY_MOTTO[3]}
                slots={timetable.filter((t) => t.day_of_week === 3)}
                isToday={currentDayIndex === 3}
                isHolidayToday={isTodayHoliday}
                holidayTitle={todayHolidayTitle}
                onDelete={handleDeleteTimetableEntry}
                disabled={isPending}
              />

              {/* 4. THURSDAY */}
              <DayTimetableTable
                dayIdx={4}
                dayName="THURSDAY"
                motto={DAY_MOTTO[4]}
                slots={timetable.filter((t) => t.day_of_week === 4)}
                isToday={currentDayIndex === 4}
                isHolidayToday={isTodayHoliday}
                holidayTitle={todayHolidayTitle}
                onDelete={handleDeleteTimetableEntry}
                disabled={isPending}
              />

              {/* 5. FRIDAY */}
              <DayTimetableTable
                dayIdx={5}
                dayName="FRIDAY"
                motto={DAY_MOTTO[5]}
                slots={timetable.filter((t) => t.day_of_week === 5)}
                isToday={currentDayIndex === 5}
                isHolidayToday={isTodayHoliday}
                holidayTitle={todayHolidayTitle}
                onDelete={handleDeleteTimetableEntry}
                disabled={isPending}
              />

              {/* 6. SUBJECTS AT A GLANCE */}
              <SubjectsAtAGlance subjects={subjects} />
            </div>
          )}
        </TabsContent>

        {/* ======================================================== */}
        {/* PILLAR 2: ATTENDANCE TRACKER (75% ENGINE & QUICK LOGS)   */}
        {/* ======================================================== */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Cumulative Attendance Hero Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="sm:col-span-1 border-border bg-card rounded-2xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Total Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-extrabold tracking-tight font-mono ${
                      overallStats.percentage >= 75
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : overallStats.conductedSessions === 0
                        ? 'text-foreground'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {overallStats.percentage}%
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground font-mono font-medium">
                    Target: 75%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  Derived from {overallStats.conductedSessions} conducted lectures
                </p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-3 border-border bg-card rounded-2xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  Attendance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 block font-mono">
                    {overallStats.presentSessions}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5 block">Attended</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">
                  <span className="text-2xl font-bold text-rose-700 dark:text-rose-300 block font-mono">
                    {overallStats.absentSessions}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5 block">Missed</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
                  <span className="text-2xl font-bold text-amber-700 dark:text-amber-300 block font-mono">
                    {overallStats.cancelledSessions}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5 block">Cancelled</span>
                </div>
                <div className="p-3 rounded-xl bg-muted border border-border">
                  <span className="text-2xl font-bold text-foreground block font-mono">
                    {overallStats.totalSessions}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5 block">Total Logged</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Attendance Breakdown Cards */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Course Attendance & Date Logs
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Tap any subject to view date-wise records, change status, or log past classes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <SafeBunkCalculatorDialog subjects={subjects} sessions={sessions} />
                <LogHolidayDialog subjects={subjects} sessions={sessions} />
                <LogSessionDialog subjects={subjects} />
              </div>
            </div>

            {subjectStats.length === 0 ? (
              <Card className="border-border bg-card rounded-2xl shadow-xs p-10 text-center text-sm text-muted-foreground">
                <GraduationCap className="h-10 w-10 mx-auto text-primary/40 mb-3" />
                <p className="font-bold text-base text-foreground">No academic courses enrolled.</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Add your semester courses to start tracking attendance and 75% thresholds.
                </p>
                <div className="mt-4">
                  <CreateSubjectDialog />
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {subjectStats.map(
                  ({
                    subject,
                    stats,
                    presentCount,
                    absentCount,
                    cancelledCount,
                    holidayCount,
                    marginText,
                  }) => {
                    const isSafe = stats.conductedSessions === 0 || stats.percentage >= 75;
                    const todaySession = sessions.find(
                      (s) => s.subject_id === subject.id && s.session_date === todayStr
                    );
                    const todayStatus = todaySession?.status;

                    return (
                      <Card
                        key={subject.id}
                        onClick={() => handleOpenSubjectDialog(subject)}
                        className="border-border bg-card rounded-2xl shadow-xs hover:border-primary/50 transition-all p-4 sm:p-5 cursor-pointer group overflow-hidden"
                        title="Tap to view date-wise attendance"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* 1. Left Section: Subject Info */}
                          <div className="flex items-start gap-3.5 lg:w-[300px] shrink-0 min-w-0">
                            <span
                              className="h-4 w-4 rounded-full shrink-0 ring-2 ring-background mt-1"
                              style={{ backgroundColor: subject.color || '#526653' }}
                            />
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                {subject.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {subject.code && (
                                  <Badge variant="outline" className="text-xs font-mono font-semibold py-0.5 px-2 border-border">
                                    {subject.code}
                                  </Badge>
                                )}
                                <span className="text-xs font-mono font-medium text-muted-foreground">
                                  {subject.credits ?? 3} {subject.credits === 1 ? 'Credit' : 'Credits'}
                                </span>
                                {subject.instructor && (
                                  <span className="text-xs sm:text-sm text-muted-foreground italic truncate">
                                    • Prof. {subject.instructor}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSubjectDialog(subject);
                                  }}
                                  className="text-xs sm:text-sm font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  <span>View Dates</span>
                                </button>
                                <span className="text-muted-foreground text-xs">&bull;</span>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <SafeBunkCalculatorDialog
                                    subjects={subjects}
                                    sessions={sessions}
                                    initialSubjectId={subject.id}
                                    trigger={
                                      <span className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer inline-flex items-center gap-1">
                                        <Calculator className="h-3.5 w-3.5 text-primary" />
                                        <span>Bunk Calc</span>
                                      </span>
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Middle Section: Attendance Stats Chips & Progress */}
                          <div className="flex-1 min-w-0 space-y-2.5">
                            {/* Breakdown Chips */}
                            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                              <div className="py-1.5 px-1 sm:px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                                <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300 block font-mono">
                                  {presentCount}
                                </span>
                                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate block">Attended</span>
                              </div>
                              <div className="py-1.5 px-1 sm:px-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">
                                <span className="text-sm sm:text-base font-bold text-rose-700 dark:text-rose-300 block font-mono">
                                  {absentCount}
                                </span>
                                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate block">Missed</span>
                              </div>
                              <div className="py-1.5 px-1 sm:px-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
                                <span className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300 block font-mono">
                                  {cancelledCount}
                                </span>
                                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate block">Cancelled</span>
                              </div>
                              <div className="py-1.5 px-1 sm:px-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/40">
                                <span className="text-sm sm:text-base font-bold text-sky-700 dark:text-sky-300 block font-mono">
                                  {holidayCount}
                                </span>
                                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate block">Holidays</span>
                              </div>
                            </div>

                            {/* Progress bar and margin text */}
                            <div className="space-y-1.5">
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 rounded-full ${
                                    isSafe ? 'bg-primary' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, stats.percentage)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono font-medium">
                                <span>
                                  {stats.presentSessions}/{stats.conductedSessions} conducted lectures attended
                                </span>
                                <span className={isSafe ? 'text-primary font-bold' : 'text-rose-600 font-bold'}>
                                  {marginText}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3. Right Section: Percentage & Quick Log */}
                          <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                            <div className="text-left lg:text-right shrink-0">
                              <span
                                className={`text-2xl sm:text-3xl font-black font-mono leading-none ${
                                  isSafe
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {stats.conductedSessions > 0 ? `${stats.percentage}%` : '—'}
                              </span>
                              <span className="text-xs text-muted-foreground block font-mono font-medium mt-0.5">
                                Target: 75%
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* 1. Present / Attended */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickLog(subject.id, 'present');
                                }}
                                disabled={isPending}
                                className={`h-8 px-3 text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-semibold ${
                                  todayStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-emerald-700 hover:border-emerald-300 dark:hover:text-emerald-300 dark:hover:border-emerald-800'
                                }`}
                                title={
                                  todayStatus === 'present'
                                    ? 'Attended Today (Click to unmark)'
                                    : 'Mark Attended Today'
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Present</span>
                              </button>

                              {/* 2. Absent / Missed */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickLog(subject.id, 'absent');
                                }}
                                disabled={isPending}
                                className={`h-8 px-3 text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-semibold ${
                                  todayStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-rose-700 hover:border-rose-300 dark:hover:text-rose-300 dark:hover:border-rose-800'
                                }`}
                                title={
                                  todayStatus === 'absent'
                                    ? 'Missed Today (Click to unmark)'
                                    : 'Mark Missed Today'
                                }
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Absent</span>
                              </button>

                              {/* 3. Cancelled */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickLog(subject.id, 'cancelled');
                                }}
                                disabled={isPending}
                                className={`h-8 px-2.5 text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-semibold ${
                                  todayStatus === 'cancelled'
                                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-amber-700 hover:border-amber-300 dark:hover:text-amber-300 dark:hover:border-amber-800'
                                }`}
                                title={
                                  todayStatus === 'cancelled'
                                    ? 'Cancelled Today (Click to unmark)'
                                    : 'Mark Class Cancelled Today'
                                }
                              >
                                <MinusCircle className="h-3.5 w-3.5" />
                                <span>Cancel</span>
                              </button>

                              {/* 4. Holiday */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickLog(subject.id, 'no_class');
                                }}
                                disabled={isPending}
                                className={`h-8 px-2.5 text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-semibold ${
                                  todayStatus === 'no_class'
                                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-sky-700 hover:border-sky-300 dark:hover:text-sky-300 dark:hover:border-sky-800'
                                }`}
                                title={
                                  todayStatus === 'no_class'
                                    ? 'Holiday Today (Click to unmark)'
                                    : 'Mark Holiday Today'
                                }
                              >
                                <Sun className="h-3.5 w-3.5" />
                                <span>Holiday</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* PILLAR 3: COURSE SYLLABUS & TOPIC COVERAGE               */}
        {/* ======================================================== */}
        <TabsContent value="syllabus" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground tracking-tight">Curriculum Syllabus & Modules</h2>
            <span className="text-xs sm:text-sm text-muted-foreground font-mono font-medium">
              {syllabusTopics.filter((t) => t.is_completed).length}/{syllabusTopics.length} completed
            </span>
          </div>

          {syllabusTopics.length === 0 ? (
            <Card className="border-border bg-card rounded-2xl shadow-xs p-10 text-center text-sm text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto text-primary/40 mb-3" />
              <p className="font-bold text-base text-foreground">No syllabus topics entered yet.</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Organize your course modules, lecture notes, and exam topics step-by-step.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {subjects.map((sub) => {
                const subTopics = syllabusTopics.filter((t) => t.subject_id === sub.id);
                if (subTopics.length === 0) return null;

                const completedCount = subTopics.filter((t) => t.is_completed).length;
                const pct = Math.round((completedCount / subTopics.length) * 100);

                return (
                  <Card key={sub.id} className="border-border bg-card rounded-2xl shadow-xs overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border bg-muted/20">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3.5 w-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color || '#526653' }}
                          />
                          <div>
                            <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                              {sub.name}
                            </CardTitle>
                            {sub.code && (
                              <CardDescription className="text-xs font-mono font-medium text-muted-foreground">
                                {sub.code}
                              </CardDescription>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                            {completedCount}/{subTopics.length} ({pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Subject syllabus progress bar */}
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-2.5">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {subTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="p-3.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/20 transition-colors"
                          >
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={topic.is_completed}
                                onChange={() => handleToggleTopic(topic.id, topic.is_completed)}
                                disabled={isPending}
                                className="h-4.5 w-4.5 rounded border-border text-primary cursor-pointer accent-primary shrink-0"
                              />
                              <div className="min-w-0">
                                <span
                                  className={`block truncate ${
                                    topic.is_completed
                                      ? 'line-through text-muted-foreground'
                                      : 'font-semibold text-foreground'
                                  }`}
                                >
                                  {topic.title}
                                </span>
                              </div>
                            </label>

                            <Badge variant="outline" className="text-xs font-mono font-semibold shrink-0 border-border">
                              Unit {topic.unit_number}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pop-up for Subject-Wise Date Attendance and Holiday Management */}
      <SubjectAttendanceDialog
        open={isSubjectDialogOpen}
        onOpenChange={setIsSubjectDialogOpen}
        subject={selectedSubjectForDialog}
        sessions={sessions}
      />
    </div>
  );
}
