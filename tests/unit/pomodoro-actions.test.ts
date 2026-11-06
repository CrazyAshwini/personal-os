import { describe, it, expect } from 'vitest';
import { logSessionSchema } from '@/lib/validation/pomodoro';

describe('Pomodoro Session Validation', () => {
  it('validates a standard 25-minute focus session', () => {
    const result = logSessionSchema.safeParse({
      durationMinutes: 25,
      actualSeconds: 1500,
      type: 'focus',
      status: 'completed',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('focus');
      expect(result.data.status).toBe('completed');
    }
  });

  it('validates a break session with associated task', () => {
    const result = logSessionSchema.safeParse({
      durationMinutes: 5,
      actualSeconds: 300,
      type: 'short_break',
      status: 'completed',
      taskId: '123e4567-e89b-12d3-a456-426614174000',
      notes: 'Quick stretch after linear algebra review',
    });
    expect(result.success).toBe(true);
  });

  it('rejects duration greater than 240 minutes', () => {
    const result = logSessionSchema.safeParse({
      durationMinutes: 300,
      actualSeconds: 18000,
      type: 'focus',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative actual seconds', () => {
    const result = logSessionSchema.safeParse({
      durationMinutes: 25,
      actualSeconds: -5,
      type: 'focus',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid session type', () => {
    const result = logSessionSchema.safeParse({
      durationMinutes: 25,
      actualSeconds: 1500,
      type: 'power-nap',
    });
    expect(result.success).toBe(false);
  });
});
