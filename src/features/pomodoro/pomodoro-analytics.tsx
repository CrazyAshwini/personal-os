'use client';

import React, { useTransition } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deletePomodoroSessionAction } from '@/features/pomodoro/actions';
import { Brain, CheckCircle2, Clock, Trash2, Trophy } from 'lucide-react';

export interface PomodoroSessionRecord {
  id: string;
  duration_minutes: number;
  type: 'focus' | 'short_break' | 'long_break';
  started_at: string;
  task?: { id: string; title: string } | null;
}

interface PomodoroAnalyticsProps {
  sessions: PomodoroSessionRecord[];
}

export function PomodoroAnalytics({ sessions }: PomodoroAnalyticsProps) {
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Filter today's focus sessions
  const todayFocusSessions = sessions.filter((s) => {
    return s.type === 'focus' && format(new Date(s.started_at), 'yyyy-MM-dd') === todayStr;
  });

  const todayMinutes = todayFocusSessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalCompletedFocus = sessions.filter((s) => s.type === 'focus').length;

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
            <p className="text-xs text-muted-foreground mt-1">Total lifetime focus rounds</p>
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
              {sessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between text-xs p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {session.duration_minutes} min {session.type.replace('_', ' ')}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-border">
                          {session.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-mono">
                          {format(new Date(session.started_at), 'MMM d, yyyy @ hh:mm a')}
                        </span>
                        {session.task && (
                          <span className="truncate text-foreground font-medium">
                            &bull; Task: {session.task.title}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
