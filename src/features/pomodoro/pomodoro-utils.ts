export interface PomodoroSessionTiming {
  startTimeMs: number;
  targetDurationSeconds: number;
  pausedAtMs?: number;
  totalPausedMs: number;
}

/**
 * Calculates remaining and elapsed seconds using absolute timestamps.
 * This guarantees that browser backgrounding, throttling, or sleep
 * does not distort or corrupt the timer state.
 */
export function calculatePomodoroState(
  timing: PomodoroSessionTiming,
  nowMs: number = Date.now()
) {
  const effectiveNow = timing.pausedAtMs ?? nowMs;
  const elapsedMs = Math.max(0, effectiveNow - timing.startTimeMs - timing.totalPausedMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.max(
    0,
    timing.targetDurationSeconds - elapsedSeconds
  );
  const isCompleted = remainingSeconds === 0;

  return {
    elapsedSeconds,
    remainingSeconds,
    isCompleted,
  };
}

export interface ParsedPomodoroNotes {
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  customNote?: string;
}

/**
 * Formats a Pomodoro session note with structured subject association
 * while remaining human-readable in Supabase records.
 */
export function formatSessionNotes(params: {
  subjectId?: string | null;
  subjectName?: string | null;
  subjectCode?: string | null;
  customNote?: string | null;
}): string | null {
  const cleanName = params.subjectName?.trim();
  const cleanCustom = params.customNote?.trim();

  if (!cleanName) {
    return cleanCustom || null;
  }

  const idPart = params.subjectId?.trim() || '';
  const codePart = params.subjectCode?.trim() || '';
  const header = `[Subject: ${idPart}|${cleanName}|${codePart}]`;

  if (cleanCustom) {
    return `${header} ${cleanCustom}`;
  }
  return header;
}

/**
 * Parses structured subject metadata and custom user notes from a raw session note string.
 */
export function parseSessionNotes(rawNotes?: string | null): ParsedPomodoroNotes {
  if (!rawNotes || !rawNotes.trim()) {
    return {};
  }

  const trimmed = rawNotes.trim();

  // Pattern 1: [Subject: id|name|code] optional text
  const matchPiped = trimmed.match(/^\[Subject:\s*([^|\]]*)\s*\|\s*([^|\]]+)(?:\s*\|\s*([^\]]*))?\]\s*(.*)$/i);
  if (matchPiped) {
    const subjectId = matchPiped[1]?.trim() || undefined;
    const subjectName = matchPiped[2]?.trim() || undefined;
    const subjectCode = matchPiped[3]?.trim() || undefined;
    const customNote = matchPiped[4]?.trim() || undefined;
    return { subjectId, subjectName, subjectCode, customNote };
  }

  // Pattern 2: [Subject: name] optional text
  const matchSimple = trimmed.match(/^\[Subject:\s*([^\]]+)\]\s*(.*)$/i);
  if (matchSimple) {
    const subjectName = matchSimple[1]?.trim() || undefined;
    const customNote = matchSimple[2]?.trim() || undefined;
    return { subjectName, customNote };
  }

  return { customNote: trimmed };
}

export interface SubjectOption {
  id: string;
  name: string;
  code?: string | null;
  color?: string | null;
}

export interface SubjectStudyStat {
  subjectId: string;
  name: string;
  code?: string | null;
  color: string;
  totalMinutes: number;
  totalHours: number;
  sessionCount: number;
  percentage: number;
}

export interface AggregateStudyStatsResult {
  subjects: SubjectStudyStat[];
  unassignedMinutes: number;
  unassignedHours: number;
  unassignedSessions: number;
  totalFocusMinutes: number;
  totalFocusHours: number;
  totalSessions: number;
}

/**
 * Aggregates Pomodoro focus sessions across academic subjects.
 */
export function aggregateSubjectStudyStats(
  sessions: Array<{
    duration_minutes: number;
    type: string;
    notes?: string | null;
  }>,
  subjects: SubjectOption[]
): AggregateStudyStatsResult {
  const focusSessions = sessions.filter((s) => s.type === 'focus');

  // Map by subject ID for quick lookup
  const subjectMap = new Map<
    string,
    {
      subjectId: string;
      name: string;
      code?: string | null;
      color: string;
      totalMinutes: number;
      sessionCount: number;
    }
  >();

  // Pre-populate with known subjects
  for (const sub of subjects) {
    subjectMap.set(sub.id, {
      subjectId: sub.id,
      name: sub.name,
      code: sub.code,
      color: sub.color || '#3b82f6',
      totalMinutes: 0,
      sessionCount: 0,
    });
  }

  let unassignedMinutes = 0;
  let unassignedSessions = 0;
  let totalFocusMinutes = 0;

  for (const session of focusSessions) {
    const minutes = session.duration_minutes || 0;
    totalFocusMinutes += minutes;

    const parsed = parseSessionNotes(session.notes);
    let matched = false;

    if (parsed.subjectId && subjectMap.has(parsed.subjectId)) {
      const entry = subjectMap.get(parsed.subjectId)!;
      entry.totalMinutes += minutes;
      entry.sessionCount += 1;
      matched = true;
    } else if (parsed.subjectName) {
      // Find by name match
      const lower = parsed.subjectName.toLowerCase();
      const found = Array.from(subjectMap.values()).find(
        (entry) => entry.name.toLowerCase() === lower
      );
      if (found) {
        found.totalMinutes += minutes;
        found.sessionCount += 1;
        matched = true;
      }
    }

    if (!matched) {
      unassignedMinutes += minutes;
      unassignedSessions += 1;
    }
  }

  const subjectStats: SubjectStudyStat[] = Array.from(subjectMap.values()).map((entry) => ({
    ...entry,
    totalHours: Math.round((entry.totalMinutes / 60) * 10) / 10,
    percentage:
      totalFocusMinutes > 0
        ? Math.round((entry.totalMinutes / totalFocusMinutes) * 100)
        : 0,
  }));

  // Sort by totalMinutes descending
  subjectStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return {
    subjects: subjectStats,
    unassignedMinutes,
    unassignedHours: Math.round((unassignedMinutes / 60) * 10) / 10,
    unassignedSessions,
    totalFocusMinutes,
    totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
    totalSessions: focusSessions.length,
  };
}
