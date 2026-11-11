import { describe, it, expect } from 'vitest';
import {
  calculateAttendance,
  calculateSafeBunkMargin,
  simulateAttendance,
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

describe('calculateSafeBunkMargin', () => {
  it('calculates safe bunk margin when above 75%', () => {
    // 18 present out of 20 conducted = 90%
    const res = calculateSafeBunkMargin(18, 20, 75);
    expect(res.isSafe).toBe(true);
    expect(res.canBunkClasses).toBe(4);
    expect(res.needToAttendClasses).toBe(0);
  });

  it('identifies when attendance is exactly on threshold (can miss 0)', () => {
    // 3 present out of 4 conducted = 75%
    const res = calculateSafeBunkMargin(3, 4, 75);
    expect(res.isSafe).toBe(true);
    expect(res.canBunkClasses).toBe(0);
    expect(res.statusMessage).toContain('On threshold');
  });

  it('calculates required consecutive classes to reach 75% when in deficit', () => {
    // 6 present out of 10 conducted = 60%
    const res = calculateSafeBunkMargin(6, 10, 75);
    expect(res.isSafe).toBe(false);
    expect(res.canBunkClasses).toBe(0);
    expect(res.needToAttendClasses).toBe(6);
  });

  it('handles 0 conducted classes gracefully', () => {
    const res = calculateSafeBunkMargin(0, 0, 75);
    expect(res.isSafe).toBe(true);
    expect(res.canBunkClasses).toBe(0);
  });
});

describe('simulateAttendance', () => {
  it('correctly projects attendance when attending upcoming classes', () => {
    // 10 present out of 15 conducted (66.67%). Attend 5 more classes.
    const res = simulateAttendance(10, 15, 5, 0);
    expect(res.projectedPresent).toBe(15);
    expect(res.projectedConducted).toBe(20);
    expect(res.projectedPercentage).toBe(75);
  });

  it('correctly projects attendance when missing upcoming classes', () => {
    // 18 present out of 20 conducted (90%). Miss 4 classes.
    const res = simulateAttendance(18, 20, 0, 4);
    expect(res.projectedPresent).toBe(18);
    expect(res.projectedConducted).toBe(24);
    expect(res.projectedPercentage).toBe(75);
  });
});
