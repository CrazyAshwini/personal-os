import { z } from 'zod';

export const eventTypeEnum = z.enum([
  'academic',
  'exam',
  'personal',
  'travel',
  'holiday',
  'other',
]);
export type CalendarEventType = z.infer<typeof eventTypeEnum>;

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Event title is required.').max(200),
    description: z.string().trim().max(1000).optional().nullable(),
    eventType: eventTypeEnum.default('personal'),
    startTime: z.string().min(1, 'Start time is required.'),
    endTime: z.string().min(1, 'End time is required.'),
    isAllDay: z.boolean().default(false),
    location: z.string().trim().max(200).optional().nullable(),
    color: z.string().default('#3b82f6'),
    recurrenceRule: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime();
      const end = new Date(data.endTime).getTime();
      return isNaN(start) || isNaN(end) || end >= start;
    },
    {
      message: 'End time cannot be earlier than start time.',
      path: ['endTime'],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    eventType: eventTypeEnum.optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    isAllDay: z.boolean().optional(),
    location: z.string().trim().max(200).optional().nullable(),
    color: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime).getTime() >= new Date(data.startTime).getTime();
      }
      return true;
    },
    {
      message: 'End time cannot be earlier than start time.',
      path: ['endTime'],
    }
  );

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const createReminderSchema = z.object({
  title: z.string().trim().min(1, 'Reminder title is required.').max(200),
  remindAt: z.string().min(1, 'Remind timestamp is required.'),
  eventId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
