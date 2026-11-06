import { z } from 'zod';

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Habit name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  frequency: z.enum(['daily', 'weekly', 'custom']).optional().default('daily'),
  targetDaysPerWeek: z.number().int().min(1).max(7).optional().default(7),
  color: z.string().optional().default('#10b981'),
  icon: z.string().optional().default('Activity'),
});

export const logHabitSchema = z.object({
  habitId: z.string().uuid('Habit ID is required'),
  completedDate: z.string().min(1, 'Completion date is required'),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, 'Goal title is required').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z
    .enum(['academic', 'career', 'health', 'financial', 'personal'])
    .default('personal'),
  targetDate: z.string().optional().nullable(),
  progressPercentage: z.number().int().min(0).max(100).default(0),
});

export const createJourneySchema = z.object({
  title: z.string().trim().min(1, 'Trip title is required').max(150),
  transportType: z
    .enum(['train', 'flight', 'bus', 'car', 'other'])
    .default('train'),
  origin: z.string().trim().min(1, 'Origin is required').max(100),
  destination: z.string().trim().min(1, 'Destination is required').max(100),
  departureTime: z.string().min(1, 'Departure time is required'),
  arrivalTime: z.string().optional().nullable(),
  bookingReference: z.string().trim().max(50).optional().nullable(),
  carrierName: z.string().trim().max(100).optional().nullable(),
  seatNumber: z.string().trim().max(50).optional().nullable(),
  status: z
    .enum(['booked', 'confirmed', 'completed', 'cancelled'])
    .default('confirmed'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createBookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  author: z.string().trim().min(1, 'Author is required').max(150),
  isbn: z.string().trim().max(20).optional().nullable(),
  status: z
    .enum(['want_to_read', 'reading', 'completed', 'abandoned'])
    .default('want_to_read'),
  totalPages: z.number().int().min(0).default(0),
  currentPage: z.number().int().min(0).default(0),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  review: z.string().trim().max(2000).optional().nullable(),
});

export const createMediaItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  type: z.enum(['movie', 'series', 'anime', 'documentary']).default('movie'),
  status: z
    .enum(['plan_to_watch', 'watching', 'completed', 'dropped'])
    .default('plan_to_watch'),
  totalEpisodes: z.number().int().min(1).default(1),
  watchedEpisodes: z.number().int().min(0).default(0),
  rating: z.number().int().min(1).max(10).optional().nullable(),
  releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
  review: z.string().trim().max(2000).optional().nullable(),
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().default(''),
  category: z.string().trim().max(50).default('general'),
  isPinned: z.boolean().default(false),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type LogHabitInput = z.infer<typeof logHabitSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateJourneyInput = z.infer<typeof createJourneySchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type CreateMediaItemInput = z.infer<typeof createMediaItemSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
