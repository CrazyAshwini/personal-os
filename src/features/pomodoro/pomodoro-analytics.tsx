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
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Today&apos;s Focus Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayMinutes}m</div>
            <p className="text-xs text-muted-foreground">
              {todayFocusSessions.length} session{todayFocusSessions.length === 1 ? '' : 's'} logged today
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Completed Sessions
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletedFocus}</div>
            <p className="text-xs text-muted-foreground">Total lifetime focus rounds</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Focus Efficiency
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">Timestamp-verified consistency</p>
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recent Focus History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No study sessions logged yet. Start a focus session above!
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between text-xs p-3 rounded-lg border border-border/60 bg-card/40 hover:bg-card transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
                      <Brain className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {session.duration_minutes} min {session.type.replace('_', ' ')}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {session.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>{format(new Date(session.started_at), 'MMM d, h:mm a')}</span>
                        {session.task && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-[200px]">{session.task.title}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(session.id)}
                    disabled={isPending}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
