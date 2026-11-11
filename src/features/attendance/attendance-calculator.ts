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

export interface SafeBunkAnalysis {
  isSafe: boolean;
  percentage: number;
  conductedSessions: number;
  presentSessions: number;
  targetPercentage: number;
  canBunkClasses: number;
  needToAttendClasses: number;
  statusMessage: string;
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

/**
 * Determines exact safe-bunk tolerance or required consecutive attendance
 * to satisfy a given criteria (default 75%).
 */
export function calculateSafeBunkMargin(
  presentSessions: number,
  conductedSessions: number,
  targetPercentage = 75
): SafeBunkAnalysis {
  const targetFraction = targetPercentage / 100;
  const currentPercentage =
    conductedSessions > 0
      ? Math.round((presentSessions / conductedSessions) * 10000) / 100
      : 0;

  if (conductedSessions === 0) {
    return {
      isSafe: true,
      percentage: 0,
      conductedSessions: 0,
      presentSessions: 0,
      targetPercentage,
      canBunkClasses: 0,
      needToAttendClasses: 0,
      statusMessage: 'No conducted classes yet',
    };
  }

  const isSafe = currentPercentage >= targetPercentage;

  if (isSafe) {
    const maxMissable = Math.max(
      0,
      Math.floor((presentSessions - targetFraction * conductedSessions) / targetFraction)
    );

    return {
      isSafe: true,
      percentage: currentPercentage,
      conductedSessions,
      presentSessions,
      targetPercentage,
      canBunkClasses: maxMissable,
      needToAttendClasses: 0,
      statusMessage:
        maxMissable > 0
          ? `Can safely miss ${maxMissable} class${maxMissable === 1 ? '' : 'es'}`
          : 'On threshold: cannot miss next class',
    };
  } else {
    const needed = Math.max(
      1,
      Math.ceil(
        (targetFraction * conductedSessions - presentSessions) / (1 - targetFraction)
      )
    );

    return {
      isSafe: false,
      percentage: currentPercentage,
      conductedSessions,
      presentSessions,
      targetPercentage,
      canBunkClasses: 0,
      needToAttendClasses: needed,
      statusMessage: `Need ${needed} consecutive class${needed === 1 ? '' : 'es'} for ${targetPercentage}%`,
    };
  }
}

/**
 * Simulates projected attendance percentage under custom attendance scenarios.
 */
export function simulateAttendance(
  presentSessions: number,
  conductedSessions: number,
  additionalAttended: number,
  additionalMissed: number
): { projectedPercentage: number; projectedConducted: number; projectedPresent: number } {
  const projectedPresent = Math.max(0, presentSessions + additionalAttended);
  const projectedConducted = Math.max(0, conductedSessions + additionalAttended + additionalMissed);
  const projectedPercentage =
    projectedConducted > 0
      ? Math.round((projectedPresent / projectedConducted) * 10000) / 100
      : 0;

  return {
    projectedPercentage,
    projectedConducted,
    projectedPresent,
  };
}
