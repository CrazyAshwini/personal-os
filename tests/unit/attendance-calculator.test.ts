import { describe, it, expect } from 'vitest';
import {
  calculateAttendance,
  type ClassSessionRecord,
} from '@/features/attendance/attendance-calculator';

describe('calculateAttendance', () => {
  it('correctly calculates 100% attendance when all conducted classes are attended', () => {
    const sessions: ClassSessionRecord[] = [
      { id: '1', status: 'present' },
      { id: '2', status: 'present' },
    ];
    const result = calculateAttendance(sessions);
    expect(result.conductedSessions).toBe(2);
    expect(result.presentSessions).toBe(2);
    expect(result.absentSessions).toBe(0);
    expect(result.percentage).toBe(100);
  });

  it('excludes cancelled and no_class sessions from conducted count', () => {
    const sessions: ClassSessionRecord[] = [
      { id: '1', status: 'present' },
      { id: '2', status: 'absent' },
      { id: '3', status: 'cancelled' },
      { id: '4', status: 'no_class' },
    ];
    const result = calculateAttendance(sessions);
    expect(result.totalSessions).toBe(4);
    expect(result.conductedSessions).toBe(2); // Only present + absent
    expect(result.cancelledSessions).toBe(2);
    expect(result.presentSessions).toBe(1);
    expect(result.absentSessions).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it('returns 0% when no conducted sessions exist', () => {
    const sessions: ClassSessionRecord[] = [
      { id: '1', status: 'cancelled' },
      { id: '2', status: 'no_class' },
    ];
    const result = calculateAttendance(sessions);
    expect(result.conductedSessions).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('calculates fractional percentages accurately', () => {
    const sessions: ClassSessionRecord[] = [
      { id: '1', status: 'present' },
      { id: '2', status: 'present' },
      { id: '3', status: 'absent' },
    ];
    const result = calculateAttendance(sessions);
    expect(result.conductedSessions).toBe(3);
    expect(result.percentage).toBe(66.67);
  });
});
