'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { calculatePomodoroState, type PomodoroSessionTiming } from '@/features/pomodoro/pomodoro-utils';
import { logPomodoroSessionAction } from '@/features/pomodoro/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Check, Coffee, Brain, Sparkles } from 'lucide-react';

interface TaskOption {
  id: string;
  title: string;
}

interface PomodoroTimerProps {
  tasks: TaskOption[];
  focusDurationMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
}

type Mode = 'focus' | 'short_break' | 'long_break';

export function PomodoroTimer({
  tasks,
  focusDurationMinutes = 25,
  shortBreakMinutes = 5,
  longBreakMinutes = 15,
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<Mode>('focus');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const getTargetSeconds = useCallback(
    (m: Mode) => {
      switch (m) {
        case 'focus':
          return focusDurationMinutes * 60;
        case 'short_break':
          return shortBreakMinutes * 60;
        case 'long_break':
          return longBreakMinutes * 60;
      }
    },
    [focusDurationMinutes, shortBreakMinutes, longBreakMinutes]
  );

  const [timing, setTiming] = useState<PomodoroSessionTiming>(() => ({
    startTimeMs: 0,
    targetDurationSeconds: focusDurationMinutes * 60,
    totalPausedMs: 0,
  }));

  const [remainingSeconds, setRemainingSeconds] = useState(focusDurationMinutes * 60);
  const sessionStartTimeRef = useRef<string | null>(null);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    const target = getTargetSeconds(mode);
    setTiming({
      startTimeMs: 0,
      targetDurationSeconds: target,
      totalPausedMs: 0,
    });
    setRemainingSeconds(target);
    sessionStartTimeRef.current = null;
  }, [mode, getTargetSeconds]);

  const handleSessionCompleted = useCallback(
    (durationSecs: number) => {
      startTransition(async () => {
        await logPomodoroSessionAction({
          durationMinutes: Math.round(durationSecs / 60),
          actualSeconds: durationSecs,
          type: mode,
          status: 'completed',
          taskId: selectedTaskId || null,
          startedAt: sessionStartTimeRef.current || new Date().toISOString(),
          endedAt: new Date().toISOString(),
        });
        handleReset();
      });
    },
    [mode, selectedTaskId, handleReset]
  );

  // Sync remaining seconds on tick using ref to avoid stale closures
  const onSessionCompletedRef = useRef(handleSessionCompleted);
  useEffect(() => {
    onSessionCompletedRef.current = handleSessionCompleted;
  }, [handleSessionCompleted]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const state = calculatePomodoroState(timing, Date.now());
      setRemainingSeconds(state.remainingSeconds);

      if (state.isCompleted) {
        setIsRunning(false);
        onSessionCompletedRef.current(timing.targetDurationSeconds);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, timing]);

  const handleStart = () => {
    const now = Date.now();
    if (timing.startTimeMs === 0) {
      sessionStartTimeRef.current = new Date(now).toISOString();
      setTiming({
        startTimeMs: now,
        targetDurationSeconds: getTargetSeconds(mode),
        totalPausedMs: 0,
      });
    } else if (timing.pausedAtMs) {
      const pauseDuration = now - timing.pausedAtMs;
      setTiming({
        ...timing,
        totalPausedMs: timing.totalPausedMs + pauseDuration,
        pausedAtMs: undefined,
      });
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    setTiming({
      ...timing,
      pausedAtMs: Date.now(),
    });
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setIsRunning(false);
    const target = getTargetSeconds(newMode);
    setTiming({
      startTimeMs: 0,
      targetDurationSeconds: target,
      totalPausedMs: 0,
    });
    setRemainingSeconds(target);
    sessionStartTimeRef.current = null;
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      ((timing.targetDurationSeconds - remainingSeconds) / timing.targetDurationSeconds) * 100
    )
  );

  return (
    <Card className="border-border bg-card rounded-xl shadow-xs">
      <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border border-border mb-8">
          <button
            type="button"
            onClick={() => switchMode('focus')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              mode === 'focus'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>Focus ({focusDurationMinutes}m)</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('short_break')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              mode === 'short_break'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>Short Break ({shortBreakMinutes}m)</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('long_break')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              mode === 'long_break'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Long Break ({longBreakMinutes}m)</span>
          </button>
        </div>

        {/* Timer Display */}
        <div className="relative flex flex-col items-center justify-center my-4">
          <div className="text-6xl sm:text-7xl font-mono font-extrabold tracking-tighter text-foreground tabular-nums">
            {formattedTime}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase font-semibold border-border">
              {isRunning ? 'Session Active' : 'Paused / Ready'}
            </Badge>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-64 sm:w-80 h-2 bg-muted rounded-full mt-6 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Task Association */}
        <div className="w-full max-w-xs mt-6 space-y-1.5 text-left">
          <label htmlFor="pomodoro-task" className="text-xs font-medium text-muted-foreground">
            Associate with Task (Optional)
          </label>
          <select
            id="pomodoro-task"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={isRunning}
            className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="">None / General Study</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-3 mt-8">
          {isRunning ? (
            <Button onClick={handlePause} size="lg" className="w-32 gap-2 rounded-lg font-medium shadow-xs">
              <Pause className="h-4 w-4" />
              <span>Pause</span>
            </Button>
          ) : (
            <Button onClick={handleStart} size="lg" className="w-32 gap-2 rounded-lg font-medium shadow-xs">
              <Play className="h-4 w-4 fill-current" />
              <span>{timing.startTimeMs > 0 ? 'Resume' : 'Start'}</span>
            </Button>
          )}

          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="gap-2 rounded-lg border-border"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>

          {timing.startTimeMs > 0 && (
            <Button
              onClick={() => handleSessionCompleted(timing.targetDurationSeconds - remainingSeconds)}
              variant="secondary"
              size="lg"
              disabled={isPending}
              className="gap-2 rounded-lg"
            >
              <Check className="h-4 w-4" />
              <span>Done</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
