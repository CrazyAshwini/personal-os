import { describe, it, expect } from 'vitest';
import {
  calculatePomodoroState,
  formatSessionNotes,
  parseSessionNotes,
  aggregateSubjectStudyStats,
} from '@/features/pomodoro/pomodoro-utils';

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

describe('formatSessionNotes & parseSessionNotes', () => {
  it('formats notes with subjectId, subjectName, code, and customNote', () => {
    const formatted = formatSessionNotes({
      subjectId: 'sub-123',
      subjectName: 'Engineering Mathematics',
      subjectCode: 'MAT101',
      customNote: 'Eigenvalues and Eigenvectors review',
    });

    expect(formatted).toBe(
      '[Subject: sub-123|Engineering Mathematics|MAT101] Eigenvalues and Eigenvectors review'
    );
  });

  it('parses formatted piped subject string correctly', () => {
    const raw = '[Subject: sub-123|Engineering Mathematics|MAT101] Eigenvalues and Eigenvectors review';
    const parsed = parseSessionNotes(raw);

    expect(parsed.subjectId).toBe('sub-123');
    expect(parsed.subjectName).toBe('Engineering Mathematics');
    expect(parsed.subjectCode).toBe('MAT101');
    expect(parsed.customNote).toBe('Eigenvalues and Eigenvectors review');
  });

  it('handles simple legacy [Subject: Physics] format', () => {
    const raw = '[Subject: Physics] Problem set 4';
    const parsed = parseSessionNotes(raw);

    expect(parsed.subjectName).toBe('Physics');
    expect(parsed.customNote).toBe('Problem set 4');
  });

  it('handles custom note without subject association', () => {
    const raw = 'General reading';
    const parsed = parseSessionNotes(raw);

    expect(parsed.subjectId).toBeUndefined();
    expect(parsed.subjectName).toBeUndefined();
    expect(parsed.customNote).toBe('General reading');
  });

  it('returns empty object for empty or null notes', () => {
    expect(parseSessionNotes(null)).toEqual({});
    expect(parseSessionNotes('')).toEqual({});
  });
});

describe('aggregateSubjectStudyStats', () => {
  const subjects = [
    { id: 'sub-1', name: 'Physics', code: 'PHY101', color: '#ef4444' },
    { id: 'sub-2', name: 'Chemistry', code: 'CHY101', color: '#10b981' },
  ];

  it('aggregates study time and sessions accurately across subjects', () => {
    const sessions = [
      {
        duration_minutes: 50,
        type: 'focus',
        notes: '[Subject: sub-1|Physics|PHY101] Mechanics',
      },
      {
        duration_minutes: 25,
        type: 'focus',
        notes: '[Subject: sub-1|Physics|PHY101] Optics',
      },
      {
        duration_minutes: 25,
        type: 'focus',
        notes: '[Subject: sub-2|Chemistry|CHY101] Thermodynamics',
      },
      {
        duration_minutes: 10,
        type: 'short_break', // break sessions should NOT be counted in focus stats
        notes: 'Coffee break',
      },
      {
        duration_minutes: 20,
        type: 'focus',
        notes: 'Unassigned reading',
      },
    ];

    const result = aggregateSubjectStudyStats(sessions, subjects);

    expect(result.totalFocusMinutes).toBe(120); // 50 + 25 + 25 + 20
    expect(result.totalFocusHours).toBe(2);
    expect(result.totalSessions).toBe(4);

    // Physics
    const physics = result.subjects.find((s) => s.subjectId === 'sub-1');
    expect(physics).toBeDefined();
    expect(physics?.totalMinutes).toBe(75);
    expect(physics?.sessionCount).toBe(2);
    expect(physics?.percentage).toBe(63); // 75 / 120 = 62.5% -> 63%

    // Chemistry
    const chemistry = result.subjects.find((s) => s.subjectId === 'sub-2');
    expect(chemistry).toBeDefined();
    expect(chemistry?.totalMinutes).toBe(25);
    expect(chemistry?.sessionCount).toBe(1);
    expect(chemistry?.percentage).toBe(21); // 25 / 120 = 20.8% -> 21%

    // Unassigned
    expect(result.unassignedMinutes).toBe(20);
    expect(result.unassignedSessions).toBe(1);
  });
});
