'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { z } from 'zod';

export type UserPreferencesRow =
  Database['public']['Tables']['user_preferences']['Row'];

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z.string().min(1).max(50).optional(),
  dateFormat: z.string().min(1).max(30).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  pomodoroWorkDuration: z.number().int().min(1).max(180).optional(),
  pomodoroShortBreak: z.number().int().min(1).max(60).optional(),
  pomodoroLongBreak: z.number().int().min(1).max(120).optional(),
  pomodoroLongBreakInterval: z.number().int().min(1).max(20).optional(),
  notifyTaskDeadlines: z.boolean().optional(),
  notifyCalendarReminders: z.boolean().optional(),
  notifyAcademicClasses: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export type SettingsActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function getUserPreferencesAction(): Promise<
  SettingsActionResult<UserPreferencesRow>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  // If no preferences row yet, create default
  if (!data) {
    const defaultPrefs = {
      user_id: user.id,
      theme: 'system' as const,
      timezone: 'UTC',
      date_format: 'yyyy-MM-dd',
      time_format: '24h' as const,
      pomodoro_work_duration: 25,
      pomodoro_short_break: 5,
      pomodoro_long_break: 15,
      pomodoro_long_break_interval: 4,
      notify_task_deadlines: true,
      notify_calendar_reminders: true,
      notify_academic_classes: true,
      sound_enabled: true,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('user_preferences')
      .insert(defaultPrefs)
      .select()
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    return { success: true, data: inserted };
  }

  return { success: true, data };
}

export async function updateUserPreferencesAction(
  values: UpdatePreferencesInput
): Promise<SettingsActionResult<void>> {
  const parsed = updatePreferencesSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Invalid preferences payload.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const payload: Partial<Database['public']['Tables']['user_preferences']['Update']> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.theme !== undefined) payload.theme = parsed.data.theme;
  if (parsed.data.timezone !== undefined) payload.timezone = parsed.data.timezone;
  if (parsed.data.dateFormat !== undefined) payload.date_format = parsed.data.dateFormat;
  if (parsed.data.timeFormat !== undefined) payload.time_format = parsed.data.timeFormat;
  if (parsed.data.pomodoroWorkDuration !== undefined)
    payload.pomodoro_work_duration = parsed.data.pomodoroWorkDuration;
  if (parsed.data.pomodoroShortBreak !== undefined)
    payload.pomodoro_short_break = parsed.data.pomodoroShortBreak;
  if (parsed.data.pomodoroLongBreak !== undefined)
    payload.pomodoro_long_break = parsed.data.pomodoroLongBreak;
  if (parsed.data.pomodoroLongBreakInterval !== undefined)
    payload.pomodoro_long_break_interval = parsed.data.pomodoroLongBreakInterval;
  if (parsed.data.notifyTaskDeadlines !== undefined)
    payload.notify_task_deadlines = parsed.data.notifyTaskDeadlines;
  if (parsed.data.notifyCalendarReminders !== undefined)
    payload.notify_calendar_reminders = parsed.data.notifyCalendarReminders;
  if (parsed.data.notifyAcademicClasses !== undefined)
    payload.notify_academic_classes = parsed.data.notifyAcademicClasses;
  if (parsed.data.soundEnabled !== undefined)
    payload.sound_enabled = parsed.data.soundEnabled;

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        ...payload,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/pomodoro');
  return { success: true };
}
