import { z } from 'zod';

export const notificationTypeEnum = z.enum([
  'system',
  'task',
  'reminder',
  'academic',
  'pomodoro',
]);

export const createNotificationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(100, 'Title cannot exceed 100 characters'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(500, 'Message cannot exceed 500 characters'),
  type: notificationTypeEnum.default('system'),
  link: z
    .string()
    .trim()
    .max(200, 'Link cannot exceed 200 characters')
    .optional()
    .nullable(),
});

export const updateNotificationPreferencesSchema = z.object({
  notify_task_deadlines: z.boolean(),
  notify_calendar_reminders: z.boolean(),
  notify_academic_classes: z.boolean(),
  sound_enabled: z.boolean(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
