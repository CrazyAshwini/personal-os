import { describe, it, expect } from 'vitest';
import {
  createHabitSchema,
  logHabitSchema,
  createGoalSchema,
  createJourneySchema,
  createBookSchema,
  createMediaItemSchema,
  createNoteSchema,
} from '@/lib/validation/personal-life';

describe('Personal Life Validation Schemas', () => {
  it('validates a habit creation payload', () => {
    const validHabit = {
      name: 'Drink 3L Water',
      description: 'Morning and evening hydration',
      targetDaysPerWeek: 7,
      color: '#10b981',
    };
    expect(createHabitSchema.safeParse(validHabit).success).toBe(true);

    const invalidHabit = {
      name: '',
      targetDaysPerWeek: 10, // out of range 1-7
    };
    expect(createHabitSchema.safeParse(invalidHabit).success).toBe(false);
  });

  it('validates a habit log payload', () => {
    const validLog = {
      habitId: '550e8400-e29b-41d4-a716-446655440000',
      completedDate: '2026-11-06',
    };
    expect(logHabitSchema.safeParse(validLog).success).toBe(true);
  });

  it('validates strategic goals', () => {
    const validGoal = {
      title: 'Maintain 8.5+ SGPA this semester',
      category: 'academic',
      progressPercentage: 50,
    };
    expect(createGoalSchema.safeParse(validGoal).success).toBe(true);
  });

  it('validates travel journey itineraries', () => {
    const validJourney = {
      title: 'Winter Vacation Trip',
      transportType: 'train',
      origin: 'New Delhi',
      destination: 'Varanasi',
      departureTime: new Date().toISOString(),
      bookingReference: '123-4567890',
    };
    expect(createJourneySchema.safeParse(validJourney).success).toBe(true);
  });

  it('validates book entries', () => {
    const validBook = {
      title: 'Clean Architecture',
      author: 'Robert C. Martin',
      status: 'reading',
      totalPages: 432,
      currentPage: 120,
      rating: 5,
    };
    expect(createBookSchema.safeParse(validBook).success).toBe(true);
  });

  it('validates media and notes entries', () => {
    const validMedia = {
      title: 'Interstellar',
      type: 'movie',
      status: 'completed',
      rating: 10,
    };
    expect(createMediaItemSchema.safeParse(validMedia).success).toBe(true);

    const validNote = {
      title: 'Operating Systems Quick Reference',
      content: '# Paging and Virtual Memory\n...',
      category: 'academics',
      isPinned: true,
    };
    expect(createNoteSchema.safeParse(validNote).success).toBe(true);
  });
});
