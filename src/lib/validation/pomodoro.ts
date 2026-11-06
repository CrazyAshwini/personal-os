import { z } from 'zod';

export const sessionTypeEnum = z.enum(['focus', 'short_break', 'long_break']);
export type PomodoroSessionType = z.infer<typeof sessionTypeEnum>;

export const sessionStatusEnum = z.enum(['completed', 'cancelled', 'in_progress']);
export type PomodoroSessionStatus = z.infer<typeof sessionStatusEnum>;

export const logSessionSchema = z.object({
  durationMinutes: z.number().int().min(1).max(240),
  actualSeconds: z.number().int().min(0),
  type: sessionTypeEnum.default('focus'),
  status: sessionStatusEnum.default('completed'),
  taskId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
});

export type LogSessionInput = z.infer<typeof logSessionSchema>;
