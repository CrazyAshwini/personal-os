import { describe, it, expect } from 'vitest';
import {
  createEventSchema,
  updateEventSchema,
  createReminderSchema,
} from '@/lib/validation/calendar';

describe('Calendar & Reminders Validation', () => {
  describe('createEventSchema', () => {
    it('passes with valid event title, valid start, and later end time', () => {
      const result = createEventSchema.safeParse({
        title: 'Database Systems Midterm Exam',
        eventType: 'exam',
        startTime: '2026-11-10T10:00:00Z',
        endTime: '2026-11-10T12:00:00Z',
        isAllDay: false,
        location: 'Hall A',
        color: '#ef4444',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventType).toBe('exam');
      }
    });

    it('rejects an event where end time is before start time', () => {
      const result = createEventSchema.safeParse({
        title: 'Invalid Schedule Test',
        eventType: 'personal',
        startTime: '2026-11-10T14:00:00Z',
        endTime: '2026-11-10T13:00:00Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.endTime).toContain(
          'End time cannot be earlier than start time.'
        );
      }
    });

    it('rejects an event with empty title', () => {
      const result = createEventSchema.safeParse({
        title: '   ',
        startTime: '2026-11-10T10:00:00Z',
        endTime: '2026-11-10T11:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateEventSchema', () => {
    it('validates partial update with valid UUID', () => {
      const result = updateEventSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Rescheduled Midterm',
      });
      expect(result.success).toBe(true);
    });

    it('rejects update when new end time is earlier than new start time', () => {
      const result = updateEventSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        startTime: '2026-11-10T15:00:00Z',
        endTime: '2026-11-10T14:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createReminderSchema', () => {
    it('validates a reminder attached to an event', () => {
      const result = createReminderSchema.safeParse({
        title: 'Reminder: Bring Scientific Calculator',
        remindAt: '2026-11-10T09:00:00Z',
        eventId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });
  });
});
