'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import {
  calculatePomodoroState,
  formatSessionNotes,
  type PomodoroSessionTiming,
  type SubjectOption,
} from '@/features/pomodoro/pomodoro-utils';
import { logPomodoroSessionAction } from '@/features/pomodoro/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Check, Coffee, Brain, Sparkles, BookOpen, ListTodo, Edit3 } from 'lucide-react';

interface TaskOption {
  id: string;
  title: string;
}

interface PomodoroTimerProps {
  tasks: TaskOption[];
  subjects?: SubjectOption[];
  focusDurationMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
}

type Mode = 'focus' | 'short_break' | 'long_break';

export function PomodoroTimer({
  tasks,
  subjects = [],
  focusDurationMinutes = 25,
  shortBreakMinutes = 5,
  longBreakMinutes = 15,
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<Mode>('focus');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [sessionGoal, setSessionGoal] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

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
      const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
      const notes = formatSessionNotes({
        subjectId: activeSubject?.id,
        subjectName: activeSubject?.name,
        subjectCode: activeSubject?.code,
        customNote: sessionGoal.trim() || undefined,
      });

      startTransition(async () => {
        await logPomodoroSessionAction({
          durationMinutes: Math.max(1, Math.round(durationSecs / 60)),
          actualSeconds: durationSecs,
          type: mode,
          status: 'completed',
          taskId: selectedTaskId || null,
          notes,
          startedAt: sessionStartTimeRef.current || new Date().toISOString(),
          endedAt: new Date().toISOString(),
        });
        handleReset();
      });
    },
    [mode, selectedTaskId, selectedSubjectId, sessionGoal, subjects, handleReset]
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
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border mb-8 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => switchMode('focus')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer touch-manipulation flex-1 sm:flex-initial ${
              mode === 'focus'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Brain className="h-3.5 w-3.5 shrink-0" />
            <span>Focus</span>
            <span className="hidden sm:inline">({focusDurationMinutes}m)</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('short_break')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer touch-manipulation flex-1 sm:flex-initial ${
              mode === 'short_break'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Coffee className="h-3.5 w-3.5 shrink-0" />
            <span>Short Break</span>
            <span className="hidden sm:inline">({shortBreakMinutes}m)</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('long_break')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer touch-manipulation flex-1 sm:flex-initial ${
              mode === 'long_break'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Long Break</span>
            <span className="hidden sm:inline">({longBreakMinutes}m)</span>
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
            {selectedSubject && (
              <Badge
                variant="outline"
                className="text-xs font-medium border-border flex items-center gap-1.5"
                style={{ borderColor: selectedSubject.color || undefined }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedSubject.color || '#3b82f6' }}
                />
                <span className="truncate max-w-[150px]">{selectedSubject.name}</span>
              </Badge>
            )}
          </div>

          {/* Linear Progress Bar */}
          <div className="w-64 sm:w-80 h-2 bg-muted rounded-full mt-6 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Focus Study Association Controls */}
        <div className="w-full max-w-md mt-6 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {/* Academic Subject Association */}
          <div className="space-y-1.5">
            <label htmlFor="pomodoro-subject" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Academic Course</span>
            </label>
            <select
              id="pomodoro-subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={isRunning}
              className="flex h-9 w-full rounded-lg border border-border bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">General Study / No Course</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Task Association */}
          <div className="space-y-1.5">
            <label htmlFor="pomodoro-task" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ListTodo className="h-3.5 w-3.5 text-primary" />
              <span>Linked Task</span>
            </label>
            <select
              id="pomodoro-task"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={isRunning}
              className="flex h-9 w-full rounded-lg border border-border bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">None / General Task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Focus Goal / Topic */}
          <div className="sm:col-span-2 space-y-1.5">
            <label htmlFor="pomodoro-goal" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5 text-primary" />
              <span>Session Topic or Goal (Optional)</span>
            </label>
            <input
              id="pomodoro-goal"
              type="text"
              placeholder="e.g., Chapter 4 practice questions, Exam prep"
              value={sessionGoal}
              onChange={(e) => setSessionGoal(e.target.value)}
              disabled={isRunning}
              maxLength={120}
              className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs shadow-xs placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
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
