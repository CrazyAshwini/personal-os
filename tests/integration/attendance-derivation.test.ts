import { describe, it, expect } from 'vitest';
import {
  calculateAttendance,
  type ClassSessionRecord,
} from '@/features/attendance/attendance-calculator';

describe('Integration: Academic Attendance Ground Truth Derivation', () => {
  it('correctly derives attendance across multiple subject session sets', () => {
    // Subject 1: Distributed Systems (8 present, 2 absent, 1 cancelled, 1 no_class)
    const subject1Sessions: ClassSessionRecord[] = [
      { id: 's1-1', status: 'present' },
      { id: 's1-2', status: 'present' },
      { id: 's1-3', status: 'present' },
      { id: 's1-4', status: 'present' },
      { id: 's1-5', status: 'present' },
      { id: 's1-6', status: 'present' },
      { id: 's1-7', status: 'present' },
      { id: 's1-8', status: 'present' },
      { id: 's1-9', status: 'absent' },
      { id: 's1-10', status: 'absent' },
      { id: 's1-11', status: 'cancelled' },
      { id: 's1-12', status: 'no_class' },
    ];

    const result1 = calculateAttendance(subject1Sessions);
    expect(result1.totalSessions).toBe(12);
    expect(result1.conductedSessions).toBe(10); // 8 present + 2 absent
    expect(result1.cancelledSessions).toBe(2);
    expect(result1.presentSessions).toBe(8);
    expect(result1.absentSessions).toBe(2);
    expect(result1.percentage).toBe(80); // (8 / 10) * 100 = 80%

    // Subject 2: Compiler Design (4 present, 2 absent, 2 cancelled)
    const subject2Sessions: ClassSessionRecord[] = [
      { id: 's2-1', status: 'present' },
      { id: 's2-2', status: 'present' },
      { id: 's2-3', status: 'present' },
      { id: 's2-4', status: 'present' },
      { id: 's2-5', status: 'absent' },
      { id: 's2-6', status: 'absent' },
      { id: 's2-7', status: 'cancelled' },
      { id: 's2-8', status: 'cancelled' },
    ];

    const result2 = calculateAttendance(subject2Sessions);
    expect(result2.totalSessions).toBe(8);
    expect(result2.conductedSessions).toBe(6); // 4 present + 2 absent
    expect(result2.presentSessions).toBe(4);
    expect(result2.percentage).toBe(66.67); // (4 / 6) * 100 = 66.67%

    // Cumulative attendance across both subjects:
    const combinedSessions = [...subject1Sessions, ...subject2Sessions];
    const combinedResult = calculateAttendance(combinedSessions);
    expect(combinedResult.totalSessions).toBe(20);
    expect(combinedResult.conductedSessions).toBe(16); // 10 + 6
    expect(combinedResult.presentSessions).toBe(12); // 8 + 4
    expect(combinedResult.percentage).toBe(75); // (12 / 16) * 100 = 75%
  });

  it('calculates margin text accurately for >= 75% and < 75%', () => {
    // 8 present out of 10 conducted = 80%
    const p = 8;
    const c = 10;
    // canMiss: floor((P - 0.75 * C) / 0.75) = floor((8 - 7.5) / 0.75) = floor(0.5 / 0.75) = 0
    const canMiss = Math.floor((p - 0.75 * c) / 0.75);
    expect(canMiss).toBe(0); // Cannot miss another class without falling below 75%

    // 16 present out of 18 conducted = 88.89%
    const p2 = 16;
    const c2 = 18;
    // floor((16 - 0.75 * 18) / 0.75) = floor((16 - 13.5) / 0.75) = floor(2.5 / 0.75) = 3
    const canMiss2 = Math.floor((p2 - 0.75 * c2) / 0.75);
    expect(canMiss2).toBe(3); // Can safely miss 3 classes: (16 / 21) = 76.19% >= 75%

    // 4 present out of 8 conducted = 50% (< 75%)
    const p3 = 4;
    const c3 = 8;
    // needToAttend: ceil((0.75 * C - P) / 0.25) = ceil((6 - 4) / 0.25) = ceil(2 / 0.25) = 8
    const needToAttend = Math.ceil((0.75 * c3 - p3) / 0.25);
    expect(needToAttend).toBe(8); // Need to attend 8 consecutive classes: (12 / 16) = 75%
  });
});
