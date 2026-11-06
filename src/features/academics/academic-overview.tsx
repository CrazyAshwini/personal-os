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
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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

export function AcademicOverview({
  subjects,
  timetable,
  sessions,
  syllabusTopics,
}: AcademicOverviewProps) {
  const [activeDay, setActiveDay] = useState<number>(() => new Date().getDay());
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
      marginText,
    };
  });

  const handleQuickLog = (subjectId: string, status: 'present' | 'absent' | 'cancelled') => {
    const today = format(new Date(), 'yyyy-MM-dd');
    startTransition(async () => {
      await logClassSessionAction({
        subjectId,
        sessionDate: today,
        status,
      });
    });
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
        <TabsContent value="schedule" className="space-y-6">
          {/* Day of Week Selector Pills */}
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

          {/* Active Day Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {DAY_NAMES[activeDay]} Schedule
              {activeDay === currentDayIndex && (
                <Badge variant="outline" className="text-[10px] font-mono border-primary text-primary bg-primary/10">
                  Today
                </Badge>
              )}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {selectedDayClasses.length} {selectedDayClasses.length === 1 ? 'class' : 'classes'}
            </span>
          </div>

          {/* Timetable List for Selected Day */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDayClasses.map((slot) => {
                const sub = slot.subject;
                return (
                  <div
                    key={slot.id}
                    className="p-3.5 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: sub?.color || '#526653' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-foreground truncate">
                            {sub?.name || 'Class Session'}
                          </h3>
                          {sub?.code && (
                            <Badge variant="outline" className="text-[10px] font-mono py-0 border-border">
                              {sub.code}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                          <div className="flex items-center gap-1 font-mono text-foreground font-medium">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>
                              {formatTimeSlot(slot.start_time)} – {formatTimeSlot(slot.end_time)}
                            </span>
                          </div>

                          {slot.classroom && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary" />
                              <span>{slot.classroom}</span>
                            </div>
                          )}

                          {sub?.instructor && (
                            <span className="text-[10px] text-muted-foreground italic truncate">
                              Prof. {sub.instructor}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTimetableEntry(slot.id)}
                      disabled={isPending}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer shrink-0"
                      aria-label="Delete timetable slot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
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
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Course Attendance & Quick Log</h2>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectStats.map(({ subject, stats, marginText }) => {
                  const isSafe = stats.conductedSessions === 0 || stats.percentage >= 75;

                  return (
                    <Card
                      key={subject.id}
                      className="border-border bg-card rounded-xl shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: subject.color || '#526653' }}
                            />
                            <div>
                              <CardTitle className="text-sm font-semibold text-foreground truncate">
                                {subject.name}
                              </CardTitle>
                              {subject.code && (
                                <CardDescription className="text-[10px] font-mono text-muted-foreground">
                                  {subject.code}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-base font-bold font-mono ${
                              isSafe
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {stats.conductedSessions > 0 ? `${stats.percentage}%` : '—'}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-3">
                        {/* Attendance Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                isSafe ? 'bg-primary' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, stats.percentage)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span>
                              {stats.presentSessions}/{stats.conductedSessions} attended
                            </span>
                            <span className={isSafe ? 'text-primary font-medium' : 'text-rose-600 font-medium'}>
                              {marginText}
                            </span>
                          </div>
                        </div>

                        {/* Quick Log Action Buttons */}
                        <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Quick Log:</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => handleQuickLog(subject.id, 'present')}
                              disabled={isPending}
                              className="h-6 px-2 text-[10px] rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Present
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => handleQuickLog(subject.id, 'absent')}
                              disabled={isPending}
                              className="h-6 px-2 text-[10px] rounded-lg border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Absent
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => handleQuickLog(subject.id, 'cancelled')}
                              disabled={isPending}
                              className="h-6 px-1.5 text-[10px] rounded-lg text-muted-foreground"
                              title="Class Cancelled"
                            >
                              <MinusCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
    </div>
  );
}
