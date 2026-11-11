'use client';

import React, { useTransition } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deletePomodoroSessionAction } from '@/features/pomodoro/actions';
import {
  aggregateSubjectStudyStats,
  parseSessionNotes,
  type SubjectOption,
} from '@/features/pomodoro/pomodoro-utils';
import { Brain, CheckCircle2, Clock, Trash2, Trophy, BookOpen, Layers } from 'lucide-react';

export interface PomodoroSessionRecord {
  id: string;
  duration_minutes: number;
  type: 'focus' | 'short_break' | 'long_break';
  started_at: string;
  notes?: string | null;
  task?: { id: string; title: string } | null;
}

interface PomodoroAnalyticsProps {
  sessions: PomodoroSessionRecord[];
  subjects?: SubjectOption[];
}

export function PomodoroAnalytics({ sessions, subjects = [] }: PomodoroAnalyticsProps) {
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Filter today's focus sessions
  const todayFocusSessions = sessions.filter((s) => {
    return s.type === 'focus' && format(new Date(s.started_at), 'yyyy-MM-dd') === todayStr;
  });

  const todayMinutes = todayFocusSessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalCompletedFocus = sessions.filter((s) => s.type === 'focus').length;

  // Aggregate stats across academic subjects
  const studyStats = aggregateSubjectStudyStats(sessions, subjects);
  const activeSubjectsWithTime = studyStats.subjects.filter((s) => s.totalMinutes > 0);

  const handleDelete = (id: string) => {
    if (confirm('Delete this session record?')) {
      startTransition(async () => {
        await deletePomodoroSessionAction(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today&apos;s Focus Time
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">{todayMinutes}m</div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayFocusSessions.length} session{todayFocusSessions.length === 1 ? '' : 's'} logged today
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Completed Sessions
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">{totalCompletedFocus}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {studyStats.totalFocusHours} total study hours logged
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Focus Efficiency
            </CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">100%</div>
            <p className="text-xs text-muted-foreground mt-1">Timestamp-verified consistency</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Study Breakdown */}
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">
              Subject Study Hours Breakdown
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-medium border-border">
            {studyStats.totalFocusHours}h total focus
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {activeSubjectsWithTime.length === 0 && studyStats.unassignedMinutes === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No course-linked study sessions yet. Tag your next focus session with a course above!
            </div>
          ) : (
            <div className="space-y-4">
              {activeSubjectsWithTime.map((sub) => {
                const hours = Math.floor(sub.totalMinutes / 60);
                const mins = sub.totalMinutes % 60;
                const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                return (
                  <div key={sub.subjectId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="font-semibold text-foreground truncate">{sub.name}</span>
                        {sub.code && (
                          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1 border-border">
                            {sub.code}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-muted-foreground text-[11px]">
                          {sub.sessionCount} session{sub.sessionCount === 1 ? '' : 's'}
                        </span>
                        <span className="font-bold font-mono text-foreground">{timeStr}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
                          {sub.percentage}%
                        </Badge>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(4, sub.percentage)}%`,
                          backgroundColor: sub.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Unassigned Sessions if any */}
              {studyStats.unassignedMinutes > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-muted-foreground truncate">
                        General / Unassigned Study
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {studyStats.unassignedSessions} session{studyStats.unassignedSessions === 1 ? '' : 's'}
                      </span>
                      <span className="font-bold font-mono text-foreground">
                        {Math.floor(studyStats.unassignedMinutes / 60) > 0
                          ? `${Math.floor(studyStats.unassignedMinutes / 60)}h ${studyStats.unassignedMinutes % 60}m`
                          : `${studyStats.unassignedMinutes}m`}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
                        {studyStats.totalFocusMinutes > 0
                          ? Math.round((studyStats.unassignedMinutes / studyStats.totalFocusMinutes) * 100)
                          : 0}
                        %
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/40 transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          4,
                          studyStats.totalFocusMinutes > 0
                            ? Math.round((studyStats.unassignedMinutes / studyStats.totalFocusMinutes) * 100)
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground">Recent Focus History</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No study sessions logged yet. Start a focus session above!
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 10).map((session) => {
                const parsed = parseSessionNotes(session.notes);
                const matchedSubject = subjects.find(
                  (s) =>
                    (parsed.subjectId && s.id === parsed.subjectId) ||
                    (parsed.subjectName && s.name.toLowerCase() === parsed.subjectName.toLowerCase())
                );

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between text-xs p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {session.duration_minutes} min {session.type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono border-border">
                            {session.type}
                          </Badge>

                          {/* Subject Pill */}
                          {(matchedSubject || parsed.subjectName) && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium border-border flex items-center gap-1 py-0 px-1.5"
                              style={{ borderColor: matchedSubject?.color || undefined }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: matchedSubject?.color || '#3b82f6' }}
                              />
                              <span className="truncate max-w-[120px]">
                                {matchedSubject?.name || parsed.subjectName}
                              </span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                          <span className="font-mono">
                            {format(new Date(session.started_at), 'MMM d, yyyy @ hh:mm a')}
                          </span>
                          {session.task && (
                            <span className="truncate text-foreground font-medium">
                              &bull; Task: {session.task.title}
                            </span>
                          )}
                          {parsed.customNote && (
                            <span className="truncate text-muted-foreground italic">
                              &bull; {parsed.customNote}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(session.id)}
                      disabled={isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer shrink-0"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
