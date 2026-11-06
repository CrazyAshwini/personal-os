import { describe, it, expect } from 'vitest';
import {
  createNotificationSchema,
  updateNotificationPreferencesSchema,
} from '@/lib/validation/notification';

describe('Notification Validation Schemas', () => {
  it('validates a valid notification creation input', () => {
    const valid = {
      title: 'Assignment Due Tomorrow',
      message: 'Operating Systems homework 3 is due at 11:59 PM.',
      type: 'academic',
      link: '/academics',
    };
    const result = createNotificationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('defaults notification type to system when omitted', () => {
    const input = {
      title: 'System alert',
      message: 'Your profile has been synchronized successfully.',
    };
    const result = createNotificationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('system');
    }
  });

  it('rejects empty title or message', () => {
    const emptyTitle = {
      title: '',
      message: 'Some message',
      type: 'task',
    };
    const result = createNotificationSchema.safeParse(emptyTitle);
    expect(result.success).toBe(false);

    const emptyMessage = {
      title: 'Valid title',
      message: '',
      type: 'task',
    };
    const result2 = createNotificationSchema.safeParse(emptyMessage);
    expect(result2.success).toBe(false);
  });

  it('rejects invalid notification type', () => {
    const invalidType = {
      title: 'Meeting alert',
      message: 'Time to meet',
      type: 'unknown_type',
    };
    const result = createNotificationSchema.safeParse(invalidType);
    expect(result.success).toBe(false);
  });

  it('validates notification preferences correctly', () => {
    const validPrefs = {
      notify_task_deadlines: true,
      notify_calendar_reminders: true,
      notify_academic_classes: false,
      sound_enabled: true,
    };
    const result = updateNotificationPreferencesSchema.safeParse(validPrefs);
    expect(result.success).toBe(true);
  });

  it('rejects malformed notification preferences', () => {
    const invalidPrefs = {
      notify_task_deadlines: 'yes', // should be boolean
      notify_calendar_reminders: true,
      notify_academic_classes: false,
      sound_enabled: true,
    };
    const result = updateNotificationPreferencesSchema.safeParse(invalidPrefs);
    expect(result.success).toBe(false);
  });
});
