export type ClassSessionStatus =
  | 'present'
  | 'absent'
  | 'cancelled'
  | 'no_class';

export interface ClassSessionRecord {
  id: string;
  status: ClassSessionStatus;
}

export interface AttendanceSummary {
  totalSessions: number;
  conductedSessions: number;
  presentSessions: number;
  absentSessions: number;
  cancelledSessions: number;
  percentage: number;
}

/**
 * Calculates attendance percentage strictly derived from individual class sessions.
 * Excludes cancelled and no_class sessions from conducted count.
 * Formula: Attendance % = (Present classes / Conducted classes) * 100
 */
export function calculateAttendance(
  sessions: ClassSessionRecord[]
): AttendanceSummary {
  let presentCount = 0;
  let absentCount = 0;
  let cancelledCount = 0;

  for (const session of sessions) {
    if (session.status === 'present') {
      presentCount++;
    } else if (session.status === 'absent') {
      absentCount++;
    } else if (session.status === 'cancelled' || session.status === 'no_class') {
      cancelledCount++;
    }
  }

  const conductedSessions = presentCount + absentCount;
  const percentage =
    conductedSessions > 0
      ? Math.round((presentCount / conductedSessions) * 10000) / 100
      : 0;

  return {
    totalSessions: sessions.length,
    conductedSessions,
    presentSessions: presentCount,
    absentSessions: absentCount,
    cancelledSessions: cancelledCount,
    percentage,
  };
}
