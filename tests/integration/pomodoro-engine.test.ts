import { describe, it, expect } from 'vitest';
import { calculatePomodoroState } from '@/features/pomodoro/pomodoro-utils';

describe('Integration: Timestamp-Derived Pomodoro Timing Engine', () => {
  it('correctly derives remaining time from timestamps across background sleep intervals', () => {
    const targetDurationSeconds = 25 * 60; // 1500 seconds
    const startTimeMs = 1000000;

    // Simulate 500 seconds elapsed while browser was backgrounded/throttled
    const nowMs = startTimeMs + 500 * 1000;
    const state = calculatePomodoroState(
      {
        startTimeMs,
        targetDurationSeconds,
        totalPausedMs: 0,
      },
      nowMs
    );

    expect(state.elapsedSeconds).toBe(500);
    expect(state.remainingSeconds).toBe(1000);
    expect(state.isCompleted).toBe(false);
  });

  it('correctly accounts for accumulated pause durations', () => {
    const targetDurationSeconds = 25 * 60; // 1500 seconds
    const startTimeMs = 1000000;

    // 600 total seconds elapsed since start, but user was paused for 200 seconds
    const nowMs = startTimeMs + 600 * 1000;
    const totalPausedMs = 200 * 1000;

    const state = calculatePomodoroState(
      {
        startTimeMs,
        targetDurationSeconds,
        totalPausedMs,
      },
      nowMs
    );

    // Active elapsed time: 600 - 200 = 400 seconds
    // Remaining: 1500 - 400 = 1100 seconds
    expect(state.elapsedSeconds).toBe(400);
    expect(state.remainingSeconds).toBe(1100);
    expect(state.isCompleted).toBe(false);
  });

  it('clamps to zero when target timestamp has elapsed', () => {
    const targetDurationSeconds = 25 * 60;
    const startTimeMs = 1000000;
    const nowMs = startTimeMs + 3000 * 1000; // Overdue by 1500s

    const state = calculatePomodoroState(
      {
        startTimeMs,
        targetDurationSeconds,
        totalPausedMs: 0,
      },
      nowMs
    );

    expect(state.remainingSeconds).toBe(0);
    expect(state.elapsedSeconds).toBe(3000);
    expect(state.isCompleted).toBe(true);
  });
});
