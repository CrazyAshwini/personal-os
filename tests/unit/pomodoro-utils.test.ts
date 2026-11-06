import { describe, it, expect } from 'vitest';
import { calculatePomodoroState } from '@/features/pomodoro/pomodoro-utils';

describe('calculatePomodoroState', () => {
  it('correctly derives elapsed and remaining time from timestamps', () => {
    const startTimeMs = 1000000;
    const nowMs = startTimeMs + 60 * 1000; // 1 minute passed
    const timing = {
      startTimeMs,
      targetDurationSeconds: 25 * 60, // 25 min = 1500 sec
      totalPausedMs: 0,
    };

    const state = calculatePomodoroState(timing, nowMs);
    expect(state.elapsedSeconds).toBe(60);
    expect(state.remainingSeconds).toBe(1440);
    expect(state.isCompleted).toBe(false);
  });

  it('accounts for paused duration without time drift', () => {
    const startTimeMs = 1000000;
    const nowMs = startTimeMs + 120 * 1000; // 2 minutes real time
    const timing = {
      startTimeMs,
      targetDurationSeconds: 25 * 60,
      totalPausedMs: 30 * 1000, // 30 seconds spent paused
    };

    const state = calculatePomodoroState(timing, nowMs);
    expect(state.elapsedSeconds).toBe(90);
    expect(state.remainingSeconds).toBe(1410);
    expect(state.isCompleted).toBe(false);
  });

  it('accurately identifies completion', () => {
    const startTimeMs = 1000000;
    const nowMs = startTimeMs + 1500 * 1000; // exactly 25 minutes
    const timing = {
      startTimeMs,
      targetDurationSeconds: 25 * 60,
      totalPausedMs: 0,
    };

    const state = calculatePomodoroState(timing, nowMs);
    expect(state.elapsedSeconds).toBe(1500);
    expect(state.remainingSeconds).toBe(0);
    expect(state.isCompleted).toBe(true);
  });
});
