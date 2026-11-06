'use client';

import React, { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  FileCheck2,
  Trash2,
  Check,
  X,
  MinusCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  calculateAttendance,
  type ClassSessionRecord,
} from '@/features/attendance/attendance-calculator';
import {
  updateClassSessionStatusAction,
  deleteClassSessionAction,
  updateAssignmentStatusAction,
  deleteTimetableEntryAction,
  toggleSyllabusTopicAction,
} from '@/features/academics/actions';
import { CreateSubjectDialog } from '@/features/academics/create-subject-dialog';
import { LogSessionDialog } from '@/features/academics/log-session-dialog';
import { CreateTimetableEntryDialog } from '@/features/academics/create-timetable-entry-dialog';
import { CreateAssignmentDialog } from '@/features/academics/create-assignment-dialog';
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

export function AcademicOverview({
  subjects,
  timetable,
  sessions,
  assignments,
  examinations,
  syllabusTopics,
}: AcademicOverviewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  // 1. Calculate overall and subject-wise attendance using derived formula
  const filteredSessions =
    selectedSubjectId === 'all'
      ? sessions
      : sessions.filter((s) => s.subject_id === selectedSubjectId);

  const overallStats = calculateAttendance(
    filteredSessions.map((s) => ({ id: s.id, status: s.status as ClassSessionRecord['status'] }))
  );

  // Subject-wise attendance calculation map
  const subjectStats = subjects.map((sub) => {
    const subSessions = sessions.filter((s) => s.subject_id === sub.id);
    const stats = calculateAttendance(
      subSessions.map((s) => ({ id: s.id, status: s.status as ClassSessionRecord['status'] }))
    );

    // Margin calculation for 75% target
    let marginText = 'No conducted classes';
    if (stats.conductedSessions > 0) {
      if (stats.percentage >= 75) {
        // Can miss X classes: floor((P - 0.75 * C) / 0.75)
        const canMiss = Math.floor((stats.presentSessions - 0.75 * stats.conductedSessions) / 0.75);
        marginText = canMiss > 0 ? `Can miss ${canMiss} class${canMiss === 1 ? '' : 'es'}` : 'On the threshold';
      } else {
        // Need to attend X classes: ceil((0.75 * C - P) / 0.25)
        const needToAttend = Math.ceil((0.75 * stats.conductedSessions - stats.presentSessions) / 0.25);
        marginText = `Need ${needToAttend} class${needToAttend === 1 ? '' : 'es'} to reach 75%`;
      }
    }

    return {
      subject: sub,
      stats,
      marginText,
    };
  });

  const handleStatusChange = (
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

  const handleAssignmentStatusChange = (
    assignmentId: string,
    newStatus: 'pending' | 'submitted' | 'graded' | 'late'
  ) => {
    startTransition(async () => {
      await updateAssignmentStatusAction(assignmentId, newStatus);
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

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Academic Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Class attendance records, weekly schedule, coursework, and syllabus completion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CreateSubjectDialog />
          {subjects.length > 0 && (
            <>
              <CreateTimetableEntryDialog subjects={subjects} />
              <CreateAssignmentDialog subjects={subjects} />
              <LogSessionDialog subjects={subjects} />
            </>
          )}
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg border border-border">
          <TabsTrigger value="attendance" className="text-xs gap-1.5 rounded-md font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Attendance ({overallStats.percentage}%)
          </TabsTrigger>
          <TabsTrigger value="timetable" className="text-xs gap-1.5 rounded-md font-medium">
            <CalendarDays className="h-3.5 w-3.5" />
            Weekly Timetable ({timetable.length})
          </TabsTrigger>
          <TabsTrigger value="coursework" className="text-xs gap-1.5 rounded-md font-medium">
            <FileCheck2 className="h-3.5 w-3.5" />
            Coursework & Exams ({assignments.length + examinations.length})
          </TabsTrigger>
          <TabsTrigger value="syllabus" className="text-xs gap-1.5 rounded-md font-medium">
            <BookOpen className="h-3.5 w-3.5" />
            Syllabus ({syllabusTopics.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ATTENDANCE */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Top Overall Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="sm:col-span-1 border-border bg-card rounded-xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cumulative Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold tracking-tight ${
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
                  Derived from {overallStats.conductedSessions} conducted sessions
                </p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-3 border-border bg-card rounded-xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Session Breakdown
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
                <div className="p-2.5 rounded-lg bg-muted/60 border border-border">
                  <span className="text-lg font-bold text-foreground block font-mono">
                    {overallStats.cancelledSessions}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Cancelled / No Class</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/80 border border-border">
                  <span className="text-lg font-bold text-foreground block font-mono">
                    {overallStats.totalSessions}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Total Logged</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Cards */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Course Attendance Cards</h3>
            {subjects.length === 0 ? (
              <Card className="p-8 text-center text-xs text-muted-foreground border-dashed border-border rounded-xl">
                <p>No subjects added yet. Click &ldquo;Add Subject&rdquo; above to begin.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectStats.map(({ subject, stats, marginText }) => {
                  const isSafe = stats.percentage >= 75;
                  return (
                    <Card
                      key={subject.id}
                      className="border-border bg-card hover:border-primary/50 transition-colors flex flex-col justify-between rounded-xl shadow-xs"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: subject.color || '#526653' }}
                              />
                              <CardTitle className="text-sm font-semibold text-foreground">
                                {subject.name}
                              </CardTitle>
                            </div>
                            {subject.code && (
                              <CardDescription className="text-[11px] mt-0.5">
                                {subject.code} &bull; {subject.credits} Credits
                              </CardDescription>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs font-mono font-bold ${
                              isSafe
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40'
                            }`}
                          >
                            {stats.percentage}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isSafe ? 'bg-primary' : 'bg-rose-600 dark:bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, stats.percentage)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {stats.presentSessions}/{stats.conductedSessions} classes
                          </span>
                          <span
                            className={`font-medium ${
                              isSafe
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {marginText}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session History Log Table */}
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Class Session Ground Truth</CardTitle>
                <CardDescription className="text-xs">
                  Individual class sessions recorded as present, absent, cancelled, or no class.
                </CardDescription>
              </div>

              {subjects.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none cursor-pointer"
                  >
                    <option value="all">All Subjects</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {filteredSessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p>No class sessions logged yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground font-medium">
                        <th className="pb-2.5 font-medium">Date</th>
                        <th className="pb-2.5 font-medium">Subject</th>
                        <th className="pb-2.5 font-medium">Topic / Notes</th>
                        <th className="pb-2.5 font-medium">Status</th>
                        <th className="pb-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 font-medium text-foreground">
                            {format(new Date(session.session_date), 'MMM d, yyyy')}
                          </td>
                          <td className="py-2.5 font-medium text-foreground">
                            {session.subject?.name || 'General'}
                          </td>
                          <td className="py-2.5 text-muted-foreground max-w-xs truncate">
                            {session.topic_covered || session.notes || '—'}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase font-mono ${
                                session.status === 'present'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                                  : session.status === 'absent'
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                                  : 'bg-muted text-muted-foreground border border-border'
                              }`}
                            >
                              {session.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(session.id, 'present')}
                              title="Mark Present"
                              disabled={isPending}
                              className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-pointer disabled:opacity-50"
                              aria-label="Mark Present"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(session.id, 'absent')}
                              title="Mark Absent"
                              disabled={isPending}
                              className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 cursor-pointer disabled:opacity-50"
                              aria-label="Mark Absent"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(session.id, 'cancelled')}
                              title="Mark Cancelled"
                              disabled={isPending}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer disabled:opacity-50"
                              aria-label="Mark Cancelled"
                            >
                              <MinusCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(session.id)}
                              title="Delete record"
                              disabled={isPending}
                              className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-muted-foreground hover:text-rose-600 cursor-pointer disabled:opacity-50"
                              aria-label="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: WEEKLY TIMETABLE */}
        <TabsContent value="timetable" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
              const dayEntries = timetable.filter((t) => t.day_of_week === dayIdx);
              const isToday = new Date().getDay() === dayIdx;

              return (
                <Card
                  key={dayIdx}
                  className={`flex flex-col min-h-64 rounded-xl shadow-xs transition-colors ${
                    isToday ? 'border-primary shadow-xs bg-muted/30' : 'border-border bg-card'
                  }`}
                >
                  <CardHeader className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {DAY_NAMES[dayIdx]}
                      </CardTitle>
                      {isToday && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 rounded-md">
                          Today
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 flex-1">
                    {dayEntries.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/60 text-center py-6">
                        No classes
                      </p>
                    ) : (
                      dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-2.5 rounded-lg border border-border bg-card text-xs space-y-1 relative group shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-[11px] truncate text-foreground">
                              {entry.subject?.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTimetableEntry(entry.id)}
                              disabled={isPending}
                              title="Delete entry"
                              aria-label="Delete timetable slot"
                              className="text-muted-foreground/40 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 rounded"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>
                              {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                            </span>
                          </div>
                          {entry.classroom && (
                            <div className="text-[10px] text-muted-foreground">
                              📍 {entry.classroom}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: COURSEWORK (ASSIGNMENTS & EXAMS) */}
        <TabsContent value="coursework" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assignments Column */}
            <Card className="border-border bg-card rounded-xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  Coursework & Assignments ({assignments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {assignments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                    No assignments recorded.
                  </div>
                ) : (
                  assignments.map((asg) => (
                    <div
                      key={asg.id}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors text-xs flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground truncate">
                            {asg.title}
                          </h4>
                          {asg.subject && (
                            <Badge variant="outline" className="text-[10px] py-0 border-border">
                              {asg.subject.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Due {format(new Date(asg.due_date), 'MMM d, yyyy @ hh:mm a')}
                          {asg.max_marks && ` • ${asg.max_marks} marks`}
                        </p>
                      </div>

                      <select
                        value={asg.status}
                        onChange={(e) =>
                          handleAssignmentStatusChange(
                            asg.id,
                            e.target.value as 'pending' | 'submitted' | 'graded' | 'late'
                          )
                        }
                        disabled={isPending}
                        className="h-7 px-2 text-[10px] font-medium rounded-lg border border-border bg-background outline-none capitalize cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="submitted">Submitted</option>
                        <option value="graded">Graded</option>
                        <option value="late">Late</option>
                      </select>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Examinations Column */}
            <Card className="border-border bg-card rounded-xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Examinations Schedule ({examinations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {examinations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                    No examinations scheduled.
                  </div>
                ) : (
                  examinations.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-3 rounded-lg border border-border bg-card text-xs flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{exam.title}</h4>
                          {exam.subject && (
                            <Badge variant="outline" className="text-[10px] py-0 border-border">
                              {exam.subject.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          📅 {format(new Date(exam.exam_date), 'EEEE, MMM d, yyyy @ hh:mm a')}
                          {exam.classroom && ` • Room: ${exam.classroom}`}
                        </p>
                      </div>

                      {exam.weightage_percentage && (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {exam.weightage_percentage}% weight
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: SYLLABUS TOPICS */}
        <TabsContent value="syllabus" className="space-y-4">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Course Syllabus & Topic Tracker</CardTitle>
              <CardDescription className="text-xs">
                Check off syllabus concepts as your professor covers them in lectures.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {syllabusTopics.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p>No syllabus topics logged yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {syllabusTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={topic.is_completed}
                          onChange={() => handleToggleTopic(topic.id, topic.is_completed)}
                          disabled={isPending}
                          className="h-4 w-4 rounded border-border text-primary cursor-pointer accent-primary"
                        />
                        <span
                          className={`truncate ${
                            topic.is_completed
                              ? 'line-through text-muted-foreground'
                              : 'font-medium text-foreground'
                          }`}
                        >
                          Unit {topic.unit_number}: {topic.title}
                        </span>
                      </label>

                      {topic.subject && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-border">
                          {topic.subject.name}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
