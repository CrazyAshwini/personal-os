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
