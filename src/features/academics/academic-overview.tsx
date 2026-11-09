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
  LayoutGrid,
  Calendar,
  Sun,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  calculateAttendance,
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  onDelete,
  disabled,
}: {
  dayIdx: number;
  dayName: string;
  motto?: string;
  slots: TimetableRow[];
  isToday: boolean;
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

  const renderSlotRow = (slot: TimetableRow) => {
    const sub = slot.subject;
    return (
      <tr
        key={slot.id}
        className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-b-0"
      >
        {/* Time */}
        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-foreground whitespace-nowrap">
          {formatTimeSlot(slot.start_time)} – {formatTimeSlot(slot.end_time)}
        </td>

        {/* Subject */}
        <td className="py-2.5 px-3 min-w-[140px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: sub?.color || '#526653' }}
            />
            <span className="font-semibold text-xs text-foreground">
              {sub?.name || 'Class Session'}
            </span>
            {sub?.code && (
              <span className="font-mono text-[9px] px-1 py-0.2 rounded border border-border bg-muted/40 text-muted-foreground shrink-0">
                {sub.code}
              </span>
            )}
          </div>
        </td>

        {/* Room */}
        <td className="py-2.5 px-2.5 text-center font-mono text-xs whitespace-nowrap">
          {slot.classroom ? (
            <span className="px-1.5 py-0.5 rounded bg-muted/60 font-semibold text-foreground text-[11px]">
              {slot.classroom}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>

        {/* Faculty */}
        <td className="py-2.5 px-3 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">
          {sub?.instructor || '—'}
        </td>

        {/* Delete Action */}
        <td className="py-2.5 pr-2.5 pl-1 text-center w-7">
          <button
            type="button"
            onClick={() => onDelete(slot.id)}
            disabled={disabled}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-600 rounded cursor-pointer"
            title="Delete class"
          >
            <Trash2 className="h-3 w-3" />
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
      <div className={`py-2.5 px-4 border-b ${theme.header} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm tracking-tight">{dayName}</h3>
          {motto && (
            <span className="text-xs opacity-75 italic hidden sm:inline">
              • “{motto}”
            </span>
          )}
          {isToday && (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.2 rounded-full shadow-xs">
              Today
            </Badge>
          )}
        </div>
        <span className="font-mono text-xs opacity-80">
          {slots.length} {slots.length === 1 ? 'class' : 'classes'}
        </span>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b ${theme.th} text-[10px] uppercase font-mono font-semibold tracking-wider`}>
              <th className="py-2 px-3 w-[130px]">Time</th>
              <th className="py-2 px-3">Subject</th>
              <th className="py-2 px-2.5 text-center w-[80px]">Class No. (Room)</th>
              <th className="py-2 px-3 text-right w-[90px]">Faculty</th>
              <th className="w-7"></th>
            </tr>
          </thead>
          <tbody>
            {morningSlots.map(renderSlotRow)}

            {/* Lunch Break Row */}
            <tr className="bg-muted/20 border-y border-dashed border-border/70 text-muted-foreground">
              <td className="py-1.5 px-3 font-mono text-[10px] font-medium whitespace-nowrap text-muted-foreground/80">
                1:00 – 2:30 PM
              </td>
              <td colSpan={4} className="py-1.5 px-3 text-center text-[10px] font-semibold tracking-wider uppercase opacity-75">
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
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="py-2.5 px-4 border-b border-border bg-muted/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground tracking-tight">
            SUBJECTS AT A GLANCE
          </h3>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {subjects.length} Courses
        </span>
      </div>

      {/* Subject List Table */}
      <div className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[10px] uppercase font-mono font-semibold text-muted-foreground">
              <th className="py-2 px-3 w-[85px]">Code</th>
              <th className="py-2 px-3">Subject Name</th>
              <th className="py-2 px-3 text-right w-[75px]">Faculty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {subjects.map((sub) => (
              <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-2 px-3 font-mono text-[10px] font-semibold text-foreground whitespace-nowrap">
                  {sub.code || '—'}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || '#526653' }}
                    />
                    <span className="font-medium text-xs text-foreground truncate">
                      {sub.name}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {sub.instructor || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-border bg-muted/20 text-center text-[11px] text-muted-foreground italic">
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
  const [viewMode, setViewMode] = useState<'sheet' | 'day'>('sheet');
  const [activeDay, setActiveDay] = useState<number>(() => new Date().getDay());
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

    // Margin calculation for 75% target
    let marginText = 'No conducted classes';
    if (stats.conductedSessions > 0) {
      if (stats.percentage >= 75) {
        const canMiss = Math.floor((stats.presentSessions - 0.75 * stats.conductedSessions) / 0.75);
        marginText = canMiss > 0 ? `Can miss ${canMiss} class${canMiss === 1 ? '' : 'es'}` : 'On threshold';
      } else {
        const needToAttend = Math.ceil((0.75 * stats.conductedSessions - stats.presentSessions) / 0.25);
        marginText = `Need ${needToAttend} class${needToAttend === 1 ? '' : 'es'} for 75%`;
      }
    }

    return {
      subject: sub,
      stats,
      presentCount,
      absentCount,
      cancelledCount,
      holidayCount,
      marginText,
    };
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

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
  const selectedDayClasses = timetable.filter((t) => t.day_of_week === activeDay);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Academic Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your daily class timetable, 75% attendance engine, and curriculum syllabus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
      <Tabs defaultValue="schedule" className="space-y-5">
        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-xs w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="schedule" className="text-xs gap-1.5 rounded-lg font-medium cursor-pointer">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Class Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs gap-1.5 rounded-lg font-medium cursor-pointer">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Attendance ({overallStats.percentage}%)</span>
          </TabsTrigger>
          <TabsTrigger value="syllabus" className="text-xs gap-1.5 rounded-lg font-medium cursor-pointer">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Syllabus ({syllabusTopics.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* PILLAR 1: CLASS SCHEDULE & TIMETABLE                     */}
        {/* ======================================================== */}
        <TabsContent value="schedule" className="space-y-5">
          {/* Header & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground tracking-tight">
                  {viewMode === 'sheet' ? 'M.Tech (SO) I Semester Time Table' : `${DAY_NAMES[activeDay]} Schedule`}
                </h2>
                {viewMode === 'sheet' && (
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
                    {timetable.length} Lectures
                  </Badge>
                )}
                {viewMode === 'day' && activeDay === currentDayIndex && (
                  <Badge variant="outline" className="text-[10px] font-mono border-primary text-primary bg-primary/10">
                    Today
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {viewMode === 'sheet'
                  ? 'Weekly schedule tables with Time, Subject, Class No. (Room), and Faculty.'
                  : `Showing ${selectedDayClasses.length} ${selectedDayClasses.length === 1 ? 'class' : 'classes'} scheduled for ${DAY_NAMES[activeDay]}.`}
              </p>
            </div>

            {/* Toggle Switch between Weekly Sheet and Day View */}
            <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('sheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'sheet'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Weekly Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Day View</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* VIEW A: VISUAL WEEKLY TIMETABLE SHEET (Grid of Tables)   */}
          {/* ======================================================== */}
          {viewMode === 'sheet' ? (
            timetable.length === 0 ? (
              <Card className="border-border bg-card rounded-xl shadow-xs p-8 text-center text-xs text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto text-primary/40 mb-2" />
                <p className="font-medium text-foreground">No classes scheduled in your timetable.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add lecture timeslots to populate your weekly academic routine.
                </p>
                {subjects.length > 0 && (
                  <div className="mt-4">
                    <CreateTimetableEntryDialog subjects={subjects} />
                  </div>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. MONDAY */}
                <DayTimetableTable
                  dayIdx={1}
                  dayName="MONDAY"
                  motto={DAY_MOTTO[1]}
                  slots={timetable.filter((t) => t.day_of_week === 1)}
                  isToday={currentDayIndex === 1}
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
                  onDelete={handleDeleteTimetableEntry}
                  disabled={isPending}
                />

                {/* 6. SUBJECTS AT A GLANCE */}
                <SubjectsAtAGlance subjects={subjects} />
              </div>
            )
          ) : (
            /* ======================================================== */
            /* VIEW B: DAY-BY-DAY SCHEDULE VIEW                         */
            /* ======================================================== */
            <div className="space-y-4">
              {/* Day Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {SHORT_DAYS.map((day, idx) => {
                  const isToday = idx === currentDayIndex;
                  const isSelected = idx === activeDay;
                  const daySlotCount = timetable.filter((t) => t.day_of_week === idx).length;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setActiveDay(idx)}
                      className={`flex-1 sm:flex-initial min-w-[56px] py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                          : 'bg-card border-border text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-mono block opacity-80 leading-none">
                        {day}
                      </span>
                      <span className="text-xs font-bold block mt-1 leading-none">
                        {daySlotCount}
                      </span>
                      {isToday && (
                        <span className="text-[9px] uppercase tracking-tighter block mt-0.5 opacity-90 font-medium">
                          Today
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day Table or Empty State */}
              {selectedDayClasses.length === 0 ? (
                <Card className="border-border bg-card rounded-xl shadow-xs p-8 text-center text-xs text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto text-primary/40 mb-2" />
                  <p className="font-medium text-foreground">No classes scheduled for {DAY_NAMES[activeDay]}.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Add lecture timeslots to track your weekly routine seamlessly.
                  </p>
                  {subjects.length > 0 && (
                    <div className="mt-4">
                      <CreateTimetableEntryDialog subjects={subjects} />
                    </div>
                  )}
                </Card>
              ) : (
                <DayTimetableTable
                  dayIdx={activeDay}
                  dayName={DAY_NAMES[activeDay].toUpperCase()}
                  motto={DAY_MOTTO[activeDay]}
                  slots={selectedDayClasses}
                  isToday={activeDay === currentDayIndex}
                  onDelete={handleDeleteTimetableEntry}
                  disabled={isPending}
                />
              )}
            </div>
          )}
        </TabsContent>

        {/* ======================================================== */}
        {/* PILLAR 2: ATTENDANCE TRACKER (75% ENGINE & QUICK LOGS)   */}
        {/* ======================================================== */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Cumulative Attendance Hero Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="sm:col-span-1 border-border bg-card rounded-xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                  Total Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold tracking-tight font-mono ${
                      overallStats.percentage >= 75
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : overallStats.conductedSessions === 0
                        ? 'text-foreground'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {overallStats.percentage}%
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Target: 75%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Derived from {overallStats.conductedSessions} conducted lectures
                </p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-3 border-border bg-card rounded-xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                  Attendance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 block font-mono">
                    {overallStats.presentSessions}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Attended</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">
                  <span className="text-lg font-bold text-rose-700 dark:text-rose-300 block font-mono">
                    {overallStats.absentSessions}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Missed</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300 block font-mono">
                    {overallStats.cancelledSessions}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Cancelled</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted border border-border">
                  <span className="text-lg font-bold text-foreground block font-mono">
                    {overallStats.totalSessions}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Total Logged</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Attendance Breakdown Cards */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Course Attendance & Date Logs
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tap any subject to view date-wise records, change status, or log past classes.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <LogHolidayDialog subjects={subjects} />
                <LogSessionDialog subjects={subjects} />
              </div>
            </div>

            {subjectStats.length === 0 ? (
              <Card className="border-border bg-card rounded-xl shadow-xs p-8 text-center text-xs text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto text-primary/40 mb-2" />
                <p className="font-medium text-foreground">No academic courses enrolled.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add your semester courses to start tracking attendance and 75% thresholds.
                </p>
                <div className="mt-4">
                  <CreateSubjectDialog />
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
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
                        className="border-border bg-card rounded-2xl shadow-xs hover:border-primary/50 transition-all p-3.5 sm:p-4.5 cursor-pointer group overflow-hidden"
                        title="Tap to view date-wise attendance"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* 1. Left Section: Subject Info */}
                          <div className="flex items-start gap-3 lg:w-[280px] shrink-0 min-w-0">
                            <span
                              className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-background mt-1"
                              style={{ backgroundColor: subject.color || '#526653' }}
                            />
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                {subject.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                {subject.code && (
                                  <Badge variant="outline" className="text-[10px] font-mono py-0 border-border">
                                    {subject.code}
                                  </Badge>
                                )}
                                {subject.instructor && (
                                  <span className="text-[11px] text-muted-foreground italic truncate">
                                    Prof. {subject.instructor}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSubjectDialog(subject);
                                }}
                                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1 mt-1.5"
                              >
                                <CalendarDays className="h-3 w-3" />
                                <span>View Dates & History</span>
                              </button>
                            </div>
                          </div>

                          {/* 2. Middle Section: Attendance Stats Chips & Progress */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Breakdown Chips */}
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              <div className="py-1 px-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block font-mono">
                                  {presentCount}
                                </span>
                                <span className="text-[9px] text-muted-foreground">Attended</span>
                              </div>
                              <div className="py-1 px-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">
                                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block font-mono">
                                  {absentCount}
                                </span>
                                <span className="text-[9px] text-muted-foreground">Missed</span>
                              </div>
                              <div className="py-1 px-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block font-mono">
                                  {cancelledCount}
                                </span>
                                <span className="text-[9px] text-muted-foreground">Cancelled</span>
                              </div>
                              <div className="py-1 px-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/40">
                                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 block font-mono">
                                  {holidayCount}
                                </span>
                                <span className="text-[9px] text-muted-foreground">Holidays</span>
                              </div>
                            </div>

                            {/* Progress bar and margin text */}
                            <div className="space-y-1">
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 rounded-full ${
                                    isSafe ? 'bg-primary' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, stats.percentage)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                                <span>
                                  {stats.presentSessions}/{stats.conductedSessions} conducted lectures attended
                                </span>
                                <span className={isSafe ? 'text-primary font-medium' : 'text-rose-600 font-medium'}>
                                  {marginText}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3. Right Section: Percentage & Quick Log */}
                          <div className="flex items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                            <div className="text-left lg:text-right shrink-0">
                              <span
                                className={`text-xl font-black font-mono leading-none ${
                                  isSafe
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {stats.conductedSessions > 0 ? `${stats.percentage}%` : '—'}
                              </span>
                              <span className="text-[9px] text-muted-foreground block font-mono">
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
                                className={`h-7 px-2.5 text-[11px] rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer font-medium ${
                                  todayStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-emerald-700 hover:border-emerald-300 dark:hover:text-emerald-300 dark:hover:border-emerald-800'
                                }`}
                                title={
                                  todayStatus === 'present'
                                    ? 'Attended Today (Click to unmark)'
                                    : 'Mark Attended Today'
                                }
                              >
                                <Check className="h-3 w-3" />
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
                                className={`h-7 px-2.5 text-[11px] rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer font-medium ${
                                  todayStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs font-semibold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-rose-700 hover:border-rose-300 dark:hover:text-rose-300 dark:hover:border-rose-800'
                                }`}
                                title={
                                  todayStatus === 'absent'
                                    ? 'Missed Today (Click to unmark)'
                                    : 'Mark Missed Today'
                                }
                              >
                                <X className="h-3 w-3" />
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
                                className={`h-7 px-2 text-[11px] rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer font-medium ${
                                  todayStatus === 'cancelled'
                                    ? 'bg-amber-600 text-white shadow-xs font-semibold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-amber-700 hover:border-amber-300 dark:hover:text-amber-300 dark:hover:border-amber-800'
                                }`}
                                title={
                                  todayStatus === 'cancelled'
                                    ? 'Cancelled Today (Click to unmark)'
                                    : 'Mark Class Cancelled Today'
                                }
                              >
                                <MinusCircle className="h-3 w-3" />
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
                                className={`h-7 px-2 text-[11px] rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer font-medium ${
                                  todayStatus === 'no_class'
                                    ? 'bg-sky-600 text-white shadow-xs font-semibold'
                                    : 'border border-border bg-background text-muted-foreground hover:text-sky-700 hover:border-sky-300 dark:hover:text-sky-300 dark:hover:border-sky-800'
                                }`}
                                title={
                                  todayStatus === 'no_class'
                                    ? 'Holiday Today (Click to unmark)'
                                    : 'Mark Holiday Today'
                                }
                              >
                                <Sun className="h-3 w-3" />
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
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Curriculum Syllabus & Modules</h2>
            <span className="text-xs text-muted-foreground font-mono">
              {syllabusTopics.filter((t) => t.is_completed).length}/{syllabusTopics.length} completed
            </span>
          </div>

          {syllabusTopics.length === 0 ? (
            <Card className="border-border bg-card rounded-xl shadow-xs p-8 text-center text-xs text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto text-primary/40 mb-2" />
              <p className="font-medium text-foreground">No syllabus topics entered yet.</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
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
                  <Card key={sub.id} className="border-border bg-card rounded-xl shadow-xs overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border bg-muted/20">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color || '#526653' }}
                          />
                          <div>
                            <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">
                              {sub.name}
                            </CardTitle>
                            {sub.code && (
                              <CardDescription className="text-[10px] font-mono text-muted-foreground">
                                {sub.code}
                              </CardDescription>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-foreground">
                            {completedCount}/{subTopics.length} ({pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Subject syllabus progress bar */}
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-2">
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
                            className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors"
                          >
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={topic.is_completed}
                                onChange={() => handleToggleTopic(topic.id, topic.is_completed)}
                                disabled={isPending}
                                className="h-4 w-4 rounded border-border text-primary cursor-pointer accent-primary shrink-0"
                              />
                              <div className="min-w-0">
                                <span
                                  className={`block truncate ${
                                    topic.is_completed
                                      ? 'line-through text-muted-foreground'
                                      : 'font-medium text-foreground'
                                  }`}
                                >
                                  {topic.title}
                                </span>
                              </div>
                            </label>

                            <Badge variant="outline" className="text-[10px] font-mono shrink-0 border-border">
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
